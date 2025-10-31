// ARQUIVO COMPLETO E CORRETO: /lib/db.js

const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGODB_URL;

if (!mongoURI) {
    console.error('❌ ERRO CRÍTICO: A variável de ambiente MONGODB_URL não está definida.');
    process.exit(1);
}

// Conecta sem as opções antigas. Mongoose v6+ lida com isso por padrão.
mongoose.connect(mongoURI);

const db = mongoose.connection;

db.on('connected', () => {
  console.log('✅ MongoDB conectado com sucesso.');
});

db.on('error', (err) => {
  console.error('❌ Erro ao conectar no MongoDB:', err);
});

module.exports = mongoose;