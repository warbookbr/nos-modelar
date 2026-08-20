#!/usr/bin/env node
/* prancha.mjs — motor de prancha ortográfica alvo. Recebe especificação declarativa
   em milímetros e devolve SVG determinístico MAIS um relatório medido da própria
   saída. Não conhece carro: conhece vista, camada, âncora, cota e métrica.
   O relatório existe porque desenhar sem medir é a causa raiz documentada em
   docs/mecanifica/planos/2026-08-19-motor-de-prancha-medida.md. */

import * as G from './prancha-geometria.mjs';
import { validarAutoriaPrancha } from './prancha-autoria.mjs';

const n = (v) => Number(v.toFixed(2));

/* Âncoras proporcionais: a referência é lida em fração ("base do para-brisa a
   0,45 do entre-eixos"), então a especificação escreve na mesma moeda e o motor
   traduz. Milímetro absoluto continua válido onde a medida é rígida. */
export function criarAncoras({ entreEixos, altura, meiaLargura }) {
  const meio = entreEixos / 2;
  return {
    /* 0 = eixo traseiro, 1 = eixo dianteiro; fora do intervalo são os balanços. */
    fz: (f) => -meio + f * entreEixos,
    fy: (f) => f * altura,
    fx: (f) => f * meiaLargura,
    entreEixos,
    altura,
    meiaLargura,
    zEixoT: -meio,
    zEixoD: meio,
  };
}

const ESTILOS = `
  .contorno{fill:none;stroke:#12233b;stroke-width:2.1;stroke-linejoin:round;stroke-linecap:round}
  .painel{fill:none;stroke:#2f4562;stroke-width:1.25;stroke-linejoin:round;stroke-linecap:round}
  .vidro{fill:none;stroke:#3d6b86;stroke-width:1.35;stroke-linejoin:round}
  .cromo{fill:none;stroke:#8a94a2;stroke-width:1.4;stroke-linejoin:round}
  .roda{fill:none;stroke:#8a94a2;stroke-width:1.6}
  .aro{fill:none;stroke:#c0c6cf;stroke-width:1.1}
  .eixo{fill:none;stroke:#c8ccd2;stroke-width:1;stroke-dasharray:9 4 2 4}
  .carater{fill:none;stroke:#b3593d;stroke-width:1.7;stroke-dasharray:6 3}
  .cota{stroke:#b3593d;stroke-width:1;fill:none}
  .cotat{fill:#b3593d;font-size:11px}
  .lm{fill:#1f6f5c}
  .lmt{fill:#1f6f5c;font-size:9.5px}
  .tit{fill:#12233b;font-size:15px;font-weight:600}
  .sub{fill:#6b7481;font-size:11px}
  .rot{fill:#8b93a0;font-size:10.5px;letter-spacing:.06em}
`;

/* Que par de coordenadas de mundo cada vista carrega. É este mapa que permite
   comparar vistas entre si: lateral e planta compartilham z; lateral, frontal e
   traseira compartilham y; planta, frontal e traseira compartilham x. */
export const EIXOS_DA_VISTA = {
  lateral: ['z', 'y'],
  planta: ['z', 'x'],
  frontal: ['x', 'y'],
  traseira: ['x', 'y'],
};

function projetores(spec) {
  const s = spec.escala;
  const { zMin, yMax, xMax } = spec.limites;
  const v = spec.vistas;
  return {
    lateral: ([z, y]) => [v.lateral.x + (z - zMin) * s, v.lateral.y + (yMax - y) * s],
    planta: ([z, x]) => [v.planta.x + (z - zMin) * s, v.planta.y + (x + xMax) * s],
    frontal: ([x, y]) => [v.frontal.x + (x + xMax) * s, v.frontal.y + (yMax - y) * s],
    traseira: ([x, y]) => [v.traseira.x + (xMax - x) * s, v.traseira.y + (yMax - y) * s],
  };
}

/* Toda camada vira polilinha amostrada em milímetro. É o que permite desenhar e
   medir o MESMO dado, em vez de medir uma segunda verdade reconstruída. */
function amostrar(c) {
  const op = { fechado: Boolean(c.fechado) };
  switch (c.tipo) {
    case 'circulo': return G.circulo(c.centro, c.raio);
    case 'arco': return G.arcoSuperior(c.centro, c.raio);
    case 'poli': return G.poli(c.pts, op);
    case 'suave': return G.suave(c.pts, op);
    default: return G.filete(c.pts, op);
  }
}

/* Encadeia os trechos de contorno de uma vista num anel único, para medir
   fechamento e para testar o que escapou dele. */
function encadear(trechos, tol) {
  if (trechos.length === 0) return { anel: [], abertos: [] };
  const restante = trechos.map((t) => t.slice());
  const anel = restante.shift();
  let mudou = true;
  while (restante.length > 0 && mudou) {
    mudou = false;
    const fim = anel[anel.length - 1];
    const ini = anel[0];
    for (let i = 0; i < restante.length; i += 1) {
      const t = restante[i];
      const a = t[0]; const b = t[t.length - 1];
      const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (d(fim, a) <= tol) { anel.push(...t.slice(1)); restante.splice(i, 1); mudou = true; break; }
      if (d(fim, b) <= tol) { anel.push(...t.slice(0, -1).reverse()); restante.splice(i, 1); mudou = true; break; }
      if (d(ini, b) <= tol) { anel.unshift(...t.slice(0, -1)); restante.splice(i, 1); mudou = true; break; }
      if (d(ini, a) <= tol) { anel.unshift(...t.slice(1).reverse()); restante.splice(i, 1); mudou = true; break; }
    }
  }
  return { anel, abertos: restante };
}

/* C2, C3 e C4: as quatro vistas descrevem o MESMO objeto, e até aqui ninguém
   verificava isso. Cada vista era medida sozinha, então lateral e frontal podiam
   discordar sobre onde o corpo termina embaixo, e ninguém percebia. */
function medirCoerencia(spec, porVista, alertas) {
  const tol = spec.toleranciaCoerencia ?? 8;
  const faixas = {};

  for (const [nome, m] of Object.entries(porVista)) {
    const eixos = EIXOS_DA_VISTA[nome];
    if (!eixos || !m.caixa) continue;
    const leitura = spec.vistas[nome]?.leitura ?? 'projecao';
    const par = [
      [eixos[0], m.caixa.xMin, m.caixa.xMax],
      [eixos[1], m.caixa.yMin, m.caixa.yMax],
    ];
    for (const [eixo, min, max] of par) {
      (faixas[eixo] ??= []).push({ vista: nome, leitura, min, max });
    }
  }

  /* Faixa por eixo compartilhado. Uma vista declarada `projecao` enxerga o corpo
     inteiro e tem de bater com o extremo global; uma `secao` só precisa caber
     dentro dele. Forçar essa declaração é metade do valor da checagem. */
  const porEixo = {};
  for (const [eixo, lista] of Object.entries(faixas)) {
    if (lista.length < 2) continue;
    const proj = lista.filter((f) => f.leitura === 'projecao');
    /* Declarar tudo como seção silenciaria a checagem — o mesmo erro que
       `foraDoContorno` já causou uma vez. Se nenhuma vista de um eixo enxerga o
       corpo inteiro, a prancha não estabelece a medida daquele eixo em lugar
       nenhum, e isso é o alerta. */
    if (proj.length === 0) alertas.push(`coerência ${eixo}: nenhuma vista declarada como projeção, então a extensão do corpo neste eixo não é estabelecida por ninguém`);
    const referencia = proj.length ? proj : lista;
    const min = Math.min(...referencia.map((f) => f.min));
    const max = Math.max(...referencia.map((f) => f.max));
    porEixo[eixo] = { min: n(min), max: n(max), vistas: {} };
    for (const f of lista) {
      const dMin = f.min - min;
      const dMax = f.max - max;
      porEixo[eixo].vistas[f.vista] = { min: n(f.min), max: n(f.max), leitura: f.leitura };
      if (f.leitura === 'projecao') {
        if (Math.abs(dMin) > tol) alertas.push(`coerência ${eixo}: ${f.vista} começa em ${n(f.min)} e as outras vistas em ${n(min)} — diferença de ${n(Math.abs(dMin))} mm no mesmo corpo`);
        if (Math.abs(dMax) > tol) alertas.push(`coerência ${eixo}: ${f.vista} termina em ${n(f.max)} e as outras vistas em ${n(max)} — diferença de ${n(Math.abs(dMax))} mm no mesmo corpo`);
      } else {
        if (dMin < -tol) alertas.push(`coerência ${eixo}: seção ${f.vista} passa de ${n(f.min)}, abaixo do corpo em ${n(min)}`);
        if (dMax > tol) alertas.push(`coerência ${eixo}: seção ${f.vista} passa de ${n(f.max)}, acima do corpo em ${n(max)}`);
      }
    }
  }

  /* Envelope declarado, conferido contra o que foi de fato traçado — no lugar de
     `throw` escrito à mão em cada especificação. */
  const envelope = {};
  const decl = spec.envelope ?? {};
  /* Deriva de `faixas`, e não de `porEixo`: um eixo carregado por uma única
     vista não tem par para comparar, mas continua tendo medida — e era assim que
     o comprimento, que só a lateral conhece, escapava da conferência. */
  const medidoDe = (eixo, modo) => {
    const lista = faixas[eixo];
    if (!lista || lista.length === 0) return null;
    const proj = lista.filter((f) => f.leitura === 'projecao');
    const ref = proj.length ? proj : lista;
    const min = Math.min(...ref.map((f) => f.min));
    const max = Math.max(...ref.map((f) => f.max));
    return modo === 'vao' ? max - min : max;
  };
  for (const [chave, eixo, modo] of [['comprimento', 'z', 'vao'], ['largura', 'x', 'vao'], ['altura', 'y', 'topo']]) {
    if (decl[chave] === undefined) continue;
    const medido = medidoDe(eixo, modo);
    if (medido === null) continue;
    envelope[chave] = { medido: n(medido), declarado: decl[chave], desvio: n(medido - decl[chave]) };
    if (Math.abs(medido - decl[chave]) > tol) {
      alertas.push(`envelope: ${chave} traçado ${n(medido)} contra ${decl[chave]} declarado`);
    }
  }

  /* Simetria: contorno que cruza x = 0 conferido contra o próprio espelho. */
  const simetria = {};
  for (const [nome, m] of Object.entries(porVista)) {
    const eixos = EIXOS_DA_VISTA[nome];
    if (!eixos || !eixos.includes('x') || !m.caixa) continue;
    const ehPrimeiro = eixos[0] === 'x';
    const min = ehPrimeiro ? m.caixa.xMin : m.caixa.yMin;
    const max = ehPrimeiro ? m.caixa.xMax : m.caixa.yMax;
    const desvio = Math.abs(max + min);
    simetria[nome] = n(desvio);
    if (desvio > tol) alertas.push(`simetria: ${nome} vai de ${n(min)} a ${n(max)}, fora de esquadro com o plano x = 0 em ${n(desvio)} mm`);
  }

  return { porEixo, envelope, simetria };
}

function medir(spec, camadas) {
  const tol = spec.tolerancia ?? 6;
  const porVista = {};
  const alertas = [];

  for (const nome of Object.keys(spec.vistas)) {
    const daVista = camadas.filter((c) => c.vista === nome);
    const contorno = daVista.filter((c) => c.contorno).map((c) => c.pl);
    const { anel, abertos } = encadear(contorno, tol);
    const fechado = anel.length > 2
      && Math.hypot(anel[0][0] - anel[anel.length - 1][0], anel[0][1] - anel[anel.length - 1][1]) <= tol
      && abertos.length === 0;
    const autoIntersecoes = fechado ? G.autoIntersecoes(anel) : [];

    let fora = 0;
    const culpadas = [];
    if (fechado) {
      for (const c of daVista) {
        if (c.contorno || c.classe === 'eixo' || c.foraDoContorno) continue;
        let foraDaCamada = 0;
        for (const p of c.pl) if (!G.dentro(p, anel)) foraDaCamada += 1;
        if (foraDaCamada > 0) culpadas.push(`${c.nome ?? c.classe ?? 'camada'} (${foraDaCamada})`);
        fora += foraDaCamada;
      }
    }

    porVista[nome] = {
      caixa: anel.length ? G.caixa(anel) : null,
      contornoFechado: fechado,
      trechosSoltos: abertos.length,
      autoIntersecoes: autoIntersecoes.length,
      pontosForaDoContorno: fora,
      camadasQueEscaparam: culpadas,
    };
    if (contorno.length > 0 && !fechado) alertas.push(`${nome}: contorno não fecha (${abertos.length} trecho(s) solto(s))`);
    if (autoIntersecoes.length > 0) alertas.push(`${nome}: contorno se auto-intersecta em ${autoIntersecoes.length} par(es) de trecho — silhueta ambígua`);
    if (fora > 0) alertas.push(`${nome}: ${fora} ponto(s) fora do contorno — ${culpadas.join(', ')}`);
  }

  const porCamada = {};
  for (const c of camadas) {
    if (c.foraDoContorno && !c.motivoForaDoContorno) {
      alertas.push(`${c.nome ?? c.classe ?? 'camada'}: foraDoContorno exige motivoForaDoContorno para não silenciar um defeito`);
    }
    if (!c.nome) continue;
    const m = {
      vista: c.vista,
      comprimento: n(G.comprimento(c.pl)),
      retidao: Number(G.retidao(c.pl).toFixed(3)),
      concentracao: Number(G.concentracaoDoGiro(c.pl).toFixed(3)),
      inversoes: G.inversoes(c.pl),
      raioMin: G.raioMinimo(c.pl) === Infinity ? null : Math.round(G.raioMinimo(c.pl)),
    };
    porCamada[c.nome] = m;
    const e = c.esperado;
    if (!e) continue;
    if (e.concentracaoMax !== undefined && m.concentracao > e.concentracaoMax) alertas.push(`${c.nome}: concentração de giro ${m.concentracao} acima de ${e.concentracaoMax} — abaulou onde a especificação pediu trecho reto com raio curto`);
    if (e.retidaoMin !== undefined && m.retidao < e.retidaoMin) alertas.push(`${c.nome}: retidão ${m.retidao} abaixo do mínimo ${e.retidaoMin}`);
    if (e.inversoesMax !== undefined && m.inversoes > e.inversoesMax) alertas.push(`${c.nome}: ${m.inversoes} inversões de curvatura, máximo ${e.inversoesMax}`);
    if (e.raioMinMin !== undefined && m.raioMin !== null && m.raioMin < e.raioMinMin) alertas.push(`${c.nome}: raio mínimo ${m.raioMin} mm abaixo de ${e.raioMinMin} mm`);
  }

  /* Landmark declarado "sobre" uma camada precisa cair nela. É o que pega o
     desvio introduzido pelo filete, que corta o canto e afasta a linha do
     vértice declarado. */
  const porLandmark = {};
  for (const l of spec.landmarks ?? []) {
    if (!l.sobre) continue;
    const alvo = camadas.find((c) => c.nome === l.sobre && c.vista === l.vista);
    if (!alvo) { alertas.push(`landmark ${l.id}: camada "${l.sobre}" não existe na vista ${l.vista}`); continue; }
    let d = Infinity;
    for (const p of alvo.pl) d = Math.min(d, Math.hypot(p[0] - l.em[0], p[1] - l.em[1]));
    porLandmark[l.id] = { sobre: l.sobre, desvio: n(d) };
    const limite = l.tolerancia ?? spec.toleranciaLandmark ?? 6;
    if (d > limite) alertas.push(`landmark ${l.id}: ${n(d)} mm fora de "${l.sobre}", tolerância ${limite} mm`);
  }

  const coerencia = medirCoerencia(spec, porVista, alertas);

  return { porVista, porCamada, porLandmark, coerencia, alertas };
}

function validarSpec(spec) {
  const erros = [];
  const finito = (v) => typeof v === 'number' && Number.isFinite(v);
  const ponto = (p) => Array.isArray(p) && p.length >= 2 && finito(p[0]) && finito(p[1]);
  if (!spec || typeof spec !== 'object') return ['especificação ausente'];
  if (!spec.tela || !finito(spec.tela.largura) || !finito(spec.tela.altura)
    || spec.tela.largura <= 0 || spec.tela.altura <= 0) erros.push('tela precisa ter largura e altura finitas e positivas');
  if (!spec.limites || !['zMin', 'zMax', 'yMax', 'xMax'].every((k) => finito(spec.limites[k]))) erros.push('limites precisam declarar zMin, zMax, yMax e xMax finitos');
  if (!spec.vistas || Object.keys(spec.vistas).length === 0) erros.push('é necessária ao menos uma vista declarada');
  for (const [nome, vista] of Object.entries(spec.vistas ?? {})) {
    if (!EIXOS_DA_VISTA[nome]) erros.push(`vista "${nome}" não é uma vista ortográfica reconhecida`);
    if (!vista || !finito(vista.x) || !finito(vista.y)) erros.push(`vista "${nome}" precisa de posição x/y finita`);
    if (vista?.leitura !== undefined && !['projecao', 'secao'].includes(vista.leitura)) erros.push(`vista "${nome}" tem leitura inválida`);
  }
  if (!Array.isArray(spec.camadas) || spec.camadas.length === 0) erros.push('é necessária ao menos uma camada');
  for (const [i, camada] of (spec.camadas ?? []).entries()) {
    if (!spec.vistas?.[camada.vista]) erros.push(`camada ${i}: vista "${camada.vista}" não declarada`);
    if (camada.tipo === 'circulo' || camada.tipo === 'arco') {
      if (!ponto(camada.centro) || !finito(camada.raio) || camada.raio <= 0) erros.push(`camada ${i}: círculo/arco exige centro e raio positivo finitos`);
    } else if (!Array.isArray(camada.pts) || camada.pts.length < 2 || camada.pts.some((p) => !ponto(p))) {
      erros.push(`camada ${i}: pts precisa conter ao menos dois pontos finitos`);
    }
  }
  return erros;
}

export function prancha(spec) {
  const autoria = validarAutoriaPrancha(spec);
  const erros = [...validarSpec(spec), ...autoria.erros];
  if (erros.length) throw new Error(`prancha inválida: ${erros.join('; ')}`);
  const proj = projetores(spec);
  const camadas = spec.camadas.map((c) => ({ ...c, pl: amostrar(c) }));
  const relatorio = medir(spec, camadas);
  relatorio.autoria = {
    estado: spec.autoria.estado,
    confianca: spec.autoria.confianca,
    bloqueada: autoria.bloqueada,
    procedencias: spec.autoria.procedencias.map((p) => p.id),
    incertezas: spec.autoria.incertezas.map((u) => u.id),
  };
  if (autoria.bloqueada) {
    relatorio.alertas.push('autoria bloqueada: referência insuficiente não pode orientar modelagem precisa');
  }

  const O = [];
  const put = (x) => O.push(x);
  const { largura: W, altura: H } = spec.tela;

  put(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-sans-serif, system-ui, sans-serif">`);
  put(`<rect width="${W}" height="${H}" fill="#fbfbfa"/>`);
  put(`<style>${ESTILOS}</style>`);
  put(`<text x="40" y="34" class="tit">${spec.titulo}</text>`);
  put(`<text x="40" y="53" class="sub">${spec.subtitulo}</text>`);

  for (const vista of Object.values(spec.vistas)) {
    if (vista.rotulo) put(`<text x="${vista.x}" y="${vista.y - 12}" class="rot">${vista.rotulo}</text>`);
  }

  for (const c of camadas) {
    const p = proj[c.vista];
    const d = c.pl.map((q) => p(q)).map(([a, b], i) => `${i ? 'L' : 'M'} ${n(a)} ${n(b)}`).join(' ');
    put(`<path class="${c.classe ?? 'contorno'}" d="${d}"/>`);
  }

  for (const c of spec.cotas ?? []) {
    const p = proj[c.vista];
    const [ax, ay] = p(c.de); const [bx, by] = p(c.ate);
    const dx = c.desloca?.[0] ?? 0; const dy = c.desloca?.[1] ?? 0;
    put(`<path class="cota" d="M ${n(ax + dx)} ${n(ay + dy)} L ${n(bx + dx)} ${n(by + dy)}"/>`);
    const mx = (ax + bx) / 2 + dx; const my = (ay + by) / 2 + dy;
    const vert = Math.abs(bx - ax) < Math.abs(by - ay);
    put(vert
      ? `<text x="${n(mx - 6)}" y="${n(my)}" class="cotat" text-anchor="middle" transform="rotate(-90 ${n(mx - 6)} ${n(my)})">${c.texto}</text>`
      : `<text x="${n(mx)}" y="${n(my - 6)}" class="cotat" text-anchor="middle">${c.texto}</text>`);
  }

  for (const l of spec.landmarks ?? []) {
    const [x, y] = proj[l.vista](l.em);
    put(`<circle class="lm" cx="${n(x)}" cy="${n(y)}" r="2.6"/>`);
    if (l.id) put(`<text class="lmt" x="${n(x + 6)}" y="${n(y + (l.abaixo ? 14 : -6))}">${l.id}</text>`);
  }

  if (spec.legenda) {
    const { x, y, itens, notas = [] } = spec.legenda;
    put(`<text x="${x}" y="${y}" class="rot">LEGENDA</text>`);
    itens.forEach(([cor, txt], i) => {
      const ly = y + 22 + i * 20;
      put(`<line x1="${x}" y1="${ly - 4}" x2="${x + 22}" y2="${ly - 4}" stroke="${cor}" stroke-width="2.2"/>`);
      put(`<text x="${x + 30}" y="${ly}" class="sub">${txt}</text>`);
    });
    notas.forEach((t, i) => put(`<text x="${x}" y="${y + 40 + itens.length * 20 + i * 18}" class="sub">${t}</text>`));
  }

  put(`</svg>`);
  return { svg: O.join('\n') + '\n', relatorio };
}

/* Relatório legível no terminal: é ele que eu leio ANTES de olhar o desenho. */
export function imprimirRelatorio(r) {
  const L = [];
  if (r.autoria) {
    L.push(`  autoria: ${r.autoria.estado}, confiança ${r.autoria.confianca}`
      + (r.autoria.bloqueada ? ' — BLOQUEADA para modelagem precisa' : '')
      + `, fontes ${r.autoria.procedencias.join(', ')}`
      + (r.autoria.incertezas.length ? `, incertezas ${r.autoria.incertezas.join(', ')}` : ''));
  }
  for (const [vista, m] of Object.entries(r.porVista)) {
    L.push(`  ${vista}: contorno ${m.contornoFechado ? 'fechado' : 'ABERTO'}`
      + `, ${m.pontosForaDoContorno} ponto(s) fora`
      + (m.caixa ? `, caixa ${Math.round(m.caixa.xMax - m.caixa.xMin)}×${Math.round(m.caixa.yMax - m.caixa.yMin)} mm` : ''));
  }
  for (const [nome, m] of Object.entries(r.porCamada)) {
    L.push(`  ${nome}: concentração ${m.concentracao}, retidão ${m.retidao}, `
      + `${m.inversoes} inversão(ões), raio mín ${m.raioMin ?? '—'} mm`);
  }
  for (const [eixo, f] of Object.entries(r.coerencia?.porEixo ?? {})) {
    const vs = Object.entries(f.vistas).map(([v, d]) => `${v} ${n(d.min)}..${n(d.max)}`).join(' | ');
    L.push(`  eixo ${eixo}: ${vs}`);
  }
  for (const [chave, e] of Object.entries(r.coerencia?.envelope ?? {})) {
    L.push(`  envelope ${chave}: traçado ${e.medido}, declarado ${e.declarado} (${e.desvio >= 0 ? '+' : ''}${e.desvio})`);
  }
  const lms = Object.entries(r.porLandmark ?? {});
  if (lms.length) {
    const pior = lms.sort((a, b) => b[1].desvio - a[1].desvio)[0];
    L.push(`  landmarks verificados: ${lms.length}, pior desvio ${pior[1].desvio} mm (${pior[0]})`);
  }
  if (r.alertas.length === 0) L.push('  sem alertas');
  else for (const a of r.alertas) L.push(`  ALERTA ${a}`);
  return L.join('\n');
}
