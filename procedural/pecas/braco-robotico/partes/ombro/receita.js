/* braco-robotico/ombro — o corpo é UMA malha contínua, por subdivisão de uma gaiola.
 *
 * Decisão da pessoa em 2026-11-05: o corpo deixa de ser dois lofts unidos com o encontro arredondado depois, porque a
 * emenda da união deixava uma faixa de sombra inclinada e uma lasca junto ao anel. A forma de fora é a de antes: 190 mm
 * de largura, 220 de comprimento na direção da junta (+Z), eixo da saída a 115 mm da boca de baixo, topo a 210, parte de
 * pé com quinas de 75 mm em planta e frente recuada 30 mm da parte deitada (o degrau do L), cantos de 32 mm na seção da
 * parte deitada e saída redonda do diâmetro da largura na face da frente.
 *
 * A gaiola é uma só, em anéis: cada anel é o contorno da peça cortada por um plano x = constante, um laço em L com o mesmo
 * número de pontos em todos os planos. O laço sobe pela parede de trás, corre pelo topo até a saída, desce pela face da
 * saída, volta pela face de baixo da parte deitada, sobe a curva do encontro, desce pela frente do pé e volta pelo fundo.
 * Assim cada linha da malha corre do pé à parte deitada sem corte, e o que muda de um plano a outro é só a posição dos
 * pontos: as quinas de 75 mm em planta, os cantos de 32 mm da seção, a seção que vira redonda na saída e o degrau do L.
 * A curva côncava do encontro de baixo é um quarto de elipse de `avancoDoEncontro` por `alturaDoEncontro` posto nos
 * próprios pontos do laço, e não uma operação depois. As duas paredes de lado, em x = ±meiaLargura, fecham o sólido com uma
 * escada de faces entre a cadeia de fora e a de dentro do L. Vinco vivo na borda de baixo e na borda da saída; o resto é
 * liso.
 *
 * O anel é uma faixa fina escura, por revolução, que encosta na face da saída sem entrar nela.
 *
 * Portas:
 *   apoio        — anel, eixo +Y, centro no meio da boca de baixo, borda de
 *                  baixo do pé. Senta no `topo` do anel da cintura.
 *   juntaDoOmbro — cilindro, eixo +Z, centro no meio da face da frente do
 *                  anel, raio do anel.
 */

export const TABELA = {
  /* Vem do anel da cintura pela montagem. */
  raioDoPescoco: 105,
  /* Altura do eixo da saída acima da boca de baixo (opção B). */
  alturaDoEixo: 115,
  /* Meia largura da seção de cima: 190 mm de largura. O topo fica em
     alturaDoEixo + meiaLargura = 210 mm. */
  meiaLargura: 95,
  /* Raio dos cantos da seção quase quadrada da parte deitada. */
  raioDosCantos: 32,
  /* Quanto a frente da parte de pé fica recuada em relação à frente da parte
     deitada: o degrau do L. */
  recuoDaFrente: 30,
  /* Quanto o L inteiro se estende para a frente além do quadrado de 190 mm
     (decisão da pessoa em 2026-11-05: o ombro mais longo na direção da
     junta, com a traseira no lugar). */
  alongamento: 30,
  /* Trecho do braço, antes da saída, em que a seção passa de quase quadrada a
     redonda. */
  transicaoDaSaida: 45,
  /* Anel da junta: faixa fina, mesmo raio da saída. */
  espessuraDoAnel: 28,
  /* Curva do encontro de baixo, nos pontos da gaiola: um quarto de elipse
     côncavo que sai da frente do pé, vertical, e chega à face de baixo da
     parte deitada, horizontal. `avancoDoEncontro` é quanto ela avança para a
     frente e `alturaDoEncontro`, quanto sobe. */
  avancoDoEncontro: 12,
  alturaDoEncontro: 12,
  /* Raio das duas quinas de trás, em planta. */
  raioDaTraseira: 75,
  /* Raio do canto de cima na parede de trás, onde o topo é plano até a parede. */
  raioDaQuinaDeTras: 10,
  /* Raio das duas quinas da frente da parte de pé, em planta (decisão da
     pessoa em 2026-11-05: ficam dentro do anel da cintura, como as de trás). */
  raioDaFrenteDoPe: 75,
  /* Gaiola: planos de corte por quarto de quina do pé e por quarto de canto
     da seção, e níveis da subdivisão. */
  estacoesDaQuina: 6,
  estacoesDoCanto: 4,
  niveis: 2,
  /* Lados da revolução do anel. */
  lados: 48,
};

export const MATERIAIS = { anelEscuro: { cor: '#4a4d52', aspereza: 0.45 } };

const m = (mm) => mm / 1000;
const ID = { corpo: 400, anel: 200 };

export function derivar(t = TABELA) {
  const R = m(t.raioDoPescoco);
  const yEixo = m(t.alturaDoEixo);
  const h = m(t.meiaLargura);
  /* A frente da parte deitada e a saída ficam em z = h + alongamento. */
  const zFace = h + m(t.alongamento);
  const zTransicao = zFace - m(t.transicaoDaSaida);
  /* A saída redonda tem o diâmetro da largura do bloco (raio = meia largura). */
  const Rs = h;
  const Ra = Rs;
  const e = m(t.espessuraDoAnel);
  return { R, yEixo, h, zFace, zTransicao, Rs, Ra, e, ...gaiola(t) };
}

/* A gaiola, em milímetro até o fim, e em metro nos pontos que saem.
 *
 * Cada anel é o contorno da peça cortada por um plano x = constante: um laço em L de `n` pontos, que sobe pela parede de
 * trás, corre pelo topo até a saída, desce pela face da saída, volta pela face de baixo da parte deitada, sobe a curva do
 * encontro, desce pela frente do pé e volta pelo fundo. O laço tem o mesmo número de pontos em todos os planos, então cada
 * linha da malha corre do pé à saída sem corte, e o que muda de um plano a outro é a posição dos pontos: as quinas de 75 mm
 * em planta, os cantos da seção, a seção que vira redonda e a curva do encontro saem todos da posição dos pontos. As duas
 * paredes de lado, em x = ±meiaLargura, fecham o sólido com uma escada de faces entre a cadeia de fora e a de dentro do L. */
function gaiola(t) {
  const L = t.meiaLargura;
  const yE = t.alturaDoEixo;
  const zFace = L + t.alongamento;
  const zT = zFace - t.transicaoDaSaida;
  const zf0 = zFace - t.recuoDaFrente;
  const rcA = t.raioDosCantos;
  const rf = t.raioDaFrenteDoPe;
  const rq = t.raioDaTraseira;
  const dz = t.avancoDoEncontro;
  const alt = t.alturaDoEncontro;
  const yInterno = yE - L;
  const y0 = yInterno - alt;

  const S = (z) => (z <= zT ? 0 : z >= zFace ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * (z - zT)) / (zFace - zT)));
  /* meia largura da parte deitada em z: a traseira acompanha o arco das quinas em planta */
  const larg = (z) => (z >= -L + rq ? L : L - rq + Math.sqrt(Math.max(0, rq * rq - (z + L - rq) ** 2)));
  /* raio dos cantos da seção em z: cresce até o círculo na saída; na traseira não passa da largura menos 2 mm */
  const raioDaSecao = (z) => {
    const pre = rcA + (L - rcA) * S(z);
    const w = larg(z);
    /* na traseira o topo fica plano até a parede e o canto só cresce com a largura: quem arredonda ali é a quina em planta */
    if (w >= L - 1e-9) return pre;
    const u = Math.min(1, Math.max(0, (w - (L - rq)) / rq));
    return t.raioDaQuinaDeTras + (pre - t.raioDaQuinaDeTras) * u * u * (3 - 2 * u);
  };
  /* altura do topo da parte deitada em (x, z); a de baixo é a espelhada em torno do eixo */
  const yTopo = (x, z) => {
    const w = larg(z);
    const r = raioDaSecao(z);
    const c = w - r;
    const ax = Math.abs(x);
    return ax <= c ? yE + L : yE + L - r + Math.sqrt(Math.max(0, r * r - (ax - c) ** 2));
  };
  const yFundo = (x, z) => 2 * yE - yTopo(x, z);
  /* quinas em planta: atrás e na frente do pé */
  const zTras = (x) => { const ax = Math.abs(x); const c = L - rq; return ax > c ? -L + rq - Math.sqrt(Math.max(0, rq * rq - (ax - c) ** 2)) : -L; };
  const zFrente = (x) => { const ax = Math.abs(x); const c = L - rf; return ax > c ? zf0 - rf + Math.sqrt(Math.max(0, rf * rf - (ax - c) ** 2)) : zf0; };

  /* planos de corte, de x = -L a x = L: pelos arcos das quinas e dos cantos, e alguns no trecho reto de trás */
  const lista = [];
  for (let k = 0; k <= 3; k++) lista.push(((L - rq) * k) / 3);
  for (let k = 1; k <= t.estacoesDaQuina; k++) lista.push(L - rq + rq * Math.sin((Math.PI / 2) * (k / t.estacoesDaQuina)));
  for (let k = 0; k <= t.estacoesDoCanto; k++) lista.push(L - rcA + rcA * Math.sin((Math.PI / 2) * (k / t.estacoesDoCanto)));
  lista.sort((p, q) => p - q);
  const metade = [];
  for (const x of lista) {
    if (!metade.length || x - metade[metade.length - 1] > 2.5) metade.push(x);
    else if (Math.abs(x - L) < 1e-9) metade[metade.length - 1] = x;
  }
  metade[metade.length - 1] = L;
  const planos = [...metade.slice(1).reverse().map((x) => -x), ...metade];

  const taus = [0, 0.015, 0.05, 0.12, 0.25, 0.45, 0.7];
  const nTrans = 6;
  const nBaixo = 9;
  const nCurva = 6;
  const aneis = planos.map((x) => {
    const zr = zTras(x);
    const yp = yTopo(x, zr);
    const zfx = zFrente(x);
    const zEnc = zfx + dz;
    const yFim = yFundo(x, zEnc);
    const fora = [[zr, 0]];
    for (const f of [0.25, 0.5, 0.75]) fora.push([zr, yp * f]);
    for (const tau of taus) { const z = zr + tau * (zT - zr); fora.push([z, yTopo(x, z)]); }
    fora.push([zT, yTopo(x, zT)]);
    for (let j = 1; j < nTrans; j++) { const z = zT + ((zFace - zT) * j) / nTrans; fora.push([z, yTopo(x, z)]); }
    fora.push([zFace, yTopo(x, zFace)]);
    const dentro = [[zfx, 0], [zfx, y0 / 2]];
    for (let k = 0; k < nCurva; k++) {
      const th = ((Math.PI / 2) * k) / (nCurva - 1);
      dentro.push([zfx + dz * (1 - Math.cos(th)), y0 + (yFim - y0) * Math.sin(th)]);
    }
    for (let j = 1; j <= nBaixo; j++) {
      const f = 1 - (1 - j / (nBaixo + 1)) ** 1.4;
      const z = zEnc + (zFace - zEnc) * f;
      dentro.push([z, yFundo(x, z)]);
    }
    dentro.push([zFace, yFundo(x, zFace)]);
    const fundo = [0.25, 0.5, 0.75].map((f) => [zfx + (zr - zfx) * f, 0]);
    return { x, fora, dentro, fundo };
  });

  const nO = aneis[0].fora.length;
  const nB = aneis[0].fundo.length;
  const pontosMm = {};
  const nomeDe = (r, grupo, j) => `a${r}_${grupo}${j}`;
  const ultimo = aneis.length - 1;
  aneis.forEach((an, r) => {
    an.fora.forEach(([z, y], j) => { pontosMm[nomeDe(r, 'o', j)] = [an.x, y, z]; });
    an.dentro.forEach(([z, y], j) => {
      /* na parede de lado a saída se fecha numa ponta: o ponto de cima e o de baixo são o mesmo */
      if (j === nO - 1 && (r === 0 || r === ultimo)) return;
      pontosMm[nomeDe(r, 'i', j)] = [an.x, y, z];
    });
    an.fundo.forEach(([z, y], j) => { pontosMm[nomeDe(r, 'b', j)] = [an.x, y, z]; });
  });
  const nm = (r, grupo, j) => ((grupo === 'i' && j === nO - 1 && (r === 0 || r === ultimo)) ? nomeDe(r, 'o', j) : nomeDe(r, grupo, j));
  /* o laço em ordem: de fora (de trás à saída), de dentro (da saída ao pé) e o fundo (da frente do pé à traseira) */
  const laco = (r) => [
    ...Array.from({ length: nO }, (_, j) => nm(r, 'o', j)),
    ...Array.from({ length: nO }, (_, j) => nm(r, 'i', nO - 1 - j)),
    ...Array.from({ length: nB }, (_, j) => nm(r, 'b', j)),
  ];
  const limpa = (f) => {
    const g = f.filter((v, k) => v !== f[(k + 1) % f.length]);
    return g.length >= 3 ? g : null;
  };
  const tiras = [];
  for (let r = 0; r < ultimo; r++) {
    const a = laco(r);
    const b = laco(r + 1);
    for (let q = 0; q < a.length; q++) {
      const f = limpa([a[q], a[(q + 1) % a.length], b[(q + 1) % a.length], b[q]]);
      if (f) tiras.push(f);
    }
  }
  const paredes = [];
  const parede = (r) => {
    const fs = [];
    fs.push([nm(r, 'o', 0), nm(r, 'o', 1), nm(r, 'i', 1), nm(r, 'i', 0), ...Array.from({ length: nB }, (_, j) => nm(r, 'b', j))]);
    for (let j = 1; j < nO - 1; j++) fs.push([nm(r, 'o', j), nm(r, 'o', j + 1), nm(r, 'i', j + 1), nm(r, 'i', j)]);
    return fs.map(limpa).filter(Boolean);
  };
  const p0 = parede(0);
  const p1 = parede(ultimo);
  /* orientação: normais para fora; a das tiras confere pelo volume, as das paredes pelo sinal de x */
  const normal = (f) => {
    let nx = 0; let ny = 0; let nz = 0;
    f.forEach((v, k) => {
      const [x1, y1, z1] = pontosMm[v];
      const [x2, y2, z2] = pontosMm[f[(k + 1) % f.length]];
      nx += (y1 - y2) * (z1 + z2); ny += (z1 - z2) * (x1 + x2); nz += (x1 - x2) * (y1 + y2);
    });
    return [nx, ny, nz];
  };
  const orienta = (fs, sx) => fs.map((f) => (normal(f)[0] * sx > 0 ? f : [...f].reverse()));
  /* a tira do topo reto, no plano do meio, deve apontar para +y */
  const tiraDoTopo = tiras.find((f) => f.every((v) => Math.abs(pontosMm[v][1] - (yE + L)) < 1e-9 && Math.abs(pontosMm[v][0]) < 1e-9 + 10));
  const tirasOk = tiraDoTopo && normal(tiraDoTopo)[1] < 0 ? tiras.map((f) => [...f].reverse()) : tiras;
  const faces = [...tirasOk, ...orienta(p0, -1), ...orienta(p1, 1)];

  const pontos = {};
  for (const [k, v] of Object.entries(pontosMm)) pontos[k] = v.map(m);
  const rs = Array.from({ length: aneis.length }, (_, r) => r);
  const nomeSeq = (lista2) => lista2.filter((v, k, arr) => v !== arr[k - 1]);
  const fundoDe = (r) => [nm(r, 'i', 0), ...Array.from({ length: nB }, (_, j) => nm(r, 'b', j)), nm(r, 'o', 0)];
  const bordaDeBaixo = nomeSeq([
    ...rs.map((r) => nm(r, 'o', 0)),
    ...fundoDe(ultimo).reverse().slice(1),
    ...[...rs].reverse().map((r) => nm(r, 'i', 0)).slice(0),
    ...fundoDe(0).slice(1),
  ]);
  const bordaDaSaida = nomeSeq([...rs.map((r) => nm(r, 'o', nO - 1)), ...[...rs].reverse().map((r) => nm(r, 'i', nO - 1))]);
  if (bordaDaSaida[bordaDaSaida.length - 1] !== bordaDaSaida[0]) bordaDaSaida.push(bordaDaSaida[0]);
  const vincos = [
    { nome: 'bordaDeBaixo', pontos: bordaDeBaixo, nitidez: 'viva' },
    { nome: 'bordaDaSaida', pontos: bordaDaSaida, nitidez: 'viva' },
  ];
  const raioDoPe = Math.max(...aneis.flatMap((an) => [Math.hypot(an.x, an.dentro[0][0]), Math.hypot(an.x, an.fora[0][0])]));
  return { pontos, passo: { vertices: Object.keys(pontos), faces, vincos }, raioDoPe: m(raioDoPe) };
}

export function gerarPassos(t = TABELA) {
  const { yEixo, zFace, Ra, e, passo, raioDoPe } = derivar(t);
  const L = t.lados;
  const corpo = { origem: { op: 'subdivisao', id: ID.corpo } };
  const passos = [];
  passos.push(['subdivisao', { origemId: ID.corpo, ...passo, niveis: t.niveis }]);
  passos.push(['parte', { nome: 'pescoco', sel: corpo }]);
  passos.push(['lathe', {
    origemId: ID.anel, eixo: 'z', lados: L, em: [0, yEixo, zFace],
    perfil: [[0, 0], [Ra, 0], [Ra, e], [0, e]],
  }]);
  passos.push(['parte', { nome: 'anel', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  passos.push(['material', { usa: 'anelEscuro', sel: { origem: { op: 'lathe', id: ID.anel } } }]);
  /* o ponto do pé mais longe do eixo, tirado do anel de baixo da gaiola; a porta é a faixa de contato de 10 mm junto a ele, que a junta com o anel cobra */
  passos.push(['publicarPorta', {
    nome: 'apoio', de: corpo.origem,
    interface: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: raioDoPe - 0.010, raioExterno: raioDoPe, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['publicarPorta', {
    nome: 'juntaDoOmbro', de: { op: 'lathe', id: ID.anel },
    interface: { forma: 'cilindro', papel: 'externa', eixo: [0, 0, 1], centro: [0, yEixo, zFace + e], raio: Ra, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.anel } }, angulo: 45 }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/ombro', desc: 'ombro: L de ponta-cabeça de 190 por 220 mm, frente de pé recuada, saída redonda e anel fino' },
  PARAMS: TABELA,
  MATERIAIS,
  get TOPO() { return { origem: 'centro da boca de baixo do pescoço; y para cima, a saída para +Z', ...derivar(this.PARAMS).pontos }; },
  PLANO: {
    objeto: 'ombro do braço robótico: gira com a cintura e carrega a junta do ombro, de eixo horizontal',
    referencias: ['../../referencias/frontal.contornos.json'],
    escala: { medida: 'diâmetro do anel da cintura, onde o pé assenta', milimetros: 210 },
    partes: [
      { nome: 'pescoco', forma: 'L de ponta-cabeça de 190 mm de largura por 220 de comprimento na direção da junta: parte de pé com a frente recuada 30 mm da deitada, quinas de 75 em planta, saída redonda do diâmetro da largura; eixo a 115, topo a 210', tecnica: 'uma malha contínua por subdivisao de gaiola de anéis do pé à saída; seção de cantos arredondados que vira redonda; curva do encontro de baixo nos pontos da gaiola; vincos vivos na borda de baixo e na borda da saída' },
      { nome: 'anel', forma: 'faixa fina de uns 28 mm, eixo Z, com o mesmo diâmetro da saída (190 mm), encostada na face da saída sem entrar nela, escura', tecnica: 'revolução com perfil' },
    ],
    criteriosDeReprovacao: [
      'parte de pé sem o degrau em relação à parte deitada (frentes no mesmo plano)',
      'saída redonda maior que a largura do bloco, sobrando por baixo ou pelos lados',
      'saída com diâmetro diferente do anel',
      'facetas ou sombreado torcido na faixa em que a seção vira redonda junto ao anel',
      'rasgo, quina viva ou degrau de sombra no encontro de baixo entre a frente da parte de pé e a parte deitada',
      'rasgo ou degrau de sombra nos cantos junto à saída',
      'seção de cima facetada na vista de cima, em polígono em vez de cantos arredondados contínuos',
      'corpo de seção circular em todo o trecho de cima, lendo como cano',
      'anel entrando na saída ou afastado dela',
      'anel grosso como tambor em vez de faixa fina',
      'pé fora do eixo vertical da cintura',
      'ombro mais largo que 190 mm, mais longo que 220 mm na direção da junta ou com o topo acima de 210 mm do anel da cintura',
      'traseira ou pé fora do anel da cintura vistos de cima',
    ],
  },
  contatos: [
    { par: ['pescoco', 'anel'], motivo: 'o anel encosta na face da saída, sem entrar nela' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
