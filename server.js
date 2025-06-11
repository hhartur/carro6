const express = require("express");
const path = require("path")
const axios = require("axios");
const fs = require("fs"); // Módulo File System para ler o arquivo JSON

require("dotenv").config();

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// --- [NOVO] Carrega e armazena os dados dos veículos na inicialização ---
let vehicleApiData = [];
try {
  const jsonPath = path.join(__dirname, "public", 'dados_veiculos_api.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  vehicleApiData = JSON.parse(jsonData);
  console.log('[Server] Banco de dados de veículos (JSON) carregado com sucesso.');
} catch (error) {
  console.error('[Server] CRITICAL: Falha ao carregar ou parsear dados_veiculos_api.json:', error);
  // Em um app real, poderíamos parar o servidor se este dado for essencial.
}

async function getWeather(city) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    const error = new Error("API key não definida.");
    error.statusCode = 401;
    throw error;
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=pt_br`;
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
      const error = new Error(err.response.data.message || "Erro ao buscar dados da cidade.");
      error.statusCode = err.response.status;
      throw error;
    }
    throw new Error("Erro ao conectar com a API de clima.");
  }
}

// --- [NOVO] Rota POST para buscar dica de manutenção específica ---
app.post("/api/tip", (req, res) => {
    const { vehicleIdentifier } = req.body;

    if (!vehicleIdentifier) {
        return res.status(400).json({ error: "Identificador do veículo é obrigatório." });
    }

    const vehicleData = vehicleApiData.find(
        (v) => v.identificador.toLowerCase() === vehicleIdentifier.toLowerCase()
    );

    if (vehicleData) {
        // Encontrou o veículo, retorna a dica
        return res.json({ tip: vehicleData.dicaManutencao || "Nenhuma dica específica disponível para este modelo." });
    } else {
        // Não encontrou o veículo
        return res.status(404).json({ error: "Veículo não encontrado no banco de dados de dicas." });
    }
});


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
    return res.status(error.statusCode || 500).json({ error: error.message });
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
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log(`Servidor rodando em http://localhost:3000`);
});