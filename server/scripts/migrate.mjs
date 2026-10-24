// Creates the Clearcut tables (server/db/schema.sql). Safe to run again.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/db.js";

if (!process.env.DATABASE_URL) {
    console.error("Add DATABASE_URL to server/.env first (see .env.example).");
    process.exit(1);
}

const schema = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "schema.sql"), "utf8");
try {
    await pool.query(schema);
    const { rows } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1) ORDER BY 1", [["images", "transactions", "users"]]);
    console.log(`Schema ready: ${rows.map((r) => r.table_name).join(", ")}`);
} catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
