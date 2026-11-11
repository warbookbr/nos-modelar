/* carrinho-de-mao.esboco.mjs: o rascunho do carrinho de mão de obra inteiro, de uma roda, pelas referências da pessoa (2026-11-11):
 * o chassi num tubo só dobrado (o laço em U que contorna a roda por diante, as rampas, os braços sob a caçamba, a subida e as manoplas
 * com punho de borracha), os mancais do eixo sob o laço, os pés em V de tubo mais fino com as duas travessas de chapa chata, a caçamba
 * de chapa estampada com a borda virada e os dois tirantes da frente, e a roda com o eixo. Uma função de montar por peça
 * (`montarChassi`, `montarPes`, `montarCacamba`, `montarRoda`), sobre um estado só, e a opção no fim.
 *
 * Eixos: x lateral, y altura com o chão em 0, z comprimento com a frente (a roda) em +z; o eixo da roda em z 0. Tudo em mm.
 * As medidas são as da TABELA do `../ALINHAMENTO.md`: a escala é a do pneu (Ø 340, 3.25-8, medida típica adotada), e as formas saem
 * de `carrinho-de-mao.contornos.json` (as silhuetas de lado e de cima medidas nas referências, que não entram no repositório). As cores
 * são uma por parte, para a conferência; no objeto real a caçamba, o chassi e os pés têm a mesma pintura.
 *
 * As técnicas: o tubo do chassi é UMA `gaiolaVarrida` de seção redonda, fechada e tampada, num trilho de retas emendadas por arcos
 * (`trilhoComRaios`, abaixo, faz os arcos de uma polilinha com um raio por canto), da ponta de uma manopla à da outra; os pés, outra
 * varredura cada um; a caçamba por `lacosPelasVistas` com `gaiolaPorLacos`, sem as faces da tampa de cima e com a espessura da chapa
 * no passo `subdivisao`; a borda virada por `gaiolaVarrida` ao longo da boca; os tirantes cortados pelo corpo fechado da caçamba, para
 * acabarem na face de fora dela; a roda, o aro e o eixo por `lathe` (a receita usará a família `roda-pneu`, perfil `carrinho-de-mao`).
 *
 * `npm run esboco:nucleo -- <este arquivo> --so-montar` dá a caixa e o relato de contatos. */
import { gaiolaVarrida } from '../../../nucleo/gaiola-varrida.js';
import { gaiolaPorLacos } from '../../../nucleo/gaiola-por-lacos.js';
import { lacosPelasVistas } from '../../../nucleo/lacos-pelas-vistas.js';

export const TABELA = {
  cores: { azul: '#2f6fd1', escuro: '#2a2d30', cinza: '#6b7178', preto: '#151617', aro: '#4a4f55' },
  /* RODA (linhas "pneu" e "aro"): 3.25-8, Ø 340 × 85 de banda, aro de chapa de 8 polegadas (talão a Ø 203); o eixo em y 170, a roda
     no chão. O cubo tem 110 mm de largura e furo de Ø 24 (rolamento). */
  roda: { raio: 170, meiaBanda: 42.5, raioDoTalao: 101.5, meioCubo: 55, furoDoCubo: 12, z: 0, lados: 64 },
  /* EIXO (linha "eixo"): Ø 16, de x -120 a 120, pelos dois mancais. */
  eixo: { raio: 8, meio: 120 },
  /* TUBO DO CHASSI (linha "tubo do chassi"): Ø 32, 24 lados. A polilinha do eixo do tubo, do lado +x, da ponta da manopla ao canto da
     frente do laço (o outro lado é o espelho): a manopla até z -1.300 (y 515, x 262), a dobra de cima da subida, o braço sob a caçamba
     (y 266, x 175 a 160, de z -770 a -170, com a subida começando atrás do fundo da caçamba), a rampa, o laço reto (y 195, x 95) e o canto da frente em z 210 (a ponta de fora do laço em
     z 226). Raio de cada canto, na mesma ordem; o da frente é quase a meia largura do laço, que fica com 2 mm de reta. */
  tubo: { raio: 16, lados: 24, passo: 40, naCurva: 8 },
  chassi: {
    pontos: [[262, 515, -1300], [250, 475, -1080], [175, 266, -770], [160, 266, -170], [95, 195, -45], [95, 195, 210]],
    raios: [120, 150, 120, 100, 94],
  },
  /* MANOPLA (linha "manoplas"): punho de borracha de Ø 38 nos últimos 110 mm do tubo, passando 6 mm da ponta dele. */
  manopla: { raio: 19, comprimento: 110, alem: 6, lados: 24 },
  /* MANCAIS (linha "mancais"): um bloco sob cada lado do laço, em z 0, da face de baixo do eixo ao meio do tubo. */
  mancais: { x: [79, 111], y: [158, 195], meioComprimento: 18 },
  /* PÉS (linha "pés"): tubo de Ø 22. De cada lado um V sob o braço, do eixo do braço em z -305 (a perna da frente) ao eixo dele em z
     -580 (a de trás, quase de pé), com o fundo arredondado no chão; o raio do fundo é o que põe a face de baixo do tubo em y 0. */
  pes: { raio: 11, lados: 16, topos: [-305, -580], fundoZ: -551, fundoY: -105 },
  /* TRAVESSAS DOS PÉS (linha "travessas"): chapa chata de 40 × 6, de lado a lado, nos topos das pernas, com a face de cima na de baixo dos braços (y 250). */
  travessas: { largura: 40, espessura: 6, topo: 250, alem: 12 },
  /* CAÇAMBA (linhas "caçamba"): a silhueta de lado em [z, y], do fundo de fora em y 284,5 (2,5 mm acima da face de cima dos braços) à
     boca em 462; a boca de z -810 a 24; a meia largura por altura, de 175 no fundo a 313 na boca; a meia planta da boca pela vista de
     cima (313 de z -260 a -650, os cantos de trás arredondados e a frente afinando até a ponta). Chapa de 1,5 mm; borda virada de Ø 16. */
  cacamba: {
    lado: [[-715, 284.5], [-170, 284.5], [-140, 290], [-115, 305], [-95, 322], [-70, 350], [-40, 392], [-10, 432], [24, 462], [-810, 462],
      [-790, 420], [-775, 385], [-745, 320], [-728, 296]],
    perfil: [[284.5, 150], [292, 190], [306, 222], [340, 260], [400, 295], [462, 313]],
    planta: [[0, 24], [80, 14], [116, 0], [158, -20], [203, -50], [234, -80], [266, -120], [288, -160], [303, -200], [313, -260],
      [313, -650], [306, -700], [290, -740], [262, -775], [225, -795], [180, -805], [0, -810]],
    estacoes: [284.5, 290, 298, 310, 326, 346, 370, 396, 422, 444, 462],
    pontos: 33, pontosDoLado: 25,
    espessura: 1.5,
    borda: { raio: 8, paraFora: 5, abaixo: 2, lados: 16 },
  },
  /* TIRANTES (linha "tirantes"): barra redonda de Ø 10, de cada lado, do laço do chassi em z 32 (x 95, no eixo do tubo) até a frente da
     caçamba, cortada pela face de fora dela 0,3 mm antes (o assento). */
  tirantes: { raio: 5, de: [95, 195, 32], para: [110, 440, -60], assento: 0.3 },
};

/* ------------------------------------------------------------------ vetores */
const soma = (a, b) => a.map((v, k) => v + b[k]);
const sub = (a, b) => a.map((v, k) => v - b[k]);
const esc = (a, k) => a.map((v) => v * k);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(...a);
const unit = (a) => esc(a, 1 / norma(a));
const lerp = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);

/** O trilho de `gaiolaVarrida` de uma polilinha com os cantos em arco: `raios[k]` é o raio do canto no ponto k + 1. Devolve o trilho,
 *  os marcos (o `s` de cada emenda entre reta e arco), para as estações, e os arcos (centro e raio), para medir. */
export function trilhoComRaios(pontos, raios) {
  const trilho = []; const marcos = []; const arcos = []; let s = 0; let atual = pontos[0];
  for (let i = 1; i < pontos.length - 1; i += 1) {
    const P = pontos[i]; const d1 = unit(sub(P, pontos[i - 1])); const d2 = unit(sub(pontos[i + 1], P));
    const th = Math.acos(Math.max(-1, Math.min(1, dot(d1, d2)))); const R = raios[i - 1];
    const t = R * Math.tan(th / 2);
    const T1 = sub(P, esc(d1, t));
    const L = norma(sub(T1, atual));
    if (!(L > 1)) throw new Error(`trilhoComRaios: o canto ${i} (raio ${R}) não cabe na reta que chega a ele`);
    trilho.push({ reta: { de: atual, ate: T1 } }); s += L; marcos.push(s);
    const n = unit(cruz(d1, d2)); const centro = soma(T1, esc(unit(cruz(n, d1)), R));
    trilho.push({ arco: { centro, eixo: n, de: T1, graus: th * 180 / Math.PI } }); s += R * th; marcos.push(s);
    atual = soma(P, esc(d2, t));
    arcos.push({ centro, raio: R });
  }
  trilho.push({ reta: { de: atual, ate: pontos[pontos.length - 1] } });
  return { trilho, marcos, arcos };
}

/* a caçamba: os laços pelas três vistas, com a planta espelhada da meia planta da TABELA */
function lacosDaCacamba(C) {
  const meia = C.planta;
  const planta = [...meia, ...meia.slice(1, -1).reverse().map(([x, z]) => [-x, z])];
  const { meiaPlanta, avisos, ...lacos } = lacosPelasVistas({ lado: C.lado, perfil: C.perfil, planta, estacoes: C.estacoes, pontos: C.pontos, pontosDoLado: C.pontosDoLado });
  return { lacos, avisos };
}

/** As ferramentas que escrevem passos em mm no estado { passos, topo, origem }. */
function ferramentas(estado) {
  const nova = (op, args) => { estado.origem += 1; estado.passos.push([op, { origemId: estado.origem, ...args }]); return { origem: { op, id: estado.origem } }; };
  const circulo = (r, n) => Array.from({ length: n }, (_, k) => ({ u: r * Math.cos(2 * Math.PI * k / n), v: r * Math.sin(2 * Math.PI * k / n), nome: `l${k}` }));
  /* um tubo redondo varrido, fechado e tampado, com estações a cada `passo` nas retas e `naCurva` em cada arco */
  function tubo(nome, { trilho, marcos }, raio, { lados = 24, passo = 40, naCurva = 8, quadro = { u: [0, 1, 0] }, tampas = true, estacoes: dadas } = {}) {
    const estacoes = dadas ?? [{ fracao: 0 }];
    if (!dadas) {
      marcos.forEach((m, k) => estacoes.push(k % 2 === 0 ? { passo } : { entre: naCurva }, { em: m }));
      estacoes.push(marcos.length % 2 === 0 ? { passo } : { entre: naCurva }, { fracao: 1 });
    }
    const g = gaiolaVarrida({ nome, trilho, quadro, secao: circulo(raio, lados), fechada: true, tampas, estacoes });
    Object.assign(estado.topo, Object.fromEntries(g.posicoes));
    return nova('subdivisao', { vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, niveis: 0 });
  }
  const reta = (de, ate) => ({ trilho: [{ reta: { de, ate } }], marcos: [] });
  function bloco([x0, x1], [y0, y1], [z0, z1]) {
    return nova('extrusao', { eixo: 'y', altura: y1 - y0, em: [0, y0, 0], perfil: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
  }
  const lathe = (perfil, em, lados) => nova('lathe', { eixo: 'x', perfil, lados, em });
  const booleana = (op, solidos) => nova(op, { solidos });
  function parte(nome, sel, cor) {
    estado.passos.push(['parte', { nome, sel }], ['pincel', { modo: 'face', sel, cor }], ['liso', { sel, angulo: 35 }]);
  }
  /* o corpo fechado da caçamba (a gaiola com a tampa), subdividido como a casca e descido `assento` mm: o molde que corta o que
     encosta nela por fora */
  function molde(C, assento) {
    const g = gaiolaPorLacos({ nome: `molde${estado.origem + 1}`, eixo: 'y', ...lacosDaCacamba(C).lacos });
    Object.assign(estado.topo, g.pontosMm);
    const m = nova('subdivisao', { ...g.passo, niveis: 2 });
    estado.passos.push(['transladar', { sel: m, d: [0, -assento, 0] }]);
    return m;
  }
  return { nova, tubo, reta, bloco, lathe, booleana, parte, molde };
}

/** O x, o y e o z do eixo do braço reto (do terceiro ao quarto ponto da polilinha do chassi) em z, do lado +x. */
function noBraco(T, z) {
  const [a, b] = [T.chassi.pontos[2], T.chassi.pontos[3]];
  return lerp(a, b, (z - a[2]) / (b[2] - a[2]));
}

/** O chassi: o tubo só, da ponta de uma manopla à da outra pelo laço da frente, os punhos e os mancais do eixo. */
export function montarChassi(estado, T = TABELA) {
  const { tubo, reta, bloco, parte } = ferramentas(estado);
  const CH = T.chassi;
  const outro = [...CH.pontos].reverse().map(([x, y, z]) => [-x, y, z]);
  const raios = [...CH.raios, CH.raios[CH.raios.length - 1], ...[...CH.raios].reverse()];
  parte('chassi', tubo('chassi', trilhoComRaios([...CH.pontos, ...outro], raios), T.tubo.raio, T.tubo), T.cores.azul);
  const M = T.manopla; const MA = T.mancais;
  for (const s of [1, -1]) {
    const [a, b] = [CH.pontos[0], CH.pontos[1]].map(([x, y, z]) => [s * x, y, z]);
    const d = unit(sub(a, b));
    parte('manoplas', tubo(`manopla${s > 0 ? 'E' : 'D'}`, reta(sub(a, esc(d, M.comprimento)), soma(a, esc(d, M.alem))), M.raio, { lados: M.lados, passo: 30, quadro: { u: [1, 0, 0] } }), T.cores.preto);
    parte('mancais', bloco(s > 0 ? MA.x : [-MA.x[1], -MA.x[0]], MA.y, [T.roda.z - MA.meioComprimento, T.roda.z + MA.meioComprimento]), T.cores.escuro);
  }
}

/** Os pés: um V de cada lado, do eixo do braço ao chão e de volta, e as duas travessas de chapa chata entre os dois. */
export function montarPes(estado, T = TABELA) {
  const { tubo, bloco, parte } = ferramentas(estado);
  const P = T.pes;
  const [ta, tb] = P.topos.map((z) => noBraco(T, z));
  const fundo = [(ta[0] + tb[0]) / 2, P.fundoY, P.fundoZ];
  /* o raio do fundo que põe o ponto mais baixo do eixo do tubo na altura do raio do tubo (a face de baixo no chão) */
  const baixo = (R) => { const a = trilhoComRaios([ta, fundo, tb], [R]).arcos[0]; return a.centro[1] - a.raio; };
  let lo = 5; let hi = 400;
  for (let k = 0; k < 60; k += 1) { const R = (lo + hi) / 2; if (baixo(R) < P.raio) lo = R; else hi = R; }
  const R = (lo + hi) / 2;
  for (const s of [1, -1]) {
    const pontos = [ta, fundo, tb].map(([x, y, z]) => [s * x, y, z]);
    parte('pes', tubo(`pe${s > 0 ? 'E' : 'D'}`, trilhoComRaios(pontos, [R]), P.raio, { lados: P.lados, quadro: { u: [1, 0, 0] } }), T.cores.cinza);
  }
  const TR = T.travessas;
  for (const t of [ta, tb]) {
    parte('travessas', bloco([-t[0] - TR.alem, t[0] + TR.alem], [TR.topo - TR.espessura, TR.topo], [t[2] - TR.largura / 2, t[2] + TR.largura / 2]), T.cores.escuro);
  }
  return { raioDoFundo: R };
}

/** A caçamba: a casca aberta em cima, com a espessura da chapa para dentro, a borda virada em volta da boca e os tirantes da frente. */
export function montarCacamba(estado, T = TABELA) {
  const { nova, tubo, reta, booleana, parte, molde } = ferramentas(estado);
  const C = T.cacamba;
  const { lacos, avisos } = lacosDaCacamba(C);
  if (avisos.length) throw new Error(`caçamba: ${avisos.map((a) => JSON.stringify(a)).join('; ')}`);
  const g = gaiolaPorLacos({ nome: 'cacamba', eixo: 'y', ...lacos });
  Object.assign(estado.topo, g.pontosMm);
  /* tira as faces da tampa de cima: as que só têm pontos do último laço */
  const ultimo = `cacamba_${g.lacos[g.lacos.length - 1].nome}_`;
  const faces = g.passo.faces.filter((f) => !f.every((p) => p.startsWith(ultimo)));
  parte('cacamba', nova('subdivisao', { ...g.passo, faces, niveis: 2, espessura: C.espessura }), T.cores.azul);
  /* a borda: a boca (o limite da subdivisão do último laço, (p0 + 4p1 + p2) / 6), para fora e abaixo; a volta começa no meio da boca
     de trás, onde a reta continua, para a emenda do tubo ficar sem quina */
  const volta = g.passo.vertices.filter((p) => p.startsWith(ultimo)).map((p) => g.pontosMm[p]);
  const meioDeTras = Math.floor((C.pontos - 1) / 2);
  const boca = [...volta.slice(meioDeTras), ...volta.slice(0, meioDeTras)];
  const n = boca.length; const BO = C.borda;
  const limite = boca.map((p, k) => esc(soma(soma(boca[(k + n - 1) % n], esc(p, 4)), boca[(k + 1) % n]), 1 / 6));
  const cy = C.estacoes[C.estacoes.length - 1] - BO.abaixo;
  const meio = limite.reduce((a, p) => soma(a, esc(p, 1 / n)), [0, 0, 0]);
  const fora = limite.map((p, k) => {
    const t = sub(limite[(k + 1) % n], limite[(k + n - 1) % n]); let nn = unit([t[2], 0, -t[0]]);
    if (dot(nn, sub(p, meio)) < 0) nn = esc(nn, -1);
    return [p[0] + nn[0] * BO.paraFora, cy, p[2] + nn[2] * BO.paraFora];
  });
  const pontos = [...fora, fora[0]]; const estacoes = [{ fracao: 0 }]; let s = 0;
  for (let k = 1; k < pontos.length - 1; k += 1) { s += norma(sub(pontos[k], pontos[k - 1])); estacoes.push({ entre: 1 }, { em: s }); }
  estacoes.push({ entre: 1 }, { fracao: 1 });
  parte('borda', tubo('borda', { trilho: { pontos }, marcos: [] }, BO.raio, { lados: BO.lados, estacoes }), T.cores.azul);
  /* os tirantes: do laço do chassi para dentro da caçamba, menos o corpo fechado dela */
  const TI = T.tirantes;
  const barras = [1, -1].map((k) => tubo(`tirante${k > 0 ? 'E' : 'D'}`, reta(...[TI.de, TI.para].map(([x, y, z]) => [k * x, y, z])), TI.raio, { lados: 12, passo: 30, quadro: { u: [1, 0, 0] } }));
  parte('tirantes', booleana('subtrair', [booleana('unir', barras), molde(C, TI.assento)]), T.cores.escuro);
}

/** A roda (pneu e aro de chapa) e o eixo, por revolução em torno de x no centro da roda. */
export function montarRoda(estado, T = TABELA) {
  const { lathe, parte } = ferramentas(estado);
  const R = T.roda; const E = T.eixo; const em = [0, R.raio, R.z]; const w = R.meiaBanda; const rt = R.raioDoTalao; const c = R.meioCubo;
  /* o pneu: a seção fechada, do talão à banda, redonda nos ombros */
  parte('pneu', lathe([[rt, -30], [rt + 8, -38], [130, -w], [155, -40], [165, -32], [R.raio, -16], [R.raio, 16], [165, 32], [155, 40],
    [130, w], [rt + 8, 38], [rt, 30], [rt, -30]], em, R.lados), T.cores.preto);
  /* o aro: o cubo com o furo do rolamento, o disco e a calha com as abas que seguram o talão */
  parte('aro', lathe([[R.furoDoCubo, -c], [26, -c], [26, -6], [90, -6], [90, -30], [106, -34], [106, -28], [rt - 3.5, -25],
    [rt - 3.5, 25], [106, 28], [106, 34], [90, 30], [90, 6], [26, 6], [26, c], [R.furoDoCubo, c], [R.furoDoCubo, -c]], em, R.lados), T.cores.aro);
  parte('eixo', lathe([[0, -E.meio], [E.raio, -E.meio], [E.raio, E.meio], [0, E.meio]], em, 24), T.cores.escuro);
}

const estado = { passos: [], topo: {}, origem: 0 };
montarCacamba(estado);
montarChassi(estado);
montarPes(estado);
montarRoda(estado);

const par = (a, b, relacao, motivo) => ({ par: [a, b], relacao, motivo });
export const CONTATOS = [
  par('borda', 'cacamba', 'atravessa', 'a borda virada é a mesma chapa: o tubo da borda abraça a beira da boca'),
  par('cacamba', 'tirantes', 'folga', 'a ponta de cima dos tirantes segue a face de fora da caçamba 0,3 mm abaixo dela (o parafuso fica para a receita)'),
  par('chassi', 'tirantes', 'atravessa', 'a ponta de baixo dos tirantes é presa no tubo do laço'),
  par('cacamba', 'chassi', 'folga', 'o fundo da caçamba assenta nos braços, 2,5 mm acima da face de cima deles (com 0,5 mm o relato dava travessia que a malha não tem; o parafuso fica para a receita)'),
  par('chassi', 'manoplas', 'atravessa', 'o punho veste a ponta do tubo'),
  par('chassi', 'mancais', 'atravessa', 'os mancais são presos sob o tubo do laço'),
  par('eixo', 'mancais', 'atravessa', 'o eixo passa pelos mancais'),
  par('chassi', 'pes', 'atravessa', 'as pontas de cima dos pés entram na braçadeira sob o braço (no rascunho, no eixo do tubo)'),
  par('pes', 'travessas', 'atravessa', 'as travessas de chapa são presas nas pernas, de lado a lado'),
  par('chassi', 'travessas', 'encosta', 'a face de cima das travessas assenta na de baixo dos braços (y 250)'),
  par('aro', 'pneu', 'atravessa', 'o talão do pneu assenta entre as abas do aro'),
  par('aro', 'eixo', 'folga', 'o cubo gira no eixo, com 4 mm de folga no raio (o rolamento)'),
];

export default {
  plano: 'O carrinho de mão de obra inteiro em rascunho, pelas referências da pessoa: chassi num tubo só com o laço em volta da roda, pés em V com travessas, caçamba com borda virada e tirantes, roda e eixo.',
  vista: 'direita',
  opcoes: [{
    titulo: 'carrinho de mão de obra',
    nota: 'rascunho pelas referências da pessoa, na escala do pneu',
    passos: estado.passos,
    topo: estado.topo,
    contatos: CONTATOS,
  }],
};
