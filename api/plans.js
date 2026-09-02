import { getDb, cors } from './_db.js';
import { requireSaasAdminAuth } from './_auth.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();

  // GET all plans
  if (req.method === 'GET') {
    try {
      const [plans] = await db.query('SELECT * FROM saas_plans ORDER BY price ASC');
      const parsed = plans.map(p => ({
        ...p,
        features_included: typeof p.features_included === 'string'
          ? JSON.parse(p.features_included)
          : (p.features_included || {})
      }));
      return res.status(200).json(parsed);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST create plan
  if (req.method === 'POST') {
    const admin = requireSaasAdminAuth(req, res, ['super_admin']);
    if (!admin) return;
    try {
      const { name, price, billing_cycle, features_included } = req.body;
      const [result] = await db.query(
        `INSERT INTO saas_plans (name, price, billing_cycle, features_included) VALUES (?, ?, ?, ?)`,
        [name, price, billing_cycle || 'monthly', JSON.stringify(features_included || {})]
      );
      return res.status(200).json({ success: true, id: result.insertId });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
