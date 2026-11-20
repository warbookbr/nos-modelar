#!/usr/bin/env node
/* prancha-coerencia.mjs — confere coerência geométrica entre pranchas parciais
   do mesmo objeto (lateral, frontal, traseira, planta/topo): envelope compartilhado,
   alturas e posições de landmarks de mesmo id, intervalos de camadas nomeadas
   compartilhadas e medidas declaradas M.

   Uso:
     node tools/modelar/prancha/prancha-coerencia.mjs <pasta-ou-arquivo.prancha.mjs> [...] [--tolerancia=12] [--tolerancia-envelope=5] [--json] */

import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prancha } from './prancha.mjs';

const EIXOS_DA_VISTA = {
  lateral: ['z', 'y'],
  planta: ['z', 'x'],
  topo: ['x', 'z'],
  frontal: ['x', 'y'],
  traseira: ['x', 'y'],
};

/* Inverte a projeção de prancha.mjs (linhas 74–85) para recuperar cada ponto da camada em mm. */
export function inverterPontoSvg(vista, [sx, sy], spec) {
  const s = spec.escala;
  const { zMin, zMax, yMax, xMax } = spec.limites;
  const v = spec.vistas[vista];
  if (!v) throw new Error(`vista desconhecida no spec: ${vista}`);
  switch (vista) {
    case 'lateral': return [zMin + (sx - v.x) / s, yMax - (sy - v.y) / s];
    case 'planta': return [zMin + (sx - v.x) / s, (sy - v.y) / s - xMax];
    case 'topo': return [(sx - v.x) / s - xMax, zMax - (sy - v.y) / s];
    case 'frontal': return [(sx - v.x) / s - xMax, yMax - (sy - v.y) / s];
    case 'traseira': return [xMax - (sx - v.x) / s, yMax - (sy - v.y) / s];
    default: throw new Error(`vista não suportada: ${vista}`);
  }
}

function caixaDePontos(pts) {
  let uMin = Infinity; let uMax = -Infinity;
  let vMin = Infinity; let vMax = -Infinity;
  for (const [u, v] of pts) {
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }
  return { uMin, uMax, vMin, vMax };
}

function extrairDadosDaPrancha(spec, medidas = null) {
  const { relatorio, desenho } = prancha(spec);
  const linhasContorno = desenho.linhas.filter((l) => l.tipo === 'contorno');
  const camadasPorNome = new Map();

  for (let i = 0; i < spec.camadas.length; i += 1) {
    const cam = spec.camadas[i];
    const linha = linhasContorno[i];
    if (!linha || !EIXOS_DA_VISTA[cam.vista]) continue;
    const ptsMm = linha.pts.map((p) => inverterPontoSvg(cam.vista, p, spec));
    const caixa = caixaDePontos(ptsMm);
    const [e0, e1] = EIXOS_DA_VISTA[cam.vista];
    const chave = `${cam.vista}:${cam.nome ?? i}`;
    camadasPorNome.set(chave, {
      vista: cam.vista,
      nome: cam.nome,
      contorno: Boolean(cam.contorno),
      foraDoContorno: Boolean(cam.foraDoContorno),
      eixos: {
        [e0]: [caixa.uMin, caixa.uMax],
        [e1]: [caixa.vMin, caixa.vMax],
      },
    });
  }

  /* Intervalo total de cada vista nos seus 2 eixos (contorno + rodas/foraDoContorno para chão). */
  const limitesPorVista = {};
  for (const [vista, dados] of Object.entries(relatorio.porVista)) {
    const eixos = EIXOS_DA_VISTA[vista];
    if (!eixos || !dados.caixa) continue;
    const [e0, e1] = eixos;
    let min0 = dados.caixa.xMin; let max0 = dados.caixa.xMax;
    let min1 = dados.caixa.yMin; let max1 = dados.caixa.yMax;
    /* Incluir foraDoContorno (rodas) no yMin global para medir altura total consistente */
    for (const c of camadasPorNome.values()) {
      if (c.vista !== vista || !c.foraDoContorno) continue;
      if (e1 === 'y') {
        min1 = Math.min(min1, c.eixos.y[0]);
        max1 = Math.max(max1, c.eixos.y[1]);
      }
    }
    limitesPorVista[vista] = {
      leitura: spec.vistas[vista]?.leitura ?? 'projecao',
      eixos: { [e0]: [min0, max0], [e1]: [min1, max1] },
      contorno: {
        [e0]: [dados.caixa.xMin, dados.caixa.xMax],
        [e1]: [dados.caixa.yMin, dados.caixa.yMax],
      },
    };
  }

  const landmarks = (spec.landmarks ?? []).map((lm) => {
    const eixos = EIXOS_DA_VISTA[lm.vista];
    if (!eixos) return null;
    return {
      id: lm.id,
      vista: lm.vista,
      coords: { [eixos[0]]: lm.em[0], [eixos[1]]: lm.em[1] },
    };
  }).filter(Boolean);

  return { relatorio, limitesPorVista, camadas: [...camadasPorNome.values()], landmarks, medidas };
}

const r2 = (v) => Math.round(v * 100) / 100;

export function conferirCoerencia(entradas, { tolerancia = 12, toleranciaEnvelope = 5 } = {}) {
  if (!entradas.length) throw new Error('nenhuma prancha fornecida para conferir coerência');
  const analisadas = entradas.map((e) => ({
    arquivo: e.arquivo ?? '(em-memoria)',
    ...extrairDadosDaPrancha(e.spec, e.medidas ?? null),
  }));

  const verificacoes = [];
  const divergencias = [];

  /* 1. Envelope compartilhado por eixo (x, y, z) entre vistas de projeção. */
  const porEixo = { x: [], y: [], z: [] };
  for (const item of analisadas) {
    for (const [vista, info] of Object.entries(item.limitesPorVista)) {
      if (info.leitura !== 'projecao') continue;
      for (const [eixo, [min, max]] of Object.entries(info.eixos)) {
        porEixo[eixo].push({ vista, arquivo: item.arquivo, min, max, span: max - min });
      }
    }
  }
  for (const [eixo, lista] of Object.entries(porEixo)) {
    if (lista.length < 2) continue;
    const minLo = Math.min(...lista.map((i) => i.min));
    const minHi = Math.max(...lista.map((i) => i.min));
    const maxLo = Math.min(...lista.map((i) => i.max));
    const maxHi = Math.max(...lista.map((i) => i.max));
    const spanLo = Math.min(...lista.map((i) => i.span));
    const spanHi = Math.max(...lista.map((i) => i.span));
    const erroMax = Math.max(minHi - minLo, maxHi - maxLo, spanHi - spanLo);
    const resumo = {
      tipo: 'envelope',
      eixo,
      vistas: lista.map((i) => `${i.vista}[${r2(i.min)}..${r2(i.max)}]`),
      desvioMm: r2(erroMax),
      toleranciaMm: toleranciaEnvelope,
      ok: erroMax <= toleranciaEnvelope,
    };
    verificacoes.push(resumo);
    if (!resumo.ok) {
      divergencias.push(`envelope eixo ${eixo}: desvio ${r2(erroMax)} mm (tolerância ${toleranciaEnvelope} mm) — ${resumo.vistas.join(' vs ')}`);
    }
  }

  /* 2. Landmarks com o mesmo id em múltiplas vistas. */
  const lmPorId = new Map();
  for (const item of analisadas) {
    for (const lm of item.landmarks) {
      const arr = lmPorId.get(lm.id) ?? [];
      arr.push(lm);
      lmPorId.set(lm.id, arr);
    }
  }
  for (const [id, ocorrencias] of lmPorId.entries()) {
    if (ocorrencias.length < 2) continue;
    for (const eixo of ['x', 'y', 'z']) {
      const comEixo = ocorrencias.filter((o) => o.coords[eixo] !== undefined);
      if (comEixo.length < 2) continue;
      const vals = comEixo.map((o) => o.coords[eixo]);
      const diff = Math.max(...vals) - Math.min(...vals);
      const detalhe = comEixo.map((o) => `${o.vista}=${r2(o.coords[eixo])}`).join(' vs ');
      const ok = diff <= tolerancia;
      verificacoes.push({ tipo: 'landmark', id, eixo, desvioMm: r2(diff), toleranciaMm: tolerancia, ok, detalhe });
      if (!ok) {
        divergencias.push(`landmark "${id}" no eixo ${eixo}: desvio ${r2(diff)} mm (tolerância ${tolerancia} mm) — ${detalhe}`);
      }
    }
  }

  /* 3. Camadas nomeadas não-contorno compartilhadas entre vistas (ex.: paraBrisa, vidroTraseiro, teto). */
  const camPorNome = new Map();
  for (const item of analisadas) {
    for (const c of item.camadas) {
      if (!c.nome || c.contorno) continue;
      const arr = camPorNome.get(c.nome) ?? [];
      arr.push(c);
      camPorNome.set(c.nome, arr);
    }
  }
  for (const [nome, ocorrencias] of camPorNome.entries()) {
    if (ocorrencias.length < 2) continue;
    for (const eixo of ['x', 'y', 'z']) {
      const comEixo = ocorrencias.filter((o) => o.eixos[eixo] !== undefined);
      if (comEixo.length < 2) continue;
      const dMin = Math.max(...comEixo.map((o) => o.eixos[eixo][0])) - Math.min(...comEixo.map((o) => o.eixos[eixo][0]));
      const dMax = Math.max(...comEixo.map((o) => o.eixos[eixo][1])) - Math.min(...comEixo.map((o) => o.eixos[eixo][1]));
      const diff = Math.max(dMin, dMax);
      const detalhe = comEixo.map((o) => `${o.vista}[${r2(o.eixos[eixo][0])}..${r2(o.eixos[eixo][1])}]`).join(' vs ');
      const ok = diff <= tolerancia;
      verificacoes.push({ tipo: 'camada', nome, eixo, desvioMm: r2(diff), toleranciaMm: tolerancia, ok, detalhe });
      if (!ok) {
        divergencias.push(`camada "${nome}" no eixo ${eixo}: desvio ${r2(diff)} mm (tolerância ${tolerancia} mm) — ${detalhe}`);
      }
    }
  }

  /* 4. Medidas rígidas M exportadas pelos módulos, quando presentes. */
  const chavesMedida = ['comprimento', 'largura', 'altura', 'entreEixos', 'pneuDiametro', 'bitola'];
  for (const chave of chavesMedida) {
    const comChave = analisadas.filter((a) => a.medidas && typeof a.medidas[chave] === 'number');
    if (comChave.length < 2) continue;
    const vals = comChave.map((a) => a.medidas[chave]);
    const diff = Math.max(...vals) - Math.min(...vals);
    if (diff > 0) {
      const detalhe = comChave.map((a) => `${Object.keys(a.limitesPorVista)[0]}=${a.medidas[chave]}`).join(' vs ');
      verificacoes.push({ tipo: 'medida', chave, desvioMm: r2(diff), toleranciaMm: 0, ok: false, detalhe });
      divergencias.push(`medida M.${chave} diverge entre pranchas: ${detalhe}`);
    }
  }

  const vistas = [...new Set(analisadas.flatMap((a) => Object.keys(a.limitesPorVista)))];
  return {
    ok: divergencias.length === 0,
    vistas,
    toleranciaMm: tolerancia,
    toleranciaEnvelopeMm: toleranciaEnvelope,
    verificacoes,
    divergencias,
  };
}

export async function carregarPranchas(alvos) {
  const arquivos = [];
  for (const alvo of alvos) {
    const abs = resolve(alvo);
    const st = statSync(abs);
    if (st.isDirectory()) {
      for (const nome of readdirSync(abs).sort()) {
        if (nome.endsWith('.prancha.mjs')) arquivos.push(join(abs, nome));
      }
    } else {
      arquivos.push(abs);
    }
  }
  const entradas = [];
  for (const arq of arquivos) {
    const mod = await import(pathToFileURL(arq).href);
    if (!mod.ESPEC) throw new Error(`${arq} não exporta ESPEC`);
    entradas.push({ arquivo: arq, spec: mod.ESPEC, medidas: mod.M ?? null });
  }
  return entradas;
}

export function imprimirCoerencia(res) {
  const linhas = [
    `prancha:coerencia — vistas: ${res.vistas.join(', ')} (${res.verificacoes.length} verificações, ${res.divergencias.length} divergência(s))`,
  ];
  for (const v of res.verificacoes) {
    const marca = v.ok ? 'OK  ' : 'ERRO';
    if (v.tipo === 'envelope') {
      linhas.push(`  [${marca}] envelope ${v.eixo}: desvio ${v.desvioMm} mm (tol ${v.toleranciaMm}) — ${v.vistas.join(' | ')}`);
    } else if (v.tipo === 'landmark') {
      linhas.push(`  [${marca}] landmark ${v.id} (${v.eixo}): desvio ${v.desvioMm} mm (tol ${v.toleranciaMm}) — ${v.detalhe}`);
    } else if (v.tipo === 'camada') {
      linhas.push(`  [${marca}] camada ${v.nome} (${v.eixo}): desvio ${v.desvioMm} mm (tol ${v.toleranciaMm}) — ${v.detalhe}`);
    } else {
      linhas.push(`  [${marca}] medida M.${v.chave}: ${v.detalhe}`);
    }
  }
  return linhas.join('\n');
}

const AJUDA = `uso: npm run prancha:coerencia -- <pasta-ou-arquivos.prancha.mjs...> [opções]

Opções:
  --tolerancia=<mm>           tolerância para landmarks e camadas compartilhadas (padrão: 12)
  --tolerancia-envelope=<mm>  tolerância para envelope compartilhado entre vistas (padrão: 5)
  --json                      imprime o relatório em JSON`;

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  const raw = process.argv.slice(2);
  const alvos = [];
  let tolerancia = 12;
  let toleranciaEnvelope = 5;
  let json = false;
  let ajuda = false;
  for (const a of raw) {
    if (a === '--ajuda' || a === '-h') ajuda = true;
    else if (a === '--json') json = true;
    else if (a.startsWith('--tolerancia=')) tolerancia = Number(a.split('=')[1]);
    else if (a.startsWith('--tolerancia-envelope=')) toleranciaEnvelope = Number(a.split('=')[1]);
    else alvos.push(a);
  }
  if (ajuda || !alvos.length) {
    console.log(AJUDA);
    process.exit(ajuda ? 0 : 2);
  }
  const entradas = await carregarPranchas(alvos);
  const res = conferirCoerencia(entradas, { tolerancia, toleranciaEnvelope });
  console.log(json ? JSON.stringify(res, null, 2) : imprimirCoerencia(res));
  if (!res.ok) process.exitCode = 1;
}
