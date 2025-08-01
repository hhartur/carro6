// ARQUIVO COMPLETO E CORRETO: /routes/vehicles.js

const express = require("express");
const router = express.Router();
// Esta linha agora irá importar o Modelo Mongoose corretamente
const Vehicle = require("../models/Vehicle");

// --- READ: Obter todos os veículos ---
router.get("/vehicles", async (req, res) => {
  try {
    // Este filtro impede que dados antigos/inválidos sem '_type' quebrem o frontend
    const vehicles = await Vehicle.find({ 
      _type: { $in: ['Car', 'SportsCar', 'Truck'] } 
    }).sort({ make: 1, model: 1 });
    
    res.json(vehicles);
  } catch (err) {
    console.error("Erro ao buscar veículos:", err);
    res.status(500).json({ error: "Erro interno do servidor ao buscar veículos." });
  }
});

// --- CREATE: Adicionar um novo veículo ---
router.post("/vehicles", async (req, res) => {
  try {
    const newVehicle = new Vehicle(req.body);
    const savedVehicle = await newVehicle.save();
    res.status(201).json(savedVehicle);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: `Veículo com ID '${req.body.id}' já existe.` });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: "Dados do veículo inválidos.", details: err.message });
    }
    console.error("Erro ao criar veículo:", err);
    res.status(500).json({ error: "Erro interno do servidor ao criar veículo." });
  }
});

// --- UPDATE: Atualizar um veículo existente pelo seu ID ---
router.put("/vehicles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedVehicle = await Vehicle.findOneAndUpdate({ id: id }, req.body, { new: true, runValidators: true });
    
    if (!updatedVehicle) {
      return res.status(404).json({ error: "Veículo não encontrado para atualização." });
    }
    res.json(updatedVehicle);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: "Dados de atualização inválidos.", details: err.message });
    }
    console.error("Erro ao atualizar veículo:", err);
    res.status(500).json({ error: "Erro interno do servidor ao atualizar veículo." });
  }
});

// --- DELETE: Remover um veículo pelo seu ID ---
router.delete("/vehicles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedVehicle = await Vehicle.findOneAndDelete({ id: id });

    if (!deletedVehicle) {
      return res.status(404).json({ error: "Veículo não encontrado para exclusão." });
    }
    res.status(200).json({ message: "Veículo deletado com sucesso.", deletedVehicleId: id });
  } catch (err) {
    console.error("Erro ao deletar veículo:", err);
    res.status(500).json({ error: "Erro interno do servidor ao deletar veículo." });
  }
});

// --- UPDATE: Adicionar um registro de manutenção a um veículo específico ---
router.post("/vehicles/:id/maintenance", async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.id });
        if (!vehicle) {
            return res.status(404).json({ error: "Veículo não encontrado para adicionar manutenção." });
        }
        vehicle.maintenanceHistory.push(req.body);
        vehicle.maintenanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const updatedVehicle = await vehicle.save();
        res.status(201).json(updatedVehicle);
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: "Dados de manutenção inválidos.", details: err.message });
        }
        console.error("Erro ao adicionar manutenção:", err);
        res.status(500).json({ error: "Erro interno do servidor ao adicionar manutenção." });
    }
});

module.exports = router;