/* furgao-realista, receita/plastico.js — o plástico de baixo (etapa 3), por fora da chapa: a saia, as molduras e o
 * alargamento dos arcos, o forro dos arcos e os dois para-choques, cada um a pele de uma seção da TABELA varrida por um trilho (`derivarPlastico`).
 */

import { gaiolaVarrida } from '../../../nucleo/gaiola-varrida.js';
import { grau, lerp, sub } from './geometria.js';

/* ---------- o plástico de baixo ---------- */

/* Insere nas alturas `ys` os pontos que faltam numa seção [[u, y]] (y crescente), na reta entre os vizinhos. */
export function comAlturas(secao, ys) {
  const s = secao.map((p) => [...p]);
  for (const y of ys) {
    if (s.some((p) => Math.abs(p[1] - y) < 1e-9)) continue;
    const k = s.findIndex((p, i) => i + 1 < s.length && y > p[1] && y < s[i + 1][1]);
    if (k < 0) throw new Error(`furgao-realista: a seção não passa pela altura ${y}`);
    const [u0, y0] = s[k]; const [u1, y1] = s[k + 1];
    s.splice(k + 1, 0, [lerp(u0, u1, (y - y0) / (y1 - y0)), y]);
  }
  return s;
}

/* Reparte os trechos da seção [[u, y]] mais longos que `passo` em altura, na reta entre os vizinhos, sem mudar a forma. A saia e os
   para-choques acabam na boca do arco, que é um círculo: com poucas linhas a aresta de ponta vira uma corda e entra na boca. */
export function adensar(secao, passo) {
  const s = [secao[0]];
  for (let i = 1; i < secao.length; i += 1) {
    const [u0, y0] = secao[i - 1]; const [u1, y1] = secao[i];
    const n = Math.ceil(Math.abs(y1 - y0) / passo - 1e-9);
    for (let k = 1; k < n; k += 1) s.push([lerp(u0, u1, k / n), lerp(y0, y1, k / n)]);
    s.push(secao[i]);
  }
  return s;
}

/**
 * Uma grade de quadriláteros varrida: `estacoes` ao longo do trilho e `linhas` ao longo da seção, com a posição de cada vértice dada por
 * `posicao(estacao, linha)`. `manter(i, j)` tira células. A orientação sai pela dica, que dá para cada face o lado de fora; `vincosEm`
 * são os índices das linhas que levam vinco vivo ao longo do trilho.
 */
export function construirGrade({ nome, estacoes, linhas, posicao, manter = () => true, dica, vincosEm = [] }) {
  const nomeDe = (i, j) => `${nome}_${i}_${j}`;
  const pos = new Map();
  estacoes.forEach((e, i) => linhas.forEach((l, j) => pos.set(nomeDe(i, j), posicao(e, l))));
  let faces = [];
  for (let i = 0; i + 1 < estacoes.length; i += 1) {
    for (let j = 0; j + 1 < linhas.length; j += 1) {
      if (manter(i, j)) faces.push([nomeDe(i, j), nomeDe(i + 1, j), nomeDe(i + 1, j + 1), nomeDe(i, j + 1)]);
    }
  }
  let placar = 0;
  for (const fc of faces) {
    const ps = fc.map((n) => pos.get(n));
    let nx = 0; let ny = 0; let nz = 0;
    ps.forEach((p, k) => { const q = ps[(k + 1) % ps.length]; nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]); });
    const c = ps.reduce((s, p) => [s[0] + p[0] / ps.length, s[1] + p[1] / ps.length, s[2] + p[2] / ps.length], [0, 0, 0]);
    const h = dica(c);
    placar += Math.sign(nx * h[0] + ny * h[1] + nz * h[2]);
  }
  if (placar < 0) faces = faces.map((fc) => [...fc].reverse());
  const vincos = vincosEm.map((j) => ({ nome: `${nome}Linha${j}`, pontos: estacoes.map((_, i) => nomeDe(i, j)), nitidez: 'viva' }));
  return { faces, pos, vincos };
}

/* Um bolso nas faces da grade cujos vértices caem todos na região: os vértices dela recuam `fundo` na direção `dir`, e as paredes ligam a
   borda do bolso ao fundo. As voltas da borda e do fundo levam vinco vivo. */
export function abrirBolso(grade, { nome, dentro, fundo, dir }) {
  const chv = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const emBolso = grade.faces.filter((fc) => fc.every((n) => dentro(grade.pos.get(n))));
  if (!emBolso.length) throw new Error(`furgao-realista: o bolso ${nome} não pegou nenhuma face`);
  const set = new Set(emBolso);
  const resto = grade.faces.filter((fc) => !set.has(fc));
  const arestasDoResto = new Set();
  resto.forEach((fc) => fc.forEach((n, k) => arestasDoResto.add(chv(n, fc[(k + 1) % fc.length]))));
  const borda = [];
  emBolso.forEach((fc) => fc.forEach((n, k) => { const o = fc[(k + 1) % fc.length]; if (arestasDoResto.has(chv(n, o))) borda.push([n, o]); }));
  const fundoDe = (n) => `${n}_${nome}`;
  new Set(emBolso.flat()).forEach((n) => { const p = grade.pos.get(n); grade.pos.set(fundoDe(n), [p[0] + dir[0] * fundo, p[1] + dir[1] * fundo, p[2] + dir[2] * fundo]); });
  grade.faces = [...resto, ...emBolso.map((fc) => fc.map(fundoDe)), ...borda.map(([a, c]) => [a, c, fundoDe(c), fundoDe(a)])];
  const proximo = new Map(borda); const usadas = new Set();
  let k = 0;
  for (const [a] of borda) {
    if (usadas.has(a)) continue;
    const pts = []; let n = a;
    while (!usadas.has(n)) { usadas.add(n); pts.push(n); n = proximo.get(n); }
    pts.push(pts[0]);
    grade.vincos.push({ nome: `${nome}Borda${k}`, pontos: pts, nitidez: 'viva' }, { nome: `${nome}Fundo${k}`, pontos: pts.map(fundoDe), nitidez: 'viva' });
    k += 1;
  }
}

/* A peça pronta para o passo `subdivisao`: vértices usados, faces e os vincos que ficaram em arestas de duas faces. */
export function fecharPeca(nome, grades) {
  const chv = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const faces = grades.flatMap((g) => g.faces);
  const pos = new Map(grades.flatMap((g) => [...g.pos]));
  const arestas = new Map();
  faces.forEach((fc) => fc.forEach((n, i) => { const c = chv(n, fc[(i + 1) % fc.length]); arestas.set(c, (arestas.get(c) ?? 0) + 1); }));
  const vincos = [];
  for (const v of grades.flatMap((g) => g.vincos)) {
    let corrida = [v.pontos[0]]; let k = 0;
    const fechar = () => { if (corrida.length > 1) { vincos.push({ nome: `${v.nome}_${k}`, pontos: corrida, nitidez: v.nitidez }); k += 1; } };
    for (let i = 0; i + 1 < v.pontos.length; i += 1) {
      if (arestas.get(chv(v.pontos[i], v.pontos[i + 1])) === 2) corrida.push(v.pontos[i + 1]); else { fechar(); corrida = [v.pontos[i + 1]]; }
    }
    fechar();
  }
  const vertices = [...new Set(faces.flat())].sort();
  return { nome, vertices, faces, vincos, cantos: [], posicoes: new Map(vertices.map((n) => [n, pos.get(n)])) };
}

/* As estações de um para-choque, da ponta de trás do lado -x à do lado +x: a lateral, a quina, a reta da frente (ou da traseira), a quina
   e a lateral. A reta tem as estações a passo_x e as do lugar da placa; a quina e a lateral, as dadas. */
export function estacoesDoParachoque(T, xReta, xPlaca, dsAlarg = []) {
  const nL = T.parachoque_estacoes_lado; const nQ = T.parachoque_estacoes_quina;
  const n = Math.round((2 * xReta) / T.parachoque_passo_x);
  /* as estações da reta são frações da meia largura dela, que na traseira muda com a saída da seção; xPlaca é a fração em que cai o lugar da placa */
  const xs = [...new Set([...Array.from({ length: n + 1 }, (_, k) => -1 + (2 * k) / n), -xPlaca, xPlaca])].sort((a, b) => a - b);
  const lado = (s, ts) => ts.map((t) => ({ tipo: 'lado', s, t }));
  const quina = (s, fs) => fs.map((fi) => ({ tipo: 'quina', s, phi: fi * (Math.PI / 2) }));
  const de = (n) => Array.from({ length: n }, (_, k) => (k + 1) / n);
  /* nas pontas da lateral, as estações do alargamento, da boca do arco para fora de um lado e para dentro do outro */
  const alarg = (s, ds) => ds.map((d) => ({ tipo: 'alargamento', s, d }));
  return [
    ...alarg(-1, dsAlarg), ...lado(-1, de(nL).reverse()), ...quina(-1, de(nQ).reverse()),
    ...xs.map((fr) => ({ tipo: 'reta', fr })),
    ...quina(1, de(nQ)), ...lado(1, de(nL)), ...alarg(1, dsAlarg.slice().reverse()),
  ];
}

/**
 * derivarPlastico(T, f) -> as peças de plástico por fora da chapa, cada uma com vértices, faces, vincos e posições em milímetro.
 *   A saia (sai 20 mm da lateral, de 299 a 463) é cortada pelas frestas das portas: cada porta leva o seu trecho, de 380 a 463, e a
 *   parte de 299 a 380 sob as portas, os trechos entre as portas e os arcos e o trecho junto ao arco dianteiro ficam presos, e vão até a boca
 *   dos arcos. A moldura de cada arco sai 20 mm, da boca para fora, com a largura que varia pelo ângulo, e acaba em pontas horizontais no topo
 *   das peças escuras vizinhas. Os para-choques saem 50 mm na frente e 110 atrás e dobram nas quinas até a boca do arco, reduzindo a saída para
 *   a da saia na lateral. Cada peça é a pele de fora da seção da prancha, varrida pelo trilho, e a espessura do passo a engrossa para dentro,
 *   para a chapa.
 */
export function derivarPlastico(T, f) {
  const yc = f.rPneu;
  const pen = T.plastico_penetracao;
  const raioPorta = T.arco_raio + T.porta_folga_arco;
  const dzDe = (r) => (y) => Math.sqrt(r ** 2 - (y - yc) ** 2);
  const saida = (sec) => Math.max(...sec.map(([u]) => u));
  const kLado = saida(T.secao_saia) / saida(T.secao_parachoque_dianteiro);
  const kLadoTras = saida(T.secao_saia) / saida(T.secao_parachoque_traseiro);
  const baixoPortas = T.porta_base_y - T.fresta / 2; const cimaPortas = T.porta_base_y + T.fresta / 2;
  const lados = [['Esquerda', 1], ['Direita', -1]];
  /* os pontos de seção que tocam a chapa (u = 0) entram na chapa por `pen` */
  const tocaChapa = (l) => (Math.abs(l.u) < 1e-9 ? { ...l, u: -pen } : l);
  const zT = f.zT; const zD = f.zD;
  const portaTras = T.porta_cabine_tras_z;
  const correrFrente = portaTras - T.coluna_do_meio; const correrTras = correrFrente - T.porta_correr_largura;
  const meia = T.fresta / 2;
  const partes = [];

  /* O alargamento dos arcos: a subida e a descida em curva da prancha, que dão a saída u a cada distância d da boca. */
  const ressalto = T.secao_moldura_subida.at(-1)[1];
  const larguraAlarg = T.moldura_largura;
  const saidaAlarg = (d) => {
    if (d <= 0 || d >= larguraAlarg) return 0;
    if (d <= ressalto) {
      const sub = T.secao_moldura_subida.slice(1);
      const k = sub.findIndex(([, dd]) => dd >= d);
      const [u0, d0] = sub[k - 1]; const [u1, d1] = sub[k];
      return lerp(u0, u1, (d - d0) / (d1 - d0));
    }
    const q = (d - ressalto) / (larguraAlarg - ressalto);
    return T.moldura_saida * (1 - 3 * q ** 2 + 2 * q ** 3);
  };
  /* A continuação escura do alargamento é parte da saia e dos para-choques, na mesma malha, sem emenda: junto do arco a superfície deles é a maior entre a
     da própria peça e a do alargamento (a saída dele a d da boca), e a borda de baixo é rolada como a da saia, na razão das saídas (30 sobre 20). Onde o
     alargamento chega à chapa, a 150 mm da boca, a superfície é a da peça: ali a malha da faixa do arco encontra a da saia, nos mesmos pontos. As faixas
     têm uma estação a cada distância d da boca que o perfil do alargamento tem. */
  const rJoin = T.arco_raio + larguraAlarg;
  const dzJoin = dzDe(rJoin);
  const dsAlarg = [...new Set([
    ...T.secao_moldura_subida.slice(1).map(([, d]) => d),
    ...Array.from({ length: T.moldura_descida_passos - 1 }, (_, i) => ressalto + ((i + 1) / T.moldura_descida_passos) * (larguraAlarg - ressalto)),
  ])];
  const iRolo = T.secao_saia.findIndex(([u]) => u === saida(T.secao_saia));
  const yRolo = T.secao_saia[iRolo][1];
  const razaoRolo = T.moldura_saida / saida(T.secao_saia);
  const uDaSaia = (y) => {
    const k = T.secao_saia.findIndex(([, yy], i) => i + 1 < T.secao_saia.length && y >= yy && y <= T.secao_saia[i + 1][1]);
    const [u0, y0] = T.secao_saia[k]; const [u1, y1] = T.secao_saia[k + 1];
    return lerp(u0, u1, (y - y0) / (y1 - y0));
  };
  /* a saída da superfície a d da boca, na altura y, para uma linha de seção de saída própria uPropria; as linhas que encostam na chapa ficam nela, menos a de
     cima (topo), que sobe com o alargamento: a borda de cima fica aberta, na altura da ponta da moldura, e não volta à chapa em degrau */
  const uContinua = (d, y, uPropria, topo = false) => {
    if (uPropria <= 1e-9 && !topo) return uPropria;
    const uf = Math.min(Math.max(saidaAlarg(d), uPropria), y < yRolo ? razaoRolo * uDaSaia(y) : Infinity);
    return Math.abs(uf) < 1e-9 ? -pen : uf;
  };

  /* A peça pronta de uma gaiola varrida: os campos do passo `subdivisao` e as posições em milímetro. */
  const daVarredura = (g) => ({ nome: g.nome, vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, posicoes: g.posicoes });
  const EIXO_X = [1, 0, 0];
  /* o marco de corte na distância r do eixo de um arco: a linha chega a ele subindo (atrás do arco, vindo do eixo) ou descendo (na frente dele) */
  const marcoDoArco = (zc, r, cruzando, nome) => ({ cilindro: { eixo: EIXO_X, por: [0, yc, zc], raio: r }, cruzando, ...(nome ? { nome } : {}) });

  /* ---- a saia ---- */
  const secaoSaia = adensar(comAlturas(T.secao_saia, [baixoPortas, cimaPortas]), T.plastico_passo_y).map(([u, y]) => tocaChapa({ u, y }));
  const iBaixo = secaoSaia.findIndex((l) => Math.abs(l.y - baixoPortas) < 1e-9);
  const iCima = secaoSaia.findIndex((l) => Math.abs(l.y - cimaPortas) < 1e-9);
  /* as linhas da seção, com o nome das que os cortes e os recortes citam: a de baixo da base das portas, a de cima dela e a do topo */
  const linhasDaSaia = secaoSaia.map((l, j) => ({ u: l.u, v: l.y, ...(j === iBaixo ? { nome: 'baixoPorta' } : j === iCima ? { nome: 'cimaPorta' } : j === secaoSaia.length - 1 ? { nome: 'topo' } : {}) }));
  /* o alargamento de cada arco, em volta do eixo da roda: a saída u do perfil em cada distância d da boca, em reta entre as estações, e zero a partir de um
     ponto entre a última estação e a fresta da porta; a borda de baixo é rolada e a de cima fica aberta */
  const perfilAlarg = [...dsAlarg.map((d) => [d, saidaAlarg(d)]), [(dsAlarg.at(-1) + (larguraAlarg - T.fresta / 2)) / 2, 0]];
  const alargamentos = [zT, zD].map((zc) => ({ campo: { cilindro: { eixo: EIXO_X, por: [0, yc, zc], raio: T.arco_raio } }, perfil: perfilAlarg, topoAberto: true, rolada: { abaixoDe: yRolo, razao: razaoRolo } }));
  const passoDaSaia = { passo: T.saia_passo, linha: 'cimaPorta' };
  for (const [lado, s] of lados) {
    const trilhoDe = (de, ate) => [{ reta: { de: [s * T.meia_largura, 0, de], ate: [s * T.meia_largura, 0, ate] } }];
    const quadro = s > 0 ? { u: [s, 0, 0] } : { u: [s, 0, 0], virar: true };
    const emZ = (z, nome) => ({ em: z - zT, nome });
    /* os cortes em z, de trás para a frente: a saia começa na borda de fora do alargamento do arco traseiro e acaba na fresta da porta da cabine, e dali, em cada
       arco, as estações do alargamento vão até a boca, na mesma malha: não há trecho preso entre a fresta e o alargamento. As portas levam só a saia de baixo. */
    const frestaD = marcoDoArco(zD, raioPorta - T.fresta / 2, 'descendo', 'frestaDaPorta');
    const meio = s < 0
      ? [emZ(correrTras - meia, 'trasDaCorrer'), passoDaSaia, emZ(correrFrente + meia, 'frenteDaCorrer'), passoDaSaia, emZ(portaTras - meia, 'trasDaCabine'), passoDaSaia]
      : [emZ(portaTras - meia, 'trasDaCabine'), passoDaSaia];
    const presa = gaiolaVarrida({
      nome: `saiaPresa${lado}`, trilho: trilhoDe(zT, zD), quadro, secao: linhasDaSaia, fora: [s, 0, 0], alargamento: alargamentos,
      estacoes: [
        ...dsAlarg.map((d) => marcoDoArco(zT, T.arco_raio + d, 'subindo')), marcoDoArco(zT, rJoin, 'subindo'), passoDaSaia,
        ...meio, frestaD,
        ...dsAlarg.slice().reverse().map((d) => marcoDoArco(zD, T.arco_raio + d, 'descendo')),
      ],
      remover: [...(s < 0 ? [{ estacoes: ['trasDaCorrer', 'frenteDaCorrer'], linhas: ['baixoPorta', 'topo'] }] : []), { estacoes: ['trasDaCabine', 'frestaDaPorta'], linhas: ['baixoPorta', 'topo'] }],
    });
    partes.push(daVarredura(presa));
    /* o trecho de cada porta, de 383 a 463: a porta da cabine acaba na fresta, na borda do alargamento */
    const linhasDaPorta = linhasDaSaia.slice(iCima);
    const portas = [
      ...(s < 0 ? [{ rotulo: 'PortaCorrer', de: correrTras + meia, ate: correrFrente - meia, fim: { fracao: 1 } }] : []),
      { rotulo: `PortaCabine${lado}`, de: portaTras + meia, ate: zD, fim: marcoDoArco(zD, raioPorta + T.fresta / 2, 'descendo') },
    ];
    for (const { rotulo, de, ate, fim } of portas) {
      const g = gaiolaVarrida({ nome: `saia${rotulo}`, trilho: trilhoDe(de, ate), quadro, secao: linhasDaPorta, fora: [s, 0, 0], estacoes: [{ fracao: 0 }, passoDaSaia, fim] });
      partes.push(daVarredura(g));
    }
  }

  /* ---- as molduras dos arcos: o alargamento da cor da lataria acima das pontas, em torno do eixo da roda (abaixo delas ele é a saia e os para-choques) ---- */
  const topo = (sec) => Math.max(...sec.map(([, y]) => y));
  const topoSaia = topo(T.secao_saia); const topoDiant = topo(T.secao_parachoque_dianteiro); const topoTras = topo(T.secao_parachoque_traseiro);
  const secaoMoldura = [
    ...T.secao_moldura_subida.map(([u, d]) => ({ u, d })),
    ...Array.from({ length: T.moldura_descida_passos }, (_, i) => {
      const q = (i + 1) / T.moldura_descida_passos;
      return { u: T.moldura_saida * (1 - 3 * q ** 2 + 2 * q ** 3), d: ressalto + q * (larguraAlarg - ressalto) };
    }),
  ].map(tocaChapa).map((l, j) => ({ u: l.u, v: l.d, ...(j === 1 ? { nome: 'boca' } : {}) }));
  /* as pontas: cada moldura acaba, de cada lado do arco, numa ponta horizontal da boca à borda de fora, na altura do topo da peça escura vizinha */
  const pontas = { [zT]: { tras: topoTras, frente: topoSaia }, [zD]: { tras: topoSaia, frente: topoDiant } };
  const passoDaMoldura = { passo: T.arco_raio * ((T.moldura_passo_graus * Math.PI) / 180), linha: 'boca' };
  for (const [zc, rotulo] of [[zD, 'Dianteiro'], [zT, 'Traseiro']]) {
    for (const [lado, s] of lados) {
      const nome = `moldura${rotulo === 'Dianteiro' ? 'ArcoDianteiro' : 'ArcoTraseiro'}${lado === 'Esquerda' ? 'Esquerdo' : 'Direito'}`;
      const g = gaiolaVarrida({
        nome, trilho: [{ arco: { centro: [s * T.meia_largura, yc, zc], eixo: EIXO_X, de: [s * T.meia_largura, yc, zc + T.arco_raio], graus: -200 } }],
        quadro: s > 0 ? { u: [s, 0, 0], virar: true } : { u: [s, 0, 0] }, secao: secaoMoldura, fora: [s, 0, 0],
        estacoes: [{ plano: { eixo: 'y', valor: pontas[zc].frente }, cruzando: 'subindo' }, passoDaMoldura, { plano: { eixo: 'y', valor: pontas[zc].tras }, cruzando: 'descendo' }],
      });
      partes.push(daVarredura(g));
    }
  }

  /* ---- o forro dos arcos: por dentro da chapa, fecha o oco atrás de cada roda ----
     Um balde aberto para fora, em torno do eixo da roda, só na metade de cima: uma aba assentada na face de dentro da chapa em volta da boca (passa 8 mm
     dela para encostar), o túnel a `forro_folga_tunel` da banda do pneu e a parede de dentro a `forro_folga_parede` da face de dentro do pneu. O trilho é o círculo do túnel,
     e a seção sai radial (v) e pela largura (u, para dentro). As pontas acabam onde a borda da aba cruza a soleira. */
  const rForro = T.pneu_diametro / 2 + T.forro_folga_tunel;
  const rBordaForro = T.arco_raio + T.forro_sobra;
  const angForro = Math.asin((yc - T.soleira_y) / rBordaForro);
  const fundoForro = f.xMax - (T.bitola / 2 - T.pneu_largura / 2) + T.forro_folga_parede;
  const tuneis = Math.ceil((fundoForro - pen) / 70);
  const secaoForro = [
    { u: -pen, v: rBordaForro - rForro, nome: 'borda' },
    { u: -pen, v: 0, nome: 'canto' },
    ...Array.from({ length: tuneis - 1 }, (_, i) => ({ u: -pen - ((i + 1) * (fundoForro - pen)) / tuneis, v: 0 })),
    { u: -fundoForro, v: 0, nome: 'canto2' },
    { u: -fundoForro, v: -(rForro - T.forro_raio_fundo) / 2 },
    { u: -fundoForro, v: T.forro_raio_fundo - rForro },
  ];
  for (const [zc, rotulo] of [[zD, 'Dianteiro'], [zT, 'Traseiro']]) {
    for (const [lado, s] of lados) {
      const nome = `forroArco${rotulo}${lado === 'Esquerda' ? 'Esquerdo' : 'Direito'}`;
      const g = gaiolaVarrida({
        nome,
        trilho: [{ arco: { centro: [s * f.xMax, yc, zc], eixo: EIXO_X, de: [s * f.xMax, yc - rForro * Math.sin(angForro), zc + rForro * Math.cos(angForro)], graus: -(180 + 2 * (angForro / grau)) } }],
        quadro: s > 0 ? { u: [s, 0, 0], virar: true } : { u: [s, 0, 0] }, secao: secaoForro, fora: [s, 0, 0],
        vincos: [{ linha: 'canto', nitidez: 'viva' }, { linha: 'canto2', nitidez: 'viva' }],
        estacoes: [{ fracao: 0 }, { passo: rForro * ((T.moldura_passo_graus * Math.PI) / 180), linha: 'canto' }, { fracao: 1 }],
      });
      partes.push(daVarredura(g));
    }
  }

  /* ---- o para-choque dianteiro ---- */
  {
    const sec = adensar(comAlturas(T.secao_parachoque_dianteiro, [T.placa_dianteira_y0, T.placa_dianteira_y0 + T.placa_altura]), T.plastico_passo_y);
    const uChapa = (y) => f.zF(y) - f.zFrente; // a chapa recua do nariz no alto
    const linhas = sec.map(([u, y], j) => (j === sec.length - 1 ? { u: uChapa(y) - pen, y, topo: true } : tocaChapa({ u, y })));
    const rQuina = f.raioFrente(T.parachoque_topo_y); const xQuina = f.xMax - rQuina; const zQuina = f.zFrente - rQuina;
    const zFimLado = (y) => zD + dzJoin(y);
    const posicao = (e, l) => {
      const u = l.u; const y = l.y;
      if (e.tipo === 'reta') return [e.fr * xQuina, y, f.zFrente + u];
      const rho = rQuina + kLado * u; const zc = zQuina + (1 - kLado) * u;
      if (e.tipo === 'quina') return [e.s * (xQuina + rho * Math.sin(e.phi)), y, zc + rho * Math.cos(e.phi)];
      if (e.tipo === 'alargamento') return [e.s * (f.xMax + uContinua(e.d, y, kLado * u, l.topo)), y, zD + dzDe(T.arco_raio + e.d)(y)];
      return [e.s * (f.xMax + kLado * u), y, lerp(zc, zFimLado(y), e.t)];
    };
    const g = construirGrade({
      nome: 'parachoqueDianteiro', estacoes: estacoesDoParachoque(T, xQuina, T.placa_meia_largura / xQuina, dsAlarg), linhas, posicao, dica: (c) => [c[0], 0, c[2] - 100],
      vincosEm: T.parachoque_dianteiro_vincos.map((y) => sec.findIndex((p) => Math.abs(p[1] - y) < 1e-9)),
    });
    abrirBolso(g, {
      nome: 'placaDianteira', fundo: T.placa_fundo, dir: [0, 0, -1],
      dentro: (p) => Math.abs(p[0]) <= T.placa_meia_largura + 0.5 && p[1] >= T.placa_dianteira_y0 - 0.5 && p[1] <= T.placa_dianteira_y0 + T.placa_altura + 0.5 && p[2] >= f.zFrente + saida(T.secao_parachoque_dianteiro) - 1,
    });
    partes.push(fecharPeca('parachoqueDianteiro', [g]));
  }

  /* ---- o para-choque traseiro, com o degrau plano de carga em cima ---- */
  {
    const sec = adensar(comAlturas(T.secao_parachoque_traseiro, [T.placa_traseira_y0, T.placa_traseira_y0 + T.placa_altura]), T.plastico_passo_y);
    const uChapa = (y) => f.zTras - f.zR(y); // negativa: a chapa fica dentro da traseira vertical, no degrau
    const topoY = sec.at(-1)[1];
    const linhas = [...sec.map(([u, y]) => tocaChapa({ u, y })), { u: uChapa(topoY) - pen, y: topoY }];
    const rQuina = T.raio_planta_tras; const zQuina = f.zTras + rQuina; const xQuina = f.xMax - rQuina;
    const zFimLado = (y) => zT - dzJoin(y);
    const posicao = (e, l) => {
      const u = l.u; const y = l.y;
      const rho = rQuina + u; const xc = xQuina - (1 - kLadoTras) * u;
      if (e.tipo === 'reta') return [e.fr * xc, y, f.zTras - u];
      if (e.tipo === 'quina') return [e.s * (xc + rho * Math.sin(e.phi)), y, zQuina - rho * Math.cos(e.phi)];
      if (e.tipo === 'alargamento') return [e.s * (f.xMax + uContinua(e.d, y, kLadoTras * u)), y, zT - dzDe(T.arco_raio + e.d)(y)];
      return [e.s * (f.xMax + kLadoTras * u), y, lerp(zQuina, zFimLado(y), e.t)];
    };
    const estsTras = estacoesDoParachoque(T, xQuina, T.placa_meia_largura / (xQuina - (1 - kLadoTras) * saida(T.secao_parachoque_traseiro)), dsAlarg);
    /* o degrau de carga é plano: onde o alargamento passa dele (a saída dele maior que a do degrau) o degrau some e a borda de cima fica aberta, na altura do degrau */
    const uDegrau = kLadoTras * sec.at(-1)[0];
    const passaDoDegrau = (e) => e.tipo === 'alargamento' && saidaAlarg(e.d) > uDegrau;
    const g = construirGrade({
      nome: 'parachoqueTraseiro', estacoes: estsTras, linhas,
      manter: (i, j) => !(j === linhas.length - 2 && (passaDoDegrau(estsTras[i]) || passaDoDegrau(estsTras[i + 1]))), posicao, dica: (c) => [c[0], 0, c[2] + 100],
      vincosEm: T.parachoque_traseiro_vincos.map((y) => sec.findIndex((p) => Math.abs(p[1] - y) < 1e-9)),
    });
    abrirBolso(g, {
      nome: 'placaTraseira', fundo: T.placa_fundo, dir: [0, 0, 1],
      dentro: (p) => Math.abs(p[0]) <= T.placa_meia_largura + 0.5 && p[1] >= T.placa_traseira_y0 - 0.5 && p[1] <= T.placa_traseira_y0 + T.placa_altura + 0.5 && p[2] <= f.zTras - saida(T.secao_parachoque_traseiro) + 1,
    });
    partes.push(fecharPeca('parachoqueTraseiro', [g]));
  }
  return partes;
}
