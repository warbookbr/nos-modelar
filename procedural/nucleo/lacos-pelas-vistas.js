/* lacos-pelas-vistas.js — os laços de `gaiolaPorLacos` tirados de três vistas: a silhueta de lado, a largura por altura e a planta
 *
 * FICHA lacosPelasVistas
 * serve: laços horizontais de um corpo dado pela silhueta de lado, pela meia largura em cada altura (a vista de frente ou de trás) e
 *   pela planta; as pontas da planta acompanham a silhueta de lado em toda altura, e por isso o canto, o bico e a rampa da ponta
 *   seguem a curva da planta.
 * quando: casco de planta arredondada visto por três lados (carenagem, tampa, casco de máquina); o cruzamento das três extrusões
 *   (`extrusao` + `intersectar`) só mantém o perfil da ponta no centro, e para os lados a planta corta antes.
 * unidades: tudo em mm; espalhe `trechos`, `lacos` e `tampa` em `gaiolaPorLacos`, com `nome`, `eixo` (o da altura) e os `vincos`.
 * campos:
 *   lado: [[c, a], ...] polígono da silhueta de lado; c corre no comprimento e a é a altura. Cada altura corta um intervalo só.
 *   perfil: [[a, meia], ...] a meia largura em cada altura, em altura crescente; entre dois pontos vale a reta, e fora deles, a ponta.
 *   planta: [[l, c], ...] polígono da planta; l é a lateral e c o comprimento. Dela saem a meia largura máxima e o recuo de cada
 *     ponta em cada lateral (quanto a borda fica aquém do extremo da planta).
 *   estacoes: [a, ...] as alturas dos laços, em crescente; a primeira e a última são levadas para dentro da silhueta.
 *   pontos: quantos pontos têm o início e o fim de cada laço (padrão 9), e pontosDoLado, quantos tem cada lado (padrão 4).
 *   espessuraMinima: o menor comprimento do lado do laço, em mm (padrão 2); no laço curto os recuos encolhem por igual até caber.
 *   cantos: 'acompanham' (padrão) leva a ponta inteira da planta à silhueta, e o degrau da silhueta dá a volta com a mesma
 *     profundidade; 'fixos' deixa os cantos da planta onde estão e encolhe o recuo da ponta na altura em que a silhueta fica aquém
 *     do extremo dela, e o degrau some para os lados. extremos: { inicio?, fim? } troca o extremo a que 'fixos' se refere.
 * devolve: { trechos, lacos, tampa, meiaPlanta, avisos }, com os trechos `inicio`, `direita`, `fim` e `esquerda`; o ponto do laço é
 *   [l, c], o que em `gaiolaPorLacos` de eixo y é [x, z].
 * exemplo:
 *   lacosPelasVistas({ lado: [[0, 0], [600, 0], [640, 300], [560, 500], [0, 500]], perfil: [[0, 480], [380, 500], [500, 420]],
 *     planta: [[-500, 0], [500, 0], [500, 440], [300, 600], [0, 640], [-300, 600], [-500, 440]],
 *     estacoes: [0, 150, 300, 400, 480, 500] })
 * peça: procedural/pecas/empilhadeira/referencias/carcaca-traseira.esboco.mjs (três corpos e uma placa fina).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio. EM CADA ALTURA a silhueta de lado dá o intervalo [c0, c1] do comprimento, o perfil dá a
 * meia largura w, e o laço é a planta recortada em |l| <= w com a ponta do início levada a c0 e a do fim a c1: a borda do início
 * fica em c0 + recuoDoInicio(l) e a do fim em c1 - recuoDoFim(l), onde o recuo é o que a planta mede naquela lateral. O perfil da
 * ponta que a silhueta de lado traz (o canto arredondado, o degrau de um bico, a rampa) vale então em toda a largura, deslocado
 * pela curva da planta, em vez de valer só onde a planta chega ao extremo.
 *
 * OS CANTOS FIXOS. Com `cantos: 'fixos'`, o recuo de cada ponta é multiplicado por 1 - d / R, onde d é quanto a silhueta fica aquém
 * do extremo dela naquela altura e R é o recuo da planta no canto (na meia largura máxima); abaixo de zero vale zero, e a ponta
 * fica reta. O canto da planta fica então no mesmo lugar em toda altura, e só o meio da ponta acompanha a silhueta: o bico de um
 * capô morre nos cantos em vez de dar a volta com a profundidade do centro.
 *
 * O LAÇO CURTO. Onde o intervalo da altura mede menos que os dois recuos somados (a aba de uma tampa, a ponta de um bico), os
 * recuos encolhem por igual até o lado do laço medir `espessuraMinima`, e a altura entra em `avisos`.
 *
 * SEM COMPENSAR. Com `compensar: true` em `gaiolaPorLacos`, a superfície de um capô de 1.190 mm passou de 10 a 30 mm do pedido e
 * ondulou depois de cada degrau da silhueta; sem ela, com um laço a cada 20 a 40 mm, a largura sai no pedido e a ponta fica 5 mm
 * para dentro, sem onda (medido em 2026-11-09, por faixa de altura da malha subdividida). Deixe `compensar` para o arco de cota.
 *
 * AS RECUSAS. Silhueta que uma altura corta em mais de um intervalo, altura fora da silhueta, perfil fora de ordem e planta com
 * menos de três pontos são recusados com a medida. */

const erro = (texto) => { throw new Error(`lacosPelasVistas: ${texto}`); };
const br = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');

/* os cruzamentos de uma reta `coordenada[eixo] = valor` com as arestas do polígono, na outra coordenada, em crescente */
function cruzamentos(poligono, eixo, valor) {
  const outro = 1 - eixo;
  const cortes = [];
  for (let i = 0; i < poligono.length; i += 1) {
    const p = poligono[i];
    const q = poligono[(i + 1) % poligono.length];
    const dp = p[eixo] - valor;
    const dq = q[eixo] - valor;
    if (dp === 0 && dq === 0) { cortes.push(p[outro], q[outro]); continue; }
    if ((dp < 0 && dq < 0) || (dp > 0 && dq > 0)) continue;
    cortes.push(p[outro] + (q[outro] - p[outro]) * (dp / (dp - dq)));
  }
  return cortes.sort((a, b) => a - b);
}

function interpolar(tabela, valor) {
  if (valor <= tabela[0][0]) return tabela[0][1];
  for (let i = 1; i < tabela.length; i += 1) {
    const [a0, v0] = tabela[i - 1];
    const [a1, v1] = tabela[i];
    if (valor <= a1) return v0 + (v1 - v0) * ((valor - a0) / ((a1 - a0) || 1));
  }
  return tabela[tabela.length - 1][1];
}

const poligonoValido = (p, nome) => {
  if (!Array.isArray(p) || p.length < 3 || !p.every((q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite))) {
    erro(`${nome} precisa ser um polígono de pelo menos três pontos [a, b] numéricos`);
  }
};

/**
 * Os laços horizontais de um corpo visto de lado, de frente ou de trás e de cima, para `gaiolaPorLacos`.
 * @param {{ lado: number[][], perfil: number[][], planta: number[][], estacoes: number[], pontos?: number, pontosDoLado?: number, espessuraMinima?: number, cantos?: 'acompanham' | 'fixos', extremos?: { inicio?: number, fim?: number } }} o
 */
export function lacosPelasVistas(o) {
  if (o == null || typeof o !== 'object') erro('espera { lado, perfil, planta, estacoes }');
  poligonoValido(o.lado, 'lado');
  poligonoValido(o.planta, 'planta');
  if (!Array.isArray(o.perfil) || o.perfil.length < 1 || !o.perfil.every((q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite))) {
    erro('perfil precisa ser uma lista de [altura, meia largura]');
  }
  for (let i = 1; i < o.perfil.length; i += 1) {
    if (!(o.perfil[i][0] > o.perfil[i - 1][0])) erro(`perfil fora de ordem: a altura ${br(o.perfil[i][0])} vem depois de ${br(o.perfil[i - 1][0])}`);
  }
  if (!Array.isArray(o.estacoes) || o.estacoes.length < 2 || !o.estacoes.every(Number.isFinite)) erro('estacoes precisa ter pelo menos duas alturas');
  for (let i = 1; i < o.estacoes.length; i += 1) {
    if (!(o.estacoes[i] > o.estacoes[i - 1])) erro(`estacoes fora de ordem: ${br(o.estacoes[i])} vem depois de ${br(o.estacoes[i - 1])}`);
  }
  const pontos = o.pontos ?? 9;
  if (!Number.isInteger(pontos) || pontos < 3) erro('pontos precisa ser um inteiro a partir de 3');
  const pontosDoLado = o.pontosDoLado ?? 4;
  if (!Number.isInteger(pontosDoLado) || pontosDoLado < 2) erro('pontosDoLado precisa ser um inteiro a partir de 2');
  const espessura = o.espessuraMinima ?? 2;
  if (!(espessura > 0)) erro('espessuraMinima precisa ser maior que zero');

  const alturas = o.lado.map((p) => p[1]);
  const aMin = Math.min(...alturas);
  const aMax = Math.max(...alturas);
  const folga = (aMax - aMin) * 1e-6;
  const cs = o.planta.map((p) => p[1]);
  const cMin = Math.min(...cs);
  const cMax = Math.max(...cs);
  const meiaPlanta = Math.max(...o.planta.map((p) => Math.abs(p[0])));
  const folgaDaPlanta = meiaPlanta * 1e-6;

  /* o recuo de cada ponta da planta na lateral l */
  const recuos = (l) => {
    const dentro = Math.max(-meiaPlanta + folgaDaPlanta, Math.min(meiaPlanta - folgaDaPlanta, l));
    const cortes = cruzamentos(o.planta, 0, dentro);
    if (cortes.length < 2) erro(`a planta não tem borda na lateral ${br(l)} mm`);
    return { inicio: cortes[0] - cMin, fim: cMax - cortes[cortes.length - 1] };
  };

  const cantos = o.cantos ?? 'acompanham';
  if (cantos !== 'acompanham' && cantos !== 'fixos') erro("cantos é 'acompanham' ou 'fixos'");
  const csDoLado = o.lado.map((p) => p[0]);
  const extremos = { inicio: o.extremos?.inicio ?? Math.min(...csDoLado), fim: o.extremos?.fim ?? Math.max(...csDoLado) };
  if (!Number.isFinite(extremos.inicio) || !Number.isFinite(extremos.fim)) erro('extremos precisa ser { inicio?, fim? } com números');
  const noCantoDaPlanta = recuos(meiaPlanta);
  /* o fator do recuo de uma ponta quando os cantos são fixos: d é quanto a silhueta fica aquém do extremo naquela altura */
  const fator = (d, R) => (cantos === 'fixos' && R > 0 ? Math.max(0, 1 - Math.max(0, d) / R) : 1);

  const avisos = [];
  const lacos = o.estacoes.map((a, r) => {
    if (a < aMin - folga || a > aMax + folga) erro(`a estação ${br(a)} mm está fora da silhueta de lado, que vai de ${br(aMin)} a ${br(aMax)} mm`);
    const corte = Math.max(aMin + folga, Math.min(aMax - folga, a));
    const cortes = cruzamentos(o.lado, 1, corte);
    if (cortes.length < 2) erro(`a silhueta de lado não tem intervalo na altura ${br(a)} mm`);
    if (cortes.length > 2 && cortes.slice(1, -1).some((c) => c - cortes[0] > 1e-6 && cortes[cortes.length - 1] - c > 1e-6)) {
      erro(`a altura ${br(a)} mm corta a silhueta de lado em mais de um intervalo (${cortes.map(br).join(', ')}); parta a parte em duas`);
    }
    const c0 = cortes[0];
    const c1 = cortes[cortes.length - 1];
    let w = interpolar(o.perfil, a);
    if (w > meiaPlanta) { avisos.push(`na altura ${br(a)} mm o perfil (${br(w)} mm) passa da planta (${br(meiaPlanta)} mm) e foi limitado a ela`); w = meiaPlanta; }
    if (!(w > 0)) erro(`a meia largura na altura ${br(a)} mm é ${br(w)}; precisa ser maior que zero`);
    const noCanto = recuos(w);
    const cabe = c1 - c0 - espessura;
    if (!(cabe > 0)) erro(`o intervalo da altura ${br(a)} mm mede ${br(c1 - c0)} mm, menos que a espessuraMinima`);
    const fI = fator(c0 - extremos.inicio, noCantoDaPlanta.inicio);
    const fF = fator(extremos.fim - c1, noCantoDaPlanta.fim);
    const soma = fI * noCanto.inicio + fF * noCanto.fim;
    const k = soma > cabe ? cabe / soma : 1;
    if (k < 1) avisos.push(`na altura ${br(a)} mm o intervalo (${br(c1 - c0)} mm) é curto para os recuos da planta (${br(soma)} mm), que encolheram a ${br(k * 100)}%`);
    const N = 24;
    const ls = Array.from({ length: N + 1 }, (_, i) => -w + (2 * w * i) / N);
    const inicio = ls.map((l) => [l, c0 + k * fI * recuos(l).inicio]);
    const fim = ls.map((l) => [l, c1 - k * fF * recuos(l).fim]).reverse();
    return {
      nome: `e${r}`,
      em: a,
      trechos: { inicio, direita: [inicio[N], fim[0]], fim, esquerda: [fim[N], inicio[0]] },
    };
  });

  return {
    trechos: [{ nome: 'inicio', pontos }, { nome: 'direita', pontos: pontosDoLado }, { nome: 'fim', pontos }, { nome: 'esquerda', pontos: pontosDoLado }],
    lacos,
    tampa: { de: 'esquerda', ate: 'direita' },
    meiaPlanta,
    avisos,
  };
}
