/* abertura-por-contorno.js — PROTÓTIPO da fatia 1 do plano `docs/modelar/planos/2026-11-05-abertura-de-contorno-livre.md`, ainda
   sem registro como operação: nem `nucleo.js` nem `uso-operacoes.js` o conhecem, e nenhuma receita do acervo o usa. Guarda as
   duas técnicas que a fatia 1 mediu na peça de teste `tools/fixtures/abertura-de-prova/`, e a medida e a decisão estão em
   `docs/modelar/banco-de-provas/abertura-de-contorno-2026-11-05/README.md`.

   O contorno é o de `curva2d.js` (`{ inicio, trechos }`, com reto, arco, arcoTangente, concordancia e spline), desenhado na
   vista superior: [u, v] vai a x = u e z = v, e a projeção corre em y. As outras vistas, o canto arredondado por ponto e as
   recusas (contorno que não fecha, que se cruza, que sai da chapa) são da fatia 2.

   O CORTE DEPOIS DA SUBDIVISÃO (`passosDoCorteDepois`). O contorno vira o prisma de uma `extrusao` em y, mais alto que a chapa
   nos dois sentidos, e o `subtrair` do núcleo (a booleana da Manifold, em `booleanas.js`) tira o prisma da chapa fechada pela
   espessura. A parede do vão são as laterais do prisma que sobram dentro da chapa. Medido: a chapa sai fechada e manifold e a
   borda segue o contorno, mas a costura passa a micrômetros de vértices e arestas da malha fina e deixa triângulo sem área e
   lasca junto da borda em toda posição do contorno que a fatia mediu.

   O CORTE DA GAIOLA ANTES DA SUBDIVISÃO (`cortarGaiola`). Cada face da gaiola, vista de cima, perde a parte que cai dentro do
   contorno (a diferença de polígonos do Clipper2, pela CrossSection da Manifold); a face que sobra inteira fica como estava, a
   que cai inteira dentro some, e a cortada vira pedaços convexos (`pedacos-convexos.js`), porque deixada como polígono côncavo
   ela dobrou a superfície na subdivisão em todas as variantes medidas. Os pontos novos (os do contorno e os encontros dele com
   as arestas da gaiola) ganham nome `<prefixo><k>` na ordem em que o contorno os percorre, a altura que `alturaEm(x, z)` dá (a
   da superfície da chapa sem vão) e a mesma soldagem nas duas faces que dividem uma aresta. A subdivisão da gaiola cortada dá a
   borda do vão como borda livre da chapa, e a espessura levanta a parede dela pela normal. Medido: sem triângulo sem área nem
   lasca, mas a superfície se dobra (e a subdivisão recusa) em parte das posições do contorno, e onde ela sai a pele em volta do
   vão fica a milímetros da chapa sem vão, porque os pontos novos são pontos de controle; medidos, dobram a superfície. */
import { manifoldCarregada, erroDaCargaDaManifold } from '../manifold.js';
import { triangularPerfil } from '../perfil2d.js';
import { pedacosConvexos } from '../pedacos-convexos.js';

export const VISTAS_DO_PROTOTIPO = Object.freeze(['superior']);

function conferirVista(vista) {
  if (!VISTAS_DO_PROTOTIPO.includes(vista)) throw new TypeError(`abertura por contorno: o protótipo só conhece a vista ${VISTAS_DO_PROTOTIPO.map((v) => `'${v}'`).join(', ')}, e veio ${JSON.stringify(vista)}`);
}

/** passosDoCorteDepois({ chapa, contorno, vista, alcance, segmentosArco, segmentosSpline, idPrisma, idCorte }) -> passos
 *  Os dois passos do corte depois da subdivisão: a `extrusao` do contorno com origem `idPrisma`, de `alcance[0]` a
 *  `alcance[1]` no eixo da vista, e o `subtrair` com origem `idCorte`, que tira o prisma da seleção `chapa`. */
export function passosDoCorteDepois({ chapa, contorno, vista = 'superior', alcance, segmentosArco = 4, segmentosSpline, idPrisma, idCorte }) {
  conferirVista(vista);
  if (!Array.isArray(alcance) || alcance.length !== 2 || !(alcance[1] > alcance[0])) throw new TypeError('abertura por contorno: alcance precisa ser [de, ate] no eixo da vista, com ate maior que de');
  const prisma = { origemId: idPrisma, perfil: { contorno }, segmentosArco, altura: alcance[1] - alcance[0], em: [0, alcance[0], 0] };
  if (segmentosSpline != null) prisma.segmentosSpline = segmentosSpline;
  return [
    ['extrusao', prisma],
    ['subtrair', { origemId: idCorte, solidos: [chapa, { origem: { op: 'extrusao', id: idPrisma } }] }],
  ];
}

const areaComSinal = (p) => { let s = 0; for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/* a posição do ponto ao longo do contorno: o índice do lado e a fração nele, para dar nome aos pontos novos na ordem do contorno */
function posicaoNoContorno(p, poligono) {
  let melhor = null;
  for (let k = 0; k < poligono.length; k++) {
    const a = poligono[k], b = poligono[(k + 1) % poligono.length];
    const ab = [b[0] - a[0], b[1] - a[1]]; const l2 = ab[0] ** 2 + ab[1] ** 2;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l2));
    const d = Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t);
    if (!melhor || d < melhor.d - 1e-12) melhor = { d, chave: k + t };
  }
  return melhor;
}

/** cortarGaiola({ pontos, faces, poligono, alturaEm, prefixo, tolerancia }) -> { pontos, faces, borda, novos, bico, cortadas, removidas }
 *  `pontos` é o dicionário { nome: [x, y, z] } da gaiola, `faces` a lista de faces por nome, `poligono` o contorno discretizado
 *  em [x, z] (o primeiro ponto é o `inicio` do contorno, que a peça de teste usa como bico) e `alturaEm(x, z)` a altura da
 *  superfície em que os pontos novos ficam. As faces que o contorno não toca saem primeiro, na ordem de antes, e os pedaços das
 *  cortadas depois, na ordem das faces de origem. `borda` são os nomes da borda do vão na ordem do contorno. */
export function cortarGaiola({ pontos, faces, poligono, alturaEm, prefixo = 'corte', tolerancia = 1e-7 }) {
  const wasm = manifoldCarregada();
  if (!wasm) throw new TypeError(`abertura por contorno: precisa da Manifold, que não carregou: ${erroDaCargaDaManifold()?.message ?? 'motivo desconhecido'}`);
  const { CrossSection: CS } = wasm;
  const contorno = areaComSinal(poligono) > 0 ? poligono : [...poligono].reverse();
  const cortador = new CS([contorno], 'EvenOdd');
  const novos = [];   // { p: [x, z] }
  const nomeDoNovo = (p) => {
    for (const [k, q] of novos.entries()) if (distancia(p, q.p) <= tolerancia) return k;
    /* o ponto do contorno entra exato; o encontro com a aresta da gaiola fica como o Clipper2 o dá */
    const doContorno = poligono.find((q) => distancia(p, q) <= tolerancia);
    novos.push({ p: doContorno ? [...doContorno] : [...p] });
    return novos.length - 1;
  };
  const inteiras = []; const pedacos = []; const cortadas = []; const removidas = [];
  try {
    faces.forEach((face, f) => {
      const q = face.map((n) => [pontos[n][0], pontos[n][2]]);
      const sentido = Math.sign(areaComSinal(q));
      const qAnti = sentido > 0 ? q : [...q].reverse();
      const secao = new CS([qAnti], 'EvenOdd');
      const resto = secao.subtract(cortador);
      try {
        const area = resto.area(); const inteira = Math.abs(areaComSinal(q));
        if (resto.isEmpty()) { removidas.push(f); return; }
        /* o Clipper2 trabalha numa grade inteira, e a área da face que o contorno não toca volta com erro da ordem dela */
        if (Math.abs(area - inteira) <= 1e-6 * inteira) { inteiras.push(face); return; }
        cortadas.push(f);
        const aneis = resto.toPolygons();
        if (aneis.some((a) => areaComSinal(a) < 0)) throw new TypeError(`abertura por contorno: o contorno cai inteiro dentro da face ${f} da gaiola, e o protótipo não abre furo dentro de uma face só`);
        for (const anel of aneis) {
          /* cada canto do anel volta a um canto da face (pelo nome) ou a um ponto novo (pelo índice) */
          const rotulos = anel.map((p) => {
            const k = q.findIndex((c) => distancia(p, c) <= tolerancia);
            return k >= 0 ? { nome: face[k], p: q[k] } : { novo: nomeDoNovo(p) };
          });
          const posicoes = rotulos.map((r) => (r.nome ? r.p : novos[r.novo].p));
          const tri = triangularPerfil({ componentes: [{ externo: posicoes, furos: [] }] });
          const pos = (g) => [tri.pontos[g][0], tri.pontos[g][1], 0];
          for (const peca of pedacosConvexos(pos, tri.triangulos, [0, 0, 1])) {
            const lista = peca.map((g) => rotulos[g]);
            pedacos.push({ origem: f, lista: sentido > 0 ? lista : lista.reverse() });
          }
        }
      } finally { secao.delete(); resto.delete(); }
    });
  } finally { cortador.delete(); }
  /* os nomes dos pontos novos, na ordem em que o contorno os percorre a partir do primeiro ponto dele */
  const ordem = novos.map((n, k) => ({ k, chave: posicaoNoContorno(n.p, poligono).chave })).sort((a, b) => a.chave - b.chave || a.k - b.k);
  const nomeDe = new Map(ordem.map(({ k }, j) => [k, `${prefixo}${j}`]));
  const saida = { ...pontos };
  for (const { k } of ordem) { const n = novos[k]; saida[nomeDe.get(k)] = [n.p[0], alturaEm(n.p[0], n.p[1]), n.p[1]]; }
  const nomeDoRotulo = (r) => (r.nome ?? nomeDe.get(r.novo));
  const facesSaida = [...inteiras.map((f) => [...f]), ...pedacos.map(({ lista }) => lista.map(nomeDoRotulo))];
  /* os pontos que nenhuma face usa mais (os de dentro do vão) saem da gaiola */
  const usados = new Set(facesSaida.flat());
  for (const nome of Object.keys(saida)) if (!usados.has(nome)) delete saida[nome];
  const borda = ordem.map(({ k }) => nomeDe.get(k));
  const bico = borda.find((nome) => distancia([saida[nome][0], saida[nome][2]], poligono[0]) <= tolerancia) ?? null;
  return { pontos: saida, faces: facesSaida, borda, novos: borda, bico, cortadas, removidas };
}

/** alturaDaMalha(vertices, faces) -> (x, z) => y: a altura da malha onde a vertical por (x, z) a cruza, pela face que contém o
 *  ponto visto de cima (cada face em leque a partir do primeiro canto). Para a superfície de uma chapa sem dobra sobre si, que a
 *  vertical cruza uma vez só. */
export function alturaDaMalha(vertices, faces) {
  const tris = [];
  for (const f of faces) for (let k = 1; k + 1 < f.length; k++) tris.push([vertices[f[0]], vertices[f[k]], vertices[f[k + 1]]]);
  return (x, z) => {
    for (const [a, b, c] of tris) {
      const d = (b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2]);
      if (d === 0) continue;
      const s = ((x - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (z - a[2])) / d;
      const t = ((b[0] - a[0]) * (z - a[2]) - (x - a[0]) * (b[2] - a[2])) / d;
      if (s >= -1e-12 && t >= -1e-12 && s + t <= 1 + 1e-12) return a[1] + s * (b[1] - a[1]) + t * (c[1] - a[1]);
    }
    throw new TypeError(`abertura por contorno: o ponto [${x}, ${z}] fica fora da chapa vista de cima`);
  };
}
