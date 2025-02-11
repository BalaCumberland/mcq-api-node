exports.success = (data) => ({
    statusCode: 200,
    body: JSON.stringify(data),
});

exports.error = (message, code = 500) => ({
    statusCode: code,
    body: JSON.stringify({ error: message }),
});
