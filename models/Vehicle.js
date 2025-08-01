// ARQUIVO COMPLETO E CORRETO: /models/Vehicle.js (Backend Schema)

const mongoose = require('mongoose');

// Sub-schema para registros de manutenção, aninhado dentro de cada veículo.
const MaintenanceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, required: true, trim: true },
  cost: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true }
}, { _id: false });

// Schema principal e completo do Veículo.
const VehicleSchema = new mongoose.Schema({
  // --- Propriedades Principais ---
  id: { type: String, required: true, unique: true, index: true },
  make: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  year: { type: Number, required: true },
  _type: { type: String, required: true, enum: ['Car', 'SportsCar', 'Truck'] },
  
  // --- Estado do Veículo ---
  status: { type: String, default: 'off', enum: ['off', 'on', 'moving'] },
  speed: { type: Number, default: 0, min: 0 },
  
  // --- Propriedades Específicas de Subclasses ---
  turboOn: { 
    type: Boolean, 
    default: undefined,
    required: function() { return this._type === 'SportsCar'; } 
  },
  maxLoad: { 
    type: Number, 
    default: undefined,
    required: function() { return this._type === 'Truck'; } 
  },
  currentLoad: { 
    type: Number, 
    default: 0,
    required: function() { return this._type === 'Truck'; } 
  },
  
  // --- Histórico de Manutenção ---
  maintenanceHistory: [MaintenanceSchema],

  // --- "Dados Externos" integrados ---
  valorFipeEstimado: { type: Number, min: 0 },
  recallPendente: Boolean,
  ultimaRevisaoRecomendadaKm: { type: Number, min: 0 },
  dicaManutencao: { type: String, trim: true }

}, { 
  timestamps: true 
});

// A linha mais importante: exporta o Modelo do Mongoose, que possui os métodos .find(), .save(), etc.
module.exports = mongoose.model('Vehicle', VehicleSchema);