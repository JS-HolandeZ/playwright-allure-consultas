const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { criarConsulta } = require('../../services/processService');

test('adaptador chama lista unitária, preserva HISTORICO e lê resultados somente após sucesso', async t => {
  const diretorio = await fs.mkdtemp(path.join(os.tmpdir(), 'consulta-api-'));
  t.after(() => fs.rm(diretorio, { recursive: true, force: true }));
  const processo = '02012637720228060064';
  const consultar = criarConsulta({ diretorio, env: { HISTORICO: 'true' }, automacao: async (lista, historico) => {
    assert.deepEqual(lista, [processo]);
    assert.equal(historico, 'true');
    const pasta = path.join(diretorio, processo);
    await fs.mkdir(pasta);
    await fs.writeFile(path.join(pasta, 'Andamento.json'), JSON.stringify('movimentação'));
    await fs.writeFile(path.join(pasta, 'Historico.json'), '[]');
  } });
  assert.deepEqual(await consultar(processo), { andamento: 'movimentação', historico: [] });
  const falhar = criarConsulta({ diretorio, automacao: async () => { throw new Error('falha simulada'); } });
  await assert.rejects(falhar(processo), /falha simulada/);
});
