import express from "express";
import cors from "cors";
import "dotenv/config";
import pool from "./db/pool.js";
import usersRouter from "./routes/users.js";
import statsRouter from "./routes/stats.js";
import notificationsRouter from "./routes/notifications.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS time");
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.use("/api/users", usersRouter);
app.use("/api/stats", statsRouter);
app.use("/api/notifications", notificationsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
