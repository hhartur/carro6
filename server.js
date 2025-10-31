// -----------------------------
// 🌐 Dependências e Configuração
// -----------------------------
const express = require("express");
const path = require("path");
const cors = require("cors");
const http = require("http");
require("dotenv").config();
require("./lib/db"); // Conexão com o banco

// -----------------------------
// 🚀 Inicialização do Express
// -----------------------------
const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// -----------------------------
// 🧩 Importação de Rotas
// -----------------------------
const authRoutes = require("./routes/auth");
const vehicleRoutes = require("./routes/vehicles");
const weatherRoutes = require("./routes/weather");
const userRoutes = require("./routes/user");
const friendRoutes = require("./routes/friends");
const messageRoutes = require("./routes/messages");
const notificationRoutes = require("./routes/notifications");

// -----------------------------
// 📦 Rotas da API
// -----------------------------
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api", vehicleRoutes);
app.use("/api", weatherRoutes);
app.use("/api", friendRoutes);
app.use("/api", messageRoutes);
app.use("/api/notifications", notificationRoutes);

// -----------------------------
// 📄 SPA (Frontend)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -----------------------------
// ⚠️ Middlewares de Erro
// -----------------------------
app.use((req, res) => {
  res.status(404).json({
    error: `A rota '${req.originalUrl}' não foi encontrada no servidor.`,
  });
});

app.use((err, req, res, next) => {
  console.error("ERRO INESPERADO:", err.stack);
  res.status(500).json({ error: "Ocorreu um erro inesperado no servidor." });
});

// -----------------------------
// 🔥 Inicialização do Servidor + Socket.IO
// -----------------------------
const { initSocket } = require("./lib/socket"); // Arquivo de configuração do Socket.IO

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Inicializa o Socket.IO (compatível com Vercel)
initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
