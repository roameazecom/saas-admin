import { getDb, cors } from './_db.js';
import { requireSaasAdminAuth } from './_auth.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();

  // GET all tickets
  if (req.method === 'GET') {
    try {
      const [tickets] = await db.query(
        'SELECT * FROM saas_tickets ORDER BY created_at DESC'
      );
      return res.status(200).json(tickets);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST new ticket
  if (req.method === 'POST') {
    try {
      const { ticketId, ticket_id, id, status, vendor_id, vendor_name, subject, description, priority } = req.body;

      // Handle ticket status update via POST
      if (status && (ticketId || ticket_id || id)) {
        const admin = requireSaasAdminAuth(req, res);
        if (!admin) return;
        const targetId = ticketId || ticket_id || id;
        await db.query('UPDATE saas_tickets SET status = ? WHERE id = ?', [status, targetId]);
        return res.status(200).json({ success: true, message: `Ticket #${targetId} updated to ${status}` });
      }

      // Handle create ticket
      const [result] = await db.query(
        `INSERT INTO saas_tickets (vendor_id, vendor_name, subject, description, priority, status) VALUES (?, ?, ?, ?, ?, 'open')`,
        [vendor_id, vendor_name, subject, description, priority || 'medium']
      );
      return res.status(200).json({ success: true, id: result.insertId });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
