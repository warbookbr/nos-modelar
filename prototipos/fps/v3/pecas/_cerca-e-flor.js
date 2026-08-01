/* PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA do ciclo "Arranjos semânticos v1"
   (O-13): um trecho de cerca de tábuas com uma flor plantada na frente.
   Nenhum eixo de roda, nenhum prisioneiro, nenhum vocabulário mecânico: o
   assunto é jardim, de propósito.

   POR QUE ELA EXISTE. A op `arranja` nasceu de uma dificuldade automotiva — os
   dez braços da roda experimental, que custaram cem parâmetros de coordenada.
   Um contrato desenhado em volta do caso que o originou passa despercebido: só
   exercitando o mesmo contrato em outra família de objeto dá para dizer que ele
   é geral. Esta peça exercita os DOIS modos do arranjo e as DUAS formas de
   endereçar o resultado:

   - `modo:'linear'` — as tábuas da cerca. Uma tábua é declarada na ponta
     esquerda e o arranjo diz o resto: `tabuasDaCerca` instâncias, um passo de
     `tabuaPasso` em X. A cerca inteira mora numa origem só;
   - `modo:'radial'` — as pétalas da flor. Uma pétala é declarada apontando para
     +Y e o arranjo fecha a volta em torno de Z, `petalasDaFlor` instâncias;
   - CADA cópia é uma PARTE nomeada (`tabuaDaCerca4`, `petalaDaFlor2`),
     resolvida por `{op:'arranja', id, copia}` — sem id de face, sem índice de
     vértice, sem posição de passo;
   - a COLEÇÃO inteira também é endereçável, e é assim que o material é
     aplicado: `{op:'arranja', id}` sem `copia`.

   Nenhum número de instância está digitado nos passos: `total` cita `TOPO`, e
   mudar `tabuasDaCerca` refaz a cerca inteira, a travessa que a atravessa e a
   lista de partes junto.

   O QUE ESTA PEÇA ENCONTROU E NÃO CONTORNOU EM SILÊNCIO (ATRITOS-AUTORIA A-24):
   `arranja` copia UMA origem, e há gerador cujo contrato não sabe dizer "a
   primitiva inteira" — no `cilindro`, `{op,id}` sem eixo são só as laterais.
   Por isso as tábuas e as pétalas são `cubo` (que tem o inteiro) e o miolo da
   flor é `esfera`; nenhum cilindro é arranjado aqui.

   Bancada e régua:
     npm run bancada -- _cerca-e-flor --vistas=frontal,isometrica,superior
     npm run bancada -- _cerca-e-flor --selecionadas=tabuaDaCerca4 --modo=isolar --focar
     npm run descrever -- _cerca-e-flor --estrito
*/
import { executar, colisaoDe } from '../motor/oficina.js';

/* Topológicos primeiro: são eles que a peça CONTA, e as medidas derivadas
   abaixo dependem da contagem de tábuas. */
export const TOPO = {
  tabuasDaCerca: 7,
  petalasDaFlor: 6,
  mioloAneis: 4,
  mioloLados: 12,
};

/* Medidas independentes, em metros. */
const MEDIDAS = {
  tabuaLargura: 0.090,
  tabuaAltura: 0.900,
  tabuaEspessura: 0.018,
  tabuaPasso: 0.140,          // de eixo a eixo, o passo do arranjo linear

  travessaAltura: 0.060,
  travessaEspessura: 0.022,
  travessaBaixaY: 0.180,
  travessaAltaY: 0.660,

  florX: 0.180,
  florY: 0.320,
  florZ: 0.170,               // à frente da cerca, do lado de fora (+Z é a frente)
  mioloRaio: 0.038,

  petalaComprimento: 0.115,
  petalaLargura: 0.058,
  petalaEspessura: 0.011,
  petalaOrbita: 0.030,        // onde a raiz da pétala começa, medida do centro
};

/* Derivadas: a relação fica escrita, não o número já calculado fora. A travessa
   acompanha a contagem de tábuas — mudar `tabuasDaCerca` alonga a cerca inteira
   sem que ninguém remeça nada. */
const DERIVADAS = {
  cercaComprimento: '= tabuaPasso * (tabuasDaCerca - 1) + tabuaLargura',
  primeiraTabuaX: '= -(cercaComprimento - tabuaLargura) / 2',
  travessaZ: '= -(tabuaEspessura + travessaEspessura) / 2',   // atrás das tábuas
  petalaRaizY: '= petalaOrbita',
};

export const PARAMS = { ...MEDIDAS, ...DERIVADAS };

export const MATERIAIS = {
  madeiraTabua: { cor: '#a8845a', aspereza: 0.93 },
  madeiraTravessa: { cor: '#7c5f3e', aspereza: 0.95 },
  corolaPetala: { cor: '#d2586f', aspereza: 0.55 },
  coracaoDaFlor: { cor: '#e8c355', aspereza: 0.70 },
};

/* Identidades estruturais declaradas pelo autor. Não são posições de passo. */
const TABUA = 700;              // a tábua da ponta esquerda, fonte do arranjo
const TABUAS_DA_CERCA = 701;    // as demais, cópias 0..tabuasDaCerca−2
const TRAVESSA_BAIXA = 702;
const TRAVESSA_ALTA = 703;
const MIOLO = 710;
const PETALA = 711;             // a pétala apontada para +Y, fonte do arranjo
const PETALAS_DA_FLOR = 712;

const ORIGEM_TABUA = { op: 'cubo', id: TABUA };
const ORIGEM_TABUAS = { op: 'arranja', id: TABUAS_DA_CERCA, de: ORIGEM_TABUA };
const ORIGEM_PETALA = { op: 'cubo', id: PETALA };
const ORIGEM_PETALAS = { op: 'arranja', id: PETALAS_DA_FLOR, de: ORIGEM_PETALA };

/* A tábua 1 é a FONTE (não é cópia de ninguém); as tábuas 2..N são as cópias
   0..N−2. A lista deriva de `TOPO.tabuasDaCerca`, e o mesmo vale para a flor:
   nenhum índice de instância está digitado à mão. */
const contagem = (n) => Array.from({ length: n }, (_, k) => k + 1);
const INSTANCIAS = [
  ...contagem(TOPO.tabuasDaCerca).map((n) => ({
    nome: `tabuaDaCerca${n}`,
    origem: n === 1 ? ORIGEM_TABUA : { ...ORIGEM_TABUAS, copia: n - 2 },
  })),
  ...contagem(TOPO.petalasDaFlor).map((n) => ({
    nome: `petalaDaFlor${n}`,
    origem: n === 1 ? ORIGEM_PETALA : { ...ORIGEM_PETALAS, copia: n - 2 },
  })),
];

export const ALIASES = [
  ['cercaInteira', { unir: [{ origem: ORIGEM_TABUA }, { origem: ORIGEM_TABUAS }] }],
  ['corolaInteira', { unir: [{ origem: ORIGEM_PETALA }, { origem: ORIGEM_PETALAS }] }],
  ...INSTANCIAS.map((inst) => [`${inst.nome}Inteira`, { origem: inst.origem }]),
];

export const PASSOS = [
  /* A cerca: UMA tábua e o passo. A frase "sete tábuas de 14 em 14 cm" está no
     arquivo, não a expansão dela. */
  ['cubo', {
    origemId: TABUA,
    larg: 'tabuaLargura',
    alt: 'tabuaAltura',
    prof: 'tabuaEspessura',
  }],
  ['transladar', { d: ['primeiraTabuaX', 0, 0], sel: { origem: ORIGEM_TABUA } }],
  ['arranja', {
    modo: 'linear',
    d: ['tabuaPasso', 0, 0],
    total: 'tabuasDaCerca',
    origemId: TABUAS_DA_CERCA,
    derivaDe: ORIGEM_TABUA,
    sel: { origem: ORIGEM_TABUA },
  }],
  ...INSTANCIAS.slice(0, TOPO.tabuasDaCerca).map((inst) => (
    ['parte', { nome: inst.nome, sel: { alias: `${inst.nome}Inteira` } }]
  )),

  /* Duas travessas atrás das tábuas. Elas não são arranjo: são duas, com alturas
     diferentes, e inventar um arranjo para duas peças diferentes seria mentir
     sobre a intenção. O comprimento delas, sim, acompanha a contagem. */
  ['cubo', {
    origemId: TRAVESSA_BAIXA,
    larg: 'cercaComprimento',
    alt: 'travessaAltura',
    prof: 'travessaEspessura',
  }],
  ['transladar', { d: [0, 'travessaBaixaY', 'travessaZ'], sel: { origem: { op: 'cubo', id: TRAVESSA_BAIXA } } }],
  ['parte', { nome: 'travessaBaixa', sel: { origem: { op: 'cubo', id: TRAVESSA_BAIXA } } }],
  ['cubo', {
    origemId: TRAVESSA_ALTA,
    larg: 'cercaComprimento',
    alt: 'travessaAltura',
    prof: 'travessaEspessura',
  }],
  ['transladar', { d: [0, 'travessaAltaY', 'travessaZ'], sel: { origem: { op: 'cubo', id: TRAVESSA_ALTA } } }],
  ['parte', { nome: 'travessaAlta', sel: { origem: { op: 'cubo', id: TRAVESSA_ALTA } } }],

  /* A flor: o miolo e UMA pétala apontando para +Y. A volta fechada em torno de
     Z diz "seis pétalas em roda", e o pivô é o centro da flor — não o centroide
     da pétala, que poria o giro dentro dela mesma. */
  ['esfera', {
    origemId: MIOLO,
    raio: 'mioloRaio',
    aneis: 'mioloAneis',
    lados: 'mioloLados',
  }],
  ['transladar', { d: ['florX', 'florY', 'florZ'], sel: { origem: { op: 'esfera', id: MIOLO } } }],
  ['parte', { nome: 'mioloDaFlor', sel: { origem: { op: 'esfera', id: MIOLO } } }],

  ['cubo', {
    origemId: PETALA,
    larg: 'petalaLargura',
    alt: 'petalaComprimento',
    prof: 'petalaEspessura',
  }],
  ['transladar', {
    d: ['florX', '= florY + petalaRaizY', 'florZ'],
    sel: { origem: ORIGEM_PETALA },
  }],
  ['arranja', {
    modo: 'radial',
    eixo: 'z',
    volta: 360,
    total: 'petalasDaFlor',
    pivo: ['florX', 'florY', 'florZ'],
    origemId: PETALAS_DA_FLOR,
    derivaDe: ORIGEM_PETALA,
    sel: { origem: ORIGEM_PETALA },
  }],
  ...INSTANCIAS.slice(TOPO.tabuasDaCerca).map((inst) => (
    ['parte', { nome: inst.nome, sel: { alias: `${inst.nome}Inteira` } }]
  )),

  /* Material pela COLEÇÃO inteira, o outro lado do mesmo endereço: uma citação
     pinta as sete tábuas, outra pinta as seis pétalas. */
  ['material', { sel: { alias: 'cercaInteira' }, usa: 'madeiraTabua' }],
  ['material', { sel: { grupo: 'travessaBaixa' }, usa: 'madeiraTravessa' }],
  ['material', { sel: { grupo: 'travessaAlta' }, usa: 'madeiraTravessa' }],
  ['material', { sel: { alias: 'corolaInteira' }, usa: 'corolaPetala' }],
  ['material', { sel: { grupo: 'mioloDaFlor' }, usa: 'coracaoDaFlor' }],

  ['liso', { sel: { grupo: 'mioloDaFlor' } }],
  ['solido', { sel: { alias: 'cercaInteira' } }],
];

export const meta = {
  /* DECLARAÇÃO DE CASCA FECHADA. A peça afirma que a superfície dela não tem
     borda solta — toda aresta é dividida por exatamente duas faces. Quem
     declara é cobrado pelo gate do acervo; quem não declara não é. Casca
     aberta é escolha legítima (uma chapa, um anteparo), e 6 peças do acervo
     são assim de propósito. Buraco NÃO abre casca: furo passante tem parede. */
  fechada: true,
  nome: '_cerca-e-flor',
  tipo: 'objeto',
  desc: 'peça de exercício — cerca de tábuas por arranjo linear e flor de pétalas por arranjo radial, cada instância endereçável por nome',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
