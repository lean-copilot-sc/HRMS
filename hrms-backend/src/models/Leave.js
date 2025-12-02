const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  leave_type: {
    type: String,
    enum: ['sick', 'casual', 'earned', 'unpaid'],
    required: true,
  },
  from_date: {
    type: Date,
    required: true,
  },
  to_date: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  applied_at: {
    type: Date,
    default: Date.now,
  },
  processed_at: {
    type: Date,
    default: null,
  },
});

// Calculate number of days
leaveSchema.virtual('days').get(function () {
  const diffTime = Math.abs(this.to_date - this.from_date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
});

module.exports = mongoose.model('Leave', leaveSchema);
