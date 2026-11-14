/* roda-esportiva — roda de liga leve de 19 polegadas com pneu 245/40 R19, etapa 1 (aro, raios, tampa central, parafusos, válvula e
 * pneu), nas duas variantes do alvo (`referencias/alvo.md`), escolhidas por `variante` na TABELA ('A' ou 'B').
 *
 * Referencial: o eixo da roda é X, com a face da frente (a que se vê) para +x; y para cima, o chão em y = 0 e o centro da roda a
 * `diametroExterno / 2` de altura. A TABELA é em milímetro; `derivar` calcula, `gerarPassos` converte com `m()` e escreve.
 *
 * Técnica dos raios. A placa dos raios é uma `extrusao` de eixo x (disco com as janelas furadas e os cantos das janelas
 * arredondados por `deslocar`), cortada por `intersectar` com um prato de revolução que dá a concavidade: a frente do prato
 * recua no centro e sobe até o aro. Raios, centro e aro são depois uma superfície só: `unir` mais `arredondarCostura` no encontro
 * côncavo, e `arredondarCostura` das arestas convexas das janelas.
 *
 * Espaço da etapa 2 (freio, não modelada aqui): atrás dos raios, por dentro do barril, fica livre o cilindro de raio
 * `raioLivreDaPinca` (205 mm: o disco de `diametroDoDisco` 360 mm mais a pinça) desde o fundo do barril até a face de trás do prato
 * (x = `desvioET` no centro, subindo até `recuoDoPratoTras` no aro). A face de montagem do disco é o plano x = `desvioET`, a face de trás
 * do centro dos raios. `espacoDoFreio()` publica essas medidas derivadas da mesma tabela, e a receita do freio deve lê-las de lá.
 */

export const TABELA = {
  variante: 'A',
  /* escala do pneu 245/40 R19 */
  diametroAssento: 482.6, larguraDoPneu: 245, alturaDoFlanco: 98, larguraDoAro: 216,
  /* aro (barril) */
  alturaDoFlange: 9, espessuraDoFlange: 9, raioDaBorda: 3.5,
  /* borda vista de frente (medida em variante-a.jpg: face 12 mm = 0,024 do diâmetro externo da borda; parede inclinada de uns 30 graus) */
  larguraDaFaceDaBorda: 12, raioDaQuinaDaBorda: 2, raioDaDobra: 2, raioDoBarrilNaFrente: 222, avancoAxialDaParede: 31, espessuraDaParede: 7,
  profundidadeDaCanaleta: 14, canaletaTras: -76, canaletaFrente: 14, rampaDaCanaleta: 14,
  /* prato dos raios: concavidade */
  desvioET: 40, espessuraDoCubo: 14, raioDoCubo: 74, avancoDoPratoNoAro: 106, recuoDoPratoTras: 50, expoenteDoPrato: 1.8,
  /* raios: janelas */
  raioDaRaizDasJanelas: 84, raioDoCentroDoRaioNaRaiz: 88, raioDoCentroDoRaioNoAro: 232, folgaDaJanelaNaParede: 2,
  larguraNaRaizA: 24, larguraNoAroA: 31, aberturaNaRaizA: 7, aberturaNoAroA: 8.5, arredondaJanelaA: 8,
  larguraNaRaizB: 38, larguraNoAroB: 50, aberturaNaRaizB: 7, aberturaNoAroB: 11, arredondaJanelaB: 8,
  paineisDaCostura: 13, raioDaQuinaDosRaios: 0, raioMinimoDaQuina: 3.72, raioDaCosturaDoAro: 8, raioMinimoDaCostura: 1.5, afinarPontasDaCostura: 10,
  /* centro: furo, assento da tampa, parafusos */
  raioDoFuroCentral: 33.3, raioDoAssentoDaTampa: 38, fundoDoAssentoDaTampa: 6, salienciaDaTampa: 2,
  furos: 5, circuloDosParafusos: 112, raioDoAssentoDoParafuso: 11.5, fundoDoAssentoDoParafuso: 7, salienciaDoParafuso: 4,
  /* espaço reservado ao freio (etapa 2) */
  diametroDoDisco: 360, espessuraDoDisco: 32, raioLivreDaPinca: 205,
  /* válvula */
  raioDoFuroDaValvula: 4.5, profundidadeDoFuroDaValvula: 8, comprimentoDaValvula: 16,
  /* pneu */
  sulcosCirculares: 4, larguraDoSulcoCircular: 10, profundidadeDoSulcoCircular: 7, metadeDaBanda: 88, expoenteDoOmbro: 2.4, alturaDoBojo: 0.38,
  garras: 60, larguraDaGarra: 6, comprimentoDaGarra: 34, alturaDaFerramentaDaGarra: 14, fundoDaGarra: 5, anguloDaGarra: 35, posicaoDaGarraNoOmbro: 45,
  /* resolução */
  lados: 96, ladosDoPrato: 96,
};

const POR = (t, nome) => t[`${nome}${t.variante}`];

/* Declarados antes de medir. Aro e raios são uma superfície só (o par se toca por construção, e a medida por caixa não o decide: cada
   parte sozinha é casca aberta); os demais são assentos de face. */
/* Os assentos do alvo (pneu no aro, raios fundidos ao aro, tampa e parafusos no centro, bico no furo da borda) NÃO são declarados aqui: o aro e
   os raios são uma superfície fechada só, fatiada em duas partes pelo nome, e cada fatia sozinha é casca aberta; a medida de contato recusa o par
   com parte de casca aberta e a guarda reprova a declaração. Os assentos foram medidos à parte, sobre a roda fundida (ver a nota de passagem). */
export const CONTATOS = [];

export const MATERIAIS = {
  grafite: { cor: '#3b3d41', metalicidade: 0.6, aspereza: 0.45 },
  usinado: { cor: '#c4c8cd', metalicidade: 0.9, aspereza: 0.25 },
  borracha: { cor: '#171718', metalicidade: 0, aspereza: 0.9 },
  metal: { cor: '#a9adb3', metalicidade: 0.9, aspereza: 0.3 },
};

export const PLANO = {
  objeto: "roda esportiva de carro com pneu 245/40 R19, etapa 1 (aro, raios, tampa, parafusos, valvula, pneu)",
  referencias: ['referencias/alvo.md'],
  escala: { medida: "diametro externo do pneu", milimetros: 679 },
  partes: [
    { nome: "aro", forma: 'barril de liga leve com a borda externa fina e arredondada, assento do pneu, canaleta funda por dentro e barril visivel atras dos raios', tecnica: 'lathe de seção fechada com concordância nas bordas e furo da válvula por subtrair; unido aos raios por unir e arredondarCostura (raio 8, raioMinimo, afinarPontas)' },
    { nome: "raios", forma: 'variante A dez raios finos em cinco pares em V, variante B cinco raios duplos; concavos, com o centro recuado, fundidos ao aro e ao centro', tecnica: 'extrusao de eixo x com janelas de canto redondo (deslocar), intersectar com prato de lathe que dá a concavidade, subtrair do furo e dos assentos, unir ao aro e arredondarCostura; na variante B a face da frente é usinada' },
    { nome: "tampaCentral", forma: 'disco grafite com a borda arredondada, assentado no furo central', tecnica: 'lathe com concordancia na borda' },
    { nome: "parafusos", forma: 'cinco parafusos de cabeça sextavada cônica nos assentos rebaixados do centro, no círculo de 112 mm', tecnica: 'lathe de seis lados repetido por arranja radial' },
    { nome: "valvula", forma: 'bico de valvula curto na borda do aro, entre dois raios', tecnica: 'lathe de eixo x assentado em furo da borda' },
    { nome: "pneu", forma: 'perfil baixo de flanco abaulado, banda com quatro sulcos ao longo da volta e garras diagonais nos dois ombros', tecnica: 'lathe da seção do pneu com os quatro sulcos no próprio perfil; garras diagonais por subtrair de uma ferramenta (cubo girado em y e em z) repetida por arranja radial, 60 por ombro' },
  ],
  criteriosDeReprovacao: [
    'degrau, fresta ou quina viva na emenda dos raios com o aro ou com o centro',
    'pneu sem sulcos ou sem garras nos ombros, ou banda lisa',
    'raios planos, sem a concavidade do centro recuado',
    'pneu atravessando o aro, ou folga visivel entre pneu e assento',
    'variante A sem os pares em V, ou variante B sem a face usinada de outra cor',
    'barril do aro sem espaco livre para o disco de 360 mm e a pinca',
  ],
};

const m = (mm) => mm / 1000;
const rad = (g) => (g * Math.PI) / 180;
const pol = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
const alfaDe = (p) => Math.atan2(p[1], p[0]);
const desembrulha = (a, ref) => { let x = a; while (x - ref > Math.PI) x -= 2 * Math.PI; while (x - ref < -Math.PI) x += 2 * Math.PI; return x; };

function noRaio(P0, P1, r) {
  const dx = P1[0] - P0[0], dy = P1[1] - P0[1];
  const A = dx * dx + dy * dy, B = 2 * (P0[0] * dx + P0[1] * dy), C = P0[0] ** 2 + P0[1] ** 2 - r * r;
  const disc = Math.sqrt(B * B - 4 * A * C);
  const s = [(-B + disc) / (2 * A), (-B - disc) / (2 * A)].find((q) => q >= -0.5 && q <= 1.5);
  return [P0[0] + s * dx, P0[1] + s * dy];
}
const arco = (r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => pol(r, a0 + ((a1 - a0) * i) / n));
function cruza(p, d, q, e) { const den = d[0] * e[1] - d[1] * e[0]; const s = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den; return [p[0] + s * d[0], p[1] + s * d[1]]; }

/* As janelas da placa (mm, [y, z] no plano da roda, ângulo de +y para +z): a janela grande entre dois pares e a fresta de cada par.
   Os contornos já vão recuados da folga de arredondamento, porque `deslocar` os cresce com canto redondo. */
function janelas(t, d) {
  const dil = POR(t, 'arredondaJanela');
  const grandes = [], estreitas = [];
  const raio = (k, lado) => {
    const ak = rad(72 * k);
    const a0 = ak + lado * rad(POR(t, 'aberturaNaRaiz')), a1 = ak + lado * rad(POR(t, 'aberturaNoAro'));
    const C0 = pol(t.raioDoCentroDoRaioNaRaiz, a0), C1 = pol(t.raioDoCentroDoRaioNoAro, a1);
    const L = Math.hypot(C1[0] - C0[0], C1[1] - C0[1]);
    let n = [-(C1[1] - C0[1]) / L, (C1[0] - C0[0]) / L];
    if ((n[0] * -Math.sin(a0) + n[1] * Math.cos(a0)) * lado < 0) n = [-n[0], -n[1]];
    const w0 = POR(t, 'larguraNaRaiz') / 2 + dil, w1 = POR(t, 'larguraNoAro') / 2 + dil;
    const off = (C, w) => [C[0] + n[0] * w, C[1] + n[1] * w];
    return { fora: [off(C0, w0), off(C1, w1)], dentro: [off(C0, -w0), off(C1, -w1)] };
  };
  const rHub = t.raioDaRaizDasJanelas + dil, rRim = d.Rwin;
  for (let k = 0; k < 5; k++) {
    const a = raio(k, +1), b = raio(k, -1), an = raio((k + 1) % 5, -1);
    const Ha = noRaio(...a.fora, rHub), Ra = noRaio(...a.fora, rRim), Hb = noRaio(...an.fora, rHub), Rb = noRaio(...an.fora, rRim);
    const aA = alfaDe(Ra), hA = alfaDe(Ha);
    grandes.push([Ha, Ra, ...arco(rRim, aA, desembrulha(alfaDe(Rb), aA), 8).slice(1, -1), Rb, Hb, ...arco(rHub, desembrulha(alfaDe(Hb), hA), hA, 6).slice(1, -1)]);
    const ia = a.dentro, ib = b.dentro;
    const apex = cruza(ia[0], [ia[1][0] - ia[0][0], ia[1][1] - ia[0][1]], ib[0], [ib[1][0] - ib[0][0], ib[1][1] - ib[0][1]]);
    const Ria = noRaio(...ia, rRim), Rib = noRaio(...ib, rRim), sA = alfaDe(Ria);
    estreitas.push([apex, Ria, ...arco(rRim, sA, desembrulha(alfaDe(Rib), sA), 6).slice(1, -1), Rib]);
  }
  return { grandes, estreitas };
}

/* O pneu: a seção [raio, x] de trás para a frente. O fundo repousa no assento e na face de dentro e no topo dos flanges do aro. */
function secaoDoPneu(t, d) {
  const Rt = d.Rs + t.alturaDoFlanco, xb = t.larguraDoPneu / 2, hw = d.hw, B = t.metadeDaBanda;
  const rb = d.Rs + t.alturaDoBojo * t.alturaDoFlanco;
  const lado = (s) => {
    const pts = [];
    const nBaixo = 8;
    for (let i = 1; i <= nBaixo; i++) { const u = i / nBaixo; pts.push([d.Rfl + (rb - d.Rfl) * u, s * (hw + (xb - hw) * Math.sin((Math.PI / 2) * u))]); }
    const n = 14, e = 2 / t.expoenteDoOmbro;
    for (let i = 1; i <= n; i++) { const th = ((Math.PI / 2) * i) / n; pts.push([rb + (Rt - rb) * Math.sin(th) ** e, s * (B + (xb - B) * Math.cos(th) ** e)]); }
    return pts;
  };
  const baixoTras = [[d.Rs, -(hw - t.espessuraDoFlange)], [d.Rfl, -(hw - t.espessuraDoFlange)], [d.Rfl, -hw]];
  const baixoFrente = [[d.Rfl, hw], [d.Rfl, hw - t.espessuraDoFlange], [d.Rs, hw - t.espessuraDoFlange]];
  const banda = [];
  const passo = (2 * B) / t.sulcosCirculares;
  const L = t.larguraDoSulcoCircular, P = t.profundidadeDoSulcoCircular;
  for (let k = 0; k < t.sulcosCirculares; k++) {
    const c = -B + passo * (k + 0.5);
    banda.push([Rt, c - L / 2 - 1.2], [Rt - P, c - L / 2 + 0.6], [Rt - P, c + L / 2 - 0.6], [Rt, c + L / 2 + 1.2]);
  }
  const trasCima = lado(-1);
  const frenteCima = lado(+1).reverse();
  const perfil = [...baixoTras, ...trasCima, ...banda, ...frenteCima, ...baixoFrente, baixoTras[0]];
  return { perfil, Rt, rb, xb };
}

/* Os pontos declarados (mm): as caixas do pneu, do aro e da tampa, que saem da mesma tabela que a malha. */
export function pontosDeclarados(t = TABELA) {
  const Rs = t.diametroAssento / 2, Rt = Rs + t.alturaDoFlanco, Rfl = Rs + t.alturaDoFlange, hw = t.larguraDoAro / 2;
  const xf = t.desvioET + t.espessuraDoCubo, xt = xf - t.fundoDoAssentoDaTampa, rT = t.raioDoAssentoDaTampa;
  return [
    { nome: 'pneu: canto de trás embaixo, tocando o chão', parte: 'pneu', medida: 'minimo', em: [-t.larguraDoPneu / 2, 0, -Rt], toleranciaMm: 0.5 },
    { nome: 'pneu: canto da frente em cima', parte: 'pneu', medida: 'maximo', em: [t.larguraDoPneu / 2, 2 * Rt, Rt], toleranciaMm: 0.5 },
    { nome: 'aro: canto de trás embaixo', parte: 'aro', medida: 'minimo', em: [-hw, Rt - Rfl, -Rfl], toleranciaMm: 0.5 },
    { nome: 'aro: canto da frente em cima', parte: 'aro', medida: 'maximo', em: [hw, Rt + Rfl, Rfl], toleranciaMm: 0.5 },
    { nome: 'tampa central: canto de trás embaixo', parte: 'tampaCentral', medida: 'minimo', em: [xt, Rt - rT, -rT], toleranciaMm: 0.5 },
    { nome: 'tampa central: canto da frente em cima', parte: 'tampaCentral', medida: 'maximo', em: [xf + t.salienciaDaTampa, Rt + rT, rT], toleranciaMm: 0.5 },
  ];
}

/* O espaço que a etapa do freio recebe (mm): o plano de montagem do disco, o raio mínimo do barril por dentro e as folgas do disco e da pinça. */
export function espacoDoFreio(t = TABELA) {
  const Rin = t.diametroAssento / 2 - t.espessuraDaParede;
  const raioDoBarril = Rin - t.profundidadeDaCanaleta;
  return {
    planoDeMontagemDoDiscoX: t.desvioET, furoCentralRaio: t.raioDoFuroCentral, circuloDosParafusos: t.circuloDosParafusos,
    raioDoBarrilPorDentro: raioDoBarril, folgaDoDisco: raioDoBarril - t.diametroDoDisco / 2, folgaDaPinca: raioDoBarril - t.raioLivreDaPinca,
    faceDeTrasDosRaiosNoAro: t.recuoDoPratoTras, fundoDoBarrilX: -t.larguraDoAro / 2,
  };
}

export function derivar(t = TABELA) {
  const Rs = t.diametroAssento / 2, Rfl = Rs + t.alturaDoFlange, Rin = Rs - t.espessuraDaParede, hw = t.larguraDoAro / 2;
  const rFace = Rfl - t.larguraDaFaceDaBorda, ro = rFace, Rwin = rFace - 0.5, dC = t.profundidadeDaCanaleta;
  const aro = [
    [Rin, -hw], [Rfl, -hw, t.raioDaBorda], [Rfl, -hw + t.espessuraDoFlange, 1.5], [Rs, -hw + t.espessuraDoFlange],
    [Rs, t.canaletaTras - t.rampaDaCanaleta], [Rs - dC, t.canaletaTras], [Rs - dC, t.canaletaFrente], [Rs, t.canaletaFrente + t.rampaDaCanaleta],
    [Rs, hw - t.espessuraDoFlange], [Rfl, hw - t.espessuraDoFlange, 1.5], [Rfl, hw, t.raioDaQuinaDaBorda], [rFace, hw, t.raioDaDobra], [t.raioDoBarrilNaFrente, hw - t.avancoAxialDaParede],
    [t.raioDoBarrilNaFrente, t.canaletaFrente + t.rampaDaCanaleta + 2], [Rin - dC, t.canaletaFrente + 2], [Rin - dC, t.canaletaTras - 2],
    [Rin, t.canaletaTras - t.rampaDaCanaleta - 2], [Rin, -hw],
  ];
  const xb0 = t.desvioET, xf0 = t.desvioET + t.espessuraDoCubo, N = 16;
  const costas = [], frente = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, r = t.raioDoCubo + s * (ro - t.raioDoCubo);
    costas.push([r, xb0 + (t.recuoDoPratoTras - xb0) * s]);
    frente.push([r, xf0 + (t.avancoDoPratoNoAro - xf0) * s ** t.expoenteDoPrato]);
  }
  const prato = [[0, xb0], ...costas, ...frente.reverse(), [0, xf0]];
  const d = { Rs, Rfl, Rin, rFace, hw, ro, Rwin, aro, prato, xf0, xb0, Rt: Rs + t.alturaDoFlanco };
  Object.assign(d, janelas(t, d), { pneu: secaoDoPneu(t, d) });
  /* a garra: o ponto da seção do ombro no ângulo pedido, onde a ferramenta se assenta, e a normal dele em (x, r) */
  const th = rad(t.posicaoDaGarraNoOmbro), e = 2 / t.expoenteDoOmbro, B = t.metadeDaBanda, xb = t.larguraDoPneu / 2, rb = Rs + t.alturaDoBojo * t.alturaDoFlanco;
  d.pontoDaGarra = [B + (xb - B) * Math.cos(th) ** e, rb + (d.Rt - rb) * Math.sin(th) ** e];
  const dr = (d.Rt - rb) * e * Math.sin(th) ** (e - 1) * Math.cos(th), dx = -(xb - B) * e * Math.cos(th) ** (e - 1) * Math.sin(th);
  const L = Math.hypot(dr, dx);
  d.normalDaGarra = [dr / L, dx / -L]; // [componente x, componente r], para fora (frente, cima)
  d.inclinacaoDaGarra = (Math.atan2(dr, dx) * 180) / Math.PI;
  return d;
}

export function gerarPassos(t = TABELA) {
  const d = derivar(t);
  const Rc = m(d.Rt);
  const em = [0, Rc, 0];
  const mp = (lista) => lista.map(([r, x, c]) => (c ? [m(r), m(x), m(c)] : [m(r), m(x)]));
  const o = (op, id, de) => ({ origem: de ? { op, id, de } : { op, id } });
  const disco = (id, raio, x0, x1, lados_, pos) => ['lathe', { origemId: id, lados: lados_, eixo: 'x', em: pos, perfil: [[0, m(x0)], [m(raio), m(x0)], [m(raio), m(x1)], [0, m(x1)]] }];
  const lados = t.lados;
  const hw = d.hw;
  const passos = [];

  /* a válvula sai da parede inclinada, embaixo, com o eixo perpendicular a ela (para dentro do vão e para a frente) */
  const rV = (d.rFace + t.raioDoBarrilNaFrente) / 2, xV = hw - t.avancoAxialDaParede / 2;
  const angV = (Math.atan2(t.avancoAxialDaParede, d.rFace - t.raioDoBarrilNaFrente) * 180) / Math.PI;
  const emV = [m(xV), Rc - m(rV), 0];
  passos.push(['lathe', { origemId: 10, lados, eixo: 'x', em, segmentosCurva: 3, perfil: mp(d.aro) }]);
  passos.push(['lathe', { origemId: 11, lados: 24, eixo: 'x', em: emV, perfil: mp([[0, -9], [t.raioDoFuroDaValvula, -9], [t.raioDoFuroDaValvula, 3], [0, 3]]) }]);
  passos.push(['rotaciona', { eixo: 'z', graus: angV, pivo: emV, sel: o('lathe', 11) }]);
  passos.push(['subtrair', { origemId: 12, solidos: [o('lathe', 10), o('lathe', 11)] }]);

  passos.push(['extrusao', {
    origemId: 20, eixo: 'x', em: [m(22), Rc, 0], altura: m(98), segmentosArco: 8,
    perfil: { circulo: { raio: m(d.ro + POR(t, 'arredondaJanela')) } },
    furos: [...d.grandes, ...d.estreitas].map((f) => f.map(([y, z]) => [m(y), m(z)])),
    deslocar: { para: 'dentro', distancia: m(POR(t, 'arredondaJanela')), canto: 'redondo' },
  }]);
  passos.push(['lathe', { origemId: 30, lados: t.ladosDoPrato, eixo: 'x', em, perfil: mp(d.prato) }]);
  passos.push(['intersectar', { origemId: 40, solidos: [o('extrusao', 20), o('lathe', 30)] }]);
  if (t.raioDaQuinaDosRaios > 0) passos.push(['arredondarCostura', { origemId: 41, de: { op: 'intersectar', id: 40 }, raio: m(t.raioDaQuinaDosRaios), arestas: 'convexas', raioMinimo: m(t.raioMinimoDaQuina), afinarPontas: m(6) }]);

  passos.push(disco(50, t.raioDoFuroCentral, 30, 60, 48, em));
  passos.push(disco(51, t.raioDoAssentoDaTampa, d.xf0 - t.fundoDoAssentoDaTampa, d.xf0 + 10, 48, em));
  passos.push(disco(52, t.raioDoAssentoDoParafuso, d.xf0 - t.fundoDoAssentoDoParafuso, d.xf0 + 10, 24, [0, Rc + m(t.circuloDosParafusos / 2), 0]));
  passos.push(['arranja', { modo: 'radial', total: t.furos, eixo: 'x', graus: 360 / t.furos, pivo: em, origemId: 53, derivaDe: { op: 'lathe', id: 52 }, sel: o('lathe', 52) }]);
  passos.push(['subtrair', { origemId: 60, solidos: [t.raioDaQuinaDosRaios > 0 ? o('arredondarCostura', 41) : o('intersectar', 40), o('lathe', 50), o('lathe', 51), o('lathe', 52), o('arranja', 53, { op: 'lathe', id: 52 })] }]);

  passos.push(['limparLascas', { sel: o('subtrair', 60), tolerancia: m(0.01) }]);
  passos.push(['unir', { origemId: 70, solidos: [o('subtrair', 12), o('subtrair', 60)] }]);
  passos.push(['arredondarCostura', { origemId: 71, de: { op: 'unir', id: 70 }, raio: m(t.raioDaCosturaDoAro), paineis: t.paineisDaCostura, raioMinimo: m(t.raioMinimoDaCostura), afinarPontas: m(t.afinarPontasDaCostura), limpar: true }]);

  const xTampa = d.xf0 - t.fundoDoAssentoDaTampa;
  passos.push(['lathe', { origemId: 80, lados: 48, eixo: 'x', em, segmentosCurva: 4, perfil: mp([[0, xTampa], [t.raioDoAssentoDaTampa, xTampa], [t.raioDoAssentoDaTampa, d.xf0 + t.salienciaDaTampa, 2.5], [0, d.xf0 + t.salienciaDaTampa]]) }]);

  const xP = d.xf0 - t.fundoDoAssentoDoParafuso, rH = 11;
  passos.push(['lathe', { origemId: 90, lados: 6, eixo: 'x', em: [0, Rc + m(t.circuloDosParafusos / 2), 0], perfil: mp([[0, xP], [rH, xP], [rH, d.xf0], [rH - 2.8, d.xf0 + t.salienciaDoParafuso], [0, d.xf0 + t.salienciaDoParafuso]]) }]);
  passos.push(['arranja', { modo: 'radial', total: t.furos, eixo: 'x', graus: 360 / t.furos, pivo: em, origemId: 91, derivaDe: { op: 'lathe', id: 90 }, sel: o('lathe', 90) }]);

  passos.push(['lathe', { origemId: 95, lados: 24, eixo: 'x', em: emV, perfil: mp([[0, -9], [t.raioDoFuroDaValvula, -9], [t.raioDoFuroDaValvula, 5], [3.2, 5], [3.2, t.comprimentoDaValvula - 2], [2.4, t.comprimentoDaValvula], [0, t.comprimentoDaValvula]]) }]);
  passos.push(['rotaciona', { eixo: 'z', graus: angV, pivo: emV, sel: o('lathe', 95) }]);

  passos.push(['lathe', { origemId: 100, lados, eixo: 'x', em, perfil: mp(d.pneu.perfil) }]);
  const fer = [];
  const [xs, rs] = d.pontoDaGarra, [nx, nr] = d.normalDaGarra;
  const H = t.alturaDaFerramentaDaGarra;
  for (const [lado, id] of [[+1, 110], [-1, 120]]) {
    const cx = lado * (xs + nx * (H / 2 - t.fundoDaGarra)), cr = rs + nr * (H / 2 - t.fundoDaGarra);
    passos.push(['cubo', { origemId: id, larg: m(t.comprimentoDaGarra), alt: m(H), prof: m(t.larguraDaGarra), em: [0, -m(H / 2), 0] }]);
    passos.push(['rotaciona', { eixo: 'y', graus: -lado * t.anguloDaGarra, pivo: [0, 0, 0], sel: o('cubo', id) }]);
    passos.push(['rotaciona', { eixo: 'z', graus: lado * d.inclinacaoDaGarra, pivo: [0, 0, 0], sel: o('cubo', id) }]);
    passos.push(['transladar', { d: [m(cx), Rc + m(cr), 0], sel: o('cubo', id) }]);
    passos.push(['arranja', { modo: 'radial', total: t.garras, eixo: 'x', graus: 360 / t.garras, pivo: em, origemId: id + 1, derivaDe: { op: 'cubo', id }, sel: o('cubo', id) }]);
    fer.push(o('cubo', id), o('arranja', id + 1, { op: 'cubo', id }));
  }
  passos.push(['subtrair', { origemId: 130, solidos: [o('lathe', 100), ...fer] }]);

  passos.push(['limparLascas', { sel: o('subtrair', 130), tolerancia: m(0.01) }]);
  passos.push(['limparLascas', { sel: o('arredondarCostura', 71), tolerancia: m(0.01) }]);
  passos.push(['parte', { nome: 'raios', sel: o('unir', 70) }]);
  passos.push(['parte', { nome: 'raios', sel: o('arredondarCostura', 71), substituir: true }]);
  passos.push(['parte', { nome: 'aro', sel: o('subtrair', 12), substituir: true }]);
  passos.push(['parte', { nome: 'tampaCentral', sel: o('lathe', 80) }]);
  passos.push(['parte', { nome: 'parafusos', sel: o('lathe', 90) }]);
  passos.push(['parte', { nome: 'parafusos', sel: o('arranja', 91, { op: 'lathe', id: 90 }), substituir: true }]);
  passos.push(['parte', { nome: 'valvula', sel: o('lathe', 95) }]);
  passos.push(['parte', { nome: 'pneu', sel: o('subtrair', 130) }]);
  /* materiais: grafite no aro e nos raios, borracha no pneu, metal nos parafusos e na válvula; na variante B a face da frente dos raios é usinada */
  passos.push(['material', { usa: 'grafite', sel: { grupo: 'aro' } }]);
  /* o lábio da borda externa do aro (face da frente do flange) em usinado claro, para separar aro, raios e pneu */
  passos.push(['material', { usa: 'usinado', sel: { grupo: 'aro', onde: { normal: { dir: [1, 0, 0], ate: 20 } } } }]);
  passos.push(['material', { usa: 'grafite', sel: { grupo: 'raios' } }]);
  if (t.variante === 'B') passos.push(['material', { usa: 'usinado', sel: { grupo: 'raios', onde: { normal: { dir: [1, 0, 0], ate: 38 } } } }]);
  passos.push(['material', { usa: 'grafite', sel: { grupo: 'tampaCentral' } }]);
  passos.push(['material', { usa: 'metal', sel: { grupo: 'parafusos' } }]);
  passos.push(['material', { usa: 'metal', sel: { grupo: 'valvula' } }]);
  passos.push(['material', { usa: 'borracha', sel: { grupo: 'pneu' } }]);
  for (const nome of ['aro', 'raios', 'tampaCentral', 'parafusos', 'valvula', 'pneu']) passos.push(['liso', { angulo: nome === 'pneu' ? 50 : nome === 'raios' ? 60 : 40, sel: { grupo: nome } }]);
  return passos;
}

const receita = {
  meta: { nome: 'roda-esportiva', desc: 'roda esportiva de liga leve de 19 polegadas com pneu 245/40 R19' },
  PARAMS: TABELA, MATERIAIS, PLANO, contatos: CONTATOS,
  TOPO: { origem: 'centro do eixo da roda no plano x = 0, a metade do diâmetro do pneu acima do chão; y para cima, o chão em y = 0, o eixo da roda é x e +x é a face da frente (a que se vê)' },
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};
export default receita;
