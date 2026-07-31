/* PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA da Fundação de autoria v1: uma
   jardineira de janela com uma muda plantada (caixa, terra, bulbo, caule,
   folhagem e botão de flor). Nenhuma peça de mecânica, nenhum eixo de roda,
   nenhum vocabulário de freio: o assunto é jardinagem, de propósito.

   POR QUE ELA EXISTE. Até aqui toda evidência de O-6 (`origem` em todo gerador)
   e de O-12 (`publicarPorta` + `sel:{porta}`) era freio ou roda — o contrato
   podia ter sido desenhado em volta do caso automotivo sem ninguém perceber.
   Esta peça exercita o contrato inteiro fora daquele vocabulário:

   - os cinco geradores que só ganharam `origem` na R4 aparecem e são endereçados
     SÓ por `sel:{origem}`/`sel:{alias}`: `chamferBox` (soleira e as quatro
     paredes), `plano` (terra), `esfera` (bulbo), `inflate` (folhagem) e `cone`
     (botão de flor);
   - cinco portas com nome de AUTOR são publicadas antes das transformações e
     citadas por `sel:{porta}` DEPOIS delas — é a promessa do O-12: a porta
     sobrevive ao `rotaciona`/`transladar`;
   - zero id posicional, zero face sem identidade, zero órfão.

   AS PORTAS, E O QUE O NOME GEOMÉTRICO ESCONDERIA:

   | porta                 | origem estrutural            | o que o nome geométrico esconde |
   |-----------------------|------------------------------|---------------------------------|
   | `coloDoBulbo`         | `esfera:401 faixa 0`         | é o leque do polo de ORIGEM da esfera, que nasce EMBAIXO; a meia-volta o põe em cima, virando o colo por onde o caule sai |
   | `peDoCaule`           | `cilindro:404 tampa 'fundo'` | depois da inclinação, `fundo` não é mais "o lado de baixo" — é o pé enterrado |
   | `coroaDoCaule`        | `cilindro:404 tampa 'topo'`  | idem: é o corte de onde o botão brota |
   | `leitoDaTerra`        | `plano:402` (inteiro)        | a grade nasce em y=0 e sobe para dentro da caixa |
   | `soleiraDaJardineira` | `chamferBox:400` (inteiro)   | contrato mínimo: prova que a porta funciona também quando a origem só sabe citar a primitiva toda |

   RELAÇÃO QUE A PEÇA AFIRMA (e o teste trava, em relação, não em coordenada):
   o vértice comum do `coloDoBulbo` cai EXATAMENTE sobre o centro do
   `peDoCaule` — o bulbo entrega o caule no ponto em que ele nasce. As duas
   portas foram publicadas antes de o bulbo dar meia-volta e antes de a haste
   inteira se inclinar; se `sel:{porta}` reresolvesse por posição, a relação
   quebraria.

   INCLINAÇÃO SEM TRIGONOMETRIA: a gramática de parâmetros só tem + - * / e
   parênteses, então a muda é montada EM PÉ e só depois a haste inteira
   (caule + folhagem + botão) gira uma vez em torno do pé. É o mesmo motivo pelo
   qual o freio monta em torno de Y e depois vira: transporte é passo, não conta.

   LIMITES QUE ESTA PEÇA ENCONTROU (registrados em ATRITOS-AUTORIA.md, A-18 a
   A-20, não contornados em silêncio):
   - `chamferBox`, `cone`, `plano` e `inflate` publicam origem de PRIMITIVA
     INTEIRA. A boca do botão, a borda da soleira e a célula da terra existem na
     topologia e estão documentadas no núcleo, mas não são endereçáveis — então
     não viram porta;
   - as quatro paredes são quatro passos copiados com a coordenada escrita à
     mão: o A-17 da roda aparece igual fora do vocabulário mecânico;
   - o bulbo é ENTERRADO de propósito (colo rente à terra, corpo abaixo dela) e
     `folhagem`/`caule` se interpenetram por projeto — folha nasce no caule
     (A-16: a régua por envelopes não distingue isso de defeito).

   Bancada e régua:
     npm run bancada -- _jardineira --vistas=direita,frontal,superior
     npm run bancada -- _jardineira --selecionadas=bulbo --modo=isolar --focar
     npm run descrever -- _jardineira --estrito
*/
import { executar, colisaoDe } from '../motor/oficina.js';

/* ---------------------------------------------------------------------------
   Medidas INDEPENDENTES — é aqui que se refina a peça. Jardineira de janela em
   metros: 90 cm de vão, 26 cm de profundidade, parede de 2 cm.
   --------------------------------------------------------------------------- */
const MEDIDAS = {
  // caixa: soleira + quatro paredes, madeira com a aresta quebrada
  caixaLargura: 0.900,
  caixaAltura: 0.220,
  caixaProfundidade: 0.260,
  paredeEspessura: 0.020,
  caixaChanfro: 0.006,

  // terra: a superfície do substrato, rebaixada em relação à borda
  terraRebaixo: 0.030,

  // bulbo: enterrado, com o colo rente à terra
  bulboRaio: 0.030,
  bulboMeiaVolta: 180,        // graus em z que põem o colo (o polo de origem) para cima

  // caule: sai do colo do bulbo e atravessa a terra
  cauleRaio: 0.012,
  cauleComprimento: 0.340,
  cauleBaseX: -0.050,         // onde a muda foi plantada ao longo da caixa
  cauleInclinacao: -16,       // graus em z: a muda pende para +X, procurando a luz

  // botão de flor: brota da coroa do caule
  botaoRaio: 0.028,
  botaoComprimento: 0.075,

  // folhagem: massa irregular em volta do terço superior do caule
  folhagemAlcanceZ: 0.075,
  folhagemOmbroZ: 0.045,
  folhagemAlcanceX: 0.055,
  folhagemAbaixoBase: 0.140,  // quanto a folhagem desce a partir da coroa
  folhagemAbaixoMeio: 0.080,
  folhagemAbaixoTopo: 0.020,
};

/* ---------------------------------------------------------------------------
   Medidas DERIVADAS — pertencem ao envelope salvo. `=` liga a gramática
   aritmética da Oficina (nomes, parênteses e + - * /), nunca JS. Reabrir a peça
   mostra a RELAÇÃO que garante cada encaixe, não um número já calculado fora.
   --------------------------------------------------------------------------- */
const DERIVADAS = {
  // paredes: comprimento e posição saem da caixa e da espessura, nunca de um
  // número medido à mão — mexer em `paredeEspessura` reencaixa as quatro.
  paredeLadoProfundidade: '= caixaProfundidade - 2 * paredeEspessura',
  paredeFrenteZ: '= (caixaProfundidade - paredeEspessura) / 2',
  paredeTrasZ: '= -(caixaProfundidade - paredeEspessura) / 2',
  paredeDireitaX: '= (caixaLargura - paredeEspessura) / 2',
  paredeEsquerdaX: '= -(caixaLargura - paredeEspessura) / 2',

  // terra: encosta nas quatro paredes por dentro e fica abaixo da borda
  terraLargura: '= caixaLargura - 2 * paredeEspessura',
  terraProfundidade: '= caixaProfundidade - 2 * paredeEspessura',
  terraY: '= caixaAltura - terraRebaixo',

  /* o bulbo desce 2·raio: depois da meia-volta é o COLO que está no topo local,
     então é ele — e não o centro — que encosta na terra. */
  bulboY: '= terraY - 2 * bulboRaio',

  coroaY: '= terraY + cauleComprimento',

  folhagemBaseY: '= coroaY - folhagemAbaixoBase',
  folhagemMeioY: '= coroaY - folhagemAbaixoMeio',
  folhagemTopoY: '= coroaY - folhagemAbaixoTopo',
  folhagemFrenteX: '= cauleBaseX + folhagemAlcanceX',
  folhagemFundoX: '= cauleBaseX - folhagemAlcanceX',
  folhagemAlcanceZNeg: '= -folhagemAlcanceZ',
  folhagemOmbroZNeg: '= -folhagemOmbroZ',
};

export const PARAMS = { ...MEDIDAS, ...DERIVADAS };

/* Topológicos: mudar RECONSTRÓI a primitiva afetada (muda a CONTAGEM de faces),
   por isso ficam separados das medidas. */
export const TOPO = {
  terraSeg: 4,
  bulboAneis: 4,
  bulboLados: 12,
  cauleLados: 10,
  botaoLados: 12,
  folhagemDivisoes: 6,
};

export const MATERIAIS = {
  madeiraCaixa: { cor: '#7a5b3c', aspereza: 0.92 },
  substrato: { cor: '#3b2f27', aspereza: 1.0 },
  tunicaBulbo: { cor: '#c8a05a', aspereza: 0.84 },
  cascaCaule: { cor: '#4f6b3a', aspereza: 0.78 },
  folhaVerde: { cor: '#5f8d43', aspereza: 0.74 },
  petalaBotao: { cor: '#b8455f', aspereza: 0.58 },
  // materiais aplicados PELAS PORTAS, todos depois das transformações
  madeiraEncharcada: { cor: '#4c3925', aspereza: 1.0 },
  terraUmida: { cor: '#241c16', aspereza: 1.0 },
  corteFresco: { cor: '#d9e2b0', aspereza: 0.42 },
  peleDoColo: { cor: '#e6d7a8', aspereza: 0.66 },
};

/* ---------------------------------------------------------------------------
   Identidades estruturais. Nenhum id de vértice ou de face aparece na peça:
   `origemId` é identidade declarada pelo autor, não a posição do passo — inserir
   um passo no meio da lista não renomeia nem move nada.
   --------------------------------------------------------------------------- */
const SOLEIRA = 400;
const BULBO = 401;
const TERRA = 402;
const CAULE = 404;
const BOTAO = 405;
const FOLHAGEM = 406;
const PAREDE_FRENTE = 410;
const PAREDE_TRAS = 411;
const PAREDE_DIREITA = 412;
const PAREDE_ESQUERDA = 413;

const PAREDES = [PAREDE_FRENTE, PAREDE_TRAS, PAREDE_DIREITA, PAREDE_ESQUERDA];

/* um cilindro inteiro é a união das laterais com as duas tampas: `{op,id}`
   sozinho traz só as laterais (a convenção do núcleo). */
const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });
const origensInteiras = (op, ids) => ids.map((id) => ({ origem: { op, id } }));

export const ALIASES = [
  ['soleiraInteira', { origem: { op: 'chamferBox', id: SOLEIRA } }],
  ['paredeFrente', { origem: { op: 'chamferBox', id: PAREDE_FRENTE } }],
  ['paredeTras', { origem: { op: 'chamferBox', id: PAREDE_TRAS } }],
  ['paredeDireita', { origem: { op: 'chamferBox', id: PAREDE_DIREITA } }],
  ['paredeEsquerda', { origem: { op: 'chamferBox', id: PAREDE_ESQUERDA } }],
  ['caixaInteira', { unir: origensInteiras('chamferBox', [SOLEIRA, ...PAREDES]) }],
  ['terraInteira', { origem: { op: 'plano', id: TERRA } }],
  ['bulboInteiro', { origem: { op: 'esfera', id: BULBO } }],
  ['cauleInteiro', cilindroInteiro(CAULE)],
  ['botaoInteiro', { origem: { op: 'cone', id: BOTAO } }],
  ['folhagemInteira', { origem: { op: 'inflate', id: FOLHAGEM } }],
  /* a muda acima da terra pende como uma coisa só — é a haste que se inclina,
     não cada primitiva por sua conta. */
  ['hasteInteira', { unir: [
    ...cilindroInteiro(CAULE).unir,
    { origem: { op: 'cone', id: BOTAO } },
    { origem: { op: 'inflate', id: FOLHAGEM } },
  ] }],
];

export const PASSOS = [
  // ---- caixa: soleira e quatro paredes. `chamferBox` só sabe citar a
  //      primitiva inteira, então a porta publicada aqui é honesta com o limite ----
  ['chamferBox', { origemId: SOLEIRA, larg: 'caixaLargura', alt: 'paredeEspessura', prof: 'caixaProfundidade', chanfro: 'caixaChanfro' }],
  ['publicarPorta', { nome: 'soleiraDaJardineira', de: { op: 'chamferBox', id: SOLEIRA } }],
  ['chamferBox', { origemId: PAREDE_FRENTE, larg: 'caixaLargura', alt: 'caixaAltura', prof: 'paredeEspessura', chanfro: 'caixaChanfro' }],
  ['transladar', { d: [0, 0, 'paredeFrenteZ'], sel: { alias: 'paredeFrente' } }],
  ['chamferBox', { origemId: PAREDE_TRAS, larg: 'caixaLargura', alt: 'caixaAltura', prof: 'paredeEspessura', chanfro: 'caixaChanfro' }],
  ['transladar', { d: [0, 0, 'paredeTrasZ'], sel: { alias: 'paredeTras' } }],
  ['chamferBox', { origemId: PAREDE_DIREITA, larg: 'paredeEspessura', alt: 'caixaAltura', prof: 'paredeLadoProfundidade', chanfro: 'caixaChanfro' }],
  ['transladar', { d: ['paredeDireitaX', 0, 0], sel: { alias: 'paredeDireita' } }],
  ['chamferBox', { origemId: PAREDE_ESQUERDA, larg: 'paredeEspessura', alt: 'caixaAltura', prof: 'paredeLadoProfundidade', chanfro: 'caixaChanfro' }],
  ['transladar', { d: ['paredeEsquerdaX', 0, 0], sel: { alias: 'paredeEsquerda' } }],

  // ---- terra: a grade nasce em y=0 e SOBE para dentro da caixa; a porta é
  //      publicada antes da subida ----
  ['plano', { origemId: TERRA, largura: 'terraLargura', profundidade: 'terraProfundidade', seg: 'terraSeg' }],
  ['publicarPorta', { nome: 'leitoDaTerra', de: { op: 'plano', id: TERRA } }],
  ['transladar', { d: [0, 'terraY', 0], sel: { alias: 'terraInteira' } }],

  // ---- bulbo: nasce com o polo de origem EMBAIXO; a porta `coloDoBulbo` sai
  //      aí, e só depois a meia-volta põe o colo para cima ----
  ['esfera', { origemId: BULBO, raio: 'bulboRaio', aneis: 'bulboAneis', lados: 'bulboLados' }],
  ['publicarPorta', { nome: 'coloDoBulbo', de: { op: 'esfera', id: BULBO, faixa: 0 } }],
  ['rotaciona', { eixo: 'z', graus: 'bulboMeiaVolta', pivo: [0, 'bulboRaio', 0], sel: { alias: 'bulboInteiro' } }],
  ['transladar', { d: ['cauleBaseX', 'bulboY', 0], sel: { alias: 'bulboInteiro' } }],

  // ---- caule: as duas portas saem antes de qualquer transporte ----
  ['cilindro', { origemId: CAULE, raio: 'cauleRaio', altura: 'cauleComprimento', lados: 'cauleLados' }],
  ['publicarPorta', { nome: 'peDoCaule', de: { op: 'cilindro', id: CAULE, tampa: 'fundo' } }],
  ['publicarPorta', { nome: 'coroaDoCaule', de: { op: 'cilindro', id: CAULE, tampa: 'topo' } }],
  ['transladar', { d: ['cauleBaseX', 'terraY', 0], sel: { alias: 'cauleInteiro' } }],

  // ---- botão: brota da coroa, ainda em pé ----
  ['cone', { origemId: BOTAO, raio: 'botaoRaio', altura: 'botaoComprimento', lados: 'botaoLados' }],
  ['transladar', { d: ['cauleBaseX', 'coroaY', 0], sel: { alias: 'botaoInteiro' } }],

  // ---- folhagem: massa irregular declarada por duas silhuetas (lado e topo);
  //      `inflate` já nasce posicionado, então não tem par rotaciona+transladar ----
  ['inflate', { origemId: FOLHAGEM, divisoes: 'folhagemDivisoes',
    contornoLado: [
      ['folhagemAlcanceZNeg', 'folhagemMeioY'],
      ['folhagemOmbroZNeg', 'folhagemTopoY'],
      ['folhagemOmbroZ', 'folhagemTopoY'],
      ['folhagemAlcanceZ', 'folhagemMeioY'],
      ['folhagemOmbroZ', 'folhagemBaseY'],
      ['folhagemOmbroZNeg', 'folhagemBaseY'],
    ],
    contornoTopo: [
      ['folhagemAlcanceZNeg', 'cauleBaseX'],
      ['folhagemOmbroZNeg', 'folhagemFrenteX'],
      ['folhagemOmbroZ', 'folhagemFrenteX'],
      ['folhagemAlcanceZ', 'cauleBaseX'],
      ['folhagemOmbroZ', 'folhagemFundoX'],
      ['folhagemOmbroZNeg', 'folhagemFundoX'],
    ] }],

  // ---- a muda inteira pende para +X, girando em torno do PÉ do caule. O pivô é
  //      explícito: o centroide padrão giraria a haste em torno de si mesma ----
  ['rotaciona', { eixo: 'z', graus: 'cauleInclinacao', pivo: ['cauleBaseX', 'terraY', 0], sel: { alias: 'hasteInteira' } }],

  // ---- identidade semântica: toda face pertence a exatamente uma parte ----
  ['parte', { nome: 'caixa', sel: { alias: 'caixaInteira' } }],
  ['parte', { nome: 'terra', sel: { alias: 'terraInteira' } }],
  ['parte', { nome: 'bulbo', sel: { alias: 'bulboInteiro' } }],
  ['parte', { nome: 'caule', sel: { alias: 'cauleInteiro' } }],
  ['parte', { nome: 'folhagem', sel: { alias: 'folhagemInteira' } }],
  ['parte', { nome: 'botao', sel: { alias: 'botaoInteiro' } }],

  // ---- sombreado: só o que é de revolução fica macio ----
  ['liso', { sel: { origem: { op: 'cilindro', id: CAULE } } }],
  ['liso', { sel: { alias: 'bulboInteiro' } }],
  ['liso', { sel: { alias: 'botaoInteiro' } }],

  // ---- materiais por parte ----
  ['material', { sel: { grupo: 'caixa' }, usa: 'madeiraCaixa' }],
  ['material', { sel: { grupo: 'bulbo' }, usa: 'tunicaBulbo' }],
  ['material', { sel: { grupo: 'caule' }, usa: 'cascaCaule' }],
  ['material', { sel: { grupo: 'folhagem' }, usa: 'folhaVerde' }],
  ['material', { sel: { grupo: 'botao' }, usa: 'petalaBotao' }],

  // ---- e agora as PORTAS, todas citadas DEPOIS das transformações. Nenhuma
  //      delas foi reescrita quando o bulbo deu meia-volta ou a haste pendeu ----
  ['material', { sel: { porta: 'soleiraDaJardineira' }, usa: 'madeiraEncharcada' }],
  ['material', { sel: { porta: 'leitoDaTerra' }, usa: 'substrato' }],
  ['material', { sel: { porta: 'coloDoBulbo' }, usa: 'peleDoColo' }],
  ['material', { sel: { porta: 'peDoCaule' }, usa: 'terraUmida' }],
  ['material', { sel: { porta: 'coroaDoCaule' }, usa: 'corteFresco' }],

  // ---- colisão: o volume que a jardineira ocupa ----
  ['solido', { sel: { grupo: 'caixa' } }],
];

export const meta = {
  nome: '_jardineira',
  tipo: 'objeto',
  desc: 'jardineira de janela com uma muda — fixture NÃO automotiva do contrato de autoria (origem universal e portas semânticas)',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
