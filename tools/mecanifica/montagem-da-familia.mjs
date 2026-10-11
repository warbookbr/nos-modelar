/* montagem-da-familia.mjs — a montagem v5 que uma família de objeto gera, conferida pela aprovação mecânica.
 *
 * Uma família que tem `montar(parametros)` (a dobradiça) devolve `{ montagem, receitas, articulacoes }`: a montagem v5
 * com as peças soltas, a receita já fina de cada instância e as articulações declaradas. Esta conferência:
 *
 *   - lê a montagem pelo leitor da montagem persistida (formato v5 válido);
 *   - executa a receita de cada peça (sem órfão) e junta as peças numa montagem resolvida na pose do mundo, o mesmo que
 *     o resolvedor faz para uma montagem sem `pose` nem `posicoes` (o resolvedor é assíncrono e a aprovação não é, e a
 *     prova de que as duas resoluções dão o mesmo curso está em `procedural/familias/dobradica/dobradica.test.mjs`);
 *   - confere o curso de cada articulação com `conferirArticulacao`, sobre as malhas das peças;
 *   - guarda uma impressão da montagem (`hash`: a montagem, as articulações e a geometria de cada peça), que o gate
 *     `familias:check` compara sem repetir o curso, que leva dezenas de segundos por ponto. */
import { neutroCanonico } from '../../procedural/nucleo/entrada.js';
import { sha256Hex } from '../../procedural/nucleo/sha256.js';
import { conferirArticulacao } from '../../src/autoria/conferir-articulacao.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';

const problema = (codigo, mensagem, extra = {}) => ({ codigo, mensagem, ...extra });
const ordenar = (lista) => [...lista].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/**
 * Confere a montagem que a família gera para `parametros`. `execucao` é a do registro da família (composições e
 * operações). Com `conferirCurso` falso só gera, executa e imprime a montagem. Devolve `{ problemas, resumo }`, com
 * `resumo` nulo quando a montagem nem chegou a existir.
 */
export function conferirMontagemDaFamilia(familia, parametros, execucao, { conferirCurso = true } = {}) {
  const problemas = [];
  let gerada;
  try {
    gerada = familia.montar(parametros);
    lerMontagemPersistida(gerada.montagem);
  } catch (erro) {
    return { problemas: [problema('montagem-invalida', `a montagem v5 que a família gera não é válida: ${erro.message}`)], resumo: null };
  }
  const { montagem, receitas, articulacoes } = gerada;
  if ((montagem.posicoes ?? []).length || montagem.instancias.some((instancia) => instancia.pose !== undefined || instancia.alvo?.tipo !== 'peca')) {
    return { problemas: [problema('montagem-nao-conferivel', 'a conferência da aprovação junta peças na pose do mundo; a montagem gerada traz pose, posição por porta ou submontagem')], resumo: null };
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
  const faltam = montagem.instancias.filter((instancia) => !neutros[instancia.alvo.ref]);
  if (faltam.length) return { problemas, resumo: null };

  const hash = `sha256:${sha256Hex(JSON.stringify({ montagem, articulacoes, pecas: hashesDasPecas }))}`;
  const resumo = { hash, pecas: ordenar(Object.keys(receitas)), conferido: conferirCurso, articulacoes: [] };
  if (!conferirCurso) return { problemas, resumo };

  const resolvida = {
    instancias: montagem.instancias.map((instancia) => ({
      id: instancia.id, caminho: [instancia.id], alvo: { tipo: 'peca', ref: instancia.alvo.ref }, definicao: { neutro: neutros[instancia.alvo.ref] }, poseMundo: null,
    })),
    ...(montagem.auditoriaIntersecoes ? { auditoriaIntersecoes: montagem.auditoriaIntersecoes } : {}),
  };
  for (const declaracao of articulacoes) {
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
