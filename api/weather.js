const https = require("https");

export default function handler(req, res) {
  const { city } = req.query;

  const url = `https://api.openweathermap.org/data/2.5/weather?city=${encodeURIComponent(city)}&appid=2868f6366988cc5b344d939c4e89ae96&units=metric&lang=pt_br`;

  https.get(url, (response) => {
    let data = "";
    response.on("data", (chunk) => { data += chunk; });
    response.on("end", () => {
      try {
        const weatherData = JSON.parse(data);
        console.log(weatherData)
        if (response.statusCode !== 200) {
          return res.status(response.statusCode).json({ error: weatherData.message || "Erro" });
        }
        return res.json({
          temp: weatherData.main.temp,
          description: weatherData.weather[0].description,
          feelsLike: weatherData.main.feels_like,
          icon: weatherData.weather[0].icon,
          cityFound: weatherData.name
        });
      } catch (err) {
        return res.status(500).json({ error: "Erro ao processar resposta da API" });
      }
    });
  }).on("error", (err) => {
    return res.status(500).json({ error: "Erro ao conectar com a API de clima" });
  });
}
