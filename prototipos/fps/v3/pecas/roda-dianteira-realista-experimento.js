/* EXPERIMENTO DE AUTORIA — roda dianteira de apresentação feita somente com
   o vocabulário procedural atual da Oficina.

   Esta variante NÃO substitui `roda-dianteira.js` e não entra na apresentação.
   Ela mede quanto detalhe visual a linguagem atual suporta sem malha externa:
   - pneu oco com quatro sulcos longitudinais realmente rebaixados no perfil;
   - barril e flange do aro vazados;
   - cinco pares de raios com aberturas reais;
   - miolo vazado e cinco porcas visuais, sem copiar o cubo do freio.

   O QUE MUDOU NO CICLO "ARRANJOS SEMÂNTICOS v1" (O-13, A-17): a repetição
   deixou de ser expansão de JavaScript e virou intenção declarada. Antes, os
   dez braços, os cinco recessos e as cinco porcas eram desenrolados à mão, e
   cada instância trazia as próprias coordenadas: 141 parâmetros, dos quais CEM
   eram só seno e cosseno de dez ângulos. A frase "cinco pares em torno do eixo
   X" não existia em lugar nenhum do arquivo; existia a expansão dela.

   Agora ela existe, em três lugares e sempre da mesma forma:
   - UM braço é declarado no ângulo zero, onde as coordenadas SÃO os raios
     nomeados (Y = raio, Z = 0) e não há trigonometria nenhuma;
   - `rotaciona` abre meia abertura do par, e `arranja` radial cria o segundo
     braço do par a `raioParAbertura` graus do primeiro;
   - `arranja` radial com `volta: 360` replica cada braço do par em
     `gruposDeRaios` grupos. Os recessos e as porcas seguem o mesmo caminho.

   Cada cópia continua endereçável por identidade: os dez braços são dez PARTES
   nomeadas (`raioRecuadoDoGrupo3`, `raioAvancadoDoGrupo5`, …), resolvidas por
   `{op:'arranja', id, copia}` — nenhum id de face, índice de vértice ou posição
   de passo. Recessos e porcas ficam de propósito AGREGADOS numa parte só, para
   a peça exercitar as duas formas: a coleção inteira e a cópia isolada.

   Convenção dimensional herdada da prancha:
   - X é o eixo da roda e +X é a face externa;
   - Y/Z formam o plano radial;
   - raio externo 0,340 m e largura total 0,220 m.

   Convenção angular: o grupo 1 fica em Y+ e os demais seguem o giro
   right-handed em torno de X (`giraPonto`), o mesmo de `rotaciona`. Dentro de
   um par, o braço RECUADO fica meia abertura ANTES do centro do grupo e o
   AVANÇADO, meia abertura DEPOIS.

   Toda seleção persistida nasce de `origemId`. Os números abaixo identificam
   geradores escolhidos pelo autor; não são ids de faces, vértices ou passos.

   Provas:
     npm run descrever -- roda-dianteira-realista-experimento --estrito
     npm run bancada -- roda-dianteira-realista-experimento --vistas=direita,frontal,isometrica --projecao=ortografica --estrito
     npm run bancada -- roda-dianteira-realista-experimento --selecionadas=raioRecuadoDoGrupo3 --modo=isolar
     tools/mecanifica/arranjo-em-peca.test.ts
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

  /* Raios: cinco pares radiais, cada par com dois braços separados. O ressalto
     escuro fica atrás do par e não fecha as cinco janelas do aro. */
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
  /* A abertura do PAR, em graus: o ângulo entre o braço recuado e o avançado.
     É a única medida angular da peça; o resto do arranjo é volta fechada. */
  raioParAbertura: 15,

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
  /* O braço nasce no ângulo zero e recua meia abertura; o avançado é a cópia
     do arranjo do par, uma abertura inteira adiante. */
  raioParMeiaAberturaNeg: '= -(raioParAbertura / 2)',
};

export const PARAMS = { ...MEDIDAS, ...DERIVADAS };

export const TOPO = {
  ladosPneu: 44,
  ladosAro: 48,
  ladosMiolo: 40,
  ladosRaio: 8,
  ladosFixador: 6,
  /* Contagens do arranjo. `total` conta a FONTE como instância: `bracosPorPar:
     2` cria um braço a mais, `gruposDeRaios: 5` cria quatro grupos a mais. */
  gruposDeRaios: 5,
  bracosPorPar: 2,
  fixadoresNaRoda: 5,
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
const RECESSO = 5401;          // o ressalto do grupo 1
const RECESSOS_DOS_GRUPOS = 5402;
const BRACO = 5501;            // o braço recuado do grupo 1
const PAR = 5502;              // o braço avançado do grupo 1, cópia do par
const GRUPOS_RECUADOS = 5503;  // os quatro braços recuados restantes
const GRUPOS_AVANCADOS = 5504; // os quatro braços avançados restantes
const FIXADOR = 5601;          // a porca do grupo 1
const FIXADORES_DA_RODA = 5602;

const origemLathe = (id, faixa) => ({
  origem: { op: 'lathe', id, ...(faixa === undefined ? {} : { faixa }) },
});
const unir = (selecoes) => ({ unir: selecoes.flatMap((selecao) => selecao.unir ?? [selecao]) });

/* As origens do arranjo. `de` é sempre a MESMA origem estrutural declarada em
   `derivaDe` no passo, e é isso que dá endereço a cada cópia sem citar face. */
const ORIGEM_BRACO = { op: 'loft', id: BRACO };
const ORIGEM_PAR = { op: 'arranja', id: PAR, de: ORIGEM_BRACO };
const copiaRecuada = (k) => ({ op: 'arranja', id: GRUPOS_RECUADOS, de: ORIGEM_BRACO, copia: k });
const copiaAvancada = (k) => ({ op: 'arranja', id: GRUPOS_AVANCADOS, de: ORIGEM_PAR, copia: k });
const ORIGEM_RECESSOS = { op: 'arranja', id: RECESSOS_DOS_GRUPOS, de: { op: 'cubo', id: RECESSO } };
const ORIGEM_FIXADOR = { op: 'lathe', id: FIXADOR };
const ORIGEM_FIXADORES = { op: 'arranja', id: FIXADORES_DA_RODA, de: ORIGEM_FIXADOR };

/* Os dez braços, um por vez. O grupo 1 é a FONTE dos dois arranjos (por isso
   não é cópia de ninguém); os grupos 2..`gruposDeRaios` são as cópias 0..k−1 do
   arranjo correspondente. A lista deriva de `TOPO.gruposDeRaios`: mudar a
   contagem muda os nomes, e nenhum número de braço está digitado aqui. */
const GRUPOS = Array.from({ length: TOPO.gruposDeRaios }, (_, i) => i + 1);
const BRACOS = GRUPOS.flatMap((grupo) => [
  {
    nome: `raioRecuadoDoGrupo${grupo}`,
    origem: grupo === 1 ? ORIGEM_BRACO : copiaRecuada(grupo - 2),
  },
  {
    nome: `raioAvancadoDoGrupo${grupo}`,
    origem: grupo === 1 ? ORIGEM_PAR : copiaAvancada(grupo - 2),
  },
]);

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
  ['recessosInteiros', unir([{ origem: { op: 'cubo', id: RECESSO } }, { origem: ORIGEM_RECESSOS }])],
  ['raiosInteiros', unir(BRACOS.map((braco) => ({ origem: braco.origem })))],
  ['fixadoresInteiros', unir([{ origem: ORIGEM_FIXADOR }, { origem: ORIGEM_FIXADORES }])],
  ['aberturaCentral', { origem: { op: 'lathe', id: MIOLO, faixa: 5 } }],
  /* um braço por nome — o endereço que a régua e a bancada usam para isolar
     uma cópia sem saber nada sobre faces. */
  ...BRACOS.map((braco) => [`${braco.nome}Inteiro`, { origem: braco.origem }]),
];

const paraEixoX = (op, id) => ['rotaciona', {
  eixo: 'z',
  graus: -90,
  pivo: [0, 0, 0],
  sel: { origem: { op, id } },
}];

/* O frame local do loft escolhe U/W conforme a direção do caminho. O braço
   nasce com o caminho em +Y, onde U é a direção tangencial e W a axial; a
   função traduz largura tangencial e espessura axial para esse frame e corta os
   quatro cantos. Antes do arranjo existiam dez caminhos com dez direções
   diferentes, e cada um precisava decidir de novo qual eixo do frame era qual —
   a decisão sumiu junto com os dez caminhos. */
const contornoChanfrado = (largura, espessura) => {
  const u = largura;
  const w = espessura;
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

/* O braço no ângulo zero: Y é o raio nomeado e Z é zero. Nenhum seno, nenhum
   cosseno, nenhuma coordenada gerada. */
const posDoBraco = (raio) => ['raioFaceX', raio, 0];

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
     atrás dos raios claros e deixam cinco janelas grandes realmente abertas.
     Um ressalto é declarado em Y+; o arranjo diz a intenção — um por grupo,
     volta fechada em torno do eixo da roda. */
  ['cubo', {
    origemId: RECESSO,
    larg: 'recessoProfundidade',
    alt: 'recessoComprimento',
    prof: 'recessoLargura',
  }],
  ['transladar', {
    d: ['recessoX', 'recessoRaioInicio', 0],
    sel: { origem: { op: 'cubo', id: RECESSO } },
  }],
  ['arranja', {
    modo: 'radial',
    eixo: 'x',
    volta: 360,
    total: 'gruposDeRaios',
    pivo: [0, 0, 0],
    origemId: RECESSOS_DOS_GRUPOS,
    derivaDe: { op: 'cubo', id: RECESSO },
    sel: { origem: { op: 'cubo', id: RECESSO } },
  }],
  ['parte', { nome: 'recessosRaios', sel: { alias: 'recessosInteiros' } }],

  /* Dez braços = cinco pares. A seção retangular chanfrada é um contorno de
     oito lados do loft: face frontal legível e bordas que capturam luz.

     A ordem é a da intenção: declarar UM braço, abrir o par, repetir o par em
     torno do eixo. */
  ['loft', {
    origemId: BRACO,
    lados: 'ladosRaio',
    secoes: [
      { pos: posDoBraco('raioPontaInterna'), raio: 0 },
      { pos: posDoBraco('raioInicio'), contorno: contornoChanfrado('raioSecaoInterna', 'raioEspessuraInterna') },
      { pos: posDoBraco('raioMeio'), contorno: contornoChanfrado('raioSecaoMeio', 'raioEspessuraMeio') },
      { pos: posDoBraco('raioFim'), contorno: contornoChanfrado('raioSecaoExterna', 'raioEspessuraExterna') },
      { pos: posDoBraco('raioPontaExterna'), raio: 0 },
    ],
  }],
  ['rotaciona', {
    eixo: 'x',
    graus: 'raioParMeiaAberturaNeg',
    pivo: [0, 0, 0],
    sel: { origem: ORIGEM_BRACO },
  }],
  ['arranja', {
    modo: 'radial',
    eixo: 'x',
    graus: 'raioParAbertura',
    total: 'bracosPorPar',
    pivo: [0, 0, 0],
    origemId: PAR,
    derivaDe: ORIGEM_BRACO,
    sel: { origem: ORIGEM_BRACO },
  }],
  ['arranja', {
    modo: 'radial',
    eixo: 'x',
    volta: 360,
    total: 'gruposDeRaios',
    pivo: [0, 0, 0],
    origemId: GRUPOS_RECUADOS,
    derivaDe: ORIGEM_BRACO,
    sel: { origem: ORIGEM_BRACO },
  }],
  ['arranja', {
    modo: 'radial',
    eixo: 'x',
    volta: 360,
    total: 'gruposDeRaios',
    pivo: [0, 0, 0],
    origemId: GRUPOS_AVANCADOS,
    derivaDe: ORIGEM_PAR,
    sel: { origem: ORIGEM_PAR },
  }],
  /* Cada braço é uma parte porque cada cópia tem identidade. Sem isso a régua
     mediria uma caixa só, com dez corpos anônimos dentro. */
  ...BRACOS.map((braco) => ['parte', { nome: braco.nome, sel: { alias: `${braco.nome}Inteiro` } }]),

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

  /* Porcas hexagonais de leitura, sem haste/prisioneiro e sem tampa central.
     Uma porca declarada em Y+, e o círculo de parafusos dito como círculo.

     A porca é um `lathe` de seis lados, não um `cilindro`, e a troca é medida,
     não estética (ATRITOS-AUTORIA A-24): `arranja` copia UMA origem, e o
     contrato do `cilindro` não sabe dizer "a primitiva inteira" — `{op,id}` sem
     eixo são só as laterais. Copiar a porca-cilindro custava três arranjos, um
     por família, e as cópias saíam com as tampas SOLTAS do tubo: 13 corpos no
     lugar de 5. O `lathe` fecha o sólido nos dois polos numa origem só. */
  ['lathe', { origemId: FIXADOR, lados: 'ladosFixador', perfil: [
    [0, 0],
    ['fixadorRaio', 0],
    ['fixadorRaio', 'fixadorComprimento'],
    [0, 'fixadorComprimento'],
  ] }],
  paraEixoX('lathe', FIXADOR),
  ['transladar', {
    d: ['fixadorBaseX', 'fixadorRaioOrbita', 0],
    sel: { origem: ORIGEM_FIXADOR },
  }],
  ['arranja', {
    modo: 'radial',
    eixo: 'x',
    volta: 360,
    total: 'fixadoresNaRoda',
    pivo: [0, 0, 0],
    origemId: FIXADORES_DA_RODA,
    derivaDe: ORIGEM_FIXADOR,
    sel: { origem: ORIGEM_FIXADOR },
  }],
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
  ['material', { sel: { alias: 'raiosInteiros' }, usa: 'metalRaio' }],
  ['material', { sel: { grupo: 'mioloAro' }, usa: 'metalMiolo' }],
  ['material', { sel: { grupo: 'fixadores' }, usa: 'metalFixador' }],

  ['solido', { sel: { grupo: 'pneu' } }],
  ['solido', { sel: { grupo: 'barrilAro' } }],
];

export const meta = {
  nome: 'roda-dianteira-realista-experimento',
  tipo: 'objeto',
  desc: 'experimento procedural de roda de apresentação — pneu sulcado, aro vazado, cinco pares de raios por arranjo radial, miolo aberto e fixadores sem malha externa',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
