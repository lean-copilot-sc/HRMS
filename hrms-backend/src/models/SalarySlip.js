const mongoose = require('mongoose');

const salarySlipSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  employee_name: {
    type: String,
    required: true,
    trim: true,
  },
  designation: {
    type: String,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    required: true,
    trim: true,
  },
  month: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/,
    index: true,
  },
  basic_salary: {
    type: Number,
    required: true,
    min: 0,
  },
  hra: {
    type: Number,
    required: true,
    min: 0,
  },
  allowances: {
    type: Number,
    required: true,
    min: 0,
  },
  overtime_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  gross_salary: {
    type: Number,
    required: true,
    min: 0,
  },
  professional_tax: {
    type: Number,
    required: true,
    min: 0,
  },
  pf_contribution: {
    type: Number,
    required: true,
    min: 0,
  },
  esi: {
    type: Number,
    required: true,
    min: 0,
  },
  tds: {
    type: Number,
    required: true,
    min: 0,
  },
  total_deductions: {
    type: Number,
    required: true,
    min: 0,
  },
  net_salary: {
    type: Number,
    required: true,
    min: 0,
  },
  bank_account_no: {
    type: String,
    required: true,
    trim: true,
  },
  ifsc_code: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

salarySlipSchema.index({ employee_id: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('SalarySlip', salarySlipSchema);
