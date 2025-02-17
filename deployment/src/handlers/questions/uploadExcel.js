const xlsx = require("xlsx");
const connectDB = require("../../config/db");
const VALID_CATEGORIES = require("./categories");
const multipart = require("lambda-multipart-parser");

// ✅ AWS Lambda Handler
exports.handler = async (event) => {
    try {
        const { category, duration } = event.queryStringParameters;
        console.log("Event:", JSON.stringify(event, null, 2));

        // ✅ Validate category
        if (!VALID_CATEGORIES.has(category)) {
            return createResponse(400, { error: `Invalid category: ${category}` });
        }

        // ✅ Parse Multipart Form-Data
        const result = await multipart.parse(event);
        const file = result.files[0];

        if (!file) {
            return createResponse(400, { error: "No file uploaded" });
        }

        const fileName = file.filename;
        const buffer = file.content; // Binary buffer

        // ✅ Validate file name
        if (!fileName.startsWith(category)) {
            return createResponse(400, {
                error: `File name must start with category: ${category}. Received: ${fileName}`,
            });
        }

        // ✅ Read Excel File
        const workbook = xlsx.read(buffer, { type: "buffer" });

        // ✅ Get Sheet Data
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
            defval: "", // ✅ Handle empty cells
            raw: true, // ✅ Preserve special characters
        });

        // ✅ Get current month and day (MM-DD format)
        const uploadTime = new Date().toISOString().slice(5, 10);

        // ✅ Insert Data into PostgreSQL
        const client = await connectDB();
        try {
            await client.query("BEGIN"); // Start transaction

            for (const row of sheetData) {
                const { explanation, Question, CorrectAnswer, IncorrectAnswers } = row;

                // ✅ Convert IncorrectAnswers String to Array
                const incorrectAnswersArray = IncorrectAnswers
                    ? IncorrectAnswers.split("~").map((ans) => ans.trim())
                    : [];

                await client.query(
                    `INSERT INTO quiz_questions (category, duration, explanation, question, correct_answer, incorrect_answers, upload_time)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [category, duration, explanation, Question, CorrectAnswer, incorrectAnswersArray, uploadTime]
                );
            }

            await client.query("COMMIT"); // ✅ Commit transaction
            return createResponse(200, { message: "Quiz data uploaded successfully", upload_time: uploadTime });
        } catch (error) {
            await client.query("ROLLBACK"); // ✅ Rollback on error
            return createResponse(500, { error: "Database error: " + error.message });
        } finally {
            client.release(); // ✅ Release DB connection
        }
    } catch (error) {
        return createResponse(400, { error: "Failed to upload quiz: " + error.message });
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