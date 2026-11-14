/* argumentos-essenciais.mjs — confere que toda operação do núcleo diz quais argumentos são essenciais, e que a recusa existe.
 *
 * Medido em 2026-11-13: dezoito das 42 operações não declaravam argumento obrigatório, e `cilindro` sem `raio` virava um
 * cilindro de raio 0,5 sem uma linha, com todas as medidas verdes até a rodada seguinte. A tabela dos essenciais fica em
 * `procedural/nucleo/uso-operacoes.js`. Este gate falha quando:
 *   1. uma operação do núcleo não tem argumento obrigatório de schema, não está na tabela e portanto não disse nada;
 *   2. a tabela cita uma operação que o núcleo não tem;
 *   3. o exemplo oficial de uma operação com essenciais é recusado por eles;
 *   4. tirar do exemplo um essencial (todas as alternativas dele) não é recusado, citando o campo.
 * A recusa roda em `recusasDeEssenciais`; o despacho do núcleo ainda não a chama (ver o relatório da fatia 1 do plano).
 * Uso: `node tools/gates/argumentos-essenciais.mjs`; sai com 1 e lista cada falha. */
import { pathToFileURL } from 'node:url';
import { OPS } from '../../procedural/nucleo/nucleo.js';
import { essenciaisDaOperacao, operacoesComEssenciais, recusasDeEssenciais, usoDaOperacao } from '../../procedural/nucleo/uso-operacoes.js';

const numero = (valor) => (typeof valor === 'number' ? valor : Number.NaN);

export function conferirArgumentosEssenciais() {
  const falhas = [];
  const tabela = new Set(operacoesComEssenciais());
  for (const nome of Object.keys(OPS)) {
    const uso = usoDaOperacao(nome);
    if (!uso) { falhas.push(`${nome}: a operação não tem contrato de uso`); continue; }
    if ((uso.schemaArgumentos.required ?? []).length > 0) continue;
    const contrato = essenciaisDaOperacao(nome);
    if (!contrato) falhas.push(`${nome}: não tem argumento obrigatório no schema nem aparece em ESSENCIAIS (procedural/nucleo/uso-operacoes.js); declare os essenciais ou diga em semEssenciais por que não há`);
  }
  for (const nome of tabela) if (!Object.hasOwn(OPS, nome)) falhas.push(`${nome}: ESSENCIAIS cita uma operação que o núcleo não tem`);
  for (const nome of tabela) {
    const contrato = essenciaisDaOperacao(nome);
    if (!contrato?.essenciais.length || !Object.hasOwn(OPS, nome)) continue;
    const exemplo = usoDaOperacao(nome).exemplo;
    const indice = exemplo.PASSOS.findIndex(([op]) => op === nome);
    const [, args = {}] = exemplo.PASSOS[indice];
    if (recusasDeEssenciais(nome, args, contrato, numero, indice).length) { falhas.push(`${nome}: o exemplo oficial é recusado pelos essenciais`); continue; }
    for (const entrada of contrato.essenciais) {
      const sem = Object.fromEntries(Object.entries(args).filter(([campo]) => !entrada.includes(campo)));
      const recusas = recusasDeEssenciais(nome, sem, contrato, numero, indice);
      if (!recusas.some((r) => r.campo === entrada[0])) falhas.push(`${nome}: sem ${entrada.map((c) => `'${c}'`).join(' nem ')} no exemplo, o passo não foi recusado citando '${entrada[0]}'`);
    }
  }
  return falhas;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const falhas = conferirArgumentosEssenciais();
  if (falhas.length) {
    console.error(`argumentos-essenciais: ${falhas.length} falha(s)\n${falhas.map((f) => `  - ${f}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log(`argumentos-essenciais: ${Object.keys(OPS).length} operações conferidas, ${operacoesComEssenciais().length} na tabela`);
}
