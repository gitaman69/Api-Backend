const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  otp: String,
  otpExpiresAt: Date,
  // Add an array to store multiple Expo push tokens (for multi-device)
  expoPushTokens: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model('User', UserSchema);
