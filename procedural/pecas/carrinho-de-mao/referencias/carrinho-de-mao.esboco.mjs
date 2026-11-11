/* carrinho-de-mao.esboco.mjs — o rascunho do carrinho de mão de obra inteiro, de uma roda: o chassi de tubo redondo dobrado (os dois
 * braços com as manoplas, o garfo, os pés e as travessas), a caçamba de chapa estampada de uns 60 L com a borda virada, e o eixo com a
 * roda. Uma função de montar por frente (`montarChassi`, `montarCacamba`, `montarRoda`), sobre um estado só, e a opção no fim.
 *
 * Eixos: x lateral, y altura com o chão em 0, z comprimento com a frente (a roda) em +z; o eixo da roda em z 0. Tudo em mm.
 * As medidas são as da TABELA do `../ALINHAMENTO.md` (medida típica de carrinho de mão de obra de 60 L, adotada); cada número abaixo
 * cita a linha dela. Não há imagem de referência ainda.
 *
 * As técnicas: o tubo do chassi por `gaiolaVarrida` de seção redonda, fechada e tampada, num trilho de retas emendadas por arcos de
 * raio (`trilhoComRaios`, abaixo, faz os arcos de uma polilinha com um raio por canto); a caçamba por `lacosPelasVistas` com
 * `gaiolaPorLacos`, sem as faces da tampa de cima e com a espessura da chapa no passo `subdivisao`; a borda virada por `gaiolaVarrida`
 * ao longo da boca; a roda, o aro e o eixo por `lathe` (a receita usará a família `roda-pneu`, perfil `carrinho-de-mao`).
 *
 * `npm run esboco:nucleo -- <este arquivo> --so-montar` dá a caixa e o relato de contatos. */
import { gaiolaVarrida } from '../../../nucleo/gaiola-varrida.js';
import { gaiolaPorLacos } from '../../../nucleo/gaiola-por-lacos.js';
import { lacosPelasVistas } from '../../../nucleo/lacos-pelas-vistas.js';

export const TABELA = {
  cores: { chapa: '#c9662c', escuro: '#2a2d30', pneu: '#151617', aro: '#c4c8cb' },
  /* RODA (linhas "pneu" e "aro"): 3.50-8, Ø 380 × 89 de banda, aro de 8 polegadas (talão a Ø 203); o eixo em y 190, a roda no chão. */
  roda: { raio: 190, meiaBanda: 44.5, raioDoTalao: 101.5, z: 0, lados: 64 },
  /* EIXO (linha "eixo"): Ø 19, de x -100 a 100, passando pelas pontas do garfo; o cubo do aro tem furo de Ø 28 (rolamento). */
  eixo: { raio: 9.5, meio: 100, furoDoCubo: 14, meioCubo: 45 },
  /* TUBO (linha "tubo do chassi"): Ø 30, 24 lados. */
  tubo: { raio: 15, lados: 24, passo: 40, naCurva: 8 },
  /* BRAÇO (linhas "garfo", "braços", "manoplas"): de cada lado, a ponta do garfo no eixo (x 75), a dobra de cima do garfo (y 360), o
     braço reto sob a caçamba (x 175 a 178, y 400 a 410, de z -330 a -700) e a subida até a ponta da manopla (x 290, y 615, z -1.210).
     Raio de cada canto. */
  braco: {
    garfoX: 75, alemDoEixo: 28,
    pontos: [[80, 360, -120], [175, 400, -330], [178, 410, -700], [285, 580, -1060], [290, 615, -1210]],
    raios: [90, 250, 250, 250],
  },
  /* MANOPLA (linha "manoplas"): luva de Ø 36 nos últimos 105 mm do tubo, passando 8 mm da ponta dele. */
  manopla: { raio: 18, comprimento: 105, alem: 8, lados: 24 },
  /* PÉS (linha "pés"): de cada lado, um tubo em trapézio que nasce no eixo do braço reto em z -420 e volta a ele em -620, com o pé reto
     no chão de z -520 a -680 em x 225 (o centro do tubo em y 15, a face de baixo em y 0). Raio de 40 nos dois cantos de baixo. */
  pes: { nasce: [-420, -620], x: 225, z: [-520, -680], raio: 40 },
  /* TRAVESSAS (linha "travessas"): uma entre os braços, no trecho do garfo ao braço reto, em z -230; e uma entre os pés atrás, em y 200. */
  travessas: { braco: { z: -230 }, pes: { y: 200 } },
  /* CALÇOS (linha "calços"): dois blocos em cada braço, sob a caçamba, em z -380 e -620, de 30 mm de largura sobre o eixo do braço e
     50 mm no comprimento, do eixo do braço até a face de fora da caçamba, 0,3 mm abaixo dela (o assento). */
  calcos: { largura: 30, z: [-380, -620], comprimento: 50, ate: 520, assento: 0.3 },
  /* CAÇAMBA (linhas "caçamba"): a silhueta de lado em [z, y], do fundo em y 425 à boca em 640 (215 de fundo), a boca de z -790 a 110
     (900 de comprimento) com o fundo reto de z -590 a -330 e os cantos dele arredondados; a meia largura por altura, de 110 no fundo a
     300 na boca (600 de largura), em curva no pé das paredes; a planta da boca com os cantos da frente de raio 180 e os de trás de raio
     90. Chapa de 1,5 mm; borda virada de Ø 18. */
  cacamba: {
    lado: [[-590, 425], [-330, 425], [-275, 433], [-240, 448], [110, 640], [-790, 640], [-668, 455], [-640, 436]],
    perfil: [[425, 110], [435, 150], [455, 182], [510, 228], [640, 300]],
    boca: { meia: 300, tras: -790, frente: 110, raioFrente: 180, raioTras: 90 },
    estacoes: [425, 432, 442, 456, 475, 500, 528, 558, 588, 615, 640],
    pontos: 33, pontosDoLado: 25,
    espessura: 1.5,
    borda: { raio: 9, paraFora: 6, abaixo: 2, lados: 16 },
  },
};

/* ------------------------------------------------------------------ vetores */
const soma = (a, b) => a.map((v, k) => v + b[k]);
const sub = (a, b) => a.map((v, k) => v - b[k]);
const esc = (a, k) => a.map((v) => v * k);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(...a);
const unit = (a) => esc(a, 1 / norma(a));

/** O trilho de `gaiolaVarrida` de uma polilinha com os cantos em arco: `raios[k]` é o raio do canto no ponto k + 1. Devolve o trilho
 *  e os marcos (o `s` de cada emenda entre reta e arco), para as estações. */
export function trilhoComRaios(pontos, raios) {
  const trilho = []; const marcos = []; let s = 0; let atual = pontos[0];
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
  }
  trilho.push({ reta: { de: atual, ate: pontos[pontos.length - 1] } });
  return { trilho, marcos };
}

/** As ferramentas que escrevem passos em mm no estado { passos, topo, origem }. */
function ferramentas(estado) {
  const nova = (op, args) => { estado.origem += 1; estado.passos.push([op, { origemId: estado.origem, ...args }]); return { origem: { op, id: estado.origem } }; };
  const circulo = (r, n) => Array.from({ length: n }, (_, k) => ({ u: r * Math.cos(2 * Math.PI * k / n), v: r * Math.sin(2 * Math.PI * k / n), nome: `l${k}` }));
  /* um tubo redondo varrido, fechado e tampado, com estações a cada `passo` nas retas e `naCurva` em cada arco */
  function tubo(nome, { trilho, marcos }, raio, { lados = 24, passo = 40, naCurva = 8, quadro = { u: [1, 0, 0] }, tampas = true, estacoes: dadas } = {}) {
    const estacoes = dadas ?? [{ fracao: 0 }];
    if (!dadas) {
      marcos.forEach((m, k) => estacoes.push(k % 2 === 0 ? { passo } : { entre: naCurva }, { em: m }));
      estacoes.push(marcos.length % 2 === 0 ? { passo } : { entre: naCurva }, { fracao: 1 });
    }
    const g = gaiolaVarrida({ nome, trilho, quadro, secao: circulo(raio, lados), fechada: true, tampas, estacoes });
    Object.assign(estado.topo, Object.fromEntries(g.posicoes));
    return nova('subdivisao', { vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, niveis: 0 });
  }
  function bloco([x0, x1], [y0, y1], [z0, z1]) {
    return nova('extrusao', { eixo: 'y', altura: y1 - y0, em: [0, y0, 0], perfil: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
  }
  const lathe = (perfil, em, lados) => nova('lathe', { eixo: 'x', perfil, lados, em });
  const booleana = (op, solidos) => nova(op, { solidos });
  function parte(nome, sel, cor) {
    estado.passos.push(['parte', { nome, sel }], ['pincel', { modo: 'face', sel, cor }], ['liso', { sel, angulo: 35 }]);
  }
  return { nova, tubo, bloco, lathe, booleana, parte };
}

/* a caçamba: os laços pelas três vistas */
function lacosDaCacamba(C) {
  const B = C.boca; const planta = [];
  const canto = (cx, cz, r, a0) => { for (let k = 0; k <= 8; k += 1) { const a = (a0 + 90 * k / 8) * Math.PI / 180; planta.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); } };
  canto(B.meia - B.raioTras, B.tras + B.raioTras, B.raioTras, 270);
  canto(B.meia - B.raioFrente, B.frente - B.raioFrente, B.raioFrente, 0);
  canto(-B.meia + B.raioFrente, B.frente - B.raioFrente, B.raioFrente, 90);
  canto(-B.meia + B.raioTras, B.tras + B.raioTras, B.raioTras, 180);
  const { meiaPlanta, avisos, ...lacos } = lacosPelasVistas({ lado: C.lado, perfil: C.perfil, planta, estacoes: C.estacoes, pontos: C.pontos, pontosDoLado: C.pontosDoLado });
  return { lacos, avisos };
}

/** O chassi: os dois braços com o garfo, os pés, as travessas, os calços e as manoplas. */
export function montarChassi(estado, T = TABELA) {
  const { tubo, bloco, booleana, parte, nova } = ferramentas(estado);
  const TU = T.tubo; const BR = T.braco; const yEixo = T.roda.raio;
  /* o ponto do eixo do braço reto (o terceiro trecho, entre o segundo e o terceiro ponto) em z, do lado +x */
  const noBraco = (z) => { const [a, b] = [BR.pontos[1], BR.pontos[2]]; const t = (z - a[2]) / (b[2] - a[2]); return a.map((v, k) => v + (b[k] - v) * t); };
  const tubos = []; const manoplas = [];
  for (const s of [1, -1]) {
    const L = (s > 0 ? 'E' : 'D');
    /* o braço: a ponta do garfo 28 mm além do eixo, na reta que vai do eixo à dobra de cima */
    const noEixo = [s * BR.garfoX, yEixo, T.roda.z];
    const pts = BR.pontos.map(([x, y, z]) => [s * x, y, z]);
    const ponta = soma(noEixo, esc(unit(sub(noEixo, pts[0])), BR.alemDoEixo));
    tubos.push(tubo(`braco${L}`, trilhoComRaios([ponta, ...pts], BR.raios), TU.raio, TU));
    /* o pé em trapézio, do braço reto ao chão e de volta */
    const P = T.pes; const [n0, n1] = P.nasce.map((z) => noBraco(z)); const pe = P.z.map((z) => [P.x, TU.raio, z]);
    const pernas = [n0, pe[0], pe[1], n1].map(([x, y, z]) => [s * x, y, z]);
    tubos.push(tubo(`pe${L}`, trilhoComRaios(pernas, [P.raio, P.raio]), TU.raio, TU));
    /* a manopla na reta final do braço */
    const fim = pts[pts.length - 1]; const d = unit(sub(fim, pts[pts.length - 2])); const M = T.manopla;
    manoplas.push(tubo(`manopla${L}`, { trilho: [{ reta: { de: sub(fim, esc(d, M.comprimento)), ate: soma(fim, esc(d, M.alem)) } }], marcos: [] }, M.raio, { lados: M.lados, passo: 30 }));
  }
  /* as travessas: a do braço na reta da dobra do garfo ao braço reto, em z; a dos pés na reta de trás deles, em y */
  const lerp = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
  const [Bg, Cb] = BR.pontos; const tb = (T.travessas.braco.z - Bg[2]) / (Cb[2] - Bg[2]);
  const P = T.pes; const n1 = noBraco(P.nasce[1]); const p1 = [P.x, TU.raio, P.z[1]]; const tp = (T.travessas.pes.y - p1[1]) / (n1[1] - p1[1]);
  for (const [k, c] of [lerp(Bg, Cb, tb), lerp(p1, n1, tp)].entries()) {
    tubos.push(tubo(`travessa${k}`, { trilho: [{ reta: { de: [-c[0], c[1], c[2]], ate: c } }], marcos: [] }, TU.raio, { ...TU, quadro: { u: [0, 1, 0] } }));
  }
  for (const t of tubos) parte('chassi', t, T.cores.escuro);
  for (const m of manoplas) parte('manoplas', m, T.cores.escuro);
  /* os calços: blocos do eixo do braço à face de fora da caçamba, menos o corpo fechado dela */
  const CA = T.calcos; const blocos = [];
  for (const s of [1, -1]) for (const z of CA.z) {
    const [x, y] = noBraco(z);
    blocos.push(bloco([s * x - CA.largura / 2, s * x + CA.largura / 2], [y, CA.ate], [z - CA.comprimento / 2, z + CA.comprimento / 2]));
  }
  const { lacos } = lacosDaCacamba(T.cacamba);
  const g = gaiolaPorLacos({ nome: 'molde', eixo: 'y', ...lacos });
  Object.assign(estado.topo, g.pontosMm);
  const molde = nova('subdivisao', { ...g.passo, niveis: 2 });
  /* o molde desce o assento, para a face de cima dos calços ficar rente à de fora da caçamba sem a cruzar */
  estado.passos.push(['transladar', { sel: molde, d: [0, -CA.assento, 0] }]);
  const calcos = booleana('subtrair', [booleana('unir', blocos), molde]);
  parte('calcos', calcos, T.cores.escuro);
  return { tubos, manoplas, calcos };
}

/** A caçamba: a casca aberta em cima, com a espessura da chapa para dentro, e a borda virada em volta da boca. */
export function montarCacamba(estado, T = TABELA) {
  const { nova, tubo, parte } = ferramentas(estado);
  const C = T.cacamba;
  const { lacos, avisos } = lacosDaCacamba(C);
  if (avisos.length) throw new Error(`caçamba: ${avisos.map((a) => JSON.stringify(a)).join('; ')}`);
  const g = gaiolaPorLacos({ nome: 'cacamba', eixo: 'y', ...lacos });
  Object.assign(estado.topo, g.pontosMm);
  /* tira as faces da tampa de cima: as que só têm pontos do último laço */
  const ultimo = `cacamba_${g.lacos[g.lacos.length - 1].nome}_`;
  const faces = g.passo.faces.filter((f) => !f.every((p) => p.startsWith(ultimo)));
  const casca = nova('subdivisao', { ...g.passo, faces, niveis: 2, espessura: C.espessura });
  parte('cacamba', casca, T.cores.chapa);
  /* a borda: a boca (o limite da subdivisão do último laço, (p0 + 4p1 + p2) / 6), 6 mm para fora e 2 mm abaixo */
  /* a volta começa no meio da boca de trás, onde a reta continua, para a emenda do tubo ficar sem quina */
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
  /* uma estação em cada ponto da polilinha fechada */
  const pontos = [...fora, fora[0]]; const estacoes = [{ fracao: 0 }]; let s = 0;
  for (let k = 1; k < pontos.length - 1; k += 1) { s += norma(sub(pontos[k], pontos[k - 1])); estacoes.push({ entre: 1 }, { em: s }); }
  estacoes.push({ entre: 1 }, { fracao: 1 });
  const borda = tubo('borda', { trilho: { pontos }, marcos: [] }, BO.raio, { lados: BO.lados, quadro: { u: [0, 1, 0] }, estacoes });
  parte('borda', borda, T.cores.chapa);
  return { casca, borda };
}

/** A roda (pneu e aro) e o eixo, por revolução em torno de x no centro da roda. */
export function montarRoda(estado, T = TABELA) {
  const { lathe, parte } = ferramentas(estado);
  const R = T.roda; const E = T.eixo; const em = [0, R.raio, R.z]; const w = R.meiaBanda; const rt = R.raioDoTalao;
  /* o pneu: a seção fechada, do talão à banda, redonda nos ombros */
  const pneu = lathe([[rt, -30], [rt + 10, -40], [135, -w], [165, -42], [182, -34], [R.raio, -18], [R.raio, 18], [182, 34], [165, 42],
    [135, w], [rt + 10, 40], [rt, 30], [rt, -30]], em, R.lados);
  parte('pneu', pneu, T.cores.pneu);
  /* o aro: o cubo com o furo do rolamento, o disco e a calha com as abas que seguram o talão */
  const aro = lathe([[E.furoDoCubo, -E.meioCubo], [32, -E.meioCubo], [32, -6], [92, -6], [92, -32], [108, -36], [108, -30], [rt - 3.5, -27],
    [rt - 3.5, 27], [108, 30], [108, 36], [92, 32], [92, 6], [32, 6], [32, E.meioCubo], [E.furoDoCubo, E.meioCubo], [E.furoDoCubo, -E.meioCubo]], em, R.lados);
  parte('aro', aro, T.cores.aro);
  const eixo = lathe([[0, -E.meio], [E.raio, -E.meio], [E.raio, E.meio], [0, E.meio]], em, 24);
  parte('eixo', eixo, T.cores.escuro);
  return { pneu, aro, eixo };
}

const estado = { passos: [], topo: {}, origem: 0 };
montarCacamba(estado);
montarChassi(estado);
montarRoda(estado);

const par = (a, b, relacao, motivo) => ({ par: [a, b], relacao, motivo });
export const CONTATOS = [
  par('borda', 'cacamba', 'atravessa', 'a borda virada é a mesma chapa: o tubo da borda abraça a beira da boca'),
  par('calcos', 'cacamba', 'folga', 'a face de cima dos calços segue a de fora da caçamba 0,3 mm abaixo dela (o assento; a face rente dava travessia)'),
  par('calcos', 'chassi', 'atravessa', 'os calços são soldados no braço: o pé deles nasce no eixo do tubo'),
  par('chassi', 'manoplas', 'atravessa', 'a manopla veste a ponta do tubo do braço'),
  par('chassi', 'eixo', 'atravessa', 'o eixo passa pelos furos das pontas do garfo'),
  par('aro', 'pneu', 'atravessa', 'o talão do pneu assenta entre as abas do aro'),
  par('aro', 'eixo', 'folga', 'o cubo gira no eixo, com 4,5 mm de folga no raio (o rolamento)'),
];

export default {
  plano: 'O carrinho de mão de obra inteiro em rascunho: chassi de tubo dobrado, caçamba de chapa com borda virada, eixo e roda.',
  vista: 'direita',
  opcoes: [{
    titulo: 'carrinho de mão de obra, 60 L',
    nota: 'rascunho do alinhamento, pela TABELA adotada',
    passos: estado.passos,
    topo: estado.topo,
    contatos: CONTATOS,
  }],
};
