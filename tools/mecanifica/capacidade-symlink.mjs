/* capacidade-symlink.mjs — este ambiente consegue criar vínculo simbólico?
 *
 * No Windows, criar symlink exige o privilégio `SeCreateSymbolicLink`, que só
 * existe com Modo de Desenvolvedor ligado ou terminal elevado. Sem ele o Node
 * devolve `EPERM`, e TODO teste que prova a RECUSA de symlink falha por motivo
 * do ambiente — não por defeito do código que ele deveria estar guardando.
 * Medido nesta árvore em 2026-09-07: `symlink` devolve EPERM, `link` (vínculo
 * rígido) funciona; ou seja, é privilégio, não filesystem.
 *
 * Quatro testes desta suíte falhavam assim, e essa é a pior forma de vermelho:
 * ele não acusa nada, aparece toda rodada, e ensina quem roda — pessoa ou
 * agente — a ler vermelho como ruído. Depois disso o vermelho verdadeiro passa
 * junto com o ruído.
 *
 * A regra que fica: teste que NÃO PODE rodar se declara ignorado com motivo
 * legível. Ele nunca é apagado nem silenciado — no Linux, no CI e no Windows
 * com Modo de Desenvolvedor ele roda igual, e a garantia continua de pé.
 */
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function medir() {
  let base = null;
  try {
    base = mkdtempSync(join(tmpdir(), 'mecanifica-cap-symlink-'));
    const alvo = join(base, 'alvo.txt');
    writeFileSync(alvo, 'x', 'utf8');
    symlinkSync(alvo, join(base, 'atalho.txt'), 'file');
    return { disponivel: true, motivo: null };
  } catch (erro) {
    return {
      disponivel: false,
      motivo:
        `vínculo simbólico indisponível neste ambiente (${erro.code ?? erro.message}). `
        + 'No Windows, ligue o Modo de Desenvolvedor ou rode em terminal elevado; '
        + 'no Linux e no CI este teste roda normalmente.',
    };
  } finally {
    if (base) {
      try { rmSync(base, { recursive: true, force: true }); } catch { /* limpeza é melhor-esforço */ }
    }
  }
}

/* Medido uma vez por processo: a capacidade não muda no meio de uma execução,
   e sondar por teste multiplicaria escrita em disco sem responder nada novo. */
export const SYMLINK = medir();

/* Avisa uma vez por processo, para o motivo aparecer junto do "skipped" — a
   saída do runner mostra que o teste foi ignorado, mas não por quê. */
let avisado = false;
export function avisarSymlinkAusente() {
  if (SYMLINK.disponivel || avisado) return;
  avisado = true;
  console.warn(`[capacidade-symlink] testes de symlink IGNORADOS: ${SYMLINK.motivo}`);
}
