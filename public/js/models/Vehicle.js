// ARQUIVO ALTERADO: /public/js/models/Vehicle.js
// O método fromJSON foi refinado para ser a base para as subclasses.

class Vehicle {
  constructor(
    make,
    model,
    year,
    id = generateUniqueId(),
    status = "off",
    speed = 0,
    maintenanceHistory = [],
    owner = null
  ) {
    if (
      !make ||
      !String(make).trim() ||
      !model ||
      !String(model).trim() ||
      !year
    )
      throw new Error("Vehicle constructor requer 'make', 'model' e 'year'.");

    this.id = id;
    this.make = String(make).trim();
    this.model = String(model).trim();
    this.year = parseInt(year);
    const currentYear = new Date().getFullYear();
    if (isNaN(this.year) || this.year < 1886 || this.year > currentYear + 2)
      this.year = currentYear;

    this.status = ["off", "on", "moving"].includes(status) ? status : "off";
    this.speed = this.status === "off" ? 0 : parseFloat(speed) || 0;

    this.maintenanceHistory = Array.isArray(maintenanceHistory)
      ? maintenanceHistory.map((m) => Maintenance.fromJSON(m)).filter(Boolean)
      : [];
    this.sortMaintenanceHistory();

    this._type = "Vehicle";
    this.owner = owner; // <-- ADICIONADO: Armazena a informação do dono

    // Inicializa os dados "externos" com valores padrão.
    this.valorFipeEstimado = null;
    this.recallPendente = false;
    this.ultimaRevisaoRecomendadaKm = null;
    this.dicaManutencao = "";
  }

  sortMaintenanceHistory() {
    this.maintenanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  start() {
    if (this.status === "off") {
      this.status = "on";
      this.speed = 0;
      return true;
    }
    return false;
  }
  stop() {
    if (this.status === "off") return false;
    if (this.speed > 0) {
      if (typeof showNotification === "function")
        showNotification(`Freie o ${this.model} antes de desligar!`, "error");
      return false;
    }
    this.status = "off";
    this.speed = 0;
    return true;
  }
  accelerate(val = 10) {
    const amount = parseFloat(val);
    if (isNaN(amount) || amount < 0) return false;
    if (this.status === "on" || this.status === "moving") {
      if (this.status === "on" && amount > 0) this.status = "moving";
      this.speed += amount;
      return true;
    }
    if (typeof showNotification === "function")
      showNotification(`Ligue o ${this.model} para acelerar.`, "warning");
    return false;
  }
  brake(val = 15) {
    const amount = parseFloat(val);
    if (isNaN(amount) || amount <= 0) return false;
    if (this.status === "moving") {
      this.speed -= amount;
      if (this.speed <= 0) {
        this.speed = 0;
        this.status = "on";
        if (typeof showNotification === "function")
          showNotification(`${this.model} parou.`, "info");
      }
      return true;
    }
    return false;
  }
  addMaintenance(maint) {
    if (!(maint instanceof Maintenance) || !maint.isValid()) return false;
    this.maintenanceHistory.push(maint);
    this.sortMaintenanceHistory();
    return true;
  }
  getFutureAppointments() {
    const now = new Date();
    return this.maintenanceHistory
      .filter((m) => m.date > now)
      .sort((a, b) => a.date - b.date);
  }
  getFormattedMaintenanceHistory() {
    if (!this.maintenanceHistory || this.maintenanceHistory.length === 0)
      return ["Nenhum histórico."];
    return this.maintenanceHistory.map((m) => m.format());
  }

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
      valorFipeEstimado: this.valorFipeEstimado,
      recallPendente: this.recallPendente,
      ultimaRevisaoRecomendadaKm: this.ultimaRevisaoRecomendadaKm,
      dicaManutencao: this.dicaManutencao,
      owner: this.owner, // <-- ADICIONADO: Inclui o dono na serialização
      isPublic: this.isPublic,
    };
  }

  static fromJSON(data) {
    if (!data || !data.make || !data.model || !data.year) {
      console.warn("Vehicle.fromJSON falhou: Dados base ausentes.", data);
      return null;
    }
    try {
      const vehicle = new this(
        data.make,
        data.model,
        data.year,
        data.id,
        data.status,
        data.speed,
        data.maintenanceHistory,
        data.owner
      );

      vehicle.valorFipeEstimado = data.valorFipeEstimado;
      vehicle.recallPendente = data.recallPendente;
      vehicle.ultimaRevisaoRecomendadaKm = data.ultimaRevisaoRecomendadaKm;
      vehicle.dicaManutencao = data.dicaManutencao;
      vehicle.isPublic = data.isPublic;

      return vehicle;
    } catch (e) {
      console.error(
        "Erro ao criar instância de Vehicle via fromJSON:",
        e,
        data
      );
      return null;
    }
  }
}
