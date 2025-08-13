/**
 * ARQUIVO REATORADO: /public/js/models/Vehicle.js
 *
 * MUDANÇA PRINCIPAL: O construtor agora aceita um único objeto de dados
 * ({ make, model, year, ... }) em vez de uma longa lista de parâmetros.
 *
 * PORQUÊ: Isso elimina a fragilidade da ordem dos parâmetros, tornando o código
 * mais seguro, legível e fácil de estender no futuro.
 */
class Vehicle {
  /**
   * O construtor agora usa desestruturação de objeto.
   * A ordem dos parâmetros no objeto não importa, e os valores padrão
   * são definidos de forma limpa.
   */
  constructor({
    make,
    model,
    year,
    id = generateUniqueId(),
    status = "off",
    speed = 0,
    maintenanceHistory = [],
    owner = null,
    isPublic = false,
    valorFipeEstimado = null,
    recallPendente = false,
    ultimaRevisaoRecomendadaKm = null,
    dicaManutencao = "",
  }) {
    // 1. Validação dos dados essenciais
    if (!make || !model || !year) {
      throw new Error("Vehicle constructor requer 'make', 'model' e 'year'.");
    }

    // 2. Atribuição das propriedades principais
    this.id = id;
    this.make = String(make).trim();
    this.model = String(model).trim();

    // 3. Lógica de validação e parse do ano
    this.year = parseInt(year);
    const currentYear = new Date().getFullYear();
    if (isNaN(this.year) || this.year < 1886 || this.year > currentYear + 2) {
      this.year = currentYear;
    }

    // 4. Lógica de validação de status e velocidade
    this.status = ["off", "on", "moving"].includes(status) ? status : "off";
    this.speed = this.status === "off" ? 0 : parseFloat(speed) || 0;

    // 5. Reconstrução segura do histórico de manutenção
    this.maintenanceHistory = Array.isArray(maintenanceHistory)
      ? maintenanceHistory.map((m) => Maintenance.fromJSON(m)).filter(Boolean)
      : [];
    this.sortMaintenanceHistory();

    // 6. Atribuição das demais propriedades
    this._type = "Vehicle"; // Será sobrescrito pelas subclasses
    this.owner = owner;
    this.isPublic = isPublic;

    // 7. Inicialização dos dados "externos"
    this.valorFipeEstimado = valorFipeEstimado;
    this.recallPendente = recallPendente;
    this.ultimaRevisaoRecomendadaKm = ultimaRevisaoRecomendadaKm;
    this.dicaManutencao = dicaManutencao;
  }

  // --- MÉTODOS DE INSTÂNCIA (Nenhuma mudança necessária aqui) ---

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

  // --- SERIALIZAÇÃO (Nenhuma mudança necessária aqui) ---

  toJSON() {
    // Este método continua funcionando perfeitamente.
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
      owner: this.owner,
      isPublic: this.isPublic,
    };
  }

  // --- MÉTODO ESTÁTICO DE RECONSTRUÇÃO (Agora simplificado) ---

  /**
   * O método fromJSON agora é muito mais simples.
   * Ele apenas passa o objeto de dados para o construtor da classe correta.
   * O `new this(data)` garante que se for chamado por `Truck.fromJSON`,
   * ele executará `new Truck(data)`.
   */
  static fromJSON(data) {
    if (!data || !data.make || !data.model || !data.year) {
      console.warn("Vehicle.fromJSON falhou: Dados base ausentes.", data);
      return null;
    }
    try {
      // A mágica acontece aqui: `new this()` cria uma instância da subclasse
      // (Car, Truck, etc.) e o construtor dela faz todo o trabalho.
      return new this(data);
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