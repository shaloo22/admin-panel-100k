import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [list, unread] = await Promise.all([
      pool.query(
        "SELECT * FROM notifications ORDER BY created_at DESC, id DESC LIMIT 10",
      ),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM notifications WHERE is_read = FALSE",
      ),
    ]);
    res.json({ items: list.rows, unread: unread.rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.post("/read-all", async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE",
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid id" });
    }
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [
      id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

export default router;
