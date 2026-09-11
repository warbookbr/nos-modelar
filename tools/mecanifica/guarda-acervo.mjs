#!/usr/bin/env node
/* guarda-acervo.mjs — roda o veredito completo sobre TODO o acervo.
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
 *
 * ELA TAMBÉM EXIGE O PLANO DE MODELAGEM, e é o único lugar que exige. Medir uma
 * peça de ensaio, escrita para provar um defeito, precisa continuar possível sem
 * plano nenhum; mas peça que entra no acervo sem dizer antes que partes promete
 * volta a ter ausência invisível, que foi como um pneu saiu maciço sem nada
 * acusar.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const ACERVO = join(REPO, 'prototipos/procedural/v3/pecas');

/* O nome da peça é o caminho relativo sem extensão, que é o mesmo endereço que
   `descrever-peca` aceita. Arquivo de teste não é peça.

   PASTA DA PEÇA: quando o diretório tem `receita.js`, a peça é a PASTA e nada
   mais dentro dela é peça — as referências, as rodadas e o que mais morar ali
   pertencem a ela, não são acervo. Varrer o conteúdo faria cada arquivo da
   pasta virar uma peça fantasma que o gate tentaria medir. */
const ENTRADAS_DE_PASTA = ['receita.js', 'montagem.js', 'index.js'];

export function pecasDoAcervo(pasta = ACERVO, { base = pasta } = {}) {
  /* O nome sai relativo à BASE da varredura, e não à constante do acervo: sem
     isso, medir um acervo de ensaio devolvia caminho com `../..` até a pasta
     temporária, e o teste que prova a pasta da peça era impossível de escrever. */
  const achadas = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      const porta = ENTRADAS_DE_PASTA.find((nome) => existsSync(join(caminho, nome)));
      if (porta) achadas.push(relative(base, caminho));
      else achadas.push(...pecasDoAcervo(caminho, { base }));
      continue;
    }
    if (!entrada.name.endsWith('.js') || entrada.name.endsWith('.test.js')) continue;
    achadas.push(relative(base, caminho).replace(/\.js$/, ''));
  }
  return achadas.sort();
}

export async function conferirAcervo(pecas = pecasDoAcervo()) {
  const reprovadas = [];
  for (const peca of pecas) {
    const medida = await descreverPecaReutilizavel({ peca });
    if (!medida.ok) { reprovadas.push({ peca, motivo: medida.stderr.trim() }); continue; }
    /* A medida já validou e canonicalizou o plano, e devolve `null` quando a
       receita não exporta nenhum. Revalidar aqui rejeitaria o próprio resultado
       canônico, que carrega `formato` e `versao`. */
    if (!medida.resultado.plano) {
      reprovadas.push({
        peca,
        motivo: 'SEM PLANO DE MODELAGEM\n  A receita não exporta `PLANO`, então ninguém sabe que partes'
          + '\n  ela deveria ter, e parte que falta não pode ser acusada por medida nenhuma.',
      });
    }
  }
  return { pecas, reprovadas };
}

if (process.argv[1] && process.argv[1].endsWith('guarda-acervo.mjs')) {
  const { pecas, reprovadas } = await conferirAcervo();
  if (pecas.length === 0) {
    console.error('guarda:acervo — o acervo está vazio; nada foi medido.');
    process.exit(1);
  }
  for (const { peca, motivo } of reprovadas) {
    console.error(`guarda:acervo — ${peca} REPROVOU\n${motivo}\n`);
  }
  if (reprovadas.length) process.exit(1);
  console.log(`guarda:acervo ok — ${pecas.length} peça(s) do acervo medida(s): ${pecas.join(', ')}.`);
}
