import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();
const escapeLike = (text) => text.replace(/[\\%_]/g, "\\$&");

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();

    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${escapeLike(search)}%`);
      conditions.push(
        `(name ILIKE $${params.length} OR email ILIKE $${params.length})`,
      );
    }

    const whereSql = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const dataSql = `
      SELECT * FROM users ${whereSql}
      ORDER BY id
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const countSql = `SELECT COUNT(*) FROM users ${whereSql}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataSql, [...params, limit, offset]),
      pool.query(countSql, params),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: dataResult.rows,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// TEMPORARY: sirf stress test ke liye
router.get("/all", async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 20000, 50000);
    const result = await pool.query(
      "SELECT * FROM users ORDER BY id LIMIT $1",
      [count],
    );
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

export default router;
