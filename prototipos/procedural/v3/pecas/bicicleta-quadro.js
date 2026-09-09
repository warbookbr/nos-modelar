/* bicicleta-quadro.js — quadro de MTB hardtail 29", tamanho M. Módulo 1 de 5.
 *
 * ESTE ARQUIVO É A FONTE DOS NÚMEROS DA BICICLETA. A tabela e a derivação moram
 * aqui, junto da peça que as usa, e `tools/mecanifica/prancha-bicicleta-29.mjs`
 * importa daqui para imprimir. Duas cópias da mesma tabela envelhecem em duas
 * velocidades.
 *
 * DE ONDE VÊM OS NÚMEROS. `TABELA` traz a faixa corrente publicada do formato
 * 29" hardtail tamanho M — entre-eixos, ângulos, balanço, diâmetro de roda. Não
 * é um modelo específico. Toda POSIÇÃO é derivada dela por trigonometria; nenhum
 * ponto é digitado à mão, porque número digitado deixa de corresponder à tabela
 * assim que ela muda, e o acervo já tem um caso desses medido.
 *
 * O SELIM VEIO DE UMA CORREÇÃO MEDIDA. A primeira tabela punha o selim a 914 mm
 * do chão. A comparação contra a folha de referência mediu 1128 mm, e 914 é
 * indefensável para uma 29 de quadro médio. Tubo do selim 480 e canote 360 põem
 * o selim em 1105 mm.
 *
 * ESCALA: metros, como o resto do acervo. A tabela é em milímetro porque é
 * assim que geometria de bicicleta é publicada, e `m()` converte num lugar só.
 */

export const TABELA = {
  aroISO: 622,
  pneuLargura: 56,
  entreEixos: 1130,
  balancoTraseiro: 435,
  quedaDoMovimentoCentral: 65,
  anguloDirecao: 69,
  anguloSelim: 73,
  tuboDirecaoComprimento: 110,
  tuboSelimComprimento: 480,
  garfoEixoACoroa: 490,
  garfoAvanco: 44,
  canoteExposto: 360,
  meiaLarguraGuidao: 360,
  meiaLarguraCubo: 74,
  /* Seções dos tubos, medidas de quadro de alumínio corrente. */
  raioTuboSelim: 17,
  raioTuboSuperior: 15,
  /* O tubo inferior não é redondo. No quadro de alumínio hidroformado da
     referência ele é largo e chato junto ao movimento central e vai ficando
     alto e estreito ao chegar no tubo de direção, e o caminho dele arqueia.
     Cada entrada é [fração do caminho, largura em x, altura no plano lateral,
     expoente da superelipse]. Expoente 2 é elipse; acima disso as faces
     achatam e os cantos viram raio curto, que é o desenho hidroformado. */
  perfilTuboInferior: [
    [0.00, 62, 40, 4.5],
    [0.30, 60, 42, 4.5],
    [0.60, 52, 48, 4.0],
    [1.00, 40, 56, 3.2],
  ],
  arqueioTuboInferior: 30,
  raioTuboDirecao: 24,
  raioBalancoInferior: 11,
  raioBalancoSuperior: 9,
  larguraCaixaMovimentoCentral: 73,
  raioCaixaMovimentoCentral: 21,
};

const rad = (g) => (g * Math.PI) / 180;
const som = (a, b) => a.map((v, i) => v + b[i]);
const esc = (v, k) => v.map((c) => c * k);

/** Pontos do quadro no plano lateral, em MILÍMETRO. Origem: movimento central
 *  projetado no solo. z cresce para a frente, y cresce para cima. */
export function derivar(t = TABELA) {
  const raioRoda = t.aroISO / 2 + t.pneuLargura;
  const mc = [0, raioRoda - t.quedaDoMovimentoCentral];
  const recuo = Math.sqrt(t.balancoTraseiro ** 2 - t.quedaDoMovimentoCentral ** 2);
  const eixoTraseiro = [-recuo, raioRoda];
  const eixoDianteiro = [eixoTraseiro[0] + t.entreEixos, raioRoda];

  /* Subir pelo eixo de direção anda para trás; a roda fica AVANÇADA em relação
     a esse eixo, perpendicularmente, pelo avanço do garfo. */
  const a = rad(t.anguloDirecao);
  const subirDirecao = [-Math.cos(a), Math.sin(a)];
  const frenteDirecao = [Math.sin(a), Math.cos(a)];
  const noEixo = som(eixoDianteiro, esc(frenteDirecao, -t.garfoAvanco));
  const aoLongo = Math.sqrt(t.garfoEixoACoroa ** 2 - t.garfoAvanco ** 2);
  const coroa = som(noEixo, esc(subirDirecao, aoLongo));
  const direcaoTopo = som(coroa, esc(subirDirecao, t.tuboDirecaoComprimento));

  const s = rad(t.anguloSelim);
  const subirSelim = [-Math.cos(s), Math.sin(s)];
  const selimTopo = som(mc, esc(subirSelim, t.tuboSelimComprimento));
  /* Onde o tubo superior solda no tubo do selim. */
  const selimJuncao = som(mc, esc(subirSelim, t.tuboSelimComprimento - 30));
  /* Onde os balanços superiores soldam, ABAIXO do tubo superior. Na primeira
     versão os dois usavam a mesma junção e a medição acusou balanço superior
     dentro do tubo superior, por contenção. Num quadro real o balanço encontra
     o tubo do selim, não o tubo superior. */
  const selimJuncaoBalanco = som(mc, esc(subirSelim, t.tuboSelimComprimento - 130));
  const selim = som(selimTopo, esc(subirSelim, t.canoteExposto));
  const direcaoBaixo = som(coroa, esc(subirDirecao, 22));

  /* OS TUBOS NASCEM NA SUPERFÍCIE DA CAIXA, NÃO NO CENTRO DELA. Partindo todos
     do mesmo ponto, o tubo inferior e os balanços ocupavam o mesmo espaço e a
     medida acusou interseção de superfícies. Cada um sai da caixa na sua
     direção: o inferior para a frente e para cima, os balanços para trás. */
  const dInferior = [direcaoBaixo[0] - mc[0], direcaoBaixo[1] - mc[1]];
  const compInferior = Math.hypot(...dInferior);
  const saidaInferior = som(mc, esc(dInferior.map((v) => v / compInferior), 20));
  /* DENTRO da caixa, e não encostado nela. A seção de um tubo é perpendicular ao
     próprio eixo, então um balanço que corre em z quase não avança em z na
     ponta: começando em z=-24 ele parava a 1,2 mm da caixa e ficava solto, com
     a declaração acusando contato que não existia. Nascendo dentro, o contato é
     contenção e não depende de milímetro. */
  const saidaBalanco = [mc[0] - 8, mc[1] - 6];

  return {
    raioRoda, mc, eixoTraseiro, eixoDianteiro, coroa, direcaoTopo, direcaoBaixo,
    selimTopo, selimJuncao, selimJuncaoBalanco, selim, saidaInferior, saidaBalanco,
    empilhamento: direcaoTopo[1] - mc[1],
    alcance: direcaoTopo[0] - mc[0],
    alturaMC: mc[1],
  };
}

/** Milímetro para metro, e do plano lateral [z,y] para o mundo [x,y,z]. */
const m = (v) => v / 1000;
const mundo = ([z, y], x = 0) => [m(x), m(y), m(z)];

/* Meia largura da saída do balanço na caixa do movimento central; a meia
   ponteira traseira vem do espaçamento do cubo, que é parâmetro. */
const meiaSaidaDoBalanco = 34;

/* POLO EM CADA PONTA, SENÃO SAI TUBO ABERTO. É o primeiro limite declarado de
   `loft`, e ele disparou na primeira medição desta peça: sem polo, os nove
   tubos deram 17 pares inconclusivos por malha aberta, e malha aberta não
   recebe veredito de invasão nem de separação. O polo fica 2 mm além da ponta,
   dentro da junta, então ele fecha sem afinar o tubo onde ele aparece. */
const POLO = 2;
const tubo = (origemId, de, ate, raio, xDe = 0, xAte = xDe) => {
  const a = mundo(de, xDe);
  const b = mundo(ate, xAte);
  const d = b.map((v, i) => v - a[i]);
  const comp = Math.hypot(...d);
  const u = d.map((v) => v / comp);
  const alem = (p, k) => p.map((v, i) => v + u[i] * m(POLO) * k);
  return ['loft', {
    origemId,
    secoes: [
      { pos: alem(a, -1), raio: 0 },
      { pos: a, raio: m(raio) },
      { pos: b, raio: m(raio) },
      { pos: alem(b, 1), raio: 0 },
    ],
    lados: 14,
  }];
};

/** Superelipse fechada com exatamente `lados` pontos. O motor recusa contorno
 *  que, depois de expandir concordâncias, não tenha exatamente `lados` pontos,
 *  e fórmula contínua nunca erra essa contagem — lista escrita à mão erra. */
const secao = (largura, altura, expoente, lados) => {
  const a = largura / 2;
  const b = altura / 2;
  const q = 2 / expoente;
  const pts = [];
  for (let i = 0; i < lados; i += 1) {
    const ang = (2 * Math.PI * i) / lados;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    pts.push([
      m(a * Math.sign(c) * Math.abs(c) ** q),
      m(b * Math.sign(s) * Math.abs(s) ** q),
    ]);
  }
  return pts;
};

/** Tubo de seção variável correndo por um caminho arqueado no plano lateral.
 *  O caminho é uma Bézier quadrática de `de` a `ate` com o controle deslocado
 *  perpendicularmente por `arqueio`, e o perfil interpola entre as entradas de
 *  `perfil` pela fração do caminho. `orientacao` [1,0,0] põe a largura do
 *  contorno em x, então a altura do contorno cai no plano lateral. */
const LADOS_PERFILADO = 24;
const tuboPerfilado = (origemId, de, ate, perfil, arqueio) => {
  const meio = [(de[0] + ate[0]) / 2, (de[1] + ate[1]) / 2];
  const d = [ate[0] - de[0], ate[1] - de[1]];
  const comp = Math.hypot(...d);
  const normal = [-d[1] / comp, d[0] / comp];
  const ctrl = [meio[0] + normal[0] * arqueio, meio[1] + normal[1] * arqueio];
  const emT = (f) => {
    const g = 1 - f;
    return [
      g * g * de[0] + 2 * g * f * ctrl[0] + f * f * ate[0],
      g * g * de[1] + 2 * g * f * ctrl[1] + f * f * ate[1],
    ];
  };
  const entre = (f) => {
    let i = 0;
    while (i < perfil.length - 2 && perfil[i + 1][0] < f) i += 1;
    const [f0, l0, a0, e0] = perfil[i];
    const [f1, l1, a1, e1] = perfil[i + 1];
    const k = f1 === f0 ? 0 : (f - f0) / (f1 - f0);
    const mix = (x, y) => x + (y - x) * k;
    return secao(mix(l0, l1), mix(a0, a1), mix(e0, e1), LADOS_PERFILADO);
  };
  /* Polo em cada ponta, pela tangente local, senão sai tubo aberto. */
  const tangente = (f) => {
    const a = emT(Math.max(0, f - 0.01));
    const b = emT(Math.min(1, f + 0.01));
    const v = [b[0] - a[0], b[1] - a[1]];
    const n = Math.hypot(...v);
    return [v[0] / n, v[1] / n];
  };
  const alem = (f, k) => {
    const p = emT(f);
    const u = tangente(f);
    return mundo([p[0] + u[0] * POLO * k, p[1] + u[1] * POLO * k]);
  };
  const fracoes = perfil.map(([f]) => f);
  return ['loft', {
    origemId,
    lados: LADOS_PERFILADO,
    orientacao: [1, 0, 0],
    secoes: [
      { pos: alem(0, -1), raio: 0 },
      ...fracoes.map((f) => ({ pos: mundo(emT(f)), contorno: entre(f) })),
      { pos: alem(1, 1), raio: 0 },
    ],
  }];
};

const ID = {
  caixaMC: 101, tuboSelim: 102, tuboInferior: 103, tuboDirecao: 104, tuboSuperior: 105,
  balancoInfEsq: 106, balancoInfDir: 107, balancoSupEsq: 108, balancoSupDir: 109,
};

/* PASSOS DERIVADOS DE PARAMS, NÃO DE UMA CÓPIA CONGELADA. A tabela chega como
   argumento e a derivação roda a cada chamada, senão a varredura muda o
   parâmetro e a geometria não responde — foi o que a primeira versão fez, com
   os vinte e três parâmetros saindo como sem efeito. */
function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const meiaPonteira = t.meiaLarguraCubo;
  const passos = [];
  const parte = (nome, op, id) => passos.push(['parte', { nome, sel: { origem: { op, id } } }]);

  /* A caixa do movimento central é o cubo em torno do qual o quadro se organiza:
     tubo do selim, tubo inferior e os dois balanços inferiores nascem nela. Ela
     existe como peça própria para que esses encontros sejam contato COM ELA, e
     não quatro tubos se cruzando no mesmo ponto. */
  passos.push(['cilindro', {
    origemId: ID.caixaMC,
    raio: m(t.raioCaixaMovimentoCentral),
    altura: m(t.larguraCaixaMovimentoCentral),
    lados: 18,
    eixo: 'x',
    em: [m(-t.larguraCaixaMovimentoCentral / 2), m(P.mc[1]), 0],
  }]);
  /* AS TAMPAS PEDEM CITAÇÃO PRÓPRIA. `{op:'cilindro', id}` sozinho seleciona só
     as laterais, e as duas tampas ficam sem parte — é o limite declarado de
     `cilindro`, e ele disparou aqui na primeira medição. A união das três vive
     num ALIAS, que é a forma que o contrato de seleção declara para isso. */
  passos.push(['parte', { nome: 'caixaMovimentoCentral', sel: { alias: 'caixaMovimentoCentralInteira' } }]);

  passos.push(tubo(ID.tuboSelim, P.mc, P.selimTopo, t.raioTuboSelim));
  parte('tuboSelim', 'loft', ID.tuboSelim);

  passos.push(tuboPerfilado(ID.tuboInferior, P.saidaInferior, P.direcaoBaixo,
    t.perfilTuboInferior, t.arqueioTuboInferior));
  parte('tuboInferior', 'loft', ID.tuboInferior);

  passos.push(tubo(ID.tuboDirecao, P.coroa, P.direcaoTopo, t.raioTuboDirecao));
  parte('tuboDirecao', 'loft', ID.tuboDirecao);

  passos.push(tubo(ID.tuboSuperior, P.selimJuncao, P.direcaoTopo, t.raioTuboSuperior));
  parte('tuboSuperior', 'loft', ID.tuboSuperior);

  for (const [lado, sinal] of [['Esq', -1], ['Dir', 1]]) {
    passos.push(tubo(ID[`balancoInf${lado}`], P.saidaBalanco, P.eixoTraseiro, t.raioBalancoInferior,
      sinal * meiaSaidaDoBalanco, sinal * meiaPonteira));
    parte(`balancoInferior${lado}`, 'loft', ID[`balancoInf${lado}`]);

    passos.push(tubo(ID[`balancoSup${lado}`], P.eixoTraseiro, P.selimJuncaoBalanco, t.raioBalancoSuperior,
      sinal * meiaPonteira, sinal * 14));
    parte(`balancoSuperior${lado}`, 'loft', ID[`balancoSup${lado}`]);
  }

  for (const nome of ['caixaMovimentoCentral', 'tuboSelim', 'tuboInferior', 'tuboDirecao', 'tuboSuperior',
    'balancoInferiorEsq', 'balancoInferiorDir', 'balancoSuperiorEsq', 'balancoSuperiorDir']) {
    passos.push(['material', { usa: 'aluminioBranco', sel: { grupo: nome } }]);
    passos.push(['solido', { sel: { grupo: nome } }]);
  }
  return passos;
}

export const ALIASES = [
  ['caixaMovimentoCentralInteira', { unir: [
    { origem: { op: 'cilindro', id: ID.caixaMC } },
    { origem: { op: 'cilindro', id: ID.caixaMC, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id: ID.caixaMC, tampa: 'topo' } },
  ] }],
];

export const receitaBicicletaQuadro = {
  meta: {
    nome: 'Quadro de bicicleta 29" hardtail',
    versao: '0.1.0',
    autor: 'Mecanifica Procedural AI',
    desc: 'módulo 1 de 5: quadro sem rodas, garfo, guidão ou transmissão',
  },

  PARAMS: TABELA,

  ALIASES,

  /* CONTATOS INTENCIONAIS, declarados ANTES de medir. Um quadro é uma estrutura
     soldada: o que se toca aqui se toca de propósito, e o que se tocar fora
     desta lista é defeito. */
  contatos: [
    { par: ['caixaMovimentoCentral', 'tuboSelim'], motivo: 'o tubo do selim nasce soldado na caixa' },
    { par: ['caixaMovimentoCentral', 'tuboInferior'], motivo: 'o tubo inferior nasce soldado na caixa' },
    { par: ['caixaMovimentoCentral', 'balancoInferiorEsq'], motivo: 'o balanco esquerdo sai da caixa' },
    { par: ['caixaMovimentoCentral', 'balancoInferiorDir'], motivo: 'o balanco direito sai da caixa' },
    { par: ['tuboSelim', 'tuboInferior'], motivo: 'os dois tubos se encontram na caixa' },
    { par: ['tuboSelim', 'tuboSuperior'], motivo: 'o tubo superior solda no tubo do selim' },
    { par: ['tuboSelim', 'balancoSuperiorEsq'], motivo: 'o balanco superior esquerdo solda no tubo do selim' },
    { par: ['tuboSelim', 'balancoSuperiorDir'], motivo: 'o balanco superior direito solda no tubo do selim' },
    { par: ['tuboDirecao', 'tuboSuperior'], motivo: 'o tubo superior solda no tubo de direcao' },
    { par: ['tuboDirecao', 'tuboInferior'], motivo: 'o tubo inferior solda no tubo de direcao' },
    { par: ['balancoInferiorEsq', 'balancoSuperiorEsq'], motivo: 'os dois balancos se encontram na ponteira esquerda' },
    { par: ['balancoInferiorDir', 'balancoSuperiorDir'], motivo: 'os dois balancos se encontram na ponteira direita' },
  ],

  TOPO: {
    origem: 'movimento central projetado no solo; z para a frente, y para cima',
    simetria: 'bilateral em X; balancos espelhados, triangulo principal no plano X=0',
    modulo: '1 de 5 — rodas, garfo, guidao e transmissao sao peças proprias',
  },

  MATERIAIS: {
    aluminioBranco: { cor: '#f2f3f4', metalicidade: 0.35, aspereza: 0.35 },
  },

  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receitaBicicletaQuadro;
