#!/usr/bin/env node
/* material-da-peca.mjs — imprime tudo que pertence a uma peça e onde está.
 *
 * Este comando é o retrato que a arrumação vai derrubar. Ele conta ÁRVORES do
 * repositório, não arquivos: dez arquivos na mesma pasta não custam nada a quem
 * abre a peça, e dois arquivos em duas árvores já custam, porque são dois
 * caminhos para saber de cor.
 *
 * O que a receita DECLARA sai como declarado. O que existe por convenção de
 * nome — a sobreposição da bancada, as rodadas do laço, o gerador de prancha —
 * sai marcado como não declarado, porque é exatamente isso que o achado
 * significa: material que pertence à peça e que nada no repositório liga a ela.
 * Um deles, a foto de `public/`, só é citado por estado local não versionado.
 *
 * Uso: node tools/mecanifica/material-da-peca.mjs <peça> [--json]
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { materialDaPeca } from '../../src/autoria/material-da-peca.js';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { receitaDoModulo } from './importar-receita.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const rel = (caminho) => relative(REPO, caminho).split('\\').join('/');

function arquivosDe(pasta) {
  if (!existsSync(pasta) || !statSync(pasta).isDirectory()) return [];
  return readdirSync(pasta, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? arquivosDe(join(pasta, e.name)) : [join(pasta, e.name)]));
}

/* O que existe por CONVENÇÃO, e não por declaração. Cada regra aqui é uma
   ligação que hoje só existe na cabeça de quem já trabalhou na peça. */
export function porConvencao(peca, { raiz = REPO } = {}) {
  const achados = [];

  for (const extensao of ['.jpg', '.jpeg', '.png']) {
    const foto = join(raiz, 'public/referencias', `${peca}${extensao}`);
    if (existsSync(foto)) achados.push({ papel: 'sobreposicao', caminho: rel(foto) });
  }

  const rodadas = join(raiz, 'docs/mecanifica/historico/rodadas', peca);
  for (const arquivo of arquivosDe(rodadas)) achados.push({ papel: 'rodada', caminho: rel(arquivo) });

  /* A ferramenta específica da peça: `prancha-<algo>.mjs` cujo nome comece pelo
     primeiro termo do nome da peça. `bicicleta-quadro` acha
     `prancha-bicicleta-29.mjs`, que é dela e de mais ninguém. */
  const termo = peca.split('-')[0];
  const ferramentas = join(raiz, 'tools/mecanifica');
  for (const arquivo of arquivosDe(ferramentas)) {
    const nome = arquivo.split('/').pop();
    if (nome.startsWith(`prancha-${termo}`)) achados.push({ papel: 'ferramenta', caminho: rel(arquivo) });
  }

  return achados;
}

export async function retratoDaPeca(peca, { raiz = REPO } = {}) {
  const caminho = resolverCaminhoReceita(peca, { raiz });
  const modulo = await import(pathToFileURL(caminho).href);
  return materialDaPeca({
    peca,
    caminhoReceita: rel(caminho),
    receita: receitaDoModulo(modulo),
    extras: porConvencao(peca, { raiz }),
  });
}

if (process.argv[1] && process.argv[1].endsWith('material-da-peca.mjs')) {
  const argv = process.argv.slice(2);
  const peca = argv.find((a) => !a.startsWith('--'));
  if (!peca) {
    console.error('uso: node tools/mecanifica/material-da-peca.mjs <peça> [--json]');
    process.exit(1);
  }
  const retrato = await retratoDaPeca(peca);
  if (argv.includes('--json')) {
    console.log(JSON.stringify(retrato, null, 2));
  } else {
    console.log(`material de '${retrato.peca}' — ${retrato.material.length} arquivo(s) em ${retrato.espalhamento} árvore(s)`);
    for (const { papel, caminho, declarado } of retrato.material) {
      console.log(`  ${declarado ? ' ' : '!'} ${papel.padEnd(13)} ${caminho}`);
    }
    if (retrato.naoDeclarados) {
      console.log(`\n${retrato.naoDeclarados} arquivo(s) marcados com '!' pertencem à peça por convenção,`);
      console.log('e nada no repositório declara essa ligação.');
    }
  }
}
