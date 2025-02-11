const connectDB = require("../../config/db");

// ✅ AWS Lambda Handler
exports.handler = async (event) => {
    const client = await connectDB();
    try {
        // ✅ Extract Category & Student Email from Query Parameters
        const category = event.queryStringParameters?.category;
        const studentEmail = event.queryStringParameters?.email;

        if (!category || !studentEmail) {
            return createResponse(400, { error: "Category and student email are required." });
        }

        console.log(`Fetching quizzes for category: ${category}, excluding attempted quizzes for: ${studentEmail}`);

        // ✅ Run both DB queries in parallel using Promise.all()
        const [allQuizzesResult, attemptedQuizzesResult] = await Promise.all([
            client.query(
                `SELECT quiz_name FROM quiz_questions WHERE quiz_name LIKE $1 || '%'`,
                [category]
            ),
            client.query(
                `SELECT jsonb_array_elements_text(quiz_names) AS quiz_name FROM student_quizzes WHERE email = $1`,
                [studentEmail]
            )
        ]);

        if (allQuizzesResult.rows.length === 0) {
            return createResponse(404, { error: `No quizzes found for category: ${category}` });
        }

        const allQuizNames = allQuizzesResult.rows.map(row => row.quiz_name);
        const attemptedQuizNames = attemptedQuizzesResult.rows.map(row => row.quiz_name);

        console.log(`Attempted quizzes: ${JSON.stringify(attemptedQuizNames)}`);

        // ✅ If no attempted quizzes exist, return all quizzes
        if (attemptedQuizNames.length === 0) {
            console.log(`No attempted quizzes found for ${studentEmail}. Returning all quizzes.`);
            return createResponse(200, { unattempted_quizzes: allQuizNames });
        }

        // ✅ Otherwise, filter out attempted quizzes
        const unattemptedQuizzes = allQuizNames.filter(name => !attemptedQuizNames.includes(name));

        return createResponse(200, { unattempted_quizzes: unattemptedQuizzes });
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
