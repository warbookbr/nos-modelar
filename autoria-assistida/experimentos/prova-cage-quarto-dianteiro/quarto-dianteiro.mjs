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

/* SEÇÕES DECLARADAS. Esta é a correção da rodada Q7: a versão reprovada gerava
   a seção por fórmula genérica a partir da silhueta e da meia largura, e o
   resultado não tinha quebra nenhuma — o vinco da linha de ombro foi aplicado
   onde a superfície era colinear e não revelou nada.

   Cada estação é escrita à mão, com o que faz caráter: capô com vale raso, CRISTA
   DE PARA-LAMA que sobe acima do capô, quebra dura na crista, flanco com
   recolhimento e tuck na soleira. Dez anéis, da costura até a soleira.
   O anel 4 é a crista, e é ele que recebe o vinco. */
export const SECOES = [
  { z: 2265, pts: [[0, 520], [120, 512], [220, 494], [280, 462], [300, 420], [296, 356], [284, 288], [262, 224], [232, 176], [206, 150]] },
  { z: 2100, pts: [[0, 640], [190, 630], [360, 608], [470, 588], [520, 606], [532, 520], [524, 414], [500, 310], [468, 220], [436, 162]] },
  { z: 1900, pts: [[0, 742], [270, 734], [520, 718], [690, 706], [812, 726], [838, 622], [828, 486], [800, 344], [764, 232], [730, 162]] },
  { z: 1600, pts: [[0, 826], [290, 818], [560, 806], [760, 802], [906, 838], [930, 726], [920, 570], [892, 398], [856, 262], [822, 168]] },
  { z: 1325, pts: [[0, 880], [300, 872], [600, 866], [800, 878], [965, 900], [960, 780], [948, 600], [920, 408], [884, 258], [850, 152]] },
  { z: 1000, pts: [[0, 922], [312, 916], [612, 910], [816, 920], [952, 940], [962, 822], [950, 636], [922, 432], [888, 268], [858, 152]] },
  { z: 700, pts: [[0, 952], [306, 948], [600, 944], [800, 950], [940, 966], [950, 846], [940, 656], [916, 444], [884, 272], [858, 152]] },
  { z: 480, pts: [[0, 980], [300, 976], [580, 972], [780, 978], [928, 992], [940, 866], [932, 668], [910, 450], [882, 276], [858, 154]] },
];
const ANEL_CRISTA = 4;

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
export function construirQuartoDianteiro({ retornoDeBorda = 26 } = {}) {
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
  const farol = { i0: 1, i1: 3, j0: 2, j1: 4, fundo: 42 };
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

  /* Vincos. Uma linha de caráter é um vinco semi-agudo sobre um loop, não uma
     fileira extra de geometria — P0 e P1 dizem isso, e é o que se faz aqui. */
  const loopOmbro = grade.map((l) => l[ANEL_CRISTA]);
  for (let i = 0; i < loopOmbro.length - 1; i += 1) {
    vincos.set(chave(loopOmbro[i], loopOmbro[i + 1]), 2);
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
