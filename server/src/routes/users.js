import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

const escapeLike = (text) => text.replace(/[\\%_]/g, "\\$&");

const SORT_COLUMNS = [
  "id",
  "name",
  "email",
  "city",
  "status",
  "revenue",
  "created_at",
  "last_login",
];
const STATUSES = ["active", "inactive", "banned"];
const EXPORT_COLUMNS = [...SORT_COLUMNS];
const MAX_EXPORT = 50000;
const MAX_SELECTED_IDS = 5000;

function parseSort(input = {}) {
  const sort = SORT_COLUMNS.includes(input.sort) ? input.sort : "id";
  const order = input.order === "desc" ? "DESC" : "ASC";
  return { sort, order };
}

function buildFilters(input = {}) {
  const params = [];
  const conditions = [];

  const search = String(input.search || "").trim();
  const city = String(input.city || "").trim();
  const status = String(input.status || "").trim();
  const minRevenue = parseFloat(input.minRevenue);
  const neverLoggedIn =
    input.neverLoggedIn === true || input.neverLoggedIn === "true";

  if (search) {
    params.push(`%${escapeLike(search)}%`);
    conditions.push(
      `(name ILIKE $${params.length} OR email ILIKE $${params.length})`,
    );
  }
  if (city) {
    params.push(city);
    conditions.push(`city = $${params.length}`);
  }
  if (STATUSES.includes(status)) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (!Number.isNaN(minRevenue) && minRevenue > 0) {
    params.push(minRevenue);
    conditions.push(`revenue >= $${params.length}`);
  }
  if (neverLoggedIn) {
    conditions.push("last_login IS NULL");
  }

  return { params, conditions };
}

const toWhere = (conditions) =>
  conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

function csvCell(value) {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const offset = (page - 1) * limit;

    const { sort, order } = parseSort(req.query);
    const { params, conditions } = buildFilters(req.query);
    const whereSql = toWhere(conditions);

    const dataSql = `
      SELECT * FROM users ${whereSql}
      ORDER BY ${sort} ${order} NULLS LAST, id ASC
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

router.get("/cities", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT city FROM users WHERE city IS NOT NULL ORDER BY city",
    );
    res.json(result.rows.map((row) => row.city));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cities" });
  }
});

// TEMPORARY
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

router.post("/export", async (req, res) => {
  try {
    const body = req.body || {};
    const { sort, order } = parseSort(body);
    const { params, conditions } = buildFilters(body.filters);

    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id) => Number.isInteger(id)).slice(0, MAX_SELECTED_IDS)
      : [];
    if (ids.length) {
      params.push(ids);
      conditions.push(`id = ANY($${params.length}::int[])`);
    }

    const sql = `
      SELECT ${EXPORT_COLUMNS.join(", ")} FROM users ${toWhere(conditions)}
      ORDER BY ${sort} ${order} NULLS LAST, id ASC
      LIMIT $${params.length + 1}
    `;
    const result = await pool.query(sql, [...params, MAX_EXPORT]);

    const lines = [EXPORT_COLUMNS.join(",")];
    result.rows.forEach((row) => {
      lines.push(EXPORT_COLUMNS.map((col) => csvCell(row[col])).join(","));
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="users.csv"');
    res.send("\uFEFF" + lines.join("\n"));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to export users" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const body = req.body || {};
    const sets = [];
    const params = [];

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name || name.length > 100) {
        return res
          .status(400)
          .json({ error: "Name must be 1 to 100 characters" });
      }
      params.push(name);
      sets.push(`name = $${params.length}`);
    }

    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      params.push(body.status);
      sets.push(`status = $${params.length}`);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default router;
