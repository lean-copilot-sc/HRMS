const salarySlipController = require('../controllers/salarySlipController');
const { success, error } = require('../utils/response');
const connectDB = require('../config/database');

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

    const payloadResult =
      result && typeof result === 'object' && Buffer.isBuffer(result.buffer)
        ? result
        : null;

    if (payloadResult || Buffer.isBuffer(result)) {
      const buffer = payloadResult ? payloadResult.buffer : result;
      const isPdf = event.resource?.endsWith('/pdf');
      const filename =
        payloadResult?.filename ||
        (isPdf
          ? `salary-slip-${payload.params.id}.pdf`
          : `salary-slips-${payload.query.month || 'all'}.xlsx`);
      const headers = {
        'Content-Type': payloadResult?.contentType
          || (isPdf
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        'Content-Disposition': isPdf
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`,
      };

      return {
        statusCode: 200,
        headers,
        isBase64Encoded: true,
        body: buffer.toString('base64'),
      };
    }

    return success(result, event.httpMethod === 'POST' ? 201 : 200);
  } catch (err) {
    if (err instanceof salarySlipController.HttpError) {
      return error(err.message, err.statusCode);
    }

    console.error('Salary slip handler error:', err);
    return error('Internal server error');
  }
};

module.exports.create = (event) => invoke(salarySlipController.createSalarySlip, event);
module.exports.list = (event) => invoke(salarySlipController.listSalarySlips, event);
module.exports.getById = (event) => invoke(salarySlipController.getSalarySlip, event);
module.exports.update = (event) => invoke(salarySlipController.updateSalarySlip, event);
module.exports.remove = (event) => invoke(salarySlipController.deleteSalarySlip, event);
module.exports.getPdf = (event) => invoke(salarySlipController.getSalarySlipPdf, event);
module.exports.export = (event) => invoke(salarySlipController.exportSalarySlips, event);
module.exports.listEmployees = (event) => invoke(salarySlipController.listEmployeesForSalarySlip, event);
