const express = require("express");
const router = express.Router();
const fs = require('fs'); // [!!!] Precisamos do File System para ler e escrever
const path = require('path'); // [!!!] Precisamos do Path para encontrar o server.js

// Esta função recebe o array "vehicleApiData" do server.js como parâmetro.
module.exports = function(vehicleApiData) {

    // Rota GET para buscar todos os veículos (sem alterações)
    router.get("/vehicles", (req, res) => {
        return res.json(vehicleApiData);
    });

    // Rota GET para buscar dados de um veículo específico (sem alterações)
    router.get("/vehicles/:identifier", (req, res) => {
        const { identifier } = req.params;
        const vehicleData = vehicleApiData.find(
            (v) => v.identificador.toLowerCase() === identifier.toLowerCase()
        );
        if (vehicleData) {
            return res.json(vehicleData);
        } else {
            return res.status(404).json({ error: "Dados para este veículo ainda não foram criados." });
        }
    });

    /**
     * [!!! ATENÇÃO: LÓGICA PERIGOSA DE AUTO-EDIÇÃO !!!]
     * Esta rota modifica o array em memória e depois reescreve o próprio
     * arquivo server.js para tornar a alteração "permanente".
     */
    router.put("/vehicles/:identifier", (req, res) => {
        const { identifier } = req.params;
        const receivedData = req.body;

        const vehicleIndex = vehicleApiData.findIndex(
            (v) => v.identificador.toLowerCase() === identifier.toLowerCase()
        );

        let wasCreated = false;

        if (vehicleIndex !== -1) {
            console.log(`[Server] Atualizando dados em memória para '${identifier}'...`);
            vehicleApiData[vehicleIndex] = { 
                ...vehicleApiData[vehicleIndex], 
                ...receivedData,
                identificador: vehicleApiData[vehicleIndex].identificador
            };
        } else {
            console.log(`[Server] Criando novos dados em memória para '${identifier}'...`);
            const newVehicleData = {
                identificador: identifier,
                valorFipeEstimado: receivedData.valorFipeEstimado || 0,
                recallPendente: receivedData.recallPendente === 'true' || receivedData.recallPendente === true,
                ultimaRevisaoRecomendadaKm: receivedData.ultimaRevisaoRecomendadaKm || 0,
                dicaManutencao: receivedData.dicaManutencao || ""
            };
            vehicleApiData.push(newVehicleData);
            wasCreated = true;
        }
        
        // --- [!!!] INÍCIO DA LÓGICA DE AUTO-EDIÇÃO [!!!] ---
        try {
            // Passo 1: Encontrar o caminho absoluto para o server.js
            const serverJsPath = path.join(__dirname, '..', 'server.js');
            
            // Passo 2: Ler todo o conteúdo do server.js atual
            let serverJsContent = fs.readFileSync(serverJsPath, 'utf8');

            // Passo 3: Converter o array de memória atualizado para uma string de código
            // Usamos JSON.stringify com formatação para manter o código legível
            const newArrayString = JSON.stringify(vehicleApiData, null, 2);

            // Passo 4: Criar a declaração completa da variável
            const newArrayDeclaration = `let vehicleApiData = ${newArrayString};`;

            // Passo 5: Usar uma Expressão Regular para encontrar e substituir a declaração antiga
            // Esta regex procura por 'let vehicleApiData = [' ... até o '];' correspondente
            const regex = /let\s+vehicleApiData\s*=\s*\[[\s\S]*?\];/;
            if (regex.test(serverJsContent)) {
                serverJsContent = serverJsContent.replace(regex, newArrayDeclaration);
                
                // Passo 6: Sobrescrever o arquivo server.js com o novo conteúdo
                fs.writeFileSync(serverJsPath, serverJsContent, 'utf8');
                console.log('[!!!] SUCESSO: O arquivo server.js foi modificado permanentemente no disco.');

            } else {
                // Se a regex falhar, lançamos um erro para não corromper o arquivo
                throw new Error("Não foi possível encontrar a declaração do array 'vehicleApiData' no server.js para substituição.");
            }

        } catch (error) {
            console.error('[!!!] ERRO CRÍTICO AO TENTAR MODIFICAR O server.js:', error);
            // Se a escrita falhar, retornamos um erro 500 para o cliente.
            return res.status(500).json({ error: "Ocorreu um erro crítico ao tentar salvar os dados no servidor." });
        }
        // --- [!!!] FIM DA LÓGICA DE AUTO-EDIÇÃO [!!!] ---

        // Responde ao cliente com sucesso
        if (wasCreated) {
            return res.status(201).json({ 
                message: "Dados do veículo criados e salvos permanentemente!", 
                vehicle: vehicleApiData[vehicleApiData.length - 1] 
            });
        } else {
            return res.json({ 
                message: "Veículo atualizado e salvo permanentemente!", 
                vehicle: vehicleApiData[vehicleIndex] 
            });
        }
    });

    return router;
};