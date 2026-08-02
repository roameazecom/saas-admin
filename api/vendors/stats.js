import { getDb, cors } from '../_db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();
  const { vendor_id } = req.query;

  try {
    const [[orderStats]] = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_orders,
        SUM(CASE WHEN DATE(created_at) = CURDATE() AND status = 'paid' THEN total_amount ELSE 0 END) as today_revenue
      FROM orders WHERE vendor_id = ?
    `, [vendor_id]);

    const [[staffStats]] = await db.query(`
      SELECT COUNT(*) as staff_count FROM users WHERE vendor_id = ?
    `, [vendor_id]);

    return res.status(200).json({
      total_orders: orderStats?.total_orders || 0,
      total_revenue: Number(orderStats?.total_revenue || 0),
      today_orders: orderStats?.today_orders || 0,
      today_revenue: Number(orderStats?.today_revenue || 0),
      staff_count: staffStats?.staff_count || 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
