// ARQUIVO COMPLETO: /server.js

const express = require("express");
const path = require("path");
require("dotenv").config();
require("./lib/db"); // Importa e conecta ao MongoDB

const app = express();

// Middleware para servir os arquivos estáticos do frontend da pasta 'public'
app.use(express.static(path.join(__dirname, "public")));
// Middleware para parsear o corpo das requisições como JSON
app.use(express.json());

// Importa as rotas
const vehicleRoutes = require('./routes/vehicles');
const weatherRoutes = require('./routes/weather');

// Usa as rotas com o prefixo /api
app.use('/api', vehicleRoutes);
app.use('/api', weatherRoutes); // As rotas de clima também ficarão sob /api

// Rota de fallback: se nenhuma rota da API corresponder, serve o index.html
// Isso é útil para aplicações de página única (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware para tratamento de rotas não encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({ error: `A rota '${req.originalUrl}' não foi encontrada no servidor.` });
});

// Middleware para tratamento de erros inesperados (500)
app.use((err, req, res, next) => {
  console.error("ERRO INESPERADO:", err.stack);
  res.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});