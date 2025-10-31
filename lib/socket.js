const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const Notification = require("../models/Notification");

const clients = new Map(); // Armazena sockets por ID de usuário
let ioInstance = null; // Guarda a instância do Socket.IO para uso externo

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // Ajuste para o domínio do seu frontend
      methods: ["GET", "POST"],
    },
    transports: ["polling", "websocket"], // Compatibilidade com Vercel
  });

  ioInstance = io; // Salva instância para uso fora

  io.on("connection", (socket) => {
    let userId = null;
    console.log("🧩 Novo cliente conectado (aguardando autenticação)");

    // 🔐 Autenticação com JWT
    socket.on("authenticate", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        clients.set(userId, socket);
        console.log(`✅ Cliente autenticado: ${userId}`);
        socket.emit("authenticated", { success: true });
      } catch (err) {
        console.error("❌ Falha na autenticação:", err.message);
        socket.emit("unauthorized");
        socket.disconnect();
      }
    });

    // 💬 Mensagens de chat
    socket.on("chat_message", async (data) => {
      if (!userId) return socket.emit("error", "Usuário não autenticado.");

      const { recipientId, content } = data;

      const message = new Message({
        sender: userId,
        recipient: recipientId,
        content,
      });
      await message.save();

      const notification = new Notification({
        user: recipientId,
        message: `Nova mensagem de usuário`,
        type: "CHAT_MESSAGE",
        data: { senderId: userId, messageId: message._id },
      });
      await notification.save();

      // Envia para o destinatário se estiver online
      sendNotification(recipientId, {
        type: "CHAT_MESSAGE",
        message: notification.message,
        data: notification.data,
      });

      // Envia a mensagem de chat em tempo real
      const recipientSocket = clients.get(recipientId);
      if (recipientSocket) {
        recipientSocket.emit("chat_message", message);
      }
    });

    // 🔔 Recebe pedido manual de notificação
    socket.on("send_notification", (data) => {
      const { userId: targetUserId, notification } = data;
      sendNotification(targetUserId, notification);
    });

    // 🚪 Desconexão
    socket.on("disconnect", () => {
      if (userId) {
        clients.delete(userId);
        console.log(`❌ Cliente desconectado: ${userId}`);
      }
    });
  });

  console.log("🚀 Socket.IO inicializado com sucesso!");
  return io;
}

/**
 * 🔔 Função global para enviar notificações a um usuário conectado
 * Pode ser chamada de qualquer lugar do servidor
 */
function sendNotification(userId, notification) {
  const client = clients.get(userId);
  if (client) {
    client.emit("notification", notification);
    console.log(`📨 Notificação enviada para ${userId}:`, notification);
  } else {
    console.log(`⚠️ Usuário ${userId} não está online.`);
  }
}

module.exports = { initSocket, sendNotification };
