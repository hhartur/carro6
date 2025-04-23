// Classe Truck (caminhão), estende a classe base Vehicle
class Truck extends Vehicle {
    constructor(t, e, o, i, s, n, r, a, c = 0) {
      // Chamada do construtor da superclasse Vehicle com os parâmetros adequados
      super(t, e, o, s, n, r, a);
  
      // Define o tipo da instância
      this._type = "Truck";
  
      // Valor padrão de carga máxima: 1000 kg
      this.maxLoad = 1000;
  
      // Interpreta o parâmetro maxLoad
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
  
      // Interpreta o parâmetro currentLoad (opcional)
      const h = parseInt(c);
      if (isNaN(h) || h < 0) {
        if (h < 0) {
          console.warn(
            `Carga inicial (${h}kg) para ${this.make} ${this.model} não pode ser negativa. Definida como 0.`
          );
        }
      } else {
        this.currentLoad = Math.min(h, this.maxLoad);
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
        const o = this.maxLoad - this.currentLoad;
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
        const o = this.currentLoad;
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
    accelerate(t = 8) {
      const e = parseFloat(t);
      if (isNaN(e) || e < 0) {
        console.warn(`Valor inválido de aceleração: ${t}.`);
        return false;
      }
  
      if (!super.accelerate(0)) return false;
  
      // Quanto mais carga, menor a aceleração
      let o = 1;
      if (this.maxLoad > 0) {
        o = Math.max(0.2, 1 - this.currentLoad / (1.5 * this.maxLoad));
      }
  
      const i = e * o;
      console.log(
        `Truck Accelerate: Base=${e.toFixed(1)}, Carga=${this.currentLoad}kg, Fator=${o.toFixed(2)}, Efetivo=${i.toFixed(1)}`
      );
  
      return super.accelerate(i);
    }
  
    // Método para frear, também considerando o peso
    brake(t = 10) {
      const e = parseFloat(t);
      if (isNaN(e) || e <= 0) {
        console.warn(`Valor inválido de frenagem: ${t}.`);
        return false;
      }
  
      if (this.status !== "moving") return false;
  
      let o = 1;
      if (this.maxLoad > 0) {
        o = Math.max(0.3, 1 - this.currentLoad / (2 * this.maxLoad));
      }
  
      const i = e * o;
      console.log(
        `Truck Brake: Base=${e.toFixed(1)}, Carga=${this.currentLoad}kg, Fator=${o.toFixed(2)}, Efetivo=${i.toFixed(1)}`
      );
  
      return super.brake(i);
    }
  
    // Serializa o objeto para JSON
    toJSON() {
      const t = super.toJSON();
      t.maxLoad = this.maxLoad;
      t.currentLoad = this.currentLoad;
      t._type = "Truck";
      return t;
    }
  
    // Reconstrói um objeto Truck a partir de um JSON
    static fromJSON(t) {
      if (!t || t._type !== "Truck") {
        t && console.warn(`Truck.fromJSON tipo incorreto: ${t._type}`);
        return null;
      }
  
      if (!t.make || !t.model || !t.year || t.maxLoad === undefined) {
        console.warn("Truck.fromJSON dados inválidos (faltando make/model/year/maxLoad):", t);
        return null;
      }
  
      try {
        const e = new Truck(
          t.make,
          t.model,
          t.year,
          t.maxLoad,
          t.id,
          t.status,
          t.speed,
          t.maintenanceHistory || [],
          t.currentLoad
        );
        return e;
      } catch (e) {
        console.error(`Erro ao criar Truck (${t.make} ${t.model}) a partir do JSON:`, e, t);
        return null;
      }
    }
  }
  