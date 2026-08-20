#!/usr/bin/env node
/* quarto-dianteiro.mjs — a cage do quarto dianteiro da prova P2. Derivada dos
   landmarks de docs/mecanifica/CHASSI-P0-ALVO-E-LIMIARES.md, não escrita à mão:
   a cage é hipótese sobre como atingir o alvo, então ela nasce do alvo.

   Meia carroceria em x >= 0; o espelho é da compilação. Privada e descartável. */

/* --- alvo de P0, em milímetros --------------------------------------------- */
import { fita, orientarConsistente, apontarParaFora } from './cage.mjs';

export const ALVO = {
  zNariz: 2265, yNariz: 520,
  zCowl: 480, yCowl: 980,          // L04, base do para-brisa
  zEixo: 1325,
  ombroX: 965, ombroY: 900,        // L13
  arcoTopo: 725,                   // L14
  rodaRaio: 340, arcoRaio: 385, rodaX: 830,
  soleiraX: 925, soleiraY: 145,    // L11
  alturaLivre: 105,
  cristaZ: 1325, cristaY: 880,     // crista do capô, da prancha do P0
};

const lerp = (a, b, t) => a + (b - a) * t;
const suavizar = (t) => t * t * (3 - 2 * t);

/* PERFIL — a seção deixa de ser tabela de coordenadas e passa a ser um punhado
   de grandezas com nome. Esta é a correção da rodada Q9.

   As duas versões anteriores eram 80 números digitados à mão, e as duas
   produziram o mesmo defeito por baixo de sintomas diferentes: NINGUÉM confere
   convexidade nem volume olhando uma tabela. A Q7 digitou uma calha no capô; a
   Q8 corrigiu a calha e o flanco continuou uma parede — de x=965 a x=850 em
   750 mm de altura, 115 mm de variação, chapa vertical. Vinco numa chapa não
   faz caráter, faz um vinco numa chapa.

   Aqui eu edito `bojoDoCapo` e `larguraMax`, não oitenta coordenadas. O que dá
   volume ao para-lama é `larguraMax` ficar FORA da crista: a superfície sai da
   crista, incha por cima da roda e recolhe na soleira. Era exatamente isso que
   não existia. */
export const PERFIL = [
  /* z, capô no eixo de simetria, crista do para-lama, bojo do capô sobre a
     corda, ponto mais largo do flanco (e a que altura, entre soleira e crista),
     soleira. Milímetros.

     A LARGURA DA FRENTE é correção da rodada Q11. Até aqui o nariz tinha 300 mm
     de meia largura contra 965 na cowl: 600 mm de frente para um corpo de
     1930 mm. Isso é um cone, e é a razão de a peça ler como barraca de lona em
     toda vista. O P0 não tem landmark de largura do nariz — só o ponto no eixo
     de simetria, L01 — e eu preenchi o vazio com um número que nunca olhei.

     `alturaDaLarguraMax` é correção da rodada Q12, e o P0 já tinha dado o
     número: L13 põe o ombro em (965, 900) e L12 a largura máxima em (1000, 850)
     — 35 mm para fora e 50 mm abaixo, ou seja o ponto mais largo encosta na
     crista. Eu tinha escrito 0,45, no meio da altura, e isso transforma o
     flanco num barril e ENGOLE a crista: a linha de caráter vira inflexão
     macia, porque o volume que deveria estar sob ela está no meio do lado. */
  { z: 2265, centro: 520, crista: [806, 505], bojoDoCapo: 12, larguraMax: 830, alturaDaLarguraMax: 0.88, soleira: [744, 150] },
  { z: 1900, centro: 742, crista: [906, 742], bojoDoCapo: 22, larguraMax: 940, alturaDaLarguraMax: 0.90, soleira: [800, 158] },
  { z: 1325, centro: 880, crista: [965, 900], bojoDoCapo: 26, larguraMax: 1000, alturaDaLarguraMax: 0.93, soleira: [830, 152] },
  { z: 480, centro: 980, crista: [958, 992], bojoDoCapo: 22, larguraMax: 994, alturaDaLarguraMax: 0.92, soleira: [858, 154] },
];

/* Onde cada anel cai. Anéis 1..3 repartem o capô, o 4 é a crista, os 5..8
   percorrem o flanco e o 9 é a soleira. */
const FRACOES_DO_CAPO = [0.31, 0.62, 0.83];
/* Frações de ALTURA entre crista e soleira. Adensadas em cima, que é onde
   estão a largura máxima e o recolhimento do ombro. */
const FRACOES_DO_FLANCO = [0.10, 0.28, 0.55, 0.80];
const ANEL_CRISTA = 4;

/* Flanco parametrizado pela ALTURA, não por um parâmetro de curva.

   A primeira versão era uma Bézier quadrática forçada a passar pelo ponto mais
   largo em t = 0,5. Com o ponto mais largo encostado na crista — que é onde o
   P0 o coloca, 50 mm abaixo do ombro — o ponto de controle precisa estourar
   para cima, e o flanco subia 55 mm ACIMA da crista: em z = 1325 a crista dava
   (965, 900) e o anel seguinte (1001, 955). A condição 3 pegou isso como
   segunda quebra de tangente, que é exatamente o que era.

   Aqui y desce monotonicamente da crista à soleira e x sai de uma interpolação
   de Lagrange pelos três pontos que têm nome: crista, largura máxima e soleira.
   Overshoot em y deixa de ser possível por construção. */
function xNaAltura(y, crista, largo, soleira) {
  /* Duas quedas a partir da largura máxima: para cima até a crista, para baixo
     até a soleira. Assim o ponto mais largo É o mais largo, e fica na altura
     declarada.

     Interpolação de Lagrange pelos três pontos não serve: a parábola que passa
     por (900, 965), (848, 1000) e (152, 830) tem vértice em y ≈ 700 com
     x ≈ 1065, ou seja estoura 65 mm além do teto de meia largura do P0 e põe o
     ponto mais largo onde ninguém pediu. */
  const queda = (a, b, u, p) => a - (a - b) * Math.pow(Math.min(1, Math.max(0, u)), p);
  if (y >= largo[1]) return queda(largo[0], crista[0], (y - largo[1]) / ((crista[1] - largo[1]) || 1), 1.8);
  return queda(largo[0], soleira[0], (largo[1] - y) / ((largo[1] - soleira[1]) || 1), 1.6);
}

/* Avalia um perfil numa seção de dez anéis. */
export function secaoDoPerfil(q) {
  const [cx, cy] = q.crista;
  const pts = [[0, q.centro]];
  for (const f of FRACOES_DO_CAPO) {
    const x = cx * f;
    const naCorda = q.centro + (cy - q.centro) * f;
    pts.push([Math.round(x), Math.round(naCorda + q.bojoDoCapo * Math.sin(Math.PI * Math.pow(f, 0.85)))]);
  }
  pts.push([cx, cy]);
  const largo = [q.larguraMax, q.soleira[1] + (cy - q.soleira[1]) * q.alturaDaLarguraMax];
  for (const t of FRACOES_DO_FLANCO) {
    const y = cy + (q.soleira[1] - cy) * t;
    pts.push([Math.round(xNaAltura(y, q.crista, largo, q.soleira)), Math.round(y)]);
  }
  pts.push(q.soleira.slice());
  return pts;
}

const interp = (a, b, t) => a + (b - a) * t;

/* Interpola os PARÂMETROS entre estações-chave e só então avalia a seção.
   Interpolar parâmetro preserva o significado; interpolar coordenada não. */
function perfilEm(z) {
  const o = PERFIL;
  if (z >= o[0].z) return o[0];
  if (z <= o[o.length - 1].z) return o[o.length - 1];
  for (let i = 0; i < o.length - 1; i += 1) {
    const a = o[i];
    const b = o[i + 1];
    if (z <= a.z && z >= b.z) {
      const t = (a.z - z) / (a.z - b.z);
      return {
        z,
        centro: interp(a.centro, b.centro, t),
        crista: [interp(a.crista[0], b.crista[0], t), interp(a.crista[1], b.crista[1], t)],
        bojoDoCapo: interp(a.bojoDoCapo, b.bojoDoCapo, t),
        larguraMax: interp(a.larguraMax, b.larguraMax, t),
        alturaDaLarguraMax: interp(a.alturaDaLarguraMax, b.alturaDaLarguraMax, t),
        soleira: [interp(a.soleira[0], b.soleira[0], t), interp(a.soleira[1], b.soleira[1], t)],
      };
    }
  }
  return o[o.length - 1];
}

/* As seções continuam sendo o contrato conferido pela cage; o que mudou é que
   agora elas são DERIVADAS do perfil, não digitadas. */
export const SECOES = [2265, 2100, 1900, 1600, 1325, 1000, 700, 480]
  .map((z) => ({ z, pts: secaoDoPerfil(perfilEm(z)) }));

const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/* Interpola entre as seções declaradas. Loft entre seções ESCRITAS é diferente
   de varredura de envelope: as seções são o contrato, e a estação intermediária
   é a interpolação delas, não uma elipse esticada. */
function secao(z) {
  const ordem = SECOES;
  if (z >= ordem[0].z) return ordem[0].pts;
  if (z <= ordem[ordem.length - 1].z) return ordem[ordem.length - 1].pts;
  for (let i = 0; i < ordem.length - 1; i += 1) {
    const a = ordem[i];
    const b = ordem[i + 1];
    if (z <= a.z && z >= b.z) {
      /* Interpolação LINEAR entre seções, não smoothstep. Smoothstep zera a
         derivada em cada estação declarada, o que faz o loft "parar" em toda
         seção e produz crista serrilhada — visível assim que o vinco tornou a
         crista nítida. A suavidade é trabalho da subdivisão, não da
         interpolação. */
      const t = (a.z - z) / (a.z - b.z);
      return a.pts.map((p, k) => lerp2(p, b.pts[k], t));
    }
  }
  return ordem[ordem.length - 1].pts;
}

/* Estações medidas, sem apoio junto ao nariz. Tentei 2245 e 2215 como loops de
   apoio e PIOROU: o diedro máximo subiu de 39° para 79°, porque o canto
   dianteiro é um canto de verdade e mais densidade só o revela mais afiado. Sem
   vinco nenhum e sem apoio ele ainda dá 29,6°. Não é amostragem. */
const ESTACOES = [2265, 2180, 2100, 1980, 1900, 1750, 1600, 1460, 1325, 1180, 1000, 850, 700, 590, 480];
const ANEIS = 10;

/* --- montagem da cage ------------------------------------------------------ */
export function construirQuartoDianteiro({ retornoDeBorda = 26, recorteFarol = 42 } = {}) {
  const V = new Map();
  const F = new Map();
  const vincos = new Map();
  const grade = [];               // grade[i][j] = id do vértice
  let proximo = 0;

  for (let i = 0; i < ESTACOES.length; i += 1) {
    const z = ESTACOES[i];
    const pts = secao(z);
    const linha = [];
    for (let j = 0; j < ANEIS; j += 1) {
      V.set(proximo, [pts[j][0], pts[j][1], z]);
      linha.push(proximo);
      proximo += 1;
    }
    grade.push(linha);
  }

  /* Nome de região por posição: capô perto do centro, para-lama na quebra do
     ombro, lateral abaixo. Vocabulário de domínio vive AQUI, nunca no motor. */
  const regiao = (i, j) => {
    const z = (ESTACOES[i] + ESTACOES[i + 1]) / 2;
    if (j <= 2) return 'capo';
    if (j === 3) return z > 900 ? 'paralamaDianteiro' : 'capo';
    if (j <= 5) return z > 900 ? 'paralamaDianteiro' : 'lateralDianteira';
    return 'lateralDianteira';
  };

  /* Abertura do arco: face cujo centro cai dentro do círculo do arco, medido no
     plano z–y, sai da malha. É abertura de verdade, não borda de envelope. */
  /* Início do vão envidraçado: as células do alto da última baia saem, e o
     buraco ganha moldura de retorno. Antes disto o "vão" era um deslocamento de
     26 mm dos vértices da borda da grade — superfície escurecida, que é
     literalmente a condição 7 de rejeição do P0. Abertura é topologia. */
  const VAO = { i: ESTACOES.length - 2, j0: 0, j1: 2 };
  const noVao = (i, j) => i === VAO.i && j >= VAO.j0 && j <= VAO.j1;

  const dentroDoArco = (i, j) => {
    const zs = [ESTACOES[i], ESTACOES[i + 1]];
    const ids = [grade[i][j], grade[i][j + 1], grade[i + 1][j + 1], grade[i + 1][j]];
    const ys = ids.map((id) => V.get(id)[1]);
    const zc = (zs[0] + zs[1]) / 2;
    const yc = ys.reduce((a, b) => a + b, 0) / 4;
    return Math.hypot(zc - ALVO.zEixo, yc - ALVO.rodaRaio) < ALVO.arcoRaio;
  };

  let idF = 0;
  const removidas = [];
  for (let i = 0; i < ESTACOES.length - 1; i += 1) {
    for (let j = 0; j < ANEIS - 1; j += 1) {
      if (dentroDoArco(i, j) || noVao(i, j)) { removidas.push([i, j]); continue; }
      F.set(idF, {
        id: idF,
        vs: [grade[i][j], grade[i][j + 1], grade[i + 1][j + 1], grade[i + 1][j]],
        parte: regiao(i, j),
      });
      idF += 1;
    }
  }

  /* Só o contorno DO ARCO. Com o vão envidraçado aberto na mesma passada, a
     busca por arestas de uma face só devolvia as duas aberturas juntas, e o
     retorno de borda do arco acabava construído também na borda do para-brisa —
     três faces na mesma aresta, pele não manifold. */
  const contorno = arestasDeBorda(F, grade, (a, b) => {
    const [pa, pb] = [V.get(a), V.get(b)];
    const zc = (pa[2] + pb[2]) / 2;
    const yc = (pa[1] + pb[1]) / 2;
    return Math.hypot(zc - ALVO.zEixo, yc - ALVO.rodaRaio) < ALVO.arcoRaio + 120;
  });

  /* O contorno do buraco é PROJETADO no círculo do arco. Sem isto a abertura é a
     união das células removidas — um entalhe retangular, que a subdivisão apenas
     arredonda nos cantos. P0 pede arco de roda, não entalhe. Só os vértices que
     não estão na moldura da grade se movem: a soleira limita o arco por baixo e
     não deve ser puxada. */
  const naMolduraInferior = new Set(grade.map((l) => l[l.length - 1]));
  for (const v of contorno.vertices) {
    if (naMolduraInferior.has(v)) continue;
    const p = V.get(v);
    const dz = p[2] - ALVO.zEixo;
    const dy = p[1] - ALVO.rodaRaio;
    const n = Math.hypot(dz, dy);
    if (n < 1e-6) continue;
    V.set(v, [p[0], ALVO.rodaRaio + (dy / n) * ALVO.arcoRaio, ALVO.zEixo + (dz / n) * ALVO.arcoRaio]);
  }

  /* Retorno de borda: cada aresta do contorno ganha uma fita para dentro. É o
     que P0 exige e o que separa abertura de recorte pintado. */
  const dentro = new Map();
  for (const v of contorno.vertices) {
    const p = V.get(v);
    const dz = p[2] - ALVO.zEixo;
    const dy = p[1] - ALVO.rodaRaio;
    const n = Math.hypot(dz, dy) || 1;
    V.set(proximo, [p[0] - retornoDeBorda * 0.55, p[1] - (dy / n) * retornoDeBorda, p[2] - (dz / n) * retornoDeBorda]);
    dentro.set(v, proximo);
    proximo += 1;
  }
  {
    const r = fita(F, contorno.arestas, dentro, 'arcoDianteiroRetorno', idF);
    for (const f of r.feitas) F.set(f.id, f);
    idF = r.idF;
  }

  /* FRENTE DO CARRO. z = 2265 não é plano de corte da prova — é onde o carro
     acaba. Sem esta tampa a peça é uma casca aberta e a vista frontal mostra o
     interior da superfície do outro lado: foi isso que o usuário viu como
     "muito estranho, não sei explicar", depois de eu ter registrado o corte reto
     como defeito conhecido e continuado a entregar renders assim mesmo.

     A fáscia é uma GRADE de verdade, não um colapso para x = 0. A primeira
     versão escalava todos os anéis do nariz em direção à costura, inclusive os
     anéis 0 a 4, que já estão espalhados em x ao longo do alto do capô — o
     resultado era uma aba dobrada sobre si mesma, e nenhum recorte de farol
     cabia nela: a parede do rebaixo saía a 157° da fáscia, quase paralela.

     Aqui as colunas vêm dos anéis do capô, que dão o x, e as linhas vêm dos
     anéis do flanco, que dão o y. A coluna de fora É o flanco do nariz e a
     linha de cima É o lábio do capô, então a tampa casa com a pele sem costura
     inventada. Sem booleana, como a pele exige. */
  const FRENTE_COLUNAS = ANEL_CRISTA + 1;               // anéis 0..4, o alto do capô
  const FRENTE_LINHAS = ANEIS - ANEL_CRISTA;            // anéis 4..9, o flanco
  const recuoDaFascia = 78;
  const anelDoNariz = grade[0];
  const xDoNariz = anelDoNariz.map((v) => V.get(v)[0]);
  const yDoNariz = anelDoNariz.map((v) => V.get(v)[1]);
  const larguraNaCrista = xDoNariz[ANEL_CRISTA] || 1;

  /* Recuo nulo na borda que encosta na pele — coluna de fora e linha de cima —
     e crescendo pelo PRODUTO das duas distâncias, não pelo mínimo. Com o
     mínimo, a célula diagonalmente vizinha da quina recuava metade de uma vez
     só, e a quina dianteira superior externa saía como lasca: 166° entre as
     normais da pele e da fáscia, ou seja 14° de abertura. */
  const rampa = (u) => { const t = Math.min(1, Math.max(0, u)); return t * t * (3 - 2 * t); };
  /* A rampa corre em MILÍMETROS, não em índice de célula. As linhas da fáscia
     são desigualmente espaçadas — 35 mm entre a primeira e a segunda, 96 mm
     entre a terceira e a quarta — então rampa por índice enfia 39 mm de recuo
     em 35 mm de altura e produz uma parede de 48° dentro do painel. Foi o que a
     condição 8 vinha acusando, e não era amostragem: era forma. */
  const ALCANCE_ABAIXO = 170;
  const ALCANCE_PARA_DENTRO = 260;
  const recuoDe = (x, y, xNaLinha) => recuoDaFascia
    * rampa((yDoNariz[ANEL_CRISTA] - y) / ALCANCE_ABAIXO)
    * rampa((xNaLinha - x) / ALCANCE_PARA_DENTRO);

  const fascia = [];
  for (let b = 0; b < FRENTE_LINHAS; b += 1) {
    const anel = ANEL_CRISTA + b;
    const linha = [];
    for (let a = 0; a < FRENTE_COLUNAS; a += 1) {
      if (b === 0) { linha.push(anelDoNariz[a]); continue; }          // o lábio do capô
      if (a === FRENTE_COLUNAS - 1) { linha.push(anelDoNariz[anel]); continue; } // o flanco
      const x = xDoNariz[a] * (xDoNariz[anel] / larguraNaCrista);
      const y = yDoNariz[anel];
      V.set(proximo, [x, y, ALVO.zNariz - recuoDe(x, y, xDoNariz[anel])]);
      linha.push(proximo);
      proximo += 1;
    }
    fascia.push(linha);
  }
  /* GRELHA: um bloco de células da fáscia sai e vira caixa recuada. Sem
     abertura central a frente lê como caixa fechada — o crítico cego, sem saber
     o que era, chamou a fáscia de artefato de renderização. Abertura é
     topologia, aqui como no arco e no vão envidraçado. */
  const GRELHA = { a0: 0, a1: 2, b0: 1, b1: 3, fundo: 115 };
  const naGrelha = (a, b) => a >= GRELHA.a0 && a < GRELHA.a1 && b >= GRELHA.b0 && b < GRELHA.b1;

  for (let b = 0; b < FRENTE_LINHAS - 1; b += 1) {
    for (let a = 0; a < FRENTE_COLUNAS - 1; a += 1) {
      if (naGrelha(a, b)) continue;
      F.set(idF, {
        id: idF,
        /* Enrolamento TRANSPOSTO em relação à pele: nas faces do corpo o
           primeiro índice é a estação e o segundo o anel; aqui o primeiro é o
           anel. Listar na mesma ordem invertia a normal, e o diedro entre pele
           e fáscia lia 168° — que é 180 menos os 12° reais da quina. */
        vs: [fascia[b][a], fascia[b + 1][a], fascia[b + 1][a + 1], fascia[b][a + 1]],
        parte: 'fasciaDianteira',
      });
      idF += 1;
    }
  }

  /* Fundo e paredes da grelha. A caixa fecha atrás, então não há borda livre
     nova: a abertura tem profundidade, não é mancha escura. */
  const fundoDaGrelha = [];
  for (let b = GRELHA.b0; b <= GRELHA.b1; b += 1) {
    const linha = [];
    for (let a = GRELHA.a0; a <= GRELHA.a1; a += 1) {
      const q = V.get(fascia[b][a]);
      V.set(proximo, [q[0], q[1], q[2] - GRELHA.fundo]);
      linha.push(proximo);
      proximo += 1;
    }
    fundoDaGrelha.push(linha);
  }
  {
    /* Anel da abertura, em ordem de caminhada. */
    const anel = [];
    const parceiro = new Map();
    const por = (b, a) => {
      anel.push(fascia[b][a]);
      parceiro.set(fascia[b][a], fundoDaGrelha[b - GRELHA.b0][a - GRELHA.a0]);
    };
    for (let a = GRELHA.a0; a <= GRELHA.a1; a += 1) por(GRELHA.b0, a);
    for (let b = GRELHA.b0 + 1; b <= GRELHA.b1; b += 1) por(b, GRELHA.a1);
    for (let a = GRELHA.a1 - 1; a >= GRELHA.a0; a -= 1) por(GRELHA.b1, a);
    for (let b = GRELHA.b1 - 1; b > GRELHA.b0; b -= 1) por(b, GRELHA.a0);
    /* Sem parede no PLANO DE SIMETRIA: a grelha é central e atravessa x = 0.
       Fechá-la ali fazia as duas metades empilharem parede depois de espelhar —
       quatro faces na mesma aresta. */
    const noEixo = (v) => Math.abs(V.get(v)[0]) < 1e-6;
    const arestas = anel
      .map((v, i) => [v, anel[(i + 1) % anel.length]])
      .filter(([a, b]) => !(noEixo(a) && noEixo(b)));
    const r = fita(F, arestas, parceiro, 'grelhaParede', idF);
    for (const f of r.feitas) F.set(f.id, f);
    idF = r.idF;
    /* Nitidez 3, o teto do contrato: o aro tem de continuar agudo no nível de publicação. Com 2 ele
       expira antes e a subdivisão arredonda a caixa até virar amassado — a
       abertura existia na topologia e não se lia na imagem. */
    for (const [a, b] of arestas) vincos.set(chave(a, b), 3);
  }
  for (let b = 0; b < fundoDaGrelha.length - 1; b += 1) {
    for (let a = 0; a < fundoDaGrelha[0].length - 1; a += 1) {
      F.set(idF, {
        id: idF,
        /* Enrolamento invertido em relação à fáscia: o fundo da caixa olha na
           direção oposta à pele, e o validador de orientação apontou as oito
           arestas em que ele discordava das paredes. */
        vs: [fundoDaGrelha[b][a], fundoDaGrelha[b + 1][a], fundoDaGrelha[b + 1][a + 1], fundoDaGrelha[b][a + 1]],
        parte: 'grelhaFundo',
      });
      idF += 1;
    }
  }

  /* Moldura do vão envidraçado. A borda dianteira e a de fora do buraco ganham
     uma fita que desce e corre até o plano da cowl — é o requadro do para-brisa
     caindo no painel corta-vento. A borda de trás é o corte da prova, e fica
     aberta por isso, não por descuido. */
  const bordaDoVao = [];
  for (let j = VAO.j0; j <= VAO.j1 + 1; j += 1) bordaDoVao.push(grade[VAO.i][j]);
  bordaDoVao.push(grade[VAO.i + 1][VAO.j1 + 1]);
  const molduraDoVao = bordaDoVao.map((v) => {
    const p = V.get(v);
    V.set(proximo, [p[0], p[1] - 40, ALVO.zCowl]);
    proximo += 1;
    return proximo - 1;
  });
  {
    const parceiro = new Map(bordaDoVao.map((v, i) => [v, molduraDoVao[i]]));
    const arestas = bordaDoVao.slice(0, -1).map((v, i) => [v, bordaDoVao[i + 1]]);
    const r = fita(F, arestas, parceiro, 'vaoEnvidracadoRetorno', idF);
    for (const f of r.feitas) F.set(f.id, f);
    idF = r.idF;
  }
  for (let i = 0; i < bordaDoVao.length - 1; i += 1) {
    vincos.set(chave(bordaDoVao[i], bordaDoVao[i + 1]), 2);
  }

  /* RECORTE DE FAROL, na FÁSCIA — não no capô.

     Até a rodada Q12 o "farol" era um bloco de células do capô que recuava: um
     amassado no meio da tampa do motor, a meio metro de onde um farol fica. A
     condição 6 aprovava porque só perguntava se existia recuo em algum lugar,
     nunca onde. Detector verdadeiro e cego. */
  const FAROL = { a0: 2, a1: 3, b0: 1, b1: 3 };
  const bordaFarol = [];
  for (let b = FAROL.b0; b <= FAROL.b1; b += 1) {
    for (let a = FAROL.a0; a <= FAROL.a1; a += 1) {
      const v = fascia[b][a];
      const q = V.get(v);
      V.set(v, [q[0], q[1], q[2] - recorteFarol]);
    }
    bordaFarol.push(fascia[b][FAROL.a0], fascia[b][FAROL.a1]);
  }
  for (let b = FAROL.b0; b < FAROL.b1; b += 1) {
    vincos.set(chave(fascia[b][FAROL.a0], fascia[b + 1][FAROL.a0]), 3);
    vincos.set(chave(fascia[b][FAROL.a1], fascia[b + 1][FAROL.a1]), 3);
  }

  /* Vincos. Uma linha de caráter é um vinco semi-agudo sobre um loop, não uma
     fileira extra de geometria — P0 e P1 dizem isso, e é o que se faz aqui. */
  const loopOmbro = grade.map((l) => l[ANEL_CRISTA]);
  /* A linha de caráter MORRE antes do canto dianteiro. Num carro ela se apaga
     ao virar a quina do para-lama; levada até o anel do nariz ela encontra a
     tampa em ângulo e vira uma ponta aguda. As duas primeiras estações ficam
     sem vinco, e a terceira entra com metade da nitidez. */
  const NITIDEZ_DA_CRISTA = [0, 0, 1, 2];
  for (let i = 0; i < loopOmbro.length - 1; i += 1) {
    const n = NITIDEZ_DA_CRISTA[Math.min(i, NITIDEZ_DA_CRISTA.length - 1)];
    if (n > 0) vincos.set(chave(loopOmbro[i], loopOmbro[i + 1]), n);
  }
  /* A borda do arco é aguda pelo retorno; o retorno em si é vinco cheio. */
  for (const [a, b] of contorno.arestas) vincos.set(chave(a, b), 2);

  /* Loop é caminho contínuo, e o arco INTERROMPE a cintura: a soleira não passa
     por dentro da abertura de roda. Em vez de declarar um caminho que salta o
     buraco, os loops são quebrados nos trechos que realmente existem. Foi o
     validador que apontou; a geometria estava certa, a declaração é que mentia. */
  const arestasVivas = new Set();
  for (const f of F.values()) {
    for (let i = 0; i < 4; i += 1) arestasVivas.add(chave(f.vs[i], f.vs[(i + 1) % 4]));
  }
  const trechos = (caminho) => {
    const saida = [];
    let atual = [caminho[0]];
    for (let i = 1; i < caminho.length; i += 1) {
      if (arestasVivas.has(chave(caminho[i - 1], caminho[i]))) atual.push(caminho[i]);
      else { if (atual.length > 1) saida.push(atual); atual = [caminho[i]]; }
    }
    if (atual.length > 1) saida.push(atual);
    return saida;
  };
  const nomear = (base, caminho) => {
    const ts = trechos(caminho);
    return ts.length === 1
      ? { [base]: { v: ts[0], fechado: false } }
      : Object.fromEntries(ts.map((t, i) => [`${base}${i + 1}`, { v: t, fechado: false }]));
  };

  /* O lábio do capô é linha de caráter, não sobra de amostragem: é a aresta em
     que a tampa do motor vira fáscia. Declarado como loop e com vinco, ele
     passa a ser decisão de forma; sem isso a condição 8 lia os 40° da quina
     como facetamento. */
  for (let a = 0; a < ANEL_CRISTA; a += 1) {
    vincos.set(chave(anelDoNariz[a], anelDoNariz[a + 1]), 1);
  }

  /* A quina dianteira — onde a fáscia encontra o flanco — também é linha de
     caráter. Medida ao longo dos níveis ela não some: 61° no nível 1, 33° no 2,
     30° no 3. Isso é aresta convergindo, não amostragem grosseira. Declarar o
     que a forma É vale mais que perseguir o número. */
  const quinaDianteira = fascia.map((linha) => linha[FRENTE_COLUNAS - 1]);
  for (let i = 0; i < quinaDianteira.length - 1; i += 1) {
    vincos.set(chave(quinaDianteira[i], quinaDianteira[i + 1]), 1);
  }

  const loops = {
    quinaDianteira: { v: quinaDianteira, fechado: false },
    labioDoCapo: { v: anelDoNariz.slice(0, ANEL_CRISTA + 1), fechado: false },
    ...nomear('linhaDeOmbro', loopOmbro),
    ...nomear('cintura', grade.map((l) => l[7])),
    ...nomear('cristaParalama', grade.map((l) => l[3])),
    /* Aberto, não fechado: a soleira limita o arco por baixo. */
    arcoDianteiro: { v: contorno.ciclo, fechado: false },
    baseParabrisa: { v: bordaDoVao, fechado: false },
    ...nomear('recorteFarol', bordaFarol),
  };

  orientarConsistente(F);
  apontarParaFora(V, F);

  return {
    formato: 'mecanifica.cage-quad@1',
    V, F, vincos, loops,
    /* A seção declarada volta como CONFERÊNCIA da cage, fechando o laço que P1
       pediu: a cage é hipótese e a seção é o alvo contra o qual ela é medida. */
    secoes: SECOES.filter((s) => ESTACOES.includes(s.z))
      .map((s) => ({ z: s.z, contorno: s.pts, tolerancia: 8, janela: 1, apenas: grade.flat() })),
    simetria: { plano: 'x', autorada: 'x >= 0' },
    /* Estações atravessadas por abertura declarada, para quem confere não
       confundir borda de vão com quebra de superfície. */
    aberturas: [{ nome: 'vaoEnvidracado', estacao: VAO.i }, { nome: 'vaoEnvidracado', estacao: VAO.i + 1 }],
    grade,
    arcoRemovido: removidas.length,
  };
}

const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/* Arestas que sobraram com uma face só e NÃO estão na moldura externa da grade:
   é o contorno do buraco do arco. */
function arestasDeBorda(F, grade, aceita = () => true) {
  const conta = new Map();
  for (const f of F.values()) {
    for (let i = 0; i < 4; i += 1) {
      const k = chave(f.vs[i], f.vs[(i + 1) % 4]);
      conta.set(k, (conta.get(k) ?? 0) + 1);
    }
  }
  const naMoldura = new Set();
  const ultimaLinha = grade.length - 1;
  const ultimoAnel = grade[0].length - 1;
  for (let i = 0; i < grade.length; i += 1) {
    for (let j = 0; j < grade[i].length; j += 1) {
      if (j < ultimoAnel && (i === 0 || i === ultimaLinha)) naMoldura.add(chave(grade[i][j], grade[i][j + 1]));
      if (i < ultimaLinha && (j === 0 || j === ultimoAnel)) naMoldura.add(chave(grade[i][j], grade[i + 1][j]));
    }
  }
  const arestas = [];
  const vizinho = new Map();
  for (const [k, n] of [...conta.entries()].sort()) {
    if (n !== 1 || naMoldura.has(k)) continue;
    const [a, b] = k.split('|').map(Number);
    if (!aceita(a, b)) continue;
    arestas.push([a, b]);
    if (!vizinho.has(a)) vizinho.set(a, []);
    if (!vizinho.has(b)) vizinho.set(b, []);
    vizinho.get(a).push(b);
    vizinho.get(b).push(a);
  }

  /* Caminha a borda para devolver um CICLO ordenado. Ordenar ids não produz
     caminho: produz uma lista que salta de um lado do buraco para o outro. */
  const ciclo = [];
  if (arestas.length) {
    /* Começa por uma PONTA quando existe. O arco de roda corta a aresta inferior
       da grade, então a abertura é um arco ABERTO, limitado embaixo pela soleira
       — como num carro de verdade. Começar pelo menor id fazia a caminhada
       partir do meio e não fechar. */
    const pontas = [...vizinho.entries()].filter(([, vs]) => vs.length === 1).map(([v]) => v).sort((a, b) => a - b);
    const inicio = pontas.length ? pontas[0] : Math.min(...vizinho.keys());
    let atual = inicio;
    let anterior = null;
    const seguros = arestas.length + 2;
    while (ciclo.length < seguros) {
      ciclo.push(atual);
      const vs = (vizinho.get(atual) ?? []).filter((v) => v !== anterior);
      if (vs.length === 0) break;
      anterior = atual;
      atual = vs[0];
      if (atual === inicio) break;
    }
  }
  return { arestas, ciclo, vertices: [...vizinho.keys()].sort((a, b) => a - b) };
}
