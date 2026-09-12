const { test } = require('node:test');
const assert = require('node:assert/strict');
const { criarApp } = require('../../server');
const { ProcessQueue } = require('../../queue/processQueue');

test('HTTP: aceite imediato, lote parcial, validações, duplicação e status', async t => {
  let liberar;
  const bloqueio = new Promise(resolve => { liberar = resolve; });
  const fila = new ProcessQueue({ logger: { log() {}, error() {} }, consultar: async () => { await bloqueio; return {}; } });
  const server = criarApp({ fila }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { liberar(); await fila.worker; await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (route, body) => {
    const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(2000) });
    return { status: response.status, body: await response.json() };
  };
  const manual = '/api/processos/consulta';
  const lote = '/api/processos/lote';
  const processo = '02012637720228060064';
  const a = await post(manual, { sistema: 'a', processo: '0201263-77.2022.8.06.0064' });
  assert.equal(a.status, 202);
  assert.equal(a.body.status, 'pendente');
  assert.equal(a.body.prioridade, 'alta');
  assert.equal(a.body.processo, processo);
  assert.equal(fila.resultados.size, 0); // Automação ainda bloqueada quando HTTP retorna.
  const repetido = await post(manual, { sistema: 'a', processo });
  assert.equal(repetido.body.id, a.body.id);
  assert.equal(repetido.body.duplicado, true);
  const b = await post(lote, { sistema: 'a', processos: [processo, '30005904820238060010', '123', 123] });
  assert.equal(b.status, 202);
  assert.deepEqual(b.body.adicionados, ['30005904820238060010']);
  assert.deepEqual(b.body.duplicados, [processo]);
  assert.deepEqual(b.body.invalidos, ['123', 123]);
  assert.equal((await post(manual, { sistema: 'b', processo })).body.duplicado, false);
  const status = await (await fetch(base + '/api/fila/status')).json();
  assert.equal(status.total_pendente, 2);
  assert.equal(status.prioridade_alta, 1);
  assert.equal(status.prioridade_normal, 1);
  for (const body of [{}, { sistema: '', processo }, { sistema: 'a' }, { sistema: 'a', processo: 123 }, { sistema: 'a', processo: '123' }, { sistema: 'a', processo, callback_url: 'ftp://example.com' }, { sistema: 'a', processo, callback_url: 123 }, { sistema: 'a', processo, callback_url: 'https://user:pass@example.com' }]) {
    assert.equal((await post(manual, body)).status, 400);
  }
  for (const processos of [[], '123', ['123'], [123], null]) assert.equal((await post(lote, { sistema: 'a', processos })).status, 400);
  const malformed = await fetch(base + manual, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).mensagem, 'JSON inválido.');
});
