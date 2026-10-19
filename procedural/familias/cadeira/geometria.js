/* geometria.js — as caixas da cadeira a partir dos parâmetros da família, em milímetro.

   Função pura sobre números. A cadeira é uma lista de caixas nomeadas (assento, pernas, postes do encosto, saias, travessões,
   travessas e ripas), todas alinhadas aos eixos. O eixo x é a largura (o centro do assento é x = 0), o eixo y sobe do chão
   (y = 0 é a base das pernas) e o eixo z é a profundidade, com a frente em +z e o centro do assento em z = 0. "esq" é o lado
   de x negativo. Cada caixa leva `centro` = [x, y da base, z] e `larg`, `alt`, `prof`, como o `cubo` do núcleo.

   Regras construtivas, que o teste da família confere por medida:
   1. a cadeira é simétrica em torno de x = 0: as quatro pernas e os dois postes ficam à mesma distância das bordas do assento;
   2. cada poste está exatamente sobre a perna de trás do mesmo lado (mesmo x, mesmo z, mesma seção);
   3. o topo de cada perna encosta na face de baixo do assento (entra nele 0,5 mm); o poste sobe a partir da face de cima do
      assento (entra nele 0,5 mm), de modo que nenhuma peça atravessa o assento nem se duplica;
   4. as ripas e as travessas do encosto encostam nos postes e entre si (entram 0,5 mm), sem atravessá-los;
   5. nenhuma peça passa do contorno que o assento e as pernas definem.
   A estrutura (que caixas existem e em que ordem) depende só da combinação (`combinacaoDaCadeira`); os valores vêm dos
   parâmetros. As constantes estão aqui e nas restrições de `familia.json`: se mudar uma, mude a outra. Duas peças nunca têm uma
   face no mesmo plano da outra (a diferença é de ao menos 0,25 mm), porque faces quase coincidentes quebram a união. */

export const RECUO_DA_FRENTE = 10; // mm entre a frente do assento e a frente das pernas da frente
export const FOLGA_ENTRE_TABUAS = 12; // mm entre duas tábuas do assento
export const SOBREPOSICAO = 0.5; // mm que uma peça entra na outra onde se encostam (o limite do teste é 1 mm)
export const RECUO_DA_SAIA = 6; // mm entre a face de fora da saia e a face de fora da perna (nunca menos que 5: ver `degrausEntreCaixas`)
export const ALTURA_DO_TRAVESSAO = 40; // mm da travessa lateral baixa
export const OCUPACAO_TOTAL = 0.999; // a partir daqui as ripas vão de poste a poste e entram neles

/** A combinação que decide a estrutura: o que existe e quantas peças repetidas. */
export function combinacaoDaCadeira(p) {
  return {
    postes: p.alturaDosPostes > 0 ? 1 : 0,
    saia: p.alturaDaSaia > 0 ? (p.saiaNosLados >= 1 ? 2 : 1) : 0,
    travessao: p.alturaDoTravessaoLateral > 0 ? 1 : 0,
    alta: p.alturaDaTravessaAlta > 0 ? 1 : 0,
    baixa: p.alturaDaTravessaBaixa > 0 ? 1 : 0,
    tabuas: p.tabuasDoAssento,
    ripas: p.numeroDeRipas,
  };
}

export const idDaCadeira = ({ postes, saia, travessao, alta, baixa, tabuas, ripas }) =>
  `cadeira.po${postes}-sa${saia}-tr${travessao}-al${alta}-ba${baixa}-t${tabuas}-r${ripas}`;

/* Uma caixa nomeada: x e z são o centro, y é a base. */
const caixa = (nome, x, y, z, larg, alt, prof) => ({ nome, centro: [x, y, z], larg, alt, prof });

/**
 * As caixas da cadeira, em ordem estável para uma mesma combinação, e as cotas que os testes e as medidas usam.
 * `parametros` são os parâmetros completos da família, em milímetro.
 */
export function geometriaDaCadeira(parametros) {
  const p = parametros;
  const W = p.larguraDoAssento;
  const D = p.profundidadeDoAssento;
  const hA = p.alturaDoAssento;
  const esp = p.espessuraDoAssento;
  const yU = hA - esp; // a face de baixo do assento
  const lp = p.larguraDaPerna;
  const pp = p.profundidadeDaPerna;
  const combo = combinacaoDaCadeira(p);

  const xo = W / 2 - p.recuoLateral; // a face de fora das pernas (em módulo)
  const xPerna = xo - lp / 2; // o centro x das pernas (em módulo)
  const xi = xPerna - lp / 2; // a face de dentro das pernas (em módulo)
  const zFora = D / 2 - RECUO_DA_FRENTE; // a face da frente das pernas da frente
  const zFrente = zFora - pp / 2; // o centro z das pernas da frente
  const zFaceDeTras = -(D / 2 - p.recuoDeTras); // a face de trás das pernas de trás
  const zTras = zFaceDeTras + pp / 2; // o centro z das pernas de trás: o plano do encosto
  const zFrenteDeTras = zTras + pp / 2; // a face da frente das pernas de trás
  const zTrasDeFrente = zFrente - pp / 2; // a face de trás das pernas da frente
  const caixas = [];

  /* o assento: uma placa, ou tábuas separadas por uma folga, da frente para trás */
  if (combo.tabuas === 1) {
    caixas.push(caixa('assento', 0, yU, 0, W, esp, D));
  } else {
    const prof = (D - (combo.tabuas - 1) * FOLGA_ENTRE_TABUAS) / combo.tabuas;
    for (let k = 0; k < combo.tabuas; k += 1) {
      caixas.push(caixa(`tabua-assento-${k + 1}`, 0, yU, D / 2 - k * (prof + FOLGA_ENTRE_TABUAS) - prof / 2, W, esp, prof));
    }
  }

  /* as pernas sobem até a face de baixo do assento e entram nele 0,5 mm */
  const altPerna = yU + SOBREPOSICAO;
  caixas.push(caixa('perna-frente-esq', -xPerna, 0, zFrente, lp, altPerna, pp));
  caixas.push(caixa('perna-frente-dir', xPerna, 0, zFrente, lp, altPerna, pp));
  caixas.push(caixa('perna-tras-esq', -xPerna, 0, zTras, lp, altPerna, pp));
  caixas.push(caixa('perna-tras-dir', xPerna, 0, zTras, lp, altPerna, pp));
  /* os postes saem da face de cima do assento, sobre as pernas de trás: o mesmo x, o mesmo z e a mesma seção */
  if (combo.postes) {
    const y0 = hA - SOBREPOSICAO;
    caixas.push(caixa('poste-esq', -xPerna, y0, zTras, lp, p.alturaDosPostes - y0, pp));
    caixas.push(caixa('poste-dir', xPerna, y0, zTras, lp, p.alturaDosPostes - y0, pp));
  }

  /* as saias ficam entre as pernas, alinhadas com a face de dentro delas e recuadas RECUO_DA_SAIA da face de fora (a espessura é a da
     perna menos o recuo): a frente e o fundo de perna a perna, e (saia === 2) os lados de perna a perna. O topo é o das pernas */
  if (combo.saia) {
    const tz = pp - RECUO_DA_SAIA;
    const tx = lp - RECUO_DA_SAIA;
    const y0 = yU - p.alturaDaSaia;
    const alt = p.alturaDaSaia + SOBREPOSICAO;
    const larguraEntrePernas = 2 * (xi + 0.3);
    caixas.push(caixa('saia-frente', 0, y0, zFora - RECUO_DA_SAIA - tz / 2, larguraEntrePernas, alt, tz));
    caixas.push(caixa('saia-tras', 0, y0, zFaceDeTras + RECUO_DA_SAIA + tz / 2, larguraEntrePernas, alt, tz));
    if (combo.saia === 2) {
      const profLado = zTrasDeFrente - zFrenteDeTras + 2 * SOBREPOSICAO;
      const zLado = (zTrasDeFrente + zFrenteDeTras) / 2;
      caixas.push(caixa('saia-esq', -(xo - RECUO_DA_SAIA - tx / 2), y0, zLado, tx, alt, profLado));
      caixas.push(caixa('saia-dir', xo - RECUO_DA_SAIA - tx / 2, y0, zLado, tx, alt, profLado));
    }
  }

  /* o travessão: uma barra baixa de cada lado, de perna a perna, 12 mm mais estreita que a perna */
  if (combo.travessao) {
    const prof = zTrasDeFrente - zFrenteDeTras + 2 * SOBREPOSICAO;
    const zc = (zTrasDeFrente + zFrenteDeTras) / 2;
    caixas.push(caixa('travessao-esq', -xPerna, p.alturaDoTravessaoLateral - ALTURA_DO_TRAVESSAO / 2, zc, lp - 12, ALTURA_DO_TRAVESSAO, prof));
    caixas.push(caixa('travessao-dir', xPerna, p.alturaDoTravessaoLateral - ALTURA_DO_TRAVESSAO / 2, zc, lp - 12, ALTURA_DO_TRAVESSAO, prof));
  }

  /* o encosto: ripas, centradas no plano das pernas de trás; entre os postes quando há postes, e na largura entre as faces de
     fora das pernas quando não há. Com a ocupação total as ripas vão de poste a poste e entram 0,5 mm em cada um */
  const vao = combo.postes ? 2 * xi : 2 * xo;
  const larguraDoConjunto = combo.postes && p.ocupacaoDoVao >= OCUPACAO_TOTAL ? vao + 2 * SOBREPOSICAO : p.ocupacaoDoVao * vao;
  const larguraDaRipa = (larguraDoConjunto - (combo.ripas - 1) * p.vaoEntreRipas) / combo.ripas;
  const passo = larguraDaRipa + p.vaoEntreRipas;
  const meioDoConjunto = ((combo.ripas - 1) / 2) * passo + larguraDaRipa / 2; // a face de fora da ripa de fora, em módulo
  const baseDaAlta = p.topoDaTravessaAlta - p.alturaDaTravessaAlta;
  const apoiaEmBaixo = combo.baixa || Math.abs(p.baseDasRipas - hA) < 1;
  /* com postes e travessa alta as ripas sobem até a travessa (entram 0,5 mm nela) e o parâmetro `topoDasRipas` não conta */
  const sobeAteATravessa = combo.alta && combo.postes;
  const yRipa0 = p.baseDasRipas - (apoiaEmBaixo ? SOBREPOSICAO : 0);
  const yRipa1 = sobeAteATravessa ? baseDaAlta + SOBREPOSICAO : p.topoDasRipas;

  /* as travessas. Com postes ficam no plano deles, com a mesma profundidade (as faces de trás e da frente alinhadas) e entre eles
     (entram 0,5 mm em cada um); a travessa alta que começa no topo dos postes fica sobre eles, na largura de fora a fora. Sem
     postes ficam na frente das ripas (entram 0,5 mm nelas), na largura do conjunto de ripas, com as pontas alinhadas às delas. */
  const sobrePostes = combo.postes && combo.alta && Math.abs(baseDaAlta - p.alturaDosPostes) <= 1;
  const larguraDaTravessa = combo.postes ? 2 * xi + 2 * SOBREPOSICAO : 2 * meioDoConjunto;
  const profDaTravessa = combo.postes ? pp : p.espessuraDasTravessas;
  const zTravessa = combo.postes ? zTras : zTras + p.espessuraDaRipa / 2 - SOBREPOSICAO + p.espessuraDasTravessas / 2;
  if (combo.baixa) {
    const base = p.baseDasRipas - p.alturaDaTravessaBaixa;
    const desce = Math.abs(base - hA) < 1 ? SOBREPOSICAO : 0;
    caixas.push(caixa('travessa-baixa', 0, base - desce, zTravessa, larguraDaTravessa, p.alturaDaTravessaBaixa + desce, profDaTravessa));
  }
  for (let k = 0; k < combo.ripas; k += 1) {
    caixas.push(caixa(`ripa-${k + 1}`, (k - (combo.ripas - 1) / 2) * passo, yRipa0, zTras, larguraDaRipa, yRipa1 - yRipa0, p.espessuraDaRipa));
  }
  if (combo.alta) {
    caixas.push(caixa('travessa-alta', 0, baseDaAlta, zTravessa, sobrePostes ? 2 * xo : larguraDaTravessa, p.alturaDaTravessaAlta, profDaTravessa));
  }

  return Object.freeze({ combo, caixas, yU, xPerna, zFrente, zTras, zFaceDeTras, larguraDaRipa, passo, sobrePostes });
}

/** A caixa envolvente das caixas, em mm. */
export function envolventeDasCaixas(caixas) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const c of caixas) {
    const lo = [c.centro[0] - c.larg / 2, c.centro[1], c.centro[2] - c.prof / 2];
    const hi = [c.centro[0] + c.larg / 2, c.centro[1] + c.alt, c.centro[2] + c.prof / 2];
    for (let k = 0; k < 3; k += 1) { min[k] = Math.min(min[k], lo[k]); max[k] = Math.max(max[k], hi[k]); }
  }
  return { min, max };
}

/**
 * O contato entre duas caixas: a sobreposição em cada eixo (negativa é folga). Com os três eixos positivos as caixas se
 * atravessam, e a penetração é a menor das três.
 */
export function contatoEntreCaixas(a, b) {
  const lo = (c) => [c.centro[0] - c.larg / 2, c.centro[1], c.centro[2] - c.prof / 2];
  const hi = (c) => [c.centro[0] + c.larg / 2, c.centro[1] + c.alt, c.centro[2] + c.prof / 2];
  const la = lo(a); const ha = hi(a); const lb = lo(b); const hb = hi(b);
  const sobre = [0, 1, 2].map((k) => Math.min(ha[k], hb[k]) - Math.max(la[k], lb[k]));
  const atravessa = sobre.every((s) => s > 1e-9);
  return { sobre, atravessa, penetracao: atravessa ? Math.min(...sobre) : 0, encosta: sobre.filter((s) => s >= -1e-9).length === 3 };
}

/** O menor degrau que conta como defeito (mm): faces paralelas que se tocam e diferem por menos que isso são degrau, e acima dele são recuo de propósito. */
export const DEGRAU_MINIMO = 0.25;
export const RECUO_MINIMO = 5;

/**
 * Os degraus entre duas caixas que se tocam: faces paralelas do mesmo lado (mínimo com mínimo, máximo com máximo, em cada eixo)
 * cuja diferença está entre DEGRAU_MINIMO e RECUO_MINIMO. As faces ou ficam rigorosamente alinhadas (diferença abaixo de 0,25 mm)
 * ou diferem por ao menos 5 mm. A entrada de uma peça na outra (máximo de uma com mínimo da outra) não conta.
 */
export function degrausEntreCaixas(a, b) {
  if (!contatoEntreCaixas(a, b).sobre.every((s) => s >= -1e-9)) return [];
  const lo = (c) => [c.centro[0] - c.larg / 2, c.centro[1], c.centro[2] - c.prof / 2];
  const hi = (c) => [c.centro[0] + c.larg / 2, c.centro[1] + c.alt, c.centro[2] + c.prof / 2];
  const achados = [];
  ['x', 'y', 'z'].forEach((eixo, k) => {
    for (const [lado, fa, fb] of [['minimo', lo(a)[k], lo(b)[k]], ['maximo', hi(a)[k], hi(b)[k]]]) {
      const d = Math.abs(fa - fb);
      if (d >= DEGRAU_MINIMO && d < RECUO_MINIMO - 1e-6) achados.push({ a: a.nome, b: b.nome, eixo, lado, diferenca: d });
    }
  });
  return achados;
}
