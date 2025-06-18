const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

// --- O "BANCO DE DADOS" ESTÁ AQUI. ELE SERÁ MODIFICADO EM TEMPO DE EXECUÇÃO ---
let vehicleApiData = [
  {
    "identificador": "Toyota-Corolla",
    "valorFipeEstimado": 85000,
    "recallPendente": false,
    "ultimaRevisaoRecomendadaKm": 60000,
    "dicaManutencao": "Verificar o nível do óleo do motor regularmente e calibrar pneus."
  },
  {
    "identificador": "Ford-Mustang",
    "valorFipeEstimado": 350000,
    "recallPendente": true,
    "ultimaRevisaoRecomendadaKm": 40000,
    "dicaManutencao": "Utilizar apenas gasolina premium para melhor performance e checar freios."
  },
  {
    "identificador": "Scania-R450",
    "valorFipeEstimado": 550000,
    "recallPendente": false,
    "ultimaRevisaoRecomendadaKm": 100000,
    "dicaManutencao": "Verificar a pressão dos pneus semanalmente, especialmente sob carga, e lubrificar componentes."
  },
  {
    "identificador": "Chevrolet-Onix",
    "valorFipeEstimado": 68000,
    "recallPendente": false,
    "ultimaRevisaoRecomendadaKm": 50000,
    "dicaManutencao": "Realizar alinhamento e balanceamento a cada 10.000 km."
  },
  {
    "identificador": "Ferrari-488",
    "valorFipeEstimado": 2800000,
    "recallPendente": false,
    "ultimaRevisaoRecomendadaKm": 15000,
    "dicaManutencao": "Aquecer o motor antes de exigir performance máxima. Usar apenas peças originais."
  },
  {
    "identificador": "Meu-Carro",
    "valorFipeEstimado": 4000,
    "recallPendente": false,
    "ultimaRevisaoRecomendadaKm": 5000,
    "dicaManutencao": "teste"
  }
];

console.log('[Server] Banco de dados de veículos (em memória) carregado.');

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const vehicleRoutes = require('./routes/vehicles')(vehicleApiData);
const weatherRoutes = require('./routes/weather');

app.use('/api', vehicleRoutes); 
app.use('/api', weatherRoutes);
app.use('/', weatherRoutes);   

app.use((req, res, next) => {
  res.status(404).json({ error: `A rota '${req.originalUrl}' não foi encontrada no servidor.` });
});

app.use((err, req, res, next) => {
  console.error("ERRO INESPERADO:", err.stack);
  res.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});