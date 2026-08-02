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

  // piloto: ressalto menor que centraliza a roda antes de ela encostar no flange
  pilotoRaio: 0.051,
  pilotoComprimento: 0.012,

  /* flange de roda: UM disco na ponta do cubo, com o círculo de prisioneiros
     furado nele. Até a rodada "Furo v2" cada prisioneiro tinha um RESSALTO
     quadrado próprio, e o motivo era a linguagem, não a mecânica: um passo de
     `furo` consumia a face de entrada, então dois furos exigiam duas faces.
     Com `centros`, os quatro furos saem da MESMA face num passo só, e o flange
     volta a ser o que um flange de roda é. */
  flangeEspessura: 0.012,            // quanto o flange avança para fora, além da face do cubo
  prisioneiroOrbita: 0.038,          // raio do círculo de prisioneiros (o PCD dividido por 2)
  prisioneiroFuroRaio: 0.0065,       // furo passante do prisioneiro (M12)

  // pastilhas: uma de cada lado do disco, com folga de repouso
  folgaPastilha: 0.002,        // vão entre a face de atrito e o disco em repouso
  pastilhaEspessura: 0.014,    // fricção + placa de suporte
  pastilhaAltura: 0.048,       // altura RADIAL da faixa de atrito
  pastilhaLargura: 0.076,      // largura da pastilha ao longo do eixo Z
  /* Ciclo 5: o chanfro de entrada/saída da face de atrito, medido no plano da
     face. 2,5 mm é a ordem de grandeza de uma pastilha de carro de passeio. */
  pastilhaChanfro: 0.0025,
  pastilhaBaseY: 0.088,        // raio interno da faixa de atrito

  // pinça: ponte por cima do disco + uma garra descendo de cada lado
  pincaParedeEspessura: 0.030, // espessura de cada garra
  pincaProfundidade: 0.092,    // extensão da pinça em Z
  pincaChanfro: 0.004,
  pincaPonteAltura: 0.038,     // altura radial da ponte
  pincaGarraAltura: 0.066,     // altura radial de cada garra
  pincaGarraBaseY: 0.082,      // raio onde as garras começam (0,59·discoRaio)
  folgaPonte: 0.006,           // vão entre o topo do disco e a face interna da ponte

  // pistão: empurra a pastilha INTERNA contra o disco
  pistaoRaio: 0.020,
  pistaoComprimento: 0.016,

  // suporte: a placa de ancoragem que prende a pinça à manga de eixo
  suporteEspessura: 0.020,
  suporteLargura: 0.100,
  folgaSuporte: 0.006,         // vão entre a placa FIXA e o maior raio que GIRA ao lado dela (o chapéu)
  suporteSobraGarra: 0.010,    // quanto a placa passa do topo da garra que ela sustenta
  suporteOrelhaAltura: 0.036,  // as duas orelhas parafusadas na manga
  suporteOrelhaAvanco: 0.046,
  suporteChanfro: 0.003,

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
   Medidas DERIVADAS — agora pertencem ao envelope salvo. `=` ativa a pequena
   gramática aritmética da Oficina (nomes, parênteses e + - * /), nunca JS. Assim
   reabrir a peça mostra a relação que garante cada encaixe, e não um número já
   calculado fora do formato (ATRITOS-AUTORIA A-5).
   --------------------------------------------------------------------------- */
const DERIVADAS = {
  discoX: '= -discoEspessura / 2',
  chapeuX: '= -(discoEspessura / 2 + chapeuProfundidade)',
  cuboX: '= -cuboRecuo',

  /* A face do cubo em que a roda encosta, e o flange que nasce dela. O flange
     tem o RAIO DO CUBO, e isso é restrição de montagem, não estética: o aro da
     roda entra por cima do cubo com 0,6 mm de folga na escala da cena
     (`roda-dianteira-integridade`), então um flange mais largo bateria no aro.
     A relação fica escrita, não o número calculado fora. */
  cuboFaceRodaX: '= cuboComprimento - cuboRecuo',
  flangeRaio: '= cuboRaio',
  flangeFaceRodaX: '= cuboComprimento - cuboRecuo + flangeEspessura',
  pilotoInicioX: '= cuboComprimento - cuboRecuo + flangeEspessura',
  pilotoFimX: '= cuboComprimento - cuboRecuo + flangeEspessura + pilotoComprimento',

  pastilhaInternaX: '= -(discoEspessura / 2 + folgaPastilha + pastilhaEspessura / 2)',
  pastilhaExternaX: '= discoEspessura / 2 + folgaPastilha + pastilhaEspessura / 2',
  pastilhaMeioY: '= pastilhaBaseY + pastilhaAltura / 2',

  pincaLargura: '= 2 * (discoEspessura / 2 + folgaPastilha + pastilhaEspessura + pincaParedeEspessura)',
  pincaPonteY: '= discoRaio + folgaPonte',
  pincaGarraInternaX: '= -(discoEspessura / 2 + folgaPastilha + pastilhaEspessura + pincaParedeEspessura / 2)',
  pincaGarraExternaX: '= discoEspessura / 2 + folgaPastilha + pastilhaEspessura + pincaParedeEspessura / 2',

  pistaoX: '= -(discoEspessura / 2 + folgaPastilha + pastilhaEspessura + pistaoComprimento)',
  suportePlacaX: '= -(discoEspessura / 2 + folgaPastilha + pastilhaEspessura + pincaParedeEspessura + suporteEspessura / 2)',
  suporteBaseY: '= chapeuRaio + folgaSuporte',
  suporteAltura: '= pincaGarraBaseY + pincaGarraAltura + suporteSobraGarra - (chapeuRaio + folgaSuporte)',
  suporteOrelhaY: '= (chapeuRaio + folgaSuporte) + ((pincaGarraBaseY + pincaGarraAltura + suporteSobraGarra - (chapeuRaio + folgaSuporte)) - suporteOrelhaAltura) / 2',
  suporteOrelhaZ: '= (suporteLargura + suporteOrelhaAvanco) / 2',
  suporteOrelhaZNeg: '= -(suporteLargura + suporteOrelhaAvanco) / 2',

  flexivelPontaBocaX: '= flexivelBocaX + 0.006',
  flexivelPontaBocaY: '= flexivelBocaY - 0.007',
  flexivelPontaBocaZ: '= flexivelBocaZ - 0.009',
  flexivelPontaUniaoX: '= flexivelUniaoX - 0.004',
  flexivelPontaUniaoY: '= flexivelUniaoY + 0.010',
  flexivelPontaUniaoZ: '= flexivelUniaoZ + 0.009',
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
  /* quantos prisioneiros o flange tem. Antes da rodada "Furo v2" este número
     não bastava: cada furo precisava do RESSALTO dele e do PASSO de corte
     dele, escritos à mão, e mudar 4 para 5 deixava o flange com assento cego.
     Agora ele é a única coisa a mudar — `centros:{total:'prisioneiros'}` leva o
     círculo junto, sem seno, sem cosseno e sem coordenada de furo no arquivo.
     Com 4 o passo angular é de 90°; com 5 é de 72°, e nada mais muda. */
  prisioneiros: 4,
  ladosFuroPrisioneiro: 12,
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
/* o flange de roda: UM disco e UM passo de corte, porque `centros` abre os
   quatro furos na mesma face. Os ids 306–309, que eram um furo por assento,
   saíram junto com os ressaltos. */
const FLANGE = 304;
const FUROS_PRISIONEIRO = 305;
const PILOTO = 306;
const PASTILHA_INTERNA = 311;
/* Ciclo 5: o CHANFRO de entrada e de saída da superfície de atrito. Numa
   pastilha de verdade ele existe por ruído, não por estética: a quina viva
   entrando no disco excita a vibração que vira o chiado. São as duas arestas
   verticais da face de atrito, e cada uma é UM filete. */
const PASTILHA_INTERNA_CHANFRO_ENTRA = 313;
const PASTILHA_INTERNA_CHANFRO_SAI = 314;
const PASTILHA_EXTERNA_CHANFRO_ENTRA = 315;
const PASTILHA_EXTERNA_CHANFRO_SAI = 316;
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
const origensInteiras = (op, ids) => ids.map((id) => ({ origem: { op, id } }));

/* ---- o flange de roda ----------------------------------------------------
   `TODOS` é "todos os índices desta família", e não é o mesmo que a família
   ausente: ausente, numa origem sem eixo nenhum, quer dizer "a primitiva
   inteira" (ver `_prateleira-furada.js`). */
const TODOS = { passo: 1, fase: 0 };
const ORIGEM_FLANGE = { op: 'cilindro', id: FLANGE };
const FLANGE_FACE_RODA = { ...ORIGEM_FLANGE, tampa: 'topo' };    // +X: para fora do carro
const FLANGE_FACE_CUBO = { ...ORIGEM_FLANGE, tampa: 'fundo' };   // -X: contra o cubo
const ORIGEM_FUROS_PRISIONEIRO = { op: 'furo', id: FUROS_PRISIONEIRO };

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
  ['pilotoInteiro', cilindroInteiro(PILOTO)],
  /* o flange ANTES do corte: o disco inteiro. Este alias é citado no `parte`,
     que roda antes do furo — depois dele a citação das duas tampas gritaria,
     com razão, porque o corte as consumiu. */
  ['flangeInteiro', cilindroInteiro(FLANGE)],
  /* a parede de cada furo de prisioneiro: é o cilindro por onde o prisioneiro
     passa, e é ela que fica lisa. Um passo só, quatro anéis. */
  ['paredesDosPrisioneiros', { origem: { ...ORIGEM_FUROS_PRISIONEIRO, parede: TODOS } }],
  /* o SEGUNDO prisioneiro, sozinho: é esta citação que prova que os quatro
     furos do mesmo passo continuam distinguíveis entre si. Sem o eixo `furo`
     ela pediria as 48 paredes e receberia as 48. */
  ['segundoPrisioneiro', { origem: { ...ORIGEM_FUROS_PRISIONEIRO, furo: 1, parede: TODOS } }],
  /* a face em que a roda encosta, depois do corte. Com UM furo por face ela era
     só a borda; com quatro anéis na mesma face a borda deixa de dar a volta
     inteira, e o resto do flange é o PREENCHIMENTO. Os dois juntos são a
     superfície de apoio da roda. */
  ['bocasDosPrisioneiros', { origem: { ...ORIGEM_FUROS_PRISIONEIRO, borda: TODOS } }],
  ['assentosDeRoda', { unir: [
    { origem: { ...ORIGEM_FUROS_PRISIONEIRO, borda: TODOS } },
    { origem: { ...ORIGEM_FUROS_PRISIONEIRO, preenchimento: TODOS } },
  ] }],
  ['pastilhaInternaInteira', { unir: [
    ...cuboInteiro(PASTILHA_INTERNA).unir,
    { origem: { op: 'filete', id: PASTILHA_INTERNA_CHANFRO_ENTRA } },
    { origem: { op: 'filete', id: PASTILHA_INTERNA_CHANFRO_SAI } },
  ] }],
  ['pastilhaExternaInteira', { unir: [
    ...cuboInteiro(PASTILHA_EXTERNA).unir,
    { origem: { op: 'filete', id: PASTILHA_EXTERNA_CHANFRO_ENTRA } },
    { origem: { op: 'filete', id: PASTILHA_EXTERNA_CHANFRO_SAI } },
  ] }],
  ['pincaInteira', { unir: origensInteiras('chamferBox', [PINCA_PONTE, PINCA_GARRA_INTERNA, PINCA_GARRA_EXTERNA]) }],
  ['pincaPonte', { origem: { op: 'chamferBox', id: PINCA_PONTE } }],
  ['pincaGarraInterna', { origem: { op: 'chamferBox', id: PINCA_GARRA_INTERNA } }],
  ['pincaGarraExterna', { origem: { op: 'chamferBox', id: PINCA_GARRA_EXTERNA } }],
  ['pistaoInteiro', cilindroInteiro(PISTAO)],
  ['pistaoFaceDeEmpurrar', { origem: { op: 'cilindro', id: PISTAO, tampa: 'topo' } }],
  ['suporteInteiro', { unir: origensInteiras('chamferBox', [SUPORTE_PLACA, SUPORTE_ORELHA_FRENTE, SUPORTE_ORELHA_TRAS]) }],
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

  /* ---- flange de roda: UM disco na ponta do cubo, com o círculo de
     prisioneiros furado nele.

     O QUE MUDOU E POR QUÊ. Até a rodada "Furo v2" este trecho era um ressalto
     quadrado por prisioneiro, posto pelo `arranja` radial e furado um a um.
     Os ressaltos não vinham do desenho mecânico: vinham de um passo de `furo`
     consumir a face de entrada, então cada furo precisava de uma face só dele.
     Com `centros`, os quatro furos saem da MESMA face num passo só, e o flange
     é o que um flange de roda é — um disco liso com um círculo de furos.
     O flange usa `ladosCubo` de propósito: ele é rente ao cubo, e uma silhueta
     diferente da do cubo apareceria como degrau na vista frontal. ---- */
  ['cilindro', { origemId: FLANGE, raio: 'flangeRaio', altura: 'flangeEspessura', lados: 'ladosCubo' }],
  paraEixoX(FLANGE),
  ['transladar', { d: ['cuboFaceRodaX', 0, 0], sel: { alias: 'flangeInteiro' } }],
  /* a identidade vem ANTES do corte: as faces que o furo cria herdam `parte` da
     face de entrada, então os quatro furos já nascem sendo cubo. */
  ['parte', { nome: 'cubo', sel: { alias: 'flangeInteiro' } }],
  /* a frase do desenho, inteira, num passo: quatro furos a 38 mm do centro,
     dividindo a volta. Nenhuma coordenada de furo, nenhum seno, nenhum cosseno
     no formato salvo. `orientacao` põe o vértice 0 de todo anel em +Y, então os
     quatro anéis saem em fase e a `parede 0` nomeia a mesma região física em
     todos eles. */
  ['furo', {
    origemId: FUROS_PRISIONEIRO,
    de: FLANGE_FACE_RODA,
    saida: FLANGE_FACE_CUBO,
    centros: { distancia: 'prisioneiroOrbita', total: 'prisioneiros', volta: 360 },
    raio: 'prisioneiroFuroRaio',
    lados: 'ladosFuroPrisioneiro',
    orientacao: [0, 1, 0],
  }],

  /* O piloto é uma segunda peça de revolução, menor que o flange e depois dele
     no eixo X. A diferença é pequena mas física: a roda centraliza no piloto;
     só então sua face apoia no flange furado. Não é uma escala decorativa nem
     uma transformação de runtime. */
  ['cilindro', { origemId: PILOTO, raio: 'pilotoRaio', altura: 'pilotoComprimento', lados: 'ladosCubo' }],
  paraEixoX(PILOTO),
  ['transladar', { d: ['pilotoInicioX', 0, 0], sel: { alias: 'pilotoInteiro' } }],
  ['parte', { nome: 'cubo', sel: { alias: 'pilotoInteiro' } }],

  ['publicarPorta', {
    nome: 'pilotoDaRoda',
    de: { op: 'cilindro', id: PILOTO },
    interface: {
      forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], referencia: [0, 1, 0], centro: [0, 0, 0],
      raio: 'pilotoRaio', inicio: 'pilotoInicioX', fim: 'pilotoFimX',
    },
  }],

  // ---- pastilhas: uma de cada lado do disco, com a folga de repouso ----
  ['cubo', { origemId: PASTILHA_INTERNA, larg: 'pastilhaEspessura', alt: 'pastilhaAltura', prof: 'pastilhaLargura' }],
  /* a face de atrito da pastilha INTERNA olha para +X (o disco); as arestas 1
     e 3 dela são as duas verticais, por onde o disco entra e sai. */
  ['filete', { origemId: PASTILHA_INTERNA_CHANFRO_ENTRA, de: { op: 'cubo', id: PASTILHA_INTERNA, face: 'direita' }, aresta: 3, raio: 'pastilhaChanfro' }],
  ['filete', { origemId: PASTILHA_INTERNA_CHANFRO_SAI, de: { op: 'cubo', id: PASTILHA_INTERNA, face: 'direita' }, aresta: 1, raio: 'pastilhaChanfro' }],
  ['transladar', { d: ['pastilhaInternaX', 'pastilhaBaseY', 0], sel: { alias: 'pastilhaInternaInteira' } }],
  ['parte', { nome: 'pastilhaInterna', sel: { alias: 'pastilhaInternaInteira' } }],
  ['cubo', { origemId: PASTILHA_EXTERNA, larg: 'pastilhaEspessura', alt: 'pastilhaAltura', prof: 'pastilhaLargura' }],
  /* a externa olha para −X: mesma figura espelhada, mesma escrita. */
  ['filete', { origemId: PASTILHA_EXTERNA_CHANFRO_ENTRA, de: { op: 'cubo', id: PASTILHA_EXTERNA, face: 'esquerda' }, aresta: 3, raio: 'pastilhaChanfro' }],
  ['filete', { origemId: PASTILHA_EXTERNA_CHANFRO_SAI, de: { op: 'cubo', id: PASTILHA_EXTERNA, face: 'esquerda' }, aresta: 1, raio: 'pastilhaChanfro' }],
  ['transladar', { d: ['pastilhaExternaX', 'pastilhaBaseY', 0], sel: { alias: 'pastilhaExternaInteira' } }],
  ['parte', { nome: 'pastilhaExterna', sel: { alias: 'pastilhaExternaInteira' } }],

  // ---- pinça: a ponte passa por cima do disco e as duas garras descem, uma
  //      por fora de cada pastilha — é isso que "abraçar o disco" significa ----
  ['chamferBox', { origemId: PINCA_PONTE, larg: 'pincaLargura', alt: 'pincaPonteAltura', prof: 'pincaProfundidade', chanfro: 'pincaChanfro' }],
  ['transladar', { d: [0, 'pincaPonteY', 0], sel: { alias: 'pincaPonte' } }],
  ['chamferBox', { origemId: PINCA_GARRA_INTERNA, larg: 'pincaParedeEspessura', alt: 'pincaGarraAltura', prof: 'pincaProfundidade', chanfro: 'pincaChanfro' }],
  ['transladar', { d: ['pincaGarraInternaX', 'pincaGarraBaseY', 0], sel: { alias: 'pincaGarraInterna' } }],
  ['chamferBox', { origemId: PINCA_GARRA_EXTERNA, larg: 'pincaParedeEspessura', alt: 'pincaGarraAltura', prof: 'pincaProfundidade', chanfro: 'pincaChanfro' }],
  ['transladar', { d: ['pincaGarraExternaX', 'pincaGarraBaseY', 0], sel: { alias: 'pincaGarraExterna' } }],
  ['parte', { nome: 'pinca', sel: { alias: 'pincaInteira' } }],

  // ---- pistão: mora na garra interna e termina exatamente na costa da
  //      pastilha interna — é ele que empurra ----
  ['cilindro', { origemId: PISTAO, raio: 'pistaoRaio', altura: 'pistaoComprimento', lados: 'ladosPistao' }],
  paraEixoX(PISTAO),
  ['transladar', { d: ['pistaoX', 'pastilhaMeioY', 0], sel: { alias: 'pistaoInteiro' } }],
  ['parte', { nome: 'pistao', sel: { alias: 'pistaoInteiro' } }],

  // ---- suporte: placa de ancoragem atrás da pinça + duas orelhas de parafuso ----
  ['chamferBox', { origemId: SUPORTE_PLACA, larg: 'suporteEspessura', alt: 'suporteAltura', prof: 'suporteLargura', chanfro: 'suporteChanfro' }],
  ['transladar', { d: ['suportePlacaX', 'suporteBaseY', 0], sel: { origem: { op: 'chamferBox', id: SUPORTE_PLACA } } }],
  ['chamferBox', { origemId: SUPORTE_ORELHA_FRENTE, larg: 'suporteEspessura', alt: 'suporteOrelhaAltura', prof: 'suporteOrelhaAvanco', chanfro: 'suporteChanfro' }],
  ['transladar', { d: ['suportePlacaX', 'suporteOrelhaY', 'suporteOrelhaZ'], sel: { origem: { op: 'chamferBox', id: SUPORTE_ORELHA_FRENTE } } }],
  ['chamferBox', { origemId: SUPORTE_ORELHA_TRAS, larg: 'suporteEspessura', alt: 'suporteOrelhaAltura', prof: 'suporteOrelhaAvanco', chanfro: 'suporteChanfro' }],
  ['transladar', { d: ['suportePlacaX', 'suporteOrelhaY', 'suporteOrelhaZNeg'], sel: { origem: { op: 'chamferBox', id: SUPORTE_ORELHA_TRAS } } }],
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
  ['liso', { sel: { origem: ORIGEM_FLANGE } }],
  ['liso', { sel: { alias: 'paredesDosPrisioneiros' } }],
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
  /* DECLARAÇÃO DE CASCA FECHADA. A peça afirma que a superfície dela não tem
     borda solta — toda aresta é dividida por exatamente duas faces. Quem
     declara é cobrado pelo gate do acervo; quem não declara não é. Casca
     aberta é escolha legítima (uma chapa, um anteparo), e 6 peças do acervo
     são assim de propósito. Buraco NÃO abre casca: furo passante tem parede. */
  fechada: true,
  nome: 'freio-disco',
  tipo: 'objeto',
  desc: 'freio a disco dianteiro paramétrico — disco, cubo, pinça, suporte, pistão, pastilhas e flexível, cada face com identidade semântica',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
