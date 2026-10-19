/* cadeiras-medida.mjs — a medida da família `cadeira` contra o esboço alvo de cada perfil, e a prancha com os dois lado a lado.

   Núcleo puro (exportado) e uma linha de comando:
     node tools/mecanifica/cadeiras-medida.mjs medidas [--escrever]   (a tabela em Markdown; com --escrever, grava medidas.md)
     node tools/mecanifica/cadeiras-medida.mjs prancha [saida.png]    (a prancha PNG, isométrica e lateral, alvo e família)

   O alvo de cada perfil é o esboço que `receitaParaEsboco` tira da receita do externo em `fixtures/receita-externa-cadeiras/`, com o
   ajuste da pessoa na `cadeira_almofadada_clara` (o topo das pernas da frente encosta no assento). A caixa envolvente do alvo vem das caixas
   que `descreverEsboco` lê. O volume do alvo é a união das caixas da receita (volume contado uma vez só onde elas se sobrepõem) menos o
   que o chanfro do esboço tira, mais o dos cilindros; o volume da família é o da malha (fórmula de Newell sobre cada face). */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { descreverEsboco } from '../../modulos/esboco/src/descrever.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { chamar } from '../../src/autoria/chamar-familia.js';
import { CADEIRA } from '../../procedural/familias/cadeira/index.js';
import { criarRegistroDeFamilias } from '../../procedural/familias/index.js';
import { chanfroDoEsboco, receitaParaEsboco, volumeDaPeca } from './receita-externa.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const PASTA_DAS_RECEITAS = join(AQUI, 'fixtures', 'receita-externa-cadeiras');
export const PASTA_DAS_PROVAS = join(AQUI, '..', '..', 'docs', 'mecanifica', 'banco-de-provas', 'cadeiras-2026-10-19');

/* perfil da família → receita do externo que é o alvo dele, e o ajuste que a pessoa pediu sobre ela */
export const ALVOS = Object.freeze({
  'cadeira-trabalhada': { receita: 'cadeira_ripada_marrom' },
  'cadeira-rustica': { receita: 'cadeira_desgastada_madeira' },
  'cadeira-branca-simples': { receita: 'cadeira_basica_clara' },
  'cadeira-branca-de-madeira': { receita: 'cadeira_almofadada_clara', ajuste: 'o topo das pernas da frente encosta no assento (face de baixo da almofada)' },
  'cadeira-de-madeira': { receita: 'cadeira_ripada_simples' },
});

const registro = criarRegistroDeFamilias({ familias: [CADEIRA] });

/** A receita do alvo do perfil, com o ajuste da pessoa aplicado. */
export function receitaDoAlvo(perfil) {
  const { receita: nome } = ALVOS[perfil];
  const receita = JSON.parse(readFileSync(join(PASTA_DAS_RECEITAS, `${nome}.receita.json`), 'utf8'));
  if (nome === 'cadeira_almofadada_clara') {
    const assento = receita.pecas.find((p) => p.nome === 'almofada');
    for (const p of receita.pecas) if (p.nome === 'perna_fr_d' || p.nome === 'perna_fr_e') p.max[2] = assento.min[2];
  }
  return receita;
}

/* o volume da união de caixas alinhadas aos eixos, por compressão de coordenadas (mm³) */
function volumeDaUniao(caixas) {
  const eixos = [0, 1, 2].map((k) => [...new Set(caixas.flatMap((c) => [c.min[k], c.max[k]]))].sort((a, b) => a - b));
  let total = 0;
  for (let i = 0; i < eixos[0].length - 1; i += 1) {
    for (let j = 0; j < eixos[1].length - 1; j += 1) {
      for (let l = 0; l < eixos[2].length - 1; l += 1) {
        const cx = (eixos[0][i] + eixos[0][i + 1]) / 2; const cy = (eixos[1][j] + eixos[1][j + 1]) / 2; const cz = (eixos[2][l] + eixos[2][l + 1]) / 2;
        if (caixas.some((c) => cx > c.min[0] && cx < c.max[0] && cy > c.min[1] && cy < c.max[1] && cz > c.min[2] && cz < c.max[2])) {
          total += (eixos[0][i + 1] - eixos[0][i]) * (eixos[1][j + 1] - eixos[1][j]) * (eixos[2][l + 1] - eixos[2][l]);
        }
      }
    }
  }
  return total;
}

/** O alvo do perfil: caixa envolvente em mm (x largura, y altura, z profundidade com a frente em +z) e volume em mm³. */
export function medirAlvo(perfil) {
  const receita = receitaDoAlvo(perfil);
  const { esboco } = receitaParaEsboco(receita);
  const formas = descreverEsboco(esboco).opcoes[0].formas;
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const f of formas) {
    [f.caixa.x, f.caixa.y, f.caixa.z].forEach(([a, b], k) => { min[k] = Math.min(min[k], a); max[k] = Math.max(max[k], b); });
  }
  const caixas = receita.pecas.filter((p) => p.forma === 'caixa').map((p) => ({ min: p.min.map((v) => v * 1000), max: p.max.map((v) => v * 1000) }));
  const chanfros = receita.pecas.filter((p) => p.forma === 'caixa').reduce((s, p) => s + (volumeDaPeca(p) - volumeDaPeca(p, { chanfroDoEsboco: true })) * 1e9, 0);
  const cilindros = receita.pecas.filter((p) => p.forma !== 'caixa').reduce((s, p) => s + volumeDaPeca(p) * 1e9, 0);
  return { min, max, tamanho: max.map((v, k) => v - min[k]), volume: volumeDaUniao(caixas) - chanfros + cilindros, formas: formas.length, receita, esboco };
}

/** Executa o perfil (com sobrescritas opcionais) e devolve o neutro. */
export function executarPerfil(perfil, sobrescritas = {}) {
  return executarReceita({ get CHAMADAS_COMPOSICOES() { return [chamar(CADEIRA, 'corpo', { perfil, ...sobrescritas })]; } }, registro).neutro;
}

/** A caixa envolvente (mm) e o volume (mm³, fórmula de Newell com o sinal corrigido) da malha. */
export function medirMalha(neutro) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const v of neutro.V.values()) for (let k = 0; k < 3; k += 1) { min[k] = Math.min(min[k], v[k] * 1000); max[k] = Math.max(max[k], v[k] * 1000); }
  let volume = 0;
  for (const f of neutro.F.values()) {
    const p = f.vs.map((id) => neutro.V.get(id).map((x) => x * 1000));
    const n = [0, 0, 0];
    for (let i = 0; i < p.length; i += 1) {
      const a = p[i]; const b = p[(i + 1) % p.length];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    volume += (n[0] * p[0][0] + n[1] * p[0][1] + n[2] * p[0][2]) / 6;
  }
  return { min, max, tamanho: max.map((v, k) => v - min[k]), volume: Math.abs(volume), faces: neutro.F.size };
}

/** A diferença da família contra o alvo, por eixo e no volume. */
export function compararPerfil(perfil) {
  const alvo = medirAlvo(perfil);
  const malha = medirMalha(executarPerfil(perfil));
  const eixos = alvo.tamanho.map((t, k) => ({ alvo: t, familia: malha.tamanho[k], mm: malha.tamanho[k] - t, pct: (100 * (malha.tamanho[k] - t)) / t }));
  return { perfil, alvo, malha, eixos, volume: { alvo: alvo.volume, familia: malha.volume, pct: (100 * (malha.volume - alvo.volume)) / alvo.volume } };
}

const f1 = (v) => v.toFixed(1).replace('.', ',');
const sinal = (v) => `${v >= 0 ? '+' : '−'}${f1(Math.abs(v))}`;
const litros = (mm3) => (mm3 / 1e6).toFixed(2).replace('.', ',');

/** A tabela de medidas em Markdown. */
export function tabelaDeMedidas() {
  const linhas = Object.keys(ALVOS).sort().map(compararPerfil);
  const nomes = ['largura (x)', 'altura (y)', 'profundidade (z)'];
  const partes = [];
  partes.push('| perfil | receita alvo | eixo | alvo (mm) | família (mm) | diferença (mm) | diferença (%) |', '| --- | --- | --- | ---: | ---: | ---: | ---: |');
  for (const l of linhas) {
    l.eixos.forEach((e, k) => partes.push(`| ${k === 0 ? l.perfil : ''} | ${k === 0 ? ALVOS[l.perfil].receita : ''} | ${nomes[k]} | ${f1(e.alvo)} | ${f1(e.familia)} | ${sinal(e.mm)} | ${sinal(e.pct)} |`));
  }
  partes.push('', '| perfil | volume do alvo (dm³) | volume da família (dm³) | diferença (%) | peças da família | faces da malha |', '| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const l of linhas) {
    const partesDaMalha = new Set([...executarPerfil(l.perfil).F.values()].map((x) => x.parte));
    partes.push(`| ${l.perfil} | ${litros(l.volume.alvo)} | ${litros(l.volume.familia)} | ${sinal(l.volume.pct)} | ${partesDaMalha.size} | ${l.malha.faces} |`);
  }
  return { texto: partes.join('\n'), linhas };
}

/* ------------------------------ a prancha ------------------------------ */

const VISTAS = Object.freeze({
  isometrica: { azimute: 35, elevacao: 25 },
  lateral: { azimute: 90, elevacao: 0 },
});
const LUZ = (() => { const v = [0.45, 0.8, 0.55]; const n = Math.hypot(...v); return v.map((x) => x / n); })();
const sub = (a, b) => a.map((x, k) => x - b[k]);
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => { const n = Math.hypot(...a); return a.map((x) => x / n); };

function camera({ azimute, elevacao }) {
  const az = (azimute * Math.PI) / 180; const el = (elevacao * Math.PI) / 180;
  const f = unit([-Math.cos(el) * Math.sin(az), -Math.sin(el), -Math.cos(el) * Math.cos(az)]);
  const direita = unit(cruz(f, [0, 1, 0]));
  const cima = cruz(direita, f);
  return { f, direita, cima };
}

/* Os polígonos (em mm, com normal para fora) de uma lista de caixas e cilindros do alvo. */
function poligonosDoAlvo(receita) {
  const polis = [];
  /* receita (x, y, z) → mundo (x, z, -y), o mesmo quadro do esboço */
  const m = (v) => [v[0] * 1000, v[2] * 1000, -v[1] * 1000];
  for (const p of receita.pecas) {
    if (p.forma === 'caixa') {
      const a = m(p.min); const b = m(p.max);
      const lo = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])]; const hi = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
      const q = (x, y, z) => [x ? hi[0] : lo[0], y ? hi[1] : lo[1], z ? hi[2] : lo[2]];
      polis.push([q(1, 0, 0), q(1, 1, 0), q(1, 1, 1), q(1, 0, 1)], [q(0, 0, 1), q(0, 1, 1), q(0, 1, 0), q(0, 0, 0)],
        [q(0, 1, 0), q(0, 1, 1), q(1, 1, 1), q(1, 1, 0)], [q(0, 0, 1), q(0, 0, 0), q(1, 0, 0), q(1, 0, 1)],
        [q(0, 0, 1), q(1, 0, 1), q(1, 1, 1), q(0, 1, 1)], [q(1, 0, 0), q(0, 0, 0), q(0, 1, 0), q(1, 1, 0)]);
    } else {
      const eixo = p.eixo ?? 'z'; const n = 12;
      const c0 = p.centro.map((v) => v * 1000); const h = p.altura * 1000; const r = p.raio * 1000;
      const perm = { z: (x, y, z) => [x, y, z], x: (x, y, z) => [z, x, y], y: (x, y, z) => [y, z, x] }[eixo];
      const anel = (z) => Array.from({ length: n }, (_, i) => { const t = (2 * Math.PI * i) / n; return m(perm(r * Math.cos(t), r * Math.sin(t), z).map((v, k) => v / 1000 + c0[k] / 1000)); });
      const base = anel(0); const topo = anel(h);
      for (let i = 0; i < n; i += 1) polis.push([base[i], base[(i + 1) % n], topo[(i + 1) % n], topo[i]]);
      polis.push(base, topo);
    }
  }
  return polis;
}

/* Os polígonos da malha, em mm, com a orientação corrigida para a normal sair do sólido. */
function poligonosDaMalha(neutro) {
  const polis = [...neutro.F.values()].map((f) => f.vs.map((id) => neutro.V.get(id).map((x) => x * 1000)));
  const normal = (p) => { const n = [0, 0, 0]; for (let i = 0; i < p.length; i += 1) { const a = p[i]; const b = p[(i + 1) % p.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); } return n; };
  let vol = 0;
  for (const p of polis) vol += dot(normal(p), p[0]);
  return vol < 0 ? polis.map((p) => [...p].reverse()) : polis;
}

function projetar(polis, vista, cor) {
  const cam = camera(vista);
  const itens = [];
  for (const p of polis) {
    const n = (() => { const w = [0, 0, 0]; for (let i = 0; i < p.length; i += 1) { const a = p[i]; const b = p[(i + 1) % p.length]; w[0] += (a[1] - b[1]) * (a[2] + b[2]); w[1] += (a[2] - b[2]) * (a[0] + b[0]); w[2] += (a[0] - b[0]) * (a[1] + b[1]); } return unit(w); })();
    if (dot(n, cam.f) >= -1e-9) continue; // face de costas
    const pts = p.map((v) => [dot(v, cam.direita), -dot(v, cam.cima)]);
    const prof = p.reduce((s, v) => s + dot(v, cam.f), 0) / p.length;
    const luz = 0.42 + 0.58 * Math.max(0, dot(n, LUZ));
    itens.push({ pts, prof, preenche: cor.map((c) => Math.round(c * luz)) });
  }
  itens.sort((a, b) => b.prof - a.prof);
  return itens;
}

const limites = (itens) => {
  const xs = itens.flatMap((i) => i.pts.map((q) => q[0])); const ys = itens.flatMap((i) => i.pts.map((q) => q[1]));
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

/* Um quadro SVG de lado `larg` x `alt` com a cadeira na escala `esc` (px por mm), centrada em x e apoiada na base. */
function quadro(itens, esc, larg, alt, margemBaixo) {
  const b = limites(itens);
  const dx = larg / 2 - ((b.x0 + b.x1) / 2) * esc; const dy = alt - margemBaixo - b.y1 * esc;
  const polis = itens.map((i) => `<polygon points="${i.pts.map(([x, y]) => `${(x * esc + dx).toFixed(2)},${(y * esc + dy).toFixed(2)}`).join(' ')}" fill="rgb(${i.preenche.join(',')})" stroke="#2b2b2b" stroke-width="0.6" stroke-linejoin="round"/>`);
  return { svg: polis.join(''), largura: (b.x1 - b.x0) * esc };
}

/** O HTML da prancha: uma linha por perfil, com isométrica e lateral do alvo e da família. */
export function htmlDaPrancha() {
  const perfis = Object.keys(ALVOS).sort();
  const dados = perfis.map((perfil) => {
    const alvo = medirAlvo(perfil);
    const neutro = executarPerfil(perfil);
    const cinza = [190, 188, 182]; const azul = [150, 176, 206];
    return {
      perfil, alvo, malha: medirMalha(neutro),
      vistas: Object.entries(VISTAS).map(([nome, vista]) => ({
        nome, alvo: projetar(poligonosDoAlvo(alvo.receita), vista, cinza), familia: projetar(poligonosDaMalha(neutro), vista, azul),
      })),
    };
  });
  /* uma escala só para toda a prancha, para os tamanhos serem comparáveis */
  let maior = 0;
  for (const d of dados) for (const v of d.vistas) for (const itens of [v.alvo, v.familia]) { const b = limites(itens); maior = Math.max(maior, b.y1 - b.y0, (b.x1 - b.x0) * 1.25); }
  const LARG = 330; const ALT = 400; const MARGEM = 26;
  const esc = (ALT - MARGEM - 40) / maior;
  const celula = (itens, rotulo) => {
    const q = quadro(itens, esc, LARG, ALT, MARGEM);
    return `<div class="cel"><svg width="${LARG}" height="${ALT}" viewBox="0 0 ${LARG} ${ALT}">${q.svg}<line x1="12" y1="${ALT - MARGEM}" x2="${LARG - 12}" y2="${ALT - MARGEM}" stroke="#999" stroke-width="0.6" stroke-dasharray="3 3"/></svg><div class="rot">${rotulo}</div></div>`;
  };
  const f = (v) => Math.round(v);
  const linhas = dados.map((d) => {
    const iso = d.vistas.find((v) => v.nome === 'isometrica'); const lat = d.vistas.find((v) => v.nome === 'lateral');
    return `<section><h2>${d.perfil}</h2><div class="fila">${celula(iso.alvo, 'alvo · isométrica')}${celula(iso.familia, 'família · isométrica')}${celula(lat.alvo, 'alvo · lateral (frente à esquerda)')}${celula(lat.familia, 'família · lateral')}</div>
<p>alvo ${d.alvo.tamanho.map(f).join(' × ')} mm · família ${d.malha.tamanho.map(f).join(' × ')} mm (largura × altura × profundidade)</p></section>`;
  });
  return `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#f4f3ef;font:13px/1.35 system-ui,sans-serif;color:#222;padding:14px;width:${LARG * 4 + 40}px}
h1{font-size:17px;margin:0 0 4px} .sub{color:#555;margin:0 0 10px}
section{border-top:1px solid #cfcdc6;padding:6px 0 4px} h2{font-size:15px;margin:2px 0 0}
.fila{display:flex} .cel{flex:none} .rot{color:#666;text-align:center;margin-top:-22px;position:relative;height:18px}
section p{margin:0 0 4px;color:#444}
</style><body id="prancha"><h1>Família cadeira — cinco perfis de encosto alto, cada um ao lado do esboço alvo</h1>
<p class="sub">Cinza: esboço alvo (receita do externo). Azul: geometria da família. Mesma escala em todas as vistas.</p>${linhas.join('')}</body>`;
}

async function gerarPrancha(saida) {
  const { chromium } = await import('playwright');
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1.5 });
  await pagina.setContent(htmlDaPrancha(), { waitUntil: 'load' });
  await pagina.locator('#prancha').screenshot({ path: saida });
  await navegador.close();
  return saida;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [comando, arg] = process.argv.slice(2);
  if (comando === 'medidas') {
    const { texto } = tabelaDeMedidas();
    console.log(texto);
    if (process.argv.includes('--escrever')) writeFileSync(join(PASTA_DAS_PROVAS, 'medidas.tabela.md'), `${texto}\n`);
  } else if (comando === 'prancha') {
    console.log(await gerarPrancha(arg ?? join(PASTA_DAS_PROVAS, 'cadeira-prancha.png')));
  } else {
    console.error('uso: node tools/mecanifica/cadeiras-medida.mjs medidas | prancha [saida.png]');
    process.exit(2);
  }
}
