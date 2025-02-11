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

    const { email, phoneNumber, name, studentClass, paymentStatus } = requestBody;

    if (!email) {
        return error("Missing 'email' parameter", 400);
    }

    try {
        await client.query("BEGIN"); // Start transaction

        // ✅ Update only provided fields
        let updateFields = [];
        let updateValues = [];
        let paramIndex = 2;

        if (phoneNumber) {
            updateFields.push(`phone_number = $${paramIndex++}`);
            updateValues.push(phoneNumber);
        }
        if (name) {
            updateFields.push(`name = $${paramIndex++}`);
            updateValues.push(name);
        }
        if (studentClass) {
            updateFields.push(`student_class = $${paramIndex++}`);
            updateValues.push(studentClass);
        }
        if (paymentStatus) {
            updateFields.push(`payment_status = $${paramIndex++}`);
            updateValues.push(paymentStatus);
        }

        updateFields.push(`updated_time = NOW()`); // Always update timestamp

        if (updateFields.length > 1) {
            const studentQuery = `
                UPDATE students SET ${updateFields.join(", ")}
                WHERE email = $1
                RETURNING id, email, ${name ? "name," : ""} ${phoneNumber ? "phone_number," : ""} student_class, payment_status, updated_time;
            `;
            await client.query(studentQuery, [email, ...updateValues]);
        }

        await client.query("COMMIT"); // Commit transaction
        await client.end();

        return success({ message: "Student updated successfully" });
    } catch (err) {
        await client.query("ROLLBACK"); // Rollback if error occurs
        await client.end();
        return error(err.message);
    }
};
