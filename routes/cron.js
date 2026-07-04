const express = require("express");
const router = express.Router();
const sendNotificationsJob = require("../jobs/sendNotificationsJob");

// Shared-secret guard for external schedulers (mirrors checkAdmin in routes/notifications.js)
const checkCronSecret = (req, res, next) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(403).json({ message: "Unauthorized: Invalid cron secret" });
  }
  next();
};

router.post("/send-notifications", checkCronSecret, async (req, res) => {
  try {
    const result = await sendNotificationsJob.run();
    res.json({ message: "Notifications sent", ...result });
  } catch (err) {
    console.error("Error running send-notifications cron:", err);
    res.status(500).json({ message: "Failed to send notifications", error: err.message });
  }
});

module.exports = router;
