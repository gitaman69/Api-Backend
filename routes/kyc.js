// routes/kyc.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload"); // multer memory storage
const uploadBufferToCloudinary = require("../utils/uploadToCloudinary");
const Kyc = require("../models/Kyc"); // mongoose model
const auth = require("../middleware/auth"); // your JWT auth middleware
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // Or SMTP config if you use another provider
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // app password (not normal pwd!)
  },
});

// ✅ Protected route: only logged-in users can submit KYC
router.post(
  "/kyc/submit",
  auth, // <-- enforce authentication
  upload.fields([
    { name: "kycID", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
    { name: "sitePhoto", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        fatherName,
        motherName,
        email,
        phoneNumber,
        address,
        pinCode,
      } = req.body;

      // Basic required-field validation
      if (!firstName || !lastName || !email || !phoneNumber) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      const files = req.files || {};
      if (!files.kycID || !files.addressProof || !files.sitePhoto) {
        return res.status(400).json({
          success: false,
          message: "kycID, addressProof and sitePhoto are required files",
        });
      }

      // Upload all three files in parallel
      const [kycRes, addressRes, siteRes] = await Promise.all([
        uploadBufferToCloudinary(files.kycID[0].buffer, "kyc_docs"),
        uploadBufferToCloudinary(files.addressProof[0].buffer, "kyc_docs"),
        uploadBufferToCloudinary(files.sitePhoto[0].buffer, "kyc_docs"),
      ]);

      // Save to DB with userId from token
      const newKyc = await Kyc.create({
        user: req.user.id, // <-- link KYC to logged-in user
        firstName,
        lastName,
        fatherName,
        motherName,
        email: email.toLowerCase(),
        phoneNumber,
        address,
        pinCode,
        kycID: kycRes.secure_url,
        addressProof: addressRes.secure_url,
        sitePhoto: siteRes.secure_url,
      });

      // ✅ Send confirmation email
      const mailOptions = {
        from: `"EV Charging KYC" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "✅ Your KYC has been submitted",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
          <h2 style="color: #2d89ef; text-align: center;">KYC Submission Successful 🚀</h2>
          <p style="font-size: 16px; color: #333;">Hi <b>${firstName} ${lastName}</b>,</p>
          <p style="font-size: 15px; color: #555;">
            Your KYC documents have been successfully submitted. Our team will review your details shortly.
          </p>
          <div style="margin: 20px 0; padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 8px;">
            <p><b>📧 Email:</b> ${email}</p>
            <p><b>📱 Phone:</b> ${phoneNumber}</p>
            <p><b>📍 Address:</b> ${address}, ${pinCode}</p>
          </div>
          <p style="font-size: 15px; color: #555;">
            ⏳ Please wait while we verify your documents. You will receive another update once your KYC is approved or requires changes.
          </p>
          <p style="text-align: center; margin-top: 20px;">
            <a href="#" style="display: inline-block; padding: 10px 20px; background: #2d89ef; color: white; text-decoration: none; border-radius: 5px;">
              View Status
            </a>
          </p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">
            This is an automated email. Please do not reply.
          </p>
        </div>
        `,
      };

      await transporter.sendMail(mailOptions);

      return res.status(201).json({ success: true, data: newKyc });
    } catch (err) {
      console.error("KYC upload error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ✅ Get KYC status by user email
router.get("/kyc/status", auth, async (req, res) => {
  try {
    // Extract email from the logged-in user's token
    const userEmail = req.user.email; // assuming your auth middleware sets req.user

    if (!userEmail) {
      return res.status(400).json({ success: false, message: "User email not found" });
    }

    // Find the latest KYC for this user
    const kyc = await Kyc.findOne({ email: userEmail }).sort({ createdAt: -1 });

    if (!kyc) {
      // If no KYC found, return status as not_submitted
      return res.status(200).json({
        success: true,
        data: {
          status: "not_submitted",
          kycID: null,
          addressProof: null,
          sitePhoto: null,
          submittedAt: null,
          updatedAt: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        status: kyc.status,
        kycID: kyc.kycID,
        addressProof: kyc.addressProof,
        sitePhoto: kyc.sitePhoto,
        submittedAt: kyc.createdAt,
        updatedAt: kyc.updatedAt,
      },
    });
  } catch (err) {
    console.error("KYC status fetch error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});



// ✅ Verify / Reject KYC (protected by special password)
router.patch("/kyc/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Extract password from Authorization header
    const authHeader = req.headers["authorization"];
    const providedSecret = authHeader?.split(" ")[1]; // Expect: "Bearer <password>"

    if (!providedSecret) {
      return res.status(401).json({ success: false, message: "No authorization provided" });
    }

    if (providedSecret !== process.env.KYC_ADMIN_SECRET) {
      return res.status(403).json({ success: false, message: "Invalid authorization token" });
    }

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const updatedKyc = await Kyc.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedKyc) {
      return res.status(404).json({ success: false, message: "KYC not found" });
    }

    // ✅ Send status update email
    const mailOptions = {
      from: `"EV Charging KYC" <${process.env.EMAIL_USER}>`,
      to: updatedKyc.email,
      subject: `🔔 Your KYC status has been updated to: ${status.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
          <h2 style="color: #2d89ef; text-align: center;">KYC Status Update</h2>
          <p style="font-size: 16px; color: #333;">Hello <b>${updatedKyc.firstName} ${updatedKyc.lastName}</b>,</p>
          <p style="font-size: 15px; color: #555;">
            Your KYC application has been reviewed and the status is now:
          </p>
          <p style="text-align: center; font-size: 18px; font-weight: bold; color: ${status === "verified" ? "green" : "red"};">
            ${status.toUpperCase()}
          </p>
          ${
            status === "verified"
              ? `<p style="font-size: 15px; color: #555;">✅ Congratulations! Your KYC has been successfully verified. You can now access all features of our platform.</p>`
              : `<p style="font-size: 15px; color: #555;">❌ Unfortunately, your KYC has been rejected. Please re-submit your documents correctly.</p>`
          }
          <p style="margin-top: 20px; font-size: 14px; color: #888; text-align: center;">
            This is an automated message. Please do not reply.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, data: updatedKyc });
  } catch (err) {
    console.error("KYC status update error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
