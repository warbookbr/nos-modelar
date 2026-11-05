/* dobra-em-u — o segundo caso do plano do sólido por laços: uma barra dobrada em U, de 120 mm de largura em x, fechada numa
 * malha só pela subdivisão da gaiola que `gaiolaPorLacos` monta a partir de um laço por plano x. A forma está na TABELA abaixo;
 * nenhum dado vem de referência externa.
 *
 * A FORMA. A dobra tem raio de fora de 40 mm e de dentro de 24 mm (a barra tem 16 mm de espessura), com o centro em y = 40 e
 * z = 0, de modo que o fundo de fora fica no chão. Os dois braços sobem retos de y = 40 até a ponta, que fica a 70 mm acima do
 * centro no plano do meio e sobe em sela até 90 mm nos dois lados (x = ±60). As faces de lado são planas, e as arestas delas e as
 * das pontas dos braços são vivas; o resto é liso.
 *
 * OS LAÇOS. Cada laço é o contorno do U no plano x, em oito trechos na ordem da volta: a ponta do braço da esquerda, de dentro para
 * fora, o braço de fora até a dobra, a curva de fora, o braço de fora da direita, a ponta da direita, o braço de dentro da direita,
 * a curva de dentro e o braço de dentro da esquerda. A tampa das faces de lado é a escada de uma ponta à outra, entre a cadeia de
 * fora e a de dentro, que têm o mesmo número de pontos trecho a trecho. É o caso que a peça em L não cobre: a dobra fica dentro do
 * laço, côncava por dentro, e a compensação a leva para o raio pedido no corte x = 0. */
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';

export const TABELA = {
  meiaLargura: 60,
  raioDeFora: 40,
  raioDeDentro: 24,
  alturaDoCentro: 40,
  /* altura da ponta acima do centro da dobra, no meio e nos lados */
  alturaDoBraco: 70,
  alturaDoBracoNoLado: 90,
  planos: 13,
  pontos: { ponta: 2, braco: 6, curva: 9 },
  niveis: 2,
  /* true empurra os pontos das duas curvas para a superfície limite passar por eles */
  compensarCurva: false,
};

const DENSIDADE = 96;
const arco = (c, r, de, ate, sinal) => Array.from({ length: DENSIDADE + 1 }, (_, k) => {
  const t = de + ((ate - de) * k) / DENSIDADE;
  return [c[0] - r * Math.sin(t), sinal * r * Math.cos(t)];
});

/** lacoNoPlano(t, x) -> { em, trechos }: o contorno do U no plano x, em [y, z] mm. */
export function lacoNoPlano(t, x) {
  const yc = t.alturaDoCentro;
  const h = t.alturaDoBraco + (t.alturaDoBracoNoLado - t.alturaDoBraco) * (x / t.meiaLargura) ** 2;
  const yp = yc + h;
  const Ro = t.raioDeFora; const Ri = t.raioDeDentro;
  return {
    em: x,
    trechos: {
      pontaEsquerda: [[yp, -Ri], [yp, -Ro]],
      foraEsquerda: [[yp, -Ro], [yc, -Ro]],
      curvaDeFora: arco([yc, 0], Ro, 0, Math.PI, -1),
      foraDireita: [[yc, Ro], [yp, Ro]],
      pontaDireita: [[yp, Ro], [yp, Ri]],
      dentroDireita: [[yp, Ri], [yc, Ri]],
      curvaDeDentro: arco([yc, 0], Ri, 0, Math.PI, 1),
      dentroEsquerda: [[yc, -Ri], [yp, -Ri]],
    },
  };
}

/** argumentosDaGaiola(t) -> o que a dobra passa a `gaiolaPorLacos`. */
export function argumentosDaGaiola(t = TABELA) {
  const p = t.pontos;
  const a = {
    nome: 'u',
    eixo: 'x',
    trechos: [
      { nome: 'pontaEsquerda', pontos: p.ponta }, { nome: 'foraEsquerda', pontos: p.braco }, { nome: 'curvaDeFora', pontos: p.curva },
      { nome: 'foraDireita', pontos: p.braco }, { nome: 'pontaDireita', pontos: p.ponta }, { nome: 'dentroDireita', pontos: p.braco },
      { nome: 'curvaDeDentro', pontos: p.curva }, { nome: 'dentroEsquerda', pontos: p.braco },
    ],
    lacos: Array.from({ length: t.planos }, (_, k) => lacoNoPlano(t, -t.meiaLargura + (2 * t.meiaLargura * k) / (t.planos - 1))),
    tampa: { de: 'pontaEsquerda', ate: 'pontaDireita' },
    vincos: [
      { nome: 'ladoDaEsquerda', laco: 'primeiro', nitidez: 'viva' },
      { nome: 'ladoDaDireita', laco: 'ultimo', nitidez: 'viva' },
      { nome: 'pontaEsquerdaDentro', entre: ['dentroEsquerda', 'pontaEsquerda'], nitidez: 'viva' },
      { nome: 'pontaEsquerdaFora', entre: ['pontaEsquerda', 'foraEsquerda'], nitidez: 'viva' },
      { nome: 'pontaDireitaFora', entre: ['foraDireita', 'pontaDireita'], nitidez: 'viva' },
      { nome: 'pontaDireitaDentro', entre: ['pontaDireita', 'dentroDireita'], nitidez: 'viva' },
    ],
  };
  if (t.compensarCurva) a.compensar = { trechos: ['curvaDeFora', 'curvaDeDentro'] };
  return a;
}

export function derivar(t = TABELA) {
  return gaiolaPorLacos(argumentosDaGaiola(t));
}

export function gerarPassos(T = TABELA) {
  const { passo } = derivar(T);
  return [
    ['subdivisao', { origemId: 1, ...passo, niveis: T.niveis }],
    ['parte', { nome: 'dobra', sel: { origem: { op: 'subdivisao', id: 1 } } }],
  ];
}

export const PLANO = {
  objeto: 'peça de teste: barra dobrada em U, fechada numa malha só por subdivisão de uma gaiola de laços',
  referencias: [],
  escala: { medida: 'largura da barra', milimetros: 120 },
  partes: [
    { nome: 'dobra', forma: 'U de raio de fora 40 mm e de dentro 24, braços retos com a ponta em sela de 70 a 90 mm acima do centro da dobra', tecnica: 'subdivisão da gaiola de gaiolaPorLacos, um laço por plano x em oito trechos, faces de lado tampadas em escada de ponta a ponta, vincos vivos nas bordas dos lados e das pontas' },
  ],
  criteriosDeReprovacao: [
    'malha aberta, com aresta sem par ou vínculo não manifold',
    'ondulação ou calombo nos braços ou na dobra',
    'dobra de raio diferente do pedido no corte do meio',
  ],
};

export default {
  meta: { nome: 'solido-por-lacos/dobra-em-u', desc: 'barra dobrada em U fechada numa malha só por subdivisão de uma gaiola de laços, um por plano x' },
  TABELA,
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro da dobra no plano do meio, 40 mm acima do chão; y para cima', ...derivar(this.PARAMS).pontos }; },
  get PASSOS() { return gerarPassos(this.PARAMS); },
  PLANO,
};
