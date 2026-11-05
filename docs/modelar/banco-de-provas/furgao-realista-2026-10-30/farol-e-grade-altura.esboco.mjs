/* farol-e-grade-altura.esboco.mjs — o conjunto 1 (limpo) de `farol-e-grade.esboco.mjs`, escolhido pela pessoa em 2026-11-05, com o
 * farol mais baixo: o topo fica na linha do capô (1080) e a base sobe, de 310 mm de altura para 270 e 240. A grade e o pisca seguem
 * o farol; o resto é o mesmo. */
import { OPCOES, opcao } from './farol-e-grade.esboco.mjs';

const LIMPA = OPCOES[0];
const TOPO = 1080;
const comAltura = (altura) => {
  const base = TOPO - altura;
  return opcao({
    ...LIMPA,
    titulo: `farol com ${altura} mm de altura`,
    nota: altura === 310 ? 'Como na opção 1 escolhida.' : `A base do farol sobe para ${base} mm; o topo fica na linha do capô.`,
    farol: [[460, base], [985, base], [985, TOPO], [490, TOPO]],
    pisca: [[890, base], [985, base], [985, TOPO], [890, TOPO]],
  });
};

export default { formato: 'esboco-nucleo@1', vista: 'frontal', opcoes: [310, 270, 240].map(comAltura) };
