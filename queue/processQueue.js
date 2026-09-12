const { randomUUID } = require('node:crypto');
const { consultarProcesso } = require('../services/processService');
const { enviarCallback } = require('../services/callbackService');

// Uma instância, um worker. Estado volátil: reiniciar o Node perde toda a fila.
class ProcessQueue {
  constructor({ consultar = consultarProcesso, callback = enviarCallback, logger = console, limiteResultados = 1000 } = {}) {
    this.filaAlta = [];
    this.filaNormal = [];
    this.processando = null;
    this.ativos = new Map();
    this.resultados = new Map();
    this.consultar = consultar;
    this.callback = callback;
    this.logger = logger;
    this.limiteResultados = limiteResultados;
    this.worker = null;
  }

  chave(item) { return JSON.stringify([item.sistema, item.processo]); }
  adicionarAlta(dados) { return this.adicionar(dados, 'alta', 'manual'); }
  adicionarNormal(dados) { return this.adicionar(dados, 'normal', 'lote'); }

  adicionar(dados, prioridade, tipo) {
    const chave = this.chave(dados);
    if (this.ativos.has(chave)) return { adicionado: false, item: this.ativos.get(chave) };
    const item = { ...dados, id: randomUUID(), prioridade, tipo, status: 'pendente', criado_em: new Date().toISOString() };
    this.ativos.set(chave, item);
    (prioridade === 'alta' ? this.filaAlta : this.filaNormal).push(item);
    this.logger.log(`[FILA] Adicionado processo ${item.processo}`);
    this.iniciarProcessamento();
    return { adicionado: true, item };
  }

  proximo() { return this.filaAlta.shift() || this.filaNormal.shift(); }

  iniciarProcessamento() {
    if (this.worker) return this.worker;
    // Adia o início para permitir que o HTTP devolva o aceite primeiro.
    this.worker = new Promise(resolve => setImmediate(resolve))
      .then(() => this.executar())
      .finally(() => {
        this.worker = null;
        if (this.filaAlta.length || this.filaNormal.length) this.iniciarProcessamento();
      });
    return this.worker;
  }

  async executar() {
    let item;
    while ((item = this.proximo())) {
      this.processando = item;
      item.status = 'processando';
      item.iniciado_em = new Date().toISOString();
      this.logger.log(`[FILA] Iniciando processo ${item.processo}`);
      try {
        item.resultado = await this.consultar(item.processo);
        item.status = 'concluido';
        this.logger.log(`[FILA] Processo concluído ${item.processo}`);
      } catch {
        item.status = 'erro';
        // Mensagens de bibliotecas podem conter URLs, tokens ou conteúdo de página.
        item.erro = 'Falha ao consultar o processo.';
        this.logger.error(`[FILA] Processo falhou ${item.processo}`);
      } finally {
        item.finalizado_em = new Date().toISOString();
        this.ativos.delete(this.chave(item));
        this.resultados.set(item.id, item);
        while (this.resultados.size > this.limiteResultados) this.resultados.delete(this.resultados.keys().next().value);
        try {
          if (item.callback_url) {
            await this.callback(item);
            item.callback_status = 'enviado';
            this.logger.log(`[FILA] Callback enviado ${item.processo}`);
          }
        } catch {
          item.callback_status = 'erro';
          item.callback_erro = 'Falha ao enviar callback.';
          this.logger.error(`[FILA] Callback falhou ${item.processo}`);
        } finally {
          this.processando = null;
        }
      }
    }
  }

  status() {
    const item = this.processando;
    return {
      processando: item ? { id: item.id, processo: item.processo, sistema: item.sistema, status: item.status } : null,
      prioridade_alta: this.filaAlta.length,
      prioridade_normal: this.filaNormal.length,
      total_pendente: this.filaAlta.length + this.filaNormal.length,
    };
  }
}

module.exports = { ProcessQueue };
