import pg from "pg";

// Postgres: Neon in production, any Postgres locally. DATABASE_URL is the full connection string.
// BIGINT counts come back as strings by default; they are small here, so parse them as numbers.
pg.types.setTypeParser(pg.types.builtins.INT8, Number);

const url = process.env.DATABASE_URL || "";
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

export const pool = new pg.Pool({
    connectionString: url,
    ssl: local ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_SIZE || 5),
    idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => console.error("Database pool error:", err.message));

export const query = (text, params) => pool.query(text, params);

// Runs fn(client) inside BEGIN/COMMIT, rolling back on any error
export const transaction = async (fn) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const checkDB = async () => {
    await query("SELECT 1");
    const { rows } = await query("SELECT to_regclass('public.images') AS t");
    if (!rows[0].t) {
        console.error('\nThe database has no Clearcut tables yet. Run "npm run migrate" first.\n');
        process.exit(1);
    }
    console.log("Database connected");
};
