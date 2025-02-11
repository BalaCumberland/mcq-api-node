const connectDB = require("../../config/db");
const { success, error } = require("../../utils/response");

exports.handler = async (event) => {
    const client = await connectDB();
    
    // Extract email from query parameters (GET requests do not have a body)
    const email = event.queryStringParameters?.email;

    if (!email) {
        return error("Missing 'email' query parameter", 400);
    }

    try {
        const result = await client.query("SELECT * FROM students WHERE email = $1", [email]);
        await client.end();

        if (result.rows.length === 0) {
            return error("Student not found", 404);
        }
        return success(result.rows[0]);
    } catch (err) {
        await client.end();
        return error(err.message);
    }
};