const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const Notification = require("../models/Notification");

const clients = new Map(); // Armazena clientes por ID de usuário

function initWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    let userId = null; // O ID do usuário será definido após a autenticação

    ws.on("message", async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'AUTH' && data.token) {
                jwt.verify(data.token, process.env.JWT_SECRET, (err, decoded) => {
                    if (err) {
                        console.error("Falha na autenticação do WebSocket:", err.message);
                        ws.close();
                        return;
                    }
                    userId = decoded.id;
                    clients.set(userId, ws);
                    console.log(`Cliente WebSocket autenticado e conectado: ${userId}`);

                });
            } else if (data.type === 'CHAT_MESSAGE' && userId) {
                const { recipientId, content } = data.payload;
                const message = new Message({
                    sender: userId,
                    recipient: recipientId,
                    content: content,
                });
                await message.save();

                // Salvar notificação no banco para mensagens não lidas
                const notification = new Notification({
                  user: recipientId,
                  message: `Nova mensagem de usuário`,
                  type: 'CHAT_MESSAGE',
                  data: {
                    senderId: userId,
                    messageId: message._id
                  }
                });
                await notification.save();

                const recipientSocket = clients.get(recipientId);
                if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
                    recipientSocket.send(JSON.stringify({ type: 'CHAT_MESSAGE', payload: message }));
                }
            } else {
                 console.log(`Mensagem recebida de ${userId || 'não autenticado'}: ${message}`);
            }
        } catch (e) {
            console.error("Erro ao processar mensagem WebSocket:", e);
        }
    });

    ws.on("close", () => {
      if (userId) {
        clients.delete(userId);
        console.log(`Cliente WebSocket desconectado: ${userId}`);
      }
    });

    ws.on("error", (error) => {
        console.error(`Erro no WebSocket para ${userId || 'desconhecido'}:`, error);
    });
  });

  console.log("Servidor WebSocket inicializado.");
}

function sendNotification(userId, notification) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(notification));
  }
}

module.exports = { initWebSocket, sendNotification };
