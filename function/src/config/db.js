const { Client } = require("pg");

const dbConfig = {
    user: "Kittu",
    host: "mcq-db.clki64gmuinh.us-east-2.rds.amazonaws.com",
    database: "mcqdb",
    password: "Kittussk99",
    port: 5432,
    ssl: {
        rejectUnauthorized: false // ✅ Allows self-signed SSL
    }
};

const connectDB = async () => {
    const client = new Client(dbConfig);
    await client.connect();
    return client;
};

module.exports = connectDB;
