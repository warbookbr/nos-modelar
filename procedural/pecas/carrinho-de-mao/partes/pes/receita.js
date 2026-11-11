/* carrinho-de-mao/pes — os pés do carrinho de mão: de cada lado um V de tubo de Ø 22 sob o braço, com o fundo arredondado no chão, e as
 * duas travessas de chapa chata que ligam as pernas de um lado às do outro, numa peça aparafusada sob os braços do chassi.
 *
 * Etapa 2 de 4 da montagem `../../montagem.json` (item 2 das partes do `../../ALINHAMENTO.md`). A forma é a do rascunho que a pessoa
 * aprovou por imagem em 2026-11-11 (`../../referencias/carrinho-de-mao.esboco.mjs`), levada para cá sem mudança de medida, com três
 * mudanças de construção: o V é o trilho `{ pontos, raios }` da `gaiolaVarrida`, e o raio do fundo, que põe a face de baixo do tubo
 * no chão, sai da conta do arco tangente (no rascunho, de uma função própria de arcos e uma busca por bisseção); o quadro do tubo
 * acompanha o trilho; e as estações são as do trilho (40 mm nas retas, 7,5 graus no fundo). A face de cima das travessas sai da face
 * de baixo do braço do chassi (no rascunho, o número 250 digitado). O rascunho chama `montarPes` daqui.
 *
 * DE ONDE VEM CADA MEDIDA: a TABELA do `../../ALINHAMENTO.md` (linhas "pés" e "travessas dos pés"); o topo de cada perna fica no eixo
 * do braço do chassi (`../chassi/receita.js`, `noBraco`), em z -305 e -580, e entra na braçadeira sob ele.
 *
 * O ENCAIXE. A origem é a do carrinho. A montagem põe os pés pela porta `noBraco` (o plano da face de cima das travessas, com a normal
 * para cima, no x e no z da porta do chassi) na porta `apoioDosPes` do chassi, sem afastamento, e a pose sai identidade.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os pontos dos V, o raio do fundo, as travessas e a porta em mm; `montarPes` escreve os
 * passos em mm num estado { passos, topo, origem }; `gerarPassos` converte para metro com `m()`, num lugar só. */
import { TABELA as CHASSI, derivar as derivarChassi, noBraco } from '../chassi/receita.js';
import { dot, ferramentas, norma, passosEmMetro, portaEmMetro, soma, sub, topoEmMetro, unit } from '../chassi/receita/ferramentas.js';

export const TABELA = {
  /* As cores do rascunho: o cinza dos pés e o escuro das travessas. */
  cores: { cinza: '#6b7178', escuro: CHASSI.cores.escuro },
  /* PÉS (linha "pés"): tubo de Ø 22, 16 lados. De cada lado um V sob o braço, do eixo do braço em z -305 (a perna da frente) ao eixo
     dele em z -580 (a de trás, quase de pé), pelo ponto do fundo em z -551 e y -105 (o canto do V, abaixo do chão), com o fundo
     arredondado; o raio do fundo é o que põe a face de baixo do tubo em y 0. Estações a cada 40 mm nas retas. */
  pes: { raio: 11, lados: 16, topos: [-305, -580], fundoZ: -551, fundoY: -105, passo: 40 },
  /* TRAVESSAS DOS PÉS (linha "travessas"): chapa chata de 40 × 6, de lado a lado, nos topos das pernas, passando 12 mm do eixo de cada
     perna para fora, com a face de cima na de baixo dos braços. */
  travessas: { largura: 40, espessura: 6, alem: 12 },
};

/** O raio do arco tangente às duas retas do canto `P` (vindo de `A`, indo a `B`) cujo ponto mais baixo do eixo do tubo fica na altura
 *  `y`: o centro está na bissetriz do canto, a R / cos(θ/2) de P, e o ponto mais baixo do arco, R abaixo do centro. */
function raioQuePoeNaAltura(A, P, B, y) {
  const d1 = unit(sub(P, A)); const d2 = unit(sub(B, P));
  const meio = Math.acos(Math.max(-1, Math.min(1, dot(d1, d2)))) / 2;
  const bissetriz = unit(sub(d2, d1));
  return (y - P[1]) / (bissetriz[1] / Math.cos(meio) - 1);
}

/** Os V, o raio do fundo, as travessas e a porta, em mm. */
export function derivar(T = TABELA) {
  const P = T.pes;
  const [ta, tb] = P.topos.map((z) => noBraco(CHASSI, z));
  const fundo = [(ta[0] + tb[0]) / 2, P.fundoY, P.fundoZ];
  const raioDoFundo = raioQuePoeNaAltura(ta, fundo, tb, P.raio);
  const vs = [1, -1].map((s) => ({ s, pontos: [ta, fundo, tb].map(([x, y, z]) => [s * x, y, z]) }));
  /* a face de cima das travessas é a de baixo do braço, onde o chassi publica o apoio dos pés */
  const apoio = derivarChassi(CHASSI).portas.apoioDosPes;
  const topo = apoio.ponto[1];
  const TR = T.travessas;
  const travessas = [ta, tb].map((t) => ({ x: [-t[0] - TR.alem, t[0] + TR.alem], y: [topo - TR.espessura, topo], z: [t[2] - TR.largura / 2, t[2] + TR.largura / 2] }));
  const portas = {
    noBraco: { forma: 'plano', papel: 'apoia', ponto: apoio.ponto, normal: apoio.normal.map((v) => (v === 0 ? 0 : -v)), extensao: apoio.extensao, referencia: apoio.referencia },
  };
  return { ta, tb, fundo, raioDoFundo, vs, travessas, portas, comprimento: norma(sub(ta, fundo)) + norma(sub(tb, fundo)) };
}

/** Os pés no estado { passos, topo, origem }, em mm: um V de cada lado e as duas travessas entre eles. Devolve a origem da travessa da
 *  frente, de onde sai a porta. */
export function montarPes(estado, T = TABELA) {
  const D = derivar(T);
  const { tubo, bloco, parte } = ferramentas(estado);
  const P = T.pes;
  for (const v of D.vs) {
    parte('pes', tubo(`pe${v.s > 0 ? 'E' : 'D'}`, { pontos: v.pontos, raios: [D.raioDoFundo] }, P.raio, { lados: P.lados, estacoes: { passo: P.passo }, u: [1, 0, 0] }), T.cores.cinza);
  }
  const [frente, tras] = D.travessas.map((t) => bloco(t.x, t.y, t.z));
  parte('travessas', frente, T.cores.escuro);
  parte('travessas', tras, T.cores.escuro);
  return { travessa: frente };
}

/** Os PASSOS, em metro: a forma e, no fim, a porta. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { travessa } = montarPes(estado, T);
  return [...passosEmMetro(estado.passos), portaEmMetro('noBraco', travessa.origem, derivar(T).portas.noBraco)];
}

/** Os pontos nomeados das gaiolas dos tubos, em metro. */
export function gerarTopo(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  montarPes(estado, T);
  return topoEmMetro(estado.topo);
}

export const CONTATOS = [
  { par: ['pes', 'travessas'], motivo: 'as travessas de chapa são presas nas pernas, de lado a lado, nos topos dos V' },
];

const receita = {
  meta: { nome: 'carrinho-de-mao/pes', desc: 'pés do carrinho de mão: um V de tubo de Ø 22 de cada lado, com o fundo redondo no chão, e duas travessas de chapa chata' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'a do carrinho: o chão sob o centro do eixo da roda, no meio da largura; y para cima, x lateral e a frente (a roda) em +z', ...gerarTopo(this.PARAMS) }; },
  PLANO: {
    objeto: 'pés de carrinho de mão de obra: dois V de tubo redondo fino, um sob cada braço do chassi, com o fundo arredondado no chão, ligados por duas travessas de chapa chata aparafusadas sob os braços, abertas para trás (topo de trás mais fora)',
    referencias: ['../../referencias/carrinho-de-mao.contornos.json'],
    escala: { medida: 'diâmetro do pneu 3.25-8, que fixa a escala das referências (TABELA do alinhamento)', milimetros: 340 },
    partes: [
      { nome: 'pes', forma: 'de cada lado um V de tubo redondo cinza de Ø 22, dos topos em z -305 e -580 no eixo do braço até o fundo arredondado em z -551, com a face de baixo no chão em y 0, a 177 do centro; a ponta acima da travessa entra no tubo do braço', tecnica: 'gaiolaVarrida de seção redonda de 16 lados num trilho de três pontos com o raio do fundo, quadro que acompanha o trilho, fechada e tampada, passo subdivisao sem nível' },
      { nome: 'travessas', forma: 'duas chapas escuras de 40 × 6 de lado a lado, nos topos das pernas, com a face de cima em y 250, na face de baixo dos braços; a de trás é 20% mais comprida que a da frente (412 contra 345): os braços abrem em reta para trás', tecnica: 'extrusão em y de um retângulo, uma em cada topo' },
    ],
    criteriosDeReprovacao: [
      'o fundo dos dois pés fora do chão em y 0, ou um pé mais alto que o outro',
      'o pé em trapézio ou de tubo quadrado, no lugar do V de tubo redondo com o fundo arredondado',
      'as travessas soltas das pernas, ou fora da face de baixo dos braços',
      'os pés por fora dos braços na vista de cima, ou cruzando a caçamba',
    ],
    lataria: { partes: ['pes'] },
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm, nas duas travessas juntas: a de trás é a mais larga (o braço abre para trás). */
  get PONTOS() {
    const D = derivar(this.PARAMS); const [f, t] = D.travessas;
    return [
      { nome: 'travessas, em cima, na frente e à esquerda', parte: 'travessas', medida: 'maximo', em: [t.x[1], f.y[1], f.z[1]], toleranciaMm: 0.5 },
      { nome: 'travessa de trás, embaixo, atrás e à direita', parte: 'travessas', medida: 'minimo', em: [t.x[0], t.y[0], t.z[0]], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
