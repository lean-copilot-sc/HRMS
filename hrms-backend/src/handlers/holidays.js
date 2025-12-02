const connectDB = require('../config/database');
const Holiday = require('../models/Holiday');
const { success, error } = require('../utils/response');

// Get All Holidays
module.exports.getAll = async (event) => {
  try {
    await connectDB();

    const { year } = event.queryStringParameters || {};

    let query = {};

    if (year) {
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31`);
      query.date = { $gte: startOfYear, $lte: endOfYear };
    }

    const holidays = await Holiday.find(query).sort({ date: 1 });

    return success(holidays);
  } catch (err) {
    console.error('Get holidays error:', err);
    return error(err.message);
  }
};

// Create Holiday
module.exports.create = async (event) => {
  try {
    await connectDB();

    const body = JSON.parse(event.body);
    const { name, date, description, type } = body;

    const holiday = await Holiday.create({
      name,
      date,
      description,
      type: type || 'public'
    });

    return success(holiday, 201);
  } catch (err) {
    console.error('Create holiday error:', err);
    return error(err.message);
  }
};

// Update Holiday
module.exports.update = async (event) => {
  try {
    await connectDB();

    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);

    const holiday = await Holiday.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!holiday) {
      return error('Holiday not found', 404);
    }

    return success(holiday);
  } catch (err) {
    console.error('Update holiday error:', err);
    return error(err.message);
  }
};

// Delete Holiday
module.exports.remove = async (event) => {
  try {
    await connectDB();

    const { id } = event.pathParameters;

    const holiday = await Holiday.findByIdAndDelete(id);

    if (!holiday) {
      return error('Holiday not found', 404);
    }

    return success({ message: 'Holiday deleted successfully' });
  } catch (err) {
    console.error('Delete holiday error:', err);
    return error(err.message);
  }
};
