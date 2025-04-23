// Define a classe Garage para gerenciar uma coleção de veículos
class Garage {
    constructor() {
      // Inicializa a lista de veículos como vazia
      this.vehicles = [];
  
      // Define a chave usada para armazenar os dados no localStorage
      this.localStorageKey = "smartGarageVehicles_v3";
    }
  
    // Adiciona um veículo à garagem
    addVehicle(t) {
      // Verifica se o objeto é uma instância de Vehicle
      if (!(t instanceof Vehicle)) {
        console.error("Garage.addVehicle objeto inválido:", t);
  
        // Se houver uma função showNotification, exibe uma mensagem de erro
        if (typeof showNotification == "function") {
          showNotification("Erro: Objeto inválido.", "error");
        }
  
        return false;
      }
  
      // Verifica se o veículo já existe com o mesmo ID
      if (this.vehicles.some((e) => e.id === t.id)) {
        console.warn(`Garage.addVehicle ID duplicado: ${t.id}`);
  
        if (typeof showNotification == "function") {
          showNotification(
            `Veículo ${t.model} (ID: ...${t.id.slice(-4)}) já existe.`,
            "warning"
          );
        }
  
        return false;
      }
  
      // Adiciona o veículo à lista e salva no localStorage
      this.vehicles.push(t);
      console.log(
        `Garage: Adicionado ${t._type} ${t.make} (ID: ${t.id}). Total: ${this.vehicles.length}.`
      );
      this.saveToLocalStorage();
      return true;
    }
  
    // Remove um veículo com base no ID
    removeVehicle(t) {
      const e = this.vehicles.findIndex((e) => e.id === t);
  
      if (e !== -1) {
        const o = this.vehicles.splice(e, 1)[0];
        console.log(
          `Garage: Removido ${o._type} ${o.make} (ID: ${t}). Total: ${this.vehicles.length}.`
        );
        this.saveToLocalStorage();
        return true;
      }
  
      console.warn(`Garage.removeVehicle ID não encontrado: ${t}`);
      return false;
    }
  
    // Busca um veículo pelo ID
    findVehicle(t) {
      return this.vehicles.find((e) => e.id === t);
    }
  
    // Salva a lista de veículos no localStorage
    saveToLocalStorage() {
      try {
        const t = this.vehicles.map((t) => t.toJSON());
        localStorage.setItem(this.localStorageKey, JSON.stringify(t));
        console.log(
          `Garage salva (${this.vehicles.length} veículos). Chave: ${this.localStorageKey}`
        );
      } catch (t) {
        console.error("Erro ao salvar Garage:", t);
  
        // Tratamento para armazenamento cheio
        if (
          t.name === "QuotaExceededError" ||
          (t.code && [22, 1014].includes(t.code))
        ) {
          if (typeof showNotification == "function") {
            showNotification("Erro: Armazenamento cheio!", "error", 8000);
          }
          alert("Erro: Armazenamento cheio!");
        } else if (typeof showNotification == "function") {
          showNotification("Erro ao salvar garagem.", "error");
        }
      }
    }
  
    // Carrega a lista de veículos do localStorage
    loadFromLocalStorage() {
      const t = localStorage.getItem(this.localStorageKey);
  
      if (!t) {
        console.log(`Nenhum dado encontrado para a chave "${this.localStorageKey}".`);
        this.vehicles = [];
        return;
      }
  
      console.log(
        `Dados encontrados para a chave "${this.localStorageKey}". Tentando carregar...`
      );
  
      try {
        const e = JSON.parse(t);
  
        if (!Array.isArray(e)) throw new Error("Dados armazenados não são um array.");
  
        const o = [];
  
        e.forEach((t, e) => {
          let i = null;
          const s = t?._type;
  
          if (!s) {
            console.warn(`Ignorado [${e}]: faltando _type`, t);
            return;
          }
  
          try {
            // Determina o tipo e tenta reconstruir o objeto
            if (s === "Car") i = Car.fromJSON(t);
            else if (s === "SportsCar") i = SportsCar.fromJSON(t);
            else if (s === "Truck") i = Truck.fromJSON(t);
            else if (s === "Vehicle") {
              i = Vehicle.fromJSON(t);
              console.log(`Veículo carregado como base 'Vehicle' no índice ${e}.`);
            } else {
              console.warn(`Ignorado [${e}]: tipo desconhecido '${s}'`, t);
            }
  
            // Valida a instância criada
            if (i instanceof Vehicle) {
              o.push(i);
            } else {
              console.error(
                `Falha ao carregar [${e}]: fromJSON retornou nulo/inválido para tipo ${s}`,
                t
              );
            }
          } catch (o) {
            console.error(
              `Erro ao criar instância [${e}] do tipo ${s}:`,
              o,
              t
            );
          }
        });
  
        this.vehicles = o;
  
        // Ordena o histórico de manutenção se necessário
        this.vehicles.forEach((t) => t.sortMaintenanceHistory());
  
        console.log(`Garage carregada com sucesso. ${this.vehicles.length} veículos recriados.`);
      } catch (e) {
        console.error("Erro CRÍTICO ao carregar Garage:", e);
  
        if (e instanceof SyntaxError) {
          console.error("-> JSON salvo está corrompido!");
  
          if (typeof showNotification == "function") {
            showNotification(
              "Erro: Dados salvos corrompidos! Resetando garagem.",
              "error",
              6000
            );
          }
  
          localStorage.removeItem(this.localStorageKey);
        } else if (typeof showNotification == "function") {
          showNotification("Erro ao carregar garagem.", "error");
        }
  
        this.vehicles = [];
      }
    }
  
    // Retorna todos os agendamentos futuros de manutenção
    getAllFutureAppointments() {
      const t = [];
  
      this.vehicles.forEach((e) => {
        e.getFutureAppointments().forEach((o) => {
          t.push({
            vehicleInfo: `${e.make} ${e.model} (${e.year})`,
            vehicleId: e.id,
            maintenance: o,
          });
        });
      });
  
      // Ordena os agendamentos por data
      t.sort((t, e) => {
        const o =
          t.maintenance.date instanceof Date
            ? t.maintenance.date.getTime()
            : Infinity;
        const i =
          e.maintenance.date instanceof Date
            ? e.maintenance.date.getTime()
            : Infinity;
        return o - i;
      });
  
      return t;
    }
  }
  