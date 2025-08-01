// ARQUIVO ALTERADO: /public/js/models/Truck.js
// O método fromJSON foi refatorado para usar a herança.

class Truck extends Vehicle {
  constructor(t, e, o, i, s, n, r, a, c = 0) {
    super(t, e, o, s, n, r, a);
    this._type = "Truck";
    const l = parseInt(i);
    this.maxLoad = (!isNaN(l) && l > 0) ? l : 1000;
    this.currentLoad = 0;
    const h = parseInt(c);
    if (!isNaN(h) && h >= 0) {
        this.currentLoad = Math.min(h, this.maxLoad);
    }
  }

  loadCargo(t) {
    const e = parseInt(t);
    if (isNaN(e) || e <= 0) { if (typeof showNotification == "function") showNotification("Quantidade inválida.", "error"); return false; }
    if (this.currentLoad + e <= this.maxLoad) {
      this.currentLoad += e;
      if (typeof showNotification == "function") showNotification(`+${e}kg carregado. Total: ${this.currentLoad}kg.`, "success");
      return true;
    } else {
      const o = this.maxLoad - this.currentLoad;
      if (typeof showNotification == "function") showNotification(`Carga máxima excedida! Só pode carregar mais ${o}kg.`, "error");
      return false;
    }
  }

  unloadCargo(t) {
    const e = parseInt(t);
    if (isNaN(e) || e <= 0) { if (typeof showNotification == "function") showNotification("Quantidade inválida.", "error"); return false; }
    if (e <= this.currentLoad) {
      this.currentLoad -= e;
      if (typeof showNotification == "function") showNotification(`-${e}kg descarregado. Restante: ${this.currentLoad}kg.`, "success");
      return true;
    } else {
      if (typeof showNotification == "function") showNotification(`Não há ${e}kg para descarregar.`, "error");
      return false;
    }
  }

  accelerate(t = 8) {
    if (!super.accelerate(0)) return false;
    let o = 1;
    if (this.maxLoad > 0) o = Math.max(0.2, 1 - (this.currentLoad / (1.5 * this.maxLoad)));
    return super.accelerate(t * o);
  }

  brake(t = 10) {
    if (this.status !== "moving") return false;
    let o = 1;
    if (this.maxLoad > 0) o = Math.max(0.3, 1 - (this.currentLoad / (2 * this.maxLoad)));
    return super.brake(t * o);
  }

  toJSON() {
    const t = super.toJSON();
    t.maxLoad = this.maxLoad;
    t.currentLoad = this.currentLoad;
    t._type = "Truck";
    return t;
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