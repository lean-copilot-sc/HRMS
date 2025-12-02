require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Holiday = require('../models/Holiday');

const SAMPLE_HOLIDAYS = [
  { name: 'Republic Day', date: '2025-01-26', description: 'National holiday celebrating the adoption of the Constitution of India.' },
  { name: 'Independence Day', date: '2025-08-15', description: 'Commemorates India\'s independence from British rule.' },
  { name: 'Diwali', date: '2025-10-20', description: 'Festival of lights celebrated across India.' },
];

const normalizeHoliday = (holiday) => ({
  name: holiday.name,
  date: new Date(`${holiday.date}T00:00:00.000Z`),
  description: holiday.description,
  type: 'public',
});

async function seed() {
  try {
    await connectDB();

    const operations = SAMPLE_HOLIDAYS.map((holiday) => {
      const normalized = normalizeHoliday(holiday);
      return Holiday.findOneAndUpdate(
        {
          name: normalized.name,
          date: normalized.date,
        },
        { $setOnInsert: normalized },
        { upsert: true, new: true }
      );
    });

    await Promise.all(operations);

    console.log('Holiday seed complete. Sample records ensured.');
  } catch (err) {
    console.error('Failed to seed holidays:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

seed();
