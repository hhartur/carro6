class SportsCar extends Car {
  constructor(make, model, year, id, status, speed, maintenanceHistory, owner, turboOn = false) {
    super(make, model, year, id, status, speed, maintenanceHistory, owner); // <-- owner foi adicionado aqui
    this._type = "SportsCar";
    this.turboOn = typeof turboOn === "boolean" ? turboOn : false;
  }

  toggleTurbo() {
    if (this.status === "off") {
      if (typeof showNotification == "function") showNotification(`Ligue o ${this.model} para usar o turbo.`, "warning");
      return false;
    }
    this.turboOn = !this.turboOn;
    const statusMsg = this.turboOn ? "ATIVADO" : "DESATIVADO";
    if (typeof showNotification == "function") showNotification(`Turbo ${statusMsg}!`, this.turboOn ? "success" : "info");
    return true;
  }

  accelerate(val = 15) {
    if (!super.accelerate(0)) return false;
    let effectiveAcceleration = val;
    if (this.turboOn) effectiveAcceleration *= 1.8;
    return super.accelerate(effectiveAcceleration);
  }

  toJSON() {
    const data = super.toJSON();
    data.turboOn = this.turboOn;
    data._type = "SportsCar";
    return data;
  }
  
  static fromJSON(data) {
    if (!data || data._type !== "SportsCar") {
        data && console.warn(`SportsCar.fromJSON tipo incorreto: ${data._type}`);
        return null;
    }
    const vehicle = super.fromJSON.call(this, data);
    if (vehicle) {
        vehicle.turboOn = data.turboOn || false;
    }
    return vehicle;
  }
}