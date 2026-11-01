import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      pool.query("SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2", [
        limit,
        offset,
      ]),
      pool.query("SELECT COUNT(*) FROM users"),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: dataResult.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

export default router;
