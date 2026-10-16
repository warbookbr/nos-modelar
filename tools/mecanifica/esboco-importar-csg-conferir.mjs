/* Conferência numérica da importação de `.csg`: o volume que o esboço importado desenha contra a malha que o próprio OpenSCAD
   exporta do mesmo objeto (`openscad -o x.stl x.scad`, ou `openscad -o x.stl x.csg`, que ele também lê).

   A malha do OpenSCAD é posta no quadro do esboço pela mesma rotação da importação (`quadroDoEsboco`). O sólido do esboço é a
   união das formas visíveis, cada uma com o recorte aplicado, como `src/autoria/solido-do-esboco.js` o entrega (a Manifold). O
   resultado é o volume de cada lado, o da interseção e o da união, e a razão interseção/união (IoU). Não decide a forma: diz o
   quanto a tradução se afastou do que o OpenSCAD calcula, e onde o desvio é grande o `--descrever` e a composta mostram o porquê. */
import { carregarManifold } from '../../procedural/nucleo/manifold.js';
import { criarContextoDeSolidos, criarSolidosDoEsboco, ErroDoSolido } from '../../src/autoria/solido-do-esboco.js';
import { formasResolvidas } from '../../modulos/esboco/src/formas-resolvidas.js';

/* STL de texto (o que o OpenSCAD grava) ou binário: os triângulos como listas de três pontos. */
export function lerStl(conteudo) {
  const buf = Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(conteudo);
  const cabeca = buf.subarray(0, 256).toString('latin1');
  const triangulos = [];
  if (/^\s*solid/.test(cabeca) && /facet/.test(cabeca)) {
    let atual = [];
    for (const m of buf.toString('latin1').matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) {
      atual.push([Number(m[1]), Number(m[2]), Number(m[3])]);
      if (atual.length === 3) { triangulos.push(atual); atual = []; }
    }
    return triangulos;
  }
  const n = buf.readUInt32LE(80);
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12;
    triangulos.push([0, 1, 2].map((k) => [0, 1, 2].map((j) => buf.readFloatLE(o + k * 12 + j * 4))));
  }
  return triangulos;
}

/* Os triângulos soldados num vértice por ponto (à milésima de micrômetro), com os índices. */
function soldar(triangulos, matriz) {
  const indice = new Map();
  const vertices = [];
  const tris = triangulos.map((t) => t.map((p) => {
    const q = [0, 1, 2].map((i) => matriz[i][0] * p[0] + matriz[i][1] * p[1] + matriz[i][2] * p[2] + matriz[i][3]);
    const chave = q.map((x) => Math.round(x * 1e5)).join(',');
    if (!indice.has(chave)) { indice.set(chave, vertices.length); vertices.push(q); }
    return indice.get(chave);
  }));
  return { vertices, triangulos: tris.filter(([a, b, c]) => a !== b && b !== c && a !== c) };
}

/**
 * @param {object} esboco o esboço importado (o objeto, não o texto)
 * @param {Array} triangulos a malha do OpenSCAD, no quadro do OpenSCAD (`lerStl`)
 * @param {number[][]} matriz `quadroDoEsboco(...)`: a rotação do quadro do OpenSCAD ao do esboço
 */
export async function conferirComMalha(esboco, triangulos, matriz) {
  await carregarManifold();
  const { vertices, triangulos: tris } = soldar(triangulos, matriz);
  if (tris.length === 0) throw new Error('a malha de referência não tem triângulos');
  const min = [0, 1, 2].map((i) => Math.min(...vertices.map((v) => v[i])));
  const max = [0, 1, 2].map((i) => Math.max(...vertices.map((v) => v[i])));
  const contexto = criarContextoDeSolidos({ origem: min.map((m, i) => (m + max[i]) / 2) });
  try {
    const referencia = contexto.daMalha(vertices, tris, 'a malha do OpenSCAD');
    /* O que a blocagem da receita recusa (cilindro de 6 lados, por exemplo) ou o esboço vazio não derrubam a conferência: a forma
       sem sólido sai em `formasSemMedida`, com o motivo, e o resto é medido. Quem tem recorte e perde um cortador também sai. */
    const formasSemMedida = [];
    const visiveis = [];
    const formas = esboco?.opcoes?.[0]?.formas ?? [];
    if (formas.length === 0) {
      formasSemMedida.push({ id: null, tipo: null, codigo: 'esboco-vazio', motivo: 'o esboço importado não tem forma alguma; o volume dele é zero' });
    } else {
      const dados = formasResolvidas(esboco, 1);
      const solidos = criarSolidosDoEsboco(dados, { contexto });
      for (const f of dados.formas.filter((x) => !x.cortador && !x.oculto)) {
        try {
          visiveis.push(solidos.solido(f.id));
        } catch (e) {
          if (!(e instanceof ErroDoSolido)) throw e;
          formasSemMedida.push({ id: f.id, tipo: f.tipo, codigo: e.codigo, motivo: e.message });
        }
      }
    }
    const importado = visiveis.length > 0 ? contexto.uniao(visiveis) : null;
    const comum = importado ? contexto.volume(contexto.intersecao([referencia, importado])) : 0;
    const volumeReferencia = contexto.volume(referencia);
    const volumeImportado = importado ? contexto.volume(importado) : 0;
    const uniao = volumeReferencia + volumeImportado - comum;
    const r = (x) => Math.round(x * 1000) / 1000;
    return {
      volumeDoOpenScad_mm3: r(volumeReferencia),
      volumeDoEsboco_mm3: r(volumeImportado),
      volumeComum_mm3: r(comum),
      soNoOpenScad_mm3: r(volumeReferencia - comum),
      soNoEsboco_mm3: r(volumeImportado - comum),
      iou: Math.round((comum / uniao) * 10000) / 10000,
      caixaDoOpenScad: { min: min.map(r), max: max.map(r) },
      formasSemMedida,
    };
  } finally {
    contexto.liberar();
  }
}
