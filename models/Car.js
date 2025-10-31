// ARQUIVO CORRIGIDO: /public/js/models/Car.js

class Car extends Vehicle {
  constructor(make, model, year, id, status, speed, maintenanceHistory, owner) {
    // Passa todos os parâmetros, incluindo 'owner', para a classe pai Vehicle
    super(make, model, year, id, status, speed, maintenanceHistory, owner);
    this._type = "Car";
  }

  toJSON() {
    const data = super.toJSON();
    data._type = "Car";
    return data;
  }

  static fromJSON(data) {
    if (!data || (data._type !== "Car")) { // SportsCar herda de Car
        data && console.warn(`Car.fromJSON tipo incorreto1: ${data._type}`);
        return null;
    }
    // Chama o método fromJSON da classe PAI (Vehicle), que fará todo o trabalho.
    return super.fromJSON.call(this, data);
  }
}