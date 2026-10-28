/* avisos-de-terceiros.mjs — o pacote da bancada leva o texto das licenças das bibliotecas que empacota.

   `three` (MIT), `earcut` (ISC) e `manifold-3d` (Apache-2.0) exigem que o aviso de copyright e o texto da licença
   acompanhem a distribuição. `THIRD-PARTY-NOTICES.md` guarda esse texto, e o build o copia para `dist/`, ao lado da
   página publicada. */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const ARQUIVO_DOS_AVISOS = 'THIRD-PARTY-NOTICES.md';

export function avisosDeTerceiros({ raiz = process.cwd(), saida = 'dist' } = {}) {
  return {
    name: 'modelar-avisos-de-terceiros',
    apply: 'build',
    closeBundle() {
      const origem = join(raiz, ARQUIVO_DOS_AVISOS);
      if (!existsSync(origem)) throw new Error(`${ARQUIVO_DOS_AVISOS} não existe na raiz: o pacote da bancada sairia sem os avisos de licença.`);
      mkdirSync(saida, { recursive: true });
      copyFileSync(origem, join(saida, ARQUIVO_DOS_AVISOS));
    },
  };
}
