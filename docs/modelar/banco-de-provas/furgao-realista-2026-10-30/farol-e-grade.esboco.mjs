/* farol-e-grade.esboco.mjs — três conjuntos de farol e grade para a frente do furgão (2026-11-05), desenhados de frente para a
 * pessoa escolher o caráter antes de ir ao núcleo da peça. Cada um parte das linhas que a frente já tem: a boca do capô (1100), o
 * topo do para-choque (724) e a quina (meia largura de 1000). As três leituras vêm de fotos de furgões reais que a pessoa mostrou
 * como estudo, que não entram no repositório: a limpa (trapézio de cantos moderados apoiado entre o capô e o para-choque), a
 * recortada (borda de fora na quina, corte diagonal na ponta de dentro repetido nos cantos da grade) e a em faixa (a borda de
 * baixo do farol continua na barra de cima da grade). Tudo em mm, [x, y] de frente, x para a direita de quem olha; o lado -x é o
 * espelho. A frente é uma placa plana; o que está em disputa é o desenho, e não a curvatura da chapa. */
const ESPESSURA_DA_FRENTE = 40;
const Z_FRENTE = 0;

/* o contorno de extrusão em z: o perfil [u, v] vai a (x, -y), então v = -y; com concordância nos cantos, fora do bico */
const contorno = (pts, raio) => ({
  inicio: [pts[0][0], -pts[0][1]],
  trechos: [...pts.slice(1), pts[0]].flatMap((p) => [{ reto: [p[0], -p[1]] }, ...(raio ? [{ concordancia: raio }] : [])]),
});
const caixa = (pts) => { const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }; };
const placa = (id, pts, raio, saida, z0 = Z_FRENTE) => { const c = caixa(pts); return { id, op: 'extrusao', args: { eixo: 'z', altura: saida, perfil: { contorno: contorno(pts, raio) } }, centro: [c.x, c.y, z0 + saida / 2] }; };

const BASE = [
  { id: 'frente', op: 'cubo', args: { larg: 2000, alt: 376, prof: ESPESSURA_DA_FRENTE }, centro: [0, 912, Z_FRENTE - ESPESSURA_DA_FRENTE / 2] },
  { id: 'capo', op: 'cubo', args: { larg: 2000, alt: 200, prof: ESPESSURA_DA_FRENTE }, centro: [0, 1204, Z_FRENTE - ESPESSURA_DA_FRENTE / 2 - 30] },
  { id: 'parachoque', op: 'cubo', args: { larg: 2060, alt: 344, prof: 90 }, centro: [0, 552, Z_FRENTE + 5] },
];

export const OPCOES = [
  { titulo: '1: limpa', nota: 'Trapézio de cantos moderados entre o capô e o para-choque, a ponta de dentro encostando na moldura da grade; grade de cantos de cima redondos, até o para-choque, com três barras retas.',
    farol: [[460, 770], [985, 770], [985, 1080], [490, 1080]], farolRaio: 40, pisca: [[890, 770], [985, 770], [985, 1080], [890, 1080]],
    grade: [[-420, 724], [420, 724], [420, 1060], [-420, 1060]], gradeRaio: 45, barras: { meia: 380, y: 850, passo: 78, total: 3 } },
  { titulo: '2: recortada', nota: 'Borda de fora reta na quina, topo caindo de leve para dentro, base reta e a ponta de dentro num corte diagonal só, mais baixa que a de fora; a grade repete o ângulo do corte nos cantos de cima.',
    farol: [[475, 930], [985, 915], [985, 1090], [540, 1066]], farolRaio: 14, pisca: [[905, 915], [985, 915], [985, 1090], [905, 1085]],
    grade: [[-430, 724], [430, 724], [430, 950], [392, 1040], [-392, 1040], [-430, 950]], gradeRaio: 10, barras: { meia: 380, y: 820, passo: 72, total: 3 } },
  { titulo: '3: em faixa', nota: 'A borda de baixo do farol continua na barra de cima da grade, saindo com ângulo e ficando reta no meio; a grade estreita para baixo até o para-choque.',
    farol: [[430, 985], [560, 950], [985, 925], [985, 1090], [560, 1062]], farolRaio: 12, pisca: [[905, 925], [985, 925], [985, 1090], [905, 1084]],
    grade: [[-380, 724], [380, 724], [425, 940], [-425, 940]], gradeRaio: 10, barras: { meia: 385, y: 800, passo: 72, total: 2 },
    faixa: [[430, 985], [330, 958], [-330, 958], [-430, 985], [-445, 970], [-335, 942], [335, 942], [445, 970]] },
];

export function opcao(o) {
  const formas = [...BASE, placa('grade', o.grade, o.gradeRaio, 12)];
  const b = o.barras;
  formas.push({ id: 'barras', op: 'cubo', args: { larg: 2 * b.meia, alt: 14, prof: 10 }, centro: [0, b.y, 12 + 5], repete: { total: b.total, d: [0, b.passo, 0] } });
  if (o.faixa) formas.push(placa('faixa', o.faixa, 0, 16));
  /* um lado desenhado e o outro pelo espelho do núcleo, na mesma parte, para os dois saírem da mesma cor */
  formas.push({ ...placa('farol', o.farol, o.farolRaio, 8), espelha: 'x' });
  formas.push({ ...placa('pisca', o.pisca, 0, 10), espelha: 'x' });
  return { titulo: o.titulo, nota: o.nota, formas };
}

export default { formato: 'esboco-nucleo@1', vista: 'frontal', opcoes: OPCOES.map(opcao) };
