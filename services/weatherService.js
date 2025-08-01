// ARQUIVO COMPLETO: /services/weatherService.js

const axios = require("axios");
require("dotenv").config();

async function getWeather(city) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    const error = new Error("API key do clima não definida no servidor.");
    error.statusCode = 500;
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
    const error = new Error("Erro de rede ao conectar com a API de clima.");
    error.statusCode = 503;
    throw error;
  }
}

module.exports = {
  getWeather
};