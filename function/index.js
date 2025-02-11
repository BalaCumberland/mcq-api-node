exports.getStudentByEmail = require("./handlers/student/getStudent").handler;
exports.saveStudentDetails = require("./handlers/student/saveStudent").handler;
exports.updateQuiz = require("./handlers/student/updateQuiz").handler;
exports.updateStudentDetails = require("./handlers/student/updateStudent").handler;
exports.uploadExcel = require("./handlers/questions/uploadExcel").handler;
exports.getQuizByName = require("./handlers/questions/getQuizByName.js").handler;
exports.getQugetUnAttemptedQuizNames = require("./handlers/questions/getUnAttemptedQuizNames.js").handler;

// index.js (at the root level)
exports.handler = async (event) => {
    // Route the request based on the path or event source
    const path = event.path || '';
    
    try {
        switch(path) {
            case '/student/get':
                return await require("./src/handlers/student/getStudent").handler(event);
            case '/student/save':
                return await require("./src/handlers/student/saveStudent").handler(event);
            case '/student/update':
                return await require("./src/handlers/student/updateStudent").handler(event);
            case '/student/quiz/update':
                return await require("./src/handlers/student/updateQuiz").handler(event);
            case '/questions/upload':
                return await require("./src/handlers/questions/uploadExcel").handler(event);
            case '/questions/quiz':
                return await require("./src/handlers/questions/getQuizByName").handler(event);
            case '/questions/unattempted':
                return await require("./src/handlers/questions/getUnAttemptedQuizNames").handler(event);
            default:
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Not Found' })
                };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' })
        };
    }
};
