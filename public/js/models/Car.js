// ARQUIVO ALTERADO: /public/js/models/Car.js
// O método fromJSON foi simplificado para usar a herança corretamente.

class Car extends Vehicle {
  constructor(make, model, year, id, status, speed, maintenanceHistory) {
    super(make, model, year, id, status, speed, maintenanceHistory);
    this._type = "Car";
  }

  toJSON() {
    const data = super.toJSON();
    data._type = "Car";
    return data;
  }

  static fromJSON(data) {
    // Passo 1: O Car valida SEUS PRÓPRIOS dados.
    if (data?._type !== "Car") {
      console.warn(
        `Car.fromJSON foi chamado com o tipo incorreto: ${data?._type}`
      );
      return null;
    }

    // Passo 2: Delegue a construção para o ancestral comum (Vehicle).
    return Vehicle.fromJSON.call(this, data);
  }
}
