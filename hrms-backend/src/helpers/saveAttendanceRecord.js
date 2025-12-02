const { BiometricAttendance } = require('../models/Attendance');

const VALID_ACTIONS = new Set(['checkin', 'checkout']);
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * Persist a biometric attendance entry while preventing invalid sequences.
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {'checkin'|'checkout'} action
 * @returns {Promise<import('mongoose').Document>}
 */
function normalizeLocation(location) {
  if (!location || typeof location !== 'object') {
    return null;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const accuracy = Number(location.accuracy);
  const capturedAt = location.capturedAt ? new Date(location.capturedAt) : null;
  const source = typeof location.source === 'string' ? location.source.trim() : null;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const normalized = {
    latitude,
    longitude,
  };

  if (Number.isFinite(accuracy)) {
    normalized.accuracy = accuracy;
  }

  if (capturedAt && !Number.isNaN(capturedAt.getTime())) {
    normalized.capturedAt = capturedAt;
  }

  if (source) {
    normalized.source = source.slice(0, 32);
  }

  if (location.address && typeof location.address === 'object') {
    const address = location.address;
    const coerce = (value, max = 256) => {
      if (typeof value !== 'string' || !value.trim()) {
        return undefined;
      }
      return value.trim().slice(0, max);
    };

    normalized.address = {
      label: coerce(address.label, 512),
      road: coerce(address.road, 128),
      city: coerce(address.city, 128),
      state: coerce(address.state, 128),
      postcode: coerce(address.postcode, 32),
      country: coerce(address.country, 128),
    };

    // Remove undefined entries to keep document tidy
    Object.keys(normalized.address).forEach((key) => {
      if (normalized.address[key] === undefined) {
        delete normalized.address[key];
      }
    });

    if (Object.keys(normalized.address).length === 0) {
      delete normalized.address;
    }
  }

  return normalized;
}

async function saveAttendanceRecord(userId, action, location) {
  if (!VALID_ACTIONS.has(action)) {
    throw new Error('Invalid attendance action');
  }

  const lastRecord = await BiometricAttendance.findOne({ userId }).sort({ timestamp: -1 });

  if (!lastRecord && action === 'checkout') {
    throw new Error('Cannot checkout without a prior checkin');
  }

  if (lastRecord) {
    if (lastRecord.action === action) {
      if (action === 'checkin') {
        const elapsed = Date.now() - new Date(lastRecord.timestamp).getTime();
        if (elapsed < TWELVE_HOURS_MS) {
          throw new Error('Already checked in. Please checkout before checking in again.');
        }
      } else {
        throw new Error('Already checked out. Please check in before checking out again.');
      }
    }

  }

  const recordPayload = {
    userId,
    action,
    timestamp: new Date(),
  };

  const normalizedLocation = normalizeLocation(location);
  if (normalizedLocation) {
    recordPayload.location = normalizedLocation;
  }

  const record = await BiometricAttendance.create(recordPayload);

  return record;
}

module.exports = saveAttendanceRecord;
