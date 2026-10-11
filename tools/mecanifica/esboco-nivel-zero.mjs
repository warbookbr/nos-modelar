/* esboco-nivel-zero.mjs — o adaptador que liga o Condutor do esboço ao nível zero.
 *
 * O Condutor (modulos/esboco/src/condutor.js) não importa o núcleo, e a ligação mora aqui, por injeção: `nivelZeroDoEsboco` é a
 * porta que a linha de comando entrega a `portaoDoEstagio` e a `avancar`. Ela traduz cada opção do esboço para o andaime da
 * forma global N2 (pelo adaptador `esboco-para-andaime.mjs`), lê o `plano.medidas` na blocagem desse andaime e devolve, por
 * opção, o que o Condutor mostra ao esbocista (volumes, formas aproximadas, formas sem equivalente e o texto das perdas).
 *
 * `conferirEnvelopeDaReceita` é o Envelope da unidade quando o detalhe dela é uma receita que declara `REFINA`: o verificador é
 * o do refinamento (`src/autoria/refinamento-global.js`), contra o andaime que o esboço traduz agora, e o resultado volta no
 * formato do Envelope do Condutor. A receita é carregada e executada por `envelopeDaReceitaArquivo`. */
import { resolve } from 'node:path';
import { ErroDeEsboco } from '../../modulos/esboco/src/index.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { formasResolvidas } from '../../modulos/esboco/src/formas-resolvidas.js';
import { planoDeDetalhe, unidadePorNome } from '../../modulos/esboco/src/condutor.js';
import { ErroDoTradutor, traduzirFormasParaAndaime } from '../../src/autoria/tradutor-nivel-zero.js';
import { lerMedidasNaBlocagem } from '../../src/autoria/medidas-na-blocagem.js';
import { conferirRefinamentoGlobal, normalizarRefinamentoGlobal } from '../../src/autoria/refinamento-global.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { descreverTraducao, medidasDaOpcao } from './esboco-para-andaime.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { ErroDeConfiguracao, carregarConfiguracaoDeComposicoes, faltaRegistroDeComposicoes } from './configuracao-composicoes.mjs';

/* A porta do Condutor: `{ opcoes: [{ titulo, volumes, aproximadas, semEquivalente, linhas, medidas, erro? }] }`, na ordem das
   opções do esboço. `medidas` é a leitura na blocagem (`lerMedidasNaBlocagem`); `linhas` são as linhas de perda do tradutor
   (uma por forma aproximada, com o erro de volume e de envelope medido, e uma por forma sem equivalente). Uma opção cujo andaime
   não compila volta com `erro` e sem medidas; a geometria que não resolve já é recusada pelo Condutor ao medir o esboço. */
export function nivelZeroDoEsboco(bruto, opcoesDoTradutor = {}) {
  const expandido = expandirEsboco(bruto);
  const opcoes = (expandido.opcoes ?? []).map((o, i) => {
    const titulo = o.titulo ?? `Opção ${i + 1}`;
    try {
      const dados = formasResolvidas(bruto, i + 1);
      const traducao = { ...traduzirFormasParaAndaime(dados, opcoesDoTradutor), opcao: dados.opcao };
      const leitura = lerMedidasNaBlocagem({ dados, traducao, medidas: medidasDaOpcao(expandido, dados) });
      return {
        titulo, volumes: traducao.andaime.volumes.length, aproximadas: traducao.perdas.length, semEquivalente: traducao.naoTraduzidas.length,
        linhas: descreverTraducao(traducao).split('\n').slice(1), medidas: leitura.medidas,
      };
    } catch (e) {
      if (!(e instanceof ErroDoTradutor) && !(e instanceof ErroDeEsboco)) throw e;
      return { titulo, volumes: 0, aproximadas: 0, semEquivalente: 0, linhas: [], medidas: [], erro: e.message };
    }
  });
  return { opcoes };
}

/* O Envelope da unidade `unidade` conferido pelo verificador do `REFINA` da receita. `receita` é o módulo da receita (com
   `REFINA`) e `neutro` o resultado dela executada. O andaime é o que o esboço traduz agora, na opção do estado do Condutor (a
   primeira sem estado). A receita responde pelas partes que refinam volumes de formas da unidade, e uma que não refina nenhum
   volume dela reprova. Devolve o formato do
   Envelope do Condutor (`unidade`, `ok`, `tolerancia_mm`, `falta`) mais `refina` com o andaime, as partes medidas e as portas. */
export function conferirEnvelopeDaReceita({ bruto, estado, unidade: nomeDaUnidade, receita, neutro }) {
  const refinamento = normalizarRefinamentoGlobal(receita?.REFINA);
  if (!refinamento) throw new ErroDeEsboco('a receita não declara REFINA: o Envelope da unidade só usa o verificador do refinamento quando ela declara');
  const unidades = estado?.unidades?.length ? estado.unidades : planoDeDetalhe(bruto).unidades;
  const id = unidadePorNome(unidades, nomeDaUnidade);
  const u = unidades.find((x) => x.id === id);
  if (!u) throw new ErroDeEsboco(`"${nomeDaUnidade}" não é uma unidade de detalhe (unidades: ${unidades.map((x) => x.id).join(', ')})`);
  const opcoes = expandirEsboco(bruto).opcoes ?? [];
  const k = Math.max(0, opcoes.findIndex((o, i) => (o.titulo ?? `Opção ${i + 1}`) === estado?.opcao));
  const traducao = traduzirFormasParaAndaime(formasResolvidas(bruto, k + 1));
  const daUnidade = new Set(u.membros.map((m) => traducao.tabela[m]).filter(Boolean));
  const r = conferirRefinamentoGlobal({ refinamento, andaime: traducao.andaime, neutro });
  /* a receita pode refinar várias unidades: o Envelope de cada uma responde pelas partes que refinam volumes dela, e pelo que a
     receita errou sem citar volume (parte entregue sem volume, volume que o andaime não tem) */
  const dela = new Set(refinamento.partes.filter(({ volume }) => daUnidade.has(volume)).map(({ parte }) => parte));
  const deOutra = new Set(refinamento.partes.filter(({ volume }) => !daUnidade.has(volume) && traducao.andaime.volumes.some((v) => v.id === volume)).map(({ parte }) => parte));
  const achados = r.achados.filter((a) => !deOutra.has(a.parte) || a.codigo === 'parte-sem-volume');
  const falta = [
    ...achados.map((a) => a.mensagem),
    ...(dela.size === 0 ? [`nenhuma parte da receita declara refinar um volume da unidade ${id} (volumes da unidade no andaime: ${[...daUnidade].join(', ') || 'nenhum'}; REFINA.partes cita ${refinamento.partes.map(({ parte, volume }) => `${parte} -> ${volume}`).join(', ') || 'nada'})`] : []),
  ];
  return {
    unidade: id, ok: falta.length === 0, tolerancia_mm: refinamento.tolerancia.envelope, tolerancia_declarada: true, caixa: {}, portas: [], falta,
    refina: { andaime: r.andaime, partes: r.partes.filter((p) => dela.has(p.parte)), portas: r.portas, achados: achados.map((a) => a.codigo) },
  };
}

/* O mesmo, carregando a receita do disco: executa a receita e confere. A receita que compõe por `CHAMADAS_COMPOSICOES` precisa
   de um registro de composições explícito, entregue por `registroComposicoes` (com `registroOperacoes` e `orcamentoComposicoes`,
   se as composições os usam) ou por `composicoes`, o módulo de configuração que `--composicoes=<módulo>` aponta; sem ele é
   recusada dizendo o que falta. */
export async function envelopeDaReceitaArquivo({ bruto, estado, unidade, caminhoDaReceita, composicoes = null, registroComposicoes = null, registroOperacoes = null, orcamentoComposicoes = null }) {
  const caminho = resolve(caminhoDaReceita);
  let receita;
  try {
    receita = receitaDoModulo(await importarReceita(caminho));
  } catch (e) {
    throw new ErroDeEsboco(`a receita ${caminhoDaReceita} não carregou: ${e.message}`);
  }
  if (!Array.isArray(receita?.PASSOS) && !Array.isArray(receita?.CHAMADAS_COMPOSICOES)) throw new ErroDeEsboco(`a receita ${caminhoDaReceita} não exporta PASSOS nem CHAMADAS_COMPOSICOES`);
  let execucao = { registroComposicoes, registroOperacoes, orcamentoComposicoes };
  if (composicoes !== null) {
    try {
      execucao = { ...execucao, ...await carregarConfiguracaoDeComposicoes(composicoes) };
    } catch (e) {
      if (e instanceof ErroDeConfiguracao) throw new ErroDeEsboco(e.message);
      throw e;
    }
  }
  const falta = faltaRegistroDeComposicoes(receita, execucao.registroComposicoes, `a receita ${caminhoDaReceita}`);
  if (falta) throw new ErroDeEsboco(falta);
  let neutro;
  try {
    ({ neutro } = executarReceita(receita, execucao));
  } catch (e) {
    throw new ErroDeEsboco(`o núcleo recusou a receita ${caminhoDaReceita}: ${e.message}`);
  }
  return conferirEnvelopeDaReceita({ bruto, estado, unidade, receita, neutro });
}
