#!/usr/bin/env node
/* prancha-chassi-p0.mjs — especificação da prancha ortográfica ALVO da rodada P0
   do chassi realista, desenhada por tools/mecanifica/prancha.mjs. Não é a projeção
   de uma peça existente: é o desenho contra o qual a geometria futura será medida.
   Toda medida vem de docs/mecanifica/CHASSI-P0-ALVO-E-LIMIARES.md e é repetida aqui
   como dado explícito; se divergirem, o documento manda. Saída determinística. */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prancha, imprimirRelatorio } from './prancha.mjs';
import * as ALVO from './alvo-chassi-p0.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA = path.join(REPO, 'docs', 'mecanifica', 'img', 'chassi-p0-prancha.svg');

const { zMin, zMax, yMax, xMax, RD, RT, LANDMARKS, TOPO, BASE, OMBRO, PLANTA, FRONTAL } = ALVO;

const camadas = [
  { vista: 'lateral', tipo: 'poli', classe: 'eixo', pts: [[zMin - 80, 0], [zMax + 80, 0]] },
  {
    vista: 'lateral', contorno: true, nome: 'silhuetaSuperior', pts: TOPO,
    /* Três inversões são corretas aqui e não defeito: a silhueta inteira tem
       inflexão real no capô, na base do para-brisa e na queda da traseira. O
       limite existe para pegar ondulação — a versão anterior media dez. */
    esperado: { concentracaoMax: 0.30, inversoesMax: 4 },
  },
  ...BASE.map((pts) => ({ vista: 'lateral', contorno: true, pts })),
  ...[RD, RT].flatMap((r) => [
    { vista: 'lateral', tipo: 'circulo', classe: 'roda', foraDoContorno: true, motivoForaDoContorno: 'roda atravessa a abertura do arco e fica abaixo da soleira na projeção lateral', centro: [r.z, r.raio], raio: r.raio },
    { vista: 'lateral', tipo: 'circulo', classe: 'aro', foraDoContorno: true, motivoForaDoContorno: 'aro acompanha a roda através da abertura do arco na projeção lateral', centro: [r.z, r.raio], raio: r.raio * 0.74 },
    { vista: 'lateral', tipo: 'arco', classe: 'contorno', contorno: true, centro: [r.z, r.raio], raio: r.arco },
  ]),
  /* A linha de ombro vive em x = ±965 e é projetada na lateral: comparar com a
     silhueta de x = 0 não faz sentido, e a crista do para-lama fica mesmo acima
     do centro do capô. */
  { vista: 'lateral', classe: 'carater', nome: 'linhaDeOmbro', pts: OMBRO, foraDoContorno: true, motivoForaDoContorno: 'crista do flanco está em x diferente do plano central e pode projetar acima da silhueta lateral', esperado: { concentracaoMax: 0.6, inversoesMax: 2 } },
  /* Soleira: aresta inferior do flanco em x = ±925, dentro da projeção. */
  { vista: 'lateral', classe: 'painel', nome: 'soleira', pts: [[740, 200], [400, 145], [0, 145], [-500, 152], [-760, 205]] },

  { vista: 'planta', tipo: 'poli', classe: 'eixo', pts: [[zMin - 80, 0], [zMax + 80, 0]] },
  { vista: 'planta', contorno: true, nome: 'plantaDireita', pts: PLANTA, esperado: { concentracaoMax: 0.5 } },
  { vista: 'planta', contorno: true, pts: PLANTA.map(([z, w, r]) => (r === undefined ? [z, -w] : [z, -w, r])) },
  { vista: 'planta', contorno: true, pts: [[2200, 300], [2265, 0, 200], [2200, -300]] },
  { vista: 'planta', contorno: true, tipo: 'poli', pts: [[-2335, 665], [-2335, -665]] },
  ...[RD, RT].flatMap((r) => [1, -1].map((k) => ({
    vista: 'planta', tipo: 'poli', classe: 'roda', fechado: true, foraDoContorno: true, motivoForaDoContorno: 'a projeção da roda é inspecionada como interface externa declarada nesta prova P0',
    pts: [[r.z - r.raio, k * r.x - r.larg / 2], [r.z + r.raio, k * r.x - r.larg / 2],
      [r.z + r.raio, k * r.x + r.larg / 2], [r.z - r.raio, k * r.x + r.larg / 2]],
  }))),

  { vista: 'frontal', tipo: 'poli', classe: 'eixo', pts: [[0, -60], [0, yMax + 40]] },
  ...[1, -1].map((k) => ({ vista: 'frontal', contorno: true, pts: FRONTAL.map(([y, w, r]) => (r === undefined ? [k * w, y] : [k * w, y, r])) })),
  { vista: 'frontal', contorno: true, tipo: 'poli', pts: [[-860, 105], [860, 105]] },
  { vista: 'frontal', contorno: true, tipo: 'poli', pts: [[-625, 1185], [625, 1185]] },
  ...[1, -1].map((k) => ({
    vista: 'frontal', tipo: 'poli', classe: 'roda', fechado: true, foraDoContorno: true, motivoForaDoContorno: 'roda aparece abaixo do contorno da carroceria na seção frontal',
    pts: [[k * RD.x - RD.larg / 2, 0], [k * RD.x + RD.larg / 2, 0],
      [k * RD.x + RD.larg / 2, RD.raio * 2], [k * RD.x - RD.larg / 2, RD.raio * 2]],
  })),
];

const spec = {
  titulo: 'Chassi P0 — prancha ortográfica alvo',
  subtitulo: 'Alvo declarado antes da geometria. Milímetros. x = largura, y = altura, z = frente positiva. Escala 1:6,25.',
  escala: 0.16,
  tela: { largura: 1320, altura: 800 },
  limites: { zMin, zMax, yMax, xMax },
  vistas: {
    lateral: { x: 70, y: 96, rotulo: 'LATERAL — projeção, frente à direita', leitura: 'projecao' },
    frontal: { x: 900, y: 96, rotulo: 'FRONTAL — seção no eixo dianteiro', leitura: 'secao' },
    planta: { x: 70, y: 420, rotulo: 'SUPERIOR — projeção, frente à direita', leitura: 'projecao' },
  },
  camadas,
  envelope: { comprimento: 4600, largura: 2000, altura: 1190 },
  cotas: [
    { vista: 'lateral', de: [-1325, 0], ate: [1325, 0], desloca: [0, 34], texto: 'entre-eixos 2650' },
    { vista: 'lateral', de: [zMin, 0], ate: [zMax, 0], desloca: [0, 58], texto: 'comprimento 4600' },
    { vista: 'lateral', de: [zMax, 0], ate: [zMax, yMax], desloca: [34, 0], texto: 'altura 1190' },
    { vista: 'frontal', de: [-965, 0], ate: [965, 0], desloca: [0, 34], texto: 'ombro dianteiro 1930' },
    { vista: 'frontal', de: [-830, 0], ate: [830, 0], desloca: [0, 56], texto: 'bitola diant. 1660' },
    { vista: 'planta', de: [-1325, -840], ate: [-1325, 840], desloca: [-40, 0], texto: 'largura máx. 2000' },
  ],
  landmarks: LANDMARKS.flatMap(([id, x, y, z]) => (
    x === 0 || id === 'L14' || id === 'L15'
      ? [{ vista: 'lateral', em: [z, y], id, sobre: ['L01', 'L04', 'L05', 'L06', 'L07', 'L08', 'L09'].includes(id) ? 'silhuetaSuperior' : undefined }]
      : id === 'L11' ? [{ vista: 'lateral', em: [z, y], id, sobre: 'soleira' }, { vista: 'planta', em: [z, x] }]
      : [{ vista: 'planta', em: [z, x], id }, { vista: 'lateral', em: [z, y] }]
  )),
  legenda: {
    x: 900, y: 420,
    itens: [
      ['#12233b', 'silhueta alvo — curvas mestras 1, 2 e 4'],
      ['#b3593d', 'linha de ombro (curva mestra 3) e cotas'],
      ['#8a94a2', 'roda: 680 mm diant., 716 mm tras.'],
      ['#1f6f5c', 'landmarks L01–L15, tolerância 6 mm'],
    ],
    notas: ['Fonte: CHASSI-P0-ALVO-E-LIMIARES.md', 'Alvo, não geometria. Nenhuma peça foi modelada.'],
  },
};

const { svg, relatorio } = prancha(spec);
mkdirSync(path.dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, svg);
console.log(`prancha-chassi-p0: ${path.relative(REPO, SAIDA)}`);
console.log(imprimirRelatorio(relatorio));
