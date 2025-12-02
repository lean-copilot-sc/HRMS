const connectDB = require('../config/database');
const Settings = require('../models/Settings');
const response = require('../utils/response');

// Get settings
module.exports.getSettings = async (event) => {
  try {
    await connectDB();
    
    // Get or create settings (singleton pattern)
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({});
    }
    
    return response.success(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return response.error('Failed to fetch settings', 500);
  }
};

// Update settings
module.exports.updateSettings = async (event) => {
  try {
    await connectDB();
    
    const data = JSON.parse(event.body);
    
    // Validate leave approval emails
    if (data.leaveApprovalEmails) {
      const validEmails = data.leaveApprovalEmails.filter(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return email && email.trim() !== '' && emailRegex.test(email);
      });
      
      if (validEmails.length === 0) {
        return response.error('At least one valid email address is required for leave approvals', 400);
      }
      
      data.leaveApprovalEmails = validEmails;
    }
    
    // Get or create settings
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create(data);
    } else {
      settings = await Settings.findOneAndUpdate(
        {},
        data,
        { new: true, runValidators: true }
      );
    }
    
    return response.success(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    return response.error('Failed to update settings', 500);
  }
};
