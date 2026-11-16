#!/usr/bin/env node
/* linha-de-base.mjs — a linha de base do plano das ferramentas de correção de superfície: as quatro medidas de superfície (`suavidade`,
 * `pente`, `emendas`, `ondulacao`) e o G2 por região com os vértices extraordinários marcados, nas chapas de prova de `chapas.mjs` e, com
 * `--com=<peça>`, numa peça do acervo.
 *
 * As quatro medidas rodam pelas próprias ferramentas (`node tools/modelar/<ferramenta>.mjs`, o mesmo que `npm run <ferramenta>`), com as
 * opções que `ALVOS` declara por chapa, e o JSON de cada uma é resumido aqui. O G2 por região vem de duas leituras:
 *   - OS VÉRTICES EXTRAORDINÁRIOS, achados de dois jeitos que se conferem: os que a gaiola declara (`extraordinarios` da saída de
 *     `gaiolaPorRede`, pegos por `capturarGaiolas` enquanto a receita monta os passos) e os da malha entregue, o vértice de dentro da
 *     pele medida (toda aresta dele com duas faces) cujas faces em volta são todas quadriláteros e não são quatro. Cada um da malha é
 *     casado com o da gaiola mais perto, a até um espaçamento da gaiola; o vértice da malha sem par é o que a booleana ou o vinco deixou.
 *   - O ÍNDICE DE SUAVIDADE (o de `suavidade-por-regiao.mjs`) de cada região partido em dois: a zona de cada vértice extraordinário (as
 *     faces a até `--zona` mm, padrão 80, dele) e o resto da região, de modo que a curvatura que varia em volta do vértice, onde a
 *     subdivisão é só G1, aparece separada da que varia no resto.
 *
 * Uso: node tools/fixtures/correcao-de-superficie/linha-de-base.mjs [--com=<peça>] [--zona=<mm>] [--saida=<json>]
 *   O JSON vai para a saída padrão (e para `--saida`); o resumo legível, para a saída de erro. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { capturarGaiolas } from '../../../procedural/nucleo/gaiola-captura.js';
import { lerArgumentos } from '../../modelar/argumentos.mjs';
import { lerEntradaDeMedida } from '../../modelar/entrada-de-medida.mjs';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { selecionarLado } from '../../modelar/mapa-de-desvio.mjs';
import { malhaComGrupos } from '../../modelar/continuidade-nas-emendas.mjs';
import { suavidadePorRegiao } from '../../modelar/suavidade-por-regiao.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PASTA = 'tools/fixtures/correcao-de-superficie';

/** O que medir em cada alvo: o lado da pele (a chapa com espessura tem duas) e os cortes do pente. */
export const ALVOS = Object.freeze({
  'rede-com-ruido': { cortes: ['z:125', 'z:375', 'x:250', 'x:750'] },
  'rede-sem-ruido': { cortes: ['z:125', 'z:375', 'x:250', 'x:750'] },
  'chapa-simetrica': { lado: 'centro', cortes: ['z:250', 'z:500', 'z:750'] },
  'chapa-simetrica-espelhada': { lado: 'centro', cortes: ['z:250', 'z:500', 'z:750'] },
  'emenda-g0': { cortes: ['z:200'] },
  'emenda-g1': { cortes: ['z:200'] },
  'emenda-g2': { cortes: ['z:200'] },
  'carro-fastback/lataria': { lado: 'centro', cortes: ['y:600', 'y:850', 'z:-800', 'z:-1700'] },
});

const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);

function ferramenta(script, alvo, opcoes) {
  const r = spawnSync(process.execPath, [`tools/modelar/${script}`, alvo, ...opcoes], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 30 });
  const texto = r.stdout ?? ''; const k = texto.indexOf('{');
  if (r.status !== 0 && r.status !== 1) throw new Error(`${script} ${alvo} saiu com ${r.status}: ${(r.stderr ?? '').slice(0, 400)}`);
  return JSON.parse(texto.slice(k));
}

/* ---------- os vértices extraordinários ---------- */

function extraordinariosDaMalha(malha, sel) {
  const { P, faces } = malha;
  const naPele = faces.map((f) => f.every((v) => sel[v]));
  const arestas = new Map(); const valencia = new Map(); const soQuads = new Map();
  faces.forEach((f, k) => {
    if (!naPele[k]) return;
    for (let j = 0; j < f.length; j++) {
      const a = f[j], b = f[(j + 1) % f.length]; const c = a < b ? `${a},${b}` : `${b},${a}`;
      arestas.set(c, (arestas.get(c) ?? 0) + 1);
      valencia.set(a, (valencia.get(a) ?? 0) + 1);
      if (f.length !== 4) soQuads.set(a, false); else if (!soQuads.has(a)) soQuads.set(a, true);
    }
  });
  const naBorda = new Set();
  for (const [c, n] of arestas) if (n !== 2) for (const v of c.split(',')) naBorda.add(Number(v));
  const saida = [];
  for (const [v, n] of valencia) if (n !== 4 && soQuads.get(v) && !naBorda.has(v)) saida.push({ ponto: [P[3 * v], P[3 * v + 1], P[3 * v + 2]].map(r3), valencia: n });
  return saida.sort((a, b) => a.ponto[0] - b.ponto[0] || a.ponto[1] - b.ponto[1] || a.ponto[2] - b.ponto[2]);
}

function extraordinariosDaGaiola(redes) {
  const saida = [];
  redes.forEach((g, k) => {
    for (const e of g.extraordinarios ?? []) {
      const p = g.pontos[e.ponto];
      if (!p) continue;
      saida.push({ rede: k, ponto: e.ponto, valencia: e.valencia, borda: e.borda, posicaoMm: p.map((c) => r3(c * 1000)) });
      if (g.passo?.simetria === 'x' && p[0] > 1e-9) saida.push({ rede: k, ponto: `${e.ponto} (espelho)`, valencia: e.valencia, borda: e.borda, posicaoMm: [-p[0], p[1], p[2]].map((c) => r3(c * 1000)) });
    }
  });
  return saida;
}

/* a mediana do comprimento das arestas da gaiola, em mm: o alcance em que um extraordinário da malha casa com o da gaiola */
function espacamentoDaGaiola(g) {
  const l = [];
  for (const f of g.passo.faces) for (let k = 0; k < f.length; k++) { const a = g.pontos[f[k]], b = g.pontos[f[(k + 1) % f.length]]; l.push(1000 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])); }
  l.sort((x, y) => x - y);
  return l.length ? l[l.length >> 1] : 50;
}

/* ---------- o G2 por região: o índice de suavidade na zona de cada extraordinário e fora dela ---------- */

function g2PorRegiao(neutro, { lado, zonaMm, extraordinarios }) {
  const malha = malhaComGrupos(neutro, { por: 'parte' });
  const ids = [...neutro.F.keys()];
  const naZona = new Set();
  malha.centros.forEach((c, k) => {
    if (extraordinarios.some((e) => Math.hypot(c[0] - e.ponto[0], c[1] - e.ponto[1], c[2] - e.ponto[2]) <= zonaMm)) naZona.add(ids[k]);
  });
  const F = new Map([...neutro.F].map(([id, f]) => [id, naZona.has(id) ? { ...f, parte: `${f.parte ?? '(sem parte)'} @zonaEV` } : f]));
  const { json } = suavidadePorRegiao({ V: neutro.V, F, procedencia: neutro.procedencia }, { lado, por: 'parte' });
  return json.regioes.map((r) => ({ regiao: r.regiao, indice: r3(r.indice), kRms: r3(r.curvaturaRmsPorM), areaMedidaM2: r3(r.areaMedidaM2) }));
}

/* ---------- a costura da simetria e os vãos por lado ---------- */

/* quantos vértices estão no plano x = 0 exato e quantos a menos de 1e-6 m dele sem estar, e os vãos por contorno de cada lado: o atrito da
   rodada 2 do quarto traseiro (a solda pelo plano não acha a costura, e o vão sai num lado só) */
function costuraDaSimetria(neutro, aberturas) {
  let exatos = 0; let quase = 0;
  for (const p of neutro.V.values()) { if (p[0] === 0) exatos++; else if (Math.abs(p[0]) < 1e-6) quase++; }
  const lados = { '+x': 0, '-x': 0, cruza: 0 };
  for (const a of aberturas) {
    const xs = a.borda.fora.map((v) => neutro.V.get(v)?.[0]).filter((x) => x != null);
    if (Math.min(...xs) > 0) lados['+x']++; else if (Math.max(...xs) < 0) lados['-x']++; else lados.cruza++;
  }
  return { noPlanoExato: exatos, aMenosDe1e6SemSer0: quase, vaosPorLado: lados };
}

/* ---------- uma chapa ---------- */

export async function medir(alvo, { zonaMm = 80 } = {}) {
  const caminho = ALVOS[alvo] && !alvo.includes('/') ? `${PASTA}/${alvo}` : alvo;
  const { lado = null, cortes = [] } = ALVOS[alvo] ?? {};
  const comLado = lado ? [`--lado=${lado}`] : [];
  const entrada = await lerEntradaDeMedida(caminho, { montagem: false });
  const { gaiolas } = capturarGaiolas(() => entrada.receita.PASSOS);
  /* a chapa de prova monta a rede ao ser importada e a deixa em REDE; a peça a monta nos passos, e a captura a pega */
  const redes = [...(entrada.receita.REDE ? [entrada.receita.REDE] : []), ...gaiolas].filter((g) => Array.isArray(g.extraordinarios));
  const { neutro } = entrada.executar();
  const malha = malhaComGrupos(neutro, { por: 'parte' });
  const sel = selecionarLado(malha, lado);

  const suav = ferramenta('suavidade-por-regiao.mjs', caminho, comLado);
  const pente = cortes.map((corte) => {
    const j = ferramenta('pente-de-curvatura.mjs', caminho, [`--corte=${corte}`, ...comLado, `--saida=tmp/correcao-de-superficie/pente-${alvo.replace(/\//g, '-')}-${corte.replace(':', '')}.png`]);
    const ks = j.curvas.flatMap((c) => c.amostras.map((a) => a[1]));
    return { corte, curvas: j.curvas.length, saltos: j.saltos?.length ?? j.curvas.reduce((s, c) => s + c.saltos.length, 0), maiorSalto: r3(Math.max(0, ...j.curvas.flatMap((c) => c.saltos.map((s) => s.variacao)))), mudancasDeSinal: j.mudancasDeSinal?.length ?? 0, curvatura: { min: r3(Math.min(...ks)), max: r3(Math.max(...ks)) } };
  });
  const em = ferramenta('continuidade-nas-emendas.mjs', caminho, [...comLado, '--amostras=nao', `--saida=tmp/correcao-de-superficie/emendas-${alvo.replace(/\//g, '-')}.png`]);
  const ond = ferramenta('ondulacao-da-superficie.mjs', caminho, []);

  const daMalha = extraordinariosDaMalha(malha, sel);
  const daGaiola = extraordinariosDaGaiola(redes);
  const espacamento = Math.max(20, ...redes.map(espacamentoDaGaiola));
  for (const e of daMalha) {
    let melhor = null;
    for (const g of daGaiola) { const d = Math.hypot(...e.ponto.map((c, k) => c - g.posicaoMm[k])); if (!melhor || d < melhor.d) melhor = { d, g }; }
    e.daGaiola = melhor && melhor.d <= espacamento ? { ponto: melhor.g.ponto, distanciaMm: r3(melhor.d) } : null;
  }
  return {
    alvo: caminho, lado, vertices: neutro.V.size, faces: neutro.F.size,
    suavidade: suav.regioes.map((r) => ({ regiao: r.regiao, indice: r3(r.indice), kRms: r3(r.curvaturaRmsPorM) })),
    pente,
    emendas: { resumo: em.resumo, emendas: em.emendas.map((e) => ({ lados: e.lados, tipo: e.tipo, comprimentoMm: r3(e.comprimentoMm), anguloMaximo: e.maximos.anguloGraus?.valor ?? null, anguloMediano: e.medianas?.anguloGraus ?? null, razaoMaxima: e.maximos.razaoDeCurvatura?.valor ?? null, razaoMediana: e.medianas?.razaoDeCurvatura ?? null, curvaturas: [e.medianas?.curvaturaA ?? null, e.medianas?.curvaturaB ?? null], acusa: e.acusa })) },
    ondulacao: { falhas: ond.superficies.reduce((s, x) => s + x.falhas.length, 0), foraDasFeicoes: ond.foraDasFeicoes, juntoDasFeicoes: ond.juntoDasFeicoes, maiorAmplitudeMm: r3(Math.max(0, ...ond.superficies.flatMap((x) => x.falhas.map((f) => f.amplitudeMm)))) },
    extraordinarios: { daGaiola, daMalha: daMalha.length, casados: daMalha.filter((e) => e.daGaiola).length, semPar: daMalha.filter((e) => !e.daGaiola).slice(0, 12), espacamentoMm: espacamento },
    g2PorRegiao: g2PorRegiao(neutro, { lado, zonaMm, extraordinarios: daMalha.filter((e) => e.daGaiola) }),
    /* o neutro guardado no cache de medida perde o registro das aberturas, que não é enumerável: a receita roda de novo para ele */
    costura: costuraDaSimetria(neutro, neutro.aberturas ?? executarReceita(entrada.receita).neutro.aberturas ?? []),
    zonaMm,
  };
}

const ehPrincipal = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (ehPrincipal) {
  const lido = lerArgumentos(process.argv.slice(2), { opcoes: ['com', 'zona', 'saida'], bandeiras: [], posicional: { nome: 'alvo', obrigatorio: false } });
  const zonaMm = lido.opcao('zona') != null ? Number(lido.opcao('zona')) : 80;
  const alvos = [...Object.keys(ALVOS).filter((a) => !a.includes('/')), ...(lido.opcao('com') ? [lido.opcao('com')] : [])];
  const medidas = [];
  for (const a of alvos) {
    const t = performance.now();
    const m = await medir(a, { zonaMm });
    medidas.push(m);
    process.stderr.write(`${a}: suavidade ${m.suavidade.map((r) => `${r.regiao} ${r.indice}`).join(', ')}; pente ${m.pente.map((p) => `${p.corte} ${p.saltos} saltos`).join(', ')}; emendas ${m.emendas.resumo.emendas} (acusam ${m.emendas.resumo.acusam}); ondulação ${m.ondulacao.falhas} falhas; extraordinários ${m.extraordinarios.daMalha} na malha, ${m.extraordinarios.casados} casados (${((performance.now() - t) / 1000).toFixed(1)} s)\n`);
  }
  const texto = `${JSON.stringify({ formato: 'modelar.linha-de-base-correcao-de-superficie@1', zonaMm, medidas }, null, 2)}\n`;
  if (lido.opcao('saida')) { const s = resolve(lido.opcao('saida')); mkdirSync(dirname(s), { recursive: true }); writeFileSync(s, texto); }
  process.stdout.write(texto);
}
