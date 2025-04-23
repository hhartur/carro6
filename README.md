# 🚗 Smart Garage Nexus — Garagem Inteligente Unificada

## 📘 Visão Geral

**Smart Garage Nexus** é uma aplicação web *front-end* desenvolvida para gerenciar uma garagem virtual inteligente. Ela permite adicionar, visualizar e interagir com diferentes tipos de veículos — como Carros, Carros Esportivos e Caminhões — de forma dinâmica, utilizando conceitos avançados de Programação Orientada a Objetos (POO) em JavaScript.

O sistema oferece uma interface moderna, responsiva e reativa, além de persistência de dados via LocalStorage, garantindo que suas informações sejam mantidas entre sessões. É uma solução ideal para quem deseja explorar conceitos de herança, polimorfismo e gerenciamento de estado em aplicações web modernas.

---

## 🚀 Funcionalidades Principais

### 🔧 Gerenciamento de Frota
- Adicione veículos à garagem (Carros, Esportivos, Caminhões).
- Visualize todos os veículos cadastrados.
- Selecione veículos para ver detalhes e controles específicos.
- Remova veículos da frota.

### ⚙️ Interação com Veículos
- Ligar e desligar o motor (com validações, como proibição de desligamento em movimento).
- Aceleração e frenagem com comportamento realista e polimórfico:
  - **Caminhões**: desempenho impactado pela carga.
  - **Carros Esportivos**: ativação de **turbo** para aceleração extra.
- Funções exclusivas por tipo:
  - Ativar/Desativar **Turbo** (Esportivos).
  - Carregar/Descarregar **Carga** (Caminhões).

### 🧾 Manutenção Veicular
- Agende ou registre manutenções por data, tipo, custo e descrição.
- Histórico completo de manutenções por veículo, ordenado por data.
- Lista global de **agendamentos futuros** acessível via Dashboard e Garagem.

### 💾 Persistência de Dados
- Salvamento automático de toda a garagem no **LocalStorage** do navegador.
- Restauração completa do estado da aplicação ao recarregar a página.

---

## 🧪 Como Executar Localmente

1. **Clone o Repositório:**
   ```bash
   git clone <URL_DO_SEU_REPOSITORIO_AQUI>
   cd <NOME_DA_PASTA_DO_REPOSITORIO>