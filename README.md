# 🚗 Smart Garage Nexus — Garagem Inteligente Unificada

## 📘 Visão Geral

**Smart Garage Nexus** é uma aplicação web *front-end* desenvolvida para gerenciar uma garagem virtual inteligente. Ela permite adicionar, visualizar e interagir com diferentes tipos de veículos — como Carros, Carros Esportivos e Caminhões — de forma dinâmica, utilizando conceitos avançados de Programação Orientada a Objetos (POO) em JavaScript.

O sistema oferece uma interface moderna, responsiva e reativa, além de persistência de dados via LocalStorage. Agora, também inclui:
-   **Busca de informações adicionais** sobre os veículos através de uma **API simulada** (`dados_veiculos_api.json`), enriquecendo os detalhes exibidos.
-   **[NOVO]** **Planejador de Viagem:** Cálculo de distância (simulado), estimativa de custo de combustível e consulta de **clima no destino** (via API real OpenWeatherMap, requer backend Node.js).

---

## 🚀 Funcionalidades Principais

### 🔧 Gerenciamento de Frota
- Adicione veículos à garagem (Carros, Esportivos, Caminhões).
- Visualize todos os veículos cadastrados.
- Selecione veículos para ver detalhes e controles específicos.
- Remova veículos da frota.

### ⚙️ Interação com Veículos
- Ligar e desligar o motor (com validações).
- Aceleração e frenagem com comportamento polimórfico.
- Funções exclusivas por tipo (Turbo, Carga).

### 🧾 Manutenção Veicular
- Agende/registre manutenções.
- Histórico completo por veículo.
- Lista global de agendamentos futuros.

### 🌐 Detalhes Externos via API Simulada
- **Busca Sob Demanda:** Clique em "Ver Dados Externos" no painel de detalhes do veículo.
- **Informações Adicionais:** Exibe dados como Valor FIPE estimado, status de Recall e dicas de manutenção específicas do modelo (quando disponíveis).
- **API Simulada:** Os dados são buscados de um arquivo `dados_veiculos_api.json` local.
- **Feedback Visual:** Indicador de carregamento e mensagens claras.

### ✈️ **[NOVO]** Planejador de Viagem (no painel de detalhes do veículo)
-   **Entrada de Rota:** Campos para "Local de Partida" e "Local de Chegada".
-   **Cálculo de Rota e Clima:**
    -   **Distância:** Estimada através de uma API simulada no backend (`/api/distance/:origin/:destination`).
    -   **Custo de Combustível:** Calculado com base na distância, tipo do veículo selecionado (consumo médio predefinido) e um preço de combustível configurável (atualmente fixo no código).
    -   **Clima no Destino:** Buscado em tempo real da API OpenWeatherMap através do backend Node.js (`/api/weather/:city`). Exibe temperatura, descrição e sensação térmica.
    -   **[NOVO] Destaque de Condições Climáticas:**
        *   Após exibir os resultados do clima, o usuário pode usar checkboxes para destacar visualmente condições específicas:
            *   **Chuva:** Se a descrição do clima indicar chuva, garoa, tempestade, etc.
            *   **Frio:** Se a temperatura estiver abaixo de um limite configurado (ex: 10°C).
            *   **Calor:** Se a temperatura estiver acima de um limite configurado (ex: 30°C).
-   **Feedback Visual:** Indicador de carregamento durante as buscas e exibição clara dos resultados.

### 💾 Persistência de Dados
- Salvamento automático da garagem no **LocalStorage**.
- Restauração do estado ao recarregar a página.

---

## 💡 Como Funciona a API Simulada de Veículos

A funcionalidade de "Dados Externos" utiliza a `Fetch API` do JavaScript com `async/await` para buscar informações no arquivo `dados_veiculos_api.json`, localizado na raiz do projeto.

- **Arquivo `dados_veiculos_api.json`:** Contém um array de objetos JSON. Cada objeto representa dados adicionais para um veículo específico, identificado por um campo `identificador` (atualmente no formato `Marca-Modelo`).
- **Processo:** Ao clicar no botão, o sistema constrói o identificador do veículo selecionado e busca a entrada correspondente no arquivo JSON.
- **Limitação:** O arquivo JSON é estático. Novos veículos não terão dados externos a menos que uma entrada correspondente seja manualmente adicionada ao arquivo.

## 🛰️ Como Funciona o Planejador de Viagem (Clima e Distância)

Esta funcionalidade requer um **servidor backend Node.js (`server.js`)** rodando localmente.

-   **Backend (`server.js`):**
    -   Usa Express.js e o módulo `https` do Node.
    -   **Rota `/api/weather/:city`:** Recebe o nome de uma cidade, consulta a API OpenWeatherMap (requer uma `API_KEY` configurada no arquivo `.env`) e retorna dados de temperatura, descrição, sensação térmica e ícone do clima.
    -   **Rota `/api/distance/:origin/:destination`:** Simula o cálculo de distância entre duas localidades. Retorna uma distância em km. *Esta é uma simulação e pode ser substituída por uma API real de rotas (ex: Google Maps Distance Matrix API).*
-   **Frontend (`main.js`):**
    -   Ao clicar em "Calcular Rota e Clima":
        1.  Obtém os locais de partida e chegada dos campos de input.
        2.  Faz um `fetch` para `http://localhost:3000/api/distance/:partida/:chegada` para obter a distância.
        3.  Faz um `fetch` para `http://localhost:3000/api/weather/:chegada` para obter o clima no destino.
        4.  Calcula o custo estimado de combustível baseado na distância, no tipo do veículo selecionado (que tem um consumo médio predefinido) e um preço de combustível (atualmente fixo no `main.js`).
        5.  Exibe todas essas informações na interface.
-   **Arquivo `.env`:** Necessário na raiz do projeto (junto com `server.js`) para armazenar sua `API_KEY` do OpenWeatherMap:
    ```env
    API_KEY=SUA_CHAVE_API_AQUI
    ```

---

## 🧪 Como Executar Localmente

**Opção 1: Frontend Isolado (Funcionalidades básicas e API de Veículos Simulada)**

1.  **Clone o Repositório:**
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO_AQUI>
    cd <NOME_DA_PASTA_DO_REPOSITORIO>
    ```
2.  **Abra o `index.html`:**
    *   Basta abrir o arquivo `index.html` diretamente no seu navegador web preferido.
    *   **Recomendado:** Use uma extensão como "Live Server" (VS Code) para servir o `index.html`. Isso evita problemas de CORS ao carregar o `dados_veiculos_api.json`.

**Opção 2: Frontend + Backend (Para funcionalidade completa de Planejador de Viagem com Clima Real)**

1.  **Clone o Repositório.**
2.  **Configure o Backend:**
    *   Navegue até a pasta onde `server.js` e `package.json` estão localizados.
    *   Crie um arquivo `.env` na mesma pasta e adicione sua chave da API OpenWeatherMap:
        ```env
        API_KEY=SUA_CHAVE_API_DO_OPENWEATHERMAP_AQUI
        ```
    *   Instale as dependências do Node.js:
        ```bash
        npm install
        ```
    *   Inicie o servidor backend:
        ```bash
        npm start
        # ou para desenvolvimento com auto-reload:
        # npm run dev (se tiver nodemon configurado no package.json)
        ```
        O servidor estará rodando em `http://localhost:3000` (ou a porta configurada).
3.  **Execute o Frontend:**
    *   Abra o arquivo `index.html` do Smart Garage Nexus no seu navegador.
    *   **Recomendado:** Use uma extensão como "Live Server" (VS Code) para servir o `index.html` (ex: `http://127.0.0.1:5500`). O frontend fará requisições para o backend em `http://localhost:3000`.
    *   *Alternativa:* Se você descomentou as linhas de `app.use(express.static(...))` no `server.js` e colocou os arquivos do frontend na pasta `public`, você pode acessar a aplicação diretamente em `http://localhost:3000`.