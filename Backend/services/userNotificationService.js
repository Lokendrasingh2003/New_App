const Notification = require('../models/Notification');

async function sendUserNotification({ userId, type, title, message, deepLink = null, meta = null }) {
  await Notification.create({
    userId,
    type,
    title,
    message,
    deepLink,
    meta,
  });
}

async function sendBroadcastNotification({ type, title, message, deepLink = null, meta = null }) {
  // userId: null means broadcast
  await Notification.create({
    userId: null,
    type,
    title,
    message,
    deepLink,
    meta,
  });
}

module.exports = {
  sendUserNotification,
  sendBroadcastNotification,
};
