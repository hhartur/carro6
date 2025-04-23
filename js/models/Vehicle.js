// Classe base: Vehicle (veículo genérico)
class Vehicle {
    constructor(t, e, o, i = generateUniqueId(), s = "off", n = 0, r = []) {
      // Validação obrigatória de marca (make), modelo (model) e ano (year)
      if (!t || "" === String(t).trim() || !e || "" === String(e).trim() || !o)
        throw new Error(
          "Vehicle constructor requer valores válidos para 'make', 'model' e 'year'."
        );
  
      // Atribuição dos parâmetros ao objeto
      this.id = i;
      this.make = String(t).trim();
      this.model = String(e).trim();
      this.year = parseInt(o);
  
      // Validação de ano: mínimo 1886 (primeiro carro) e máximo 2 anos no futuro
      const a = new Date().getFullYear();
      if (isNaN(this.year) || this.year < 1886 || this.year > a + 2) {
        console.warn(
          `Ano inválido (${o}) fornecido para ${this.make} ${this.model}. Usando ${a}.`
        );
        this.year = a;
      }
  
      // Define o status inicial: "off", "on" ou "moving"
      const c = ["off", "on", "moving"];
      this.status = c.includes(s) ? s : "off";
  
      // Velocidade inicial
      this.speed = 0;
      const l = parseFloat(n);
      if (!isNaN(l) && l > 0) this.speed = l;
      if (this.status === "off") this.speed = 0;
  
      // Histórico de manutenções
      this.maintenanceHistory = [];
      if (Array.isArray(r)) {
        this.maintenanceHistory = r
          .map((t) => {
            const e = Maintenance.fromJSON(t);
            if (!e) {
              console.warn(
                `Dados de manutenção inválidos ignorados ao criar ${this.make} ${this.model}:`,
                t
              );
            }
            return e;
          })
          .filter((t) => t !== null);
      }
  
      this.sortMaintenanceHistory(); // Ordena o histórico por data
      this._type = "Vehicle"; // Tipo base
    }
  
    // Ordena histórico de manutenção do mais recente para o mais antigo
    sortMaintenanceHistory() {
      this.maintenanceHistory.sort((t, e) => {
        const o = t.date instanceof Date ? t.date.getTime() : 0;
        const i = e.date instanceof Date ? e.date.getTime() : 0;
        return i - o;
      });
    }
  
    // Liga o veículo
    start() {
      if (this.status === "off") {
        this.status = "on";
        this.speed = 0;
        console.log(`${this.make} ${this.model}: Motor ligado.`);
        return true;
      } else {
        console.log(
          `${this.make} ${this.model}: Motor já está ligado (status: ${this.status}).`
        );
        return false;
      }
    }
  
    // Desliga o veículo, se ele não estiver em movimento
    stop() {
      if (this.status === "off") {
        console.log(`${this.make} ${this.model}: Motor já está desligado.`);
        return false;
      }
      if (this.speed > 0) {
        console.warn(
          `Não é possível desligar ${this.make} ${
            this.model
          }: veículo está a ${this.speed.toFixed(0)} km/h. Pare primeiro!`
        );
        if (typeof showNotification === "function") {
          showNotification(
            `Freie o ${this.model} completamente antes de desligar!`,
            "error"
          );
        }
        return false;
      }
      this.status = "off";
      this.speed = 0;
      console.log(`${this.make} ${this.model}: Motor desligado.`);
      return true;
    }
  
    // Acelera o veículo
    accelerate(t = 10) {
      const e = parseFloat(t);
      if (isNaN(e) || e < 0) {
        console.warn(`Valor inválido de aceleração: ${t}.`);
        return false;
      }
  
      if (this.status === "on" || this.status === "moving") {
        if (e === 0) return true;
        if (this.status === "on") this.status = "moving";
        this.speed += e;
        console.log(
          `${this.make} ${this.model}: Acelerando para ${this.speed.toFixed(1)} km/h.`
        );
        return true;
      }
  
      console.warn(`Não é possível acelerar ${this.make} ${this.model}: motor desligado.`);
      if (typeof showNotification === "function") {
        showNotification(`Ligue o ${this.model} para poder acelerar.`, "warning");
      }
      return false;
    }
  
    // Freia o veículo
    brake(t = 15) {
      const e = parseFloat(t);
      if (isNaN(e) || e <= 0) {
        console.warn(`Valor inválido de frenagem: ${t}.`);
        return false;
      }
  
      if (this.status === "moving") {
        this.speed -= e;
        if (this.speed <= 0) {
          this.speed = 0;
          this.status = "on";
          console.log(`${this.make} ${this.model}: Veículo parado.`);
          if (typeof showNotification === "function") {
            showNotification(`${this.model} parou.`, "info");
          }
        } else {
          console.log(
            `${this.make} ${this.model}: Reduzindo para ${this.speed.toFixed(1)} km/h.`
          );
        }
        return true;
      }
  
      console.log(
        `${this.make} ${this.model}: Não é possível frear. Status atual: ${this.status}.`
      );
      return false;
    }
  
    // Adiciona um registro de manutenção
    addMaintenance(t) {
      if (!(t instanceof Maintenance)) {
        console.error(
          `Objeto inválido ao adicionar manutenção: esperado 'Maintenance'.`,
          t
        );
        if (typeof showNotification === "function") {
          showNotification(
            "Erro interno: Tentativa de adicionar manutenção inválida.",
            "error"
          );
        }
        return false;
      }
  
      if (!t.isValid()) {
        console.error(
          `Registro de manutenção inválido para ${this.make} ${this.model}.`,
          t
        );
        if (typeof showNotification === "function") {
          showNotification(
            "Dados de manutenção inválidos (data, tipo ou custo). Registro não adicionado.",
            "error"
          );
        }
        return false;
      }
  
      this.maintenanceHistory.push(t);
      this.sortMaintenanceHistory();
      console.log(
        `Manutenção (${t.type}) adicionada para ${this.make} ${this.model}. Total: ${this.maintenanceHistory.length}`
      );
      return true;
    }
  
    // Retorna lista formatada de manutenções
    getFormattedMaintenanceHistory() {
      if (!this.maintenanceHistory || this.maintenanceHistory.length === 0) {
        return ["Nenhum histórico de manutenção registrado."];
      }
      this.sortMaintenanceHistory();
      return this.maintenanceHistory.map((t) => t.format());
    }
  
    // Retorna compromissos futuros de manutenção
    getFutureAppointments() {
      const t = new Date();
      return this.maintenanceHistory
        .filter(
          (e) => e.date instanceof Date && !isNaN(e.date.getTime()) && e.date > t
        )
        .sort((t, e) => {
          const o = t.date instanceof Date ? t.date.getTime() : Infinity;
          const i = e.date instanceof Date ? e.date.getTime() : Infinity;
          return o - i;
        });
    }
  
    // Serializa o veículo para JSON
    toJSON() {
      return {
        _type: this._type,
        id: this.id,
        make: this.make,
        model: this.model,
        year: this.year,
        status: this.status,
        speed: this.speed,
        maintenanceHistory: this.maintenanceHistory.map((t) => t.toJSON()),
      };
    }
  
    // Reconstrói um veículo a partir de um JSON
    static fromJSON(t) {
      if (!t || !t.make || !t.model || !t.year) {
        console.warn(
          "Vehicle.fromJSON falhou: Dados ausentes ('make', 'model' ou 'year').",
          t
        );
        return null;
      }
  
      try {
        const e = new Vehicle(
          t.make,
          t.model,
          t.year,
          t.id,
          t.status,
          t.speed,
          t.maintenanceHistory || []
        );
        e._type = t._type || "Vehicle";
        return e;
      } catch (e) {
        console.error("Erro ao criar instância de Vehicle via fromJSON:", e, t);
        return null;
      }
    }
  }
  