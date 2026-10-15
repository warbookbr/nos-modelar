#!/usr/bin/env node
/**
 * descrever-peca.mjs — serviço headless de medição e sua CLI fina.
 *
 * O serviço não lê argv, não escreve em streams e não encerra o processo. A
 * CLI apenas traduz argumentos para a entrada explícita e imprime o resultado.
 * A medição continua usando o mesmo núcleo neutro que alimenta a bancada.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import {
  ErroDeConfiguracao,
  OPCAO_COMPOSICOES,
  carregarConfiguracaoDeComposicoes,
  faltaRegistroDeComposicoes,
} from './configuracao-composicoes.mjs';
import { descreverPeca as medirPeca, formatarDescricao } from '../../src/autoria/descrever-partes.js';
import { contatosDaPeca } from '../../src/autoria/contatos-da-peca.js';
import {
  conferirPartesContraPlano, normalizarPlanoDeModelagem,
} from '../../src/autoria/plano-de-modelagem.js';
import { formasDaPeca } from '../../src/autoria/forma-da-parte.js';
import { nomesDaSubarvore } from '../../src/autoria/hierarquia-partes.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { iniciarRegistro } from './diario.mjs';
import { conferirFormaDoEsbocoDaReceita, conferirG01DaReceita, conferirRefinamentoDaReceita } from './refinamento-global.mjs';
import { conferirContornosDaPeca, contornosDaPeca } from './contorno-da-peca.mjs';
import { conferirRazoesDaPeca, normalizarRazoesDaPeca, textoDaRazao } from '../../src/autoria/razoes-da-peca.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const PECAS = join(REPO, 'procedural/pecas');
const DISPONIVEIS = Object.freeze(readdirSync(PECAS)
  .filter((arquivo) => arquivo.endsWith('.js'))
  .map((arquivo) => arquivo.slice(0, -'.js'.length))
  .sort());

export const PECAS_DISPONIVEIS = DISPONIVEIS;

function listarPartesDeObjetos(raizPecas = PECAS) {
  const partes = [];
  try {
    const objetos = readdirSync(raizPecas, { withFileTypes: true });
    for (const obj of objetos) {
      if (!obj.isDirectory()) continue;
      const pastaPartes = join(raizPecas, obj.name, 'partes');
      try {
        const subdiretorios = readdirSync(pastaPartes, { withFileTypes: true });
        for (const parte of subdiretorios) {
          if (!parte.isDirectory()) continue;
          const receita = join(pastaPartes, parte.name, 'receita.js');
          if (existsSync(receita) && statSync(receita).isFile()) {
            partes.push(`${obj.name}/${parte.name}`);
          }
        }
      } catch {
        // pasta partes não existe ou não pôde ser lida
      }
    }
  } catch {
    // raiz de peças inacessível
  }
  return Object.freeze(partes.sort());
}

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
  /* O VEREDITO É O PADRÃO, e desligá-lo exige pedido explícito.
     Ele já nasceu como `--estrito`, uma bandeira que quem chama precisava
     lembrar de digitar, pedida só no texto de duas skills e obrigada por gate
     nenhum. Medido nesta sessão: com o pedido curto que produziu a bicicleta
     ninguém digita bandeira, então a peça atravessada saía com código de saída
     zero. Uma bandeira que precisa ser lembrada transfere para a memória de
     quem chama a decisão de se o veredito existe, e é a mesma classe de coisa
     que o lembrete em prosa que este projeto já mediu ser ignorado.
     `estrito` continua aceito para não quebrar chamada existente, e não tem
     mais efeito: o veredito roda de qualquer jeito. */
  estrito = false,
  semVeredito = false,
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
  /* Módulo que exporta o registro de composições (`--composicoes=<módulo>`);
     vale quando `registroComposicoes` não vem pronto. */
  composicoes = null,
} = {}) {
  if (listar) {
    const partesDeObjeto = listarPartesDeObjetos();
    const textoSoltas = DISPONIVEIS.length
      ? `  ${DISPONIVEIS.join('\n  ')}\n`
      : '';
    const textoPartes = partesDeObjeto.length
      ? `  ${partesDeObjeto.join('\n  ')}\n`
      : '';
    return {
      ok: true,
      codigo: 0,
      stdout: `peças soltas (${DISPONIVEIS.length}):\n${textoSoltas}`
        + `\npartes de objeto (${partesDeObjeto.length}):\n${textoPartes}`,
      stderr: '',
      resultado: {
        disponiveis: [...DISPONIVEIS],
        partes: [...partesDeObjeto],
      },
    };
  }
  if (!peca) {
    return erroDeUso(
      'diga qual peça medir, pelo nome do arquivo em procedural/pecas/.'
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

  let execucao = { registroOperacoes, registroComposicoes, orcamentoComposicoes };
  if (composicoes !== null) {
    try {
      execucao = { ...execucao, ...await carregarConfiguracaoDeComposicoes(composicoes) };
    } catch (erro) {
      if (erro instanceof ErroDeConfiguracao) return erroDeUso(erro.message);
      throw erro;
    }
  }
  const falta = faltaRegistroDeComposicoes(receita, execucao.registroComposicoes, `'${peca}'`);
  if (falta) return erroDeUso(falta);

  let entrada;
  let neutro;
  let expansao = null;
  try {
    ({ entrada, neutro, expansao } = executarReceita(receita, execucao));
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
  /* A EXECUÇÃO RELAXADA PRECISA SE PARECER COM UMA. Sem esta linha, uma saída
     sem veredito e uma saída aprovada são o mesmo texto com o mesmo código de
     saída zero, e quem lê depois não tem como distinguir as duas. */
  if (semVeredito) {
    stdout += 'VEREDITO DESLIGADO (--sem-veredito): contato entre partes e forma'
      + ' prometida NÃO foram conferidos nesta execução.\n\n';
  }
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
  const comVeredito = !semVeredito;
  /* O DEGRAU REPROVA; O RESTO DOS AVISOS APARECE. O núcleo fecha a peça e diz, em `neutro.avisos`, o que um passo fez de
     diferente do pedido. O arredondamento que termina em degrau no meio de uma curva ficava só como uma face a mais, sem nada
     que o expusesse, e a peça passava limpa com a quina visível: agora o veredito reprova com a mensagem do aviso (a aresta,
     o motivo e a sugestão). Os outros avisos (o raio que `raioMinimo` reduziu) seguem como linha informativa. */
  const avisos = descricao.avisos ?? [];
  const degraus = avisos.filter((a) => a.ref === 'degrau');
  if (comVeredito && degraus.length) {
    stderr += `\n${degraus.length} ARREDONDAMENTO(S) TERMINADO(S) EM DEGRAU`
      + '\n  A peça fecha, mas o fim do arco ficou numa quina plana visível:\n'
      + degraus.map((a) => `    passo ${a.passo} (${a.op}): ${a.motivo}\n      sugestão: ${a.sugestao}`).join('\n')
      + '\n';
    falhou = true;
  }
  const outros = comVeredito ? avisos.filter((a) => a.ref !== 'degrau') : avisos;
  if (outros.length) {
    stderr += `\n${outros.length} AVISO(S) DO NÚCLEO (motivo na seção AVISOS DO NÚCLEO da descrição acima)\n`
      + outros.map((a) => `  passo ${a.passo} (${a.op}, ${a.ref})`).join('\n')
      + '\n';
  }
  if (descricao.totais.facesSemParte && comVeredito) {
    stderr += `\n${descricao.totais.facesSemParte} face(s) sem identidade semântica`
      + `\n  ids: ${descricao.facesSemParte.slice(0, 20).join(', ')}\n`;
    falhou = true;
  }

  /* CONTATO NÃO DECLARADO REPROVA. A tabela de relações acima já dizia, em
     texto, que partes se cruzavam — e um `grep` que pedia só contagem de partes
     e órfãos apagou o achado. O conserto não é escrever a linha melhor: é o
     estado sair no código de saída, que filtro nenhum descarta.
     Roda por padrão: ver a nota sobre `semVeredito` na assinatura. */
  let contatos = null;
  let formas = null;
  let plano = null;
  let refinamento = null;
  let formaDoEsboco = null;
  let g01 = null;
  let contornos = null;
  let razoes = null;
  const linhasDeReferencia = [];
  if (comVeredito) {
    /* PARTE PROMETIDA E NÃO ENTREGUE É INVISÍVEL PARA O RESTO DA RÉGUA. Quando
       o pneu saiu maciço, aro, cubo e raios nunca chegaram a existir; sem a
       segunda parte não havia par para acusar contato, e a peça passou limpa.
       O plano declara as partes ANTES, e é por isso que a ausência vira
       mensurável. Peça sem plano não reprova aqui — quem exige o plano é a
       guarda do acervo, porque medir uma peça de ensaio precisa continuar
       possível. */
    try {
      plano = normalizarPlanoDeModelagem(entrada.PLANO ?? receita.PLANO);
    } catch (erro) {
      return falha(`PLANO DE MODELAGEM INVÁLIDO\n  ${erro.message}`);
    }
    if (plano) {
      const nomes = new Set();
      for (const face of neutro.F.values()) if (face.parte) nomes.add(face.parte);
      const conferencia = conferirPartesContraPlano(plano, [...nomes]);
      if (conferencia.faltando.length) {
        stderr += `\n${conferencia.faltando.length} PARTE(S) PROMETIDA(S) E NÃO ENTREGUE(S)`
          + `\n  O plano de modelagem declara: ${conferencia.faltando.join(', ')}.`
          + '\n  A peça não tem nenhuma face com esses nomes.\n';
        falhou = true;
      }
      if (conferencia.naoPrometidas.length) {
        stderr += `\n${conferencia.naoPrometidas.length} PARTE(S) ENTREGUE(S) SEM PROMESSA`
          + `\n  A peça tem: ${conferencia.naoPrometidas.join(', ')}.`
          + '\n  Ou o plano está desatualizado, ou a peça ganhou parte que ninguém pediu.\n';
        falhou = true;
      }
    }
    /* REFINAMENTO DA FORMA GLOBAL. Receita sem `REFINA` passa direto. A que declara refinar um andaime
       responde por cada parte dentro do envelope do volume dela e pelas portas que o andaime declara. */
    try {
      /* Com o módulo entregue pronto não há caminho resolvido; o nome da peça, se existir em disco, ainda diz a pasta. */
      let caminho = caminhoReceita;
      if (!caminho) { try { caminho = resolverCaminhoReceita(peca, { raiz: REPO }); } catch { caminho = null; } }
      refinamento = conferirRefinamentoDaReceita({ receita, neutro, caminhoDaReceita: caminho });
    } catch (erro) {
      return falha(`REFINAMENTO DA FORMA GLOBAL INVÁLIDO\n  ${erro.message}`);
    }
    if (refinamento && !refinamento.ok) {
      stderr += `\n${refinamento.achados.length} ACHADO(S) NO REFINAMENTO DO ANDAIME '${refinamento.andaime}'\n`
        + refinamento.achados.map((a) => `    ${a.mensagem}`).join('\n')
        + '\n  A receita refina o andaime; ela não refaz o que o nível zero decidiu. Ou a peça saiu do envelope'
        + '\n  e da porta do andaime, ou o andaime precisa mudar antes e o G01 ser refeito.\n';
      falhou = true;
    }
    /* FORMA CONTRA O ESBOÇO. O envelope acima é uma caixa e limita a parte só por cima. Quando a receita declara `REFINA.esboco`, cada
       parte ligada a uma forma do esboço é comparada ao sólido dessa forma (com os recortes, as inclinações e a malha de família) pela
       razão interseção/união de volume, e reprova abaixo do mínimo declarado. Sem o campo nada roda. */
    try {
      let caminho = caminhoReceita;
      if (!caminho) { try { caminho = resolverCaminhoReceita(peca, { raiz: REPO }); } catch { caminho = null; } }
      formaDoEsboco = await conferirFormaDoEsbocoDaReceita({ receita, neutro, caminhoDaReceita: caminho });
    } catch (erro) {
      return falha(`FORMA CONTRA O ESBOÇO INVÁLIDA\n  ${erro.message}`);
    }
    if (formaDoEsboco && !formaDoEsboco.ok) {
      stderr += `\n${formaDoEsboco.achados.length} ACHADO(S) NA FORMA CONTRA O ESBOÇO '${formaDoEsboco.arquivo}'\n`
        + formaDoEsboco.achados.map((a) => `    ${a.mensagem}`).join('\n')
        + '\n  A parte diverge do sólido da forma do esboço que ela refina (razão interseção/união de volume): ou a receita saiu da forma,'
        + '\n  ou o esboço precisa mudar antes, ou o mínimo declarado em REFINA.esboco não é o que a parte pode cumprir.\n';
      falhou = true;
    }
    try {
      contatos = contatosDaPeca(neutro, receita);
    } catch (erro) {
      return falha(`NÃO CONSEGUI MEDIR OS CONTATOS\n  ${erro.message}`);
    }
    if (contatos.naoDeclarados.length) {
      stderr += `\n${contatos.naoDeclarados.length} CONTATO(S) NÃO DECLARADO(S)`
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
      stderr += `\n${formas.divergentes.length} PARTE(S) COM FORMA DIFERENTE DA PROMETIDA\n`
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

    /* DECLARADO QUE NÃO ENCOSTA TAMBÉM REPROVA, e esta é a metade que faltava.
       A medida já apurava o par declarado sem contato, e só o exibia, com o
       argumento de que podia ser folga que a receita pretendia fechar. O efeito
       prático foi outro: numa bicicleta anterior os balancos que seguram a roda
       ficaram soltos no ar, o quadro saiu em pedaços que não se tocavam, e o
       comando devolveu zero. Declarar que duas partes se soldam e entregar
       espaço entre elas é defeito das duas maneiras possíveis — ou a geometria
       está errada, ou a declaração descreve uma peça que não existe. */
    if (contatos.declaradosSemContato.length) {
      stderr += `\n${contatos.declaradosSemContato.length} CONTATO(S) DECLARADO(S) QUE NÃO ACONTECEM`
        + '\n  A receita disse que estas partes se tocam, e elas não se tocam:\n'
        + contatos.declaradosSemContato
          .map(({ par, motivo }) => `    ${par[0]} ↔ ${par[1]}: ${motivo}`)
          .join('\n')
        + '\n  Ou a geometria não chegou onde deveria, ou a declaração está errada.\n';
      falhou = true;
    }

    if (contatos.cobertura.inconclusivos.length) {
      /* Não reprova: malha aberta é estilo que o motor aceita, e reprovar aqui
         puniria peça legítima. Mas também não vira "livre" — a medida diz que
         não conseguiu decidir, em vez de inventar garantia. */
      stderr += `\n${contatos.cobertura.inconclusivos.length} par(es) que a medida NÃO conseguiu decidir`
        + ' — malha aberta ou não-manifold; não são pares livres.\n';
    }

    /* A FORMA CONTRA A REFERÊNCIA, DEPOIS DE TUDO O QUE JÁ RODA. Contato, plano e refinamento dizem que as partes existem e se
       encaixam; nenhum diz que a forma é a pedida. Cada item abaixo mede a malha contra uma referência que existe no
       repositório (o alvo N2, o contorno por parte, a razão declarada) com os limiares que cada um já tem, e um item sem
       referência diz "não conferido: sem referência" em vez de passar calado: não aprova e não barra. */
    let caminhoDaPeca = caminhoReceita;
    if (!caminhoDaPeca) { try { caminhoDaPeca = resolverCaminhoReceita(peca, { raiz: REPO }); } catch { caminhoDaPeca = null; } }

    try {
      g01 = conferirG01DaReceita({ receita, neutro, caminhoDaReceita: caminhoDaPeca });
    } catch (erro) {
      return falha(`G01 DA PEÇA INVÁLIDO\n  ${erro.message}`);
    }
    if (g01 === null) {
      linhasDeReferencia.push('G01 sobre a malha: não conferido: sem referência (REFINA não declara alvo N2)');
    } else if (!g01.rodou) {
      linhasDeReferencia.push(`G01 sobre a malha (alvo ${g01.alvo}): não conferido: ${g01.motivo}`);
    } else {
      const a = g01.avaliacao;
      linhasDeReferencia.push(`G01 sobre a malha (alvo ${g01.alvo}): ${g01.medidasAprovadas ? 'medidas aprovadas' : 'medidas REPROVADAS'}`
        + ` — silhuetas ${a.vistas.map((v) => `${v.id} ${String(Math.round(v.metricas.iou * 1000) / 1000).replace('.', ',')}`).join(', ')} (razão interseção/união)`
        + `, envelope ${a.envelope.estado}, regiões ${a.regioes.estado}; G00 do alvo ${g01.avaliacaoAlvo.estado} (${g01.avaliacaoAlvo.motivo})`);
      if (!g01.medidasAprovadas) {
        stderr += `\n${a.diagnosticos.filter((d) => d.codigo !== 'alvo-nao-aprovado').length} ACHADO(S) NO G01 DA MALHA CONTRA O ALVO '${g01.alvo}'\n`
          + a.diagnosticos.filter((d) => d.codigo !== 'alvo-nao-aprovado')
            .map((d) => `    ${d.campo}: ${d.codigo} — ${d.causa} ${d.impacto}`).join('\n')
          + '\n  A malha da peça diverge do alvo N2 em silhueta, envelope ou regiões: ajuste a receita, ou o alvo, se foi ele que errou.\n';
        falhou = true;
      }
    }

    if (caminhoDaPeca === null) {
      contornos = null;
      linhasDeReferencia.push('contorno por parte: não conferido: sem referência (a peça foi entregue sem arquivo, e a pasta dela não existe)');
    } else {
      const achados = contornosDaPeca({ caminhoDaReceita: caminhoDaPeca, raiz: REPO });
      if (achados.length === 0) {
        linhasDeReferencia.push('contorno por parte: não conferido: sem referência (nenhum *.contornos.json na pasta da peça)');
      } else {
        try {
          contornos = conferirContornosDaPeca({ neutro, contornos: achados });
        } catch (erro) {
          return falha(`CONTORNO POR PARTE INVÁLIDO\n  ${erro.message}`);
        }
        for (const c of contornos.conferencias) {
          linhasDeReferencia.push(`contorno por parte (${c.arquivo}, vista ${c.vista}): ${c.ok ? 'aprovado' : 'REPROVADO'}`
            + ` — ${c.resultados.map((r) => `${r.parte ?? 'silhueta'} ${String(r.iou).replace('.', ',')}`).join(', ')} (razão interseção/união)`);
        }
        for (const n of contornos.naoConferidos) linhasDeReferencia.push(`contorno por parte (${n.arquivo}): não conferido: ${n.motivo}`);
        const fora = contornos.conferencias.flatMap((c) => c.resultados.filter((r) => !r.ok).map((r) => ({ arquivo: c.arquivo, r })));
        if (fora.length) {
          stderr += `\n${fora.length} CONTORNO(S) FORA DA REFERÊNCIA (silhueta ou parte)\n`
            + fora.map(({ arquivo, r }) => `    ${arquivo}: ${r.texto}`).join('\n')
            + '\n  A malha da parte diverge do contorno da referência além do limite (razão interseção/união e desvio em milímetro):'
            + '\n  ou a forma está errada, ou a referência não é desta peça.\n';
          falhou = true;
        }
      }
    }

    try {
      const declaradas = normalizarRazoesDaPeca(receita.RAZOES);
      if (declaradas) razoes = conferirRazoesDaPeca({ razoes: declaradas, neutro });
    } catch (erro) {
      return falha(`RAZÕES DECLARADAS INVÁLIDAS\n  ${erro.message}`);
    }
    if (razoes === null) {
      linhasDeReferencia.push('razões: não conferido: sem referência (a receita não exporta RAZOES)');
    } else {
      linhasDeReferencia.push(`razões: ${razoes.ok ? 'todas dentro da faixa' : 'REPROVADAS'} (${razoes.resumo.total} declarada${razoes.resumo.total === 1 ? '' : 's'}, ${razoes.resumo.lidas} lida${razoes.resumo.lidas === 1 ? '' : 's'}, ${razoes.resumo.reprovadas} fora da faixa)`);
      if (!razoes.ok) {
        const ruins = razoes.medidas.filter((m) => !m.lida || !m.ok);
        stderr += `\n${ruins.length} RAZÃO(ÕES) FORA DA FAIXA OU SEM LEITURA\n`
          + ruins.map((m) => `    ${textoDaRazao(m)}`).join('\n')
          + '\n  A proporção declarada não é a da malha: a forma está fora da faixa da referência, ou a declaração está errada.\n';
        falhou = true;
      }
    }
    if (formaDoEsboco) {
      linhasDeReferencia.push(`forma contra o esboço (${formaDoEsboco.arquivo}, opção ${formaDoEsboco.opcao?.titulo ?? formaDoEsboco.opcao?.numero ?? formaDoEsboco.opcao}): ${formaDoEsboco.ok ? 'aprovada' : 'REPROVADA'}`
        + ` — ${formaDoEsboco.partes.map((p) => `${p.parte} ${String(Math.round(p.razao * 1000) / 1000).replace('.', ',')}`).join(', ') || 'nenhuma parte medida'} (razão interseção/união de volume, mínimo ${String(formaDoEsboco.minimo).replace('.', ',')})`);
    }
    stdout += `\nREFERÊNCIA DA FORMA\n${linhasDeReferencia.map((l) => `  ${l}`).join('\n')}\n`;
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
      avisos,
      contatos,
      formas,
      plano,
      refinamento,
      formaDoEsboco,
      g01,
      contornos,
      razoes,
      neutro,
      expansao,
    },
  };
}

function comoCLI(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['partes', 'subarvore', 'casas', OPCAO_COMPOSICOES],
      bandeiras: ['listar', 'estrito', 'completo', 'sem-veredito'],
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
    semVeredito: lido.bandeira('sem-veredito'),
    resumo: !lido.bandeira('completo'),
    listar: lido.bandeira('listar'),
    composicoes: lido.opcao(OPCAO_COMPOSICOES),
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
