const { pool } = require("../../config/db");
const { success, error } = require("../../utils/response");
const VALID_CATEGORIES = require("../../handlers/questions/categories");

exports.handler = async (event) => {
    const email = event.queryStringParameters?.email;
    if (!email) {
        return error("Missing 'email' query parameter", 400);
    }

    const normalizedEmail = email.toLowerCase(); // ✅ Normalize email
    const allowedEmails = [
    "rajeshc837@gmail.com",
    "rgvvarma009@gmail.com",
    "balamuralipati@gmail.com"
    ];

    if (event.email &&!allowedEmails.includes(event.email.toLowerCase())) {
        return error("Email in request body is not authorized", 403);
    }

    let client;
    try {
        client = await pool.connect(); // ✅ Get pooled connection

        const query = `
            SELECT id, email, name, student_class, phone_number, sub_exp_date, updated_by, amount, payment_time 
            FROM students 
            WHERE LOWER(email) = LOWER($1)
        `;
        const result = await client.query(query, [normalizedEmail]);

        if (result.rows.length === 0) {
            return error("Student not found", 404);
        }

        let student = result.rows[0];

        // ✅ Get today's system date in YYYY-MM-DD format
        const today = new Date().toISOString().split("T")[0];

        // ✅ Handle NULL `sub_exp_date` - Default to "UNPAID"
        if (!student.sub_exp_date || student.sub_exp_date < today) {
            student.payment_status = "UNPAID";
        } else {
            student.payment_status = "PAID";
        }

        const classPrefix = student.student_class;
        student.subjects = Array.from(VALID_CATEGORIES).filter(category => category.startsWith(classPrefix));

        return success(student);
    } catch (err) {
        console.error("❌ Error Fetching Student:", err);
        return error("Internal Server Error", 500);
    } finally {
        if (client) client.release(); // ✅ Release connection back to the pool
    }
};
