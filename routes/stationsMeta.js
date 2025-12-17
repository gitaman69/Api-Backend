const express = require('express');
const { STATIONS_BACKEND_VERSION } = require('../config/stationVersion');

const router = express.Router();

/**
 * GET /api/stations-meta
 * Returns hardcoded station data version
 */
router.get("/stations-meta", (req, res) => {
  res.json({
    meta: {
      version: STATIONS_BACKEND_VERSION,
      updatedAt: new Date().toISOString(),
    },
  });
});

module.exports = router;
