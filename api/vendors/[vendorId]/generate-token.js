import { getDb, cors } from '../../_db.js';
import crypto from 'crypto';
import { getActivationTokenSecret, requireSaasAdminAuth } from '../../_auth.js';

function generateActivationToken(vendorId, vendorCode, locationId = null) {
  const secret = getActivationTokenSecret();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = Buffer.from(JSON.stringify({ vendorId, vendorCode, locationId, expiresAt })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

async function fetchActiveOutletsForToken(db, vendorId) {
  const columns = await getTableColumns(db, 'locations');
  const hasIsActive = columns.has('is_active');
  const selectFields = ['id'];
  selectFields.push(columns.has('name') ? 'name' : "CONCAT('Outlet #', id) AS name");
  if (hasIsActive) selectFields.push('is_active');
  const [rows] = await db.query(
    `SELECT ${selectFields.join(', ')} FROM locations WHERE vendor_id = ?${hasIsActive ? ' AND (is_active = 1 OR is_active IS NULL)' : ''} ORDER BY id ASC`,
    [vendorId]
  );
  return Array.isArray(rows)
    ? rows.filter(row => row && row.id).map(row => ({ ...row, is_active: hasIsActive ? row.is_active : 1 }))
    : [];
}

async function getTableColumns(db, tableName) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  return new Set((rows || []).map(row => row.Field));
}

function cleanPositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const admin = requireSaasAdminAuth(req, res);
  if (!admin) return;

  try {
    const { vendorId } = req.query;
    if (!vendorId) return res.status(400).json({ error: 'vendorId is required' });

    const db = getDb();
    const [rows] = await db.query(
      'SELECT id, business_name, vendor_code, slug, email, phone FROM vendors WHERE id = ?',
      [vendorId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });

    const vendor = rows[0];
    const activeOutlets = await fetchActiveOutletsForToken(db, vendor.id);
    if (activeOutlets.length === 0) {
      return res.status(409).json({
        success: false,
        code: 'NO_ACTIVE_OUTLETS_CONFIGURED',
        error: 'Cannot generate POS activation token: No active outlet is configured for this vendor. Please add at least one outlet in SaaS Admin before generating token.'
      });
    }
    const requestedLocationId = cleanPositiveInt(req.body?.location_id || req.body?.selected_location_id);
    const selectedOutlet = activeOutlets.find(outlet => Number(outlet.id) === Number(requestedLocationId)) || activeOutlets[0];

    // Auto-assign vendor_code if missing (legacy vendors)
    let vendorCode = vendor.vendor_code;
    if (!vendorCode) {
      const slugPart = (vendor.slug || vendor.business_name || 'ven')
        .replace(/[^a-z0-9]/gi, '')
        .substring(0, 4)
        .toUpperCase();
      vendorCode = `HP-${slugPart || 'VEN'}-${Math.floor(1000 + Math.random() * 9000)}`;
      await db.query('UPDATE vendors SET vendor_code = ? WHERE id = ?', [vendorCode, vendor.id]);
    }

    const token = generateActivationToken(vendor.id, vendorCode, selectedOutlet.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Log to audit trail (non-fatal)
    try {
      await db.query(
        'INSERT INTO saas_audit_logs (admin_name, action, details) VALUES (?, ?, ?)',
        [admin.email || 'SaaS Admin', 'GENERATE_ACTIVATION_TOKEN', `Generated setup token for "${vendor.business_name}" (#${vendor.id}) outlet "${selectedOutlet.name || selectedOutlet.id}"`]
      );
    } catch (e) { /* non-fatal */ }

    return res.status(200).json({
      success: true,
      token,
      vendor_name: vendor.business_name,
      vendor_code: vendorCode,
      selected_location_id: selectedOutlet.id,
      selected_location_name: selectedOutlet.name || `Outlet #${selectedOutlet.id}`,
      active_outlet_count: activeOutlets.length,
      expires_at: expiresAt,
      instructions: 'Share this token with the restaurant owner. They paste it in the POS Setup Wizard on first launch. Valid for 7 days.'
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
