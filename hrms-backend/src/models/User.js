const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const webauthnCredentialSchema = new mongoose.Schema({
  credentialID: {
    type: Buffer,
    required: true,
  },
  credentialPublicKey: {
    type: Buffer,
    required: true,
  },
  counter: {
    type: Number,
    required: true,
    default: 0,
  },
  transports: [{
    type: String,
    trim: true,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['admin', 'hr', 'employee'],
    default: 'employee',
  },
  phone: {
    type: String,
    default: null,
  },
  profile_image: {
    type: String,
    default: null,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  webauthnCredentials: {
    type: [webauthnCredentialSchema],
    default: [],
  },
  currentChallenge: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
