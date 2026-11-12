#!/usr/bin/env node
/* derivar-contornos.mjs: escreve `sedan-chassi-e-lataria.contornos.json` (mecanifica.contornos@1) a partir das silhuetas em fatias de
 * `procedural/pecas/carro-sedan-classico/referencias/fonte-partes.json`, a única medida da referência que está no repositório.
 *
 * A fonte dá, em 48 fatias de 91,7 mm ao longo de z, a menor e a maior altura e a meia largura, e em 24 fatias de 63,5 mm ao longo de
 * y, a meia largura e os extremos em z. Cada contorno liga os valores das fatias pelo meio de cada fatia, com as pontas na caixa
 * total; a incerteza é de meia fatia (46 mm em z, 32 mm em y) onde a silhueta muda depressa. A fonte não separa as partes nem traz a
 * vista de trás.
 *
 *   lado.carro    x = -z do modelo (a frente à esquerda), y = altura; a carroceria com as rodas, sem o vão entre o pneu e o arco
 *   cima.carro    x = x do modelo, y = -z (a frente embaixo); com os retrovisores
 *   frente.carroceria   x = x do modelo, y = altura, de y 408 (o fundo da carroceria na fonte) para cima
 *   frente.rodas  os dois retângulos dos pneus abaixo da carroceria; a face de dentro em x 705 não está nas fatias e é a que a receita
 *                 do acervo leu da malha (927 de fora, menos 222 de pneu, aro e cubo)
 *
 * Uso: node procedural/pecas/sedan-chassi-e-lataria/referencias/derivar-contornos.mjs */
import { readFileSync, writeFileSync } from 'node:fs';

const FONTE = new URL('../../carro-sedan-classico/referencias/fonte-partes.json', import.meta.url);
const SAIDA = new URL('./sedan-chassi-e-lataria.contornos.json', import.meta.url);
const fonte = JSON.parse(readFileSync(FONTE, 'utf8'));
const mm = (v) => Math.round(v * 10000) / 10;
const area = (l) => Math.abs(l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2);
const regiao = (pedacos) => ({ areaMm2: Math.round(pedacos.reduce((s, p) => s + area(p), 0)), contornoMm: pedacos[0], pedacos: pedacos.map((p) => ({ areaMm2: Math.round(area(p)), contornoMm: p })) });

const emZ = fonte.silhueta.porFatiaEmZ;
const emY = fonte.silhueta.porFatiaEmY;
const meio = (f) => (f.de + f.ate) / 2;

/* de lado: a maior altura de frente para trás e a menor de trás para a frente, com as pontas na caixa total */
const frente = emZ.at(-1); const tras = emZ[0];
const cimaDoLado = [[mm(-frente.ate), mm(frente.ymax)], ...[...emZ].reverse().map((f) => [mm(-meio(f)), mm(f.ymax)]), [mm(-tras.de), mm(tras.ymax)]];
const baixoDoLado = [[mm(-tras.de), mm(tras.ymin)], ...emZ.map((f) => [mm(-meio(f)), mm(f.ymin)]), [mm(-frente.ate), mm(frente.ymin)]];
const lado = [...cimaDoLado, ...baixoDoLado];

/* de cima: a meia largura de trás para a frente do lado direito e de volta pelo esquerdo */
const direita = [[mm(tras.xmax), mm(-tras.de)], ...emZ.map((f) => [mm(f.xmax), mm(-meio(f))]), [mm(frente.xmax), mm(-frente.ate)]];
const cima = [...direita, ...[...direita].reverse().map(([x, y]) => [-x, y])];

/* de frente: a meia largura da carroceria do fundo dela (o mínimo em y da parte "Cube") ao teto */
const fundo = fonte.partes.find((p) => p.nome === 'Cube').minimo[1];
const daCarroceria = emY.filter((f) => f.ate > fundo);
const direitaDaFrente = [[mm(daCarroceria[0].xmax), mm(fundo)], ...daCarroceria.map((f) => [mm(f.xmax), mm(Math.max(meio(f), fundo))]), [mm(daCarroceria.at(-1).xmax), mm(daCarroceria.at(-1).ate)]];
const frenteDaCarroceria = [...direitaDaFrente, ...[...direitaDaFrente].reverse().map(([x, y]) => [-x, y])];
const rodas = fonte.partes.find((p) => p.nome === 'Cylinder');
const X_DE_DENTRO_DO_PNEU = 705;
const pneu = (s) => [[s * X_DE_DENTRO_DO_PNEU, 0], [s * mm(rodas.maximo[0]), 0], [s * mm(rodas.maximo[0]), mm(fundo)], [s * X_DE_DENTRO_DO_PNEU, mm(fundo)]];

const saida = {
  formato: 'mecanifica.contornos@1',
  fonte: 'derivado por derivar-contornos.mjs das silhuetas em fatias de procedural/pecas/carro-sedan-classico/referencias/fonte-partes.json (escala de 4,4 m); os valores das fatias ligados pelo meio de cada fatia, incerteza de meia fatia (46 mm em z, 32 mm em y); só os contornos em mm, x para a direita e y para cima da imagem',
  escalas: {
    lado: { origem: 'x = -z do modelo (a frente à esquerda), y = altura com o chão em 0', fatiaMm: 91.7 },
    cima: { origem: 'x = x do modelo, y = -z do modelo (a frente embaixo)', fatiaMm: 91.7 },
    frente: { origem: 'x = x do modelo, y = altura com o chão em 0', fatiaMm: 63.5 },
  },
  regioes: {
    'lado.carro': regiao([lado]),
    'cima.carro': regiao([cima]),
    'frente.carroceria': regiao([frenteDaCarroceria]),
    'frente.rodas': regiao([pneu(1), pneu(-1)]),
  },
};
writeFileSync(SAIDA, `${JSON.stringify(saida, null, 1)}\n`);
console.log(Object.entries(saida.regioes).map(([n, r]) => `${n}: ${r.areaMm2} mm², ${r.pedacos.length} pedaço(s)`).join('\n'));
