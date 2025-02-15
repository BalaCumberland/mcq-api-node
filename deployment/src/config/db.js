const { Pool } = require("pg");

const pool = new Pool({
    user: "Kittu",
    host: "mcq-db.clki64gmuinh.us-east-2.rds.amazonaws.com",
    database: "mcqdb",
    password: "Kittussk99",
    port: 5432,
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
