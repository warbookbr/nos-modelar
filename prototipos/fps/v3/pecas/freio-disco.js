/* PRIMEIRO SISTEMA MECÂNICO DA MECANIFICA (Fase 3) — freio a disco dianteiro
   direito, paramétrico e por partes semânticas: `disco`, `cubo`, `pinca`,
   `suporte`, `pistao`, `pastilhaInterna`, `pastilhaExterna` e `flexivel`.

   Convenção de eixos, escrita uma vez e válida para toda a peça:
   - o eixo da roda é X. `+X` é PARA FORA do carro (lado da roda, onde fica a
     pastilha externa); `-X` é PARA DENTRO (lado do pistão e do suporte);
   - `y = 0` e `z = 0` são o centro do eixo da roda, então `y` é raio;
   - a pinça fica em cima (12 horas), para que as vistas `direita` e `frontal`
     mostrem o abraço da pinça sobre o disco sem sobreposição.

   Toda face tem `parte` (`npm run bancada -- freio-disco --estrito` sai 0) e
   nenhum passo cita id de vértice, de face ou de objeto: cada primitiva declara
   `origemId` e é endereçada por `sel:{origem:...}` ou por `sel:{alias:...}`.
   `origemId` NÃO é a posição do passo — é identidade estrutural estável, então
   inserir um passo no meio da lista não renomeia nem move nada.

   Medidas nomeadas e o que cada uma governa:
   docs/mecanifica/PRANCHA-FREIO-DISCO.md.

   Bancada:
     npm run bancada -- freio-disco --vistas=direita,frontal,superior
     npm run bancada -- freio-disco --selecionadas=pastilhaInterna --modo=contexto --focar
     npm run bancada -- freio-disco --explosao=0.4 --vistas=isometrica
*/
import { executar, colisaoDe } from '../motor/oficina.js';

/* ---------------------------------------------------------------------------
   Medidas INDEPENDENTES — é aqui que se refina o conjunto. Proporções de um
   freio dianteiro de carro médio, em metros (disco de 280 mm).
   --------------------------------------------------------------------------- */
const MEDIDAS = {
  // disco: a pista de atrito e o chapéu que a liga ao cubo
  discoRaio: 0.140,            // raio externo da pista de atrito (disco de 280 mm)
  discoEspessura: 0.024,       // espessura total do disco (as duas pistas + o vão)
  chapeuRaio: 0.072,           // raio do chapéu (a "panela" central do disco)
  chapeuProfundidade: 0.048,   // quanto o chapéu recua para dentro do carro

  // cubo: o flange de roda que o disco monta em cima
  cuboRaio: 0.052,
  cuboComprimento: 0.090,
  cuboRecuo: 0.070,            // quanto o cubo entra para dentro a partir do plano do disco

  // pastilhas: uma de cada lado do disco, com folga de repouso
  folgaPastilha: 0.002,        // vão entre a face de atrito e o disco em repouso
  pastilhaEspessura: 0.014,    // fricção + placa de suporte
  pastilhaAltura: 0.048,       // altura RADIAL da faixa de atrito
  pastilhaLargura: 0.076,      // largura da pastilha ao longo do eixo Z
  pastilhaBaseY: 0.088,        // raio interno da faixa de atrito

  // pinça: ponte por cima do disco + uma garra descendo de cada lado
  pincaParedeEspessura: 0.030, // espessura de cada garra
  pincaProfundidade: 0.092,    // extensão da pinça em Z
  pincaPonteAltura: 0.038,     // altura radial da ponte
  pincaGarraAltura: 0.066,     // altura radial de cada garra
  pincaGarraBaseY: 0.082,      // raio onde as garras começam (0,59·discoRaio)
  folgaPonte: 0.006,           // vão entre o topo do disco e a face interna da ponte

  // pistão: empurra a pastilha INTERNA contra o disco
  pistaoRaio: 0.020,
  pistaoComprimento: 0.016,

  // suporte: a placa de ancoragem que prende a pinça à manga de eixo
  suporteEspessura: 0.020,
  suporteAltura: 0.112,
  suporteLargura: 0.100,
  suporteBaseY: 0.046,
  suporteOrelhaAltura: 0.036,  // as duas orelhas parafusadas na manga
  suporteOrelhaAvanco: 0.046,

  // flexível: mangueira de freio, do banjo da pinça até a linha rígida
  flexivelRaio: 0.005,
  flexivelBanjoRaio: 0.008,
};

/* pontos do caminho do flexível — nomeados um por um porque a linguagem de
   autoria só sabe nomear ESCALAR, não PONTO (ver ATRITOS-AUTORIA A-8). */
const CAMINHO_FLEXIVEL = {
  flexivelBocaX: -0.050, flexivelBocaY: 0.172, flexivelBocaZ: 0.030,
  flexivelCurvaX: -0.072, flexivelCurvaY: 0.196, flexivelCurvaZ: 0.062,
  flexivelSubidaX: -0.092, flexivelSubidaY: 0.222, flexivelSubidaZ: 0.090,
  flexivelUniaoX: -0.104, flexivelUniaoY: 0.252, flexivelUniaoZ: 0.118,
};

/* ---------------------------------------------------------------------------
   Medidas DERIVADAS — calculadas das independentes, nunca digitadas duas vezes.
   Elas existem porque hoje um passo só aceita NOME de parâmetro ou número
   literal: não há expressão como `-($discoEspessura/2)` dentro do passo
   (ATRITOS-AUTORIA A-5). Enquanto isso, a derivação mora aqui, em JS puro e
   determinístico, e o passo cita o nome derivado.
   --------------------------------------------------------------------------- */
const M = MEDIDAS;
const discoMeia = M.discoEspessura / 2;                                      // meia espessura: a face do disco
const pastilhaCostaX = discoMeia + M.folgaPastilha + M.pastilhaEspessura;    // costa da pastilha (onde o pistão/garra encostam)
const pastilhaMeioX = discoMeia + M.folgaPastilha + M.pastilhaEspessura / 2; // centro da pastilha
const garraMeioX = pastilhaCostaX + M.pincaParedeEspessura / 2;              // centro de cada garra

const DERIVADAS = {
  discoX: -discoMeia,                                       // o disco fica centrado no plano da roda
  chapeuX: -(discoMeia + M.chapeuProfundidade),
  cuboX: -M.cuboRecuo,

  pastilhaInternaX: -pastilhaMeioX,
  pastilhaExternaX: pastilhaMeioX,
  pastilhaMeioY: M.pastilhaBaseY + M.pastilhaAltura / 2,    // altura do centro da pastilha = eixo do pistão

  pincaLargura: 2 * (pastilhaCostaX + M.pincaParedeEspessura),
  pincaPonteY: M.discoRaio + M.folgaPonte,                  // a ponte passa POR CIMA do disco
  pincaGarraInternaX: -garraMeioX,
  pincaGarraExternaX: garraMeioX,

  pistaoX: -(pastilhaCostaX + M.pistaoComprimento),         // nasce dentro da garra e termina na costa da pastilha
  suportePlacaX: -(pastilhaCostaX + M.pincaParedeEspessura + M.suporteEspessura / 2),
  suporteOrelhaY: M.suporteBaseY + (M.suporteAltura - M.suporteOrelhaAltura) / 2,
  suporteOrelhaZ: (M.suporteLargura + M.suporteOrelhaAvanco) / 2,
  suporteOrelhaZNeg: -(M.suporteLargura + M.suporteOrelhaAvanco) / 2,

  /* pontas do flexível: os dois polos que fecham o tubo, recuados sobre a
     própria tangente do caminho para não criar cúspide. */
  flexivelPontaBocaX: CAMINHO_FLEXIVEL.flexivelBocaX + 0.006,
  flexivelPontaBocaY: CAMINHO_FLEXIVEL.flexivelBocaY - 0.007,
  flexivelPontaBocaZ: CAMINHO_FLEXIVEL.flexivelBocaZ - 0.009,
  flexivelPontaUniaoX: CAMINHO_FLEXIVEL.flexivelUniaoX - 0.004,
  flexivelPontaUniaoY: CAMINHO_FLEXIVEL.flexivelUniaoY + 0.010,
  flexivelPontaUniaoZ: CAMINHO_FLEXIVEL.flexivelUniaoZ + 0.009,
};

/* Dimensionais: mudar qualquer valor aqui NÃO renumera a malha nem renomeia
   parte alguma. É a superfície de refinamento da peça. */
export const PARAMS = { ...MEDIDAS, ...CAMINHO_FLEXIVEL, ...DERIVADAS };

/* Topológicos: mudar RECONSTRÓI a primitiva afetada. Ficam separados porque a
   contagem de faces muda — não é refinamento de medida. */
export const TOPO = {
  ladosDisco: 32,
  ladosChapeu: 24,
  ladosCubo: 16,
  ladosPistao: 12,
  ladosFlexivel: 8,
};

export const MATERIAIS = {
  ferroFundido: { cor: '#8a8f96', aspereza: 0.86 },   // disco: ferro fundido usinado
  acoCubo: { cor: '#6f7783', aspereza: 0.62 },
  aluminioPinca: { cor: '#5c6672', aspereza: 0.52 },  // pinça fundida
  acoSuporte: { cor: '#3f4650', aspereza: 0.72 },
  acoPistao: { cor: '#c3c9d1', aspereza: 0.24 },      // pistão retificado, quase espelhado
  atritoPastilha: { cor: '#2b2f36', aspereza: 0.94 },
  borrachaFlexivel: { cor: '#1b1d21', aspereza: 1.0 },
};

/* ---------------------------------------------------------------------------
   Identidades estruturais. Nenhum id de face aparece: um cilindro inteiro é a
   união das laterais com as duas tampas, um cubo é a união das seis faces.
   --------------------------------------------------------------------------- */
const DISCO_PISTA = 301;
const DISCO_CHAPEU = 302;
const CUBO = 303;
const PASTILHA_INTERNA = 311;
const PASTILHA_EXTERNA = 312;
const PINCA_PONTE = 321;
const PINCA_GARRA_INTERNA = 322;
const PINCA_GARRA_EXTERNA = 323;
const PISTAO = 331;
const SUPORTE_PLACA = 341;
const SUPORTE_ORELHA_FRENTE = 342;
const SUPORTE_ORELHA_TRAS = 343;
const FLEXIVEL = 351;

const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });
const FACES_DO_CUBO = ['fundo', 'topo', 'tras', 'direita', 'frente', 'esquerda'];
const cuboInteiro = (id) => ({ unir: FACES_DO_CUBO.map((face) => ({ origem: { op: 'cubo', id, face } })) });
const cubosInteiros = (ids) => ids.flatMap((id) => FACES_DO_CUBO.map((face) => ({ origem: { op: 'cubo', id, face } })));

/* ALIASES são NOMES DE SELEÇÃO, não partes: um agente pode dizer
   `sel:{alias:'pistaInterna'}` sem saber que a pista é a tampa `fundo` de um
   cilindro. As duas pistas de atrito são as PORTAS semânticas que o resto do
   sistema encosta (AUTORIA-IA: "onde a pastilha encosta"). */
export const ALIASES = [
  /* `discoInteiro` só resolve depois que AS DUAS primitivas existem: um alias é
     resolvido no passo em que é citado, e origem ainda não criada é órfão. Por
     isso o alias por primitiva também existe (ATRITOS-AUTORIA A-7). */
  ['discoPistaInteira', cilindroInteiro(DISCO_PISTA)],
  ['discoChapeuInteiro', cilindroInteiro(DISCO_CHAPEU)],
  ['discoInteiro', { unir: [...cilindroInteiro(DISCO_PISTA).unir, ...cilindroInteiro(DISCO_CHAPEU).unir] }],
  ['pistaInterna', { origem: { op: 'cilindro', id: DISCO_PISTA, tampa: 'fundo' } }],
  ['pistaExterna', { origem: { op: 'cilindro', id: DISCO_PISTA, tampa: 'topo' } }],
  ['discoBordo', { origem: { op: 'cilindro', id: DISCO_PISTA } }],
  ['cuboInteiro', cilindroInteiro(CUBO)],
  ['pastilhaInternaInteira', cuboInteiro(PASTILHA_INTERNA)],
  ['pastilhaExternaInteira', cuboInteiro(PASTILHA_EXTERNA)],
  ['pincaInteira', { unir: cubosInteiros([PINCA_PONTE, PINCA_GARRA_INTERNA, PINCA_GARRA_EXTERNA]) }],
  ['pincaPonte', cuboInteiro(PINCA_PONTE)],
  ['pincaGarraInterna', cuboInteiro(PINCA_GARRA_INTERNA)],
  ['pincaGarraExterna', cuboInteiro(PINCA_GARRA_EXTERNA)],
  ['pistaoInteiro', cilindroInteiro(PISTAO)],
  ['pistaoFaceDeEmpurrar', { origem: { op: 'cilindro', id: PISTAO, tampa: 'topo' } }],
  ['suporteInteiro', { unir: cubosInteiros([SUPORTE_PLACA, SUPORTE_ORELHA_FRENTE, SUPORTE_ORELHA_TRAS]) }],
  ['flexivelInteiro', { origem: { op: 'loft', id: FLEXIVEL } }],
];

/* Eixo da peça: as primitivas de revolução nascem em torno de Y e nenhuma
   aceita posição, então o par `rotaciona` + `transladar` é o que põe cada uma
   no eixo da roda (X). O pivô é SEMPRE explícito na origem: o centroide padrão
   giraria a peça em torno de si mesma (ATRITOS-AUTORIA A-6). */
const PIVO_EIXO = [0, 0, 0];
const paraEixoX = (id) => ['rotaciona', { eixo: 'z', graus: -90, pivo: PIVO_EIXO, sel: { origem: { op: 'cilindro', id } } }];

export const PASSOS = [
  // ---- disco: pista de atrito + chapéu, o conjunto que gira com a roda ----
  ['cilindro', { origemId: DISCO_PISTA, raio: 'discoRaio', altura: 'discoEspessura', lados: 'ladosDisco' }],
  paraEixoX(DISCO_PISTA),
  ['transladar', { d: ['discoX', 0, 0], sel: { alias: 'discoPistaInteira' } }],
  ['cilindro', { origemId: DISCO_CHAPEU, raio: 'chapeuRaio', altura: 'chapeuProfundidade', lados: 'ladosChapeu' }],
  paraEixoX(DISCO_CHAPEU),
  ['transladar', { d: ['chapeuX', 0, 0], sel: { alias: 'discoChapeuInteiro' } }],
  ['parte', { nome: 'disco', sel: { alias: 'discoInteiro' } }],

  // ---- cubo: o flange de roda em que o disco monta ----
  ['cilindro', { origemId: CUBO, raio: 'cuboRaio', altura: 'cuboComprimento', lados: 'ladosCubo' }],
  paraEixoX(CUBO),
  ['transladar', { d: ['cuboX', 0, 0], sel: { alias: 'cuboInteiro' } }],
  ['parte', { nome: 'cubo', sel: { alias: 'cuboInteiro' } }],

  // ---- pastilhas: uma de cada lado do disco, com a folga de repouso ----
  ['cubo', { origemId: PASTILHA_INTERNA, larg: 'pastilhaEspessura', alt: 'pastilhaAltura', prof: 'pastilhaLargura' }],
  ['transladar', { d: ['pastilhaInternaX', 'pastilhaBaseY', 0], sel: { alias: 'pastilhaInternaInteira' } }],
  ['parte', { nome: 'pastilhaInterna', sel: { alias: 'pastilhaInternaInteira' } }],
  ['cubo', { origemId: PASTILHA_EXTERNA, larg: 'pastilhaEspessura', alt: 'pastilhaAltura', prof: 'pastilhaLargura' }],
  ['transladar', { d: ['pastilhaExternaX', 'pastilhaBaseY', 0], sel: { alias: 'pastilhaExternaInteira' } }],
  ['parte', { nome: 'pastilhaExterna', sel: { alias: 'pastilhaExternaInteira' } }],

  // ---- pinça: a ponte passa por cima do disco e as duas garras descem, uma
  //      por fora de cada pastilha — é isso que "abraçar o disco" significa ----
  ['cubo', { origemId: PINCA_PONTE, larg: 'pincaLargura', alt: 'pincaPonteAltura', prof: 'pincaProfundidade' }],
  ['transladar', { d: [0, 'pincaPonteY', 0], sel: { alias: 'pincaPonte' } }],
  ['cubo', { origemId: PINCA_GARRA_INTERNA, larg: 'pincaParedeEspessura', alt: 'pincaGarraAltura', prof: 'pincaProfundidade' }],
  ['transladar', { d: ['pincaGarraInternaX', 'pincaGarraBaseY', 0], sel: { alias: 'pincaGarraInterna' } }],
  ['cubo', { origemId: PINCA_GARRA_EXTERNA, larg: 'pincaParedeEspessura', alt: 'pincaGarraAltura', prof: 'pincaProfundidade' }],
  ['transladar', { d: ['pincaGarraExternaX', 'pincaGarraBaseY', 0], sel: { alias: 'pincaGarraExterna' } }],
  ['parte', { nome: 'pinca', sel: { alias: 'pincaInteira' } }],

  // ---- pistão: mora na garra interna e termina exatamente na costa da
  //      pastilha interna — é ele que empurra ----
  ['cilindro', { origemId: PISTAO, raio: 'pistaoRaio', altura: 'pistaoComprimento', lados: 'ladosPistao' }],
  paraEixoX(PISTAO),
  ['transladar', { d: ['pistaoX', 'pastilhaMeioY', 0], sel: { alias: 'pistaoInteiro' } }],
  ['parte', { nome: 'pistao', sel: { alias: 'pistaoInteiro' } }],

  // ---- suporte: placa de ancoragem atrás da pinça + duas orelhas de parafuso ----
  ['cubo', { origemId: SUPORTE_PLACA, larg: 'suporteEspessura', alt: 'suporteAltura', prof: 'suporteLargura' }],
  ['transladar', { d: ['suportePlacaX', 'suporteBaseY', 0], sel: { origem: { op: 'cubo', id: SUPORTE_PLACA } } }],
  ['cubo', { origemId: SUPORTE_ORELHA_FRENTE, larg: 'suporteEspessura', alt: 'suporteOrelhaAltura', prof: 'suporteOrelhaAvanco' }],
  ['transladar', { d: ['suportePlacaX', 'suporteOrelhaY', 'suporteOrelhaZ'], sel: { origem: { op: 'cubo', id: SUPORTE_ORELHA_FRENTE } } }],
  ['cubo', { origemId: SUPORTE_ORELHA_TRAS, larg: 'suporteEspessura', alt: 'suporteOrelhaAltura', prof: 'suporteOrelhaAvanco' }],
  ['transladar', { d: ['suportePlacaX', 'suporteOrelhaY', 'suporteOrelhaZNeg'], sel: { origem: { op: 'cubo', id: SUPORTE_ORELHA_TRAS } } }],
  ['parte', { nome: 'suporte', sel: { alias: 'suporteInteiro' } }],

  // ---- flexível: mangueira do banjo da pinça até a linha rígida. O loft é a
  //      única primitiva que já nasce posicionada, por isso não tem par
  //      rotaciona+transladar. As duas pontas fecham em polo (raio 0) ----
  ['loft', { origemId: FLEXIVEL, lados: 'ladosFlexivel', secoes: [
    { pos: ['flexivelPontaBocaX', 'flexivelPontaBocaY', 'flexivelPontaBocaZ'], raio: 0 },
    { pos: ['flexivelBocaX', 'flexivelBocaY', 'flexivelBocaZ'], raio: 'flexivelBanjoRaio' },
    { pos: ['flexivelCurvaX', 'flexivelCurvaY', 'flexivelCurvaZ'], raio: 'flexivelRaio' },
    { pos: ['flexivelSubidaX', 'flexivelSubidaY', 'flexivelSubidaZ'], raio: 'flexivelRaio' },
    { pos: ['flexivelUniaoX', 'flexivelUniaoY', 'flexivelUniaoZ'], raio: 'flexivelRaio' },
    { pos: ['flexivelPontaUniaoX', 'flexivelPontaUniaoY', 'flexivelPontaUniaoZ'], raio: 0 },
  ] }],
  ['parte', { nome: 'flexivel', sel: { alias: 'flexivelInteiro' } }],

  // ---- sombreado: só o que é de revolução fica macio; as faces planas das
  //      peças usinadas/fundidas ficam chapadas ----
  ['liso', { sel: { alias: 'discoBordo' } }],
  ['liso', { sel: { origem: { op: 'cilindro', id: DISCO_CHAPEU } } }],
  ['liso', { sel: { origem: { op: 'cilindro', id: CUBO } } }],
  ['liso', { sel: { origem: { op: 'cilindro', id: PISTAO } } }],
  ['liso', { sel: { alias: 'flexivelInteiro' } }],

  // ---- materiais por parte ----
  ['material', { sel: { grupo: 'disco' }, usa: 'ferroFundido' }],
  ['material', { sel: { grupo: 'cubo' }, usa: 'acoCubo' }],
  ['material', { sel: { grupo: 'pinca' }, usa: 'aluminioPinca' }],
  ['material', { sel: { grupo: 'suporte' }, usa: 'acoSuporte' }],
  ['material', { sel: { grupo: 'pistao' }, usa: 'acoPistao' }],
  ['material', { sel: { grupo: 'pastilhaInterna' }, usa: 'atritoPastilha' }],
  ['material', { sel: { grupo: 'pastilhaExterna' }, usa: 'atritoPastilha' }],
  ['material', { sel: { grupo: 'flexivel' }, usa: 'borrachaFlexivel' }],

  // ---- colisão: o disco e a pinça são o volume que o conjunto ocupa ----
  ['solido', { sel: { grupo: 'disco' } }],
  ['solido', { sel: { grupo: 'pinca' } }],
];

export const meta = {
  nome: 'freio-disco',
  tipo: 'objeto',
  desc: 'freio a disco dianteiro paramétrico — disco, cubo, pinça, suporte, pistão, pastilhas e flexível, cada face com identidade semântica',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
