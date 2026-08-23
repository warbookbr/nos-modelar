/* Gera ou confere o índice estático dos schemas públicos da autoria 3D N1. */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { indiceSchemasAutoria3D } from '../../src/autoria/schemas-autoria-3d.js';

const destino = fileURLToPath(new URL('../../docs/mecanifica/gerado/schemas-autoria-3d.json', import.meta.url));
const esperado = `${JSON.stringify(indiceSchemasAutoria3D(), null, 2)}\n`;
const conferir = process.argv.includes('--check');
let atual = null;
try { atual = readFileSync(destino, 'utf8'); } catch { /* ausência também é divergência */ }

if (atual === esperado) {
  console.log('autoria:schemas ok — artefato gerado está em dia.');
} else if (conferir) {
  console.error('autoria:schemas FALHOU — docs/mecanifica/gerado/schemas-autoria-3d.json está desatualizado.');
  process.exitCode = 1;
} else {
  writeFileSync(destino, esperado);
  console.log('autoria:schemas — gerado docs/mecanifica/gerado/schemas-autoria-3d.json.');
}
