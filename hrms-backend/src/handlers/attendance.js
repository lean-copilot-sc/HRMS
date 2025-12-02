const mongoose = require('mongoose');
const connectDB = require('../config/database');
const AttendanceModel = require('../models/Attendance');
const Attendance = AttendanceModel;
const { BiometricAttendance } = AttendanceModel;
const Employee = require('../models/Employee');
const User = require('../models/User');
const Department = require('../models/Department');
const { success, error } = require('../utils/response');
const saveAttendanceRecord = require('../helpers/saveAttendanceRecord');

const parseLocationFromEvent = (event) => {
  if (!event || !event.body) {
    return null;
  }

  try {
    const payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    return payload && typeof payload === 'object' ? payload.location || null : null;
  } catch (err) {
    console.warn('Failed to parse location payload', err);
    return null;
  }
};

// Get all attendance records
module.exports.getAll = async (event) => {
  try {
    await connectDB();
    
    let attendance = await Attendance.find()
      .populate({
        path: 'employee_id',
        select: 'user_id department_id designation',
        populate: [
          { path: 'user_id', select: 'name email' },
          { path: 'department_id', select: 'name' }
        ]
      })
      .sort({ date: -1, createdAt: -1 })
      .limit(100);

    // Migrate old schema to new schema on-the-fly
    attendance = attendance.map(record => {
      const obj = record.toObject();
      
      // If sessions array is empty but clock_in exists (old schema), migrate it
      if ((!obj.sessions || obj.sessions.length === 0) && obj.clock_in) {
        obj.sessions = [{
          clock_in: obj.clock_in,
          clock_out: obj.clock_out || null,
          _id: record._id
        }];
        
        // Calculate total hours if not set
        if (!obj.total_hours && obj.clock_out) {
          const duration = (new Date(obj.clock_out) - new Date(obj.clock_in)) / (1000 * 60 * 60);
          obj.total_hours = duration;
        }
      }
      
      return obj;
    });

    return success(attendance);
  } catch (err) {
    console.error('Get attendance error:', err);
    return error(err.message);
  }
};

// Clock In
module.exports.clockIn = async (event) => {
  try {
    await connectDB();

    const { userId } = event.requestContext.authorizer;
    
    // Find employee by user_id
    const employee = await Employee.findOne({ user_id: userId });
    if (!employee) {
      return error('Employee record not found', 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if there's an attendance record for today
    let attendance = await Attendance.findOne({
      employee_id: employee._id,
      date: { $gte: today, $lt: tomorrow }
    });

    // Check if already clocked in (no clock-out for last session)
    if (attendance && attendance.sessions.length > 0) {
      const lastSession = attendance.sessions[attendance.sessions.length - 1];
      if (!lastSession.clock_out) {
        return error('Already clocked in. Please clock out first.', 400);
      }
    }

    if (attendance) {
      // Add new session to existing attendance
      attendance.sessions.push({
        clock_in: new Date(),
        clock_out: null
      });
      await attendance.save();
    } else {
      // Create new attendance record
      attendance = await Attendance.create({
        employee_id: employee._id,
        date: today,
        sessions: [{
          clock_in: new Date(),
          clock_out: null
        }],
        status: 'present'
      });
    }

    return success(attendance, 201);
  } catch (err) {
    console.error('Clock in error:', err);
    return error(err.message);
  }
};

// Clock Out
module.exports.clockOut = async (event) => {
  try {
    await connectDB();

    const { userId } = event.requestContext.authorizer;
    
    // Find employee by user_id
    const employee = await Employee.findOne({ user_id: userId });
    if (!employee) {
      return error('Employee record not found', 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee_id: employee._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance || attendance.sessions.length === 0) {
      return error('No clock-in record found', 404);
    }

    // Get last session
    const lastSession = attendance.sessions[attendance.sessions.length - 1];
    
    if (lastSession.clock_out) {
      return error('Already clocked out. Please clock in first.', 400);
    }

    // Update last session with clock-out time
    lastSession.clock_out = new Date();
    
    // Calculate and update total hours
    attendance.calculateTotalHours();
    await attendance.save();

    return success(attendance);
    const clockIn = new Date(attendance.clockIn);
    const clockOut = new Date(attendance.clockOut);
    attendance.workHours = (clockOut - clockIn) / (1000 * 60 * 60); // Convert to hours

    await attendance.save();

    return success(attendance);
  } catch (err) {
    console.error('Clock out error:', err);
    return error(err.message);
  }
};

// Get Attendance by Employee
module.exports.getByEmployee = async (event) => {
  try {
    await connectDB();

    const { employeeId } = event.pathParameters;
    const { startDate, endDate, date } = event.queryStringParameters || {};

    const query = { employee_id: employeeId };

    // If specific date is provided, filter for that day
    if (date) {
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      query.date = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }
    // Otherwise use date range if provided
    else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let attendance = await Attendance.find(query)
      .populate({
        path: 'employee_id',
        select: 'user_id department_id designation',
        populate: [
          { path: 'user_id', select: 'name email' },
          { path: 'department_id', select: 'name' }
        ]
      })
      .sort({ date: -1 });

    // Migrate old schema to new schema on-the-fly
    attendance = attendance.map(record => {
      const obj = record.toObject();
      
      if ((!obj.sessions || obj.sessions.length === 0) && obj.clock_in) {
        obj.sessions = [{
          clock_in: obj.clock_in,
          clock_out: obj.clock_out || null,
          _id: record._id
        }];
        
        if (!obj.total_hours && obj.clock_out) {
          const duration = (new Date(obj.clock_out) - new Date(obj.clock_in)) / (1000 * 60 * 60);
          obj.total_hours = duration;
        }
      }
      
      return obj;
    });

    return success(attendance);
  } catch (err) {
    console.error('Get attendance error:', err);
    return error(err.message);
  }
};

// Get Attendance Report
module.exports.getReport = async (event) => {
  try {
    await connectDB();

    const params = event.queryStringParameters || {};
    const { date, startDate, endDate, department, employeeId } = params;

    const buildStartOfDay = (value) => {
      const d = new Date(value);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const buildEndOfDay = (value) => {
      const d = new Date(value);
      d.setHours(23, 59, 59, 999);
      return d;
    };

    const toIsoOrNull = (value) => (value ? new Date(value).toISOString() : null);

    const employeeFilter = {};

    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return error('Invalid employeeId parameter', 400);
      }
      employeeFilter._id = employeeId;
    }

    if (department) {
      if (!mongoose.Types.ObjectId.isValid(department)) {
        return error('Invalid department parameter', 400);
      }
      employeeFilter.department_id = department;
    }

    const employees = await Employee.find(employeeFilter)
      .populate({ path: 'user_id', select: 'name email' })
      .populate({ path: 'department_id', select: 'name' })
      .lean();

    if (employees.length === 0) {
      return success([]);
    }

    const formatEmployee = (emp) => ({
      _id: emp._id.toString(),
      designation: emp.designation || null,
      department: emp.department_id
        ? {
            _id: (emp.department_id._id || emp.department_id).toString(),
            name: emp.department_id.name || null,
          }
        : null,
      user: emp.user_id
        ? {
            _id: (emp.user_id._id || emp.user_id).toString(),
            name: emp.user_id.name || null,
            email: emp.user_id.email || null,
          }
        : null,
    });

    const employeeMap = new Map();
    const employeeIds = [];
    const userToEmployeeMap = new Map();
    const biometricUserIds = new Set();

    employees.forEach((emp) => {
      const idStr = emp._id.toString();
      employeeMap.set(idStr, formatEmployee(emp));
      employeeIds.push(emp._id);

      const userRef = emp.user_id;
      if (userRef) {
        const rawUserId = (userRef._id || userRef).toString();
        userToEmployeeMap.set(rawUserId, idStr);
        if (mongoose.Types.ObjectId.isValid(rawUserId)) {
          biometricUserIds.add(rawUserId);
        }
      }
    });

    const attendanceFilter = { employee_id: { $in: employeeIds } };
    let specificDateRange = null;

    if (date) {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return error('Invalid date parameter', 400);
      }
      const start = buildStartOfDay(parsedDate);
      const end = buildEndOfDay(parsedDate);
      attendanceFilter.date = { $gte: start, $lte: end };
      specificDateRange = { start, end };
    } else if (startDate && endDate) {
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);
      if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
        return error('Invalid date range provided', 400);
      }
      attendanceFilter.date = {
        $gte: buildStartOfDay(rangeStart),
        $lte: buildEndOfDay(rangeEnd),
      };
    } else if (startDate || endDate) {
      return error('Both startDate and endDate are required when filtering by range', 400);
    }

    let attendanceRecords = [];
    if (employeeIds.length > 0) {
      attendanceRecords = await Attendance.find(attendanceFilter).lean();
    }

    const buildSessionsFromLogs = (logs = []) => {
      const sorted = logs
        .filter((log) => log && log.timestamp)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const sessions = [];
      let active = null;

      sorted.forEach((log) => {
        const action = log.action?.toLowerCase?.();
        if (!action) {
          return;
        }

        const timestamp = log.timestamp;
        if (!timestamp) {
          return;
        }

        if (action === 'checkin') {
          if (active && !active.clock_out) {
            sessions.push({ ...active });
          }
          active = { clock_in: timestamp, clock_out: null };
        } else if (action === 'checkout') {
          if (active && !active.clock_out) {
            active.clock_out = timestamp;
            sessions.push({ ...active });
            active = null;
          } else {
            sessions.push({ clock_in: null, clock_out: timestamp });
          }
        }
      });

      if (active) {
        sessions.push({ ...active });
      }

      return sessions;
    };

    let biometricLogsByEmployee = new Map();

    if (specificDateRange && biometricUserIds.size > 0) {
      const start = specificDateRange.start;
      const end = specificDateRange.end;
      const userIdObjects = Array.from(biometricUserIds).map((id) => new mongoose.Types.ObjectId(id));

      const biometricLogs = await BiometricAttendance.find({
        userId: { $in: userIdObjects },
        timestamp: { $gte: start, $lte: end },
      }).lean();

      biometricLogsByEmployee = biometricLogs.reduce((acc, log) => {
        const userIdStr = log.userId?.toString?.() || log.userId;
        const employeeIdStr = userToEmployeeMap.get(userIdStr);
        if (!employeeIdStr) {
          return acc;
        }

        if (!acc.has(employeeIdStr)) {
          acc.set(employeeIdStr, []);
        }
        acc.get(employeeIdStr).push(log);
        return acc;
      }, new Map());
    }

    const extractSessions = (record) => {
      if (Array.isArray(record.sessions) && record.sessions.length > 0) {
        return record.sessions;
      }

      if (record.clock_in) {
        return [
          {
            clock_in: record.clock_in,
            clock_out: record.clock_out || null,
          },
        ];
      }

      return [];
    };

    const computeSummary = (employee, reportDate, rawSessions = []) => {
      const sessions = rawSessions
        .filter((session) => session && session.clock_in)
        .map((session) => ({
          clockIn: new Date(session.clock_in),
          clockOut: session.clock_out ? new Date(session.clock_out) : null,
        }))
        .sort((a, b) => a.clockIn - b.clockIn);

      const firstClockIn = sessions.length > 0 ? sessions[0].clockIn : null;
      const lastClockOutEntry = [...sessions].reverse().find((session) => session.clockOut);
      const lastClockOut = lastClockOutEntry ? lastClockOutEntry.clockOut : null;

      const completedSessions = sessions.filter((session) => session.clockIn && session.clockOut);
      const hasActiveSession = sessions.some((session) => session.clockIn && !session.clockOut);

      const totalHoursRaw = completedSessions.reduce((total, session) => {
        return total + (session.clockOut - session.clockIn) / (1000 * 60 * 60);
      }, 0);
      const totalHours = Number(totalHoursRaw.toFixed(2));
      const sessionCount = completedSessions.length;

      let status = 'absent';
      if (firstClockIn) {
        if (hasActiveSession) {
          status = 'in-progress';
        } else if (totalHours >= 4) {
          status = 'present';
        } else {
          status = 'half-day';
        }
      }

      const sessionPayload = sessions.map((session, index) => ({
        order: index + 1,
        clockIn: session.clockIn ? session.clockIn.toISOString() : null,
        clockOut: session.clockOut ? session.clockOut.toISOString() : null,
        durationHours:
          session.clockIn && session.clockOut
            ? Number(((session.clockOut - session.clockIn) / (1000 * 60 * 60)).toFixed(2))
            : null,
      }));

      return {
        employee,
        date: reportDate ? new Date(reportDate).toISOString() : null,
        firstClockIn: toIsoOrNull(firstClockIn),
        lastClockOut: toIsoOrNull(lastClockOut),
        sessionCount,
        totalHours,
        status,
        sessions: sessionPayload,
      };
    };

    let summaries = [];

    if (specificDateRange) {
      const { start } = specificDateRange;
      summaries = employees.map((emp) => {
        const idStr = emp._id.toString();
        const daySessions = attendanceRecords
          .filter((record) => record.employee_id && record.employee_id.toString() === idStr)
          .flatMap((record) => extractSessions(record));

        const fallbackLogs = biometricLogsByEmployee.get(idStr) || [];
        const sessionsOrFallback = daySessions.length > 0 ? daySessions : buildSessionsFromLogs(fallbackLogs);

        return computeSummary(employeeMap.get(idStr), start, sessionsOrFallback);
      });
    } else {
      const grouped = new Map();

      attendanceRecords.forEach((record) => {
        if (!record.employee_id) {
          return;
        }

        const employeeIdStr = record.employee_id.toString();
        const employeeInfo = employeeMap.get(employeeIdStr);
        if (!employeeInfo) {
          return;
        }

        const reportDate = buildStartOfDay(record.date);
        const key = `${employeeIdStr}-${reportDate.getTime()}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            employee: employeeInfo,
            date: reportDate,
            sessions: [],
          });
        }

        const container = grouped.get(key);
        container.sessions.push(...extractSessions(record));
      });

      summaries = Array.from(grouped.values()).map((entry) =>
        computeSummary(entry.employee, entry.date, entry.sessions)
      );
    }

    // Filter by department post aggregation if dataset contains historical entries
    if (department && !specificDateRange) {
      summaries = summaries.filter((summary) => summary.employee?.department?._id === department);
    }

    summaries.sort((a, b) => {
      const dateDiff = new Date(b.date || 0) - new Date(a.date || 0);
      if (dateDiff !== 0) {
        return dateDiff;
      }

      const nameA = (a.employee?.user?.name || '').toLowerCase();
      const nameB = (b.employee?.user?.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return success(summaries);
  } catch (err) {
    console.error('Get attendance report error:', err);
    return error(err.message || 'Failed to load attendance report');
  }
};

// Manual Attendance Entry (Admin only)
module.exports.manual = async (event) => {
  try {
    await connectDB();

    const body = JSON.parse(event.body);
    const { employeeId, date, clockIn, clockOut, status, notes } = body;

    // Calculate total hours if both clock in and out are provided
    let total_hours = 0;
    if (clockIn && clockOut) {
      const clockInTime = new Date(clockIn);
      const clockOutTime = new Date(clockOut);
      total_hours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
    }

    const attendance = await Attendance.create({
      employee_id: employeeId,
      date: new Date(date),
      clock_in: clockIn ? new Date(clockIn) : undefined,
      clock_out: clockOut ? new Date(clockOut) : undefined,
      total_hours,
      status: status || 'manual'
    });

    return success(attendance, 201);
  } catch (err) {
    console.error('Manual attendance error:', err);
    return error(err.message);
  }
};

module.exports.getBiometricLogs = async (event) => {
  try {
    await connectDB();

    const { queryStringParameters = {} } = event;
    const { userId, date, startDate, endDate, limit } = queryStringParameters;

    if (!userId) {
      return error('userId is required', 400);
    }

    let userIdFilter = userId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userIdFilter = new mongoose.Types.ObjectId(userId);
    }

    const query = { userId: userIdFilter };

    if (date) {
      const selected = new Date(date);
      if (Number.isNaN(selected.getTime())) {
        return error('Invalid date parameter', 400);
      }
      const startOfDay = new Date(selected);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selected);
      endOfDay.setHours(23, 59, 59, 999);
      query.timestamp = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return error('Invalid date range provided', 400);
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      query.timestamp = {
        $gte: start,
        $lte: end,
      };
    }

    let mongoQuery = BiometricAttendance.find(query).sort({ timestamp: -1 });

    if (limit) {
      const parsedLimit = Number(limit);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        mongoQuery = mongoQuery.limit(parsedLimit);
      }
    }

    const records = await mongoQuery.lean();
    return success(records);
  } catch (err) {
    console.error('Get biometric attendance logs error:', err);
    return error(err.message || 'Failed to fetch attendance logs');
  }
};

module.exports.simpleCheckIn = async (event) => {
  try {
    await connectDB();
    const { userId } = event.requestContext.authorizer;
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const location = parseLocationFromEvent(event);
    const record = await saveAttendanceRecord(userId, 'checkin', location);
    return success(record.toObject ? record.toObject() : record, 201);
  } catch (err) {
    console.error('Simple check-in error:', err);
    return error(err.message || 'Failed to check in');
  }
};

module.exports.simpleCheckOut = async (event) => {
  try {
    await connectDB();
    const { userId } = event.requestContext.authorizer;
    if (!userId) {
      return error('Unauthorized', 401);
    }

    const location = parseLocationFromEvent(event);
    const record = await saveAttendanceRecord(userId, 'checkout', location);
    return success(record.toObject ? record.toObject() : record);
  } catch (err) {
    console.error('Simple check-out error:', err);
    return error(err.message || 'Failed to check out');
  }
};
