exports.getStudentByEmail = require("./src/handlers/student/getStudent").handler;
exports.saveStudentDetails = require("./src/handlers/student/saveStudent").handler;
exports.updateQuiz = require("./src/handlers/student/updateQuiz").handler;
exports.updateStudentDetails = require("./src/handlers/student/updateStudent").handler;
exports.uploadExcel = require("./src/handlers/questions/uploadExcel").handler;
exports.getQuizByName = require("./src/handlers/questions/getQuizByName.js").handler;
exports.getQugetUnAttemptedQuizNames = require("./src/handlers/questions/getUnAttemptedQuizNames.js").handler;
