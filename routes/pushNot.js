const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/save-push-token', async (req, res) => {
  try {
    const { email, expoPushToken } = req.body;
    if (!email || !expoPushToken) {
      return res.status(400).json({ message: 'Email and token required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.expoPushTokens.includes(expoPushToken)) {
      user.expoPushTokens.push(expoPushToken);
      await user.save();
    }

    res.json({ message: 'Token saved successfully', tokens: user.expoPushTokens });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
