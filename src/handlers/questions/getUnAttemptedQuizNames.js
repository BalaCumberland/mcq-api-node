const { pool } = require("../../config/db");
const { error } = require("../../utils/response");

// ✅ Define Categories that Require Date Filtering
const dateFilteredCategories = new Set([
    "CLS11-MPC-EAMCET", "CLS11-MPC-JEEMAINS", "CLS11-MPC-JEEADV",
    "CLS12-MPC-EAMCET", "CLS12-MPC-JEEMAINS", "CLS12-MPC-JEEADV",
    "CLS11-BIPC-EAPCET", "CLS11-BIPC-NEET",
    "CLS12-BIPC-EAPCET", "CLS12-BIPC-NEET"
]);

// ✅ AWS Lambda Handler with Connection Pooling
exports.handler = async (event) => {
    let client;
    try {
        client = await pool.connect(); // ✅ Get a pooled DB connection

        // ✅ Extract & Normalize Email and Category
        const category = event.queryStringParameters?.category;
        let studentEmail = event.queryStringParameters?.email;
         if(event.email && event.email.toLowerCase() !== studentEmail?.toLowerCase()) {
            return error("Email in request body does not match authenticated user email", 403);
        }

        if (!category || !studentEmail) {
            return createResponse(400, { error: "Category and student email are required." });
        }

        studentEmail = studentEmail.toLowerCase(); // ✅ Normalize email for case-insensitive comparison
        console.log(`📌 Fetching quizzes for category: ${category}, excluding attempted quizzes for: ${studentEmail}`);


 // ✅ Extract Email and Quiz Name from Query Parameters

        const query = `
        SELECT id, email, name, student_class, phone_number, sub_exp_date, updated_by, amount, payment_time 
        FROM students 
        WHERE LOWER(email) = LOWER($1)`;
        
        const resultStudent = await client.query(query, [studentEmail]);

        if (resultStudent.rows.length === 0) {
            return [error("Student not found", 404)];
        }

        let student = resultStudent.rows[0];

        // ✅ Get today's system date in YYYY-MM-DD format
        const today = new Date().toISOString().split("T")[0];

        // ✅ Handle NULL `sub_exp_date` - Default to "UNPAID"
        if (!student.sub_exp_date || student.sub_exp_date < today) {
            return error("Student not paid", 400);
        } 


        let quizFilterQuery = `SELECT quiz_name FROM quiz_questions WHERE category = $1`;
        let queryParams = [category];

        // ✅ Apply Date Filtering if Category Matches
        if (dateFilteredCategories.has(category)) {
            const currentMonth = new Date().getMonth() + 1; // ✅ Get current month (1-12)
            const currentDate = new Date().getDate(); // ✅ Get current date (1-31)

            const quizPattern = `${category}-${currentMonth}-${currentDate}-%`;
            quizFilterQuery = `SELECT quiz_name FROM quiz_questions WHERE category = $1 AND quiz_name LIKE $2`;
            queryParams.push(quizPattern);
        }

        console.log(`🔍 Executing Query: ${quizFilterQuery}`);
        console.log(`🔍 Query Parameters: ${JSON.stringify(queryParams)}`);

        // ✅ Run both DB queries in parallel using `Promise.all()`
        const [allQuizzesResult, attemptedQuizzesResult] = await Promise.all([
            client.query(quizFilterQuery, queryParams),
            client.query(
                `SELECT jsonb_array_elements_text(quiz_names) AS quiz_name FROM student_quizzes WHERE LOWER(email) = $1`,
                [studentEmail]
            )
        ]);

        if (allQuizzesResult.rows.length === 0) {
            return createResponse(200, { unattempted_quizzes: [] });
        }

        const allQuizNames = allQuizzesResult.rows.map(row => row.quiz_name);
        const attemptedQuizNames = attemptedQuizzesResult.rows.map(row => row.quiz_name);

        console.log(`✅ Attempted quizzes: ${JSON.stringify(attemptedQuizNames)}`);

        // ✅ If no attempted quizzes exist, return all quizzes
        if (attemptedQuizNames.length === 0) {
            console.log(`✅ No attempted quizzes found for ${studentEmail}. Returning all quizzes.`);
            return createResponse(200, { unattempted_quizzes: allQuizNames });
        }

        // ✅ Otherwise, filter out attempted quizzes
        const unattemptedQuizzes = allQuizNames.filter(name => !attemptedQuizNames.includes(name));

        return createResponse(200, { unattempted_quizzes: unattemptedQuizzes });
    } catch (error) {
        console.error("❌ Database Query Error:", error);
        return createResponse(500, { error: "Internal Server Error" });
    } finally {
        if (client) client.release(); // ✅ Release connection back to the pool
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
