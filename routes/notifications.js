const express = require("express");
const router = express.Router();
const User = require("../models/User");
const admin = require("../firebase/admin"); // FCM admin

// Save push token (Expo token or FCM token)
router.post("/save-push-token", async (req, res) => {
  try {
    const { email, expoPushToken, fcmToken } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Save Expo token
    if (expoPushToken && !user.expoPushTokens.includes(expoPushToken)) {
      user.expoPushTokens.push(expoPushToken);
    }

    // Save FCM token
    if (fcmToken && !user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
    }

    await user.save();

    res.json({
      message: "Token(s) saved successfully",
      expoTokens: user.expoPushTokens,
      fcmTokens: user.fcmTokens,
    });
  } catch (err) {
    console.error("Error saving push token:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Send notification (Expo or FCM)
router.post("/send-notification", async (req, res) => {
  const { userId, title, body, data } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ message: "User ID, title, and body are required" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const responses = [];

  try {
    // --- 1️⃣ Send Expo Notifications ---
    if (user.expoPushTokens.length) {
      const expoMessages = user.expoPushTokens.map((token) => ({
        to: token,
        sound: "default",
        title,
        body,
        data: data || {},
      }));

      const chunks = [];
      for (let i = 0; i < expoMessages.length; i += 100) {
        chunks.push(expoMessages.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        const resExpo = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chunk),
        });
        const data = await resExpo.json();
        responses.push({ type: "expo", data });
      }
    }

    // --- 2️⃣ Send FCM Notifications ---
    if (user.fcmTokens.length) {
      const fcmMessages = user.fcmTokens.map((token) => ({
        token,
        notification: { title, body },
        data: data || {},
      }));

      for (const msg of fcmMessages) {
        const response = await admin.messaging().send(msg);
        responses.push({ type: "fcm", response });
      }
    }

    res.json({ message: "Notifications sent", responses });
  } catch (err) {
    console.error("Error sending notifications:", err);
    res.status(500).json({ message: "Failed to send notifications", error: err.message });
  }
});

module.exports = router;
