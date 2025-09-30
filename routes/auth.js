const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const Verification = require("../models/Verification");
const nodemailer = require("nodemailer");
const router = express.Router();

// Create a mail transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Step 1: Request OTP
router.post("/request-otp", async (req, res) => {
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

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your ElectricQ OTP Code",
    html: `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px; text-align: center;">
      <div style="max-width: 500px; margin: auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <h1 style="color: #16a34a; font-size: 28px; margin-bottom: 10px;">ElectricQ</h1>
        <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">
          India's <strong>#1 EV Charging Network</strong> with the highest station density per km. Discover, navigate, and charge seamlessly across the nation.
        </p>
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Your One-Time Password (OTP) is:</p>
        <div style="font-size: 32px; font-weight: bold; color: #16a34a; margin-bottom: 30px; letter-spacing: 4px; border: 2px dashed #16a34a; display: inline-block; padding: 10px 20px; border-radius: 8px;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
          This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.
        </p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <div style="text-align: left;">
          <h3 style="color: #3b82f6; font-size: 18px; margin-bottom: 10px;">Why ElectricQ?</h3>
          <ul style="padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
            <li><strong>EV Stations:</strong> Find nearby charging stations with real-time availability.</li>
            <li><strong>Fast Charging:</strong> Locate high-speed chargers for quick energy top-ups.</li>
            <li><strong>Eco-Friendly:</strong> Contribute to a sustainable future with green energy.</li>
            <li><strong>Easy to Use:</strong> Intuitive interface designed for seamless experience.</li>
          </ul>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} ElectricQ. All rights reserved.</p>
      </div>
    </div>
  `,
  });

  res.json({ message: "OTP sent to email" });
});

// Step 2: Verify OTP and Login
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user || user.otp !== otp || new Date() > user.otpExpiresAt) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // Clear OTP after successful verification
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  const token = jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  console.log(`✅ User logged in: ${user.name} <${user.email}>`);

  res.json({ token, user });
});

// Optional: Check session
router.get("/check", auth, (req, res) => {
  res.json({ message: "Authenticated", user: req.user });
});

router.get("/verify-token", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  const verification = await Verification.findOne({ userId: user._id });

  res.json({
    user: {
      name: user.name,
      email: user.email,
      verificationStatus: verification?.status || "not_submitted",
    },
  });
});

module.exports = router;
