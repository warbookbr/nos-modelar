/* esboco-blocagem-furo.mjs — o fundo que o furo passante de uma forma de família deixa ver nas vistas, medido na blocagem.
 *
 * A N2 só tem sólidos de seção convexa, e a forma de família (a roda, com o furo do cubo) entra no andaime como o casco convexo das
 * seções dela: o furo fecha (perda `superficie`). O desenho das formas não o fecha, e quem olha a peça ao longo do eixo do furo vê o
 * fundo por ele, onde a blocagem pinta o casco. Se nada mais cobre aquele pedaço (o eixo e o garfo cobrem uma parte), a silhueta
 * da blocagem tem pixels a mais que a do desenho, e o gate das silhuetas mede essa diferença sobre a silhueta inteira.
 *
 * `furosAbertos` mede, por forma com furo e por vista, a área do furo que fica sem cobertura de nenhuma outra forma, em fração da
 * silhueta da blocagem naquela vista (a mesma conta de pixels do gate). A cobertura é a projeção das faces dos outros volumes na
 * vista; um volume de outra forma que também tem furo cobre só fora do furo dela, porque o desenho dela também deixa ver o fundo.
 * O furo é visto em toda vista cujo olho passa pelas duas bocas dele: ao longo do eixo, a boca inteira; de través, nenhuma. */
import { VISTAS } from '../../modulos/esboco/src/index.js';
import { desenharBlocagem } from '../../modulos/esboco/src/desenho-da-blocagem.js';
import { CAMADA_DA_SILHUETA, mascaraDaCamada } from './esboco-silhueta.mjs';

const LADOS_DA_BOCA = 96;
const AMOSTRAS_POR_LADO = 48;
const EIXOS = ['x', 'y', 'z'];

const colunasDe = (m) => [0, 1, 2].map((i) => [m[0][i], m[1][i], m[2][i]]);

/* A boca do furo de uma forma de família em coordenadas do mundo: as duas bocas (o círculo do furo no começo e no fim do eixo
   dela, `LADOS_DA_BOCA` pontos cada) e o eixo. Null quando a forma não tem furo ou o eixo dela não fica sobre um eixo do mundo
   (o casco do tradutor também não existe nesse caso). */
function furoNoMundo(forma) {
  const g = forma.geometria;
  if (!g.furo || !Array.isArray(g.secoes) || g.secoes.length < 2) return null;
  const cols = colunasDe(g.matriz);
  const e = EIXOS.indexOf(g.eixo);
  const [u, v] = g.eixosDoPerfil.map((n) => EIXOS.indexOf(n));
  const aoMundo = (w, pu, pv) => {
    const local = [0, 0, 0];
    local[e] = w; local[u] = pu; local[v] = pv;
    return [0, 1, 2].map((r) => g.centro[r] + local[0] * cols[0][r] + local[1] * cols[1][r] + local[2] * cols[2][r]);
  };
  const boca = (w) => Array.from({ length: LADOS_DA_BOCA }, (_, i) => {
    const a = (2 * Math.PI * i) / LADOS_DA_BOCA;
    return aoMundo(w, g.furo.centro[0] + g.furo.raio * Math.cos(a), g.furo.centro[1] + g.furo.raio * Math.sin(a));
  });
  return { bocas: [boca(g.secoes[0].w), boca(g.secoes[g.secoes.length - 1].w)], raio: g.furo.raio };
}

function dentroDoConvexo(p, poli) {
  let lado = 0;
  for (let i = 0; i < poli.length; i++) {
    const a = poli[i]; const b = poli[(i + 1) % poli.length];
    const c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (c === 0) continue;
    if (lado === 0) lado = Math.sign(c); else if (Math.sign(c) !== lado) return false;
  }
  return true;
}

function dentroDoTriangulo(p, t) {
  const d1 = (p[0] - t[1][0]) * (t[0][1] - t[1][1]) - (t[0][0] - t[1][0]) * (p[1] - t[1][1]);
  const d2 = (p[0] - t[2][0]) * (t[1][1] - t[2][1]) - (t[1][0] - t[2][0]) * (p[1] - t[2][1]);
  const d3 = (p[0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (p[1] - t[0][1]);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

const caixaDe = (pts) => ({
  min: [Math.min(...pts.map((q) => q[0])), Math.min(...pts.map((q) => q[1]))],
  max: [Math.max(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[1]))],
});
const sobrepoe = (a, b) => a.min[0] <= b.max[0] && b.min[0] <= a.max[0] && a.min[1] <= b.max[1] && b.min[1] <= a.max[1];

/* O furo visto na vista: as duas bocas projetadas (a luz é o que as duas deixam passar, a interseção delas). */
function luzNaVista(furo, projetar) {
  const bocas = furo.bocas.map((b) => b.map(projetar));
  return { bocas, caixa: caixaDe(bocas[0]) };
}
const naLuz = (luz, p) => luz.bocas.every((b) => dentroDoConvexo(p, b));

/**
 * Por forma de família com furo que entrou no andaime como casco, e por vista da análise onde a blocagem deixa o furo coberto, a
 * fração da silhueta da blocagem que o furo descoberto ocupa. Devolve `[{ id, vista, fracao }]`, só as frações maiores que zero,
 * em ordem de forma e de vista.
 * @param {{ dados, traducao, blocagem, painel }} entrada o `dados` das formas resolvidas, a tradução, a blocagem compilada e o
 * painel da opção (`{ titulo, nota, ocultar, lista, malha, volumes }`) que o desenho da blocagem recebe, dado por uma função que só
 * roda quando alguma vista tem furo a medir
 */
export function furosAbertos({ dados, traducao, blocagem, painel: montarPainel }) {
  let painel = null;
  const comCasco = new Set(traducao.perdas.filter((p) => p.aproximacao === 'familia-como-casco').map((p) => p.id));
  const furos = dados.formas
    .filter((f) => comCasco.has(f.id) && traducao.tabela[f.id] !== undefined)
    .map((f) => ({ id: f.id, volume: traducao.tabela[f.id], furo: furoNoMundo(f) }))
    .filter((f) => f.furo !== null);
  if (furos.length === 0) return [];
  const faces = blocagem.malha.faces;
  const vertices = blocagem.malha.vertices;
  const resultado = [];
  for (const [vista, { p: projetar }] of Object.entries(VISTAS)) {
    const luzes = furos.map((f) => ({ ...f, luz: luzNaVista(f.furo, projetar) }));
    const medidas = [];
    for (const f of luzes) {
      const { min, max } = f.luz.caixa;
      /* os triângulos projetados dos volumes que podem cobrir a luz, de todos menos o da própria forma */
      const triangulos = [];
      for (const face of faces) {
        if (face.volume === f.volume) continue;
        const t = face.vertices.map((i) => projetar(vertices[i]));
        if (sobrepoe(caixaDe(t), f.luz.caixa)) triangulos.push({ t, volume: face.volume });
      }
      const donos = new Map(luzes.filter((o) => o.volume !== f.volume).map((o) => [o.volume, o.luz]));
      const celula = ((max[0] - min[0]) / AMOSTRAS_POR_LADO) * ((max[1] - min[1]) / AMOSTRAS_POR_LADO);
      let abertas = 0;
      for (let i = 0; i < AMOSTRAS_POR_LADO; i++) {
        for (let j = 0; j < AMOSTRAS_POR_LADO; j++) {
          const p = [min[0] + ((i + 0.5) * (max[0] - min[0])) / AMOSTRAS_POR_LADO, min[1] + ((j + 0.5) * (max[1] - min[1])) / AMOSTRAS_POR_LADO];
          if (!naLuz(f.luz, p)) continue;
          const coberta = triangulos.some(({ t, volume }) => dentroDoTriangulo(p, t) && !(donos.has(volume) && naLuz(donos.get(volume), p)));
          if (!coberta) abertas++;
        }
      }
      if (abertas > 0) medidas.push({ id: f.id, area: abertas * celula });
    }
    if (medidas.length === 0) continue;
    painel ??= montarPainel();
    const desenho = desenharBlocagem({ vista, paineis: [painel] }, CAMADA_DA_SILHUETA);
    const silhueta = mascaraDaCamada(desenho.camada).area;
    for (const m of medidas) resultado.push({ id: m.id, vista, fracao: (m.area * desenho.escala * desenho.escala) / silhueta });
  }
  return resultado;
}
