const admin = require('./src/config/firebase');

const handlers = {
  "/students/get-by-email": require("./src/handlers/student/getStudent").handler,
  "/students/register": require("./src/handlers/student/saveStudent").handler,
  "/students/update": require("./src/handlers/student/updateStudent").handler,
  "/quiz/unattempted-quizzes": require("./src/handlers/questions/getUnAttemptedQuizNames").handler,
  "/quiz/get-by-name": require("./src/handlers/questions/getQuizByName").handler,
};

// Define CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow all origins (modify if needed)
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

exports.handler = async (event) => {
  console.log("🔍 Received Event:", JSON.stringify(event, null, 2));

  // Get HTTP method from either property
  const method =
    event.httpMethod ||
    (event.requestContext &&
      event.requestContext.http &&
      event.requestContext.http.method);

  // Handle CORS Preflight (OPTIONS request)
  if (method && method.toUpperCase() === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CORS preflight response" })
    };
  }

  // Check for Authorization header
  const authHeader =
    event.headers && (event.headers.Authorization || event.headers.authorization);
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    event.decodedToken = decodedToken; // Optional: pass user info along
  } catch (error) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Unauthorized", details: error.message }),
    };
  }

  // Normalize path (API Gateway uses event.path, Lambda URLs use event.rawPath)
  let functionName = event.rawPath || event.path;
  console.log("🚀 Function Detected:", functionName);

  if (!functionName || !handlers[functionName]) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Invalid API Route", received: functionName }),
    };
  }

  try {
    // Call the correct handler function and ensure response contains CORS headers
    const response = await handlers[functionName](event);
    return {
      ...response,
      headers: { ...response.headers, ...corsHeaders } // Merge existing and CORS headers
    };
  } catch (err) {
    console.error("❌ Error in Lambda Handler:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal Server Error", details: err.message }),
    };
  }
};
