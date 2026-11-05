#!/usr/bin/env node
/* variantes.mjs — as variantes de uma receita lado a lado: a receita rodada com cada troca de valores da TABELA que ela declara em
 * `VARIANTES`, capturada na bancada com a mesma câmera, e as capturas juntas numa imagem, com o nome e a nota de cada variante.
 *
 * Uso: npm run variantes -- <peça> [--vista <v>] [--saida <png>] [--largura <px>] [--sem-cores] [--so-montar]
 *
 * A peça é o nome ou o caminho de uma receita, como em `npm run bancada`. A receita exporta `VARIANTES: [{ nome, nota, tabela:
 * { chave: valor, ... } }]`, e as trocas, a cópia por descritores e a recusa da chave que não existe são as de
 * `modulos/esboco-nucleo/src/variantes.js`. A captura é a de `esboco-nucleo.mjs` (`capturarLadoALado`): a câmera ortográfica
 * comum, centrada na caixa que junta as malhas de todas as variantes. Imprime, por variante, as trocas, as faces, a caixa e o hash
 * do neutroCanonico, e diz qual variante dá a mesma malha da receita sem troca. Precisa do Chromium do Playwright. */
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { receitaETabela, receitasDasVariantes, RecusaDaVariante } from '../../modulos/esboco-nucleo/src/variantes.js';
import { caixaDaMalha } from '../../modulos/esboco-nucleo/src/opcao.js';
import { capturarLadoALado, diferencaDeCamera, hashDoNeutro } from './esboco-nucleo.mjs';
import { importarReceita } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export const AJUDA = `npm run variantes -- <peça> [opções]  (node tools/modelar/variantes.mjs)
As variantes de uma receita lado a lado, com a mesma câmera: a receita declara
  export const VARIANTES = [{ nome, nota, tabela: { chave: valor, ... } }, ...]
e cada variante é a receita rodada com a TABELA trocada nessas chaves (a chave pode ser um caminho com ponto, como
chapa.espessura; a que não existe é recusada). A receita do acervo não muda: cada variante é uma cópia por descritores.

  --vista <v>      isometrica (padrão), frontal, traseira, direita, esquerda, superior ou inferior
  --saida <png>    onde gravar a imagem (padrão: tools/bancadas/out/variantes-<peça>.png)
  --largura <px>   a largura de cada variante na imagem (padrão 640)
  --sem-cores      a cor dos materiais, em vez de uma cor por parte
  --so-montar      executa as variantes e imprime os números, sem abrir a bancada
  --ajuda          esta mensagem

Imprime, por variante, as trocas, as faces, a caixa em mm e o hash do neutroCanonico, e qual variante dá a mesma malha da
receita sem troca. Precisa do Chromium do Playwright.
`;

const caixaMm = (neutro) => { const c = caixaDaMalha(neutro); return c.min.map((m, k) => `${'xyz'[k]} ${(m * 1000).toFixed(1)}..${(c.max[k] * 1000).toFixed(1)}`).join(', '); };

/** As variantes de uma peça executadas, com o hash de cada uma e o da receita sem troca. */
export async function montarVariantes(peca) {
  const caminho = resolverCaminhoReceita(peca, { raiz: REPO });
  const modulo = await importarReceita(caminho);
  const { receita } = receitaETabela(modulo);
  const base = hashDoNeutro(executarReceita(receita).neutro);
  const variantes = receitasDasVariantes(modulo).map((v) => ({ ...v, hash: hashDoNeutro(v.neutro) }));
  return { caminho, base, variantes };
}

async function principal(argv) {
  if (argv.includes('--ajuda') || !argv.length) { process.stdout.write(AJUDA); return argv.length ? 0 : 2; }
  const COM_VALOR = ['--vista', '--saida', '--largura'];
  const valor = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
  const peca = argv.find((a, i) => !a.startsWith('--') && !COM_VALOR.includes(argv[i - 1]));
  if (!peca) { console.error(`variantes: falta a peça\n\n${AJUDA}`); return 2; }
  let r;
  try { r = await montarVariantes(peca); } catch (e) {
    if (e instanceof RecusaDaVariante) { console.error(`variantes: ${e.message}`); return 1; }
    throw e;
  }
  console.log(`${r.caminho.replace(`${REPO}/`, '')}: ${r.variantes.length} variantes; a receita sem troca dá o neutro ${r.base.slice(0, 16)}`);
  for (const v of r.variantes) {
    const trocas = Object.entries(v.trocas).map(([k, x]) => `${k} = ${JSON.stringify(x)}`).join(', ');
    console.log(`  ${v.nome} (${trocas}): ${v.neutro.F.size} faces; ${caixaMm(v.neutro)} mm; neutro ${v.hash.slice(0, 16)}${v.hash === r.base ? ', a mesma malha da receita sem troca' : ''}`);
  }
  if (argv.includes('--so-montar')) return 0;
  const vista = valor('--vista') ?? 'isometrica';
  const nome = peca.replace(/.*\//, '').replace(/\.js$/, '');
  const saida = resolve(valor('--saida') ?? join(REPO, 'tools/bancadas/out', `variantes-${nome}.png`));
  const res = await capturarLadoALado({
    paineis: r.variantes.map((v) => ({ titulo: v.nome, nota: `${v.nota}${v.nota ? ' ' : ''}(${Object.entries(v.trocas).map(([k, x]) => `${k} = ${JSON.stringify(x)}`).join(', ')})`, receita: v.receita, neutro: v.neutro })),
    vista, saida, titulo: `${nome}: ${r.variantes.length} variantes da receita`, largura: Number(valor('--largura') ?? 640), cores: !argv.includes('--sem-cores'),
    rodape: `Mesma câmera em todas: vista ${vista}, ortográfica, centrada na caixa que junta as variantes. Cada variante é a receita com a TABELA trocada (npm run variantes).`,
    logger: (t) => console.log(`  ${t}`),
  });
  console.log(`mesma câmera: a caixa comum difere no máximo ${diferencaDeCamera(res.telas).toExponential(2)} do quadro entre as capturas`);
  console.log(`imagem: ${res.saida} (${res.largura}x${res.altura})`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal(process.argv.slice(2)).then((codigo) => { process.exitCode = codigo; }, (e) => { console.error(`variantes: ${e.message}`); process.exitCode = 2; });
}
