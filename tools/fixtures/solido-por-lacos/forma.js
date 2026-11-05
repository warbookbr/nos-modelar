/* forma.js — a forma e a gaiola da peça de teste do plano do sólido por laços: um L de ponta-cabeça fechado, feito de uma
 * malha só por subdivisão de uma gaiola de laços, um laço por plano x = constante.
 *
 * A FORMA. Uma parte deitada de 190 mm de largura (x de -95 a 95) e 190 de altura (y de 20 a 210), que corre em z de -95 a
 * 125 e acaba numa saída redonda do diâmetro da largura, de eixo z a 115 mm do chão; por baixo da traseira, uma parte de pé
 * que desce até y = 0, com a frente 30 mm atrás da frente da parte deitada (o degrau do L). As quinas de trás e as da frente
 * do pé têm 75 mm de raio em planta, a seção da parte deitada tem cantos de 32 mm, que crescem até o círculo nos 45 mm antes
 * da saída, e a borda de cima da parede de trás tem 10 mm. O encontro de baixo, entre a frente do pé e a face de baixo da
 * parte deitada, é um quarto de elipse côncavo de 12 por 12 mm nos próprios pontos da gaiola.
 *
 * A GAIOLA. Cada laço é o contorno da peça cortada pelo plano x: sobe pela parede de trás (`fora`, de trás para a saída, com o
 * topo), desce pela face da saída, volta pela face de baixo da parte deitada, sobe a curva do encontro e desce pela frente do pé
 * (`dentro`, guardado da frente do pé à saída), e volta pelo fundo (`fundo`). Todos os laços têm o mesmo número de pontos,
 * então as faces entre dois laços vizinhos são quadriláteros ponto a ponto (as tiras), e as duas paredes de lado, nos planos
 * x = ±95, são tampadas por uma escada de faces entre a cadeia `fora` e a `dentro`. Nos dois planos de lado a saída redonda se
 * fecha numa ponta, e o último ponto de `dentro` é o mesmo de `fora`. Os vincos vivos são a borda de baixo e a borda da saída.
 *
 * É a transcrição da gaiola escrita à mão que a fatia 1 do plano leva para esta peça neutra, separada em três funções para a
 * fatia 2 ver o que é da forma e o que é geral: `planosDeCorte` e `lacoNoPlano` são da forma, e `gaiolaDosLacos` é a montagem
 * que o ajudante vai envolver. As opções em `TABELA.limites` refazem os quatro limites que o plano lista; a tabela padrão é a
 * forma de referência. Tudo em milímetro até os pontos que saem, em metro. Nenhum dado vem de referência externa. */

export const m = (mm) => mm / 1000;

export const TABELA = {
  /* Meia largura da parte deitada; a saída redonda tem este raio. */
  meiaLargura: 95,
  /* Altura do eixo da saída acima do chão: o topo fica a 210 mm e a face de baixo da parte deitada a 20. */
  alturaDoEixo: 115,
  /* Raio dos cantos da seção da parte deitada. */
  raioDosCantos: 32,
  /* Quanto a frente da parte de pé fica atrás da frente da parte deitada. */
  recuoDaFrente: 30,
  /* Quanto a parte deitada avança além do quadrado de 190 mm: a saída fica em z = 95 + 30. */
  alongamento: 30,
  /* Trecho antes da saída em que a seção passa de cantos de 32 mm a redonda. */
  transicaoDaSaida: 45,
  /* Quarto de elipse do encontro de baixo: avanço em z e subida em y. */
  avancoDoEncontro: 12,
  alturaDoEncontro: 12,
  /* Raios em planta das quinas de trás e das quinas da frente do pé, e da borda de cima da parede de trás. */
  raioDaTraseira: 75,
  raioDaFrenteDoPe: 75,
  raioDaQuinaDeTras: 10,
  /* Planos de corte por quarto de quina em planta e por quarto de canto da seção, e no trecho reto de trás. */
  estacoesDaQuina: 6,
  estacoesDoCanto: 4,
  estacoesDoReto: 3,
  /* A amostragem do laço: frações da parede de trás e do fundo, frações do topo de trás até o começo da transição, e os
     pontos da transição, da face de baixo e da curva do encontro. */
  fracoesDaParede: [0.25, 0.5, 0.75],
  fracoesDoFundo: [0.25, 0.5, 0.75],
  fracoesDoTopo: [0, 0.015, 0.05, 0.12, 0.25, 0.45, 0.7],
  pontosDaTransicao: 6,
  pontosDeBaixo: 9,
  pontosDoEncontro: 6,
  niveis: 2,
  /* Os quatro limites. `distanciaMinimaEntrePlanos` tira o plano de corte a menos dessa distância do anterior (a forma de
     referência usa 2,5 mm; com 0 ficam todos, e só o plano repetido sai). `medidas` põe cota exata em todos os pontos da
     gaiola ('todos') ou em nenhum ('nenhuma'). Os outros dois (a aresta mais macia e o calombo da amostragem desigual) saem
     da forma de referência e da amostragem acima, sem opção própria. */
  limites: { distanciaMinimaEntrePlanos: 2.5, medidas: 'nenhuma' },
};

/* Funções da forma em (x, z), em milímetro. */
function funcoesDaForma(t) {
  const L = t.meiaLargura;
  const yE = t.alturaDoEixo;
  const zFace = L + t.alongamento;
  const zT = zFace - t.transicaoDaSaida;
  const zf0 = zFace - t.recuoDaFrente;
  const rcA = t.raioDosCantos;
  const rf = t.raioDaFrenteDoPe;
  const rq = t.raioDaTraseira;
  /* passagem suave de 0 a 1 ao longo da transição da saída */
  const S = (z) => (z <= zT ? 0 : z >= zFace ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * (z - zT)) / (zFace - zT)));
  /* meia largura da parte deitada em z: a traseira acompanha o arco das quinas em planta */
  const larg = (z) => (z >= -L + rq ? L : L - rq + Math.sqrt(Math.max(0, rq * rq - (z + L - rq) ** 2)));
  /* raio dos cantos da seção em z: cresce até o círculo na saída; na traseira parte do raio da borda de trás e cresce com a largura */
  const raioDaSecao = (z) => {
    const pre = rcA + (L - rcA) * S(z);
    const w = larg(z);
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
  return { L, yE, zFace, zT, yTopo, yFundo, zTras, zFrente };
}

/** planosDeCorte(t) -> as posições x dos laços, de -meiaLargura a meiaLargura, em mm: pelo trecho reto de trás, pelos arcos das
 *  quinas em planta e pelos arcos dos cantos da seção, sem os que ficam a menos de `limites.distanciaMinimaEntrePlanos`. */
export function planosDeCorte(t) {
  const L = t.meiaLargura;
  const rq = t.raioDaTraseira;
  const rcA = t.raioDosCantos;
  const minimo = t.limites?.distanciaMinimaEntrePlanos ?? 2.5;
  const lista = [];
  for (let k = 0; k <= t.estacoesDoReto; k++) lista.push(((L - rq) * k) / t.estacoesDoReto);
  for (let k = 1; k <= t.estacoesDaQuina; k++) lista.push(L - rq + rq * Math.sin((Math.PI / 2) * (k / t.estacoesDaQuina)));
  for (let k = 0; k <= t.estacoesDoCanto; k++) lista.push(L - rcA + rcA * Math.sin((Math.PI / 2) * (k / t.estacoesDoCanto)));
  lista.sort((p, q) => p - q);
  const metade = [];
  for (const x of lista) {
    const ultimo = metade[metade.length - 1];
    if (!metade.length || (x - ultimo > minimo && x - ultimo > 1e-9)) metade.push(x);
    else if (Math.abs(x - L) < 1e-9) metade[metade.length - 1] = x;
  }
  metade[metade.length - 1] = L;
  return [...metade.slice(1).reverse().map((x) => -x), ...metade];
}

/** lacoNoPlano(t, x) -> { x, fora, dentro, fundo }: o contorno da peça no plano x, em [z, y] mm, em três cadeias. `fora` vai do
 *  chão atrás, pela parede de trás e pelo topo, até a saída; `dentro` vai do chão na frente do pé, pela curva do encontro e pela
 *  face de baixo, até a saída; `fundo` são os pontos do chão entre a frente do pé e a traseira. */
export function lacoNoPlano(t, x) {
  const { L, yE, zFace, zT, yTopo, yFundo, zTras, zFrente } = funcoesDaForma(t);
  const dz = t.avancoDoEncontro;
  const y0 = yE - L - t.alturaDoEncontro;
  const zr = zTras(x);
  const yp = yTopo(x, zr);
  const zfx = zFrente(x);
  const zEnc = zfx + dz;
  const yFim = yFundo(x, zEnc);
  const fora = [[zr, 0]];
  for (const f of t.fracoesDaParede) fora.push([zr, yp * f]);
  for (const tau of t.fracoesDoTopo) { const z = zr + tau * (zT - zr); fora.push([z, yTopo(x, z)]); }
  fora.push([zT, yTopo(x, zT)]);
  for (let j = 1; j < t.pontosDaTransicao; j++) { const z = zT + ((zFace - zT) * j) / t.pontosDaTransicao; fora.push([z, yTopo(x, z)]); }
  fora.push([zFace, yTopo(x, zFace)]);
  const dentro = [[zfx, 0], [zfx, y0 / 2]];
  for (let k = 0; k < t.pontosDoEncontro; k++) {
    const th = ((Math.PI / 2) * k) / (t.pontosDoEncontro - 1);
    dentro.push([zfx + dz * (1 - Math.cos(th)), y0 + (yFim - y0) * Math.sin(th)]);
  }
  for (let j = 1; j <= t.pontosDeBaixo; j++) {
    const f = 1 - (1 - j / (t.pontosDeBaixo + 1)) ** 1.4;
    const z = zEnc + (zFace - zEnc) * f;
    dentro.push([z, yFundo(x, z)]);
  }
  dentro.push([zFace, yFundo(x, zFace)]);
  const fundo = t.fracoesDoFundo.map((f) => [zfx + (zr - zfx) * f, 0]);
  if (fora.length !== dentro.length) throw new RangeError(`lacoNoPlano: a cadeia de fora tem ${fora.length} pontos e a de dentro ${dentro.length}; a escada da parede de lado pede o mesmo número`);
  return { x, fora, dentro, fundo };
}

/** gaiolaDosLacos(aneis, { medidas }) -> { pontos, passo, pontosMm }: a gaiola fechada a partir dos laços, no formato do passo
 *  `subdivisao`. As tiras ligam ponto a ponto dois laços vizinhos; as paredes do primeiro e do último laço são a escada entre
 *  `fora` e `dentro`, com a face do pé fechada pelo `fundo`; o ponto de `dentro` que coincide com o último de `fora` nos dois
 *  laços de lado sai como um ponto só. A orientação das tiras confere pelo topo (normal +y) e a das paredes pelo sinal de x. */
export function gaiolaDosLacos(aneis, { medidas = 'nenhuma' } = {}) {
  const nO = aneis[0].fora.length;
  const nB = aneis[0].fundo.length;
  for (const an of aneis) {
    if (an.fora.length !== nO || an.dentro.length !== nO || an.fundo.length !== nB) throw new RangeError(`gaiolaDosLacos: o laço em x = ${an.x} tem ${an.fora.length}/${an.dentro.length}/${an.fundo.length} pontos, e o primeiro ${nO}/${nO}/${nB}`);
  }
  const pontosMm = {};
  const nomeDe = (r, grupo, j) => `l${r}_${grupo}${j}`;
  const ultimo = aneis.length - 1;
  const ponta = (r, grupo, j) => grupo === 'i' && j === nO - 1 && (r === 0 || r === ultimo);
  aneis.forEach((an, r) => {
    an.fora.forEach(([z, y], j) => { pontosMm[nomeDe(r, 'o', j)] = [an.x, y, z]; });
    an.dentro.forEach(([z, y], j) => { if (!ponta(r, 'i', j)) pontosMm[nomeDe(r, 'i', j)] = [an.x, y, z]; });
    an.fundo.forEach(([z, y], j) => { pontosMm[nomeDe(r, 'b', j)] = [an.x, y, z]; });
  });
  const nm = (r, grupo, j) => (ponta(r, grupo, j) ? nomeDe(r, 'o', j) : nomeDe(r, grupo, j));
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
  const parede = (r) => {
    const fs = [[nm(r, 'o', 0), nm(r, 'o', 1), nm(r, 'i', 1), nm(r, 'i', 0), ...Array.from({ length: nB }, (_, j) => nm(r, 'b', j))]];
    for (let j = 1; j < nO - 1; j++) fs.push([nm(r, 'o', j), nm(r, 'o', j + 1), nm(r, 'i', j + 1), nm(r, 'i', j)]);
    return fs.map(limpa).filter(Boolean);
  };
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
  const yMax = Math.max(...Object.values(pontosMm).map((p) => p[1]));
  const tiraDoTopo = tiras.find((f) => f.every((v) => Math.abs(pontosMm[v][1] - yMax) < 1e-9 && Math.abs(pontosMm[v][0]) < 1e-9 + 10));
  const tirasOk = tiraDoTopo && normal(tiraDoTopo)[1] < 0 ? tiras.map((f) => [...f].reverse()) : tiras;
  const faces = [...tirasOk, ...orienta(parede(0), -1), ...orienta(parede(ultimo), 1)];

  const pontos = {};
  for (const [k, v] of Object.entries(pontosMm)) pontos[k] = v.map(m);
  const rs = Array.from({ length: aneis.length }, (_, r) => r);
  const semRepetir = (lista) => lista.filter((v, k, arr) => v !== arr[k - 1]);
  const fundoDe = (r) => [nm(r, 'i', 0), ...Array.from({ length: nB }, (_, j) => nm(r, 'b', j)), nm(r, 'o', 0)];
  const bordaDeBaixo = semRepetir([
    ...rs.map((r) => nm(r, 'o', 0)),
    ...fundoDe(ultimo).reverse().slice(1),
    ...[...rs].reverse().map((r) => nm(r, 'i', 0)),
    ...fundoDe(0).slice(1),
  ]);
  const bordaDaSaida = semRepetir([...rs.map((r) => nm(r, 'o', nO - 1)), ...[...rs].reverse().map((r) => nm(r, 'i', nO - 1))]);
  if (bordaDaSaida[bordaDaSaida.length - 1] !== bordaDaSaida[0]) bordaDaSaida.push(bordaDaSaida[0]);
  const vincos = [
    { nome: 'bordaDeBaixo', pontos: bordaDeBaixo, nitidez: 'viva' },
    { nome: 'bordaDaSaida', pontos: bordaDaSaida, nitidez: 'viva' },
  ];
  const passo = { vertices: Object.keys(pontos), faces, vincos };
  if (medidas === 'todos') passo.medidas = Object.keys(pontos);
  else if (medidas !== 'nenhuma') throw new RangeError(`gaiolaDosLacos: medidas é 'todos' ou 'nenhuma', e veio ${JSON.stringify(medidas)}`);
  return { pontos, passo, pontosMm };
}

/** derivar(t) -> { planos, aneis, pontos, passo, pontosMm }: a gaiola da peça de teste pela tabela. */
export function derivar(t = TABELA) {
  const planos = planosDeCorte(t);
  const aneis = planos.map((x) => lacoNoPlano(t, x));
  return { planos, aneis, ...gaiolaDosLacos(aneis, { medidas: t.limites?.medidas ?? 'nenhuma' }) };
}

export const PLANO = {
  objeto: 'peça de teste: sólido em L de ponta-cabeça fechado numa malha só por subdivisão de uma gaiola de laços',
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'largura da parte deitada', milimetros: 190 },
  partes: [
    { nome: 'corpo', forma: 'L de ponta-cabeça de 190 mm de largura por 220 de comprimento, parte de pé recuada 30 mm, quinas de 75 em planta, cantos de 32 na seção e saída redonda de 190 mm', tecnica: 'subdivisão de uma gaiola de laços, um laço por plano x, com as paredes de lado em escada e vincos vivos na borda de baixo e na da saída' },
  ],
  criteriosDeReprovacao: [
    'emenda, faixa de sombra ou degrau entre a parte de pé e a parte deitada',
    'malha aberta, com aresta sem par ou vínculo não manifold',
    'ondulação ou calombo visível nas faces planas ou na transição para a saída redonda',
  ],
};
