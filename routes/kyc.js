// routes/kyc.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload"); // multer memory storage
const uploadBufferToCloudinary = require("../utils/uploadToCloudinary");
const Kyc = require("../models/Kyc"); // mongoose model
const auth = require("../middleware/auth"); // your JWT auth middleware

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

    return res.status(200).json({ success: true, data: updatedKyc });
  } catch (err) {
    console.error("KYC status update error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
