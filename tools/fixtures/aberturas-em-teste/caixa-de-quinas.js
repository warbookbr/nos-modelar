/* caixa-de-quinas.js — peça de teste do plano da abertura em qualquer direção: uma caixa oca de 800 por 800 mm em planta e 600 de
 * altura, com as quatro quinas verticais em arco de 120 mm, feita pelos laços (um contorno por plano y) e subdividida com espessura
 * de 2 mm, uma casca fechada como a carroceria de um furgão. O vão de prova dobra a quina de +x e +z: visto da diagonal [1, 0, 1],
 * o desenho é um retângulo de u -150 a 150 e v (que é y) de 250 a 450 mm, metade na face +z e metade na face +x. Nada vem de
 * referência externa. */
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';

export const MEIA = 400;
export const RAIO = 120;
export const ALTURA = 600;
export const ESPESSURA_MM = 2;

export const PONTOS_DO_LADO_CURTO = 2;
export const PONTOS_DO_ARCO = 4;
const reta = (a, b, n) => Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / (n - 1), a[1] + ((b[1] - a[1]) * k) / (n - 1)]);

/* o contorno da caixa no plano y, em [x, z] mm: quatro retos e quatro arcos de quarto de volta, em sentido anti-horário */
function laco(y) {
  const a = (cx, cz, de) => Array.from({ length: 7 }, (_, k) => { const t = ((de + (90 * k) / 6) * Math.PI) / 180; return [cx + RAIO * Math.cos(t), cz + RAIO * Math.sin(t)]; });
  const c = MEIA - RAIO;
  return {
    em: y,
    trechos: {
      frente: reta([c, MEIA], [-c, MEIA], PONTOS_DO_LADO_CURTO), qFE: a(-c, c, 90), esquerda: [[-MEIA, c], [-MEIA, -c]], qET: a(-c, -c, 180),
      tras: reta([-c, -MEIA], [c, -MEIA], PONTOS_DO_LADO_CURTO), qTD: a(c, -c, 270), direita: [[MEIA, -c], [MEIA, c]], qDF: a(c, c, 0),
    },
  };
}

export function caixa() {
  const trechos = [['frente', PONTOS_DO_LADO_CURTO], ['qFE', PONTOS_DO_ARCO], ['esquerda', 9], ['qET', PONTOS_DO_ARCO], ['tras', PONTOS_DO_LADO_CURTO], ['qTD', PONTOS_DO_ARCO], ['direita', 9], ['qDF', PONTOS_DO_ARCO]].map(([nome, pontos]) => ({ nome, pontos }));
  const lacos = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600].map(laco);
  /* a tampa vai da frente à traseira: com poucos pontos por quarto de arco, a primeira faixa dela mede 35 mm, e não os 9 mm de cinco pontos, que a subdivisão com espessura rasga em lascas (16 faces na pele de dentro da base; achado da bateria, 2026-11-06) */
  const g = gaiolaPorLacos({ nome: 'cx', eixo: 'y', trechos, lacos: lacos.map((l) => ({ em: l.em, trechos: Object.fromEntries(Object.entries(l.trechos).map(([k, pts]) => [k, pts])) })), tampa: { de: 'frente', ate: 'tras' }, vincos: [{ nome: 'pontas', laco: 'primeiro', nitidez: 'viva' }, { nome: 'topo', laco: 'ultimo', nitidez: 'viva' }] });
  return g;
}

/** Os passos da caixa e, quando dada, da abertura de prova: `vista` e `sentido` da abertura, e o contorno em metros. */
export function passosDaCaixa(abertura = null) {
  const g = caixa();
  const passos = [['subdivisao', { origemId: 1, ...g.passo, niveis: 2, espessura: ESPESSURA_MM / 1000 }]];
  if (abertura) passos.push(['aberturaPorContorno', { origemId: 2, chapa: { origem: { op: 'subdivisao', id: 1 } }, lente: true, ...abertura }]);
  return { TOPO: g.pontos, PASSOS: passos };
}

/** O retângulo de prova no plano da vista diagonal, em metros. */
export const RETANGULO_DA_QUINA = { inicio: [-0.15, 0.25], trechos: [{ reto: [0.15, 0.25] }, { reto: [0.15, 0.45] }, { reto: [-0.15, 0.45] }, { reto: [-0.15, 0.25] }] };
