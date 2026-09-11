#!/usr/bin/env node
/* guarda-contatos.mjs — roda o veredito de contato sobre TODO o acervo.
 *
 * A medida de contato existe há tempo, sai com código de erro e ninguém a
 * chamava. `descrever-peca` reprova peça atravessando peça e peça que declara
 * solda e entrega espaço, mas só quando alguém digita o comando com o nome da
 * peça. Numa bicicleta anterior os balancos que seguram a roda ficaram soltos
 * no ar e nada acusou, porque nenhum gate rodava a régua.
 *
 * Esta guarda fecha isso: ela varre o acervo, mede cada peça e sai com código 1
 * se qualquer uma reprovar. Instrumento que não é rodado por gate volta a ser
 * conselho, e conselho é ignorado sob pressão de terminar.
 */
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const ACERVO = join(REPO, 'prototipos/procedural/v3/pecas');

/* O nome da peça é o caminho relativo sem extensão, que é o mesmo endereço que
   `descrever-peca` aceita. Arquivo de teste não é peça. */
export function pecasDoAcervo(pasta = ACERVO) {
  const achadas = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) { achadas.push(...pecasDoAcervo(caminho)); continue; }
    if (!entrada.name.endsWith('.js') || entrada.name.endsWith('.test.js')) continue;
    achadas.push(relative(ACERVO, caminho).replace(/\.js$/, ''));
  }
  return achadas.sort();
}

export async function conferirContatosDoAcervo(pecas = pecasDoAcervo()) {
  const reprovadas = [];
  for (const peca of pecas) {
    const medida = await descreverPecaReutilizavel({ peca });
    if (!medida.ok) reprovadas.push({ peca, motivo: medida.stderr.trim() });
  }
  return { pecas, reprovadas };
}

if (process.argv[1] && process.argv[1].endsWith('guarda-contatos.mjs')) {
  const { pecas, reprovadas } = await conferirContatosDoAcervo();
  if (pecas.length === 0) {
    console.error('guarda:contatos — o acervo está vazio; nada foi medido.');
    process.exit(1);
  }
  for (const { peca, motivo } of reprovadas) {
    console.error(`guarda:contatos — ${peca} REPROVOU\n${motivo}\n`);
  }
  if (reprovadas.length) process.exit(1);
  console.log(`guarda:contatos ok — ${pecas.length} peça(s) do acervo medida(s): ${pecas.join(', ')}.`);
}
