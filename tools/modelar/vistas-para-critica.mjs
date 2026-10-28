#!/usr/bin/env node
/* vistas-para-critica.mjs — monta, numa chamada, o pacote que a crítica visual precisa receber: as imagens e o pedido pronto.
 *
 * POR QUE ELE EXISTE. A skill do laço manda despachar o crítico "com a imagem
 * de referência, as vistas renderizadas e os critérios", e nunca diz qual
 * comando produz essas vistas. Sem o nome do comando escrito, quem conduz pega
 * a primeira captura que responde, e foi assim que uma crítica desta casa foi
 * feita sobre a tela da bancada, com o objeto ocupando um quarto do quadro e
 * cercado de botões. O crítico deu como ausente um flange que existia na malha.
 *
 * O PACOTE TEM DUAS CAMADAS. As quatro vistas do objeto inteiro respondem
 * proporção e silhueta. Uma vista isolada por parte responde outra pergunta,
 * que nenhuma medida alcança: se aquela parte tem a forma e a técnica que o
 * plano prometeu. O punho desta casa foi prometido com forquilha vazada de
 * lado a lado e entregue maciço; pontos, contatos e `guarda:acervo` passaram
 * todos, e só a vista isolada mostrou.
 *
 * A LISTA DE PARTES VEM DO PLANO, e não da malha. Parte prometida e não
 * entregue precisa aparecer no pacote como ausência, e uma lista tirada da
 * malha entregaria só o que existe, que é justamente o que não se quer
 * perguntar.
 *
 * O PEDIDO VEM DA FERRAMENTA. Quem conduzia o laço escrevia a mão, a cada rodada, o pedido ao crítico: dezenas de caminhos de imagem, a
 * promessa de cada parte copiada do `PLANO`, os critérios, as perguntas e o limite de 240 caracteres dos campos do veredito, e numa
 * rodada esqueceu as vistas do avião montado. Agora `pedido.md`, na pasta da rodada, sai pronto da receita, na ordem alvo, referências,
 * modelo, montado, sobreposição, partes, critérios e perguntas, com o lado de onde cada vista olha. Ele não conta como a peça foi feita.
 *
 * O QUE MAIS A PASTA TRAZ, quando a receita permite:
 *  - o alvo novo, quando ela declara `REFINA.esboco`: a composta da unidade do esboço, gerada agora pela ferramenta do esboço sobre uma
 *    cópia do arquivo declarado, e nunca a imagem guardada, que pode ser de uma versão anterior do esboço;
 *  - as vistas montadas, quando a peça é uma instância de `<objeto>/montagem.json`: as etapas já construídas juntas, com o quadro na
 *    caixa da peça. Duas vezes o crítico errou por ver a peça pequena demais no conjunto: leu um degrau na junta do capô, e a deriva
 *    mais grossa do que é;
 *  - a sobreposição dos cortes do modelo com os do sólido do esboço (`sobreposicao-de-cortes.mjs`), que foi o que desfez esses dois erros.
 *
 * Uso: node tools/modelar/vistas-para-critica.mjs <peça> [--saida=<pasta da rodada>] */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { linhaDaVista } from '../../modulos/esboco/src/lados.js';
import { mensagemDeReferenciasAusentes, referenciasDoPlano } from './referencias-do-plano.mjs';
import { lerPlano } from '../../modulos/esboco/src/plano.js';
import { vistaDoMesmoOlho } from '../../modulos/esboco/src/referencia.js';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { lerPergunta } from '../../src/autoria/perguntas-do-critico.js';
import { textoDoAfastamento } from '../../src/autoria/refinamento-global.js';
import { lerArgumentos } from './argumentos.mjs';
import { vistaDoNome } from './esboco-referencia.mjs';
import { abrirCapturaCompartilhada, olharBancada } from './olhar-bancada.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { blocoDasPerguntas, perguntasDaPecaArquivo } from './perguntas-da-peca.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SAIDA_PADRAO = join(REPO, 'tools/bancadas/out');

/* Quadro alto por padrão. Peça de máquina costuma ser mais alta que larga, e
   num quadro 16 por 9 a silhueta vertical sai cortada ou minúscula — a própria
   checagem de câmera da bancada reclama disso. */
export const RES_CONJUNTO = '1100x1450';
export const RES_PARTE = '900x900';
export const VISTAS_DO_CONJUNTO = 'isometrica,frontal,direita,superior';
export const VISTAS_DA_PARTE = 'direita,isometrica';
export const VISTAS_DO_ARAME = 'isometrica,traseira';
/* As vistas do conjunto montado, com o quadro na peça: as seis que o conjunto da peça sozinha tem, mais a de baixo, em quadro mais
   quadrado que o da bancada, porque o quadro fecha na caixa da peça e a folga da forma dela é que decide o que sobra. A de baixo
   entrou porque o alojamento do trem do nariz, que abre para baixo, só se confirmava nos cortes. */
export const VISTAS_MONTADAS = ['isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior'];
export const QUADRO_MONTADO = Object.freeze({ largura: 1200, altura: 1000 });
/* O prazo da captura montada: seis vistas do avião inteiro até a peça, com o servidor e o navegador subindo junto, passam dos 45 s que a
   captura de uma vista de teste tem de padrão, e estouraram com dois pacotes rodando ao mesmo tempo. */
export const PRAZO_DA_CAPTURA_MONTADA_MS = 240_000;

/* A pergunta de forma que o alvo vindo do esboço pede: ele passou por dois críticos com o para-brisa saliente, e só a pessoa o viu. */
/* As partes que o `REFINA.esboco` declara afastadas do esboço de propósito (deslocamento ou alongamento, com o motivo), em texto para o
   pedido: o crítico do trem do nariz mediu como defeito a descida de 17 mm que a pessoa tinha decidido, porque o pedido não a dizia. */
export function afastamentosDeclarados(declarado) {
  if (!declarado?.ligadas) return [];
  return Object.entries(declarado.ligadas)
    .map(([parte, ligada]) => ({ parte, texto: typeof ligada === 'object' && !Array.isArray(ligada) ? textoDoAfastamento(ligada) : '' }))
    .filter(({ texto }) => texto)
    .sort((a, b) => a.parte.localeCompare(b.parte));
}

/* As partes que o `REFINA.novas` declara, pedidas além do esboço: o alvo não as tem, e o crítico precisa saber que não são sobra. */
export function novasDeclaradas(receita) {
  const novas = receita?.REFINA?.novas;
  if (!novas) return [];
  const lista = Array.isArray(novas) ? novas : Object.entries(novas).map(([parte, motivo]) => ({ parte, motivo }));
  return lista.map(({ parte, motivo }) => ({ parte, texto: `parte nova, que o alvo não tem; motivo: ${motivo}` }));
}

export const PERGUNTA_DO_ALVO = 'Onde o alvo difere da referência real, em silhueta ou em forma?';
export const LIMITE_DO_VEREDITO = 240;

/* As imagens velhas da peça saem antes de cada pacote. A vista de trás sem
   arame não era gerada aqui, e a de uma captura antiga ficava na pasta com o
   mesmo nome: em 2026-09-24 três ajustes do ombro foram julgados sobre ela sem
   ninguém perceber que era mais velha que a receita. */
export function prefixoDaPeca(peca) {
  return `bancada-${peca.replace(/[\\/]/g, '-')}-`;
}

function apagarImagensAntigas(peca, pasta) {
  const prefixo = prefixoDaPeca(peca);
  for (const nome of readdirSync(pasta)) {
    if (nome.startsWith(prefixo) && nome.endsWith('.png')) rmSync(join(pasta, nome));
  }
}

/** A pasta da rodada de uma peça: `critica-<peça>` ao lado das capturas da bancada. */
export function pastaDaRodada(peca, base = SAIDA_PADRAO) {
  return join(base, `critica-${peca.replace(/[^A-Za-z0-9._-]+/g, '-')}`);
}

/* Só o que esta ferramenta grava na pasta da rodada sai antes de cada pacote, e nunca a pasta inteira: `--saida` pode ser uma pasta
   que tem mais coisa. Imagem velha ali é imagem julgada sem ninguém perceber que é mais velha que a receita. */
function limparPastaDaRodada(pasta) {
  if (!existsSync(pasta)) return;
  rmSync(join(pasta, 'pedido.md'), { force: true });
  rmSync(join(pasta, 'alvo'), { recursive: true, force: true });
  for (const nome of readdirSync(pasta)) {
    if (/^(etapas|sobreposicao)-.*\.png$/.test(nome)) rmSync(join(pasta, nome));
  }
}

export function partesDoPlano(receita) {
  const partes = receita?.PLANO?.partes;
  if (!Array.isArray(partes) || partes.length === 0) return [];
  return partes.map((parte) => parte?.nome).filter((nome) => typeof nome === 'string' && nome);
}

/* ---------- o lado de onde cada vista olha ---------- */

/* Cada vista da bancada e da montagem é, em olho, uma vista do esboço (`modulos/esboco/src/lados.js`), que já sabe dizer de onde ela olha
   e, com a orientação do esboço, o lado do objeto que ela mostra. */
const VISTA_DO_ESBOCO = Object.freeze({
  isometrica: 'isometrica', frontal: 'frontal', direita: 'lateral', esquerda: 'lateral-oposta', traseira: 'frontal-oposta', superior: 'superior', inferior: 'inferior',
});

/** Onde a vista da bancada olha, em texto ("olha de +x e vê o lado direito; ..."), ou null para uma vista que não existe. */
export function ladoDaVista(vista, orientacao = null) {
  const nome = VISTA_DO_ESBOCO[vista];
  return nome === undefined ? null : linhaDaVista(nome, orientacao).slice(nome.length + 2);
}

/** A vista de uma captura da bancada, pelo nome do arquivo (`bancada-<peça>-<vista>[-opções].png`), ou null se não achar. */
export function vistaDoArquivo(arquivo, peca) {
  let nome = basename(arquivo);
  const prefixo = prefixoDaPeca(peca);
  if (nome.startsWith(prefixo)) nome = nome.slice(prefixo.length);
  return /^(isometrica|frontal|traseira|direita|esquerda|superior|inferior)(?=-|\.png$)/.exec(nome)?.[1]
    ?? /-(isometrica|frontal|traseira|direita|esquerda|superior|inferior)(?=-|\.png$)/.exec(nome)?.[1] ?? null;
}

/** O que a composta do esboço mostra, na ordem da grade: isométrica e frontal em cima, lateral e superior embaixo. */
export const VISTAS_DA_COMPOSTA = ['isometrica', 'frontal', 'lateral', 'superior'];

/* ---------- a escolha da unidade do alvo ---------- */

/**
 * A unidade do esboço que o alvo desenha: a que tem mais das formas que o `REFINA.esboco` liga, lida em `dados` (a saída de
 * `formasDoEsboco`, onde cada forma traz a `unidade` em que o esboço a declarou). Empate de contagem vai para o nome que vem primeiro.
 * `ids` são as formas ligadas. Devolve `{ unidade, contagem, semUnidade, ausentes }`: `unidade` é null quando nenhuma forma ligada
 * declara unidade (então o alvo é o esboço inteiro), `contagem` diz quantas formas ligadas cada unidade tem, `semUnidade` os ids
 * ligados que não declaram unidade e `ausentes` os que a opção não tem.
 */
export function unidadeDoAlvo(dados, ids) {
  const porId = new Map((dados?.formas ?? []).map((forma) => [forma.id, forma]));
  const contagem = {};
  const semUnidade = [];
  const ausentes = [];
  for (const id of ids) {
    const forma = porId.get(id);
    if (!forma) { ausentes.push(id); continue; }
    if (typeof forma.unidade === 'string' && forma.unidade) contagem[forma.unidade] = (contagem[forma.unidade] ?? 0) + 1;
    else semUnidade.push(id);
  }
  const unidade = Object.entries(contagem).sort(([a, n], [b, m]) => (m - n) || (a < b ? -1 : a > b ? 1 : 0))[0]?.[0] ?? null;
  return { unidade, contagem, semUnidade, ausentes };
}

/* ---------- as referências do plano ---------- */

/* As imagens que `PLANO.referencias` cita moram em `referencias-do-plano.mjs`, que o `descrever-peca` também lê sem carregar a captura. */
export { referenciasDoPlano };

/* ---------- o pedido ---------- */

const lista = (itens) => itens.map((item) => `- ${item}`);
const mm = (n) => String(n).replace('.', ',');

/* O olho de uma imagem de referência: o do lado que o nome do arquivo diz (lateral, frontal, topo), com a vista do esboço que olha do
   mesmo lado que ela, ou nada quando o nome não diz. */
function olhoDaReferencia(caminho, orientacao) {
  const vista = vistaDoNome(caminho);
  if (!['frontal', 'lateral', 'superior'].includes(vista)) return null;
  const nome = vistaDoMesmoOlho(vista, orientacao).vista;
  return linhaDaVista(nome, orientacao).slice(nome.length + 2);
}

/**
 * O pedido ao crítico, em Markdown, de dados já resolvidos. Puro: não lê arquivo nem roda captura.
 *
 * `peca` é o nome da peça; `plano` o `PLANO` normalizado (ou null); `orientacao` a do esboço (ou null); `alvo` é
 * `{ imagem, unidade }` quando a receita refina um esboço (e null sem); `referencias` as imagens `{ caminho }`; `modelo` as imagens
 * do conjunto `{ arquivo, vista }` e `arame` as da malha `{ arquivo, vista, tipo }`; `montado` é `{ instancia, imagens: [{ arquivo,
 * vista }] }` ou null; `sobreposicao` é `{ arquivos, notas }` ou null; `partes` são `{ nome, imagens: [{ arquivo, vista }] }` na ordem do
 * plano; `perguntas` as perguntas específicas da peça.
 */
export function montarPedido({ peca, plano = null, orientacao = null, alvo = null, afastamentos = [], referencias = [], modelo = [], arame = [], montado = null, sobreposicao = null, partes = [], perguntas = [] }) {
  const imagem = ({ arquivo, vista, tipo }) => `${vista}${tipo ? `, ${tipo}` : ''}: ${arquivo}`;
  /* O lado de cada vista é dito uma vez, em Modelo, e vale pelo nome para o modelo, o montado e as partes: dito junto de cada imagem,
     o mesmo texto longo se repetia mais de vinte vezes na peça de onze partes. */
  const usadas = new Set([...modelo, ...arame, ...(montado?.imagens ?? []), ...partes.flatMap((p) => p.imagens)].map((i) => i.vista));
  const vistasDoPedido = Object.keys(VISTA_DO_ESBOCO).filter((vista) => usadas.has(vista));
  const L = [`# Pedido ao crítico visual: ${peca}`, '', 'Abra com `Read` cada imagem citada abaixo e olhe; não leia nenhum outro arquivo. Todos os caminhos são absolutos.', ''];

  if (plano) {
    L.push('## Objeto', '', plano.objeto, '', `Escala: ${plano.escala.medida}, ${mm(plano.escala.milimetros)} mm.`, '');
  }

  L.push('## Alvo', '');
  if (alvo) {
    L.push(
      `O alvo é a composta ${alvo.unidade ? `da unidade \`${alvo.unidade}\`` : 'do esboço inteiro'} do esboço aprovado: as quatro vistas numa imagem de duas por duas, sem legenda, `
      + 'a isométrica e a frontal em cima, a lateral e a superior embaixo. A nota do veredito é a fidelidade do modelo a ela, e `alvo` do veredito leva este caminho:',
      '', `- ${alvo.imagem}`, '', 'De onde cada vista da composta olha:', '',
      ...lista(VISTAS_DA_COMPOSTA.map((vista) => `${vista}: ${linhaDaVista(vista, orientacao).slice(vista.length + 2)}`)),
    );
    if (afastamentos.length) {
      L.push(
        '', 'A pessoa decidiu que estas partes se afastam do alvo de propósito, e a receita o declara. O afastamento dito aqui não é defeito; '
        + 'julgue o resto da forma delas contra o alvo, e aponte só a diferença que passa do que está declarado. Os vetores estão em mm, '
        + 'no quadro do esboço, com y para cima:', '',
        ...lista(afastamentos.map(({ parte, texto }) => `${parte}: ${texto}`)),
      );
    }
  } else {
    L.push('A receita não refina um esboço aprovado, e o alvo é a referência da seção seguinte: `alvo` do veredito leva o caminho da imagem de referência que você comparou.');
  }
  L.push('');

  L.push('## Referências', '');
  if (referencias.length) {
    L.push(
      alvo
        ? 'O objeto real, em outra escala que o modelo e sem a divisão em partes. A nota não é contra elas: elas servem à pergunta de forma sobre onde o alvo difere da referência real, mais abaixo.'
        : 'O objeto real, em outra escala que o modelo e sem a divisão em partes.',
      '',
      ...lista(referencias.map(({ caminho }) => {
        const olho = olhoDaReferencia(caminho, orientacao);
        return `${basename(caminho)}: ${caminho}${olho ? ` (o olho da imagem: ${olho})` : ''}`;
      })),
    );
  } else {
    L.push('O plano não cita imagem de referência.');
  }
  L.push('');

  L.push(
    '## Modelo', '',
    'As vistas do modelo, do conjunto montado e de cada parte olham, pelo nome, destes lados:', '',
    ...lista(vistasDoPedido.map((vista) => `${vista}: ${ladoDaVista(vista, orientacao)}`)), '',
    'As vistas da peça sozinha, em projeção ortográfica, para a proporção e a silhueta:', '',
    ...lista(modelo.map(imagem)), '',
    'A malha em arame e em raio X, para a topologia que a sombra esconde:', '',
    ...lista(arame.map(imagem)), '',
  );

  if (montado) {
    L.push(
      '## Montado', '',
      `O objeto montado até aqui, com a peça \`${montado.instancia}\` no centro do quadro, grande, e as outras peças ao redor, só para dar o contexto e a posição dela. O quadro fecha na caixa da peça, com uma folga, e as vistas olham dos lados descritos em Modelo:`, '',
      ...lista(montado.imagens.map(imagem)), '',
    );
  }

  if (sobreposicao) {
    L.push(
      '## Sobreposição', '',
      'Os cortes planos do modelo sobre os do sólido do alvo, na mesma escala: o alvo em vermelho grosso e o modelo em azul fino por cima, três cortes por eixo, cada um visto de frente, '
      + 'com a escala e uma barra de comprimento conhecido escritas no painel. Onde só o vermelho aparece, o alvo tem linha que o modelo não tem, e onde só o azul aparece, o contrário. '
      + 'Cada painel tem a escala dele: converta a diferença em pixels pela escala escrita antes de dar o tamanho dela.', '',
      ...lista(sobreposicao.arquivos.map((arquivo) => `${basename(arquivo, '.png').replace('sobreposicao-', 'cortes em ')}: ${arquivo}`)), '',
    );
    for (const nota of sobreposicao.notas ?? []) L.push(`Fora da sobreposição: ${nota}.`, '');
  }

  if (partes.length) {
    L.push('## Partes', '', 'Uma vista isolada de cada parte, olhando dos lados descritos em Modelo, com a forma e a técnica que o plano prometeu para ela. Diga, em uma linha por parte, se a forma que você vê é a prometida; parte prometida que não aparece na imagem é ausência.', '');
    for (const { nome, imagens } of partes) {
      const prometida = plano?.partes.find((p) => p.nome === nome);
      L.push(`### ${nome}`, '');
      if (prometida) L.push(`Forma prometida: ${prometida.forma}`, '', `Técnica prometida: ${prometida.tecnica}`, '');
      L.push(...lista(imagens.map(imagem)), '');
    }
  }

  if (plano?.criteriosDeReprovacao?.length) {
    L.push('## Critérios de reprovação', '', ...lista(plano.criteriosDeReprovacao), '');
  }

  const bloco = blocoDasPerguntas(perguntas);
  if (bloco) L.push('## Perguntas', '', bloco, '');

  L.push('## Veredito', '', `No veredito em JSON, \`onde\`, \`evidencia\` e \`observacao\` têm até ${LIMITE_DO_VEREDITO} caracteres cada, porque o registro recusa o mais longo; o detalhe vai no texto da resposta.`, '');
  return `${L.join('\n')}`;
}

/* ---------- o alvo, a vista montada e a sobreposição ---------- */

/* A opção que a receita refina precisa ser a primeira do esboço: a composta de uma unidade desenha a primeira opção, e um alvo da opção
   errada seria um alvo de outra forma. */
function exigirPrimeiraOpcao(declarado, bruto) {
  const primeira = bruto?.opcoes?.[0]?.titulo;
  if (declarado.opcao === 1 || (typeof declarado.opcao === 'string' && declarado.opcao === primeira)) return;
  throw new Error(`o alvo é a composta da primeira opção do esboço, e REFINA.esboco.opcao é ${JSON.stringify(declarado.opcao)}; a composta da opção que a receita refina ainda não sai por aqui.`);
}

/**
 * O alvo novo de uma receita que declara `REFINA.esboco`: copia o esboço declarado para `pasta/alvo` e gera a composta da unidade
 * dele, com a ferramenta do esboço (`npm run esboco -- <cópia> --unidade <unidade> --composta`), nunca a imagem guardada. Devolve
 * `{ copia, imagem, unidade, escolha }`.
 */
export async function gerarAlvo({ declarado, bruto, dados, pasta, dependencias = {} }) {
  exigirPrimeiraOpcao(declarado, bruto);
  const ids = [...new Set(Object.values(declarado.ligadas).flatMap((v) => (Array.isArray(v) ? v : v.formas)))].sort();
  const escolha = unidadeDoAlvo(dados, ids);
  const { copia, imagem } = await gerarCompostaDaUnidade({ arquivo: declarado.esboco, unidade: escolha.unidade, pasta, dependencias });
  return { copia, imagem, unidade: escolha.unidade, escolha };
}

/**
 * A composta de uma unidade do esboço, gerada agora pela ferramenta do esboço: copia o `arquivo` (o `.esboco.json`) para `pasta/alvo` e
 * roda a composta sobre a cópia (a unidade `null` desenha o esboço inteiro). É o que o pacote do crítico faz para o alvo, e o que a receita
 * planejada (`receita-planejada.mjs`) usa para gravar o alvo ao lado da receita. Devolve `{ copia, imagem }`.
 */
export async function gerarCompostaDaUnidade({ arquivo, unidade, pasta, dependencias = {} }) {
  const pastaDoAlvo = join(pasta, 'alvo');
  mkdirSync(pastaDoAlvo, { recursive: true });
  const copia = join(pastaDoAlvo, basename(arquivo));
  copyFileSync(arquivo, copia);
  const composta = dependencias.composta ?? (async (destino, opcoes) => (await import('./esboco.mjs')).compostaArquivo(destino, opcoes));
  const feita = await composta(copia, { unidade });
  return { copia, imagem: feita.destino };
}

/** A montagem `<objeto>/montagem.json` de uma peça `<objeto>/<parte>` e a instância dela, ou null se a peça não é instância de uma. */
export function montagemDaPeca(peca, { raiz = REPO } = {}) {
  const partida = /^([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)$/.exec(peca);
  if (!partida) return null;
  const arquivo = join(raiz, 'procedural/pecas', partida[1], 'montagem.json');
  if (!existsSync(arquivo)) return null;
  const montagem = JSON.parse(readFileSync(arquivo, 'utf8'));
  const instancias = (montagem.instancias ?? []).filter((i) => i?.alvo?.tipo === 'peca' && i.alvo.ref === peca).map((i) => i.id);
  return instancias.length ? { arquivo, instancia: instancias[0], instancias } : null;
}

/* ---------- o pacote ---------- */

/* A SAÍDA NÃO É DECLARADA, e isso é decisão e não esquecimento. Quando `saida`
   vem preenchida, a bancada recusa a captura se já houver imagem daquela
   rodada ali, para não sobrescrever artefato de revisão. Este comando é feito
   para ser chamado a cada rodada sobre a mesma peça, então declarar a pasta
   faria ele falhar sempre a partir da segunda vez. A primeira versão deste
   arquivo declarava, falhava, e imprimia lista vazia sem reclamar — o mesmo
   silêncio que este repositório já caçou três vezes.

   `saida` é a pasta da rodada, onde saem o pedido, o alvo, as vistas montadas e a sobreposição; as capturas da bancada continuam em
   `tools/bancadas/out`, com os nomes de sempre. `dependencias` troca o que o teste não quer pagar. */
export async function vistasParaCritica(peca, { logger = null, saida = null, pastaDasCapturas = SAIDA_PADRAO, dependencias = {} } = {}) {
  const dep = {
    olharBancada,
    abrirCaptura: abrirCapturaCompartilhada,
    esbocoDeclarado: async (p) => (await import('./forma-do-esboco.mjs')).esbocoDeclarado(p),
    formasDoEsboco: async (bruto, opcao) => (await import('./esboco-solido.mjs')).formasDoEsboco(bruto, opcao),
    olharEtapas: async (arquivo, opcoes) => (await import('./etapas-da-montagem.mjs')).olharEtapas(arquivo, opcoes),
    sobreposicaoDeCortes: async (opcoes) => (await import('./sobreposicao-de-cortes.mjs')).sobreposicaoDeCortes(opcoes),
    ...dependencias,
  };
  const caminho = resolverCaminhoReceita(peca);
  const receita = receitaDoModulo(await importarReceita(caminho));
  const partes = partesDoPlano(receita);
  /* o que se confere antes de gastar minutos em captura: o plano, as imagens de referência e o esboço que a receita refina */
  const plano = normalizarPlanoDeModelagem(receita.PLANO);
  const referencias = referenciasDoPlano(plano, { pastaDaReceita: dirname(caminho) });
  if (referencias.ausentes.length) {
    throw new Error(mensagemDeReferenciasAusentes(referencias.ausentes));
  }
  const declarado = await dep.esbocoDeclarado(peca);
  let bruto = null;
  if (declarado) {
    try {
      bruto = JSON.parse(readFileSync(declarado.esboco, 'utf8'));
    } catch (erro) {
      throw new Error(`não foi possível ler o esboço ${declarado.esboco}: ${erro.message}`);
    }
    exigirPrimeiraOpcao(declarado, bruto);
  }
  const montagem = montagemDaPeca(peca);
  const avisos = [];
  if (!plano) avisos.push('a receita não declara PLANO: o pedido sai sem objeto, partes e critérios, e sem alvo da forma prometida.');

  const pasta = saida ? resolve(saida) : pastaDaRodada(peca, pastaDasCapturas);
  mkdirSync(pastaDasCapturas, { recursive: true });
  apagarImagensAntigas(peca, pastaDasCapturas);
  limparPastaDaRodada(pasta);
  mkdirSync(pasta, { recursive: true });

  /* O servidor e o navegador sobem uma vez para o pacote inteiro (26 capturas na perua), e a sessão e os contatos da peça são medidos
     uma vez. Com `olharBancada` trocado por um gravador, como nos testes, nada é aberto, a não ser que o teste dê `abrirCaptura`. */
  const compartilhada = dependencias.olharBancada && !dependencias.abrirCaptura ? null : await dep.abrirCaptura({ logger });
  /* QUANTAS IMAGENS O PACOTE TEM E QUANTAS JÁ SAÍRAM, para a recusa de uma captura dizer o que faltava. */
  const total = VISTAS_DO_CONJUNTO.split(',').length + 1 + 1 + VISTAS_DO_ARAME.split(',').length + 1
    + VISTAS_DA_PARTE.split(',').length * partes.length;
  let feitas = 0;
  const capturar = async (quem, opcoes) => {
    const resposta = await dep.olharBancada({ ...opcoes, logger, ...(compartilhada ? { compartilhada } : {}) });
    exigirCaptura(resposta, quem, { feitas, total });
    feitas += arquivosDe(resposta).length;
    return resposta;
  };

  let conjunto;
  let traseira;
  let esquerda;
  let arame;
  let raioX;
  const porParte = [];
  try {
    conjunto = await capturar('conjunto', { peca, revisar: true, res: RES_CONJUNTO });
    exigirVistasDiferentes(conjunto, 'do conjunto');
    /* O modo de revisão não aceita vista escolhida, então a de trás com sombra
       sai numa captura própria. */
    traseira = await capturar('traseira', { peca, auditoria: true, projecao: 'ortografica', vistas: 'traseira', res: RES_CONJUNTO });
    /* A lateral esquerda também, porque peça que não é simétrica tem parte só de um lado: a fuselagem do avião tem a
       porta à esquerda, e o crítico da primeira rodada dela não pôde conferir o vão da porta nem as janelas desse lado. */
    esquerda = await capturar('esquerda', { peca, auditoria: true, projecao: 'ortografica', vistas: 'esquerda', res: RES_CONJUNTO });

    /* A MALHA TAMBÉM VAI AO CRÍTICO. No ombro do braço, a imagem com sombra
       mostrava uma faixa escura que parecia luz, e o arame mostrou a causa: um
       leque de lascas saindo de um vértice só. Sombra esconde topologia. */
    arame = await capturar('arame', { peca, auditoria: true, arame: true, projecao: 'ortografica', vistas: VISTAS_DO_ARAME, res: RES_CONJUNTO });
    exigirVistasDiferentes(arame, 'do arame');
    /* E uma vista em raio X, com o que fica atrás à vista: há defeito de malha
       que só aparece do outro lado da peça. */
    raioX = await capturar('raio X', { peca, auditoria: true, arame: 'raio-x', projecao: 'ortografica', vistas: 'traseira', res: RES_CONJUNTO });

    for (const parte of partes) {
      const resultado = await capturar(`parte '${parte}'`, {
        peca,
        selecionadas: parte,
        modo: 'isolar',
        focar: true,
        /* Modo de auditoria também aqui: estas imagens vão para o crítico junto
           com as do conjunto, e o modo de revisão, que já o liga sozinho, não
           aceita vista escolhida à mão. */
        auditoria: true,
        projecao: 'ortografica',
        vistas: VISTAS_DA_PARTE,
        res: RES_PARTE,
      });
      exigirVistasDiferentes(resultado, `da parte '${parte}'`);
      porParte.push({ parte, resultado });
    }
  } finally {
    await compartilhada?.fechar();
  }

  /* O alvo vem do esboço de agora e não da imagem guardada. */
  let alvo = null;
  if (declarado) {
    const dados = await dep.formasDoEsboco(bruto, declarado.opcao);
    alvo = await gerarAlvo({ declarado, bruto, dados, pasta, dependencias: dep });
  }

  /* As vistas montadas, com o quadro na peça. Peça que ainda não está entre as etapas construídas não tem conjunto a mostrar, e isso
     vai no relatório, e não como falha: a etapa é fixada na ordem, e uma peça fora dela é trabalho adiantado. */
  let montada = null;
  if (montagem) {
    try {
      const feita = await dep.olharEtapas(montagem.arquivo, { vistas: VISTAS_MONTADAS, foco: montagem.instancia, saida: pasta, timeoutMs: PRAZO_DA_CAPTURA_MONTADA_MS, ...QUADRO_MONTADO });
      montada = { ...feita, instancia: montagem.instancia, montagem: montagem.arquivo };
    } catch (erro) {
      if (erro?.codigo !== 'foco-fora-das-etapas') throw erro;
      avisos.push(`sem vista montada: ${erro.message}`);
    }
  }

  const sobreposicao = declarado ? await dep.sobreposicaoDeCortes({ peca, saida: pasta }) : null;

  const orientacao = bruto ? lerPlano(bruto.plano)?.orientacao ?? null : null;
  const perguntas = await (dep.perguntasDaPeca ?? perguntasDaPecaArquivo)(peca);
  const pedido = montarPedido({
    peca,
    plano,
    orientacao,
    alvo: alvo ? { imagem: alvo.imagem, unidade: alvo.unidade } : null,
    afastamentos: [...afastamentosDeclarados(declarado), ...novasDeclaradas(receita)].sort((a, b) => a.parte.localeCompare(b.parte)),
    referencias: referencias.imagens.map((c) => ({ caminho: c })),
    modelo: [conjunto, traseira, esquerda].flatMap((r) => arquivosDe(r).map((arquivo) => ({ arquivo, vista: vistaDoArquivo(arquivo, peca) ?? 'vista' }))),
    arame: [
      ...arquivosDe(arame).map((arquivo) => ({ arquivo, vista: vistaDoArquivo(arquivo, peca) ?? 'vista', tipo: 'arame' })),
      ...arquivosDe(raioX).map((arquivo) => ({ arquivo, vista: vistaDoArquivo(arquivo, peca) ?? 'vista', tipo: 'raio X' })),
    ],
    montado: montada ? { instancia: montada.instancia, imagens: montada.arquivos.map((arquivo, i) => ({ arquivo, vista: montada.enquadramentos[i].vista })) } : null,
    sobreposicao: sobreposicao ? { arquivos: sobreposicao.arquivos, notas: sobreposicao.notas } : null,
    partes: porParte.map(({ parte, resultado }) => ({ nome: parte, imagens: arquivosDe(resultado).map((arquivo) => ({ arquivo, vista: vistaDoArquivo(arquivo, peca) ?? 'vista' })) })),
    perguntas: [...(perguntas.todas ?? []), ...(declarado ? [lerPergunta(PERGUNTA_DO_ALVO, 'a pergunta do alvo')] : [])],
  });
  const arquivoDoPedido = join(pasta, 'pedido.md');
  writeFileSync(arquivoDoPedido, pedido, 'utf8');

  return { peca, partes, conjunto, traseira, esquerda, arame, raioX, porParte, pasta, pedido: arquivoDoPedido, alvo, montada, sobreposicao, referencias, avisos };
}

/* Captura que não produziu arquivo recusa alto. A bancada devolve `ok:false` e
   uma mensagem, e engolir isso entregaria ao crítico um pacote com menos
   imagens do que ele acha que recebeu, o que é pior do que não entregar. A
   checagem de câmera do modo de revisão é exceção declarada: ela reprova
   enquadramento e ainda assim grava a imagem, e o enquadramento é assunto de
   quem conduz, não motivo para não haver pacote. */
function exigirCaptura(resposta, quem, pacote = null) {
  const arquivos = resposta?.resultado?.arquivos;
  if (Array.isArray(arquivos) && arquivos.length) return;
  const motivo = resposta?.erro?.mensagem ?? resposta?.stderr?.trim() ?? 'a bancada não disse por quê';
  /* o pacote diz quantas imagens já tinham saído, para quem lê saber se perdeu um minuto ou quase tudo */
  const andamento = pacote ? ` Do pacote, ${pacote.feitas} de ${pacote.total} imagens já tinham saído e faltavam ${pacote.total - pacote.feitas}.` : '';
  throw new Error(`a captura do ${quem} não produziu imagem: ${andamento ? motivo.replace(/[.\s]*$/, '.') : motivo}${andamento}`);
}

/* Duas vistas de uma captura com o mesmo conteúdo, byte a byte, são a mesma
   câmera gravada com dois nomes. Em 2026-10-15 a vista de lado isolada do capô
   e dos escapes do avião saiu igual à isométrica, porque o segundo foco da
   bancada voltava à isométrica, e só o crítico percebeu. */
export function vistasRepetidas(arquivos, ler = readFileSync) {
  const vistos = new Map();
  const repetidas = [];
  for (const arquivo of arquivos) {
    const hash = createHash('sha256').update(ler(arquivo)).digest('hex');
    if (vistos.has(hash)) repetidas.push([vistos.get(hash), arquivo]);
    else vistos.set(hash, arquivo);
  }
  return repetidas;
}

function exigirVistasDiferentes(resposta, quem) {
  const repetidas = vistasRepetidas(arquivosDe(resposta));
  if (!repetidas.length) return;
  const pares = repetidas.map(([a, b]) => `${a} = ${b}`).join('; ');
  throw new Error(`a captura ${quem} gravou a mesma imagem em vistas diferentes: ${pares}`);
}

/* Os caminhos saem de `resultado.arquivos`, que a bancada devolve estruturado,
   e não de garimpar o texto do relato: quem consome esta saída é quem monta o
   despacho do crítico, e caminho lido de prosa quebra quando a prosa muda. */
function arquivosDe(resposta) {
  const arquivos = resposta?.resultado?.arquivos;
  return Array.isArray(arquivos) ? arquivos : [];
}

const porcento = (fracao) => `${Math.round(fracao * 100)}%`;

export function imprimir(resultado) {
  const linhas = [`vistas:critica — ${resultado.peca}`, '', 'CONJUNTO (proporção e silhueta):'];
  for (const arquivo of arquivosDe(resultado.conjunto)) linhas.push(`  ${arquivo}`);
  for (const arquivo of arquivosDe(resultado.traseira)) linhas.push(`  ${arquivo}`);
  for (const arquivo of arquivosDe(resultado.esquerda)) linhas.push(`  ${arquivo}`);
  linhas.push('', 'ARAME (a malha, que a sombra esconde):');
  for (const arquivo of arquivosDe(resultado.arame)) linhas.push(`  ${arquivo}`);
  for (const arquivo of arquivosDe(resultado.raioX)) linhas.push(`  ${arquivo} (raio X)`);
  linhas.push('', 'POR PARTE (a forma e a técnica que o plano prometeu):');
  if (!resultado.partes.length) {
    linhas.push('  a receita não declara partes no PLANO; nenhuma vista isolada foi feita.');
  }
  for (const { parte, resultado: r } of resultado.porParte) {
    linhas.push(`  ${parte}:`);
    for (const arquivo of arquivosDe(r)) linhas.push(`    ${arquivo}`);
  }
  if (resultado.alvo) {
    const { alvo } = resultado;
    linhas.push('', `ALVO (a composta ${alvo.unidade ? `da unidade ${alvo.unidade}` : 'do esboço inteiro'}, gerada agora pela ferramenta do esboço):`, `  ${alvo.imagem}`);
    const unidades = Object.entries(alvo.escolha.contagem);
    if (unidades.length > 1) linhas.push(`  as formas ligadas estão em ${unidades.length} unidades (${unidades.map(([u, n]) => `${u}: ${n}`).join(', ')}); o alvo é a que tem mais`);
    if (alvo.escolha.semUnidade.length && unidades.length) linhas.push(`  sem unidade declarada no esboço, fora do alvo: ${alvo.escolha.semUnidade.join(', ')}`);
  }
  if (resultado.montada) {
    const { montada } = resultado;
    linhas.push('', `MONTADO (as etapas já construídas, com o quadro na caixa de '${montada.instancia}' e as outras peças em volta):`);
    montada.arquivos.forEach((arquivo, i) => {
      const e = montada.enquadramentos[i];
      linhas.push(`  ${arquivo} (a peça ocupa ${porcento(e.largura)} da largura e ${porcento(e.altura)} da altura do quadro${e.cortado ? ', CORTADA pelo quadro' : ''})`);
    });
  }
  if (resultado.sobreposicao) {
    linhas.push('', 'SOBREPOSIÇÃO DOS CORTES (o esboço em vermelho grosso, o modelo em azul fino):');
    for (const arquivo of resultado.sobreposicao.arquivos) linhas.push(`  ${arquivo}`);
    for (const p of resultado.sobreposicao.paineis) {
      linhas.push(`  ${p.eixo} = ${String(p.valor).replace('.', ',')} mm: ${p.desvioMaximoMm === null ? 'sem corte em um dos lados' : `desvio máximo entre as linhas ${p.desvioMaximoMm.toFixed(1).replace('.', ',')} mm`}`);
    }
    for (const nota of resultado.sobreposicao.notas) linhas.push(`  nota: ${nota}`);
  }
  if (resultado.referencias?.ignoradas?.length) linhas.push('', `REFERÊNCIAS fora do pedido, porque não são imagem: ${resultado.referencias.ignoradas.join(', ')}`);
  for (const aviso of resultado.avisos ?? []) linhas.push('', `AVISO: ${aviso}`);
  linhas.push('', 'PEDIDO (o texto pronto para o crítico, com todos os caminhos acima):', `  ${resultado.pedido}`);
  return `${linhas.join('\n')}\n`;
}

async function principal(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv.slice(2), { opcoes: ['saida'], posicional: { nome: 'a peça', obrigatorio: true } });
  } catch (erro) {
    process.stderr.write(`uso: node tools/modelar/vistas-para-critica.mjs <peça> [--saida=<pasta da rodada>]\n${erro.message}\n`);
    return 2;
  }
  const resultado = await vistasParaCritica(lido.posicional, { saida: lido.opcao('saida') });
  process.stdout.write(imprimir(resultado));
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((codigo) => { process.exitCode = codigo; }, (erro) => {
    process.stderr.write(`vistas-para-critica: ${erro.message}\n`);
    process.exitCode = 1;
  });
}
