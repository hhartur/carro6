const express = require("express");
const path = require("path");
const cors = require('cors');
require("dotenv").config();
require("./lib/db");

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const weatherRoutes = require('./routes/weather');
const userRoutes = require('./routes/user'); // Novo roteiro

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes); // Rota para o perfil do usuário
app.use('/api', vehicleRoutes);
app.use('/api', weatherRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res, next) => {
  res.status(404).json({ error: `A rota '${req.originalUrl}' não foi encontrada no servidor.` });
});

app.use((err, req, res, next) => {
  console.error("ERRO INESPERADO:", err.stack);
  res.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});