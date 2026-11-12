/* vizinhanca-de-todo-vao.js — as peças de prova do plano `docs/modelar/planos/2026-11-09-abertura-na-vizinhanca-de-todo-vao.md`: cada uma
 * reproduz, na cúpula de 800 por 800 mm (16 mil faces, 2 mm de espessura), um dos motivos pelos quais a booleana de um vão do furgão
 * realista via a chapa inteira em vez de só a vizinhança dele. Em todas o vão provado é um triângulo (o último passo), cuja caixa cobre o
 * canto livre da cúpula, e antes dele um ou dois retângulos pequenos já abertos ficam nesse canto, fora do triângulo e dentro da caixa:
 * a vizinhança do triângulo (as faces que tocam a caixa do prisma e as que dividem vértice com elas) alcança o tubo de parede deles,
 * e a borda do trecho passa de uma pele à outra por esse tubo. Os motivos abaixo são os da escolha da vizinhança na main de 2026-11-09,
 * antes do plano:
 *
 *   - `vaoGrande`: as duas voltas da borda misturam as duas peles, e a banda liga vértices a 358 mm, mais que 1,5 vez a aresta de 18 mm
 *     (as origens 1200 e 1201 do furgão: 690 mm contra 70 mm);
 *   - `vaoJuntoDeOutro`: o trecho tem uma volta; tiradas as faces de parede dos vãos vizinhos, a borda tem quatro, as de fora e as de
 *     dentro do anel que o tubo deixa (as origens 1202 e 1203);
 *   - `vaoDeTubo`: o trecho tem uma volta e só sete das faces do tubo do vão vizinho; tiradas elas, a banda liga vértices a 95 mm
 *     (a família das origens 1101 a 1107, rentes ao chanfro do vão da porta, onde o trecho leva um pedaço do tubo dele);
 *   - `vaoRente`: a borda do trecho toca a si mesma num vértice, onde duas lascas rentes à parede de um vão vizinho se encontram
 *     (a mesma família, nas origens em que a borda "toca a si mesma");
 *   - `paredeNaBordaA` e `paredeNaBordaB`: a banda de duas voltas passa no limite, mas o trecho leva as faces de parede do vão aberto
 *     antes, e a booleana recusava o sólido por dentro ("o sólido 0 não é fechado") e deixava a operação órfã, enquanto a chapa inteira
 *     abria. O trecho com face de parede passa a tirá-las (ou a engolir o tubo) como o que a banda recusa.
 *
 * Nada vem de referência externa. */
import { chapaDeGrade, dosPassos, passoDaAbertura, poligonoDeRetas, receitaDe, retangulo } from './chapas.js';
import { domo } from './dois-vaos.js';

const triangulo = (a, b, lado) => poligonoDeRetas([[a, b], [a + lado, b], [a, b + lado]]);

/** Os dados de cada peça: o triângulo (a, b, lado) e os retângulos [u0, v0, u1, v1] abertos antes dele, em milímetro. */
export const PECAS = {
  vaoGrande: { triangulo: [283, 297, 260], vaos: [[512, 520, 557, 565], [447, 528, 486, 567]] },
  vaoJuntoDeOutro: { triangulo: [295, 170, 254], vaos: [[518, 365, 585, 432], [463, 361, 502, 400]] },
  vaoDeTubo: { triangulo: [208, 169, 195], vaos: [[395, 362, 483, 450]] },
  vaoRente: { triangulo: [274, 269, 283], vaos: [[498, 499, 579, 580], [429, 520, 465, 556]] },
  paredeNaBordaA: { triangulo: [195, 211, 191], vaos: [[341, 378, 374, 411]] },
  paredeNaBordaB: { triangulo: [270, 160, 258], vaos: [[500, 238, 532, 270]] },
};

/** Os passos da peça: a subdivisão, os vãos pequenos em sequência e o triângulo por último. Devolve também os contornos, na ordem dos vãos. */
export function passosDa(nome) {
  const { triangulo: [a, b, lado], vaos } = PECAS[nome];
  const c = chapaDeGrade({ nx: 9, nz: 9, passo: 100, altura: domo, niveis: 3 });
  const contornos = [...vaos.map((r) => retangulo(...r)), triangulo(a, b, lado)];
  const passos = [['subdivisao', { origemId: 1, ...c.passo }]];
  contornos.forEach((contorno, k) => passos.push(passoDaAbertura(2 + k, dosPassos(k === 0 ? 'subdivisao' : 'aberturaPorContorno', k === 0 ? 1 : 1 + k), { vista: 'y', contorno })));
  return { TOPO: c.TOPO, PASSOS: passos, contornos };
}

const padrao = passosDa('vaoJuntoDeOutro');
export default receitaDe({ nome: 'vizinhanca-de-todo-vao', desc: 'cúpula de 800 por 800 mm com dois vãos pequenos e um triângulo de 254 mm que alcança o tubo de parede deles: a vizinhança do triângulo engole o tubo' }, padrao.TOPO, padrao.PASSOS, { lentes: [4] });
