const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  department_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
  },
  designation: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
    default: null,
  },
  bank_account_no: {
    type: String,
    default: null,
  },
  ifsc_code: {
    type: String,
    default: null,
  },
  employee_type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract'],
    default: 'full-time',
  },
  joining_date: {
    type: Date,
    required: true,
  },
  salary: {
    type: Number,
    required: true,
  },
  leaving_date: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  leave_balance: {
    sick: { type: Number, default: 10 },
    casual: { type: Number, default: 12 },
    earned: { type: Number, default: 15 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Employee', employeeSchema);
