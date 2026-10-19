/* geometria.js — as caixas da cadeira a partir dos parâmetros da família, em milímetro.

   Função pura sobre números. A cadeira é uma lista de caixas nomeadas (assento, pernas, postes do encosto, saias, travessões,
   travessas e ripas), todas alinhadas aos eixos. O eixo x é a largura (o centro do assento é x = 0), o eixo y sobe do chão
   (y = 0 é a base das pernas) e o eixo z é a profundidade, com a frente em +z e o centro do assento em z = 0. "esq" é o lado
   de x negativo. Cada caixa leva `centro` = [x, y da base, z] e `larg`, `alt`, `prof`, como o `cubo` do núcleo.

   A estrutura (que caixas existem e em que ordem) depende só da combinação (`combinacaoDaCadeira`): postes, saias, travessão,
   travessas, tábuas do assento e ripas. Os valores (tamanhos e posições) vêm dos parâmetros. As constantes de folga estão aqui
   e nas restrições de `familia.json`: se mudar uma, mude a outra.

   O encosto fica no plano das pernas de trás: as ripas são centradas nele e as travessas encostam na face de trás das pernas.
   As peças que se encostam entram 2 mm uma na outra (SOBREPOSICAO), para a união ser uma peça e não duas caixas coladas. */

export const RECUO_DA_FRENTE = 10; // mm entre a frente do assento e a frente das pernas da frente
export const FOLGA_ENTRE_TABUAS = 12; // mm entre duas tábuas do assento
export const SOBREPOSICAO = 2; // mm que uma peça entra na outra onde se encostam
export const LARGURA_DO_TRAVESSAO = 25; // mm da travessa lateral baixa, no sentido da largura
export const ALTURA_DO_TRAVESSAO = 40; // mm da travessa lateral baixa
export const LARGURA_MINIMA_DA_RIPA = 10; // mm

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

  const xPerna = W / 2 - p.recuoLateral - lp / 2; // centro x das pernas (em módulo)
  const zFrente = D / 2 - RECUO_DA_FRENTE - pp / 2; // centro z das pernas da frente
  const zTras = -(D / 2 - p.recuoDeTras - pp / 2); // centro z das pernas de trás: o plano do encosto
  const zFaceDeTras = zTras - pp / 2; // a face de trás das pernas de trás
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

  /* as pernas sobem até a face de baixo do assento e entram nele; as de trás e os postes são peças à parte */
  const altPerna = yU + SOBREPOSICAO;
  caixas.push(caixa('perna-frente-esq', -xPerna, 0, zFrente, lp, altPerna, pp));
  caixas.push(caixa('perna-frente-dir', xPerna, 0, zFrente, lp, altPerna, pp));
  caixas.push(caixa('perna-tras-esq', -xPerna, 0, zTras, lp, altPerna, pp));
  caixas.push(caixa('perna-tras-dir', xPerna, 0, zTras, lp, altPerna, pp));
  if (combo.postes) {
    caixas.push(caixa('poste-esq', -xPerna, yU, zTras, lp, p.alturaDosPostes - yU, pp));
    caixas.push(caixa('poste-dir', xPerna, yU, zTras, lp, p.alturaDosPostes - yU, pp));
  }

  /* as saias: o contorno das pernas sob o assento; com a espessura passando da metade do vão ela vira um bloco cheio */
  if (combo.saia) {
    /* o contorno fica 1 mm para dentro das faces de fora das pernas, e o topo 1 mm abaixo do topo das pernas, para nenhuma face
       da saia ficar no mesmo plano que a de uma perna (faces quase coincidentes quebram a união); as laterais ficam 0,5 mm mais
       curtas que a frente e o fundo pelo mesmo motivo, e a frente e o fundo nunca se encontram (sobra 2 mm no meio) */
    const xo = W / 2 - p.recuoLateral - 1;
    const zf = D / 2 - RECUO_DA_FRENTE - 1;
    const zb = -(D / 2 - p.recuoDeTras) + 1;
    const vaoX = 2 * xo;
    const vaoZ = zf - zb;
    const tz = Math.min(p.espessuraDaSaia, vaoZ / 2 - 1);
    const tx = Math.min(p.espessuraDaSaia, vaoX / 2 - 1);
    const y0 = yU - p.alturaDaSaia;
    const alt = p.alturaDaSaia + 1;
    caixas.push(caixa('saia-frente', 0, y0, zf - tz / 2, vaoX, alt, tz));
    caixas.push(caixa('saia-tras', 0, y0, zb + tz / 2, vaoX, alt, tz));
    if (combo.saia === 2) {
      caixas.push(caixa('saia-esq', -(xo - 0.5 - tx / 2), y0, (zf + zb) / 2, tx, alt, vaoZ - 1));
      caixas.push(caixa('saia-dir', xo - 0.5 - tx / 2, y0, (zf + zb) / 2, tx, alt, vaoZ - 1));
    }
  }

  /* o travessão: uma barra baixa de cada lado, entre a perna da frente e a de trás */
  if (combo.travessao) {
    const zIni = zTras + pp / 2 - SOBREPOSICAO;
    const zFim = zFrente - pp / 2 + SOBREPOSICAO;
    for (const [nome, sinal] of [['travessao-esq', -1], ['travessao-dir', 1]]) {
      caixas.push(caixa(nome, sinal * xPerna, p.alturaDoTravessaoLateral - ALTURA_DO_TRAVESSAO / 2, (zIni + zFim) / 2, LARGURA_DO_TRAVESSAO, ALTURA_DO_TRAVESSAO, zFim - zIni));
    }
  }

  /* o encosto: travessa baixa, ripas e travessa alta, no plano das pernas de trás */
  const topoDaAlta = p.topoDaTravessaAlta;
  const baseDaAlta = topoDaAlta - p.alturaDaTravessaAlta;
  const zTravessa = zFaceDeTras + p.espessuraDasTravessas / 2;
  /* com postes, a restrição `travessas-entram-nos-postes` garante que a largura passa do vão entre eles em ao menos 4 mm */
  const larguraDasTravessas = p.larguraDasTravessas;
  if (combo.baixa) {
    caixas.push(caixa('travessa-baixa', 0, p.baseDasRipas - p.alturaDaTravessaBaixa, zTravessa, larguraDasTravessas, p.alturaDaTravessaBaixa, p.espessuraDasTravessas));
  }
  const larguraDaRipa = (p.larguraDoConjuntoDasRipas - (combo.ripas - 1) * p.vaoEntreRipas) / combo.ripas;
  const passo = larguraDaRipa + p.vaoEntreRipas;
  const apoiaEmBaixo = combo.baixa || Math.abs(p.baseDasRipas - hA) < 1;
  const apoiaEmCima = combo.alta && Math.abs(baseDaAlta - p.topoDasRipas) < 1;
  const yRipa0 = p.baseDasRipas - (apoiaEmBaixo ? SOBREPOSICAO : 0);
  const yRipa1 = p.topoDasRipas + (apoiaEmCima ? SOBREPOSICAO : 0);
  for (let k = 0; k < combo.ripas; k += 1) {
    caixas.push(caixa(`ripa-${k + 1}`, (k - (combo.ripas - 1) / 2) * passo, yRipa0, zTras, larguraDaRipa, yRipa1 - yRipa0, p.espessuraDaRipa));
  }
  if (combo.alta) {
    caixas.push(caixa('travessa-alta', 0, baseDaAlta, zTravessa, larguraDasTravessas, p.alturaDaTravessaAlta, p.espessuraDasTravessas));
  }

  return Object.freeze({ combo, caixas, yU, xPerna, zFrente, zTras, zFaceDeTras, larguraDaRipa, passo });
}

/** A caixa envolvente e o volume (soma sem descontar sobreposição) das caixas, em mm e mm³. */
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
