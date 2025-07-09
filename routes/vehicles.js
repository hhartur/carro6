const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");

// GET - todos os veículos
router.get("/vehicles", async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar veículos." });
  }
});

// GET - veículo por identificador
router.get("/vehicles/:identifier", async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ identificador: req.params.identifier });
    if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado." });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar o veículo." });
  }
});

// PUT - cria ou atualiza veículo
router.put("/vehicles/:identifier", async (req, res) => {
  const identifier = req.params.identifier;
  const data = {
    identificador: identifier,
    valorFipeEstimado: req.body.valorFipeEstimado || 0,
    recallPendente: req.body.recallPendente === 'true' || req.body.recallPendente === true,
    ultimaRevisaoRecomendadaKm: req.body.ultimaRevisaoRecomendadaKm || 0,
    dicaManutencao: req.body.dicaManutencao || ""
  };

  try {
    const updated = await Vehicle.findOneAndUpdate(
      { identificador: identifier },
      data,
      { upsert: true, new: true, runValidators: true }
    );
    const created = updated.createdAt && updated.createdAt.getTime() === updated.updatedAt.getTime();
    res.status(created ? 201 : 200).json({
      message: created ? "Veículo criado com sucesso." : "Veículo atualizado com sucesso.",
      vehicle: updated
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar veículo.", details: err.message });
  }
});

// DELETE - remover veículo
router.delete("/vehicles/:identifier", async (req, res) => {
  try {
    const deleted = await Vehicle.findOneAndDelete({ identificador: req.params.identifier });
    if (!deleted) return res.status(404).json({ error: "Veículo não encontrado." });
    res.json({ message: "Veículo deletado com sucesso." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar veículo." });
  }
});

module.exports = router;
