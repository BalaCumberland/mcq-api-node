const connectDB = require("../../config/db");
const { success, error } = require("../../utils/response");

exports.handler = async (event) => {
    const client = await connectDB();

    let requestBody;
    try {
        requestBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (err) {
        return error("Invalid JSON format in request body", 400);
    }

    // Extract fields
    const { email, name, phoneNumber, studentClass, paymentStatus, quizNames } = requestBody;

    if (!email) {
        return error("Missing required field: 'email'", 400);
    }

    try {
        const query = `
            INSERT INTO students (email, name, phone_number, student_class, payment_status) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;

        const values = [
            email,
            name || null,
            phoneNumber || null,
            studentClass || "DEMO",
            paymentStatus || "UNPAID"
        ];

        const result = await client.query(query, values);
        await client.end();

        return success({ message: "Student created successfully", student: result.rows[0] }, 201);
    } catch (err) {
        await client.end();
        return error(err.message);
    }
};
