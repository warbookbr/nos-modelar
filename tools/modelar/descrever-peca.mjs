#!/usr/bin/env node
/**
 * descrever-peca.mjs — serviço headless de medição e sua CLI fina.
 *
 * O serviço não lê argv, não escreve em streams e não encerra o processo. A
 * CLI apenas traduz argumentos para a entrada explícita e imprime o resultado.
 * A medição continua usando o mesmo núcleo neutro que alimenta a bancada.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
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
import { criarMemoriaDeAuditoria } from '../../src/autoria/contato-de-solidos.js';
import { conferirVaosDaPeca, formatarVaos } from '../../src/autoria/molduras-do-vao.js';
import { avisoDaDispensa } from '../../src/autoria/lataria.js';
import {
  conferirPartesContraPlano, normalizarPlanoDeModelagem,
} from '../../src/autoria/plano-de-modelagem.js';
import { formasDaPeca } from '../../src/autoria/forma-da-parte.js';
import { nomesDaSubarvore } from '../../src/autoria/hierarquia-partes.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { REGISTRO_OPERACOES } from '../../procedural/nucleo/entrada.js';
import { FACES_MINIMAS_PARA_RECORTAR } from '../../procedural/nucleo/operacoes/abertura-por-contorno.js';
import { avisosDasComposicoes } from './avisos-de-composicao.mjs';
import { medirFaceDegenerada, medirTrianguloFino, medirSerrilhadoDaCostura } from './reguas-de-malha/reguas-de-malha.mjs';
import { dobraDaReceita, textoDaDobra } from './dobra-da-superficie.mjs';
import { textoDoAchado, vincoOcultoDaReceita } from './vinco-oculto.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { avisarReferenciasLocaisAusentes, mensagemDeReferenciasAusentes, referenciasDoPlano } from './referencias-do-plano.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { iniciarRegistro } from './diario.mjs';
import { conferirFormaDoEsbocoDaReceita, conferirG01DaReceita, conferirRefinamentoDaReceita } from './refinamento-global.mjs';
import { partesComCascaAberta } from './casca-aberta-por-parte.mjs';
import { conferirContornosDaPeca, contornosDaPeca } from './contorno-da-peca.mjs';
import { afastamentoDaParte, textoDoAfastamento } from '../../src/autoria/refinamento-global.js';
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

/* OS ÓRFÃOS, UM POR LINHA, COM O PASSO E O MOTIVO. Um passo recusado deixa o que ele devia criar sem existir, e todo passo seguinte que o cita vira
   órfão também (no furgão, em 2026-11-11, uma `aberturaPorContorno` cujo contorno cruzava a fresta de uma porta esvaziou a chapa e a cadeia
   inteira). O eco de uma causa ("origem ... inexistente", "seleção vazia") vem depois das causas e some quando passa do corte, com a conta do que ficou de fora. */
const ECO_DE_ORFAO = /inexistente ou ainda não criada|seleção vazia|nenhum alvo (de face )?válido/;
const ORFAOS_LISTADOS = 12;

export function linhasDeOrfaos(neutro, { limite = ORFAOS_LISTADOS } = {}) {
  const orfaos = Array.isArray(neutro?.orfaos) ? neutro.orfaos : [];
  const texto = (o) => `passo ${o.passo} (${o.op}): ${o.motivo}${o.ref == null ? '' : ` — ref ${JSON.stringify(o.ref)}`}`;
  const causas = orfaos.filter((o) => !ECO_DE_ORFAO.test(String(o.motivo)));
  const ecos = orfaos.filter((o) => ECO_DE_ORFAO.test(String(o.motivo)));
  const ordem = [...causas, ...ecos];
  const linhas = ordem.slice(0, limite).map(texto);
  if (ordem.length > limite) linhas.push(`... e mais ${ordem.length - limite} órfão(s), quase todos o eco do que os de cima não criaram`);
  if (causas.length && ecos.length && ordem.length <= limite) linhas.push(`(${causas.length} causa(s) e ${ecos.length} eco(s) que citam o que elas não criaram)`);
  return linhas;
}

function amostraDeOrfaos(neutro) { return linhasDeOrfaos(neutro); }

/* O REGISTRO QUE CRONOMETRA CADA PASSO. O núcleo não mede o tempo de um passo, e o `descrever` precisava dele para dizer qual vão custou (a janela da
   cabine do furgão foi de 118 s a 207 s em 2026-11-09 sem nada acusar). O núcleo consulta o registro uma vez por passo, na ordem e antes de executar
   (`registro.resolver(op)` no laço dos `PASSOS`), e o cronômetro mede de uma consulta à seguinte: o passo `k` dura da consulta `k` à `k + 1`, e o último
   fecha em `fechar`, depois da execução. A operação volta do registro como veio. Embrulhar o `executar` dela, como este cronômetro fazia, tirava o passo do
   caminho rápido do núcleo, que só confia na declaração de escrita da operação quando a função é a original, e cada passo voltava a retratar a malha
   inteira: o `descrever` do furgão foi de 180 s a 480 s (CI de 2026-11-12, `guarda:tempo`). `fechar(passos)` descarta os tempos quando o número de
   consultas não é o de passos executados, porque aí o índice da consulta não é o do passo. */
export function registroCronometrado(base, { total, tempos, aoPasso }) {
  const voltas = [];
  const fecharAnterior = (agora) => {
    const k = voltas.length - 1;
    if (k < 0 || voltas[k].ms != null) return;
    voltas[k].ms = agora - voltas[k].t0;
    tempos.set(k, { op: voltas[k].op, ms: voltas[k].ms });
    aoPasso?.(k, total, voltas[k].op);
  };
  const registro = {
    ...base,
    resolver(...argumentos) {
      fecharAnterior(performance.now());
      const registrada = base.resolver(...argumentos);
      voltas.push({ op: registrada?.nome ?? argumentos[0], t0: performance.now(), ms: null });
      return registrada;
    },
  };
  const fechar = (passos) => {
    fecharAnterior(performance.now());
    if (!Array.isArray(passos) || passos.length !== voltas.length) tempos.clear();
  };
  return { registro, fechar };
}

const segundos = (ms) => String(Math.round(ms / 100) / 10).replace('.', ',');

/* A ABERTURA QUE CAI NA BOOLEANA DA CHAPA INTEIRA, COMO AVISO. O recorte da vizinhança do vão deixa a booleana ver só o trecho em volta dele; quando ele não
   recorta, a booleana vê a chapa inteira e o passo custa o tamanho dela. Só importa quando a chapa é grande (a de menos de FACES_MINIMAS_PARA_RECORTAR faces
   não recorta de propósito). O motivo é o `vizinhanca.motivo` do registro, e o tempo o do passo. Devolve as linhas, ou lista vazia. */
export function avisosDaChapaInteira(neutro, tempos = new Map()) {
  const aberturas = Array.isArray(neutro?.aberturas) ? neutro.aberturas : [];
  return aberturas
    .filter((a) => a.vizinhanca && a.vizinhanca.recortada === false && a.vizinhanca.daChapa >= FACES_MINIMAS_PARA_RECORTAR)
    .map((a) => {
      const tempo = tempos.get(a.passo);
      return `passo ${a.passo} (aberturaPorContorno): a booleana viu a chapa inteira, de ${a.vizinhanca.daChapa} faces`
        + `${tempo ? `, e o passo levou ${segundos(tempo.ms)} s` : ''}: ${a.vizinhanca.motivo}`;
    });
}

/**
 * Mede uma peça sem depender de CLI, stdout, stderr ou estado global de
 * processo. `partes` é uma lista explícita; `subarvore`, quando presente,
 * continua usando a hierarquia publicada pelo mesmo neutro.
 */
/* Os grupos de partes ligadas por contato (ou por par que a medida não decidiu) e o que a receita declara em `ilhas`:
   { grupos, problemas }. Cada grupo além de um precisa de uma declaração `{ contem, motivo }` com uma parte
   dele, e a declaração que não cai num grupo separado também é problema, porque descreve o que não existe. Fica como a peça
   o maior grupo que não foi declarado; declarar todos os grupos também é problema. */
export function ilhasDaPeca(contatos, receita = {}) {
  const pai = new Map(contatos.partes.map((x) => [x, x]));
  const raiz = (x) => { while (pai.get(x) !== x) x = pai.get(x); return x; };
  for (const [a, b] of [...contatos.paresEmContato.map((q) => q.par), ...contatos.cobertura.inconclusivos.map((q) => q.par)]) pai.set(raiz(a), raiz(b));
  const porRaiz = new Map();
  for (const x of contatos.partes) porRaiz.set(raiz(x), [...(porRaiz.get(raiz(x)) ?? []), x]);
  const grupos = [...porRaiz.values()].sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
  const declaradas = Array.isArray(receita.ilhas) ? receita.ilhas : [];
  const problemas = [];
  if (receita.ilhas !== undefined && !Array.isArray(receita.ilhas)) problemas.push('`ilhas` precisa ser uma lista de { contem, motivo }.');
  const cobertos = new Set();
  for (const d of declaradas) {
    const grupo = grupos.findIndex((g) => g.includes(d?.contem));
    if (typeof d?.motivo !== 'string' || d.motivo.trim() === '') problemas.push(`a ilha declarada por '${d?.contem}' não diz o motivo.`);
    if (grupo < 0) problemas.push(`a ilha declarada por '${d?.contem}' cita parte que a peça não tem.`);
    else if (grupos.length === 1) problemas.push(`a ilha declarada por '${d?.contem}' não está solta: todas as partes se ligam.`);
    else cobertos.add(grupo);
  }
  const soltos = grupos.map((g, i) => i).filter((i) => !cobertos.has(i));
  if (grupos.length > 1 && soltos.length === 0) problemas.push('todas as ilhas foram declaradas, e nenhum grupo ficou como a peça: tire a declaração do grupo principal.');
  for (const i of soltos.slice(1)) {
    const g = grupos[i];
    problemas.push(`${g.length === 1 ? `a parte ${g[0]} não toca` : `o grupo ${g.join(', ')} não toca`} nenhuma parte de ${grupos[soltos[0]].slice(0, 3).join(', ')}${grupos[soltos[0]].length > 3 ? '…' : ''};`
      + ' encoste as partes, ou declare a ilha em `ilhas` da receita com { contem: <uma parte dela>, motivo }.');
  }
  return { grupos, problemas };
}

/* AS RÉGUAS DE MALHA, COMO AVISO. A face degenerada (que o `adaptarThree` recusa), o triângulo fino e longo numa região plana e o serrilhado da linha de uma
   costura de `arredondarCostura` lêem só o estado neutro (`tools/modelar/reguas-de-malha/`). Achar algo não reprova: a pessoa decide o limiar, e a `guarda:acervo` é
   que recusa a face degenerada. Devolve os números das três (`reguasDeMalha` do resultado) e as linhas do aviso, vazias quando nenhuma acha nada. A face degenerada
   sai com a parte e a posição em mm (o centro dos cantos); as outras duas só dizem quantas, porque as réguas não guardam onde. */
const REGUAS_LISTADAS = 8;
/* O triângulo fino triangula a peça inteira pelo adaptador e agrupa as regiões planas: no furgão (254 mil faces) levou 12,7 s, dos quais 8,2 do adaptador e 3,3 das
   regiões, uns 50 µs por face, e o `guarda:tempo` não tem essa folga. Acima deste número de faces a régua não roda, e `trianguloFinoPulado` diz quantas faces a peça tem. */
export const FACES_MAXIMAS_DO_TRIANGULO_FINO = 50000;

export function avisosDasReguasDeMalha(neutro, { limite = REGUAS_LISTADAS, facesMaximasDoFino = FACES_MAXIMAS_DO_TRIANGULO_FINO } = {}) {
  const degenerada = medirFaceDegenerada(neutro);
  let pulado = neutro.F.size > facesMaximasDoFino ? `a peça tem ${neutro.F.size} faces, acima de ${facesMaximasDoFino}` : null;
  let fino = { finos: 0, regioes: 0, pior: 0 };
  if (!pulado) {
    /* o adaptador recusa a face que não fecha em orelhas, e a régua que o chama não pode derrubar a descrição */
    try { fino = medirTrianguloFino(neutro); } catch (erro) { pulado = `a régua não rodou: ${String(erro.message).split('\n')[0]}`; }
  }
  const serrilhado = medirSerrilhadoDaCostura(neutro);
  const mm = (n) => String(Math.round(n * 10000) / 10).replace('.', ',');
  const onde = (f) => {
    const cantos = (neutro.F.get(f.id)?.vs ?? []).map((v) => neutro.V.get(v)).filter(Boolean);
    const centro = cantos.length ? [0, 1, 2].map((k) => mm(cantos.reduce((a, c) => a + c[k], 0) / cantos.length)).join(', ') : null;
    return `face ${f.id}${f.parte ? ` (parte ${f.parte})` : ''}${centro ? ` em [${centro}] mm` : ''}`;
  };
  const medidas = {
    facesDegeneradas: degenerada.total,
    triangulosFinos: pulado ? null : fino.finos,
    regioesComFinos: pulado ? null : fino.regioes,
    piorRazao: pulado ? null : fino.pior,
    trianguloFinoPulado: pulado,
    facesDeCostura: serrilhado.faces,
    pontasDeSerra: serrilhado.pontas,
    trechosDeSerrilhado: serrilhado.trechos,
    facesDegeneradasListadas: degenerada.faces.map((f) => ({ id: f.id, parte: f.parte, cantos: f.cantos })),
  };
  const linhas = [];
  if (degenerada.total) {
    const lista = degenerada.faces.slice(0, limite).map(onde).join('; ');
    linhas.push(`${degenerada.total} face(s) degenerada(s), sem plano definido (o adaptador da bancada as recusa): ${lista}${degenerada.total > limite ? `; e mais ${degenerada.total - limite}` : ''}`);
  }
  if (fino.finos) {
    linhas.push(`${fino.finos} triângulo(s) fino(s) e longo(s) em ${fino.regioes} região(ões) plana(s), o pior com razão ${String(Math.round(fino.pior * 10) / 10).replace('.', ',')}`);
  }
  if (serrilhado.pontas) {
    linhas.push(`${serrilhado.pontas} ponta(s) de serra em ${serrilhado.trechos} trecho(s) da linha da costura do arredondamento (${serrilhado.faces} faces de costura)`);
  }
  return { medidas, linhas };
}

/* A DOBRA E O VINCO QUE NINGUÉM DECLAROU, COMO AVISO. As réguas `dobra-da-superficie` (diedro abaixo de 120 graus fora de vinco declarado) e `vinco-oculto`
   (cadeia de arestas viva que a receita não pediu, e o chanfro que ladeia duas delas) rodam sobre as superfícies de subdivisão da peça já executada. O que
   `PLANO.dobrasAceitas` cobre vem separado, com o motivo; o resto é aviso e não reprova: a pessoa decide o limiar e onde ligá-las a um gate. Devolve o texto ou
   null quando a peça não tem subdivisão ou não há nada a dizer. */
function textoDasReguasDeSuperficie(receita, entrada, neutro, { resumo = true } = {}) {
  const corte = resumo ? 12 : Infinity;
  if (!(entrada.PASSOS ?? []).some((p) => (Array.isArray(p) ? p[0] : p?.op) === 'subdivisao')) return null;
  const executada = { entrada, neutro };
  let dobras; let vincos;
  try {
    dobras = dobraDaReceita(receita, {}, executada);
    vincos = vincoOcultoDaReceita(receita, {}, executada);
  } catch (erro) {
    return `\nDOBRA E VINCO NÃO DECLARADOS: as réguas não rodaram (${erro.message})\n`;
  }
  const abertas = [
    ...dobras.superficies.flatMap((s) => s.dobras.map((d) => textoDaDobra(d))),
    ...vincos.superficies.flatMap((s) => [...s.vincos, ...s.chanfros].map((a) => textoDoAchado(a))),
  ];
  const aceitas = [
    ...dobras.superficies.flatMap((s) => s.aceitas.map((d) => `${textoDaDobra(d)} (aceita: ${d.motivo})`)),
    ...vincos.superficies.flatMap((s) => s.aceitos.map((a) => `${textoDoAchado(a)} (aceito: ${a.motivo})`)),
  ];
  if (!abertas.length && !aceitas.length) return null;
  let texto = '';
  if (abertas.length) {
    const lista = abertas.length > corte ? [...abertas.slice(0, corte), `... e mais ${abertas.length - corte} (\`--completo\` lista todos)`] : abertas;
    texto += `\n${abertas.length} DOBRA(S) E VINCO(S) NÃO DECLARADO(S) (aviso; não reprova)\n${lista.map((t) => `  ${t}`).join('\n')}\n`
      + '  Se a feição é desenho, declare-a em `PLANO.dobrasAceitas` com a parte, a região e o motivo; se não é, a gaiola está errada ali.\n';
  }
  if (aceitas.length) {
    texto += `\n${aceitas.length} DOBRA(S) E VINCO(S) ACEITO(S) PELO PLANO\n${aceitas.slice(0, corte).map((t) => `  ${t}`).join('\n')}${aceitas.length > corte ? `\n  ... e mais ${aceitas.length - corte} (\`--completo\` lista todos)` : ''}\n`;
  }
  return texto;
}

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
  /* `aoProgredir(linha)` recebe, em uma linha, a etapa em que a medida está ao entrar em cada etapa longa, e uma batida a cada `intervaloDoProgressoMs` enquanto os passos
     da receita rodam (a execução é síncrona, então a batida sai entre um passo e o seguinte). A CLI a manda para a saída de erro: a saída padrão não muda. */
  aoProgredir = null,
  intervaloDoProgressoMs = 15000,
} = {}) {
  const inicio = performance.now();
  let ultimaLinha = inicio;
  const progresso = (linha) => {
    if (!aoProgredir) return;
    ultimaLinha = performance.now();
    aoProgredir(`descrever: ${linha}, ${Math.round((ultimaLinha - inicio) / 1000)} s desde o começo`);
  };
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
    progresso(`carregando a receita de '${peca}'`);
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

  /* AS REFERÊNCIAS DO PLANO EXISTEM, ANTES DE EXECUTAR. O `alvo.md` ausente só aparecia na `vistas:critica`, depois de a forma estar
     pronta. O plano inválido segue para a mensagem própria dele mais abaixo, e a receita entregue já carregada não tem pasta para
     resolver caminho relativo, então só a lida do disco é conferida. */
  /* O PLANO INVÁLIDO TAMBÉM, ANTES DE EXECUTAR. O campo de texto acima de 240 caracteres só era recusado depois de a receita rodar,
     e no furgão realista isso custava 3 minutos por tentativa (2026-11-09); a mesma mensagem de mais abaixo sai agora antes. */
  if (!semVeredito && receita.PLANO !== undefined) {
    try { normalizarPlanoDeModelagem(receita.PLANO); } catch (erro) { return falha(`PLANO DE MODELAGEM INVÁLIDO\n  ${erro.message}`); }
  }
  if (!semVeredito && caminhoReceita) {
    let planoDeReferencias = null;
    try { planoDeReferencias = normalizarPlanoDeModelagem(receita.PLANO); } catch { planoDeReferencias = null; }
    const { ausentes, locaisAusentes } = referenciasDoPlano(planoDeReferencias, { pastaDaReceita: dirname(caminhoReceita) });
    avisarReferenciasLocaisAusentes(locaisAusentes);
    if (ausentes.length) return falha(`REFERÊNCIA DO PLANO AUSENTE\n  ${peca}: ${mensagemDeReferenciasAusentes(ausentes)}`);
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
  const tempos = new Map();
  const totalDePassos = Array.isArray(receita.PASSOS) ? receita.PASSOS.length : null;
  progresso(`executando a receita${totalDePassos == null ? '' : ` (${totalDePassos} passos)`}`);
  const cronometro = registroCronometrado(execucao.registroOperacoes ?? REGISTRO_OPERACOES, {
    total: totalDePassos, tempos,
    aoPasso: (i, total, op) => {
      if (aoProgredir && intervaloDoProgressoMs > 0 && performance.now() - ultimaLinha >= intervaloDoProgressoMs) {
        /* a batida chega quando o passo `i` fecha, isto é, quando o seguinte começa */
        if (total == null || i + 1 < total) progresso(`ainda executando a receita, no passo ${i + 1}${total == null ? '' : ` de ${total}`}, depois de ${op}`);
      }
    },
  });
  execucao = { ...execucao, registroOperacoes: cronometro.registro };
  try {
    ({ entrada, neutro, expansao } = executarReceita(receita, execucao));
    cronometro.fechar(entrada?.PASSOS);
  } catch (erro) {
    return falha(`O NÚCLEO RECUSOU A PEÇA\n  ${peca}: ${erro.message}`);
  }
  /* Depois da execução, toda recusa de etapa seguinte carrega os órfãos: uma etapa que quebra por parte ausente (o contorno por parte, os vãos, os contatos)
     dizia só que a peça não tinha a parte, e a causa, o passo recusado antes, ficava calada. */
  const falhaDepois = (mensagem) => falha(neutro.orfaos.length
    ? `${mensagem}\n\n${neutro.orfaos.length} ÓRFÃO(S), que costumam ser a causa:\n  ${linhasDeOrfaos(neutro).join('\n  ')}`
    : mensagem);

  /* Uma memória por execução: o sólido de cada parte e a auditoria de cada par, feitos por `medirPeca` e reaproveitados por `contatosDaPeca`. */
  const memoria = criarMemoriaDeAuditoria(neutro);
  progresso('medindo as partes');
  let descricao;
  let consultaDeSubarvore = null;
  try {
    if (subarvore === null) {
      descricao = medirPeca(neutro, { partes: partesLidas.length ? partesLidas : null, memoria });
    } else {
      const raiz = subarvore.trim();
      const daRaiz = medirPeca(neutro, { partes: [raiz], memoria });
      const nomes = nomesDaSubarvore(daRaiz.hierarquia, raiz);
      descricao = medirPeca(neutro, { partes: nomes, memoria });
      consultaDeSubarvore = { raiz, nomes };
    }
  } catch (erro) {
    /* a medida que quebra por parte que não existe costuma ter a causa num passo recusado antes, que só os órfãos dizem; `falhaDepois` os junta */
    return falhaDepois(`NÃO CONSEGUI MEDIR\n  ${erro.message}`);
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
      + `  bancada: http://localhost:5173/nos-modelar/bancada.html?${params} (npm run dev)\n\n`;
  }
  stdout += formatarDescricao(descricao, { peca, casas, resumo });

  let stderr = '';
  let falhou = false;
  const chapaInteira = avisosDaChapaInteira(neutro, tempos);
  if (chapaInteira.length) {
    stdout += `\n${chapaInteira.length} ABERTURA(S) NA BOOLEANA DA CHAPA INTEIRA (aviso; não reprova)\n${chapaInteira.map((t) => `  ${t}`).join('\n')}\n`
      + '  O recorte da vizinhança do vão não valeu, e a booleana refez a chapa toda: o tempo da receita cresce com o tamanho dela.\n';
    stderr += `\nAVISO: ${chapaInteira.length} abertura(s) na booleana da chapa inteira; o motivo e o tempo de cada uma estão na seção ABERTURA(S) NA BOOLEANA DA CHAPA INTEIRA acima\n`;
  }
  /* as réguas de malha rodam sobre a peça já executada, depois da medida das partes: o que acham é aviso e não reprova */
  progresso('rodando as réguas de malha');
  /* a receita exporta `COMPOSICOES` (e `FUROS_PASSANTES`): o que as operações de composição que ela usou têm a dizer, e a conferência delas, é aviso e não reprova */
  const deComposicao = avisosDasComposicoes(neutro, receita);
  if (deComposicao.total) {
    stdout += `\n${deComposicao.total} AVISO(S) DE OPERAÇÃO DE COMPOSIÇÃO (aviso; não reprova)\n${deComposicao.linhas.map((t) => `  ${t}`).join('\n')}\n`;
    stderr += `\nAVISO: ${deComposicao.total} aviso(s) de operação de composição; o texto está na seção AVISO(S) DE OPERAÇÃO DE COMPOSIÇÃO acima\n`;
  }
  const malha = avisosDasReguasDeMalha(neutro);
  if (malha.linhas.length) {
    stdout += `\n${malha.linhas.length} RÉGUA(S) DE MALHA COM ACHADO (aviso; não reprova)\n${malha.linhas.map((t) => `  ${t}`).join('\n')}\n`
      + '  Defeito de malha da operação que fez a costura ou o furo, e não da receita: a correção vai para a operação.\n';
    stderr += `\nAVISO: ${malha.linhas.length} régua(s) de malha com achado; o número e onde olhar estão na seção RÉGUA(S) DE MALHA COM ACHADO acima\n`;
  }
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
  let molduras = null;
  let formas = null;
  let plano = null;
  let avisoDaLataria = null;
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
      return falhaDepois(`PLANO DE MODELAGEM INVÁLIDO\n  ${erro.message}`);
    }
    /* A DISPENSA DAS VISTAS DE SUPERFÍCIE APARECE. `PLANO.lataria: { dispensa }` tira a peça da luz rasante e da curvatura da
       lataria no pacote do crítico; sem aparecer aqui, ficava só na receita, onde ninguém a relê. É aviso e não reprova. */
    avisoDaLataria = avisoDaDispensa(plano);
    if (avisoDaLataria) {
      stdout += `\nLATARIA DISPENSADA\n  ${avisoDaLataria}\n`;
      stderr += `\nAVISO: ${avisoDaLataria}\n`;
    }
    progresso('rodando as réguas de dobra e vinco');
    const textoDasReguas = textoDasReguasDeSuperficie(receita, entrada, neutro, { resumo });
    if (textoDasReguas) {
      stdout += textoDasReguas;
      stderr += `\nAVISO: ${textoDasReguas.trim().split('\n')[0]}\n`;
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
      return falhaDepois(`REFINAMENTO DA FORMA GLOBAL INVÁLIDO\n  ${erro.message}`);
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
      return falhaDepois(`FORMA CONTRA O ESBOÇO INVÁLIDA\n  ${erro.message}`);
    }
    if (formaDoEsboco && !formaDoEsboco.ok) {
      stderr += `\n${formaDoEsboco.achados.length} ACHADO(S) NA FORMA CONTRA O ESBOÇO '${formaDoEsboco.arquivo}'\n`
        + formaDoEsboco.achados.map((a) => `    ${a.mensagem}`).join('\n')
        + '\n  A parte diverge do sólido da forma do esboço que ela refina (razão interseção/união de volume): ou a receita saiu da forma,'
        + '\n  ou o esboço precisa mudar antes, ou a parte se afasta dele de propósito e precisa declarar o deslocamento e o motivo em REFINA.esboco.formas,'
        + '\n  ou o mínimo declarado em REFINA.esboco não é o que a parte pode cumprir.\n';
      falhou = true;
    }
    progresso('medindo os contatos entre as partes');
    try {
      contatos = contatosDaPeca(neutro, receita, { memoria });
    } catch (erro) {
      return falhaDepois(`NÃO CONSEGUI MEDIR OS CONTATOS\n  ${erro.message}`);
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
    if (contatos.atravessados.length) {
      const unidade = (v) => (v >= 1e-3 ? v.toFixed(4) : v.toExponential(2));
      stderr += `\n${contatos.atravessados.length} CONTATO(S) DECLARADO(S) EM QUE UMA PARTE ATRAVESSA A OUTRA`
        + '\n  O par está declarado, mas uma parte entra na outra além do limite (profundidade medida triângulo contra triângulo, e não pela caixa):\n'
        + contatos.atravessados
          .map(({ par, penetracao: p }) => `    ${par[0]} ↔ ${par[1]}: entra ${unidade(p.profundidade)} contra o limite de ${unidade(p.limite)}${p.limiteDeclarado ? ' (penetracaoMaxima declarada)' : ' (padrão: 0,5% da diagonal da menor parte)'}; cruzamento de ${unidade(p.comprimento)} de comprimento`)
          .join('\n')
        + '\n  Se a parte deve só encostar, a geometria está errada (a alça, o pino ou o tubo passa da face). Se ela entra de propósito (puxador cravado na porta),'
        + '\n  declare `penetracaoMaxima` no contato, na unidade da peça, com o motivo dizendo quanto entra e por quê.\n';
      falhou = true;
    }
    /* PARTE SOLTA. Contato não declarado e declarado que não acontece só olham
       pares que se tocam; um grupo de partes que não toca nenhuma das outras
       passava limpo, flutuando no ar. Os grupos saem dos pares em contato e dos
       que a medida não decidiu, e todo grupo fora do maior precisa estar em
       `ilhas` da receita, por uma parte dele e com o motivo, como a asa direita
       que só se liga à esquerda pela fuselagem da montagem. Reprova a peça do
       acervo (`procedural/pecas/`) e aparece como aviso na receita de ensaio,
       que tem parte solta de propósito. */
    const ilhasReprovam = Boolean(caminhoReceita) && relative(join(REPO, 'procedural/pecas'), caminhoReceita).split(/[\\/]/)[0] !== '..';
    const ilhas = ilhasDaPeca(contatos, receita);
    if (ilhas.problemas.length) {
      const texto = `\n${ilhas.problemas.length} PARTE(S) OU GRUPO(S) SOLTO(S)${ilhasReprovam ? '' : ' (aviso; a guarda do acervo reprova)'}\n${ilhas.problemas.map((t) => `  ${t}`).join('\n')}\n`;
      if (ilhasReprovam) { stderr += texto; falhou = true; } else stdout += texto;
    }
    /* MOLDURA EM VOLTA DO VÃO. Toda abertura de uma chapa (a volta de borda livre que anda ao contrário da chapa em volta, achada pela
       geometria da gaiola) precisa estar declarada em `vaos` da receita, com os frisos que a contornam ou com `semMoldura: { motivo }`, e a
       peça que esquece a declaração reprova. Os frisos de um vão precisam cobrir a borda inteira, e as emendas entre eles levam o mesmo
       perfil: o trecho sem moldura, o degrau na emenda e o entalhe no canto reprovam, e a aba parcial de propósito passa só com
       `parcial: { motivo }`. Peça sem chapa e sem `vaos` não ganha seção. A medida é sobre a pegada dos frisos na chapa, em
       `src/autoria/molduras-do-vao.js`, e roda no `descrever` e por ele na `guarda:acervo`. */
    progresso('conferindo os vãos e as molduras');
    try {
      molduras = conferirVaosDaPeca(neutro, receita);
    } catch (erro) {
      return falhaDepois(`NÃO CONSEGUI CONFERIR OS VÃOS\n  ${erro.message}`);
    }
    if (molduras.declarados || molduras.aberturas.length) {
      stdout += formatarVaos(molduras, { resumo });
      if (!molduras.ok) {
        stderr += `\n${molduras.problemas.length} PROBLEMA(S) NA MOLDURA EM VOLTA DO VÃO\n${molduras.problemas.map((t) => `  ${t}`).join('\n')}\n`;
        falhou = true;
      }
    }

    /* FORMA PROMETIDA CONTRA ENTREGUE. Existe porque contato não basta: se o
       pneu sai maciço e aro, cubo e raios não chegam a ser modelados, não há
       segunda parte para acusar contato — a peça é um disco sólido e passa
       limpa. Mesma falha, forma mais simples, invisível para a medida acima. */
    progresso('conferindo as formas prometidas');
    try {
      formas = formasDaPeca(neutro, receita);
    } catch (erro) {
      return falhaDepois(`NÃO CONSEGUI CONFERIR AS FORMAS\n  ${erro.message}`);
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
          .map(({ par, motivo, fechaComTolerancia, distancia, maisLongeQue, toleranciaDoPar }) => `    ${par[0]} ↔ ${par[1]}: ${motivo}`
            + (distancia !== undefined ? `\n      as malhas ficam a ${(distancia * 1000).toFixed(6).replace('.', ',')} mm uma da outra (a tolerância de encosto é ${String(Number((toleranciaDoPar * 1000).toPrecision(6))).replace('.', ',')} mm).` : maisLongeQue !== undefined ? `\n      as malhas ficam a mais de ${(maisLongeQue * 1000).toFixed(1).replace('.', ',')} mm uma da outra.` : '')
            + (fechaComTolerancia === undefined ? '' : `\n      fecharia com tolerância de ${fechaComTolerancia}: o vão é menor que isso, do tamanho da grade de 1e-8 do perfil (\`GRADE\` de perfil2d.js), e não uma folga de forma.`))
          .join('\n')
        + '\n  Ou a geometria não chegou onde deveria, ou a declaração está errada.\n'
        + (contatos.declaradosSemContato.some((d) => d.fechaComTolerancia !== undefined)
          ? '  Se o par encosta de verdade (por exemplo, vidro sobre plano inclinado, onde o vértice novo volta a nanômetros do plano), declare `toleranciaNumerica` (de 1e-9 a 1e-6) no contato, com o motivo.\n'
          : '');
      falhou = true;
    }
    /* A tolerância de contato que a medida usou: a global, e a de cada contato que pediu a sua. Só aparece quando algum contato pede, para a saída das peças sem
       tolerância própria continuar a mesma. */
    const comToleranciaPropria = contatos.paresEmContato.filter((p) => p.toleranciaNumerica !== undefined)
      .concat(contatos.declaradosSemContato.filter((p) => p.toleranciaNumerica !== undefined));
    if (comToleranciaPropria.length) {
      stdout += `\nTOLERÂNCIA DE CONTATO — global ${contatos.toleranciaNumerica}; ${comToleranciaPropria.length} contato(s) declarado(s) com tolerância própria\n`
        + comToleranciaPropria.map(({ par, toleranciaNumerica, motivo }) => `  ${par[0]} ↔ ${par[1]}: ${toleranciaNumerica} — ${motivo}`).join('\n')
        + '\n';
    }

    if (contatos.cobertura.inconclusivos.length) {
      /* Antes da contagem, a causa mais comum: a parte de casca aberta (um loft sem polo, por exemplo), com as arestas soltas, e a ligação de cada par à parte. */
      const abertas = partesComCascaAberta(neutro);
      const nomesAbertos = new Set(abertas.map((a) => a.parte));
      if (abertas.length) {
        stderr += abertas.map(({ parte, arestas }) => `\nparte ${parte} tem casca aberta (${arestas} arestas soltas)`).join('')
          + '\n  a malha aberta impede a medida de decidir contato com ela; feche a parte (por exemplo, polo nas pontas do loft).\n';
      }
      /* Não reprova: malha aberta é estilo que o motor aceita, e reprovar aqui
         puniria peça legítima. Mas também não vira "livre" — a medida diz que
         não conseguiu decidir, em vez de inventar garantia. */
      stderr += `\n${contatos.cobertura.inconclusivos.length} par(es) que a medida NÃO conseguiu decidir`
        + ' — malha aberta ou não-manifold; não são pares livres.\n'
        + contatos.cobertura.inconclusivos
          .map(({ par }) => { const abertos = par.filter((p) => nomesAbertos.has(p)); return abertos.length ? `  ${par[0]} ↔ ${par[1]}: parte ${abertos.join(' e ')} com casca aberta\n` : null; })
          .filter(Boolean).join('');
    }

    /* A FORMA CONTRA A REFERÊNCIA, DEPOIS DE TUDO O QUE JÁ RODA. Contato, plano e refinamento dizem que as partes existem e se
       encaixam; nenhum diz que a forma é a pedida. Cada item abaixo mede a malha contra uma referência que existe no
       repositório (o alvo N2, o contorno por parte, a razão declarada) com os limiares que cada um já tem, e um item sem
       referência diz "não conferido: sem referência" em vez de passar calado: não aprova e não barra. */
    let caminhoDaPeca = caminhoReceita;
    if (!caminhoDaPeca) { try { caminhoDaPeca = resolverCaminhoReceita(peca, { raiz: REPO }); } catch { caminhoDaPeca = null; } }

    progresso('conferindo a malha contra a referência');
    try {
      g01 = conferirG01DaReceita({ receita, neutro, caminhoDaReceita: caminhoDaPeca });
    } catch (erro) {
      return falhaDepois(`G01 DA PEÇA INVÁLIDO\n  ${erro.message}`);
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
          return falhaDepois(`CONTORNO POR PARTE INVÁLIDO\n  ${erro.message}`);
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
      return falhaDepois(`RAZÕES DECLARADAS INVÁLIDAS\n  ${erro.message}`);
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
      /* a parte que a receita põe fora do esboço de propósito (deslocamento ou alongamento declarado) diz o quanto e por quê */
      for (const medida of formaDoEsboco.partes) {
        const texto = textoDoAfastamento(afastamentoDaParte(medida));
        if (texto) linhasDeReferencia.push(`parte afastada do esboço de propósito: ${medida.parte} ${texto}`);
      }
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
      reguasDeMalha: malha.medidas,
      avisosDeComposicao: deComposicao.linhas,
      contatos,
      molduras,
      formas,
      plano,
      avisoDaLataria,
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

const AJUDA = `npm run descrever -- <peça> [opções]  (node tools/modelar/descrever-peca.mjs)
Mede a peça pela malha e dá o veredito de contato, forma prometida e vãos. A saída padrão é o resumo.

  --partes=<a,b>         só essas partes, com as relações entre elas
  --subarvore=<raiz>     a parte e tudo que tem ela como pai
  --completo             as tabelas inteiras: caixa por eixo, todas as relações, a hierarquia e a legenda
  --casas=<0..12>        casas decimais (padrão 6)
  --listar               lista as peças
  --sem-veredito         mede sem conferir contato e forma (a saída avisa)
  --composicoes=<módulo> registro de composições a usar

Para conferir um encaixe, peça as duas partes: --partes=a,b. O resumo já traz todo contato e as folgas menores.
`;

function comoCLI(argv, { aoProgredir = null } = {}) {
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['partes', 'subarvore', 'casas', OPCAO_COMPOSICOES],
      bandeiras: ['listar', 'estrito', 'completo', 'sem-veredito', 'ajuda'],
      posicional: { nome: 'a peça', obrigatorio: false },
    });
  } catch (erro) {
    return erroDeUso(erro.message);
  }
  if (lido.bandeira('ajuda')) return { codigo: 0, stdout: AJUDA, stderr: '', resultado: null };
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
    aoProgredir,
  });
}

const executadoComoCLI = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const fechar = iniciarRegistro('descrever', process.argv[2]);
  /* o progresso vai para a saída de erro, uma linha por etapa longa: a saída padrão, que há quem leia por programa, não muda */
  const resultado = await comoCLI(process.argv.slice(2), { aoProgredir: (linha) => process.stderr.write(`${linha}\n`) });
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
