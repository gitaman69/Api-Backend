require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const verificationRoutes = require('./routes/verification');
const kycRoutes = require('./routes/kyc');
const feedbackRoutes = require('./routes/feedback');
const notificationRoutes = require('./routes/notifications');

const app = express();

app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // ✅ Needed to parse JSON bodies from POST requests

app.use('/auth', authRoutes);
app.use('/user', verificationRoutes);
app.use('/api/v1', kycRoutes); // KYC routes
app.use("/api/feedback", feedbackRoutes);
app.use("/api", notificationRoutes);

app.get("/", (req, res) => {
  res.send("EV Charging App Auth Server is Running 🚀");
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 8001, () =>
      console.log(`Server running at http://0.0.0.0:${process.env.PORT || 8001}`)
    );
  })
  .catch(err => console.error("MongoDB connection error:", err));
