// routes/verification.js
const express = require("express");
const router = express.Router();
const Verification = require("../models/Verification");
const auth = require("../middleware/auth");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID; // ✅ Store this in .env

const client = twilio(accountSid, authToken);

// Submit verification data
router.post("/submit", auth, async (req, res) => {
  const { name, phone, aadharCard, licenseId } = req.body;
  const userId = req.user.id;

  try {
    const existing = await Verification.findOne({ userId });
    if (existing) return res.status(400).json({ message: "Already submitted" });

    const verification = new Verification({
      userId,
      name,
      phone,
      aadharCard,
      licenseId,
    });
    await verification.save();

    // ✅ SMS content
    const smsBody = `Hello ${name}, your verification has been submitted successfully ✅. 
Status: Pending. We will notify you once it's reviewed.`;

    // ✅ Ensure phone number has +91 prefix
    let formattedPhone = phone.startsWith("+91") ? phone : `+91${phone.trim()}`;

    // ✅ Send SMS using Messaging Service SID
    await client.messages.create({
      body: smsBody,
      messagingServiceSid: messagingServiceSid,
      to: formattedPhone, // must include country code e.g. +91XXXXXXXXXX
    });

    res.json({ message: "Verification submitted. Status: pending" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get verification status
router.get("/status", auth, async (req, res) => {
  try {
    const verification = await Verification.findOne({ userId: req.user.id });
    if (!verification) {
      return res.json({ status: "not_submitted" });
    }

    const response = {
      status: verification.status,
      data: verification,
    };

    // Include approvedAt only if status is 'approved'
    if (verification.status === "approved") {
      response.approvedAt = verification.updatedAt; // or use verification.approvedAt if you store it separately
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin route: Approve user verification
router.post("/approve/:userId", async (req, res) => {
  try {
    const verification = await Verification.findOne({
      userId: req.params.userId,
    });
    if (!verification) return res.status(404).json({ message: "Not found" });

    verification.status = "approved";
    await verification.save();

    // ✅ Format phone number with +91
    let formattedPhone = verification.phone.startsWith("+91")
      ? verification.phone
      : `+91${verification.phone.trim()}`;

    // ✅ Send SMS notification
    const smsBody = `✅ Hi ${verification.name}, your verification has been approved successfully.`;
    await client.messages.create({
      body: smsBody,
      messagingServiceSid,
      to: formattedPhone,
    });

    res.json({ message: "Verification approved" });
  } catch (err) {
    res.status(500).json({ message: "Error approving", error: err.message });
  }
});

module.exports = router;
