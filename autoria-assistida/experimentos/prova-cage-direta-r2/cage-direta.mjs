/* Cage R2: vértices escritos diretamente; não deriva uma pele de seções. */
const copiar = (cage) => ({
  V: new Map([...cage.V].map(([id, ponto]) => [id, [...ponto]])),
  F: new Map([...cage.F].map(([id, face]) => [id, { ...face, vs: [...face.vs] }])),
  loops: Object.fromEntries(Object.entries(cage.loops).map(([nome, loop]) => [nome, { ...loop, v: [...loop.v] }])),
  vincos: new Map(cage.vincos),
  simetria: { ...cage.simetria },
});
const chave = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;

/* Dezesseis estações e cinco trilhos-base: teto, ombro, flanco, soleira e eixo
   inferior. A faixa vertical adicional é declarada abaixo, sem reindexar estes
   trilhos. Os números vêm do briefing P0, mas nenhuma estação cria a topologia. */
const ESTACOES = [
  /* L01: a tampa dianteira preserva a ponta e a meia-largura no compilado. */
  { id: 0, z: 2.265, pontos: [[0, .501], [.28, .46], [.25, .28], [.18, .105], [0, .105]] },
  /* Controle local da ponta: separa a largura em z=2,20 m da expansão seguinte. */
  { id: 10, z: 2.20, pontos: [[0, .508], [.30, .47], [.30, .285], [.205, .105], [0, .105]] },
  /* Anel estreito: mantém a ponta independente do alargamento seguinte. */
  { id: 20, z: 2.18, pontos: [[0, .515], [.32, .48], [.38, .29], [.23, .105], [0, .105]] },
  /* Anel de expansão: recupera largura antes da estação do quarto dianteiro. */
  { id: 30, z: 2.05, pontos: [[0, .54], [.40, .54], [.78, .31], [.46, .105], [0, .105]] },
  /* Controla a expansão entre o nariz e a roda dianteira, sem varredura. */
  { id: 40, z: 1.90, pontos: [[0, .56], [.75, .58], [.79, .34], [.65, .105], [0, .105]] },
  { id: 50, z: 1.60, pontos: [[0, .67], [.90, .68], [.85, .40], [.75, .105], [0, .105]], faixa: [.86, .11] },
  { id: 60, z: 1.325, pontos: [[0, .74], [.892, .89], [.92, .50], [.86, .145], [0, .105]] },
  { id: 70, z: .48, pontos: [[0, .98], [.90, .88], [.86, .54], [.803, .105], [0, .105]], faixa: [.94, .34] },
  /* Loop próprio no topo do para-brisa: separa a subida da linha de teto. */
  { id: 80, z: -.18, pontos: [[0, 1.13825], [.5740234375, 1.143], [.96, .58], [.803, .105], [0, .105]], faixa: [.89, 1.01] },
  { id: 90, z: -.56, pontos: [[0, 1.14325], [.5740234375, 1.143], [.82, .58], [.82, .145], [0, .105]], faixa: [.962, .725] },
  /* Controle próprio do alargamento antes da anca, sem deslocar a cabine. */
  { id: 150, z: -.82, pontos: [[0, 1.13], [.56, 1.02], [.92, .74], [.86, .145], [0, .105]], faixa: [.965, .9] },
  /* Fecha a cabine antes de a anca traseira começar a dominar. */
  { id: 100, z: -.90, pontos: [[0, 1.12], [.65, 1.077], [.98, .60], [.86, .145], [0, .105]], faixa: [.725, 1.12] },
  { id: 110, z: -1.325, pontos: [[0, 1.10], [.965, .82], [.91, .62], [.88, .145], [0, .105]], faixa: [.625, 1.185] },
  /* Anel da transição da anca: corrige a largura traseira sem deslocar a tampa. */
  { id: 120, z: -1.75, pontos: [[0, 1.055], [.84, .92], [.96, .53], [.70, .105], [0, .105]] },
  /* Fecha a redução de largura entre a tampa e a extremidade traseira. */
  { id: 130, z: -2.00, pontos: [[0, .98], [.78, .82], [.92, .48], [.72, .105], [0, .105]] },
  /* L09: a tampa traseira preserva altura e meia-largura do alvo no compilado. */
  { id: 140, z: -2.335, pontos: [[0, .885], [.58, .70], [.60, .40], [.45, .105], [0, .105]] },
];
const SOLO = .105;
/* Medidos após um nível: Catmull-Clark preserva comprimento pelas tampas, mas
   contrai largura e altura. A cage compensa para o produto compilado bater P0. */
const COMPENSACAO = { x: 1.0803511141120665, y: 1.0451535219747141 };
const pontoDeControle = ([x, y], z, compensacao = COMPENSACAO) => [x * compensacao.x, SOLO + (y - SOLO) * compensacao.y, z];
const estacoesAjustadas = ({ pontos = {}, faixas = {}, z = {} } = {}) => ESTACOES.map((estacao, linha) => {
  const pontosAjustados = estacao.pontos.map((ponto, trilho) => [...(pontos[`${linha}:${trilho}`] ?? ponto)]);
  /* +6 evita colisão com os miolos das tampas (+5) e preserva cada ID R2. */
  const faixaPadrao = estacao.faixa ?? pontosAjustados[1].map((valor, eixo) => (valor + pontosAjustados[2][eixo]) / 2);
  return { id: estacao.id, z: z[linha] ?? estacao.z, pontos: pontosAjustados, faixa: [...(faixas[linha] ?? faixaPadrao)] };
});

export function criarCageDireta(ajustes = {}) {
  const estacoes = estacoesAjustadas(ajustes);
  const compensacao = { ...COMPENSACAO, ...ajustes.compensacao };
  const V = new Map();
  estacoes.forEach((estacao) => {
    estacao.pontos.forEach((ponto, trilho) => V.set(estacao.id + trilho, pontoDeControle(ponto, estacao.z, compensacao)));
    V.set(estacao.id + 6, pontoDeControle(estacao.faixa, estacao.z, compensacao));
  });
  /* Miolos das tampas ficam no plano de simetria e quadrangulam cada metade. */
  V.set(5, pontoDeControle([0, .34], estacoes[0].z, compensacao)); V.set(7, pontoDeControle([0, .225], estacoes[0].z, compensacao));
  V.set(145, pontoDeControle([0, .34], estacoes.at(-1).z, compensacao)); V.set(147, pontoDeControle([0, .225], estacoes.at(-1).z, compensacao));
  const F = new Map();
  for (let linha = 0; linha < estacoes.length - 1; linha += 1) for (let trilho = 0; trilho < 5; trilho += 1) {
    const parteSuperior = linha < 5 ? 'capo' : linha === 5 ? 'baseParabrisa' : linha < 8 ? 'teto' : 'quedaTraseira';
    const parte = trilho === 0 ? parteSuperior : trilho === 1 ? 'linhaDeOmbro' : trilho === 2 ? 'faixaVertical' : trilho === 3 ? 'flanco' : 'assoalho';
    const atual = estacoes[linha].id, proxima = estacoes[linha + 1].id;
    const bandas = [[atual, atual + 1], [atual + 1, atual + 6], [atual + 6, atual + 2], [atual + 2, atual + 3], [atual + 3, atual + 4]];
    const [inicio, fim] = bandas[trilho];
    const [proximoInicio, proximoFim] = bandas[trilho].map((id) => id - atual + proxima);
    F.set(linha * 10 + trilho, { vs: [inicio, proximoInicio, proximoFim, fim], parte });
  }
  F.set(900, { vs: [0, 1, 6, 5], parte: 'nariz' }); F.set(901, { vs: [5, 6, 2, 7], parte: 'nariz' }); F.set(904, { vs: [7, 2, 3, 4], parte: 'nariz' });
  F.set(902, { vs: [140, 141, 146, 145], parte: 'traseira' }); F.set(903, { vs: [145, 146, 142, 147], parte: 'traseira' }); F.set(905, { vs: [147, 142, 143, 144], parte: 'traseira' });
  const loops = {
    linhaDeCapo: { v: [0, 10, 20, 30, 40, 50, 60, 70], fechado: false },
    anelAjustePonta: { v: [10, 11, 16, 12, 13, 14], fechado: false },
    anelPonta: { v: [20, 21, 26, 22, 23, 24], fechado: false },
    anelExpansaoDianteira: { v: [30, 31, 36, 32, 33, 34], fechado: false },
    baseParabrisa: { v: [70, 71, 76, 72, 73, 74], fechado: false },
    teto: { v: [70, 80, 90], fechado: false },
    larguraCabineCentral: { v: [80, 81, 86, 82, 83, 84], fechado: false },
    linhaDeTeto: { v: [81, 91, 151, 101], fechado: false },
    anelAjusteAnca: { v: [150, 151, 156, 152, 153, 154], fechado: false },
    transicaoCabineTraseira: { v: [100, 101, 106, 102, 103, 104], fechado: false },
    transicaoAncaTraseira: { v: [120, 121, 126, 122, 123, 124], fechado: false },
    quedaTraseira: { v: [90, 150, 100, 110, 120, 130, 140], fechado: false },
    linhaDeOmbro: { v: [1, 11, 21, 31, 41, 51, 61, 71, 81, 91, 151, 101, 111, 121, 131, 141], fechado: false },
    faixaVertical: { v: [6, 16, 26, 36, 46, 56, 66, 76, 86, 96, 156, 106, 116, 126, 136, 146], fechado: false },
    cintura: { v: [2, 12, 22, 32, 42, 52, 62, 72, 82, 92, 152, 102, 112, 122, 132, 142], fechado: false },
    linhaDeSoleira: { v: [63, 73, 83, 93], fechado: false },
    ancaTraseira: { v: [110, 111, 116, 112, 113, 114], fechado: false },
    larguraTampaTraseira: { v: [130, 131, 136, 132, 133, 134], fechado: false },
    cristaParalama: { v: [1, 11, 21, 31, 41, 51, 61], fechado: false },
    contornoNariz: { v: [0, 1, 6, 2, 3, 4, 7, 5], fechado: true },
    contornoTraseira: { v: [140, 141, 146, 142, 143, 144, 147, 145], fechado: true },
  };
  /* Vincos de um nível preservam ombro e a tampa do último landmark sem recorte. */
  const vincos = new Map();
  for (let i = 0; i < loops.linhaDeOmbro.v.length - 1; i += 1) vincos.set(chave(loops.linhaDeOmbro.v[i], loops.linhaDeOmbro.v[i + 1]), 1);
  for (let i = 0; i < loops.linhaDeTeto.v.length - 1; i += 1) vincos.set(chave(loops.linhaDeTeto.v[i], loops.linhaDeTeto.v[i + 1]), 1);
  for (const [a, b] of [[80, 81], [90, 91], [150, 151], [100, 101]]) vincos.set(chave(a, b), 1);
  for (let i = 0; i < loops.linhaDeSoleira.v.length - 1; i += 1) vincos.set(chave(loops.linhaDeSoleira.v[i], loops.linhaDeSoleira.v[i + 1]), 1);
  for (const [a, b] of [[73, 74], [83, 84]]) vincos.set(chave(a, b), 1);
  for (let i = 0; i < loops.contornoNariz.v.length; i += 1) {
    const a = loops.contornoNariz.v[i], b = loops.contornoNariz.v[(i + 1) % loops.contornoNariz.v.length];
    vincos.set(chave(a, b), 1);
  }
  for (let trilho = 0; trilho < 5; trilho += 1) vincos.set(chave(trilho, 10 + trilho), 1);
  for (let i = 0; i < loops.contornoTraseira.v.length; i += 1) {
    const a = loops.contornoTraseira.v[i], b = loops.contornoTraseira.v[(i + 1) % loops.contornoTraseira.v.length];
    vincos.set(chave(a, b), 1);
  }
  for (let trilho = 0; trilho < 5; trilho += 1) vincos.set(chave(130 + trilho, 140 + trilho), 1);
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
