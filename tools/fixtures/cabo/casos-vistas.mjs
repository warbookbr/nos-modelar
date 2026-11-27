#!/usr/bin/env node
/* casos-vistas.mjs — as imagens do cabo para a aprovação da pessoa, em tools/bancadas/out/cabos-fatia8/ (fora do git), pelo raster em JavaScript de `vista-rapida.mjs`:
 * os casos da fatia 1 (laço, caimento, a frente com 8 e com 24 lados) e os da fatia 2 (duas braçadeiras, terminais de capa e olhal, feixe de três cabos), cada um na vista isométrica e de cima.
 * A junta nas três poses sai de `junta-com-cabo-vistas.mjs`.
 * Uso: node tools/fixtures/cabo/casos-vistas.mjs [pasta de saída] */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chamar, criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { cabo, feixeDeCabos } from '../../../procedural/familias/cabo/index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { instanciaDeFamilia } from '../../modelar/instancia-de-familia.mjs';
import { rasterSombreado } from '../../modelar/vista-rapida.mjs';
import { paraPng } from '../../modelar/leitura-por-regioes.mjs';
import { CASOS_DO_CABO } from './casos.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const PASTA_DOS_CASOS = resolve(AQUI, '../../bancadas/out/cabos-fatia8');
const VISTAS = Object.freeze({ isometrica: [1, 0.9, 0.8], 'de-cima': [0, 1, 0] });
const COR = (parte) => (/terminal/.test(parte) ? '#4f7fb0' : /bracadeira/.test(parte) ? '#9fc1e0' : /-2$/.test(parte) ? '#c9a227' : /-3$/.test(parte) ? '#2f9e6b' : '#e2641e');

const registro = criarRegistroDeFamilias();
const F = registro.obter('cabo');
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const gerar = (chamadas) => executarReceita({ meta: { nome: 'cabo' }, get CHAMADAS_COMPOSICOES() { return chamadas; } }, execucao).neutro;
const gerarFeixe = (pedido) => executarReceita({ meta: { nome: 'feixe' }, PASSOS: instanciaDeFamilia({ familia: 'cabo', registro, poses: feixeDeCabos(pedido).poses }).passos }, { registroOperacoes: registro.registroOperacoes }).neutro;

/** As faces de um neutro em milímetro, coloridas pela parte. */
export const facesDoNeutro = (neutro) => [...neutro.F.values()].map((f) => ({ pts: f.vs.map((v) => neutro.V.get(v).map((c) => c * 1000)), parte: f.parte, cor: COR(String(f.parte)) }));

/** Duas imagens lado a lado, com o mesmo quadro (a caixa das duas juntas) e uma faixa clara entre elas. */
export function ladoALado(facesEsquerda, facesDireita, direcao, largura = 700) {
  const todos = [...facesEsquerda, ...facesDireita].flatMap((f) => f.pts);
  const eixo = (k) => [Math.min(...todos.map((p) => p[k])), Math.max(...todos.map((p) => p[k]))];
  const [x0, x1] = eixo(0); const [y0, y1] = eixo(1); const [z0, z1] = eixo(2);
  const cantos = []; for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) cantos.push([x, y, z]);
  const moldura = { pts: [cantos[0], cantos[0], cantos[0]], parte: 'moldura', cor: '#ffffff' }; // sem área: só entra na caixa
  const quadro = cantos.map((p) => ({ pts: [p, p, p], parte: 'moldura', cor: '#ffffff' })); void moldura;
  const a = rasterSombreado([...facesEsquerda, ...quadro], { direcao, largura }).imagem;
  const b = rasterSombreado([...facesDireita, ...quadro], { direcao, largura }).imagem;
  const faixa = 12; const L = a.largura + faixa + b.largura; const dados = new Uint8Array(L * a.altura * 3).fill(255);
  for (let y = 0; y < a.altura; y += 1) {
    dados.set(a.dados.subarray(y * a.largura * 3, (y + 1) * a.largura * 3), y * L * 3);
    dados.set(b.dados.subarray(y * b.largura * 3, (y + 1) * b.largura * 3), (y * L + a.largura + faixa) * 3);
  }
  return { largura: L, altura: a.altura, dados };
}

export function gerarImagens(pasta = PASTA_DOS_CASOS) {
  mkdirSync(pasta, { recursive: true });
  const saidas = [];
  const gravar = (nome, neutro) => {
    for (const [vista, direcao] of Object.entries(VISTAS)) {
      const arquivo = resolve(pasta, `${nome}-${vista}.png`);
      writeFileSync(arquivo, paraPng(rasterSombreado(facesDoNeutro(neutro), { direcao, largura: 900 }).imagem)); saidas.push(arquivo);
    }
  };
  const casos = {
    laco: gerar([chamar(F, 'cabo', CASOS_DO_CABO.laco.parametros)]),
    caimento: gerar([chamar(F, 'cabo', CASOS_DO_CABO.caimento.parametros)]),
    'frente-lados-8': gerar([chamar(F, 'cabo', { ...CASOS_DO_CABO.frente.parametros, lados: 8 })]),
    'frente-lados-24': gerar([chamar(F, 'cabo', { ...CASOS_DO_CABO.frente.parametros, lados: 24 })]),
    bracadeiras: gerar(cabo({ de: { ponto: [0, 0, 0], direcao: '+x' }, para: { ponto: [300, 0, 0], direcao: '-x' }, comprimento: 350, diametro: 4, passagens: [{ ponto: [100, 30, 0] }, { ponto: [200, 30, 0], direcao: '+x' }], bracadeiras: true })),
    terminais: gerar(cabo({ de: { ponto: [0, 0, 0], direcao: '+x' }, para: { ponto: [150, 40, 0], direcao: '-x' }, comprimento: 210, diametro: 4, lados: 8, terminais: { de: 'capa', para: 'olhal' } })),
    feixe: gerarFeixe({ de: { ponto: [0, 0, 0], direcao: '+x' }, para: { ponto: [200, 0, 0], direcao: '-x' }, comprimento: 260, feixe: { diametros: [4, 3, 3] }, lados: 8 }),
  };
  for (const [nome, neutro] of Object.entries(casos)) gravar(nome, neutro);
  return saidas;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--ajuda')) { console.log('uso: node tools/fixtures/cabo/casos-vistas.mjs [pasta de saída]\nGera as imagens dos casos do cabo (laço, caimento, 8 e 24 lados, braçadeiras, terminais, feixe) em tools/bancadas/out/cabos-fatia8/.'); process.exit(0); }
  for (const a of gerarImagens(process.argv[2] ? resolve(process.argv[2]) : PASTA_DOS_CASOS)) console.log(a);
}
