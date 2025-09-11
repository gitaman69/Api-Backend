const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Route to save FCM token from frontend
router.post('/save-push-token', async (req, res) => {
  try {
    const { email, fcmToken } = req.body;

    if (!email || !fcmToken) {
      return res.status(400).json({ message: 'Email and FCM token are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Save token if it doesn't already exist
    if (!user.fcmTokens) user.fcmTokens = []; // initialize array if not present
    if (!user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      await user.save();
    }

    res.json({
      message: 'FCM token saved successfully',
      tokens: user.fcmTokens,
    });
  } catch (err) {
    console.error('Error saving FCM token:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
