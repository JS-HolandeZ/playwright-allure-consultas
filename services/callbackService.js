async function enviarCallback(item, { fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  if (!item.callback_url) return;
  const response = await fetchImpl(item.callback_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      id: item.id, sistema: item.sistema, processo: item.processo,
      status: item.status, resultado: item.resultado, erro: item.erro,
    }),
  });
  // Não é necessário manter ou interpretar o corpo da resposta.
  if (response.body) await response.body.cancel();
  if (!response.ok) throw new Error(`Callback retornou HTTP ${response.status}.`);
}

module.exports = { enviarCallback };
