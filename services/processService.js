const fs = require('node:fs/promises');
const path = require('node:path');
const { normalizarProcesso } = require('./validationService');

// Carregamento tardio permite testar a API sem carregar ou iniciar Playwright.
function criarConsulta({ automacao, env = process.env, diretorio = path.resolve('Evidencias/CE') } = {}) {
  return async function consultarProcesso(numeroProcesso) {
    const processo = normalizarProcesso(numeroProcesso);
    const autoCeara = automacao || require('../Automations/Auto_Ceara');
    await autoCeara([processo], env.HISTORICO);
    const pasta = path.join(diretorio, processo);
    const andamento = JSON.parse(await fs.readFile(path.join(pasta, 'Andamento.json'), 'utf8'));
    const historico = JSON.parse(await fs.readFile(path.join(pasta, 'Historico.json'), 'utf8'));
    return { andamento, historico };
  };
}

module.exports = { criarConsulta, consultarProcesso: criarConsulta() };
