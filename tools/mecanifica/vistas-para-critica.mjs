#!/usr/bin/env node
/* vistas-para-critica.mjs — monta, numa chamada, o pacote de imagens que a
 * crítica visual precisa receber.
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
 */
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { olharBancada } from './olhar-bancada.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
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

/* As imagens velhas da peça saem antes de cada pacote. A vista de trás sem
   arame não era gerada aqui, e a de uma captura antiga ficava na pasta com o
   mesmo nome: em 2026-09-24 três ajustes do ombro foram julgados sobre ela sem
   ninguém perceber que era mais velha que a receita. */
export function prefixoDaPeca(peca) {
  return `bancada-${peca.replace(/[\\/]/g, '-')}-`;
}

function apagarImagensAntigas(peca) {
  const prefixo = prefixoDaPeca(peca);
  for (const nome of readdirSync(SAIDA_PADRAO)) {
    if (nome.startsWith(prefixo) && nome.endsWith('.png')) rmSync(join(SAIDA_PADRAO, nome));
  }
}

export function partesDoPlano(receita) {
  const partes = receita?.PLANO?.partes;
  if (!Array.isArray(partes) || partes.length === 0) return [];
  return partes.map((parte) => parte?.nome).filter((nome) => typeof nome === 'string' && nome);
}

/* A SAÍDA NÃO É DECLARADA, e isso é decisão e não esquecimento. Quando `saida`
   vem preenchida, a bancada recusa a captura se já houver imagem daquela
   rodada ali, para não sobrescrever artefato de revisão. Este comando é feito
   para ser chamado a cada rodada sobre a mesma peça, então declarar a pasta
   faria ele falhar sempre a partir da segunda vez. A primeira versão deste
   arquivo declarava, falhava, e imprimia lista vazia sem reclamar — o mesmo
   silêncio que este repositório já caçou três vezes. */
export async function vistasParaCritica(peca, { logger = null } = {}) {
  const caminho = resolverCaminhoReceita(peca);
  const receita = receitaDoModulo(await importarReceita(caminho));
  const partes = partesDoPlano(receita);
  mkdirSync(SAIDA_PADRAO, { recursive: true });
  apagarImagensAntigas(peca);

  const conjunto = await olharBancada({ peca, revisar: true, res: RES_CONJUNTO, logger });
  exigirCaptura(conjunto, 'conjunto');
  /* O modo de revisão não aceita vista escolhida, então a de trás com sombra
     sai numa captura própria. */
  const traseira = await olharBancada({
    peca, auditoria: true, projecao: 'ortografica', vistas: 'traseira', res: RES_CONJUNTO, logger,
  });
  exigirCaptura(traseira, 'traseira');
  /* A lateral esquerda também, porque peça que não é simétrica tem parte só de um lado: a fuselagem do avião tem a
     porta à esquerda, e o crítico da primeira rodada dela não pôde conferir o vão da porta nem as janelas desse lado. */
  const esquerda = await olharBancada({
    peca, auditoria: true, projecao: 'ortografica', vistas: 'esquerda', res: RES_CONJUNTO, logger,
  });
  exigirCaptura(esquerda, 'esquerda');

  /* A MALHA TAMBÉM VAI AO CRÍTICO. No ombro do braço, a imagem com sombra
     mostrava uma faixa escura que parecia luz, e o arame mostrou a causa: um
     leque de lascas saindo de um vértice só. Sombra esconde topologia. */
  const arame = await olharBancada({
    peca, auditoria: true, arame: true, projecao: 'ortografica', vistas: VISTAS_DO_ARAME, res: RES_CONJUNTO, logger,
  });
  exigirCaptura(arame, 'arame');
  /* E uma vista em raio X, com o que fica atrás à vista: há defeito de malha
     que só aparece do outro lado da peça. */
  const raioX = await olharBancada({
    peca, auditoria: true, arame: 'raio-x', projecao: 'ortografica', vistas: 'traseira', res: RES_CONJUNTO, logger,
  });
  exigirCaptura(raioX, 'raio X');

  const porParte = [];
  for (const parte of partes) {
    const resultado = await olharBancada({
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
      logger,
    });
    exigirCaptura(resultado, `parte '${parte}'`);
    porParte.push({ parte, resultado });
  }

  return { peca, partes, conjunto, traseira, esquerda, arame, raioX, porParte };
}

/* Captura que não produziu arquivo recusa alto. A bancada devolve `ok:false` e
   uma mensagem, e engolir isso entregaria ao crítico um pacote com menos
   imagens do que ele acha que recebeu, o que é pior do que não entregar. A
   checagem de câmera do modo de revisão é exceção declarada: ela reprova
   enquadramento e ainda assim grava a imagem, e o enquadramento é assunto de
   quem conduz, não motivo para não haver pacote. */
function exigirCaptura(resposta, quem) {
  const arquivos = resposta?.resultado?.arquivos;
  if (Array.isArray(arquivos) && arquivos.length) return;
  const motivo = resposta?.erro?.mensagem ?? resposta?.stderr?.trim() ?? 'a bancada não disse por quê';
  throw new Error(`a captura do ${quem} não produziu imagem: ${motivo}`);
}

/* Os caminhos saem de `resultado.arquivos`, que a bancada devolve estruturado,
   e não de garimpar o texto do relato: quem consome esta saída é quem monta o
   despacho do crítico, e caminho lido de prosa quebra quando a prosa muda. */
function arquivosDe(resposta) {
  const arquivos = resposta?.resultado?.arquivos;
  return Array.isArray(arquivos) ? arquivos : [];
}

function imprimir(resultado) {
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
  return `${linhas.join('\n')}\n`;
}

async function principal(argv) {
  const alvo = argv[2];
  if (!alvo) {
    process.stderr.write('uso: node tools/mecanifica/vistas-para-critica.mjs <peça>\n');
    return 2;
  }
  const resultado = await vistasParaCritica(alvo);
  process.stdout.write(imprimir(resultado));
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((codigo) => { process.exitCode = codigo; }, (erro) => {
    process.stderr.write(`vistas-para-critica: ${erro.message}\n`);
    process.exitCode = 1;
  });
}
