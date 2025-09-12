const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const { protect } = require('../middleware/auth');
const { checkRequestDelay } = require('../lib/Security');
const { validateString } = require('../lib/utils')
const crypto = require('crypto'); 

// Busca todos os veículos do usuário logado
router.get("/vehicles", protect, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id }).sort({ make: 1, model: 1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Busca todos os veículos públicos
router.get("/public-vehicles", async (req, res) => {
  try {
    const publicVehicles = await Vehicle.find({ isPublic: true }).sort({ createdAt: -1 }).populate('owner', 'username');
    res.json(publicVehicles);
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Adiciona um novo veículo
router.post("/vehicles", protect, checkRequestDelay(1500), async (req, res) => {
  try {
    validateString(req.body.make, 'Make', 100);
    validateString(req.body.model, 'Model', 100);
    const vehicleData = { ...req.body, owner: req.user._id };
    const newVehicle = new Vehicle(vehicleData);
    const savedVehicle = await newVehicle.save();
    res.status(201).json(savedVehicle);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro interno do servidor." });
  }
});

// Atualiza os dados principais de um veículo
router.put("/vehicles/:id", protect, async (req, res) => {
  try {
    validateString(req.body.make, 'Make', 100);
    validateString(req.body.model, 'Model', 100);

    const vehicle = await Vehicle.findOne({ id: req.params.id, owner: req.user._id });
    if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

    // Impede a atualização de campos sensíveis
    delete req.body.owner;
    delete req.body.maintenanceHistory; 

    const updatedVehicle = await Vehicle.findByIdAndUpdate(vehicle._id, req.body, { new: true, runValidators: true });
    res.json(updatedVehicle);
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Alterna a privacidade de um veículo
router.put("/vehicles/:id/privacy", protect, async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.id, owner: req.user._id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

        vehicle.isPublic = !!req.body.isPublic;
        await vehicle.save();
        res.json({ id: vehicle.id, isPublic: vehicle.isPublic });
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

router.get("/vehicles/:id/privacy", async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

        res.json({ id: vehicle.id, isPublic: vehicle.isPublic });
    } catch (err) { 
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Deleta um veículo
router.delete("/vehicles/:id", protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ id: req.params.id, owner: req.user._id });
    if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

    await Vehicle.findByIdAndDelete(vehicle._id);
    res.status(200).json({ message: "Veículo deletado com sucesso." });
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// --- ROTAS CRUD PARA MANUTENÇÃO (SUB-RECURSO) ---

// Busca todos os registros de manutenção de um veículo
router.get("/vehicles/:vehicleId/maintenance", protect, async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.vehicleId, owner: req.user._id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });
        res.json(vehicle.maintenanceHistory);
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

router.post("/vehicles/:vehicleId/maintenance", protect, async (req, res) => {
  try {
    const { description, type, cost, date } = req.body;

    // Validações
    validateString(description, 'Description', 100);
    validateString(type, 'Type', 100);

    if (cost !== undefined) {
      if (typeof cost !== 'number' || cost < 0) throw new Error('Cost deve ser um número positivo.');
      if (cost > 1_000_000_000) throw new Error('Cost não pode ultrapassar 1 bilhão.');
    }

    if (date && isNaN(Date.parse(date))) throw new Error('Date inválida.');

    const vehicle = await Vehicle.findOne({ id: req.params.vehicleId, owner: req.user._id });
    if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

    // Gera um id único para o registro de manutenção
    const maintenanceItem = {
      id: crypto.randomUUID(),
      description,
      type,
      cost,
      date,
    };

    vehicle.maintenanceHistory.push(maintenanceItem);
    vehicle.maintenanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    const updatedVehicle = await vehicle.save();
    res.status(201).json(updatedVehicle);
  } catch (err) {
    if (err.message.startsWith('Description') || err.message.startsWith('Type') || err.message.startsWith('Cost') || err.message.startsWith('Date')) {
      return res.status(400).json({ error: err.message });
    }
    console.log(err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Atualiza um registro de manutenção específico
router.put("/vehicles/:vehicleId/maintenance/:maintId", protect, async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.vehicleId, owner: req.user._id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

        const maintenance = vehicle.maintenanceHistory.find(m => m.id === req.params.maintId);
        if (!maintenance) return res.status(404).json({ error: "Registro de manutenção não encontrado." });

        // Atualiza os campos
        maintenance.date = req.body.date || maintenance.date;
        maintenance.type = req.body.type || maintenance.type;
        maintenance.cost = req.body.cost !== undefined ? req.body.cost : maintenance.cost;
        maintenance.description = req.body.description !== undefined ? req.body.description : maintenance.description;

        vehicle.maintenanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        await vehicle.save();
        res.json(maintenance);
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Deleta um registro de manutenção específico
router.delete("/vehicles/:vehicleId/maintenance/:maintId", protect, async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.vehicleId, owner: req.user._id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });
        
        const initialCount = vehicle.maintenanceHistory.length;
        vehicle.maintenanceHistory = vehicle.maintenanceHistory.filter(m => m.id !== req.params.maintId);
        
        if (vehicle.maintenanceHistory.length === initialCount) {
            return res.status(404).json({ error: "Registro de manutenção não encontrado." });
        }

        await vehicle.save();
        res.status(200).json({ message: "Registro de manutenção deletado com sucesso." });
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});


module.exports = router;
