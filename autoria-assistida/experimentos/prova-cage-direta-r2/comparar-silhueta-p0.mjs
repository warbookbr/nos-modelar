/* Mede a silhueta visível da R2 contra as curvas P0, sem inferir por vértices.
   Cada limite é lido da máscara de profundidade da mesma câmera ortográfica. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { filete } from '../../../tools/mecanifica/prancha-geometria.mjs';
import { FRONTAL, PLANTA, TOPO } from '../../../tools/mecanifica/alvo-chassi-p0.mjs';
import { capturarVistas, mascaraDaSilhueta } from '../prova-captura-r1b/renderizador-profundo.mjs';
import { criarCageDireta, espelharCage } from './cage-direta.mjs';
import { subdividirUmNivel } from './subdividir.mjs';
import briefing from './briefing-r2.json' with { type: 'json' };

const MARGEM = 12;
const tela = (captura, [u, v]) => {
  const { minU, maxU, minV, maxV } = captura.camera.quadro;
  const escala = Math.min((captura.largura - MARGEM * 2) / (maxU - minU), (captura.altura - MARGEM * 2) / (maxV - minV));
  return [MARGEM + (u - minU) * escala, captura.altura - MARGEM - (v - minV) * escala, escala];
};
const limiteEmColuna = (mascara, largura, altura, x, extremo) => {
  for (let distancia = 0; distancia <= 2; distancia += 1) for (const coluna of [x - distancia, x + distancia]) {
    if (coluna < 0 || coluna >= largura) continue;
    const ys = [];
    for (let y = 0; y < altura; y += 1) if (mascara[y * largura + coluna]) ys.push(y);
    if (ys.length) return extremo === 'superior' ? Math.min(...ys) : Math.max(...ys);
  }
  return null;
};
const limiteEmLinha = (mascara, largura, altura, y) => {
  for (let distancia = 0; distancia <= 2; distancia += 1) for (const linha of [y - distancia, y + distancia]) {
    if (linha < 0 || linha >= altura) continue;
    const xs = [];
    for (let x = 0; x < largura; x += 1) if (mascara[linha * largura + x]) xs.push(x);
    if (xs.length) return Math.max(...xs);
  }
  return null;
};
function medirCurva(captura, curva, projetar, leitura) {
  const mascara = mascaraDaSilhueta(captura); const desvios = [];
  for (const ponto of curva) {
    const [x, y, escala] = tela(captura, projetar(ponto));
    const observado = leitura(mascara, captura.largura, captura.altura, Math.round(x), Math.round(y));
    if (observado === null) continue;
    const esperado = leitura.eixo === 'x' ? x : y;
    desvios.push({ alvoMm: ponto.slice(0, 2), desvioMm: (observado - esperado) / escala * 1000 });
  }
  const absolutos = desvios.map(({ desvioMm }) => Math.abs(desvioMm));
  const pior = desvios.reduce((maior, atual) => Math.abs(atual.desvioMm) > Math.abs(maior.desvioMm) ? atual : maior);
  return {
    amostras: desvios.length,
    medioMm: Number((absolutos.reduce((s, n) => s + n, 0) / absolutos.length).toFixed(1)),
    maximoMm: Number(Math.max(...absolutos).toFixed(1)),
    pior: { alvoMm: pior.alvoMm, desvioMm: Number(pior.desvioMm.toFixed(1)) },
  };
}

export function compararSilhuetasP0({ largura = 1024, altura = 768, ajustesDaCage } = {}) {
  const malha = subdividirUmNivel(espelharCage(criarCageDireta(ajustesDaCage)));
  const vistas = capturarVistas(malha, { largura, altura, quadros: undefined, geometria: 'inteira', finalidade: 'conjunto' });
  for (const vista of Object.keys(vistas)) vistas[vista] = capturarVistas(malha, { largura, altura, quadro: briefing.cameras[vista], geometria: 'inteira', finalidade: 'conjunto' })[vista];
  const lateral = medirCurva(vistas.lateral, filete(TOPO), ([z, y]) => [-z / 1000, y / 1000], Object.assign((m, w, h, x) => limiteEmColuna(m, w, h, x, 'superior'), { eixo: 'y' }));
  const superior = medirCurva(vistas.superior, filete(PLANTA), ([z, x]) => [x / 1000, -z / 1000], Object.assign((m, w, h, _x, y) => limiteEmLinha(m, w, h, y), { eixo: 'x' }));
  const frontal = medirCurva(vistas.frontal, filete(FRONTAL), ([y, x]) => [x / 1000, y / 1000], Object.assign((m, w, h, _x, y) => limiteEmLinha(m, w, h, y), { eixo: 'x' }));
  return { formato: 'mecanifica.comparacao-silhueta-r2@1', largura, altura, assinaturaMalha: vistas.lateral.assinaturaMalha, vistas: { lateral, superior, frontal } };
}

export function gravarComparacaoP0() {
  const aqui = path.dirname(fileURLToPath(import.meta.url)); const relatorio = compararSilhuetasP0();
  const destino = path.join(aqui, 'evidencias', 'forma-global-16', 'comparacao-silhueta-p0.json');
  mkdirSync(path.dirname(destino), { recursive: true }); writeFileSync(destino, `${JSON.stringify(relatorio, null, 2)}\n`);
  return relatorio;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(gravarComparacaoP0(), null, 2));
