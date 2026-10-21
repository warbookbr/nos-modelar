/* carenagem-de-prova — meia carenagem de chapa desenhada só por código, a peça de prova da superfície por subdivisão.
 *
 * Uma chapa contínua de 2400 mm ao longo de z, espelhada em x: a lateral sobe da borda de baixo até o ombro e o teto
 * vai do ombro à costura em x = 0. A planta abaula em z e a seção abaula na lateral e no teto, o que dá duas curvaturas.
 * Um vinco vivo na coluna 'cintura' nasce e morre dentro da lateral, o ombro é um vinco de nitidez fracionária (o raio de
 * borda sai da nitidez), um arco recorta a borda de baixo perto da traseira e um vão abre o teto. Nenhum número vem de
 * referência externa: a forma é a função `secao` abaixo, amostrada nas estações e colunas que `derivar` tira da TABELA.
 *
 * Referencial do acervo: y para cima, a borda de baixo em y = borda_altura (fora do arco), a traseira em z = 0 e a
 * frente em z = comprimento, como no resto do acervo; x cresce para a direita de quem olha a frente, e a gaiola declarada é a metade x >= 0.
 *
 * A gaiola sai de `gaiolaPorEstacoes` em `derivar`, adensada só perto do vinco: longe dele a seção tem 9 colunas, perto
 * dele 15, e a transição fecha pentágonos onde as colunas começam e triângulos onde se fundem. Os pontos da gaiola são
 * dado derivado da TABELA, sem liberdade própria, e moram em `TOPO`, por um getter que lê `this.PARAMS`: em PARAMS eles
 * virariam cerca de 1.300 coordenadas sondadas pelo diagnóstico de parâmetros, e ficariam fixas desde a carga do módulo
 * quando a TABELA muda. O passo cita a gaiola só por nome; `enderecosPorIndice` confere em teste.
 *
 * As cotas da TABELA que a peça precisa acertar são pontos da gaiola listados em `medidas`: a superfície limite passa
 * por eles, e cada um é vértice da malha. A espessura fecha a chapa num sólido, com a face externa na superfície medida
 * e o material para dentro. Quem aprova a forma é a pessoa.
 */
import { gaiolaPorEstacoes } from '../../nucleo/gaiola-por-estacoes.js';

/* Tudo em milímetro, menos `ombro_nitidez`, que é a nitidez do vinco do ombro (0 liso, 1 vivo). As medidas "no meio"
   valem na estação do meio do comprimento; nas pontas a planta e o ombro recolhem para os valores "_ponta". */
export const TABELA = {
  comprimento: 2400,
  soleira_meia_largura: 800,
  soleira_meia_largura_ponta: 700,
  borda_altura: 100,
  ombro_altura: 800,
  ombro_altura_ponta: 750,
  ombro_recuo: 80,
  ombro_nitidez: 0.6,
  bojo_lateral: 30,
  teto_altura: 920,

  cintura_altura: 490,
  cintura_saliencia: 25,
  cintura_faixa: 70,
  vinco_inicio: 800,
  vinco_fim: 1600,
  vinco_rampa: 200,

  arco_centro: 500,
  arco_meia_corda: 250,
  arco_altura: 200,

  vao_inicio: 1300,
  vao_fim: 1700,
  vao_fora: 540,
  vao_dentro: 360,

  espessura: 2,
  passo_fino: 50,
  passo_arco: 50,
  passo_grosso: 250,
};

const m = (mm) => mm / 1000;
const suave = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };

/* As colunas da seção: frações s de 0 (borda de baixo) a 1 (ombro) na lateral e r de 0 (ombro) a 1 (costura) no teto.
   As colunas da lateral ficam a passos de 1/16 contados da cintura, de cinco abaixo dela a três acima. Longe do vinco a
   lateral tem a soleira e três colunas grossas; na transição entram as meias, e perto do vinco as finas e a cintura. */
const PASSO_DA_COLUNA = 1 / 16;
const COLUNAS_DA_LATERAL = {
  grossa: [['saia', -5], ['flanco', -1], ['costado', 3]],
  meias: [['saia', -5], ['meiaBaixa', -3], ['flanco', -1], ['meiaAlta', 1], ['costado', 3]],
  finas: [['saia', -5], ['finaA', -4], ['meiaBaixa', -3], ['finaB', -2], ['flanco', -1], ['cintura', 0], ['meiaAlta', 1], ['finaC', 2], ['costado', 3]],
};
/* Depois do vinco as finas se fundem duas a duas e depois as meias, cada fusão fechando um triângulo. */
const FUSAO_DAS_FINAS = { meiaBaixa: ['finaA', 'meiaBaixa'], flanco: ['finaB', 'flanco'], meiaAlta: ['cintura', 'meiaAlta'], costado: ['finaC', 'costado'] };
const FUSAO_DAS_MEIAS = { saia: ['saia', 'meiaBaixa'], flanco: ['flanco', 'meiaAlta'] };

/** A forma em milímetro: as funções da seção numa estação z e as posições das estações, tudo da TABELA. */
function forma(T) {
  const L = T.comprimento;
  const planta = (z) => Math.sin(Math.PI * z / L);
  const soleiraX = (z) => T.soleira_meia_largura_ponta + (T.soleira_meia_largura - T.soleira_meia_largura_ponta) * planta(z);
  const ombroY = (z) => T.ombro_altura_ponta + (T.ombro_altura - T.ombro_altura_ponta) * planta(z);
  const flechaDoTeto = T.teto_altura - T.ombro_altura;
  const arco = (z) => { const t = (z - T.arco_centro) / T.arco_meia_corda; return t * t < 1 ? T.arco_altura * Math.sqrt(1 - t * t) : 0; };
  const bordaY = (z) => T.borda_altura + arco(z);
  /* a cintura e a faixa do vinco em fração da lateral, medidas no meio do comprimento */
  const lateralNoMeio = T.ombro_altura - T.borda_altura;
  const sc = (T.cintura_altura - T.borda_altura) / lateralNoMeio;
  if (!(sc > 5 * PASSO_DA_COLUNA && sc < 1 - 3 * PASSO_DA_COLUNA)) {
    throw new Error(`carenagem-de-prova: cintura_altura ${T.cintura_altura} não deixa cinco colunas finas abaixo da cintura e três acima dela (a cintura vai de ${T.borda_altura + lateralNoMeio * 5 * PASSO_DA_COLUNA} a ${T.borda_altura + lateralNoMeio * (1 - 3 * PASSO_DA_COLUNA)} mm)`);
  }
  const colunasDaLateral = (tipo) => [['soleira', 0], ...COLUNAS_DA_LATERAL[tipo].map(([n, k]) => [n, sc + k * PASSO_DA_COLUNA])];
  const faixa = T.cintura_faixa / lateralNoMeio;
  const rampa = (z) => suave((z - T.vinco_inicio) / T.vinco_rampa) * suave((T.vinco_fim - z) / T.vinco_rampa);
  const dobra = (z, s) => T.cintura_saliencia * rampa(z) * Math.max(0, 1 - Math.abs(s - sc) / faixa);
  const lateral = (z, s) => {
    const yb = bordaY(z);
    return [soleiraX(z) - T.ombro_recuo * s * s + T.bojo_lateral * Math.sin(Math.PI * s) + dobra(z, s), yb + (ombroY(z) - yb) * s];
  };
  const teto = (z, r) => [(soleiraX(z) - T.ombro_recuo) * (1 - r), ombroY(z) + flechaDoTeto * (1 - (1 - r) * (1 - r))];
  /* as colunas do teto saem das bordas do vão no meio do comprimento, em fração da meia largura do ombro */
  const ombroX = T.soleira_meia_largura - T.ombro_recuo;
  const rFora = 1 - T.vao_fora / ombroX;
  const rDentro = 1 - T.vao_dentro / ombroX;
  if (!(T.vao_dentro > 0 && T.vao_dentro < T.vao_fora && T.vao_fora < ombroX)) {
    throw new Error(`carenagem-de-prova: o vão do teto precisa de 0 < vao_dentro < vao_fora < ${ombroX} mm (a meia largura do ombro no meio), e veio vao_dentro ${T.vao_dentro} e vao_fora ${T.vao_fora}`);
  }
  const colunasDoTeto = [['ombro', 0], ['vaoFora', rFora], ['vaoDentro', rDentro], ['tetoInterno', (rDentro + 1) / 2], ['centro', 1]];
  return { L, sc, lateral, teto, colunasDaLateral, colunasDoTeto, soleiraX, ombroX };
}

/* Divide o trecho de a a b em partes de no máximo `passo`, sem as pontas. */
function entre(a, b, passo) {
  const n = Math.ceil((b - a) / passo - 1e-9);
  return Array.from({ length: Math.max(0, n - 1) }, (_, k) => a + (b - a) * (k + 1) / n);
}

/** As estações em milímetro, com nome e o conjunto de colunas de cada uma. */
function estacoesDaForma(T) {
  const pf = T.passo_fino;
  const chave = [
    ['tras', 0], ['arcoInicio', T.arco_centro - T.arco_meia_corda], ['arcoTopo', T.arco_centro], ['arcoFim', T.arco_centro + T.arco_meia_corda],
    ['vincoInicio', T.vinco_inicio], ['meio', T.comprimento / 2], ['vaoInicio', T.vao_inicio], ['vincoFim', T.vinco_fim],
    ['vaoFim', T.vao_fim], ['frente', T.comprimento],
  ];
  /* a zona fina vai de um passo antes do vinco a um passo depois, e a transição ocupa um passo antes dela e dois depois */
  const zFinas0 = T.vinco_inicio - pf; const zFinas1 = T.vinco_fim + pf;
  const zona0 = zFinas0 - pf; const zona1 = zFinas1 + 2 * pf;
  const arco0 = T.arco_centro - T.arco_meia_corda; const arco1 = T.arco_centro + T.arco_meia_corda;
  const posicoes = new Map();
  for (const [nome, z] of chave) {
    if (posicoes.has(z)) throw new Error(`carenagem-de-prova: as estações '${posicoes.get(z)}' e '${nome}' caem na mesma posição, z ${z} mm; cada cota precisa da sua estação`);
    posicoes.set(z, nome);
  }
  for (const z of [zona0, zFinas0, zFinas1, zona1]) if (!posicoes.has(z)) posicoes.set(z, null);
  /* preenchimento: passo do arco no arco, passo fino na zona fina e na transição, passo grosso no resto */
  const fixas = [...posicoes.keys()].sort((a, b) => a - b);
  for (let k = 0; k + 1 < fixas.length; k++) {
    const a = fixas[k], b = fixas[k + 1];
    const passo = Math.min(a >= arco0 && b <= arco1 ? T.passo_arco : Infinity, a >= zona0 && b <= zona1 ? pf : Infinity, T.passo_grosso);
    for (const z of entre(a, b, passo)) posicoes.set(z, null);
  }
  /* a estação sem nome de cota leva o nome da última cota antes dela e a ordem a partir dali */
  const zs = [...posicoes.keys()].sort((a, b) => a - b);
  let ultima = null; let k = 0;
  const estacoes = zs.map((z) => {
    let nome = posicoes.get(z);
    if (nome) { ultima = nome; k = 0; } else { k += 1; nome = `${ultima ?? 'antes'}${k}`; }
    return { nome, z, tipo: 'grossa' };
  });
  /* o tipo sai da ordem: finas da primeira estação em zFinas0 ou depois até a última em zFinas1 ou antes, meias na
     estação anterior, e as duas fusões nas duas seguintes; assim uma cota que cai no meio da transição não a quebra */
  const primeira = estacoes.findIndex((e) => e.z >= zFinas0);
  const ultimaFina = estacoes.findLastIndex((e) => e.z <= zFinas1);
  if (primeira < 1 || ultimaFina + 2 >= estacoes.length - 1) {
    throw new Error(`carenagem-de-prova: o vinco de z ${T.vinco_inicio} a ${T.vinco_fim} mm precisa de uma estação antes da zona fina e de duas depois dela, antes das pontas`);
  }
  estacoes[primeira - 1].tipo = 'meias';
  for (let j = primeira; j <= ultimaFina; j++) estacoes[j].tipo = 'finas';
  estacoes[ultimaFina + 1].tipo = 'fusaoDasFinas';
  estacoes[ultimaFina + 2].tipo = 'fusaoDasMeias';
  return estacoes;
}

/**
 * derivar(T) -> a gaiola em metro e as cotas que as medidas conferem.
 *   pontos: os pontos nomeados da gaiola, em metro, que entram em TOPO;
 *   passo: os campos do passo `subdivisao` (vertices, faces, vincos, cantos, medidas, simetria), só com nomes;
 *   cotas: { nome do ponto medido: [x, y, z] em milímetro, tirado da TABELA }.
 */
export function derivar(T) {
  const f = forma(T);
  const coluna = (z, nome, s, de) => ({ nome, em: (s <= 1 ? f.lateral(z, s) : f.teto(z, s - 1)).map(m), ...(de ? { de } : {}) });
  const colunasDe = (z, lateral, fusao = {}) => [...lateral, ...f.colunasDoTeto.map(([n, r]) => [n, 1 + r])]
    .map(([n, s]) => coluna(z, n, s, fusao[n]));
  const estacoes = estacoesDaForma(T).map(({ nome, z, tipo }) => {
    const lateral = f.colunasDaLateral({ fusaoDasFinas: 'meias', fusaoDasMeias: 'grossa' }[tipo] ?? tipo);
    const fusao = tipo === 'fusaoDasFinas' ? FUSAO_DAS_FINAS : (tipo === 'fusaoDasMeias' ? FUSAO_DAS_MEIAS : {});
    return { nome, em: m(z), colunas: colunasDe(z, lateral, fusao) };
  });
  const MEDIDAS = [['meio', 'centro'], ['meio', 'ombro'], ['meio', 'cintura'], ['meio', 'soleira'], ['arcoTopo', 'soleira'], ['frente', 'centro'], ['tras', 'centro']];
  const gaiola = gaiolaPorEstacoes({
    eixo: 'z', simetria: 'x', estacoes,
    vincos: [
      { nome: 'linhaDeCintura', coluna: 'cintura', de: 'vincoInicio', ate: 'vincoFim', nitidez: 'viva' },
      { nome: 'ombro', coluna: 'ombro', nitidez: T.ombro_nitidez },
    ],
    vaos: [{ nome: 'claraboia', estacoes: ['vaoInicio', 'vaoFim'], colunas: ['vaoFora', 'vaoDentro'] }],
    cantos: [
      ...['vaoInicio', 'vaoFim'].flatMap((estacao) => ['vaoFora', 'vaoDentro'].map((coluna) => ({ estacao, coluna }))),
      { estacao: 'arcoInicio', coluna: 'soleira' }, { estacao: 'arcoFim', coluna: 'soleira' },
    ],
    medidas: MEDIDAS.map(([estacao, coluna]) => ({ estacao, coluna })),
  });
  /* as cotas em milímetro, escritas pela TABELA, para o teste conferir que a malha passa por elas */
  const meio = T.comprimento / 2;
  const cinturaX = f.lateral(meio, f.sc)[0];
  const tetoNaPonta = T.ombro_altura_ponta + T.teto_altura - T.ombro_altura;
  const cotas = {
    meio_centro: [0, T.teto_altura, meio],
    meio_ombro: [T.soleira_meia_largura - T.ombro_recuo, T.ombro_altura, meio],
    meio_cintura: [cinturaX, T.cintura_altura, meio],
    meio_soleira: [T.soleira_meia_largura, T.borda_altura, meio],
    arcoTopo_soleira: [f.soleiraX(T.arco_centro), T.borda_altura + T.arco_altura, T.arco_centro],
    tras_centro: [0, tetoNaPonta, 0],
    frente_centro: [0, tetoNaPonta, T.comprimento],
  };
  return { pontos: gaiola.pontos, passo: gaiola.passo, cotas, cinturaX };
}

const CARENAGEM = { origem: { op: 'subdivisao', id: 1 } };

/** Os PASSOS: a superfície subdividida com espessura, a parte e o material. */
export function gerarPassos(T) {
  const { passo } = derivar(T);
  return [
    ['subdivisao', { origemId: 1, ...passo, borda: 'cantos', niveis: 2, espessura: m(T.espessura) }],
    ['parte', { nome: 'carenagem', sel: CARENAGEM }],
    ['material', { sel: CARENAGEM, usa: 'chapa' }],
  ];
}

/* Uma parte só, sem par para encostar. */
export const CONTATOS = [];

/* Os extremos da caixa da carenagem, em milímetro, saídos da TABELA: o ponto mais largo é a cintura no meio do
   comprimento, o mais alto o teto no meio, e a caixa vai da traseira à frente e da borda de baixo ao teto. */
const { cinturaX } = derivar(TABELA);
export const PONTOS = [
  { nome: 'canto de cima da frente da caixa: a cintura no meio, o teto no meio e a frente', parte: 'carenagem', medida: 'maximo', em: [cinturaX, TABELA.teto_altura, TABELA.comprimento], toleranciaMm: 1 },
  { nome: 'canto de baixo de trás da caixa: a cintura espelhada, a borda de baixo e a traseira', parte: 'carenagem', medida: 'minimo', em: [-cinturaX, TABELA.borda_altura, 0], toleranciaMm: 1 },
  { nome: 'centro da caixa, na costura', parte: 'carenagem', medida: 'centro', em: [0, (TABELA.borda_altura + TABELA.teto_altura) / 2, TABELA.comprimento / 2], toleranciaMm: 1 },
];

const receita = {
  meta: { nome: 'carenagem-de-prova', desc: 'meia carenagem de chapa espelhada, por subdivisão: duas curvaturas, vinco vivo na cintura, ombro com raio, arco na borda de baixo e vão no teto' },
  PARAMS: TABELA,
  MATERIAIS: {
    chapa: { tipo: 'liso', cor: '#7f97ad' },
  },
  /* `origem` diz o referencial; os pontos da gaiola, derivados da TABELA atual, entram aqui pelo nome. */
  get TOPO() {
    return {
      origem: 'chão abaixo da borda de baixo, na costura x = 0 e na traseira; y para cima e a frente em +z',
      ...derivar(this.PARAMS).pontos,
    };
  },
  PLANO: {
    objeto: 'carenagem de chapa de 2400 mm de comprimento e 920 mm de altura, aberta embaixo e nas pontas, com lateral e teto contínuos, vinco vivo na cintura, ombro arredondado, arco na borda de baixo e vão no teto',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'comprimento da carenagem, de z 0 a 2400', milimetros: 2400 },
    familia: 'veiculo',
    partes: [
      { nome: 'carenagem', forma: 'chapa de 2 mm simétrica em x, da borda de baixo ao ombro e ao teto, planta abaulada, vinco da cintura de z 800 a 1600, ombro arredondado, arco de 500 por 200 mm na borda de baixo e vão de z 1300 a 1700 no teto', tecnica: 'subdivisao de uma gaiola por estações e colunas nomeadas, com vincos nomeados, medidas nas cotas da TABELA e espessura' },
    ],
    criteriosDeReprovacao: [
      'a caixa não vai de z 0 a 2400 e de y 100 a 920, ou não é simétrica em x',
      'a superfície não passa pelas cotas medidas: teto de 920 mm, ombro de 800 mm e borda de 100 mm no meio, topo do arco a 300 mm',
      'o vinco da cintura não é uma dobra viva que nasce e morre dentro da lateral, ou aparece fora de z 800 a 1600',
      'o ombro sai vivo como uma quina ou tão mole que a lateral e o teto viram uma curva só',
      'a chapa tem furo, dobra sobre si, face invertida ou casca aberta, ou o vão do teto e o arco da borda não aparecem',
    ],
  },
  contatos: CONTATOS,
  PONTOS,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
