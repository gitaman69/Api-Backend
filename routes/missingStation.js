const express = require("express");
const router = express.Router();

const MissingStation = require("../models/MissingStationRequest");
const User = require("../models/User");
const auth = require("../middleware/auth"); // JWT middleware

/**
 * 🔔 Helper: Send push notification internally
 */
const sendPush = async ({ userId, title, body, data }) => {
  await fetch(`${process.env.BACKEND_URL}/api/send-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, title, body, data }),
  });
};


// POST /stations/report-missing
router.post("/stations/report-missing", auth, async (req, res) => {
  try {
    const { mapsLink, description } = req.body;

    if (!mapsLink) {
      return res
        .status(400)
        .json({ success: false, message: "Google Maps link is required" });
    }

    const request = await MissingStation.create({
      user: req.user.id,
      mapsLink,
      description,
    });

    // 🔔 Notify user
    await sendPush({
      userId: req.user.id,
      title: "Station Request Submitted ✅",
      body: "Thanks! Your station submission is under review.",
      data: { type: "station_request", status: "pending" },
    });

    return res.status(201).json({ success: true, data: request });
  } catch (err) {
    console.error("Missing station submit error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /stations/missing/all
router.get("/stations/missing/all", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const providedSecret = authHeader?.split(" ")[1];

    if (providedSecret !== process.env.KYC_ADMIN_SECRET) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized" });
    }

    const requests = await MissingStation.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    console.error("Fetch missing stations error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /stations/missing/:id/status
router.patch("/stations/missing/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const authHeader = req.headers["authorization"];
    const providedSecret = authHeader?.split(" ")[1];

    if (providedSecret !== process.env.KYC_ADMIN_SECRET) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized" });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const request = await MissingStation.findByIdAndUpdate(
      id,
      { status, adminNote, updatedAt: new Date() },
      { new: true }
    );

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }

    // 🔔 Push notification
    await sendPush({
      userId: request.user,
      title:
        status === "accepted"
          ? "Station Request Approved 🎉"
          : "Station Request Rejected ❌",
      body:
        status === "accepted"
          ? "Great news! Your submitted station will be added soon."
          : "Thanks for helping! This location couldn’t be verified.",
      data: {
        type: "station_request",
        status,
      },
    });

    return res.status(200).json({ success: true, data: request });
  } catch (err) {
    console.error("Update missing station status error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;