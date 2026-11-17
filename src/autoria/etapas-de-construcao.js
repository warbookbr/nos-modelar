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
export const VERSAO_REGISTRO_DE_ETAPAS = 2;

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
   fixado. Uma etapa fixa cujas juntas deixaram de passar, ou cuja forma mudou,
   vira `quebrada`: a mudança que a quebrou veio de uma parte anterior ou da
   receita, e ninguém fixou isso.

   A FORMA, E NÃO O TEXTO. A medida de cada etapa traz `forma`, a assinatura do
   que a receita gerou (`assinatura-da-forma.js`). A versão 1 do registro
   guardava `receita`, a impressão do texto do arquivo, e um comentário ou uma
   imagem retirada do `PLANO` quebrava a etapa sem a forma mudar. Registro v1 é
   lido: o `receita` antigo só vale se a medida traz `textoDaReceita` igual, e
   nesse caso a forma de agora passa a ser a do aceite; se o texto mudou, a
   forma do aceite é desconhecida e a etapa quebra, como antes. A migração que
   confere a forma do aceite pelo git é feita por quem conhece a história.

   O ACEITE NÃO SOME. Quando a etapa fixa quebra, o aceite e a forma que ela
   tinha vão para `reaberturas`, com o motivo, antes de qualquer leitura
   seguinte a levar a `aberta`. Sem isso, duas leituras bastavam para apagar o
   aceite da pessoa sem rastro. */
export function atualizarRegistro(montagemId, medidas, anterior = null) {
  const fixas = new Map((anterior?.etapas ?? [])
    .filter((etapa) => etapa.estado === 'fixa' || etapa.estado === 'quebrada')
    .map((etapa) => [etapa.instancia, etapa]));
  const historico = new Map((anterior?.etapas ?? [])
    .filter((etapa) => Array.isArray(etapa.reaberturas) && etapa.reaberturas.length)
    .map((etapa) => [etapa.instancia, etapa.reaberturas]));
  const registro = {
    formato: FORMATO_REGISTRO_DE_ETAPAS,
    versao: VERSAO_REGISTRO_DE_ETAPAS,
    montagem: montagemId,
    etapas: medidas.map(({ instancia, juntas, forma, textoDaReceita, portas }) => {
      const passou = juntas.every((junta) => junta.satisfeita);
      const fixa = fixas.get(instancia);
      const comForma = forma ? { forma } : {};
      /* As portas que as etapas seguintes citam, como estão agora: a etapa aberta as leva, e a que se fixa guarda as do aceite. */
      const comPortas = portas && Object.keys(portas).length ? { portas } : {};
      if (!fixa) return { instancia, estado: 'aberta', juntas, ...comForma, ...comPortas };
      /* Quebrada que voltou a passar não se refixa sozinha com o aceite
         antigo: a pessoa aceitou outra coisa, e precisa olhar de novo. O aceite
         já foi guardado em `reaberturas` quando ela quebrou. */
      if (fixa.estado === 'quebrada') return { instancia, estado: passou ? 'aberta' : 'quebrada', juntas, ...comForma, ...comPortas };
      /* FORMA QUE MUDOU DEPOIS DO ACEITE. As juntas só pegam mudança que
         desencaixa; alargar a base mantém o anel encaixado pelo vínculo, e a
         etapa continuava fixa com um aceite dado a outra peça. */
      const aceita = fixa.forma ?? null;
      const mudou = aceita
        ? Boolean(forma) && aceita !== forma
        : Boolean(fixa.receita && textoDaReceita) && fixa.receita !== textoDaReceita;
      const formaDoAceite = aceita ?? (mudou ? null : forma ?? null);
      if (!mudou && passou) {
        return { instancia, estado: 'fixa', juntas, ...(formaDoAceite ? { forma: formaDoAceite } : {}), ...(fixa.portas ? { portas: fixa.portas } : {}), aceite: fixa.aceite };
      }
      const motivo = mudou ? 'a receita mudou depois do aceite' : 'uma junta deixou de passar depois do aceite';
      const guardado = {
        por: 'leitura do registro', motivo,
        ...(fixa.aceite ? { aceite: fixa.aceite } : {}),
        ...(formaDoAceite ? { forma: formaDoAceite } : {}),
        ...(!formaDoAceite && fixa.receita ? { receita: fixa.receita } : {}),
        ...(fixa.portas ? { portas: fixa.portas } : {}),
      };
      return {
        instancia, estado: 'quebrada', juntas, ...comForma, ...comPortas, motivo,
        reaberturas: [...(historico.get(instancia) ?? []), guardado],
      };
    }),
  };
  /* O histórico de reaberturas atravessa toda releitura: é o que diz que a
     etapa já esteve fixa e por que deixou de estar. */
  registro.etapas = registro.etapas.map((etapa) => (etapa.reaberturas || !historico.has(etapa.instancia)
    ? etapa : { ...etapa, reaberturas: historico.get(etapa.instancia) }));
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

/* AS POSTERIORES QUE PROVAM NÃO TER MUDADO. Reabrir uma etapa não reabre as que vieram depois dela quando cada uma prova que não
   mudou: está fixa (a forma, o hash da malha, é a do aceite e as juntas passam) e as portas desta etapa que ela cita são as mesmas
   do aceite desta. Sem isso, mudar a base do braço para pôr a placa de controle exigia reabrir as onze etapas de cima, que a pessoa
   não citou (2026-11-17).

   `citacoes` são as portas desta etapa que cada posterior cita, por relação, vínculo ou posição: [{ posterior, porta, por }].
   `portasAgora` são as portas desta etapa como a receita as publica agora, { nome: interface }. As portas do aceite são as que o
   registro guardou ao fixar a etapa (na etapa fixa, ou na última reabertura que as tem, na quebrada). O registro de antes desta
   regra não as guardava: aí a prova da porta é a medida das juntas da posterior com esta, igual à do registro anterior
   (`anterior`), que pega porta que mudou de raio, eixo ou lugar onde há junta medida, e não pega a porta citada só por posição.
   Devolve { mudaram: [{ posterior, oQue }], provas: [texto] }. */
const NUMERO = (v) => (typeof v === 'number' ? Number(v.toPrecision(12)) : v);
function diferencas(antes, agora) {
  const chaves = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(agora ?? {})])].sort();
  const texto = (v) => JSON.stringify(Array.isArray(v) ? v.map(NUMERO) : NUMERO(v));
  return chaves.filter((k) => texto(antes?.[k]) !== texto(agora?.[k])).map((k) => `${k}: ${texto(antes?.[k])} → ${texto(agora?.[k])}`);
}
const medidasIguais = (a, b) => JSON.stringify(a ?? null, (_, v) => NUMERO(v)) === JSON.stringify(b ?? null, (_, v) => NUMERO(v));

export function conferirPosteriores(registro, instancia, { citacoes = [], portasAgora = {}, anterior = null } = {}) {
  const indice = registro.etapas.findIndex((etapa) => etapa.instancia === instancia);
  const etapa = registro.etapas[indice];
  const portasDoAceite = etapa.estado === 'fixa' ? etapa.portas
    : [...(etapa.reaberturas ?? [])].reverse().find((r) => r.portas)?.portas;
  const mudaram = [];
  const provas = [];
  for (const posterior of registro.etapas.slice(indice + 1)) {
    if (posterior.estado !== 'fixa' && posterior.estado !== 'quebrada') continue;
    if (posterior.estado === 'quebrada') {
      mudaram.push({ posterior: posterior.instancia, oQue: posterior.motivo ?? 'a etapa está quebrada' });
      continue;
    }
    const citadas = citacoes.filter((c) => c.posterior === posterior.instancia);
    const portas = [...new Set(citadas.map((c) => c.porta))];
    const mudancas = [];
    if (portas.length && portasDoAceite) {
      for (const porta of portas) {
        const d = diferencas(portasDoAceite[porta], portasAgora[porta]);
        if (d.length) mudancas.push(`a porta '${porta}' de '${instancia}', que ela cita (${citadas.filter((c) => c.porta === porta).map((c) => c.por).join(', ')}), mudou: ${d.join('; ')}`);
      }
    } else if (portas.length) {
      const antes = anterior?.etapas?.find((e) => e.instancia === posterior.instancia)?.juntas ?? [];
      for (const junta of posterior.juntas.filter((j) => j.com === instancia)) {
        const velha = antes.find((j) => j.relacao === junta.relacao);
        if (!velha || !medidasIguais(velha.medidas, junta.medidas)) mudancas.push(`a medida da junta '${junta.relacao}' com '${instancia}' não é a do registro anterior`);
      }
    }
    if (mudancas.length) { mudaram.push({ posterior: posterior.instancia, oQue: mudancas.join('; ') }); continue; }
    provas.push(`${posterior.instancia}: forma do aceite${portas.length
      ? (portasDoAceite ? `, e as portas citadas de '${instancia}' (${portas.join(', ')}) iguais às do aceite`
        : `; as portas de '${instancia}' não estão guardadas no registro (anterior a 2026-11-17), e as juntas com ela têm a medida do registro anterior`)
      : `, sem porta de '${instancia}' citada`}`);
  }
  return { mudaram, provas };
}

/* REABRIR. Só a pessoa reabre uma etapa, como só ela dá o aceite humano: nenhum agente reabre por conta própria. Reabre a etapa
   fixa e a quebrada (a que a receita mudou depois do aceite, cujo aceite a leitura já guardou em `reaberturas`). A etapa volta a
   aberta, e o aceite e a forma que ela tinha vão para `reaberturas`, com quem, quando e por quê, em vez de sumir. As etapas
   posteriores ficam fixas quando cada uma prova que não mudou (`conferirPosteriores`); se alguma mudou, a reabertura é recusada
   dizendo qual e o quê, e a regra antiga vale para ela: reabrir de trás para frente, uma etapa por vez, cada uma com o seu motivo. */
export function reabrirEtapa(registro, instancia, { por, quando, motivo } = {}, contexto = {}) {
  const indice = registro.etapas.findIndex((etapa) => etapa.instancia === instancia);
  if (indice < 0) falhar('etapa-inexistente', `a etapa '${instancia}' não existe nesta montagem.`);
  const etapa = registro.etapas[indice];
  if (etapa.estado !== 'fixa' && etapa.estado !== 'quebrada') {
    falhar('etapa-nao-fixa', `a etapa '${instancia}' está ${etapa.estado}; só se reabre etapa fixa ou quebrada.`);
  }
  const quem = typeof por === 'string' ? por.trim() : '';
  const porque = typeof motivo === 'string' ? motivo.trim() : '';
  const data = typeof quando === 'string' ? quando.trim() : '';
  if (!quem || !porque || !data) {
    falhar('reabertura-sem-autor', `reabrir '${instancia}' exige quem reabriu, a data e o motivo ("<quem, data: motivo>").`);
  }
  const { mudaram } = conferirPosteriores(registro, instancia, contexto);
  if (mudaram.length) {
    falhar('etapa-com-posteriores-fixas', `'${instancia}' tem etapas posteriores que mudaram: ${mudaram.map((m) => `'${m.posterior}' (${m.oQue})`).join('; ')}; reabra-as antes, da última para a primeira.`);
  }
  const quebrada = etapa.estado === 'quebrada';
  const { aceite, forma, receita, portas, motivo: _motivo, reaberturas = [], ...resto } = etapa;
  /* Na quebrada, o aceite e a forma do aceite já estão na reabertura que a leitura guardou; a forma dela agora é a nova. */
  const registroDaReabertura = {
    por: quem, quando: data, motivo: porque,
    ...(!quebrada && aceite ? { aceite } : {}), ...(!quebrada && forma ? { forma } : {}), ...(!quebrada && receita ? { receita } : {}),
  };
  const portasAgora = contexto.portasAgora && Object.keys(contexto.portasAgora).length ? { portas: contexto.portasAgora } : {};
  return {
    ...registro,
    etapas: registro.etapas.map((item, i) => (i === indice
      ? { ...resto, estado: 'aberta', ...(forma ? { forma } : {}), ...portasAgora, reaberturas: [...reaberturas, registroDaReabertura] }
      : item)),
  };
}

/* "<quem, data: motivo>" no formato do aceite humano. */
export function lerAutorDaReabertura(texto) {
  const casou = /^\s*([^,]+),\s*(\d{4}-\d{2}-\d{2})\s*:\s*(.+)$/s.exec(texto ?? '');
  if (!casou) falhar('reabertura-sem-autor', 'reabrir exige --por "<quem, data AAAA-MM-DD: motivo>".');
  return { por: casou[1].trim(), quando: casou[2], motivo: casou[3].trim() };
}
