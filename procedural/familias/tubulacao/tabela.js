/* tabela.js — as bitolas da tubulação, em milímetro, por material.

   Aço carbono, de 1/2" a 8": o diâmetro externo e a parede da série 40 da ASME B36.10M, lidos na tabela métrica da
   Engineering Toolbox ("ASME/ANSI B36.10/19 - Carbon, Alloy and Stainless Steel Pipes - Dimensions - Metric Units"); a
   distância do centro à boca da curva de 90° de raio longo (A), do tê reto (C), o comprimento da redução concêntrica (H,
   pela bitola maior) e o do tampão (E) da ASME B16.9-2018, tabelas 6.1-1, 6.1-7, 6.1-11 e 6.1-10, lidos no extrato da
   ssmalloys.com. 10" e 12" ficam fora, porque a tabela aberta da parede não os traz.

   PVC soldável de água fria, de 20 a 110 mm: o diâmetro externo e a parede da NBR 5648/99, lidos no catálogo da
   Plastubos. As conexões de PVC não têm medida de norma nas fontes abertas: o joelho tem raio de um diâmetro externo, o tê
   tem a boca a um diâmetro do centro, a redução tem dois diâmetros da maior e o tampão um, regras da família.

   O flange de pescoço de aço, classe 150 da ASME B16.5: o diâmetro externo, o círculo de furação, o número e o diâmetro dos
   furos e a espessura (sem o ressalto de 1,6 mm, que a família não faz) lidos na tabela métrica da projectmaterials.com
   ("Class 150 Flange Dimensions"); o diâmetro do cubo na base (H) e o comprimento pelo pescoço (T, menos o ressalto) lidos na
   tabela em polegada do mesmo sítio ("Weld Neck Flange Sizes") e convertidos. A distância face a face da válvula flangeada
   classe 150 da ASME B16.10, de esfera de passagem curta e de gaveta de cunha, lida no quadro da projectmaterials.com; a de
   esfera de 5" não está no quadro e fica sem valor. O PVC soldável não tem flange nem válvula na tabela. */

export const MATERIAIS = Object.freeze(['aco', 'pvc']);

const aco = (nome, de, parede, curva, te, reducao, tampao) => Object.freeze({ nome, de, parede, curva, te, reducao, tampao });
export const BITOLAS_DE_ACO = Object.freeze({
  '1/2': aco('1/2"', 21.3, 2.77, 38, 25, 38, 25),
  '3/4': aco('3/4"', 26.7, 2.87, 38, 29, 38, 25),
  1: aco('1"', 33.4, 3.38, 38, 38, 51, 38),
  '1.1/4': aco('1 1/4"', 42.2, 3.56, 48, 48, 51, 38),
  '1.1/2': aco('1 1/2"', 48.3, 3.68, 57, 57, 64, 38),
  2: aco('2"', 60.3, 3.91, 76, 64, 76, 38),
  '2.1/2': aco('2 1/2"', 73.0, 5.16, 95, 76, 89, 38),
  3: aco('3"', 88.9, 5.49, 114, 86, 89, 51),
  4: aco('4"', 114.3, 6.02, 152, 105, 102, 64),
  5: aco('5"', 141.3, 6.55, 190, 124, 127, 76),
  6: aco('6"', 168.3, 7.11, 229, 143, 140, 89),
  8: aco('8"', 219.1, 8.18, 305, 178, 152, 102),
});

/* bitola: [diâmetro do flange, espessura, círculo de furação, furos, diâmetro do furo, diâmetro do cubo, comprimento pelo pescoço, face a face da esfera, face a face da gaveta] */
const flange = (D, T, bc, n, f, H, Y, esfera, gaveta) => Object.freeze({ diametro: D, espessura: T, circulo: bc, furos: n, furo: f, cubo: H, pescoco: Y, valvula: Object.freeze({ esfera, gaveta }) });
export const FLANGES_DE_ACO = Object.freeze({
  '1/2': flange(89.0, 9.6, 60.5, 4, 15.7, 30.2, 46.2, 108, 108),
  '3/4': flange(98.5, 11.1, 69.9, 4, 15.7, 38.1, 50.7, 117, 117),
  1: flange(108.0, 12.6, 79.2, 4, 15.7, 49.3, 54.0, 127, 127),
  '1.1/4': flange(117.5, 14.1, 88.9, 4, 15.7, 58.7, 55.6, 140, 140),
  '1.1/2': flange(127.0, 15.9, 98.6, 4, 15.7, 65.0, 60.4, 165, 165),
  2: flange(152.4, 17.5, 120.7, 4, 19.1, 77.7, 61.9, 178, 178),
  '2.1/2': flange(177.8, 20.8, 139.7, 4, 19.1, 90.4, 68.2, 190, 190),
  3: flange(190.5, 22.3, 152.4, 4, 19.1, 108.0, 68.2, 203, 203),
  4: flange(228.6, 22.3, 190.5, 8, 19.1, 134.9, 74.6, 229, 229),
  5: flange(254.0, 22.3, 215.9, 8, 22.4, 163.6, 87.3, null, 254),
  6: flange(279.4, 23.8, 241.3, 8, 22.4, 192.0, 87.3, 267, 267),
  8: flange(342.9, 26.8, 298.5, 8, 22.4, 246.1, 100.0, 292, 292),
});

/** O flange da bitola de aço; recusa o PVC e a bitola sem flange. */
export function flangeDe(material, nome) {
  if (material !== 'aco') throw new Error(`tubulação: o flange e a válvula só existem em aço; o material é '${material}'`);
  const f = FLANGES_DE_ACO[String(nome)];
  if (!f) throw new Error(`tubulação: a bitola '${nome}' não tem flange; aceitas: ${Object.keys(FLANGES_DE_ACO).join(', ')}`);
  return f;
}

const pvc = (de, parede) => Object.freeze({ nome: `${de} mm`, de, parede, curva: de, te: de, reducao: 2 * de, tampao: de });
export const BITOLAS_DE_PVC = Object.freeze(Object.fromEntries([[20, 1.5], [25, 1.7], [32, 2.1], [40, 2.4], [50, 3.0], [60, 3.3], [75, 4.2], [85, 4.7], [110, 6.1]].map(([de, p]) => [String(de), pvc(de, p)])));

/** A bitola pelo material e pelo nome da tabela ('2', '1.1/2', '110'); recusa a que não existe dizendo as que existem. */
export function bitola(material, nome) {
  const tabela = material === 'aco' ? BITOLAS_DE_ACO : material === 'pvc' ? BITOLAS_DE_PVC : null;
  if (!tabela) throw new Error(`tubulação: material '${material}' não existe; aceitos: ${MATERIAIS.join(', ')}`);
  const b = tabela[String(nome)];
  if (!b) throw new Error(`tubulação: a bitola '${nome}' não existe em ${material}; aceitas: ${Object.keys(tabela).join(', ')}`);
  return b;
}
