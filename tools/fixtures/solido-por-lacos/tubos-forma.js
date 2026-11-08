/* tubos-forma.js — a forma da peça de prova "dois tubos que se cruzam": um tubo em pé, de 156 mm de diâmetro, cruzado no alto por um
 * tubo deitado de mesmo diâmetro, que passa 19 mm à frente dele, numa malha só por `gaiolaPorLacos` (eixo X) e com o filete do encontro
 * sumindo na tangente. Dá a peça de duas formas, que só diferem em como o corpo em pé acaba na frente, onde a parede dele toca o plano de
 * corte (a tangente) e a faixa dele, que é a corda do círculo do tubo em pé no plano, vai a zero:
 *
 *   'hoje'  a técnica sem os campos novos: dois laços a 0,2 mm um do outro em volta da tangente, com vinco 'viva' de laço inteiro, e uma
 *           rampa de laços de faixa sem altura, com o filete diminuindo. Deixa uma aba torta com uma aresta fina embaixo da frente.
 *   'nova'  a faixa inteira (filete, parede, chanfro e pé) encolhe até um ponto do círculo do tubo deitado numa faixa de laços a
 *           2,5 mm um do outro (`encolhe` nos trechos), e o vinco do chanfro perde a nitidez na mesma faixa (`esvai`).
 *
 * Referencial: origem no centro da face de baixo do tubo em pé; y para cima; x é o eixo do tubo deitado, com a saída para +x; z
 * atravessa a peça. O eixo do tubo deitado está em y = alturaDoEixo, z = 0, e ele corre de x = -raio (rente às costas do tubo em pé) a
 * x = -raio + comprimento. Cada laço é o corte por um plano x = constante: o círculo do tubo deitado, com a faixa do tubo em pé que
 * desce dele até y = 0, o filete do encontro nos dois cantos e o chanfro estreito da face de baixo. Atrás, os planos ficam em torno do
 * eixo do tubo em pé (x = -raio * cos, a cada 10 graus), de modo que o círculo do tubo em pé sai dos próprios pontos do laço; a face de
 * trás é a tampa da gaiola, plana, com o chanfro em vinco. */
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';

export const TABELA = {
  raio: 78,
  alturaDoEixo: 117,
  comprimento: 175,
  chanfro: 2,
  fundoDoChanfro: 2.6,
  nitidezDoChanfro: 0.8,
  raioDoEncontro: 12,
  tangenteMinimaDoFilete: 3,
  passoDosPlanos: 10,
  passoNaFrente: 8,
  /* só na técnica 'hoje': distância (mm) da tangente dos dois planos onde a faixa acaba, e como o filete some na rampa (1 é linear) */
  recuoDaPerna: 0.1,
  expoenteDaRampa: 0.5,
  /* só na técnica 'nova': onde a faixa que encolhe começa, em mm antes da tangente, o passo dos planos nela (não menos que 2,5) e como o
     peso cresce na faixa ('linear' ou 'entrada', que parte parado) */
  inicioDoEncolhimento: 30,
  passoDoEncolhimento: 2.5,
  curvaDoEncolhimento: 'linear',
  niveis: 2,
};

export const TECNICAS = ['hoje', 'nova'];

/* A tabela de cada técnica: a de hoje usa a parede e os números do caso que a motivou, e a nova, uma parede enxuta e a faixa de 40 mm. */
export const PAREDE_ENXUTA = [['A', 0.02, 2], ['B', 0.07, 2], ['C', 0.22, 3], ['D', 0.5, 3], ['E', 1, 3]];
export function tabelaDe(tecnica = 'hoje', mudancas = {}) {
  exigirTecnica(tecnica);
  const propria = tecnica === 'nova' ? { parede: PAREDE_ENXUTA, inicioDoEncolhimento: 40, curvaDoEncolhimento: 'entrada' } : {};
  return { ...TABELA, ...propria, ...mudancas };
}
const graus = (g) => (g * Math.PI) / 180;
/* Os trechos da parede do tubo em pé, do filete à face de baixo: a fração acumulada da altura em que cada um acaba e os pontos dele. */
export const PAREDE_DE_HOJE = [['A', 0.03, 2], ['B', 0.08, 3], ['C', 0.17, 3], ['D', 0.32, 4], ['E', 0.55, 5], ['F', 0.78, 5], ['G', 0.92, 3], ['H', 1, 3]];
const PONTOS_DO_ARCO = 19;
const nomesDaFaixa = (parede) => ['filD', ...parede.map(([n]) => `lado${n}_D`), 'chPeD', 'pe', 'chPeE', ...[...parede].reverse().map(([n]) => `lado${n}_E`), 'filE'];

function exigirTecnica(tecnica) {
  if (!TECNICAS.includes(tecnica)) throw new Error(`tubos-forma: técnica ${JSON.stringify(tecnica)}; é 'hoje' ou 'nova'`);
}

/* Os planos da gaiola, em mm, com o tipo de cada um: 'tras' (tampa de trás), 'perna' (com a faixa do tubo em pé), 'rampa' (só na técnica
   'hoje': faixa sem altura, na frente da tangente), 'zero' (só na técnica 'nova': a faixa já é um ponto), 'frente' (só o tubo deitado, na
   técnica 'hoje') e 'tampa' (a face da frente). */
export function planosDeCorte(t = TABELA, tecnica = 'hoje') {
  exigirTecnica(tecnica);
  const rc = t.raio;
  const xFace = -rc + t.comprimento;
  const angulos = [0, Math.acos(1 - t.fundoDoChanfro / rc) * (180 / Math.PI)];
  while (angulos[angulos.length - 1] + t.passoDosPlanos < 90 - 1e-9) angulos.push(angulos[angulos.length - 1] + t.passoDosPlanos);
  angulos.push(90);
  for (const g of [...angulos].reverse().slice(1)) angulos.push(180 - g);
  const ate = xFace - t.fundoDoChanfro;
  if (tecnica === 'hoje') {
    const xUltimaPerna = rc - t.recuoDaPerna;
    const lista = angulos.map((g) => ({ x: -rc * Math.cos(graus(g)), tipo: 'perna' })).filter(({ x }) => x < xUltimaPerna - 2.5 - 1e-6);
    lista[0].tipo = 'tras';
    lista.push({ x: xUltimaPerna, tipo: 'perna' });
    const de = rc + t.recuoDaPerna;
    lista.push({ x: de, tipo: 'rampa' });
    const nRampa = Math.max(1, Math.floor((ate - 2.5 - de) / 2.5 + 1e-9));
    for (let k = 1; k <= nRampa; k++) lista.push({ x: de + 2.5 * k, tipo: 'rampa' });
    const fimDaRampa = de + 2.5 * (nRampa + 1);
    lista.forEach((l) => { if (l.tipo === 'rampa') l.s = Math.max(0, 1 - (l.x - de) / (fimDaRampa - de)) ** t.expoenteDaRampa; });
    const n = Math.max(0, Math.ceil((ate - (de + 2.5 * nRampa)) / t.passoNaFrente) - 1);
    for (let k = 1; k <= n; k++) lista.push({ x: de + 2.5 * nRampa + ((ate - (de + 2.5 * nRampa)) * k) / (n + 1), tipo: 'frente' });
    lista.push({ x: ate, tipo: 'frente' });
    lista.push({ x: xFace, tipo: 'tampa' });
    return lista;
  }
  /* 'nova': os planos em torno do eixo até o começo da faixa, a faixa a passo igual até a tangente, e o tubo deitado até a face */
  if (t.passoDoEncolhimento < 2.5) throw new Error('tubos-forma: passoDoEncolhimento abaixo de 2,5 mm, o mínimo entre planos');
  const xDe = rc - t.inicioDoEncolhimento;
  const lista = angulos.map((g) => ({ x: -rc * Math.cos(graus(g)), tipo: 'perna' })).filter(({ x }) => x < xDe - 2.5 - 1e-6);
  lista[0].tipo = 'tras';
  const m = Math.max(1, Math.floor(t.inicioDoEncolhimento / t.passoDoEncolhimento + 1e-9));
  for (let k = 0; k < m; k++) lista.push({ x: xDe + (t.inicioDoEncolhimento * k) / m, tipo: 'perna', faixa: k === 0 ? 'de' : null });
  lista.push({ x: rc, tipo: 'zero', faixa: 'ate' });
  const n = Math.max(0, Math.ceil((ate - rc) / t.passoNaFrente) - 1);
  for (let k = 1; k <= n; k++) lista.push({ x: rc + ((ate - rc) * k) / (n + 1), tipo: 'zero' });
  lista.push({ x: ate, tipo: 'zero' });
  lista.push({ x: xFace, tipo: 'tampa' });
  return lista;
}

/* O laço de um plano, em mm: primeiro na forma da coluna ([x, y] com o círculo na origem e a faixa descendo, y para baixo), depois a rotação
   [x, y] -> [u, v] = [alturaDoEixo - y, x]. A volta parte do alto do círculo e a ordem dos trechos é a mesma em todo laço. */
export function lacoNoPlano(t, plano, tecnica = 'hoje') {
  const rc = t.raio;
  const c = t.chanfro;
  const yPe = t.alturaDoEixo;
  const PAREDE = t.parede ?? PAREDE_DE_HOJE;
  const FRACOES = PAREDE.map(([, f]) => f);
  const { x, tipo, s: fracao } = plano;
  const ehTampa = tipo === 'tras' || tipo === 'tampa';
  const R = ehTampa ? rc - c : rc;
  /* a faixa já é um ponto: o fundo do círculo; na técnica 'hoje' a tampa da frente é o círculo inteiro com os trechos da faixa viram arcos */
  const fundida = tipo === 'zero' || (tipo === 'tampa' && tecnica === 'nova');
  const arcosNaTampa = tipo === 'tampa' && tecnica === 'hoje';
  const semAltura = tipo === 'rampa' || tipo === 'frente';
  const chordaNoRecuo = Math.sqrt(rc * rc - (rc - t.recuoDaPerna) ** 2);
  const zc = tipo === 'tras' ? t.recuoDaPerna : x + rc;
  const b = arcosNaTampa || semAltura ? chordaNoRecuo : Math.sqrt(Math.max(0, rc * rc - (zc - rc) ** 2));
  const bt = Math.sqrt(Math.max(0, (rc - c) * (rc - c) - (zc - rc) ** 2));
  const yc = Math.sqrt(Math.max(0, R * R - b * b));
  const psi = Math.acos(Math.min(1, b / rc));
  const tlCheio = Math.max(t.raioDoEncontro * Math.tan(psi / 2), t.tangenteMinimaDoFilete);
  const tl = semAltura ? Math.max(0.3, Math.max(t.raioDoEncontro * Math.tan(Math.acos(chordaNoRecuo / rc) / 2), t.tangenteMinimaDoFilete) * (fracao ?? 0)) : tlCheio;
  const phiC = Math.atan2(yc, b);
  const phi2 = fundida ? Math.PI / 2 : phiC - tl / R;
  const arcoDe = (de, ate, n) => Array.from({ length: n }, (_, k) => {
    const ang = de + (k / (n - 1)) * (ate - de);
    return [R * Math.cos(ang), R * Math.sin(ang)];
  });
  /* o círculo, do P2 da esquerda por baixo até o P2 da direita, partido ao meio por um trecho curto no fundo do círculo */
  const inicio = Math.PI - phi2;
  const fim = 2 * Math.PI + phi2;
  const meio = (3 * Math.PI) / 2;
  const dFundo = 3 / R;
  const tr = {
    arcoE: arcoDe(inicio, meio - dFundo, PONTOS_DO_ARCO),
    cima: [[-R * Math.sin(dFundo), -R * Math.cos(dFundo)], [R * Math.sin(dFundo), -R * Math.cos(dFundo)]],
    arcoD: arcoDe(meio + dFundo, fim, PONTOS_DO_ARCO),
  };
  if (fundida) {
    const fundo = [R * Math.cos(phi2), R * Math.sin(phi2)];
    for (const n of nomesDaFaixa(PAREDE)) tr[n] = [fundo];
  } else if (arcosNaTampa) {
    /* sem a faixa: os trechos dela são arcos do círculo, de P2 da direita a P2 da esquerda por cima, com passos iguais */
    const ordem = [['filD', 4], ...PAREDE.map(([n, , p]) => [`lado${n}_D`, p - 1]), ['chPeD', 1], ['pe', 5], ['chPeE', 1],
      ...[...PAREDE].reverse().map(([n, , p]) => [`lado${n}_E`, p - 1]), ['filE', 4]];
    const total = ordem.reduce((q, [, k]) => q + k, 0);
    const passo = (Math.PI - 2 * phi2) / total;
    let ang = phi2;
    for (const [nome, q] of ordem) { tr[nome] = arcoDe(ang, ang + q * passo, q + 1); ang += q * passo; }
  } else {
    const alfa = tl / R;
    const phi2n = phiC - alfa;
    const yl = (R - b * Math.cos(phi2n)) / Math.sin(phi2n);
    const dtan = Math.sqrt(Math.max(0, b * b + yl * yl - R * R));
    const ctrl = [b, yl];
    const p1 = [b, yl + dtan];
    const p2 = [R * Math.cos(phi2n), R * Math.sin(phi2n)];
    const bez = (k, n) => {
      const q = k / (n - 1);
      return [(1 - q) ** 2 * p1[0] + 2 * (1 - q) * q * ctrl[0] + q * q * p2[0], (1 - q) ** 2 * p1[1] + 2 * (1 - q) * q * ctrl[1] + q * q * p2[1]];
    };
    const filD = Array.from({ length: 13 }, (_, k) => bez(k, 13)).reverse();
    tr.filD = filD;
    const lado = (sx, y0, y1) => [[sx * b, y0], [sx * b, y1]];
    const y1 = Math.max(p1[1], 0);
    const H = semAltura ? 0 : yPe - c - y1;
    const L = FRACOES.map((f) => y1 + f * H);
    PAREDE.forEach(([n], k) => {
      tr[`lado${n}_D`] = lado(1, k ? L[k - 1] : y1, L[k]);
      tr[`lado${n}_E`] = lado(-1, L[k], k ? L[k - 1] : y1);
    });
    /* na rampa a face de baixo é a corda de ponta a ponta da faixa, na altura do pé dela, e o chanfro tem comprimento zero */
    const yb = semAltura ? y1 : yPe;
    const cb = semAltura ? 0 : c;
    const bb = semAltura ? b : bt;
    tr.chPeD = [[b, yb - cb], [bb, yb]];
    tr.pe = [[bb, yb], [-bb, yb]];
    tr.chPeE = [[-bb, yb], [-b, yb - cb]];
    tr.filE = tr.filD.map(([x2, y2]) => [-x2, y2]).reverse();
  }
  const girar = (poli) => poli.map(([px, py]) => [yPe - py, px]);
  const nomes = ['arcoE', 'cima', 'arcoD', ...nomesDaFaixa(PAREDE)];
  const saida = {};
  for (const n of nomes) saida[n] = girar(tr[n]);
  return { em: x, trechos: saida };
}

/* Os trechos da volta e quantos pontos cada um tem, em todo laço. */
export function trechosDaVolta(t = TABELA) {
  const PAREDE = t.parede ?? PAREDE_DE_HOJE;
  return [
    ['arcoE', PONTOS_DO_ARCO], ['cima', 2], ['arcoD', PONTOS_DO_ARCO], ['filD', 5],
    ...PAREDE.map(([n, , p]) => [`lado${n}_D`, p]),
    ['chPeD', 2], ['pe', 6], ['chPeE', 2],
    ...[...PAREDE].reverse().map(([n, , p]) => [`lado${n}_E`, p]),
    ['filE', 5],
  ].map(([nome, pontos]) => ({ nome, pontos }));
}

/** argumentosDaGaiola(t, tecnica) -> o que a peça passa a `gaiolaPorLacos`. */
export function argumentosDaGaiola(t = TABELA, tecnica = 'hoje') {
  const lista = planosDeCorte(t, tecnica);
  const lacos = lista.map((plano) => lacoNoPlano(t, plano, tecnica));
  const nomeDe = (i) => `l${i}`;
  const trechos = trechosDaVolta(t);
  const PAREDE = t.parede ?? PAREDE_DE_HOJE;
  const curvas = ['arcoD', 'arcoE', ...PAREDE.flatMap(([n]) => [`lado${n}_D`, `lado${n}_E`])];
  const miolo = lacos.slice(2, -2).map((_, k) => nomeDe(k + 2));
  const ultima = PAREDE[PAREDE.length - 1][0];
  const chanfros = [['peD', [`lado${ultima}_D`, 'chPeD']], ['peD2', ['chPeD', 'pe']], ['peE', ['pe', 'chPeE']], ['peE2', ['chPeE', `lado${ultima}_E`]]];
  const faces = [
    { nome: 'facePrimeira', laco: 'primeiro', trechos: ['arcoD', 'cima', 'arcoE'], nitidez: t.nitidezDoChanfro },
    { nome: 'faceUltima', laco: 'ultimo', nitidez: t.nitidezDoChanfro },
  ];
  let vincos;
  let trechosDaGaiola = trechos;
  if (tecnica === 'hoje') {
    const iUltimaPerna = lista.findIndex(({ tipo }) => tipo === 'rampa') - 1;
    const faixa = ['primeiro', nomeDe(iUltimaPerna)];
    vincos = [
      ...chanfros.map(([nome, entre]) => ({ nome, entre, lacos: faixa, nitidez: t.nitidezDoChanfro })),
      ...faces,
      { nome: 'recuoA', laco: nomeDe(iUltimaPerna), nitidez: 'viva' },
      { nome: 'recuoB', laco: nomeDe(iUltimaPerna + 1), nitidez: 'viva' },
    ];
  } else {
    const iDe = lista.findIndex(({ faixa }) => faixa === 'de');
    const iAte = lista.findIndex(({ faixa }) => faixa === 'ate');
    const encolhe = { de: nomeDe(iDe), ate: nomeDe(iAte), curva: t.curvaDoEncolhimento };
    trechosDaGaiola = trechos.map((tr) => (nomesDaFaixa(PAREDE).includes(tr.nome) ? { ...tr, encolhe } : tr));
    vincos = [
      ...chanfros.map(([nome, entre]) => ({ nome, entre, lacos: ['primeiro', nomeDe(iAte)], nitidez: t.nitidezDoChanfro, esvai: encolhe })),
      ...faces,
    ];
  }
  return {
    nome: 'k', eixo: 'x', tampa: { de: 'cima', ate: 'pe' }, trechos: trechosDaGaiola, lacos, vincos,
    compensar: { trechos: curvas, lacos: miolo },
  };
}

export function derivar(t = TABELA, tecnica = 'hoje', ajudante = gaiolaPorLacos) {
  const a = argumentosDaGaiola(t, tecnica);
  const g = ajudante(a);
  return { planos: a.lacos.map((l) => l.em), xFace: -t.raio + t.comprimento, yTopo: t.alturaDoEixo + t.raio, ...g };
}
