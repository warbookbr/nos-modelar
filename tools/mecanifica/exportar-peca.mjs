/* exportar-peca.mjs — A-60: o núcleo roda AQUI e grava o resultado; o produto
   só lê.

   O CLIENTE DA MECANIFICA OLHA A PEÇA. Ele gira, explode e isola. Não muda
   medida. Nenhuma dessas quatro coisas precisa reexecutar a receita: girar é
   câmera, e explodir e isolar mexem em PARTES, cujo nome já viaja dentro da
   face. Então mandar `PASSOS` e o núcleo inteiro para o navegador do cliente é
   pagar por uma capacidade que ele não usa.

   O QUE ESTE ARQUIVO GRAVA. O estado neutro canônico (a mesma forma que a
   bancada e o gabarito já comparam), mais três coisas que o canônico não
   carrega e sem as quais o outro lado fica cego:

     · `materiais` — a face guarda só o NOME do material; sem o dicionário o
       produto não sabe pintar;
     · `partes`    — a lista dos nomes, ordenada, para o produto montar o menu
       de isolar sem varrer 500 faces;
     · `meta`      — somente o nome que o produto usa para a raiz Three.js.

   E MAIS UMA, QUE É A RAZÃO DE O GATE EXISTIR. `receita` é a impressão digital
   do que ENTROU no núcleo: passos, parâmetros, topologia, materiais, esqueleto
   e apelidos. O risco do dia a dia não é o arquivo nascer errado; é alguém
   mudar a peça e esquecer de gerar de novo. Marca do RESULTADO não pega isso
   quando a mudança não altera geometria (trocar a cor de um material, por
   exemplo). Marca da ENTRADA pega. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
/* a metade LEITORA mora em src/autoria/ler-peca-resolvida.js: ela roda no
   navegador do cliente e não pode arrastar `node:fs` junto. Reexporto aqui
   para quem já importava deste arquivo continuar funcionando, e para o teste
   de ida-e-volta pegar as duas pontas de uma vez. */
import { FORMATO, VERSAO, lerPecaResolvida, parteDaFace } from '../../src/autoria/ler-peca-resolvida.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { neutroCanonico } from '../../prototipos/procedural/v3/motor/oficina.js';
export { FORMATO, VERSAO, lerPecaResolvida, parteDaFace };

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const PECAS = join(REPO, 'prototipos/procedural/v3/pecas');

/* A LISTA É DECLARADA, e não "todas as peças". São 42 peças no acervo e o
   produto usa duas. Exportar as 42 encheria o repositório de arquivo que
   ninguém lê e faria o gate reprovar por peça que o cliente nunca vê.
   Quem precisar de uma peça nova no produto acrescenta o nome aqui, e o gate
   passa a cobrar essa também. */
export const PUBLICADAS = [];

export const DESTINO = join(REPO, 'pecas-resolvidas');
export const arquivoDaPeca = (nome, destino = DESTINO) => join(destino, `${nome}.json`);
export const arquivoDoManifesto = (destino = DESTINO) => join(destino, 'manifesto.json');

/* O LEITOR É UMA CÓPIA, E O MANIFESTO É A TRAVA DISSO.

   `src/autoria/ler-peca-resolvida.js` existe neste repositório e, idêntico, no
   do produto. O teste de ida-e-volta prova que escritor e leitor concordam
   AQUI; ele não diz nada sobre a cópia que roda no navegador do cliente.

   Sem trava, o modo de falhar é silencioso: alguém muda o formato aqui,
   atualiza as duas pontas daqui, todos os gates ficam verdes, a entrega passa.
   A cópia do produto continua velha e desenha errado — sem exceção, porque as
   duas regras são válidas, só não são a mesma.

   O hash é do TEXTO do leitor, com `\r\n` normalizado antes. Sem normalizar,
   um clone no Windows mudaria o hash sozinho e o produto reprovaria por causa
   de um `\r` — que é exatamente o que já derrubou o `mapa:check` e o
   `docs:toc:check` deste repositório sem uma linha de código ter mudado.

   Hash e VERSÃO são barreiras diferentes e as duas ficam: o hash impede cópia
   divergente, a versão impede interpretação incompatível. */
export const LEITOR_RELATIVO = 'src/autoria/ler-peca-resolvida.js';
export const CAMINHO_DO_LEITOR = join(REPO, LEITOR_RELATIVO);

export function hashDoLeitor() {
  const texto = readFileSync(CAMINHO_DO_LEITOR, 'utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(texto).digest('hex');
}

export function gerarManifesto(nomes = PUBLICADAS) {
  return {
    formato: FORMATO,
    versao: VERSAO,
    leitor: { arquivo: LEITOR_RELATIVO, sha256: hashDoLeitor() },
    pecas: [...nomes].sort(),
  };
}

const hash16 = (texto) => createHash('sha256').update(texto).digest('hex').slice(0, 16);

/* exportar peça com órfão publica no produto uma peça que ESTE repositório sabe
   estar errada, e o produto não tem como perceber: o arquivo chega com a mesma
   cara de um arquivo bom. O motivo do núcleo viaja junto porque uma recusa que
   não diz o porquê obriga quem recebe a refazer o diagnóstico. */
export function conferirSemOrfaos(nome, orfaos) {
  if (!orfaos || orfaos.length === 0) return;
  const primeiro = orfaos[0];
  throw new Error(
    `exportar-peca: a peça '${nome}' tem ${orfaos.length} órfão(s) e não pode virar dado. `
    + `Primeiro: passo ${primeiro.passo}, op '${primeiro.op}', ${primeiro.ref} — ${primeiro.motivo}`,
  );
}

/* O FORMATO LEVA V, F, materiais, partes, meta e portas opcionais. A porta é
   dado de autoria, mas transportá-la de forma ADITIVA mantém o artefato útil
   para uma bancada/cliente que já conhece esse contrato e inofensivo para o
   leitor antigo que só usa geometria. `esqueleto` ainda não viaja e continua
   recusado na cara.

   O motivo é o modo de falhar, não a falta em si. Uma peça com porta exportada
   hoje não daria erro: `lerPecaResolvida` devolve `partes: {}` e nenhum osso,
   então o produto carregaria uma peça muda — sem porta e sem esqueleto — com a
   mesma aparência de uma peça inteira. Ninguém veria, e o defeito só apareceria
   quando alguém tentasse usar a porta que sumiu.

   As duas peças publicadas hoje não usam nenhuma das duas, e é exatamente por
   isso que isto passou despercebido até alguém perguntar. */
export function conferirCapacidadesTransportaveis(nome, bruto) {
  const faltantes = [];
  if (bruto.esqueleto) faltantes.push('esqueleto');
  if (bruto.pesos?.size) faltantes.push(`peso de osso em ${bruto.pesos.size} vértice(s)`);
  if (Object.values(bruto.partes ?? {}).some((parte) => parte?.pai)) {
    faltantes.push('hierarquia de partes');
  }
  if (faltantes.length === 0) return;

  throw new Error(
    `exportar-peca: a peça '${nome}' publica ${faltantes.join(' e ')}, `
    + `e o formato ${FORMATO} v${VERSAO} não transporta isso. `
    + 'Exportar assim entregaria ao produto uma peça muda, sem erro. '
    + 'Ou a peça sai da lista de publicadas, ou o formato cresce e a versão sobe.',
  );
}

function portasParaArtefato(portas) {
  if (!(portas instanceof Map)) return [];
  return [...portas.values()].map((porta) => JSON.parse(JSON.stringify(porta)));
}

export async function exportarPeca(nome, { paramsExtra = null, modulo = null } = {}) {
  const caminho = join(PECAS, `${nome}.js`);
  /* A fronteira de disco é opcional: produção usa nome explícito do acervo;
     testes e hosts podem fornecer uma receita já carregada. */
  if (modulo === null && !existsSync(caminho)) {
    throw new Error(`exportar-peca: a peça '${nome}' não existe em ${PECAS}`);
  }

  const mod = modulo ?? await import(pathToFileURL(caminho).href);
  if (!Array.isArray(mod.PASSOS)) {
    throw new Error(`exportar-peca: a peça '${nome}' não exporta PASSOS; não é peça procedural`);
  }

  const { entrada, neutro: bruto } = executarReceita(mod, { paramsExtra });
  conferirSemOrfaos(nome, bruto.orfaos);
  conferirCapacidadesTransportaveis(nome, bruto);

  const canon = neutroCanonico(bruto);

  const partes = [...new Set(canon.F.map(parteDaFace).filter(Boolean))].sort();

  /* ordem das chaves FIXA e escrita à mão. `formato` e `versao` vêm primeiro
     para quem lê poder recusar um arquivo que não entende antes de tentar
     interpretar a geometria. */
  const dado = {
    formato: FORMATO,
    versao: VERSAO,
    peca: nome,
    receita: hash16(JSON.stringify(entrada)),
    /* `meta` por LISTA BRANCA. Medido: o produto lê um campo só, `meta.nome`,
       para nomear a raiz do grupo Three.js. A peça publica mais — `tipo`,
       `desc`, `fechada` e `colisao` — e nenhum atravessa.

       Os quatro não são inofensivos por serem pequenos: são superfície de
       formato que ninguém revisou cruzando a fronteira entre dois
       repositórios. `colisao` é dado de AUTORIA, com float cru, nascido de
       outro propósito; `desc` é a descrição do autor, e o texto que o cliente
       lê pertence ao domínio do produto.

       Campo que ganhar consumidor real entra numa versão NOVA do formato, com
       teste próprio. Entrar "porque já estava lá" é como toda superfície de
       compatibilidade começa. */
    meta: { nome: mod.meta?.nome ?? nome },
    materiais: entrada.MATERIAIS,
    partes,
    portas: portasParaArtefato(bruto.portas),
    V: canon.V,
    F: canon.F,
  };

  return {
    dado,
    texto: `${JSON.stringify(dado, null, 2)}\n`,
    doNucleo: { V: canon.V, F: canon.F },
    orfaos: bruto.orfaos,
  };
}

/* ---------- gravar e conferir ----------

   O RISCO QUE O `conferir` COBRE não é o arquivo nascer errado; os treze casos
   de `exportar-peca.test.ts` cobrem isso. É alguém mudar a peça e esquecer de
   gerar de novo. Aí o produto mostra a peça de ontem, com a mesma cara de
   sempre, e nenhum teste do núcleo percebe — porque do lado do núcleo está
   tudo certo.

   Por isso o conferir compara o TEXTO INTEIRO, e não só a marca da receita:
   marca igual com conteúdo diferente ainda é arquivo errado, e eu não quero
   depender de a marca estar correta para descobrir que a marca está correta. */

/* `destino` e argumento, e o padrao e a pasta de verdade.

   POR QUE ISSO EXISTE. A primeira versao destes testes chamava
   `gravarPublicadas()` sem argumento e reescrevia `pecas-resolvidas/` DE
   VERDADE. O efeito era pior do que sujar a arvore de quem roda `npm test`:
   no CI, `Unit Tests` roda ANTES de `exportar:check`, entao a suite
   regenerava os arquivos e o gate nunca podia reprovar. Ele existia, rodava,
   e passava sempre — a condicao que nao pode falhar.

   Achei porque o gate devolveu 0 onde eu esperava 1, e fui atras em vez de
   aceitar o verde. */
export async function gravarPublicadas(nomes = PUBLICADAS, destino = DESTINO) {
  mkdirSync(destino, { recursive: true });
  const feitas = [];
  for (const nome of nomes) {
    const { texto } = await exportarPeca(nome);
    writeFileSync(arquivoDaPeca(nome, destino), texto, 'utf8');
    feitas.push({ nome, arquivo: arquivoDaPeca(nome, destino), bytes: Buffer.byteLength(texto) });
  }
  /* o manifesto vem por ULTIMO, depois de todas as peças terem sido gravadas.
     Se uma peça for recusada no meio, ele não chega a existir com a lista
     errada. */
  const texto = `${JSON.stringify(gerarManifesto(nomes), null, 2)}\n`;
  writeFileSync(arquivoDoManifesto(destino), texto, 'utf8');
  feitas.push({ nome: 'manifesto', arquivo: arquivoDoManifesto(destino), bytes: Buffer.byteLength(texto) });
  return feitas;
}

export async function conferirPublicadas(nomes = PUBLICADAS, destino = DESTINO) {
  const problemas = [];

  /* o MANIFESTO primeiro. Se o leitor mudou e ele ficou velho, a cópia do outro
     repositório está divergente, e isso vale mais que qualquer peça estar em
     dia: um arquivo perfeito lido com a regra errada desenha errado. */
  const alvoManifesto = arquivoDoManifesto(destino);
  if (!existsSync(alvoManifesto)) {
    problemas.push({ nome: 'manifesto', motivo: 'o manifesto não existe; rode `npm run exportar`' });
  } else {
    const gravado = readFileSync(alvoManifesto, 'utf8').replace(/\r\n/g, '\n');
    const esperado = `${JSON.stringify(gerarManifesto(nomes), null, 2)}\n`;
    if (gravado !== esperado) {
      const antigo = (() => { try { return JSON.parse(gravado); } catch { return null; } })();
      const motivo = antigo && antigo.leitor?.sha256 !== hashDoLeitor()
        ? `o LEITOR (${LEITOR_RELATIVO}) mudou e o manifesto ficou velho; a cópia do produto está divergente. Rode \`npm run exportar\` e leve o leitor e o manifesto juntos`
        : 'o manifesto está desatualizado; rode `npm run exportar`';
      problemas.push({ nome: 'manifesto', motivo });
    }
  }

  for (const nome of nomes) {
    const alvo = arquivoDaPeca(nome, destino);
    const { texto } = await exportarPeca(nome);
    if (!existsSync(alvo)) {
      problemas.push({ nome, motivo: 'arquivo não existe; rode `npm run exportar`' });
      continue;
    }
    /* `\r\n` some na comparação: um clone no Windows não pode reprovar o gate
       por fim de linha, como já aconteceu com o mapa e o índice. */
    const gravado = readFileSync(alvo, 'utf8').replace(/\r\n/g, '\n');
    if (gravado !== texto) {
      problemas.push({ nome, motivo: 'o arquivo está DESATUALIZADO em relação à receita; rode `npm run exportar`' });
    }
  }
  return problemas;
}
