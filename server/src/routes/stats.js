import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [summary, byStatus, topCities] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active_users,
          COUNT(*) FILTER (WHERE last_login IS NULL)::int AS never_logged_in,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS new_this_month,
          COALESCE(SUM(revenue), 0) AS total_revenue,
          COALESCE(AVG(revenue) FILTER (WHERE revenue > 0), 0) AS avg_revenue
        FROM users
      `),
      pool.query(`
        SELECT status, COUNT(*)::int AS count
        FROM users
        GROUP BY status
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT city, COUNT(*)::int AS users, COALESCE(SUM(revenue), 0) AS revenue
        FROM users
        WHERE city IS NOT NULL
        GROUP BY city
        ORDER BY revenue DESC
        LIMIT 5
      `),
    ]);

    res.json({
      ...summary.rows[0],
      byStatus: byStatus.rows,
      topCities: topCities.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
