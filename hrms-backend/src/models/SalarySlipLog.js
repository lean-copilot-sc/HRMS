const mongoose = require('mongoose');

const salarySlipLogSchema = new mongoose.Schema(
  {
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    salary_slip_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalarySlip',
      default: null,
    },
    month: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    file_url: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },
    error_message: {
      type: String,
      default: null,
      trim: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
    sent_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

salarySlipLogSchema.index({ employee_id: 1, month: 1, salary_slip_id: 1 });

module.exports = mongoose.model('SalarySlipLog', salarySlipLogSchema);
