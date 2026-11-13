/* retirados.test.mjs — caminho sob pasta retirada passa quando a crônica registra o nome, e reprova quando não registra. */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caminhoRetirado, motivoRecusa } from './retirados.mjs';

function raizComCronicas() {
  const raiz = mkdtempSync(path.join(tmpdir(), 'retirados-'));
  mkdirSync(path.join(raiz, 'docs/modelar/decisoes'), { recursive: true });
  writeFileSync(path.join(raiz, 'docs/modelar/decisoes/PLANOS-ENCERRADOS' + '.md'), '- `2026-11-05-solido-por-lacos.md`: concluído.\n');
  writeFileSync(path.join(raiz, 'docs/modelar/decisoes/HISTORICO-RETIRADO' + '.md'), '- `REGISTRO-FALHAS-AUTORIA-V.md`: falhas.\n- `ciclo6/`: 14 arquivos.\n');
  return raiz;
}

describe('caminho de pasta retirada', () => {
  const raiz = raizComCronicas();

  it('aceita o caminho cujo nome consta na crônica', () => {
    expect(caminhoRetirado('docs/modelar/planos/encerrados/2026-11-05-solido-por-lacos' + '.md', raiz)?.consta).toBe(true);
    expect(caminhoRetirado('docs/modelar/historico/REGISTRO-FALHAS-AUTORIA-V' + '.md', raiz)?.consta).toBe(true);
    expect(caminhoRetirado('docs/modelar/historico/ciclo6/criticas.json', raiz)?.consta).toBe(true);
  });

  it('recusa o caminho cujo nome não consta, com a mensagem dizendo isso', () => {
    const r = caminhoRetirado('docs/modelar/planos/encerrados/2026-01-01-nunca-existiu' + '.md', raiz);
    expect(r?.consta).toBe(false);
    expect(motivoRecusa(r)).toContain('não consta em docs/modelar/decisoes/PLANOS-ENCERRADOS.md');
    expect(caminhoRetirado('docs/modelar/historico/evidencias-n2-forma-global/alvo.json', raiz)?.consta).toBe(false);
  });

  it('não mexe em caminho fora das pastas retiradas', () => {
    expect(caminhoRetirado('docs/modelar/planos/concluidos/x' + '.md', raiz)).toBeNull();
    expect(caminhoRetirado('docs/modelar/decisoes/PLANOS-ENCERRADOS' + '.md', raiz)).toBeNull();
  });
});
