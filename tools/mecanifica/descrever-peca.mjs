#!/usr/bin/env node
/**
 * descrever-peca.mjs — serviço headless de medição e sua CLI fina.
 *
 * O serviço não lê argv, não escreve em streams e não encerra o processo. A
 * CLI apenas traduz argumentos para a entrada explícita e imprime o resultado.
 * A medição continua usando o mesmo núcleo neutro que alimenta a bancada.
 */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { descreverPeca as medirPeca, formatarDescricao } from '../../src/autoria/descrever-partes.js';
import { nomesDaSubarvore } from '../../src/autoria/hierarquia-partes.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const PECAS = join(REPO, 'prototipos/procedural/v3/pecas');
const DISPONIVEIS = Object.freeze(readdirSync(PECAS)
  .filter((arquivo) => arquivo.endsWith('.js'))
  .map((arquivo) => arquivo.slice(0, -'.js'.length))
  .sort());

export const PECAS_DISPONIVEIS = DISPONIVEIS;

function resultadoDeErro({ codigo, categoria, mensagem, stderr }) {
  return {
    ok: false,
    codigo,
    erro: { categoria, codigo: categoria === 'uso' ? 'uso_invalido' : 'falha_descricao', mensagem },
    stdout: '',
    stderr,
  };
}

function erroDeUso(mensagem) {
  return resultadoDeErro({
    codigo: 2,
    categoria: 'uso',
    mensagem,
    stderr: `descrever-peca: ${mensagem}\n`,
  });
}

function falha(mensagem) {
  return resultadoDeErro({
    codigo: 1,
    categoria: 'execucao',
    mensagem,
    stderr: `\n${mensagem}\n`,
  });
}

function amostraDeOrfaos(neutro) {
  return neutro.orfaos.slice(0, 5)
    .map((o) => `passo ${o.passo} (${o.op}): ${o.motivo}${o.ref === undefined ? '' : ` — ref ${JSON.stringify(o.ref)}`}`);
}

/**
 * Mede uma peça sem depender de CLI, stdout, stderr ou estado global de
 * processo. `partes` é uma lista explícita; `subarvore`, quando presente,
 * continua usando a hierarquia publicada pelo mesmo neutro.
 */
export async function descreverPecaReutilizavel({
  peca,
  modulo: moduloFornecido = null,
  partes = [],
  subarvore = null,
  casas = 6,
  estrito = false,
  listar = false,
  registroOperacoes = null,
} = {}) {
  if (listar) {
    return {
      ok: true,
      codigo: 0,
      stdout: `peças disponíveis (${DISPONIVEIS.length}):\n  ${DISPONIVEIS.join('\n  ')}\n`,
      stderr: '',
      resultado: { disponiveis: [...DISPONIVEIS] },
    };
  }
  if (!peca) {
    return erroDeUso(
      'diga qual peça medir, pelo nome do arquivo em prototipos/procedural/v3/pecas/.'
      + '\n  ex.: npm run descrever -- <id-da-peca>   (use --listar para ver todas)',
    );
  }
  if (!moduloFornecido && !DISPONIVEIS.includes(peca)) {
    return erroDeUso(
      `peça '${peca}' não existe em prototipos/procedural/v3/pecas/.`
      + `\n  disponíveis: ${DISPONIVEIS.join(', ')}`,
    );
  }
  if (!Number.isInteger(casas) || casas < 0 || casas > 12) {
    return erroDeUso(`--casas precisa ser inteiro entre 0 e 12, recebi '${casas}'`);
  }
  if (!Array.isArray(partes) || partes.some((parte) => typeof parte !== 'string')) {
    return erroDeUso('partes precisa ser uma lista de nomes de parte.');
  }
  const partesLidas = partes.filter(Boolean);
  if (subarvore !== null && (typeof subarvore !== 'string' || !subarvore.trim())) {
    return erroDeUso('--subarvore veio vazio; informe a raiz semântica ou omita a opção');
  }
  if (partesLidas.length && subarvore !== null) {
    return erroDeUso('--partes e --subarvore são consultas diferentes; informe somente uma delas');
  }

  let modulo = moduloFornecido;
  if (modulo !== null && (typeof modulo !== 'object' || Array.isArray(modulo))) {
    return erroDeUso('modulo precisa ser uma receita já carregada.');
  }
  if (modulo === null) {
    try {
      modulo = await import(pathToFileURL(join(PECAS, `${peca}.js`)).href);
    } catch (erro) {
      return falha(`PEÇA NÃO CARREGOU\n  ${peca}: ${erro.message}`);
    }
  }
  if (!Array.isArray(modulo.PASSOS)) {
    return falha(
      `PEÇA SEM ENVELOPE DA OFICINA\n  '${peca}' não exporta PASSOS.`
      + '\n  esta régua só mede peça escrita como passos da Oficina.',
    );
  }

  let neutro;
  try {
    ({ neutro } = executarReceita(modulo, { registroOperacoes }));
  } catch (erro) {
    return falha(`O NÚCLEO RECUSOU A PEÇA\n  ${peca}: ${erro.message}`);
  }

  let descricao;
  let consultaDeSubarvore = null;
  try {
    if (subarvore === null) {
      descricao = medirPeca(neutro, { partes: partesLidas.length ? partesLidas : null });
    } else {
      const raiz = subarvore.trim();
      const daRaiz = medirPeca(neutro, { partes: [raiz] });
      const nomes = nomesDaSubarvore(daRaiz.hierarquia, raiz);
      descricao = medirPeca(neutro, { partes: nomes });
      consultaDeSubarvore = { raiz, nomes };
    }
  } catch (erro) {
    return falha(`NÃO CONSEGUI MEDIR\n  ${erro.message}`);
  }

  let stdout = '';
  if (consultaDeSubarvore) {
    const selecionadas = [...consultaDeSubarvore.nomes].sort();
    const params = new URLSearchParams({ peca, selecionadas: selecionadas.join(',') });
    stdout += `CONSULTA DE SUBÁRVORE\n`
      + `  raiz: ${consultaDeSubarvore.raiz}\n`
      + `  partes (${selecionadas.length}): ${selecionadas.join(', ')}\n`
      + `  bancada: https://warbookbr.github.io/nos-mecanifica/bancada.html?${params}\n\n`;
  }
  stdout += formatarDescricao(descricao, { peca, casas });

  let stderr = '';
  let falhou = false;
  if (descricao.totais.orfaos) {
    stderr += `\n${descricao.totais.orfaos} ÓRFÃO(S): a peça tem referência inválida e as medidas acima`
      + ' descrevem uma peça incompleta.\n  ' + amostraDeOrfaos(neutro).join('\n  ') + '\n';
    falhou = true;
  }
  if (descricao.totais.facesSemParte && estrito) {
    stderr += `\n${descricao.totais.facesSemParte} face(s) sem identidade semântica (--estrito)`
      + `\n  ids: ${descricao.facesSemParte.slice(0, 20).join(', ')}\n`;
    falhou = true;
  }
  return {
    ok: !falhou,
    codigo: falhou ? 1 : 0,
    stdout,
    stderr,
    resultado: { peca, descricao, neutro },
  };
}

function comoCLI(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['partes', 'subarvore', 'casas'],
      bandeiras: ['listar', 'estrito'],
      posicional: { nome: 'a peça', obrigatorio: false },
    });
  } catch (erro) {
    return erroDeUso(erro.message);
  }
  const partesDeclaradas = lido.opcao('partes');
  const partes = partesDeclaradas === null
    ? []
    : partesDeclaradas.split(',').map((p) => p.trim()).filter(Boolean);
  const raizDaSubarvore = lido.opcao('subarvore');
  const casasTexto = lido.opcao('casas', '6');
  const casas = parseInt(casasTexto, 10);
  if (!Number.isInteger(casas) || casas < 0 || casas > 12) {
    return erroDeUso(`--casas precisa ser inteiro entre 0 e 12, recebi '${casasTexto}'`);
  }
  if (partesDeclaradas !== null && partes.length === 0) return erroDeUso('--partes veio vazio; informe nomes de parte ou omita a opção');
  if (raizDaSubarvore !== null && !raizDaSubarvore.trim()) return erroDeUso('--subarvore veio vazio; informe a raiz semântica ou omita a opção');
  return descreverPecaReutilizavel({
    peca: lido.posicional,
    partes,
    subarvore: raizDaSubarvore,
    casas,
    estrito: lido.bandeira('estrito'),
    listar: lido.bandeira('listar'),
  });
}

const executadoComoCLI = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const resultado = await comoCLI(process.argv.slice(2));
  process.stdout.write(resultado.stdout);
  process.stderr.write(resultado.stderr);
  process.exitCode = resultado.codigo;
}
