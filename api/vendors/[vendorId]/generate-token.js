import { getDb, cors } from '../../_db.js';
import crypto from 'crypto';

function getActivationTokenSecret() {
  const secret = process.env.ACTIVATION_TOKEN_SECRET;
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    const err = new Error('ACTIVATION_TOKEN_SECRET configuration missing in server environment.');
    err.code = 'ACTIVATION_SECRET_MISSING';
    err.status = 500;
    throw err;
  }
  return secret.trim();
}

function generateActivationToken(vendorId, vendorCode) {
  const secret = getActivationTokenSecret();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = Buffer.from(JSON.stringify({ vendorId, vendorCode, expiresAt })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    const token = generateActivationToken(vendor.id, vendorCode);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Log to audit trail (non-fatal)
    try {
      await db.query(
        'INSERT INTO saas_audit_logs (admin_name, action, details) VALUES (?, ?, ?)',
        ['Super Admin', 'GENERATE_ACTIVATION_TOKEN', `Generated setup token for "${vendor.business_name}" (#${vendor.id})`]
      );
    } catch (e) { /* non-fatal */ }

    return res.status(200).json({
      success: true,
      token,
      vendor_name: vendor.business_name,
      vendor_code: vendorCode,
      expires_at: expiresAt,
      instructions: 'Share this token with the restaurant owner. They paste it in the POS Setup Wizard on first launch. Valid for 7 days.'
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
