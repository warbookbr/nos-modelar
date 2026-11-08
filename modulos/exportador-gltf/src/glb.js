/* glb.js — o contêiner glTF binário (.glb): cabeçalho de 12 bytes, o pedaço JSON (preenchido com espaços até múltiplo de 4) e o
   pedaço BIN (preenchido com zeros). Sem data, sem acaso: os mesmos JSON e BIN dão sempre os mesmos bytes. */
const MAGIA = 0x46546c67; // 'glTF'
const PEDACO_JSON = 0x4e4f534a;
const PEDACO_BIN = 0x004e4942;

const preencher = (n) => (4 - (n % 4)) % 4;

export function escreverGlb(json, bin) {
  const texto = new TextEncoder().encode(JSON.stringify(json));
  const jsonLen = texto.length + preencher(texto.length);
  const binLen = bin.length + preencher(bin.length);
  const total = 12 + 8 + jsonLen + (binLen > 0 ? 8 + binLen : 0);
  const saida = new Uint8Array(total);
  const vista = new DataView(saida.buffer);
  vista.setUint32(0, MAGIA, true);
  vista.setUint32(4, 2, true);
  vista.setUint32(8, total, true);
  vista.setUint32(12, jsonLen, true);
  vista.setUint32(16, PEDACO_JSON, true);
  saida.set(texto, 20);
  saida.fill(0x20, 20 + texto.length, 20 + jsonLen);
  if (binLen > 0) {
    const o = 20 + jsonLen;
    vista.setUint32(o, binLen, true);
    vista.setUint32(o + 4, PEDACO_BIN, true);
    saida.set(bin, o + 8);
  }
  return saida;
}

/** Lê um .glb de volta em { json, bin } (para os testes e para quem confere o arquivo). */
export function lerGlb(bytes) {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (vista.getUint32(0, true) !== MAGIA) throw new Error('lerGlb: não é um arquivo glTF binário.');
  const total = vista.getUint32(8, true);
  if (total !== bytes.byteLength) throw new Error(`lerGlb: o cabeçalho diz ${total} bytes e o arquivo tem ${bytes.byteLength}.`);
  let json = null;
  let bin = new Uint8Array(0);
  for (let o = 12; o < total;) {
    const len = vista.getUint32(o, true);
    const tipo = vista.getUint32(o + 4, true);
    const dados = bytes.subarray(o + 8, o + 8 + len);
    if (tipo === PEDACO_JSON) json = JSON.parse(new TextDecoder().decode(dados));
    else if (tipo === PEDACO_BIN) bin = dados;
    o += 8 + len;
  }
  return { json, bin };
}
