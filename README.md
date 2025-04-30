# 🚗 Smart Garage Nexus — Garagem Inteligente Unificada

## 📘 Visão Geral

**Smart Garage Nexus** é uma aplicação web *front-end* desenvolvida para gerenciar uma garagem virtual inteligente. Ela permite adicionar, visualizar e interagir com diferentes tipos de veículos — como Carros, Carros Esportivos e Caminhões — de forma dinâmica, utilizando conceitos avançados de Programação Orientada a Objetos (POO) em JavaScript.

O sistema oferece uma interface moderna, responsiva e reativa, além de persistência de dados via LocalStorage. Agora, também inclui a **busca de informações adicionais** sobre os veículos através de uma **API simulada**, enriquecendo os detalhes exibidos.

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

### 🌐 **[NOVO]** Detalhes Externos via API Simulada
- **Busca Sob Demanda:** Clique em "Ver Dados Externos" no painel de detalhes do veículo.
- **Informações Adicionais:** Exibe dados como Valor FIPE estimado, status de Recall e dicas de manutenção específicas do modelo (quando disponíveis).
- **API Simulada:** Os dados são buscados de um arquivo `dados_veiculos_api.json` local, simulando uma requisição a uma API externa.
- **Feedback Visual:** Indicador de carregamento durante a busca e mensagens claras em caso de sucesso, falha ou dados não encontrados.

### 💾 Persistência de Dados
- Salvamento automático da garagem no **LocalStorage**.
- Restauração do estado ao recarregar a página.

---

## 💡 Como Funciona a API Simulada

A funcionalidade de "Dados Externos" utiliza a `Fetch API` do JavaScript com `async/await` para buscar informações no arquivo `dados_veiculos_api.json`, localizado na raiz do projeto.

- **Arquivo `dados_veiculos_api.json`:** Contém um array de objetos JSON. Cada objeto representa dados adicionais para um veículo específico, identificado por um campo `identificador` (atualmente no formato `Marca-Modelo`).
- **Processo:** Ao clicar no botão, o sistema constrói o identificador do veículo selecionado e busca a entrada correspondente no arquivo JSON. Os dados encontrados (ou uma mensagem de status) são exibidos dinamicamente na interface.
- **Limitação:** Como é uma simulação, o arquivo JSON é estático. Novos veículos adicionados à garagem não terão dados externos a menos que uma entrada correspondente seja manualmente adicionada ao arquivo `dados_veiculos_api.json`.

---

## 🧪 Como Executar Localmente

1.  **Clone o Repositório:**
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO_AQUI>
    cd <NOME_DA_PASTA_DO_REPOSITORIO>
    ```
2.  **Abra o `index.html`:** Basta abrir o arquivo `index.html` diretamente no seu navegador web preferido. Não é necessário um servidor local para esta versão, pois a "API" é um arquivo local.