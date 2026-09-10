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

async function getTableColumnInfo(db, tableName) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  return new Map(rows.map(row => [row.Field, row]));
}

const SYNC_GATEWAY_TABLES = {
  orders: {
    columns: ['id', 'sync_uuid', 'table_id', 'status', 'subtotal', 'tax_amount', 'total_amount', 'created_at', 'payment_type', 'customer_name', 'customer_phone', 'user_id', 'order_type', 'discount_amount', 'vendor_id', 'restaurant_id', 'location_id', 'notes'],
    updateColumns: ['sync_uuid', 'status', 'subtotal', 'tax_amount', 'total_amount', 'payment_type', 'customer_name', 'customer_phone', 'user_id', 'order_type', 'discount_amount', 'restaurant_id', 'location_id', 'notes']
  },
  order_items: {
    columns: ['id', 'sync_uuid', 'order_id', 'order_sync_uuid', 'menu_item_id', 'kot_id', 'quantity', 'price', 'status', 'discount_amount', 'notes'],
    updateColumns: ['sync_uuid', 'order_sync_uuid', 'menu_item_id', 'kot_id', 'quantity', 'price', 'status', 'discount_amount', 'notes']
  },
  checkout_settlements: {
    columns: ['id', 'sync_uuid', 'vendor_id', 'location_id', 'order_id', 'checkout_id', 'payment_type', 'currency', 'line_gross_minor', 'line_discount_minor', 'subtotal_after_line_discount_minor', 'order_discount_minor', 'net_subtotal_minor', 'tax_minor', 'total_payable_minor', 'tendered_minor', 'change_due_minor', 'tax_snapshot_version', 'tax_enabled_snapshot', 'tax_percent_snapshot', 'tax_name_snapshot', 'tax_mode_snapshot', 'pos_session_id', 'status', 'created_by_user_id', 'created_at'],
    updateColumns: ['payment_type', 'currency', 'status']
  },
  inventory_logs: {
    columns: ['id', 'vendor_id', 'item_id', 'type', 'quantity', 'logged_by', 'notes', 'created_at'],
    updateColumns: ['item_id', 'type', 'quantity', 'logged_by', 'notes']
  },
  cancellations_log: {
    columns: ['id', 'order_id', 'order_item_id', 'item_name', 'quantity', 'price', 'cancelled_by', 'cancelled_by_name', 'reason', 'created_at', 'vendor_id', 'restaurant_id', 'location_id'],
    updateColumns: ['order_item_id', 'item_name', 'quantity', 'price', 'cancelled_by', 'cancelled_by_name', 'reason', 'restaurant_id', 'location_id']
  },
  pos_sessions: {
    columns: ['id', 'vendor_id', 'user_id', 'opened_at', 'closed_at', 'opening_cash', 'expected_cash', 'closing_cash', 'total_upi_sales', 'total_card_sales', 'total_expenses', 'status', 'notes', 'settled_by_name', 'synced'],
    updateColumns: ['closed_at', 'expected_cash', 'closing_cash', 'total_upi_sales', 'total_card_sales', 'total_expenses', 'status', 'notes', 'settled_by_name', 'synced']
  },
  attendance: {
    columns: ['id', 'user_id', 'punch_in', 'punch_out', 'vendor_id'],
    updateColumns: ['user_id', 'punch_in', 'punch_out']
  },
  expenses: {
    columns: ['id', 'title', 'category', 'vendor_name', 'amount', 'payment_mode', 'paid_by', 'date', 'comment', 'created_at', 'vendor_id'],
    updateColumns: ['title', 'category', 'vendor_name', 'amount', 'payment_mode', 'paid_by', 'date', 'comment']
  },
  daily_activity_logs: {
    columns: ['id', 'vendor_id', 'log_date', 'activities', 'updated_at'],
    updateColumns: ['log_date', 'activities', 'updated_at']
  },
  vendor_payments: {
    columns: ['id', 'vendor_id', 'supplier_name', 'bill_number', 'bill_amount', 'paid_amount', 'payment_mode', 'notes', 'date', 'created_at'],
    updateColumns: ['supplier_name', 'bill_number', 'bill_amount', 'paid_amount', 'payment_mode', 'notes', 'date']
  },
  staff_advances: {
    columns: ['id', 'vendor_id', 'staff_name', 'total_advance_given', 'amount_recovered', 'created_at'],
    updateColumns: ['staff_name', 'total_advance_given', 'amount_recovered']
  }
};

function cleanPositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function gatewayValueFor(field, row, claims, scope) {
  if (field === 'vendor_id') return Number(claims.vendorId);
  if (field === 'restaurant_id') return cleanPositiveInt(row.restaurant_id) || cleanPositiveInt(scope.restaurant_id) || null;
  if (field === 'location_id') return cleanPositiveInt(row.location_id) || cleanPositiveInt(scope.location_id) || null;
  if (field === 'synced') return 1;
  return row[field] !== undefined ? row[field] : null;
}

async function upsertGatewayRows(db, tableName, rows, claims, scope, context = {}) {
  const spec = SYNC_GATEWAY_TABLES[tableName];
  if (!spec || !Array.isArray(rows) || rows.length === 0) {
    return { count: 0, ids: [] };
  }

  const columnInfo = await getTableColumnInfo(db, tableName).catch(() => null);
  if (!columnInfo) {
    return { count: 0, ids: [], warning: `${tableName.toUpperCase()}_TABLE_MISSING` };
  }

  const available = new Set(columnInfo.keys());
  const insertColumns = spec.columns.filter((field) => available.has(field));
  const updateColumns = spec.updateColumns.filter((field) => available.has(field) && field !== 'id');
  if (!insertColumns.includes('id')) return { count: 0, ids: [], warning: `${tableName.toUpperCase()}_ID_COLUMN_MISSING` };

  let count = 0;
  const ids = [];

  for (const row of rows) {
    const rowId = cleanPositiveInt(row && row.id);
    if (!rowId) continue;
    if (row.vendor_id !== undefined && row.vendor_id !== null && Number(row.vendor_id) !== Number(claims.vendorId)) continue;
    if ((tableName === 'order_items' || tableName === 'checkout_settlements') && context.orderIds && !context.orderIds.has(cleanPositiveInt(row.order_id))) continue;

    const values = insertColumns.map((field) => gatewayValueFor(field, row, claims, scope));
    const updateSql = updateColumns.length
      ? ` ON DUPLICATE KEY UPDATE ${updateColumns.map((field) => `${field}=VALUES(${field})`).join(', ')}`
      : '';

    await db.query(
      `INSERT INTO ${tableName} (${insertColumns.join(', ')}) VALUES (${insertColumns.map(() => '?').join(', ')})${updateSql}`,
      values
    );
    count++;
    ids.push(rowId);
  }

  return { count, ids };
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
    cloud_restaurant_details_id: row.id || null,
    vendor_id: row.vendor_id || fallback.vendor_id || null,
    restaurant_id: row.restaurant_id || fallback.restaurant_id || 1,
    location_id: row.location_id || fallback.location_id || 1,
    ...details
  };
}

async function fetchRestaurantDetails(db, vendorId, fallback = {}) {
  if (fallback.location_id) {
    const [scopedRows] = await db.query(
      'SELECT * FROM restaurant_details WHERE vendor_id = ? AND location_id = ? ORDER BY id ASC LIMIT 1',
      [vendorId, fallback.location_id]
    );
    if (scopedRows.length) return sanitizeRestaurantDetails(scopedRows[0], { ...fallback, vendor_id: vendorId });
  }
  const [rows] = await db.query('SELECT * FROM restaurant_details WHERE vendor_id = ? ORDER BY id ASC LIMIT 1', [vendorId]);
  if (rows.length) return sanitizeRestaurantDetails(rows[0], { ...fallback, vendor_id: vendorId });
  return sanitizeRestaurantDetails({}, { ...fallback, vendor_id: vendorId });
}

function isPlaceholderOutletName(name) {
  const normalized = String(name || '').trim().toLowerCase();
  return normalized === 'main outlet' || normalized === 'default outlet';
}

function normalizeActivationLocations(rows = [], vendorId) {
  const mapped = (Array.isArray(rows) ? rows : [])
    .filter(l => l && l.is_active !== 0)
    .map(l => ({
      id: Number(l.id),
      location_id: Number(l.id),
      vendor_id: Number(vendorId),
      restaurant_id: Number(l.restaurant_id || l.id),
      name: String(l.name || '').trim() || `Outlet #${Number(l.id)}`,
      address: l.address || '',
      phone: l.phone || null,
      city: l.city || null,
      state: l.state || null,
      pincode: l.pincode || null,
      is_active: true
    }))
    .filter(l => Number.isInteger(l.id) && l.id > 0);

  const realNamedLocations = mapped.filter(l => !isPlaceholderOutletName(l.name));
  return realNamedLocations.length > 0 ? realNamedLocations : mapped;
}

async function upsertRestaurantDetails(db, vendorId, input = {}, fallback = {}) {
  const columnInfo = await getTableColumnInfo(db, 'restaurant_details');
  const columns = new Set(columnInfo.keys());
  const details = cleanRestaurantDetails(input, fallback);
  const locationId = input.location_id || fallback.location_id || 1;
  const fieldValues = {
    vendor_id: vendorId,
    restaurant_id: input.restaurant_id || fallback.restaurant_id || 1,
    location_id: locationId,
    ...details
  };

  const [existing] = columns.has('location_id')
    ? await db.query('SELECT id FROM restaurant_details WHERE vendor_id = ? AND location_id = ? ORDER BY id ASC LIMIT 1', [vendorId, locationId])
    : await db.query('SELECT id FROM restaurant_details WHERE vendor_id = ? ORDER BY id ASC LIMIT 1', [vendorId]);
  if (existing.length) {
    const updateFields = Object.keys(fieldValues).filter(field => field !== 'id' && field !== 'vendor_id' && columns.has(field));
    if (updateFields.length) {
      await db.query(
        `UPDATE restaurant_details SET ${updateFields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`,
        [...updateFields.map(field => fieldValues[field]), existing[0].id]
      );
    }
  } else {
    const insertValues = { ...fieldValues };
    const idInfo = columnInfo.get('id');
    const idIsAutoIncrement = String(idInfo?.Extra || '').toLowerCase().includes('auto_increment');
    if (idInfo && !idIsAutoIncrement) {
      const [[nextRow]] = await db.query('SELECT COALESCE(MAX(CAST(id AS UNSIGNED)), 0) + 1 AS next_id FROM restaurant_details');
      insertValues.id = nextRow?.next_id || Date.now();
    }
    const insertFields = Object.keys(insertValues).filter(field => field !== 'id' ? columns.has(field) : columns.has('id'));
    await db.query(
      `INSERT INTO restaurant_details (${insertFields.join(', ')}) VALUES (${insertFields.map(() => '?').join(', ')})`,
      insertFields.map(field => insertValues[field])
    );
  }

  return fetchRestaurantDetails(db, vendorId, fallback);
}

// ── GET /api/sync/gateway/restore (scoped historical restore for POS) ─────────
app.get('/api/sync/gateway/restore', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;
  const claims = verifySyncToken(token);
  if (!claims || !claims.vendorId) {
    return res.status(401).json({ success: false, code: 'INVALID_SYNC_TOKEN', error: 'Invalid or expired sync token' });
  }

  try {
    const cloudDb = getDb();
    const [orders] = await cloudDb.query(
      'SELECT * FROM orders WHERE vendor_id = ? ORDER BY id ASC LIMIT 10000',
      [claims.vendorId]
    );
    const orderIds = (orders || []).map((order) => cleanPositiveInt(order.id)).filter(Boolean);
    let orderItems = [];
    if (orderIds.length > 0) {
      const [items] = await cloudDb.query('SELECT * FROM order_items WHERE order_id IN (?) ORDER BY id ASC', [orderIds]);
      orderItems = items || [];
    }
    return res.json({
      success: true,
      vendorId: claims.vendorId,
      tables: { orders: orders || [], order_items: orderItems },
      restored: { orders: (orders || []).length, order_items: orderItems.length },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ success: false, code: 'SYNC_GATEWAY_RESTORE_FAILED', error: err.message });
  }
});

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

  const { orders, tables = {}, scope = {} } = req.body || {};
  const db = getDb();
  const incomingTables = {
    ...tables,
    orders: Array.isArray(tables.orders) ? tables.orders : orders
  };
  const uploaded = {};
  const accepted = {};
  const warnings = {};
  let totalAccepted = 0;

  try {
    const orderResult = await upsertGatewayRows(db, 'orders', incomingTables.orders, claims, scope);
    uploaded.orders = orderResult.count;
    accepted.orders = orderResult.ids;
    if (orderResult.warning) warnings.orders = orderResult.warning;
    totalAccepted += orderResult.count;

    const orderIds = new Set(orderResult.ids.map((id) => cleanPositiveInt(id)).filter(Boolean));
    const context = { orderIds };

    for (const tableName of Object.keys(SYNC_GATEWAY_TABLES).filter((name) => name !== 'orders')) {
      const result = await upsertGatewayRows(db, tableName, incomingTables[tableName], claims, scope, context);
      uploaded[tableName] = result.count;
      accepted[tableName] = result.ids;
      if (result.warning) warnings[tableName] = result.warning;
      totalAccepted += result.count;
    }

    return res.json({
      success: true,
      vendorId: claims.vendorId,
      uploaded,
      accepted,
      warnings,
      uploadedOrders: uploaded.orders || 0,
      totalAccepted,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'SYNC_GATEWAY_UPLOAD_FAILED',
      error: err.message
    });
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

    const cleanPositiveInt = (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : null;
    };

    let adminPin = '1234';
    let adminEmail = vendor.email || `admin.${String(vendorCode).toLowerCase().replace(/[^a-z0-9]/g, '')}@restaurant.local`;
    let locations = [];
    try {
      const [locs] = await db.query(
        'SELECT id, id AS location_id, vendor_id, restaurant_id, name, address, phone, city, state, pincode, is_active FROM locations WHERE vendor_id = ? AND (is_active = 1 OR is_active IS NULL) ORDER BY id ASC',
        [vendorId]
      );
      if (Array.isArray(locs) && locs.length > 0) {
        locations = normalizeActivationLocations(locs, vendorId);
      }
      if (locations.length === 0) {
        const [anyLocs] = await db.query(
          'SELECT id, id AS location_id, vendor_id, restaurant_id, name, address, phone, city, state, pincode, is_active FROM locations WHERE vendor_id = ? ORDER BY id ASC',
          [vendorId]
        );
        if (Array.isArray(anyLocs) && anyLocs.length > 0) {
          try {
            await db.query('UPDATE locations SET is_active = 1 WHERE vendor_id = ?', [vendorId]);
          } catch (uErr) {}
          locations = normalizeActivationLocations(anyLocs.map(l => ({ ...l, is_active: 1 })), vendorId);
        }
      }
    } catch (lErr) { /* non-fatal */ }

    if (locations.length === 0) {
      return res.status(409).json({
        success: false,
        code: 'NO_ACTIVE_OUTLETS_CONFIGURED',
        error: 'No active outlet is configured in SaaS Admin. Add Noida/Gurgaon or another outlet before POS activation.'
      });
    }

    const requestedLocationId = cleanPositiveInt(req.body?.location_id || req.body?.selected_location_id);
    const defaultLocation = locations.find(l => l.id === requestedLocationId || l.location_id === requestedLocationId) || locations[0];
    const defaultLocationId = defaultLocation.id;
    const defaultRestaurantId = cleanPositiveInt(defaultLocation.restaurant_id) || defaultLocationId;

    const restaurantDetails = await fetchRestaurantDetails(db, vendorId, {
      business_name: vendor.business_name,
      email: vendor.email,
      phone: vendor.phone,
      restaurant_id: defaultRestaurantId,
      location_id: defaultLocationId
    });
    const responseRestaurantId = cleanPositiveInt(restaurantDetails.restaurant_id) || defaultRestaurantId;

    let adminUser = {
      id: null,
      name: vendor.business_name || 'Admin',
      email: adminEmail,
      role: 'admin',
      vendor_id: Number(vendorId),
      location_id: defaultLocationId,
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(vendor.business_name || 'Admin')}`,
      pin_configured: true
    };

    try {
      const [users] = await db.query(
        "SELECT id, name, email, role, pin, location_id, avatar_url FROM users WHERE vendor_id = ? AND (role = 'admin' OR role = 'super_admin' OR role = 'owner') ORDER BY id ASC LIMIT 1",
        [vendorId]
      );
      if (users.length) {
        const u = users[0];
        if (u.pin && String(u.pin).trim()) {
          adminPin = String(u.pin).trim();
        } else {
          adminPin = '1234';
          try {
            await db.query("UPDATE users SET pin = '1234' WHERE id = ?", [u.id]);
          } catch (e) {}
        }
        if (u.email) adminEmail = u.email;
        adminUser = {
          id: u.id,
          name: u.name || vendor.business_name,
          email: u.email || adminEmail,
          role: u.role || 'admin',
          vendor_id: Number(vendorId),
          location_id: Number(u.location_id || defaultLocationId),
          avatar_url: u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name || 'Admin')}`,
          pin_configured: Boolean(adminPin)
        };
      } else {
        adminPin = '1234';
        try {
          const tempAdminPassword = crypto.randomBytes(16).toString('hex');
          const securePasswordHash = hashPassword(tempAdminPassword);
          const [ins] = await db.query(
            "INSERT INTO users (vendor_id, name, email, password_hash, role, pin, location_id) VALUES (?, ?, ?, ?, 'admin', '1234', ?)",
            [vendorId, vendor.business_name, adminEmail, securePasswordHash, defaultLocationId]
          );
          adminUser.id = ins.insertId;
        } catch (e) {}
      }
    } catch (uErr) { /* non-fatal fallback */ }

    // Fetch master categories from SaaS Cloud TiDB
    let categories = [];
    try {
      const [catRows] = await db.query(
        'SELECT id, vendor_id, location_id, name, type, is_active, sort_order FROM categories WHERE vendor_id = ? ORDER BY sort_order ASC, id ASC',
        [vendorId]
      );
      if (Array.isArray(catRows)) categories = catRows;
    } catch (cErr) {}

    // Fetch master menu items from SaaS Cloud TiDB
    let menuItems = [];
    try {
      const [itemRows] = await db.query(
        'SELECT id, vendor_id, location_id, category_id, name, price, type, is_available, inventory_item_id, inventory_qty_per_unit, image_base64, image_url FROM menu_items WHERE vendor_id = ? ORDER BY id ASC',
        [vendorId]
      );
      if (Array.isArray(itemRows)) menuItems = itemRows;
    } catch (mErr) {}

    // Fetch restaurant areas from SaaS Cloud TiDB
    let restaurantAreas = [];
    try {
      const [areaRows] = await db.query(
        'SELECT id, vendor_id, restaurant_id, location_id, name, is_active FROM restaurant_areas WHERE vendor_id = ? ORDER BY id ASC',
        [vendorId]
      );
      if (Array.isArray(areaRows)) restaurantAreas = areaRows;
    } catch (aErr) {}

    // Fetch restaurant tables from SaaS Cloud TiDB
    let restaurantTables = [];
    try {
      const [tblRows] = await db.query(
        'SELECT id, vendor_id, restaurant_id, location_id, area_id, table_number, capacity, status, is_active FROM restaurant_tables WHERE vendor_id = ? ORDER BY id ASC',
        [vendorId]
      );
      if (Array.isArray(tblRows)) restaurantTables = tblRows;
    } catch (tErr) {}

    const syncToken = generateSyncToken(vendor.id, vendorCode);

    await audit('POS_CLIENT_ACTIVATED', `POS activated for vendor "${vendor.business_name}" (#${vendor.id}) code: ${vendorCode}`);

    res.json({
      success: true,
      vendor_id: vendor.id,
      vendor_code: vendorCode,
      vendor_name: vendor.business_name,
      admin_email: adminEmail,
      admin_pin: adminPin,
      admin_user: adminUser,
      restaurant_id: responseRestaurantId,
      selected_location_id: defaultLocationId,
      location_id: defaultLocationId,
      locations,
      restaurant_details: { ...restaurantDetails, restaurant_id: responseRestaurantId, location_id: defaultLocationId },
      categories,
      menu_items: menuItems,
      restaurant_areas: restaurantAreas,
      restaurant_tables: restaurantTables,
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
    let locationId = null;
    const initialOutletName = String(default_outlet_name || '').trim();
    if (initialOutletName) try {
      const locationColumns = await getTableColumns(db, 'locations');
      const locationValues = {
        vendor_id: vendorId,
        restaurant_id: 1,
        name: initialOutletName,
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
        location_id: locationId || null
      }, { business_name, email, phone, location_id: locationId || null });
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
        location_id: locationId || null
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
    const { name, address } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const db = getDb();
    const locationColumns = await getTableColumns(db, 'locations');
    const locationValues = {
      vendor_id: Number(req.params.id),
      restaurant_id: 1,
      name: String(name).trim(),
      address: address || null,
      is_active: 1
    };
    const fields = Object.keys(locationValues).filter(field => locationColumns.has(field));
    const [r] = await db.query(
      `INSERT INTO locations (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
      fields.map(field => locationValues[field])
    );
    await audit('CREATE_OUTLET', `Created outlet "${name}" (#${r.insertId}) for vendor #${req.params.id}`);
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
