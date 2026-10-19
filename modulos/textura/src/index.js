/**
 * Gerador determinístico da imagem de cor de um material, em JavaScript puro (sem Blender, sem Three.js
 * e sem o núcleo do Mecanifica). A entrada é o material no formato do bloco `materiais` do esboço.
 */
import { PNG } from 'pngjs';
import { linearParaSrgb255 } from './cor.js';
import { aplicarDesgaste } from './desgaste.js';
import { ErroDeTextura } from './erro.js';
import { pintarLiso } from './liso.js';
import { pintarMadeira } from './madeira.js';
import { campoDeRuido } from './ruido.js';

export { ErroDeTextura };

export const METROS_POR_TILE = { madeira: 0.5, liso: 0.5 };

function numero(material, campo, padrao, min, max) {
  const v = material[campo];
  if (v === undefined || v === null) return padrao;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
    throw new ErroDeTextura(`material.${campo} deve ser um número entre ${min} e ${max}.`);
  }
  return v;
}

function validarCor(cor) {
  if (!Array.isArray(cor) || cor.length !== 3 || cor.some((c) => typeof c !== 'number' || !Number.isFinite(c) || c < 0 || c > 255)) {
    throw new ErroDeTextura('material.cor deve ser [r, g, b] em sRGB de 0 a 255.');
  }
  return cor;
}

/**
 * @param {{tipo: string, cor: number[], desgaste?: number, veio?: number, borda?: number, tabuas?: number, ferrugem?: number}} material
 * @returns {{largura: number, altura: number, rgba: Uint8ClampedArray, metrosPorTile: number}}
 */
export function gerarTextura(material, { px = 512, semente = 1 } = {}) {
  if (!material || typeof material !== 'object') throw new ErroDeTextura('O material é obrigatório.');
  if (!Number.isInteger(px) || px < 16 || px > 4096) throw new ErroDeTextura('px deve ser um inteiro de 16 a 4096.');
  if (typeof semente !== 'number' || !Number.isFinite(semente)) throw new ErroDeTextura('semente deve ser um número.');
  const { tipo } = material;
  if (tipo === 'metal' || tipo === 'tecido') {
    throw new ErroDeTextura(`A textura de ${tipo} ainda não existe; só madeira e liso.`);
  }
  if (tipo !== 'madeira' && tipo !== 'liso') {
    throw new ErroDeTextura(`Tipo de material desconhecido: ${JSON.stringify(tipo)}.`);
  }
  const cor = validarCor(material.cor);
  const desgaste = numero(material, 'desgaste', 0, 0, 1);
  const ferrugem = numero(material, 'ferrugem', 0, 0, 1);
  const veio = numero(material, 'veio', 1, 0, 10);
  const borda = numero(material, 'borda', 0, 0, 1);
  const tabuas = numero(material, 'tabuas', 0, 0, 32);
  if (!Number.isInteger(tabuas)) throw new ErroDeTextura('material.tabuas deve ser um inteiro.');

  const metros = METROS_POR_TILE[tipo];
  let contador = 0;
  const ctx = {
    px,
    ruido(nu, nv, opcoes = {}) {
      contador += 1;
      const campo = campoDeRuido(px, nu, nv, { ...opcoes, semente: semente * 977 + contador * 31 });
      return campo;
    },
    juntas: null,
  };

  const col = new Float32Array(px * px * 3);
  const juntas = tipo === 'madeira'
    ? pintarMadeira(col, ctx, { cor, veio, borda, tabuas, semente, metros })
    : pintarLiso(col, ctx, { cor });
  ctx.juntas = juntas;
  if (desgaste > 0) aplicarDesgaste(col, ctx, desgaste, ferrugem);

  const rgba = new Uint8ClampedArray(px * px * 4);
  for (let p = 0; p < px * px; p += 1) {
    rgba[p * 4] = linearParaSrgb255(col[p * 3]);
    rgba[p * 4 + 1] = linearParaSrgb255(col[p * 3 + 1]);
    rgba[p * 4 + 2] = linearParaSrgb255(col[p * 3 + 2]);
    rgba[p * 4 + 3] = 255;
  }
  return { largura: px, altura: px, rgba, metrosPorTile: metros };
}

/** Bytes de um PNG RGBA 8 bits da textura. */
export function texturaParaPng(textura) {
  const png = new PNG({ width: textura.largura, height: textura.altura });
  png.data = Buffer.from(textura.rgba.buffer, textura.rgba.byteOffset, textura.rgba.byteLength);
  return new Uint8Array(PNG.sync.write(png));
}
