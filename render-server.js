// ─────────────────────────────────────────────────────────────────────────────
// HappyPie SaaS Admin — Express Server for Render Deployment
// Replaces Vercel serverless functions with a single Express app.
// Serves both the React SPA (dist/) and all /api/* routes.
// ─────────────────────────────────────────────────────────────────────────────
import express from 'express';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

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
    ssl: { rejectUnauthorized: false }
  });
  return _pool;
}

// ── Token helpers ─────────────────────────────────────────────────────────────
const TOKEN_SECRET = process.env.ACTIVATION_TOKEN_SECRET || 'happypie-saas-activation-secret-2026';

function generateActivationToken(vendorId, vendorCode) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ vendorId, vendorCode, expiresAt })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
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

// ─────────────────────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/login ───────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const db = getDb();
    const [users] = await db.query(
      'SELECT id, name, email, role, phone, status FROM saas_users WHERE LOWER(TRIM(email)) = ? AND password_hash = ?',
      [String(email).trim().toLowerCase(), String(password).trim()]
    );
    if (!users.length) return res.status(401).json({ error: 'Invalid email or password' });
    if (users[0].status === 'suspended') return res.status(403).json({ error: 'Account suspended' });
    res.json({ success: true, user: users[0], token: `saas-token-${users[0].id}-${Date.now()}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/vendors ──────────────────────────────────────────────────────────
app.get('/api/vendors', async (req, res) => {
  try {
    const [rows] = await getDb().query(`
      SELECT id, business_name, vendor_code, tenant_id, slug, email, phone, status, features,
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

// ── POST /api/vendors/:id/generate-token ─────────────────────────────────────
app.post('/api/vendors/:id/generate-token', async (req, res) => {
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
    await audit('GENERATE_ACTIVATION_TOKEN', `Token for "${vendor.business_name}" (#${vendor.id})`);

    res.json({ success: true, token, vendor_name: vendor.business_name, vendor_code: vendorCode, expires_at: expiresAt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/vendors — Create vendor (must come AFTER /:id/generate-token) ──
app.post('/api/vendors', async (req, res) => {
  try {
    const { business_name, slug, email, phone, plan_name, plan_price, renewal_date, grace_period_days, features, owner_name, owner_password, tax_percent } = req.body;
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
    try { await db.query(`INSERT INTO restaurant_details (vendor_id, name, phone, tax_percent, daily_pin) VALUES (?, ?, ?, ?, ?)`, [vendorId, business_name.trim(), phone || '', tax_percent || 5.00, '1234']); } catch (e) {}
    try { await db.query(`INSERT INTO users (vendor_id, name, email, password, role, pin, is_active) VALUES (?, ?, ?, ?, 'admin', '1234', 1)`, [vendorId, owner_name || business_name.trim(), email || `admin@${slug}.in`, owner_password || 'admin123']); } catch (e) {}
    await audit('ONBOARD_VENDOR', `Onboarded: ${business_name} (ID: ${vendorId})`);
    res.json({ success: true, id: vendorId, vendor_code, tenant_id, message: `${business_name} onboarded successfully` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/vendors/:id ──────────────────────────────────────────────────────
app.put('/api/vendors/:id', async (req, res) => {
  try {
    const { status, plan_name, plan_price, renewal_date, grace_period_days, subscription_status, features } = req.body;
    const updates = []; const values = [];
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

// ── GET /api/vendors/:id/stats ────────────────────────────────────────────────
app.get('/api/vendors/:id/stats', async (req, res) => {
  try {
    const db = getDb();
    const [[orderData]] = await db.query(`SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount),0) as total_revenue FROM orders WHERE vendor_id = ?`, [req.params.id]).catch(() => [[{ total_orders: 0, total_revenue: 0 }]]);
    const [[staffData]] = await db.query(`SELECT COUNT(*) as staff_count FROM users WHERE vendor_id = ? AND role != 'admin'`, [req.params.id]).catch(() => [[{ staff_count: 0 }]]);
    res.json({ ...orderData, ...staffData });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/vendors/:id/config ───────────────────────────────────────────────
app.get('/api/vendors/:id/config', async (req, res) => {
  try {
    const [rows] = await getDb().query('SELECT id, business_name, vendor_code, slug FROM vendors WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });
    const v = rows[0];
    const envContent = `VENDOR_ID=${v.id}\nVENDOR_CODE=${v.vendor_code || `HP-VEN-${v.id}`}\nVENDOR_SLUG=${v.slug}\n`;
    res.json({ vendor_id: v.id, vendor_name: v.business_name, vendor_slug: v.slug, vendor_code: v.vendor_code, env_content: envContent, setup_instructions: ['Download & install HappyPie POS on your machine', 'Launch the app — Setup Wizard opens automatically', 'Generate Activation Token from SaaS Admin and paste it', 'Click Activate and save your admin PIN', 'Start taking orders!'] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET/POST /api/vendors/:id/outlets ─────────────────────────────────────────
app.get('/api/vendors/:id/outlets', async (req, res) => {
  try {
    const [rows] = await getDb().query('SELECT * FROM locations WHERE vendor_id = ? ORDER BY id ASC', [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/vendors/:id/outlets', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const [r] = await getDb().query('INSERT INTO locations (vendor_id, name) VALUES (?, ?)', [req.params.id, name]);
    res.json({ success: true, id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/analytics ────────────────────────────────────────────────────────
app.get('/api/vendors/analytics/global', async (req, res) => {
  try {
    const db = getDb();
    const [[vs]] = await db.query(`SELECT COUNT(*) as total_vendors, SUM(status='active') as active_vendors, SUM(status='suspended') as suspended_vendors FROM vendors`);
    const [[orders]] = await db.query(`SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount),0) as total_revenue FROM orders`).catch(() => [[{ total_orders: 0, total_revenue: 0 }]]);
    const [[today]] = await db.query(`SELECT COUNT(*) as today_orders FROM orders WHERE DATE(created_at) = CURDATE()`).catch(() => [[{ today_orders: 0 }]]);
    res.json({ ...vs, ...orders, ...today, mrr: (vs.active_vendors || 0) * 2499 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET/POST /api/tickets ─────────────────────────────────────────────────────
app.get('/api/tickets', async (req, res) => {
  try { const [r] = await getDb().query('SELECT * FROM saas_tickets ORDER BY created_at DESC'); res.json(r); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const { ticketId, ticket_id, id, status, vendor_id, vendor_name, subject, description, priority } = req.body;
    const db = getDb();
    if (status && (ticketId || ticket_id || id)) {
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

app.post('/api/plans', async (req, res) => {
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

app.post('/api/announcements', async (req, res) => {
  try {
    const { title, message } = req.body;
    const [r] = await getDb().query('INSERT INTO saas_announcements (title, message, created_by) VALUES (?, ?, ?)', [title, message, 'Super Admin']);
    res.json({ success: true, id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/audit-logs ───────────────────────────────────────────────────────
app.get('/api/audit-logs', async (req, res) => {
  try { const [r] = await getDb().query('SELECT * FROM saas_audit_logs ORDER BY created_at DESC LIMIT 100'); res.json(r); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET/POST/DELETE /api/team ─────────────────────────────────────────────────
app.get('/api/team', async (req, res) => {
  try { const [r] = await getDb().query('SELECT id, name, email, role, phone, status, created_at FROM saas_users ORDER BY created_at DESC'); res.json(r); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/team', async (req, res) => {
  try {
    const { name, email, password, role, phone, memberId, status } = req.body;
    const db = getDb();
    if (memberId && status) {
      await db.query('UPDATE saas_users SET status = ? WHERE id = ?', [status, memberId]);
      return res.json({ success: true });
    }
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    const [r] = await db.query('INSERT INTO saas_users (name, email, password_hash, role, phone, status) VALUES (?, ?, ?, ?, ?, ?)', [name, email, password, role || 'saas_manager', phone || null, 'active']);
    res.json({ success: true, id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/team/:id', async (req, res) => {
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
