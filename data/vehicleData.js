const fs = require('fs');
const path = require('path');

let vehicleApiData = [];

try {
  // Caminho para o arquivo JSON na pasta 'public'
  const jsonPath = path.join(__dirname, '..', 'public', 'dados_veiculos_api.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  vehicleApiData = JSON.parse(jsonData);
  console.log('[Data Module] Banco de dados de veículos (JSON) carregado com sucesso.');
} catch (error) {
  console.error('[Data Module] CRITICAL: Falha ao carregar ou parsear dados_veiculos_api.json:', error);
  // Em um app real, poderíamos parar o servidor ou ter um fallback.
  // Por agora, o array 'vehicleApiData' permanecerá vazio.
}

// Exporta os dados para serem usados por outros módulos, como as rotas.
module.exports = vehicleApiData;