import { getDb, cors } from './_db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();

  // GET all team members
  if (req.method === 'GET') {
    try {
      const [team] = await db.query(
        'SELECT id, name, email, role, phone, status, created_at FROM saas_users ORDER BY id ASC'
      );
      return res.status(200).json(team);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST create team member
  if (req.method === 'POST') {
    try {
      const { name, email, password, role, phone } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
      }
      const [result] = await db.query(
        `INSERT INTO saas_users (name, email, password_hash, role, phone, status) VALUES (?, ?, ?, ?, ?, 'active')`,
        [name.trim(), email.trim().toLowerCase(), password.trim(), role || 'saas_manager', phone || null]
      );
      return res.status(200).json({
        id: result.insertId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role || 'saas_manager',
        phone
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
