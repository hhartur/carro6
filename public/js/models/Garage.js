
// Define a classe Garage para gerenciar uma coleção de veículos
class Garage {
  constructor() {
    // Inicializa a lista de veículos como vazia
    this.vehicles = [];

    // Define a chave usada para armazenar os dados no localStorage
    this.localStorageKey = "smartGarageVehicles_v3"; // Mantenha _v3 ou atualize se a estrutura mudar significativamente
  }

  // Adiciona um veículo à garagem
  addVehicle(t) { // t é o objeto veículo
    // Verifica se o objeto é uma instância de Vehicle
    if (!(t instanceof Vehicle)) {
      console.error("Garage.addVehicle: Objeto fornecido não é uma instância de Vehicle.", t);

      // Se houver uma função showNotification global, exibe uma mensagem de erro
      if (typeof showNotification == "function") {
        showNotification("Erro: Tentativa de adicionar objeto inválido à garagem.", "error");
      }

      return false; // Falha ao adicionar
    }

    // Verifica se o veículo já existe com o mesmo ID
    if (this.vehicles.some((e) => e.id === t.id)) {
      console.warn(`Garage.addVehicle: Veículo com ID duplicado '${t.id}' não adicionado.`);

      if (typeof showNotification == "function") {
        showNotification(
          `Veículo ${t.model} (ID: ...${t.id.slice(-4)}) já existe na garagem.`,
          "warning"
        );
      }

      return false; // Falha ao adicionar
    }

    // Adiciona o veículo à lista e salva no localStorage
    this.vehicles.push(t);
    console.log(
      `Garage: Adicionado ${t._type} ${t.make} ${t.model} (ID: ${t.id}). Total de veículos: ${this.vehicles.length}.`
    );
    this.saveToLocalStorage();
    return true; // Sucesso ao adicionar
  }

  // Remove um veículo com base no ID
  removeVehicle(t) { // t é o ID do veículo
    const e = this.vehicles.findIndex((e) => e.id === t); // Encontra o índice do veículo

    if (e !== -1) { // Se encontrou o veículo
      const o = this.vehicles.splice(e, 1)[0]; // Remove e obtém o objeto removido
      console.log(
        `Garage: Removido ${o._type} ${o.make} ${o.model} (ID: ${t}). Total de veículos: ${this.vehicles.length}.`
      );
      this.saveToLocalStorage();
      return true; // Sucesso ao remover
    }

    console.warn(`Garage.removeVehicle: Veículo com ID '${t}' não encontrado.`);
    return false; // Falha ao remover
  }

  // Busca um veículo pelo ID
  findVehicle(t) { // t é o ID do veículo
    return this.vehicles.find((e) => e.id === t);
  }

  // Salva a lista de veículos no localStorage
  saveToLocalStorage() {
    try {
      // Mapeia cada veículo para sua representação JSON
      const t = this.vehicles.map((t) => t.toJSON());
      localStorage.setItem(this.localStorageKey, JSON.stringify(t));
      console.log(
        `Garage salva no LocalStorage (${this.vehicles.length} veículos). Chave: ${this.localStorageKey}`
      );
    } catch (t) {
      console.error("Erro ao salvar dados da Garage no LocalStorage:", t);

      // Tratamento para erro de cota excedida (localStorage cheio)
      if (
        t.name === "QuotaExceededError" || // Padrão
        (t.code && [22, 1014].includes(t.code)) // Firefox, IE
      ) {
        if (typeof showNotification == "function") {
          showNotification("Erro Crítico: Armazenamento local está cheio! Não foi possível salvar.", "error", 8000);
        }
        alert("Erro Crítico: Armazenamento local (LocalStorage) está cheio! Alguns dados podem não ter sido salvos.");
      } else if (typeof showNotification == "function") {
        showNotification("Erro ao salvar dados da garagem no LocalStorage.", "error");
      }
    }
  }

  // Carrega a lista de veículos do localStorage
  loadFromLocalStorage() {
    const t = localStorage.getItem(this.localStorageKey); // Pega os dados da chave

    if (!t) { // Se não houver dados
      console.log(`Nenhum dado encontrado no LocalStorage para a chave "${this.localStorageKey}". Garagem iniciada vazia.`);
      this.vehicles = []; // Garagem começa vazia
      return;
    }

    console.log(
      `Dados encontrados no LocalStorage para a chave "${this.localStorageKey}". Tentando carregar...`
    );

    try {
      const e = JSON.parse(t); // Converte string JSON para objeto/array

      if (!Array.isArray(e)) { // Verifica se é um array
          throw new Error("Dados armazenados no LocalStorage não são um array válido.");
      }

      const o = []; // Array temporário para veículos recriados

      e.forEach((t, idx) => { // Itera sobre cada objeto de veículo do JSON
        let i = null; // Variável para a instância do veículo
        const s = t?._type; // Pega o tipo do veículo (Car, SportsCar, Truck)

        if (!s) { // Se não tiver tipo, ignora
          console.warn(`Ignorando item [${idx}] do LocalStorage: propriedade '_type' ausente.`, t);
          return; // Próximo item
        }

        try {
          // Determina o tipo e tenta reconstruir o objeto usando o método estático fromJSON da classe correspondente
          if (s === "Car") i = Car.fromJSON(t);
          else if (s === "SportsCar") i = SportsCar.fromJSON(t);
          else if (s === "Truck") i = Truck.fromJSON(t);
          else if (s === "Vehicle") { // Caso base, se por algum motivo um Vehicle genérico foi salvo
            i = Vehicle.fromJSON(t);
            console.log(`Veículo base 'Vehicle' carregado do LocalStorage no índice ${idx}.`);
          } else {
            console.warn(`Ignorando item [${idx}] do LocalStorage: tipo de veículo desconhecido '${s}'.`, t);
          }

          // Valida a instância criada
          if (i instanceof Vehicle) { // Se fromJSON retornou uma instância válida de Vehicle (ou subclasse)
            o.push(i); // Adiciona ao array temporário
          } else if (i === null && s !== "Vehicle" && s !== "Car" && s !== "SportsCar" && s !== "Truck") {
              // Se fromJSON retornou null e o tipo era desconhecido, já foi logado.
          } else {
            // Se fromJSON retornou null para um tipo conhecido, ou algo inesperado
            console.error(
              `Falha ao recriar veículo [${idx}] do LocalStorage: método fromJSON retornou nulo ou inválido para o tipo ${s}.`,
              t
            );
          }
        } catch (errorCreatingInstance) {
          console.error(
            `Erro crítico ao tentar criar instância de veículo [${idx}] (tipo ${s}) a partir do JSON do LocalStorage:`,
            errorCreatingInstance,
            t // Loga o dado problemático
          );
        }
      });

      this.vehicles = o; // Atribui os veículos recriados à garagem

      // Garante que o histórico de manutenção de cada veículo esteja ordenado
      this.vehicles.forEach((vehicle) => vehicle.sortMaintenanceHistory());

      console.log(`Garage carregada do LocalStorage com sucesso. ${this.vehicles.length} veículos recriados.`);
    } catch (e) { // Erro ao fazer JSON.parse ou outro erro no processo
      console.error("Erro CRÍTICO ao carregar dados da Garage do LocalStorage:", e);

      if (e instanceof SyntaxError) { // Se o JSON estiver malformado
        console.error("-> O JSON salvo no LocalStorage está corrompido!");
        if (typeof showNotification == "function") {
          showNotification(
            "Erro: Dados salvos da garagem estão corrompidos! A garagem será resetada.",
            "error",
            6000
          );
        }
        // Opcional: Fazer backup do item corrompido antes de remover
        // localStorage.setItem(this.localStorageKey + '_corrupted_backup_' + Date.now(), t);
        localStorage.removeItem(this.localStorageKey); // Remove o item corrompido
      } else if (typeof showNotification == "function") {
        showNotification("Erro ao carregar dados da garagem do LocalStorage. Verifique o console.", "error");
      }

      this.vehicles = []; // Reseta a garagem para um estado limpo em caso de erro grave
    }
  }

  // Retorna todos os agendamentos futuros de manutenção de todos os veículos
  getAllFutureAppointments() {
    const t = []; // Array para armazenar os compromissos

    this.vehicles.forEach((e) => { // Para cada veículo na garagem
      e.getFutureAppointments().forEach((o) => { // Pega os compromissos futuros do veículo
        t.push({
          vehicleInfo: `${e.make} ${e.model} (${e.year})`, // Informações do veículo
          vehicleId: e.id, // ID do veículo
          maintenance: o, // Objeto Maintenance
        });
      });
    });

    // Ordena os agendamentos por data (do mais próximo para o mais distante)
    t.sort((t, e) => {
      // Garante que as datas são válidas antes de comparar
      const o =
        t.maintenance.date instanceof Date
          ? t.maintenance.date.getTime()
          : Infinity; // Joga datas inválidas para o final
      const i =
        e.maintenance.date instanceof Date
          ? e.maintenance.date.getTime()
          : Infinity;
      return o - i;
    });

    return t;
  }
}