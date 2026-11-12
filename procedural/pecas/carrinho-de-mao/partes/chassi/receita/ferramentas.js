/* carrinho-de-mao/chassi, receita/ferramentas.js — as ferramentas que escrevem os passos das peças do carrinho de mão em milímetro
 * num estado { passos, topo, origem }, e a conversão para metro num lugar só.
 *
 * Os passos saem em milímetro porque o rascunho do carrinho inteiro (`../../../referencias/carrinho-de-mao.esboco.mjs`) monta as quatro
 * peças sobre o mesmo estado, e o esboço 2.0 é em milímetro; cada receita converte para metro no `gerarPassos` dela, pelos campos de
 * medida de `MEDIDAS`. O contador de origem é do estado, para que várias peças escrevam na mesma lista sem repetir id. São as
 * ferramentas do rascunho aprovado em 2026-11-11, com duas trocas: o tubo é a `gaiolaVarrida` com o trilho `{ pontos, raios }` do
 * núcleo (o rascunho fazia os arcos numa função própria) e o quadro `modo: 'acompanha'`, que mantém a seção redonda onde o tubo sobe.
 *
 * Eixos: x lateral, y altura com o chão em 0, z comprimento com a frente (a roda) em +z; o eixo da roda em z 0. */
import { gaiolaVarrida } from '../../../../../nucleo/gaiola-varrida.js';

const m = (mm) => mm / 1000;

/* vetores */
export const soma = (a, b) => a.map((v, k) => v + b[k]);
export const sub = (a, b) => a.map((v, k) => v - b[k]);
export const esc = (a, k) => a.map((v) => v * k);
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norma = (a) => Math.hypot(...a);
export const unit = (a) => esc(a, 1 / norma(a));
export const lerp = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);

/** A seção redonda de `n` lados e raio `r`, com as linhas nomeadas. */
export const circulo = (r, n) => Array.from({ length: n }, (_, k) => ({ u: r * Math.cos(2 * Math.PI * k / n), v: r * Math.sin(2 * Math.PI * k / n), nome: `l${k}` }));

/** As ferramentas que escrevem passos em mm no estado { passos, topo, origem }. */
export function ferramentas(estado) {
  const nova = (op, args) => { estado.origem += 1; estado.passos.push([op, { origemId: estado.origem, ...args }]); return { origem: { op, id: estado.origem } }; };
  /* um tubo redondo varrido, fechado e tampado, pelo passo `subdivisao` sem nível; o quadro acompanha o trilho, e a gaiola que ainda
     assim avisa seção achatada é recusada */
  function tubo(nome, trilho, raio, { lados = 24, estacoes = { passo: 40 }, u = [1, 0, 0], modo = 'acompanha', tampas = true } = {}) {
    const g = gaiolaVarrida({ nome, trilho, quadro: { u, modo }, secao: circulo(raio, lados), fechada: true, tampas, estacoes });
    if (g.avisos?.length) throw new Error(`tubo ${nome}: ${g.avisos.map((a) => a.mensagem).join('; ')}`);
    Object.assign(estado.topo, Object.fromEntries(g.posicoes));
    return nova('subdivisao', { vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, niveis: 0 });
  }
  const reta = (de, ate) => [{ reta: { de, ate } }];
  function bloco([x0, x1], [y0, y1], [z0, z1]) {
    return nova('extrusao', { eixo: 'y', altura: y1 - y0, em: [0, y0, 0], perfil: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
  }
  const lathe = (perfil, em, lados) => nova('lathe', { eixo: 'x', perfil, lados, em });
  const booleana = (op, solidos) => nova(op, { solidos });
  /* a parte, a cor dela e o sombreamento suave com a quina acima de 35 graus nítida */
  function parte(nome, sel, cor) {
    estado.passos.push(['parte', { nome, sel }], ['pincel', { modo: 'face', sel, cor }], ['liso', { sel, angulo: 35 }]);
  }
  return { nova, tubo, reta, bloco, lathe, booleana, parte };
}

/* Os campos de medida de cada operação que as peças usam: neles todo número é milímetro. Os outros (origem, eixo, sólidos, seleção,
   cor, ângulo do liso, os nomes dos vértices das gaiolas, cujos pontos vão ao TOPO) passam como estão. */
const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'], lathe: ['perfil', 'em'], subdivisao: ['espessura'], transladar: ['d'] };
const MEDIDAS_DA_PORTA = ['centro', 'ponto', 'raio', 'inicio', 'fim', 'extensao'];
export const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os passos de forma do estado, em metro. */
export const passosEmMetro = (passos) => passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);

/** O passo `publicarPorta` de uma porta em mm, em metro. */
export const portaEmMetro = (id, de, I) => ['publicarPorta', { id, de, interface: Object.fromEntries(Object.entries(I).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];

/** Os pontos nomeados das gaiolas, em metro. */
export const topoEmMetro = (topo) => Object.fromEntries(Object.entries(topo).map(([nome, p]) => [nome, p.map(m)]));
