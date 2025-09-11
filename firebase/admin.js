// firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("./electricq-d30b7-firebase-adminsdk-fbsvc-a48728e7cd.json");

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
