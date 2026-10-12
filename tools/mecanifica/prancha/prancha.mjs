#!/usr/bin/env node
/* prancha.mjs — motor de prancha ortográfica alvo. Recebe especificação declarativa
   em milímetros e devolve SVG determinístico MAIS um relatório medido da própria
   saída. Não conhece carro: conhece vista, camada, âncora, cota e métrica.
   O relatório existe porque desenhar sem medir é a causa raiz documentada em
   docs/mecanifica/planos/encerrados/2026-08-19-motor-de-prancha-medida.md. */

import * as G from './prancha-geometria.mjs';
import { validarAutoriaPrancha } from './prancha-autoria.mjs';

const n = (v) => Number(v.toFixed(2));
/* Quanto a linha de extensão passa da linha da cota, em pixel de tela. */
const EXTENSAO_ALEM = 3;

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
  .ext{stroke:#b3593d;stroke-width:0.7;fill:none}
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
  /* Vista de cima com a largura na horizontal e o comprimento na vertical, como
     as imagens de topo de referência (a planta acima tem o comprimento na
     horizontal). Os pontos são [x, z], com z para cima na prancha. */
  topo: ['x', 'z'],
  frontal: ['x', 'y'],
  traseira: ['x', 'y'],
};

function projetores(spec) {
  const s = spec.escala;
  const { zMin, zMax, yMax, xMax } = spec.limites;
  const v = spec.vistas;
  return {
    lateral: ([z, y]) => [v.lateral.x + (z - zMin) * s, v.lateral.y + (yMax - y) * s],
    planta: ([z, x]) => [v.planta.x + (z - zMin) * s, v.planta.y + (x + xMax) * s],
    topo: ([x, z]) => [v.topo.x + (x + xMax) * s, v.topo.y + (zMax - z) * s],
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
    /* Camada de contorno com `pedaco` é outro pedaço da silhueta, fechado e
       separado do anel principal: a frontal do avião tem a ponta da asa num
       pedaço à parte, porque a parte fora do modelo corta a silhueta. Os pedaços
       não se encadeiam no anel; cada um é um anel fechado a mais, e o que fica
       dentro de qualquer deles está dentro da silhueta. */
    const contorno = daVista.filter((c) => c.contorno && !c.pedaco).map((c) => c.pl);
    const outrosAneis = daVista.filter((c) => c.contorno && c.pedaco).map((c) => c.pl);
    const { anel, abertos } = encadear(contorno, tol);
    const fechado = anel.length > 2
      && Math.hypot(anel[0][0] - anel[anel.length - 1][0], anel[0][1] - anel[anel.length - 1][1]) <= tol
      && abertos.length === 0;
    const aneis = fechado ? [anel, ...outrosAneis] : [];
    const autoIntersecoes = aneis.flatMap((a) => G.autoIntersecoes(a));
    const caixas = (fechado ? aneis : anel.length ? [anel] : []).map((a) => G.caixa(a));

    let fora = 0;
    const culpadas = [];
    if (fechado) {
      for (const c of daVista) {
        if (c.contorno || c.classe === 'eixo' || c.foraDoContorno) continue;
        let foraDaCamada = 0;
        for (const p of c.pl) if (!aneis.some((a) => G.dentro(p, a))) foraDaCamada += 1;
        if (foraDaCamada > 0) culpadas.push(`${c.nome ?? c.classe ?? 'camada'} (${foraDaCamada})`);
        fora += foraDaCamada;
      }
    }

    porVista[nome] = {
      caixa: caixas.length ? { xMin: Math.min(...caixas.map((b) => b.xMin)), xMax: Math.max(...caixas.map((b) => b.xMax)), yMin: Math.min(...caixas.map((b) => b.yMin)), yMax: Math.max(...caixas.map((b) => b.yMax)) } : null,
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
    /* Camada com `pedaco` é o segundo pedaço ou o seguinte de uma parte que a
       imagem mostra separada por outra (a hélice cortada pelo cone): a forma
       da parte é medida uma vez, no pedaço que vem sem `pedaco`. */
    if (!c.nome || c.pedaco) continue;
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
    const [rx, ry] = vista.rotuloEm ?? [vista.x, vista.y - 12];
    if (vista.rotulo) put(`<text x="${rx}" y="${ry}" class="rot">${vista.rotulo}</text>`);
  }

  for (const c of camadas) {
    const p = proj[c.vista];
    const d = c.pl.map((q) => p(q)).map(([a, b], i) => `${i ? 'L' : 'M'} ${n(a)} ${n(b)}`).join(' ');
    put(`<path class="${c.classe ?? 'contorno'}" d="${d}"/>`);
  }

  /* O desenho guarda a caixa estimada de cada texto e cada linha traçada, com o
     dono de cada uma, para `colisoesDoDesenho` medir sobreposição em vez de o
     olho procurar. A largura do texto é estimada em 0,58 do corpo por
     caractere, que cobre a fonte sem serifa do SVG com folga pequena. */
  const desenho = { textos: [], linhas: [] };
  const caixaTexto = (x, y, texto, corpo, { ancora = 'start', vertical = false } = {}) => {
    const L = String(texto).length * corpo * 0.58;
    const a0 = ancora === 'middle' ? -L / 2 : ancora === 'end' ? -L : 0;
    return vertical
      ? [x - corpo * 0.8, y - a0 - L, x + corpo * 0.2, y - a0]
      : [x + a0, y - corpo * 0.8, x + a0 + L, y + corpo * 0.2];
  };
  const linha = (dono, tipo, pts) => desenho.linhas.push({ dono, tipo, pts });
  desenho.textos.push({ dono: 'moldura', tipo: 'titulo', texto: spec.titulo, caixa: caixaTexto(40, 34, spec.titulo, 15) });
  desenho.textos.push({ dono: 'moldura', tipo: 'titulo', texto: spec.subtitulo, caixa: caixaTexto(40, 53, spec.subtitulo, 11) });
  for (const vista of Object.values(spec.vistas)) {
    const [rx, ry] = vista.rotuloEm ?? [vista.x, vista.y - 12];
    if (vista.rotulo) desenho.textos.push({ dono: 'moldura', tipo: 'titulo', texto: vista.rotulo, caixa: caixaTexto(rx, ry, vista.rotulo, 10.5) });
  }
  for (const c of camadas) {
    const p = proj[c.vista];
    /* `parte` marca o contorno de uma parte com nome, que o detector usa para
       saber por onde passa cada cota e cada chamada; a silhueta não é parte. */
    desenho.linhas.push({ dono: c.nome ?? 'contorno', tipo: 'contorno', pts: c.pl.map((q) => p(q)), ...(c.nome && !c.contorno && c.fechado ? { parte: true } : {}) });
  }

  for (const [i, c] of (spec.cotas ?? []).entries()) {
    const dono = c.dono ?? `cota ${i}`;
    const p = proj[c.vista];
    const [ax, ay] = p(c.de); const [bx, by] = p(c.ate);
    const dx = c.desloca?.[0] ?? 0; const dy = c.desloca?.[1] ?? 0;
    put(`<path class="cota" d="M ${n(ax + dx)} ${n(ay + dy)} L ${n(bx + dx)} ${n(by + dy)}"/>`);
    desenho.linhas.push({ dono, tipo: 'cota', pts: [[ax + dx, ay + dy], [bx + dx, by + dy]], ...(dx || dy ? { deslocada: true } : {}) });
    /* `extensao` é a cota externa: a linha da cota está fora da parte, e as
       linhas de extensão descem de cada ponta da medida, na parte, até ela, como
       no desenho técnico. Sem elas, o número solto ao lado da parte se lia como
       medida de outra parte (2606, 989 e 8028 na lateral do avião). Cada linha
       passa EXTENSAO_ALEM px da linha da cota. */
    if (c.extensao && (dx || dy)) {
      const L = Math.hypot(dx, dy);
      const alem = [dx / L * EXTENSAO_ALEM, dy / L * EXTENSAO_ALEM];
      for (const [x, y] of [[ax, ay], [bx, by]]) {
        const fim = [x + dx + alem[0], y + dy + alem[1]];
        put(`<path class="ext" d="M ${n(x)} ${n(y)} L ${n(fim[0])} ${n(fim[1])}"/>`);
        linha(dono, 'extensao', [[x, y], fim]);
      }
    }
    const mx = (ax + bx) / 2 + dx; const my = (ay + by) / 2 + dy;
    const vert = Math.abs(bx - ax) < Math.abs(by - ay);
    /* `numero` tira o número do meio da linha, em pixel de tela, com uma
       linha de chamada até ela; sem ele o número fica colado na linha. */
    if (c.numero) {
      const [tx, ty] = [mx + c.numero[0], my + c.numero[1]];
      put(`<text x="${n(tx)}" y="${n(ty)}" class="cotat" text-anchor="middle">${c.texto}</text>`);
      const caixa = caixaTexto(tx, ty, c.texto, 11, { ancora: 'middle' });
      desenho.textos.push({ dono, tipo: 'cota', texto: c.texto, caixa });
      const alvo = pontoMaisPerto(caixa, [mx, my]);
      put(`<path class="cota" stroke-dasharray="2 2" d="M ${n(mx)} ${n(my)} L ${n(alvo[0])} ${n(alvo[1])}"/>`);
      linha(dono, 'chamada', [[mx, my], alvo]);
    } else if (vert) {
      put(`<text x="${n(mx - 6)}" y="${n(my)}" class="cotat" text-anchor="middle" transform="rotate(-90 ${n(mx - 6)} ${n(my)})">${c.texto}</text>`);
      desenho.textos.push({ dono, tipo: 'cota', texto: c.texto, caixa: caixaTexto(mx - 6, my, c.texto, 11, { ancora: 'middle', vertical: true }) });
    } else {
      put(`<text x="${n(mx)}" y="${n(my - 6)}" class="cotat" text-anchor="middle">${c.texto}</text>`);
      desenho.textos.push({ dono, tipo: 'cota', texto: c.texto, caixa: caixaTexto(mx, my - 6, c.texto, 11, { ancora: 'middle' }) });
    }
  }

  /* Anotação é texto solto na vista, como a nota que diz por que uma medida
     não se tira da imagem. */
  for (const [i, a] of (spec.anotacoes ?? []).entries()) {
    const [x, y] = proj[a.vista](a.em);
    put(`<text x="${n(x)}" y="${n(y)}" class="cotat" font-style="italic">${a.texto}</text>`);
    desenho.textos.push({ dono: a.dono ?? `anotação ${i}`, tipo: 'nota', texto: a.texto, caixa: caixaTexto(x, y, a.texto, 11) });
  }

  for (const l of spec.landmarks ?? []) {
    const [x, y] = proj[l.vista](l.em);
    const dono = l.dono ?? l.id;
    put(`<circle class="lm" cx="${n(x)}" cy="${n(y)}" r="2.6"/>`);
    desenho.textos.push({ dono, tipo: 'marcador', texto: '•', caixa: [x - 2.6, y - 2.6, x + 2.6, y + 2.6] });
    if (!l.id) continue;
    /* `rotuloEm` põe o nome em outro ponto da vista, fora da parte, com uma
       linha de chamada do marcador até a caixa do nome. */
    if (l.rotuloEm) {
      const [tx, ty] = proj[l.vista](l.rotuloEm);
      const ancora = l.rotuloAncora === 'end' ? 'end' : 'start';
      put(`<text class="lmt" x="${n(tx)}" y="${n(ty)}"${ancora === 'end' ? ' text-anchor="end"' : ''}>${l.id}</text>`);
      const caixa = caixaTexto(tx, ty, l.id, 9.5, { ancora });
      desenho.textos.push({ dono, tipo: 'nome', texto: l.id, caixa });
      const alvo = pontoMaisPerto(caixa, [x, y]);
      put(`<path class="lm" stroke="#1f6f5c" stroke-width="0.8" fill="none" d="M ${n(x)} ${n(y)} L ${n(alvo[0])} ${n(alvo[1])}"/>`);
      linha(dono, 'chamada', [[x, y], alvo]);
    } else {
      const ty = y + (l.abaixo ? 14 : -6);
      put(`<text class="lmt" x="${n(x + 6)}" y="${n(ty)}">${l.id}</text>`);
      desenho.textos.push({ dono, tipo: 'nome', texto: l.id, caixa: caixaTexto(x + 6, ty, l.id, 9.5) });
    }
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
  return { svg: O.join('\n') + '\n', relatorio, desenho };
}

function pontoMaisPerto([x0, y0, x1, y1], [x, y]) {
  return [Math.min(Math.max(x, x0), x1), Math.min(Math.max(y, y0), y1)];
}

/* Segmento contra retângulo por recorte de Liang-Barsky. */
function segmentoCruzaCaixa([ax, ay], [bx, by], [x0, y0, x1, y1]) {
  let t0 = 0; let t1 = 1;
  const dx = bx - ax; const dy = by - ay;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}

/* Mede o desenho que `prancha` devolveu: todo par de textos cujas caixas se
   sobrepõem e todo texto que uma linha de outro dono atravessa. A linha de
   chamada de um nome e a linha de uma cota são do mesmo dono que o texto
   delas; contorno de parte nunca é, porque número em cima de borda não se
   lê. O marcador de uma parte não colide com o nome dela. Devolve só as
   colisões; `examinarDesenho` devolve também os avisos. */
export function colisoesDoDesenho(desenho) {
  return examinarDesenho(desenho).colisoes;
}

/* Limiares do detector, em pixel de tela. Número de cota ganha folga em
   volta da caixa estimada contra contorno, porque a caixa é estimativa e o
   crítico acusou um "24" encostado na borda entre duas partes que a caixa
   exata não tocava. Duas chamadas a menos de CHAMADA_COLADA uma da outra
   ao longo de mais de TRECHO_COLADO correm juntas e se confundem. A marca
   de um nome a menos de MARCA_NA_BORDA da borda da parte fica sobre a linha
   que divide duas partes. Uma cota ou chamada que passa mais de
   INVASAO_MIN por dentro de outra parte invade essa parte. Chamadas quase
   paralelas (menos de PARALELAS_GRAUS entre elas) a menos de
   PARALELAS_DIST uma da outra ao longo de mais de PARALELAS_TRECHO também
   correm juntas: na lateral do braço, anelAntebraco e juntaCotovelo
   saíam a 14 a 23 px, com 3 graus entre si, e o crítico as leu como uma. */
export const DETECTOR = { FOLGA_DO_NUMERO: 2, CHAMADA_COLADA: 5, TRECHO_COLADO: 12, MARCA_NA_BORDA: 3, INVASAO_MIN: 4, PARALELAS_GRAUS: 8, PARALELAS_DIST: 16, PARALELAS_TRECHO: 40, FENDA_RAIOS: 72, FENDA_COBERTURA: 0.9, FENDA_ALCANCE_MIN: 30 };

const direcao = (pts) => Math.atan2(pts[pts.length - 1][1] - pts[0][1], pts[pts.length - 1][0] - pts[0][0]);
const anguloEntre = (a, b) => { let d = Math.abs(direcao(a) - direcao(b)) % Math.PI; if (d > Math.PI / 2) d = Math.PI - d; return (d * 180) / Math.PI; };

const distPontoSeg = ([px, py], [ax, ay], [bx, by]) => {
  const dx = bx - ax; const dy = by - ay; const L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
const distPontoPoli = (p, pts) => { let d = Infinity; for (let k = 1; k < pts.length; k += 1) d = Math.min(d, distPontoSeg(p, pts[k - 1], pts[k])); return d; };
/* Pontos da polilinha a cada `passo` px, com o comprimento que cada um representa. */
function amostrarLinha(pts, passo = 1) {
  const saida = [];
  for (let k = 1; k < pts.length; k += 1) {
    const [ax, ay] = pts[k - 1]; const [bx, by] = pts[k];
    const L = Math.hypot(bx - ax, by - ay); const m = Math.max(1, Math.ceil(L / passo));
    for (let i = 0; i < m; i += 1) saida.push({ p: [ax + ((i + 0.5) / m) * (bx - ax), ay + ((i + 0.5) / m) * (by - ay)], l: L / m });
  }
  return saida;
}
/* Comprimento da linha que corre por dentro da parte, longe da borda dela. */
const trechoDentro = (amostras, poli, folga) => amostras.reduce((s, { p, l }) => s + (G.dentro(p, poli) && distPontoPoli(p, poli) > folga ? l : 0), 0);

/* Um ponto dentro do contorno: o meio do trecho mais largo da seção horizontal
   na altura média dos vértices. O centro de um contorno côncavo pode cair fora. */
function pontoDentroDe(pts) {
  const y = pts.reduce((s, [, v]) => s + v, 0) / pts.length;
  const cortes = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    if ((a[1] - y) * (b[1] - y) < 0) cortes.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
  }
  cortes.sort((p, q) => p - q);
  let melhor = null;
  for (let i = 0; i + 1 < cortes.length; i += 2) if (!melhor || cortes[i + 1] - cortes[i] > melhor[1] - melhor[0]) melhor = [cortes[i], cortes[i + 1]];
  return melhor ? [(melhor[0] + melhor[1]) / 2, y] : pts[0];
}

/* Fração das direções, a partir de um ponto de dentro da parte, em que o
   contorno de `q` fecha o caminho a no máximo `alcance` px. Uma parte contida
   fecha todas; uma parte que só encosta em `q` fecha a metade ou menos. */
export function coberturaDoContorno(minhas, q, { raios = DETECTOR.FENDA_RAIOS, alcanceMin = DETECTOR.FENDA_ALCANCE_MIN } = {}) {
  const maior = minhas.reduce((a, b) => (areaDoPoli(b.pts) > areaDoPoli(a.pts) ? b : a));
  const origem = pontoDentroDe(maior.pts);
  const todos = minhas.flatMap((m) => m.pts);
  const xs = todos.map(([x]) => x); const ys = todos.map(([, y]) => y);
  const alcance = Math.max(Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)), alcanceMin);
  let fechados = 0;
  for (let k = 0; k < raios; k += 1) {
    const ang = (k / raios) * 2 * Math.PI;
    const fim = [origem[0] + Math.cos(ang) * alcance, origem[1] + Math.sin(ang) * alcance];
    let bate = false;
    for (let i = 1; i < q.pts.length && !bate; i += 1) bate = segmentosSeCruzam(origem, fim, q.pts[i - 1], q.pts[i]);
    if (bate) fechados += 1;
  }
  return fechados / raios;
}
const areaDoPoli = (pts) => Math.abs(pts.reduce((s, a, i) => { const b = pts[(i + 1) % pts.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);

export function examinarDesenho(desenho) {
  const colisoes = [];
  const avisos = [];
  const T = desenho.textos;
  const D = DETECTOR;
  const partes = desenho.linhas.filter((l) => l.parte);
  /* Uma parte pode ter vários contornos, um por pedaço; cota e chamada dela
     podem passar por qualquer um, e só os de outras partes contam como invasão. */
  const pedacosDe = (dono) => partes.filter((q) => q.dono === String(dono).split('.')[0]);
  /* `minhas` contido em `q`: todos os pontos dentro, ou, na fenda, o contorno
     de `q` fechando quase todas as direções a partir de dentro da parte. */
  const memoContida = new Map();
  const contemTudo = (minhas, q) => {
    const chave = `${minhas[0].dono}|${partes.indexOf(q)}`;
    if (!memoContida.has(chave)) {
      memoContida.set(chave, minhas.every((m) => m.pts.every((p) => G.dentro(p, q.pts))) || coberturaDoContorno(minhas, q) >= D.FENDA_COBERTURA);
    }
    return memoContida.get(chave);
  };
  const dentroDe = (p, qs) => qs.some((q) => G.dentro(p, q.pts));
  const distanciaA = (p, qs) => Math.min(...qs.map((q) => distPontoPoli(p, q.pts)));
  const sobrepoe = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  for (let i = 0; i < T.length; i += 1) {
    for (let j = i + 1; j < T.length; j += 1) {
      if (T[i].dono === T[j].dono) continue;
      if (T[i].tipo === 'marcador' && T[j].tipo === 'marcador') continue;
      if (sobrepoe(T[i].caixa, T[j].caixa)) colisoes.push({ tipo: 'texto sobre texto', a: `${T[i].tipo} "${T[i].texto}" (${T[i].dono})`, b: `${T[j].tipo} "${T[j].texto}" (${T[j].dono})` });
    }
  }
  for (const t of T) {
    if (t.tipo === 'marcador') continue;
    for (const l of desenho.linhas) {
      if (l.tipo !== 'contorno' && l.dono === t.dono) continue;
      const f = t.tipo === 'cota' && l.tipo === 'contorno' ? D.FOLGA_DO_NUMERO : 0;
      const caixa = [t.caixa[0] - f, t.caixa[1] - f, t.caixa[2] + f, t.caixa[3] + f];
      if (l.pts.some((p, k) => k > 0 && segmentoCruzaCaixa(l.pts[k - 1], p, caixa))) {
        colisoes.push({ tipo: t.tipo === 'cota' ? (l.parte ? 'número sobre contorno' : 'linha sobre número') : 'linha sobre texto', a: `${t.tipo} "${t.texto}" (${t.dono})`, b: `${l.tipo} de ${l.dono}` });
      }
    }
  }
  /* Linha contra linha: chamada cruzando chamada, cota passando sobre
     chamada ou sobre outra cota. Contorno fica de fora aqui, porque toda
     chamada sai de dentro de uma parte e atravessa bordas por construção; a
     passagem por dentro de outra parte é medida adiante. */
  const anot = desenho.linhas.filter((l) => l.tipo !== 'contorno');
  for (let i = 0; i < anot.length; i += 1) {
    for (let j = i + 1; j < anot.length; j += 1) {
      const A = anot[i]; const B = anot[j];
      if (A.dono === B.dono) continue;
      /* A largura e a altura da mesma parte se cruzam dentro dela como
         qualquer par de cotas de desenho técnico; entre partes diferentes, não. */
      const daCota = (l) => l.tipo === 'cota' || l.tipo === 'extensao';
      if (daCota(A) && daCota(B) && A.dono.split('.')[0] === B.dono.split('.')[0]) continue;
      /* A extensão de uma cota geral, que não tem parte, vai da borda da
         silhueta até a linha mais externa e atravessa as linhas das cotas que
         chegam ao limite do objeto, como a cota além dos nomes que passa um
         pouco do fim da silhueta (8.028 mm na planta do avião). Cruzar linha
         de cota ou extensão alheia é do desenho técnico; chamada e número
         continuam acusados. */
      const geral = (l) => l.tipo === 'extensao' && !pedacosDe(l.dono).length;
      if ((geral(A) && daCota(B)) || (geral(B) && daCota(A))) continue;
      const cruza = A.pts.some((p, k) => k > 0 && B.pts.some((q, m) => m > 0 && segmentosSeCruzam(A.pts[k - 1], p, B.pts[m - 1], q)));
      if (cruza) { colisoes.push({ tipo: A.tipo === 'chamada' && B.tipo === 'chamada' ? 'chamada sobre chamada' : 'linha sobre linha', a: `${A.tipo} de ${A.dono}`, b: `${B.tipo} de ${B.dono}` }); continue; }
      /* Chamadas que não se cruzam mas correm coladas, quase paralelas, se
         leem como uma linha só. */
      if (A.tipo === 'chamada' && B.tipo === 'chamada') {
        const amostras = amostrarLinha(A.pts);
        const colado = amostras.reduce((s, { p, l }) => s + (distPontoPoli(p, B.pts) < D.CHAMADA_COLADA ? l : 0), 0);
        const paralelo = anguloEntre(A.pts, B.pts) < D.PARALELAS_GRAUS
          ? amostras.reduce((s, { p, l }) => s + (distPontoPoli(p, B.pts) < D.PARALELAS_DIST ? l : 0), 0) : 0;
        if (colado > D.TRECHO_COLADO || paralelo > D.PARALELAS_TRECHO) colisoes.push({ tipo: 'chamadas coladas', a: `chamada de ${A.dono}`, b: `chamada de ${B.dono}`, px: n(Math.max(colado, paralelo)) });
      }
    }
  }
  /* Cota e chamada contra as partes. A cota de uma parte que passa por
     dentro de outra mede a vizinha junto; a chamada de um nome que atravessa
     outra parte aponta para ela no caminho. Cota geral e de dono sem parte
     desenhada ficam de fora. */
  for (const l of anot) {
    const minhas = pedacosDe(l.dono);
    /* A extensão de uma cota geral não tem parte própria: ela sai da silhueta
       inteira, que não é parte alheia, e só conta a parte desenhada que ela
       atravessar. Cota geral sem extensão fica de fora, como antes. */
    if (!minhas.length && l.tipo !== 'extensao') continue;
    const amostras = amostrarLinha(l.pts);
    if (!minhas.length) {
      const alheias = [...new Set(partes.filter((q) => trechoDentro(amostras, q.pts, 1.5) > D.INVASAO_MIN).map((q) => q.dono))];
      if (alheias.length) colisoes.push({ tipo: 'extensão sobre outra parte', a: `extensão da cota de ${l.dono}`, b: alheias.join(', ') });
      continue;
    }
    /* O contorno de uma parte é o externo da região, sem os furos: o escape
       inteiro dentro do capô e as janelas dentro da fuselagem, na lateral do
       avião, ficam dentro do contorno de outra parte. A linha que cai dentro
       da própria parte está no lugar certo e não invade a que a contém, então
       para a parte que contém a própria só conta o trecho fora da própria. A
       cota do capô que passa sobre o escape continua invadindo o escape. Uma
       parte numa fenda da outra conta como contida: na planta do avião o
       contorno da fuselagem desce dos dois lados da deriva, por uma fenda de
       poucos pixels aberta no fim da cauda, e a deriva não fica dentro dele
       por pontos soltos, mas o contorno a envolve em 99% das direções. A razão
       está em `coberturaDoContorno`, e DETECTOR.FENDA_COBERTURA é o corte. */
    const contem = (q) => contemTudo(minhas, q);
    const fora = amostras.filter(({ p }) => !dentroDe(p, minhas));
    const invadidas = [...new Set(partes.filter((q) => !minhas.includes(q) && trechoDentro(contem(q) ? fora : amostras, q.pts, 1.5) > D.INVASAO_MIN).map((q) => q.dono))];
    if (l.tipo === 'extensao') {
      /* A linha de extensão sai da parte e atravessa quem a contém, como a
         fileira de janelas dentro da fuselagem, até a linha da cota fora do
         desenho; o que ela não pode é passar por uma parte alheia. */
      const alheias = [...new Set(partes.filter((q) => !minhas.includes(q) && !contem(q) && trechoDentro(amostras, q.pts, 1.5) > D.INVASAO_MIN).map((q) => q.dono))];
      if (alheias.length) colisoes.push({ tipo: 'extensão sobre outra parte', a: `extensão da cota de ${l.dono}`, b: alheias.join(', ') });
      continue;
    }
    if (l.tipo === 'cota') {
      /* Cota desenhada onde mede, sem afastamento, que sai da própria parte
         e corre colada ao contorno de outra ou da silhueta se confunde com a
         borda; o trecho que só atravessa um vão da parte côncava não conta. */
      if (!l.deslocada) {
        const outras = desenho.linhas.filter((q) => q.tipo === 'contorno' && !minhas.includes(q));
        const sobre = amostras.reduce((s, { p, l: c }) => s + (!dentroDe(p, minhas) && distanciaA(p, minhas) > D.MARCA_NA_BORDA && outras.some((q) => distPontoPoli(p, q.pts) < D.CHAMADA_COLADA / 2) ? c : 0), 0);
        if (sobre > D.TRECHO_COLADO) colisoes.push({ tipo: 'cota sai da parte sobre contorno', a: `cota de ${l.dono}`, b: `${n(sobre)} px fora de ${minhas[0].dono}, colada a outro contorno`, px: n(sobre) });
      }
      if (invadidas.length) colisoes.push({ tipo: 'cota sobre outra parte', a: `cota de ${l.dono}`, b: invadidas.join(', ') });
      continue;
    }
    const ehNome = !String(l.dono).includes('.');
    if (ehNome) {
      const marca = l.pts[0];
      const borda = distanciaA(marca, minhas);
      if (!dentroDe(marca, minhas) || borda < D.MARCA_NA_BORDA) colisoes.push({ tipo: 'marca fora da parte', a: `chamada de ${l.dono}`, b: dentroDe(marca, minhas) ? `a ${n(borda)} px da borda` : 'marca fora do contorno' });
    }
    if (!invadidas.length) continue;
    /* Parte cercada por outras dos dois lados não tem saída limpa: a
       chamada atravessa alguém de qualquer jeito, e isso fica como aviso. A
       prova é a reta horizontal da marca até cada lado do desenho. */
    const marca = l.pts[0];
    const xs = partes.flatMap((q) => q.pts.map(([x]) => x));
    const saida = (x) => amostrarLinha([marca, [x, marca[1]]]);
    const livre = [Math.min(...xs) - 10, Math.max(...xs) + 10].some((x) => partes.every((q) => minhas.includes(q) || trechoDentro(saida(x), q.pts, 1.5) <= D.INVASAO_MIN));
    const registro = { tipo: 'chamada atravessa parte', a: `chamada de ${l.dono}`, b: invadidas.join(', ') };
    if (livre || !ehNome) colisoes.push(registro); else avisos.push({ ...registro, motivo: `${l.dono} não tem saída horizontal livre para nenhum dos lados` });
  }
  return { colisoes, avisos };
}

/* Cruzamento próprio de dois segmentos; tocar na ponta não conta. */
export function segmentosSeCruzam(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const e = 1e-9;
  const d1 = o(c, d, a); const d2 = o(c, d, b); const d3 = o(a, b, c); const d4 = o(a, b, d);
  return ((d1 > e && d2 < -e) || (d1 < -e && d2 > e)) && ((d3 > e && d4 < -e) || (d3 < -e && d4 > e));
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
