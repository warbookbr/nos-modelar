/* montagem.js — o cabo na montagem com articulação: as pontas presas a portas de peças, o cabo refeito em cada pose do curso de uma junta e a conferência do curso.

   O PEDIDO POR PORTAS é o `cabo()` do pedido.js com `de` e `para` trocados por `{ instancia, porta, sentido?, afastamento? }`: o ponto da ponta é o centro da porta da instância na pose resolvida e a direção em que o cabo sai é o eixo
   da porta (a normal, numa porta de plano ou de furos), invertido com `sentido: -1`; `afastamento` desloca a ponta, em milímetro, ao longo dessa direção. O resto do pedido (comprimento ou folga, diâmetro, raio mínimo, caimento, lados,
   desvio, orçamento, terminais) segue como está. As passagens e o feixe ficam de fora desta versão: o ponto de uma passagem é absoluto e não acompanha peça nenhuma.

   O CURSO. A junta é a declaração de articulação da montagem (`procedural/extensoes/articulacao/`). Em cada passo do curso as peças que a junta move (`movel` e `acompanham`) são levadas à pose do passo, em torno do eixo da porta da peça fixa (ou ao longo
   dele, numa prismática), com a mesma conta de `conferirArticulacao`; as portas são resolvidas nessa pose e o cabo é pedido de novo pela `cabo()`, com o mesmo comprimento. A conta do giro está aqui porque `conferirArticulacao` não devolve a pose do passo.

   A CONFERÊNCIA diz, por passo, o que o cabo faz. Os motivos são `estica` (as pontas passam do que o comprimento permite, ou a curva de menor energia não fecha com esse comprimento e essas direções), `dobra` (o menor raio de dobra fica abaixo do mínimo),
   `autocontato` (dois trechos do cabo a menos de um diâmetro), `pontas-coladas`, `atravessa` (o tubo do cabo invade um sólido da montagem acima da folga, pela mesma régua de `conferirArticulacao`) e `inconclusivo` (malha aberta). Só se mede o passo amostrado:
   uma falha que começa e termina entre dois passos não aparece, e o número de passos é o da declaração ou o que `opcoes.passos` diz. Sem física de corda: o cabo é a curva de menor energia, e não o que a gravidade e o atrito dariam. */
import { ErroChamadaDeFamilia } from '../../../src/autoria/chamar-familia.js';
import { UNIDADES_DO_CURSO, lerArticulacao } from '../../extensoes/articulacao/declaracao.js';
import { auditarParDeSolidos, prepararSolido, profundidadeDeInterpenetracao, TOLERANCIA_CONTATO_SOLIDO } from '../../../src/autoria/contato-de-solidos.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { interfaceNoMundo } from '../../../src/autoria/posicao-por-porta.js';
import { resolverPortasDeMontagem } from '../../../src/autoria/interfaces-montagem.js';
import { cabo, medidasDoPedido } from './pedido.js';

export const FORMATO_CONFERENCIA_DO_CABO = 'mecanifica.conferencia-do-cabo';
export const VERSAO_CONFERENCIA_DO_CABO = 1;
/** A penetração do tubo do cabo num sólido que ainda se tolera, em milímetro: a ponta pousa na superfície da porta e o polígono da seção tem uma flecha. */
export const FOLGA_PADRAO_DO_CABO = 0.3;
export const MOTIVOS_DO_CABO = Object.freeze(['estica', 'dobra', 'autocontato', 'pontas-coladas', 'atravessa', 'inconclusivo', 'recusado']);

const IDENTIDADE = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mult = (a, n) => [a[0] * n, a[1] * n, a[2] * n];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const aplicar = (m, v) => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
const multiplicar = (a, b) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]));
const mm = (x) => `${Number(x.toFixed(2))} mm`;
const plano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const mesmoCaminho = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const comecaCom = (caminho, prefixo) => prefixo.length <= caminho.length && prefixo.every((x, i) => x === caminho[i]);
const recusar = (campo, valor, aceito) => { throw new ErroChamadaDeFamilia({ familia: 'cabo', campo, valor, aceito }); };

function rotacaoEmTorno(k, angulo) {
  const c = Math.cos(angulo); const s = Math.sin(angulo); const t = 1 - c;
  return [
    [t * k[0] * k[0] + c, t * k[0] * k[1] - s * k[2], t * k[0] * k[2] + s * k[1]],
    [t * k[0] * k[1] + s * k[2], t * k[1] * k[1] + c, t * k[1] * k[2] - s * k[0]],
    [t * k[0] * k[2] - s * k[1], t * k[1] * k[2] + s * k[0], t * k[2] * k[2] + c],
  ];
}

const CAMPOS_DO_PEDIDO_POR_PORTAS = Object.freeze(['id', 'de', 'para', 'comprimento', 'folga', 'diametro', 'raioMinimo', 'caimento', 'lados', 'desvioMaximo', 'orcamentoDeFaces', 'terminais']);

/** Valida o pedido por portas (sem a montagem): quais campos, e que `de` e `para` dizem instância e porta. */
export function lerPedidoPorPortas(pedido) {
  if (!plano(pedido)) recusar('pedido', pedido, 'um objeto { de: { instancia, porta }, para: { instancia, porta }, comprimento | folga, diametro, ... }');
  for (const chave of Object.keys(pedido)) {
    if (!CAMPOS_DO_PEDIDO_POR_PORTAS.includes(chave)) {
      recusar(`pedido.${chave}`, pedido[chave], `um campo do pedido por portas: ${CAMPOS_DO_PEDIDO_POR_PORTAS.join(', ')}${['passagens', 'bracadeiras', 'feixe'].includes(chave) ? `; ${chave} é um ponto absoluto e não acompanha a peça, e fica de fora do cabo por portas` : ''}`);
    }
  }
  for (const lado of ['de', 'para']) {
    const ponta = pedido[lado];
    if (!plano(ponta) || typeof ponta.instancia !== 'string' || typeof ponta.porta !== 'string') recusar(`pedido.${lado}`, ponta, '{ instancia: "carcacaA", porta: "cabo" }, o id da instância da montagem e o id da porta que ela publica');
    for (const chave of Object.keys(ponta)) if (!['instancia', 'porta', 'sentido', 'afastamento'].includes(chave)) recusar(`pedido.${lado}.${chave}`, ponta[chave], 'só instancia, porta, sentido (1 ou -1) e afastamento (mm)');
    if (ponta.sentido !== undefined && ponta.sentido !== 1 && ponta.sentido !== -1) recusar(`pedido.${lado}.sentido`, ponta.sentido, '1 (o cabo sai pelo eixo da porta) ou -1 (sai ao contrário)');
    if (ponta.afastamento !== undefined && (typeof ponta.afastamento !== 'number' || !Number.isFinite(ponta.afastamento))) recusar(`pedido.${lado}.afastamento`, ponta.afastamento, 'um número em milímetro, ao longo da direção de saída');
  }
  return pedido;
}

/** O ponto e a direção de saída de uma ponta, em milímetro, a partir das portas resolvidas da montagem (`resolverPortasDeMontagem`, em metro). */
export function pontaDaPorta(portas, ponta, campo = 'pedido.de') {
  const porta = portas.get(`${ponta.instancia}.${ponta.porta}`);
  if (!porta) {
    const doDono = [...portas.keys()].filter((k) => k.startsWith(`${ponta.instancia}.`)).map((k) => k.slice(ponta.instancia.length + 1));
    recusar(campo, `${ponta.instancia}.${ponta.porta}`, `uma porta publicada pela instância: ${doDono.length ? `a instância '${ponta.instancia}' publica ${doDono.join(', ')}` : `a montagem não tem a instância '${ponta.instancia}' com portas`}`);
  }
  const direcao = mult(porta.eixo, ponta.sentido ?? 1);
  return { ponto: soma(mult(porta.centro, 1000), mult(direcao, ponta.afastamento ?? 0)), direcao };
}

/** O pedido absoluto (o do `cabo()`) do pedido por portas, com as portas na pose das `portas` recebidas. */
export function pedidoNaPose(pedido, portas) {
  lerPedidoPorPortas(pedido);
  const { de, para, ...resto } = pedido;
  return { ...resto, de: pontaDaPorta(portas, de, 'pedido.de'), para: pontaDaPorta(portas, para, 'pedido.para') };
}

/** As portas de uma montagem resolvida (os ids são `instancia.porta`, em metro), na pose das instâncias que ela traz. */
export function portasDaResolvida(resolvida) {
  return resolverPortasDeMontagem(resolvida.instancias.map((i) => ({ id: i.id, neutro: i.definicao.neutro, escala: 1, rotacao: i.poseMundo.rotacao, deslocamento: i.poseMundo.deslocamento })));
}

/**
 * A leitura da junta para o curso: os valores do curso (na unidade declarada e em SI), o eixo da porta da peça fixa na pose zero e as instâncias que se movem. `passos` troca o número de passos da declaração, para amostrar.
 */
export function cursoDaJunta(resolvida, declaracao, { passos } = {}) {
  const { articulacao, si } = lerArticulacao(declaracao);
  const n = passos ?? articulacao.passos;
  if (!Number.isInteger(n) || n < 1) throw new Error(`curso do cabo: passos precisa ser inteiro de 1 em diante; recebido ${n}`);
  const fixa = resolvida.instancias.find((i) => mesmoCaminho([i.id], articulacao.fixo.caminho));
  if (!fixa) throw new Error(`curso do cabo: a montagem não tem a instância '${articulacao.fixo.caminho.join('/')}' da junta '${articulacao.id}'`);
  const porta = fixa.definicao?.neutro?.portas?.get(articulacao.fixo.porta);
  if (!porta?.interface?.eixo) throw new Error(`curso do cabo: a instância '${fixa.id}' não publica a porta '${articulacao.fixo.porta}' com eixo`);
  const mundo = interfaceNoMundo(porta.interface, { rotacao: fixa.poseMundo.rotacao, deslocamento: fixa.poseMundo.deslocamento });
  const eixo = mult(mundo.eixo, 1 / norma(mundo.eixo));
  const prefixos = [articulacao.movel.caminho, ...articulacao.acompanham];
  const moveis = resolvida.instancias.filter((i) => prefixos.some((p) => comecaCom([i.id], p))).map((i) => i.id);
  const fator = UNIDADES_DO_CURSO[articulacao.tipo][articulacao.unidade];
  const valoresSI = Array.from({ length: n + 1 }, (_, i) => (i === n ? si.curso.maximo : si.curso.minimo + ((si.curso.maximo - si.curso.minimo) * i) / n));
  return {
    id: articulacao.id, tipo: articulacao.tipo, unidade: articulacao.unidade, passos: n, eixo, centro: mundo.centro, moveis, folga: si.folga,
    valores: valoresSI.map((v) => Number((v / fator).toPrecision(12)) + 0), valoresSI,
  };
}

/** A montagem resolvida com a junta no valor `valorSI` (radiano ou metro): as instâncias que ela move levadas à pose do passo. */
export function resolvidaNoValor(resolvida, curso, valorSI) {
  const giro = curso.tipo === 'prismatica' ? null : rotacaoEmTorno(curso.eixo, valorSI);
  return {
    ...resolvida,
    instancias: resolvida.instancias.map((i) => {
      if (!curso.moveis.includes(i.id)) return i;
      const { rotacao, deslocamento } = i.poseMundo;
      const nova = giro
        ? { rotacao: multiplicar(giro, rotacao), deslocamento: soma(aplicar(giro, sub(deslocamento, curso.centro)), curso.centro) }
        : { rotacao, deslocamento: soma(deslocamento, mult(curso.eixo, valorSI)) };
      return { ...i, poseMundo: { ...i.poseMundo, ...nova } };
    }),
  };
}

/**
 * O cabo refeito em cada passo do curso: `[{ indice, valor, unidade, pedido, ... }]`, em que `pedido` é o pedido absoluto do passo e o resto as medidas (distância entre as pontas, comprimento de corte, raio mínimo, faces) ou `recusa`, a
 * mensagem da família quando o cabo não existe naquela pose. O comprimento é o mesmo em todos os passos. Não confere interferência; para isso, `conferirCursoDoCabo`.
 */
export function refazerNoCurso(resolvida, declaracao, pedidoPorPortas, opcoes = {}) {
  const curso = cursoDaJunta(resolvida, declaracao, opcoes);
  lerPedidoPorPortas(pedidoPorPortas);
  return curso.valoresSI.map((valorSI, indice) => {
    const pose = resolvidaNoValor(resolvida, curso, valorSI);
    return { indice, valor: curso.valores[indice], unidade: curso.unidade, ...refazerNaPose(pedidoPorPortas, portasDaResolvida(pose)), pose };
  });
}

/** O cabo de uma pose: o pedido absoluto, as medidas e a classificação do motivo quando a família recusa o pedido. */
export function refazerNaPose(pedidoPorPortas, portas) {
  const pedido = pedidoNaPose(pedidoPorPortas, portas);
  const distancia = norma(sub(pedido.para.ponto, pedido.de.ponto));
  try {
    const chamadas = cabo(pedido);
    const medidas = medidasDoPedido(pedido).cabos[0];
    return { pedido, chamadas, distanciaEntrePontas: distancia, comprimentoDeCorte: medidas.comprimentoDeCorte, raioMinimo: medidas.raioMinimo, faces: medidas.faces };
  } catch (erro) {
    if (!(erro instanceof ErroChamadaDeFamilia)) throw erro;
    return { pedido, chamadas: null, distanciaEntrePontas: distancia, recusa: classificarRecusa(erro, distancia) };
  }
}

/* O motivo da recusa da família, no vocabulário da conferência. A família diz a restrição; o pedido, que não a tem, diz o campo. */
function classificarRecusa(erro, distancia) {
  const restricao = erro.restricao ?? '';
  const campo = String(erro.campo ?? '');
  const comprimento = /^restricao 'comprimento-passa-da-reta'/.test(campo) || restricao === 'comprimento-passa-da-reta' || restricao === 'comprimento-chega' || campo === 'pedido.comprimento' || campo === 'comprimento';
  let motivo = 'recusado';
  if (comprimento) motivo = 'estica';
  else if (restricao === 'raio-minimo-cabe') motivo = 'dobra';
  else if (restricao === 'sem-autocontato') motivo = 'autocontato';
  else if (/pontas-distintas/.test(campo) || restricao === 'pontas-distintas' || /pontas-distintas/.test(erro.message)) motivo = 'pontas-coladas';
  return { motivo, mensagem: erro.message, distanciaEntrePontas: distancia };
}

const descricaoDoMotivo = {
  estica: (m) => `o cabo estica: ${m}`,
  dobra: (m) => `o cabo dobra abaixo do raio mínimo: ${m}`,
  autocontato: (m) => `o cabo encosta em si mesmo: ${m}`,
  'pontas-coladas': (m) => `as pontas chegam a menos de um diâmetro uma da outra: ${m}`,
  recusado: (m) => `a família recusa o pedido: ${m}`,
};

/**
 * Confere o curso de uma junta com o cabo preso por portas. Em cada passo refaz o cabo e acusa, em `falhas`, o passo e o motivo (`estica`, `dobra`, `autocontato`, `pontas-coladas`, `atravessa`, `inconclusivo`). A interferência é o tubo do cabo contra cada sólido
 * da montagem na pose do passo, pela régua de `conferirArticulacao`: invade acima da folga (`opcoes.folga`, em milímetro, 0,3 por padrão) ou não se decide (malha aberta).
 *
 * `execucao` é a do registro das famílias (`{ registroOperacoes, registroComposicoes }`), para executar a receita do cabo e ter o tubo. Devolve `{ formato, versao, ok, articulacao, curso, comprimento, posicoes, falhas, legivel, segundos }`, com `legivel` em linhas de texto.
 */
export function conferirCursoDoCabo(resolvida, declaracao, pedidoPorPortas, execucao, opcoes = {}) {
  const extras = Object.keys(opcoes).filter((k) => !['passos', 'folga'].includes(k));
  if (extras.length) throw new Error(`conferir curso do cabo: opção desconhecida '${extras[0]}'; aceita passos e folga`);
  const folga = (opcoes.folga ?? FOLGA_PADRAO_DO_CABO) / 1000;
  const inicio = performance.now();
  const curso = cursoDaJunta(resolvida, declaracao, { passos: opcoes.passos });
  lerPedidoPorPortas(pedidoPorPortas);
  const posicoes = []; const falhas = []; const legivel = [];
  const fixos = new Map(); // solido preparado de cada instância que não se move
  const solidoDe = (i, pose) => prepararSolido(i.definicao.neutro, { rotacao: pose.rotacao, deslocamento: pose.deslocamento, escala: 1 }, [i.id]);
  for (let indice = 0; indice < curso.valoresSI.length; indice += 1) {
    const pose = resolvidaNoValor(resolvida, curso, curso.valoresSI[indice]);
    const feito = refazerNaPose(pedidoPorPortas, portasDaResolvida(pose));
    const valor = curso.valores[indice];
    const posicao = { indice, valor, unidade: curso.unidade, ok: true, distanciaEntrePontas: Number(feito.distanciaEntrePontas.toFixed(3)), falhas: [] };
    const falhar = (motivo, mensagem, extra = {}) => { posicao.ok = false; const f = { indice, valor, unidade: curso.unidade, motivo, mensagem, ...extra }; posicao.falhas.push(f); falhas.push(f); };
    if (feito.recusa) {
      falhar(feito.recusa.motivo, feito.recusa.mensagem);
    } else {
      Object.assign(posicao, { comprimentoDeCorte: Number(feito.comprimentoDeCorte.toFixed(3)), raioMinimo: Number(feito.raioMinimo.toFixed(3)), faces: feito.faces });
      const receita = { meta: { nome: 'cabo-na-pose' }, CHAMADAS_COMPOSICOES: feito.chamadas, PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {} };
      const { neutro } = executarReceita(receita, execucao);
      const tubo = prepararSolido(neutro, { rotacao: IDENTIDADE, deslocamento: [0, 0, 0], escala: 1 }, ['cabo']);
      if (tubo.inconclusivo) falhar('inconclusivo', `o tubo do cabo não é um sólido que se decida (${tubo.inconclusivo}): a curva dobra tão fechado que a seção se cruza; aumente raioMinimo, o comprimento ou afaste as pontas`);
      else for (const i of pose.instancias) {
        const movel = curso.moveis.includes(i.id);
        if (!movel && !fixos.has(i.id)) fixos.set(i.id, solidoDe(i, i.poseMundo));
        const solido = movel ? solidoDe(i, i.poseMundo) : fixos.get(i.id);
        const r = auditarParDeSolidos(tubo, solido, TOLERANCIA_CONTATO_SOLIDO);
        if (r.estado === 'inconclusivo') { falhar('inconclusivo', `o cabo contra '${i.id}' não se decide (${r.diagnosticos.join(', ')}); malha aberta não recebe veredito de cabo livre`, { contra: i.id }); continue; }
        if (r.estado !== 'interpenetram') continue;
        const penetracao = profundidadeDeInterpenetracao(tubo, solido, TOLERANCIA_CONTATO_SOLIDO);
        if (penetracao === null || penetracao > folga) {
          falhar('atravessa', `o cabo atravessa '${i.id}'${penetracao === null ? ' (penetração indeterminada: as malhas se cruzam só por arestas)' : `, penetrando ${mm(penetracao * 1000)}`}, acima da folga de ${mm(folga * 1000)}`, { contra: i.id, penetracao: penetracao === null ? null : Number((penetracao * 1000).toFixed(3)) });
        }
      }
    }
    posicoes.push(posicao);
  }
  for (const f of falhas) {
    const texto = f.motivo === 'atravessa' || f.motivo === 'inconclusivo' ? f.mensagem : descricaoDoMotivo[f.motivo](f.mensagem);
    legivel.push(`junta '${curso.id}', passo ${f.indice} de ${curso.passos} (${f.valor} ${f.unidade}): ${f.motivo}: ${texto}`);
  }
  const cortes = posicoes.filter((p) => p.comprimentoDeCorte !== undefined).map((p) => p.comprimentoDeCorte);
  const minimo = cortes.length ? Math.min(...cortes) : null; const maximo = cortes.length ? Math.max(...cortes) : null;
  return {
    formato: FORMATO_CONFERENCIA_DO_CABO,
    versao: VERSAO_CONFERENCIA_DO_CABO,
    ok: falhas.length === 0,
    articulacao: curso.id,
    curso: { minimo: curso.valores[0], maximo: curso.valores.at(-1), unidade: curso.unidade, passos: curso.passos },
    folga: Number((folga * 1000).toFixed(3)),
    comprimento: { minimo, maximo, desvio: minimo === null ? null : Number(((maximo - minimo) / minimo).toPrecision(3)) },
    posicoes,
    falhas,
    legivel,
    segundos: Number(((performance.now() - inicio) / 1000).toFixed(2)),
  };
}
