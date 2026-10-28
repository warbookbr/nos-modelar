/* nome-antigo.mjs — o nome antigo do projeto não aparece em arquivo rastreado, fora das exceções declaradas.
 *
 * O projeto passou de Mecanifica a Modelar (plano `2026-10-25-renomear-para-modelar`). A troca de texto e de caminho foi feita
 * por script, e o risco que sobrou é o nome antigo voltar por um comando dentro de uma skill, de uma mensagem de erro ou de
 * um arquivo copiado de um ramo velho, que nenhum outro gate lê. Esta régua lê todo arquivo de texto que o git rastreia, em
 * qualquer caixa (`Mecanifica`, `mecanifica`, `MECANIFICA_*`), e reprova cada ocorrência que nenhuma exceção cobre, dizendo o
 * arquivo, a linha e como resolver. O nome também reprova no CAMINHO de um arquivo.
 *
 * AS EXCEÇÕES SÃO DECLARADAS, COM O MOTIVO. Há dois tipos. A exceção por caminho dispensa o arquivo ou a pasta inteira, para o
 * que guarda o nome de propósito (histórico, planos encerrados, banco de provas, o aviso de leitura). A exceção por texto
 * cobre só o trecho que o padrão casa, em qualquer arquivo ou só nos que `em` indica, e `dentroDe` limita ainda mais a um
 * bloco (da linha que casa `abre` até a próxima linha que casa `fecha`). Uma ocorrência é recusada se algum pedaço do nome
 * antigo fica fora de todas as exceções; por isso `MECANIFICA_<NOME>` não é exceção em lugar nenhum, a não ser onde a
 * leitura do nome antigo é o propósito: `tools/ambiente.mjs`, o `do_ambiente` de `tools/blender/comum.py` e o passo do
 * `ci.yml` que aceita o segredo antigo.
 *
 * Os identificadores de formato salvos (`mecanifica.peca-resolvida@1`), os endereços `mecanifica://` do servidor MCP e as
 * globais `window.__mecanifica*` são exceções declaradas porque mudá-los quebra o que já está gravado e quem o lê; a lista
 * `RENOMEAR_DEPOIS`, ao fim, diz quais seriam renomeáveis por um plano próprio. Uma exceção que não casa mais nada é
 * recusada também (`excecoesSemUso`), para a lista não virar passe livre. O teste ao lado confere tudo isso num repositório de
 * ensaio, e não no real. */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const NOME = /mecanifica/gi;

/* Exceção por caminho: `caminho` casa o caminho relativo (com `/`) do arquivo, que fica dispensado por inteiro. */
export const EXCECOES_POR_CAMINHO = [
  { categoria: 'histórico', caminho: /^docs\/modelar\/historico\//, motivo: 'o histórico guarda o texto da época, com o nome da época; reescrevê-lo seria falsificar o registro' },
  { categoria: 'histórico', caminho: /^docs\/modelar\/planos\/(?:encerrados|concluidos|congelados)\//, motivo: 'planos encerrados, concluídos ou congelados guardam evidência com hash e já não governam trabalho novo' },
  { categoria: 'histórico', caminho: /^docs\/modelar\/banco-de-provas\//, motivo: 'o banco de provas guarda rodadas medidas, com caminhos absolutos e impressões de hash gravados; mudar o texto invalida a prova' },
  { categoria: 'plano ativo', caminho: /^docs\/modelar\/planos\/2026-10-25-renomear-para-modelar\.md$/, motivo: 'o plano da renomeação descreve o nome antigo para explicar a troca; sai desta lista quando o plano for movido para encerrados' },
  { categoria: 'aviso de leitura', caminho: /^tools\/ambiente\.(?:mjs|test\.mjs)$/, motivo: 'lê a variável MECANIFICA_* de propósito, com aviso, para o CI e o ambiente da pessoa mudarem sem quebrar' },
  { categoria: 'a régua', caminho: /^tools\/arquitetura\/nome-antigo(?:\.test)?\.mjs$/, motivo: 'a régua define o nome antigo para recusá-lo, e o teste dela o escreve em repositório de ensaio' },
  { categoria: 'configuração', caminho: /^\.codex\/config\.toml$/, motivo: 'a configuração do Codex da pessoa registra o servidor MCP pelo nome com que foi instalado; trocá-lo desliga o servidor até a pessoa reinstalar' },
  { categoria: 'agente travado por hash', caminho: /^\.claude\/agents\/critico-visual\.md$/, motivo: 'a definição do agente crítico é presa por hash na calibração (calibracao:check); mudá-la exige medir de novo o conjunto de doze imagens' },
  { categoria: 'derivado', caminho: /^docs\/MAPA\.md$/, motivo: 'é gerado por `npm run mapa` a partir da primeira linha dos arquivos; a ocorrência nasce no arquivo de origem, onde esta régua a confere' },
];

/* Exceção por texto: `padrao` (com a caixa que o texto tem) cobre só o trecho que casa. `em` limita a caminhos, `dentroDe` a um bloco. */
export const EXCECOES_POR_TEXTO = [
  { categoria: 'identificador de formato', padrao: /(?<![\w-])mecanifica\\?\.(?:[a-z][\w.@-]*|\*)/, motivo: 'id de formato, de operação ou de esquema gravado em arquivo salvo (mecanifica.peca-resolvida, mecanifica.malha@1...); mudar quebra o que já está gravado e o produto que lê' },
  { categoria: 'cabeçalho de OBJ e MTL', padrao: /# Mecanifica (?:MTL|Wavefront OBJ Exporter)(?![\w-])/, motivo: 'cabeçalho que o exportador grava nos arquivos OBJ e MTL, marca do formato salvo como os ids mecanifica.*; o teste de hash do exportador o confere' },
  { categoria: 'URI do servidor MCP', padrao: /(?<![\w-])mecanifica:\\?\/\\?\/[\w./{}\\-]*/, motivo: 'endereço de recurso do servidor MCP, usado por agentes e skills já configurados' },
  { categoria: 'global da janela', padrao: /__mecanifica[A-Z]\w*/, motivo: 'global que a bancada expõe em window e que os guardas, o MCP e as capturas leem (__mecanificaSessao, __mecanificaBancada, __mecanificaVisorMontagem)' },
  { categoria: 'banco local do navegador', padrao: /(?<![\w-])mecanifica-bancada(?![\w-])/, motivo: 'nome do banco IndexedDB que guarda as imagens de referência da pessoa; renomear apaga o que ela já guardou' },
  { categoria: 'pasta local da chave', padrao: /~\/\.config\/mecanifica(?![\w-])/, motivo: 'pasta fora do repositório onde a pessoa guarda a chave da lista de termos; a pessoa a muda, e o aviso de leitura aceita as duas' },
  { categoria: 'caminho absoluto gravado', padrao: /\/home\/user\/nos-mecanifica(?![\w-])/, em: /^procedural\/pecas\//, motivo: 'caminho absoluto da cópia local gravado nas rodadas de peça; é registro do que foi medido' },
  { categoria: 'texto preso por hash', padrao: /mecanifica:termos-proibidos:verificador/, em: /^tools\/arquitetura\/termos-proibidos\.mjs$/, motivo: 'texto fixo cujo HMAC está gravado em termos-proibidos.hashes.json; mudá-lo invalida o verificador da lista, que só se refaz com a chave, fora do repositório' },
  { categoria: 'repositório de outra pessoa', padrao: /brigsd\/nos-mecanifica(?![\w-])/, motivo: 'nome do repositório upstream, que é de outra pessoa e continua com esse nome' },
  { categoria: 'aviso de leitura', padrao: /MECANIFICA_[A-Z0-9_]*/, em: /^tools\/blender\/ambiente\.py$/, motivo: 'o do_ambiente dos scripts Python lê o nome antigo de propósito, com aviso, até o fechamento do plano seguinte ao da renomeação' },
  { categoria: 'prova do aviso', padrao: /MECANIFICA_[A-Z0-9_]*/, em: /^tools\/(?:mcp\/(?:mcp|catalogo-montagens|universo-dependencias)|modelar\/(?:uso|diario)|testes-lentos|arquitetura\/termos-proibidos|blender\/(?:blender|ambiente-python))\.test\.mjs$/, motivo: 'testes que passam o nome antigo de propósito para provar que ele ainda vale com aviso; saem junto com o aviso' },
];

/* O que seria renomeável por um plano próprio, e o que custa. A régua não decide: só registra a recomendação. */
export const RENOMEAR_DEPOIS = [
  { categoria: 'global da janela', recomendacao: 'renomear __mecanificaSessao, __mecanificaBancada e __mecanificaVisorMontagem: só código nosso as lê (bancada, guardas, MCP, capturas), sem dado gravado' },
  { categoria: 'URI do servidor MCP', recomendacao: 'trocar mecanifica:// por modelar://, junto com .codex/config.toml e a skill auditar-montagem, e avisar quem já configurou o servidor' },
  { categoria: 'identificador de formato', recomendacao: 'só vale com migração do que está gravado (pecas-resolvidas, receitas, esboços, rodadas) e dos leitores; a pessoa decidiu mantê-los (decisão 1 do plano)' },
];

const compilar = (padrao) => new RegExp(padrao.source, padrao.flags.includes('g') ? padrao.flags : `${padrao.flags}g`);

/* Os arquivos rastreados que existem no disco, como caminho relativo com `/`. */
export function arquivosRastreados(raiz) {
  const saida = execFileSync('git', ['ls-files', '-z'], { cwd: raiz, maxBuffer: 1 << 28 }).toString('utf8');
  return saida.split('\0').filter((c) => c && existsSync(join(raiz, c)));
}

const ehBinario = (buffer) => buffer.subarray(0, 8000).includes(0);

/* As linhas do texto, cada uma com o bloco `dentroDe` em que está, por exceção: Set dos índices de exceção cujo bloco a contém. */
function blocosAbertos(linhas, excecoes) {
  const abertos = excecoes.map(() => false);
  return linhas.map((linha) => excecoes.map((e, i) => {
    if (!e.dentroDe) return true;
    if (abertos[i] && e.dentroDe.fecha.test(linha)) abertos[i] = false;
    if (!abertos[i] && e.dentroDe.abre.test(linha)) abertos[i] = true;
    return abertos[i];
  }));
}

/* O pedaço da linha em volta da ocorrência, para a recusa mostrar onde está o nome. */
const trechoDa = (linha, em) => {
  const de = Math.max(0, em - 30);
  const ate = Math.min(linha.length, em + 40);
  return `${de > 0 ? '...' : ''}${linha.slice(de, ate).trim()}${ate < linha.length ? '...' : ''}`;
};

/* Varre o repositório. Devolve { recusas, usos }: `recusas` são { arquivo, linha, trecho, onde }, e `usos` conta, por exceção, as
   ocorrências do nome que ela cobre e os arquivos em que estão (a chave é o objeto da exceção). */
export function varrer(raiz = RAIZ, { porCaminho = EXCECOES_POR_CAMINHO, porTexto = EXCECOES_POR_TEXTO } = {}) {
  const recusas = [];
  const usos = new Map([...porCaminho, ...porTexto].map((e) => [e, { ocorrencias: 0, arquivos: new Set() }]));
  const usar = (excecao, arquivo, n) => {
    const uso = usos.get(excecao);
    uso.ocorrencias += n;
    uso.arquivos.add(arquivo);
  };

  for (const arquivo of arquivosRastreados(raiz)) {
    const dispensa = porCaminho.find((e) => e.caminho.test(arquivo));
    if (!dispensa && NOME.test(arquivo)) recusas.push({ arquivo, linha: 0, trecho: arquivo, onde: 'caminho' });
    NOME.lastIndex = 0;

    const buffer = readFileSync(join(raiz, arquivo));
    if (ehBinario(buffer)) continue;
    const linhas = buffer.toString('utf8').split('\n');
    const aplicaveis = porTexto.filter((e) => !e.em || e.em.test(arquivo));
    const blocos = aplicaveis.some((e) => e.dentroDe) ? blocosAbertos(linhas, aplicaveis) : null;

    linhas.forEach((linha, i) => {
      const ocorrencias = [...linha.matchAll(NOME)].map((m) => m.index);
      if (!ocorrencias.length) return;
      if (dispensa) { usar(dispensa, arquivo, ocorrencias.length); return; }
      const cobertas = new Set();
      aplicaveis.forEach((e, k) => {
        if (blocos && !blocos[i][k]) return;
        for (const casou of linha.matchAll(compilar(e.padrao))) {
          const novas = ocorrencias.filter((o) => !cobertas.has(o) && o >= casou.index && o < casou.index + casou[0].length);
          for (const o of novas) cobertas.add(o);
          if (novas.length) usar(e, arquivo, novas.length);
        }
      });
      for (const o of ocorrencias) if (!cobertas.has(o)) recusas.push({ arquivo, linha: i + 1, trecho: trechoDa(linha, o), onde: 'texto' });
    });
  }
  return { recusas, usos };
}

export const COMO_RESOLVER = 'Troque por Modelar (texto), modelar (identificador, pasta, endereço) ou MODELAR_* (variável de ambiente). Se o nome precisa ficar porque é dado gravado ou registro, declare a exceção em EXCECOES_POR_CAMINHO ou EXCECOES_POR_TEXTO de tools/arquitetura/nome-antigo.mjs, com o padrão e o motivo.';

export function mensagemDaRecusa({ arquivo, linha, trecho, onde }) {
  if (onde === 'caminho') return `${arquivo}: o nome do arquivo ou da pasta contém o nome antigo do projeto. Renomeie o caminho e refaça os links que apontam para ele, ou declare a exceção por caminho em tools/arquitetura/nome-antigo.mjs, com o motivo.`;
  return `${arquivo}:${linha}: contém o nome antigo do projeto (${trecho}). ${COMO_RESOLVER}`;
}

/* As exceções que não casam mais nenhuma ocorrência: a coisa que elas cobriam foi renomeada ou removida, e a exceção virou passe livre. */
export function excecoesSemUso(usos) {
  return [...usos].filter(([, uso]) => uso.ocorrencias === 0).map(([e]) => e);
}

export function descreverExcecao(e) {
  const alvo = e.caminho ? `caminho ${e.caminho}` : `texto ${e.padrao}${e.em ? ` em ${e.em}` : ''}${e.dentroDe ? ` dentro de ${e.dentroDe.abre}` : ''}`;
  return `${alvo} (${e.categoria}: ${e.motivo})`;
}

/* As recusas e as exceções sem uso, em mensagens. */
export function verificarNomeAntigo(raiz = RAIZ, opcoes) {
  const { recusas, usos } = varrer(raiz, opcoes);
  return [
    ...recusas.map(mensagemDaRecusa),
    ...excecoesSemUso(usos).map((e) => `exceção sem uso: ${descreverExcecao(e)}. Nada mais casa com ela; remova-a de tools/arquitetura/nome-antigo.mjs para a lista não virar passe livre.`),
  ];
}

/* A contagem por categoria: { categoria: { ocorrencias, arquivos } }, mais as recusas. */
export function contarPorCategoria(usos) {
  const porCategoria = {};
  for (const [e, uso] of usos) {
    const c = porCategoria[e.categoria] ??= { ocorrencias: 0, arquivos: new Set() };
    c.ocorrencias += uso.ocorrencias;
    for (const a of uso.arquivos) c.arquivos.add(a);
  }
  return Object.fromEntries(Object.entries(porCategoria).map(([k, v]) => [k, { ocorrencias: v.ocorrencias, arquivos: v.arquivos.size }]));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { recusas, usos } = varrer();
  const velhas = excecoesSemUso(usos);
  if (process.argv.includes('--contar')) {
    for (const [categoria, { ocorrencias, arquivos }] of Object.entries(contarPorCategoria(usos))) console.log(`${String(ocorrencias).padStart(6)} em ${String(arquivos).padStart(4)} arquivos  ${categoria}`);
    console.log(`${String(recusas.length).padStart(6)} em ${String(new Set(recusas.map((r) => r.arquivo)).size).padStart(4)} arquivos  RECUSADAS`);
    process.exit(0);
  }
  if (!recusas.length && !velhas.length) {
    console.log('nome:check: nenhum arquivo rastreado tem o nome antigo fora das exceções declaradas.');
    process.exit(0);
  }
  for (const r of recusas) console.error(mensagemDaRecusa(r));
  for (const e of velhas) console.error(`exceção sem uso: ${descreverExcecao(e)}. Nada mais casa com ela; remova-a de tools/arquitetura/nome-antigo.mjs.`);
  console.error(`\nnome:check: ${recusas.length} ocorrência(s) recusada(s) em ${new Set(recusas.map((r) => r.arquivo)).size} arquivo(s) e ${velhas.length} exceção(ões) sem uso.`);
  process.exit(1);
}
