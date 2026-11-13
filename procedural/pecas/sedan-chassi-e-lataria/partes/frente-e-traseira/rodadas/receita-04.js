/* sedan-chassi-e-lataria/frente-e-traseira — o painel da frente com a grade e os vãos de farol, o painel de trás com os vãos de lanterna e a aba de borda dele, as
 * lentes, os dois para-choques de ponta a ponta, a tomada de ar sobre o capô e as cinco lâminas da grade.
 *
 * Etapa 3 de 5 da montagem `../../montagem.json` (item 3 das partes do `../../ALINHAMENTO.md`). A forma é a do esboço do carro inteiro
 * (`../../alta-definicao/frente-e-traseira.esboco.mjs`, ciclo 4, com a simetria e os para-choques do ciclo 5): os passos são os do esboço,
 * recortados por `../_comum/recorte.mjs`, de modo que a malha de cada parte é a que ela tem no carro inteiro. Cada painel é uma gaiola por estações
 * ao longo de x no plano da borda da chapa de baixo, a 4 mm do capô e da tampa por cima e dos para-lamas e das laterais dos lados; o farol e a
 * lanterna são rebaixos por relevo com a lente que o anel devolve; os para-choques são gaiolas por laços com o raio no laço da ponta.
 *
 * A ABA DO PAINEL DE TRÁS. O vão de 4 mm entre o painel de trás e as laterais traseiras, do lado de fora do carro, deixava ver o chão por trás dele, na altura do
 * para-choque (`vao:partes --fundo=modelo`, CICLO-5.md): a lateral e o painel são chapas de 1 mm que se olham pela borda, e atrás do vão não havia nada. Esta
 * peça acrescenta a aba de borda do painel (`friso` com `aba`, de 90 graus, sobre a borda livre da última estação), que dobra para dentro do carro em cada
 * ponta do painel; a aba é uma parte só, com os dois lados, porque o friso sobre a chapa com simetria faz a cópia espelhada. A largura e o raio vêm da TABELA.
 *
 * O ENCAIXE. A frente assenta no plano da borda da frente da chapa de baixo, z 2118 (a porta `naBordaDaFrente`, normal para -z, e a
 * `paraOPainelDianteiro` da carroceria, normal para +z), no mesmo ponto: a pose sai identidade. O vão de 4 mm do painel com o capô, os para-lamas e
 * as laterais, e a tomada de ar sobre o capô, são medidos na montagem, onde a carroceria está.
 *
 * A cadeia: a TABELA em mm (o ponto do encaixe); `derivar` calcula a interface; `gerarPassos` põe o recorte, em metro, e a porta. */
import { CONJUNTO, ETAPAS, ENCAIXES, F, PAINEL_DA_FRENTE, PAINEL_DE_TRAS, contatosDaEtapa, folgasDaEtapa, interfaceDoEncaixe, parteDoPlano, portasEmMetro, recorteDaEtapa } from '../../_comum/sedan.mjs';
import { T } from '../../../alta-definicao/alvo.mjs';

const ETAPA = 'frente-e-traseira';
const { PARA_CHOQUE_DA_FRENTE, PARA_CHOQUE_DE_TRAS } = await import('../../../alta-definicao/frente-e-traseira.esboco.mjs');

export const TABELA = {
  encaixe: { ponto: ENCAIXES[ETAPA].ponto },
  /* a tolerância dos PONTOS dos para-choques: a subdivisão deixa o extremo da barra até 3 mm dentro dos laços (raio de 8 mm nas quinas) */
  folgaDaSubdivisao: 3,
  /* a aba de borda do painel de trás: a perna de 90 graus dobra para dentro, com raio de 0,5 mm na face de dentro. A dobra come `raio` + `chapa` (1,5 mm) do vão de 4 mm do lado da lateral:
     com 2 mm de raio (3 mm de dobra) a aba entrava 1 mm na lateral onde o vão é menor, a 850 de altura (relato de contatos). A largura é a que fecha o vão (medida: --fundo=modelo) */
  aba: { largura: 20, angulo: 90, raio: 0.5 },
  /* a vista de perto do raio da ponta (6 mm) e da quina (8 mm) dos para-choques: a 90 mm a imagem cobre uns 62 mm, e o raio de 6 mm ocupa uns 87 pontos, e não os 2 da vista isolada */
  dePerto: { distancia: 90 },
};
const m = (mm) => mm / 1000;
/* os pontos da última estação do painel de trás, de baixo para cima: a borda livre que a aba dobra */
const bordaDoPainelDeTras = () => Object.entries(PAINEL_DE_TRAS.pontos).filter(([n]) => n.startsWith('painelTraseiro_borda_')).sort((a, b) => a[1][1] - b[1][1]).map(([n]) => n);

/** As vistas de perto de um para-choque, em mm do referencial da peça, tiradas dos pontos do esboço na ponta de +x (o último laço, o de maior x): o meio da aresta de cima da ponta,
 * onde o raio de 6 mm da ponta se vê entre a tampa e o topo, e a quina de cima da face de fora, onde se vê o de 8 mm. A câmera da vista de perto é a isométrica de +x, +y e +z. */
function dePertoDoParaChoque(g, nome, fora, ponta, quina, distancia) {
  const xMax = Math.max(...Object.values(g.pontosMm).map((q) => q[0]));
  const ponto = (sufixo) => g.pontosMm[Object.keys(g.pontosMm).find((n) => n.startsWith(`${nome}_l`) && n.endsWith(`_${sufixo}`) && g.pontosMm[n][0] === xMax)];
  return [{ ponto: ponto('cima1'), oQue: ponta, distancia }, { ponto: ponto(fora), oQue: quina, distancia }];
}

/** A interface da porta, em mm. */
export function derivar(Tab = TABELA) {
  return { portas: { [ENCAIXES[ETAPA].filha]: { ...interfaceDoEncaixe(ETAPA, 'filha'), ponto: Tab.encaixe.ponto } } };
}

/** Os PASSOS, em metro: o recorte do esboço, a aba do painel de trás e a porta do encaixe. */
export function gerarPassos(Tab = TABELA) {
  const { passos } = recorteDaEtapa(ETAPA);
  const { portas } = derivar(Tab);
  const painel = passos.find(([op, a]) => op === 'parte' && a.nome === 'painelTraseiro')[1].sel.origem;
  /* o número de origem é livre no carro inteiro, e não só nesta etapa, para as cinco etapas juntas (`alta-definicao/carro-pela-receita.mjs`) não repetirem origem */
  const id = Math.max(...CONJUNTO.passos.map(([, a]) => a.origemId ?? 0)) + 1;
  const { largura, angulo, raio } = Tab.aba;
  const aba = [['friso', { origemId: id, superficie: painel, linha: { nome: 'abaDoPainelTraseiro', pontos: bordaDoPainelDeTras() }, aba: { largura: m(largura), angulo, raio: m(raio) } }],
    ['parte', { nome: 'abaDoPainelTraseiro', sel: { origem: { op: 'friso', id } } }], ['pincel', { modo: 'face', sel: { origem: { op: 'friso', id } }, cor: '#16a085' }]];
  return [...passos, ...aba, ...portasEmMetro(passos, Object.fromEntries(Object.entries(portas).map(([id, i]) => [id, { parte: 'painelDianteiro', interface: i }])))];
}

/** Os pontos nomeados das gaiolas, em metro. */
export function gerarTopo() { return recorteDaEtapa(ETAPA).topo; }

const receita = {
  meta: { nome: 'sedan-chassi-e-lataria/frente-e-traseira', desc: 'a frente e a traseira do sedã: painéis com grade, faróis e lanternas em rebaixo, lentes, para-choques de ponta a ponta, tomada de ar e lâminas da grade' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'o centro do carro no chão: x lateral com a direita em +x, y para cima, a frente em +z', ...gerarTopo() }; },
  PLANO: {
    objeto: 'a frente e a traseira de um sedã de 4,4 m: painéis de 1 mm com grade e rebaixos de farol e lanterna, lentes, para-choques de ponta a ponta e tomada de ar do capô',
    referencias: ['../../referencias/sedan-chassi-e-lataria.contornos.json'],
    escala: { medida: 'comprimento total do sedã, de z -2200 a 2200', milimetros: 4400 },
    partes: [...ETAPAS[ETAPA], 'abaDoPainelTraseiro'].map(parteDoPlano).map((p) => {
      const d = TABELA.dePerto.distancia;
      if (p.nome === 'paraChoqueDianteiro') return { ...p, dePerto: dePertoDoParaChoque(PARA_CHOQUE_DA_FRENTE, p.nome, 'cima0', 'a ponta de +x, no topo: raio de 6 mm entre a tampa da ponta e a face de cima', 'a quina de cima da face da frente, na ponta de +x: raio de 8 mm', d) };
      if (p.nome === 'paraChoqueTraseiro') return { ...p, dePerto: dePertoDoParaChoque(PARA_CHOQUE_DE_TRAS, p.nome, 'tras0', 'a ponta de +x, no topo: raio de 6 mm entre a tampa da ponta e a face de cima', 'a quina de cima da face de trás (de costas para a câmera, fica no contorno), na ponta de +x: raio de 8 mm', d) };
      return p;
    }),
    criteriosDeReprovacao: [
      'o para-choque que não vai de ponta a ponta, com costura no eixo, ou com a ponta em quina viva ou chanfro reto no lugar do raio de 6 mm (o afunilamento em planta do fundo, de 72 a 36 mm, é o prometido)',
      'a lente do farol ou da lanterna fora da abertura do rebaixo, ou atravessando a chapa do painel',
      'o painel da frente ou o de trás a mais de 4,2 mm do capô, da tampa, dos para-lamas ou das laterais',
      'a grade sem as cinco lâminas, ou com as lâminas soltas atrás do vão',
      'o lado esquerdo que não é a imagem do direito',
      'o vão entre o painel de trás e a lateral que deixa ver o outro lado do carro por trás dele',
    ],
    lataria: { partes: ['painelDianteiro', 'painelTraseiro', 'abaDoPainelTraseiro', 'paraChoqueDianteiro', 'paraChoqueTraseiro', 'tomadaDeAr'] },
  },
  contatos: [...contatosDaEtapa(ETAPA), { par: ['abaDoPainelTraseiro', 'painelTraseiro'], motivo: 'a aba é a própria borda do painel dobrada para dentro: ela nasce na parede da borda da chapa, sem fusão, e o contato é o da costura' }],
  FOLGAS: folgasDaEtapa(ETAPA),
  /* Os grupos soltos desta peça, que a carroceria prende: o painel de trás com as lanternas fica a 4 mm das laterais e da tampa, e cada para-choque a 4 mm do painel, preso
     pelos suportes do chassi, e a tomada de ar assenta no capô (os três ficam fora do grupo da frente). */
  ilhas: [
    { contem: 'painelTraseiro', motivo: 'o painel de trás com as lanternas fica a 4 mm das laterais e da tampa, que são da peça carroceria; nesta peça é um grupo à parte do da frente' },
    { contem: 'paraChoqueDianteiro', motivo: 'o para-choque da frente fica a 4 mm do painel e é preso pelos suportes do chassi, da peça carroceria; o parafuso fica fora do modelo' },
    { contem: 'paraChoqueTraseiro', motivo: 'o para-choque de trás fica a 4 mm do painel e é preso pelos suportes do chassi, da peça carroceria; o parafuso fica fora do modelo' },
    { contem: 'tomadaDeAr', motivo: 'a tomada de ar assenta no capô, da peça carroceria, com a borda 1 mm dentro da chapa dele' },
  ],
  /* as partes soltas de propósito, para `vao:partes --soltas=recusar` (as mesmas das ilhas que não são o painel de trás) */
  APOIA: Object.fromEntries(['tomadaDeAr', 'paraChoqueDianteiro', 'paraChoqueTraseiro'].map((n) => [n, 'preso fora do esboço: o para-choque pelos suportes do chassi e a tomada de ar pelo capô, que são da peça carroceria'])),
  /* As aberturas dos painéis: a grade, que vai até o eixo, e os rebaixos de farol e de lanterna, abertos para a lente que cada um leva. Nenhuma leva moldura. */
  get vaos() {
    return [
      { nome: 'grade', borda: PAINEL_DA_FRENTE.bordaDoVao('grade'), semMoldura: { motivo: 'a grade é o vão aberto até o eixo, com as cinco lâminas atrás dele; o desenho não tem moldura em volta' } },
      { nome: 'farol', borda: PAINEL_DA_FRENTE.bordaDoVao('farol'), semMoldura: { motivo: 'o farol é um rebaixo de 14 mm com a lente atrás da abertura; o desenho não tem moldura em volta' } },
      { nome: 'lanterna', borda: PAINEL_DE_TRAS.bordaDoVao('lanterna'), semMoldura: { motivo: 'a lanterna é um rebaixo de 14 mm com a lente atrás da abertura; o desenho não tem moldura em volta' } },
    ];
  },
  /* Os extremos que a tabela do desenho fixa: o para-choque da frente na ponta (x 860, topo y 745, fundo z 2118 + 4 mm de vão + 72) e o de trás. */
  get PONTOS() {
    const P = F.paraChoque; const tol = this.PARAMS.folgaDaSubdivisao;
    return [
      { nome: 'para-choque dianteiro, a ponta de cima e da frente', parte: 'paraChoqueDianteiro', medida: 'maximo', em: [P.frente.ponta, P.frente.y[1], T.zBico + T.vao + P.frente.fundo], toleranciaMm: tol },
      { nome: 'para-choque traseiro, a ponta de baixo e de trás', parte: 'paraChoqueTraseiro', medida: 'minimo', em: [-P.tras.ponta, P.tras.y[0], T.zTraseira - T.vao - P.tras.fundo], toleranciaMm: tol },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
