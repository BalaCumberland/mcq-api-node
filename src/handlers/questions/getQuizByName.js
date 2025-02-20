const { pool } = require("../../config/db");
const { success, error } = require("../../utils/response");

exports.handler = async (event) => {
    let client;
    try {
        client = await pool.connect(); // ✅ Get a pooled DB connection

        // ✅ Extract Email and Quiz Name from Query Parameters
        let email = event.queryStringParameters?.email;
        const quizName = event.queryStringParameters?.quizName;

        if (!email) {
            return error("Missing 'email' parameter", 400);
        }
        if (!quizName) {
            return error("Missing 'quizName' parameter", 400);
        }

        email = email.toLowerCase(); // ✅ Normalize email for case-insensitive comparison
        console.log(`📌 Fetching quiz questions for: ${quizName}, Email: ${email}`);

        // ✅ Fetch Quiz Data from PostgreSQL
        const result = await client.query(
            `SELECT quiz_name AS "quizName", duration, category, questions FROM quiz_questions WHERE quiz_name = $1`,
            [quizName]
        );

        if (result.rows.length === 0) {
            return error(`Quiz not found: ${quizName}`, 404);
        }

        let quizData = result.rows[0];

        // ✅ Transform `questions` JSONB into required format
        quizData.questions = quizData.questions.map(q => ({
            explanation: q.explanation || "",
            question: q.question,
            correctAnswer: q.correctAnswer,
            incorrectAnswers: q.incorrectAnswers
        }));

        // ✅ Update `student_quizzes` Table to Track Quiz Attempt
        await client.query("BEGIN"); // ✅ Start transaction

        const quizUpdateQuery = `
            INSERT INTO student_quizzes (email, quiz_names) 
            VALUES ($1, to_jsonb(ARRAY[$2]::text[])) 
            ON CONFLICT (email) 
            DO UPDATE SET quiz_names = jsonb_set(student_quizzes.quiz_names, '{}', 
                (SELECT jsonb_agg(DISTINCT q) 
                 FROM jsonb_array_elements(student_quizzes.quiz_names || to_jsonb(ARRAY[$2]::text[])) AS q)
            )
            RETURNING quiz_names;
        `;

        await client.query(quizUpdateQuery, [email, quizName]);

        await client.query("COMMIT"); // ✅ Commit transaction

        return success({
            message: "Quiz fetched and updated successfully",
            quiz: quizData
        });
    } catch (err) {
        await client.query("ROLLBACK"); // ✅ Rollback if error occurs
        console.error("❌ Database Error:", err);
        return error("Internal Server Error", 500);
    } finally {
        if (client) client.release(); // ✅ Release connection back to the pool
    }
};
