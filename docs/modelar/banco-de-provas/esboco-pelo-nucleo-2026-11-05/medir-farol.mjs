/* medir-farol.mjs — as medidas do gate 1 do plano esboço pelo núcleo: em cada opção do farol na chapa curva
 * (`farol-na-chapa.esboco.mjs`), a borda de fora de cada vão achada na malha que o esboço 2.0 montou, contra o contorno desenhado.
 *
 * Por vão, sai o maior desvio da borda ao desenho e do desenho à borda, em mm (`medirAbertura` de
 * `tools/fixtures/abertura-de-prova/medir.mjs`, a mesma medida do gate 2 da abertura de contorno), e, em cada canto do desenho, o
 * ângulo medido na borda a 2 mm do canto contra o desenhado, em graus. O vão do farol é medido na chapa, só com as faces dela,
 * pela borda que `bordaDoVao` acha nas arestas da malha. No pisca aberto na lente do farol (A e B) esse caminho devolve "a borda
 * não fecha" (a causa não foi investigada nesta fatia); ele, e por conferência também o farol, se medem pela borda de fora que a
 * própria operação registra (`neutro.aberturas[k].borda.fora`, a volta de vértices da malha), com as mesmas contas de distância e
 * de ângulo. As distâncias saem arredondadas a 0,001 mm e os ângulos a 0,01 grau. Também sai o hash do neutroCanonico de cada opção, que é o da receita
 * que a bancada executou.
 *
 * Uso: node docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/medir-farol.mjs [--json] */
import esboco, { contornoReto, desenhoDaOpcao, OPCOES_DO_FAROL } from './farol-na-chapa.esboco.mjs';
import { receitaDaOpcao } from '../../../../modulos/esboco-nucleo/src/opcao.js';
import { medirAbertura } from '../../../../tools/fixtures/abertura-de-prova/medir.mjs';
import { hashDoNeutro } from '../../../../tools/modelar/esboco-nucleo.mjs';

const m = (mm) => mm / 1000;
const soPartes = (neutro, partes) => ({ ...neutro, F: new Map([...neutro.F].filter(([, f]) => partes.includes(f.parte))) });
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;

/** Mede um vão de contorno `pontos` (mm, [x, z]) nas faces das `partes`: desvio e o ângulo de cada canto. */
export function medirVao(neutro, partes, pontos) {
  const malha = soPartes(neutro, partes);
  const xs = pontos.map((p) => m(p[0])); const zs = pontos.map((p) => m(p[1]));
  const interior = [[Math.min(...xs) - 0.001, Math.min(...zs) - 0.001], [Math.max(...xs) + 0.001, Math.max(...zs) + 0.001]];
  const cantos = []; let desvio = null;
  for (let k = 0; k < pontos.length; k += 1) {
    const girado = [...pontos.slice(k), ...pontos.slice(0, k)];
    const r = medirAbertura(malha, { contorno: contornoReto(girado), poligono: girado.map((p) => p.map(m)), interior, bico: girado[0].map(m) });
    if (r.erroDaBorda || !r.desvio) return { erro: r.erroDaBorda ?? `a borda saiu em ${r.voltas.fora} volta(s)` };
    desvio ??= r.desvio.fora;
    cantos.push({ canto: pontos[k].map((x) => r2(x)), desenhado: r2(r.bico.anguloDesenhado), naMalha: r2(r.bico.anguloNaMalha), diferenca: r2(r.bico.diferenca) });
  }
  return {
    daBordaAoDesenhoMm: r3(desvio.daBordaAoDesenhoMm), doDesenhoABordaMm: r3(desvio.doDesenhoABordaMm), verticesDaBorda: desvio.verticesDaBorda,
    maiorDiferencaDeCanto: Math.max(...cantos.map((c) => c.diferenca)), cantos,
  };
}

const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const norma = (a) => Math.hypot(a[0], a[1]);
function aoSegmento(p, a, b) {
  const ab = sub2(b, a); const l2 = ab[0] ** 2 + ab[1] ** 2;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l2)) : 0;
  return norma(sub2(p, [a[0] + ab[0] * t, a[1] + ab[1] * t]));
}
const angulo = (u, v) => (Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (norma(u) * norma(v))))) * 180) / Math.PI;

/** Mede um vão pela volta de vértices `volta` (ids da malha) contra o polígono desenhado `pontos` (mm, [x, z]). */
export function medirPelaBorda(neutro, volta, pontos) {
  const B = volta.map((v) => { const p = neutro.V.get(v); return [p[0] * 1000, p[2] * 1000]; });
  const lados = pontos.map((p, k) => [p, pontos[(k + 1) % pontos.length]]);
  const arestas = B.map((p, k) => [p, B[(k + 1) % B.length]]);
  const daBorda = Math.max(...B.map((p) => Math.min(...lados.map(([a, b]) => aoSegmento(p, a, b)))));
  let doDesenho = 0;
  for (const [a, b] of lados) {
    const n = Math.max(1, Math.ceil(norma(sub2(b, a)) / 0.5));
    for (let i = 0; i <= n; i += 1) { const p = [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]; doDesenho = Math.max(doDesenho, Math.min(...arestas.map(([q, r]) => aoSegmento(p, q, r)))); }
  }
  /* o ponto da borda a `s` mm do vértice k, andando no sentido `passo` */
  const aoLongo = (k, s, passo) => { let resta = s; let i = k; for (let g = 0; g < B.length; g += 1) { const j = (i + passo + B.length) % B.length; const l = norma(sub2(B[j], B[i])); if (l >= resta) return [B[i][0] + ((B[j][0] - B[i][0]) * resta) / l, B[i][1] + ((B[j][1] - B[i][1]) * resta) / l]; resta -= l; i = j; } return B[i]; };
  const cantos = pontos.map((c, k) => {
    let k0 = 0; B.forEach((p, i) => { if (norma(sub2(p, c)) < norma(sub2(B[k0], c))) k0 = i; });
    const desenhado = angulo(sub2(pontos[(k + 1) % pontos.length], c), sub2(pontos[(k - 1 + pontos.length) % pontos.length], c));
    const naMalha = angulo(sub2(aoLongo(k0, 2, 1), B[k0]), sub2(aoLongo(k0, 2, -1), B[k0]));
    return { canto: c.map(r2), desenhado: r2(desenhado), naMalha: r2(naMalha), diferenca: r2(Math.abs(naMalha - desenhado)), verticeAoCantoMm: r3(norma(sub2(B[k0], c))) };
  });
  return { daBordaAoDesenhoMm: r3(daBorda), doDesenhoABordaMm: r3(doDesenho), verticesDaBorda: B.length, maiorDiferencaDeCanto: Math.max(...cantos.map((c) => c.diferenca)), cantos };
}

export function medirFarol() {
  return esboco.opcoes.map((opcao, i) => {
    const { neutro } = receitaDaOpcao(opcao);
    const des = desenhoDaOpcao(OPCOES_DO_FAROL[i]);
    return {
      opcao: opcao.titulo, faces: neutro.F.size, neutro: hashDoNeutro(neutro).slice(0, 16),
      farol: medirVao(neutro, ['chapa'], des.farol),
      farolPeloRegistro: medirPelaBorda(neutro, neutro.aberturas[0].borda.fora, des.farol),
      pisca: medirPelaBorda(neutro, neutro.aberturas[1].borda.fora, des.seta),
      piscaNaLente: des.setaNaLente,
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = medirFarol();
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else for (const o of r) {
    for (const vao of ['farol', 'farolPeloRegistro', 'pisca']) {
      const v = o[vao];
      console.log(`${o.opcao} | ${vao}${vao === 'pisca' && o.piscaNaLente ? ' (na lente)' : ''}: borda ao desenho ${v.daBordaAoDesenhoMm} mm, desenho à borda ${v.doDesenhoABordaMm} mm, ${v.cantos.length} cantos, maior diferença de ângulo ${v.maiorDiferencaDeCanto} grau`);
    }
    console.log(`${o.opcao} | ${o.faces} faces, neutro ${o.neutro}`);
  }
}
