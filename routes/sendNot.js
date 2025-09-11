const express = require('express');
const router = express.Router();
const User = require('../models/User');

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
    to: token,
    sound: 'default',
    title,
    body,
    data: data || {},
  }));

  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100)); // Expo allows max 100 per request
  }

  for (const chunk of chunks) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
  }

  res.json({ message: 'Notification sent' });
});

module.exports = router;
