import { getDb, cors } from './_db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const db = getDb();

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [users] = await db.query(
      `SELECT id, name, email, role, phone, status FROM saas_users 
       WHERE LOWER(TRIM(email)) = ? AND password_hash = ?`,
      [String(email).trim().toLowerCase(), String(password).trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid SaaS admin email or password' });
    }

    const user = users[0];
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your SaaS staff account has been suspended.' });
    }

    return res.status(200).json({
      success: true,
      user,
      token: `saas-token-${user.id}-${Date.now()}`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
