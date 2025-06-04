const express = require("express");
const path = require("path");
const https = require("https");

require("dotenv").config()

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Rota da API de clima
app.post("/api/weather", (req, res) => {
  const { city } = req.body;
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return res.status(401).json({ error: "API key não definida" });
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    city
  )}&appid=${apiKey}&units=metric&lang=pt_br`;

  https
    .get(url, (response) => {
      let data = "";
      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        try {
          const weatherData = JSON.parse(data);
          if (response.statusCode !== 200) {
            return res
              .status(response.statusCode)
              .json({ error: weatherData.message || "Erro" });
          }

          return res.json({
            temp: weatherData.main.temp,
            description: weatherData.weather[0].description,
            feelsLike: weatherData.main.feels_like,
            icon: weatherData.weather[0].icon,
            cityFound: weatherData.name,
          });
        } catch (err) {
          return res
            .status(500)
            .json({ error: "Erro ao processar resposta da API" });
        }
      });
    })
    .on("error", (err) => {
      return res
        .status(500)
        .json({ error: "Erro ao conectar com a API de clima" });
    });
});

// Inicia o servidor
app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});