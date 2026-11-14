/* argumentos-essenciais.mjs — confere que toda operação do núcleo diz quais argumentos são essenciais, e que a recusa existe.
 *
 * Medido em 2026-11-13: dezoito das 42 operações não declaravam argumento obrigatório, e `cilindro` sem `raio` virava um
 * cilindro de raio 0,5 sem uma linha, com todas as medidas verdes até a rodada seguinte. A tabela dos essenciais fica em
 * `procedural/nucleo/uso-operacoes.js`. Este gate falha quando:
 *   1. uma operação do núcleo não tem argumento obrigatório de schema, não está na tabela e portanto não disse nada;
 *   2. a tabela cita uma operação que o núcleo não tem;
 *   3. o exemplo oficial de uma operação com essenciais é recusado por eles;
 *   4. tirar do exemplo um essencial (todas as alternativas dele) não é recusado, citando o campo, ou um campo positivo valendo 0 ou -1
 *      não é recusado citando o valor.
 * Uso: `node tools/gates/argumentos-essenciais.mjs`; sai com 1 e lista cada falha. */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { OPS } from '../../procedural/nucleo/nucleo.js';
import { essenciaisDaOperacao, operacoesComEssenciais, recusasDeEssenciais, usoDaOperacao } from '../../procedural/nucleo/uso-operacoes.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/* O REGISTRO DA RECEITA. A receita de peça usa `REGISTRO_DA_RECEITA` (o núcleo e a estruturaDeBarras); a chamada de `nucleo(` sem registro, em ferramenta
   ou em `src/`, vê só o núcleo e recusa a barras como operação desconhecida, e a guarda do acervo e a autoria de receita fizeram isso. Fora de
   `executarReceita`, que escolhe o registro, toda chamada com argumentos precisa passar `registroOperacoes`. */
const PASTAS_DAS_CHAMADAS = ['tools/modelar', 'src'];
const EXCECOES_DAS_CHAMADAS = new Set(['src/autoria/executar-receita.js']);

function arquivosDe(pasta, achados = []) {
  for (const e of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'fixtures') arquivosDe(caminho, achados); }
    else if (/\.(m?js)$/.test(e.name) && !/\.test\.m?js$/.test(e.name)) achados.push(caminho);
  }
  return achados;
}

/** O texto entre os parênteses que abrem em `abre`, ou null se não fecham. */
function argumentosDaChamada(texto, abre) {
  let nivel = 0;
  for (let k = abre; k < texto.length; k += 1) {
    if (texto[k] === '(') nivel += 1;
    else if (texto[k] === ')') { nivel -= 1; if (nivel === 0) return texto.slice(abre + 1, k); }
  }
  return null;
}

/** As chamadas `nucleo(...)` com argumentos e sem `registroOperacoes`, fora de `executarReceita`: `arquivo:linha`. */
export function chamadasDeNucleoSemRegistro(raiz = RAIZ) {
  const achados = [];
  for (const pasta of PASTAS_DAS_CHAMADAS) {
    for (const arquivo of arquivosDe(join(raiz, pasta))) {
      const rel = relative(raiz, arquivo).replaceAll('\\', '/');
      if (EXCECOES_DAS_CHAMADAS.has(rel)) continue;
      const texto = readFileSync(arquivo, 'utf8');
      for (const m of texto.matchAll(/(?<![\w.$])nucleo\(/g)) {
        const linhaDoInicio = texto.lastIndexOf('\n', m.index) + 1;
        if (/^\s*(\/\*|\*|\/\/)/.test(texto.slice(linhaDoInicio, m.index + 1))) continue;
        if (/^\s*function\s/.test(texto.slice(linhaDoInicio, m.index))) continue;
        const args = argumentosDaChamada(texto, m.index + m[0].length - 1);
        if (args === null || !args.trim()) continue;
        if (!args.includes('registroOperacoes')) achados.push(`${rel}:${texto.slice(0, m.index).split('\n').length}`);
      }
    }
  }
  return achados;
}

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
    if (!Object.hasOwn(OPS, nome) || (!contrato.essenciais.length && !contrato.positivos.length && !contrato.diferentesDeZero.length && !Object.keys(contrato.minimos).length)) continue;
    const exemplo = usoDaOperacao(nome).exemplo;
    const indice = exemplo.PASSOS.findIndex(([op]) => op === nome);
    const [, args = {}] = exemplo.PASSOS[indice];
    if (recusasDeEssenciais(nome, args, contrato, numero, indice).length) { falhas.push(`${nome}: o exemplo oficial é recusado pela tabela`); continue; }
    for (const entrada of contrato.essenciais) {
      const sem = Object.fromEntries(Object.entries(args).filter(([campo]) => !entrada.includes(campo)));
      if (!recusasDeEssenciais(nome, sem, contrato, numero, indice).some((r) => r.campo === entrada[0])) falhas.push(`${nome}: sem ${entrada.map((c) => `'${c}'`).join(' nem ')} no exemplo, o passo não foi recusado citando '${entrada[0]}'`);
    }
    for (const campo of contrato.positivos) {
      for (const ruim of [0, -1]) {
        if (!recusasDeEssenciais(nome, { ...args, [campo]: ruim }, contrato, numero, indice).some((r) => r.campo === campo && r.motivo.includes(String(ruim)))) falhas.push(`${nome}: '${campo}' valendo ${ruim} não foi recusado citando o valor`);
      }
    }
    for (const campo of contrato.diferentesDeZero) {
      for (const zero of [0, -0]) if (!recusasDeEssenciais(nome, { ...args, [campo]: zero }, contrato, numero, indice).some((r) => r.campo === campo)) falhas.push(`${nome}: '${campo}' valendo 0 não foi recusado`);
    }
    for (const [campo, minimo] of Object.entries(contrato.minimos)) {
      if (!recusasDeEssenciais(nome, { ...args, [campo]: minimo - 1 }, contrato, numero, indice).some((r) => r.campo === campo && r.motivo.includes(`é ${minimo}`))) falhas.push(`${nome}: '${campo}' valendo ${minimo - 1} não foi recusado dizendo o mínimo ${minimo}`);
    }
  }
  for (const onde of chamadasDeNucleoSemRegistro()) falhas.push(`${onde}: chama nucleo( sem registroOperacoes; passe REGISTRO_DA_RECEITA (src/autoria/executar-receita.js) ou chame executarReceita`);
  return falhas;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const falhas = conferirArgumentosEssenciais();
  if (falhas.length) {
    console.error(`argumentos-essenciais: ${falhas.length} falha(s)\n${falhas.map((f) => `  - ${f}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log(`argumentos-essenciais: ${Object.keys(OPS).length} operações conferidas, ${operacoesComEssenciais().length} na tabela`);
}
