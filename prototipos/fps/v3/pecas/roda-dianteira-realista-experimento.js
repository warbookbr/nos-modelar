/* EXPERIMENTO DE AUTORIA — roda dianteira de apresentação feita somente com
   o vocabulário procedural atual da Oficina.

   Esta variante NÃO substitui `roda-dianteira.js` e não entra na apresentação.
   Ela mede quanto detalhe visual a linguagem atual suporta sem malha externa:
   - pneu oco com quatro sulcos longitudinais realmente rebaixados no perfil;
   - barril e flange do aro vazados;
   - cinco pares de raios com aberturas reais;
   - miolo vazado e cinco porcas visuais, sem copiar o cubo do freio.

   Convenção dimensional herdada da prancha:
   - X é o eixo da roda e +X é a face externa;
   - Y/Z formam o plano radial;
   - raio externo 0,340 m e largura total 0,220 m.

   Toda seleção persistida nasce de `origemId`. Os números abaixo identificam
   geradores escolhidos pelo autor; não são ids de faces, vértices ou passos.

   Provas:
     npm run descrever -- roda-dianteira-realista-experimento --estrito
     npm run bancada -- roda-dianteira-realista-experimento --vistas=direita,frontal,isometrica --projecao=ortografica --estrito
*/
import { executar, colisaoDe } from '../motor/oficina.js';

const MEDIDAS = {
  /* Pneu: a parede interna acomoda o barril; a coroa mantém a prancha em
     0,340 m e quatro vales de 8 mm produzem sulcos geométricos, não pintura. */
  pneuRaioExterno: 0.340,
  pneuRaioPreSulco: 0.339,
  pneuRaioSulco: 0.335,
  pneuRaioOmbro: 0.316,
  pneuRaioTalao: 0.220,
  pneuRaioInterno: 0.213,
  pneuMeiaLargura: 0.110,
  pneuXTalao: 0.087,

  /* Aro: o barril fica aberto no centro e o flange externo avança para
     capturar luz. O miolo também é anular para não duplicar o cubo do freio. */
  aroRaioBarrilInterno: 0.208,
  aroRaioBarrilBase: 0.226,
  aroRaioExterno: 0.245,
  aroXTraseiro: -0.095,
  aroXFrontal: 0.106,
  mioloRaioInterno: 0.080,
  mioloRaioExterno: 0.108,
  mioloXTraseiro: 0.060,
  mioloXFrontal: 0.105,

  /* Raios: cinco famílias radiais, cada uma com dois braços separados. O
     ressalto escuro fica atrás do par e não fecha as cinco janelas do aro. */
  raioPontaInterna: 0.091,
  raioInicio: 0.101,
  raioMeio: 0.158,
  raioFim: 0.216,
  raioPontaExterna: 0.225,
  raioSecaoInterna: 0.008,
  raioSecaoMeio: 0.016,
  raioSecaoExterna: 0.022,
  raioEspessuraInterna: 0.006,
  raioEspessuraMeio: 0.007,
  raioEspessuraExterna: 0.008,
  raioChanfro: 0.0025,
  raioFaceX: 0.081,

  recessoRaioInicio: 0.096,
  recessoComprimento: 0.126,
  recessoLargura: 0.042,
  recessoProfundidade: 0.020,
  recessoX: 0.063,

  /* Porcas, não prisioneiros: o centro permanece aberto e o cubo continua
     pertencendo exclusivamente ao freio. */
  fixadorRaioOrbita: 0.094,
  fixadorRaio: 0.0065,
  fixadorComprimento: 0.011,
  fixadorBaseX: 0.102,
};

const DERIVADAS = {
  pneuMeiaLarguraNeg: '= -pneuMeiaLargura',
  pneuXTalaoNeg: '= -pneuXTalao',
};

/* A linguagem ainda não avalia seno/cosseno. Os coeficientes são gerados uma
   vez, deterministicamente, e cada coordenada continua derivada dos raios
   nomeados. Alterar uma medida radial refaz todos os dez braços. */
const PARAMETROS_RAIOS = {};
const arredondar = (valor) => {
  const limpo = Math.abs(valor) < 1e-12 ? 0 : valor;
  return Number(limpo.toFixed(12));
};
const expressaoProduto = (nome, coeficiente) => `= ${nome} * ${arredondar(coeficiente)}`;

const ANGULOS_GRUPOS = [0, 72, 144, 216, 288];
const ABERTURA_PAR_GRAUS = 7.5;
const ANGULOS_RAIOS = ANGULOS_GRUPOS.flatMap((centro) => [
  centro - ABERTURA_PAR_GRAUS,
  centro + ABERTURA_PAR_GRAUS,
]);

for (const [indice, graus] of ANGULOS_RAIOS.entries()) {
  const rad = graus * Math.PI / 180;
  const y = Math.cos(rad);
  const z = Math.sin(rad);
  for (const nome of ['raioPontaInterna', 'raioInicio', 'raioMeio', 'raioFim', 'raioPontaExterna']) {
    PARAMETROS_RAIOS[`r${indice}_${nome}Y`] = expressaoProduto(nome, y);
    PARAMETROS_RAIOS[`r${indice}_${nome}Z`] = expressaoProduto(nome, z);
  }
}

export const PARAMS = { ...MEDIDAS, ...DERIVADAS, ...PARAMETROS_RAIOS };

export const TOPO = {
  ladosPneu: 44,
  ladosAro: 48,
  ladosMiolo: 40,
  ladosRaio: 8,
  ladosFixador: 6,
};

export const MATERIAIS = {
  borrachaLateral: { cor: '#171a1c', aspereza: 0.93, metalness: 0.0 },
  borrachaSulco: { cor: '#090b0c', aspereza: 1.0, metalness: 0.0 },
  metalBarril: { cor: '#41484e', aspereza: 0.43, metalness: 0.82 },
  metalFlange: { cor: '#b9c0c4', aspereza: 0.20, metalness: 0.94 },
  metalRecesso: { cor: '#465057', aspereza: 0.42, metalness: 0.74 },
  metalRaio: { cor: '#c9ced1', aspereza: 0.18, metalness: 0.96 },
  metalMiolo: { cor: '#8e979c', aspereza: 0.29, metalness: 0.90 },
  metalFixador: { cor: '#d8dcde', aspereza: 0.14, metalness: 0.98 },
};

const PNEU = 5101;
const ARO = 5201;
const MIOLO = 5301;
const RECESSOS = ANGULOS_GRUPOS.map((_, indice) => 5401 + indice);
const RAIOS = ANGULOS_RAIOS.map((_, indice) => 5501 + indice);
const FIXADORES = ANGULOS_GRUPOS.map((_, indice) => 5601 + indice);

const FACES_CUBO = ['fundo', 'topo', 'tras', 'direita', 'frente', 'esquerda'];
const origemLathe = (id, faixa) => ({
  origem: { op: 'lathe', id, ...(faixa === undefined ? {} : { faixa }) },
});
const origemLoft = (id) => ({ origem: { op: 'loft', id } });
const cuboInteiro = (id) => ({
  unir: FACES_CUBO.map((face) => ({ origem: { op: 'cubo', id, face } })),
});
const cilindroInteiro = (id) => ({
  unir: [
    { origem: { op: 'cilindro', id } },
    { origem: { op: 'cilindro', id, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id, tampa: 'topo' } },
  ],
});
const unir = (selecoes) => ({ unir: selecoes.flatMap((selecao) => selecao.unir ?? [selecao]) });

/* Os intervalos abaixo são locais ao perfil nomeado, não ids globais. As onze
   faixas do aro são repartidas sem sobreposição entre barril e flange. */
const FAIXAS_FLANGE = [4, 5, 6, 7];
const FAIXAS_BARRIL = [0, 1, 2, 3, 8, 9, 10];
const FAIXAS_SULCOS = [3, 4, 6, 7, 9, 10, 12, 13];

export const ALIASES = [
  ['pneuInteiro', origemLathe(PNEU)],
  ['pneuSulcos', unir(FAIXAS_SULCOS.map((faixa) => origemLathe(PNEU, faixa)))],
  ['barrilInteiro', unir(FAIXAS_BARRIL.map((faixa) => origemLathe(ARO, faixa)))],
  ['flangeInteiro', unir(FAIXAS_FLANGE.map((faixa) => origemLathe(ARO, faixa)))],
  ['aroInteiro', origemLathe(ARO)],
  ['mioloInteiro', origemLathe(MIOLO)],
  ['recessosInteiros', unir(RECESSOS.map((id) => cuboInteiro(id)))],
  ['raiosInteiros', unir(RAIOS.map((id) => origemLoft(id)))],
  ['fixadoresInteiros', unir(FIXADORES.map((id) => cilindroInteiro(id)))],
  ['aberturaCentral', { origem: { op: 'lathe', id: MIOLO, faixa: 5 } }],
];

const paraEixoX = (op, id) => ['rotaciona', {
  eixo: 'z',
  graus: -90,
  pivo: [0, 0, 0],
  sel: { origem: { op, id } },
}];

/* O frame local do loft escolhe U/W conforme a direção do caminho. Esta
   função traduz largura tangencial e espessura axial para esse frame e corta
   os quatro cantos. Sem essa tradução, uma seção retangular gira 90° em alguns
   raios mesmo quando todos os caminhos são radialmente equivalentes. */
const contornoChanfrado = (indice, largura, espessura) => {
  const graus = ANGULOS_RAIOS[indice] * Math.PI / 180;
  const tangencialEmU = Math.abs(Math.cos(graus)) > 0.9;
  const u = tangencialEmU ? largura : espessura;
  const w = tangencialEmU ? espessura : largura;
  const uDentro = `= ${u} - raioChanfro`;
  const wDentro = `= ${w} - raioChanfro`;
  return [
    [uDentro, w],
    [`= -(${u} - raioChanfro)`, w],
    [`= -${u}`, wDentro],
    [`= -${u}`, `= -(${w} - raioChanfro)`],
    [`= -(${u} - raioChanfro)`, `= -${w}`],
    [uDentro, `= -${w}`],
    [u, `= -(${w} - raioChanfro)`],
    [u, wDentro],
  ];
};

const passosRecessos = RECESSOS.flatMap((id, indice) => [
  ['cubo', {
    origemId: id,
    larg: 'recessoProfundidade',
    alt: 'recessoComprimento',
    prof: 'recessoLargura',
  }],
  ['transladar', {
    d: ['recessoX', 'recessoRaioInicio', 0],
    sel: { origem: { op: 'cubo', id } },
  }],
  ['rotaciona', {
    eixo: 'x',
    graus: ANGULOS_GRUPOS[indice],
    pivo: [0, 0, 0],
    sel: { origem: { op: 'cubo', id } },
  }],
]);

const passosRaios = RAIOS.flatMap((id, indice) => {
  const pos = (nome) => [
    'raioFaceX',
    `r${indice}_${nome}Y`,
    `r${indice}_${nome}Z`,
  ];
  const contornoInterno = contornoChanfrado(
    indice,
    'raioSecaoInterna',
    'raioEspessuraInterna',
  );
  const contornoMeio = contornoChanfrado(
    indice,
    'raioSecaoMeio',
    'raioEspessuraMeio',
  );
  const contornoExterno = contornoChanfrado(
    indice,
    'raioSecaoExterna',
    'raioEspessuraExterna',
  );
  return [[
    'loft',
    {
      origemId: id,
      lados: 'ladosRaio',
      secoes: [
        { pos: pos('raioPontaInterna'), raio: 0 },
        { pos: pos('raioInicio'), contorno: contornoInterno },
        { pos: pos('raioMeio'), contorno: contornoMeio },
        { pos: pos('raioFim'), contorno: contornoExterno },
        { pos: pos('raioPontaExterna'), raio: 0 },
      ],
    },
  ]];
});

const passosFixadores = FIXADORES.flatMap((id, indice) => {
  const graus = ANGULOS_GRUPOS[indice] * Math.PI / 180;
  const y = arredondar(Math.cos(graus) * MEDIDAS.fixadorRaioOrbita);
  const z = arredondar(Math.sin(graus) * MEDIDAS.fixadorRaioOrbita);
  return [
    ['cilindro', {
      origemId: id,
      raio: 'fixadorRaio',
      altura: 'fixadorComprimento',
      lados: 'ladosFixador',
    }],
    paraEixoX('cilindro', id),
    ['transladar', {
      d: ['fixadorBaseX', y, z],
      sel: { origem: { op: 'cilindro', id } },
    }],
  ];
});

export const PASSOS = [
  /* Pneu fechado: a sequência percorre talão esquerdo, ombro, coroa com quatro
     vales, ombro direito e parede interna. Repetir o primeiro ponto fecha o
     perfil explicitamente sem depender de fechamento implícito. */
  ['lathe', { origemId: PNEU, lados: 'ladosPneu', perfil: [
    ['pneuRaioTalao', 'pneuXTalaoNeg'],
    ['pneuRaioOmbro', 'pneuMeiaLarguraNeg'],
    ['pneuRaioPreSulco', -0.096],
    ['pneuRaioExterno', -0.075],
    ['pneuRaioSulco', -0.060],
    ['pneuRaioExterno', -0.045],
    ['pneuRaioExterno', -0.032],
    ['pneuRaioSulco', -0.020],
    ['pneuRaioExterno', -0.008],
    ['pneuRaioExterno', 0.008],
    ['pneuRaioSulco', 0.020],
    ['pneuRaioExterno', 0.032],
    ['pneuRaioExterno', 0.045],
    ['pneuRaioSulco', 0.060],
    ['pneuRaioExterno', 0.075],
    ['pneuRaioPreSulco', 0.096],
    ['pneuRaioOmbro', 'pneuMeiaLargura'],
    ['pneuRaioTalao', 'pneuXTalao'],
    ['pneuRaioInterno', 0.068],
    [0.211, 0],
    ['pneuRaioInterno', -0.068],
    ['pneuRaioTalao', 'pneuXTalaoNeg'],
  ] }],
  paraEixoX('lathe', PNEU),
  ['parte', { nome: 'pneu', sel: { alias: 'pneuInteiro' } }],

  /* Aro fechado e vazado. O flange frontal é parte independente porque sua
     superfície usinada tem acabamento e função visual diferentes do barril. */
  ['lathe', { origemId: ARO, lados: 'ladosAro', perfil: [
    ['aroRaioBarrilInterno', 'aroXTraseiro'],
    ['aroRaioBarrilBase', 'aroXTraseiro'],
    [0.242, -0.085],
    ['aroRaioExterno', -0.070],
    [0.242, 0.075],
    ['aroRaioExterno', 0.086],
    ['aroRaioExterno', 0.101],
    [0.222, 'aroXFrontal'],
    [0.214, 0.096],
    ['aroRaioBarrilInterno', 0.075],
    ['aroRaioBarrilInterno', -0.075],
    ['aroRaioBarrilInterno', 'aroXTraseiro'],
  ] }],
  paraEixoX('lathe', ARO),
  ['parte', { nome: 'barrilAro', sel: { alias: 'barrilInteiro' } }],
  ['parte', { nome: 'flangeExterno', sel: { alias: 'flangeInteiro' } }],

  /* Cinco ressaltos de fundição dão profundidade ao par de braços. Eles ficam
     atrás dos raios claros e deixam cinco janelas grandes realmente abertas. */
  ...passosRecessos,
  ['parte', { nome: 'recessosRaios', sel: { alias: 'recessosInteiros' } }],

  /* Dez braços = cinco pares. A seção retangular chanfrada é um contorno de
     oito lados do loft: face frontal legível e bordas que capturam luz. */
  ...passosRaios,
  ['parte', { nome: 'raios', sel: { alias: 'raiosInteiros' } }],

  /* Miolo anular, com rebaixo axial e furo central do mesmo raio declarado
     pela prancha simples. A abertura revela o cubo quando houver composição. */
  ['lathe', { origemId: MIOLO, lados: 'ladosMiolo', perfil: [
    ['mioloRaioInterno', 'mioloXTraseiro'],
    ['mioloRaioExterno', 'mioloXTraseiro'],
    ['mioloRaioExterno', 0.086],
    [0.102, 'mioloXFrontal'],
    [0.084, 'mioloXFrontal'],
    ['mioloRaioInterno', 0.096],
    ['mioloRaioInterno', 'mioloXTraseiro'],
  ] }],
  paraEixoX('lathe', MIOLO),
  ['parte', { nome: 'mioloAro', sel: { alias: 'mioloInteiro' } }],

  /* Porcas hexagonais de leitura, sem haste/prisioneiro e sem tampa central. */
  ...passosFixadores,
  ['parte', { nome: 'fixadores', sel: { alias: 'fixadoresInteiros' } }],

  /* Suavidade só nas superfícies de revolução. Os quatro planos dos raios e
     as arestas dos recessos permanecem definidos para conservar os reflexos. */
  ['liso', { sel: { alias: 'pneuInteiro' } }],
  ['liso', { sel: { alias: 'aroInteiro' } }],
  ['liso', { sel: { alias: 'mioloInteiro' } }],

  ['material', { sel: { grupo: 'pneu' }, usa: 'borrachaLateral' }],
  ['material', { sel: { alias: 'pneuSulcos' }, usa: 'borrachaSulco' }],
  ['material', { sel: { grupo: 'barrilAro' }, usa: 'metalBarril' }],
  ['material', { sel: { grupo: 'flangeExterno' }, usa: 'metalFlange' }],
  ['material', { sel: { grupo: 'recessosRaios' }, usa: 'metalRecesso' }],
  ['material', { sel: { grupo: 'raios' }, usa: 'metalRaio' }],
  ['material', { sel: { grupo: 'mioloAro' }, usa: 'metalMiolo' }],
  ['material', { sel: { grupo: 'fixadores' }, usa: 'metalFixador' }],

  ['solido', { sel: { grupo: 'pneu' } }],
  ['solido', { sel: { grupo: 'barrilAro' } }],
];

export const meta = {
  nome: 'roda-dianteira-realista-experimento',
  tipo: 'objeto',
  desc: 'experimento procedural de roda de apresentação — pneu sulcado, aro vazado, cinco raios duplos, miolo aberto e fixadores sem malha externa',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
