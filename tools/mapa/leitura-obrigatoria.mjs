/* leitura-obrigatoria.mjs — quanto uma sessão precisa LER antes de escrever a
 * primeira linha de receita.
 *
 * O número existe porque a intuição erra para os dois lados. Documento é barato
 * de escrever e caro de ler, e o custo não aparece em lugar nenhum: cada
 * sessão nova paga o acervo inteiro de novo, em silêncio, antes de produzir
 * qualquer coisa. Medido na abertura do plano de 2026-09-07: 119.826 bytes.
 *
 * O que conta é o caminho que as PORTAS mandam percorrer para criar uma peça:
 * o acordo de trabalho, a porta de uso, a skill da tarefa e os contratos que ela
 * declara obrigatórios. Não conta o que é consultável sob demanda — a referência
 * de operações diz de si mesma "leia-a quando precisar escolher uma operação;
 * não carregue a tabela inteira para uma tarefa simples" —, e não conta a zona
 * histórica, que é consulta, não caminho.
 *
 * A lista é explícita de propósito. Derivá-la de links transformaria o número no
 * tamanho do grafo inteiro, que é justamente a métrica que não queremos: o que
 * pesa é o que se lê, não o que se poderia alcançar.
 */
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/* Teto acordado no plano `2026-09-07-esteira-confiavel-para-ia.md`. */
export const TETO_BYTES = 70_000;

export const CAMINHO_OBRIGATORIO = [
  'CLAUDE.md',
  'AGENTS.md',
  'docs/mecanifica/usar/README.md',
  'docs/mecanifica/usar/GUIA-AUTORIA-IA.md',
  'docs/mecanifica/usar/LACO-VISUAL.md',
  '.claude/skills/criar-peca/SKILL.md',
  'docs/mecanifica/usar/AUTORIA-DE-PECA.md',
  'docs/mecanifica/usar/AUTORIA-RECEITA-DECLARATIVA.md',
  'docs/mecanifica/usar/INTENCAO-PECA-V1.md',
  'docs/mecanifica/usar/GOTCHAS-AUTORIA-VISUAL.md',
  'docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md',
  'docs/mecanifica/usar/METODO-DIAGNOSTICO-E-SEU-LIMITE.md',
];

/* Consultável: entra quando a tarefa pede, e por isso não soma no teto. Fica
   listado para o número não virar mágica — quem quiser o total real de uma
   tarefa que escolha uma operação soma esta linha. */
export const SOB_DEMANDA = [
  '.claude/skills/criar-peca/references/operacoes-procedurais.md',
  'docs/mecanifica/usar/CADEIRA-REALISTA-NOTAS.md',
  'docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md',
  'docs/mecanifica/usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md',
  'docs/mecanifica/usar/CONTRATO-AUTORIA-PRANCHA.md',
];

function medir(lista) {
  return lista.map((relativo) => {
    const bytes = statSync(join(RAIZ, relativo)).size;
    return { relativo, bytes };
  }).sort((a, b) => b.bytes - a.bytes);
}

export function conferirLeituraObrigatoria() {
  const obrigatorio = medir(CAMINHO_OBRIGATORIO);
  const demanda = medir(SOB_DEMANDA);
  const total = obrigatorio.reduce((soma, d) => soma + d.bytes, 0);
  return { obrigatorio, demanda, total, dentroDoTeto: total <= TETO_BYTES };
}

function executar() {
  const { obrigatorio, demanda, total, dentroDoTeto } = conferirLeituraObrigatoria();
  for (const { relativo, bytes } of obrigatorio) {
    console.log(`${String(bytes).padStart(7)}  ${relativo}`);
  }
  console.log(`${String(total).padStart(7)}  TOTAL obrigatório (teto ${TETO_BYTES})`);
  const totalDemanda = demanda.reduce((soma, d) => soma + d.bytes, 0);
  console.log(`${String(totalDemanda).padStart(7)}  sob demanda, fora do teto (${demanda.length} documentos)`);

  if (!dentroDoTeto) {
    console.error(
      `\nleitura:obrigatoria FALHOU — ${total} bytes, ${total - TETO_BYTES} acima do teto.`
      + '\nCortar significa mover para zona consultável com ponteiro, nunca apagar lição.',
    );
    process.exitCode = 1;
    return;
  }
  console.log('\nleitura:obrigatoria ok');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
