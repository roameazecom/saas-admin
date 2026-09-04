// ─────────────────────────────────────────────────────────────────────────────
process.env.TZ = 'Asia/Kolkata';
import express from 'express';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getActivationTokenSecret,
  hashPassword,
  verifyPassword,
  signSaasToken,
  requireSaasAdminAuth
} from './api/_auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Vendor-Id');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ── Cloud DB (TiDB) ───────────────────────────────────────────────────────────
let _pool = null;
function getDb() {
  if (_pool) return _pool;
  const required = ['CLOUD_DB_HOST', 'CLOUD_DB_USER', 'CLOUD_DB_PASSWORD', 'CLOUD_DB_NAME'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Cloud DB configuration missing: ${missing.join(', ')}`);
  }
  _pool = mysql.createPool({
    host: process.env.CLOUD_DB_HOST,
    port: parseInt(process.env.CLOUD_DB_PORT) || 4000,
    user: process.env.CLOUD_DB_USER,
    password: process.env.CLOUD_DB_PASSWORD,
    database: process.env.CLOUD_DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    timezone: '+05:30',
    dateStrings: true,
    ssl: process.env.CLOUD_DB_SSL === 'false' ? undefined : { rejectUnauthorized: false }
  });
  return _pool;
}

// ── Token helpers ─────────────────────────────────────────────────────────────
function generateActivationToken(vendorId, vendorCode) {
  const secret = getActivationTokenSecret();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ vendorId, vendorCode, expiresAt })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
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

function verifySyncToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const parts = rawToken.split('.');
  if (parts.length !== 4 || parts[0] !== 'saas' || parts[1] !== 'sync') return null;
  const payloadB64 = parts[2];
  const sig = parts[3];
  const secret = getActivationTokenSecret();
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.type !== 'vendor_sync') return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function requireSaasAdminMiddleware(req, res, next) {
  const session = requireSaasAdminAuth(req, res);
  if (session) next();
}

// ── Audit helper ──────────────────────────────────────────────────────────────
async function audit(action, details) {
  try {
    await getDb().query(
      'INSERT INTO saas_audit_logs (admin_name, action, details) VALUES (?, ?, ?)',
      ['Super Admin', action, details]
    );
  } catch (e) { /* non-fatal */ }
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
  const details = cleanRestaurantDetails(row, fallback);
  return {
    id: row.id || null,
    vendor_id: row.vendor_id || fallback.vendor_id || null,
    restaurant_id: row.restaurant_id || fallback.restaurant_id || 1,
    location_id: row.location_id || fallback.location_id || 1,
    ...details
  };
}

async function fetchRestaurantDetails(db, vendorId, fallback = {}) {
  const [rows] = await db.query('SELECT * FROM restaurant_details WHERE vendor_id = ? ORDER BY id ASC LIMIT 1', [vendorId]);
  if (rows.length) return sanitizeRestaurantDetails(rows[0], { ...fallback, vendor_id: vendorId });
  return sanitizeRestaurantDetails({}, { ...fallback, vendor_id: vendorId });
}

async function upsertRestaurantDetails(db, vendorId, input = {}, fallback = {}) {
  const columns = await getTableColumns(db, 'restaurant_details');
  const details = cleanRestaurantDetails(input, fallback);
  const fieldValues = {
    vendor_id: vendorId,
    restaurant_id: input.restaurant_id || fallback.restaurant_id || 1,
    location_id: input.location_id || fallback.location_id || 1,
    ...details
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

// ── POST /api/sync/gateway (HTTPS Sync Gateway for packaged POS clients) ──────
app.post('/api/sync/gateway', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED_SYNC_TOKEN', error: 'Sync token required' });
  }
  const token = authHeader.slice(7).trim();
  const claims = verifySyncToken(token);
  if (!claims || !claims.vendorId) {
    return res.status(401).json({ success: false, code: 'INVALID_SYNC_TOKEN', error: 'Invalid or expired sync token' });
  }

  const { orders } = req.body || {};
  const db = getDb();
  let uploadedOrders = 0;

  try {
    if (Array.isArray(orders) && orders.length > 0) {
      for (const ord of orders) {
        if (Number(ord.vendor_id) === Number(claims.vendorId)) {
          await db.query(`
            INSERT INTO orders (id, sync_uuid, table_id, status, subtotal, tax_amount, total_amount, created_at, payment_type, customer_name, customer_phone, user_id, order_type, discount_amount, vendor_id, restaurant_id, location_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE sync_uuid=VALUES(sync_uuid), status=VALUES(status), total_amount=VALUES(total_amount), payment_type=VALUES(payment_type)
          `, [
            ord.id, ord.sync_uuid || null, ord.table_id || null, ord.status || 'completed', ord.subtotal || 0, ord.tax_amount || 0,
            ord.total_amount || 0, ord.created_at || new Date(), ord.payment_type || 'cash', ord.customer_name || null,
            ord.customer_phone || null, ord.user_id || null, ord.order_type || 'dine_in', ord.discount_amount || 0,
            claims.vendorId, ord.restaurant_id || 1, ord.location_id || 1, ord.notes || null
          ]);
          uploadedOrders++;
        }
      }
    }
    return res.json({ success: true, vendorId: claims.vendorId, uploadedOrders, timestamp: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/login ───────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    // Ensure ACTIVATION_TOKEN_SECRET is present (fail-closed)
    getActivationTokenSecret();

    const db = getDb();
    const [users] = await db.query(
      'SELECT id, name, email, role, phone, status, password_hash FROM saas_users WHERE LOWER(TRIM(email)) = ?',
      [String(email).trim().toLowerCase()]
    );
    if (!users.length) return res.status(401).json({ error: 'Invalid email or password' });
    const user = users[0];
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });

    const authRes = verifyPassword(password, user.password_hash);
    if (!authRes.ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (authRes.upgradeHash) {
      try {
        await db.query('UPDATE saas_users SET password_hash = ? WHERE id = ?', [authRes.upgradeHash, user.id]);
        console.log(`[SaaS Auth] Transparently upgraded password hash for admin user #${user.id}`);
      } catch (e) {
        console.warn('[SaaS Auth] Could not persist upgraded password hash:', e.message);
      }
    }

    // Sanitize user object (never leak credentials or hashes)
    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status
    };

    const token = signSaasToken(sanitizedUser);
    res.json({ success: true, user: sanitizedUser, token });
  } catch (e) {
    if (e.code === 'ACTIVATION_TOKEN_SECRET_MISSING') {
      return res.status(500).json({ error: 'SaaS security configuration error: ACTIVATION_TOKEN_SECRET is missing.', code: 'SECRET_REQUIRED' });
    }
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/vendors ──────────────────────────────────────────────────────────
app.get('/api/vendors', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const [rows] = await getDb().query(`
      SELECT id, business_name, vendor_code, tenant_id, slug, email, phone, status, features, support_pin,
        COALESCE(plan_name,'Professional POS') as plan_name,
        COALESCE(plan_price,2499.00) as plan_price,
        renewal_date,
        COALESCE(grace_period_days,7) as grace_period_days,
        COALESCE(subscription_status,'ACTIVE') as subscription_status,
        created_at
      FROM vendors ORDER BY id ASC
    `);
    res.json(rows.map(v => ({ ...v, features: typeof v.features === 'string' ? JSON.parse(v.features) : (v.features || {}) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/vendors/activate — POS Activation via Token (Cloud-Authoritative) ─
app.post('/api/vendors/activate', async (req, res) => {
  try {
    const { activation_token } = req.body;
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
    const db = getDb();

    // Fetch vendor from cloud TiDB
    const [rows] = await db.query(
      'SELECT id, business_name, vendor_code, email, phone, features FROM vendors WHERE id = ?',
      [vendorId]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Vendor not found in SaaS Cloud.',
        code: 'VENDOR_NOT_FOUND'
      });
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
    } catch (lErr) { /* non-fatal */ }

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
    } catch (uErr) { /* non-fatal fallback */ }

    const syncToken = generateSyncToken(vendor.id, vendorCode);

    await audit('POS_CLIENT_ACTIVATED', `POS activated for vendor "${vendor.business_name}" (#${vendor.id}) code: ${vendorCode}`);

    res.json({
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
    console.error('[SaaS Admin Activation Error]:', err.message);
    res.status(500).json({ error: err.message, code: 'ACTIVATION_SERVER_ERROR' });
  }
});

// ── POST /api/vendors/:id/generate-token ─────────────────────────────────────
app.post('/api/vendors/:id/generate-token', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const [rows] = await db.query('SELECT id, business_name, vendor_code, slug, email FROM vendors WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });

    const vendor = rows[0];
    let vendorCode = vendor.vendor_code;
    if (!vendorCode) {
      const sp = (vendor.slug || vendor.business_name || 'ven').replace(/[^a-z0-9]/gi, '').substring(0, 4).toUpperCase();
      vendorCode = `HP-${sp || 'VEN'}-${Math.floor(1000 + Math.random() * 9000)}`;
      await db.query('UPDATE vendors SET vendor_code = ? WHERE id = ?', [vendorCode, vendor.id]);
    }

    const token = generateActivationToken(vendor.id, vendorCode);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await audit('GENERATE_ACTIVATION_TOKEN', `Token for "${vendor.business_name}" (#${vendor.id}) by ${req.saasAdmin?.email || 'admin'}`);

    res.json({ success: true, token, vendor_name: vendor.business_name, vendor_code: vendorCode, expires_at: expiresAt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/vendors — Create vendor (must come AFTER /:id/generate-token) ──
app.post('/api/vendors', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const {
      business_name, slug, email, phone, plan_name, plan_price, renewal_date,
      grace_period_days, features, owner_name, owner_password, tax_percent,
      brand_name, address, tax_enabled, tax_name, tax_mode, gst, gst_number,
      fssai, fssai_number, brand_logo_url, default_outlet_name, outlet_address
    } = req.body;
    if (!business_name || !slug) return res.status(400).json({ error: 'business_name and slug required' });

    const vendor_code = `HP-VEN-${Date.now().toString().slice(-5)}`;
    const tenant_id = `TEN-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
    const db = getDb();

    const [result] = await db.query(
      `INSERT INTO vendors (business_name, vendor_code, tenant_id, slug, email, phone, status, plan_name, plan_price, renewal_date, grace_period_days, subscription_status, features)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 'ACTIVE', ?)`,
      [business_name.trim(), vendor_code, tenant_id, slug.trim().toLowerCase(), email || null, phone || null,
       plan_name || 'Professional POS', plan_price || 2499.00, renewal_date || null, grace_period_days || 7,
       JSON.stringify(features || { takeaway: true, dinein: true, billing: true, kds: true, waiter: true, inventory: true, hr: true })]
    );
    const vendorId = result.insertId;
    const initialPassword = owner_password || crypto.randomBytes(12).toString('base64url');
    const ownerPasswordHash = hashPassword(initialPassword);
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
      const userColumns = await getTableColumns(db, 'users');
      const userValues = {
        vendor_id: vendorId,
        name: owner_name || business_name.trim(),
        email: email || `admin@${slug}.in`,
        password_hash: ownerPasswordHash,
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
    } catch (e) {}
    await audit('ONBOARD_VENDOR', `Onboarded: ${business_name} (ID: ${vendorId})`);
    res.json({ success: true, id: vendorId, vendor_code, tenant_id, message: `${business_name} onboarded successfully` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/vendors/:id ──────────────────────────────────────────────────────
app.put('/api/vendors/:id', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const {
      business_name, slug, email, phone, status, plan_name, plan_price,
      renewal_date, grace_period_days, subscription_status, features, support_pin
    } = req.body;
    const updates = []; const values = [];
    if (business_name !== undefined) { updates.push('business_name = ?'); values.push(String(business_name).trim()); }
    if (slug !== undefined) { updates.push('slug = ?'); values.push(String(slug).trim().toLowerCase()); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email || null); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone || null); }
    if (support_pin !== undefined) { updates.push('support_pin = ?'); values.push(support_pin || null); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (plan_name !== undefined) { updates.push('plan_name = ?'); values.push(plan_name); }
    if (plan_price !== undefined) { updates.push('plan_price = ?'); values.push(plan_price); }
    if (renewal_date !== undefined) { updates.push('renewal_date = ?'); values.push(renewal_date); }
    if (grace_period_days !== undefined) { updates.push('grace_period_days = ?'); values.push(grace_period_days); }
    if (subscription_status !== undefined) { updates.push('subscription_status = ?'); values.push(subscription_status); }
    if (features !== undefined) { updates.push('features = ?'); values.push(JSON.stringify(features)); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.params.id);
    await getDb().query(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`, values);
    await audit('UPDATE_VENDOR', `Updated vendor #${req.params.id}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/vendors/update — Frontend-friendly alias for PUT /api/vendors/:id ─
app.post('/api/vendors/update', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const {
      id, status, plan_name, plan_price, renewal_date, grace_period_days,
      subscription_status, features, business_name, slug, email, phone, support_pin
    } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const updates = []; const values = [];
    if (business_name !== undefined) { updates.push('business_name = ?'); values.push(String(business_name).trim()); }
    if (slug !== undefined) { updates.push('slug = ?'); values.push(String(slug).trim().toLowerCase()); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email || null); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone || null); }
    if (support_pin !== undefined) { updates.push('support_pin = ?'); values.push(support_pin || null); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (plan_name !== undefined) { updates.push('plan_name = ?'); values.push(plan_name); }
    if (plan_price !== undefined) { updates.push('plan_price = ?'); values.push(plan_price); }
    if (renewal_date !== undefined) { updates.push('renewal_date = ?'); values.push(renewal_date); }
    if (grace_period_days !== undefined) { updates.push('grace_period_days = ?'); values.push(grace_period_days); }
    if (subscription_status !== undefined) { updates.push('subscription_status = ?'); values.push(subscription_status); }
    if (features !== undefined) { updates.push('features = ?'); values.push(JSON.stringify(features)); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(id);
    await getDb().query(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`, values);
    await audit('UPDATE_VENDOR', `Updated vendor #${id}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── GET /api/vendors/:id/stats ────────────────────────────────────────────────
app.get('/api/vendors/:id/stats', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const [[orderData]] = await db.query(`SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount),0) as total_revenue FROM orders WHERE vendor_id = ?`, [req.params.id]).catch(() => [[{ total_orders: 0, total_revenue: 0 }]]);
    const [[staffData]] = await db.query(`SELECT COUNT(*) as staff_count FROM users WHERE vendor_id = ? AND role != 'admin'`, [req.params.id]).catch(() => [[{ staff_count: 0 }]]);
    res.json({ ...orderData, ...staffData });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/vendors/:id/config ───────────────────────────────────────────────
app.get('/api/vendors/:id/config', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const [rows] = await getDb().query('SELECT id, business_name, vendor_code, slug FROM vendors WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });
    const v = rows[0];
    const vendorCode = v.vendor_code || `HP-VEN-${v.id}`;
    const activationToken = generateActivationToken(v.id, vendorCode);
    res.json({
      vendor_id: v.id,
      vendor_name: v.business_name,
      vendor_slug: v.slug,
      vendor_code: vendorCode,
      activation_token: activationToken,
      expires_in_days: 7,
      setup_instructions: [
        'Download & install HappyPie POS on the restaurant computer',
        'Launch the POS app and open the Setup Wizard',
        'Paste this SaaS Admin activation token',
        'The POS will verify online once and then run offline-first on local SQLite',
        'Do not copy cloud database credentials or .env files to client machines'
      ]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET/POST /api/vendors/:id/outlets ─────────────────────────────────────────
app.get('/api/vendors/:id/outlets', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const [rows] = await getDb().query('SELECT * FROM locations WHERE vendor_id = ? ORDER BY id ASC', [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/vendors/:id/outlets', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const [r] = await getDb().query('INSERT INTO locations (vendor_id, name) VALUES (?, ?)', [req.params.id, name]);
    res.json({ success: true, id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/vendors/:vendorId/outlets/:outletId', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const { name, address, is_active } = req.body;
    const db = getDb();
    const columns = await getTableColumns(db, 'locations');
    const updates = [];
    const values = [];
    if (name !== undefined && columns.has('name')) { updates.push('name = ?'); values.push(String(name).trim()); }
    if (address !== undefined && columns.has('address')) { updates.push('address = ?'); values.push(address || null); }
    if (is_active !== undefined && columns.has('is_active')) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.params.vendorId, req.params.outletId);
    await db.query(`UPDATE locations SET ${updates.join(', ')} WHERE vendor_id = ? AND id = ?`, values);
    await audit('UPDATE_OUTLET', `Updated outlet #${req.params.outletId} for vendor #${req.params.vendorId}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/vendors/:vendorId/outlets/:outletId', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const columns = await getTableColumns(db, 'locations');
    if (columns.has('is_active')) {
      await db.query('UPDATE locations SET is_active = 0 WHERE vendor_id = ? AND id = ?', [req.params.vendorId, req.params.outletId]);
    } else {
      await db.query('DELETE FROM locations WHERE vendor_id = ? AND id = ?', [req.params.vendorId, req.params.outletId]);
    }
    await audit('DELETE_OUTLET', `Removed outlet #${req.params.outletId} for vendor #${req.params.vendorId}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/vendors/:id/restaurant-details', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const [vendors] = await db.query('SELECT id, business_name, email, phone FROM vendors WHERE id = ?', [req.params.id]);
    if (!vendors.length) return res.status(404).json({ error: 'Vendor not found' });
    const details = await fetchRestaurantDetails(db, req.params.id, vendors[0]);
    res.json(details);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/vendors/:id/restaurant-details', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const [vendors] = await db.query('SELECT id, business_name, email, phone FROM vendors WHERE id = ?', [req.params.id]);
    if (!vendors.length) return res.status(404).json({ error: 'Vendor not found' });
    const details = await upsertRestaurantDetails(db, req.params.id, req.body, vendors[0]);
    await audit('UPDATE_RESTAURANT_DETAILS', `Updated restaurant details for vendor #${req.params.id}`);
    res.json({ success: true, restaurant_details: details });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/analytics ────────────────────────────────────────────────────────
app.get('/api/vendors/analytics/global', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const [[vs]] = await db.query(`SELECT COUNT(*) as total_vendors, SUM(status='active') as active_vendors, SUM(status='suspended') as suspended_vendors FROM vendors`);
    const [[orders]] = await db.query(`SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount),0) as total_revenue FROM orders`).catch(() => [[{ total_orders: 0, total_revenue: 0 }]]);
    const [[today]] = await db.query(`SELECT COUNT(*) as today_orders FROM orders WHERE DATE(created_at) = CURDATE()`).catch(() => [[{ today_orders: 0 }]]);
    res.json({ ...vs, ...orders, ...today, mrr: (vs.active_vendors || 0) * 2499 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET/POST /api/tickets ─────────────────────────────────────────────────────
app.get('/api/tickets', requireSaasAdminMiddleware, async (req, res) => {
  try { const [r] = await getDb().query('SELECT * FROM saas_tickets ORDER BY created_at DESC'); res.json(r); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const { ticketId, ticket_id, id, status, vendor_id, vendor_name, subject, description, priority } = req.body;
    const db = getDb();
    if (status && (ticketId || ticket_id || id)) {
      const session = requireSaasAdminAuth(req, res);
      if (!session) return;
      await db.query('UPDATE saas_tickets SET status = ? WHERE id = ?', [status, ticketId || ticket_id || id]);
      return res.json({ success: true });
    }
    const [r] = await db.query(`INSERT INTO saas_tickets (vendor_id, vendor_name, subject, description, priority, status) VALUES (?, ?, ?, ?, ?, 'open')`, [vendor_id, vendor_name, subject, description, priority || 'medium']);
    res.json({ success: true, id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET/POST /api/plans ───────────────────────────────────────────────────────
app.get('/api/plans', async (req, res) => {
  try { const [r] = await getDb().query('SELECT * FROM saas_plans ORDER BY price ASC'); res.json(r); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/plans', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const { name, price, billing_cycle, features_included } = req.body;
    const [r] = await getDb().query('INSERT INTO saas_plans (name, price, billing_cycle, features_included) VALUES (?, ?, ?, ?)', [name, price, billing_cycle || 'monthly', JSON.stringify(features_included || {})]);
    res.json({ success: true, id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET/POST /api/announcements ───────────────────────────────────────────────
app.get('/api/announcements', async (req, res) => {
  try { const [r] = await getDb().query('SELECT * FROM saas_announcements ORDER BY created_at DESC LIMIT 10'); res.json(r); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/announcements', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const { title, message } = req.body;
    const [r] = await getDb().query('INSERT INTO saas_announcements (title, message, created_by) VALUES (?, ?, ?)', [title, message, req.saasAdmin?.email || 'Super Admin']);
    res.json({ success: true, id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/announcements/:id', requireSaasAdminMiddleware, async (req, res) => {
  try {
    await getDb().query('DELETE FROM saas_announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── GET /api/audit-logs ───────────────────────────────────────────────────────
app.get('/api/audit-logs', requireSaasAdminMiddleware, async (req, res) => {
  try { const [r] = await getDb().query('SELECT * FROM saas_audit_logs ORDER BY created_at DESC LIMIT 100'); res.json(r); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET/POST/DELETE /api/team ─────────────────────────────────────────────────
app.get('/api/team', requireSaasAdminMiddleware, async (req, res) => {
  try { const [r] = await getDb().query('SELECT id, name, email, role, phone, status, created_at FROM saas_users ORDER BY created_at DESC'); res.json(r); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/team', requireSaasAdminMiddleware, async (req, res) => {
  try {
    const { name, email, password, role, phone, memberId, status } = req.body;
    const db = getDb();
    if (memberId && status) {
      await db.query('UPDATE saas_users SET status = ? WHERE id = ?', [status, memberId]);
      return res.json({ success: true });
    }
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    const passwordHash = hashPassword(password);
    const [r] = await db.query('INSERT INTO saas_users (name, email, password_hash, role, phone, status) VALUES (?, ?, ?, ?, ?, ?)', [name, email, passwordHash, role || 'saas_manager', phone || null, 'active']);
    res.json({ success: true, id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/team/:id', requireSaasAdminMiddleware, async (req, res) => {
  try { await getDb().query('DELETE FROM saas_users WHERE id = ?', [req.params.id]); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVE REACT SPA (must be last)
// ─────────────────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ HappyPie SaaS Admin running on port ${PORT}`);
  console.log(`   DB: ${process.env.CLOUD_DB_HOST || 'NOT SET'}`);
});
