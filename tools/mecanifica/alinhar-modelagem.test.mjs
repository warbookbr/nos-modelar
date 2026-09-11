/* alinhar-modelagem.test.mjs — a rodada de alinhamento continua colada ao
 * formato que ela produz.
 *
 * A skill e o contrato do `PLANO` são duas descrições da mesma coisa, escritas
 * em lugares diferentes: uma em prosa, para conduzir a conversa, outra em
 * código, para reprovar. Quando o contrato ganha um campo e a skill não
 * pergunta por ele, a rodada termina produzindo plano incompleto e quem conduz
 * só descobre no gate — ou pior, preenche o campo sozinho, que é exatamente o
 * autor decidindo em vez de combinar.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CAMPOS_PLANO, normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import receita from '../../prototipos/procedural/v3/pecas/bicicleta-quadro.js';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SKILL = readFileSync(resolve(REPO, '.claude/skills/alinhar-modelagem/SKILL.md'), 'utf8');

describe('rodada de alinhamento', () => {
  it('pergunta por TODOS os campos que o plano exige', () => {
    for (const campo of CAMPOS_PLANO) expect(SKILL).toContain(campo);
    /* Os contatos não moram no plano, e por isso são o campo mais fácil de
       esquecer na conversa — justamente o que deixou os balancos soltos. */
    expect(SKILL).toContain('contatos');
  });

  it('diz que o produto é arquivo e que quem conduz não aprova', () => {
    expect(SKILL).toMatch(/guarda:acervo/);
    expect(SKILL).toMatch(/não é você quem aprova/);
  });

  it('é apontada pela skill de criar peça, e não fica só esperando ser achada', () => {
    const criar = readFileSync(resolve(REPO, '.claude/skills/criar-peca/SKILL.md'), 'utf8');
    expect(criar).toContain('alinhar-modelagem');
  });

  it('o plano da bicicleta é válido e descreve exatamente as partes entregues', () => {
    const plano = normalizarPlanoDeModelagem(receita.PLANO);
    expect(plano).not.toBe(null);
    const { neutro } = executarReceita(receita);
    const entregues = new Set();
    for (const face of neutro.F.values()) if (face.parte) entregues.add(face.parte);
    expect(plano.partes.map((p) => p.nome)).toEqual([...entregues].sort());
    /* Cada parte prometida diz forma E técnica: plano que só lista nomes não
       dá ao modelador nada além do que a receita já teria. */
    for (const parte of plano.partes) {
      expect(parte.forma.length).toBeGreaterThan(15);
      expect(parte.tecnica).toBeTruthy();
    }
  });

  it('todo par declarado em `contatos` nomeia partes que o plano promete', () => {
    const plano = normalizarPlanoDeModelagem(receita.PLANO);
    const prometidas = new Set(plano.partes.map((p) => p.nome));
    for (const { par } of receita.contatos) {
      expect(prometidas.has(par[0]), `${par[0]} não está no plano`).toBe(true);
      expect(prometidas.has(par[1]), `${par[1]} não está no plano`).toBe(true);
    }
  });
});
