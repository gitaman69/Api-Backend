const User = require("../models/User");
const admin = require("../firebase/admin");

// Sends a push notification (Expo + FCM) to every user in the DB.
async function sendToAllUsers(title, body, data = {}) {
  const users = await User.find({});
  const responses = [];

  for (const user of users) {
    if (user.expoPushTokens?.length) {
      const expoMessages = user.expoPushTokens.map((token) => ({
        to: token,
        sound: "default",
        title,
        body,
        data,
      }));

      const resExpo = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expoMessages),
      });
      const expoData = await resExpo.json();
      responses.push({ user: user.email, type: "expo", expoData });
    }

    if (user.fcmTokens?.length) {
      const fcmMessages = user.fcmTokens.map((token) => ({
        token,
        notification: { title, body },
        data,
      }));

      for (const msg of fcmMessages) {
        const fcmRes = await admin.messaging().send(msg);
        responses.push({ user: user.email, type: "fcm", fcmRes });
      }
    }
  }

  return { usersTargeted: users.length, responses };
}

module.exports = { sendToAllUsers };
