import { getDb, cors } from '../../_db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();
  const { id } = req.query;

  // GET /api/vendors/[id]
  if (req.method === 'GET') {
    try {
      const [rows] = await db.query('SELECT * FROM vendors WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
      const v = rows[0];
      return res.status(200).json({
        ...v,
        features: typeof v.features === 'string' ? JSON.parse(v.features) : (v.features || {})
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/vendors/[id] — update status, plan, features etc.
  if (req.method === 'PUT') {
    try {
      const { status, plan_name, plan_price, renewal_date, grace_period_days, subscription_status, features } = req.body;

      const updates = [];
      const values = [];

      if (status !== undefined) { updates.push('status = ?'); values.push(status); }
      if (plan_name !== undefined) { updates.push('plan_name = ?'); values.push(plan_name); }
      if (plan_price !== undefined) { updates.push('plan_price = ?'); values.push(plan_price); }
      if (renewal_date !== undefined) { updates.push('renewal_date = ?'); values.push(renewal_date); }
      if (grace_period_days !== undefined) { updates.push('grace_period_days = ?'); values.push(grace_period_days); }
      if (subscription_status !== undefined) { updates.push('subscription_status = ?'); values.push(subscription_status); }
      if (features !== undefined) { updates.push('features = ?'); values.push(JSON.stringify(features)); }

      if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

      values.push(id);
      await db.query(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`, values);

      try {
        await db.query(
          `INSERT INTO saas_audit_logs (admin_name, action, details) VALUES (?, ?, ?)`,
          ['Super Admin', 'UPDATE_VENDOR', `Updated vendor #${id}: ${updates.join(', ')}`]
        );
      } catch (e) {}

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/vendors/[id]
  if (req.method === 'DELETE') {
    try {
      await db.query('DELETE FROM vendors WHERE id = ?', [id]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
