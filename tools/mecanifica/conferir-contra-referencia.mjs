#!/usr/bin/env node
/* conferir-contra-referencia.mjs — desvio em MILÍMETRO entre a silhueta lateral
 * de partes de uma peça e a borda correspondente de uma foto de referência.
 *
 * PARA QUE SERVE. Modelar contra uma imagem estava sendo feito no olho: ajusta,
 * renderiza, olha, chuta de novo. Cada correção tinha chance de piorar outro
 * trecho, e "está baixo" não é medida que alguém possa conferir depois. Aqui a
 * saída é número por estação em z, com média, máximo e onde fica o pior, e o
 * código de saída reprova quando o desvio passa da tolerância declarada.
 *
 * A SILHUETA DO MODELO VEM DA MALHA, NÃO DE UM RENDER. Renderizar e medir pixel
 * traria de volta o erro da câmera, do enquadramento e do antialias. As faces
 * são projetadas no plano lateral e o envelope sai por interseção de aresta com
 * a vertical de cada estação: é exato e roda em milissegundos.
 *
 * A CALIBRAÇÃO DA FOTO É POR ÂNCORA, NÃO POR RODA. `calibrarPorRodas` acha as
 * manchas de contato com o solo, e já produziu escala absurda sem alertar quando
 * o recorte pegou uma legenda: as letras viraram o chão. Aqui o chamador declara
 * dois pontos que sabe localizar na foto e as coordenadas deles no modelo; as
 * duas âncoras dão a escala e a origem, e a diferença entre a escala implícita
 * em z e a implícita em y volta como resíduo. Resíduo alto reprova antes de
 * qualquer comparação, porque escala errada faz todo desvio virar ficção.
 *
 * USO
 *   npm run conferir:referencia -- <peça> --imagem=<png> --ancoras=<json>
 *     [--partes=a,b] [--qual=topo|base] [--recorte=x0,y0,x1,y1]
 *     [--tolerancia=25] [--estacoes=40] [--limiar=248] [--completo]
 *
 * O JSON DE ÂNCORAS
 *   { "ancoras": [ { "nome": "cubo traseiro", "px": [100, 177.5], "mm": [-499.5, 367] },
 *                  { "nome": "movimento central", "px": [215, 189], "mm": [0, 317] } ],
 *     "recorte": [182, 40, 340, 210], "qual": "topo", "tolerancia": 25,
 *     "partes": ["tuboSuperior"] }
 *   `px` é pixel na foto, x para a direita e y para baixo. `mm` é o plano
 *   lateral da Mecanifica, z para a frente e y para cima, na mesma origem da
 *   peça. Bandeira na linha de comando vence o que está no arquivo.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerPng, envelope } from './prancha-referencia.mjs';
import { lerArgumentos } from './argumentos.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';


/* --- calibração por âncora ------------------------------------------------ */

/** Duas âncoras dão escala e origem. A escala é a razão entre a distância em
 *  milímetro e a distância em pixel; o resíduo é o quanto as componentes z e y
 *  discordam entre si, e é ele que denuncia foto em perspectiva ou âncora mal
 *  localizada antes de a comparação começar. */
export function calibrarPorAncoras(ancoras, { maxResiduoRelativo = 0.02 } = {}) {
  if (!Array.isArray(ancoras) || ancoras.length !== 2) {
    throw new Error(`preciso de exatamente 2 âncoras (recebi ${Array.isArray(ancoras) ? ancoras.length : typeof ancoras})`);
  }
  const [a, b] = ancoras;
  for (const p of ancoras) {
    if (!Array.isArray(p.px) || p.px.length !== 2 || !Array.isArray(p.mm) || p.mm.length !== 2) {
      throw new Error(`âncora ${p.nome ?? '(sem nome)'} precisa de px:[x,y] e mm:[z,y]`);
    }
  }
  const dxPx = b.px[0] - a.px[0];
  const dyPx = b.px[1] - a.px[1];
  const dzMm = b.mm[0] - a.mm[0];
  const dyMm = b.mm[1] - a.mm[1];
  const distPx = Math.hypot(dxPx, dyPx);
  const distMm = Math.hypot(dzMm, dyMm);
  if (distPx < 20) throw new Error(`âncoras muito próximas na foto: ${distPx.toFixed(1)} px`);
  const escala = distMm / distPx;
  /* Escala implícita em cada eixo, separada. Numa foto ortográfica as duas
     coincidem; divergência é perspectiva, corte ou âncora errada. */
  const escalaZ = Math.abs(dxPx) > 5 ? Math.abs(dzMm / dxPx) : null;
  const escalaY = Math.abs(dyPx) > 5 ? Math.abs(dyMm / dyPx) : null;
  const residuo = {};
  if (escalaZ !== null) residuo.z = Number(((escalaZ - escala) / escala).toFixed(4));
  if (escalaY !== null) residuo.y = Number(((escalaY - escala) / escala).toFixed(4));
  const ruim = Object.entries(residuo).filter(([, v]) => Math.abs(v) > maxResiduoRelativo);
  if (ruim.length) {
    const detalhe = ruim.map(([eixo, v]) => `${eixo} ${(v * 100).toFixed(1)}%`).join(', ');
    throw new Error(`âncoras discordam da escala em ${detalhe} (máximo ${(maxResiduoRelativo * 100).toFixed(0)}%)`);
  }
  return {
    mmPorPx: escala,
    /* z cresce para a direita na foto; y cresce para cima, então inverte. */
    paraMm: (xPx, yPx) => [
      a.mm[0] + (xPx - a.px[0]) * escala,
      a.mm[1] - (yPx - a.px[1]) * escala,
    ],
    residuo,
  };
}

/* --- envelope da malha ---------------------------------------------------- */

/** Envelope lateral da malha: para cada estação em z, o maior e o menor y
 *  tocados pelas arestas das faces selecionadas. Projeção pura, sem câmera. */
export function envelopeDaMalha(neutro, { partes = null, estacoes = 200 } = {}) {
  const querParte = partes && partes.length ? new Set(partes) : null;
  const segmentos = [];
  let zMin = Infinity; let zMax = -Infinity;
  for (const face of neutro.F.values()) {
    if (querParte && !querParte.has(face.parte)) continue;
    const pts = face.vs.map((iv) => {
      const p = neutro.V.get(iv);
      return [p[2] * 1000, p[1] * 1000];
    });
    for (let i = 0; i < pts.length; i += 1) {
      const p = pts[i]; const q = pts[(i + 1) % pts.length];
      segmentos.push([p, q]);
      zMin = Math.min(zMin, p[0]); zMax = Math.max(zMax, p[0]);
    }
  }
  if (!segmentos.length) throw new Error(`nenhuma face para ${partes ? partes.join(', ') : 'a peça'}`);
  const topo = []; const base = [];
  for (let i = 0; i <= estacoes; i += 1) {
    const z = zMin + ((zMax - zMin) * i) / estacoes;
    let alto = null; let baixo = null;
    for (const [p, q] of segmentos) {
      const a = p[0]; const b = q[0];
      if ((a < z && b < z) || (a > z && b > z)) continue;
      const t = b === a ? 0 : (z - a) / (b - a);
      const y = p[1] + (q[1] - p[1]) * t;
      if (alto === null || y > alto) alto = y;
      if (baixo === null || y < baixo) baixo = y;
    }
    if (alto === null) continue;
    topo.push([z, alto]); base.push([z, baixo]);
  }
  return { topo, base, faixaZ: [zMin, zMax] };
}

/* --- envelope da foto ----------------------------------------------------- */

export function envelopeDaFoto(caminho, cal, { recorte, qual = 'topo', limiar = 248, suavizar = 3 }) {
  const img = lerPng(caminho);
  const [x0, y0, x1, y1] = recorte;
  const env = envelope(img, {
    x0: Math.max(0, x0), y0: Math.max(0, y0),
    x1: Math.min(img.largura - 1, x1), y1: Math.min(img.altura - 1, y1),
  }, { limiar, suavizar });
  const serie = env[qual];
  const pts = [];
  for (let i = 0; i < serie.length; i += 1) {
    if (serie[i] === null) continue;
    pts.push(cal.paraMm(i + env.x0, serie[i]));
  }
  pts.sort((a, b) => a[0] - b[0]);
  if (pts.length < 3) throw new Error(`a foto deu ${pts.length} coluna(s) com tinta no recorte; confira limiar e recorte`);
  return pts;
}

/* --- comparação ----------------------------------------------------------- */

const interpolar = (pts, z) => {
  if (z < pts[0][0] || z > pts[pts.length - 1][0]) return null;
  for (let i = 1; i < pts.length; i += 1) {
    if (pts[i - 1][0] <= z && pts[i][0] >= z) {
      const a = pts[i - 1]; const b = pts[i];
      const t = b[0] === a[0] ? 0 : (z - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return null;
};

export function compararBordas(foto, malha, { estacoes = 40 } = {}) {
  const zMin = Math.max(foto[0][0], malha[0][0]);
  const zMax = Math.min(foto[foto.length - 1][0], malha[malha.length - 1][0]);
  if (!(zMax > zMin)) throw new Error('a borda da foto e a da malha não se sobrepõem em z');
  const faixaFoto = foto[foto.length - 1][0] - foto[0][0];
  const faixaMalha = malha[malha.length - 1][0] - malha[0][0];
  const amostras = [];
  for (let i = 0; i <= estacoes; i += 1) {
    const z = zMin + ((zMax - zMin) * i) / estacoes;
    const f = interpolar(foto, z); const m = interpolar(malha, z);
    if (f === null || m === null) continue;
    amostras.push({ z, foto: f, malha: m, desvio: m - f });
  }
  if (!amostras.length) throw new Error('nenhuma estação com as duas bordas presentes');
  const desvios = amostras.map((a) => a.desvio);
  const abs = desvios.map(Math.abs);
  const pior = amostras.reduce((p, a) => (Math.abs(a.desvio) > Math.abs(p.desvio) ? a : p));
  return {
    estacoes: amostras.length,
    faixaZ: [Math.round(zMin), Math.round(zMax)],
    cobertura: {
      foto: Number(((zMax - zMin) / (faixaFoto || 1)).toFixed(3)),
      malha: Number(((zMax - zMin) / (faixaMalha || 1)).toFixed(3)),
    },
    desvioMedio: Number((desvios.reduce((s, v) => s + v, 0) / desvios.length).toFixed(1)),
    desvioAbsMedio: Number((abs.reduce((s, v) => s + v, 0) / abs.length).toFixed(1)),
    desvioMaximo: Number(pior.desvio.toFixed(1)),
    zDoPior: Math.round(pior.z),
    rms: Number(Math.sqrt(desvios.reduce((s, v) => s + v * v, 0) / desvios.length).toFixed(1)),
    amostras,
  };
}

/* --- CLI ------------------------------------------------------------------ */

export async function conferirContraReferencia({
  alvo, imagem, ancoras: caminhoAncoras, partes, qual, recorte, tolerancia, estacoes, limiar, completo,
}) {
  const cfg = JSON.parse(readFileSync(resolve(caminhoAncoras), 'utf8'));
  const escolha = (bandeira, doArquivo, padrao) => (bandeira !== undefined && bandeira !== null ? bandeira : (doArquivo ?? padrao));
  const qualBorda = escolha(qual, cfg.qual, 'topo');
  const rec = escolha(recorte, cfg.recorte, null);
  if (!rec) throw new Error('preciso de --recorte=x0,y0,x1,y1 ou de "recorte" no arquivo de âncoras');
  const tol = Number(escolha(tolerancia, cfg.tolerancia, 25));
  const listaPartes = escolha(partes, cfg.partes, null);

  const cal = calibrarPorAncoras(cfg.ancoras);
  const daFoto = envelopeDaFoto(resolve(imagem), cal, {
    recorte: rec, qual: qualBorda, limiar: Number(escolha(limiar, cfg.limiar, 248)),
  });

  const caminhoReceita = resolverCaminhoReceita(alvo);
  const modulo = await importarReceita(caminhoReceita);
  const receita = receitaDoModulo(modulo);
  const { neutro } = executarReceita(receita, {});
  const daMalha = envelopeDaMalha(neutro, { partes: listaPartes })[qualBorda];

  const r = compararBordas(daFoto, daMalha, { estacoes: Number(escolha(estacoes, cfg.estacoes, 40)) });

  let stdout = `CONFERÊNCIA CONTRA REFERÊNCIA — ${alvo}, borda ${qualBorda}\n`;
  stdout += `partes: ${listaPartes ? listaPartes.join(', ') : 'todas'}   `;
  stdout += `escala da foto: ${cal.mmPorPx.toFixed(4)} mm/px   `;
  stdout += `resíduo das âncoras: ${Object.entries(cal.residuo).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(', ') || '—'}\n`;
  stdout += `faixa comparada em z: ${r.faixaZ[0]} a ${r.faixaZ[1]} mm   `;
  stdout += `cobertura: foto ${Math.round(r.cobertura.foto * 100)}%, malha ${Math.round(r.cobertura.malha * 100)}%\n\n`;

  const mostrar = completo ? r.amostras : r.amostras.filter((_, i) => i % Math.max(1, Math.ceil(r.amostras.length / 12)) === 0);
  stdout += '        z (mm)     foto     malha    desvio\n';
  for (const a of mostrar) {
    stdout += `${String(Math.round(a.z)).padStart(14)}${String(Math.round(a.foto)).padStart(9)}${String(Math.round(a.malha)).padStart(10)}${String(Math.round(a.desvio)).padStart(10)}\n`;
  }
  if (!completo && mostrar.length < r.amostras.length) {
    stdout += `… ${r.amostras.length - mostrar.length} estação(ões) omitida(s). Para todas: --completo\n`;
  }
  stdout += '\nRESUMO — desvio positivo é malha ACIMA da foto\n';
  stdout += `média ${r.desvioMedio} mm   média absoluta ${r.desvioAbsMedio} mm   rms ${r.rms} mm\n`;
  stdout += `máximo ${r.desvioMaximo} mm em z=${r.zDoPior}   tolerância ${tol} mm\n`;

  const ok = Math.abs(r.desvioMaximo) <= tol;
  stdout += ok
    ? `\nAPROVADO: nenhuma estação passa de ${tol} mm.\n`
    : `\nREPROVADO: o pior desvio (${Math.abs(r.desvioMaximo)} mm) passa da tolerância de ${tol} mm.\n`;
  return { ok, stdout, resultado: r, calibracao: { mmPorPx: cal.mmPorPx, residuo: cal.residuo } };
}

const listaOuNulo = (v) => (typeof v === 'string' && v.length ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined);

async function principal(argv) {
  const args = lerArgumentos(argv, {
    posicional: { nome: 'a peça', obrigatorio: true },
    bandeiras: ['completo'],
    opcoes: ['imagem', 'ancoras', 'partes', 'qual', 'recorte', 'tolerancia', 'estacoes', 'limiar'],
  });
  const imagem = args.opcao('imagem');
  const ancoras = args.opcao('ancoras');
  if (!imagem || !ancoras) {
    throw new Error('diga --imagem=<png> e --ancoras=<json>.');
  }
  const recorte = args.opcao('recorte');
  const r = await conferirContraReferencia({
    alvo: args.posicional,
    imagem,
    ancoras,
    partes: listaOuNulo(args.opcao('partes')),
    qual: args.opcao('qual') ?? undefined,
    recorte: recorte ? recorte.split(',').map(Number) : undefined,
    tolerancia: args.opcao('tolerancia') ?? undefined,
    estacoes: args.opcao('estacoes') ?? undefined,
    limiar: args.opcao('limiar') ?? undefined,
    completo: args.bandeira('completo'),
  });
  process.stdout.write(r.stdout);
  return r.ok ? 0 : 1;
}

const chamadoDireto = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (chamadoDireto) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => {
    process.stderr.write(`conferir-contra-referencia: ${e.message}\n`);
    process.exitCode = 2;
  });
}
