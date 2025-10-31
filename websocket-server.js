require("dotenv").config(); // Add this line
const http = require('http');
const { initWebSocket } = require("./lib/websocket");

const server = http.createServer();
initWebSocket(server);

const PORT = process.env.WEBSOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor WebSocket rodando em http://localhost:${PORT}`);
});