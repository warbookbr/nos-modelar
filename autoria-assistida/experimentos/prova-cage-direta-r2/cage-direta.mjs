/* Cage R2: vértices escritos diretamente; não deriva uma pele de seções. */
const copiar = (cage) => ({
  V: new Map([...cage.V].map(([id, ponto]) => [id, [...ponto]])),
  F: new Map([...cage.F].map(([id, face]) => [id, { ...face, vs: [...face.vs] }])),
  loops: Object.fromEntries(Object.entries(cage.loops).map(([nome, loop]) => [nome, { ...loop, v: [...loop.v] }])),
  vincos: new Map(cage.vincos),
  simetria: { ...cage.simetria },
});
const chave = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;

/* Catorze estações e cinco trilhos: teto, ombro, cintura, soleira e eixo inferior.
   Os números vêm do briefing P0, mas nenhuma estação cria a topologia. */
const ESTACOES = [
  /* L01: a tampa dianteira preserva a ponta e a meia-largura no compilado. */
  { z: 2.265, pontos: [[0, .501], [.28, .46], [.25, .28], [.18, .105], [0, .105]] },
  /* Anel estreito: mantém a ponta independente do alargamento seguinte. */
  { z: 2.18, pontos: [[0, .515], [.32, .48], [.32, .29], [.23, .105], [0, .105]] },
  /* Anel de expansão: recupera largura antes da estação do quarto dianteiro. */
  { z: 2.05, pontos: [[0, .54], [.40, .54], [.80, .31], [.46, .105], [0, .105]] },
  /* Controla a expansão entre o nariz e a roda dianteira, sem varredura. */
  { z: 1.90, pontos: [[0, .56], [.75, .58], [.79, .34], [.65, .105], [0, .105]] },
  { z: 1.60, pontos: [[0, .67], [.90, .68], [.85, .40], [.75, .105], [0, .105]] },
  { z: 1.325, pontos: [[0, .74], [.892, .89], [.92, .50], [.86, .145], [0, .105]] },
  { z: .48, pontos: [[0, .98], [.90, .88], [.86, .54], [.803, .105], [0, .105]] },
  /* Loop próprio no topo do para-brisa: separa a subida da linha de teto. */
  { z: -.18, pontos: [[0, 1.13825], [.5740234375, 1.143], [.96, .58], [.803, .105], [0, .105]] },
  { z: -.56, pontos: [[0, 1.14325], [.5740234375, 1.143], [.82, .58], [.82, .145], [0, .105]] },
  /* Fecha a cabine antes de a anca traseira começar a dominar. */
  { z: -.90, pontos: [[0, 1.12], [.65, 1.077], [.98, .60], [.86, .145], [0, .105]] },
  { z: -1.325, pontos: [[0, 1.10], [.965, .82], [.91, .62], [.88, .145], [0, .105]] },
  /* Anel da transição da anca: corrige a largura traseira sem deslocar a tampa. */
  { z: -1.75, pontos: [[0, 1.055], [.84, .92], [.68, .53], [.70, .105], [0, .105]] },
  /* Fecha a redução de largura entre a tampa e a extremidade traseira. */
  { z: -2.00, pontos: [[0, .98], [.78, .82], [.90, .48], [.72, .105], [0, .105]] },
  /* L09: a tampa traseira preserva altura e meia-largura do alvo no compilado. */
  { z: -2.335, pontos: [[0, .885], [.58, .70], [.645, .40], [.45, .105], [0, .105]] },
];
const SOLO = .105;
/* Medidos após um nível: Catmull-Clark preserva comprimento pelas tampas, mas
   contrai largura e altura. A cage compensa para o produto compilado bater P0. */
const COMPENSACAO = { x: 1.08880571623001, y: 1.0451535219747141 };
const pontoDeControle = ([x, y], z) => [x * COMPENSACAO.x, SOLO + (y - SOLO) * COMPENSACAO.y, z];
const estacoesAjustadas = ({ pontos = {}, z = {} } = {}) => ESTACOES.map((estacao, linha) => ({
  z: z[linha] ?? estacao.z,
  pontos: estacao.pontos.map((ponto, trilho) => [...(pontos[`${linha}:${trilho}`] ?? ponto)]),
}));

export function criarCageDireta(ajustes = {}) {
  const estacoes = estacoesAjustadas(ajustes);
  const V = new Map();
  estacoes.forEach((estacao, linha) => estacao.pontos.forEach((ponto, trilho) => V.set(linha * 10 + trilho, pontoDeControle(ponto, estacao.z))));
  /* Miolos das tampas ficam no plano de simetria e quadrangulam cada metade. */
  V.set(5, pontoDeControle([0, .34], estacoes[0].z)); V.set(135, pontoDeControle([0, .34], estacoes.at(-1).z));
  const F = new Map();
  for (let linha = 0; linha < ESTACOES.length - 1; linha += 1) for (let trilho = 0; trilho < 4; trilho += 1) {
    const parteSuperior = linha < 4 ? 'capo' : linha === 4 ? 'baseParabrisa' : linha < 7 ? 'teto' : 'quedaTraseira';
    const parte = trilho === 0 ? parteSuperior : trilho === 1 ? 'linhaDeOmbro' : trilho === 2 ? 'flanco' : 'assoalho';
    F.set(linha * 10 + trilho, { vs: [linha * 10 + trilho, (linha + 1) * 10 + trilho, (linha + 1) * 10 + trilho + 1, linha * 10 + trilho + 1], parte });
  }
  F.set(900, { vs: [0, 1, 2, 5], parte: 'nariz' }); F.set(901, { vs: [5, 2, 3, 4], parte: 'nariz' });
  F.set(902, { vs: [130, 135, 132, 131], parte: 'traseira' }); F.set(903, { vs: [134, 133, 132, 135], parte: 'traseira' });
  const loops = {
    linhaDeCapo: { v: [0, 10, 20, 30, 40, 50, 60], fechado: false },
    anelPonta: { v: [10, 11, 12, 13, 14], fechado: false },
    anelExpansaoDianteira: { v: [20, 21, 22, 23, 24], fechado: false },
    baseParabrisa: { v: [60, 61, 62, 63, 64], fechado: false },
    teto: { v: [60, 70, 80], fechado: false },
    larguraCabineCentral: { v: [70, 71, 72, 73, 74], fechado: false },
    linhaDeTeto: { v: [71, 81, 91], fechado: false },
    transicaoCabineTraseira: { v: [90, 91, 92, 93, 94], fechado: false },
    transicaoAncaTraseira: { v: [110, 111, 112, 113, 114], fechado: false },
    quedaTraseira: { v: [80, 90, 100, 110, 120, 130], fechado: false },
    linhaDeOmbro: { v: [1, 11, 21, 31, 41, 51, 61, 71, 81, 91, 101, 111, 121, 131], fechado: false },
    cintura: { v: [2, 12, 22, 32, 42, 52, 62, 72, 82, 92, 102, 112, 122, 132], fechado: false },
    linhaDeSoleira: { v: [53, 63, 73, 83], fechado: false },
    ancaTraseira: { v: [100, 101, 102, 103, 104], fechado: false },
    larguraTampaTraseira: { v: [120, 121, 122, 123, 124], fechado: false },
    cristaParalama: { v: [1, 11, 21, 31, 41, 51], fechado: false },
    contornoNariz: { v: [0, 1, 2, 3, 4, 5], fechado: true },
    contornoTraseira: { v: [130, 131, 132, 133, 134, 135], fechado: true },
  };
  /* Vincos de um nível preservam ombro e a tampa do último landmark sem recorte. */
  const vincos = new Map();
  for (let i = 0; i < loops.linhaDeOmbro.v.length - 1; i += 1) vincos.set(chave(loops.linhaDeOmbro.v[i], loops.linhaDeOmbro.v[i + 1]), 1);
  for (let i = 0; i < loops.linhaDeTeto.v.length - 1; i += 1) vincos.set(chave(loops.linhaDeTeto.v[i], loops.linhaDeTeto.v[i + 1]), 1);
  for (const [a, b] of [[70, 71], [80, 81], [90, 91]]) vincos.set(chave(a, b), 1);
  for (let i = 0; i < loops.linhaDeSoleira.v.length - 1; i += 1) vincos.set(chave(loops.linhaDeSoleira.v[i], loops.linhaDeSoleira.v[i + 1]), 1);
  for (const [a, b] of [[63, 64], [73, 74]]) vincos.set(chave(a, b), 1);
  for (let i = 0; i < loops.contornoNariz.v.length; i += 1) {
    const a = loops.contornoNariz.v[i], b = loops.contornoNariz.v[(i + 1) % loops.contornoNariz.v.length];
    vincos.set(chave(a, b), 1);
  }
  for (let trilho = 0; trilho < 5; trilho += 1) vincos.set(chave(trilho, 10 + trilho), 1);
  for (let i = 0; i < loops.contornoTraseira.v.length; i += 1) {
    const a = loops.contornoTraseira.v[i], b = loops.contornoTraseira.v[(i + 1) % loops.contornoTraseira.v.length];
    vincos.set(chave(a, b), 1);
  }
  for (let trilho = 0; trilho < 5; trilho += 1) vincos.set(chave(120 + trilho, 130 + trilho), 1);
  return { V, F, loops, vincos, simetria: { plano: 'x', autorada: 'x >= 0' } };
}

export function moverLoop(cage, nome, deslocamento) {
  const loop = cage.loops[nome];
  if (!loop) throw new Error(`loop desconhecido: ${nome}`);
  if (!Array.isArray(deslocamento) || deslocamento.length !== 3 || !deslocamento.every(Number.isFinite)) throw new Error('deslocamento inválido');
  const proxima = copiar(cage);
  for (const id of loop.v) proxima.V.set(id, proxima.V.get(id).map((valor, eixo) => valor + deslocamento[eixo]));
  return proxima;
}

export function espelharCage(cage) {
  const inteira = copiar(cage); const espelho = new Map(); let proximoVertice = Math.max(...cage.V.keys()) + 1;
  for (const [id, [x, y, z]] of cage.V) if (x > 0) { const novo = proximoVertice; proximoVertice += 1; espelho.set(id, novo); inteira.V.set(novo, [-x, y, z]); }
  let proximaFace = Math.max(...cage.F.keys()) + 1;
  for (const [, face] of cage.F) {
    const vs = face.vs.map((v) => espelho.get(v) ?? v).reverse();
    if (new Set(vs).size === 4) { inteira.F.set(proximaFace, { ...face, vs }); proximaFace += 1; }
  }
  for (const [aresta, nitidez] of cage.vincos) {
    const [a, b] = aresta.split('|').map(Number);
    if (espelho.has(a) && espelho.has(b)) inteira.vincos.set(chave(espelho.get(a), espelho.get(b)), nitidez);
  }
  return inteira;
}
