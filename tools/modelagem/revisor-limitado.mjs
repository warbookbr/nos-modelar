/* Revisor visual em processo separado. O pai libera leitura apenas do próprio
   programa e do despacho; a criança prova que não alcança outro arquivo. */
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const programa = fileURLToPath(import.meta.url);

function executarDentro(despacho, proibido) {
  const manifesto = JSON.parse(readFileSync(join(despacho, 'manifesto.json'), 'utf8'));
  const entregues = manifesto.entradas.map((entrada) => {
    const arquivo = join(despacho, entrada.arquivo);
    readFileSync(arquivo);
    return basename(arquivo);
  });
  let acessoExterno = false;
  try { readFileSync(proibido); acessoExterno = true; } catch (causa) {
    if (causa?.code !== 'ERR_ACCESS_DENIED') throw causa;
  }
  process.stdout.write(`${JSON.stringify({ entregues, acessoExterno })}\n`);
}

export function executarRevisorLimitado({ despacho, arquivoProibido } = {}) {
  if (!despacho || !arquivoProibido) throw new Error('revisor-limitado: despacho e arquivoProibido são obrigatórios.');
  const processo = spawnSync(process.execPath, [
    '--permission', `--allow-fs-read=${programa}`, `--allow-fs-read=${despacho}`,
    programa, '--dentro', despacho, arquivoProibido,
  ], { encoding: 'utf8' });
  if (processo.status !== 0) throw new Error(`revisor-limitado: processo recusado: ${(processo.stderr || processo.stdout).trim()}`);
  const resultado = JSON.parse(processo.stdout);
  if (resultado.acessoExterno) throw new Error('revisor-limitado: o revisor alcançou arquivo fora do despacho.');
  return resultado;
}

if (process.argv[2] === '--dentro') executarDentro(process.argv[3], process.argv[4]);
