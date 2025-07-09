const mongoose = require('../lib/db');

const VehicleSchema = new mongoose.Schema({
  identificador: { type: String, required: true, unique: true },
  valorFipeEstimado: Number,
  recallPendente: Boolean,
  ultimaRevisaoRecomendadaKm: Number,
  dicaManutencao: String
}, { timestamps: true });

const Vehicle = mongoose.model('Vehicle', VehicleSchema);

module.exports = Vehicle;
