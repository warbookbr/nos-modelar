#!/usr/bin/env node
/* conferir-retrato-do-acervo.mjs — prova que o rastreio declarado do retrato (`ESCRITA_DAS_OPERACOES`) não muda nada na malha.
 *
 *   node tools/modelar/conferir-retrato-do-acervo.mjs <peça>      executa a receita com `retrato: 'rapido'` e com `'conferido'` e compara
 *   node tools/modelar/conferir-retrato-do-acervo.mjs --acervo    faz isso para cada receita de passos do acervo, UMA POR PROCESSO (em lotes
 *                                                                 de um, para a memória de uma peça grande não somar com a da seguinte); sai com 1 se alguma divergir
 *
 * O modo 'conferido' roda o atalho e a conta completa a cada passo e recusa a divergência dos ids mudados e das serializações; aqui,
 * além disso, a saída inteira (vértices, faces com a identidade, partes, órfãos, procedência) das duas execuções vira um hash e os
 * dois têm de ser iguais. Nada liga por padrão. */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { pecasDoAcervo } from './perfil-da-execucao.mjs';

const AQUI = fileURLToPath(import.meta.url);
const REPO = resolve(dirname(AQUI), '../..');

/** O hash da saída inteira do núcleo: o que a malha, a identidade das faces, as partes e a procedência dizem. */
export function hashDoNeutro(neutro) {
  const texto = JSON.stringify({
    V: [...neutro.V], F: [...neutro.F], orfaos: neutro.orfaos, merges: neutro.merges, partes: neutro.partes,
    pesos: [...neutro.pesos].map(([v, m]) => [v, [...m]]), portas: neutro.portas, procedencia: neutro.procedencia, artefato: neutro.artefato,
  });
  return createHash('sha256').update(texto).digest('hex');
}

/** Executa a receita nos dois modos e devolve os tempos e os hashes. */
export function conferirReceita(receita) {
  const medir = (retrato) => {
    const t0 = performance.now();
    const { neutro } = executarReceita(receita, { retrato });
    return { ms: performance.now() - t0, hash: hashDoNeutro(neutro), faces: neutro.F.size };
  };
  const rapido = medir('rapido');
  const conferido = medir('conferido');
  return { faces: rapido.faces, rapidoMs: Math.round(rapido.ms), conferidoMs: Math.round(conferido.ms), hash: rapido.hash, igual: rapido.hash === conferido.hash };
}

async function umaPeca(peca) {
  const receita = receitaDoModulo(await importarReceita(resolverCaminhoReceita(peca, { raiz: REPO })));
  if (!Array.isArray(receita.PASSOS)) return { peca, pulou: 'sem PASSOS' };
  try { return { peca, passos: receita.PASSOS.length, ...conferirReceita(receita) }; } catch (erro) { return { peca, erro: erro.message.slice(0, 300), igual: false }; }
}

export async function principal(argv, escrever = (t) => process.stdout.write(`${t}\n`)) {
  if (argv.includes('--acervo')) {
    let falhas = 0;
    for (const peca of pecasDoAcervo({ raiz: REPO })) {
      const r = spawnSync(process.execPath, [AQUI, peca], { encoding: 'utf8', maxBuffer: 1 << 24 });
      const linha = r.stdout.trim().split('\n').pop() || JSON.stringify({ peca, erro: `processo saiu com ${r.status}: ${(r.stderr || '').slice(0, 200)}`, igual: false });
      escrever(linha);
      let parsed; try { parsed = JSON.parse(linha); } catch { parsed = { igual: false }; }
      if (parsed.igual === false) falhas += 1;
    }
    escrever(JSON.stringify({ fim: true, falhas }));
    return falhas ? 1 : 0;
  }
  const peca = argv.find((a) => !a.startsWith('--'));
  if (!peca) { escrever('uso: node tools/modelar/conferir-retrato-do-acervo.mjs <peça> | --acervo'); return 2; }
  const r = await umaPeca(peca);
  escrever(JSON.stringify(r));
  return r.igual === false ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c; });
}
