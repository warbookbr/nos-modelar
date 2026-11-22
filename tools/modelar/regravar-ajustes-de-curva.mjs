#!/usr/bin/env node
/* regravar-ajustes-de-curva.mjs — refaz os ajustes de curva lisa de que uma receita precisa e grava o resultado ao lado dela.
 *
 * POR QUE ELE EXISTE. `ajustarCurvaLisa` leva de 1 a 3 s por curva, e a receita que ajusta na importação paga isso em todo teste e toda ferramenta que a importa: a lataria
 * do carro, com cinco ajustes, levava 9,5 s e passou do teto de 12 s de `custo-de-importar-receita.test.mjs` na máquina do CI. A receita guarda então o resultado de cada
 * ajuste como dado versionado, com a impressão dos pontos e das opções que entraram nele, e refaz a curva do dado (`curvaLisaDoGuardado`, do núcleo); quando a impressão não
 * confere com a entrada de agora, ajusta na hora e avisa. Este comando é o que o aviso manda rodar, e `--conferir`, num teste, é o que impede o dado de envelhecer calado.
 *
 * O QUE A RECEITA EXPORTA. `AJUSTES_DE_CURVA = { arquivo, pedidos }`: `arquivo` é o nome do módulo do dado, na pasta da receita, e `pedidos()` devolve
 * [{ nome, pontos, opcoes }], a entrada de `ajustarCurvaLisa` de cada ajuste. A receita cujo dado guardado está malformado recusa na importação e não chega a exportar nada;
 * por isso a recusa dela leva o mesmo par em `erro.ajustesDeCurva = { arquivo, pedidos: [...] }`, e o comando lê dali.
 *
 * O QUE ELE GRAVA. Um módulo `export default { [nome]: { impressao, curva, medido } }`: `impressao` é a de `impressaoDoAjuste`, `curva` é o `guardado` do ajuste (início, rumo,
 * comprimento, joelhos e a tolerância da integração, com todos os dígitos, de onde a mesma curva sai de novo) e `medido`, o desvio, as clotoides e as inflexões do ajuste,
 * para quem lê o arquivo. Um ajuste que não cabe na tolerância não é gravado, e nada é gravado quando um deles não cabe.
 *
 *   node tools/modelar/regravar-ajustes-de-curva.mjs <receita.js | nome da peça> [--conferir] [--ajuda]
 *
 * `--conferir` refaz os ajustes e diz se o arquivo gravado é o que sairia, sem escrever. Sai com 0 quando gravou (ou quando o conferido é igual), com 1 quando um ajuste não
 * cabe ou o conferido difere, e com 2 quando o comando foi mal usado ou a receita não declara ajustes. Depois de regravar, confira a malha
 * (`npm run malha:assinatura -- <peça> --contra=<assinatura de antes>`): o ajuste refeito de uma entrada que mudou muda a forma. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ajustarCurvaLisa, impressaoDoAjuste } from '../../procedural/nucleo/ajuste-de-curva-lisa.js';
import { lerArgumentos } from './argumentos.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const AJUDA = `regravar-ajustes-de-curva: refaz os ajustes de curva lisa de uma receita e grava o resultado ao lado dela.

  node tools/modelar/regravar-ajustes-de-curva.mjs <receita.js | nome da peça> [--conferir]

A receita exporta AJUSTES_DE_CURVA = { arquivo, pedidos }: o nome do módulo do dado, na pasta dela, e a função que devolve
[{ nome, pontos, opcoes }], a entrada de ajustarCurvaLisa de cada ajuste. A receita que recusa na importação por dado guardado
malformado entrega o mesmo par na recusa (erro.ajustesDeCurva).

  --conferir  refaz os ajustes e diz se o arquivo gravado é o que sairia, sem escrever
  --ajuda     esta ajuda

Sai com 0 quando gravou ou o conferido é igual, 1 quando um ajuste não cabe ou o conferido difere, 2 no uso errado.
Depois de regravar, confira a malha: npm run malha:assinatura -- <peça> --contra=<assinatura de antes>.`;

class ErroDeUso extends Error {}

/** O arquivo da receita: o caminho que existe, ou o nome da peça resolvido no acervo. */
function arquivoDaReceita(alvo) {
  const direto = resolve(alvo);
  if (existsSync(direto) && direto.endsWith('.js')) return direto;
  try { return resolverCaminhoReceita(alvo); } catch (e) { throw new ErroDeUso(`não achei a receita '${alvo}': ${e.message}`); }
}

/** O par { arquivo, pedidos } da receita: do que ela exporta, ou da recusa de importação quando o dado guardado está malformado. */
export async function ajustesDaReceita(arquivo) {
  let declarado; let recusa = null;
  try {
    const modulo = await import(pathToFileURL(arquivo).href);
    declarado = modulo.AJUSTES_DE_CURVA && { arquivo: modulo.AJUSTES_DE_CURVA.arquivo, pedidos: typeof modulo.AJUSTES_DE_CURVA.pedidos === 'function' ? modulo.AJUSTES_DE_CURVA.pedidos() : modulo.AJUSTES_DE_CURVA.pedidos };
  } catch (e) {
    if (!e?.ajustesDeCurva) throw new ErroDeUso(`a receita ${arquivo} não importa, e a recusa não é de ajuste guardado: ${String(e?.message ?? e).slice(0, 400)}`);
    declarado = e.ajustesDeCurva; recusa = e.message;
  }
  if (!declarado) throw new ErroDeUso(`a receita ${arquivo} não exporta AJUSTES_DE_CURVA ({ arquivo, pedidos }): ela não declara ajuste de curva a guardar`);
  const { arquivo: nome, pedidos } = declarado;
  if (typeof nome !== 'string' || !/^[a-z0-9][a-z0-9-]*\.js$/.test(nome)) throw new ErroDeUso(`AJUSTES_DE_CURVA.arquivo espera o nome de um módulo .js na pasta da receita (minúsculas, dígitos e hífen), e veio ${JSON.stringify(nome)}`);
  if (nome === basename(arquivo)) throw new ErroDeUso(`AJUSTES_DE_CURVA.arquivo é a própria receita (${nome}): o dado fica num módulo à parte`);
  if (!Array.isArray(pedidos) || !pedidos.length || !pedidos.every((p) => p && typeof p.nome === 'string' && p.nome && Array.isArray(p.pontos))) throw new ErroDeUso('AJUSTES_DE_CURVA.pedidos espera uma lista de { nome, pontos, opcoes }, com ao menos um ajuste');
  const nomes = pedidos.map((p) => p.nome); const repetido = nomes.find((n, i) => nomes.indexOf(n) !== i);
  if (repetido) throw new ErroDeUso(`AJUSTES_DE_CURVA.pedidos traz o nome ${repetido} mais de uma vez: cada ajuste é guardado pelo nome`);
  return { destino: join(dirname(arquivo), nome), pedidos, recusa };
}

/** Refaz cada ajuste: { dado, linhas, naoCabem }. `dado` é o objeto a gravar, na ordem dos pedidos. */
export function refazerAjustes(pedidos) {
  const dado = {}; const linhas = []; const naoCabem = [];
  for (const { nome, pontos, opcoes = {} } of pedidos) {
    const inicio = performance.now();
    const aj = ajustarCurvaLisa(pontos, opcoes);
    const segundos = (performance.now() - inicio) / 1000;
    if (!aj.cabe) { naoCabem.push(`${nome}: não cabe na tolerância ${aj.tolerancia} com ${opcoes.maximoDeClotoides ?? 8} clotoides: ${aj.motivo}`); continue; }
    dado[nome] = { impressao: impressaoDoAjuste(pontos, opcoes), curva: aj.guardado, medido: { desvioMaximo: aj.desvioMaximo, clotoides: aj.clotoides.length, inflexoes: aj.inflexoes } };
    linhas.push(`  ${nome.padEnd(20)} ${String(pontos.length).padStart(5)} pontos  ${String(aj.clotoides.length).padStart(2)} clotoides  desvio ${aj.desvioMaximo.toFixed(3)}  ajustado em ${segundos.toFixed(1)} s`);
  }
  return { dado, linhas, naoCabem };
}

/** O texto do módulo do dado. Cada número sai como o JSON o escreve, que é o menor texto que volta ao mesmo número. */
export function textoDosAjustes(dado, { receita, comando }) {
  const corpo = Object.entries(dado).map(([nome, d]) => `  ${JSON.stringify(nome)}: {\n    impressao: ${JSON.stringify(d.impressao)},\n    curva: ${JSON.stringify(d.curva)},\n    medido: ${JSON.stringify(d.medido)},\n  },`).join('\n');
  return `/* ${basename(receita.destino)} — os ajustes de curva lisa de ${receita.nome}, guardados. ARQUIVO GERADO: não edite à mão.
 *
 * Cada entrada é o resultado de \`ajustarCurvaLisa\` (núcleo) para um ajuste de que a receita precisa: \`impressao\` é a dos pontos e das opções que entraram no ajuste,
 * \`curva\` é o que refaz a mesma curva sem ajustar (\`curvaLisaGuardada\`) e \`medido\`, o que o ajuste mediu. Quando a impressão não confere com a entrada dela, a
 * receita ajusta na hora e avisa; quem muda a tabela ou a opção de um ajuste regrava este arquivo com
 *
 *   ${comando}
 *
 * e confere a malha, porque o ajuste refeito de outra entrada muda a forma. */
export default {
${corpo}
};
`;
}

async function principal(argv) {
  if (argv.includes('--ajuda') || argv.includes('-h')) { console.log(AJUDA); return 0; }
  let lido;
  try { lido = lerArgumentos(argv, { bandeiras: ['conferir', 'ajuda'], posicional: { nome: 'a receita' } }); } catch (e) { throw new ErroDeUso(e.message); }
  if (!lido.posicional) throw new ErroDeUso('falta a receita.');
  const arquivo = arquivoDaReceita(lido.posicional);
  const { destino, pedidos, recusa } = await ajustesDaReceita(arquivo);
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  /* o caminho sai com a barra do POSIX em todo sistema: o cabeçalho do dado guardado entra na conferência, e a barra do Windows o fazia diferir no CI */
  const rel = (p) => { const r = relative(raiz, p); return r.startsWith('..') || isAbsolute(r) ? p : r.split(sep).join('/'); };
  if (recusa) console.log(`a receita recusou na importação, e os pedidos vieram da recusa:\n  ${recusa}`);
  const { dado, linhas, naoCabem } = refazerAjustes(pedidos);
  console.log(linhas.join('\n'));
  if (naoCabem.length) { console.error(`regravar-ajustes-de-curva: ${naoCabem.length} ajuste(s) não cabem, e nada foi gravado:\n  ${naoCabem.join('\n  ')}`); return 1; }
  const texto = textoDosAjustes(dado, { receita: { destino, nome: rel(arquivo) }, comando: `node tools/modelar/regravar-ajustes-de-curva.mjs ${rel(arquivo)}` });
  const antes = existsSync(destino) ? readFileSync(destino, 'utf8') : null;
  if (lido.bandeira('conferir')) {
    if (antes === texto) { console.log(`regravar-ajustes-de-curva: ${rel(destino)} é o que os ajustes de agora dão (${pedidos.length} ajustes).`); return 0; }
    console.error(`regravar-ajustes-de-curva: ${rel(destino)} ${antes === null ? 'não existe' : 'difere do que os ajustes de agora dão'}; rode sem --conferir para gravar.`); return 1;
  }
  if (antes === texto) { console.log(`regravar-ajustes-de-curva: ${rel(destino)} já era o que os ajustes de agora dão; nada mudou.`); return 0; }
  writeFileSync(destino, texto);
  console.log(`regravar-ajustes-de-curva: ${pedidos.length} ajustes gravados em ${rel(destino)}. Confira a malha da peça contra a assinatura de antes.`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal(process.argv.slice(2)).then((codigo) => { process.exitCode = codigo; }, (e) => {
    if (!(e instanceof ErroDeUso)) throw e;
    console.error(`regravar-ajustes-de-curva: ${e.message}\n  uso: node tools/modelar/regravar-ajustes-de-curva.mjs <receita.js | nome da peça> [--conferir] [--ajuda]`);
    process.exitCode = 2;
  });
}
