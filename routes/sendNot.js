const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Route to save Expo push token from frontend
router.post('/save-push-token', async (req, res) => {
  try {
    const { email, expoPushToken } = req.body;

    if (!email || !expoPushToken) {
      return res.status(400).json({ message: 'Email and token are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Save token if it doesn't already exist
    if (!user.expoPushTokens.includes(expoPushToken)) {
      user.expoPushTokens.push(expoPushToken);
      await user.save();
    }

    res.json({
      message: 'Token saved successfully',
      tokens: user.expoPushTokens,
    });
  } catch (err) {
    console.error('Error saving push token:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
