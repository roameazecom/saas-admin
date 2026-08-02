import { getDb, cors } from './_db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();

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

      // Insert vendor
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

      // Create restaurant_details for this vendor if table exists
      try {
        await db.query(
          `INSERT INTO restaurant_details (vendor_id, name, phone, tax_percent, daily_pin) VALUES (?, ?, ?, ?, ?)`,
          [vendorId, business_name.trim(), phone || '', tax_percent || 5.00, '1234']
        );
      } catch (e) { /* ignore if table missing */ }

      // Create admin user for this vendor
      try {
        await db.query(
          `INSERT INTO users (vendor_id, name, email, password, role, pin, is_active) VALUES (?, ?, ?, ?, 'admin', '1234', 1)`,
          [vendorId, owner_name || business_name.trim(), email || `admin@${slug}.in`, owner_password || 'admin123']
        );
      } catch (e) { /* ignore */ }

      // Log action
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
