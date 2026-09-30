/* Biblioteca de componentes do esboço: cada `<nome>.json` desta pasta descreve um componente parametrizado
   (parâmetros, entradas, formas, âncoras e pares do gate). O formato e as regras de expansão estão em
   `../src/componentes.js` e em `../README.md`. Os arquivos entram como dados. */
import roda from './roda.json' with { type: 'json' };
import garfo from './garfo.json' with { type: 'json' };
import quadro from './quadro.json' with { type: 'json' };
import mancal from './mancal.json' with { type: 'json' };

export const COMPONENTES = { roda, garfo, quadro, mancal };
