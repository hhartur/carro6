const express = require("express");
const router = express.Router();
const { getWeather } = require('../services/weatherService');

// Rota da API de clima via POST
router.post("/weather", async (req, res) => {
  const { city } = req.body;
  if (!city) {
    return res.status(400).json({ error: "O nome da cidade é obrigatório." });
  }
  try {
    const weatherData = await getWeather(city);
    return res.json(weatherData);
  } catch (error) {
    console.error("Erro na rota /api/weather:", error.message);
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Rota da API de clima via GET (para ser montada na raiz do servidor)
router.get("/weather/:city", async (req, res) => {
  const { city } = req.params;
  try {
    const weatherData = await getWeather(city);
    return res.json(weatherData);
  } catch (error) {
    console.error(`Erro na rota /weather/${city}:`, error.message);
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
});

module.exports = router;