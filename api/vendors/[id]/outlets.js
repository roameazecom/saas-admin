import { getDb, cors } from '../../../_db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();
  const { id } = req.query;

  // GET /api/vendors/[id]/outlets
  if (req.method === 'GET') {
    try {
      const [outlets] = await db.query(
        'SELECT * FROM locations WHERE vendor_id = ? ORDER BY id ASC',
        [id]
      );
      return res.status(200).json(outlets);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/vendors/[id]/outlets — Add new outlet branch
  if (req.method === 'POST') {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Outlet name is required' });

      const [result] = await db.query(
        'INSERT INTO locations (name, vendor_id) VALUES (?, ?)',
        [name.trim(), id]
      );

      return res.status(200).json({
        success: true,
        id: result.insertId,
        name: name.trim(),
        vendor_id: Number(id)
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
