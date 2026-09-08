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
import { contatosDaPeca } from '../../src/autoria/contatos-da-peca.js';
import { formasDaPeca } from '../../src/autoria/forma-da-parte.js';
import { nomesDaSubarvore } from '../../src/autoria/hierarquia-partes.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { iniciarRegistro } from './diario.mjs';

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
  /* Resumido por PADRÃO. A saída completa tem 9,8 KB numa peça de 11 partes, e
     cresce O(n²) nas relações — uma máquina de 40 partes passaria de 60 KB por
     chamada, várias vezes por rodada. Quem chama para MEDIR um encaixe pede
     `--completo` e recebe tudo; quem chama para saber se a peça está sã, que é
     a maioria das chamadas, não precisa pagar a tabela inteira.
     O dado estruturado devolvido continua completo: só o TEXTO encolhe. */
  resumo = true,
  listar = false,
  registroOperacoes = null,
  registroComposicoes = null,
  orcamentoComposicoes = null,
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
  let caminhoReceita = null;
  if (!moduloFornecido) {
    try {
      caminhoReceita = resolverCaminhoReceita(peca, { raiz: REPO });
    } catch (erro) {
      /* A mensagem do resolvedor distingue "não encontrada" de "confinamento
         violado", e engoli-la fazia uma tentativa de sair do repositório ser
         relatada como peça inexistente — resposta errada para a pergunta errada.
         O catálogo continua junto, porque é o que ajuda quem só errou o nome. */
      return erroDeUso(`${erro.message}\n  disponíveis em pecas/: ${DISPONIVEIS.join(', ')}`);
    }
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
      modulo = await importarReceita(caminhoReceita);
    } catch (erro) {
      return falha(`PEÇA NÃO CARREGOU\n  ${peca}: ${erro.message}`);
    }
  }
  const receita = receitaDoModulo(modulo);
  if (!Array.isArray(receita.PASSOS) && !Array.isArray(receita.CHAMADAS_COMPOSICOES)) {
    return falha(
      `PEÇA SEM ENVELOPE DA OFICINA\n  '${peca}' não exporta PASSOS nem CHAMADAS_COMPOSICOES.`
      + '\n  esta régua só mede peça escrita pelo contrato procedural da Oficina.',
    );
  }

  let entrada;
  let neutro;
  let expansao = null;
  try {
    ({ entrada, neutro, expansao } = executarReceita(receita, {
      registroOperacoes,
      registroComposicoes,
      orcamentoComposicoes,
    }));
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
  stdout += formatarDescricao(descricao, { peca, casas, resumo });

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

  /* CONTATO NÃO DECLARADO REPROVA. A tabela de relações acima já dizia, em
     texto, que partes se cruzavam — e um `grep` que pedia só contagem de partes
     e órfãos apagou o achado. O conserto não é escrever a linha melhor: é o
     estado sair no código de saída, que filtro nenhum descarta.
     Roda só em `--estrito` porque é veredito, e veredito é o que quem chama
     pediu para ser cobrado. */
  let contatos = null;
  let formas = null;
  if (estrito) {
    try {
      contatos = contatosDaPeca(neutro, receita);
    } catch (erro) {
      return falha(`NÃO CONSEGUI MEDIR OS CONTATOS\n  ${erro.message}`);
    }
    if (contatos.naoDeclarados.length) {
      stderr += `\n${contatos.naoDeclarados.length} CONTATO(S) NÃO DECLARADO(S) (--estrito)`
        + '\n  A receita não disse que estas partes deveriam se tocar:\n'
        + contatos.naoDeclarados
          .map(({ par, estado, metodo }) => `    ${par[0]} ↔ ${par[1]}: ${estado} (${metodo})`)
          .join('\n')
        + '\n  Se o contato é intencional, declare-o em `contatos` da receita,'
        + '\n  com o motivo. Se não é, a geometria está errada.\n';
      falhou = true;
    }
    /* FORMA PROMETIDA CONTRA ENTREGUE. Existe porque contato não basta: se o
       pneu sai maciço e aro, cubo e raios não chegam a ser modelados, não há
       segunda parte para acusar contato — a peça é um disco sólido e passa
       limpa. Mesma falha, forma mais simples, invisível para a medida acima. */
    try {
      formas = formasDaPeca(neutro, receita);
    } catch (erro) {
      return falha(`NÃO CONSEGUI CONFERIR AS FORMAS\n  ${erro.message}`);
    }
    if (formas.divergentes.length) {
      stderr += `\n${formas.divergentes.length} PARTE(S) COM FORMA DIFERENTE DA PROMETIDA (--estrito)\n`
        + formas.divergentes
          .map(({ parte, forma, erros }) => `    ${parte}${forma ? ` (${forma})` : ''}: `
            + erros.map((e) => `${e.campo} esperado ${e.esperado}, medido ${e.medido}`).join('; '))
          .join('\n')
        + '\n';
      falhou = true;
    }
    if (formas.indecidiveis.length) {
      stderr += `\n${formas.indecidiveis.length} forma(s) que a medida NÃO conseguiu decidir`
        + ' — furo passante só é contável em malha fechada.\n';
    }

    if (contatos.cobertura.inconclusivos.length) {
      /* Não reprova: malha aberta é estilo que o motor aceita, e reprovar aqui
         puniria peça legítima. Mas também não vira "livre" — a medida diz que
         não conseguiu decidir, em vez de inventar garantia. */
      stderr += `\n${contatos.cobertura.inconclusivos.length} par(es) que a medida NÃO conseguiu decidir`
        + ' — malha aberta ou não-manifold; não são pares livres.\n';
    }
  }

  return {
    ok: !falhou,
    codigo: falhou ? 1 : 0,
    stdout,
    stderr,
    resultado: {
      peca,
      descricao: { ...descricao, intencao: entrada.INTENCAO ?? null },
      intencao: entrada.INTENCAO ?? null,
      contatos,
      formas,
      neutro,
      expansao,
    },
  };
}

function comoCLI(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['partes', 'subarvore', 'casas'],
      bandeiras: ['listar', 'estrito', 'completo'],
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
    resumo: !lido.bandeira('completo'),
    listar: lido.bandeira('listar'),
  });
}

const executadoComoCLI = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const fechar = iniciarRegistro('descrever', process.argv[2]);
  const resultado = await comoCLI(process.argv.slice(2));
  process.stdout.write(resultado.stdout);
  process.stderr.write(resultado.stderr);
  process.exitCode = resultado.codigo;
  /* Depois de escrever a saída: o diário observa, nunca antecede o trabalho. */
  fechar({
    codigo: resultado.codigo,
    medidas: resultado.resultado?.descricao?.totais ?? null,
    erro: resultado.erro?.mensagem ?? null,
  });
}
