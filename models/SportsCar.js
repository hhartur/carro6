// ARQUIVO ALTERADO: /public/js/models/SportsCar.js
// O método fromJSON foi refatorado para usar a herança.

class SportsCar extends Car {
  constructor(t, e, o, i, s, n, r, a = false) {
    super(t, e, o, i, s, n, r);
    this._type = "SportsCar";
    this.turboOn = typeof a === "boolean" ? a : false;
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

  accelerate(t = 15) {
    if (!super.accelerate(0)) return false; // Apenas verifica se pode acelerar
    let o = t;
    if (this.turboOn) o *= 1.8;
    return super.accelerate(o);
  }

  toJSON() {
    const t = super.toJSON();
    t.turboOn = this.turboOn;
    t._type = "SportsCar";
    return t;
  }

  // MÉTODO ATUALIZADO
  static fromJSON(data) {
    if (!data || data._type !== "SportsCar") {
        data && console.warn(`SportsCar.fromJSON tipo incorreto: ${data._type}`);
        return null;
    }
    // Chama o fromJSON da classe PAI (Vehicle) para criar a base do objeto
    const vehicle = super.fromJSON.call(this, data);
    if (vehicle) {
        // Adiciona a propriedade específica desta classe
        vehicle.turboOn = data.turboOn || false;
    }
    return vehicle;
  }
}