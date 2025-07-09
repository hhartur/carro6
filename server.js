const express = require("express");
const path = require("path");
require("dotenv").config();
require("./lib/db"); // Importa e conecta MongoDB

const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const vehicleRoutes = require('./routes/vehicles');
const weatherRoutes = require('./routes/weather');

app.use('/api', vehicleRoutes);
app.use('/api', weatherRoutes);
app.use('/', weatherRoutes);

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
