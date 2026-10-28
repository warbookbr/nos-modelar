/* papeis-do-laco.test.mjs — os papéis do laço continuam separados e genéricos.
 *
 * Dois defeitos são guardados aqui. O primeiro é o agente que cita o objeto da
 * vez: um revisor que traz "tubo do selim" no próprio arquivo serve à bicicleta
 * e a mais nada, e trocar de peça passa a exigir editar o papel — o que
 * significa que o critério e o objeto ficaram misturados.
 *
 * O segundo é a fusão dos papéis. Enquanto quem modela puder dizer "ficou bom"
 * e quem julga puder corrigir, o laço volta a ter um único autor com a palavra
 * final, que é exatamente o arranjo em que uma prancha torta foi declarada reta.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TIPOS_DE_DEFEITO, normalizarVeredito } from '../../src/autoria/veredito-de-forma.js';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const ler = (nome) => readFileSync(resolve(REPO, `.claude/agents/${nome}.md`), 'utf8');

const MODELADOR = ler('modelador');
const CRITICO = ler('critico-visual');

/* Palavras de objeto, e não de forma. "tubo" e "painel" descrevem geometria de
   qualquer peça; "bicicleta" e "selim" amarram o papel a uma peça só. */
const OBJETOS = ['bicicleta', 'selim', 'guidao', 'guidão', 'pedivela', 'cadeira',
  'carroceria', 'capô', 'capo', 'chassi', 'quadro de'];

describe('papéis do laço de modelagem', () => {
  it('nenhum dos dois arquivos cita o objeto da vez', () => {
    for (const [nome, texto] of [['modelador', MODELADOR], ['critico-visual', CRITICO]]) {
      for (const objeto of OBJETOS) {
        expect(texto.toLowerCase(), `${nome} cita '${objeto}'`).not.toContain(objeto);
      }
    }
  });

  it('quem modela não aprova, e quem julga não conserta', () => {
    expect(MODELADOR).toMatch(/nunca aprova/i);
    expect(MODELADOR).toMatch(/não decide quando o laço para/i);
    expect(CRITICO).toMatch(/nunca aprova/i);
    expect(CRITICO).toMatch(/não edita nada/i);
  });

  it('o crítico continua sem ferramenta de escrita', () => {
    /* A separação não pode depender de boa vontade: `tools: Read` é o que torna
       impossível o revisor consertar aquilo que ele deveria apontar. */
    expect(CRITICO).toMatch(/^tools:\s*Read\s*$/m);
  });

  it('o modelador corrige pelo tipo do defeito, com ângulo separado de posição', () => {
    for (const tipo of ['angulo', 'comprimento', 'posicao', 'espessura', 'ausencia', 'uniao']) {
      expect(MODELADOR).toContain(tipo);
    }
    expect(MODELADOR).toMatch(/girar não é\s+transladar/);
  });

  it('o crítico emite o veredito no vocabulário fechado, e os dois falam o mesmo', () => {
    for (const tipo of Object.keys(TIPOS_DE_DEFEITO)) {
      expect(CRITICO, `crítico não define '${tipo}'`).toContain(tipo);
      expect(MODELADOR, `modelador não sabe responder a '${tipo}'`).toContain(tipo);
    }
    for (const [tipo, sentidos] of Object.entries(TIPOS_DE_DEFEITO)) {
      for (const sentido of sentidos) {
        expect(CRITICO, `crítico não oferece '${sentido}' para '${tipo}'`).toContain(sentido);
      }
    }
    /* O exemplo que o crítico mostra precisa passar pelo validador; exemplo que
       o próprio contrato recusaria ensina a errar. */
    const exemplo = JSON.parse(CRITICO.match(/```json\n([\s\S]*?)```/)[1]);
    expect(() => normalizarVeredito(exemplo)).not.toThrow();
    expect(CRITICO).toMatch(/não é aprovação/);
  });

  it('o modelador é mandado olhar a referência antes de escrever número', () => {
    expect(MODELADOR).toMatch(/imagens de referência com `Read`/);
    expect(MODELADOR).toMatch(/guarda:acervo/);
  });
});
