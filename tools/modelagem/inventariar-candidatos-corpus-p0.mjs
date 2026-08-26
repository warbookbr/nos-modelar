/* Varre V-01..V-32 e registra candidatas sem confundir arquivo existente com controle pronto. */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const origem = resolve(raiz, 'docs/mecanifica/GOTCHAS-AUTORIA-VISUAL.md');
const destino = resolve(raiz, 'autoria-assistida/avaliacao/corpus-p0/inventario-v01-v32.json');
const pistas = {
  'V-03': ['autoria-assistida/rascunhos-defeituosos/sonda-supercarro-1-0/evidencias/conjunto-frontal.png'],
  'V-07': ['autoria-assistida/experimentos/canal-percepcao-n3/evidencias/esfera-sintetica-zebra-frontal.png'],
  'V-16': ['autoria-assistida/rascunhos-defeituosos/sonda-armadura-humanoide-1-0/evidencias/neutra-conjunto-frontal.png'],
  'V-17': ['autoria-assistida/experimentos/canario-casco-visual-n6/evidencias/render-frontal.png'],
  'V-22': ['autoria-assistida/experimentos/canario-casco-visual-n6/evidencias/render-frontal.png'],
  'V-25': ['autoria-assistida/experimentos/prova-captura-r1b/evidencias/oclusao-duas-placas/superficie.png'],
  'V-26': ['autoria-assistida/alvos/n6-cupe-esportivo/vistas/frontal.png'],
};
function falhar(mensagem) { throw new Error(`inventario-corpus-p0: ${mensagem}`); }
function linhasV01a32() {
  const linhas = readFileSync(origem, 'utf8').split(/\r?\n/).filter((linha) => /^\| V-(?:0[1-9]|[12]\d|3[0-2]) \|/.test(linha));
  if (linhas.length !== 32) falhar(`esperava V-01..V-32 uma vez cada; encontrei ${linhas.length}.`);
  return linhas;
}
function candidata(linha) {
  const [, id, problema, estado] = linha.split('|').map((campo) => campo.trim());
  const evidenciasEncontradas = (pistas[id] ?? []).filter((arquivo) => existsSync(resolve(raiz, arquivo)));
  return {
    id,
    problema,
    estadoNoGotcha: estado.replaceAll('*', ''),
    evidenciasEncontradas,
    elegivel: false,
    bloqueios: [
      'não há par A/B com resposta conhecida e pergunta congelada',
      'não há quatro apresentações cegas vinculadas',
      'não há objeto isolado e separado de calibracao/holdout',
    ],
  };
}

export function inventariarCandidatosCorpusP0() {
  const inventario = {
    formato: 'mecanifica.inventario-candidatas-corpus-p0@1',
    escopo: 'V-01..V-32; inventário de evidências, não corpus de avaliação',
    candidatas: linhasV01a32().map(candidata),
  };
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, `${JSON.stringify(inventario, null, 2)}\n`);
  return inventario;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(inventariarCandidatosCorpusP0(), null, 2));
