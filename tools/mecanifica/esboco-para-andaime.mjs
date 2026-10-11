/* esboco-para-andaime.mjs — o adaptador que liga o esboço ao andaime da forma global N2.
 *
 * Lê o esboço (JSON escrito ou já expandido, ou um arquivo `.esboco.json`), pede ao módulo as formas resolvidas da opção
 * (`formasResolvidas`) e entrega o dado ao tradutor de `src/autoria/tradutor-nivel-zero.js`, que não conhece o módulo. É o único
 * lugar que importa os dois lados, e pode virar comando depois: a função devolve o resultado do tradutor com a opção lida, e
 * `descreverTraducao` dá o texto de uma linha por forma aproximada (com o erro de volume e de envelope medido na blocagem) e
 * uma por forma que ficou sem equivalente. `medidasDoAndaime` lê as medidas do `plano.medidas` na blocagem do andaime traduzido, ao
 * lado da leitura do módulo, e `g01DoEsboco` roda o G01 do andaime contra um alvo N2. */
import { readFileSync } from 'node:fs';
import { formasResolvidas } from '../../modulos/esboco/src/formas-resolvidas.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { comPontosReais, conferirPlano, lerPlano, visiveisDoEsboco } from '../../modulos/esboco/src/plano.js';
import { traduzirFormasParaAndaime } from '../../src/autoria/tradutor-nivel-zero.js';
import { compararLeituras, lerMedidasNaBlocagem, lerMedidasNoDado } from '../../src/autoria/medidas-na-blocagem.js';
import { avaliarG01DoAndaime } from '../../src/autoria/g01-do-andaime.js';

/** O andaime da opção `opcao` (número a partir de 1, ou título) de um esboço já lido. As opções do tradutor (`id`, `objetivo`,
 *  `alvo`, `familia`, `intencao`, `eixos`, `volumesMaximos`, `estrito`) passam como estão. */
export function andaimeDoEsboco(esboco, { opcao = 1, ...opcoes } = {}) {
  const dados = formasResolvidas(esboco, opcao);
  return { ...traduzirFormasParaAndaime(dados, opcoes), opcao: dados.opcao };
}

/** O mesmo, lendo o arquivo do esboço. */
export function andaimeDoArquivo(caminho, opcoes = {}) {
  let esboco;
  try {
    esboco = JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (erro) {
    throw new Error(`não foi possível ler o esboço ${caminho}: ${erro.message}`);
  }
  return andaimeDoEsboco(esboco, opcoes);
}

const porcento = (x) => `${(x * 100).toFixed(3)}%`;

/** O resumo em texto: quantos volumes entraram, por forma aproximada o que se perdeu e o erro medido, e por forma que ficou de
 *  fora o motivo. */
export function descreverTraducao({ andaime, naoTraduzidas, perdas = [], ocultas, opcao }) {
  const linhas = [
    `opção ${opcao.numero}${opcao.titulo ? ` (${opcao.titulo})` : ''}: ${andaime.volumes.length} volumes no andaime ${andaime.id}, ${perdas.length} aproximado(s), ${naoTraduzidas.length} forma(s) sem equivalente, ${ocultas.length} oculta(s) fora do andaime`,
    ...perdas.flatMap((p) => [
      `  aproximado ${p.id} (${p.tipo}, ${p.aproximacao}): volume ${p.erroVolume.relativo >= 0 ? '+' : ''}${porcento(p.erroVolume.relativo)} (${p.erroVolume.mm3} mm3), envelope até ${p.erroEnvelope.mm} mm (${porcento(p.erroEnvelope.relativo)})`,
      ...p.perdido.map((d) => `    perdido (${d.codigo}): ${d.descricao}`),
    ]),
    ...naoTraduzidas.map((n) => `  sem equivalente ${n.id} (${n.tipo}): ${n.motivo}`),
  ];
  return linhas.join('\n');
}

/* As medidas do `plano.medidas` que valem para a opção `dados.opcao`, no formato de `lerPlano`, com os pontos
   `<instancia>.<ancora>` já trocados pelos da forma real (o que `expandirEsboco` guarda em `opcoes[i].medidas`). */
export function medidasDaOpcao(expandido, dados) {
  const indice = dados.opcao.numero - 1;
  const o = expandido.opcoes[indice];
  const titulo = o.titulo ?? `Opção ${indice + 1}`;
  const lido = lerPlano(expandido.plano);
  return (lido?.medidas ?? []).flatMap((m, k) => {
    if (m.opcoes !== undefined && !m.opcoes.some((q) => q === titulo || q === indice + 1)) return [];
    return [comPontosReais(m, o.medidas?.[k])];
  });
}

/* As medidas do plano da opção lidas na blocagem do andaime traduzido, ao lado das duas leituras de comparação: a do módulo
   (`conferirPlano`, a de `--medidas`) e a mesma conta sobre o dado do esboço, com o valor exato. Devolve `{ opcao, traducao,
   naBlocagem, noDado, doEsboco, comparacao }`; `comparacao` (ver `compararLeituras`) diz, por medida, a diferença das duas e se as
   perdas declaradas do tradutor a explicam. As opções do tradutor passam como estão, e `tolerancia_mm` (0,05 mm) é a tolerância de
   concordância. */
export function medidasDoAndaime(esboco, { opcao = 1, tolerancia_mm: tolerancia = 0.05, ...opcoes } = {}) {
  const dados = formasResolvidas(esboco, opcao);
  const traducao = { ...traduzirFormasParaAndaime(dados, opcoes), opcao: dados.opcao };
  const expandido = expandirEsboco(esboco);
  const medidas = medidasDaOpcao(expandido, dados);
  const naBlocagem = lerMedidasNaBlocagem({ dados, traducao, medidas });
  const noDado = lerMedidasNoDado({ dados, medidas });
  const doEsboco = conferirPlano(expandido, visiveisDoEsboco(expandido)).opcoes[dados.opcao.numero - 1].medidas;
  return { opcao: dados.opcao, traducao, naBlocagem, noDado, doEsboco, comparacao: compararLeituras(naBlocagem, noDado, { tolerancia_mm: tolerancia }) };
}

export function medidasDoArquivo(caminho, opcoes = {}) {
  let esboco;
  try {
    esboco = JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (erro) {
    throw new Error(`não foi possível ler o esboço ${caminho}: ${erro.message}`);
  }
  return medidasDoAndaime(esboco, opcoes);
}

/* O G01 do andaime da opção contra um alvo N2. Só roda com o alvo (o contorno de referência vira alvo fora daqui): sem `alvo` devolve
   `{ rodou: false, motivo }` dizendo se o esboço declara `plano.referencia` e o que falta. O andaime sai do tradutor com o `alvo`, o
   `objetivo`, a `familia` e os `eixos` do alvo, e `critica` é a crítica do alvo (G00) quando houver. */
export function g01DoEsboco(esboco, { opcao = 1, alvo = null, critica = null, ...opcoes } = {}) {
  const referencias = lerPlano(esboco?.plano)?.referencia ?? [];
  if (alvo === null) {
    return {
      rodou: false,
      motivo: referencias.length === 0
        ? 'o esboço não declara plano.referencia: não há contorno de referência para fazer o alvo do G01'
        : `o esboço declara plano.referencia (${referencias.map((r) => r.arquivo).join(', ')}), mas o G01 pede o alvo N2 com as silhuetas frontal, direita e superior, e falta o alvo`,
      referencias: referencias.length,
    };
  }
  const dados = formasResolvidas(esboco, opcao);
  const traducao = traduzirFormasParaAndaime(dados, { ...opcoes, alvo: alvo.id, objetivo: alvo.objetivo, familia: alvo.familia, eixos: alvo.eixos });
  return { rodou: true, referencias: referencias.length, opcao: dados.opcao, traducao, g01: avaliarG01DoAndaime({ andaime: traducao.andaime, alvo, critica }) };
}
