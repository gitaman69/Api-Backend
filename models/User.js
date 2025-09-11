const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  otp: String,
  otpExpiresAt: Date,
  expoPushTokens: [String],
  fcmTokens: [String],
});

module.exports = mongoose.model("User", UserSchema);
