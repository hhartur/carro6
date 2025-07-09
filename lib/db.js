const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGODB_URL;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('connected', () => {
  console.log('✅ MongoDB conectado com sucesso.');
});

db.on('error', (err) => {
  console.error('❌ Erro ao conectar no MongoDB:', err);
});

module.exports = mongoose;
