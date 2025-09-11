const express = require('express');
const router = express.Router();
const User = require('../models/User');
const admin = require('../firebase/admin'); // import the initialized admin

router.post('/send-notification', async (req, res) => {
  const { userId, title, body, data } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ message: 'User ID, title, and body are required' });
  }

  const user = await User.findById(userId);
  if (!user || user.expoPushTokens.length === 0) {
    return res.status(404).json({ message: 'User or tokens not found' });
  }

  const messages = user.expoPushTokens.map((token) => ({
    token, // FCM token
    notification: {
      title,
      body,
    },
    data: data || {},
  }));

  try {
    const responses = [];
    for (const message of messages) {
      const response = await admin.messaging().send(message);
      responses.push(response);
    }
    res.json({ message: 'Notification sent', responses });
  } catch (err) {
    console.error('Error sending FCM notification:', err);
    res.status(500).json({ message: 'Failed to send notification', error: err.message });
  }
});

module.exports = router;
