#!/usr/bin/env node
/* guarda-acervo.mjs — roda o veredito completo sobre TODO o acervo.
 *
 * A medida de contato existe há tempo, sai com código de erro e ninguém a
 * chamava. `descrever-peca` reprova peça atravessando peça e peça que declara
 * solda e entrega espaço, mas só quando alguém digita o comando com o nome da
 * peça. Numa bicicleta anterior os balancos que seguram a roda ficaram soltos
 * no ar e nada acusou, porque nenhum gate rodava a régua.
 *
 * Esta guarda fecha isso: ela varre o acervo, mede cada peça e sai com código 1
 * se qualquer uma reprovar. Instrumento que não é rodado por gate volta a ser
 * conselho, e conselho é ignorado sob pressão de terminar.
 *
 * ELA TAMBÉM EXIGE O PLANO DE MODELAGEM, e é o único lugar que exige. Medir uma
 * peça de ensaio, escrita para provar um defeito, precisa continuar possível sem
 * plano nenhum; mas peça que entra no acervo sem dizer antes que partes promete
 * volta a ter ausência invisível, que foi como um pneu saiu maciço sem nada
 * acusar.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizarPlanoDeModelagem } from '../../../src/autoria/plano-de-modelagem.js';
import { descreverPecaReutilizavel } from '../descrever-peca.mjs';
import { caminhosDaReferencia } from '../../../src/autoria/plano-de-modelagem.js';
import { resolverCaminhoReceita } from '../resolver-caminho-receita.mjs';
import { ocorrenciasPosicionais, rotularOcorrencias } from '../../../procedural/nucleo/referencia-posicional.js';
import { nucleo } from '../../../procedural/nucleo/nucleo.js';
import { conferirPortasNaForma } from '../../../src/autoria/porta-confere-forma.js';

const REPO = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const ACERVO = join(REPO, 'procedural/pecas');

/* O nome da peça é o caminho relativo sem extensão, que é o mesmo endereço que
   `descrever-peca` aceita. Arquivo de teste não é peça.

   PASTA DA PEÇA: quando o diretório tem `receita.js`, a peça é a PASTA e nada
   mais dentro dela é peça — as referências, as rodadas e o que mais morar ali
   pertencem a ela, não são acervo. Varrer o conteúdo faria cada arquivo da
   pasta virar uma peça fantasma que o gate tentaria medir. */
const ENTRADAS_DE_PASTA = ['receita.js', 'montagem.js', 'index.js'];

export function pecasDoAcervo(pasta = ACERVO, { base = pasta } = {}) {
  /* O nome sai relativo à BASE da varredura, e não à constante do acervo: sem
     isso, medir um acervo de ensaio devolvia caminho com `../..` até a pasta
     temporária, e o teste que prova a pasta da peça era impossível de escrever. */
  const achadas = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      const porta = ENTRADAS_DE_PASTA.find((nome) => existsSync(join(caminho, nome)));
      /* Parte de objeto sai pelo nome curto, sem `partes/`, que é o nome que a
         montagem e a rodada usam. */
      if (porta) achadas.push(relative(base, caminho).replaceAll('\\', '/').replace(/\/partes\//, '/'));
      else achadas.push(...pecasDoAcervo(caminho, { base }));
      continue;
    }
    if (!entrada.name.endsWith('.js') || entrada.name.endsWith('.test.js')) continue;
    achadas.push(relative(base, caminho).replaceAll('\\', '/').replace(/\.js$/, ''));
  }
  return achadas.sort();
}

/* A GUARDA QUE SUBSTITUI O QUE O GATE DE LINKS DEIXA DE VER. Enquanto as
   imagens moravam em `docs/`, `docs:links:check` acusava endereço morto nelas.
   Dentro da pasta da peça elas saem desse alcance, e trocar uma conferência por
   nenhuma seria piorar com aparência de arrumação. Aqui a referência declarada
   que não existe no disco reprova, com o caminho na mensagem. */
export function referenciasAusentes(peca, plano, { raiz = REPO } = {}) {
  if (!plano?.referencias?.length) return [];
  let pastaDaPeca = null;
  try {
    pastaDaPeca = relative(raiz, dirname(resolverCaminhoReceita(peca, { raiz })));
  } catch {
    pastaDaPeca = null;
  }
  return plano.referencias.filter((referencia) => !caminhosDaReferencia(referencia, pastaDaPeca)
    .some((candidato) => existsSync(join(raiz, candidato))));
}

/* A FORMA ANTIGA DEIXA DE SER ACEITA. Enquanto o acervo aceitava peça em
   arquivo solto e peça em pasta, as duas formas conviviam para sempre: um `if`
   em cada comando e uma dúvida em cada sessão sobre onde a próxima peça nasce.
   A permissão não segura comportamento — peça nova continuaria espalhando
   referências pelas mesmas árvores de antes só porque ninguém foi lembrado.

   A recusa só entrou quando a forma antiga ficou sem ocupante: a bicicleta
   migrou primeiro, e só então isto passou a reprovar. Recusar antes disso seria
   reprovar o acervo por uma regra que ele ainda não tinha como cumprir. */
export function emArquivoSolto(peca, { raiz = REPO } = {}) {
  try {
    return !resolverCaminhoReceita(peca, { raiz }).endsWith(`${sep}receita.js`);
  } catch {
    return false;
  }
}

/* ACERVO SEM PEÇA PRECISA SER DECLARADO. A guarda saía com código 1 quando não
   achava peça nenhuma, porque acervo vazio e listagem quebrada produzem a mesma
   varredura vazia, e passar calada no segundo caso é gate que aprova sem medir.
   Só que o repositório fica legitimamente sem peça entre uma modelagem e a
   seguinte: todas as peças de acervo já foram apagadas de propósito quando
   deixaram de provar alguma coisa. Inferir qual dos dois casos é o de hoje não
   dá; por isso quem esvazia o acervo escreve este arquivo, e quem põe peça nova
   apaga. Sem ele, varredura vazia continua reprovando. */
export const DECLARACAO_DE_VAZIO = 'ACERVO-SEM-PECA.md';

export function vazioDeclarado({ raiz = ACERVO } = {}) {
  return existsSync(join(raiz, DECLARACAO_DE_VAZIO));
}

/* PARTE PLANEJADA QUE ESPERA A VEZ. Num objeto de várias partes, o plano de
   todas é escrito na rodada de alinhamento, e a geometria de cada uma só na
   etapa dela. Entre uma coisa e outra a receita tem plano e nenhum passo, e os
   contatos citam partes que ainda não existem. Reprovar isso obrigaria a
   escrever o plano só na hora de modelar, longe do alinhamento.

   A dispensa é estreita: a receita não tem passo nenhum, é citada numa
   montagem do objeto (`<objeto>/montagem.json`), e a etapa dela não está fixa.
   O plano continua validado e as referências continuam cobradas. Parte fixa
   sem passo não existe, porque fixar exige o crítico ter fechado a peça. */
export function etapaQueEspera(peca, { raiz = ACERVO } = {}) {
  const [objeto, parte] = peca.split('/');
  if (!parte) return null;
  const arquivo = join(raiz, objeto, 'montagem.json');
  if (!existsSync(arquivo)) return null;
  const montagem = JSON.parse(readFileSync(arquivo, 'utf8'));
  const instancia = (montagem.instancias ?? []).find((item) => item.alvo?.ref === peca);
  if (!instancia || !(montagem.etapas ?? []).includes(instancia.id)) return null;
  const registro = arquivo.replace(/\.json$/, '.etapas.json');
  const estado = existsSync(registro)
    ? JSON.parse(readFileSync(registro, 'utf8')).etapas?.find((e) => e.instancia === instancia.id)?.estado
    : null;
  return estado === 'fixa' ? null : { montagem: relative(raiz, arquivo).replaceAll('\\', '/'), instancia: instancia.id };
}

/* A CADEIA DA RECEITA. A receita do acervo escreve as medidas uma vez, na `TABELA`
   em milímetro, e os passos saem dela: `derivar()` calcula, `gerarPassos()`
   converte e escreve, e `PASSOS` é um getter que lê `this.PARAMS`. Com `PASSOS` calculado
   uma vez na carga do módulo, o diagnóstico de parâmetros, o ajuste da bancada e
   quem copia a receita com outra tabela recebem os passos da tabela velha, e a
   peça não muda sem nada acusar; 14 receitas do acervo estavam assim em
   2026-10-25. Devolve a lista do que falta, vazia quando a cadeia está inteira. */
/* A peça mora no acervo de `procedural/pecas/`, e não numa pasta de ensaio que um teste passa à guarda. */
const doAcervo = (peca) => !relative(ACERVO, resolverCaminhoReceita(peca)).startsWith('..');

export function faltasDaCadeia(modulo) {
  const receita = modulo.default ?? modulo.receita;
  const faltas = [];
  if (!modulo.TABELA || typeof modulo.TABELA !== 'object') faltas.push('a receita não exporta `TABELA`, a tabela das medidas em milímetro');
  if (typeof modulo.derivar !== 'function') faltas.push('a receita não exporta `derivar()`, que converte a tabela');
  if (typeof modulo.gerarPassos !== 'function') faltas.push('a receita não exporta `gerarPassos()`, que escreve os passos');
  if (!receita?.PARAMS) faltas.push('a receita não tem `PARAMS`, a tabela que os passos leem');
  const descritor = receita && Object.getOwnPropertyDescriptor(receita, 'PASSOS');
  if (descritor && typeof descritor.get !== 'function') {
    faltas.push('`PASSOS` é um valor calculado uma vez; escreva `get PASSOS() { return gerarPassos(this.PARAMS); }`');
  }
  return faltas;
}

async function receitaSemPasso(peca) {
  const modulo = await import(pathToFileURL(resolverCaminhoReceita(peca)).href);
  const receita = modulo.default ?? modulo.receita;
  return receita && Array.isArray(receita.PASSOS) && receita.PASSOS.length === 0 ? receita : null;
}

/* Confere UMA peça e devolve o que ela reprovou e se ela espera a etapa. Cada peça é independente das outras (lê o próprio
   arquivo e não escreve nada), e é essa independência que deixa a varredura repartir as peças entre processadores. */
export async function conferirPeca(peca) {
  const reprovadas = [];
  const esperando = [];
  const espera = etapaQueEspera(peca);
  const vazia = espera && await receitaSemPasso(peca);
  if (vazia) {
    try {
      const plano = normalizarPlanoDeModelagem(vazia.PLANO);
      if (!plano) throw new Error('a receita não exporta `PLANO`.');
      const faltando = referenciasAusentes(peca, plano);
      if (faltando.length) throw new Error(`referência(s) declarada(s) e ausente(s): ${faltando.join(', ')}.`);
    } catch (erro) {
      reprovadas.push({ peca, motivo: `PARTE PLANEJADA COM PLANO INVÁLIDO\n  ${erro.message}` });
      return { reprovadas, esperando };
    }
    esperando.push({ peca, ...espera });
    return { reprovadas, esperando };
  }
  if (emArquivoSolto(peca)) {
    reprovadas.push({
      peca,
      motivo: 'PEÇA EM ARQUIVO SOLTO\n'
        + `  A peça vive em '${peca}.js', e o material dela — referências, âncoras\n`
        + '  e rodadas do laço — não tem onde morar junto.\n'
        + `  A forma certa é a pasta: '${peca}/receita.js', com 'referencias/' ao lado.`,
    });
    return { reprovadas, esperando };
  }
  const medida = await descreverPecaReutilizavel({ peca });
  if (!medida.ok) { reprovadas.push({ peca, motivo: medida.stderr.trim() }); return { reprovadas, esperando }; }
  /* A medida já validou e canonicalizou o plano, e devolve `null` quando a
     receita não exporta nenhum. Revalidar aqui rejeitaria o próprio resultado
     canônico, que carrega `formato` e `versao`. */
  const faltando = referenciasAusentes(peca, medida.resultado.plano);
  if (faltando.length) {
    reprovadas.push({
      peca,
      motivo: `${faltando.length} REFERÊNCIA(S) DECLARADA(S) E AUSENTE(S)\n`
        + faltando.map((r) => `    ${r}`).join('\n')
        + '\n  O plano diz que a peça foi modelada contra estas imagens, e elas não estão lá.',
    });
    return { reprovadas, esperando };
  }
  if (!medida.resultado.plano) {
    reprovadas.push({
      peca,
      motivo: 'SEM PLANO DE MODELAGEM\n  A receita não exporta `PLANO`, então ninguém sabe que partes'
        + '\n  ela deveria ter, e parte que falta não pode ser acusada por medida nenhuma.',
    });
    return { reprovadas, esperando };
  }
  const modulo = await import(pathToFileURL(resolverCaminhoReceita(peca)).href);
  const receita = modulo.default ?? modulo.receita;
  const faltas = doAcervo(peca) ? faltasDaCadeia(modulo) : [];
  if (faltas.length) {
    reprovadas.push({ peca, motivo: `CADEIA DA RECEITA INCOMPLETA\n${faltas.map((f) => `  ${f}`).join('\n')}\n  A tabela é a única fonte das medidas, e os passos precisam sair dela a cada leitura.` });
    return { reprovadas, esperando };
  }
  /* IDENTIDADE POR NOME. Id da malha, índice de array ou posição de passo não
     é identidade persistida; a regra que diz o que é id posicional mora em
     `procedural/nucleo/referencia-posicional.js`, e o gate que a cobrava saiu
     em 2026-08-17 com o acervo antigo e voltou aqui em 2026-10-25. */
  const posicionais = ocorrenciasPosicionais(receita.PASSOS);
  if (posicionais.length) {
    reprovadas.push({
      peca,
      motivo: `${posicionais.length} REFERÊNCIA(S) POR ID POSICIONAL\n${rotularOcorrencias(posicionais).map((l) => `  ${l}`).join('\n')}`
        + '\n  Endereçe por nome: sel:{grupo|alias|origem|regiao|onde|porta}, origemId e publicarPorta.',
    });
    return { reprovadas, esperando };
  }
  /* A porta declarada precisa estar na forma: o resolvedor encaixa pela
     porta e nunca olha a malha. */
  const portas = conferirPortasNaForma(nucleo(receita.PASSOS, receita.PARAMS ?? {}, {}, {}, null, []));
  if (portas.length) {
    reprovadas.push({ peca, motivo: `PORTA FORA DA FORMA\n${portas.map((a) => `  ${a.mensagem}`).join('\n')}` });
  }
  return { reprovadas, esperando };
}

/* A VARREDURA REPARTE AS PEÇAS ENTRE OS PROCESSADORES. As peças do acervo não dependem umas das outras e a conta de cada
   uma é só CPU (a malha, a medida de contato, o núcleo de novo para as portas); sequencial, o acervo inteiro levava mais
   de dois minutos. Cada fio de trabalho pega a próxima peça da fila, e o resultado sai na ordem das peças, igual ao da
   varredura em fila única. Lista curta (a peça de ensaio de um teste, a rodada de uma peça) roda aqui mesmo, sem fio. */
const PECAS_PARA_REPARTIR = 6;

export async function conferirAcervo(pecas = pecasDoAcervo(), { fios = Math.min(availableParallelism(), 4) } = {}) {
  const porPeca = pecas.length < PECAS_PARA_REPARTIR || fios < 2
    ? await sequencial(pecas)
    : await repartida(pecas, fios);
  return {
    pecas,
    reprovadas: porPeca.flatMap((r) => r.reprovadas),
    esperando: porPeca.flatMap((r) => r.esperando),
  };
}

async function sequencial(pecas) {
  const resultados = [];
  for (const peca of pecas) resultados.push(await conferirPeca(peca));
  return resultados;
}

function repartida(pecas, fios) {
  const resultados = new Array(pecas.length);
  let proxima = 0;
  let pendentes = pecas.length;
  return new Promise((resolver, rejeitar) => {
    const trabalhadores = [];
    const encerrar = (erro) => {
      for (const t of trabalhadores) t.terminate();
      if (erro) rejeitar(erro); else resolver(resultados);
    };
    const dar = (trabalhador) => {
      if (proxima >= pecas.length) { trabalhador.terminate(); return; }
      const indice = proxima; proxima += 1;
      trabalhador.indice = indice;
      trabalhador.postMessage({ peca: pecas[indice] });
    };
    for (let n = 0; n < Math.min(fios, pecas.length); n += 1) {
      const trabalhador = new Worker(fileURLToPath(import.meta.url), { workerData: { fioDaGuarda: true } });
      trabalhadores.push(trabalhador);
      trabalhador.on('message', (mensagem) => {
        if (mensagem.erro) { encerrar(new Error(`${pecas[trabalhador.indice]}: ${mensagem.erro}`)); return; }
        resultados[trabalhador.indice] = mensagem.resultado;
        pendentes -= 1;
        if (pendentes === 0) encerrar(null); else dar(trabalhador);
      });
      trabalhador.on('error', encerrar);
      dar(trabalhador);
    }
  });
}

/* O lado do fio: recebe o nome de uma peça, confere e devolve o resultado. */
if (!isMainThread && workerData?.fioDaGuarda) {
  parentPort.on('message', async ({ peca }) => {
    try { parentPort.postMessage({ resultado: await conferirPeca(peca) }); }
    catch (erro) { parentPort.postMessage({ erro: erro?.stack ?? String(erro) }); }
  });
}

if (isMainThread && process.argv[1] && process.argv[1].endsWith('guarda-acervo.mjs')) {
  const { pecas, reprovadas, esperando } = await conferirAcervo();
  if (pecas.length === 0) {
    if (!vazioDeclarado()) {
      console.error(`guarda:acervo — o acervo está vazio e nada foi medido.\n`
        + `  Se ficar sem peça é o estado pretendido, declare em '${DECLARACAO_DE_VAZIO}'\n`
        + '  dentro da pasta do acervo, dizendo por que e o que entra a seguir.\n'
        + '  Sem essa declaração, listagem quebrada e acervo vazio são a mesma varredura.');
      process.exit(1);
    }
    console.log(`guarda:acervo ok — acervo sem peça, declarado em ${DECLARACAO_DE_VAZIO}.`);
    process.exit(0);
  }
  if (vazioDeclarado()) {
    console.error(`guarda:acervo — ${DECLARACAO_DE_VAZIO} diz que o acervo está vazio,`
      + ` e há ${pecas.length} peça(s): ${pecas.join(', ')}.\n`
      + '  Apague a declaração.');
    process.exit(1);
  }
  for (const { peca, motivo } of reprovadas) {
    console.error(`guarda:acervo — ${peca} REPROVOU\n${motivo}\n`);
  }
  for (const { peca, montagem, instancia } of esperando) {
    console.log(`guarda:acervo — ${peca} planejada, sem geometria: espera a etapa '${instancia}' de ${montagem}.`);
  }
  if (reprovadas.length) process.exit(1);
  const medidas = pecas.filter((peca) => !esperando.some((e) => e.peca === peca));
  console.log(`guarda:acervo ok — ${medidas.length} peça(s) medida(s)${medidas.length ? `: ${medidas.join(', ')}` : ''}`
    + `${esperando.length ? `; ${esperando.length} planejada(s) esperando a etapa` : ''}.`);
}
