#!/usr/bin/env node
/* dossie-do-objeto.mjs — gera `procedural/pecas/<objeto>/DOSSIE.md` do que já está gravado, sem medir a malha.
 *
 * O dossiê junta num arquivo o que hoje está espalhado: o `PLANO` da receita (objeto, referências, escala, partes e critérios),
 * as operações de cada parte, as rodadas com nota, defeitos e a decisão da pessoa, e os planos cujo território cobre a pasta, com o
 * banco de provas, a tabela de tentativas e os atritos de cada um. Quem retoma o objeto lê um arquivo, e não a pasta de rodadas nem a
 * lista de planos. O gerador não conhece nome de peça nem de operação: lê a receita, as rodadas e os planos como estão.
 *
 * O CUSTO. Os dados saem de arquivos gravados, exceto as operações: importar a receita e ler o `PASSOS` gera a lista de passos, que
 * é a mesma importação que `custo-de-importar-receita.test.mjs` limita (12 s por receita, com a média do acervo em 0,1 s). Nenhuma
 * malha é construída. As operações de cada parte saem do grafo dos passos: parte-se do passo `parte`
 * que nomeia a parte e sobe-se pelas referências `{ op, id }` até as primitivas, e entram os passos que só modificam um sólido
 * (rotaciona, transladar, limparLascas) e os que selecionam o grupo da parte (material, liso). A receita sem `PASSOS` (por família ou
 * composição) só mostra as operações executando, e o dossiê diz isso.
 *
 * FACES E TEMPO. As rodadas registradas desde 2026-11-27 gravam `medidas.faces` (as faces da malha) e `medidas.segundos` (o tempo da
 * guarda da rodada, com o `medidas.cachePorPasso` que diz se o cache estava quente), tirados da execução que a medição da rodada já faz; a tabela das rodadas mostra as duas colunas quando alguma
 * rodada as tem, e as rodadas antigas, que não foram reescritas, ficam com o traço.
 *
 * OS ATRITOS. De cada banco de provas dos planos que cobrem o objeto o dossiê lê o `ATRITOS.md` da pasta dele (se houver) e mostra
 * quantos itens tem e quantos ainda estão sem o campo `Destino:`; o diário antigo, anterior ao campo, sai todo como sem destino.
 *
 * O ÚNICO DOCUMENTO DO OBJETO (2026-11-27). O dossiê também lê o `atrito` e a `notaDePassagem` de cada rodada (condensados), as linhas da tabela
 * de tentativas dos bancos de provas dos planos que cobrem o objeto, e o aceite da pessoa no `ALINHAMENTO.md` da pasta (a fonte dele, que por isso
 * fica); a conferência `--todos --check` recusa também o `.md` escrito à mão na pasta de um objeto além do `DOSSIE.md`, do `ALINHAMENTO.md` e do
 * que está em `referencias/`, e cobra o `DOSSIE.md` em dia de todo objeto que o envio mudou (`objetosMudadosNoEnvio`).
 *
 * A SEÇÃO À MÃO. Entre `<!-- dossie:a-mao:<unidade>:inicio -->` e `<!-- dossie:a-mao:<unidade>:fim -->` mora o texto que um modelo
 * escreve: as escolhas de técnica e o porquê, no modelo fixo do `MODELO_A_MAO`. O gerador o preserva; `--check` recusa o arquivo que perdeu
 * um marcador, o que repete a seção de uma unidade (uma das duas se perderia) e o que tem seção de unidade que não existe mais, e diz
 * qual é.
 *
 *   node tools/modelar/dossie-do-objeto.mjs <objeto>             gera (ou regrava) o DOSSIE.md da pasta do objeto
 *   node tools/modelar/dossie-do-objeto.mjs <objeto> --check     recusa o DOSSIE.md desatualizado ou sem a seção à mão
 *   node tools/modelar/dossie-do-objeto.mjs --todos [--check]    o mesmo para todo DOSSIE.md que existe (o gate `dossie:check`); com --check, também recusa o .md à mão na pasta do objeto e o objeto que o envio mudou sem DOSSIE.md
 *   node tools/modelar/dossie-do-objeto.mjs --ajuda */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { lerDecisoesDaPessoa, lerRodadas } from './leitura-das-rodadas.mjs';
import { bancosDeProvasDe, caminhoQueMudaForma, caminhosDoTerritorio, linhasDeTentativas, tabelaDeTentativasEm } from '../mapa/tentativas-dos-planos.mjs';
import { arquivosMudadosNoEnvio, lerAceites, objetosMudadosNoEnvio } from './aceites-e-envio.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const ARQUIVO = 'DOSSIE.md';
export const PASTA_DAS_PECAS = 'procedural/pecas';
/* A pasta dos documentos do repositório; só a fixture de teste usa outra (`--docs=<pasta>`), para não ter caminho de documento que o gate de links cobra. */
export const DOCUMENTOS = 'docs/modelar';

/* O modelo fixo da seção à mão: o que entra é uma escolha de técnica, o porquê e o que a mostrou. */
export const MODELO_A_MAO = [
  '_Escolhas de técnica e o porquê. Um item por escolha, no modelo `escolha: porquê (a rodada, o plano ou a medida que a mostrou)`. Sem rodada nem medida que a sustente, a frase não entra._',
  '',
  '- a escrever',
].join('\n');

/* A seção fixa da dívida conhecida, também à mão e também preservada: o que a peça ainda não cumpre e foi aceito. */
export const MODELO_DA_DIVIDA = [
  '_Dívida conhecida: o que a peça ainda não cumpre e foi aceito, e por quem. Um item por dívida, no modelo `defeito: por que ficou (a rodada, a decisão da pessoa ou a medida que o mostra)`. Sem dívida, escreva "nenhuma"._',
  '',
  '- a escrever',
].join('\n');

/* As seções à mão de uma unidade: a das escolhas de técnica (o id da unidade) e a da dívida conhecida (o id com `.divida`, que nome de parte não tem). */
const idDaDivida = (id) => `${id}.divida`;
const idsDeSecoes = (unidades) => unidades.flatMap((u) => [u.id, idDaDivida(u.id)]);

const AJUDA = `dossie-do-objeto: gera o DOSSIE.md de um objeto do acervo, do que já está gravado.

  npm run dossie -- <objeto>            gera ou regrava procedural/pecas/<objeto>/DOSSIE.md
  npm run dossie -- <objeto> --check    recusa o DOSSIE.md desatualizado ou que perdeu a seção à mão (sai com 1)
  npm run dossie -- --todos [--check]   o mesmo para todo DOSSIE.md que existe em procedural/pecas (o gate dossie:check usa --check, que também
                                        recusa .md escrito à mão na pasta do objeto e o objeto que o envio mudou sem DOSSIE.md)
  --raiz=<pasta>, --docs=<pasta>        a raiz do repositório e a pasta dos documentos dentro dela, docs/modelar (só para teste com fixture)
  --ajuda                               esta mensagem

<objeto> é o nome da pasta em procedural/pecas ou, para a parte de um objeto, <objeto>/<parte>. O objeto de várias
partes ganha uma seção por parte. As operações saem de importar a receita e ler o PASSOS (sem construir a malha); as rodadas, a
decisão da pessoa e os planos saem de arquivos gravados. A seção entre os marcadores "a-mao" é escrita por um modelo e o gerador a
preserva.`;

/* ---- o que é cada unidade do dossiê ---- */

/** As pastas de receita do objeto: a própria (com `receita.js`) e cada `partes/<parte>`. `[{ id, nome, pasta }]`. */
export function unidadesDoObjeto(objeto, raiz = REPO) {
  /* o nome vira caminho antes de qualquer importação: sem `..`, barra a mais nem maiúscula */
  if (!/^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)?$/.test(String(objeto))) throw new Error(`'${objeto}' não é nome de objeto: esperado <objeto> ou <objeto>/<parte>, com letras minúsculas, números e hífen, sem '..' nem barra no fim.`);
  const base = join(raiz, PASTA_DAS_PECAS);
  const partes = /^([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)$/.exec(objeto);
  const pasta = [join(base, objeto), partes && join(base, partes[1], 'partes', partes[2])].find((p) => p && existsSync(join(p, 'receita.js')) || (p && existsSync(join(p, 'partes'))));
  if (!pasta) throw new Error(`'${objeto}' não é objeto do acervo: esperado uma pasta em ${PASTA_DAS_PECAS}/ com receita.js ou partes/ (as pastas começam em ${PASTA_DAS_PECAS}/${objeto.split('/')[0]}).`);
  const unidades = [];
  if (existsSync(join(pasta, 'receita.js'))) unidades.push({ id: 'peca', nome: objeto.split('/').pop(), peca: objeto, pasta });
  const dePartes = join(pasta, 'partes');
  if (existsSync(dePartes)) {
    for (const parte of readdirSync(dePartes).sort()) {
      if (existsSync(join(dePartes, parte, 'receita.js'))) unidades.push({ id: parte, nome: parte, peca: `${objeto.split('/')[0]}/${parte}`, pasta: join(dePartes, parte) });
    }
  }
  return { pasta, unidades };
}

/* ---- as operações de cada parte, do grafo dos passos ---- */

const ehReferencia = (v) => v && typeof v === 'object' && typeof v.op === 'string' && Number.isInteger(v.id);

/* Toda referência `{ op, id }` dentro dos argumentos de um passo. */
function referenciasDe(valor, achadas = []) {
  if (Array.isArray(valor)) valor.forEach((v) => referenciasDe(v, achadas));
  else if (valor && typeof valor === 'object') {
    if (ehReferencia(valor)) achadas.push({ op: valor.op, id: valor.id });
    Object.values(valor).forEach((v) => referenciasDe(v, achadas));
  }
  return achadas;
}

const argumentosDe = (passo) => (Array.isArray(passo) ? passo[1] : passo?.[1]) ?? {};
const nomeDoPasso = (passo) => (Array.isArray(passo) ? passo[0] : undefined);
const grupoDoPasso = (passo) => {
  const a = argumentosDe(passo);
  return a?.sel?.grupo ?? a?.grupo;
};

/**
 * As operações de cada parte declarada nos passos: `{ [nome]: [{ op, vezes }] }` na ordem em que aparecem, e `{}` quando não há
 * passo `parte`. Entram o passo que cria o sólido de cada referência (e os de que ele depende), os passos sem `origemId` que só
 * transformam um sólido já referenciado (rotaciona, transladar, limparLascas) e os que selecionam o grupo da parte.
 */
export function operacoesPorParte(passos) {
  if (!Array.isArray(passos)) return {};
  const criador = new Map();
  passos.forEach((p, i) => { const id = argumentosDe(p).origemId; if (id !== undefined) criador.set(`${nomeDoPasso(p)}:${id}`, i); });
  const modificadores = new Map();
  passos.forEach((p, i) => {
    if (argumentosDe(p).origemId !== undefined || nomeDoPasso(p) === 'parte' || grupoDoPasso(p) !== undefined) return;
    for (const r of referenciasDe(argumentosDe(p))) { const k = `${r.op}:${r.id}`; modificadores.set(k, [...(modificadores.get(k) ?? []), i]); }
  });
  const nomes = [...new Set(passos.filter((p) => nomeDoPasso(p) === 'parte').map((p) => argumentosDe(p).nome).filter((n) => typeof n === 'string'))];
  const resultado = {};
  for (const nome of nomes) {
    const dentro = new Set();
    const fila = [];
    passos.forEach((p, i) => {
      if (nomeDoPasso(p) === 'parte' && argumentosDe(p).nome === nome) { dentro.add(i); fila.push(...referenciasDe(argumentosDe(p))); }
      else if (grupoDoPasso(p) === nome) dentro.add(i);
    });
    const vistas = new Set();
    while (fila.length) {
      const { op, id } = fila.pop();
      const k = `${op}:${id}`;
      if (vistas.has(k)) continue;
      vistas.add(k);
      for (const i of [criador.get(k), ...(modificadores.get(k) ?? [])]) {
        if (i === undefined || dentro.has(i)) continue;
        dentro.add(i);
        fila.push(...referenciasDe(argumentosDe(passos[i])));
      }
    }
    const contagem = new Map();
    for (const i of [...dentro].sort((a, b) => a - b)) { const op = nomeDoPasso(passos[i]); contagem.set(op, (contagem.get(op) ?? 0) + 1); }
    resultado[nome] = [...contagem].map(([op, vezes]) => ({ op, vezes }));
  }
  return resultado;
}

/* ---- leitura do que está gravado ---- */

async function lerReceita(pasta) {
  const modulo = await importarReceita(join(pasta, 'receita.js'));
  const receita = receitaDoModulo(modulo);
  return { plano: receita?.PLANO ?? modulo.PLANO ?? null, passos: Array.isArray(receita?.PASSOS) ? receita.PASSOS : null };
}

/* O `ATRITOS.md` da pasta do banco de provas: `{ arquivo, itens, semDestino }`, ou null sem o arquivo. Item é a linha que começa por número e ponto. */
function atritosDe(raiz, pasta) {
  const arquivo = `${pasta}ATRITOS.md`;
  if (!existsSync(join(raiz, arquivo))) return null;
  const texto = readFileSync(join(raiz, arquivo), 'utf8');
  const itens = texto.split(/^(?=\d+\.\s)/m).filter((t) => /^\d+\.\s/.test(t));
  return { arquivo, itens: itens.length, semDestino: itens.filter((t) => !/\bDestino:/.test(t)).length };
}

/* Os planos (em jogo ou guardados em subpasta) cujo território cobre a pasta do objeto. `pasta` relativa à raiz, com barra no fim. */
function planosQueCobrem(raiz, pastaRelativa, docs) {
  const planos = join(raiz, docs, 'planos');
  const achados = [];
  const varrer = (dir, prefixo) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (e.isDirectory()) varrer(join(dir, e.name), `${prefixo}${e.name}/`);
      else if (/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(e.name)) {
        const texto = readFileSync(join(dir, e.name), 'utf8');
        /* o `DOSSIE.md`, o teste e o dado não são o objeto: o plano que só os cobre não cobre a pasta */
        const cobre = caminhosDoTerritorio(texto).filter(caminhoQueMudaForma).filter((c) => {
          const a = c.replace(/\/+$/, '/'); const b = pastaRelativa;
          return a === b || (a.endsWith('/') && b.startsWith(a)) || (b.endsWith('/') && a.startsWith(b)) || a === b.replace(/\/$/, '');
        });
        if (!cobre.length) continue;
        const titulo = texto.match(/^#\s+(.+?)\s*$/m)?.[1] ?? e.name;
        const estado = texto.match(/^\*\*Estado:\*\*\s*(.+?)\s*$/m)?.[1] ?? 'sem estado';
        const bancos = bancosDeProvasDe(texto, docs).map((b) => { const tabela = tabelaDeTentativasEm(raiz, b); return { pasta: b, tabela, tentativas: tabela ? linhasDeTentativas(readFileSync(join(raiz, tabela), 'utf8')) : [], atritos: atritosDe(raiz, b) }; });
        achados.push({ arquivo: `${docs}/planos/${prefixo}${e.name}`, titulo, estado, bancos });
      }
    }
  };
  varrer(planos, '');
  return achados;
}

/* As linhas da crônica dos planos encerrados que citam o objeto, pelo caminho da pasta ou pelo nome (hífen e espaço valem o mesmo). */
function encerradosQueCitam(raiz, objeto, docs) {
  const arquivo = join(raiz, docs, 'decisoes/PLANOS-ENCERRADOS.md');
  if (!existsSync(arquivo)) return [];
  const nome = objeto.split('/')[0];
  /* o nome casa como palavra inteira: um nome que é prefixo de outro, com hífen ou letra a mais, não casa */
  const rotulos = [`${PASTA_DAS_PECAS}/${objeto}`, nome, nome.replace(/-/g, ' ')].map((r) => new RegExp(`(?<![\\p{L}\\p{N}_-])${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_-])`, 'iu'));
  return readFileSync(arquivo, 'utf8').split('\n').filter((l) => l.startsWith('- `') && rotulos.some((r) => r.test(l)))
    .map((l) => { const m = /^- `([^`]+)`:\s*(.*?)\s*O texto está no commit `([^`]+)`/.exec(l); return m ? { plano: m[1], resumo: m[2].replace(/\.$/, ''), commit: m[3] } : null; }).filter(Boolean);
}

/* ---- a escrita ---- */

const limite = (texto, n) => { const t = String(texto ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };
const celula = (texto) => String(texto ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const marcador = (id, ponta) => `<!-- dossie:a-mao:${id}:${ponta} -->`;

function linhasDoPlano(plano) {
  if (!plano) return ['O `PLANO` não está na receita.'];
  const linhas = [];
  if (plano.objeto) linhas.push(`- Objeto: ${plano.objeto}`);
  if (plano.escala) linhas.push(`- Escala: ${plano.escala.medida ?? '?'}, ${plano.escala.milimetros ?? '?'} mm`);
  if (plano.referencias?.length) linhas.push(`- Referências: ${plano.referencias.map((r) => `\`${r}\``).join(', ')}${plano.referenciasNaoConstruidas?.length ? `; não construídas: ${plano.referenciasNaoConstruidas.map((r) => `\`${r}\``).join(', ')}` : ''}`);
  if (plano.partes?.length) {
    linhas.push('- Partes do plano:');
    for (const p of plano.partes) linhas.push(`  - \`${p.nome}\`: ${limite(p.forma, 220).replace(/\.?$/, '.')}${p.tecnica ? ` Técnica declarada: ${limite(p.tecnica, 260)}` : ''}`);
  }
  if (plano.criteriosDeReprovacao?.length) {
    linhas.push('- Critérios de reprovação:');
    for (const c of plano.criteriosDeReprovacao) linhas.push(`  - ${limite(c, 260)}`);
  }
  return linhas;
}

function linhasDasOperacoes(passos, plano) {
  if (!passos) return ['A receita não declara `PASSOS` (vem de família ou composição): as operações só saem executando a receita (`npm run descrever -- <peça>`, que constrói a malha e leva de segundos a minutos), e o dossiê não a executa. Proposta: a família publicar a lista de operações que usa, para o dossiê lê-la sem executar.'];
  const porParte = operacoesPorParte(passos);
  const nomes = Object.keys(porParte);
  const linhas = [`Passos da receita: ${passos.length}. Operações por parte, lidas do grafo dos passos (uma operação que serve a mais de uma parte aparece em todas):`, ''];
  if (!nomes.length) return [...linhas.slice(0, 1), 'A receita não nomeia partes (nenhum passo `parte`).'];
  linhas.push('| Parte | Operações (nome ×vezes) |', '| --- | --- |');
  const declaradas = new Set((plano?.partes ?? []).map((p) => p.nome));
  for (const nome of nomes) linhas.push(`| \`${nome}\`${declaradas.size && !declaradas.has(nome) ? ' (fora do `PLANO`)' : ''} | ${celula(porParte[nome].map((o) => `${o.op} ×${o.vezes}`).join(', '))} |`);
  const semPasso = [...declaradas].filter((n) => !nomes.includes(n));
  if (semPasso.length) linhas.push('', `Partes do \`PLANO\` sem passo \`parte\`: ${semPasso.map((n) => `\`${n}\``).join(', ')}.`);
  return linhas;
}

function linhasDasRodadas(rodadas, decisoes) {
  if (!rodadas.length) return ['Nenhuma rodada registrada.'];
  const decisaoDe = new Map(decisoes.map((d) => [d.rodada, d]));
  const comMedida = rodadas.some((r) => r.medidas?.faces !== undefined || r.medidas?.segundos !== undefined);
  const linhas = comMedida
    ? ['| Rodada | Registrada | Medidas | Faces | Segundos da guarda | Nota | Defeitos | Decisão da pessoa |', '| --- | --- | --- | --- | --- | --- | --- | --- |']
    : ['| Rodada | Registrada | Medidas | Nota | Defeitos | Decisão da pessoa |', '| --- | --- | --- | --- | --- | --- |'];
  for (const r of rodadas) {
    const d = decisaoDe.get(r.numero);
    const cache = r.medidas?.cachePorPasso;
    const medida = comMedida ? ` ${r.medidas?.faces ?? '-'} | ${r.medidas?.segundos ?? '-'}${cache ? ` (cache: recomeçou do passo ${cache.recomecouDoPasso}${cache.total !== undefined ? ` de ${cache.total}` : ''})` : ''} |` : '';
    linhas.push(`| ${r.numero} | ${(r.registradaEm ?? '').slice(0, 10) || 'sem data'} | ${r.medidas?.passou === true ? 'passou' : r.medidas?.passou === false ? 'reprovou' : 'sem medida'} |${medida} ${r.veredito?.nota ?? 'sem veredito'} | ${r.veredito ? (r.veredito.defeitos ?? []).length : '-'} | ${d ? celula(d.decisao) : 'sem decisão gravada'} |`);
  }
  linhas.push('', comMedida ? 'Faces é o total de faces da malha. Segundos da guarda é o tempo da guarda do acervo na rodada, a primeira execução da receita na medição, e não o custo da receita: depende do cache por passo, que o registro mostra quando o gravou (recomeçou do passo n de total: com n acima de zero o cache estava quente e o tempo é só dos passos que mudaram; zero, a receita executou inteira); a rodada sem a nota do cache não diz o estado dele, e as rodadas sem o número são anteriores à gravação e não foram reescritas.' : 'Faces e tempo da execução: nenhuma rodada os gravou (`medidas.faces` e `medidas.segundos` entram nas rodadas registradas desde 2026-11-27; as anteriores não são reescritas).');
  const comNota = rodadas.filter((r) => (r.atrito ?? []).length || r.notaDePassagem);
  if (comNota.length) {
    linhas.push('', 'Atrito e nota de passagem de cada rodada, condensados (o texto inteiro está na rodada gravada):', '');
    for (const r of comNota) {
      const partes = [];
      if (r.notaDePassagem) partes.push(`nota: ${limite(r.notaDePassagem, 150)}`);
      if ((r.atrito ?? []).length) partes.push(`atrito: ${r.atrito.slice(0, 2).map((a) => limite(a, 110)).join('; ')}${r.atrito.length > 2 ? ` (e mais ${r.atrito.length - 2})` : ''}`);
      linhas.push(`- rodada ${r.numero}: ${partes.join(' | ')}`);
    }
  }
  const ultima = [...rodadas].reverse().find((r) => r.veredito);
  if (ultima) {
    linhas.push('', `Defeitos da rodada ${ultima.numero}, a última com veredito:`, '');
    const lista = ultima.veredito.defeitos ?? [];
    if (!lista.length) linhas.push('- nenhum');
    for (const d of lista) linhas.push(`- \`${d.parte}\`, ${d.tipo} (${d.sentido ?? 'sem sentido'}): ${limite(d.onde, 140)}`);
    if (ultima.veredito.observacao) linhas.push('', `Observação do crítico: ${limite(ultima.veredito.observacao, 400)}`);
  }
  const semDecisao = decisoes.length === 0;
  if (semDecisao) linhas.push('', 'A pasta não tem `decisoes-da-pessoa.json`: o julgamento da pessoa sobre as rodadas anteriores não está gravado como decisão.');
  return linhas;
}

function linhasDosPlanos(planos, encerrados, arquivoDoDossie, raiz) {
  const ref = (alvo) => relative(dirname(arquivoDoDossie), join(raiz, alvo)).split('\\').join('/');
  const linhas = [];
  if (!planos.length) linhas.push('Nenhum plano na árvore cobre a pasta deste objeto.', '');
  if (!planos.length && !encerrados.length) return linhas.slice(0, 1);
  for (const p of planos) {
    linhas.push(`- [${p.titulo}](${ref(p.arquivo)}) (${p.estado})`);
    if (!p.bancos.length) linhas.push('  - sem banco de provas no território');
    for (const b of p.bancos) {
      linhas.push(`  - banco de provas: [${b.pasta.replace(/\/$/, '').split('/').pop()}](${ref(b.pasta)}); ${b.tabela ? `tabela de tentativas: [${b.tabela.split('/').pop()}](${ref(b.tabela)})` : 'sem tabela de tentativas'}; ${b.atritos ? `atritos: [ATRITOS.md](${ref(b.atritos.arquivo)}), ${b.atritos.itens} item(ns), ${b.atritos.semDestino} sem destino` : 'sem ATRITOS.md'}`);
      for (const t of b.tentativas) linhas.push(`    - ${limite(t.hipotese, 120)} | ensaio: ${limite(t.ensaio, 120)} | resultado: ${limite(t.resultado, 140)} | destino: ${limite(t.destino, 60)}`);
    }
  }
  if (encerrados.length) {
    linhas.push('', 'Planos encerrados que citam o objeto (o texto está no git, no commit que a crônica indica):', '');
    for (const e of encerrados) linhas.push(`- \`${e.plano}\`: ${limite(e.resumo, 300)} (commit \`${e.commit}\`)`);
  }
  return linhas;
}

/* O aceite da pessoa no `ALINHAMENTO.md` da pasta do objeto (ou, para a parte, o da pasta do objeto), lido por `lerAceites` do fluxo do objeto. */
function linhasDoAceite(pasta, arquivoDoDossie, raiz) {
  const candidatos = [join(pasta, 'ALINHAMENTO.md'), join(pasta, '..', '..', 'ALINHAMENTO.md')];
  const arquivo = candidatos.find((c) => existsSync(c));
  if (!arquivo) return ['Sem `ALINHAMENTO.md` na pasta: o aceite da pessoa ao alinhamento não está gravado.'];
  const link = `[ALINHAMENTO.md](${relative(dirname(arquivoDoDossie), arquivo).split('\\').join('/')})`;
  const { alinhamento, rascunho, decisoes } = lerAceites(readFileSync(arquivo, 'utf8'));
  const dito = (a, quem) => (a ? `${quem}: ${a.origem === 'registrado' ? 'aceite registrado' : 'registro anterior ao formato'}: ${limite(a.texto, 240)}` : `${quem}: sem aceite registrado`);
  return [`- ${dito(alinhamento, 'alinhamento')} (${link})`, `- ${dito(rascunho, 'rascunho')}`, ...(decisoes.length ? [`- decisões que dependem da pessoa, ainda sem aceite: ${decisoes.length}`] : [])];
}

/** Os blocos `a-mao` de um texto de dossiê: `{ [id]: texto entre os marcadores }`; o id que perdeu um dos marcadores fica de fora. */
export function secoesAMao(texto) {
  const achadas = {};
  for (const m of (texto ?? '').matchAll(/<!-- dossie:a-mao:([^:\s]+):inicio -->\n([\s\S]*?)\n<!-- dossie:a-mao:\1:fim -->/g)) achadas[m[1]] = m[2];
  return achadas;
}

/** Os blocos `a-mao` de uma unidade que aparecem mais de uma vez: `{ [id]: [texto, ...] }`. Só um texto sobrevive à regeração, e o outro se perderia. */
export function secoesRepetidas(texto) {
  const todas = {};
  for (const m of (texto ?? '').matchAll(/<!-- dossie:a-mao:([^:\s]+):inicio -->\n([\s\S]*?)\n<!-- dossie:a-mao:\1:fim -->/g)) (todas[m[1]] ??= []).push(m[2]);
  return Object.fromEntries(Object.entries(todas).filter(([, v]) => v.length > 1));
}

const trecho = (t) => `"${String(t).replace(/\s+/g, ' ').trim().slice(0, 60)}…"`;

/** As recusas da seção à mão que a regeração destruiria: a repetida e a de unidade que não existe mais. `[]` quando está tudo no lugar. */
export function problemasDasSecoes(texto, unidades, rotulo) {
  const problemas = [];
  for (const [id, textos] of Object.entries(secoesRepetidas(texto))) {
    problemas.push(`${rotulo} tem a seção à mão de ${id} ${textos.length} vezes; a regeração guarda só a última e perderia o texto de ${textos.slice(0, -1).map(trecho).join(', ')}; junte as seções numa só, sob um par de marcadores`);
  }
  const conhecidas = new Set(idsDeSecoes(unidades));
  const orfas = Object.entries(secoesAMao(texto)).filter(([id]) => !conhecidas.has(id));
  if (orfas.length) problemas.push(`${rotulo} tem seção à mão de ${orfas.map(([id]) => id).join(', ')}, que não é unidade do objeto (${unidades.map((u) => u.id).join(', ')}), e a regeração a perderia com o texto ${orfas.map(([, t]) => trecho(t)).join(', ')}; leve o texto para a unidade certa ou apague a seção`);
  return problemas;
}

/**
 * O texto do dossiê do objeto, do que está gravado. `aMao` são as seções à mão de antes (`secoesAMao`), preservadas. Assíncrono só
 * pela importação das receitas.
 */
export async function montarDossie(objeto, { raiz = REPO, aMao = {}, docs = DOCUMENTOS } = {}) {
  const { pasta, unidades } = unidadesDoObjeto(objeto, raiz);
  const arquivo = join(pasta, ARQUIVO);
  const pastaRelativa = `${relative(raiz, pasta).split('\\').join('/')}/`;
  const planos = planosQueCobrem(raiz, pastaRelativa, docs);
  const encerrados = encerradosQueCitam(raiz, objeto, docs);
  const varias = unidades.length > 1 || unidades[0]?.id !== 'peca';
  const saida = [
    `# Dossiê: ${objeto}`,
    '',
    `Gerado por \`npm run dossie -- ${objeto}\` do que já está gravado; não edite fora dos marcadores \`a-mao\`, porque \`npm run dossie -- ${objeto} --check\` recusa o arquivo diferente do gerado. A seção entre os marcadores é escrita à mão e o gerador a preserva.`,
    '',
    '## Aceite da pessoa ao alinhamento',
    '',
    ...linhasDoAceite(pasta, arquivo, raiz),
    '',
    '## Planos que cobrem a pasta',
    '',
    ...linhasDosPlanos(planos, encerrados, arquivo, raiz),
  ];
  for (const u of unidades) {
    const { plano, passos } = await lerReceita(u.pasta);
    const pastaDeRodadas = join(u.pasta, 'rodadas');
    const rodadas = lerRodadas(u.peca, { pasta: pastaDeRodadas });
    const decisoes = lerDecisoesDaPessoa(u.peca, { pasta: pastaDeRodadas });
    const nivel = varias ? '##' : '##';
    saida.push('', `${nivel} ${varias ? `Parte \`${u.nome}\`` : 'O alvo'}`, '', ...(varias ? [`Pasta: \`${relative(raiz, u.pasta).split('\\').join('/')}/\``, ''] : []));
    saida.push(...linhasDoPlano(plano));
    saida.push('', `### Operações${varias ? ` de \`${u.nome}\`` : ''}`, '', ...linhasDasOperacoes(passos, plano));
    saida.push('', `### Rodadas${varias ? ` de \`${u.nome}\`` : ''}`, '', ...linhasDasRodadas(rodadas, decisoes));
    saida.push('', `### Escolhas de técnica, à mão${varias ? ` (\`${u.nome}\`)` : ''}`, '', marcador(u.id, 'inicio'), aMao[u.id] ?? MODELO_A_MAO, marcador(u.id, 'fim'));
    saida.push('', `### Dívida conhecida, à mão${varias ? ` (\`${u.nome}\`)` : ''}`, '', marcador(idDaDivida(u.id), 'inicio'), aMao[idDaDivida(u.id)] ?? MODELO_DA_DIVIDA, marcador(idDaDivida(u.id), 'fim'));
  }
  return { arquivo, texto: `${saida.join('\n')}\n`, unidades };
}

/**
 * Confere o `DOSSIE.md` gravado contra o que se gera agora: `{ problemas }`. Recusa o arquivo ausente, o que perdeu o marcador de uma
 * seção à mão (o texto escrito foi apagado ou os marcadores foram mexidos) e o diferente do gerado.
 */
export async function conferirDossie(objeto, { raiz = REPO, docs = DOCUMENTOS } = {}) {
  const { arquivo, unidades } = await montarDossie(objeto, { raiz, docs });
  const comando = `npm run dossie -- ${objeto}`;
  if (!existsSync(arquivo)) return { problemas: [`${relative(raiz, arquivo)} não existe; rode \`${comando}\``] };
  const gravado = readFileSync(arquivo, 'utf8');
  const secoes = secoesAMao(gravado);
  const dasSecoes = problemasDasSecoes(gravado, unidades, relative(raiz, arquivo));
  if (dasSecoes.length) return { problemas: dasSecoes };
  const faltam = idsDeSecoes(unidades).filter((id) => secoes[id] === undefined);
  if (faltam.length) return { problemas: [`${relative(raiz, arquivo)} perdeu a seção à mão de ${faltam.join(', ')} (os marcadores \`dossie:a-mao:<unidade>:inicio\` e \`:fim\`); ponha os marcadores de volta com o texto que havia, ou rode \`${comando}\` para recomeçar a seção no modelo, e escreva de novo`] };
  const { texto } = await montarDossie(objeto, { raiz, aMao: secoes, docs });
  return texto === gravado ? { problemas: [] } : { problemas: [`${relative(raiz, arquivo)} está desatualizado em relação às receitas, rodadas, decisões e planos; rode \`${comando}\` (a seção à mão é preservada)`] };
}

/** Grava o dossiê do objeto, preservando as seções à mão do arquivo de antes; devolve `{ arquivo, perdidas }`, as unidades que ficaram no modelo. */
export async function gerarDossie(objeto, { raiz = REPO, docs = DOCUMENTOS } = {}) {
  const { arquivo } = await montarDossie(objeto, { raiz, docs });
  const antes = existsSync(arquivo) ? readFileSync(arquivo, 'utf8') : null;
  const dele = unidadesDoObjeto(objeto, raiz).unidades;
  const dasSecoes = antes === null ? [] : problemasDasSecoes(antes, dele, relative(raiz, arquivo));
  if (dasSecoes.length) throw new Error(`${dasSecoes.join('; ')}; nada foi regravado`);
  const aMao = secoesAMao(antes);
  const { texto, unidades } = await montarDossie(objeto, { raiz, aMao, docs });
  writeFileSync(arquivo, texto);
  return { arquivo, perdidas: antes === null ? [] : idsDeSecoes(unidades).filter((id) => aMao[id] === undefined) };
}

/** Os objetos de `procedural/pecas` que já têm `DOSSIE.md`: a pasta do objeto e a de cada `partes/<parte>`, como `<objeto>` e `<objeto>/<parte>`. */
export function objetosComDossie(raiz = REPO) {
  const base = join(raiz, PASTA_DAS_PECAS);
  if (!existsSync(base)) return [];
  const achados = [];
  for (const o of readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
    if (existsSync(join(base, o, ARQUIVO))) achados.push(o);
    const dePartes = join(base, o, 'partes');
    if (existsSync(dePartes)) for (const p of readdirSync(dePartes).sort()) if (existsSync(join(dePartes, p, ARQUIVO))) achados.push(`${o}/${p}`);
  }
  return achados;
}

/* O texto escrito à mão que o dossiê substitui: markdown e texto puro, em qualquer caixa. */
const TEXTO_A_MAO = /\.(md|markdown|txt)$/i;

/* As referências que as receitas do objeto citam, lidas do texto delas (sem importar): os caminhos entre aspas dentro de `referencias: [ ... ]`
   do `PLANO`, e o caminho `referencias/<arquivo>` escrito em qualquer ponto do texto da receita ou dos módulos dela em `receita/` (a análise
   de uma referência que a receita cita como fonte da medida é referência, e não documento à mão do objeto). As cópias em `rodadas/` não contam. */
function referenciasCitadas(pastaDoObjeto) {
  const unidades = [pastaDoObjeto];
  const dePartes = join(pastaDoObjeto, 'partes');
  if (existsSync(dePartes)) for (const p of readdirSync(dePartes)) unidades.push(join(dePartes, p));
  const fontes = [];
  for (const u of unidades) {
    if (existsSync(join(u, 'receita.js'))) fontes.push(join(u, 'receita.js'));
    const modulos = join(u, 'receita');
    if (existsSync(modulos)) for (const m of readdirSync(modulos).filter((n) => n.endsWith('.js')).sort()) fontes.push(join(modulos, m));
  }
  const citadas = new Set();
  for (const r of fontes) {
    const texto = readFileSync(r, 'utf8');
    for (const bloco of texto.matchAll(/["']?\breferencias["']?\s*:\s*\[([^\]]*)\]/g)) for (const c of bloco[1].matchAll(/(['"`])([^'"`]+)\1/g)) citadas.add(c[2]);
    for (const c of texto.matchAll(/\breferencias\/[\w.\-/]+\.(?:md|markdown|txt)\b/gi)) citadas.add(c[0]);
  }
  return citadas;
}

/**
 * Os documentos escritos à mão na pasta de um objeto de `procedural/pecas/`, que o dossiê substitui: o `.md`, `.markdown` e `.txt` (em qualquer caixa)
 * de qualquer subpasta, o `DOSSIE.md` fora da raiz do objeto e de `partes/<parte>/`, e o que está em `referencias/` e o `PLANO.referencias` da receita
 * não cita (fora o `alvo.md` e o `roteiro.md` gerado de um pacote). Ficam só o `DOSSIE.md` gerado, o `ALINHAMENTO.md` da raiz do objeto (a fonte do aceite da pessoa, que o dossiê lê) e a referência citada.
 * Cada um sai como `{ arquivo, problema }`, com o caminho relativo à raiz.
 */
export function mdsAMaoNaPastaDoObjeto(raiz = REPO) {
  const base = join(raiz, PASTA_DAS_PECAS);
  if (!existsSync(base)) return [];
  const achados = [];
  const varrer = (dir, objeto, pastaDoObjeto, relativo, citadas) => {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const caminhoRel = relativo ? `${relativo}/${e.name}` : e.name;
      if (e.isDirectory()) { if (e.name !== 'node_modules') varrer(join(dir, e.name), objeto, pastaDoObjeto, caminhoRel, citadas); continue; }
      const eDossie = e.name.toLowerCase() === ARQUIVO.toLowerCase();
      if (!eDossie && !TEXTO_A_MAO.test(e.name)) continue;
      const arquivo = relative(raiz, join(dir, e.name)).split('\\').join('/');
      if (eDossie && (caminhoRel === ARQUIVO || /^partes\/[^/]+\/DOSSIE\.md$/.test(caminhoRel)) && e.name === ARQUIVO) continue;
      if (caminhoRel === 'ALINHAMENTO.md') continue;
      /* o `alvo.md` é o alvo declarado do objeto (a receita de família o declara dentro do `PLANO` que monta), e o roteiro de um pacote é gerado pelas ferramentas de contorno e de prancha */
      if (caminhoRel === `referencias/${e.name}` && e.name === 'alvo.md') continue;
      if (/^referencias\/[^/]+\.pacote\/roteiro\.md$/.test(caminhoRel)) continue;
      if (caminhoRel.startsWith('referencias/') && [...citadas].some((c) => c === caminhoRel || c.endsWith(`/${caminhoRel}`))) continue;
      const doDossie = eDossie ? `o ${ARQUIVO} só vale na raiz do objeto e em partes/<parte>/, e é gerado (npm run dossie -- ${objeto}); apague este` : null;
      const daReferencia = caminhoRel.startsWith('referencias/') ? 'em referencias/ vale só o que o PLANO.referencias da receita cita: cite o arquivo lá, ou apague-o' : null;
      achados.push({ arquivo, problema: `${arquivo} é um documento escrito à mão na pasta do objeto (${doDossie ?? daReferencia ?? `o documento do objeto é o ${ARQUIVO} (npm run dossie -- ${objeto}): ponha a escolha de técnica ou a dívida conhecida nas seções à mão dele, a lição no guia da técnica, e apague o arquivo`}); ficam só o ${ARQUIVO} gerado, o ALINHAMENTO.md da raiz do objeto, que o dossiê lê, e a referência que o PLANO.referencias cita` });
    }
  };
  for (const o of readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()) varrer(join(base, o), o, join(base, o), '', referenciasCitadas(join(base, o)));
  return achados;
}

export { objetosMudadosNoEnvio };

/**
 * As seções à mão que o envio deixou no modelo (`- a escrever`) nos dossiês dos objetos que ele mudou, como recusas: a escolha de técnica e a dívida
 * conhecida de cada unidade que o envio mudou (todas, quando mudou arquivo fora de `partes/`). O objeto que o envio não mudou não é cobrado.
 */
export function secoesPorEscreverNoEnvio(raiz = REPO) {
  const problemas = [];
  const mudados = arquivosMudadosNoEnvio(raiz);
  const porEscrever = (texto) => /^\s*-\s*a escrever\s*$/m.test(texto);
  for (const o of objetosMudadosNoEnvio(raiz)) {
    let unidades;
    try { unidades = unidadesDoObjeto(o, raiz).unidades; } catch { continue; }
    const doObjeto = mudados.filter((c) => c.startsWith(`${o}/`));
    const mudouForaDePartes = doObjeto.some((c) => !c.startsWith(`${o}/partes/`));
    const partesMudadas = new Set(doObjeto.filter((c) => c.startsWith(`${o}/partes/`)).map((c) => c.split('/')[2]));
    const daRaiz = join(raiz, PASTA_DAS_PECAS, o, ARQUIVO);
    for (const u of unidades) {
      if (!mudouForaDePartes && !partesMudadas.has(u.id)) continue;
      const arquivo = existsSync(daRaiz) ? daRaiz : join(u.pasta, ARQUIVO);
      if (!existsSync(arquivo)) continue;
      const secoes = secoesAMao(readFileSync(arquivo, 'utf8'));
      for (const [id, nome] of [[u.id, 'escolhas de técnica'], [idDaDivida(u.id), 'dívida conhecida']]) {
        if (secoes[id] !== undefined && porEscrever(secoes[id])) problemas.push(`${relative(raiz, arquivo)} deixou a seção à mão de ${nome} de ${u.id} em "a escrever", e o objeto ${o} mudou neste envio; escreva as ${nome === 'dívida conhecida' ? 'dívidas (ou "nenhuma")' : 'escolhas de técnica'} no modelo da seção, sem a linha "a escrever"`);
      }
    }
  }
  return problemas;
}

/**
 * Os dossiês que faltam aos objetos que o envio mudou, como recusas. O objeto com `DOSSIE.md` na raiz o cobre inteiro; o que só tem o de uma
 * parte exige o da raiz quando o envio mudou arquivo fora de `partes/`, e o de cada parte que o envio mudou; o que não tem nenhum exige o da raiz.
 */
export function dossiesQueFaltamNoEnvio(raiz = REPO, objetos = objetosComDossie(raiz)) {
  const problemas = [];
  const mudados = arquivosMudadosNoEnvio(raiz);
  for (const o of objetosMudadosNoEnvio(raiz)) {
    try { unidadesDoObjeto(o, raiz); } catch { continue; }
    if (objetos.includes(o)) continue;
    const dePartes = objetos.filter((x) => x.startsWith(`${o}/`));
    const falta = (nome, e) => problemas.push(`${PASTA_DAS_PECAS}/${nome}/ mudou neste envio e não tem ${ARQUIVO}${e}; rode \`npm run dossie -- ${nome}\` e escreva as seções à mão (escolhas de técnica e dívida conhecida)`);
    if (!dePartes.length) { falta(o, ''); continue; }
    const doObjeto = mudados.filter((c) => c.startsWith(`${o}/`));
    if (doObjeto.some((c) => !c.startsWith(`${o}/partes/`))) falta(o, ' na raiz (só as partes ' + dePartes.map((x) => x.split('/')[1]).join(', ') + ' o têm)');
    for (const parte of new Set(doObjeto.filter((c) => c.startsWith(`${o}/partes/`)).map((c) => c.split('/')[2]))) if (!dePartes.includes(`${o}/${parte}`)) falta(`${o}/${parte}`, '');
  }
  return problemas;
}

export function lerArgumentos(argv) {
  const opcoes = { check: false, todos: false, ajuda: false, raiz: REPO, docs: DOCUMENTOS, objeto: undefined };
  for (const a of argv) {
    if (a === '--check') opcoes.check = true;
    else if (a === '--todos') opcoes.todos = true;
    else if (a === '--ajuda' || a === '--help' || a === '-h') opcoes.ajuda = true;
    else if (a.startsWith('--raiz=')) opcoes.raiz = resolve(a.slice('--raiz='.length));
    else if (a.startsWith('--docs=')) opcoes.docs = a.slice('--docs='.length).replace(/\/+$/, '');
    else if (a.startsWith('--')) throw new Error(`opção desconhecida: ${a}; as opções levam \`=\` (--raiz=<pasta>) e as outras são --check, --todos e --ajuda`);
    else if (opcoes.objeto === undefined) opcoes.objeto = a;
    else throw new Error(`argumento a mais: ${a}; informe um objeto só`);
  }
  return opcoes;
}

async function executar() {
  let opcoes;
  try { opcoes = lerArgumentos(process.argv.slice(2)); } catch (erro) { console.error(`dossie FALHOU — ${erro.message}`); process.exitCode = 1; return; }
  if (opcoes.todos && !opcoes.ajuda && opcoes.objeto) { console.error('dossie FALHOU — --todos e um objeto juntos: use um ou o outro'); process.exitCode = 1; return; }
  if (opcoes.todos && !opcoes.ajuda) {
    const objetos = objetosComDossie(opcoes.raiz);
    const problemas = [];
    const regravados = [];
    if (opcoes.check) {
      problemas.push(...mdsAMaoNaPastaDoObjeto(opcoes.raiz).map((m) => m.problema));
      /* o objeto que o envio mudou tem o dossiê, em dia: o que já o tem é conferido logo abaixo, e o que não tem é recusado aqui */
      problemas.push(...dossiesQueFaltamNoEnvio(opcoes.raiz, objetos), ...secoesPorEscreverNoEnvio(opcoes.raiz));
    }
    for (const objeto of objetos) {
      try {
        if (opcoes.check) problemas.push(...(await conferirDossie(objeto, { raiz: opcoes.raiz, docs: opcoes.docs })).problemas);
        else { const { arquivo, perdidas } = await gerarDossie(objeto, { raiz: opcoes.raiz, docs: opcoes.docs }); regravados.push(objeto); console.log(`dossie ok — ${relative(opcoes.raiz, arquivo)} gerado`); if (perdidas.length) console.error(`aviso: ${objeto} não tinha a seção à mão de ${perdidas.join(', ')}; ela recomeçou no modelo`); }
      } catch (erro) { problemas.push(`${objeto}: ${erro.message}`); }
    }
    if (problemas.length) {
      /* a regeração segue objeto a objeto: o que falhou não impede os outros, e quem lê precisa saber exatamente quais foram regravados */
      const diz = opcoes.check ? '' : `regravados: ${regravados.length ? regravados.join(', ') : 'nenhum'}; não regravados (e por quê): `;
      console.error(`dossie${opcoes.check ? ':check' : ''} FALHOU — ${diz}${problemas.join('; ')}`); process.exitCode = 1; return;
    }
    if (opcoes.check) console.log(`dossie:check ok — ${objetos.length} DOSSIE.md em dia`);
    return;
  }
  if (opcoes.ajuda || !opcoes.objeto) { console.log(AJUDA); if (!opcoes.ajuda) process.exitCode = 1; return; }
  try {
    if (opcoes.check) {
      const { problemas } = await conferirDossie(opcoes.objeto, { raiz: opcoes.raiz, docs: opcoes.docs });
      if (problemas.length) { console.error(`dossie:check FALHOU — ${problemas.join('; ')}`); process.exitCode = 1; return; }
      console.log(`dossie:check ok — ${PASTA_DAS_PECAS}/${opcoes.objeto}/${ARQUIVO} em dia`);
      return;
    }
    const { arquivo, perdidas } = await gerarDossie(opcoes.objeto, { raiz: opcoes.raiz, docs: opcoes.docs });
    console.log(`dossie ok — ${relative(opcoes.raiz, arquivo)} gerado`);
    if (perdidas.length) console.error(`aviso: o arquivo de antes não tinha a seção à mão de ${perdidas.join(', ')}; ela recomeçou no modelo`);
  } catch (erro) { console.error(`dossie FALHOU — ${erro.message}`); process.exitCode = 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await executar();
