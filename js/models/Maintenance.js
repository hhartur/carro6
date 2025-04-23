// Define a classe Maintenance, que representa um registro de manutenção de veículo
class Maintenance {
    constructor(t, e, o, i = "") {
      // Gera um ID único para a manutenção
      this.id = generateUniqueId();
  
      // Define a data da manutenção como a data atual por padrão
      this.date = new Date();
  
      // Tenta converter a data fornecida (t) para um objeto Date válido
      try {
        const s = new Date(t);
        if (isNaN(s.getTime()))
          throw new Error(`Data inválida fornecida: ${t}`);
        this.date = s;
      } catch (s) {
        console.error("Erro ao interpretar a data de manutenção:", s);
        if (typeof showNotification == "function") {
          showNotification(
            `Data de manutenção inválida: "${t}". Usando data/hora atual como padrão.`,
            "warning",
            5000
          );
        }
      }
  
      // Define o tipo da manutenção como string limpa
      this.type = String(e).trim();
  
      // Inicializa o custo da manutenção como zero
      this.cost = 0;
  
      // Tenta converter o custo fornecido para número float
      const s = parseFloat(o);
      if (isNaN(s) || s < 0) {
        console.warn(
          `Custo de manutenção inválido ou negativo: "${o}". Definido como 0.`
        );
      } else {
        this.cost = s;
      }
  
      // Define a descrição da manutenção
      this.description = String(i).trim();
    }
  
    // Formata os dados da manutenção em uma string legível
    format() {
      const t = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      };
  
      let e = "Data Inválida";
  
      try {
        if (!(this.date instanceof Date) || isNaN(this.date.getTime()))
          throw new Error("Data armazenada é inválida para formatação.");
        e = this.date.toLocaleString("pt-BR", t);
      } catch (t) {
        console.error("Erro ao formatar data da manutenção:", this.date, t);
      }
  
      // Monta a descrição principal
      let o = `${this.type || "Tipo não especificado"} em ${e}`;
  
      // Adiciona o custo formatado em moeda brasileira
      if (isNaN(this.cost) || this.cost <= 0) {
        if (this.cost === 0) o += " - Custo: R$ 0,00";
      } else {
        o += ` - ${this.cost.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}`;
      }
  
      // Adiciona a descrição se existir
      if (this.description) o += ` (${this.description})`;
  
      return o;
    }
  
    // Verifica se os dados da instância são válidos
    isValid() {
      const t = this.date instanceof Date && !isNaN(this.date.getTime());
      const e = typeof this.type === "string" && this.type !== "";
      const o = typeof this.cost === "number" && !isNaN(this.cost) && this.cost >= 0;
  
      if (!t) {
        console.warn("Validação falhou: data inválida.", this);
      }
      if (!e) {
        console.warn("Validação falhou: tipo inválido ou vazio.", this);
      }
      if (!o) {
        console.warn("Validação falhou: custo inválido ou negativo.", this);
      }
  
      return t && e && o;
    }
  
    // Serializa a instância para JSON
    toJSON() {
      return {
        id: this.id,
        date: this.date instanceof Date && !isNaN(this.date.getTime())
          ? this.date.toISOString()
          : null,
        type: this.type,
        cost: this.cost,
        description: this.description,
      };
    }
  
    // Cria uma instância de Maintenance a partir de dados JSON
    static fromJSON(t) {
      if (!t || !t.date || !t.type || t.cost === undefined) {
        console.warn("Estrutura inválida passada para Maintenance.fromJSON:", t);
        return null;
      }
  
      try {
        const e = new Maintenance(t.date, t.type, t.cost, t.description);
  
        // Se houver ID salvo, sobrescreve o gerado
        e.id = t.id || e.id;
  
        // Verifica se a instância gerada é válida
        if (!e.isValid()) {
          console.warn("Instância inválida criada a partir do JSON:", t, e);
          return null;
        }
  
        return e;
      } catch (e) {
        console.error("Erro ao criar instância de Maintenance a partir de JSON:", e, t);
        return null;
      }
    }
  }
  