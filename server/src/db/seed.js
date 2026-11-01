import { faker } from "@faker-js/faker";
import pool from "./pool.js";

const TOTAL = 100000;
const BATCH_SIZE = 1000;
const COLUMNS = 8;

const CITIES = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Jaipur",
  "Lucknow",
  "Ahmedabad",
];

async function seed() {
  console.log("Seeding database...");

  await pool.query("TRUNCATE TABLE users RESTART IDENTITY");

  for (let start = 0; start < TOTAL; start += BATCH_SIZE) {
    const placeholders = [];
    const values = [];

    for (let j = 0; j < BATCH_SIZE; j++) {
      const n = start + j;
      const createdAt = faker.date.past({ years: 2 });

      const neverLoggedIn = Math.random() < 0.2;
      const lastLogin = neverLoggedIn
        ? null
        : faker.date.between({ from: createdAt, to: new Date() });

      const revenue = neverLoggedIn
        ? 0
        : faker.number.int({ min: 500, max: 100000 });

      const base = j * COLUMNS;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`,
      );

      values.push(
        faker.person.fullName(),
        `${faker.person.firstName().toLowerCase()}.${n}@example.com`,
        faker.helpers.arrayElement(CITIES),
        faker.helpers.weightedArrayElement([
          { value: "active", weight: 70 },
          { value: "inactive", weight: 20 },
          { value: "banned", weight: 10 },
        ]),
        createdAt,
        lastLogin,
        revenue,
      );
    }

    const sql = `
      INSERT INTO users (name, email, city, status, created_at, last_login, revenue)
      VALUES ${placeholders.join(", ")}
    `;
    await pool.query(sql, values);

    console.log(`Inserted ${start + BATCH_SIZE} / ${TOTAL}`);
  }

  console.log("Seeding done!");
}

seed()
  .catch((err) => console.error("Seed failed:", err))
  .finally(() => pool.end());
