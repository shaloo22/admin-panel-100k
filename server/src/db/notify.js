import pool from "./pool.js";

export async function notify(type, message) {
  await pool.query(
    "INSERT INTO notifications (type, message) VALUES ($1, $2)",
    [type, message],
  );
}
