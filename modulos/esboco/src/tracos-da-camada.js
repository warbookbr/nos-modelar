/* Os traços de uma camada, tirados do que se vê.

   O desenho das formas traça por forma: cada uma leva a silhueta e o vinco dela, e o teste de profundidade da camada decide o resto num
   pixel só. Duas formas que se encostam no mesmo plano ficam com a emenda traçada (um risco no meio da face da caixa), e uma forma que
   atravessa a outra (a roda que entra na carroceria, o pino que passa pela chapa) fica sem a linha onde as duas superfícies se cruzam,
   porque nenhuma das duas tem aresta ali. Esta passada refaz os traços da camada pela mesma definição que a medida do desenho usa para
   a referência: aresta é onde a superfície que se vê muda, na profundidade ou na normal (mais de 30 graus).

   Com as faces já projetadas da camada (cada ponto `[x, y, z]`, x e y em pixel do quadro e z em milímetro ao longo do olho, com o viés de
   desempate da forma, que sai daqui) volta-se ao milímetro (x e y divididos pelos pixels por milímetro), e então: os traços que a forma já
   tem e os cruzamentos entre as formas são as candidatas; o que as faces de frente de todas as formas escondem sai, exatamente
   (`oclusaoExata`); e o que fica só vale onde a superfície vista de um lado da linha difere da do outro (`arestasPelaVizinhanca`). As
   formas assim refeitas saem com `visiveis` e sem perfil, e o desenhista pinta os traços delas sem teste de profundidade (ver `camada.js`).

   Só as formas opacas entram, como as faces que escondem e como as que levam traço: a forma translúcida segue o que sempre fez. */
import earcut from 'earcut';
import { COSSENO_DO_VINCO, DEGRAU_DE_PROFUNDIDADE, ESPACO_DAS_AMOSTRAS, FOLGA_DO_VINCO } from './limites-do-desenho.js';
import { cruzamentosEntreVolumes } from './intersecao-de-volumes.js';
import { oclusaoExata } from './oclusao-das-linhas.js';
import { arestasPelaVizinhanca } from './vizinhanca-na-tela.js';

/* a camada é a vista de frente de um plano z: o olho está em +z, e a projeção é o próprio plano x, y */
const OLHO = [0, 0, 1];
const VISTA = { p: (q) => [q[0], q[1]] };
const COORDENADA_DA_SOLDA = 1e4;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* A normal do polígono (Newell) de frente para o olho, ou null se ele não tem área na tela. */
function normalDe(pts) {
  let nx = 0; let ny = 0; let nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const m = Math.hypot(nx, ny, nz);
  if (!(m > 1e-9)) return null;
  const n = [nx / m, ny / m, nz / m];
  return n[2] < 0 ? n.map((x) => -x) : n;
}

/* Refaz os traços das formas opacas de `formas` (o que `formasDoPainel` devolve), no lugar. `exatas`: as mesmas formas com os pontos sem
   arredondar e sem viés (o que `formasDoPainel` monta para isto); `pxPorMm`: pixels do quadro por milímetro. */
export function refazerTracosPeloQueSeVe(formas, exatas, { pxPorMm }) {
  const indices = formas.map((f, i) => i).filter((i) => formas[i].opacidade >= 1 && formas[i].visiveis !== true);
  if (indices.length === 0) return;
  const alvo = indices.map((i) => exatas[i]);
  const noMm = (q) => [q[0] / pxPorMm, q[1] / pxPorMm, q[2]];
  const chave = (p) => `${Math.round(p[0] * COORDENADA_DA_SOLDA)},${Math.round(p[1] * COORDENADA_DA_SOLDA)},${Math.round(p[2] * COORDENADA_DA_SOLDA)}`;

  const frentes = [];
  const triangulos = [];
  alvo.forEach((forma, volume) => {
    for (const f of forma.faces) {
      const aneis = [f.c, ...(f.h ?? [])].map((a) => {
        const q = a.map((p) => noMm(p));
        if (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1] && q[0][2] === q[q.length - 1][2]) q.pop();
        return q;
      });
      const n = normalDe(aneis[0]);
      if (!n || !(n[2] > 1e-6)) continue;
      frentes.push({ pts: aneis[0], ...(aneis.length > 1 ? { furos: aneis.slice(1) } : {}), n });
      const todos = aneis.flat();
      const buracos = []; let k = aneis[0].length;
      for (const fu of aneis.slice(1)) { buracos.push(k); k += fu.length; }
      const idx = earcut(todos.flatMap((p) => [p[0], p[1]]), buracos, 2);
      for (let i = 0; i + 2 < idx.length; i += 3) {
        const p = [todos[idx[i]], todos[idx[i + 1]], todos[idx[i + 2]]];
        const nt = normalDe(p);
        if (nt && nt[2] > 1e-6) triangulos.push({ p, n: nt, volume, ids: p.map(chave) });
      }
    }
  });
  if (frentes.length === 0) return;

  /* a escala do quadro em milímetro: a maior extensão das faces */
  const xs = frentes.flatMap((f) => f.pts.map((p) => p[0])); const ys = frentes.flatMap((f) => f.pts.map((p) => p[1]));
  const extensao = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-9);
  const limite = COSSENO_DO_VINCO - FOLGA_DO_VINCO;
  const { visiveis, superficieEm } = oclusaoExata(frentes, VISTA, OLHO, {});
  const vizinhanca = { delta: ESPACO_DAS_AMOSTRAS * extensao, passo: extensao / 60, cosseno: limite, degrau: DEGRAU_DE_PROFUNDIDADE };

  /* o cruzamento de uma forma com a superfície de outra é aresta quando as normais passam do vinco: de qual forma ele fica não importa */
  const cruzamentos = cruzamentosEntreVolumes(triangulos).filter(({ de, com }) => dot(triangulos[de].n, triangulos[com].n) < limite);
  const doCruzamento = new Map();
  for (const { a, b, de, com } of cruzamentos) {
    const v = Math.max(triangulos[de].volume, triangulos[com].volume);
    if (!doCruzamento.has(v)) doCruzamento.set(v, []);
    doCruzamento.get(v).push([a, b]);
  }

  alvo.forEach((forma, volume) => {
    const candidatas = [];
    for (const t of forma.tracos) for (let i = 0; i + 1 < t.length; i++) candidatas.push([noMm(t[i]), noMm(t[i + 1])]);
    candidatas.push(...(doCruzamento.get(volume) ?? []));
    const linhas = arestasPelaVizinhanca(visiveis(candidatas), VISTA, superficieEm, vizinhanca);
    /* de volta à camada: arredondados como os pontos dela, com o viés da forma */
    const viesDe = formas[indices[volume]].vies;
    const ponto = (q) => [Math.round(q[0] * pxPorMm * 100) / 100, Math.round(q[1] * pxPorMm * 100) / 100, Math.round((q[2] + viesDe) * 1000) / 1000];
    const destino = formas[indices[volume]];
    destino.tracos = linhas.map(([a, b]) => [ponto(a), ponto(b)]);
    delete destino.inclinacoes;
    destino.visiveis = true;
  });
}
