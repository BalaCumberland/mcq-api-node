const { connectDB, pool } = require("../../config/db");
const { success, error } = require("../../utils/response");

exports.handler = async (event) => {
    let client;
    try {
        client = await connectDB(); // ✅ Get a pooled connection

        // ✅ Extract Email and Quiz Name from Query Parameters
        const email = event.queryStringParameters?.email;
        const quizName = event.queryStringParameters?.quizName; // ✅ Corrected field name

        if (!email) {
            return error("Missing 'email' parameter", 400);
        }
        if (!quizName) {
            return error("Missing 'quizName' parameter", 400);
        }

        console.log(`📌 Fetching quiz questions for: ${quizName}, Email: ${email}`);

        // ✅ Fetch Quiz Data from PostgreSQL
        const result = await client.query(
            `SELECT quiz_name AS "quizName", duration, category, questions 
             FROM quiz_questions WHERE quiz_name = $1`,
            [quizName]
        );

        if (result.rows.length === 0) {
            return error(`Quiz not found: ${quizName}`, 404);
        }

        const quizData = result.rows[0];

        // ✅ Transform `questions` JSONB into the required format
        quizData.questions = quizData.questions.map(q => ({
            hint: q.hint || "",
            question: q.question,
            correctAnswer: q.correct_answer,  // ✅ Match response format
            incorrectAnswers: q.incorrect_answers.split("~").map(answer => answer.trim()) // ✅ Convert string to array
        }));

        console.log(`✅ Quiz Data Fetched:`, quizData);

        // ✅ Update `student_quizzes` Table to Track Quiz Attempt
        await client.query("BEGIN"); // ✅ Start transaction

        const quizArray = [quizName];

        const quizUpdateQuery = `
            INSERT INTO student_quizzes (email, quiz_names) 
            VALUES ($1, to_jsonb($2::text[])::jsonb)
            ON CONFLICT (email) 
            DO UPDATE SET 
                quiz_names = (
                    SELECT jsonb_agg(DISTINCT q) 
                    FROM jsonb_array_elements(student_quizzes.quiz_names || to_jsonb($2::text[])) AS q
                );
        `;

        await client.query(quizUpdateQuery, [email, quizArray]);

        await client.query("COMMIT"); // ✅ Commit transaction

        return success({
            message: "Quiz fetched and updated successfully",
            quiz: quizData
        });
    } catch (err) {
        await client.query("ROLLBACK"); // ✅ Rollback if error occurs
        console.error("❌ Error Fetching Quiz:", err);
        return error("Internal Server Error", 500);
    } finally {
        if (client) client.release(); // ✅ Release connection back to the pool
    }
};
