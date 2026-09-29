/* etapas-de-construcao.js — o registro de cada etapa de uma montagem v5: a
   parte que entrou, as juntas que passaram a existir com ela e o resultado da
   medida de cada uma, e se a etapa está fixa.

   POR QUE EXISTE. Construir parte por parte só evita a bola de neve se uma
   etapa com junta reprovada não deixar a seguinte começar, e se uma etapa já
   aceita não mudar sem ninguém perceber. Este módulo é puro: recebe a montagem
   resolvida e o registro anterior, e devolve o registro novo. Quem grava em
   disco e quem pergunta à pessoa é a ferramenta do laço.

   A junta é medida pela relação declarada, e a relação mede pela porta: eixo,
   raio e folga. A medida antiga por sobreposição de caixas errava quando uma
   parte entrava pelo flanco da outra. */

export const FORMATO_REGISTRO_DE_ETAPAS = 'mecanifica.registro-de-etapas';
export const VERSAO_REGISTRO_DE_ETAPAS = 1;

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

/* Junta o que a resolução mediu agora com o que o registro anterior já tinha
   fixado. Uma etapa fixa cujas juntas deixaram de passar vira `quebrada`: a
   mudança que a quebrou veio de uma parte anterior, e ninguém fixou isso. */
export function atualizarRegistro(montagemId, medidas, anterior = null) {
  const fixas = new Map((anterior?.etapas ?? [])
    .filter((etapa) => etapa.estado === 'fixa' || etapa.estado === 'quebrada')
    .map((etapa) => [etapa.instancia, etapa]));
  const historico = new Map((anterior?.etapas ?? [])
    .filter((etapa) => Array.isArray(etapa.reaberturas) && etapa.reaberturas.length)
    .map((etapa) => [etapa.instancia, { reaberturas: etapa.reaberturas }]));
  const registro = {
    formato: FORMATO_REGISTRO_DE_ETAPAS,
    versao: VERSAO_REGISTRO_DE_ETAPAS,
    montagem: montagemId,
    etapas: medidas.map(({ instancia, juntas, receita }) => {
      const passou = juntas.every((junta) => junta.satisfeita);
      const fixa = fixas.get(instancia);
      const comReceita = receita ? { receita } : {};
      if (!fixa) return { instancia, estado: 'aberta', juntas, ...comReceita };
      /* RECEITA QUE MUDOU DEPOIS DO ACEITE. As juntas só pegam mudança que
         desencaixa; alargar a base mantém o anel encaixado pelo vínculo, e a
         etapa continuava fixa com um aceite dado a outra peça. A impressão da
         receita é guardada ao fixar e comparada a cada leitura. */
      if (fixa.receita && receita && fixa.receita !== receita) {
        return { instancia, estado: 'quebrada', juntas, ...comReceita, motivo: 'a receita mudou depois do aceite' };
      }
      /* Quebrada que voltou a passar não se refixa sozinha com o aceite
         antigo: a pessoa aceitou outra coisa, e precisa olhar de novo. */
      if (fixa.estado === 'quebrada') return { instancia, estado: passou ? 'aberta' : 'quebrada', juntas, ...comReceita };
      return { instancia, estado: passou ? 'fixa' : 'quebrada', juntas, aceite: fixa.aceite, ...(fixa.receita ? { receita: fixa.receita } : comReceita) };
    }),
  };
  /* O histórico de reaberturas atravessa toda releitura: é o que diz que a
     etapa já esteve fixa e por que deixou de estar. */
  registro.etapas = registro.etapas.map((etapa) => ({ ...etapa, ...(historico.get(etapa.instancia) ?? {}) }));
  return registro;
}

/* A próxima etapa a trabalhar: a primeira que não está fixa. Uma etapa
   quebrada vem antes de qualquer aberta, porque tudo depois dela foi construído
   em cima de algo que mudou. */
export function proximaEtapa(registro) {
  return registro.etapas.find((etapa) => etapa.estado !== 'fixa') ?? null;
}

/* Fixa a etapa com o aceite da pessoa. Recusa fixar fora de ordem, com junta
   reprovada ou sem aceite: são as três formas de a bola de neve começar. */
export function fixarEtapa(registro, instancia, aceite) {
  const indice = registro.etapas.findIndex((etapa) => etapa.instancia === instancia);
  if (indice < 0) falhar('etapa-inexistente', `a etapa '${instancia}' não existe nesta montagem.`);
  const proxima = proximaEtapa(registro);
  if (!proxima || proxima.instancia !== instancia) {
    falhar('etapa-fora-de-ordem', `a próxima etapa é '${proxima?.instancia ?? 'nenhuma'}', e não '${instancia}'.`);
  }
  const etapa = registro.etapas[indice];
  const reprovadas = etapa.juntas.filter((junta) => !junta.satisfeita).map((junta) => junta.relacao);
  if (reprovadas.length) {
    falhar('etapa-com-junta-reprovada', `'${instancia}' tem junta reprovada: ${reprovadas.join(', ')}.`);
  }
  const por = typeof aceite?.por === 'string' ? aceite.por.trim() : '';
  if (!por) falhar('etapa-sem-aceite', `fixar '${instancia}' exige o aceite da pessoa, com quem aceitou.`);
  const observacao = typeof aceite.observacao === 'string' ? aceite.observacao.trim() : '';
  const defeitosAceitos = Array.isArray(aceite.defeitosAceitos) ? aceite.defeitosAceitos : [];
  return {
    ...registro,
    etapas: registro.etapas.map((item, i) => (i === indice
      ? { ...item, estado: 'fixa', aceite: { por, ...(observacao ? { observacao } : {}), ...(defeitosAceitos.length ? { defeitosAceitos } : {}), ...(aceite.analise ? { analise: aceite.analise } : {}) } }
      : item)),
  };
}

/* REABRIR. Só a pessoa reabre uma etapa fixa, como só ela dá o aceite humano:
   nenhum agente reabre por conta própria. A etapa volta a aberta, e o aceite e
   a receita que ela tinha vão para `reaberturas`, com quem, quando e por quê,
   em vez de sumir. Recusa reabrir etapa que não está fixa, e recusa reabrir se
   alguma etapa posterior está fixa ou quebrada: ela foi construída em cima
   desta, e reabrir em cascata desfaria aceites que a pessoa não citou. A regra
   é reabrir de trás para frente, uma etapa por vez, cada uma com o seu motivo. */
export function reabrirEtapa(registro, instancia, { por, quando, motivo } = {}) {
  const indice = registro.etapas.findIndex((etapa) => etapa.instancia === instancia);
  if (indice < 0) falhar('etapa-inexistente', `a etapa '${instancia}' não existe nesta montagem.`);
  const etapa = registro.etapas[indice];
  if (etapa.estado !== 'fixa') {
    falhar('etapa-nao-fixa', `a etapa '${instancia}' está ${etapa.estado}; só se reabre etapa fixa.`);
  }
  const quem = typeof por === 'string' ? por.trim() : '';
  const porque = typeof motivo === 'string' ? motivo.trim() : '';
  const data = typeof quando === 'string' ? quando.trim() : '';
  if (!quem || !porque || !data) {
    falhar('reabertura-sem-autor', `reabrir '${instancia}' exige quem reabriu, a data e o motivo ("<quem, data: motivo>").`);
  }
  const posteriores = registro.etapas.slice(indice + 1).filter((e) => e.estado === 'fixa' || e.estado === 'quebrada').map((e) => e.instancia);
  if (posteriores.length) {
    falhar('etapa-com-posteriores-fixas', `'${instancia}' tem etapas posteriores construídas sobre ela (${posteriores.join(', ')}); reabra-as antes, da última para a primeira.`);
  }
  const { aceite, receita, reaberturas = [], ...resto } = etapa;
  const registroDaReabertura = { por: quem, quando: data, motivo: porque, ...(aceite ? { aceite } : {}), ...(receita ? { receita } : {}) };
  return {
    ...registro,
    etapas: registro.etapas.map((item, i) => (i === indice
      ? { ...resto, estado: 'aberta', ...(receita ? { receita } : {}), reaberturas: [...reaberturas, registroDaReabertura] }
      : item)),
  };
}

/* "<quem, data: motivo>" no formato do aceite humano. */
export function lerAutorDaReabertura(texto) {
  const casou = /^\s*([^,]+),\s*(\d{4}-\d{2}-\d{2})\s*:\s*(.+)$/s.exec(texto ?? '');
  if (!casou) falhar('reabertura-sem-autor', 'reabrir exige --por "<quem, data AAAA-MM-DD: motivo>".');
  return { por: casou[1].trim(), quando: casou[2], motivo: casou[3].trim() };
}
