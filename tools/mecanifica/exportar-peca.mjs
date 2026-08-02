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
     · `meta`      — nome, descrição, se a casca é fechada e a colisão.

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

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const PECAS = join(REPO, 'prototipos/fps/v3/pecas');

export const FORMATO = 'mecanifica.peca-resolvida';
export const VERSAO = 1;

/* A LISTA É DECLARADA, e não "todas as peças". São 42 peças no acervo e o
   produto usa duas. Exportar as 42 encheria o repositório de arquivo que
   ninguém lê e faria o gate reprovar por peça que o cliente nunca vê.
   Quem precisar de uma peça nova no produto acrescenta o nome aqui, e o gate
   passa a cobrar essa também. */
export const PUBLICADAS = ['freio-disco', 'roda-dianteira'];

export const DESTINO = join(REPO, 'pecas-resolvidas');
export const arquivoDaPeca = (nome) => join(DESTINO, `${nome}.json`);

const hash16 = (texto) => createHash('sha256').update(texto).digest('hex').slice(0, 16);

/* a face guarda a parte na cauda opcional da linha canônica. `parteDaFace` faz
   a mesma pergunta que o canon faz, num lugar só, para o produto e o gate não
   discordarem sobre o que conta como parte. */
export function parteDaFace(linha) {
  for (let k = linha.length - 1; k >= 6; k--) {
    if (typeof linha[k] === 'string') return linha[k];
  }
  return null;
}

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

/* a outra metade do contrato. O exportador escreve linhas; o adaptador quer
   Mapas com face.id, face.vs e face.parte. Sem este leitor o formato seria
   apenas um arquivo bonito que ninguém consegue desenhar.

   Ele mora AQUI, junto do escritor, de propósito: quem muda o formato vê as
   duas pontas no mesmo arquivo. Duas cópias em repositórios diferentes
   divergem, e a divergência aparece como peça torta na tela do cliente. */
export function lerPecaResolvida(dado) {
  if (dado?.formato !== FORMATO) {
    throw new Error(`ler-peca: formato desconhecido '${dado?.formato}' (esperado '${FORMATO}')`);
  }
  if (dado.versao !== VERSAO) {
    throw new Error(`ler-peca: versão ${dado.versao} não suportada (esta ferramenta lê a ${VERSAO})`);
  }

  const V = new Map();
  for (const linha of dado.V) V.set(linha[0], [linha[1], linha[2], linha[3]]);

  const F = new Map();
  for (const linha of dado.F) {
    const face = {
      id: linha[0],
      vs: linha[1].slice(),
      cor: linha[2] ?? null,
      material: linha[3] ?? null,
      liso: !!linha[4],
      solido: !!linha[5],
    };
    const parte = parteDaFace(linha);
    if (parte) face.parte = parte;
    F.set(face.id, face);
  }

  /* `orfaos` vazio não é otimismo: o exportador RECUSA gravar peça com órfão,
     então todo arquivo que chega aqui já passou por aquela guarda. */
  return { V, F, orfaos: [], merges: [], partes: {}, materiais: dado.materiais ?? {} };
}

export async function exportarPeca(nome, { paramsExtra = null } = {}) {
  const caminho = join(PECAS, `${nome}.js`);
  /* referência inválida falha com diagnóstico; nunca vira no-op silencioso. */
  if (!existsSync(caminho)) {
    throw new Error(`exportar-peca: a peça '${nome}' não existe em ${PECAS}`);
  }

  const { nucleo, neutroCanonico } = await import(
    pathToFileURL(join(REPO, 'prototipos/fps/v3/motor/oficina.js')).href
  );
  const mod = await import(pathToFileURL(caminho).href);
  if (!Array.isArray(mod.PASSOS)) {
    throw new Error(`exportar-peca: a peça '${nome}' não exporta PASSOS; não é peça procedural`);
  }

  const PARAMS = paramsExtra ? { ...(mod.PARAMS ?? {}), ...paramsExtra } : (mod.PARAMS ?? {});
  const entrada = {
    PASSOS: mod.PASSOS,
    PARAMS,
    TOPO: mod.TOPO ?? {},
    MATERIAIS: mod.MATERIAIS ?? {},
    ESQUELETO: mod.ESQUELETO ?? null,
    ALIASES: mod.ALIASES ?? [],
  };

  const bruto = nucleo(
    entrada.PASSOS, entrada.PARAMS, entrada.TOPO,
    entrada.MATERIAIS, entrada.ESQUELETO, entrada.ALIASES,
  );
  conferirSemOrfaos(nome, bruto.orfaos);

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
    meta: mod.meta ?? { nome },
    materiais: entrada.MATERIAIS,
    partes,
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

export async function gravarPublicadas(nomes = PUBLICADAS) {
  mkdirSync(DESTINO, { recursive: true });
  const feitas = [];
  for (const nome of nomes) {
    const { texto } = await exportarPeca(nome);
    writeFileSync(arquivoDaPeca(nome), texto, 'utf8');
    feitas.push({ nome, arquivo: arquivoDaPeca(nome), bytes: Buffer.byteLength(texto) });
  }
  return feitas;
}

export async function conferirPublicadas(nomes = PUBLICADAS) {
  const problemas = [];
  for (const nome of nomes) {
    const alvo = arquivoDaPeca(nome);
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
