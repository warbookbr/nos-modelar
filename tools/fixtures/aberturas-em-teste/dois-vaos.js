/* dois-vaos.js — peça de teste do plano da abertura em qualquer direção: dois vãos na mesma chapa e o vão dentro da lente de outro.
 *
 * A chapa é uma cúpula suave de 800 por 800 mm e 2 mm de espessura, subdividida em dois níveis (malha de 25 mm). Os vãos são
 * retângulos de 200 por 200 mm na vista y; o segundo corta a chapa que o primeiro já cortou (a seleção é a origem do primeiro), a
 * `folga` mm do lado do primeiro. A lente do primeiro leva um furo menor, cortado da lente como de uma chapa de duas peles.
 * O segundo caso é o da quina: dois vãos de vistas diferentes ('z' e 'x') na caixa de quinas redondas, um em cada face, a pouca distância
 * um do outro, como no furgão. Nada vem de referência externa. */
import { chapaDeGrade, dosPassos, passoDaAbertura, receitaDe, retangulo } from './chapas.js';
import { passosDaCaixa } from './caixa-de-quinas.js';

export const domo = (x, z) => 300 - ((x - 400) ** 2) / 3000 - ((z - 400) ** 2) / 4500;
const chapa = () => chapaDeGrade({ nx: 9, nz: 9, passo: 100, altura: domo, niveis: 2 });

export const PRIMEIRO = retangulo(150, 300, 350, 500);
export const segundo = (folga) => retangulo(350 + folga, 300, 650, 500);
/** O furo da lente do primeiro vão, 60 por 60 mm no meio dele (a lente tem 2 mm de espessura). */
export const FURO = retangulo(220, 370, 280, 430);

/** Os passos de dois vãos vizinhos na cúpula; `comFuro` acrescenta o vão dentro da lente do primeiro. */
export function passosDeDoisVaos({ folga = 20, comFuro = false } = {}) {
  const c = chapa();
  const passos = [['subdivisao', { origemId: 1, ...c.passo }],
    passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'y', contorno: PRIMEIRO }),
    passoDaAbertura(3, dosPassos('aberturaPorContorno', 2), { vista: 'y', contorno: segundo(folga) })];
  if (comFuro) passos.push(passoDaAbertura(4, dosPassos('aberturaPorContorno', 2, 'lente'), { vista: 'y', contorno: FURO, lente: false }));
  return { TOPO: c.TOPO, PASSOS: passos };
}

/** O vão da face +z (vista z, de x = 0 até `xDoPrimeiro` mm, sobre o arco da quina) e o da face +x (vista x, de z = 0 até `uDoSegundo`
 *  mm), os dois entre y de 250 e 450 mm. A borda do primeiro, vista do eixo x, cai num z que a malha do arco decide (o arco da caixa
 *  tem poucos pontos); o teste mede esse z numa rodada do primeiro e dá `uDoSegundo` a partir dele. */
export function passosNaQuina({ xDoPrimeiro = 300, uDoSegundo = null } = {}) {
  const { TOPO, PASSOS } = passosDaCaixa();
  const rz = retangulo(0, 250, xDoPrimeiro, 450);
  PASSOS.push(passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'z', sentido: '+', contorno: rz }));
  if (uDoSegundo == null) return { TOPO, PASSOS, retangulos: { z: rz } };
  const rx = retangulo(0, 250, uDoSegundo, 450);
  PASSOS.push(passoDaAbertura(3, dosPassos('aberturaPorContorno', 2), { vista: 'x', sentido: '+', contorno: rx }));
  return { TOPO, PASSOS, retangulos: { z: rz, x: rx } };
}

const padrao = passosDeDoisVaos({ folga: 20, comFuro: true });
export default receitaDe({ nome: 'dois-vaos', desc: 'cúpula de 800 por 800 mm com dois vãos vizinhos a 20 mm um do outro e um furo na lente do primeiro' }, padrao.TOPO, padrao.PASSOS, { lentes: [3] });
