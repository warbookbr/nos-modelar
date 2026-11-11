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
 *  - o alvo, quando ela declara `REFINA.esboco`: a composta da unidade do esboço aprovado que tem mais das formas ligadas, guardada com
 *    as formas resolvidas que o `REFINA.esboco` aponta (`alvos` do `.formas.json`). Até 2026-11-05 a composta saía na hora, da cópia do
 *    `.esboco.json` pela ferramenta do esboço antigo, para nunca ser de uma versão anterior do esboço; o esboço antigo saiu, as formas
 *    resolvidas e a composta foram gravadas juntas, do mesmo arquivo, e por isso a imagem é a da versão das formas que a conferência mede;
 *  - as vistas montadas, quando a peça é uma instância de `<objeto>/montagem.json`: as etapas já construídas juntas, com o quadro na
 *    caixa da peça. Duas vezes o crítico errou por ver a peça pequena demais no conjunto: leu um degrau na junta do capô, e a deriva
 *    mais grossa do que é;
 *  - a sobreposição dos cortes do modelo com os do sólido do esboço (`sobreposicao-de-cortes.mjs`), que foi o que desfez esses dois erros;
 *  - a vista em corte de cada encaixe com uma vizinha da montagem (`corte-<instância>-<vizinha>.png`), tirada da malha sem navegador,
 *    com a folga medida escrita: no máximo quatro, os de menor folga;
 *  - no pedido, a referência que vale para cada vista do modelo, e os pontos que rodadas anteriores atribuíram ao plano, à ferramenta
 *    ou ao crítico, para o crítico não os repetir sem evidência nova;
 *  - a luz rasante e a curvatura da lataria, quando a peça é de lataria (`src/autoria/lataria.js`): o amassado largo e raso e a quina
 *    que ondula passam por todas as medidas e pela vista comum, e por decisão da pessoa em 2026-10-30 a peça de lataria não fecha a
 *    rodada de forma sem as duas no pacote. Elas saem do Blender (`vistas-de-superficie.mjs`), e sem `MODELAR_BLENDER` o pacote de
 *    peça de lataria é recusado antes de qualquer captura, com o comando. A imagem de luz rasante com menos de 25 % da peça iluminada
 *    (`LIMIAR_DA_LUZ_RASANTE`) também o recusa, dizendo a imagem e a fração: a luz que vinha de um lado que a câmera não via já chegou
 *    ao crítico como uma imagem preta com traços de borda.
 *
 * A pasta traz ainda o `pacote.json`, com a impressão do texto da receita que o pacote mostra e as imagens de superfície: é por ele
 * que o registro da rodada sabe se o crítico de peça de lataria recebeu as duas vistas da versão medida.
 *
 * Uso: node tools/modelar/vistas-para-critica.mjs <peça> [--saida=<pasta da rodada>] [--prazo=<segundos de carga por captura>] */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { linhaDaVista } from './lados-das-vistas.mjs';
import { paraPng } from './leitura-por-regioes.mjs';
import { prepararSolido } from '../../src/autoria/contato-de-solidos.js';
import { doAmbiente } from '../ambiente.mjs';
import { mensagemDeReferenciasAusentes, referenciasDoPlano } from './referencias-do-plano.mjs';
import { vistaDoMesmoOlho } from './comparar-contornos.mjs';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { lerPergunta } from '../../src/autoria/perguntas-do-critico.js';
import { textoDoAfastamento } from '../../src/autoria/refinamento-global.js';
import { lerArgumentos } from './argumentos.mjs';
import { abrirCapturaCompartilhada, olharBancada } from './olhar-bancada.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { blocoDasPerguntas, perguntasDaPecaArquivo } from './perguntas-da-peca.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import {
  LADO_DA_VISTA_DE_SUPERFICIE, MANIFESTO_DO_PACOTE, PASTA_DA_SUPERFICIE, SAIDA_PADRAO, exigirLuzNaSuperficie, gravarManifesto, impressaoDoTexto, mensagemSemBlender, pastaDaRodada,
  superficieDaPeca, vistasDeSuperficie,
} from './vistas-de-superficie.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

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

/* A pasta da rodada de uma peça (`critica-<peça>` ao lado das capturas da bancada) mora em `vistas-de-superficie.mjs`, que o registro
   da rodada lê sem carregar a captura. */
export { pastaDaRodada };

/* Só o que esta ferramenta grava na pasta da rodada sai antes de cada pacote, e nunca a pasta inteira: `--saida` pode ser uma pasta
   que tem mais coisa. Imagem velha ali é imagem julgada sem ninguém perceber que é mais velha que a receita. */
function limparPastaDaRodada(pasta) {
  if (!existsSync(pasta)) return;
  rmSync(join(pasta, 'pedido.md'), { force: true });
  rmSync(join(pasta, MANIFESTO_DO_PACOTE), { force: true });
  rmSync(join(pasta, 'alvo'), { recursive: true, force: true });
  rmSync(join(pasta, PASTA_DA_SUPERFICIE), { recursive: true, force: true });
  for (const nome of readdirSync(pasta)) {
    if (/^(etapas|sobreposicao|corte)-.*\.png$/.test(nome)) rmSync(join(pasta, nome));
  }
}

export function partesDoPlano(receita) {
  const partes = receita?.PLANO?.partes;
  if (!Array.isArray(partes) || partes.length === 0) return [];
  return partes.map((parte) => parte?.nome).filter((nome) => typeof nome === 'string' && nome);
}

/* ---------- o lado de onde cada vista olha ---------- */

/* Cada vista da bancada e da montagem é, em olho, uma vista do esboço (`lados-das-vistas.mjs`), que já sabe dizer de onde ela olha
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

/* ---------- a referência que vale para cada vista ---------- */

/* O lado de onde uma referência olha, pelo nome do arquivo: as palavras do nome, sem acento, em que cada lado tem os nomes que o
   acervo usa (`frente.ia.png`, `carcaca-lado.ia.png`, `tras.ia.png`, `cima.ia.png`). Nome com dois lados, ou com nenhum, não diz. O
   crítico do protetor comparou a vista de lado com as fotos de frente e de trás, porque o pedido listava as referências sem dizer de
   que lado cada uma olha nem qual vale para cada vista do modelo. */
export const LADOS_DA_REFERENCIA = Object.freeze({
  frontal: 'frontal', frente: 'frontal', traseira: 'traseira', traseiro: 'traseira', tras: 'traseira', lateral: 'lateral', lado: 'lateral',
  superior: 'superior', topo: 'superior', cima: 'superior', inferior: 'inferior', baixo: 'inferior',
});
/* os lados que só a declaração dá: direita e esquerda pelo nome confundiriam o lado do objeto com o da vista */
export const LADOS_DECLARAVEIS = Object.freeze(['frontal', 'traseira', 'lateral', 'direita', 'esquerda', 'superior', 'inferior', 'isometrica']);
const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** O lado de uma referência pelo nome do arquivo (um de `LADOS_DA_REFERENCIA`), ou null. */
export function ladoDoNome(caminho) {
  const achados = new Set(semAcento(basename(String(caminho))).split(/[^a-z]+/).map((p) => LADOS_DA_REFERENCIA[p]).filter(Boolean));
  return achados.size === 1 ? [...achados][0] : null;
}

const BANCADA_DA_VISTA_DO_ESBOCO = Object.freeze(Object.fromEntries(Object.entries(VISTA_DO_ESBOCO).map(([b, e]) => [e, b])));
const OPOSTA_DA_BANCADA = Object.freeze({ frontal: 'traseira', traseira: 'frontal', direita: 'esquerda', esquerda: 'direita', superior: 'inferior', inferior: 'superior' });

/** As vistas do modelo que olham do mesmo lado que a referência de `lado`, `{ mesma, oposta }` em nomes da bancada, com a orientação
 *  do esboço quando há: a frente do objeto em -z põe a referência de frente na vista traseira da bancada. */
export function vistasDaReferencia(lado, orientacao = null) {
  let mesma;
  if (lado === 'frontal' || lado === 'traseira') {
    const frente = BANCADA_DA_VISTA_DO_ESBOCO[vistaDoMesmoOlho('frontal', orientacao).vista];
    mesma = lado === 'frontal' ? frente : OPOSTA_DA_BANCADA[frente];
  } else if (lado === 'lateral') {
    mesma = BANCADA_DA_VISTA_DO_ESBOCO[vistaDoMesmoOlho('lateral', orientacao).vista];
  } else if (LADOS_DECLARAVEIS.includes(lado)) {
    mesma = lado;
  } else {
    return null;
  }
  return { mesma, oposta: OPOSTA_DA_BANCADA[mesma] ?? null };
}

/* O olho de uma imagem de referência: o lado que ela declara ou que o nome diz, com o texto da vista do modelo que olha do mesmo lado,
   ou nada quando nenhum dos dois diz. */
function olhoDaReferencia({ caminho, lado = null }, orientacao) {
  const vistas = vistasDaReferencia(lado ?? ladoDoNome(caminho), orientacao);
  return vistas ? ladoDaVista(vistas.mesma, orientacao) : null;
}

/**
 * Para cada vista do modelo em `vistas`, as referências que olham do mesmo lado e as que olham do lado oposto, e os contornos em mm
 * que medem aquele lado: `[{ vista, mesmas: [nome], opostas: [nome], contornos: [{ arquivo, deImagem }] }]`. `referencias` são
 * `{ caminho, lado? }`; `contornos` são `{ arquivo, lado, deImagem }`.
 */
export function referenciasPorVista(vistas, referencias, contornos = [], orientacao = null) {
  const lados = referencias.map((r) => ({ nome: basename(r.caminho), vistas: vistasDaReferencia(r.lado ?? ladoDoNome(r.caminho), orientacao) }));
  const deContorno = contornos.map((c) => ({ ...c, vistas: vistasDaReferencia(c.lado, orientacao) })).filter((c) => c.vistas);
  return vistas.map((vista) => ({
    vista,
    mesmas: lados.filter((l) => l.vistas?.mesma === vista).map((l) => l.nome),
    opostas: lados.filter((l) => l.vistas?.oposta === vista).map((l) => l.nome),
    contornos: deContorno.filter((c) => c.vistas.mesma === vista || (c.lado === 'lateral' && c.vistas.oposta === vista))
      .map(({ arquivo, deImagem }) => ({ arquivo, deImagem })),
  }));
}

function linhaDaReferenciaPorVista({ vista, mesmas, opostas, contornos }) {
  const nomes = (l) => l.map((n) => `\`${n}\``).join(', ');
  const partes = [];
  if (mesmas.length) partes.push(`compare com ${nomes(mesmas)}`);
  if (opostas.length) partes.push(`${nomes(opostas)} ${opostas.length > 1 ? 'olham' : 'olha'} do lado oposto e vale${opostas.length > 1 ? 'm' : ''} só para o contorno, espelhado, e não para o que só existe de um lado`);
  const semImagem = !mesmas.length && !opostas.length;
  for (const { arquivo, deImagem } of contornos) {
    partes.push(deImagem
      ? `a medida deste lado vem dos contornos em mm de \`${basename(arquivo)}\`, tirados de \`${basename(deImagem)}\`, e não da proporção da imagem`
      : semImagem
        ? `nenhuma imagem do pacote olha deste lado, e a referência dele são os contornos em mm de \`${basename(arquivo)}\`, tirados de uma imagem deste lado que não vai no pacote: a medida deste lado vem deles, e não da proporção de uma imagem`
        : `a medida deste lado vem dos contornos em mm de \`${basename(arquivo)}\`, tirados de uma imagem deste lado que não vai no pacote, e não da proporção de uma imagem`);
  }
  if (semImagem && !contornos.length) {
    partes.push(vista === 'isometrica'
      ? 'nenhuma referência olha deste lado; use esta vista para a forma em volume, sem comparar medida com as referências'
      : 'nenhuma referência olha deste lado; não compare esta vista com as referências de outro lado');
  } else if (semImagem) {
    partes.push('não compare esta vista com as imagens de outro lado');
  }
  return `${vista}: ${partes.join('; ')}.`;
}

/** Os contornos em mm que medem um lado do objeto: os citados no plano (`*.contornos.json`), os que acompanham uma imagem citada (o
 *  mesmo nome, com `.contornos.json` no lugar da extensão) e, na pasta das imagens citadas, os que não acompanham imagem nenhuma e
 *  dizem o lado no nome. `citadas` são os caminhos absolutos que o plano cita e que não são imagem. Devolve `[{ arquivo, lado, deImagem }]`. */
export function contornosDasReferencias({ imagens = [], citadas = [], existe = existsSync, listar = readdirSync } = {}) {
  const achados = new Map();
  const juntar = (arquivo, lado, deImagem) => { if (lado && !achados.has(arquivo)) achados.set(arquivo, { arquivo, lado, deImagem }); };
  for (const arquivo of citadas) if (arquivo.endsWith('.contornos.json')) juntar(arquivo, ladoDoNome(arquivo), null);
  for (const imagem of imagens) {
    const irmao = imagem.replace(/\.[a-z0-9]+$/i, '.contornos.json');
    if (irmao !== imagem && existe(irmao)) juntar(irmao, ladoDoNome(imagem), imagem);
  }
  for (const pasta of [...new Set(imagens.map((i) => dirname(i)))].sort()) {
    let nomes;
    try { nomes = listar(pasta); } catch { continue; }
    for (const nome of [...nomes].map(String).sort()) {
      if (!nome.endsWith('.contornos.json')) continue;
      const base = join(pasta, nome.slice(0, -'.contornos.json'.length));
      if (['.png', '.jpg', '.jpeg', '.webp'].some((ext) => existe(`${base}${ext}`))) continue;
      juntar(join(pasta, nome), ladoDoNome(nome), null);
    }
  }
  return [...achados.values()];
}

/**
 * O pedido ao crítico, em Markdown, de dados já resolvidos. Puro: não lê arquivo nem roda captura.
 *
 * `peca` é o nome da peça; `plano` o `PLANO` normalizado (ou null); `orientacao` a do esboço (ou null); `alvo` é
 * `{ imagem, unidade }` quando a receita refina um esboço (e null sem); `referencias` as imagens `{ caminho }`; `modelo` as imagens
 * do conjunto `{ arquivo, vista }` e `arame` as da malha `{ arquivo, vista, tipo }`; `montado` é `{ instancia, imagens: [{ arquivo,
 * vista }] }` ou null; `sobreposicao` é `{ arquivos, notas }` ou null; `partes` são `{ nome, imagens: [{ arquivo, vista }] }` na ordem do
 * plano; `perguntas` as perguntas específicas da peça; `superficie` é `{ rasante: [{ arquivo, vista, azimute, iluminada }], curvatura: [{ arquivo,
 * vista }] }` na peça de lataria, ou null; `contornos` os contornos em mm de um lado (`contornosDasReferencias`); `encaixes` os cortes nos
 * encaixes com as vizinhas (`cortesDosEncaixes`); `anteriores` os pontos de rodadas anteriores que quem conduz atribuiu ao plano, às
 * ferramentas ou ao crítico (`pontosJaAtribuidos`).
 */
export function montarPedido({ peca, plano = null, orientacao = null, alvo = null, afastamentos = [], referencias = [], modelo = [], arame = [], montado = null, sobreposicao = null, partes = [], perguntas = [], superficie = null, contornos = [], encaixes = [], anteriores = [] }) {
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
      ...lista(referencias.map((referencia) => {
        const olho = olhoDaReferencia(referencia, orientacao);
        return `${basename(referencia.caminho)}: ${referencia.caminho}${olho ? ` (o olho da imagem: ${olho})` : ''}`;
      })),
    );
  } else {
    L.push('O plano não cita imagem de referência.');
  }
  L.push('');
  if (referencias.length || contornos.length) {
    L.push(
      'A referência que vale para cada vista do modelo. Compare cada vista só com a referência que olha do mesmo lado: a imagem de outro '
      + 'lado mostra outro contorno, e a largura de uma vista de frente não é o comprimento de uma vista de lado.', '',
      ...lista(referenciasPorVista(vistasDoPedido, referencias, contornos, orientacao).map(linhaDaReferenciaPorVista)), '',
    );
  }

  L.push(
    '## Modelo', '',
    'As vistas do modelo, do conjunto montado e de cada parte olham, pelo nome, destes lados:', '',
    ...lista(vistasDoPedido.map((vista) => `${vista}: ${ladoDaVista(vista, orientacao)}`)), '',
    'As vistas da peça sozinha, em projeção ortográfica, para a proporção e a silhueta:', '',
    ...lista(modelo.map(imagem)), '',
    'A malha em arame e em raio X, para a topologia que a sombra esconde:', '',
    ...lista(arame.map(imagem)), '',
  );

  if (superficie) L.push(...secaoDaSuperficie(superficie));

  if (montado) {
    L.push(
      '## Montado', '',
      `O objeto montado até aqui, com a peça \`${montado.instancia}\` no centro do quadro, grande, e as outras peças ao redor, só para dar o contexto e a posição dela. O quadro fecha na caixa da peça, com uma folga, e as vistas olham dos lados descritos em Modelo:`, '',
      ...lista(montado.imagens.map(imagem)), '',
    );
  }

  if (encaixes.length) L.push(...secaoDosEncaixes(encaixes));

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

  if (anteriores.length) L.push(...secaoDosAnteriores(anteriores));

  L.push('## Veredito', '', `No veredito em JSON, \`onde\`, \`evidencia\` e \`observacao\` têm até ${LIMITE_DO_VEREDITO} caracteres cada, porque o registro recusa o mais longo; o detalhe vai no texto da resposta.`, '');
  return `${L.join('\n')}`;
}

/* A seção da superfície da peça de lataria. As vistas do Blender têm nomes e lados próprios (`vistas_padrao` de `tools/blender/comum.py`),
   ditos aqui pelos eixos, e não pelos da bancada. */
function secaoDaSuperficie({ rasante, curvatura, faixa = null }) {
  const vistas = Object.keys(LADO_DA_VISTA_DE_SUPERFICIE).filter((v) => [...rasante, ...curvatura].some((i) => i.vista === v));
  const grau = (n) => `${String(n).replace('.', ',')} graus`;
  /* a faixa dos vincos que a forma desenha sai em ocre e fora da escala (`curvatura-da-lataria.py --vincos`): o crítico precisa saber
     que ali a cor não mede defeito, e que a dobra pedida não entra na escala */
  const textoDaFaixa = faixa
    ? ` Em ocre, a faixa de ${String(faixa.larguraMm).replace('.', ',')} mm de cada lado dos vincos que a forma desenha (${faixa.vincos.join(', ')}): `
      + 'é a dobra pedida, fica fora da escala e não é defeito; a escala é a do resto da chapa.'
    : '';
  const luz = [
    'A luz rasante: a peça em material fosco, sem luz de ambiente, sob um sol a poucos graus do plano da imagem, de duas direções, '
    + 'escolhidas em cada vista para a luz cair no lado da peça que a câmera vê. O painel '
    + 'liso sai com brilho que muda devagar, e um relevo de um ou dois milímetros sai como mancha clara de um lado e escura do outro. '
    + 'A faixa preta atrás de uma peça saliente é a sombra dela, e o painel visto de lado sai escuro.', '',
    ...lista(rasante.map(({ arquivo, vista, azimute }) => `${vista}, a luz correndo na direção de ${grau(azimute)} da imagem (0 para a direita, 90 para cima): ${arquivo}`)), '',
  ];
  /* A peça de emenda sombreada leva só a luz rasante: o que ela mostra é a sombra suave que sobe sobre o encontro de dois sólidos
     fundidos, com degrau, quina ou risco que o sombreamento esconde nas vistas de Modelo. */
  if (!curvatura.length) {
    return [
      '## Superfície', '',
      'A peça tem sombreamento suave sobre a emenda de sólidos fundidos, e esta vista mostra o que a sombra das vistas de Modelo esconde: '
      + 'o degrau de sombra, a quina que sobra onde devia haver curva e o risco ao longo do encontro. Diga onde a sombra degrada, quebra ou '
      + 'desenha uma aresta que a forma não pede. As vistas desta seção olham destes lados, no quadro da peça:', '',
      ...lista(vistas.map((v) => `${v}: ${LADO_DA_VISTA_DE_SUPERFICIE[v]}`)), '',
      ...luz,
    ];
  }
  return [
    '## Superfície', '',
    'A peça é de chapa, e estas duas vistas mostram o que a sombra das vistas de Modelo esconde: o amassado largo e raso, a ondulação de um '
    + 'painel que devia ser liso e a quina que não corre por igual. Diga onde a chapa afunda, abaula ou ondula sem que a forma peça. As vistas '
    + 'desta seção olham destes lados, no quadro da peça:', '',
    ...lista(vistas.map((v) => `${v}: ${LADO_DA_VISTA_DE_SUPERFICIE[v]}`)), '',
    ...luz,
    'A curvatura média da chapa: branco onde ela é plana, vermelho onde abaula para fora e azul onde afunda, na escala escrita em cada '
    + 'imagem; cinza claro são as peças que não são a chapa, e cinza escuro a faixa junto da borda e das dobras vivas, sem dado. Uma mancha '
    + `azul cercada de vermelho num painel que devia ser liso é um afundamento.${textoDaFaixa}`, '',
    ...lista(curvatura.map(({ arquivo, vista }) => `${vista}: ${arquivo}`)), '',
  ];
}

/* ---------- os pontos que rodadas anteriores já atribuíram ---------- */

/* De uma rodada para a outra o crítico trocava de defeitos com a mesma nota e repetia pontos que a rodada anterior tinha atribuído ao
   plano ou a uma ferramenta, porque o pedido não levava nada dela. Vai ao pedido só a frase de atrito em que quem conduz atribuiu um
   ponto ao plano, a uma ferramenta ou ao crítico, como ela foi escrita; a frase atribuída só ao modelador, que é o que muda na peça, e
   a frase sem atribuição, que é atrito de construção, ficam fora. */
export const ATRIBUICOES_QUE_VAO_AO_PEDIDO = Object.freeze(['plano', 'ferramenta', 'critico']);
const NOME_DA_ATRIBUICAO = Object.freeze({ plano: 'ao plano', ferramenta: 'à ferramenta', critico: 'ao crítico' });

/** Os pontos atribuídos ao plano, à ferramenta ou ao crítico nos registros `rodadas` (`[{ numero, atrito }]`), na ordem das rodadas:
 *  `[{ numero, atribuicoes, texto }]`. */
export function pontosJaAtribuidos(rodadas) {
  const padrao = /atribuid[oa]s?\s+(?:ao|aos|a|as)\s+([a-z]+)/g;
  const pontos = [];
  for (const { numero, atrito } of [...rodadas].sort((a, b) => a.numero - b.numero)) {
    for (const frase of Array.isArray(atrito) ? atrito : []) {
      if (typeof frase !== 'string') continue;
      const atribuicoes = [...new Set([...semAcento(frase).matchAll(padrao)].map((m) => m[1]).filter((a) => ATRIBUICOES_QUE_VAO_AO_PEDIDO.includes(a)))];
      if (atribuicoes.length) pontos.push({ numero, atribuicoes, texto: frase.trim() });
    }
  }
  return pontos;
}

/** Os registros de rodada (`rodada-NN.json`) de uma pasta, como `[{ numero, atrito }]`; o registro ilegível fica fora. */
export function rodadasDaPasta(pasta) {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).filter((n) => /^rodada-\d{2}\.json$/.test(n)).sort().flatMap((nome) => {
    try {
      const j = JSON.parse(readFileSync(join(pasta, nome), 'utf8'));
      return [{ numero: Number.isInteger(j?.numero) ? j.numero : Number(nome.slice(7, 9)), atrito: j?.atrito ?? [] }];
    } catch { return []; }
  });
}

/* a pasta das rodadas da peça: ao lado da receita em `receita.js`, ou no histórico antigo */
function pastaDasRodadas(peca, caminho) {
  return caminho.endsWith('receita.js') ? join(dirname(caminho), 'rodadas') : join(REPO, 'docs/modelar/historico/rodadas', peca);
}

function secaoDosAnteriores(pontos) {
  return [
    '## Pontos já atribuídos', '',
    'Rodadas anteriores desta peça levantaram os pontos abaixo, e quem conduz mediu cada um e o atribuiu ao plano, à ferramenta ou ao '
    + 'crítico, com a razão escrita. Não os repita como defeito sem evidência nova numa imagem deste pacote; se repetir um, diga qual '
    + 'imagem traz a evidência nova e o que ela mostra de diferente.', '',
    ...lista(pontos.map(({ numero, atribuicoes, texto }) => `rodada ${numero}, atribuído ${atribuicoes.map((a) => NOME_DA_ATRIBUICAO[a]).join(' e ')}: ${texto.replace(/^rodada\s+\d+\s*[,:]\s*/i, '')}`)), '',
  ];
}

/* ---------- a vista em corte nos encaixes ---------- */

/* Cinco vezes o crítico leu como peça atravessando outra, ou solta, um encaixe que a auditoria da montagem mede como livre: o assento
   do eixo a 0,5 mm do teto do entalhe do chassi, o pneu e a carcaça, a camisa do cilindro no rebaixo do painel, os montantes no
   canal, o banco sobre a tampa. As vistas montadas não decidem a profundidade. Cada encaixe da peça com uma vizinha ganha uma imagem
   em corte, tirada da malha sem navegador, no plano que passa pelos dois pontos mais próximos das duas peças e que fica o mais perto
   possível de um plano de eixo, com a peça e a vizinha em cores diferentes e a folga medida escrita. */
export const LIMITE_DE_CORTES = 4;
/* a vizinha a até esta distância da peça entra como encaixe mesmo sem declaração: o pneu e a carcaça não têm relação na montagem */
export const ALCANCE_DO_ENCAIXE_MM = 25;
/* abaixo disto a folga é contato: as malhas se tocam ou se cruzam */
export const FOLGA_DE_CONTATO_MM = 0.01;
export const COR_DA_PECA = Object.freeze({ linha: [200, 90, 10], fundo: [246, 196, 150] });
export const COR_DA_VIZINHA = Object.freeze({ linha: [30, 70, 190], fundo: [165, 192, 240] });
const COR_DO_CRUZAMENTO = [150, 80, 170];
const COR_DA_FOLGA = [210, 0, 40];
const FUNDO_DO_CORTE = [250, 250, 248];
const MM_POR_METRO = 1000;

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma3 = (a) => Math.hypot(a[0], a[1], a[2]);
const unit3 = (a) => { const n = norma3(a); return n > 0 ? mul3(a, 1 / n) : [0, 0, 0]; };

/** Os triângulos de uma instância resolvida (`neutro` em metro, `pose` do mundo), em mm no mundo. */
export function triangulosNoMundo(neutro, pose, rotulo = 'peça') {
  const solido = prepararSolido(neutro, pose, rotulo);
  return (solido.triangulos ?? []).map((t) => t.map((p) => mul3(p, MM_POR_METRO)));
}

function caixaDe(triangulos) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const t of triangulos) for (const p of t) for (let k = 0; k < 3; k++) { if (p[k] < min[k]) min[k] = p[k]; if (p[k] > max[k]) max[k] = p[k]; }
  return { min, max };
}
const crescer = (c, d) => ({ min: c.min.map((x) => x - d), max: c.max.map((x) => x + d) });
const cruzar = (a, b) => ({ min: a.min.map((x, k) => Math.max(x, b.min[k])), max: a.max.map((x, k) => Math.min(x, b.max[k])) });
const vazia = (c) => c.min.some((x, k) => x > c.max[k]);
const tocaCaixa = (t, c) => [0, 1, 2].every((k) => Math.min(t[0][k], t[1][k], t[2][k]) <= c.max[k] && Math.max(t[0][k], t[1][k], t[2][k]) >= c.min[k]);

/** O ponto do triângulo `t` mais perto de `p` (Ericson, Real-Time Collision Detection, 5.1.5). */
export function pontoMaisPertoNoTriangulo(p, [a, b, c]) {
  const ab = sub3(b, a); const ac = sub3(c, a); const ap = sub3(p, a);
  const d1 = dot3(ab, ap); const d2 = dot3(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub3(p, b); const d3 = dot3(ab, bp); const d4 = dot3(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add3(a, mul3(ab, d1 / (d1 - d3)));
  const cp = sub3(p, c); const d5 = dot3(ab, cp); const d6 = dot3(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add3(a, mul3(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add3(b, mul3(sub3(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))));
  const den = 1 / (va + vb + vc);
  return add3(a, add3(mul3(ab, vb * den), mul3(ac, vc * den)));
}

/** O ponto em que o segmento `a`-`b` fura o triângulo `t` (Möller e Trumbore), ou null. */
export function arestaFuraTriangulo(a, b, [p0, p1, p2]) {
  const dir = sub3(b, a);
  const e1 = sub3(p1, p0); const e2 = sub3(p2, p0);
  const h = cross3(dir, e2); const det = dot3(e1, h);
  if (Math.abs(det) < 1e-12 * norma3(dir) * norma3(e1) * norma3(e2)) return null;
  const f = 1 / det; const sv = sub3(a, p0);
  const u = f * dot3(sv, h);
  if (u < 0 || u > 1) return null;
  const q = cross3(sv, e1); const v = f * dot3(dir, q);
  if (v < 0 || u + v > 1) return null;
  const t = f * dot3(e2, q);
  return t > 1e-9 && t < 1 - 1e-9 ? add3(a, mul3(dir, t)) : null;
}

/* As amostras de um lado: os vértices, o meio de cada aresta e o centro de cada triângulo, sem repetir. */
function amostras(triangulos) {
  const vistos = new Map();
  const juntar = (p) => { const chave = `${p[0].toFixed(4)},${p[1].toFixed(4)},${p[2].toFixed(4)}`; if (!vistos.has(chave)) vistos.set(chave, p); };
  for (const [a, b, c] of triangulos) {
    juntar(a); juntar(b); juntar(c);
    juntar(mul3(add3(a, b), 0.5)); juntar(mul3(add3(b, c), 0.5)); juntar(mul3(add3(c, a), 0.5));
    juntar(mul3(add3(add3(a, b), c), 1 / 3));
  }
  return [...vistos.values()];
}

/* De cada amostra de `de`, o triângulo de `para` mais perto, por uma grade de lado `alcance` sobre a região. */
function maisPertoDeUmLado(de, para, regiaoDe, regiaoPara, alcance) {
  const celula = (p) => p.map((x, k) => Math.floor((x - regiaoPara.min[k]) / alcance));
  const grade = new Map();
  para.forEach((t, i) => {
    const lo = celula([0, 1, 2].map((k) => Math.max(regiaoPara.min[k], Math.min(t[0][k], t[1][k], t[2][k]))));
    const hi = celula([0, 1, 2].map((k) => Math.min(regiaoPara.max[k], Math.max(t[0][k], t[1][k], t[2][k]))));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      const chave = `${x},${y},${z}`;
      if (!grade.has(chave)) grade.set(chave, []);
      grade.get(chave).push(i);
    }
  });
  let melhor = null;
  const visto = new Int32Array(para.length).fill(-1);
  /* a aresta de um lado que fura um triângulo do outro: as duas peças se cruzam ali, e nenhuma amostra perto da costura acha isso */
  let marca = 0;
  const visto2 = new Int32Array(para.length).fill(-1);
  const arestas = new Map();
  for (const t of de) for (let i = 0; i < 3; i++) {
    const a = t[i]; const b = t[(i + 1) % 3];
    const chave = [a, b].map((p) => p.map((x) => x.toFixed(4)).join(',')).sort().join(' ');
    if (!arestas.has(chave)) arestas.set(chave, [a, b]);
  }
  for (const [a, b] of arestas.values()) {
    marca += 1;
    const passos = Math.max(1, Math.ceil(norma3(sub3(b, a)) / (alcance / 2)));
    for (let s = 0; s <= passos; s++) {
      const p = add3(a, mul3(sub3(b, a), s / passos));
      if (!p.every((x, k) => x >= regiaoPara.min[k] - alcance && x <= regiaoPara.max[k] + alcance)) continue;
      const [cx, cy, cz] = celula(p);
      for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (let z = cz - 1; z <= cz + 1; z++) {
        for (const i of grade.get(`${x},${y},${z}`) ?? []) {
          if (visto2[i] === marca) continue;
          visto2[i] = marca;
          const furo = arestaFuraTriangulo(a, b, para[i]);
          if (furo && (melhor === null || melhor.d > 0)) melhor = { d: 0, de: furo, para: furo, triangulo: para[i] };
        }
      }
    }
  }
  if (melhor?.d === 0) return melhor;
  amostras(de).forEach((p, n) => {
    if (!p.every((x, k) => x >= regiaoDe.min[k] - 1e-9 && x <= regiaoDe.max[k] + 1e-9)) return;
    const [cx, cy, cz] = celula(p);
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (let z = cz - 1; z <= cz + 1; z++) {
      for (const i of grade.get(`${x},${y},${z}`) ?? []) {
        if (visto[i] === n) continue;
        visto[i] = n;
        const q = pontoMaisPertoNoTriangulo(p, para[i]);
        const d = norma3(sub3(q, p));
        if (d <= alcance && (melhor === null || d < melhor.d)) melhor = { d, de: p, para: q, triangulo: para[i] };
      }
    }
  });
  return melhor;
}

/**
 * Os dois pontos mais próximos entre os triângulos `A` (a peça) e `B` (a vizinha), em mm, se estiverem a até `alcance`: `{ folgaMm,
 * naPeca, naVizinha, normal }`, com a normal do triângulo onde o ponto mais perto caiu; ou null quando as duas ficam mais longe. A
 * distância é medida das amostras de cada lado (vértices, meio das arestas e centro dos triângulos) aos triângulos do outro.
 */
export function maisPerto(A, B, alcance = ALCANCE_DO_ENCAIXE_MM) {
  if (!A.length || !B.length) return null;
  const ca = caixaDe(A); const cb = caixaDe(B);
  const regiaoA = cruzar(ca, crescer(cb, alcance)); const regiaoB = cruzar(cb, crescer(ca, alcance));
  if (vazia(regiaoA) || vazia(regiaoB)) return null;
  const a = A.filter((t) => tocaCaixa(t, regiaoA)); const b = B.filter((t) => tocaCaixa(t, regiaoB));
  if (!a.length || !b.length) return null;
  const ab = maisPertoDeUmLado(a, b, regiaoA, regiaoB, alcance);
  const ba = maisPertoDeUmLado(b, a, regiaoB, regiaoA, alcance);
  if (!ab && !ba) return null;
  const doA = ab && (!ba || ab.d <= ba.d);
  const m = doA ? ab : ba;
  const [t0, t1, t2] = m.triangulo;
  return { folgaMm: m.d, naPeca: doA ? m.de : m.para, naVizinha: doA ? m.para : m.de, normal: unit3(cross3(sub3(t1, t0), sub3(t2, t0))) };
}

/* Os eixos de tela de um corte de normal em eixo, como a vista de mesmo nome os põe (`h` cresce para a direita da imagem): visto de +x,
   -z fica à direita; de +y, +x à direita e -z em cima; de +z, +x à direita. */
const DIREITA_DO_CORTE = Object.freeze([[0, 0, -1], [1, 0, 0], [1, 0, 0]]);
const NOME_DO_EIXO = ['x', 'y', 'z'];

/**
 * O plano do corte de um encaixe: o que passa pelo meio dos dois pontos mais próximos, contém a direção entre eles e fica o mais perto
 * de um plano de eixo; com as malhas encostadas, o plano de eixo mais perpendicular à face onde se tocam. `{ ponto, normal, direita,
 * cima, eixo }`, com `eixo` o nome do eixo quando o plano é de eixo, e null quando é oblíquo.
 */
export function planoDoEncaixe({ folgaMm, naPeca, naVizinha, normal }) {
  const ponto = mul3(add3(naPeca, naVizinha), 0.5);
  const contida = folgaMm > FOLGA_DE_CONTATO_MM ? unit3(sub3(naVizinha, naPeca)) : unit3(normal);
  const k = [0, 1, 2].reduce((m, i) => (Math.abs(contida[i]) < Math.abs(contida[m]) - 1e-12 ? i : m), 0);
  const e = [0, 0, 0]; e[k] = 1;
  /* a normal de eixo sem a componente da direção que o plano tem de conter */
  const n = sub3(e, mul3(contida, dot3(e, contida)));
  return planoPelaNormal(ponto, norma3(n) > 1e-9 ? n : e, k);
}

/** O plano pelo `ponto` com a `normal` dada (mm, mundo), com os eixos de tela do eixo `k` mais perto dela. */
export function planoPelaNormal(ponto, normal, k = null) {
  const n = unit3(normal);
  if (norma3(n) === 0) throw new Error('a normal do corte não pode ser nula.');
  const eixoMaisPerto = k ?? [0, 1, 2].reduce((m, i) => (Math.abs(n[i]) > Math.abs(n[m]) ? i : m), 0);
  const nk = n[eixoMaisPerto] < 0 ? mul3(n, -1) : n;
  const d0 = DIREITA_DO_CORTE[eixoMaisPerto];
  const direita = unit3(sub3(d0, mul3(nk, dot3(d0, nk))));
  const cima = cross3(nk, direita);
  const deEixo = Math.abs(nk[eixoMaisPerto]) > 1 - 1e-9;
  return { ponto, normal: deEixo ? [0, 1, 2].map((i) => (i === eixoMaisPerto ? 1 : 0)) : nk, direita, cima, eixo: deEixo ? NOME_DO_EIXO[eixoMaisPerto] : null };
}

/** Os triângulos cortados pelo plano, como segmentos [h1, v1, h2, v2] em mm no quadro do plano, com a origem no ponto dele. */
export function segmentosNoPlano(triangulos, plano) {
  const { ponto, normal, direita, cima } = plano;
  const c = dot3(normal, ponto);
  const tela = (p) => { const r = sub3(p, ponto); return [dot3(r, direita), dot3(r, cima)]; };
  const segmentos = [];
  for (const t of triangulos) {
    const s = t.map((p) => dot3(normal, p) - c);
    const acima = s.map((x) => x >= 0);
    if (acima[0] === acima[1] && acima[1] === acima[2]) continue;
    const pontos = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (acima[i] === acima[j]) continue;
      pontos.push(tela(add3(t[i], mul3(sub3(t[j], t[i]), s[i] / (s[i] - s[j])))));
    }
    if (pontos.length === 2) segmentos.push([...pontos[0], ...pontos[1]]);
  }
  return segmentos;
}

const distPontoSegmento = (px, py, [x1, y1, x2, y2]) => {
  const dx = x2 - x1; const dy = y2 - y1; const l2 = dx * dx + dy * dy;
  const u = l2 > 0 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2)) : 0;
  return Math.hypot(px - x1 - u * dx, py - y1 - u * dy);
};
const lado2 = (ax, ay, bx, by, cx, cy) => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
function distSegmentos(a, b) {
  const [a1, a2, a3, a4] = a; const [b1, b2, b3, b4] = b;
  if (lado2(a1, a2, a3, a4, b1, b2) * lado2(a1, a2, a3, a4, b3, b4) < 0 && lado2(b1, b2, b3, b4, a1, a2) * lado2(b1, b2, b3, b4, a3, a4) < 0) return 0;
  return Math.min(distPontoSegmento(a1, a2, b), distPontoSegmento(a3, a4, b), distPontoSegmento(b1, b2, a), distPontoSegmento(b3, b4, a));
}

/* um ponto [h, v] está dentro da seção pela paridade dos segmentos que a semirreta para +h cruza */
function dentroDaSecao(segmentos, h, v) {
  let dentro = false;
  for (const [x1, y1, x2, y2] of segmentos) {
    if ((y1 > v) === (y2 > v)) continue;
    if (x1 + ((v - y1) / (y2 - y1)) * (x2 - x1) > h) dentro = !dentro;
  }
  return dentro;
}

/**
 * A folga no corte, entre as linhas da peça e as da vizinha a até `raio` mm do ponto do plano: `{ folgaMm, cruzam, de, ate }`, com
 * `cruzam` quando as linhas se cortam ou uma seção entra na outra, e `de`/`ate` os pontos [h, v] da folga.
 */
export function folgaNoCorte(daPeca, daVizinha, raio) {
  const perto = (s) => distPontoSegmento(0, 0, s) <= raio;
  const a = daPeca.filter(perto); const b = daVizinha.filter(perto);
  if (!a.length || !b.length) return null;
  /* no empate, que é o contato ao longo de uma face, fica o par mais perto do ponto do plano */
  let melhor = { folgaMm: Infinity, de: null, ate: null, longe: Infinity };
  for (const sa of a) for (const sb of b) {
    const d = distSegmentos(sa, sb);
    const longe = Math.min(distPontoSegmento(0, 0, sa), distPontoSegmento(0, 0, sb));
    if (d < melhor.folgaMm - 1e-6 || (d <= melhor.folgaMm + 1e-6 && longe < melhor.longe)) {
      const candidatos = [[sa[0], sa[1]], [sa[2], sa[3]]].map((p) => ({ p, d: distPontoSegmento(p[0], p[1], sb) }));
      const outro = [[sb[0], sb[1]], [sb[2], sb[3]]].map((p) => ({ p, d: distPontoSegmento(p[0], p[1], sa) }));
      const melhorDe = [...candidatos, ...outro].sort((x, y) => x.d - y.d)[0];
      const naPeca = candidatos.includes(melhorDe);
      const alvo = naPeca ? sb : sa;
      const [x1, y1, x2, y2] = alvo; const dx = x2 - x1; const dy = y2 - y1; const l2 = dx * dx + dy * dy;
      const u = l2 > 0 ? Math.max(0, Math.min(1, ((melhorDe.p[0] - x1) * dx + (melhorDe.p[1] - y1) * dy) / l2)) : 0;
      const q = [x1 + u * dx, y1 + u * dy];
      melhor = { folgaMm: Math.min(d, melhor.folgaMm), de: naPeca ? melhorDe.p : q, ate: naPeca ? q : melhorDe.p, longe };
    }
  }
  const meio = melhor.de ? [(melhor.de[0] + melhor.ate[0]) / 2, (melhor.de[1] + melhor.ate[1]) / 2] : [0, 0];
  const cruzam = melhor.folgaMm <= FOLGA_DE_CONTATO_MM || (dentroDaSecao(daPeca, meio[0], meio[1]) && dentroDaSecao(daVizinha, meio[0], meio[1]));
  const { longe, ...dita } = melhor;
  return { ...dita, folgaMm: cruzam ? 0 : melhor.folgaMm, cruzam };
}

/* ---------- a imagem do corte ---------- */

/* As letras, os dígitos e os sinais das legendas do corte, em 5 por 7. */
const GLIFOS_DO_CORTE = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110', C: '01111 10000 10000 10000 10000 10000 01111',
  D: '11110 10001 10001 10001 10001 10001 11110', E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01111 10000 10000 10011 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001', I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100', K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001', O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000', Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100', U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100', W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110', 2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11110 00001 00001 01110 00001 00001 11110', 4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000', 8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
  ',': '00000 00000 00000 00000 00110 00100 01000', '.': '00000 00000 00000 00000 00000 01100 01100', '-': '00000 00000 00000 11111 00000 00000 00000',
  '=': '00000 00000 11111 00000 11111 00000 00000', ':': '00000 01100 01100 00000 01100 01100 00000', '/': '00001 00010 00010 00100 01000 01000 10000',
  ';': '00000 01100 01100 00000 01100 00100 01000', '(': '00010 00100 01000 01000 01000 00100 00010', ')': '01000 00100 00010 00010 00010 00100 01000', '+': '00000 00100 00100 11111 00100 00100 00000',
};

function tela(largura, altura, cor) {
  const dados = new Uint8Array(largura * altura * 3);
  for (let i = 0; i < dados.length; i += 3) { dados[i] = cor[0]; dados[i + 1] = cor[1]; dados[i + 2] = cor[2]; }
  return { largura, altura, dados };
}
function pintar(im, x, y, cor) {
  if (x < 0 || y < 0 || x >= im.largura || y >= im.altura) return;
  const i = (y * im.largura + x) * 3; im.dados[i] = cor[0]; im.dados[i + 1] = cor[1]; im.dados[i + 2] = cor[2];
}
function escreverNoCorte(im, texto, x0, y0, cor = [20, 20, 20], escala = 2) {
  let x = x0;
  for (const c of semAcento(texto).toUpperCase()) {
    const g = GLIFOS_DO_CORTE[c];
    if (g) g.split(' ').forEach((linha, v) => [...linha].forEach((b, u) => {
      if (b === '1') for (let dy = 0; dy < escala; dy++) for (let dx = 0; dx < escala; dx++) pintar(im, x + u * escala + dx, y0 + v * escala + dy, cor);
    }));
    x += 6 * escala;
  }
}
function linhaNaTela(im, x0, y0, x1, y1, cor, espessura = 1, recorte = null) {
  const passos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const r = Math.floor(espessura / 2);
  for (let i = 0; i <= passos; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / passos); const y = Math.round(y0 + ((y1 - y0) * i) / passos);
    for (let dy = -r; dy <= espessura - 1 - r; dy++) for (let dx = -r; dx <= espessura - 1 - r; dx++) {
      const px = x + dx; const py = y + dy;
      if (recorte && (px < recorte.x || py < recorte.y || px >= recorte.x + recorte.l || py >= recorte.y + recorte.a)) continue;
      pintar(im, px, py, cor);
    }
  }
}

const virgula = (n, casas = 1) => n.toFixed(casas).replace('.', ',');
/* a barra de escala de um painel: o comprimento redondo mais perto de um quinto da janela */
function barraDaEscala(janelaMm) {
  const alvo = janelaMm / 5;
  const base = 10 ** Math.floor(Math.log10(alvo));
  return [1, 2, 5, 10].map((m) => m * base).reduce((m, c) => (Math.abs(c - alvo) < Math.abs(m - alvo) ? c : m));
}

/* Um painel: a seção da peça e a da vizinha cheias, com a linha por cima, roxo onde as duas se cruzam, a folga em vermelho. */
function painelDoCorte(im, { x, y, l, a }, janelaMm, daPeca, daVizinha, folga, marcar = null) {
  const escala = Math.min(l, a) / janelaMm;
  const px = (h) => x + l / 2 + h * escala; const py = (v) => y + a / 2 - v * escala;
  const meiaAltura = a / 2 / escala;
  const naFaixa = (s) => !(Math.max(s[1], s[3]) < -meiaAltura || Math.min(s[1], s[3]) > meiaAltura);
  const sp = daPeca.filter(naFaixa); const sv = daVizinha.filter(naFaixa);
  /* o preenchimento, linha a linha, pela paridade dos cruzamentos de cada seção */
  const cruzamentos = (segmentos, v) => segmentos.filter(([, y1, , y2]) => (y1 > v) !== (y2 > v))
    .map(([x1, y1, x2, y2]) => x1 + ((v - y1) / (y2 - y1)) * (x2 - x1)).sort((m, n) => m - n);
  const dentro = (lista, h) => { let n = 0; for (const c of lista) { if (c > h) break; n++; } return n % 2 === 1; };
  for (let j = 0; j < a; j++) {
    const v = (y + a / 2 - (y + j + 0.5)) / escala;
    const cp = cruzamentos(sp, v); const cv = cruzamentos(sv, v);
    if (!cp.length && !cv.length) continue;
    for (let i = 0; i < l; i++) {
      const h = (x + i + 0.5 - x - l / 2) / escala;
      const p = dentro(cp, h); const q = dentro(cv, h);
      if (p || q) pintar(im, x + i, y + j, p && q ? COR_DO_CRUZAMENTO : p ? COR_DA_PECA.fundo : COR_DA_VIZINHA.fundo);
    }
  }
  const recorte = { x, y, l, a };
  for (const s of sv) linhaNaTela(im, px(s[0]), py(s[1]), px(s[2]), py(s[3]), COR_DA_VIZINHA.linha, 2, recorte);
  for (const s of sp) linhaNaTela(im, px(s[0]), py(s[1]), px(s[2]), py(s[3]), COR_DA_PECA.linha, 2, recorte);
  if (folga?.de) {
    linhaNaTela(im, px(folga.de[0]), py(folga.de[1]), px(folga.ate[0]), py(folga.ate[1]), COR_DA_FOLGA, 2, recorte);
    for (const p of [folga.de, folga.ate]) {
      const cx = px(p[0]); const cy = py(p[1]);
      linhaNaTela(im, cx - 6, cy, cx + 6, cy, COR_DA_FOLGA, 1, recorte); linhaNaTela(im, cx, cy - 6, cx, cy + 6, COR_DA_FOLGA, 1, recorte);
    }
  }
  if (marcar) {
    const m = marcar / 2;
    const [x0, y0, x1, y1] = [px(-m), py(m), px(m), py(-m)];
    for (const [u0, v0, u1, v1] of [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]]) linhaNaTela(im, u0, v0, u1, v1, [60, 60, 60], 1, recorte);
  }
  const barra = barraDaEscala(janelaMm);
  const bx = x + 16; const by = y + a - 20;
  linhaNaTela(im, bx, by, bx + barra * escala, by, [20, 20, 20], 3, recorte);
  escreverNoCorte(im, `${virgula(barra, barra < 1 ? 1 : 0)} MM`, bx, by - 22);
  for (const [u0, v0, u1, v1] of [[x, y, x + l - 1, y], [x + l - 1, y, x + l - 1, y + a - 1], [x + l - 1, y + a - 1, x, y + a - 1], [x, y + a - 1, x, y]]) linhaNaTela(im, u0, v0, u1, v1, [120, 120, 120]);
}

const texto3 = (p) => `(${p.map((c) => virgula(c)).join('; ')})`;
const ROTULO_DO_EIXO = (v) => { const k = v.findIndex((c) => Math.abs(c) > 1 - 1e-9); return k < 0 ? null : `${v[k] > 0 ? '+' : '-'}${NOME_DO_EIXO[k]}`; };

/** O texto do plano de um corte: "x = 312,0 mm, visto de +x (direita da imagem -z, cima +y)", ou pelo ponto e a normal quando oblíquo. */
export function textoDoPlano(plano) {
  if (plano.eixo) {
    const k = NOME_DO_EIXO.indexOf(plano.eixo);
    return `${plano.eixo} = ${virgula(plano.ponto[k])} mm, visto de +${plano.eixo} (direita da imagem ${ROTULO_DO_EIXO(plano.direita)}, cima ${ROTULO_DO_EIXO(plano.cima)})`;
  }
  return `oblíquo, pelo ponto ${texto3(plano.ponto)} mm com a normal ${texto3(plano.normal.map((c) => c))}`;
}

/** A imagem de um corte, em PNG: o entorno à esquerda e o encaixe ampliado à direita, com a legenda e a folga escritas. */
export function imagemDoCorte({ peca, vizinha, plano, daPeca, daVizinha, folga, folgaMm }) {
  const L = 1360; const A = 780; const topo = 104;
  const im = tela(L, A, FUNDO_DO_CORTE);
  const medida = Math.max(folga?.folgaMm ?? 0, folgaMm ?? 0);
  const detalhe = Math.max(12, 16 * medida);
  const entorno = Math.min(800, Math.max(200, 30 * detalhe));
  escreverNoCorte(im, `CORTE ${peca} (LARANJA) COM ${vizinha} (AZUL); ROXO ONDE SE CRUZAM`, 14, 12);
  const dita = folga === null ? 'SEM AS DUAS PECAS NO CORTE'
    : folga.cruzam ? 'NO CORTE AS DUAS SE CRUZAM OU SE TOCAM (FOLGA 0 MM)' : `FOLGA NO CORTE ${virgula(folga.folgaMm, folga.folgaMm < 10 ? 2 : 1)} MM`;
  escreverNoCorte(im, `${dita}; ENTRE AS MALHAS ${virgula(folgaMm, folgaMm < 10 ? 2 : 1)} MM`, 14, 40, COR_DA_FOLGA);
  escreverNoCorte(im, `PLANO ${textoDoPlano(plano)}`.slice(0, 110), 14, 68);
  const l = (L - 3 * 14) / 2;
  painelDoCorte(im, { x: 14, y: topo, l, a: A - topo - 14 }, entorno, daPeca, daVizinha, folga, detalhe);
  painelDoCorte(im, { x: 28 + l, y: topo, l, a: A - topo - 14 }, detalhe, daPeca, daVizinha, folga);
  escreverNoCorte(im, `ENTORNO, ${virgula(entorno, 0)} MM`, 24, topo + 8, [60, 60, 60]);
  escreverNoCorte(im, `ENCAIXE AMPLIADO, ${virgula(detalhe, 0)} MM`, 38 + l, topo + 8, [60, 60, 60]);
  return paraPng(im);
}

/* ---------- os encaixes da peça com as vizinhas ---------- */

/** As vizinhas que a montagem (o JSON salvo) declara para a `instancia`: `Map(vizinha → [origem])`, pelas relações, posições, vínculos
 *  e contatos declarados à auditoria. */
export function vizinhasDeclaradas(dado, instancia) {
  const mapa = new Map();
  const juntar = (a, b, origem) => {
    const outra = a === instancia ? b : b === instancia ? a : null;
    if (!outra || outra === instancia) return;
    if (!mapa.has(outra)) mapa.set(outra, []);
    mapa.get(outra).push(origem);
  };
  for (const r of dado.relacoes ?? []) juntar(r.referencia?.caminho?.[0], r.movel?.caminho?.[0], `relação ${r.id} (${r.tipo})`);
  for (const p of dado.posicoes ?? []) juntar(p.instancia, p.em?.instancia, `posição ${p.id}`);
  for (const v of dado.vinculos ?? []) juntar(v.alvo?.instancia, v.de?.instancia, `vínculo ${v.id}`);
  for (const e of dado.auditoriaIntersecoes?.expectativas ?? []) juntar(e.a?.caminho?.[0], e.b?.caminho?.[0], `contato declarado ${e.id}`);
  return mapa;
}

function folhasDaMontagem(montagem, saida = []) {
  for (const instancia of montagem.instancias ?? []) {
    if (instancia.alvo?.tipo === 'peca') saida.push({ caminho: instancia.caminho, neutro: instancia.definicao?.neutro, pose: instancia.poseMundo });
    else if (instancia.montagem) folhasDaMontagem(instancia.montagem, saida);
  }
  return saida;
}

/* O plano que cai sobre uma face de uma das peças corta a face de lado e dá uma seção sem miolo: o ponto mais perto de duas caixas
   alinhadas é muitas vezes um canto. O plano anda, então, meio milímetro de cada vez para um lado e para o outro, até cortar as duas
   peças por dentro perto do ponto; se nenhum passo servir, fica o primeiro. */
export const PASSO_DO_PLANO_MM = 0.5;
export function planoQueCorta(plano, A, B, raio) {
  const sobreFace = (T, p) => { const c = dot3(p.normal, p.ponto); return T.some((t) => t.every((q) => Math.abs(dot3(p.normal, q) - c) < 1e-6)); };
  let primeiro = null;
  for (const passo of [0, 1, -1, 2, -2, 4, -4, 8, -8]) {
    const p = { ...plano, ponto: add3(plano.ponto, mul3(plano.normal, passo * PASSO_DO_PLANO_MM)) };
    const daPeca = segmentosNoPlano(A, p); const daVizinha = segmentosNoPlano(B, p);
    const folga = folgaNoCorte(daPeca, daVizinha, raio);
    const tentativa = { plano: p, daPeca, daVizinha, folga };
    primeiro ??= tentativa;
    if (folga && !sobreFace(A, p) && !sobreFace(B, p)) return tentativa;
  }
  return primeiro;
}

/**
 * Os encaixes da peça com as vizinhas, medidos numa montagem já resolvida: para cada outra peça declarada como vizinha ou a até
 * `alcance` mm, os dois pontos mais próximos e o plano do corte; com um corte declarado na receita (`CRITICA.cortes`: `{ vizinha,
 * ponto, normal }` em mm no mundo da montagem), o plano é o dele. Devolve os `limite` de menor folga, cada um com os segmentos das
 * duas seções e a folga no corte: `[{ vizinha, origens, folgaMm, plano, daPeca, daVizinha, folga, declarado }]`.
 */
export function encaixesDaPeca({ folhas, instancia, declaradas = new Map(), cortesDeclarados = [], alcance = ALCANCE_DO_ENCAIXE_MM, limite = LIMITE_DE_CORTES }) {
  const minha = folhas.filter((f) => f.caminho[0] === instancia);
  const A = minha.flatMap((f) => triangulosNoMundo(f.neutro, f.pose, f.caminho));
  const porVizinha = new Map();
  for (const f of folhas) {
    if (f.caminho[0] === instancia) continue;
    const nome = f.caminho.join('/');
    if (!porVizinha.has(nome)) porVizinha.set(nome, { topo: f.caminho[0], folhas: [] });
    porVizinha.get(nome).folhas.push(f);
  }
  const encaixes = [];
  for (const [nome, { topo, folhas: suas }] of [...porVizinha.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const B = suas.flatMap((f) => triangulosNoMundo(f.neutro, f.pose, f.caminho));
    const declarado = cortesDeclarados.find((c) => c.vizinha === nome || c.vizinha === topo) ?? null;
    const perto = maisPerto(A, B, alcance);
    if (!perto && !declarado) continue;
    const origens = [...(declaradas.get(topo) ?? [])];
    if (!origens.length) origens.push(`a menos de ${alcance} mm, sem declaração na montagem`);
    const raio = Math.max(2 * alcance, 4 * (perto?.folgaMm ?? 0));
    let { plano, daPeca, daVizinha, folga } = planoQueCorta(declarado ? planoPelaNormal(declarado.ponto, declarado.normal) : planoDoEncaixe(perto), A, B, raio);
    /* o contato achado por uma aresta que fura a outra peça pode dar um plano que não passa no contato: tenta os três planos de eixo
       pelo ponto, e fica o primeiro em que as duas se cruzam ou se tocam */
    if (!declarado && perto.folgaMm <= FOLGA_DE_CONTATO_MM && !folga?.cruzam) {
      for (const k of [0, 1, 2]) {
        const e = [0, 0, 0]; e[k] = 1;
        const outra = planoQueCorta(planoPelaNormal(perto.naPeca, e, k), A, B, raio);
        if (outra.folga?.cruzam) { ({ plano, daPeca, daVizinha, folga } = outra); break; }
      }
    }
    const folgaMm = perto?.folgaMm ?? folga?.folgaMm ?? null;
    if (folgaMm === null) continue;
    encaixes.push({ vizinha: nome, origens, folgaMm, plano, daPeca, daVizinha, folga, declarado: Boolean(declarado) });
  }
  return encaixes.sort((a, b) => a.folgaMm - b.folgaMm || (a.vizinha < b.vizinha ? -1 : 1)).slice(0, limite);
}

/**
 * Os cortes nos encaixes de uma peça que é instância de `montagem` (`{ arquivo, instancia }`): resolve a montagem até as etapas
 * construídas, mede os encaixes (`encaixesDaPeca`) e grava uma imagem por encaixe em `pasta`. Peça fora das etapas construídas não tem
 * corte, e isso volta em `aviso`. Devolve `{ cortes: [{ arquivo, vizinha, origens, folgaMm, folgaNoCorteMm, cruzam, plano, declarado }], aviso }`.
 */
export async function cortesDosEncaixes({ montagem, pasta, cortesDeclarados = [] }) {
  const [{ receitasDaMontagem, montagemAteAGeometria }, { lerMontagemPersistida }, { resolverMontagemPersistida }, { carregadoresDeReceitas }] = await Promise.all([
    import('./etapas-da-montagem.mjs'), import('../../src/autoria/ler-montagem-persistida.js'),
    import('../../src/autoria/resolver-montagem-persistida.js'), import('./peca-com-parametros.mjs'),
  ]);
  const dado = JSON.parse(readFileSync(montagem.arquivo, 'utf8'));
  const lida = lerMontagemPersistida(dado);
  const receitas = await receitasDaMontagem(lida);
  const { dado: parcial, construidas } = montagemAteAGeometria(dado, lida, receitas);
  if (!construidas.includes(montagem.instancia)) {
    return { cortes: [], aviso: `sem vista em corte nos encaixes: '${montagem.instancia}' ainda não está entre as etapas construídas.` };
  }
  const resolvida = await resolverMontagemPersistida(parcial, carregadoresDeReceitas(receitas));
  const encaixes = encaixesDaPeca({
    folhas: folhasDaMontagem(resolvida), instancia: montagem.instancia, declaradas: vizinhasDeclaradas(parcial, montagem.instancia), cortesDeclarados,
  });
  const cortes = encaixes.map((e) => {
    const arquivo = join(pasta, `corte-${montagem.instancia}-${e.vizinha.replace(/\//g, '-')}.png`);
    writeFileSync(arquivo, imagemDoCorte({ peca: montagem.instancia, vizinha: e.vizinha, plano: e.plano, daPeca: e.daPeca, daVizinha: e.daVizinha, folga: e.folga, folgaMm: e.folgaMm }));
    return {
      arquivo, vizinha: e.vizinha, origens: e.origens, folgaMm: e.folgaMm, folgaNoCorteMm: e.folga?.folgaMm ?? null, cruzam: e.folga?.cruzam ?? false,
      plano: textoDoPlano(e.plano), declarado: e.declarado,
    };
  });
  return { cortes, aviso: null };
}

const mmTexto = (n) => `${virgula(n, n < 10 ? 2 : 1)} mm`;

function secaoDosEncaixes(encaixes) {
  return [
    '## Encaixes em corte', '',
    'As vistas montadas não decidem a profundidade de um encaixe. Cada imagem desta seção corta a peça e uma vizinha no plano em que '
    + 'as duas ficam mais perto, tirado da malha: a peça em laranja, a vizinha em azul, roxo onde as duas se cruzam e a folga em '
    + 'vermelho, escrita em mm no alto. O painel da esquerda mostra o entorno, com um quadro onde fica o painel da direita, que amplia '
    + 'o encaixe; cada painel tem a barra de escala dele. Decida por estas imagens, e não pelas vistas montadas, se uma peça atravessa '
    + 'a outra ou fica solta dela.', '',
    ...lista(encaixes.map((e) => {
      const corte = e.folgaNoCorteMm === null ? 'sem as duas peças no corte'
        : e.cruzam ? 'as duas se cruzam ou se tocam no corte' : `folga de ${mmTexto(e.folgaNoCorteMm)} no corte`;
      return `com \`${e.vizinha}\` (${e.origens.join('; ')}): ${corte}, ${mmTexto(e.folgaMm)} entre as malhas; plano ${e.plano}${e.declarado ? ', declarado' : ''}: ${e.arquivo}`;
    })), '',
  ];
}

/* ---------- o alvo, a vista montada e a sobreposição ---------- */

/* A chave da composta do esboço inteiro em `alvos`, quando nenhuma forma ligada declara unidade. */
export const ALVO_DO_ESBOCO_INTEIRO = '*';

/**
 * O alvo de uma receita que declara `REFINA.esboco`: a composta da unidade que tem mais das formas ligadas, guardada em `alvos` das
 * formas resolvidas (`dados`, o `.formas.json` que `declarado.esboco` aponta; o caminho da imagem é relativo a ele). A unidade nula, de
 * quando nenhuma forma ligada declara unidade, é a do esboço inteiro (`*`). Recusa a unidade sem composta guardada, dizendo as que há, e
 * a composta que não existe. Devolve `{ origem, unidade, escolha }`; `copiarAlvo` a leva para `pasta/alvo`.
 */
export function alvoGuardado({ declarado, dados }) {
  const ids = [...new Set(Object.values(declarado.ligadas).flatMap((v) => (Array.isArray(v) ? v : v.formas)))].sort();
  const escolha = unidadeDoAlvo(dados, ids);
  const chave = escolha.unidade ?? ALVO_DO_ESBOCO_INTEIRO;
  const alvos = dados.alvos ?? {};
  if (!Object.hasOwn(alvos, chave)) {
    throw new Error(`as formas do esboço em ${declarado.esboco} não guardam a composta ${escolha.unidade ? `da unidade '${escolha.unidade}'` : 'do esboço inteiro'}, que é o alvo do crítico desta peça (guardadas: ${Object.keys(alvos).join(', ') || 'nenhuma'}).`);
  }
  const origem = resolve(dirname(declarado.esboco), alvos[chave]);
  if (!existsSync(origem)) throw new Error(`a composta ${alvos[chave]} que ${declarado.esboco} guarda como alvo não existe (procurada em ${origem}).`);
  return { origem, unidade: escolha.unidade, escolha };
}

/** Copia o alvo guardado (`alvoGuardado`) para `pasta/alvo`. Devolve `{ imagem, unidade, escolha }`. */
export function copiarAlvo({ origem, unidade, escolha }, pasta) {
  const pastaDoAlvo = join(pasta, 'alvo');
  mkdirSync(pastaDoAlvo, { recursive: true });
  const imagem = join(pastaDoAlvo, basename(origem));
  copyFileSync(origem, imagem);
  return { imagem, unidade, escolha };
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

/* ---------- o que a receita declara ao pacote do crítico ---------- */

/* A receita pode exportar `CRITICA`, com o que só ela sabe sobre o pacote: `referencias`, o lado de onde olha uma imagem cujo nome não
   diz (`{ 'foto.png': 'lateral' }`, um de `LADOS_DECLARAVEIS`), e `cortes`, o plano de um encaixe que a malha sozinha não dá
   (`[{ vizinha, ponto: [x, y, z], normal: [x, y, z], motivo }]`, em mm no mundo da montagem). Fica fora do `PLANO` e dos `CONTATOS`
   porque os dois são lidos por validadores que recusam campo novo. */
export function lerCritica(bruta) {
  if (bruta === null || bruta === undefined) return { referencias: {}, cortes: [] };
  const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  if (!objeto(bruta)) throw new Error('CRITICA da receita deve ser um objeto com `referencias` e `cortes`.');
  const extras = Object.keys(bruta).filter((k) => !['referencias', 'cortes'].includes(k));
  if (extras.length) throw new Error(`CRITICA: campo desconhecido '${extras[0]}'; aceito 'referencias' e 'cortes'.`);
  const referencias = bruta.referencias ?? {};
  if (!objeto(referencias)) throw new Error('CRITICA.referencias deve ser um objeto { arquivo: lado }.');
  for (const [arquivo, lado] of Object.entries(referencias)) {
    if (!LADOS_DECLARAVEIS.includes(lado)) throw new Error(`CRITICA.referencias['${arquivo}']: lado '${lado}' desconhecido; aceito ${LADOS_DECLARAVEIS.join(', ')}.`);
  }
  const cortes = bruta.cortes ?? [];
  if (!Array.isArray(cortes)) throw new Error('CRITICA.cortes deve ser uma lista.');
  const vetor = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
  cortes.forEach((c, i) => {
    if (!objeto(c) || typeof c.vizinha !== 'string' || !c.vizinha || !vetor(c.ponto) || !vetor(c.normal) || c.normal.every((x) => x === 0)) {
      throw new Error(`CRITICA.cortes[${i}] precisa de 'vizinha' (a instância), 'ponto' e 'normal' não nula, em mm no mundo da montagem.`);
    }
    if (typeof c.motivo !== 'string' || c.motivo.trim().length < 12) throw new Error(`CRITICA.cortes[${i}]: 'motivo' diz por que o plano é declarado, com pelo menos 12 caracteres.`);
  });
  return { referencias: { ...referencias }, cortes: cortes.map((c) => ({ ...c })) };
}

/* os arquivos que o plano cita e que não são imagem, com o caminho absoluto, como `referenciasDoPlano` os resolve */
function citadasQueNaoSaoImagem(plano, pastaDaReceita) {
  return (plano?.referencias ?? []).map((c) => [resolve(REPO, c), resolve(pastaDaReceita, c)].find((x) => existsSync(x))).filter((x) => x && !/\.(png|jpe?g|webp|gif)$/i.test(x));
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
export async function vistasParaCritica(peca, { logger = null, saida = null, prazoDeCargaMs = null, pastaDasCapturas = SAIDA_PADRAO, dependencias = {} } = {}) {
  const dep = {
    olharBancada,
    abrirCaptura: abrirCapturaCompartilhada,
    esbocoDeclarado: async (p) => (await import('./forma-do-esboco.mjs')).esbocoDeclarado(p),
    formasGuardadas: async (bruto, opcao, onde) => (await (await import('./refinamento-global.mjs')).lerFormasGuardadas(bruto, opcao, onde)).dados,
    olharEtapas: async (arquivo, opcoes) => (await import('./etapas-da-montagem.mjs')).olharEtapas(arquivo, opcoes),
    sobreposicaoDeCortes: async (opcoes) => (await import('./sobreposicao-de-cortes.mjs')).sobreposicaoDeCortes(opcoes),
    cortesDosEncaixes,
    vistasDeSuperficie,
    ...dependencias,
  };
  const blender = Object.hasOwn(dependencias, 'blender') ? dependencias.blender : doAmbiente('BLENDER');
  const caminho = resolverCaminhoReceita(peca);
  /* a impressão do texto que o pacote mostra, a mesma que a medição da rodada grava */
  const impressao = impressaoDoTexto(readFileSync(caminho, 'utf8'));
  const modulo = await importarReceita(caminho);
  const receita = receitaDoModulo(modulo);
  const critica = lerCritica(modulo?.CRITICA ?? receita?.CRITICA ?? null);
  const partes = partesDoPlano(receita);
  /* o que se confere antes de gastar minutos em captura: o plano, as imagens de referência e o esboço que a receita refina */
  const plano = normalizarPlanoDeModelagem(receita.PLANO);
  const referencias = referenciasDoPlano(plano, { pastaDaReceita: dirname(caminho) });
  if (referencias.ausentes.length) {
    throw new Error(mensagemDeReferenciasAusentes(referencias.ausentes));
  }
  /* a peça de lataria leva a luz rasante e a curvatura da lataria, que saem do Blender: sem ele, recusa antes de gastar captura */
  const lataria = superficieDaPeca(peca, receita, plano);
  if (lataria.luzRasante && !blender) throw new Error(mensagemSemBlender(peca, lataria));
  const declarado = await dep.esbocoDeclarado(peca);
  /* as formas do esboço que a receita refina e o alvo guardado com elas, conferidos antes de gastar captura */
  let dados = null;
  let alvoDaReceita = null;
  if (declarado) {
    let bruto;
    try {
      bruto = JSON.parse(readFileSync(declarado.esboco, 'utf8'));
    } catch (erro) {
      throw new Error(`não foi possível ler as formas do esboço ${declarado.esboco}: ${erro.message}`);
    }
    dados = await dep.formasGuardadas(bruto, declarado.opcao, declarado.esboco);
    alvoDaReceita = alvoGuardado({ declarado, dados });
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
    const resposta = await dep.olharBancada({ ...opcoes, logger, ...(prazoDeCargaMs ? { prazoDeCargaMs } : {}), ...(compartilhada ? { compartilhada } : {}) });
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

  /* O alvo é a composta guardada com as formas do esboço que a receita refina. */
  const alvo = alvoDaReceita ? copiarAlvo(alvoDaReceita, pasta) : null;

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

  /* Os cortes nos encaixes com as vizinhas, quando a peça é instância de uma montagem. */
  let encaixes = [];
  if (montagem) {
    const feitos = await dep.cortesDosEncaixes({ montagem, pasta, cortesDeclarados: critica.cortes });
    encaixes = feitos?.cortes ?? [];
    if (feitos?.aviso) avisos.push(feitos.aviso);
  }

  const sobreposicao = declarado ? await dep.sobreposicaoDeCortes({ peca, saida: pasta }) : null;
  const superficie = lataria.luzRasante ? await dep.vistasDeSuperficie(peca, { pasta, blender, lataria }) : null;
  /* a imagem de luz rasante quase toda escura não chega ao crítico: a luz que não alcança a chapa não mostra relevo nenhum */
  if (superficie) exigirLuzNaSuperficie(peca, superficie);

  const orientacao = dados?.orientacao ?? null;
  const perguntas = await (dep.perguntasDaPeca ?? perguntasDaPecaArquivo)(peca);
  const pedido = montarPedido({
    peca,
    plano,
    orientacao,
    alvo: alvo ? { imagem: alvo.imagem, unidade: alvo.unidade } : null,
    afastamentos: [...afastamentosDeclarados(declarado), ...novasDeclaradas(receita)].sort((a, b) => a.parte.localeCompare(b.parte)),
    referencias: referencias.imagens.map((c) => ({ caminho: c, ...(critica.referencias[basename(c)] ? { lado: critica.referencias[basename(c)] } : {}) })),
    contornos: contornosDasReferencias({ imagens: referencias.imagens, citadas: citadasQueNaoSaoImagem(plano, dirname(caminho)) }),
    encaixes,
    anteriores: pontosJaAtribuidos((dep.rodadasAnteriores ?? rodadasDaPasta)(pastaDasRodadas(peca, caminho))),
    modelo: [conjunto, traseira, esquerda].flatMap((r) => arquivosDe(r).map((arquivo) => ({ arquivo, vista: vistaDoArquivo(arquivo, peca) ?? 'vista' }))),
    arame: [
      ...arquivosDe(arame).map((arquivo) => ({ arquivo, vista: vistaDoArquivo(arquivo, peca) ?? 'vista', tipo: 'arame' })),
      ...arquivosDe(raioX).map((arquivo) => ({ arquivo, vista: vistaDoArquivo(arquivo, peca) ?? 'vista', tipo: 'raio X' })),
    ],
    montado: montada ? { instancia: montada.instancia, imagens: montada.arquivos.map((arquivo, i) => ({ arquivo, vista: montada.enquadramentos[i].vista })) } : null,
    sobreposicao: sobreposicao ? { arquivos: sobreposicao.arquivos, notas: sobreposicao.notas } : null,
    partes: porParte.map(({ parte, resultado }) => ({ nome: parte, imagens: arquivosDe(resultado).map((arquivo) => ({ arquivo, vista: vistaDoArquivo(arquivo, peca) ?? 'vista' })) })),
    perguntas: [...(perguntas.todas ?? []), ...(declarado ? [lerPergunta(PERGUNTA_DO_ALVO, 'a pergunta do alvo')] : [])],
    superficie,
  });
  const arquivoDoPedido = join(pasta, 'pedido.md');
  writeFileSync(arquivoDoPedido, pedido, 'utf8');
  const manifesto = gravarManifesto(pasta, { peca, receita: impressao, lataria, superficie });

  return {
    peca, partes, conjunto, traseira, esquerda, arame, raioX, porParte, pasta, pedido: arquivoDoPedido, manifesto, alvo, montada, sobreposicao, superficie, lataria, referencias, encaixes, avisos,
  };
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
  /* O caminho de cada vista isolada repete a pasta, a peça e o sufixo; numa peça de 64 partes eram 150 linhas de caminho
     quase iguais (achado de 2026-11-05). Quando todos seguem o mesmo molde, o molde sai uma vez e a parte lista só as vistas
     dela, e o caminho de cada uma se reconstrói por ele; o pedido do crítico continua com os caminhos inteiros. */
  const molde = /^(.*-)([a-z]+)(-sel-)(.+)(-isolar-orto-focado\.png)$/;
  const porParte = resultado.porParte.map(({ parte, resultado: r }) => ({ parte, arquivos: arquivosDe(r) }));
  const casados = porParte.flatMap(({ parte, arquivos }) => arquivos.map((a) => ({ parte, m: molde.exec(a) })));
  const prefixos = new Set(casados.map(({ m }) => m?.[1]));
  const cabe = casados.length && casados.every(({ parte, m }) => m && m[4] === parte) && prefixos.size === 1;
  if (cabe) {
    linhas.push(`  cada vista em ${[...prefixos][0]}<vista>-sel-<parte>-isolar-orto-focado.png`);
    for (const { parte, arquivos } of porParte) linhas.push(`  ${parte}: ${arquivos.map((a) => molde.exec(a)[2]).join(', ')}`);
  } else {
    for (const { parte, arquivos } of porParte) {
      linhas.push(`  ${parte}:`);
      for (const arquivo of arquivos) linhas.push(`    ${arquivo}`);
    }
  }
  if (resultado.alvo) {
    const { alvo } = resultado;
    linhas.push('', `ALVO (a composta ${alvo.unidade ? `da unidade ${alvo.unidade}` : 'do esboço inteiro'}, guardada com as formas do esboço):`, `  ${alvo.imagem}`);
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
  if (resultado.encaixes?.length) {
    linhas.push('', 'ENCAIXES EM CORTE (a peça em laranja, a vizinha em azul, a folga medida na malha):');
    for (const e of resultado.encaixes) {
      linhas.push(`  ${e.arquivo} (com ${e.vizinha}: ${e.cruzam ? 'cruzam no corte' : e.folgaNoCorteMm === null ? 'sem as duas no corte' : `folga no corte ${mmTexto(e.folgaNoCorteMm)}`}, ${mmTexto(e.folgaMm)} entre as malhas; plano ${e.plano})`);
    }
  }
  if (resultado.superficie) {
    const { superficie } = resultado;
    linhas.push('', resultado.lataria.lataria
      ? `SUPERFÍCIE (peça de lataria: ${resultado.lataria.porque}; chapa na curvatura: ${superficie.partes?.length ? superficie.partes.join(', ') : 'a malha inteira'}):`
      : `SUPERFÍCIE (luz rasante: ${resultado.lataria.porque}):`);
    for (const { arquivo } of superficie.rasante) linhas.push(`  ${arquivo} (luz rasante)`);
    for (const { arquivo } of superficie.curvatura) linhas.push(`  ${arquivo} (curvatura da lataria)`);
  }
  if (resultado.referencias?.ignoradas?.length) linhas.push('', `REFERÊNCIAS fora do pedido, porque não são imagem: ${resultado.referencias.ignoradas.join(', ')}`);
  for (const aviso of resultado.avisos ?? []) linhas.push('', `AVISO: ${aviso}`);
  linhas.push('', 'PEDIDO (o texto pronto para o crítico, com todos os caminhos acima):', `  ${resultado.pedido}`);
  return `${linhas.join('\n')}\n`;
}

async function principal(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv.slice(2), { opcoes: ['saida', 'prazo'], posicional: { nome: 'a peça', obrigatorio: true } });
    if (lido.opcao('prazo') !== null && !(Number(lido.opcao('prazo')) > 0)) throw new Error(`--prazo pede segundos maiores que zero; veio "${lido.opcao('prazo')}".`);
  } catch (erro) {
    process.stderr.write(`uso: node tools/modelar/vistas-para-critica.mjs <peça> [--saida=<pasta da rodada>] [--prazo=<segundos>]\n${erro.message}\n`);
    return 2;
  }
  /* --prazo: a peça pesada (o furgão realista, em 2026-11-06) não entra na cena nos 90 s de cada captura. */
  const prazo = lido.opcao('prazo');
  const resultado = await vistasParaCritica(lido.posicional, { saida: lido.opcao('saida'), ...(prazo !== null ? { prazoDeCargaMs: Number(prazo) * 1000 } : {}) });
  process.stdout.write(imprimir(resultado));
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((codigo) => { process.exitCode = codigo; }, (erro) => {
    process.stderr.write(`vistas-para-critica: ${erro.message}\n`);
    process.exitCode = 1;
  });
}
