const connectDB = require("../../config/db");

// ✅ AWS Lambda Handler
exports.handler = async (event) => {
    const client = await connectDB();
    try {
        // ✅ Extract Quiz Name from Path Parameters
        const quizName = event.pathParameters?.name;
        if (!quizName) {
            return createResponse(400, { error: "Quiz name is required in path." });
        }

        console.log(`Fetching quiz questions for: ${quizName}`);

        // ✅ Fetch Quiz Questions from PostgreSQL
        const result = await client.query(
            `SELECT quiz_name, duration, category, questions FROM quiz_questions WHERE quiz_name = $1`,
            [quizName]
        );

        if (result.rows.length === 0) {
            return createResponse(404, { error: `Quiz not found: ${quizName}` });
        }

        return createResponse(200, result.rows[0]);
    } catch (error) {
        console.error("❌ Database Query Error:", error.message);
        return createResponse(500, { error: "Internal Server Error" });
    } finally {
        await client.end();
    }
};

// ✅ Helper: Create API Gateway Response
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}
