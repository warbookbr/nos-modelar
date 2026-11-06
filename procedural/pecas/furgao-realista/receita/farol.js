/* furgao-realista, receita/farol.js — os faróis dianteiros e os piscas (forma A de 2026-11-05, `referencias/farol-dianteiro.esboco.json`):
 * cada farol é um vão aberto na chapa pronta por `aberturaPorContorno` na vista frontal ([x, y] em mm, na camada da frente), com a lente
 * recuada, e o pisca é um segundo vão aberto na lente do farol, o contorno dele cortado pelo do farol recuado `pisca_margem` (o vão não
 * pode encostar na borda do sólido que corta). O lado esquerdo (+x) leva o desenho, e o direito o espelha. */
import { cortarPorConvexo } from './geometria.js';

/** O contorno fechado de `curva2d` a partir de pontos [x, y] em mm, levados por `esc` (m, de mm a metro). `raios` é um número para todos os
 *  cantos, ou uma função do ponto que dá o raio (mm) do canto dele; raio 0 deixa o canto vivo. */
export const contornoPorRetos = (pontos, esc, raios = 0) => {
  const raio = (p) => (typeof raios === 'function' ? raios(p) : raios);
  return {
    inicio: pontos[0].map(esc),
    trechos: [...pontos.slice(1), pontos[0]].flatMap((p) => [{ reto: p.map(esc) }, ...(raio(p) ? [{ concordancia: esc(raio(p)) }] : [])]),
  };
};

/** Os dois faróis e os dois piscas, em mm [x, y]: o esquerdo (+x) é o desenho da TABELA e o direito o espelho, na ordem invertida.
 *  O pisca é o retângulo da ponta de fora (de `pisca_x_dentro` à borda de fora do farol) cortado pelo farol recuado `pisca_margem`; os
 *  cantos de fora dele acompanham a concordância do farol, menos a margem. */
export function derivarFarois(T) {
  const espelhar = (pts) => pts.map(([x, y]) => [-x, y]).reverse();
  const f = T.farol_perfil;
  const xs = f.map((p) => p[0]); const ys = f.map((p) => p[1]);
  const xFora = Math.max(...xs); const yBase = Math.min(...ys); const yTopo = Math.max(...ys);
  const retangulo = [[T.pisca_x_dentro, yBase], [xFora, yBase], [xFora, yTopo], [T.pisca_x_dentro, yTopo]];
  const pisca = cortarPorConvexo(retangulo, f, T.pisca_margem);
  const raioPisca = (p) => (p[0] > T.pisca_x_dentro + 1 ? Math.max(0, T.farol_raio - T.pisca_margem) : 0);
  return [
    { lado: 'Esquerdo', farol: f, pisca, raioPisca },
    { lado: 'Direito', farol: espelhar(f), pisca: espelhar(pisca), raioPisca: (p) => raioPisca([-p[0], p[1]]) },
  ];
}

/** A grade, em mm [x, y]: o retângulo de `grade_meia_largura` de lado a lado, do topo do para-choque, menos `grade_embutido` (por trás da pele dele), a `grade_topo_y`, com os
 *  cantos de cima de raio `grade_raio_topo` e os de baixo vivos; e as barras, uma por altura de `grade_barras_y`. */
export function derivarGrade(T) {
  const w = T.grade_meia_largura; const y0 = T.secao_parachoque_dianteiro.at(-1)[1] - T.grade_embutido; const y1 = T.grade_topo_y;
  const contorno = [[-w, y0], [w, y0], [w, y1], [-w, y1]];
  return { contorno, raio: (p) => (p[1] === y1 ? T.grade_raio_topo : 0), barras: T.grade_barras_y.map((y) => ({ y })) };
}
