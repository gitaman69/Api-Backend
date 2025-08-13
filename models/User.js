const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  otp: String,
  otpExpiresAt: Date,
});

module.exports = mongoose.model('User', UserSchema);
