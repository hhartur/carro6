// O método fromJSON foi refatorado para usar a herança.

class Truck extends Vehicle {
  constructor(make, model, year, maxLoad, id, status, speed, maintenanceHistory, currentLoad = 0) {
    super(make, model, year, id, status, speed, maintenanceHistory);
    this._type = "Truck";
    const parsedMaxLoad = parseInt(maxLoad);
    this.maxLoad = (!isNaN(parsedMaxLoad) && parsedMaxLoad > 0) ? parsedMaxLoad : 1000;
    this.currentLoad = 0;
    const parsedCurrentLoad = parseInt(currentLoad);
    if (!isNaN(parsedCurrentLoad) && parsedCurrentLoad >= 0) {
        this.currentLoad = Math.min(parsedCurrentLoad, this.maxLoad);
    }
  }

  loadCargo(val) {
    const amount = parseInt(val);
    if (isNaN(amount) || amount <= 0) { if (typeof showNotification == "function") showNotification("Quantidade inválida.", "error"); return false; }
    if (this.currentLoad + amount <= this.maxLoad) {
      this.currentLoad += amount;
      if (typeof showNotification == "function") showNotification(`+${amount}kg carregado. Total: ${this.currentLoad}kg.`, "success");
      return true;
    } else {
      const availableSpace = this.maxLoad - this.currentLoad;
      if (typeof showNotification == "function") showNotification(`Carga máxima excedida! Só pode carregar mais ${availableSpace}kg.`, "error");
      return false;
    }
  }

  unloadCargo(val) {
    const amount = parseInt(val);
    if (isNaN(amount) || amount <= 0) { if (typeof showNotification == "function") showNotification("Quantidade inválida.", "error"); return false; }
    if (amount <= this.currentLoad) {
      this.currentLoad -= amount;
      if (typeof showNotification == "function") showNotification(`-${amount}kg descarregado. Restante: ${this.currentLoad}kg.`, "success");
      return true;
    } else {
      if (typeof showNotification == "function") showNotification(`Não há ${amount}kg para descarregar.`, "error");
      return false;
    }
  }

  accelerate(val = 8) {
    if (!super.accelerate(0)) return false;
    let factor = 1;
    if (this.maxLoad > 0) factor = Math.max(0.2, 1 - (this.currentLoad / (1.5 * this.maxLoad)));
    return super.accelerate(val * factor);
  }

  brake(val = 10) {
    if (this.status !== "moving") return false;
    let factor = 1;
    if (this.maxLoad > 0) factor = Math.max(0.3, 1 - (this.currentLoad / (2 * this.maxLoad)));
    return super.brake(val * factor);
  }

  toJSON() {
    const data = super.toJSON();
    data.maxLoad = this.maxLoad;
    data.currentLoad = this.currentLoad;
    data._type = "Truck";
    return data;
  }

  // MÉTODO ATUALIZADO
  static fromJSON(data) {
    if (!data || data._type !== "Truck") {
      data && console.warn(`Truck.fromJSON tipo incorreto: ${data._type}`);
      return null;
    }
    // Chama o fromJSON da classe PAI (Vehicle) para criar a base do objeto
    const vehicle = super.fromJSON.call(this, data);
    if (vehicle) {
        // Adiciona as propriedades específicas desta classe
        vehicle.maxLoad = data.maxLoad || 1000;
        vehicle.currentLoad = data.currentLoad || 0;
    }
    return vehicle;
  }
}