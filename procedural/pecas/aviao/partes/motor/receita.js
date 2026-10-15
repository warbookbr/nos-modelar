/* aviao/motor — o capô do motor do avião de pequeno porte, com a entrada de ar sob ele e os dois escapes laterais.
 *
 * Segunda etapa do avião (`../../montagem.json`). O combinado com a pessoa e o plano do motor estão em `../../ALINHAMENTO.md`; as
 * medidas vêm da unidade `motor` do esboço aprovado da segunda rodada
 * (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json` e `aviao-detalhe-motor.esboco.json`), e a receita
 * refina o andaime `../../andaime.json`, que é a tradução desse esboço (REFINA).
 *
 * Referencial do acervo e do esboço, o mesmo da fuselagem: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a
 * cauda para +z. O capô vai de z = 592, onde o cone da hélice o encontra na etapa seguinte, até z = 2377, a face da frente da
 * fuselagem. A TABELA está em milímetro, no quadro do esboço, e a conversão para metro acontece só em `derivar`.
 *
 * O capô assenta na fuselagem: a última estação dele repete a primeira da fuselagem (z 2377, 1450 por 1030, canto de 380, centro em
 * y 1303), que é o que o plano e a nota de passagem da fuselagem dizem. A fuselagem não publica porta, e por isso estes números
 * estão na TABELA, e não saem de um vínculo de medida e de um encaixe de porta da montagem v5.
 *
 * O capô é um loft em z de seções de retângulo arredondado. O esboço o declara `suave` e passa por 10 seções uma curva de tangente
 * contínua (cúbica de Hermite com a tangente de Fritsch e Carlson, a do PCHIP, que não passa do valor de nenhuma seção); aqui a curva
 * entra em `derivar`, que a avalia na meia largura, no topo, na base e no raio do canto de cada seção e acrescenta as estações entre
 * elas. O lábio do capô, a parede de 14 mm entre z 662 e z 676, é aresta viva: a curva se parte nas duas seções dele. Cada loft anda
 * numa reta paralela ao eixo dele, com todas as seções no mesmo plano; o centro de cada seção entra no contorno, e não na posição.
 * O loft só fecha uma ponta com um polo de raio zero; o polo nasce no eixo, a `tampa.avanco` além da última seção, e `moveV` o leva ao
 * centro da seção, de modo que cada ponta é um leque quase plano. O bloco de ids de um passo é de 1000: com 10 segmentos por canto
 * são 44 pontos por seção, e o capô cabe com até 21 estações.
 *
 * A boca de ar é um corte de loft que entra pela parede do lábio e segue 260 mm para trás, sob o capô, como no esboço, e daí continua
 * na seção da última estação até passar da face de trás do capô: o corte é uma passagem de ponta a ponta, e não uma cova com fundo,
 * porque o fundo plano a 260 mm lia como uma face fechando a fenda. A passagem sai na face de z 2377, que a fuselagem fecha na
 * montagem, e por isso o capô é medido com um furo passante (`formas`). A entrada de ar é a carenagem em volta da boca, e cada uma
 * das duas partes leva o seu corte, porque a subtração o consome; a carenagem leva só as estações do esboço, que é onde ela alcança.
 * As seções da carenagem e da boca são estádios (a ponta é um semicírculo de raio igual à meia altura), e o contorno delas é
 * calculado aqui, ponto a ponto: dois cantos do núcleo com esse raio deixam uma faixa de 1 mm no meio da ponta, em que a normal gira
 * 8 graus, e a sombra a mostra como um degrau. Os escapes são tubos por loft de seções circulares ao longo de um caminho com uma
 * curva de `raioCurva`, as pontas fechadas por polo no eixo; o furo de saída é um corte circular que entra pela ponta do tubo, ao
 * longo do eixo dele.
 */

export const TABELA = {
  /* Capô: uma estação por linha, [z, largura em x, altura em y, raio do canto, y do centro, aresta]. O x do centro é zero. `aresta`
     vale 1 onde a curva se parte. A de z 662 o esboço acha sozinho (a parede do lábio quebra a superfície em mais de 40 graus) e a de
     z 676 ele declara. A última linha é a primeira da fuselagem. */
  capo: {
    estacoes: [
      [592, 440, 503, 200, 1329.5, 0],
      [662, 470, 530, 220, 1325, 1],
      [676, 520, 730, 250, 1235, 1],
      [805, 720, 815, 330, 1217.5, 0],
      [905, 770, 845, 340, 1217.5, 0],
      [1212, 970, 922, 380, 1229, 0],
      [1512, 1170, 957, 400, 1246.5, 0],
      [1812, 1300, 958, 400, 1269, 0],
      [2112, 1420, 992, 400, 1286, 0],
      [2377, 1450, 1030, 380, 1303, 0],
    ],
    /* Quantos trechos cada vão entre duas estações vira na curva: um número por vão, nove ao todo. Com [1, 1, 3, 1, 2, 3, 3, 3, 2]
       são 20 estações (a curva do esboço tem 17), o que cabe no bloco de 1000 ids com 44 pontos por seção e deixa 100 mm entre as
       estações dos vãos longos do corpo. */
    trechos: [1, 1, 3, 1, 2, 3, 3, 3, 2],
    /* Segmentos de cada canto arredondado: o canto de 400 mm sai em 10 passos de 9 graus, com a corda a 1,2 mm do arco. */
    segmentosPorCanto: 10,
  },
  /* Carenagem da entrada de ar: `inicio` é o ponto do lábio de ar do esboço, e cada estação é [distância a partir dele em z, largura
     em x, altura em y, raio do canto]. O centro de cada seção está sobre o ponto. */
  entradaDeAr: {
    inicio: [0, 1000, 636],
    estacoes: [
      [0, 380, 170, 85],
      [64, 380, 170, 85],
    ],
  },
  /* Boca de ar, o cortador: `inicio` é o ponto da boca de ar do esboço, e as estações são as mesmas colunas da entrada de ar. Só o
     corte do capô continua além da última estação: a seção dela segue até `passagem.alem` mm depois da última estação do capô, de
     modo que o corte atravessa a face de trás, com uma estação a cada `passagem.passo` mm no máximo, para a parede da passagem não
     sair em tiras de 7 mm por 1,5 m. */
  bocaDeAr: {
    inicio: [0, 1000, 620],
    estacoes: [
      [0, 340, 130, 65],
      [120, 330, 126, 63],
      [260, 220, 90, 45],
    ],
    passagem: { alem: 40, passo: 300 },
  },
  /* Escape do lado direito; o esquerdo é o espelho em x. `inicio` é o ponto do escape do esboço, e `joelho` e `fim` são deslocamentos
     dele. O tubo vira no joelho numa curva de `raioCurva`, cortada em seções a cada `passoDaCurva` graus. O furo de saída entra pela
     ponta: `de` mm para dentro do tubo e `ate` mm para além da ponta, ao longo do eixo dele. */
  escape: {
    inicio: [300, 1340, 945],
    joelho: [180, 0, 0],
    fim: [340, 0, 430],
    diametro: 200,
    raioCurva: 130,
    passoDaCurva: 6,
    lados: 48,
    furo: { diametro: 130, lados: 24, de: 110, ate: 40 },
  },
  /* Fechamento das pontas dos lofts: quanto o polo fica além da última seção, ao longo do caminho. */
  tampa: { avanco: 0.5 },
  /* Quanto o raio do canto fica abaixo da meia dimensão menor da seção, em mm, nas seções de canto arredondado (as do capô). Uma seção
     cujo raio alcança a meia altura, como a da boca de ar e a da entrada de ar, não passa por aqui: é um estádio e tem contorno
     próprio. */
  folgaDoRaio: 0.5,
};

const m = (mm) => mm / 1000;
const soma = (a, b) => a.map((v, k) => v + b[k]);
const sub = (a, b) => a.map((v, k) => v - b[k]);
const mul = (a, s) => a.map((v) => v * s);
const escalar = (a, b) => a.reduce((s, v, k) => s + v * b[k], 0);
const unitario = (a) => mul(a, 1 / Math.hypot(...a));

/* O loft em z: o eixo é o 2, o plano da seção é x por y, o +w do núcleo aponta para -y e a `orientacao` fixa o +u em x. */
const ORIENTACAO_EM_Z = [1, 0, 0];

/* Área com sinal pelo cadarço, sobre os dois primeiros números de cada ponto; o núcleo só aceita contorno anti-horário. */
function areaDoContorno(pontos) {
  let area = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i];
    const b = pontos[(i + 1) % pontos.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}

/* A cúbica de Hermite por trechos, com a tangente do PCHIP. `nos` são `{ w, v, viva }`: a posição, a lista de valores e se o nó é
   aresta. Devolve os nós e, entre cada par deles, as estações pedidas em `trechos` (um número de trechos por vão). Num nó que é
   aresta a curva se parte: cada lado termina nele como uma curva termina na ponta, e dois nós vivos seguidos ficam ligados por reta. */
function tangenteInterna(h0, h1, d0, d1) {
  if (d0 * d1 <= 0) return 0;
  const a = 2 * h1 + h0;
  const b = h1 + 2 * h0;
  return (a + b) / (a / d0 + b / d1);
}
function tangenteDaPonta(h0, h1, d0, d1) {
  let d = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (Math.sign(d) !== Math.sign(d0)) d = 0;
  else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(d) > 3 * Math.abs(d0)) d = 3 * d0;
  return d;
}
function estacoesPorHermite(nos, trechos) {
  const n = nos.length;
  if (trechos.length !== n - 1) throw new Error(`capo: ${n} estações pedem ${n - 1} números em trechos, e a TABELA traz ${trechos.length}`);
  const h = nos.slice(1).map((no, k) => no.w - nos[k].w);
  const coordenadas = nos[0].v.map((_, c) => c);
  const inclinacao = h.map((hk, k) => nos[k + 1].v.map((y, c) => (y - nos[k].v[c]) / hk));
  const liso = (j) => !nos[j].viva && j > 0 && j < n - 1;
  const esq = new Array(n);
  const dir = new Array(n);
  for (let k = 0; k < n; k++) {
    const temEsq = k > 0;
    const temDir = k < n - 1;
    if (temEsq && temDir && !nos[k].viva) {
      const t = coordenadas.map((c) => tangenteInterna(h[k - 1], h[k], inclinacao[k - 1][c], inclinacao[k][c]));
      esq[k] = t;
      dir[k] = t;
      continue;
    }
    if (temEsq) {
      esq[k] = k >= 2 && liso(k - 1)
        ? coordenadas.map((c) => tangenteDaPonta(h[k - 1], h[k - 2], inclinacao[k - 1][c], inclinacao[k - 2][c]))
        : inclinacao[k - 1];
    }
    if (temDir) {
      dir[k] = k + 2 < n && liso(k + 1)
        ? coordenadas.map((c) => tangenteDaPonta(h[k], h[k + 1], inclinacao[k][c], inclinacao[k + 1][c]))
        : inclinacao[k];
    }
  }
  const saida = [];
  for (let k = 0; k < n; k++) {
    saida.push({ w: nos[k].w, v: nos[k].v });
    if (k === n - 1) continue;
    const quantos = trechos[k];
    if (!Number.isInteger(quantos) || quantos < 1) throw new Error(`capo: trechos[${k}] precisa ser inteiro maior ou igual a 1`);
    for (let j = 1; j < quantos; j++) {
      const t = j / quantos;
      const [h00, h10, h01, h11] = [2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2];
      saida.push({
        w: nos[k].w + t * h[k],
        v: nos[k].v.map((y0, c) => h00 * y0 + h10 * h[k] * dir[k][c] + h01 * nos[k + 1].v[c] + h11 * h[k] * esq[k + 1][c]),
      });
    }
  }
  return saida;
}

/* O contorno de uma seção em estádio, [u, w] com u = x e w = -(y - y0): a reta do topo, a da base e, em cada ponta, um semicírculo de
   raio igual à meia altura em `2 * segmentos` passos, com um ponto no meio da ponta. Os pontos saem calculados, e não de dois cantos
   do núcleo, porque dois cantos com esse raio se tocam no meio da ponta. O sentido sai invertido quando é horário. */
function contornoDeEstadio({ hw, topo, base }, y0, segmentos) {
  const hy = (topo - base) / 2;
  if (!(hw > hy)) throw new Error(`estádio com meia largura de ${hw} m e meia altura de ${hy} m: a ponta arredondada só existe nas laterais, e a seção precisa ser mais larga que alta`);
  const meio = (topo + base) / 2;
  const passos = 2 * segmentos;
  const centro = hw - hy;
  const ponta = (lado, de, ate) => Array.from({ length: passos + 1 }, (_, k) => {
    const a = de + ((ate - de) * k) / passos;
    return [lado * (centro + hy * Math.cos(a)), meio + hy * Math.sin(a)];
  });
  const pontos = [...ponta(1, Math.PI / 2, -Math.PI / 2), ...ponta(-1, -Math.PI / 2, Math.PI / 2)];
  const contorno = pontos.map(([x, y]) => [x, -(y - y0)]);
  return { meio, lados: contorno.length, contorno: areaDoContorno(contorno) < 0 ? contorno.reverse() : contorno };
}

/* O contorno de uma seção de retângulo arredondado no plano do loft em z, [u, w, raio] com u = x e w = -(y - y0). Os quatro cantos
   saem do mesmo raio, limitado pela meia dimensão menor, e o contorno que sai no sentido horário é invertido. A seção cujo raio
   alcança a meia dimensão menor é um estádio e tem contorno próprio. `lados` é o número de pontos depois de o núcleo expandir os
   cantos. */
function contornoDaSecao({ hw, topo, base, raio }, y0, folga, segmentos) {
  const meio = (topo + base) / 2;
  const hy = (topo - base) / 2;
  /* A tolerância de um nanômetro absorve o ruído de `topo - base` em ponto flutuante. */
  if (raio >= Math.min(hw, hy) - 1e-9) return contornoDeEstadio({ hw, topo, base }, y0, segmentos);
  const r = Math.min(raio, hw - folga, hy - folga);
  const cantos = [[hw, topo, r], [-hw, topo, r], [-hw, base, r], [hw, base, r]];
  const contorno = cantos.map(([x, y, raioDoCanto]) => [x, -(y - y0), raioDoCanto]);
  return { meio, lados: contorno.length * (segmentos + 1), contorno: areaDoContorno(contorno) < 0 ? contorno.reverse() : contorno };
}

/* Um loft em z por seções de retângulo arredondado, em metro: `secoes` são `{ z, hw, topo, base, raio }`, com a meia largura em torno
   de `x`. A reta do caminho passa pelo centro da primeira seção; o centro das outras entra no contorno. Devolve as seções, com um polo de raio zero antes da primeira e
   depois da última, os `lados`, a `orientacao` e, para cada polo, a região que o seleciona e o deslocamento que o leva ao centro da
   seção de que ele fecha a ponta. */
function loftEmZ({ nome, x = 0, secoes, avanco, segmentos, folga }) {
  const y0 = (secoes[0].topo + secoes[0].base) / 2;
  const feitas = secoes.map((s) => ({ ...contornoDaSecao(s, y0, folga, segmentos), z: s.z }));
  const lados = feitas[0].lados;
  if (feitas.some((s) => s.lados !== lados)) {
    throw new Error(`${nome}: as seções saem com ${[...new Set(feitas.map((s) => s.lados))].join(' e ')} pontos, e o loft pede o mesmo número em todas (estádio e retângulo arredondado não casam no mesmo loft)`);
  }
  const nV = feitas.length * lados + 2;
  const nF = (feitas.length + 1) * lados;
  if (nV > 1000 || nF > 1000) {
    throw new Error(`${nome}: ${feitas.length} seções de ${lados} pontos estouram o bloco de 1000 ids de um passo (${nV} vértices, ${nF} faces)`);
  }
  const polo = (s, sentido, meio) => {
    const pos = [x, y0, s.z + sentido * avanco];
    const folgaDaRegiao = avanco / 4;
    return { pos, d: [0, meio - y0, 0], regiao: { min: pos.map((v) => v - folgaDaRegiao), max: pos.map((v) => v + folgaDaRegiao) } };
  };
  const polos = [polo(feitas[0], -1, feitas[0].meio), polo(feitas[feitas.length - 1], 1, feitas[feitas.length - 1].meio)];
  return {
    secoes: [{ pos: polos[0].pos, raio: 0 }, ...feitas.map((s) => ({ pos: [x, y0, s.z], contorno: s.contorno })), { pos: polos[1].pos, raio: 0 }],
    lados,
    orientacao: ORIENTACAO_EM_Z,
    polos,
  };
}

/* O caminho do tubo em milímetro: os pontos de passagem, com cada canto trocado por um arco de `raioCurva` cortado em passos de no
   máximo `passoGraus`. O arco começa e termina a `raioCurva * tan(giro / 2)` do canto. */
function caminhoComCurva(pontos, raioCurva, passoGraus) {
  const linha = [pontos[0]];
  for (let i = 1; i < pontos.length - 1; i++) {
    const d1 = unitario(sub(pontos[i], pontos[i - 1]));
    const d2 = unitario(sub(pontos[i + 1], pontos[i]));
    const giro = Math.acos(Math.max(-1, Math.min(1, escalar(d1, d2))));
    if (giro < 1e-6) { linha.push(pontos[i]); continue; }
    const tangente = raioCurva * Math.tan(giro / 2);
    const antes = Math.hypot(...sub(pontos[i], pontos[i - 1]));
    const depois = Math.hypot(...sub(pontos[i + 1], pontos[i]));
    if (tangente > antes || tangente > depois) {
      throw new Error(`escape: o raio de curva de ${raioCurva} mm pede ${tangente.toFixed(1)} mm de cada trecho, e os trechos medem ${antes.toFixed(1)} e ${depois.toFixed(1)} mm`);
    }
    const comeco = sub(pontos[i], mul(d1, tangente));
    const normal = unitario(sub(d2, mul(d1, escalar(d1, d2))));
    const centro = soma(comeco, mul(normal, raioCurva));
    const passos = Math.max(1, Math.ceil((giro * 180) / Math.PI / passoGraus));
    for (let k = 0; k <= passos; k++) {
      const a = (giro * k) / passos;
      linha.push(soma(centro, soma(mul(normal, -raioCurva * Math.cos(a)), mul(d1, raioCurva * Math.sin(a)))));
    }
  }
  linha.push(pontos[pontos.length - 1]);
  return linha;
}

/* Um loft de seções circulares ao longo de uma linha em milímetro, em metro, com um polo no eixo a `avanco` além de cada ponta. */
function loftCircular({ linha, raio, lados, avanco }) {
  const direcaoDaPonta = (de, para) => unitario(sub(para, de));
  const inicio = direcaoDaPonta(linha[0], linha[1]);
  const fim = direcaoDaPonta(linha[linha.length - 2], linha[linha.length - 1]);
  const mm = (p) => p.map(m);
  return {
    secoes: [
      { pos: mm(sub(linha[0], mul(inicio, avanco * 1000))), raio: 0 },
      ...linha.map((p) => ({ pos: mm(p), raio: m(raio) })),
      { pos: mm(soma(linha[linha.length - 1], mul(fim, avanco * 1000))), raio: 0 },
    ],
    lados,
    direcaoDoFim: fim,
  };
}

/* Os pontos de passagem de um escape em milímetro, do lado `lado` (1 é o direito, -1 o esquerdo, o espelho em x). */
function pontosDoEscape(e, lado) {
  const inicio = [lado * e.inicio[0], e.inicio[1], e.inicio[2]];
  const deslocado = (d) => soma(inicio, [lado * d[0], d[1], d[2]]);
  return [inicio, deslocado(e.joelho), deslocado(e.fim)];
}

export function derivar(t = TABELA) {
  const avanco = m(t.tampa.avanco);
  const folga = m(t.folgaDoRaio);
  const segmentos = t.capo.segmentosPorCanto;

  const nos = t.capo.estacoes.map(([z, largura, altura, raio, y, aresta]) => ({
    w: z, v: [largura / 2, y + altura / 2, y - altura / 2, raio], viva: aresta === 1,
  }));
  const capo = loftEmZ({
    nome: 'capo',
    secoes: estacoesPorHermite(nos, t.capo.trechos).map(({ w, v: [hw, topo, base, raio] }) => ({ z: m(w), hw: m(hw), topo: m(topo), base: m(base), raio: m(raio) })),
    avanco, segmentos, folga,
  });

  /* A carenagem e o cortador nascem de um ponto e de estações a partir dele. */
  const aPartirDoPonto = (nome, { inicio, estacoes }) => loftEmZ({
    nome,
    x: m(inicio[0]),
    secoes: estacoes.map(([dz, largura, altura, raio]) => ({
      z: m(inicio[2] + dz), hw: m(largura / 2), topo: m(inicio[1] + altura / 2), base: m(inicio[1] - altura / 2), raio: m(raio),
    })),
    avanco, segmentos, folga,
  });
  const entradaDeAr = aPartirDoPonto('entradaDeAr', t.entradaDeAr);
  /* O corte do capô repete a seção da última estação da boca até a saída, `passagem.alem` mm além da última estação do capô, em
     estações a no máximo `passagem.passo` mm uma da outra; o da carenagem fica nas estações do esboço. */
  const boca = t.bocaDeAr;
  const ultimaDaBoca = boca.estacoes[boca.estacoes.length - 1];
  const fimDoCapo = t.capo.estacoes[t.capo.estacoes.length - 1][0];
  const dzDaSaida = fimDoCapo + boca.passagem.alem - boca.inicio[2];
  const trechosDaPassagem = Math.ceil((dzDaSaida - ultimaDaBoca[0]) / boca.passagem.passo);
  const daPassagem = Array.from({ length: trechosDaPassagem }, (_, k) => [
    ultimaDaBoca[0] + ((dzDaSaida - ultimaDaBoca[0]) * (k + 1)) / trechosDaPassagem, ...ultimaDaBoca.slice(1),
  ]);
  const bocaNoCapo = aPartirDoPonto('bocaDeAr no capo', { ...boca, estacoes: [...boca.estacoes, ...daPassagem] });
  const bocaNaEntrada = aPartirDoPonto('bocaDeAr na entradaDeAr', boca);

  const e = t.escape;
  const escapes = [{ nome: 'escapeD', lado: 1 }, { nome: 'escapeE', lado: -1 }].map(({ nome, lado }) => {
    const linha = caminhoComCurva(pontosDoEscape(e, lado), e.raioCurva, e.passoDaCurva);
    const tubo = loftCircular({ linha, raio: e.diametro / 2, lados: e.lados, avanco });
    /* O furo entra pela ponta e segue o eixo do tubo, que ali não é o eixo z: o eixo vira em x no joelho. */
    const ponta = linha[linha.length - 1];
    const eixo = tubo.direcaoDoFim;
    const furo = loftCircular({
      linha: [sub(ponta, mul(eixo, e.furo.de)), soma(ponta, mul(eixo, e.furo.ate))],
      raio: e.furo.diametro / 2, lados: e.furo.lados, avanco,
    });
    return { nome, lado, tubo, furo };
  });

  return { capo, entradaDeAr, bocaNoCapo, bocaNaEntrada, escapes };
}

/* Identidade estrutural dos passos, escolhida aqui. */
const ID = {
  capoBruto: 100, bocaNoCapo: 110, capo: 101,
  entradaBruta: 120, bocaNaEntrada: 130, entradaDeAr: 121,
  escapeD: { tubo: 200, furo: 201, peca: 202 },
  escapeE: { tubo: 210, furo: 211, peca: 212 },
};

export const MATERIAIS = {
  motor: { cor: '#7d8b99', metalicidade: 0.3, aspereza: 0.45 },
};

/* O ângulo, em graus, entre faces vizinhas a partir do qual a quina fica nítida no sombreamento liso. O arredondamento do capô e as
   seções do loft ficam bem abaixo disso; o lábio do capô, a borda de uma boca e a de um furo ficam acima. */
const ANGULO_LISO = 30;

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];

  const loft = (origemId, L, segmentosCurva) => {
    passos.push(['loft', { origemId, secoes: L.secoes, lados: L.lados, ...(segmentosCurva ? { segmentosCurva } : {}), ...(L.orientacao ? { orientacao: L.orientacao } : {}) }]);
    for (const polo of L.polos ?? []) {
      /* Um deslocamento abaixo de um nanômetro é ruído da média dos pontos, e não leva o polo a lugar nenhum. */
      if (polo.d.some((v) => Math.abs(v) > 1e-9)) passos.push(['moveV', { sel: { regiao: polo.regiao }, d: polo.d }]);
    }
  };
  const subtrai = (resultado, corpo, cortador) => passos.push(['subtrair', {
    origemId: resultado, solidos: [{ origem: { op: 'loft', id: corpo } }, { origem: { op: 'loft', id: cortador } }],
  }]);
  const nomeia = (nome, resultado) => {
    const sel = { origem: { op: 'subtrair', id: resultado } };
    passos.push(['parte', { nome, sel }]);
    passos.push(['material', { usa: 'motor', sel }]);
    passos.push(['liso', { angulo: ANGULO_LISO, sel }]);
  };

  /* O capô, com a boca de ar recortada sob ele. */
  loft(ID.capoBruto, P.capo, t.capo.segmentosPorCanto);
  loft(ID.bocaNoCapo, P.bocaNoCapo, t.capo.segmentosPorCanto);
  subtrai(ID.capo, ID.capoBruto, ID.bocaNoCapo);
  nomeia('capo', ID.capo);

  /* A carenagem da entrada de ar, com a mesma boca. */
  loft(ID.entradaBruta, P.entradaDeAr, t.capo.segmentosPorCanto);
  loft(ID.bocaNaEntrada, P.bocaNaEntrada, t.capo.segmentosPorCanto);
  subtrai(ID.entradaDeAr, ID.entradaBruta, ID.bocaNaEntrada);
  nomeia('entradaDeAr', ID.entradaDeAr);

  /* Os dois escapes, cada um com o furo de saída. */
  for (const escape of P.escapes) {
    const id = ID[escape.nome];
    loft(id.tubo, escape.tubo);
    loft(id.furo, escape.furo);
    subtrai(id.peca, id.tubo, id.furo);
    nomeia(escape.nome, id.peca);
  }

  return passos;
}

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha: os extremos do capô, da entrada de ar e de cada escape. */
export function pontosDeclarados(t = TABELA) {
  const tolerancia = 1;
  const estacoes = t.capo.estacoes;
  const capo = {
    min: [-Math.max(...estacoes.map((s) => s[1] / 2)), Math.min(...estacoes.map((s) => s[4] - s[2] / 2)), estacoes[0][0]],
    max: [Math.max(...estacoes.map((s) => s[1] / 2)), Math.max(...estacoes.map((s) => s[4] + s[2] / 2)), estacoes[estacoes.length - 1][0]],
  };
  const ea = t.entradaDeAr;
  const entrada = {
    min: [ea.inicio[0] - Math.max(...ea.estacoes.map((s) => s[1] / 2)), ea.inicio[1] - Math.max(...ea.estacoes.map((s) => s[2] / 2)), ea.inicio[2] + ea.estacoes[0][0]],
    max: [ea.inicio[0] + Math.max(...ea.estacoes.map((s) => s[1] / 2)), ea.inicio[1] + Math.max(...ea.estacoes.map((s) => s[2] / 2)), ea.inicio[2] + ea.estacoes[ea.estacoes.length - 1][0]],
  };
  const e = t.escape;
  /* A caixa do tubo: cada ponto da linha leva um disco de raio r perpendicular à direção dele, de meia extensão r * sqrt(1 - d²) em
     cada eixo. A tolerância é de 2 mm porque o polígono de 48 lados não toca o círculo entre dois vértices. */
  const caixaDoEscape = (lado) => {
    const linha = caminhoComCurva(pontosDoEscape(e, lado), e.raioCurva, e.passoDaCurva);
    const raio = e.diametro / 2;
    const discos = linha.map((p, i) => {
      const direcao = unitario(sub(linha[Math.min(i + 1, linha.length - 1)], linha[Math.max(i - 1, 0)]));
      return direcao.map((d, k) => [p[k] - raio * Math.sqrt(1 - d * d), p[k] + raio * Math.sqrt(1 - d * d)]);
    });
    return {
      min: [0, 1, 2].map((k) => Math.min(...discos.map((d) => d[k][0]))),
      max: [0, 1, 2].map((k) => Math.max(...discos.map((d) => d[k][1]))),
    };
  };
  const pontos = [
    { nome: 'ponta da frente do capô, embaixo e à esquerda', parte: 'capo', medida: 'minimo', em: capo.min, toleranciaMm: tolerancia },
    { nome: 'ponta de trás do capô, em cima e à direita', parte: 'capo', medida: 'maximo', em: capo.max, toleranciaMm: tolerancia },
    { nome: 'canto da frente, de baixo e da esquerda da entrada de ar', parte: 'entradaDeAr', medida: 'minimo', em: entrada.min, toleranciaMm: tolerancia },
    { nome: 'canto de trás, de cima e da direita da entrada de ar', parte: 'entradaDeAr', medida: 'maximo', em: entrada.max, toleranciaMm: tolerancia },
  ];
  for (const [nome, lado, rotulo] of [['escapeD', 1, 'direito'], ['escapeE', -1, 'esquerdo']]) {
    const caixa = caixaDoEscape(lado);
    pontos.push(
      { nome: `extremo mínimo do escape ${rotulo}`, parte: nome, medida: 'minimo', em: caixa.min, toleranciaMm: 2 },
      { nome: `extremo máximo do escape ${rotulo}`, parte: nome, medida: 'maximo', em: caixa.max, toleranciaMm: 2 },
    );
  }
  return pontos;
}

const receita = {
  meta: { nome: 'aviao/motor', desc: 'capô do motor do avião de pequeno porte, com a boca de ar, a entrada de ar e os dois escapes laterais' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'a proa do avião em z 0; o capô vai de z 592 a z 2377, a face da frente da fuselagem; y para cima com o chão em y 0; x para a direita do piloto' },
  PLANO: {
    objeto: 'motor de um avião monomotor de asa baixa e pequeno porte, da face da frente da fuselagem até o cone da hélice: o capô com a boca de ar, a entrada de ar sob ele e os dois escapes laterais',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
    ],
    escala: { medida: 'comprimento do capô no esboço, de z 592 a z 2377', milimetros: 1785 },
    partes: [
      {
        nome: 'capo',
        forma: 'capô liso por seções de retângulo arredondado, da face da frente da fuselagem, com 1450 por 1030 mm, até o cone da hélice, com a boca de ar recortada embaixo',
        tecnica: 'loft das seções do esboço com a curva suave entre elas, as pontas fechadas e sombreado liso, e a boca de ar recortada por subtrair',
      },
      {
        nome: 'entradaDeAr',
        forma: 'carenagem de 380 por 170 mm e 64 mm de comprimento, sob o capô, em volta da boca de ar, com a mesma boca de ar atravessando-a',
        tecnica: 'loft de duas seções de retângulo arredondado com as pontas fechadas, recortado pela boca de ar por subtrair e com sombreado liso',
      },
      ...[['escapeD', 'direito'], ['escapeE', 'esquerdo']].map(([nome, lado]) => ({
        nome,
        forma: `escape do lado ${lado}: tubo de 200 mm de diâmetro que sai do flanco do capô para o lado e se curva para trás, com o furo de saída aberto na ponta`,
        tecnica: 'tubo por loft de seções circulares ao longo de um caminho com curva de 130 mm de raio, as pontas fechadas, o furo de saída recortado por subtrair e sombreado liso',
      })),
    ],
    criteriosDeReprovacao: [
      'capô facetado, ou com degrau visível entre seções, em vez de liso',
      'capô que não assenta na face da frente da fuselagem, com fresta ou degrau na junta',
      'boca de ar ou escape sem abertura',
      'parte solta, que não encosta no capô',
      'o REFINA acusando parte fora do envelope do volume dela',
    ],
  },
  contatos: [
    { par: ['entradaDeAr', 'capo'], motivo: 'a carenagem da entrada de ar entra pela parede do lábio do capô e a boca de ar atravessa as duas' },
    { par: ['escapeD', 'capo'], motivo: 'o escape direito sai do flanco do capô, onde o tubo começa dentro dele' },
    { par: ['escapeE', 'capo'], motivo: 'o escape esquerdo sai do flanco do capô, onde o tubo começa dentro dele' },
  ],
  /* O capô tem um furo passante, a boca de ar que entra pela parede do lábio e sai pela face de trás; a carenagem, um anel. */
  formas: {
    capo: { furos: 1 },
    entradaDeAr: { furos: 1 },
    escapeD: 'solido',
    escapeE: 'solido',
  },
  REFINA: {
    andaime: '../../andaime.json',
    partes: {
      capo: 'capo',
      entradaDeAr: 'entrada-de-ar',
      escapeD: 'escape-d',
      escapeE: 'escape-e',
    },
    tolerancia: { envelope: 5, porta: 0.5 },
  },
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
