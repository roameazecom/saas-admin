import { getDb, cors } from '../_db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();
  const { vendor_id } = req.query;

  if (req.method === 'GET') {
    try {
      const [outlets] = await db.query('SELECT * FROM locations WHERE vendor_id = ? ORDER BY id ASC', [vendor_id]);
      return res.status(200).json(outlets);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, vendor_id: bodyVendorId } = req.body;
      const targetId = vendor_id || bodyVendorId;
      const [result] = await db.query('INSERT INTO locations (name, vendor_id) VALUES (?, ?)', [String(name).trim(), targetId]);
      return res.status(200).json({ success: true, id: result.insertId, name: String(name).trim(), vendor_id: Number(targetId) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
