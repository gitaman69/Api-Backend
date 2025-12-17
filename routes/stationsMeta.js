import express from "express";
import { STATIONS_BACKEND_VERSION } from "../config/stationVersion";

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

export default router;
