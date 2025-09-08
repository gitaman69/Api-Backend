const mongoose = require("mongoose");

const KycSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
    },
    motherName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },
    address: {
      type: String,
      required: true,
    },
    pinCode: {
      type: String,
      required: true,
      match: [/^[0-9]{6}$/, "Pincode must be 6 digits"],
    },
    kycID: {
      type: String, // Cloudinary URL
      required: true,
    },
    addressProof: {
      type: String, // Cloudinary URL
      required: true,
    },
    sitePhoto: {
      type: String, // Cloudinary URL
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Kyc", KycSchema);
