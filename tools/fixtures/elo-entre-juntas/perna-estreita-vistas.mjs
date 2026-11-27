#!/usr/bin/env node
/* perna-estreita-vistas.mjs — as vistas da perna estreita (a de `perna-estreita.mjs`) no referencial do esqueleto (y para cima, o membro em −y, o corpo para −x), em pé, dobrada (quadril e
 * joelho a 90°) e de frente com a largura e a linha do meio (x = 0) riscadas, em tools/bancadas/out/perna-estreita-final/ (fora do git), pela imagem de trabalho de `vista-rapida.mjs`.
 * Uso: node tools/fixtures/elo-entre-juntas/perna-estreita-vistas.mjs [pasta de saída]. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rasterSombreado } from '../../modelar/vista-rapida.mjs';
import { paraPng } from '../../modelar/leitura-por-regioes.mjs';
import { resolvidaNaPose } from './perna-de-prova.mjs';
import { larguraEmX, resolverPernaEstreita } from './perna-estreita.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const PASTA_DAS_VISTAS = resolve(AQUI, '../../bancadas/out/perna-estreita-final');
const CORES = { carcacaQuadril: '#5f7387', carcacaJoelho: '#5f7387', carcacaTornozelo: '#5f7387', saidaQuadril: '#a9b4be', saidaJoelho: '#a9b4be', saidaTornozelo: '#a9b4be', coxa: '#e2641e', canela: '#e2a21e' };
const matVec = (m, v) => m.map((l) => l[0] * v[0] + l[1] * v[1] + l[2] * v[2]);

/** As faces triangulares/polígonos da perna na pose, no referencial do esqueleto (mm), mais as hastes finas da linha do meio e dos limites de largura. */
function facesDa(resolvida, paraEsq, marcas) {
  const faces = [];
  for (const i of resolvida.instancias) {
    const { rotacao, deslocamento } = i.poseMundo; const neutro = i.definicao.neutro;
    for (const f of neutro.F.values()) faces.push({ pts: f.vs.map((v) => paraEsq.aplicar(matVec(rotacao, neutro.V.get(v)).map((c, k) => (c + deslocamento[k]) * 1000))), parte: i.id, cor: CORES[i.id] });
  }
  if (marcas) {
    const haste = (x, cor, e = 1.2) => { for (const s of [-1, 1]) faces.push({ pts: [[x - e, -20, -80 * s], [x + e, -20, -80 * s], [x + e, 1100, -80 * s], [x - e, 1100, -80 * s]], parte: 'marca', cor }); };
    haste(0, '#d11'); haste(marcas.minimo, '#0a0'); haste(marcas.maximo, '#0a0');
  }
  return faces;
}

export function gerarVistas(pasta = PASTA_DAS_VISTAS) {
  const { resolvida, portas, paraEsqueleto, problemas } = resolverPernaEstreita();
  if (problemas.length) throw new Error(`a perna estreita não montou: ${JSON.stringify(problemas)}`);
  mkdirSync(pasta, { recursive: true });
  const saidas = [];
  const poses = { 'em-pe': {}, dobrada: { quadril: 90, joelho: 90 } };
  /* a direção é a do objeto para a câmera, no referencial do esqueleto: +x lado de fora, +z frente, +y cima */
  const vistas = { 'iso': [1.2, 0.5, 1], 'de-lado': [1, 0, 0], 'de-frente': [0, 0, 1], 'de-cima': [0, 1, 0] };
  for (const [nomePose, graus] of Object.entries(poses)) {
    const r = resolvidaNaPose(resolvida, portas, graus); const m = larguraEmX(r, paraEsqueleto);
    for (const [nomeVista, direcao] of Object.entries(vistas)) {
      const faces = facesDa(r, paraEsqueleto, nomeVista === 'de-frente' || nomeVista === 'de-cima' ? m : null);
      const arquivo = resolve(pasta, `${nomePose}-${nomeVista}.png`);
      writeFileSync(arquivo, paraPng(rasterSombreado(faces, { direcao, largura: 900 }).imagem)); saidas.push(arquivo);
    }
  }
  return saidas;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const a of gerarVistas(process.argv[2] ? resolve(process.argv[2]) : PASTA_DAS_VISTAS)) console.log(a);
}
