import { getDb, cors } from './_db.js';
import { requireSaasAdminAuth } from './_auth.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();

  // GET announcements
  if (req.method === 'GET') {
    try {
      const [announcements] = await db.query(
        'SELECT * FROM saas_announcements ORDER BY id DESC'
      );
      return res.status(200).json(announcements);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST create or delete announcement
  if (req.method === 'POST') {
    const admin = requireSaasAdminAuth(req, res);
    if (!admin) return;
    try {
      const { action, id, title, message, target_vendor_id, created_by } = req.body;

      // Delete announcement action
      if (action === 'delete' || (id && !title)) {
        await db.query('DELETE FROM saas_announcements WHERE id = ?', [id]);
        return res.status(200).json({ success: true, message: `Announcement #${id} removed` });
      }

      // Create announcement
      const [result] = await db.query(
        `INSERT INTO saas_announcements (title, message, target_vendor_id, created_by) VALUES (?, ?, ?, ?)`,
        [title, message, target_vendor_id || null, created_by || admin.email || 'SaaS Admin']
      );
      return res.status(200).json({ success: true, id: result.insertId });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
