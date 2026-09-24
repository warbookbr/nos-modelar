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
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizarPlanoDeModelagem } from '../../../src/autoria/plano-de-modelagem.js';
import { descreverPecaReutilizavel } from '../descrever-peca.mjs';
import { caminhosDaReferencia } from '../../../src/autoria/plano-de-modelagem.js';
import { resolverCaminhoReceita } from '../resolver-caminho-receita.mjs';

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

async function receitaSemPasso(peca) {
  const modulo = await import(pathToFileURL(resolverCaminhoReceita(peca)).href);
  const receita = modulo.default ?? modulo.receita;
  return receita && Array.isArray(receita.PASSOS) && receita.PASSOS.length === 0 ? receita : null;
}

export async function conferirAcervo(pecas = pecasDoAcervo()) {
  const reprovadas = [];
  const esperando = [];
  for (const peca of pecas) {
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
        continue;
      }
      esperando.push({ peca, ...espera });
      continue;
    }
    if (emArquivoSolto(peca)) {
      reprovadas.push({
        peca,
        motivo: 'PEÇA EM ARQUIVO SOLTO\n'
          + `  A peça vive em '${peca}.js', e o material dela — referências, âncoras\n`
          + '  e rodadas do laço — não tem onde morar junto.\n'
          + `  A forma certa é a pasta: '${peca}/receita.js', com 'referencias/' ao lado.`,
      });
      continue;
    }
    const medida = await descreverPecaReutilizavel({ peca });
    if (!medida.ok) { reprovadas.push({ peca, motivo: medida.stderr.trim() }); continue; }
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
      continue;
    }
    if (!medida.resultado.plano) {
      reprovadas.push({
        peca,
        motivo: 'SEM PLANO DE MODELAGEM\n  A receita não exporta `PLANO`, então ninguém sabe que partes'
          + '\n  ela deveria ter, e parte que falta não pode ser acusada por medida nenhuma.',
      });
    }
  }
  return { pecas, reprovadas, esperando };
}

if (process.argv[1] && process.argv[1].endsWith('guarda-acervo.mjs')) {
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
