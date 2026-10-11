/* montagem-da-familia.mjs — a montagem v5 que uma família de objeto gera, conferida pela aprovação mecânica.
 *
 * Uma família que tem `montar(parametros)` (a dobradiça e o cilindro hidráulico) devolve `{ parametros, montagem,
 * receitas, articulacoes, cursoMaximo }`: a montagem v5 com as peças soltas, a receita já fina de cada instância e as
 * articulações declaradas. É o único formato e esta é a única conferência. Ela:
 *
 *   - lê a montagem pelo leitor da montagem persistida (formato v5 válido);
 *   - executa a receita de cada peça (sem órfão) e junta as peças numa montagem resolvida na pose do mundo, na ordem das
 *     etapas, o mesmo que o resolvedor faz para uma montagem de peças com `posicoes` por porta ou sem pose nenhuma (o
 *     resolvedor é assíncrono e a aprovação não é; a posição por porta usa as mesmas funções dele, `poseQueEncaixa` e
 *     `interfaceNoMundo`, e a prova de que as duas resoluções dão o mesmo curso está nos testes das famílias);
 *   - confere o curso de cada articulação com `conferirArticulacao`, sobre as malhas das peças;
 *   - guarda uma impressão da montagem (`hash`: a montagem, as articulações e a geometria de cada peça), que o gate
 *     `familias:check` compara sem repetir o curso, que leva dezenas de segundos por ponto. */
import { neutroCanonico } from '../../procedural/nucleo/entrada.js';
import { sha256Hex } from '../../procedural/nucleo/sha256.js';
import { conferirArticulacao } from '../../src/autoria/conferir-articulacao.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { interfaceNoMundo, poseQueEncaixa } from '../../src/autoria/posicao-por-porta.js';
import { UNIDADES_DE_PARAMETRO } from '../../src/autoria/vinculos-de-medida.js';

const problema = (codigo, mensagem, extra = {}) => ({ codigo, mensagem, ...extra });
const ordenar = (lista) => [...lista].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const IDENTIDADE = { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] };

/* A pose no mundo de cada instância: a identidade, ou a que `posicoes` deriva do encaixe de uma porta da peça numa porta
   de outra já posta (as etapas garantem a ordem). Lança com o motivo quando a porta falta ou o encaixe não se define. */
function posesDaMontagem(montagem, neutros) {
  const poses = new Map();
  const porId = new Map(montagem.instancias.map((instancia) => [instancia.id, instancia]));
  for (const id of montagem.etapas ?? montagem.instancias.map((instancia) => instancia.id)) {
    const posicao = (montagem.posicoes ?? []).find((item) => item.instancia === id);
    if (!posicao) { poses.set(id, IDENTIDADE); continue; }
    const propria = neutros[porId.get(id).alvo.ref].portas.get(posicao.porta);
    const poseDaVizinha = poses.get(posicao.em.instancia);
    const vizinha = poseDaVizinha && neutros[porId.get(posicao.em.instancia).alvo.ref].portas.get(posicao.em.porta);
    if (!propria) throw new Error(`a peça '${id}' não publica a porta '${posicao.porta}'`);
    if (!vizinha) throw new Error(`a peça '${posicao.em.instancia}' não publica a porta '${posicao.em.porta}' ou não vem antes de '${id}' nas etapas`);
    const { pose } = poseQueEncaixa(propria.interface, interfaceNoMundo(vizinha.interface, poseDaVizinha), posicao.afastamento / UNIDADES_DE_PARAMETRO[posicao.unidade]);
    poses.set(id, { rotacao: pose.rotacao.map((linha) => linha.slice()), deslocamento: pose.deslocamento.slice() });
  }
  return poses;
}

/**
 * Gera, lê e junta a montagem da família para `parametros`, sem conferir curso. Devolve `{ problemas, gerada, resolvida,
 * hash, hashesDasPecas }`, com `resolvida` (a montagem na pose do mundo, o que `conferirArticulacao` lê) e `hash` nulos
 * quando a montagem nem chegou a existir. `execucao` é a do registro da família (composições e operações).
 */
export function resolverMontagemDaFamilia(familia, parametros, execucao) {
  const problemas = [];
  let gerada;
  try {
    gerada = familia.montar(parametros);
    lerMontagemPersistida(gerada.montagem);
  } catch (erro) {
    return { problemas: [problema('montagem-invalida', `a montagem v5 que a família gera não é válida: ${erro.message}`)], gerada: null, resolvida: null, hash: null, hashesDasPecas: {} };
  }
  const { montagem, receitas, articulacoes } = gerada;
  if (montagem.instancias.some((instancia) => instancia.pose !== undefined || instancia.alvo?.tipo !== 'peca')) {
    return { problemas: [problema('montagem-nao-conferivel', 'a conferência da aprovação junta peças soltas, na pose do mundo ou por porta; a montagem gerada traz pose ou submontagem')], gerada, resolvida: null, hash: null, hashesDasPecas: {} };
  }
  const neutros = {};
  const hashesDasPecas = {};
  for (const ref of ordenar(Object.keys(receitas))) {
    try {
      const { neutro } = executarReceita(receitas[ref], execucao);
      if (neutro.orfaos.length) problemas.push(problema('peca-com-orfaos', `a peça '${ref}' da montagem deixou ${neutro.orfaos.length} passo(s) sem efeito; o primeiro: ${neutro.orfaos[0].op}: ${neutro.orfaos[0].motivo}`));
      neutros[ref] = neutro;
      hashesDasPecas[ref] = sha256Hex(JSON.stringify(neutroCanonico(neutro)));
    } catch (erro) {
      problemas.push(problema('peca-recusada', `a peça '${ref}' da montagem não executou: ${erro.message}`));
    }
  }
  if (montagem.instancias.some((instancia) => !neutros[instancia.alvo.ref])) return { problemas, gerada, resolvida: null, hash: null, hashesDasPecas };

  let poses;
  try {
    poses = posesDaMontagem(montagem, neutros);
  } catch (erro) {
    return { problemas: [...problemas, problema('posicao-invalida', `a posição por porta da montagem gerada não se define: ${erro.message}`)], gerada, resolvida: null, hash: null, hashesDasPecas };
  }
  const hash = `sha256:${sha256Hex(JSON.stringify({ montagem, articulacoes, pecas: hashesDasPecas }))}`;
  const resolvida = {
    instancias: montagem.instancias.map((instancia) => ({
      id: instancia.id, caminho: [instancia.id], alvo: { tipo: 'peca', ref: instancia.alvo.ref }, definicao: { neutro: neutros[instancia.alvo.ref] }, poseMundo: poses.get(instancia.id),
    })),
    ...(montagem.auditoriaIntersecoes ? { auditoriaIntersecoes: montagem.auditoriaIntersecoes } : {}),
  };
  return { problemas, gerada, resolvida, hash, hashesDasPecas };
}

/**
 * Confere a montagem que a família gera para `parametros`. `execucao` é a do registro da família (composições e
 * operações). Com `conferirCurso` falso só gera, executa e imprime a montagem. Devolve `{ problemas, resumo }`, com
 * `resumo` nulo quando a montagem nem chegou a existir.
 */
export function conferirMontagemDaFamilia(familia, parametros, execucao, { conferirCurso = true } = {}) {
  const { problemas, gerada, resolvida, hash } = resolverMontagemDaFamilia(familia, parametros, execucao);
  if (!resolvida) return { problemas, resumo: null };
  const resumo = { hash, pecas: ordenar(Object.keys(gerada.receitas)), conferido: conferirCurso, articulacoes: [] };
  if (!conferirCurso) return { problemas, resumo };

  for (const declaracao of gerada.articulacoes) {
    let relatorio;
    try {
      relatorio = conferirArticulacao(resolvida, declaracao);
    } catch (erro) {
      problemas.push(problema('articulacao-invalida', `a articulação '${declaracao.id}' não se prende às peças da montagem: ${erro.message}`));
      continue;
    }
    for (const linha of relatorio.recusa) problemas.push(problema('curso-com-colisao', linha));
    resumo.articulacoes.push({
      id: relatorio.articulacao,
      tipo: relatorio.tipo,
      curso: relatorio.curso,
      passos: relatorio.passos,
      posicoes: relatorio.posicoes.length,
      colisoes: relatorio.colisoes.length,
      paresConferidos: relatorio.paresConferidos,
      pares: relatorio.pares.map(({ movel, fixo, estadoMaisGrave }) => ({ movel, fixo, estadoMaisGrave })),
      conferido: relatorio.ok,
    });
  }
  return { problemas, resumo };
}
