// --- START OF FILE server.js ---
const https = require('https');
require("dotenv").config();
const express = require("express");
const path = require("path"); // path não é usado aqui, mas pode ser útil se servir estáticos

const app = express();

// Middleware para habilitar CORS (Cross-Origin Resource Sharing)
// Isso permite que o frontend (rodando em outra porta/domínio) acesse esta API
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite qualquer origem (para desenvolvimento)
    // Em produção, restrinja para o domínio do seu frontend:
    // res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5500'); // Exemplo com Live Server
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


// Se você quiser que este servidor também sirva os arquivos do Smart Garage Nexus:
// Descomente as linhas abaixo e coloque os arquivos do Smart Garage (index.html, style.css, js/, dados_veiculos_api.json)
// dentro de uma pasta chamada 'public' na raiz do projeto onde server.js está.
/*
const smartGarageFrontendPath = path.join(__dirname, 'public'); // Assumindo que o frontend está em 'public'
console.log(`Servindo arquivos estáticos de: ${smartGarageFrontendPath}`);
app.use(express.static(smartGarageFrontendPath));

// Rota principal para servir o index.html do Smart Garage
app.get('/', (req, res) => {
  res.sendFile(path.join(smartGarageFrontendPath, 'index.html'));
});
*/
app.use(express.static(path.join(__dirname, 'public')));

app.get("/api/weather/:city", (req, res) => {
  const city = req.params.city;
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error("API Key do OpenWeatherMap não configurada no .env");
    return res.status(500).json({ error: "Configuração do servidor incompleta (sem API key)." });
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=pt_br`;

  https.get(url, (response) => {
    let data = '';
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => {
      try {
        const weatherData = JSON.parse(data);
        if (response.statusCode !== 200) {
          console.error(`Erro da API OpenWeatherMap [${response.statusCode}] para "${city}": ${weatherData.message || 'Erro desconhecido'}`);
          return res.status(response.statusCode).json({ error: weatherData.message || `Erro ao buscar clima para ${city}` });
        }
        console.log(`Dados de clima para "${city}": Temp ${weatherData.main.temp}°C, Desc: ${weatherData.weather[0].description}`);
        return res.json({
          temp: weatherData.main.temp,
          description: weatherData.weather[0].description,
          feelsLike: weatherData.main.feels_like, // Corrigido para feels_like
          icon: weatherData.weather[0].icon,
          cityFound: weatherData.name // Nome da cidade retornado pela API
        });
      } catch (error) {
        console.error("Erro ao processar dados de clima (JSON.parse falhou):", error, "Dados recebidos:", data);
        return res.status(500).json({ error: "Erro interno ao processar dados de clima." });
      }
    });
  }).on('error', (error) => {
    console.error("Erro na requisição HTTPS para OpenWeatherMap:", error);
    return res.status(500).json({ error: "Erro ao conectar com a API de clima." });
  });
});

// API SIMULADA DE DISTÂNCIA (substitua por uma real se necessário)
app.get("/api/distance/:origin/:destination", (req, res) => {
    const origin = req.params.origin.toLowerCase();
    const destination = req.params.destination.toLowerCase();

    // Lógica de simulação muito simples
    let distance = Math.floor(Math.random() * 1000) + 50; // Distância aleatória entre 50 e 1050 km

    if ((origin.includes("sao paulo") || origin.includes("são paulo")) && destination.includes("rio")) {
        distance = 430;
    } else if (origin.includes("curitiba") && destination.includes("florianopolis")) {
        distance = 300;
    } else if (origin.includes("recife") && destination.includes("salvador")) {
        distance = 840;
    }

    console.log(`Distância simulada entre ${req.params.origin} e ${req.params.destination}: ${distance} km`);
    res.json({
        distance: distance, // em km
        unit: "km"
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Smart Garage Nexus (com API de clima) rodando em http://localhost:${PORT}`);
  console.log("Certifique-se de que a API_KEY do OpenWeatherMap está no arquivo .env");
  console.log("Para testar a API de clima, acesse: http://localhost:3000/api/weather/SUACIDADE");
  console.log("Para testar a API de distância, acesse: http://localhost:3000/api/distance/ORIGEM/DESTINO");
});
// --- END OF FILE server.js ---