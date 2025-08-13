// models/Verification.js
const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  aadharCard: { type: String, required: true },
  licenseId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Verification', verificationSchema);
