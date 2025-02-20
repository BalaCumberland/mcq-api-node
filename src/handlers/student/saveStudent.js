const { pool } = require("../../config/db");
const { success, error } = require("../../utils/response");

exports.handler = async (event) => {
    let client;
    try {
        client = await pool.connect(); // ✅ Get a pooled DB connection

        let requestBody;
        try {
            requestBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        } catch (err) {
            return error("Invalid JSON format in request body", 400);
        }

        // ✅ Extract and Normalize Fields
        const { email, name, phoneNumber, studentClass, paymentStatus } = requestBody;

        if (!email) {
            return error("Missing required field: 'email'", 400);
        }

        const normalizedEmail = email.toLowerCase(); // ✅ Convert email to lowercase

        // ✅ Insert Query (Ensuring Case-Insensitive Uniqueness)
        const query = `
            INSERT INTO students (email, name, phone_number, student_class, payment_status) 
            VALUES ($1, $2, $3, $4, $5) 
            ON CONFLICT (email) DO NOTHING 
            RETURNING id, email, name, student_class, payment_status;
        `;

        const values = [
            normalizedEmail,
            name || null,
            phoneNumber || null,
            studentClass || "DEMO",
            paymentStatus || "UNPAID"
        ];

        const result = await client.query(query, values);

        if (result.rowCount === 0) {
            return error("Student already exists", 409);
        }

        return success({ message: "Student created successfully", student: result.rows[0] }, 201);
    } catch (err) {
        console.error("❌ Database Error:", err);
        return error("Internal Server Error", 500);
    } finally {
        if (client) client.release(); // ✅ Release connection back to the pool
    }
};
