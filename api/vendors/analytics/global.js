import { getDb, cors } from '../../_db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [[vendorStats]] = await db.query(`
      SELECT 
        COUNT(*) as total_vendors,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_vendors,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_vendors,
        SUM(COALESCE(plan_price, 2499)) as mrr
      FROM vendors
    `);

    const [[orderStats]] = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_orders,
        SUM(CASE WHEN DATE(created_at) = CURDATE() AND status = 'paid' THEN total_amount ELSE 0 END) as today_revenue
      FROM orders
    `);

    const [[ticketStats]] = await db.query(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets
      FROM saas_tickets
    `);

    return res.status(200).json({
      total_vendors: vendorStats.total_vendors || 0,
      active_vendors: vendorStats.active_vendors || 0,
      suspended_vendors: vendorStats.suspended_vendors || 0,
      mrr: Number(vendorStats.mrr || 0),
      total_orders: orderStats.total_orders || 0,
      total_revenue: Number(orderStats.total_revenue || 0),
      today_orders: orderStats.today_orders || 0,
      today_revenue: Number(orderStats.today_revenue || 0),
      open_tickets: ticketStats.open_tickets || 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
