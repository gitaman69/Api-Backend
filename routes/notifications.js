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

// ✅ Send notification to ALL users
router.post("/send-to-all", async (req, res) => {
  const { title, body, data } = req.body;

  if (!title || !body) {
    return res.status(400).json({ message: "Title and body are required" });
  }

  try {
    const users = await User.find({});
    const responses = [];

    for (const user of users) {
      // --- Expo Notifications ---
      if (user.expoPushTokens?.length) {
        const expoMessages = user.expoPushTokens.map((token) => ({
          to: token,
          sound: "default",
          title,
          body,
          data: data || {},
        }));

        const resExpo = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(expoMessages),
        });
        const expoData = await resExpo.json();
        responses.push({ user: user.email, type: "expo", expoData });
      }

      // --- FCM Notifications ---
      if (user.fcmTokens?.length) {
        const fcmMessages = user.fcmTokens.map((token) => ({
          token,
          notification: { title, body },
          data: data || {},
        }));

        for (const msg of fcmMessages) {
          const fcmRes = await admin.messaging().send(msg);
          responses.push({ user: user.email, type: "fcm", fcmRes });
        }
      }
    }

    res.json({ message: "✅ Notifications sent to all users", responses });
  } catch (err) {
    console.error("Error sending to all:", err);
    res.status(500).json({ message: "❌ Failed to send to all", error: err.message });
  }
});

// ✅ Send specific notification to each user
// Request body format: { messages: [{ userId, title, body, data }, ...] }
router.post("/send-specific", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: "Messages array is required" });
  }

  const responses = [];

  try {
    for (const msg of messages) {
      const { userId, title, body, data } = msg;
      if (!userId || !title || !body) continue;

      const user = await User.findById(userId);
      if (!user) {
        responses.push({ userId, error: "User not found" });
        continue;
      }

      // Expo
      if (user.expoPushTokens?.length) {
        const expoMessages = user.expoPushTokens.map((token) => ({
          to: token,
          sound: "default",
          title,
          body,
          data: data || {},
        }));

        const resExpo = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(expoMessages),
        });
        const expoData = await resExpo.json();
        responses.push({ user: user.email, type: "expo", expoData });
      }

      // FCM
      if (user.fcmTokens?.length) {
        const fcmMessages = user.fcmTokens.map((token) => ({
          token,
          notification: { title, body },
          data: data || {},
        }));

        for (const fmsg of fcmMessages) {
          const fcmRes = await admin.messaging().send(fmsg);
          responses.push({ user: user.email, type: "fcm", fcmRes });
        }
      }
    }

    res.json({ message: "✅ Specific notifications sent", responses });
  } catch (err) {
    console.error("Error sending specific:", err);
    res.status(500).json({ message: "❌ Failed to send specific", error: err.message });
  }
});

// 🔐 Middleware to check admin secret
const checkAdmin = (req, res, next) => {
  const adminSecret = process.env.KYC_ADMIN_SECRET;
  const authHeader = req.headers.authorization;

  if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
    return res.status(403).json({ message: "Unauthorized: Invalid admin token" });
  }
  next();
};

// 📌 Get all users
router.get("/users", checkAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "name email pushToken"); 
    // fetch only necessary fields
    res.json({ users });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

module.exports = router;
