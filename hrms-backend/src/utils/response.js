const response = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body),
  };
};

const success = (data, statusCode = 200) => {
  return response(statusCode, {
    success: true,
    data
  });
};

const error = (message, statusCode = 500) => {
  return response(statusCode, {
    success: false,
    error: message
  });
};

module.exports = {
  response,
  success,
  error
};
