const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ProcessQueue } = require('../../queue/processQueue');
const { enviarCallback } = require('../../services/callbackService');
const logger = { log() {}, error() {} };
const cnj = n => String(n).padStart(20, '0');
const turno = () => new Promise(resolve => setImmediate(resolve));

test('worker único: prioridade, não interrupção, deduplicação e continuidade após erro', async () => {
  const ordem = [];
  let liberar;
  let simultaneos = 0;
  let maximo = 0;
  const fila = new ProcessQueue({ logger, consultar: async processo => {
    simultaneos++;
    maximo = Math.max(maximo, simultaneos);
    ordem.push(processo);
    try {
      if (ordem.length === 1) await new Promise(resolve => { liberar = resolve; });
      if (processo === cnj(2)) throw new Error('erro simulado');
      return { ok: true };
    } finally { simultaneos--; }
  } });
  const primeiro = fila.adicionarNormal({ sistema: 'a', processo: cnj(1) }).item;
  const segundo = fila.adicionarNormal({ sistema: 'a', processo: cnj(2) }).item;
  fila.adicionarNormal({ sistema: 'a', processo: cnj(3) });
  assert.equal(fila.status().prioridade_normal, 3);
  await turno();
  assert.equal(primeiro.status, 'processando');
  assert.equal(fila.adicionarAlta({ sistema: 'a', processo: cnj(1) }).adicionado, false);
  assert.equal(fila.adicionarNormal({ sistema: 'a', processo: cnj(2) }).adicionado, false);
  fila.adicionarAlta({ sistema: 'b', processo: cnj(1) });
  assert.equal(fila.status().prioridade_alta, 1);
  assert.deepEqual(ordem, [cnj(1)]);
  liberar();
  await fila.worker;
  assert.deepEqual(ordem, [cnj(1), cnj(1), cnj(2), cnj(3)]);
  assert.equal(maximo, 1);
  assert.equal(segundo.status, 'erro');
  assert.equal(fila.processando, null);
  assert.equal(fila.resultados.size, 4);
  assert.equal(fila.adicionarNormal({ sistema: 'a', processo: cnj(1) }).adicionado, true);
  await fila.worker;
});

test('callback com erro não altera sucesso/erro da consulta nem para a fila; retenção limitada', async () => {
  let callbacks = 0;
  const fila = new ProcessQueue({ logger, limiteResultados: 2,
    consultar: async processo => { if (processo === cnj(2)) throw new Error(); return {}; },
    callback: async () => { callbacks++; throw new Error('token secreto'); },
  });
  const a = fila.adicionarNormal({ sistema: 'a', processo: cnj(1), callback_url: 'https://example.com' }).item;
  const b = fila.adicionarNormal({ sistema: 'a', processo: cnj(2), callback_url: 'https://example.com' }).item;
  const c = fila.adicionarNormal({ sistema: 'a', processo: cnj(3) }).item;
  await fila.worker;
  assert.equal(a.status, 'concluido');
  assert.equal(b.status, 'erro');
  assert.equal(a.callback_status, 'erro');
  assert.equal(c.status, 'concluido');
  assert.equal(callbacks, 2);
  assert.equal(fila.resultados.size, 2);
  assert.equal(fila.processando, null);
});

test('callback: omissão, POST, HTTP de erro e timeout, sem rede externa', async () => {
  await enviarCallback({}, { fetchImpl: () => { throw new Error('Não deveria chamar'); } });
  const item = { id: 'id', sistema: 'a', processo: cnj(1), status: 'concluido', resultado: {}, callback_url: 'https://example.com' };
  await enviarCallback(item, { fetchImpl: async (url, options) => {
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).id, 'id');
    assert.equal(options.redirect, 'error');
    return { ok: true };
  } });
  await assert.rejects(enviarCallback(item, { fetchImpl: async () => ({ ok: false, status: 500 }) }), /HTTP 500/);
  // Mantém o event loop ativo enquanto o AbortSignal de teste expira.
  const timer = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(enviarCallback(item, { timeoutMs: 5, fetchImpl: (url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }) }), { name: 'TimeoutError' });
  } finally { clearTimeout(timer); }
});
