// ARQUIVO ALTERADO: /public/js/models/SportsCar.js
// O método fromJSON foi refatorado para usar a herança.

class SportsCar extends Car {
  constructor(
    make,
    model,
    year,
    id,
    status,
    speed,
    maintenanceHistory,
    turboOn = false
  ) {
    super(make, model, year, id, status, speed, maintenanceHistory);
    this._type = "SportsCar";
    this.turboOn = typeof turboOn === "boolean" ? turboOn : false;
  }

  toggleTurbo() {
    if (this.status === "off") {
      if (typeof showNotification == "function")
        showNotification(`Ligue o ${this.model} para usar o turbo.`, "warning");
      return false;
    }
    this.turboOn = !this.turboOn;
    const statusMsg = this.turboOn ? "ATIVADO" : "DESATIVADO";
    if (typeof showNotification == "function")
      showNotification(
        `Turbo ${statusMsg}!`,
        this.turboOn ? "success" : "info"
      );
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

  // MÉTODO ATUALIZADO
  static fromJSON(data) {
    // Passo 1: O SportsCar valida SEUS PRÓPRIOS dados.
    if (data?._type !== "SportsCar") {
      console.warn(
        `SportsCar.fromJSON foi chamado com o tipo incorreto: ${data?._type}`
      );
      return null;
    }

    // Passo 2: Chame a lógica de construção do ancestral comum (Vehicle).
    // Não use 'super.fromJSON()', pois isso chamaria Car.fromJSON.
    // Chame explicitamente o método de Vehicle, passando 'this' para que
    // ele saiba que deve criar um 'new SportsCar(...)'.
    return Vehicle.fromJSON.call(this, data);
  }
}
