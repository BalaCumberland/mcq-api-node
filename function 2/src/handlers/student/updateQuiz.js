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

    const { email, quizNames } = requestBody;

    if (!email) {
        return error("Missing 'email' parameter", 400);
    }

    // Convert quizNames to an array if it's a string
    const quizArray = quizNames ? (typeof quizNames === "string" ? [quizNames] : quizNames) : [];

    try {
        await client.query("BEGIN"); // Start transaction

        const quizQuery = `
            INSERT INTO student_quizzes (email, quiz_names) 
            VALUES ($1, to_jsonb($2::text[])::jsonb)
            ON CONFLICT (email) 
            DO UPDATE SET 
                quiz_names = (
                    SELECT jsonb_agg(DISTINCT q) 
                    FROM jsonb_array_elements(student_quizzes.quiz_names || to_jsonb($2::text[])) AS q
                );
        `;
        await client.query(quizQuery, [email, quizArray]);

        await client.query("COMMIT"); // Commit transaction
        await client.end();

        return success({ message: "Quiz updated successfully" });
    } catch (err) {
        await client.query("ROLLBACK"); // Rollback if error occurs
        await client.end();
        return error(err.message);
    }
};
