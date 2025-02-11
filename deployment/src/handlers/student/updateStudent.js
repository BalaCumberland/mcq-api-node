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

        // ✅ Update only provided fields (allow empty string updates)
        let updateFields = [];
        let updateValues = [];
        let paramIndex = 2;

        if (phoneNumber !== undefined) {
            updateFields.push(`phone_number = $${paramIndex++}`);
            updateValues.push(phoneNumber);
        }
        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex++}`);
            updateValues.push(name);
        }
        if (studentClass !== undefined) {
            updateFields.push(`student_class = $${paramIndex++}`);
            updateValues.push(studentClass);
        }
        if (paymentStatus !== undefined) {
            updateFields.push(`payment_status = $${paramIndex++}`);
            updateValues.push(paymentStatus);
        }

        updateFields.push(`updated_time = NOW()`); // Always update timestamp

        if (updateFields.length > 1) {  // Ensure there are fields to update
            const studentQuery = `
                UPDATE students SET ${updateFields.join(", ")}
                WHERE email = $1
                RETURNING id, email, ${name !== undefined ? "name," : ""} 
                ${phoneNumber !== undefined ? "phone_number," : ""} 
                student_class, payment_status, updated_time;
            `;
            const result = await client.query(studentQuery, [email, ...updateValues]);

            if (result.rowCount === 0) {
                await client.query("ROLLBACK");
                await client.end();
                return error("No student found with the provided email", 404);
            }
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
