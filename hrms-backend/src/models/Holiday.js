const mongoose = require('mongoose');

const HOLIDAY_TYPES = ['public', 'optional', 'restricted', 'company'];

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: HOLIDAY_TYPES,
    default: 'public',
  },
  description: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Holiday', holidaySchema);
