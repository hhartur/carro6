// Classe Truck (caminhão), estende a classe base Vehicle
class Truck extends Vehicle {
  constructor(t, e, o, i, s, n, r, a, c = 0) { // make, model, year, maxLoad, id, status, speed, maintenanceHistory, currentLoad
    // Chamada do construtor da superclasse Vehicle com os parâmetros adequados
    super(t, e, o, s, n, r, a); // Passa make, model, year, id, status, speed, maintenanceHistory

    // Define o tipo da instância
    this._type = "Truck";

    // Valor padrão de carga máxima: 1000 kg
    this.maxLoad = 1000;

    // Interpreta o parâmetro maxLoad (i)
    const l = parseInt(i);
    if (isNaN(l) || l <= 0) {
      console.warn(
        `Carga máxima inválida (${i}) para ${this.make} ${this.model}. Usando padrão: ${this.maxLoad}kg.`
      );
    } else {
      this.maxLoad = l;
    }

    // Inicializa a carga atual como 0
    this.currentLoad = 0;

    // Interpreta o parâmetro currentLoad (c) (opcional)
    const h = parseInt(c);
    if (isNaN(h) || h < 0) {
      if (h < 0) { // Só avisa se for explicitamente negativo
        console.warn(
          `Carga inicial (${h}kg) para ${this.make} ${this.model} não pode ser negativa. Definida como 0.`
        );
      }
      // Se for NaN ou não fornecido, currentLoad permanece 0 (definido acima)
    } else { // Se for um número >= 0
      this.currentLoad = Math.min(h, this.maxLoad); // Garante que não exceda maxLoad
      if (h > this.maxLoad) {
        console.warn(
          `Carga inicial (${h}kg) excede a carga máxima (${this.maxLoad}kg) para ${this.make} ${this.model}. Ajustada para ${this.maxLoad}kg.`
        );
      }
    }
  }

  // Método para carregar carga no caminhão
  loadCargo(t) {
    const e = parseInt(t);
    if (isNaN(e) || e <= 0) {
      console.warn(`Valor inválido para carga: ${t}`);
      if (typeof showNotification == "function") {
        showNotification(
          "Quantidade de carga para carregar deve ser um número positivo.",
          "error"
        );
      }
      return false;
    }

    if (this.currentLoad + e <= this.maxLoad) {
      this.currentLoad += e;
      console.log(
        `${this.make} ${this.model}: Carregados ${e}kg. Total: ${this.currentLoad}/${this.maxLoad}kg.`
      );
      if (typeof showNotification == "function") {
        showNotification(`+${e}kg carregado. Total: ${this.currentLoad}kg.`, "success");
      }
      return true;
    } else {
      const o = this.maxLoad - this.currentLoad; // Espaço restante
      console.warn(
        `${this.make} ${this.model}: Não foi possível carregar ${e}kg. Excede o limite de ${this.maxLoad}kg. Espaço disponível: ${o}kg.`
      );
      if (typeof showNotification == "function") {
        showNotification(
          `Carga máxima excedida! Só pode carregar mais ${o}kg.`,
          "error"
        );
      }
      return false;
    }
  }

  // Método para descarregar carga do caminhão
  unloadCargo(t) {
    const e = parseInt(t);
    if (isNaN(e) || e <= 0) {
      console.warn(`Valor inválido para descarregar: ${t}`);
      if (typeof showNotification == "function") {
        showNotification(
          "Quantidade de carga para descarregar deve ser um número positivo.",
          "error"
        );
      }
      return false;
    }

    if (e <= this.currentLoad) {
      this.currentLoad -= e;
      console.log(
        `${this.make} ${this.model}: Descarregados ${e}kg. Restante: ${this.currentLoad}/${this.maxLoad}kg.`
      );
      if (typeof showNotification == "function") {
        showNotification(`-${e}kg descarregado. Restante: ${this.currentLoad}kg.`, "success");
      }
      return true;
    } else {
      const o = this.currentLoad; // Carga atual disponível para descarregar
      console.warn(
        `${this.make} ${this.model}: Não é possível descarregar ${e}kg. Carga atual: ${o}kg.`
      );
      if (typeof showNotification == "function") {
        showNotification(
          `Não há ${e}kg para descarregar. Carga atual: ${o}kg.`,
          "error"
        );
      }
      return false;
    }
  }

  // Método para acelerar, levando em conta o peso da carga
  accelerate(t = 8) { // Aceleração base para caminhão
    const e = parseFloat(t);
    if (isNaN(e) || e < 0) {
      console.warn(`Valor inválido de aceleração: ${t}.`);
      return false;
    }

    // Verifica se pode acelerar (motor ligado) usando o método da superclasse
    // Passa 0 para não aplicar a aceleração base de Vehicle ainda.
    if (!super.accelerate(0)) return false;

    // Fator de redução de aceleração baseado na carga
    // Quanto mais carga, menor a aceleração. Fator mínimo de 0.2 (20%).
    let o = 1; // Fator padrão (sem carga)
    if (this.maxLoad > 0) { // Evita divisão por zero se maxLoad for 0
      // Reduz a aceleração proporcionalmente à carga, até um limite.
      // Ex: 50% da carga -> 1 - 0.5 / 1.5 = 1 - 0.33 = 0.67 (67% da aceleração)
      // Ex: 100% da carga -> 1 - 1 / 1.5 = 1 - 0.66 = 0.33 (33% da aceleração)
      o = Math.max(0.2, 1 - (this.currentLoad / (1.5 * this.maxLoad)));
    }

    const i = e * o; // Aceleração efetiva
    console.log(
      `Truck Accelerate: Base=${e.toFixed(1)}, Carga=${this.currentLoad}kg, Fator=${o.toFixed(2)}, Efetivo=${i.toFixed(1)}`
    );

    // Aplica a aceleração efetiva usando o método da superclasse
    return super.accelerate(i);
  }

  // Método para frear, também considerando o peso
  brake(t = 10) { // Frenagem base para caminhão
    const e = parseFloat(t);
    if (isNaN(e) || e <= 0) {
      console.warn(`Valor inválido de frenagem: ${t}.`);
      return false;
    }

    // Verifica se está em movimento para poder frear
    if (this.status !== "moving") return false;

    // Fator de redução de frenagem baseado na carga
    // Quanto mais carga, menor a eficácia da frenagem. Fator mínimo de 0.3 (30%).
    let o = 1;
    if (this.maxLoad > 0) {
      // Ex: 50% da carga -> 1 - 0.5 / 2 = 1 - 0.25 = 0.75 (75% da frenagem)
      // Ex: 100% da carga -> 1 - 1 / 2 = 1 - 0.5 = 0.5 (50% da frenagem)
      o = Math.max(0.3, 1 - (this.currentLoad / (2 * this.maxLoad)));
    }

    const i = e * o; // Frenagem efetiva
    console.log(
      `Truck Brake: Base=${e.toFixed(1)}, Carga=${this.currentLoad}kg, Fator=${o.toFixed(2)}, Efetivo=${i.toFixed(1)}`
    );

    // Aplica a frenagem efetiva usando o método da superclasse
    return super.brake(i);
  }

  // Serializa o objeto para JSON
  toJSON() {
    const t = super.toJSON();
    t.maxLoad = this.maxLoad;
    t.currentLoad = this.currentLoad;
    t._type = "Truck"; // Garante o tipo correto
    return t;
  }

  // Reconstrói um objeto Truck a partir de um JSON
  static fromJSON(t) {
    if (!t || t._type !== "Truck") {
      t && console.warn(`Truck.fromJSON tipo incorreto: ${t._type}`);
      return null;
    }

    // Verifica campos obrigatórios, incluindo maxLoad específico do Truck
    if (!t.make || !t.model || !t.year || t.maxLoad === undefined) {
      console.warn("Truck.fromJSON dados inválidos (faltando make/model/year ou maxLoad):", t);
      return null;
    }

    try {
      const e = new Truck(
        t.make,
        t.model,
        t.year,
        t.maxLoad, // maxLoad é o quarto parâmetro do construtor de Truck
        t.id,
        t.status,
        t.speed,
        t.maintenanceHistory || [],
        t.currentLoad // currentLoad é o último parâmetro
      );
      return e;
    } catch (e) {
      console.error(`Erro ao criar Truck (${t.make} ${t.model}) a partir do JSON:`, e, t);
      return null;
    }
  }
}