/* Materializa o contraexemplo mínimo R1B: duas faces coincidentes em tela. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMERAS, capturar, pngsDaCaptura, validarCaptura } from './renderizador-profundo.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const placa = (z, parte) => ({ vs: [`${parte}-0`, `${parte}-1`, `${parte}-2`, `${parte}-3`], parte, z });
const faces = [placa(2, 'frente'), placa(1, 'traseira')];
const V = new Map();
for (const face of faces) {
  const pontos = [[-1, -1, face.z], [1, -1, face.z], [1, 1, face.z], [-1, 1, face.z]];
  face.vs.forEach((id, indice) => V.set(id, pontos[indice]));
}
const malha = { V, F: new Map(faces.map((face, indice) => [indice, face])) };
const captura = capturar(malha, { camera: CAMERAS.frontal, vista: 'frontal', largura: 320, altura: 240, quadro: { minU: -1.2, maxU: 1.2, minV: -1.2, maxV: 1.2 }, geometria: 'inteira' });
validarCaptura(captura);
const destino = path.join(aqui, 'evidencias', 'oclusao-duas-placas');
mkdirSync(destino, { recursive: true });
for (const [modalidade, png] of Object.entries(pngsDaCaptura(captura))) writeFileSync(path.join(destino, `${modalidade}.png`), png);
writeFileSync(path.join(destino, 'captura.json'), `${JSON.stringify({
  tipo: 'mecanifica.prova-captura-r1b@1',
  camera: captura.camera,
  declaracao: captura.declaracao,
  assinaturaMalha: captura.assinaturaMalha,
  dimensoes: { largura: captura.largura, altura: captura.altura },
  cobertura: captura.cobertura,
  facesVisiveis: captura.facesVisiveis,
  modalidades: ['superficie', 'profundidade', 'normais', 'wireframe', 'identidade'],
  cenario: 'duas placas sobrepostas; a placa frontal deve ocultar a traseira',
}, null, 2)}\n`);
console.log(destino);
