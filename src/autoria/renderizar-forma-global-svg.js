/* Adaptador SVG puro da N2. Consome somente alvo e blocagem neutros; não usa
   DOM, Three.js, câmera de runtime ou caminhos de arquivo. */

import {
  FORMATO_BLOCAGEM_GLOBAL, VISTAS_EVIDENCIA_FORMA_GLOBAL,
  detalhesInternosFormaGlobal, normalizarAlvoFormaGlobal,
} from './forma-global.js';

const { limitesDaVista, projetar } = detalhesInternosFormaGlobal;
const CORES = ['#315f9b', '#4977ad', '#1f4f88', '#668bb7', '#244874', '#7a9abe', '#173c69', '#527fae'];

function falhar(mensagem) { throw new Error(`render-forma-global: ${mensagem}`); }
function escapar(valor) { return String(valor).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function cruz(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
function cascoConvexo(pontos) {
  const unicos = [...new Map(pontos.map((p) => [`${p[0]}:${p[1]}`, p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (unicos.length <= 2) return unicos;
  const inferior = [], superior = [];
  for (const p of unicos) { while (inferior.length >= 2 && cruz(inferior.at(-2), inferior.at(-1), p) <= 0) inferior.pop(); inferior.push(p); }
  for (let i = unicos.length - 1; i >= 0; i--) { const p = unicos[i]; while (superior.length >= 2 && cruz(superior.at(-2), superior.at(-1), p) <= 0) superior.pop(); superior.push(p); }
  inferior.pop(); superior.pop(); return [...inferior, ...superior];
}
function projecaoIsometrica([x, y, z]) { return [x - z * 0.72, y + (x + z) * 0.28]; }
function pontosDoVolume(blocagem, volume) {
  return blocagem.malha.vertices.slice(volume.inicioVertice, volume.inicioVertice + volume.quantidadeVertices);
}
function limitesIsometricos(blocagem) {
  const pontos = blocagem.malha.vertices.map(projecaoIsometrica);
  return [Math.min(...pontos.map((p) => p[0])), Math.min(...pontos.map((p) => p[1])), Math.max(...pontos.map((p) => p[0])), Math.max(...pontos.map((p) => p[1]))];
}
function cena({ alvo, blocagem, vista, mostrarAlvo, mostrarModelo, exporSemantica, largura = 960, altura = 640 }) {
  if (!VISTAS_EVIDENCIA_FORMA_GLOBAL.includes(vista)) falhar(`vista '${vista}' não é suportada.`);
  const limites = vista === 'isometrica' ? limitesIsometricos(blocagem) : limitesDaVista(alvo.envelope, vista);
  const margem = 54, spanA = limites[2] - limites[0], spanB = limites[3] - limites[1];
  const escala = Math.min((largura - margem * 2) / spanA, (altura - margem * 2) / spanB);
  const sobraA = (largura - spanA * escala) / 2, sobraB = (altura - spanB * escala) / 2;
  const tela = ([a, b]) => [sobraA + (a - limites[0]) * escala, altura - sobraB - (b - limites[1]) * escala];
  const pontosSvg = (pontos) => pontos.map((p) => tela(p).map((n) => n.toFixed(2)).join(',')).join(' ');
  const saida = [];
  saida.push(`<rect width="${largura}" height="${altura}" fill="#f5f6f4"/>`);
  saida.push(`<rect x="18" y="18" width="${largura - 36}" height="${altura - 36}" rx="16" fill="#eef1ef" stroke="#d5dad7"/>`);
  if (mostrarAlvo && vista !== 'isometrica') for (const contorno of alvo.vistas[vista].contornos) {
    saida.push(`<polygon points="${pontosSvg(contorno.pontos)}" fill="#8e959b" fill-opacity="0.24" stroke="#747c83" stroke-width="3" stroke-dasharray="10 7"/>`);
  }
  const volumes = (mostrarModelo ? blocagem.volumes : []).map((volume, indice) => {
    const pontos3d = pontosDoVolume(blocagem, volume);
    const camadaVertical = pontos3d.reduce((soma, ponto) => soma + ponto[1], 0) / pontos3d.length;
    const pontos2d = pontos3d.map((ponto) => vista === 'isometrica' ? projecaoIsometrica(ponto) : projetar(ponto, vista));
    return { volume, indice, camadaVertical, casco: cascoConvexo(pontos2d) };
  }).sort((a, b) => a.camadaVertical - b.camadaVertical || a.indice - b.indice);
  for (const { volume, indice, casco } of volumes) {
    const semantica = exporSemantica ? ` data-volume="${escapar(volume.id)}" data-regioes="${escapar(volume.regioes.join(' '))}"` : '';
    saida.push(`<polygon points="${pontosSvg(casco)}" fill="${CORES[indice % CORES.length]}" stroke="#153653" stroke-width="2.2"${semantica}/>`);
  }
  saida.push(`<text x="38" y="50" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18" font-weight="650" fill="#28323b">${escapar(vista.toUpperCase())}</text>`);
  saida.push(`<text x="38" y="76" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" fill="#66717a">material neutro · volumes globais · sem detalhe</text>`);
  return { largura, altura, corpo: saida.join('\n') };
}

function conferirBlocagem(blocagem) {
  if (!blocagem || blocagem.formato !== FORMATO_BLOCAGEM_GLOBAL || !blocagem.malha || !Array.isArray(blocagem.volumes)) {
    falhar('blocagem precisa ser produto neutro da N2.');
  }
}

export function renderizarVistaFormaGlobalSvg({ alvo: bruto, blocagem, vista, mostrarAlvo = true, mostrarModelo = true, exporSemantica = true }) {
  const alvo = normalizarAlvoFormaGlobal(bruto); conferirBlocagem(blocagem);
  const render = cena({ alvo, blocagem, vista, mostrarAlvo, mostrarModelo, exporSemantica });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${render.largura} ${render.altura}" width="${render.largura}" height="${render.altura}">\n${render.corpo}\n</svg>\n`;
}

export function renderizarPainelFormaGlobalSvg({ alvo: bruto, blocagem, mostrarAlvo = true, mostrarModelo = true, exporSemantica = true }) {
  const alvo = normalizarAlvoFormaGlobal(bruto); conferirBlocagem(blocagem);
  const largura = 720, altura = 480, gap = 18, painelLargura = largura * 2 + gap * 3, painelAltura = altura * 2 + gap * 3;
  const cenas = VISTAS_EVIDENCIA_FORMA_GLOBAL.map((vista) => cena({ alvo, blocagem, vista, mostrarAlvo, mostrarModelo, exporSemantica, largura, altura }));
  const posicoes = [[gap, gap], [largura + gap * 2, gap], [gap, altura + gap * 2], [largura + gap * 2, altura + gap * 2]];
  const grupos = cenas.map((item, indice) => `<g transform="translate(${posicoes[indice][0]} ${posicoes[indice][1]})">${item.corpo}</g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${painelLargura} ${painelAltura}" width="${painelLargura}" height="${painelAltura}">\n<rect width="100%" height="100%" fill="#dde2df"/>\n${grupos.join('\n')}\n</svg>\n`;
}
