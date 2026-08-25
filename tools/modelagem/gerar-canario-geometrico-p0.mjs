/* Canário P0: fixture sintética calibrada para provar o fluxo de fitting. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMATO_QUALIFICACAO_ALVO, validarQualificacaoAlvo } from '../../src/autoria/qualificacao-alvo.js';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pasta = resolve(raiz, 'autoria-assistida', 'alvos', 'canario-geometrico-p0');
const hash = (conteudo) => createHash('sha256').update(conteudo).digest('hex');
const objeto = 'prisma-cunha-sintetico-p0';
const malha = Object.freeze({
  unidade: 'mm',
  vertices: [[-80, -45, -30], [80, -45, -30], [80, 45, -30], [-80, 45, -30], [-45, -35, 50], [45, -35, 50], [45, 35, 50], [-45, 35, 50]],
  faces: [[0, 1, 2, 3], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0], [4, 7, 6, 5]],
});
const vistasBase = [
  { id: 'frontal', camera: { projeção: 'ortografica', escalaMmPorPixel: 1, matrizMundoParaCamera: [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 300, 1] }, poligonos: ['120,180 200,180 190,70 130,70'], landmarks2d: [{ id: 'base-esquerda', xy: [120, 180] }, { id: 'topo', xy: [160, 70] }, { id: 'base-direita', xy: [200, 180] }] },
  { id: 'lateral-direita', camera: { projeção: 'ortografica', escalaMmPorPixel: 1, matrizMundoParaCamera: [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 300, 1] }, poligonos: ['80,180 240,180 205,70 115,70'], landmarks2d: [{ id: 'nariz', xy: [80, 180] }, { id: 'teto-frontal', xy: [115, 70] }, { id: 'teto-traseiro', xy: [205, 70] }, { id: 'cauda', xy: [240, 180] }] },
  { id: 'superior', camera: { projeção: 'ortografica', escalaMmPorPixel: 1, matrizMundoParaCamera: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 300, 1] }, poligonos: ['80,180 240,180 205,70 115,70', '115,160 205,160 185,95 135,95'], landmarks2d: [{ id: 'ponta-esquerda', xy: [80, 180] }, { id: 'ponta-direita', xy: [240, 180] }, { id: 'teto-esquerdo', xy: [135, 95] }, { id: 'teto-direito', xy: [185, 95] }] },
];

function svgDaVista(vista) {
  const corpos = vista.poligonos.map((pontos, indice) => `<polygon points="${pontos}" fill="${indice ? '#6fa8dc' : '#17365d'}" stroke="#081a2c" stroke-width="3"/>`).join('');
  const pontos = vista.landmarks2d.map(({ id, xy }) => `<circle id="${id}" cx="${xy[0]}" cy="${xy[1]}" r="4" fill="#ffcc00"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><rect width="320" height="240" fill="#eef2f3"/><path d="M0 120H320M160 0V240" stroke="#c8d1d4"/>${corpos}${pontos}<text x="12" y="22" font-family="sans-serif" font-size="14" fill="#17365d">${vista.id} — ${objeto}</text></svg>\n`;
}

function escreverSeDiferente(arquivo, conteudo) {
  mkdirSync(dirname(arquivo), { recursive: true });
  if (!readFileSyncSeguro(arquivo)?.equals(Buffer.from(conteudo))) writeFileSync(arquivo, conteudo);
}
function readFileSyncSeguro(arquivo) { try { return readFileSync(arquivo); } catch { return null; } }

export function qualificarConjuntoDeVistasCanario(manifesto) {
  const esperado = manifesto.qualificacao?.geometria?.objeto;
  if (!esperado || manifesto.vistas.some((vista) => vista.objeto !== esperado)) {
    return validarQualificacaoAlvo({
      formato: FORMATO_QUALIFICACAO_ALVO, versao: 1, id: 'canario-conjunto-indeterminado', classe: 'indeterminado',
      origem: { tipo: 'canario-sintetico', hash: `sha256:${hash(JSON.stringify(manifesto.vistas ?? []))}` },
      limitacoes: ['vistas-identidade-incompativel'], motivo: 'As vistas não pertencem comprovadamente ao mesmo objeto.',
    });
  }
  return validarQualificacaoAlvo(manifesto.qualificacao);
}

export function gerarCanarioGeometricoP0() {
  const origemHash = `sha256:${hash(JSON.stringify(malha))}`;
  const vistas = vistasBase.map((vista) => {
    const arquivo = `vistas/${vista.id}.svg`;
    const conteudo = svgDaVista(vista);
    escreverSeDiferente(resolve(pasta, arquivo), conteudo);
    return { id: vista.id, objeto, arquivo, sha256: hash(conteudo), camera: vista.camera, landmarks2d: vista.landmarks2d, oclusoes: [] };
  });
  const manifesto = {
    formato: 'mecanifica.canario-geometrico-p0@1', id: 'canario-geometrico-p0', semente: 'p0-fixa-01', malha,
    qualificacao: { formato: FORMATO_QUALIFICACAO_ALVO, versao: 1, id: 'canario-geometrico-p0', classe: 'alvo-geometrico', origem: { tipo: 'canario-sintetico', hash: origemHash }, limitacoes: [], geometria: { objeto, escala: { unidade: 'mm', fator: 1 }, cameras: vistas.map(({ id }) => id), correspondencias: ['base-esquerda', 'base-direita', 'topo'] } },
    landmarks3d: [{ id: 'base-esquerda', xyz: [-80, -45, -30] }, { id: 'base-direita', xyz: [80, -45, -30] }, { id: 'topo', xyz: [0, 0, 50] }],
    vistas,
  };
  escreverSeDiferente(resolve(pasta, 'manifesto.json'), `${JSON.stringify(manifesto, null, 2)}\n`);
  return manifesto;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(gerarCanarioGeometricoP0(), null, 2));
