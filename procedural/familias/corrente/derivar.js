/* derivar.js — dos parâmetros da corrente (milímetro) à chamada de composição (metro). */
import { ID_DA_CORRENTE } from './composicoes.js';
import { LADOS_DO_PINO, geometriaDaCorrente } from './geometria.js';

const m = (mm) => mm / 1000;
const em = ([x, z], y = 0) => [m(x), m(y), m(z)];

/* os vértices do pino torneado em y: o lathe põe o vértice k no ângulo 360°·k/lados, a partir de +x no plano [x, z] */
const poligonoDoPino = ([cx, cz], r) => Array.from({ length: LADOS_DO_PINO }, (_, k) => { const a = (2 * Math.PI * k) / LADOS_DO_PINO; return [cx + r * Math.cos(a), cz + r * Math.sin(a)]; });

export function derivar(q) {
  const g = geometriaDaCorrente(q);
  const a = {
    raioDoRolo: m(q.diametroDoRolo / 2), raioDoPino: m(q.diametroDoPino / 2), meiaLargura: m(q.larguraInterna / 2), menosMeiaLargura: -m(q.larguraInterna / 2),
    meioPino: m(g.comprimentoDoPino / 2), menosMeioPino: -m(g.comprimentoDoPino / 2), espessuraInterna: m(q.espessuraInterna), espessuraExterna: m(q.espessuraExterna),
  };
  g.trechos.forEach((t, s) => {
    const reto = t.tipo === 'reto';
    if (!reto) a[`t${s}Centro`] = t.centro.map(m);
    const repetir = (nome, total, um) => { a[`${nome}Total`] = total; if (reto) a[`${nome}Passo`] = t.passo.map((x) => m(x * um)); else a[`${nome}Graus`] = t.graus * um; };
    for (const qual of ['rolo', 'pino']) { a[`t${s}${qual}Em`] = em(t.inicio); repetir(`t${s}${qual}`, t.elos, 1); }
    for (const [qual, contorno, furos, total, ys] of [['interna', t.placaInterna, t.furosInternos, t.internas, g.yInterna], ['externa', t.placaExterna, t.furosExternos, t.externas, g.yExterna]]) {
      const base = `t${s}${qual}`;
      contorno.forEach(([u, v], k) => { a[`${base}u${k}`] = m(u); a[`${base}v${k}`] = m(v); });
      [['A', 0], ['B', 1]].forEach(([f, i]) => poligonoDoPino(furos[i], q.diametroDoPino / 2).forEach(([u, v], k) => { a[`${base}Furo${f}u${k}`] = m(u); a[`${base}Furo${f}v${k}`] = m(v); }));
      ys.forEach((y, lado) => { a[`${base}${lado}Em`] = [0, m(y), 0]; repetir(`${base}${lado}`, total, 2); });
    }
  });
  return { composicao: ID_DA_CORRENTE, argumentos: a };
}
