const express = require('express');
const router = express.Router();

// Replace this with your actual latest app version
const LATEST_VERSION = "1.5.0";

// GET /api/get-latest-version
router.get('/get-latest-version', (req, res) => {
  res.json({ version: LATEST_VERSION });
});

module.exports = router;
