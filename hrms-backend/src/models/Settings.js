const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: 'HRMS Company'
  },
  companyEmail: {
    type: String,
    default: 'admin@company.com'
  },
  companyPhone: {
    type: String,
    default: ''
  },
  companyAddress: {
    type: String,
    default: ''
  },
  workingHoursPerDay: {
    type: Number,
    default: 8
  },
  leavePerYear: {
    type: Number,
    default: 20
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  autoApproveLeave: {
    type: Boolean,
    default: false
  },
  leaveApprovalEmails: {
    type: [String],
    default: ['gaurang5416@gmail.com']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
