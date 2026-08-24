#!/usr/bin/env node
/* secoes-por-medida.mjs — seções transversais derivadas de PERFIL MEDIDO, não
   de números digitados.

   Esta é a prova do "caminho 1". Três tentativas anteriores — o loft original,
   o quarto dianteiro em cage, e o experimento cupê livre feito por outro modelo
   sem tocar neste repositório — chegaram todas ao mesmo método: digitar de 8 a
   14 seções transversais com números tirados da cabeça. Todas falharam do mesmo
   jeito. O que muda aqui é a ORIGEM dos números.

   A silhueta lateral vem de `docs/mecanifica/referencias/fastback-1965-silhueta.json`,
   extraída de uma prancha rasterizada real e calibrada pelo entre-eixos. O
   perfil é o que faz um carro ser reconhecível de longe, e agora ele é medido.

   O que continua declarado, e por isso fica pequeno e discutível:
   - a meia largura por estação (a planta), cinco números;
   - o PRIOR DE SEÇÃO, seis números com significado.

   Onze números contra oitenta coordenadas. Não é a mesma coisa: ninguém confere
   convexidade olhando oitenta coordenadas, e qualquer um discute "o ombro fica a
   38% da altura".

   Medido antes de escrever isto (ver RELATORIO): duas famílias de seção com as
   TRÊS vistas ortográficas idênticas ainda diferem até 28 mm. Ou seja, contorno
   sozinho não determina a seção — 82% das estações ficam escondidas atrás da
   envoltória frontal e recebem só dois números, faixa de altura e largura
   máxima. O prior é quem fecha essa lacuna, e por isso ele é explícito. */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..', '..');

export function lerPerfilMedido(
  arquivo = path.join(REPO, 'docs', 'mecanifica', 'referencias', 'fastback-1965-silhueta.json'),
) {
  const d = JSON.parse(readFileSync(arquivo, 'utf8'));
  return {
    nome: d.nome,
    origem: d.origem,
    mmPorPx: d.calibracao?.mmPorPx,
    topo: d.silhuetaLateral.topo,
    base: d.silhuetaLateral.base,
  };
}

/* Amostra uma polilinha (z, y) num z qualquer. As curvas medidas vêm ordenadas
   de trás para frente; a busca não assume direção. */
export function amostrar(curva, z) {
  const ord = [...curva].sort((a, b) => a[0] - b[0]);
  if (z <= ord[0][0]) return ord[0][1];
  if (z >= ord[ord.length - 1][0]) return ord[ord.length - 1][1];
  for (let i = 0; i < ord.length - 1; i += 1) {
    const [z0, y0] = ord[i];
    const [z1, y1] = ord[i + 1];
    if (z >= z0 && z <= z1) {
      const t = (z1 - z0) === 0 ? 0 : (z - z0) / (z1 - z0);
      return y0 + (y1 - y0) * t;
    }
  }
  return ord[ord.length - 1][1];
}

/* A base medida inclui os PNEUS, não a carroceria. Na prancha real ela mergulha
   até y = 0 em duas faixas — as manchas de contato — porque a silhueta lateral
   de um carro é o contorno externo de tudo, inclusive roda. Para a pele, o que
   vale embaixo é a soleira, e o arco de roda é abertura declarada, cortada
   depois, exatamente como o P0 já fazia.

   Isto é o custo de usar dado medido, e é um custo honesto: o número continua
   vindo da medição, só a interpretação é declarada. */
export function baseDaCarroceria(base, { quedaMinima = 70 } = {}) {
  const ord = [...base].sort((a, b) => a[0] - b[0]);
  const ys = ord.map((p) => p[1]).sort((a, b) => a - b);
  const soleira = ys[Math.floor(ys.length / 2)];      // nível mediano = a soleira
  const saida = [];
  let i = 0;
  const rodas = [];
  while (i < ord.length) {
    if (ord[i][1] >= soleira - quedaMinima) { saida.push(ord[i]); i += 1; continue; }
    /* Entrou num mergulho de roda: anda até sair, e liga as duas pontas em
       linha reta no nível em que estavam. */
    const inicio = saida.length ? saida[saida.length - 1] : ord[i];
    let j = i;
    while (j < ord.length && ord[j][1] < soleira - quedaMinima) j += 1;
    const fim = j < ord.length ? ord[j] : inicio;
    rodas.push([inicio[0], fim[0]]);
    saida.push([inicio[0], inicio[1]], [fim[0], fim[1]]);
    i = j;
  }
  return { curva: saida, soleira, rodas };
}

/* PLANTA declarada: meia largura por estação. Cinco números, discutíveis.
   Um fastback 1965 tem 1732 mm de largura total. */
export const PLANTA_PADRAO = [
  [2121, 760], [1300, 862], [0, 866], [-1300, 858], [-2405, 700],
];

/* PRIOR DE SEÇÃO. Seis números com significado, válidos para cupê de duas
   portas. É aqui que mora tudo que o contorno não determina, e é por isso que
   ele fica curto o bastante para ser discutido em uma frase cada. */
export const PRIOR_CUPE = {
  /* Onde o ombro cai, como fração da altura total da seção, medido do topo. */
  ombroAbaixoDoTopo: 0.34,
  /* Meia largura no ombro, como fração da meia largura máxima da estação. */
  larguraNoOmbro: 0.94,
  /* Abaulamento da superfície superior acima da corda centro→ombro, em mm. */
  bojoSuperior: 34,
  /* Altura do ponto mais largo, entre soleira (0) e ombro (1). */
  alturaDaLarguraMax: 0.62,
  /* Meia largura na soleira, como fração da meia largura máxima. */
  larguraNaSoleira: 0.86,
  /* Cheiura do flanco: expoente de queda acima e abaixo do ponto mais largo. */
  cheiuraAcima: 2.1,
  cheiuraAbaixo: 1.5,
};

const FRACOES_SUPERIORES = [0.32, 0.62, 0.84];
const FRACOES_DO_FLANCO = [0.14, 0.36, 0.62, 0.84];

/* Uma seção, em (x, y), do eixo de simetria até a soleira. */
export function secaoEm(z, { perfil, planta = PLANTA_PADRAO, prior = PRIOR_CUPE, base = null }) {
  const yTopo = amostrar(perfil.topo, z);
  const yBase = amostrar(base ?? perfil.base, z);
  const wMax = amostrar(planta, z);
  const altura = yTopo - yBase;
  if (!(altura > 0) || !(wMax > 0)) return null;

  const yOmbro = yTopo - altura * prior.ombroAbaixoDoTopo;
  const xOmbro = wMax * prior.larguraNoOmbro;
  const xSoleira = wMax * prior.larguraNaSoleira;
  const yLargo = yBase + (yOmbro - yBase) * prior.alturaDaLarguraMax;

  const pts = [[0, yTopo]];
  for (const f of FRACOES_SUPERIORES) {
    const naCorda = yTopo + (yOmbro - yTopo) * f;
    /* O expoente 0,85 empurra o pico do abaulamento para fora do eixo de
       simetria, que é onde ele fica num capô e num teto de verdade. */
    pts.push([xOmbro * f, naCorda + prior.bojoSuperior * Math.sin(Math.PI * Math.pow(f, 0.85))]);
  }
  pts.push([xOmbro, yOmbro]);

  const queda = (a, b, u, p) => a - (a - b) * Math.pow(Math.min(1, Math.max(0, u)), p);
  for (const t of FRACOES_DO_FLANCO) {
    const y = yOmbro + (yBase - yOmbro) * t;
    const x = y >= yLargo
      ? queda(wMax, xOmbro, (y - yLargo) / ((yOmbro - yLargo) || 1), prior.cheiuraAcima)
      : queda(wMax, xSoleira, (yLargo - y) / ((yLargo - yBase) || 1), prior.cheiuraAbaixo);
    pts.push([x, y]);
  }
  pts.push([xSoleira, yBase]);
  return pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}

export function corpo(estacoes, opcoes) {
  return estacoes
    .map((z) => ({ z, pts: secaoEm(z, opcoes) }))
    .filter((s) => s.pts);
}

export function estacoesUniformes(zFrente, zTras, n) {
  const saida = [];
  for (let i = 0; i < n; i += 1) saida.push(zFrente + (zTras - zFrente) * (i / (n - 1)));
  return saida;
}
