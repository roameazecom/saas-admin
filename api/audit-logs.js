import { getDb, cors } from './_db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();

  if (req.method === 'GET') {
    try {
      const [logs] = await db.query(
        'SELECT * FROM saas_audit_logs ORDER BY created_at DESC LIMIT 100'
      );
      return res.status(200).json(logs);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
