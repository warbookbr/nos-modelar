#!/usr/bin/env node
/* quarto-dianteiro.mjs — a cage do quarto dianteiro da prova P2. Derivada dos
   landmarks de docs/mecanifica/CHASSI-P0-ALVO-E-LIMIARES.md, não escrita à mão:
   a cage é hipótese sobre como atingir o alvo, então ela nasce do alvo.

   Meia carroceria em x >= 0; o espelho é da compilação. Privada e descartável. */

/* --- alvo de P0, em milímetros --------------------------------------------- */
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
      if (dentroDoArco(i, j)) { removidas.push([i, j]); continue; }
      F.set(idF, {
        id: idF,
        vs: [grade[i][j], grade[i][j + 1], grade[i + 1][j + 1], grade[i + 1][j]],
        parte: regiao(i, j),
      });
      idF += 1;
    }
  }

  const contorno = arestasDeBorda(F, grade);

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
  for (const [a, b] of contorno.arestas) {
    F.set(idF, { id: idF, vs: [a, b, dentro.get(b), dentro.get(a)], parte: 'arcoDianteiroRetorno' });
    idF += 1;
  }

  /* Recorte de farol: conformado, não decalque. Um bloco de células do capô
     externo recua ao longo da própria normal aproximada, e a borda do recuo
     ganha vinco — é o rebaixo que a luz denuncia numa vista próxima. */
  const farol = { i0: 1, i1: 3, j0: 2, j1: 4, fundo: recorteFarol };
  const noFarol = new Set();
  for (let i = farol.i0; i <= farol.i1; i += 1) {
    for (let j = farol.j0; j <= farol.j1; j += 1) noFarol.add(grade[i][j]);
  }
  for (const v of noFarol) {
    const p = V.get(v);
    V.set(v, [p[0] - farol.fundo * 0.35, p[1] - farol.fundo * 0.55, p[2] - farol.fundo * 0.75]);
  }
  const bordaFarol = [];
  for (let i = farol.i0; i <= farol.i1; i += 1) bordaFarol.push(grade[i][farol.j0], grade[i][farol.j1]);
  for (let i = farol.i0; i < farol.i1; i += 1) {
    vincos.set(chave(grade[i][farol.j0], grade[i + 1][farol.j0]), 2);
    vincos.set(chave(grade[i][farol.j1], grade[i + 1][farol.j1]), 2);
  }

  /* Início do vão envidraçado: a base do para-brisa recua e o canto dianteiro da
     janela lateral abre. O vão é loop fechado com moldura de retorno, sem
     booleana — a mesma regra do arco. */
  const ult = grade.length - 1;
  for (let j = 0; j <= 3; j += 1) {
    const v = grade[ult][j];
    const p = V.get(v);
    V.set(v, [p[0], p[1] + 26, p[2] - 14]);
    if (j < 3) vincos.set(chave(grade[ult][j], grade[ult][j + 1]), 1.8);
  }

  /* FRENTE DO CARRO. z = 2265 não é plano de corte da prova — é onde o carro
     acaba. Sem esta tampa a peça é uma casca aberta e a vista frontal mostra o
     interior da superfície do outro lado: foi isso que o usuário viu como
     "muito estranho, não sei explicar", depois de eu ter registrado o corte reto
     como defeito conhecido e continuado a entregar renders assim mesmo.

     A tampa é uma grade de quads entre o anel do nariz e o plano de simetria,
     recuando em z: o lábio do capô desce e volta, e a fáscia encontra a própria
     imagem espelhada em x = 0. Sem booleana, como a pele exige. */
  /* A tampa em dois tempos: primeiro o LÁBIO rola em z quase sem andar em x,
     depois o PAINEL achata em x a z constante. Fazer as duas coisas juntas
     puxava 200 mm para dentro num anel só e produzia dois espigões nos cantos
     dianteiros — visíveis na frontal como duas barbatanas acima da linha do
     capô. */
  /* O z tem de ser ESTRITAMENTE crescente. Com dois anéis no mesmo z, a coluna
     j = 0 — que está sobre o plano de simetria e portanto tem x = 0 em todos os
     anéis — colapsa em pontos coincidentes e gera quads degenerados: diedro de
     180° medido pela condição 8. O topo da tampa é um lado curto de 70 mm ao
     longo de z, não um vértice. */
  const CAPA_ANEIS = [{ x: 0.97, z: 0.45 }, { x: 0.86, z: 0.80 }, { x: 0.55, z: 0.94 }, { x: 0, z: 1 }];
  const CAPA = CAPA_ANEIS.length;
  const recuoDoNariz = 70;
  /* O recuo se esgota no primeiro quarto da tampa: aí a fáscia vira PAINEL
     PLANO. Recuo linear até a costura fazia todos os anéis convergirem para uma
     quilha em x = 0 — proa de barco, que é a condição 1 de rejeição do P0. O que
     recua é a dobra do lábio, não a fáscia inteira. */

  const anelDoNariz = grade[0];
  const alvoNaCostura = anelDoNariz.map((v, j) => {
    const p = V.get(v);
    return [0, j === 0 ? p[1] : SECOES[0].pts[9][1] + (p[1] - SECOES[0].pts[9][1]) * (j === 0 ? 1 : 0)];
  });
  /* A costura vai do alto do nariz até a soleira, na altura de cada anel. */
  for (let j = 0; j < ANEIS; j += 1) alvoNaCostura[j] = [0, V.get(anelDoNariz[j])[1]];

  const capa = [anelDoNariz];
  for (let k = 1; k <= CAPA; k += 1) {
    const anel = CAPA_ANEIS[k - 1];
    const linha = [];
    for (let j = 0; j < ANEIS; j += 1) {
      const p = V.get(anelDoNariz[j]);
      V.set(proximo, [p[0] * anel.x, p[1], ALVO.zNariz - recuoDoNariz * anel.z]);
      linha.push(proximo);
      proximo += 1;
    }
    capa.push(linha);
  }
  for (let k = 0; k < CAPA; k += 1) {
    for (let j = 0; j < ANEIS - 1; j += 1) {
      F.set(idF, {
        id: idF,
        vs: [capa[k][j], capa[k + 1][j], capa[k + 1][j + 1], capa[k][j + 1]],
        parte: 'fasciaDianteira',
      });
      idF += 1;
    }
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

  const loops = {
    ...nomear('linhaDeOmbro', loopOmbro),
    ...nomear('cintura', grade.map((l) => l[7])),
    ...nomear('cristaParalama', grade.map((l) => l[3])),
    /* Aberto, não fechado: a soleira limita o arco por baixo. */
    arcoDianteiro: { v: contorno.ciclo, fechado: false },
    baseParabrisa: { v: grade[grade.length - 1].slice(0, 5), fechado: false },
    ...nomear('recorteFarol', bordaFarol),
  };

  return {
    formato: 'mecanifica.cage-quad@1',
    V, F, vincos, loops,
    /* A seção declarada volta como CONFERÊNCIA da cage, fechando o laço que P1
       pediu: a cage é hipótese e a seção é o alvo contra o qual ela é medida. */
    secoes: SECOES.filter((s) => ESTACOES.includes(s.z))
      .map((s) => ({ z: s.z, contorno: s.pts, tolerancia: 8, janela: 1, apenas: grade.flat() })),
    simetria: { plano: 'x', autorada: 'x >= 0' },
    grade,
    arcoRemovido: removidas.length,
  };
}

const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/* Arestas que sobraram com uma face só e NÃO estão na moldura externa da grade:
   é o contorno do buraco do arco. */
function arestasDeBorda(F, grade) {
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
