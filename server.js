const express = require("express");
const path = require("path");
const axios = require("axios"); // 1. Usar axios para requisições mais simples

require("dotenv").config();

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

async function getWeather(city) {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    const error = new Error("API key não definida.");
    error.statusCode = 401; 
    throw error;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    city
  )}&appid=${apiKey}&units=metric&lang=pt_br`;

  try {
    const response = await axios.get(url);
    const weatherData = response.data;

    return {
      temp: weatherData.main.temp,
      description: weatherData.weather[0].description,
      feelsLike: weatherData.main.feels_like,
      icon: weatherData.weather[0].icon,
      cityFound: weatherData.name,
    };
  } catch (err) {
    if (err.response) {
      const error = new Error(
        err.response.data.message || "Erro ao buscar dados da cidade."
      );
      error.statusCode = err.response.status;
      throw error;
    }
    throw new Error("Erro ao conectar com a API de clima.");
  }
}

// Rota da API de clima via POST
app.post("/api/weather", async (req, res) => {
  const { city } = req.body;

  if (!city) {
    return res.status(400).json({ error: "O nome da cidade é obrigatório." });
  }

  try {
    const weatherData = await getWeather(city);
    return res.json(weatherData);
  } catch (error) {
    console.error("Erro na rota /api/weather:", error.message);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message });
  }
});

// Rota da API de clima via GET
app.get("/weather/:city", async (req, res) => {
  const { city } = req.params;

  try {
    const weatherData = await getWeather(city);
    return res.json(weatherData);
  } catch (error) {
    console.error(`Erro na rota /weather/${city}:`, error.message);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log(`Servidor rodando em http://localhost:3000`);
});