import { getDb, cors } from './_db.js';
import crypto from 'crypto';

const TOKEN_SECRET = process.env.ACTIVATION_TOKEN_SECRET || 'happypie-saas-activation-secret-2026';

function generateActivationToken(vendorId, vendorCode) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = Buffer.from(JSON.stringify({ vendorId, vendorCode, expiresAt })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();

  // ── POST /api/vendors?action=generate-token&vendorId=X ─────────────────────
  if (req.method === 'POST' && req.query.action === 'generate-token') {
    try {
      const vendorId = req.query.vendorId;
      if (!vendorId) return res.status(400).json({ error: 'vendorId is required' });

      const [rows] = await db.query(
        'SELECT id, business_name, vendor_code, slug, email FROM vendors WHERE id = ?',
        [vendorId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });

      const vendor = rows[0];

      // Auto-assign vendor_code if missing (legacy vendors)
      let vendorCode = vendor.vendor_code;
      if (!vendorCode) {
        const slugPart = (vendor.slug || vendor.business_name || 'ven')
          .replace(/[^a-z0-9]/gi, '').substring(0, 4).toUpperCase();
        vendorCode = `HP-${slugPart || 'VEN'}-${Math.floor(1000 + Math.random() * 9000)}`;
        await db.query('UPDATE vendors SET vendor_code = ? WHERE id = ?', [vendorCode, vendor.id]);
      }

      const token = generateActivationToken(parseInt(vendorId), vendorCode);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Audit log (non-fatal)
      try {
        await db.query(
          'INSERT INTO saas_audit_logs (admin_name, action, details) VALUES (?, ?, ?)',
          ['Super Admin', 'GENERATE_ACTIVATION_TOKEN', `Token generated for "${vendor.business_name}" (#${vendor.id})`]
        );
      } catch (e) { /* ignore */ }

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

  // ── GET /api/vendors ────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const [rows] = await db.query(`
        SELECT id, business_name, vendor_code, tenant_id, slug, email, phone, status, features,
          COALESCE(plan_name, 'Professional POS') as plan_name,
          COALESCE(plan_price, 2499.00) as plan_price,
          renewal_date,
          COALESCE(grace_period_days, 7) as grace_period_days,
          COALESCE(subscription_status, 'ACTIVE') as subscription_status,
          created_at
        FROM vendors ORDER BY id ASC
      `);

      const parsed = rows.map(v => ({
        ...v,
        features: typeof v.features === 'string' ? JSON.parse(v.features) : (v.features || {})
      }));

      return res.status(200).json(parsed);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/vendors ── Create new vendor ──────────────────────────────────
  if (req.method === 'POST') {
    try {
      const {
        business_name, slug, email, phone, plan_name, plan_price,
        renewal_date, grace_period_days, features,
        owner_name, owner_password, tax_percent
      } = req.body;

      if (!business_name || !slug) {
        return res.status(400).json({ error: 'business_name and slug are required' });
      }

      // Generate unique codes
      const vendor_code = `HP-VEN-${Date.now().toString().slice(-5)}`;
      const tenant_id = `TEN-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;

      const [result] = await db.query(
        `INSERT INTO vendors (business_name, vendor_code, tenant_id, slug, email, phone, status, plan_name, plan_price, renewal_date, grace_period_days, subscription_status, features)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 'ACTIVE', ?)`,
        [
          business_name.trim(), vendor_code, tenant_id, slug.trim().toLowerCase(),
          email || null, phone || null,
          plan_name || 'Professional POS', plan_price || 2499.00,
          renewal_date || null, grace_period_days || 7,
          JSON.stringify(features || { takeaway: true, dinein: true, billing: true, kds: true, waiter: true, inventory: true, hr: true })
        ]
      );

      const vendorId = result.insertId;

      // 1. Create Restaurant Details in Cloud
      try {
        await db.query(
          `INSERT INTO restaurant_details (vendor_id, name, phone, email, tax_percent, daily_pin) VALUES (?, ?, ?, ?, ?, ?)`,
          [vendorId, business_name.trim(), phone || '', email || '', tax_percent !== undefined ? tax_percent : 0.00, '1234']
        );
      } catch (e) {
        console.error('Failed to create restaurant_details:', e.message);
      }

      // 2. Create Default Branch Location in Cloud
      try {
        await db.query(
          `INSERT INTO locations (vendor_id, name) VALUES (?, ?)`,
          [vendorId, 'Main Outlet']
        );
      } catch (e) {}

      // 3. Create Admin User in Cloud
      try {
        await db.query(
          `INSERT INTO users (vendor_id, name, email, password_hash, role, pin, is_active) VALUES (?, ?, ?, ?, 'admin', '1234', 1)`,
          [vendorId, owner_name || business_name.trim(), email || `admin@${slug}.in`, owner_password || 'admin123']
        );
      } catch (e) {
        console.error('Failed to create initial admin user:', e.message);
      }

      try {
        await db.query(
          `INSERT INTO saas_audit_logs (admin_name, action, details) VALUES (?, ?, ?)`,
          ['Super Admin', 'ONBOARD_VENDOR', `Onboarded new vendor: ${business_name} (ID: ${vendorId})`]
        );
      } catch (e) { /* ignore */ }

      return res.status(200).json({
        success: true,
        id: vendorId,
        vendor_code,
        tenant_id,
        message: `${business_name} onboarded successfully`
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
