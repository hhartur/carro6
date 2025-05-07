// Define a classe Car que herda da classe Vehicle
class Car extends Vehicle {
  // Construtor da classe Car
  constructor(t, e, o, i, s, n, r) {
    // Chama o construtor da superclasse (Vehicle) com os mesmos parâmetros
    super(t, e, o, i, s, n, r);

    // Define o tipo da instância como "Car"
    this._type = "Car";
  }

  // Método que converte a instância do carro para JSON
  toJSON() {
    // Chama o método toJSON da superclasse e armazena o resultado
    const t = super.toJSON();

    // Adiciona ou sobrescreve a propriedade _type no JSON com o valor "Car"
    t._type = "Car";

    // Retorna o objeto JSON resultante
    return t;
  }

  // Método estático para criar uma instância de Car a partir de um objeto JSON
  static fromJSON(t) {
    // Verifica se o tipo (_type) é "Car", caso contrário, exibe um aviso e retorna null
    if (!t || "Car" !== t._type) {
      t && console.warn(`Car.fromJSON tipo incorreto: ${t._type}`);
      return null;
    }

    // Verifica se os dados essenciais (make, model, year) estão presentes
    if (!t.make || !t.model || !t.year) {
      console.warn("Car.fromJSON dados base inválidos:", t);
      return null;
    }

    try {
      // Cria uma nova instância de Car usando os dados do objeto JSON
      // Os parâmetros são passados na ordem esperada pelo construtor de Car (que é o mesmo de Vehicle)
      const e = new Car(
        t.make,                  // marca
        t.model,                 // modelo
        t.year,                  // ano
        t.id,                    // identificador (pode ser undefined, o construtor de Vehicle gera um)
        t.status,                // status atual (pode ser undefined, construtor de Vehicle tem default)
        t.speed,                 // velocidade (pode ser undefined, construtor de Vehicle tem default)
        t.maintenanceHistory     // histórico de manutenção (pode ser undefined, construtor de Vehicle tem default)
      );

      // Retorna a nova instância criada
      return e;
    } catch (e) {
      // Em caso de erro durante a instanciação, exibe mensagem de erro e retorna null
      console.error(
        `Erro ao criar Car (${t.make} ${t.model}) a partir do JSON:`,
        e,
        t
      );
      return null;
    }
  }
}