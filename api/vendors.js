import { getDb, cors } from './_db.js';
import crypto from 'crypto';
import { getActivationTokenSecret, hashPassword, requireSaasAdminAuth } from './_auth.js';

function generateActivationToken(vendorId, vendorCode) {
  const tokenSecret = getActivationTokenSecret();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = Buffer.from(JSON.stringify({ vendorId, vendorCode, expiresAt })).toString('base64url');
  const sig = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyActivationToken(token) {
  try {
    const secret = getActivationTokenSecret();
    const parts = String(token).trim().split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    if (!payload || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Date.now() > data.expiresAt) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function generateSyncToken(vendorId, vendorCode) {
  const secret = getActivationTokenSecret();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (30 * 24 * 60 * 60); // 30-day expiring token
  const jti = crypto.randomBytes(16).toString('hex'); // revocability identifier
  const payload = Buffer.from(JSON.stringify({
    vendorId,
    vendorCode,
    type: 'vendor_sync',
    iat,
    exp,
    jti
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `saas.sync.${payload}.${sig}`;
}

async function getTableColumns(db, tableName) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  return new Set(rows.map(row => row.Field));
}

function cleanRestaurantDetails(input = {}, fallback = {}) {
  const name = String(input.brand_name || input.name || fallback.business_name || '').trim();
  const gst = String(input.gst || input.gst_number || '').trim();
  const fssai = String(input.fssai || input.fssai_number || '').trim();
  const logo = String(input.brand_logo_url || input.logo_url || '').trim();
  const taxEnabled = input.tax_enabled === true || input.tax_enabled === 1 || input.tax_enabled === '1' || input.tax_enabled === 'true';
  const taxPercent = input.tax_percent !== undefined && input.tax_percent !== null && input.tax_percent !== ''
    ? Number(input.tax_percent)
    : Number(fallback.tax_percent || 0);

  return {
    name,
    brand_name: name,
    address: input.address || null,
    phone: input.phone || fallback.phone || null,
    email: input.email || fallback.email || null,
    tax_enabled: taxEnabled ? 1 : 0,
    tax_percent: Number.isFinite(taxPercent) ? taxPercent : 0,
    tax_name: input.tax_name || 'GST',
    tax_mode: String(input.tax_mode || 'EXCLUSIVE').toUpperCase(),
    gst: gst || null,
    gst_number: gst || null,
    fssai_number: fssai || null,
    brand_logo_url: logo || null,
    daily_pin: input.daily_pin || '1234'
  };
}

function sanitizeRestaurantDetails(row = {}, fallback = {}) {
  return {
    id: row.id || null,
    vendor_id: row.vendor_id || fallback.vendor_id || null,
    restaurant_id: row.restaurant_id || fallback.restaurant_id || 1,
    location_id: row.location_id || fallback.location_id || 1,
    ...cleanRestaurantDetails(row, fallback)
  };
}

async function fetchRestaurantDetails(db, vendorId, fallback = {}) {
  const [rows] = await db.query('SELECT * FROM restaurant_details WHERE vendor_id = ? ORDER BY id ASC LIMIT 1', [vendorId]);
  if (rows.length) return sanitizeRestaurantDetails(rows[0], { ...fallback, vendor_id: vendorId });
  return sanitizeRestaurantDetails({}, { ...fallback, vendor_id: vendorId });
}

async function upsertRestaurantDetails(db, vendorId, input = {}, fallback = {}) {
  const columns = await getTableColumns(db, 'restaurant_details');
  const fieldValues = {
    vendor_id: vendorId,
    restaurant_id: input.restaurant_id || fallback.restaurant_id || 1,
    location_id: input.location_id || fallback.location_id || 1,
    ...cleanRestaurantDetails(input, fallback)
  };
  const [existing] = await db.query('SELECT id FROM restaurant_details WHERE vendor_id = ? ORDER BY id ASC LIMIT 1', [vendorId]);
  if (existing.length) {
    const updateFields = Object.keys(fieldValues).filter(field => field !== 'vendor_id' && columns.has(field));
    if (updateFields.length) {
      await db.query(
        `UPDATE restaurant_details SET ${updateFields.map(field => `${field} = ?`).join(', ')} WHERE vendor_id = ?`,
        [...updateFields.map(field => fieldValues[field]), vendorId]
      );
    }
  } else {
    const insertFields = Object.keys(fieldValues).filter(field => columns.has(field));
    await db.query(
      `INSERT INTO restaurant_details (${insertFields.join(', ')}) VALUES (${insertFields.map(() => '?').join(', ')})`,
      insertFields.map(field => fieldValues[field])
    );
  }
  return fetchRestaurantDetails(db, vendorId, fallback);
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();

  // ── POST /api/vendors?action=activate (Public client activation via token) ───
  if (req.method === 'POST' && (req.query.action === 'activate' || req.body?.action === 'activate' || req.url?.includes('activate'))) {
    try {
      const { activation_token } = req.body || {};
      if (!activation_token || !String(activation_token).trim()) {
        return res.status(400).json({ error: 'activation_token is required', code: 'TOKEN_REQUIRED' });
      }

      const tokenData = verifyActivationToken(activation_token);
      if (!tokenData) {
        return res.status(401).json({
          error: 'Invalid or expired activation token. Please generate a new one from SaaS Admin.',
          code: 'INVALID_OR_EXPIRED_ACTIVATION_TOKEN'
        });
      }

      const { vendorId, vendorCode } = tokenData;

      const [rows] = await db.query(
        'SELECT id, business_name, vendor_code, email, phone, features FROM vendors WHERE id = ?',
        [vendorId]
      );

      if (!rows.length) {
        return res.status(404).json({ error: 'Vendor not found in SaaS Cloud.', code: 'VENDOR_NOT_FOUND' });
      }

      const vendor = rows[0];
      const dbCode = vendor.vendor_code || vendorCode;
      if (dbCode !== vendorCode) {
        return res.status(401).json({
          error: 'Token vendor_code mismatch. Please regenerate token.',
          code: 'INVALID_OR_EXPIRED_ACTIVATION_TOKEN'
        });
      }

      const features = typeof vendor.features === 'string'
        ? JSON.parse(vendor.features || '{}')
        : (vendor.features || {
            takeaway: true, dinein: true, billing: true, kds: true, waiter: true, customer_qr: true, inventory: true, multi_outlet: true, hr: true
          });

      let adminPin = '1234';
      let adminEmail = vendor.email || `admin.${String(vendorCode).toLowerCase().replace(/[^a-z0-9]/g, '')}@restaurant.local`;
      let locationId = 1;
      try {
        const [locs] = await db.query('SELECT id FROM locations WHERE vendor_id = ? ORDER BY id ASC LIMIT 1', [vendorId]);
        if (locs.length) locationId = locs[0].id;
      } catch (lErr) {}

      const restaurantDetails = await fetchRestaurantDetails(db, vendorId, {
        business_name: vendor.business_name,
        email: vendor.email,
        phone: vendor.phone,
        location_id: locationId
      });

      try {
        const [users] = await db.query(
          "SELECT id, email, pin FROM users WHERE vendor_id = ? AND (role = 'admin' OR role = 'super_admin' OR role = 'owner') ORDER BY id ASC LIMIT 1",
          [vendorId]
        );
        if (users.length) {
          if (users[0].pin && String(users[0].pin).trim()) {
            adminPin = String(users[0].pin).trim();
          } else {
            adminPin = '1234';
            try {
              await db.query("UPDATE users SET pin = '1234' WHERE id = ?", [users[0].id]);
            } catch (e) {}
          }
          if (users[0].email) adminEmail = users[0].email;
        } else {
          adminPin = '1234';
          try {
            const tempAdminPassword = crypto.randomBytes(16).toString('hex');
            const securePasswordHash = hashPassword(tempAdminPassword);
            await db.query(
              "INSERT INTO users (vendor_id, name, email, password_hash, role, pin, location_id) VALUES (?, ?, ?, ?, 'admin', '1234', ?)",
              [vendorId, vendor.business_name, adminEmail, securePasswordHash, locationId]
            );
          } catch (e) {}
        }
      } catch (uErr) {}

      const syncToken = generateSyncToken(vendor.id, vendorCode);

      try {
        await db.query(
          'INSERT INTO saas_audit_logs (admin_name, action, details) VALUES (?, ?, ?)',
          ['Client Setup', 'POS_CLIENT_ACTIVATED', `POS activated for "${vendor.business_name}" (#${vendor.id})`]
        );
      } catch (e) {}

      return res.status(200).json({
        success: true,
        vendor_id: vendor.id,
        vendor_code: vendorCode,
        vendor_name: vendor.business_name,
        admin_email: adminEmail,
        admin_pin: adminPin,
        restaurant_id: 1,
        location_id: locationId,
        restaurant_details: { ...restaurantDetails, location_id: locationId },
        features,
        sync_token: syncToken
      });
    } catch (err) {
      return res.status(500).json({ error: err.message, code: 'ACTIVATION_SERVER_ERROR' });
    }
  }

  // ── POST /api/vendors?action=generate-token&vendorId=X ─────────────────────
  if (req.method === 'POST' && req.query.action === 'generate-token') {
    const admin = requireSaasAdminAuth(req, res);
    if (!admin) return;
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
          [admin.email || 'SaaS Admin', 'GENERATE_ACTIVATION_TOKEN', `Token generated for "${vendor.business_name}" (#${vendor.id})`]
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
    const admin = requireSaasAdminAuth(req, res);
    if (!admin) return;
    try {
      const [rows] = await db.query(`
        SELECT id, business_name, vendor_code, tenant_id, slug, email, phone, status, features, support_pin,
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
    const admin = requireSaasAdminAuth(req, res);
    if (!admin) return;
    try {
      const {
        business_name, slug, email, phone, plan_name, plan_price,
        renewal_date, grace_period_days, features,
        owner_name, owner_password, tax_percent,
        brand_name, address, tax_enabled, tax_name, tax_mode, gst, gst_number,
        fssai, fssai_number, brand_logo_url, default_outlet_name, outlet_address
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

      let locationId = 1;
      try {
        const locationColumns = await getTableColumns(db, 'locations');
        const locationValues = {
          vendor_id: vendorId,
          restaurant_id: 1,
          name: default_outlet_name || 'Main Outlet',
          address: outlet_address || address || null,
          is_active: 1
        };
        const fields = Object.keys(locationValues).filter(field => locationColumns.has(field));
        const [locResult] = await db.query(
          `INSERT INTO locations (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
          fields.map(field => locationValues[field])
        );
        locationId = locResult.insertId || 1;
      } catch (e) {}

      try {
        await upsertRestaurantDetails(db, vendorId, {
          name: brand_name || business_name,
          brand_name: brand_name || business_name,
          address,
          phone,
          email,
          tax_enabled,
          tax_percent,
          tax_name,
          tax_mode,
          gst: gst || gst_number,
          gst_number: gst_number || gst,
          fssai_number: fssai_number || fssai,
          brand_logo_url,
          restaurant_id: 1,
          location_id: locationId
        }, { business_name, email, phone, location_id: locationId });
      } catch (e) {
        console.error('Failed to create restaurant_details:', e.message);
      }

      try {
        const initialPassword = owner_password || crypto.randomBytes(12).toString('base64url');
        const userColumns = await getTableColumns(db, 'users');
        const userValues = {
          vendor_id: vendorId,
          name: owner_name || business_name.trim(),
          email: email || `admin@${slug}.in`,
          password_hash: hashPassword(initialPassword),
          role: 'admin',
          pin: '1234',
          is_active: 1,
          location_id: locationId
        };
        const fields = Object.keys(userValues).filter(field => userColumns.has(field));
        await db.query(
          `INSERT INTO users (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
          fields.map(field => userValues[field])
        );
      } catch (e) {
        console.error('Failed to create initial admin user:', e.message);
      }

      try {
        await db.query(
          `INSERT INTO saas_audit_logs (admin_name, action, details) VALUES (?, ?, ?)`,
          [admin.email || 'SaaS Admin', 'ONBOARD_VENDOR', `Onboarded new vendor: ${business_name} (ID: ${vendorId})`]
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
