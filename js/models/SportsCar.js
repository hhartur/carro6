// Define a classe SportsCar, que herda da classe Car
class SportsCar extends Car {
    // Construtor recebe os mesmos parâmetros de Car, com um adicional: 'turboOn'
    constructor(t, e, o, i, s, n, r, a = false) {
      // Chama o construtor da classe Car (superclasse)
      super(t, e, o, i, s, n, r);
  
      // Define o tipo do objeto como "SportsCar"
      this._type = "SportsCar";
  
      // Define se o modo turbo está ativado ou não (valor booleano)
      this.turboOn = typeof a == "boolean" ? a : false;
    }
  
    // Método para alternar o modo turbo (liga/desliga)
    toggleTurbo() {
      // Não permite ativar o turbo se o carro estiver desligado
      if (this.status === "off") {
        console.warn(`Não é possível ativar o turbo em ${this.make} ${this.model}: motor desligado.`);
        if (typeof showNotification == "function") {
          showNotification(`Ligue o ${this.model} para usar o turbo.`, "warning");
        }
        return false;
      }
  
      // Inverte o estado do turbo
      this.turboOn = !this.turboOn;
  
      const status = this.turboOn ? "ATIVADO" : "DESATIVADO";
      console.log(`${this.make} ${this.model}: Turbo ${status}.`);
  
      // Mostra notificação (se disponível)
      const level = this.turboOn ? "success" : "info";
      if (typeof showNotification == "function") {
        showNotification(
          `Turbo ${status}! ${this.turboOn ? "🚀 Pronto para acelerar!" : ""}`,
          level
        );
      }
  
      return true;
    }
  
    // Método para acelerar o carro
    accelerate(t = 15) {
      const e = parseFloat(t);
  
      // Verifica se o valor passado é válido
      if (isNaN(e) || e < 0) {
        console.warn(`Valor de aceleração inválido para SportsCar: ${t}.`);
        return false;
      }
  
      // Garante que o carro possa acelerar (usando o método da classe pai)
      if (!super.accelerate(0)) return false;
  
      // Calcula aceleração com ou sem turbo
      let o = e;
      if (this.turboOn) {
        o *= 1.8; // Turbo aumenta aceleração em 80%
        console.log(
          `%c>> TURBO BOOST Ativado em ${this.model}! Aceleração efetiva: ${o.toFixed(1)} km/h`,
          "color: #f97316; font-weight: bold; background-color: #333; padding: 2px 5px; border-radius: 3px;"
        );
      }
  
      // Aplica aceleração real
      const i = super.accelerate(o);
      return i;
    }
  
    // Serializa o objeto para JSON
    toJSON() {
      const t = super.toJSON();
  
      // Adiciona o estado do turbo e redefine o tipo
      t.turboOn = this.turboOn;
      t._type = "SportsCar";
  
      return t;
    }
  
    // Constrói uma instância de SportsCar a partir de JSON
    static fromJSON(t) {
      // Verifica o tipo do objeto
      if (!t || t._type !== "SportsCar") {
        t && console.warn(`SportsCar.fromJSON tipo errado: ${t._type}`);
        return null;
      }
  
      // Verifica campos obrigatórios
      if (!t.make || !t.model || !t.year) {
        console.warn("SportsCar.fromJSON dados base inválidos:", t);
        return null;
      }
  
      try {
        // Cria nova instância usando os dados fornecidos
        const e = new SportsCar(
          t.make,                        // Marca
          t.model,                       // Modelo
          t.year,                        // Ano
          t.id,                          // ID único
          t.status,                      // Status do veículo
          t.speed,                       // Velocidade atual
          t.maintenanceHistory || [],   // Histórico de manutenção
          t.turboOn || false            // Estado do turbo
        );
  
        return e;
      } catch (e) {
        console.error(`Erro ao criar SportsCar (${t.make} ${t.model}) a partir do JSON:`, e, t);
        return null;
      }
    }
  }
  