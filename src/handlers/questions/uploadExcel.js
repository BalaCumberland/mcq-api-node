const AWS = require("aws-sdk");
const xlsx = require("xlsx");
const Busboy = require("busboy");
const stream = require("stream");
const connectDB = require("../../config/db");
const { success, error } = require("../../utils/response");

exports.handler = async (event) => {
    const client = await connectDB();

    try {
        // ✅ Normalize headers (Fix AWS API Gateway header issue)
        const headers = Object.keys(event.headers).reduce((acc, key) => {
            acc[key.toLowerCase()] = event.headers[key]; // Ensure lowercase keys
            return acc;
        }, {});

        // ✅ Check Content-Type
        if (!headers["content-type"] || !headers["content-type"].includes("multipart/form-data")) {
            return error("Missing or invalid Content-Type. Expected multipart/form-data", 400);
        }

        console.log("✅ Processing Multipart Form Data...");

        // ✅ Decode Base64 body properly (Avoids UnicodeDecodeError)
        const bodyBuffer = Buffer.from(event.body, "base64");
        const bodyStream = new stream.PassThrough();
        bodyStream.end(bodyBuffer);

        // ✅ Extract File & Parameters from Multipart Form-Data
        const { quizName, duration, category, fileBuffer } = await parseMultipartFormData(bodyStream, headers["content-type"]);

        if (!quizName || !duration || !category || !fileBuffer) {
            return error("Missing required parameters: quizName, duration, category, or file", 400);
        }

        console.log(`✅ Extracted Data - QuizName: ${quizName}, Duration: ${duration}, Category: ${category}`);

        // ✅ Ensure Binary Buffer Before Processing Excel
        if (!(fileBuffer instanceof Buffer)) {
            return error("Invalid file format. Expected binary buffer", 400);
        }

        // ✅ Parse Excel File Properly (Avoids UnicodeDecodeError)
        const workbook = xlsx.read(fileBuffer, { type: "buffer", cellText: false, cellDates: true });

        // ✅ Get First Sheet & Convert to JSON
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

        if (!sheetData.length) {
            return error("Excel file is empty", 400);
        }

        // ✅ Prepare Questions for DB
        const questions = sheetData.map((row) => ({
            hint: row.Hint || "",
            question: row.Question || "",
            correctAnswer: row.CorrectAnswer || "",
            incorrectAnswers: row.IncorrectAnswers || "" // ✅ Store as a single string (NO SPLIT)
        }));

        // ✅ Insert into PostgreSQL
        const query = `
            INSERT INTO quiz_questions (quiz_name, duration, category, questions)
            VALUES ($1, $2, $3, $4::jsonb)
            RETURNING *;
        `;
        const values = [quizName, duration, category, JSON.stringify(questions)];
        const result = await client.query(query, values);

        await client.end();

        return success({
            message: "Quiz uploaded successfully",
            quiz: result.rows[0]
        }, 201);
    } catch (err) {
        await client.end();
        console.error("❌ Error:", err);
        return error("Failed to upload quiz: " + err.message, 500);
    }
};

// ✅ Helper: Parse Multipart Form Data (Handles Streams Properly)
async function parseMultipartFormData(bodyStream, contentType) {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: { "content-type": contentType } });

        let fileBuffer;
        const formData = {};

        busboy.on("file", (_, file) => {
            const buffers = [];
            file.on("data", (data) => buffers.push(data));
            file.on("end", () => {
                fileBuffer = Buffer.concat(buffers);
            });
        });

        busboy.on("field", (fieldname, value) => {
            formData[fieldname] = value;
        });

        busboy.on("finish", () => {
            if (!fileBuffer) return reject(new Error("No file uploaded"));
            resolve({ ...formData, fileBuffer });
        });

        bodyStream.pipe(busboy); // ✅ Pipe stream into busboy (Fixes truncation issue)
    });
}
