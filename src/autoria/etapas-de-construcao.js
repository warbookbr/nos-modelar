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
   aceite da pessoa sem rastro.

   A PORTA CITADA QUE MUDOU DEPOIS DO ACEITE. Uma etapa que não está fixa (reaberta ou quebrada) pode mudar sem quebrar a forma
   das posteriores: a porta em que elas se encaixam muda de lugar e elas vão junto. Por isso, a cada leitura, a porta que uma
   posterior cita de uma etapa não fixa é comparada com a do aceite dessa etapa (`portasDeReferencia`), e a posterior fixa cuja
   porta citada mudou vira `quebrada`, com o aceite guardado em `reaberturas`; o abalo segue pela cadeia, para a posterior que
   cita uma etapa abalada. `citacoes` vem de quem conhece a montagem (`citacoesDasPortas` da ferramenta). */
export function atualizarRegistro(montagemId, medidas, anterior = null, { citacoes = [] } = {}) {
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
      /* A QUEBRADA SEGUE QUEBRADA. Ela não se refixa sozinha com o aceite antigo, nem volta a aberta sozinha quando as juntas
         voltam a passar: até 2026-11-17 voltava, e uma quebrada gravada por outra escrita do registro virava aberta na leitura
         seguinte, sem `--por` e sem a prova das posteriores que a reabertura faz. Só `--reabrir` a tira deste estado. O aceite já
         foi guardado em `reaberturas` quando ela quebrou. */
      if (fixa.estado === 'quebrada') return { instancia, estado: 'quebrada', juntas, ...comForma, ...comPortas, motivo: fixa.motivo ?? 'quebrou depois do aceite e espera a reabertura' };
      /* FORMA QUE MUDOU DEPOIS DO ACEITE. As juntas só pegam mudança que
         desencaixa; alargar a base mantém o anel encaixado pelo vínculo, e a
         etapa continuava fixa com um aceite dado a outra peça. */
      const aceita = fixa.forma ?? null;
      const mudou = aceita
        ? Boolean(forma) && aceita !== forma
        : Boolean(fixa.receita && textoDaReceita) && fixa.receita !== textoDaReceita;
      const formaDoAceite = aceita ?? (mudou ? null : forma ?? null);
      /* A PORTA CITADA QUE MUDOU COM A MALHA IGUAL. A etapa fixa guarda as portas que as posteriores citam; a receita que muda
         só a porta (o lugar do encaixe) não muda a forma, e as posteriores iam junto sem nada acusar. */
      const portasMudadas = fixa.portas ? Object.keys(fixa.portas).sort().flatMap((nome) => {
        const d = diferencas(fixa.portas[nome], portas?.[nome]);
        return d.length ? [`a porta '${nome}' mudou depois do aceite: ${d.join('; ')}`] : [];
      }) : [];
      if (!mudou && passou && !portasMudadas.length) {
        return { instancia, estado: 'fixa', juntas, ...(formaDoAceite ? { forma: formaDoAceite } : {}), ...(fixa.portas ? { portas: fixa.portas } : {}), aceite: fixa.aceite };
      }
      const motivo = mudou ? 'a receita mudou depois do aceite' : portasMudadas.length ? portasMudadas.join('; ') : 'uma junta deixou de passar depois do aceite';
      const guardado = {
        por: 'leitura do registro', motivo,
        ...(fixa.aceite ? { aceite: fixa.aceite } : {}),
        ...(formaDoAceite ? { forma: formaDoAceite } : {}),
        ...(!formaDoAceite && fixa.receita ? { receita: fixa.receita } : {}),
        ...(fixa.portas ? { portas: fixa.portas } : {}),
        ...juntasDasPosteriores(anterior, instancia),
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
  registro.etapas = abalarPelasPortas(registro.etapas, citacoes);
  return registro;
}

/* AS JUNTAS DAS POSTERIORES NO ACEITE. Quando a etapa fixa quebra, a medida das juntas que as posteriores têm com ela fica guardada
   com o aceite, como estava no registro gravado antes da mudança. A reabertura sem as portas do aceite prova a porta pela junta, e
   a medida de comparação não pode ser a da última escrita do registro: uma escrita no meio do caminho (a reabertura de outra etapa)
   grava as juntas já com a mudança, e a prova passaria a comparar a mudança com ela mesma (2026-11-17). */
function juntasDasPosteriores(anterior, instancia) {
  const etapas = anterior?.etapas ?? [];
  const indice = etapas.findIndex((e) => e.instancia === instancia);
  if (indice < 0) return {};
  const porPosterior = Object.fromEntries(etapas.slice(indice + 1)
    .map((e) => [e.instancia, (e.juntas ?? []).filter((j) => j.com === instancia)])
    .filter(([, juntas]) => juntas.length));
  return Object.keys(porPosterior).length ? { juntasDasPosteriores: porPosterior } : {};
}

/* As portas do aceite de uma etapa: na fixa, as que ela guardou ao ser fixada; na que não está fixa, as da última reabertura que
   as traz (a reabertura guarda as do aceite, ou as que a prova pelas juntas mediu quando o registro não as tinha). */
export function portasDeReferencia(etapa) {
  if (etapa.estado === 'fixa') return etapa.portas ?? null;
  return [...(etapa.reaberturas ?? [])].reverse().find((r) => r.portas)?.portas ?? null;
}

/* Agrupa as citações por etapa citada e porta, com os meios (relação, vínculo, posição) juntos. */
function porPorta(citacoes) {
  const grupos = new Map();
  for (const c of citacoes) {
    const chave = `${c.etapa} ${c.porta}`;
    if (!grupos.has(chave)) grupos.set(chave, { etapa: c.etapa, porta: c.porta, profunda: Boolean(c.profunda), meios: [], relacoes: [] });
    const g = grupos.get(chave);
    g.meios.push(c.por);
    if (c.relacao) g.relacoes.push(c.relacao);
  }
  return [...grupos.values()];
}

function abalarPelasPortas(etapas, citacoes) {
  const porId = new Map(etapas.map((e) => [e.instancia, e]));
  const abaladas = new Map();
  return etapas.map((etapa) => {
    const motivos = [];
    for (const g of porPorta(citacoes.filter((c) => c.posterior === etapa.instancia))) {
      const citada = porId.get(g.etapa);
      if (!citada) continue;
      if (abaladas.has(g.etapa)) { motivos.push(`cita a porta '${g.porta}' de '${g.etapa}' (${g.meios.join(', ')}), que ${abaladas.get(g.etapa)}`); continue; }
      if (g.profunda) continue;
      /* A porta citada fora das portas do aceite (a citação nova na montagem, depois do aceite da etapa citada) não tem com que
         ser conferida, e abala a posterior, como na reabertura. Etapa sem portas guardadas (registro de antes de 2026-11-17) fica
         de fora: não há referência. */
      const referencia = portasDeReferencia(citada);
      if (!referencia) continue;
      if (referencia[g.porta] === undefined) {
        motivos.push(`a porta '${g.porta}' de '${g.etapa}', que ela cita (${g.meios.join(', ')}), não está nas portas do aceite de '${g.etapa}'`);
        continue;
      }
      if (citada.estado === 'fixa') continue;
      const d = diferencas(referencia[g.porta], citada.portas?.[g.porta]);
      if (d.length) motivos.push(`a porta '${g.porta}' de '${g.etapa}', que ela cita (${g.meios.join(', ')}), mudou desde o aceite de '${g.etapa}': ${d.join('; ')}`);
    }
    if (!motivos.length) return etapa;
    const motivo = motivos.join('; ');
    abaladas.set(etapa.instancia, `${etapa.estado === 'fixa' ? 'quebrou' : `está ${etapa.estado}`} por isso`);
    if (etapa.estado !== 'fixa') return etapa;
    const { aceite, forma, portas, reaberturas = [], ...resto } = etapa;
    const guardado = { por: 'leitura do registro', motivo, ...(aceite ? { aceite } : {}), ...(forma ? { forma } : {}), ...(portas ? { portas } : {}) };
    return { ...resto, estado: 'quebrada', ...(forma ? { forma } : {}), ...(portas ? { portas } : {}), motivo, reaberturas: [...reaberturas, guardado] };
  });
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
  /* A quebrada não se fixa direto: a reabertura é que prova as posteriores e guarda a referência das portas. */
  if (etapa.estado === 'quebrada') {
    falhar('etapa-quebrada', `'${instancia}' está quebrada (${etapa.motivo ?? 'sem motivo'}); reabra-a com --reabrir e --por da pessoa antes de fixar.`);
  }
  const reprovadas = etapa.juntas.filter((junta) => !junta.satisfeita).map((junta) => junta.relacao);
  if (reprovadas.length) {
    falhar('etapa-com-junta-reprovada', `'${instancia}' tem junta reprovada: ${reprovadas.join(', ')}.`);
  }
  /* A posterior quebrada foi construída sobre algo que mudou (a forma dela, uma junta, ou a porta desta que ela cita, quando esta
     foi reaberta e mudou): fixar esta com ela assim deixaria a posterior com um aceite dado a outra montagem. */
  const quebradas = registro.etapas.slice(indice + 1).filter((e) => e.estado === 'quebrada');
  if (quebradas.length) {
    falhar('etapa-com-posterior-quebrada', `'${instancia}' tem etapas posteriores quebradas: ${quebradas.map((e) => `'${e.instancia}' (${e.motivo ?? 'sem motivo'})`).join('; ')}; reabra-as, da última para a primeira, ou desfaça a mudança.`);
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

   `citacoes` são todas as citações de porta da montagem, [{ etapa, porta, posterior, por, relacao?, profunda? }]; `portasAgora`, as
   portas desta etapa como a receita as publica agora; `anterior`, o registro gravado. As portas do aceite desta etapa são as de
   `portasDeReferencia`. Quando o registro não as guardou (registro de antes de 2026-11-17), a porta citada só se prova por uma junta
   medida sobre ela, com a medida igual à do aceite (a do registro gravado, na etapa fixa, ou a que a leitura guardou quando ela quebrou); a porta citada só por vínculo ou por posição, sem junta, não está
   provada, e a citação de porta de dentro de uma submontagem também não. A etapa posterior aberta não corta a cadeia: se ela não
   provou as citações dela, toda posterior que a cita também não prova.

   Devolve { mudaram: [{ posterior, oQue }], provas: [texto], portasProvadas }: `portasProvadas` são as portas desta etapa que a
   reabertura guarda como referência (as do aceite, ou as de agora quando a prova foi pelas juntas). */
const NUMERO = (v) => (typeof v === 'number' ? Number(v.toPrecision(12)) : v);
function diferencas(antes, agora) {
  const chaves = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(agora ?? {})])].sort();
  const texto = (v) => JSON.stringify(Array.isArray(v) ? v.map(NUMERO) : NUMERO(v));
  return chaves.filter((k) => texto(antes?.[k]) !== texto(agora?.[k])).map((k) => `${k}: ${texto(antes?.[k])} → ${texto(agora?.[k])}`);
}
const medidasIguais = (a, b) => JSON.stringify(a ?? null, (_, v) => NUMERO(v)) === JSON.stringify(b ?? null, (_, v) => NUMERO(v));

export function conferirPosteriores(registro, instancia, { citacoes, portasAgora, anterior = null }) {
  const indice = registro.etapas.findIndex((etapa) => etapa.instancia === instancia);
  const etapa = registro.etapas[indice];
  const referencia = portasDeReferencia(etapa);
  /* a medida das juntas do aceite: na etapa fixa, a do registro gravado; na quebrada, a que a leitura guardou quando ela quebrou */
  const juntasDoAceite = etapa.estado === 'fixa'
    ? (p) => anterior?.etapas?.find((e) => e.instancia === p)?.juntas ?? null
    : (p) => [...(etapa.reaberturas ?? [])].reverse().find((r) => r.juntasDasPosteriores)?.juntasDasPosteriores?.[p] ?? null;
  const suspeitas = new Map([[instancia, null]]);
  const mudaram = [];
  const provas = [];
  for (const posterior of registro.etapas.slice(indice + 1)) {
    const grupos = porPorta(citacoes.filter((c) => c.posterior === posterior.instancia && suspeitas.has(c.etapa)));
    const problemas = [];
    const comoProvou = [];
    for (const g of grupos) {
      const onde = `a porta '${g.porta}' de '${g.etapa}', que ela cita (${g.meios.join(', ')})`;
      if (g.etapa !== instancia) { problemas.push(`cita a porta '${g.porta}' de '${g.etapa}' (${g.meios.join(', ')}), que ${suspeitas.get(g.etapa)}`); continue; }
      if (g.profunda) { problemas.push(`${onde}, fica dentro de uma submontagem, e a reabertura não a confere`); continue; }
      if (referencia) {
        if (referencia[g.porta] === undefined) { problemas.push(`${onde}, não está nas portas guardadas no aceite de '${instancia}'`); continue; }
        const d = diferencas(referencia[g.porta], portasAgora[g.porta]);
        if (d.length) problemas.push(`${onde}, mudou: ${d.join('; ')}`);
        else comoProvou.push(`a porta '${g.porta}' igual à do aceite`);
        continue;
      }
      /* sem as portas do aceite: só a junta medida sobre a porta prova, com a medida do aceite */
      if (!g.relacoes.length) { problemas.push(`${onde}, não tem junta medida que a prove, e as portas do aceite de '${instancia}' não estão guardadas no registro`); continue; }
      const antes = juntasDoAceite(posterior.instancia);
      if (!antes) { problemas.push(`${onde}: a medida das juntas no aceite de '${instancia}' não está guardada, e as portas do aceite também não`); continue; }
      const ruins = g.relacoes.filter((relacao) => {
        const agora = posterior.juntas?.find((j) => j.relacao === relacao);
        const velha = antes.find((j) => j.relacao === relacao);
        return !agora || !velha || !medidasIguais(velha.medidas, agora.medidas);
      });
      if (ruins.length) problemas.push(`${onde}: a medida da junta ${ruins.map((r) => `'${r}'`).join(', ')} não é a do aceite`);
      else comoProvou.push(`a porta '${g.porta}' provada pela junta ${g.relacoes.map((r) => `'${r}'`).join(', ')}, com a medida do aceite (as portas do aceite não estão guardadas)`);
    }
    if (posterior.estado === 'quebrada') problemas.push(posterior.motivo ?? 'a etapa está quebrada');
    if (problemas.length) {
      if (posterior.estado === 'fixa' || posterior.estado === 'quebrada') mudaram.push({ posterior: posterior.instancia, oQue: problemas.join('; ') });
      else suspeitas.set(posterior.instancia, `está aberta e não provou: ${problemas.join('; ')}`);
      continue;
    }
    if (posterior.estado === 'fixa') provas.push(`${posterior.instancia}: forma do aceite${comoProvou.length ? `, ${comoProvou.join(', ')}` : ', sem citar porta de etapa reaberta ou não provada'}`);
  }
  const algumaCitada = Object.keys(portasAgora).length > 0;
  return { mudaram, provas, portasProvadas: referencia ?? (algumaCitada ? portasAgora : null) };
}

/* REABRIR. Só a pessoa reabre uma etapa, como só ela dá o aceite humano: nenhum agente reabre por conta própria. Reabre a etapa
   fixa e a quebrada (a que a receita mudou depois do aceite, cujo aceite a leitura já guardou em `reaberturas`). A etapa volta a
   aberta, e o aceite, a forma e as portas que ela tinha vão para `reaberturas`, com quem, quando e por quê, em vez de sumir; as
   portas guardadas na reabertura são a referência com que cada leitura seguinte confere as posteriores (`atualizarRegistro`). As
   etapas posteriores ficam fixas quando cada uma prova que não mudou (`conferirPosteriores`); se alguma mudou, a reabertura é
   recusada dizendo qual e o quê, e a regra antiga vale para ela: reabrir de trás para frente, uma etapa por vez, cada uma com o
   seu motivo. O `contexto` ({ citacoes, portasAgora, anterior }) é obrigatório: sem ele não há prova de porta. */
export function reabrirEtapa(registro, instancia, { por, quando, motivo } = {}, contexto) {
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
  if (!contexto || !Array.isArray(contexto.citacoes) || !contexto.portasAgora || typeof contexto.portasAgora !== 'object') {
    falhar('reabertura-sem-contexto', `reabrir '${instancia}' exige o contexto { citacoes, portasAgora, anterior }, que a ferramenta de etapas monta; sem ele as posteriores não provam as portas.`);
  }
  const { mudaram, portasProvadas } = conferirPosteriores(registro, instancia, contexto);
  if (mudaram.length) {
    falhar('etapa-com-posteriores-fixas', `'${instancia}' tem etapas posteriores que mudaram: ${mudaram.map((m) => `'${m.posterior}' (${m.oQue})`).join('; ')}; reabra-as antes, da última para a primeira.`);
  }
  const quebrada = etapa.estado === 'quebrada';
  const { aceite, forma, receita, portas: _portas, motivo: _motivo, reaberturas = [], ...resto } = etapa;
  /* Na quebrada, o aceite e a forma do aceite já estão na reabertura que a leitura guardou; a forma dela agora é a nova. */
  const registroDaReabertura = {
    por: quem, quando: data, motivo: porque,
    ...(!quebrada && aceite ? { aceite } : {}), ...(!quebrada && forma ? { forma } : {}), ...(!quebrada && receita ? { receita } : {}),
    ...(portasProvadas ? { portas: portasProvadas } : {}),
  };
  const portasAgora = Object.keys(contexto.portasAgora).length ? { portas: contexto.portasAgora } : {};
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
