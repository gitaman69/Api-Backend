const templates = require("../config/notificationTemplates");
const { sendToAllUsers } = require("../utils/pushService");

// Picks a random template from the pool and pushes it to every user.
async function run() {
  const template = templates[Math.floor(Math.random() * templates.length)];
  const { usersTargeted, responses } = await sendToAllUsers(template.title, template.body);
  return { template, usersTargeted, responses };
}

module.exports = { run };
