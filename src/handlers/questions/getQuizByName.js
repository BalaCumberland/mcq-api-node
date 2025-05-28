const { pool } = require("../../config/db");
const { success, error } = require("../../utils/response");

exports.handler = async (event) => {
    let client;
    try {
        client = await pool.connect();

        // ✅ Extract Email and Quiz Name from Query Parameters
        let email = event.queryStringParameters?.email;
        const quizName = event.queryStringParameters?.quizName;

        const query = `
        SELECT id, email, name, student_class, phone_number, sub_exp_date, updated_by, amount, payment_time 
        FROM students 
        WHERE LOWER(email) = LOWER($1)`;
        
        const resultStudent = await client.query(query, [email]);

        if (resultStudent.rows.length === 0) {
            return error("Student not found", 404);
        }

        let student = resultStudent.rows[0];

        // ✅ Get today's system date in YYYY-MM-DD format
        const today = new Date().toISOString().split("T")[0];

        // ✅ Handle NULL `sub_exp_date` - Default to "UNPAID"
        if (!student.sub_exp_date || student.sub_exp_date < today) {
            return error("Student not paid", 400);
        } 

        if (!email) return error("Missing 'email' parameter", 400);
        if (!quizName) return error("Missing 'quizName' parameter", 400);

        email = email.toLowerCase(); // ✅ Normalize email
          if(event.email && event.email.toLowerCase() !== studentEmail?.toLowerCase()) {
            return error("Email in request body does not match authenticated user email", 403);
        }
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
        await client.query("BEGIN");

        const quizUpdateQuery = `
            INSERT INTO student_quizzes (email, quiz_names) 
            VALUES ($1, to_jsonb(ARRAY[$2]::text[])) 
            ON CONFLICT (email) 
            DO UPDATE SET quiz_names = (
                SELECT jsonb_agg(DISTINCT q) 
                FROM jsonb_array_elements(
                    COALESCE(student_quizzes.quiz_names, '[]'::jsonb) || to_jsonb(ARRAY[$2]::text[])
                ) AS q
            )
            RETURNING quiz_names;
        `;

        const updateResult = await client.query(quizUpdateQuery, [email, quizName]);

        console.log("✅ Updated student_quizzes:", updateResult.rows);

        await client.query("COMMIT"); // ✅ Commit transaction

        return success({
            message: "Quiz fetched and updated successfully",
            quiz: quizData
        });

    } catch (err) {
        await client.query("ROLLBACK"); // ✅ Rollback on error
        console.error("❌ Database Error:", err);
        return error("Internal Server Error", 500);
    } finally {
        if (client) client.release(); // ✅ Release connection back to pool
    }
};
