const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Verification = require('../models/Verification');
const nodemailer = require('nodemailer');
const router = express.Router();

// Create a mail transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Step 1: Request OTP
router.post('/request-otp', async (req, res) => {
  const { email, name } = req.body;

  // ✅ Special case: test user
  if (email === process.env.TEST_USER) {
    let testUser = await User.findOne({ email });
    if (!testUser) {
      testUser = new User({ email, name: "Test User" });
    }
    testUser.otp = "123456"; // Fixed OTP
    testUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await testUser.save();

    return res.json({ message: "Test OTP set. Use 123456 to login." });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ email, name });
  }
  user.otp = otp;
  user.otpExpiresAt = expiresAt;
  await user.save();

  // Send OTP to user's email
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your EV App OTP Code',
    text: `Your OTP is: ${otp}`,
  });

  res.json({ message: 'OTP sent to email' });
});

// Step 2: Verify OTP and Login
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user || user.otp !== otp || new Date() > user.otpExpiresAt) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  // Clear OTP after successful verification
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  const token = jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  console.log(`✅ User logged in: ${user.name} <${user.email}>`);

  res.json({ token, user });
});


// Optional: Check session
router.get('/check', auth, (req, res) => {
  res.json({ message: 'Authenticated', user: req.user });
});

router.get('/verify-token', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  const verification = await Verification.findOne({ userId: user._id });

  res.json({
    user: {
      name: user.name,
      email: user.email,
      verificationStatus: verification?.status || 'not_submitted',
    }
  });
});


module.exports = router;
