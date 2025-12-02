const Joi = require('joi');
const mongoose = require('mongoose');
const { HttpError } = require('./salarySlipController');
const Employee = require('../models/Employee');
const SalarySlip = require('../models/SalarySlip');
const SalarySlipLog = require('../models/SalarySlipLog');
const { sendEmail } = require('../utils/emailService');
const {
  buildSalarySlipPdf,
  getSalarySlipFilename,
  formatMonthLabel,
} = require('../utils/salarySlipPdf');

const sendSchema = Joi.object({
  employeeIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
  months: Joi.array()
    .items(
      Joi.string()
        .trim()
        .pattern(/^\d{4}-(0[1-9]|1[0-2])$/),
    )
    .min(1)
    .max(6)
    .required(),
});

const assertAdmin = (context) => {
  if (!context || context.role !== 'admin') {
    throw new HttpError(403, 'Admin access required');
  }
};

const ensureObjectId = (id) => new mongoose.Types.ObjectId(id);

const sendSalarySlips = async ({ body, context }) => {
  assertAdmin(context);

  const { value, error } = sendSchema.validate(body, { abortEarly: false });
  if (error) {
    throw new HttpError(400, error.details.map((detail) => detail.message).join(', '));
  }

  const employeeIds = value.employeeIds.map(ensureObjectId);
  const months = value.months;

  const employees = await Employee.find({ _id: { $in: employeeIds } })
    .populate({ path: 'user_id', select: 'name email' })
    .populate({ path: 'department_id', select: 'name' })
    .lean();

  if (employees.length === 0) {
    throw new HttpError(404, 'No employees found for the given identifiers');
  }

  const employeesById = new Map(employees.map((employee) => [employee._id.toString(), employee]));

  const slips = await SalarySlip.find({
    employee_id: { $in: employeeIds },
    month: { $in: months },
  }).lean();

  const slipMap = new Map();
  slips.forEach((slip) => {
    slipMap.set(`${slip.employee_id.toString()}:${slip.month}`, slip);
  });

  const missingData = [];
  const employeeResults = [];
  const logEntries = [];

  for (const employeeId of value.employeeIds) {
    const employee = employeesById.get(employeeId);
    if (!employee) {
      missingData.push({ employeeId, reason: 'Employee not found' });
      employeeResults.push({ employeeId, status: 'failed', reason: 'Employee not found' });
      continue;
    }

    const email = employee.user_id?.email;
    if (!email) {
      employeeResults.push({ employeeId, status: 'failed', reason: 'Employee email not available' });
      months.forEach((month) => {
        const slip = slipMap.get(`${employeeId}:${month}`);
        if (slip) {
          logEntries.push({
            employeeId,
            slip,
            month: slip.month,
            status: 'failed',
            error: 'Employee email not available',
          });
        } else {
          missingData.push({ employeeId, month, reason: 'Salary slip not found' });
          logEntries.push({
            employeeId,
            month,
            status: 'failed',
            error: 'Salary slip not found',
          });
        }
      });
      continue;
    }

    const attachments = [];
    const availableSlips = [];
    let missingForEmployee = false;

    for (const month of months) {
      const slip = slipMap.get(`${employeeId}:${month}`);
      if (!slip) {
        missingData.push({ employeeId, month, reason: 'Salary slip not found' });
        logEntries.push({
          employeeId,
          month,
          status: 'failed',
          error: 'Salary slip not found',
        });
        missingForEmployee = true;
        continue;
      }

      const buffer = await buildSalarySlipPdf(slip, employee);
      attachments.push({
        filename: getSalarySlipFilename(slip, employee),
        content: buffer,
        contentType: 'application/pdf',
      });
      availableSlips.push(slip);
    }

    if (attachments.length === 0) {
      employeeResults.push({ employeeId, status: 'failed', reason: 'No salary slips available' });
      continue;
    }

    const monthLabels = availableSlips.map((slip) => formatMonthLabel(slip.month));

    try {
      await sendEmail({
        to: [email],
        subject:
          monthLabels.length === 1
            ? `Your Salary Slip for ${monthLabels[0]}`
            : `Your Salary Slips for ${monthLabels.join(', ')}`,
        html: buildEmailBody(employee, monthLabels),
        text: buildEmailText(employee, monthLabels),
        attachments,
      });

      availableSlips.forEach((slip) => {
        logEntries.push({ employeeId, slip, month: slip.month, status: 'sent' });
      });

      employeeResults.push({
        employeeId,
        status: missingForEmployee ? 'partial' : 'sent',
        monthsSent: monthLabels,
      });
    } catch (err) {
      console.error('Salary slip email failed:', err);
      availableSlips.forEach((slip) => {
        logEntries.push({
          employeeId,
          slip,
          month: slip.month,
          status: 'failed',
          error: err.message || 'Unknown email error',
        });
      });

      employeeResults.push({
        employeeId,
        status: 'failed',
        reason: err.message || 'Failed to send email',
      });
    }
  }

  if (logEntries.length > 0) {
    await SalarySlipLog.insertMany(
      logEntries.map((entry) => ({
        employee_id: ensureObjectId(entry.employeeId),
        salary_slip_id: entry.slip?._id || null,
        month: entry.month || entry.slip?.month,
        status: entry.status,
        file_url: null,
        error_message: entry.error || null,
        metadata: {
          net_salary: entry.slip?.net_salary,
          basic_salary: entry.slip?.basic_salary,
        },
        sent_at: new Date(),
      })),
    );
  }

  const summary = buildSummary(employeeResults);

  return {
    success: true,
    summary,
    results: employeeResults,
    missingData,
  };
};

const buildEmailBody = (employee, monthLabels) => {
  const greetingName = employee.user_id?.name || 'Team Member';
  const monthsList = monthLabels.join(', ');

  return `
    <p>Dear ${greetingName},</p>
    <p>Please find attached your salary slip for ${monthsList}.</p>
    <p>If you have any questions or notice any discrepancies, please reach out to the HR department.</p>
    <p>Regards,<br/>HR Department</p>
  `;
};

const buildEmailText = (employee, monthLabels) => {
  const greetingName = employee.user_id?.name || 'Team Member';
  const monthsList = monthLabels.join(', ');

  return `Dear ${greetingName},\n\nPlease find attached your salary slip for ${monthsList}.\n\nRegards,\nHR Department`;
};

const buildSummary = (results) => {
  const summary = {
    totalEmployees: results.length,
    sent: 0,
    failed: 0,
    partial: 0,
  };

  results.forEach((result) => {
    if (result.status === 'sent') {
      summary.sent += 1;
    } else if (result.status === 'partial') {
      summary.partial += 1;
    } else {
      summary.failed += 1;
    }
  });

  return summary;
};

module.exports = {
  sendSalarySlips,
};
