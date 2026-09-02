import { getDb, cors } from './_db.js';
import { signSaasToken, verifyPassword } from './_auth.js';

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

    const normalizedEmail = String(email).trim().toLowerCase();
    const [users] = await db.query(
      `SELECT id, name, email, role, phone, status, password_hash FROM saas_users 
       WHERE LOWER(TRIM(email)) = ?`,
      [normalizedEmail]
    );

    const user = users[0];
    const passwordCheck = user ? verifyPassword(password, user.password_hash) : { ok: false };
    if (!user || !passwordCheck.ok) {
      return res.status(401).json({ error: 'Invalid SaaS admin email or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your SaaS staff account has been suspended.' });
    }

    if (passwordCheck.upgradeHash) {
      await db.query('UPDATE saas_users SET password_hash = ? WHERE id = ?', [passwordCheck.upgradeHash, user.id]);
    }

    const { password_hash, ...safeUser } = user;
    return res.status(200).json({
      success: true,
      user: safeUser,
      token: signSaasToken(safeUser)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
