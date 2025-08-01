// ARQUIVO ALTERADO: /public/js/models/Car.js
// O método fromJSON foi simplificado para usar a herança corretamente.

class Car extends Vehicle {
  constructor(t, e, o, i, s, n, r) {
    super(t, e, o, i, s, n, r);
    this._type = "Car";
  }

  toJSON() {
    const t = super.toJSON();
    t._type = "Car";
    return t;
  }

  // MÉTODO ATUALIZADO
  static fromJSON(data) {
    if (!data || data._type !== "Car") {
        data && console.warn(`Car.fromJSON tipo incorreto: ${data._type}`);
        return null;
    }
    // Chama o método fromJSON da classe PAI (Vehicle), que fará todo o trabalho.
    return super.fromJSON.call(this, data);
  }
}