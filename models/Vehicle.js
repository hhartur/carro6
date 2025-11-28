const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid'); // Import uuid

const MaintenanceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, required: true, trim: true },
    cost: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const VehicleSchema = new mongoose.Schema(
  {
    id: { type: String, default: uuidv4, unique: true, index: true }, // Use default: uuidv4
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    _type: {
      type: String,
      required: true,
      enum: ["Car", "SportsCar", "Truck"],
    },
    status: { type: String, default: "off", enum: ["off", "on", "moving"] },
    speed: { type: Number, default: 0, min: 0 },
    turboOn: {
      type: Boolean,
      default: undefined,
      required: function () {
        return this._type === "SportsCar";
      },
    },
    maxLoad: {
      type: Number,
      default: undefined,
      required: function () {
        return this._type === "Truck";
      },
    },
    currentLoad: {
      type: Number,
      default: 0,
      required: function () {
        return this._type === "Truck";
      },
    },
    maintenanceHistory: [MaintenanceSchema],
    valorFipeEstimado: { type: Number, min: 0 },
    recallPendente: Boolean,
    ultimaRevisaoRecomendadaKm: { type: Number, min: 0 },
    dicaManutencao: { type: String, trim: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    isPublic: { type: Boolean, default: false },
    imageUrl: { type: String },
    imageId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", VehicleSchema);