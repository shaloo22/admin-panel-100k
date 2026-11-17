import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [summary, byStatus, topCities, signupsByMonth] = await Promise.all([
      // One query, many numbers: COUNT FILTER counts only the rows that match
      pool.query(`
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active_users,
          COUNT(*) FILTER (WHERE last_login IS NULL)::int AS never_logged_in,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS new_this_month,
          COALESCE(SUM(revenue), 0) AS total_revenue,
          COALESCE(AVG(revenue) FILTER (WHERE revenue > 0), 0) AS avg_revenue
        FROM users
        WHERE deleted_at IS NULL
      `),
      pool.query(`
        SELECT status, COUNT(*)::int AS count
        FROM users
        WHERE deleted_at IS NULL
        GROUP BY status
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT city, COUNT(*)::int AS users, COALESCE(SUM(revenue), 0) AS revenue
        FROM users
        WHERE city IS NOT NULL AND deleted_at IS NULL
        GROUP BY city
        ORDER BY revenue DESC
        LIMIT 5
      `),
      // Signups for the last 6 months. generate_series gives every month,
      // so a month with zero signups still shows up as 0.
      pool.query(`
        SELECT to_char(m, 'Mon YY') AS label, COALESCE(c.count, 0)::int AS count
        FROM generate_series(
          date_trunc('month', NOW()) - interval '5 months',
          date_trunc('month', NOW()),
          interval '1 month'
        ) AS m
        LEFT JOIN (
          SELECT date_trunc('month', created_at) AS month, COUNT(*) AS count
          FROM users
          WHERE deleted_at IS NULL
          GROUP BY 1
        ) c ON c.month = m
        ORDER BY m
      `),
    ]);

    res.json({
      ...summary.rows[0],
      byStatus: byStatus.rows,
      topCities: topCities.rows,
      signupsByMonth: signupsByMonth.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
