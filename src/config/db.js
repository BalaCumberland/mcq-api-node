const { Pool } = require("pg");

const pool = new Pool({
    user: process.env.POSTGRESQL_USER,
    host: process.env.POSTGRESQL_HOST,
    database: process.env.POSTGRESQL_DB,
    password: process.env.POSTGRESQL_PW,
    port: process.env.POSTGRESQL_PORT,
    ssl: {
        rejectUnauthorized: false // ✅ Allows self-signed SSL
    },
    max: 50, // ✅ Max 10 connections in the pool
    idleTimeoutMillis: 30000, // ✅ Close idle clients after 30 sec
    connectionTimeoutMillis: 2000, // ✅ Timeout for new connections
});

const connectDB = async () => {
    try {
        const client = await pool.connect();
        return client;
    } catch (err) {
        console.error("❌ Database Connection Error:", err);
        throw new Error("Failed to connect to the database");
    }
};

module.exports = {
    connectDB,
    pool, // Exporting the pool for direct query execution
};
