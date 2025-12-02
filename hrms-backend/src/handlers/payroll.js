const payrollController = require('../controllers/payrollController');
const salarySlipController = require('../controllers/salarySlipController');
const connectDB = require('../config/database');
const { success, error } = require('../utils/response');

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (err) {
      throw new salarySlipController.HttpError(400, 'Invalid JSON payload');
    }
  }
  return body;
};

const getContext = (event) => ({
  role: event.requestContext?.authorizer?.role,
  userId: event.requestContext?.authorizer?.userId,
});

const invoke = async (handler, event) => {
  try {
    await connectDB();
    const payload = {
      body: parseBody(event.body),
      params: event.pathParameters || {},
      query: event.queryStringParameters || {},
      context: getContext(event),
    };

    const result = await handler(payload);
    return success(result, 200);
  } catch (err) {
    if (err instanceof salarySlipController.HttpError) {
      return error(err.message, err.statusCode);
    }

    console.error('Payroll handler error:', err);
    return error('Internal server error');
  }
};

module.exports.sendSalarySlips = (event) => invoke(payrollController.sendSalarySlips, event);
