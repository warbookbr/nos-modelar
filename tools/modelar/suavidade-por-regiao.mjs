#!/usr/bin/env node
/* suavidade-por-regiao.mjs — o índice de suavidade de cada região da chapa: quanto a curvatura varia por área, um número por região,
 * para comparar uma rodada com a outra.
 *
 * POR QUE ELE EXISTE. A zebra, o pente e o mapa de desvio dizem onde a chapa ondula; para dizer se a rodada 2 ficou mais lisa que a 1
 * falta um número por região que não dependa de quem olha. É medida, não nota: não aprova forma, e a chapa que tem de ter curvatura
 * variando (uma transição de raio pedida) também sobe o número.
 *
 * A FÓRMULA. Em cada vértice, as curvaturas principais k1 >= k2 (1/m, convexa positiva) saem de um ajuste quadrático local da altura
 * sobre o plano tangente (`ajusteLocal` de `continuidade-nas-emendas.mjs`), nos vértices da MESMA região a até `--raio` mm (padrão 40) de
 * normal que concorda com a do vértice, com o plano refeito pela normal ajustada. Em cada triângulo da região (a face partida em leque)
 * k1 e k2 são interpolados linearmente pelos três vértices, e o gradiente de cada um é constante no triângulo. A energia da região é
 *   E = soma, nos triângulos, de área × (|grad k1|² + |grad k2|²), em m² × (1/m²)²,
 * e o ÍNDICE é a raiz da média por área: indice = sqrt(E / área medida), em 1/m², o valor quadrático médio da variação da curvatura por
 * metro. As curvaturas principais, e não o tensor no espaço, porque o tensor de um cilindro gira com a normal e daria variação numa chapa
 * de raio constante; com elas o cilindro e a esfera dão zero. Não depende da densidade da malha porque o ajuste tem raio fixo em mm (e
 * não em anéis de vizinhos), a soma é pesada pela área e o resultado é dividido pela área; o teste mede a mesma chapa ondulada com a
 * grade de 10 e de 5 mm e o índice fica dentro de 10%.
 * O raio decide a escala: ondulação de comprimento de onda bem menor que o raio é alisada pelo ajuste e some do índice.
 *
 * A região é a `parte` da face (`--por=parte`, padrão), o passo que a criou (`--por=origem`) ou os dois (`--por=ambos`), a mesma regra de
 * `continuidade-nas-emendas.mjs`; o ajuste não atravessa a borda da região, e por isso a emenda (degrau, vinco) não entra no índice: ela
 * é da continuidade. O vértice sem vizinhos bastantes (a quina da espessura) fica de fora, com as faces dele, e a área medida sai ao lado
 * da área total. A casca de duas peles entra com `--lado` (a regra de `mapa-de-desvio.mjs`); sem ele as duas peles entram.
 * As chapas de calibração (`tools/fixtures/reflexo-calibracao/`) provam a ordem no teste: a lisa dá perto de zero e as onduladas de
 * 0,25, 0,5 e 1 mm sobem nessa ordem.
 *
 * O QUE ELE DIZ. JSON na saída padrão (`regioes`: nome, índice em 1/m², energia, área total e medida em m², faces e vértices medidos,
 * curvatura quadrática média, a raiz da média por área de k1² + k2², em 1/m), e a tabela legível na saída de erro (para não sujar o JSON de quem o lê por cano).
 *
 * Uso: node tools/modelar/suavidade-por-regiao.mjs <peça> [--opcao=<n>] [--lado=<+z|-z|+x|-x|+y|-y|centro>] [--por=<parte|origem|ambos>]
 *        [--raio=<mm>] [--saida=<json>]
 *   (também `npm run suavidade -- <peça> ...`). Com `--saida` o JSON vai também para o arquivo. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { ajusteLocal, indiceDosGrupos, malhaComGrupos } from './continuidade-nas-emendas.mjs';
import { ErroDeEntrada, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';
import { selecionarLado } from './mapa-de-desvio.mjs';

export const PADROES = Object.freeze({ raioMm: 40 });

/** O gradiente (por mm) de uma função linear num triângulo de vértices a, b, c (mm) com valores fa, fb, fc. */
function gradienteNoTriangulo(a, b, c, fa, fb, fc) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const d11 = e1[0] * e1[0] + e1[1] * e1[1] + e1[2] * e1[2]; const d12 = e1[0] * e2[0] + e1[1] * e2[1] + e1[2] * e2[2]; const d22 = e2[0] * e2[0] + e2[1] * e2[1] + e2[2] * e2[2];
  const det = d11 * d22 - d12 * d12; if (!(det > 1e-12)) return null;
  const g1 = fb - fa; const g2 = fc - fa;
  const x = (g1 * d22 - g2 * d12) / det; const y = (g2 * d11 - g1 * d12) / det;
  return [x * e1[0] + y * e2[0], x * e1[1] + y * e2[1], x * e1[2] + y * e2[2]];
}

/** suavidadePorRegiao(neutro, { nome, lado, por, raioMm }) -> { json, tabela } */
export function suavidadePorRegiao(neutro, { nome = 'peca', lado = null, por = 'parte', raioMm = PADROES.raioMm } = {}) {
  if (!(raioMm > 0)) throw new Error(`--raio espera um número de mm maior que zero, e veio ${raioMm}`);
  const malha = malhaComGrupos(neutro, { por });
  const { P, N, faces, grupos, areas } = malha;
  const sel = selecionarLado(malha, lado);
  const selFace = faces.map((f) => f.every((i) => sel[i]));
  const indice = indiceDosGrupos(malha, selFace, raioMm);
  const regioes = [];
  for (const g of [...indice.porGrupo.keys()].sort()) {
    const tensores = new Map();
    for (const v of [...indice.porGrupo.get(g)].sort((a, b) => a - b)) {
      const p = [P[3 * v], P[3 * v + 1], P[3 * v + 2]];
      const aj = ajusteLocal(P, N, indice.vizinhos(g, p, raioMm), p, [N[3 * v], N[3 * v + 1], N[3 * v + 2]], { raio: raioMm });
      if (aj) tensores.set(v, aj.principais);
    }
    let energia = 0; let areaMedida = 0; let areaTotal = 0; let facesMedidas = 0; let curv2 = 0;
    faces.forEach((f, k) => {
      if (!selFace[k] || grupos[k] !== g) return;
      areaTotal += areas[k];
      if (!f.every((v) => tensores.has(v))) return;
      facesMedidas++;
      for (let q = 1; q + 1 < f.length; q++) {
        const tri = [f[0], f[q], f[q + 1]]; const pts = tri.map((v) => [P[3 * v], P[3 * v + 1], P[3 * v + 2]]);
        const e1 = pts[1].map((x, i) => x - pts[0][i]); const e2 = pts[2].map((x, i) => x - pts[0][i]);
        const A = 0.5 * Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]); /* mm² */
        if (!(A > 0)) continue;
        const S = tri.map((v) => tensores.get(v));
        let soma = 0; let ok = true;
        for (let c = 0; c < 2; c++) {
          const gr = gradienteNoTriangulo(pts[0], pts[1], pts[2], S[0][c], S[1][c], S[2][c]); if (!gr) { ok = false; break; }
          soma += (gr[0] ** 2 + gr[1] ** 2 + gr[2] ** 2) * 1e6; /* (1/m por mm)² -> (1/m²)² */
        }
        if (!ok) continue;
        energia += A * 1e-6 * soma; areaMedida += A * 1e-6;
        curv2 += A * 1e-6 * S.reduce((s, t) => s + t[0] * t[0] + t[1] * t[1], 0) / 3;
      }
    });
    regioes.push({
      regiao: g, indice: areaMedida ? Math.round(Math.sqrt(energia / areaMedida) * 1000) / 1000 : null, energia: Math.round(energia * 1e4) / 1e4,
      areaM2: Math.round(areaTotal * 1e-6 * 1e5) / 1e5, areaMedidaM2: Math.round(areaMedida * 1e5) / 1e5, faces: faces.filter((_, k) => selFace[k] && grupos[k] === g).length, facesMedidas,
      verticesMedidos: tensores.size, curvaturaRmsPorM: areaMedida ? Math.round(Math.sqrt(curv2 / areaMedida) * 1000) / 1000 : null,
    });
  }
  if (!regioes.length) throw new Error('nenhuma região foi medida: o lado não tem face, ou a peça não tem face');
  const json = {
    peca: nome, lado, por, parametros: { raioMm },
    unidades: { indice: '1/m² (raiz da média por área de ||grad S||², S o tensor de curvatura em 1/m)', energia: '1/m² (integral de ||grad S||² dA, em m²)', area: 'm²' },
    regioes,
  };
  const col = (t, n) => String(t).padEnd(n); const num = (x, n) => String(x ?? '-').padStart(n);
  const larg = Math.max(8, ...regioes.map((r) => r.regiao.length));
  const tabela = [`suavidade por região — ${nome}${lado ? ` (lado ${lado})` : ''}, por ${por}, raio ${raioMm} mm`,
    `${col('região', larg)}  ${num('índice 1/m²', 12)}  ${num('energia', 10)}  ${num('área m²', 9)}  ${num('medida m²', 10)}  ${num('k rms 1/m', 10)}`,
    ...regioes.map((r) => `${col(r.regiao, larg)}  ${num(r.indice, 12)}  ${num(r.energia, 10)}  ${num(r.areaM2, 9)}  ${num(r.areaMedidaM2, 10)}  ${num(r.curvaturaRmsPorM, 10)}`)].join('\n');
  return { json, tabela };
}

export const OPCOES_DA_CLI = ['opcao', 'lado', 'por', 'raio', 'saida'];

async function principal(argv) {
  let lido;
  try { lido = lerArgumentos(argv.slice(2), { opcoes: OPCOES_DA_CLI, bandeiras: ['ajuda'], posicional: { nome: 'peça', obrigatorio: false } }); } catch (e) { process.stderr.write(`suavidade: ${e.message}\n`); return 2; }
  const peca = lido.posicional;
  if (lido.bandeira('ajuda') || !peca) { process.stderr.write(`uso: node tools/modelar/suavidade-por-regiao.mjs <peça> [--${OPCOES_DA_CLI.join('=...] [--')}=...]\n  ver o cabeçalho do arquivo\n`); return lido.bandeira('ajuda') ? 0 : 2; }
  const t = lido.opcao('raio'); const raioMm = t === null || t === undefined ? PADROES.raioMm : Number(t);
  if (!Number.isFinite(raioMm)) { process.stderr.write(`suavidade: --raio espera um número de mm, e veio '${t}'\n`); return 2; }
  let entrada;
  try { entrada = await lerEntradaDeMedida(peca, { opcao: opcaoDaLinha(lido.opcao('opcao')), montagem: false }); } catch (e) {
    if (e instanceof ErroDeEntrada) { process.stderr.write(`suavidade: ${e.message}\n`); return 2; }
    throw e;
  }
  const nome = basename(peca).replace(/\.(mjs|js|json)$/, '');
  const { json, tabela } = suavidadePorRegiao(entrada.executar().neutro, { nome, lado: lido.opcao('lado') ?? null, por: lido.opcao('por') ?? 'parte', raioMm });
  const texto = `${JSON.stringify(json, null, 2)}\n`;
  if (lido.opcao('saida')) { const s = resolve(lido.opcao('saida')); mkdirSync(dirname(s), { recursive: true }); writeFileSync(s, texto); }
  process.stderr.write(`${tabela}\n`);
  process.stdout.write(texto);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; });
}
