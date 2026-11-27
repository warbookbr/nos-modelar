#!/usr/bin/env node
/* elo-de-chapa-vistas.mjs — as vistas da coxa em chapa (a de `elo-de-chapa.mjs`), montada entre os dois atuadores e a chapa sozinha, em tools/bancadas/out/perna-estreita-chapa/ (fora do
 * git), pela imagem de trabalho de `vista-rapida.mjs` (raster em JavaScript, sem navegador). A montagem sai no referencial dela (o eixo da junta em y, a chapa de y = 73 a 79 e o
 * membro ao longo de z). Uso: node tools/fixtures/elo-entre-juntas/elo-de-chapa-vistas.mjs [pasta de saída]. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { rasterSombreado } from '../../modelar/vista-rapida.mjs';
import { paraPng } from '../../modelar/leitura-por-regioes.mjs';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';
import { CHAPA_DA_COXA } from './elo-de-chapa.mjs';
import { montarEloEntreAtuadores } from './elo-entre-atuadores.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const PASTA_DAS_VISTAS = resolve(AQUI, '../../bancadas/out/perna-estreita-chapa');
/** Cada vista: o nome e a direção do objeto para a câmera. */
export const VISTAS = Object.freeze({
  'isometrica-a': [1, 0.8, 0.9], 'isometrica-b': [-1, -0.8, 0.9], 'do-lado-da-chapa': [0, 1, 0], 'do-lado-dos-atuadores': [0, -1, 0], 'de-lado': [1, 0, 0], 'de-cima': [0, 0, 1],
});
const CORES = { carcacaA: '#5f7387', carcacaB: '#5f7387', saidaA: '#a9b4be', saidaB: '#a9b4be', elo: '#e2641e' };
const matVec = (m, v) => m.map((l) => l[0] * v[0] + l[1] * v[1] + l[2] * v[2]);

function facesDa(resolvida, ids) {
  const faces = [];
  for (const i of resolvida.instancias.filter((x) => ids.includes(x.id))) {
    const { rotacao, deslocamento } = i.poseMundo; const neutro = i.definicao.neutro;
    for (const f of neutro.F.values()) faces.push({ pts: f.vs.map((v) => matVec(rotacao, neutro.V.get(v)).map((c, k) => (c + deslocamento[k]) * 1000)), parte: i.id, cor: CORES[i.id] });
  }
  return faces;
}

export function gerarVistas(pasta = PASTA_DAS_VISTAS) {
  const registro = criarRegistroDeFamilias();
  const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
  const gerada = montarEloEntreAtuadores(registro.obter('atuador-de-junta'), registro.obter('elo-entre-juntas'), CHAPA_DA_COXA);
  const { problemas, resolvida } = resolverMontagemDaFamilia({ montar: () => gerada }, {}, execucao);
  if (problemas.length) throw new Error(`a coxa em chapa não montou: ${JSON.stringify(problemas)}`);
  mkdirSync(pasta, { recursive: true });
  const saidas = [];
  for (const [conjunto, ids] of [['montada', ['carcacaA', 'saidaA', 'elo', 'carcacaB', 'saidaB']], ['chapa-sozinha', ['elo']]]) {
    const faces = facesDa(resolvida, ids);
    for (const [vista, direcao] of Object.entries(VISTAS)) {
      const r = rasterSombreado(faces, { direcao, largura: 900 });
      const arquivo = resolve(pasta, `${conjunto}-${vista}.png`);
      writeFileSync(arquivo, paraPng(r.imagem)); saidas.push(arquivo);
    }
  }
  return saidas;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const a of gerarVistas(process.argv[2] ? resolve(process.argv[2]) : PASTA_DAS_VISTAS)) console.log(a);
}
