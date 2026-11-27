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
import { TOLERANCIA_DE_ALINHAMENTO, amostrarLinha, folgaAoSolido, pontoMaisFundo, pousoDaPonta } from './proximidade.js';

export const FORMATO_CONFERENCIA_DO_CABO = 'mecanifica.conferencia-do-cabo';
export const VERSAO_CONFERENCIA_DO_CABO = 1;
/** A penetração do tubo do cabo num sólido que ainda se tolera, em milímetro: a ponta pousa na superfície da porta e o polígono da seção tem uma flecha. */
export const FOLGA_PADRAO_DO_CABO = 0.3;
export const MOTIVOS_DO_CABO = Object.freeze(['estica', 'dobra', 'autocontato', 'pontas-coladas', 'atravessa', 'inconclusivo', 'desalinhada', 'recusado']);

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

/**
 * O cabo de uma pose: o pedido absoluto, as medidas e a classificação do motivo quando a família recusa o pedido. Com `solidoDe(idDaInstancia)` (o sólido preparado da instância na pose) confere o alinhamento de cada ponta pela
 * `conferirAlinhamentoDasPontas`: a porta fora do centro da face em que pousa, ou com a saída fora do eixo, recusa o pedido com o motivo `desalinhada`, antes de existir cabo.
 */
export function refazerNaPose(pedidoPorPortas, portas, { solidoDe, tolerancia = TOLERANCIA_DE_ALINHAMENTO } = {}) {
  const pedido = pedidoNaPose(pedidoPorPortas, portas);
  const distancia = norma(sub(pedido.para.ponto, pedido.de.ponto));
  if (solidoDe) {
    const problemas = conferirAlinhamentoDasPontas(pedidoPorPortas, portas, solidoDe, tolerancia);
    if (problemas.length) return { pedido, chamadas: null, distanciaEntrePontas: distancia, recusa: { motivo: 'desalinhada', mensagem: problemas.join('; '), distanciaEntrePontas: distancia } };
  }
  try {
    const chamadas = cabo(pedido);
    const medidas = medidasDoPedido(pedido).cabos[0];
    return { pedido, chamadas, distanciaEntrePontas: distancia, comprimentoDeCorte: medidas.comprimentoDeCorte, raioMinimo: medidas.raioMinimo, faces: medidas.faces };
  } catch (erro) {
    if (!(erro instanceof ErroChamadaDeFamilia)) throw erro;
    return { pedido, chamadas: null, distanciaEntrePontas: distancia, recusa: classificarRecusa(erro, distancia) };
  }
}

/**
 * O alinhamento das duas pontas do cabo com a saída real da peça: o centro da porta tem de ficar no centro da face plana do sólido em que pousa, nas três coordenadas (`tolerancia.posicaoMm`), e a direção em que o cabo sai tem de
 * seguir a normal dessa face para fora (`tolerancia.anguloGraus`). `solidoDe(idDaInstancia)` dá o sólido preparado da instância na pose. Devolve as frases de recusa, uma por ponta desalinhada; vazia quando as duas estão no centro.
 */
export function conferirAlinhamentoDasPontas(pedidoPorPortas, portas, solidoDe, tolerancia = TOLERANCIA_DE_ALINHAMENTO) {
  const problemas = [];
  for (const lado of ['de', 'para']) {
    const ponta = pedidoPorPortas[lado]; const porta = portas.get(`${ponta.instancia}.${ponta.porta}`);
    if (!porta) continue; // a recusa da porta ausente é a de `pontaDaPorta`
    const direcao = mult(porta.eixo, ponta.sentido ?? 1);
    const pouso = pousoDaPonta(solidoDe(ponta.instancia), porta.centro, direcao);
    const quem = `pedido.${lado}: a porta '${ponta.instancia}.${ponta.porta}'`;
    if (!pouso.achou) { problemas.push(`${quem} não fica numa face da peça (${pouso.motivo}); ponha a porta no centro da saída do cabo`); continue; }
    const [dx, dy, dz] = pouso.desvioMm;
    if ([dx, dy, dz].some((d) => Math.abs(d) > tolerancia.posicaoMm) || pouso.anguloGraus > tolerancia.anguloGraus) {
      problemas.push(`${quem} está a [${dx}, ${dy}, ${dz}] mm (x, y, z) do centro da face em que pousa (centro da face em ${formato(pouso.centroide)} mm) e a direção de saída fica a ${pouso.anguloGraus} graus da normal da face; aceito ${tolerancia.posicaoMm} mm em cada coordenada e ${tolerancia.anguloGraus} grau; ponha a porta no centro da saída do cabo, com o eixo para fora`);
    }
  }
  return problemas;
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
  desalinhada: (m) => `a ponta do cabo não fica na porta: ${m}`,
  recusado: (m) => `a família recusa o pedido: ${m}`,
};

/** O desvio das pontas do cabo construído às portas: o centro da ponta em cada coordenada e o ângulo da saída, contra a tolerância. Lista de problemas em texto, vazia quando as duas pontas estão na porta. */
function pontasForaDaPorta(neutro, pedido, tolerancia) {
  const problemas = [];
  for (const [lado, id] of [['de', 'ponta-a'], ['para', 'ponta-b']]) {
    const interface_ = neutro.portas?.get(id)?.interface;
    if (!interface_) { problemas.push({ lado, mensagem: `o cabo construído não publica a porta '${id}'` }); continue; }
    const esperado = pedido[lado];
    const desvio = [0, 1, 2].map((e) => Math.abs(interface_.centro[e] * 1000 - esperado.ponto[e]));
    const cos = dot(unitario(interface_.eixo), unitario(esperado.direcao));
    const angulo = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
    if (desvio.some((d) => d > tolerancia.posicaoMm) || angulo > tolerancia.anguloGraus) {
      problemas.push({ lado, mensagem: `a ponta '${id}' do cabo está a [${desvio.map((d) => Number(d.toFixed(3))).join(', ')}] mm (x, y, z) do centro da porta e a ${Number(angulo.toFixed(2))} graus da direção de saída; aceito ${tolerancia.posicaoMm} mm em cada coordenada e ${tolerancia.anguloGraus} grau` });
    }
  }
  return problemas;
}

const unitario = (a) => mult(a, 1 / norma(a));
const formato = (p) => `[${p.join(', ')}]`;

/**
 * Confere o curso de uma junta com o cabo preso por portas. Em cada passo refaz o cabo e acusa, em `falhas`, o passo e o motivo (`estica`, `dobra`, `autocontato`, `pontas-coladas`, `atravessa`, `inconclusivo`, `desalinhada`). A interferência é o
 * tubo do cabo contra cada sólido da montagem na pose do passo, pela régua de `conferirArticulacao`: invade acima da folga (`opcoes.folga`, em milímetro, 0,3 por padrão) ou não se decide (malha aberta). O `atravessa` diz o ângulo, a peça, o ponto
 * do cabo mais fundo nela e por onde uma braçadeira tiraria o cabo do caminho. O `desalinhada` é a ponta que não está no centro da porta, ou a porta que não está no centro da face da peça em que pousa, ou a saída que não segue o eixo da porta,
 * dentro de `opcoes.alinhamento` (`{ posicaoMm, anguloGraus }`, 0,1 mm e 1 grau por padrão).
 *
 * O CURSO FINO. O curso é amostrado nos passos da declaração, e uma falha que começa e termina entre dois passos não aparece neles. Onde a folga do cabo a algum sólido fica abaixo de `opcoes.limiarDeFolga` (milímetro, dois diâmetros do cabo por
 * padrão) num passo, o intervalo até o vizinho é dividido ao meio, e de novo, até os dois lados terem folga maior que o limiar ou o intervalo chegar a `opcoes.passoMinimo` (na unidade do curso, um oitavo do passo da declaração por padrão).
 * `limiarDeFolga: 0` desliga o refinamento. Os passos acrescentados trazem `fina: true` e o índice fracionário entre os da declaração.
 *
 * `execucao` é a do registro das famílias (`{ registroOperacoes, registroComposicoes }`), para executar a receita do cabo e ter o tubo. Devolve `{ formato, versao, ok, articulacao, curso, comprimento, refino, posicoes, falhas, legivel, segundos }`, com `legivel` em linhas de texto.
 */
export function conferirCursoDoCabo(resolvida, declaracao, pedidoPorPortas, execucao, opcoes = {}) {
  const extras = Object.keys(opcoes).filter((k) => !['passos', 'folga', 'limiarDeFolga', 'passoMinimo', 'alinhamento'].includes(k));
  if (extras.length) throw new Error(`conferir curso do cabo: opção desconhecida '${extras[0]}'; aceita passos, folga, limiarDeFolga, passoMinimo e alinhamento`);
  const folga = (opcoes.folga ?? FOLGA_PADRAO_DO_CABO) / 1000;
  const tolerancia = { ...TOLERANCIA_DE_ALINHAMENTO, ...(opcoes.alinhamento ?? {}) };
  const inicio = performance.now();
  const curso = cursoDaJunta(resolvida, declaracao, { passos: opcoes.passos });
  lerPedidoPorPortas(pedidoPorPortas);
  const limiar = (opcoes.limiarDeFolga ?? 2 * (pedidoPorPortas.diametro ?? 0)) / 1000;
  const passoCurso = (curso.valoresSI.at(-1) - curso.valoresSI[0]) / curso.passos;
  const unidadeSI = (curso.valoresSI[1] - curso.valoresSI[0]) / (curso.valores[1] - curso.valores[0]); // o valor SI de uma unidade do curso
  const passoMinimo = (opcoes.passoMinimo ?? (curso.valores[1] - curso.valores[0]) / 8) * unidadeSI;
  if (!(passoMinimo > 0)) throw new Error(`conferir curso do cabo: passoMinimo precisa ser positivo; recebido ${opcoes.passoMinimo}`);
  const fixos = new Map(); // solido preparado de cada instância que não se move
  let avaliacoes = 0;

  /** O cabo e a conferência numa pose: `{ posicao, falhas }`. */
  function avaliar(valorSI, indice) {
    avaliacoes += 1;
    const pose = resolvidaNoValor(resolvida, curso, valorSI);
    const preparados = new Map();
    const solidoDe = (id) => {
      if (preparados.has(id)) return preparados.get(id);
      const i = pose.instancias.find((x) => x.id === id);
      const movel = curso.moveis.includes(id);
      if (!movel && fixos.has(id)) return fixos.get(id);
      const s = prepararSolido(i.definicao.neutro, { rotacao: i.poseMundo.rotacao, deslocamento: i.poseMundo.deslocamento, escala: 1 }, [id]);
      if (movel) preparados.set(id, s); else fixos.set(id, s);
      return s;
    };
    const feito = refazerNaPose(pedidoPorPortas, portasDaResolvida(pose), { solidoDe, tolerancia });
    const valor = Number((curso.valores[0] + ((curso.valores.at(-1) - curso.valores[0]) * (valorSI - curso.valoresSI[0])) / (curso.valoresSI.at(-1) - curso.valoresSI[0])).toPrecision(10)) + 0;
    const posicao = { indice, valor, unidade: curso.unidade, ok: true, distanciaEntrePontas: Number(feito.distanciaEntrePontas.toFixed(3)), falhas: [] };
    const falhar = (motivo, mensagem, extra = {}) => { posicao.ok = false; const f = { indice, valor, unidade: curso.unidade, motivo, mensagem, ...extra }; posicao.falhas.push(f); };
    if (feito.recusa) {
      falhar(feito.recusa.motivo, feito.recusa.mensagem);
      return { posicao, valor };
    }
    Object.assign(posicao, { comprimentoDeCorte: Number(feito.comprimentoDeCorte.toFixed(3)), raioMinimo: Number(feito.raioMinimo.toFixed(3)), faces: feito.faces });
    const receita = { meta: { nome: 'cabo-na-pose' }, CHAMADAS_COMPOSICOES: feito.chamadas, PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {} };
    const { neutro } = executarReceita(receita, execucao);
    const tubo = prepararSolido(neutro, { rotacao: IDENTIDADE, deslocamento: [0, 0, 0], escala: 1 }, ['cabo']);
    if (tubo.inconclusivo) {
      falhar('inconclusivo', `o tubo do cabo não é um sólido que se decida (${tubo.inconclusivo}): a curva dobra tão fechado que a seção se cruza; aumente raioMinimo, o comprimento ou afaste as pontas`);
      return { posicao, valor };
    }
    for (const p of pontasForaDaPorta(neutro, feito.pedido, tolerancia)) falhar('desalinhada', `${p.lado === 'de' ? 'pedido.de' : 'pedido.para'}: ${p.mensagem}`);
    const raio = feito.pedido.diametro / 2000;
    const linha = linhaDoCabo(feito.chamadas);
    const amostras = linha ? amostrarLinha(linha, Math.max(raio, 0.0005)) : [];
    const comprimentoDaLinha = amostras.length ? amostras.at(-1).arco : 0;
    let menorFolga = null;
    for (const i of pose.instancias) {
      const solido = solidoDe(i.id);
      const r = auditarParDeSolidos(tubo, solido, TOLERANCIA_CONTATO_SOLIDO);
      if (r.estado === 'inconclusivo') { falhar('inconclusivo', `o cabo contra '${i.id}' não se decide (${r.diagnosticos.join(', ')}); malha aberta não recebe veredito de cabo livre`, { contra: i.id }); continue; }
      if (r.estado === 'interpenetram') {
        const penetracao = profundidadeDeInterpenetracao(tubo, solido, TOLERANCIA_CONTATO_SOLIDO);
        if (penetracao === null || penetracao > folga) {
          const fundo = amostras.length ? pontoMaisFundo(amostras, raio, solido, folga) : null;
          const saida = fundo ? `; o ponto do cabo mais fundo na peça está em ${formato(fundo.ponto)} mm, a saída mais curta é na direção ${formato(fundo.direcao)}, e uma braçadeira em ${formato(fundo.ponteDaBracadeira)} mm (a ${fundo.deslocamento} mm dali) tiraria o cabo do caminho` : '';
          falhar('atravessa', `o cabo atravessa '${i.id}' a ${valor} ${curso.unidade}, penetrando ${penetracao === null ? 'por aresta (penetração indeterminada)' : mm(penetracao * 1000)}, acima da folga de ${mm(folga * 1000)}${saida}`, {
            contra: i.id, penetracao: penetracao === null ? null : Number((penetracao * 1000).toFixed(3)), ...(fundo ? { pontoMaisFundo: fundo.ponto, direcaoDeSaida: fundo.direcao, bracadeira: fundo.ponteDaBracadeira, deslocamento: fundo.deslocamento } : {}),
          });
        }
      }
      if (limiar > 0 && amostras.length) {
        const ignorarAte = pedidoPorPortas.de.instancia === i.id ? limiar + raio : 0;
        const ignorarDesde = pedidoPorPortas.para.instancia === i.id ? comprimentoDaLinha - limiar - raio : Infinity;
        const f = folgaAoSolido(amostras, raio, solido, { ignorarAte, ignorarDesde, alcance: limiar });
        if (f.folga !== Infinity && (!menorFolga || f.folga < menorFolga.valor)) menorFolga = { valor: f.folga, contra: i.id, noArco: f.arco };
      }
    }
    posicao.folgaMinima = menorFolga;
    return { posicao, valor };
  }

  const posicoes = []; const falhas = [];
  const indiceDe = (valorSI) => Number(((valorSI - curso.valoresSI[0]) / passoCurso).toPrecision(8));
  const apertada = (p) => limiar > 0 && p.folgaMinima !== undefined && p.folgaMinima !== null && p.folgaMinima.valor < limiar * 1000;
  const grossos = curso.valoresSI.map((v, k) => ({ v, ...avaliar(v, k) }));
  const refinar = (a, b) => {
    if (limiar <= 0 || b.v - a.v <= passoMinimo * 1.0000001) return [];
    if (!apertada(a.posicao) && !apertada(b.posicao)) return [];
    const v = (a.v + b.v) / 2; const meio = { v, ...avaliar(v, indiceDe(v)) }; meio.posicao.fina = true;
    return [...refinar(a, meio), meio, ...refinar(meio, b)];
  };
  grossos.forEach((p, k) => { posicoes.push(p.posicao); if (k < grossos.length - 1) for (const m of refinar(p, grossos[k + 1])) posicoes.push(m.posicao); });
  for (const p of posicoes) falhas.push(...p.falhas);
  const legivel = falhas.map((f) => `junta '${curso.id}', passo ${f.indice} de ${curso.passos} (${f.valor} ${f.unidade}): ${f.motivo}: ${f.motivo === 'atravessa' || f.motivo === 'inconclusivo' ? f.mensagem : (descricaoDoMotivo[f.motivo] ?? descricaoDoMotivo.recusado)(f.mensagem)}`);
  const cortes = posicoes.filter((p) => p.comprimentoDeCorte !== undefined).map((p) => p.comprimentoDeCorte);
  const minimo = cortes.length ? Math.min(...cortes) : null; const maximo = cortes.length ? Math.max(...cortes) : null;
  return {
    formato: FORMATO_CONFERENCIA_DO_CABO,
    versao: VERSAO_CONFERENCIA_DO_CABO,
    ok: falhas.length === 0,
    articulacao: curso.id,
    curso: { minimo: curso.valores[0], maximo: curso.valores.at(-1), unidade: curso.unidade, passos: curso.passos },
    folga: Number((folga * 1000).toFixed(3)),
    alinhamento: tolerancia,
    refino: { limiarDeFolga: Number((limiar * 1000).toFixed(3)), passoMinimo: Number((passoMinimo / unidadeSI).toPrecision(6)) + 0, avaliacoes, passosAcrescentados: posicoes.filter((p) => p.fina).length },
    comprimento: { minimo, maximo, desvio: minimo === null ? null : Number(((maximo - minimo) / minimo).toPrecision(3)) },
    posicoes,
    falhas,
    legivel,
    segundos: Number(((performance.now() - inicio) / 1000).toFixed(2)),
  };
}

/** A linha de centro do cabo em metro, dos pontos `p0`, `p1`, ... da primeira chamada de composição; null se a chamada não os traz. */
export function linhaDoCabo(chamadas) {
  const a = chamadas?.[0]?.argumentos;
  if (!a) return null;
  const pontos = [];
  for (let k = 0; Array.isArray(a[`p${k}`]); k += 1) pontos.push(a[`p${k}`]);
  return pontos.length >= 2 ? pontos : null;
}
