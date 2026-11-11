#!/usr/bin/env node
/* lasca.mjs — lista cada face fina de uma receita: a parte, a razão, os cantos em milímetro e o passo que criou a face.
 *
 * `conferir-malha` diz que há lasca e quantas; para consertar, quem autora precisa saber qual face, de qual parte, de onde
 * veio. A lista junta o que o núcleo já mede: a topologia dá a face e a razão (área / maior aresta²), a procedência dá o passo
 * que a produziu e a receita dá a operação e o `origemId` desse passo. Nada é escrito e nada é consertado.
 *
 *   node tools/modelar/lasca.mjs <receita | esboço | montagem> [--opcao=<n>] [--limite=0.003] [--json]
 *
 * O arquivo é lido pelo resolvedor comum das ferramentas de medida (`entrada-de-medida.mjs`): receita, esboço 2.0 (`.esboco.mjs` ou
 * `.esboco.json`, com `--opcao`, de 1) ou montagem persistida, em que cada peça sai com o seu nome.
 *
 * Sai com 1 quando há lasca, com 0 quando não há, e com 2 quando o comando foi mal usado.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { analisarTopologia, LIMITE_DE_FACE_FINA } from '../../procedural/nucleo/topologia.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeEntrada, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';

const MM = 1000;
const arredondar = (valor) => Math.round(valor * MM * 1000) / 1000;

/* O passo que criou a face: a procedência lista, por passo, os ids de face que ele escreveu. Face sem registro (neutro montado à
   mão, por exemplo) fica sem passo, e a lista diz isso em vez de adivinhar pelo id. */
function passoDaFace(procedencia, idDaFace) {
  for (const registro of procedencia?.passos ?? []) {
    if (registro.saidas?.faces?.includes(idDaFace)) return registro.passo;
  }
  return null;
}

/**
 * As faces finas de um estado neutro, em ordem de id: `{ face, parte, razao, cantos, passo, operacao, origemId }`.
 * `cantos` traz o id e a posição em milímetro de cada canto, na ordem da face. `passos` é a lista de passos que a receita
 * executou (a composição já expandida), de onde saem a operação e o `origemId` do passo.
 */
export function lascasDoNeutro(neutro, { passos = [], limite = LIMITE_DE_FACE_FINA } = {}) {
  const topologia = analisarTopologia({ vertices: neutro.V, faces: neutro.F }, { limiteDeFace: limite });
  return topologia.achados
    .filter((achado) => achado.codigo === 'face-fina')
    .map((achado) => {
      const face = neutro.F.get(achado.onde.face);
      const passo = passoDaFace(neutro.procedencia, face.id);
      const doPasso = passo === null ? null : passos[passo] ?? null;
      return {
        face: face.id,
        parte: face.parte ?? null,
        razao: achado.onde.razao,
        cantos: face.vs.map((id) => ({ vertice: id, mm: neutro.V.get(id).map(arredondar) })),
        passo,
        operacao: doPasso?.[0] ?? null,
        origemId: doPasso?.[1]?.origemId ?? null,
      };
    })
    .sort((a, b) => a.face - b.face);
}

/** Executa uma receita já carregada (módulo ou objeto com PASSOS) e devolve as lascas dela. Com `executada` (`{ entrada, neutro }`),
 *  usa a execução que quem chama já tem, sem montar a peça de novo. */
export function lascasDaReceita(receita, { limite = LIMITE_DE_FACE_FINA, executada = null, ...execucao } = {}) {
  const { entrada, neutro } = executada ?? executarReceita(receita, execucao);
  return { lascas: lascasDoNeutro(neutro, { passos: entrada.PASSOS, limite }), orfaos: neutro.orfaos ?? [] };
}

const formatarCanto = ({ vertice, mm }) => `v${vertice} (${mm.join('; ')})`;

export function formatarLascas(nome, { lascas, orfaos }, limite = LIMITE_DE_FACE_FINA) {
  const linhas = [];
  if (orfaos.length) {
    linhas.push(`${nome}: a receita reclamou de ${orfaos.length} passo(s) ao executar; rode conferir-malha para ver quais.`);
  }
  if (!lascas.length) {
    linhas.push(`${nome}: nenhuma face fina (área / maior aresta² abaixo de ${String(limite).replace('.', ',')}).`);
    return linhas.join('\n');
  }
  linhas.push(`${nome}: ${lascas.length} face(s) fina(s) (área / maior aresta² abaixo de ${String(limite).replace('.', ',')}).`);
  for (const l of lascas) {
    const passo = l.passo === null
      ? 'passo desconhecido'
      : `passo ${l.passo}${l.operacao ? ` (${l.operacao}${l.origemId === null ? '' : ` origemId ${l.origemId}`})` : ''}`;
    linhas.push(`  face ${l.face} · parte ${l.parte ?? '(sem parte)'} · razão ${l.razao.toExponential(2)} · ${passo}`);
    linhas.push(`    cantos em mm: ${l.cantos.map(formatarCanto).join(', ')}`);
  }
  return linhas.join('\n');
}

function uso(mensagem) {
  process.stderr.write(`lasca: ${mensagem}\nuso: node tools/modelar/lasca.mjs <receita | esboço | montagem> [--opcao=<n>] [--limite=0.003] [--json]\n`);
  return 2;
}

export async function comoCLI(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['limite', 'opcao'],
      bandeiras: ['json'],
      posicional: { nome: 'a receita', obrigatorio: true },
    });
  } catch (erro) {
    return uso(erro.message);
  }
  const textoDoLimite = lido.opcao('limite');
  const limite = textoDoLimite === null ? LIMITE_DE_FACE_FINA : Number(textoDoLimite);
  if (!(limite > 0)) return uso(`--limite precisa ser um número positivo, recebi '${textoDoLimite}'.`);
  let entrada;
  try {
    entrada = await lerEntradaDeMedida(lido.posicional, { opcao: opcaoDaLinha(lido.opcao('opcao')) });
  } catch (erro) {
    if (erro instanceof ErroDeEntrada) return uso(erro.message);
    throw erro;
  }
  /* uma peça (receita ou esboço) ou, numa montagem, cada peça com o nome dela */
  const pecas = entrada.tipo === 'montagem'
    ? entrada.partes.map((p) => ({ nome: `${lido.posicional}:${p.nome}`, resultado: lascasDaReceita(p.receita, { limite }) }))
    : [{ nome: lido.posicional, resultado: lascasDaReceita(entrada.receita, { limite, executada: entrada.executar() }) }];
  const total = pecas.reduce((n, p) => n + p.resultado.lascas.length, 0);
  if (lido.bandeira('json')) {
    const saida = pecas.length === 1 && entrada.tipo !== 'montagem'
      ? { receita: lido.posicional, ...(entrada.tipo === 'esboco' ? { esboco: entrada.origem } : {}), limite, ...pecas[0].resultado }
      : { montagem: lido.posicional, limite, pecas: pecas.map((p) => ({ peca: p.nome, ...p.resultado })) };
    process.stdout.write(`${JSON.stringify(saida, null, 2)}\n`);
  } else {
    if (entrada.tipo === 'esboco') process.stdout.write(`${entrada.origem}\n`);
    for (const p of pecas) process.stdout.write(`${formatarLascas(p.nome, p.resultado, limite)}\n`);
  }
  return total ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await comoCLI(process.argv.slice(2));
}
