require('dotenv').config();
const express = require('express');
const { ProcessQueue } = require('./queue/processQueue');
const { normalizarProcesso, validarOrigem } = require('./services/validationService');

function criarApp({ fila = new ProcessQueue() } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.locals.fila = fila;

  app.post('/api/processos/lote', (req, res) => {
    let origem;
    try {
      origem = validarOrigem(req.body);
      if (!Array.isArray(req.body.processos) || !req.body.processos.length) {
        throw new Error('processos deve ser um array não vazio.');
      }
    } catch (error) { return res.status(400).json({ sucesso: false, mensagem: error.message }); }
    const resposta = { adicionados: [], duplicados: [], invalidos: [], erros: [], itens: [] };
    const validos = [];
    req.body.processos.forEach((valor, indice) => {
      try { validos.push(normalizarProcesso(valor)); }
      catch (error) {
        resposta.invalidos.push(valor);
        resposta.erros.push({ indice, mensagem: error.message });
      }
    });
    if (!validos.length) return res.status(400).json({ ...resposta, mensagem: 'Nenhum processo válido no lote.' });
    for (const processo of validos) {
      const { adicionado, item } = fila.adicionarNormal({ ...origem, processo });
      resposta[adicionado ? 'adicionados' : 'duplicados'].push(processo);
      resposta.itens.push({ id: item.id, processo, status: item.status, prioridade: item.prioridade });
    }
    return res.status(202).json(resposta);
  });

  app.post('/api/processos/consulta', (req, res) => {
    let dados;
    try { dados = { ...validarOrigem(req.body), processo: normalizarProcesso(req.body.processo) }; }
    catch (error) { return res.status(400).json({ sucesso: false, mensagem: error.message }); }
    const { adicionado, item } = fila.adicionarAlta(dados);
    return res.status(202).json({
      sucesso: true, id: item.id, processo: item.processo, status: item.status,
      prioridade: item.prioridade, duplicado: !adicionado,
    });
  });

  app.get('/api/fila/status', (req, res) => res.json(fila.status()));
  app.use((error, req, res, next) => {
    const status = error.type === 'entity.too.large' ? 413 : error.status === 400 ? 400 : 500;
    res.status(status).json({ sucesso: false, mensagem: status === 413 ? 'Payload excede 1 MB.' : status === 400 ? 'JSON inválido.' : 'Erro interno.' });
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT deve estar entre 1 e 65535.');
  criarApp().listen(port, '127.0.0.1', () => console.log(`[API] http://127.0.0.1:${port}`));
}

module.exports = { criarApp };
