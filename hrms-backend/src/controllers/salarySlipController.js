const Joi = require('joi');
const ExcelJS = require('exceljs');
const SalarySlip = require('../models/SalarySlip');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const User = require('../models/User');
const { buildSalarySlipPdf, getSalarySlipFilename, formatMonthLabel } = require('../utils/salarySlipPdf');

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const salarySlipSchema = Joi.object({
  employee_id: Joi.string().hex().length(24).required(),
  employee_name: Joi.string().trim().min(3).required(),
  designation: Joi.string().trim().min(2).required(),
  department: Joi.string().trim().min(2).required(),
  month: Joi.string()
    .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
    .required(),
  basic_salary: Joi.number().min(0).required(),
  hra: Joi.number().min(0).required(),
  allowances: Joi.number().min(0).required(),
  overtime_amount: Joi.number().min(0).required(),
  professional_tax: Joi.number().min(0).required(),
  pf_contribution: Joi.number().min(0).required(),
  esi: Joi.number().min(0).required(),
  tds: Joi.number().min(0).required(),
  bank_account_no: Joi.string().trim().min(6).required(),
  ifsc_code: Joi.string().trim().min(4).required(),
});

const computeFigures = (payload) => {
  const gross_salary = payload.basic_salary + payload.hra + payload.allowances + payload.overtime_amount;
  const total_deductions = payload.professional_tax + payload.pf_contribution + payload.esi + payload.tds;
  const net_salary = gross_salary - total_deductions;

  return {
    ...payload,
    gross_salary,
    total_deductions,
    net_salary,
  };
};

const assertAdmin = (context) => {
  if (!context || context.role !== 'admin') {
    throw new HttpError(403, 'Admin access required');
  }
};

const resolveEmployeeSnapshot = async (employeeId, overrides = {}) => {
  const employee = await Employee.findById(employeeId)
    .populate({ path: 'department_id', select: 'name' })
    .populate({ path: 'user_id', select: 'name' });

  if (!employee) {
    throw new HttpError(404, 'Employee not found');
  }

  return {
    employee_id: employee._id,
    employee_name: overrides.employee_name || employee.user_id?.name || 'Employee',
    designation: overrides.designation || employee.designation || employee.position || 'Employee',
    department: overrides.department || employee.department_id?.name || 'General',
    bank_account_no: overrides.bank_account_no || employee.bank_account_no || '0000000000',
    ifsc_code: overrides.ifsc_code || employee.ifsc_code || 'IFSC0000',
  };
};

const buildExcelBuffer = async (slips = [], monthLabel) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Salary Slips');

  sheet.columns = [
    { header: 'Employee Name', key: 'employee_name', width: 25 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Gross Salary', key: 'gross_salary', width: 18 },
    { header: 'Total Deductions', key: 'total_deductions', width: 18 },
    { header: 'Net Salary', key: 'net_salary', width: 18 },
  ];

  slips.forEach((slip) => {
    sheet.addRow({
      employee_name: slip.employee_name,
      department: slip.department,
      designation: slip.designation,
      month: slip.month,
      gross_salary: slip.gross_salary,
      total_deductions: slip.total_deductions,
      net_salary: slip.net_salary,
    });
  });

  sheet.insertRow(1, [`Salary Slips - ${monthLabel || 'All Months'}`]);
  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').font = { bold: true, size: 14 };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  return workbook.xlsx.writeBuffer();
};

const sanitizeDocument = (doc) => {
  const json = doc.toObject ? doc.toObject() : doc;
  return {
    ...json,
    id: json._id?.toString(),
  };
};

const createSalarySlip = async ({ body, context }) => {
  assertAdmin(context);
  const { value, error } = salarySlipSchema.validate(body, { abortEarly: false });
  if (error) {
    throw new HttpError(400, error.details.map((detail) => detail.message).join(', '));
  }

  const employeeSnapshot = await resolveEmployeeSnapshot(value.employee_id, value);
  const payload = computeFigures({ ...value, ...employeeSnapshot });

  const slip = await SalarySlip.create(payload);
  return sanitizeDocument(slip);
};

const listSalarySlips = async ({ query, context }) => {
  assertAdmin(context);
  const filter = {};
  if (query?.month) {
    filter.month = query.month;
  }

  const slips = await SalarySlip.find(filter).sort({ month: -1, created_at: -1 });
  return slips.map(sanitizeDocument);
};

const getSalarySlip = async ({ params, context }) => {
  assertAdmin(context);
  const slip = await SalarySlip.findById(params.id);
  if (!slip) {
    throw new HttpError(404, 'Salary slip not found');
  }
  return sanitizeDocument(slip);
};

const updateSalarySlip = async ({ params, body, context }) => {
  assertAdmin(context);
  const { value, error } = salarySlipSchema.validate(body, { abortEarly: false });
  if (error) {
    throw new HttpError(400, error.details.map((detail) => detail.message).join(', '));
  }

  const employeeSnapshot = await resolveEmployeeSnapshot(value.employee_id, value);
  const payload = computeFigures({ ...value, ...employeeSnapshot });

  const slip = await SalarySlip.findByIdAndUpdate(params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!slip) {
    throw new HttpError(404, 'Salary slip not found');
  }

  return sanitizeDocument(slip);
};

const deleteSalarySlip = async ({ params, context }) => {
  assertAdmin(context);
  const slip = await SalarySlip.findByIdAndDelete(params.id);
  if (!slip) {
    throw new HttpError(404, 'Salary slip not found');
  }
  return { message: 'Salary slip deleted successfully' };
};

const getSalarySlipPdf = async ({ params, context }) => {
  assertAdmin(context);
  const slip = await SalarySlip.findById(params.id);
  if (!slip) {
    throw new HttpError(404, 'Salary slip not found');
  }
  const slipData = slip.toObject ? slip.toObject() : slip;
  const employee = await Employee.findById(slipData.employee_id)
    .populate({ path: 'user_id', select: 'name email' })
    .populate({ path: 'department_id', select: 'name' })
    .lean();

  const buffer = await buildSalarySlipPdf(slipData, employee || {});
  const filename = getSalarySlipFilename(slipData, employee || {});
  return {
    buffer,
    filename,
    contentType: 'application/pdf',
  };
};

const exportSalarySlips = async ({ query, context }) => {
  assertAdmin(context);
  const slips = await SalarySlip.find(query?.month ? { month: query.month } : {}).sort({ employee_name: 1 });
  const monthLabel = query?.month ? formatMonthLabel(query.month) : null;
  return buildExcelBuffer(slips, monthLabel);
};

const listEmployeesForSalarySlip = async ({ context }) => {
  assertAdmin(context);
  const employees = await Employee.find()
    .populate({ path: 'user_id', select: 'name email' })
    .populate({ path: 'department_id', select: 'name' });

  return employees.map((employee) => ({
    id: employee._id.toString(),
    name: employee.user_id?.name || 'N/A',
    code: employee.employee_code || null,
    email: employee.user_id?.email || null,
    designation: employee.designation || employee.position || 'Employee',
    department: employee.department_id?.name || 'General',
    bank_account_no: employee.bank_account_no || '',
    ifsc_code: employee.ifsc_code || '',
  }));
};

const controller = {
  createSalarySlip,
  listSalarySlips,
  getSalarySlip,
  updateSalarySlip,
  deleteSalarySlip,
  getSalarySlipPdf,
  exportSalarySlips,
  listEmployeesForSalarySlip,
};

module.exports = {
  ...controller,
  HttpError,
};
