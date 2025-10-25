
const express = require('express');
const http = require('http');
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const Message = require("./models/Message");
const Notification = require("./models/Notification");
require("dotenv").config();
require("./lib/db");

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map(); // Armazena clientes por ID de usuário

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
                    ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', message: 'Autenticado com sucesso.' }));
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

function sendNotification(userId, notification) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(notification));
  }
}

// Endpoint para o servidor principal enviar notificações
app.post('/send-notification', (req, res) => {
    const { userId, notification } = req.body;
    if (!userId || !notification) {
        return res.status(400).json({ error: 'userId e notification são obrigatórios.' });
    }
    sendNotification(userId, notification);
    res.status(200).json({ message: 'Notificação enviada.' });
});


const PORT = process.env.WEBSOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor WebSocket rodando em http://localhost:${PORT}`);
});
