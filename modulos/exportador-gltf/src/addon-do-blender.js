/* addon-do-blender.js — o addon do Blender do cabo vivo (`blender/addon_cabo_vivo/`) empacotado como `.zip` instalável: a extensão do Blender 4.2 ou mais nova
   (`blender_manifest.toml` na raiz do zip, que a janela Extensões > Instalar do disco aceita), com o `bl_info` no `__init__.py` para o Blender mais antigo. O zip é
   determinístico: entradas em ordem, data fixa e compressão deflate fixa, então a mesma fonte dá os mesmos bytes. */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

export const PASTA_DO_ADDON_DO_CABO = fileURLToPath(new URL('../blender/addon_cabo_vivo/', import.meta.url));
export const NOME_DO_ZIP_DO_ADDON = 'modelar_cabo_vivo.zip';

const DATA_DOS_ARQUIVOS = { hora: 0, data: (1 << 5) | 1 }; // 1980-01-01 00:00

/** Os arquivos do addon, em ordem: `[{ nome, bytes }]`; só o que é do addon (py, toml), sem `__pycache__`. */
export function arquivosDoAddonDoCabo(pasta = PASTA_DO_ADDON_DO_CABO) {
  return readdirSync(pasta).filter((n) => /\.(py|toml)$/.test(n)).sort().map((nome) => ({ nome, bytes: readFileSync(join(pasta, nome)) }));
}

const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };

/** Um zip com os `arquivos` ({ nome, bytes }), sem comentário, sem data e sem extras. */
export function zipar(arquivos) {
  const locais = []; const centrais = []; let deslocamento = 0;
  for (const { nome, bytes } of arquivos) {
    const nomeBytes = Buffer.from(nome, 'utf8');
    const comprimido = deflateRawSync(bytes, { level: 9 });
    const crc = crc32(bytes);
    const comum = [u16(20), u16(0x0800), u16(8), u16(DATA_DOS_ARQUIVOS.hora), u16(DATA_DOS_ARQUIVOS.data), u32(crc), u32(comprimido.length), u32(bytes.length), u16(nomeBytes.length), u16(0)];
    const local = Buffer.concat([u32(0x04034b50), ...comum, nomeBytes, comprimido]);
    centrais.push(Buffer.concat([u32(0x02014b50), u16(20), ...comum, u16(0), u16(0), u16(0), u32(0), u32(deslocamento), nomeBytes]));
    locais.push(local);
    deslocamento += local.length;
  }
  const diretorio = Buffer.concat(centrais);
  const fim = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(arquivos.length), u16(arquivos.length), u32(diretorio.length), u32(deslocamento), u16(0)]);
  return Buffer.concat([...locais, diretorio, fim]);
}

/** O `.zip` instalável do addon do cabo vivo. */
export const zipDoAddonDoCabo = () => zipar(arquivosDoAddonDoCabo());
