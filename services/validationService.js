function normalizarProcesso(valor) {
  if (typeof valor !== 'string') throw new Error('O número do processo deve ser string.');
  const processo = valor.replace(/\D/g, '');
  if (!/^\d{20}$/.test(processo)) throw new Error('O CNJ deve possuir 20 dígitos após normalização.');
  return processo;
}

function validarOrigem(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Envie um objeto JSON.');
  if (typeof body.sistema !== 'string' || !body.sistema.trim()) throw new Error('sistema é obrigatório e deve ser string.');
  const origem = { sistema: body.sistema.trim() };
  if (body.callback_url !== undefined) {
    let url;
    try {
      if (typeof body.callback_url !== 'string') throw new Error();
      url = new URL(body.callback_url);
    } catch {
      throw new Error('callback_url deve ser uma URL HTTP ou HTTPS válida.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('callback_url deve usar HTTP ou HTTPS, sem credenciais na URL.');
    }
    origem.callback_url = url.href;
  }
  return origem;
}

module.exports = { normalizarProcesso, validarOrigem };
