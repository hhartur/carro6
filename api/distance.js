export default function handler(req, res) {
    const { origin, destination } = req.query;
  
    let distance = Math.floor(Math.random() * 1000) + 50;
  
    if ((origin.toLowerCase().includes("sao paulo") || origin.toLowerCase().includes("são paulo")) && destination.toLowerCase().includes("rio")) {
      distance = 430;
    } else if (origin.toLowerCase().includes("curitiba") && destination.toLowerCase().includes("florianopolis")) {
      distance = 300;
    } else if (origin.toLowerCase().includes("recife") && destination.toLowerCase().includes("salvador")) {
      distance = 840;
    }
  
    res.json({ distance, unit: "km" });
  }
  