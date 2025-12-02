const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  sessions: [{
    clock_in: {
      type: Date,
      required: true,
    },
    clock_out: {
      type: Date,
      default: null,
    }
  }],
  total_hours: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'manual'],
    default: 'present',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Calculate total hours from all sessions
attendanceSchema.methods.calculateTotalHours = function() {
  let totalMs = 0;
  this.sessions.forEach(session => {
    if (session.clock_in && session.clock_out) {
      totalMs += session.clock_out - session.clock_in;
    }
  });
  this.total_hours = totalMs / (1000 * 60 * 60); // Convert to hours
  return this.total_hours;
};

// Virtual for backward compatibility
attendanceSchema.virtual('clock_in').get(function() {
  return this.sessions.length > 0 ? this.sessions[0].clock_in : null;
});

attendanceSchema.virtual('clock_out').get(function() {
  const lastSession = this.sessions[this.sessions.length - 1];
  return lastSession ? lastSession.clock_out : null;
});

attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

const biometricAttendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: ['checkin', 'checkout'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  location: {
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    accuracy: {
      type: Number,
    },
    source: {
      type: String,
      trim: true,
      maxlength: 32,
    },
    capturedAt: {
      type: Date,
    },
    address: {
      label: {
        type: String,
        trim: true,
        maxlength: 512,
      },
      road: {
        type: String,
        trim: true,
        maxlength: 128,
      },
      city: {
        type: String,
        trim: true,
        maxlength: 128,
      },
      state: {
        type: String,
        trim: true,
        maxlength: 128,
      },
      postcode: {
        type: String,
        trim: true,
        maxlength: 32,
      },
      country: {
        type: String,
        trim: true,
        maxlength: 128,
      },
    },
  },
}, {
  timestamps: false,
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
const BiometricAttendance = mongoose.models.BiometricAttendance || mongoose.model('BiometricAttendance', biometricAttendanceSchema);

module.exports = Attendance;
module.exports.BiometricAttendance = BiometricAttendance;
