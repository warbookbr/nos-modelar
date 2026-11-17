/* etapas-de-construcao.js — o que há de comum ao registro de etapas de uma montagem v5: o formato, o erro, as juntas medidas em cada
   etapa e a próxima etapa a trabalhar. O registro em si, os aceites e as reaberturas como eventos e o estado de cada etapa como
   comparação da impressão de agora com a do aceite moram em `etapas-pela-impressao.js`; o registro da versão 2, que gravava o estado
   em cada etapa, saiu na migração do acervo (plano das etapas pela impressão do aceite).

   A junta é medida pela relação declarada, e a relação mede pela porta: eixo, raio e folga. */

export const FORMATO_REGISTRO_DE_ETAPAS = 'mecanifica.registro-de-etapas';

export class ErroEtapaDeConstrucao extends Error {
  constructor(codigo, mensagem) {
    super(mensagem);
    this.name = 'ErroEtapaDeConstrucao';
    this.codigo = codigo;
  }
}

function falhar(codigo, mensagem) {
  throw new ErroEtapaDeConstrucao(codigo, mensagem);
}

const topo = (endpoint) => endpoint.caminho[0];

/* As juntas medidas em cada etapa, na ordem das etapas. Uma relação pertence à
   etapa da última das duas partes que ela liga: é quando ela passa a existir. */
export function juntasPorEtapa(montagemResolvida, etapas) {
  if (!Array.isArray(etapas) || etapas.length === 0) {
    falhar('etapas-ausentes', 'a montagem não declara etapas; o registro só existe para montagem v5.');
  }
  const posicao = new Map(etapas.map((id, indice) => [id, indice]));
  const porEtapa = new Map(etapas.map((id) => [id, []]));
  for (const relacao of montagemResolvida.relacoes ?? []) {
    const lados = [topo(relacao.referencia), topo(relacao.movel)];
    const etapa = lados.reduce((ultima, id) => (posicao.get(id) > posicao.get(ultima) ? id : ultima));
    porEtapa.get(etapa).push({
      relacao: relacao.id,
      com: lados.find((id) => id !== etapa) ?? etapa,
      satisfeita: relacao.satisfeita === true,
      ...(relacao.medidas ? { medidas: relacao.medidas } : {}),
    });
  }
  return etapas.map((instancia) => ({
    instancia,
    juntas: porEtapa.get(instancia).sort((a, b) => (a.relacao < b.relacao ? -1 : 1)),
  }));
}

/* A próxima etapa a trabalhar: a primeira que não está fixa. Uma etapa quebrada vem antes de qualquer aberta, porque tudo depois dela
   foi construído em cima de algo que mudou. Recebe `{ etapas: [{ instancia, estado }] }`, com o estado que a leitura deu. */
export function proximaEtapa(registro) {
  return registro.etapas.find((etapa) => etapa.estado !== 'fixa') ?? null;
}

/* "<quem, data: motivo>" no formato do aceite humano. */
export function lerAutorDaReabertura(texto) {
  const casou = /^\s*([^,]+),\s*(\d{4}-\d{2}-\d{2})\s*:\s*(.+)$/s.exec(texto ?? '');
  if (!casou) falhar('reabertura-sem-autor', 'reabrir exige --por "<quem, data AAAA-MM-DD: motivo>".');
  return { por: casou[1].trim(), quando: casou[2], motivo: casou[3].trim() };
}
