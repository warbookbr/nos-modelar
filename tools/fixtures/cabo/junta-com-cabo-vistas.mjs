#!/usr/bin/env node
/* junta-com-cabo-vistas.mjs — as vistas do cabo na junta, em tools/bancadas/out/cabos-na-junta/ (fora do git), pela imagem de trabalho de `vista-rapida.mjs` (raster em JavaScript, sem navegador): o arranjo que passa no início
 * (−90°), no meio (0°) e no fim (90°) do curso, e o arranjo que atravessa no passo zero. A montagem sai no referencial dela (o eixo da junta em y). O cabo é o tubo da família na pose, em laranja; a carcaça B em azul e as outras peças em cinza.
 * Uso: node tools/fixtures/cabo/junta-com-cabo-vistas.mjs [pasta de saída] */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { cursoDaJunta, portasDaResolvida, refazerNaPose, resolvidaNoValor } from '../../../procedural/familias/cabo/montagem.js';
import { rasterSombreado } from '../../modelar/vista-rapida.mjs';
import { paraPng } from '../../modelar/leitura-por-regioes.mjs';
import { ARRANJOS, prepararJuntaComCabo } from './junta-com-cabo.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const PASTA_DAS_VISTAS = resolve(AQUI, '../../bancadas/out/cabos-na-junta');
export const VISTAS = Object.freeze({ isometrica: [1, 0.9, 0.8], 'de-cima': [0, 1, 0], 'de-lado': [0, 0, 1] });
const CORES = { carcacaA: '#8a96a3', saidaA: '#b8c1ca', carcacaB: '#4f7fb0', saidaB: '#9fc1e0', cabo: '#e2641e' };
const matVec = (m, v) => m.map((l) => l[0] * v[0] + l[1] * v[1] + l[2] * v[2]);

function facesDaPose(pose, neutroDoCabo) {
  const faces = [];
  for (const i of pose.instancias) {
    const { rotacao, deslocamento } = i.poseMundo; const neutro = i.definicao.neutro;
    for (const f of neutro.F.values()) faces.push({ pts: f.vs.map((v) => matVec(rotacao, neutro.V.get(v)).map((c, k) => (c + deslocamento[k]) * 1000)), parte: i.id, cor: CORES[i.id] });
  }
  for (const f of neutroDoCabo.F.values()) faces.push({ pts: f.vs.map((v) => neutroDoCabo.V.get(v).map((c) => c * 1000)), parte: 'cabo', cor: CORES.cabo });
  return faces;
}

export function gerarVistas(pasta = PASTA_DAS_VISTAS) {
  const { execucao, resolvida, problemas, declaracao } = prepararJuntaComCabo();
  if (problemas.length) throw new Error(`a junta com cabo não montou: ${JSON.stringify(problemas)}`);
  const curso = cursoDaJunta(resolvida, declaracao);
  mkdirSync(pasta, { recursive: true });
  const saidas = [];
  const casos = [['passa', 0, 'inicio'], ['passa', 12, 'meio'], ['passa', 24, 'fim'], ['atravessa', 12, 'atravessa-no-meio']];
  for (const [arranjo, passo, nome] of casos) {
    const pose = resolvidaNoValor(resolvida, curso, curso.valoresSI[passo]);
    const feito = refazerNaPose(ARRANJOS[arranjo].pedido, portasDaResolvida(pose));
    if (!feito.chamadas) throw new Error(`o arranjo ${arranjo} não tem cabo no passo ${passo}: ${feito.recusa.mensagem}`);
    const { neutro } = executarReceita({ meta: { nome: 'cabo-na-pose' }, CHAMADAS_COMPOSICOES: feito.chamadas, PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {} }, execucao);
    const faces = facesDaPose(pose, neutro);
    for (const [vista, direcao] of Object.entries(VISTAS)) {
      const r = rasterSombreado(faces, { direcao, largura: 900 });
      const arquivo = resolve(pasta, `${nome}-${vista}.png`);
      writeFileSync(arquivo, paraPng(r.imagem)); saidas.push(arquivo);
    }
  }
  return saidas;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--ajuda')) { console.log('uso: node tools/fixtures/cabo/junta-com-cabo-vistas.mjs [pasta de saída]\nGera as vistas do cabo na junta (início, meio e fim do curso, e o arranjo que atravessa) em tools/bancadas/out/cabos-na-junta/.'); process.exit(0); }
  for (const a of gerarVistas(process.argv[2] ? resolve(process.argv[2]) : PASTA_DAS_VISTAS)) console.log(a);
}
