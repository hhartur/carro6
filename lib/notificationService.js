const axios = require('axios');

let serverUrl = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:3001';

// Ensure the URL starts with http:// or https://
if (serverUrl.startsWith('ws://')) {
  serverUrl = 'http://' + serverUrl.substring(5);
} else if (serverUrl.startsWith('wss://')) {
  serverUrl = 'https://' + serverUrl.substring(6);
}

const WEBSOCKET_SERVER_URL = serverUrl;

async function sendNotification(userId, notification) {
  try {
    await axios.post(`${WEBSOCKET_SERVER_URL}/send-notification`, {
      userId,
      notification,
    });
  } catch (error) {
    console.error('Error sending notification to WebSocket server:', error.message);
  }
}

module.exports = { sendNotification };
