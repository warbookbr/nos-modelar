#!/usr/bin/env node
/**
 * olhar-bancada.mjs — serviço headless de vistas e sua CLI fina.
 *
 * `olharBancada` recebe configuração explícita, injeta logs opcionalmente e
 * devolve resultado estruturado. Importar este módulo não lê argv, não sobe
 * Vite/Playwright, não grava arquivos e não encerra o processo.
 */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeConfinamento, criarDiretorioConfinado, verificarCaminhoConfinado } from './caminho-confinado.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { iniciarRegistro } from './diario.mjs';
import { ativarReceitaBancada } from './ativar-bancada.mjs';
import { paresIndistinguiveis } from '../../src/autoria/cor-de-auditoria.js';
import { lerCorte, lerLadoDoCorte, normalizarCorte } from '../../src/autoria/corte-de-plano.js';
import { VISTAS_BANCADA } from '../../src/autoria/vistas-da-bancada.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { analisarPeca, lerZoom } from './analise-da-peca.mjs';
import { contatosDaPeca } from '../../src/autoria/contatos-da-peca.js';
import { PASTA_DO_CACHE, assinaturaDaEntrada, executarReceitaGuardada } from './entrada-de-medida.mjs';
import { FATOR_DE_AMOSTRAGEM, reduzirPorMedia } from './capturar-montagem.mjs';
import { reduzirEmParalelo } from './reduzir-em-paralelo.mjs';
import { lancarChromium } from './navegador.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(REPO, 'tools/bancadas/out');
/* Onde cada captura grava a sessão própria dela: dentro do que o servidor da captura serve, e numa pasta que o controle de versão ignora. */
const SESSOES = join(OUT, 'sessoes');
const VISTAS_VALIDAS = ['isometrica', 'isometrica-traseira', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior'];
/* A isométrica de trás é a isométrica girada meia volta em torno do eixo vertical que passa pelo alvo da câmera: o mesmo quadro (a caixa é
   simétrica nesse giro) visto do lado oposto. A bancada não a conhece; a ferramenta a faz na página, depois de a vista isométrica assentar. */
const VISTA_ISO_TRASEIRA = 'isometrica-traseira';
const DIRECAO_DAS_VISTAS = Object.freeze({
  ...Object.fromEntries(Object.entries(VISTAS_BANCADA).map(([nome, v]) => [nome, v.direcao])),
  [VISTA_ISO_TRASEIRA]: Object.freeze([-1, 0.72, -1]),
});
/* A DISTÂNCIA DA CÂMERA QUE MIRA UM PONTO, em mm, quando `--distancia` não vem: o campo visível no ponto tem então uns 410 mm de altura. */
export const DISTANCIA_PADRAO_DA_MIRA_MM = 600;
/* De quanto em quanto tempo a captura diz em que passo está, quando alguém escuta (`aoProgredir`). */
export const INTERVALO_DO_PROGRESSO_MS = 15_000;
/* Etapas que valem uma linha de aviso ao começar: as que levam de segundos a minutos numa peça pesada. */
export const ESPERA_DO_ENCERRAMENTO_MS = 5000;
const ETAPAS_LONGAS = new Set(['medir os contatos da peça', 'subir o servidor', 'abrir o navegador', 'abrir a página', 'esperar o modelo entrar na cena']);
const MODOS = ['todas', 'contexto', 'isolar'];
/* O SERVIDOR DE UMA CAPTURA NÃO RECARREGA A PÁGINA QUANDO UM ARQUIVO MUDA. Com a carga única da `--analise` a página fica aberta por
   dezenas de minutos, e um arquivo do repositório editado nesse tempo (outro agente na mesma árvore) fazia o servidor mandar a página
   recarregar: ela perdia a ponte da bancada e a análise caía no meio, na quinta vista do furgão realista. A captura mostra a peça como
   estava ao abrir; sem o canal de recarga e sem o vigia de arquivos, o que muda depois só vale na captura seguinte. */
const servidorDaCaptura = () => ({ host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**'] } });
/* Teto de imagens de par por chamada. Uma peça de 24 partes tem 276 pares; sem
   teto, a primeira peça grande vira um despejo que ninguém abre. Três é o que
   cabe numa leitura sem rolar a tela, e o relato diz quantos ficaram de fora. */
const TETO_DE_PARES_POR_CHAMADA = 3;
/* O PRAZO DE CADA CARGA DE PÁGINA É DECLARADO. A espera pela ponte levava `{ timeout: 20000 }` no lugar do argumento errado de
   `waitForFunction` (era o argumento da função, não a opção), e a carga valia só o prazo padrão de 30 s do Playwright, que uma
   máquina dividida com outros agentes estoura: a perua levou 257 s numa máquina parada, e quatro capturas ao mesmo tempo passam
   dos 30 s só para abrir a página. O prazo vale por etapa da carga (abrir, ponte, modelo), por tentativa, e o erro diz qual. */
export const PRAZO_DE_CARGA_MS = 90_000;
/* A transição de câmera da bancada dura 280 ms (`DURACAO_TRANSICAO`, criar-ambiente.js); a espera entre uma vista e a seguinte, na
   mesma página, acaba quando ela termina e um quadro foi desenhado depois, e nunca passa do maior entre `espera` e este limite. */
const QUADROS_DEPOIS_DA_TRANSICAO = 1;
const LIMITE_DA_TRANSICAO_MS = 5000;

/* O LAÇO DE QUADROS DA BANCADA PARA DURANTE A FOTO. A bancada redesenha a cena a cada quadro, mesmo parada, e no Chromium sem tela
   (`--use-gl=swiftshader`) cada quadro de 1800 por 1800 leva uns 125 ms: medido na perua, `page.screenshot` levava 1,2 s com o laço
   ligado e 0,12 s com ele parado, e cada ordem à página esperava o quadro em curso. Parado o laço, a página mostra o último quadro
   desenhado, que é o da câmera já quieta; a foto sai a mesma, e a prova é o hash dos 51 PNG da perua, igual com e sem a pausa.
   Os retornos pedidos enquanto parado ficam numa fila e voltam ao navegador ao retomar, e por isso o laço da bancada, que se pede
   de novo a cada quadro, continua de onde parou. Estas funções rodam dentro da página e não tocam o código da bancada. */
function instalarControleDeQuadros() {
  if (window.__modelarQuadros) return;
  const original = window.requestAnimationFrame.bind(window);
  let fila = null;
  window.__modelarQuadros = {
    pausar() {
      if (fila) return;
      fila = [];
      /* números altos, para nunca coincidir com o de um quadro real em `cancelAnimationFrame` */
      window.requestAnimationFrame = (retorno) => { fila.push(retorno); return 1_000_000_000 + fila.length; };
    },
    retomar() {
      if (!fila) return;
      const guardados = fila;
      fila = null;
      window.requestAnimationFrame = original;
      for (const retorno of guardados) original(retorno);
    },
  };
}
/* Espera a transição de câmera terminar (`controls.enabled` volta a ser verdadeiro no quadro em que ela acaba) e `quadros` quadros
   depois, e então, se `parar`, para o laço. O limite evita ficar para sempre numa câmera que não termina. Com `ajuste`, a câmera
   quieta recebe o ajuste da ferramenta (`ajustarCamera`, instalada na página) antes desses quadros, para que a foto saia dele. */
function esperarCameraEPararQuadros([quadros, limite, parar, ajuste = null]) {
  const ponte = window.__mecanificaBancada;
  const inicio = performance.now();
  return new Promise((resolver) => {
    const depois = (restantes) => {
      if (restantes <= 0) { if (parar) window.__modelarQuadros.pausar(); resolver(true); return; }
      requestAnimationFrame(() => depois(restantes - 1));
    };
    const ajustar = () => { if (ajuste) window.__modelarAjuste = window.__modelarAjustarCamera(ajuste); };
    const passo = () => {
      if (ponte.ambiente().controls.enabled === true) { ajustar(); depois(quadros); return; }
      if (performance.now() - inicio > limite) { ajustar(); if (parar) window.__modelarQuadros.pausar(); resolver(false); return; }
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });
}

/* O AJUSTE DA CÂMERA FEITO NA PÁGINA, sobre a câmera já quieta, pela ponte e pelo ambiente que a bancada publica (nada de `src/bancada`
   é tocado). Corre dentro do navegador e por isso é autossuficiente. `ajuste` traz:
   - `mirar` ({ mm: [x, y, z], distanciaMm, direcao }): a câmera olha o ponto, dado em mm do referencial da peça (a receita, em metro,
     vezes 1000), de `distanciaMm` e da direção da vista. O quadro é o do campo de 38 graus a essa distância, nas duas projeções, e a
     distância mínima dos controles cede para a câmera poder chegar perto;
   - `giro`: gira a câmera meia volta em torno do eixo vertical do alvo (a isométrica de trás);
   - `fora`: se a câmera ficou dentro da caixa da peça inteira (o `--focar` de uma parte pequena a põe a 0,6 m do centro dela, que
     em contexto é dentro da cabine), recua-a ao longo do mesmo raio até passar da caixa, e na perspectiva compensa o recuo com o zoom
     da câmera, de modo que o quadro não muda.
   Devolve o que fez, e a ferramenta escreve isso no relato. */
export function ajustarCamera(ajuste) {
  const amb = window.__mecanificaBancada.ambiente();
  const cam = amb.camera;
  const V3 = cam.position.constructor;
  let raiz = null;
  for (const filho of amb.scene.children) {
    let tem = false;
    filho.traverse((o) => { if (Array.isArray(o.userData?.faces)) tem = true; });
    if (tem) { raiz = filho; break; }
  }
  if (!raiz) return { erro: 'a página não tem a peça na cena' };
  raiz.updateMatrixWorld(true);
  const escala = raiz.getWorldScale(new V3()).x || 1;
  const caixaDaPeca = () => {
    const min = new V3(Infinity, Infinity, Infinity); const max = new V3(-Infinity, -Infinity, -Infinity);
    raiz.traverseVisible((o) => {
      const g = o.geometry; if (!g) return;
      if (!g.boundingBox) g.computeBoundingBox();
      if (!g.boundingBox || g.boundingBox.isEmpty()) return;
      for (const x of [g.boundingBox.min.x, g.boundingBox.max.x]) for (const y of [g.boundingBox.min.y, g.boundingBox.max.y]) for (const z of [g.boundingBox.min.z, g.boundingBox.max.z]) {
        const p = new V3(x, y, z).applyMatrix4(o.matrixWorld);
        min.min(p); max.max(p);
      }
    });
    return { min, max };
  };
  const dentro = (p, caixa) => p.x > caixa.min.x && p.x < caixa.max.x && p.y > caixa.min.y && p.y < caixa.max.y && p.z > caixa.min.z && p.z < caixa.max.z;
  const alvo = amb.controls.target;
  const relato = {};
  if (ajuste.mirar) {
    const m = ajuste.mirar.mm;
    const c = raiz.localToWorld(new V3(m[0] / 1000, m[1] / 1000, m[2] / 1000));
    const d = (ajuste.mirar.distanciaMm / 1000) * escala;
    const dir = new V3(...ajuste.mirar.direcao).normalize();
    const acima = Math.abs(dir.y) > 0.99 ? [0, 0, dir.y > 0 ? -1 : 1] : [0, 1, 0];
    const el = amb.renderer.domElement;
    const aspecto = Math.max(0.001, el.clientWidth / Math.max(1, el.clientHeight));
    const meiaAltura = d * Math.tan((19 * Math.PI) / 180);
    amb.olharComoReferencia({ centro: [c.x, c.y, c.z], direcao: [dir.x, dir.y, dir.z], acima, meiaAltura, meiaLargura: meiaAltura * aspecto, vista: 'livre', instantaneo: true });
    amb.controls.minDistance = Math.min(amb.controls.minDistance, d / 2);
    cam.position.set(c.x + dir.x * d, c.y + dir.y * d, c.z + dir.z * d);
    cam.up.set(...acima);
    alvo.copy(c);
    cam.zoom = 1;
    cam.lookAt(c);
    cam.updateProjectionMatrix();
    relato.mirou = { ponto: m, distanciaMm: ajuste.mirar.distanciaMm, campoMm: Math.round(2 * meiaAltura / escala * 1000) };
  } else if (ajuste.giro) {
    const p = cam.position;
    cam.position.set(2 * alvo.x - p.x, p.y, 2 * alvo.z - p.z);
    cam.lookAt(alvo);
    relato.girou = true;
  }
  amb.controls.update();
  cam.updateMatrixWorld(true);
  const caixa = caixaDaPeca();
  const antes = cam.position.clone();
  relato.dentroDaPeca = dentro(antes, caixa);
  if (ajuste.fora && relato.dentroDaPeca) {
    const raio = antes.clone().sub(alvo);
    const d = raio.length();
    const dir = raio.clone().divideScalar(d || 1);
    let saida = Infinity;
    for (const eixo of ['x', 'y', 'z']) {
      if (Math.abs(dir[eixo]) < 1e-9) continue;
      const t = ((dir[eixo] > 0 ? caixa.max[eixo] : caixa.min[eixo]) - alvo[eixo]) / dir[eixo];
      if (t > 0) saida = Math.min(saida, t);
    }
    if (Number.isFinite(saida)) {
      const d2 = saida * 1.05 + 0.02 * escala;
      if (d2 > d) {
        cam.position.copy(alvo).addScaledVector(dir, d2);
        if (cam.isPerspectiveCamera) cam.zoom *= d2 / d;
        cam.lookAt(alvo);
        cam.updateProjectionMatrix();
        amb.controls.maxDistance = Math.max(amb.controls.maxDistance, d2 * 1.5);
        amb.controls.update();
        cam.updateMatrixWorld(true);
        relato.afastou = { deMm: Math.round((d / escala) * 1000), paraMm: Math.round((d2 / escala) * 1000) };
        relato.dentroDaPeca = false;
      }
    }
  }
  return relato;
}

/* OS PONTOS EM MM NO QUADRO DA FOTO, pela câmera que a página tem agora (corre dentro do navegador, sobre a câmera já quieta, e por
   isso é autossuficiente). `pontosMm` são pontos do referencial da peça (a receita, em metro, vezes 1000); saem em pixels do quadro, com
   a origem no canto de cima à esquerda, que é o tamanho da imagem gravada. É o que deixa o `--zoom` pedir uma região da peça e não de
   uma imagem: a caixa em mm projeta-se em cada vista. */
export function projetarPontos(pontosMm) {
  const amb = window.__mecanificaBancada.ambiente();
  const cam = amb.camera;
  const V3 = cam.position.constructor;
  let raiz = null;
  for (const filho of amb.scene.children) {
    let tem = false;
    filho.traverse((o) => { if (Array.isArray(o.userData?.faces)) tem = true; });
    if (tem) { raiz = filho; break; }
  }
  if (!raiz) return { erro: 'a página não tem a peça na cena' };
  raiz.updateMatrixWorld(true);
  cam.updateMatrixWorld(true);
  const el = amb.renderer.domElement;
  const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, top: 0 };
  const pixels = pontosMm.map((m) => {
    const p = raiz.localToWorld(new V3(m[0] / 1000, m[1] / 1000, m[2] / 1000)).project(cam);
    return [r.left + ((p.x + 1) / 2) * el.clientWidth, r.top + ((1 - p.y) / 2) * el.clientHeight];
  });
  return { pixels, quadro: [Math.round(r.left * 2 + el.clientWidth), Math.round(r.top * 2 + el.clientHeight)] };
}

/* OS CONTATOS DA PEÇA NÃO SE MEDEM DE NOVO QUANDO A RECEITA NÃO MUDOU. A medida executa a receita em Node (uns 100 s no furgão) e mede
   cada par de partes, e cada captura a pagava inteira, inclusive a que só queria uma imagem de perto. O resultado (só a lista dos pares
   acusados) fica em `tmp/cache-de-medida/`, onde as outras ferramentas de medida já guardam o delas, com a chave que elas usam, a
   assinatura do conteúdo da receita, do que ela importa e do núcleo (`assinaturaDaEntrada`), mais o código da própria medida de
   contatos, que a assinatura delas não segue. `--sem-cache` mede de novo e regrava; `--sem-contatos` não mede. */
const RAIZES_DA_MEDIDA_DE_CONTATOS = ['tools/modelar/entrada-de-medida.mjs', 'tools/modelar/importar-receita.mjs', 'src/autoria/executar-receita.js', 'src/autoria/contatos-da-peca.js', 'src/autoria/contato-de-solidos.js'];
const VERSAO_DO_CACHE_DE_CONTATOS = 1;
const rotuloDosContatos = (abs) => `contatos-${basename(abs).replace(/[^A-Za-z0-9._-]/g, '_')}.${createHash('sha256').update(abs).digest('hex').slice(0, 6)}`;

async function medirNoNode(caminho, { cache = true } = {}) {
  const moduloDaPeca = await importarReceita(caminho);
  const receitaDaPeca = receitaDoModulo(moduloDaPeca);
  /* a execução que a ativação da bancada acabou de guardar serve aqui: a receita é executada uma vez só por captura */
  const { neutro } = executarReceitaGuardada(caminho, receitaDaPeca, { cache }).executada;
  return contatosDaPeca(neutro, receitaDaPeca).naoDeclarados.map((item) => item.par);
}

/** `{ pares, origem: 'medidos' | 'do-cache', segundos, chave }`; falha se a receita não executa. */
export async function medirParesAcusados(caminho, { cache = true, pastaDoCache = PASTA_DO_CACHE, medir = medirNoNode } = {}) {
  const inicio = performance.now();
  let chave = null;
  if (cache) {
    try { chave = assinaturaDaEntrada(caminho, RAIZES_DA_MEDIDA_DE_CONTATOS).chave; } catch { chave = null; }
  }
  const arquivo = chave ? join(pastaDoCache, `${rotuloDosContatos(caminho)}-${chave}.json`) : null;
  if (arquivo && existsSync(arquivo)) {
    try {
      const lido = JSON.parse(readFileSync(arquivo, 'utf8'));
      if (lido?.versao === VERSAO_DO_CACHE_DE_CONTATOS && Array.isArray(lido.pares)) return { pares: lido.pares, origem: 'do-cache', segundos: (performance.now() - inicio) / 1000, chave };
    } catch { /* ilegível: mede de novo */ }
  }
  const pares = await medir(caminho, { cache });
  if (arquivo) {
    try {
      mkdirSync(pastaDoCache, { recursive: true });
      const parcial = `${arquivo}.${process.pid}.parcial`;
      writeFileSync(parcial, JSON.stringify({ versao: VERSAO_DO_CACHE_DE_CONTATOS, pares }));
      renameSync(parcial, arquivo);
      /* uma receita guarda só a medida da última versão dela */
      for (const f of readdirSync(pastaDoCache)) if (f.startsWith(`${rotuloDosContatos(caminho)}-`) && f.endsWith('.json') && f !== basename(arquivo)) { try { unlinkSync(join(pastaDoCache, f)); } catch { /* outra rodada pode tê-lo apagado */ } }
    } catch { /* o cache é conveniência: sem disco, a medida segue sem ele */ }
  }
  return { pares, origem: 'medidos', segundos: (performance.now() - inicio) / 1000, chave };
}

/* DICA APARECE UMA VEZ, E SÓ QUANDO SE APLICA.
   As duas dicas que existiam disparavam DENTRO do laço de vistas: numa chamada
   de três vistas, a mesma linha saía três vezes. Foi assim que a dica de
   resolução morreu — repetida em toda captura de peça alta, virou moldura de
   tela e parou de ser lida. Aqui cada dica tem chave, junta as vistas em que
   apareceu e sai uma vez só. Sem achado, `listar()` devolve lista vazia e nada
   é impresso: dica que sempre aparece não é dica, é cabeçalho. */
/* A FOTO É A CENA, E NÃO A TELA. Até aqui a captura era da página inteira, com
   a lista de componentes, o painel de inspeção, a barra de vistas e o rodapé
   ocupando a maior parte da imagem. Quem recebe essas imagens é o crítico
   visual e a IA que conduz a rodada, e para eles tudo isso é ruído: chegaram a
   julgar forma com o objeto ocupando um quarto do quadro, cercado de botões.
   Fotografar o canvas entrega só a cena, sem interface nenhuma, e sem precisar
   de modo especial na bancada. Se o canvas não existir, a página inteira volta
   a valer, porque imagem pior é melhor que nenhuma. */
/* A FOTO É A CENA, E NÃO A TELA. A captura era da página inteira, com a lista
   de componentes, o painel de inspeção, a barra de vistas e o rodapé ocupando
   a maior parte da imagem. Quem recebe essas imagens é o crítico visual e quem
   conduz a rodada, e para eles isso é ruído: uma crítica desta casa foi feita
   com o objeto ocupando um quarto do quadro, cercado de botões, e o crítico
   deu como ausente um flange que existia na malha.

   QUEM ESCONDE A INTERFACE É A PRÓPRIA BANCADA, pelo modo de auditoria, que já
   existia e faz mais do que esconder: tira o piso, a grade e a sombra, e
   estica o canvas para o quadro inteiro. Eu cheguei a escrever uma segunda
   forma de esconder, por estilo injetado daqui, antes de encontrar esta —
   duas maneiras de fazer a mesma coisa divergem no dia em que alguém mexe numa
   delas. Sobrou uma, e é a de lá. */

export function criarDicas() {
  const porChave = new Map();
  return {
    anotar(chave, texto, vista = null) {
      const atual = porChave.get(chave) ?? { chave, texto, vistas: [] };
      atual.texto = texto;
      if (vista && !atual.vistas.includes(vista)) atual.vistas.push(vista);
      porChave.set(chave, atual);
    },
    listar() {
      return [...porChave.values()].map(({ chave, texto, vistas }) => ({ chave, texto, vistas: [...vistas] }));
    },
  };
}
const PROJECOES = ['perspectiva', 'ortografica'];

class ErroDeUso extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.codigo = 2;
  }
}

function erroDeUso(mensagem) {
  throw new ErroDeUso(mensagem);
}

function normalizarLista(valor) {
  if (valor === null || valor === undefined) return [];
  if (Array.isArray(valor)) return valor.map((item) => String(item).trim()).filter(Boolean);
  return String(valor).split(',').map((item) => item.trim()).filter(Boolean);
}

function caminhoInterno(valor, nome) {
  if (valor === null || valor === undefined) return null;
  if (!valor || valor.includes('\\') || valor.startsWith('/') || /^[A-Za-z]:/.test(valor)
    || valor.split('/').includes('..')) {
    erroDeUso(`--${nome} precisa ser caminho relativo canônico dentro do repositório.`);
  }
  const destino = resolve(REPO, valor);
  const dentro = relative(REPO, destino);
  if (dentro.startsWith('..') || dentro === '' || /^[A-Za-z]:/.test(dentro)) {
    erroDeUso(`--${nome} precisa ficar dentro do repositório.`);
  }
  try {
    verificarCaminhoConfinado(destino, { raiz: REPO });
  } catch (erro) {
    if (erro instanceof ErroDeConfinamento) erroDeUso(`--${nome} recusado: ${erro.message}`);
    throw erro;
  }
  return destino;
}

function novoRelato() {
  return { stdout: [], stderr: [] };
}

function registrar(relato, logger, canal, mensagem) {
  const texto = `${mensagem}\n`;
  relato[canal].push(texto);
  if (typeof logger === 'function') logger(canal, mensagem);
  else if (logger && typeof logger[canal] === 'function') logger[canal](mensagem);
}

function erroEstruturado({ relato, erro, resultado = null }) {
  const uso = erro instanceof ErroDeUso;
  const mensagem = erro?.message ?? String(erro);
  if (uso) relato.stderr.unshift(`olhar-bancada: ${mensagem}\n`);
  else if (mensagem) relato.stderr.push(`\n${mensagem}\n`);
  return {
    ok: false,
    codigo: uso ? 2 : 1,
    erro: {
      categoria: uso ? 'uso' : 'execucao',
      codigo: uso ? 'uso_invalido' : 'falha_bancada',
      mensagem,
    },
    stdout: relato.stdout.join(''),
    stderr: relato.stderr.join(''),
    resultado,
  };
}

async function fecharRecursos({ browser, vite, pagina = null, proprios = true }) {
  const limpeza = [];
  /* Com recursos compartilhados o navegador e o servidor são de quem os abriu, e esta chamada fecha só a página dela. */
  const lista = proprios ? [['browser', browser], ['vite', vite]] : [['pagina', pagina]];
  for (const [recurso, instancia] of lista) {
    if (!instancia) continue;
    try {
      await instancia.close();
    } catch (erro) {
      limpeza.push({ recurso, codigo: 'falha_fechamento', mensagem: erro?.message ?? String(erro) });
    }
  }
  return limpeza;
}

/* O QUE O PRAZO VENCIDO DIZ. "Timeout 30000ms exceeded" não diz o que estava carregando nem se vale repetir: quatro agentes na mesma
   máquina o recebiam sem saber se a peça, a página ou o servidor era o lento. A mensagem traz a etapa, a peça, a vista, o tempo
   gasto desde o começo da captura e quantas imagens ainda faltavam. */
function descreverProgresso({ peca, etapa, vista, inicio, feitas, total }) {
  const partes = [`etapa: ${etapa}`];
  if (peca) partes.push(`peça '${peca}'`);
  if (vista) partes.push(`vista '${vista}'`);
  partes.push(`${Math.round(performance.now() - inicio)} ms gastos nesta captura`);
  partes.push(`${feitas} de ${total} imagens feitas, faltavam ${Math.max(0, total - feitas)}`);
  return partes.join('; ');
}

function erroDeTempo(timeoutMs, progresso) {
  const erro = new Error(`A bancada excedeu o limite de ${timeoutMs} ms (${descreverProgresso(progresso)}).`);
  erro.codigo = 'tempo_esgotado';
  return erro;
}

function erroDeCarga(prazoMs, progresso, detalhe) {
  /* A peça pesada (o furgão realista leva uns 2 min para executar a receita na página) estourava o prazo fixo sem dizer como
     dar mais tempo, e o modelador de 2026-11-06 contornou chamando `olharBancada` por script; a mensagem traz a opção. */
  const erro = new Error(`A bancada não terminou de carregar dentro do prazo de ${prazoMs} ms (${descreverProgresso(progresso)}). ${detalhe}`
    + ` Se a peça só é pesada, repita com --prazo=<segundos> (o padrão é ${PRAZO_DE_CARGA_MS / 1000}).`);
  erro.codigo = 'tempo_esgotado';
  return erro;
}

const ehTempoDoPlaywright = (erro) => erro?.name === 'TimeoutError' || /Timeout/i.test(erro?.message ?? '');

/* Rótulo de peça vira nome de arquivo: a sessão ativa usa `meta.nome`, que tem
   acento e espaço ("Cutelo de Sucata Reforçado"). */
export function apelidoDeArquivo(nome) {
  return String(nome ?? 'sessao-ativa')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sessao-ativa';
}

/**
 * O SERVIDOR E O NAVEGADOR DE VÁRIAS CAPTURAS SEGUIDAS. `olharBancada` sobe um servidor do Vite e um Chromium por chamada, e o pacote
 * da `vistas:critica` faz uma chamada por parte mais cinco do conjunto (26 na perua): quem abre uma vez e passa o resultado como
 * `compartilhada` paga a subida uma vez só. A sessão da peça (o arquivo que a página lê) e os pares acusados pela medida também
 * ficam aqui, porque dependem só da peça, e cada chamada de uma peça os reaproveita em vez de executar a receita de novo. Quem abre
 * é quem fecha, com `fechar()`; as chamadas fecham só a página delas.
 */
export async function abrirCapturaCompartilhada({ dependencias = {}, logger = null } = {}) {
  const createServer = dependencias.createServer ?? (async (...args) => (await import('vite')).createServer(...args));
  const carregarPlaywright = dependencias.carregarPlaywright
    ?? (async () => (await import(pathToFileURL(join(REPO, 'node_modules/playwright/index.js')).href)).default);
  let vite = null;
  let browser = null;
  try {
    vite = await createServer({
      root: REPO,
      configFile: join(REPO, 'vite.config.js'),
      server: servidorDaCaptura(),
      logLevel: 'error',
    });
    await vite.listen();
    const { port } = vite.httpServer.address();
    const pw = await carregarPlaywright();
    browser = await lancarChromium(pw.chromium);
    if (typeof logger === 'function') logger('info', 'Servidor e navegador abertos uma vez para as capturas seguintes.');
    return {
      vite,
      browser,
      base: `http://127.0.0.1:${port}/nos-modelar/tools/bancadas/harness.html`,
      sessoes: new Map(),
      /* a página que a última chamada deixou aberta para a seguinte, e quantas páginas se carregaram ao todo */
      pagina: null,
      cargas: 0,
      async fechar() {
        const limpeza = await fecharRecursos({ browser, vite, pagina: this.pagina?.page ?? null, proprios: false });
        limpeza.push(...await fecharRecursos({ browser, vite }));
        this.pagina = null;
        for (const { arquivo } of this.sessoes.values()) rmSync(arquivo, { force: true });
        this.sessoes.clear();
        return limpeza;
      },
    };
  } catch (erro) {
    await fecharRecursos({ browser, vite });
    throw erro;
  }
}

/**
 * Gera e inspeciona vistas da bancada. O retorno contém as vistas relatadas,
 * os caminhos dos PNGs, métricas de enquadramento e falhas estruturadas.
 */
export async function olharBancada({
  peca = null,
  vistas: vistasDeclaradas = null,
  selecionadas: selecionadasDeclaradas = null,
  par: parPedida = null,
  modo: modoDeclarado = null,
  projecao: projecaoDeclarada = null,
  explosao: explosaoDeclarada = 0,
  /* `ambiente`: 'estudio', 'ceu' ou 'nenhum', o ambiente de reflexo da bancada (`?ambiente=`); sem ele vale o padrão da página. */
  ambiente = null,
  res: resDeclarada = 1280,
  espera: esperaDeclarada = 1200,
  saida: saidaDeclarada = null,
  relatorio: relatorioDeclarado = null,
  listar = false,
  estrito = false,
  focar = false,
  revisar = false,
  /* A câmera que mira um ponto: `mirar` em mm do referencial da peça (`[x, y, z]` ou `"x,y,z"`) e `distancia` da câmera a ele, em mm. */
  mirar: mirarDeclarado = null,
  distancia: distanciaDeclarada = null,
  /* Pontos em mm do referencial da peça a projetar no quadro de cada vista (o `--zoom` em mm da análise): cada vista relatada traz `projecaoMm`. */
  projetar = null,
  /* A medida de contatos: `medirContatos: false` não a faz (`--sem-contatos`), e `cacheDeContatos: false` a refaz ainda que a receita não tenha mudado (`--sem-cache`). */
  medirContatos = true,
  cacheDeContatos = true,
  /* Quem escuta o andamento: recebe uma linha ao começar cada etapa longa e a cada `intervaloDoProgressoMs`. A CLI a liga na saída de erro. */
  aoProgredir = null,
  intervaloDoProgressoMs = INTERVALO_DO_PROGRESSO_MS,
  /* Imagem para LEITURA AUTOMÁTICA: sem cromo de interface, sem piso, sem grade
     e sem sombra. `coresPorParte` pinta uma cor por peça e devolve a legenda. */
  auditoria = false,
  coresPorParte = false,
  arame = false,
  /* A vista de corte: `{ eixo, posicao, lado }` (posição em mm do referencial da peça); o lado fica translúcido. */
  corte: corteDeclarado = null,
  capturarEmMemoria = false,
  timeoutMs = null,
  /* O prazo de cada etapa da carga da página (abrir, ponte, modelo), por tentativa. */
  prazoDeCargaMs = PRAZO_DE_CARGA_MS,
  /* O servidor, o navegador e a sessão da peça já abertos por `abrirCapturaCompartilhada`; sem eles a chamada abre e fecha os seus. */
  compartilhada = null,
  logger = null,
  dependencias = {},
} = {}) {
  const relato = novoRelato();
  const falhasRelatadas = [];
  let vite = null;
  let browser = null;
  let resposta = null;
  let temporizador = null;
  let encerramentoForcado = null;
  let expirou = false;
  let progressoDoPrazo = null;
  /* as gravações em curso (a redução de cada imagem corre fora da thread principal) */
  const gravacoes = [];
  /* o que o `finally` precisa saber da página para deixá-la aberta à chamada seguinte */
  let guardarErroDaPagina = null;
  let reaproveitavelDaChamada = false;
  let chaveDaPaginaDaChamada = null;
  let paginaSuja = false;
  let legendaDeAuditoria = null;
  /* o arquivo da sessão própria desta captura (ver `ativarReceitaBancada`), apagado ao fim; com `compartilhada` ele é da peça e não
     da chamada, e quem o apaga é `compartilhada.fechar()` */
  let sessaoDaCaptura = null;
  let page = null;
  /* o que a captura estava fazendo, para o prazo vencido dizer onde parou */
  /* A etapa é uma propriedade com aviso: ao entrar numa etapa longa a captura diz qual é, antes de começá-la, porque a de medir os
     contatos executa a receita na thread principal (uns 2 min no furgão) e nada mais pode falar enquanto ela corre. */
  let etapaAtual = 'preparar a captura';
  const progresso = {
    peca, vista: null, inicio: performance.now(), feitas: 0, total: 0,
    get etapa() { return etapaAtual; },
    set etapa(nova) {
      if (nova === etapaAtual) return;
      etapaAtual = nova;
      if (aoProgredir && ETAPAS_LONGAS.has(nova)) aoProgredir(`bancada: ${nova}${peca ? ` (${peca})` : ''}, ${Math.round((performance.now() - this.inicio) / 1000)} s desde o começo`);
    },
  };
  const batida = aoProgredir && intervaloDoProgressoMs > 0
    ? setInterval(() => aoProgredir(`bancada: ainda em '${progresso.etapa}'${progresso.vista ? ` (vista ${progresso.vista})` : ''}, ${Math.round((performance.now() - progresso.inicio) / 1000)} s gastos, ${progresso.feitas} de ${progresso.total} imagens feitas`), intervaloDoProgressoMs)
    : null;
  batida?.unref?.();
  /* UM SINAL NÃO DEIXA O NAVEGADOR E O SERVIDOR PARA TRÁS. Uma captura interrompida (Ctrl-C, `kill`, o prazo de quem a chamou)
     deixava o Chromium e o servidor do Vite vivos, e o processo antigo seguia segurando a porta até morrer por conta própria; agora
     o sinal fecha os dois, com um limite, e sai. Só vale para recursos que esta chamada abriu. */
  const aoSinal = (sinal) => {
    const limite = new Promise((ok) => setTimeout(ok, 4000));
    Promise.race([fecharRecursos({ browser, vite, pagina: page, proprios: !compartilhada }), limite]).finally(() => process.exit(sinal === 'SIGINT' ? 130 : 143));
  };
  const sinais = compartilhada ? [] : ['SIGINT', 'SIGTERM', 'SIGHUP'];
  for (const sinal of sinais) process.once(sinal, aoSinal);
  try {
    if (capturarEmMemoria && (saidaDeclarada !== null || relatorioDeclarado !== null)) {
      erroDeUso('captura em memória não aceita --saida ou --relatorio.');
    }
    if (timeoutMs !== null && (!Number.isFinite(Number(timeoutMs)) || Number(timeoutMs) <= 0)) {
      erroDeUso('timeoutMs precisa ser um número positivo.');
    }
    if (timeoutMs !== null) {
      temporizador = setTimeout(() => {
        expirou = true;
        /* o relato do prazo vencido guarda a etapa de AGORA, antes de os recursos se fecharem e a chamada em curso falhar */
        progressoDoPrazo = { ...progresso };
        encerramentoForcado = fecharRecursos({ browser, vite, pagina: page, proprios: !compartilhada });
      }, Number(timeoutMs));
    }
    const garantirPrazo = () => {
      if (expirou) throw erroDeTempo(Number(timeoutMs), progressoDoPrazo ?? progresso);
    };
    if (revisar && vistasDeclaradas !== null) erroDeUso('--revisar já define as vistas; não misture com --vistas');
    if (parPedida !== null && revisar) erroDeUso('--par é inspeção dirigida; não misture com --revisar.');
    if (parPedida !== null && vistasDeclaradas !== null) erroDeUso('--par escolhe a vista legível; não misture com --vistas.');
    if (parPedida !== null && selecionadasDeclaradas !== null) erroDeUso('--par já declara as duas partes; não misture com --selecionadas.');

    const selecionadas = normalizarLista(parPedida ?? selecionadasDeclaradas);
    const par = parPedida === null ? null : [...new Set(selecionadas)].sort();
    if (parPedida !== null && (par.length !== 2 || par.length !== selecionadas.length)) {
      erroDeUso('--par exige exatamente duas partes semânticas diferentes, separadas por vírgula.');
    }
    /* `--par` ESCOLHE a vista; ele nunca enquadrou. A recusa antiga dizia que
       sim, e o próprio relatório desmentia: ele aprova o par com 64 px por
       parte, que é um encaixe que ninguém consegue julgar na imagem. Numa peça
       de 1,2 m isso significa que a única pergunta que o modo `par` existe para
       responder — "este encaixe fecha?" — era a que ele não conseguia mostrar.
       Achado em uso: um cabo atravessando a empunhadura teve de ser diagnosticado
       pelos números da receita porque nenhuma vista dava para ver.
       Agora `--focar` é aceito e aproxima nas duas partes. Sem ele, nada muda. */
    if (parPedida !== null && modoDeclarado !== null && modoDeclarado !== 'isolar') {
      erroDeUso('--par sempre isola o par; não misture com outro --modo.');
    }
    if (parPedida !== null && explosaoDeclarada !== null && Number(explosaoDeclarada) !== 0) {
      erroDeUso('--par não aceita explosão: a inspeção não desloca geometria.');
    }
    const vistas = par
      ? ['inspecao-par']
      : normalizarLista(vistasDeclaradas ?? (revisar ? 'isometrica,frontal,direita,superior' : 'isometrica,frontal,direita'));
    const modo = par ? 'isolar' : (modoDeclarado ?? 'todas');
    const projecao = projecaoDeclarada ?? (revisar || par ? 'ortografica' : 'perspectiva');
    const explosao = Number(explosaoDeclarada ?? 0);
    if (ambiente !== null && !['estudio', 'ceu', 'nenhum'].includes(ambiente)) {
      erroDeUso(`--ambiente pede estudio, ceu ou nenhum; veio "${ambiente}".`);
    }
    /* `--res` aceita LARGURA ou LARGURAxALTURA.
     *
     * A proporção era 16:9 fixa no código, e objeto ALTO gastava o quadro à toa:
     * medido numa prensa hidráulica, a peça ocupava cerca de 18% da largura, e o
     * resto era fundo. Isso não é cosmético — é a mesma família da V-25, em que
     * forma foi julgada por três rodadas numa imagem cortada. Pixel que não
     * existe não vira julgamento, e julgar forma é o trabalho mais difícil que a
     * bancada serve.
     *
     * O padrão continua 16:9 de propósito: mudá-lo mexeria em toda captura de
     * gate já calibrada. O que muda é passar a EXISTIR a escolha, e o relatório
     * abaixo passa a apontá-la quando a silhueta é claramente vertical. */
    const declarada = String(resDeclarada ?? '');
    const casadoWxH = declarada.match(/^(\d+)\s*[xX×]\s*(\d+)$/);
    const largura = Math.max(640, parseInt(casadoWxH ? casadoWxH[1] : declarada, 10) || 1280);
    const altura = casadoWxH
      ? Math.max(360, parseInt(casadoWxH[2], 10))
      : Math.round(largura * 9 / 16);
    const espera = parseInt(esperaDeclarada, 10) || 1200;
    const estritoEfetivo = Boolean(estrito || revisar);
    /* Revisão sempre em modo de auditoria: a imagem da revisão é feita para
       ser lida e não para ser usada, e é ela que vai ao crítico. */
    /* Revisão sempre em modo de auditoria: a imagem da revisão é feita para ser
       lida e não para ser usada, e é ela que vai ao crítico. A página falsa dos
       testes não implementa a ponte de auditoria, e por isso a ligação só vale
       quando a ponte existe — imagem com cromo é pior, não é rodada quebrada. */
    const auditoriaEfetiva = Boolean(auditoria || revisar);
    if (focar && !selecionadas.length) erroDeUso('--focar exige --selecionadas');
    let mira = null;
    if (mirarDeclarado !== null && mirarDeclarado !== undefined) {
      const numeros = Array.isArray(mirarDeclarado) ? mirarDeclarado.map(Number) : String(mirarDeclarado).split(',').map((n) => Number(n.trim()));
      if (numeros.length !== 3 || !numeros.every(Number.isFinite)) erroDeUso(`--mirar pede x,y,z em milímetros do referencial da peça, por exemplo --mirar=1200,900,-300; veio "${mirarDeclarado}".`);
      const distancia = distanciaDeclarada === null || distanciaDeclarada === undefined ? DISTANCIA_PADRAO_DA_MIRA_MM : Number(distanciaDeclarada);
      if (!(distancia > 0)) erroDeUso(`--distancia pede milímetros maiores que zero; veio "${distanciaDeclarada}".`);
      if (par) erroDeUso('--mirar não se mistura com --par: o par escolhe a vista e o foco por conta própria.');
      if (revisar) erroDeUso('--mirar não se mistura com --revisar: a revisão confere a silhueta inteira no quadro, e a mira a corta de propósito.');
      if (focar) erroDeUso('--mirar não se mistura com --focar: os dois decidem o quadro; mire o ponto e escolha as partes com --selecionadas e --modo.');
      mira = { mm: numeros, distanciaMm: distancia };
    } else if (distanciaDeclarada !== null && distanciaDeclarada !== undefined) {
      erroDeUso('--distancia só vale junto de --mirar.');
    }
    let corte = null;
    if (corteDeclarado) {
      try { corte = normalizarCorte(corteDeclarado); } catch (erro) { erroDeUso(erro.message); }
      if (arame) erroDeUso('--corte não se mistura com --arame, --wireframe ou --raio-x: o corte já usa a transparência para mostrar o que fica atrás.');
      if (par) erroDeUso('--corte não se mistura com --par: a inspeção de par escolhe a vista e o foco por conta própria.');
    }
    for (const vista of vistas) {
      if (vista !== 'inspecao-par' && !VISTAS_VALIDAS.includes(vista)) {
        erroDeUso(`vista '${vista}' não existe. Use: ${VISTAS_VALIDAS.join(', ')}`);
      }
    }
    if (!MODOS.includes(modo)) erroDeUso(`modo '${modo}' não existe. Use: ${MODOS.join(', ')}`);
    if (!PROJECOES.includes(projecao)) erroDeUso(`projeção '${projecao}' não existe. Use: ${PROJECOES.join(', ')}`);
    if (!Number.isFinite(explosao) || explosao < 0 || explosao > 1) erroDeUso('explosao precisa estar entre 0 e 1');
    /* Sem --peca a bancada abre a SESSÃO ATIVA — a peça em que se está
       trabalhando, que por definição ainda não está no catálogo publicado.
       Se --peca for informada, pode ser:
       1. Uma fixture de teste privada do harness ('fixture-visual', etc.).
       2. Uma receita procedural do repositório (ex.: 'peca-de-prova', 'procedural/.../peca.js').
       Se for receita, auto-ativamos a sessão ativa para ela e carregamos a bancada via sessão,
       evitando timeout do Playwright. Se não existir em nenhum dos dois, falha rápido. */
    const FIXTURES_HARNESS = ['fixture-visual', 'fixture-hierarquia', 'fixture-portas', 'fixture-sem-portas', 'fixture-uniao', 'fixture-ombro-uniao'];
    const ehFixtureHarness = Boolean(peca && FIXTURES_HARNESS.includes(peca));

    let caminhoDaReceita = null;
    if (peca && !ehFixtureHarness) {
      let caminhoReceita;
      try {
        caminhoReceita = resolverCaminhoReceita(peca, { raiz: REPO });
        caminhoDaReceita = caminhoReceita;
      } catch {
        erroDeUso(`Peça '${peca}' não encontrada no catálogo de fixtures nem em procedural/{pecas,maquinas}/.`);
      }

      if (caminhoReceita) {
        const daPeca = compartilhada?.sessoes.get(peca) ?? null;
        if (daPeca) {
          sessaoDaCaptura = daPeca.arquivo;
        } else {
          try {
            const ativar = dependencias.ativarReceitaBancada ?? ativarReceitaBancada;
            /* A SESSÃO É DESTA CAPTURA. `sessao-ativa.json` é um arquivo só por repositório, e com duas capturas de peças diferentes
               ao mesmo tempo a segunda trocava o arquivo da primeira: a imagem de `aviao-motor` saiu com a deriva. Cada captura grava
               a peça num arquivo seu, único por processo e por chamada, e aponta a página para ele pela URL (`?sessao=`). Com
               `compartilhada` o arquivo é um por peça e por conjunto de chamadas, e as chamadas seguintes da mesma peça o reusam. */
            sessaoDaCaptura = join(SESSOES, `${apelidoDeArquivo(peca)}-${process.pid}-${randomUUID()}.json`);
            const inicioDaAtivacao = performance.now();
            const ativada = await ativar({ alvo: caminhoReceita, raiz: REPO, arquivoDaSessao: sessaoDaCaptura, cache: cacheDeContatos });
            if (compartilhada) compartilhada.sessoes.set(peca, { arquivo: sessaoDaCaptura, pares: null });
            if (logger) logger('info', `Peça '${peca}' ativada na sessão da bancada.`);
            const segundosDaAtivacao = Math.round((performance.now() - inicioDaAtivacao) / 100) / 10;
            registrar(relato, logger, 'stdout', ativada?.doCache
              ? `ativação: execução da receita lida do cache (tmp/cache-de-medida/; a receita não mudou desde a última execução), em ${segundosDaAtivacao} s; --sem-cache executa de novo.`
              : `ativação: receita executada agora, em ${segundosDaAtivacao} s.`);
          } catch (erro) {
            erroDeUso(`Falha ao ativar peça '${peca}' na bancada: ${erro.message}`);
          }
        }
      }
    }

    const saida = capturarEmMemoria ? null : (caminhoInterno(saidaDeclarada, 'saida') ?? OUT);
    const relatorio = capturarEmMemoria ? null : caminhoInterno(relatorioDeclarado, 'relatorio');
    const sufixoPartes = [
      selecionadas.length ? `sel-${[...selecionadas].sort().join('+')}` : null,
      modo !== 'todas' ? modo : null,
      projecao === 'ortografica' ? 'orto' : null,
      explosao > 0 ? `exp${Math.round(explosao * 100)}` : null,
      mira ? `mira-${mira.mm.map((n) => String(Math.round(n * 10) / 10).replace('-', 'm').replace('.', 'p')).join('_')}-d${Math.round(mira.distanciaMm)}` : null,
      par ? 'par' : null,
      focar ? 'focado' : null,
      arame === 'raio-x' ? 'raio-x' : (arame ? 'arame' : null),
      corte ? `corte-${corte.eixo}${corte.posicao}-${corte.lado}` : null,
    ].filter(Boolean);
    const sufixo = sufixoPartes.length ? `-${sufixoPartes.join('-')}` : '';
    if (!capturarEmMemoria) criarDiretorioConfinado(saida, { raiz: REPO });
    const arquivosPlanejados = !capturarEmMemoria && peca
      ? vistas.map((vista) => join(saida, `bancada-${apelidoDeArquivo(peca)}-${vista}${sufixo}.png`))
      : [];
    for (const arquivo of arquivosPlanejados) verificarCaminhoConfinado(arquivo, { raiz: REPO });
    if (saidaDeclarada && arquivosPlanejados.some((arquivo) => existsSync(arquivo))) {
      erroDeUso('--saida já contém uma ou mais imagens desta rodada; a bancada não sobrescreve artefato de revisão.');
    }

    /* OS PARES ACUSADOS SÃO MEDIDOS EM NODE, não perguntados à bancada: é a
       mesma medida que faz `descrever --estrito` reprovar, e duas respostas
       para a mesma pergunta seria o defeito. Peça vinda da sessão ativa não tem
       receita para executar aqui — nesse caso não há acusação a mostrar, e o
       silêncio é declarado em vez de virar lista vazia com cara de "está tudo
       certo". */
    let paresAcusados = [];
    /* O QUE HOUVE COM A MEDIDA vai no relato: `medidos` (agora), `do-cache` (a receita não mudou desde que foi medida), `pulados`
       (`--sem-contatos`), `falhou` ou `sem-receita` (peça da bancada ou da sessão, sem receita para executar). Só `medidos` e `do-cache`
       dizem que a lista de pares é a verdade; nos outros, a lista vazia é falta de medida e não falta de achado. */
    let contatos = { estado: 'sem-receita' };
    const sessaoDaPeca = peca && compartilhada ? compartilhada.sessoes.get(peca) ?? null : null;
    if (peca && caminhoDaReceita && !medirContatos) {
      contatos = { estado: 'pulados' };
      registrar(relato, logger, 'stdout',
        'contatos: NÃO medidos (--sem-contatos). A lista de pares acusados abaixo está vazia por falta de medida, não por falta de achado;'
        + ' para saber se a peça tem contato não declarado, rode sem --sem-contatos ou use `descrever --estrito`.');
    } else if (sessaoDaPeca?.pares) {
      paresAcusados = sessaoDaPeca.pares;
      contatos = sessaoDaPeca.contatos ?? { estado: 'medidos' };
    } else if (peca && caminhoDaReceita) {
      progresso.etapa = 'medir os contatos da peça';
      try {
        const medida = await (dependencias.medirParesAcusados ?? medirParesAcusados)(caminhoDaReceita, { cache: cacheDeContatos, medir: dependencias.medirContatos });
        paresAcusados = medida.pares;
        contatos = { estado: medida.origem, pares: medida.pares.length, segundos: Math.round(medida.segundos * 10) / 10 };
        if (sessaoDaPeca) { sessaoDaPeca.pares = paresAcusados; sessaoDaPeca.contatos = contatos; }
        registrar(relato, logger, 'stdout', medida.origem === 'do-cache'
          ? `contatos: lidos do cache (tmp/cache-de-medida/; a receita não mudou desde a última medida), ${medida.pares.length} par(es) acusado(s); --sem-cache mede de novo.`
          : `contatos: medidos agora em ${contatos.segundos} s, ${medida.pares.length} par(es) acusado(s).`);
      } catch (erro) {
        contatos = { estado: 'falhou', motivo: erro.message.split('\n')[0] };
        registrar(relato, logger, 'stdout',
          `(não consegui medir os contatos desta peça: ${contatos.motivo}) A lista de pares acusados está vazia por falta de medida, não por falta de achado.`);
      }
    }

    /* A entrada publicada pode estar legitimamente vazia. A ferramenta de
       inspeção, porém, precisa de uma peça para provar geometria; por isso usa
       o harness privado, que injeta um catálogo explícito de fixtures. */
    let base;
    if (compartilhada) {
      ({ vite, browser, base } = compartilhada);
    } else {
      progresso.etapa = 'subir o servidor';
      const createServer = dependencias.createServer ?? (async (...args) => (await import('vite')).createServer(...args));
      vite = await createServer({
        root: REPO,
        configFile: join(REPO, 'vite.config.js'),
        server: servidorDaCaptura(),
        logLevel: 'error',
      });
      await vite.listen();
      garantirPrazo();
      const { port } = vite.httpServer.address();
      base = `http://127.0.0.1:${port}/nos-modelar/tools/bancadas/harness.html`;
      progresso.etapa = 'abrir o navegador';
      const carregarPlaywright = dependencias.carregarPlaywright
        ?? (async () => (await import(pathToFileURL(join(REPO, 'node_modules/playwright/index.js')).href)).default);
      const pw = await carregarPlaywright();
      browser = await lancarChromium(pw.chromium);
    }
    garantirPrazo();
    /* BORDA SUAVIZADA: a página abre com `deviceScaleFactor` igual ao fator de amostragem, a bancada já desenha o buffer em
       `devicePixelRatio` (criar-ambiente.js), e `fotografar` devolve o PNG reduzido ao tamanho do viewport. A razão e a escolha do
       filtro estão em `FATOR_DE_AMOSTRAGEM`, em capturar-montagem.mjs. O layout continua em pixel CSS, e por isso a imagem final
       tem o tamanho de sempre. */
    /* A PÁGINA DA CHAMADA ANTERIOR SERVE À SEGUINTE. As 26 chamadas da `vistas:critica` da perua diferem na seleção, no arame e nas
       cores, que o controlador de partes calcula por inteiro do estado que se lhe dá (`aplicarVisual`), e no quadro, que a página
       não troca. Com `compartilhada`, uma chamada que terminou bem deixa a página aberta, e a próxima da mesma peça, do mesmo quadro,
       da mesma projeção e da mesma explosão reaplica a auditoria, a seleção e o modo pela ponte, como a primeira já fazia por cima
       da URL, e refaz o enquadramento. Qualquer outra diferença abre página nova. */
    const reaproveitavel = Boolean(compartilhada) && auditoriaEfetiva && !par && !listar && !corte;
    const chaveDaPagina = JSON.stringify({ peca, sessao: sessaoDaCaptura, largura, altura, projecao, explosao, ambiente });
    chaveDaPaginaDaChamada = chaveDaPagina;
    reaproveitavelDaChamada = reaproveitavel;
    let paginaNova = true;
    if (compartilhada?.pagina) {
      const guardada = compartilhada.pagina;
      compartilhada.pagina = null;
      if (reaproveitavel && guardada.chave === chaveDaPagina) {
        page = guardada.page;
        paginaNova = false;
      } else {
        await guardada.page.close().catch(() => {});
      }
    }
    if (paginaNova) {
      page = await browser.newPage({ viewport: { width: largura, height: altura }, deviceScaleFactor: FATOR_DE_AMOSTRAGEM });
    }
    const fotografar = async () => reduzirPorMedia(await page.screenshot({ type: 'png' }));
    /* Em arquivo, a redução de cada imagem corre numa thread enquanto a página segue para a vista seguinte; a gravação espera o fim. */
    const fotografarParaArquivo = async (arquivo) => {
      const bruto = await page.screenshot({ type: 'png' });
      gravacoes.push(reduzirEmParalelo(bruto).then((reduzido) => writeFileSync(arquivo, reduzido)));
    };
    const errosDaPagina = [];
    guardarErroDaPagina = (erro) => errosDaPagina.push(erro.message);
    page.on('pageerror', guardarErroDaPagina);
    let cargasDePagina = 0;
    const TENTATIVAS_DE_CARGA = 2;
    const abrirComRepeticao = async (url) => {
      for (let tentativa = 1; tentativa <= TENTATIVAS_DE_CARGA; tentativa++) {
        try {
          progresso.etapa = 'abrir a página';
          await page.goto(url, { waitUntil: 'load', timeout: prazoDeCargaMs });
          progresso.etapa = 'esperar a ponte da bancada';
          await page.waitForFunction(
            () => typeof window.__mecanificaBancada === 'object' && window.__mecanificaBancada !== null,
            undefined,
            { timeout: prazoDeCargaMs },
          );
          /* A ponte existir não significa que há modelo. A peça da sessão ativa
             chega pelo POLLING do sincronizador, depois do load — ler antes
             devolvia estatísticas nulas e derrubava a revisão visual. Espera o
             modelo de fato entrar na cena; `listar` não precisa de modelo. */
          if (!listar) {
            progresso.etapa = 'esperar o modelo entrar na cena';
            await page.waitForFunction(
              () => {
                const b = window.__mecanificaBancada;
                if (!b) return false;
                if (b.erro) throw new Error(String(b.erro));
                return b.carregado === true;
              },
              undefined,
              { timeout: prazoDeCargaMs },
            );
          }
          await page.evaluate(instalarControleDeQuadros);
          cargasDePagina += 1;
          if (compartilhada) compartilhada.cargas += 1;
          return tentativa;
        } catch (erro) {
          if (!ehTempoDoPlaywright(erro)) throw erro;
          if (tentativa === TENTATIVAS_DE_CARGA) {
            throw erroDeCarga(prazoDeCargaMs, progresso,
              `Tentativa ${tentativa} de ${TENTATIVAS_DE_CARGA}; endereço ${url}. ${String(erro.message).split('\n')[0]}`);
          }
          await page.goto('about:blank', { waitUntil: 'load' });
        }
      }
      return TENTATIVAS_DE_CARGA;
    };
    /* A VISTA SEGUINTE TROCA NA PÁGINA JÁ ABERTA. Cada vista abria a página de novo, e cada abertura executava a receita no
       navegador e refazia o modelo: das 51 imagens da `vistas:critica` da perua, 26 chamadas eram só carga. A vista vem pelo
       `ambiente` da ponte, em modo instantâneo como a URL faz na subida, e o enquadramento que se segue é o mesmo de uma página
       nova, porque `enquadrar`, `focar` e `focarContato` refazem centro, raio e caixa fixada por inteiro. A espera entre duas vistas
       da mesma página acaba quando a transição de câmera termina e dois quadros foram desenhados, e não passa do prazo da carga. */
    /* Só a imagem de auditoria para o laço: a interface da bancada (`--tela`) tem aviso e animação que andam por quadro, e parados
       a foto sairia sem o que ela mostraria. */
    const pararQuadros = async () => { if (auditoriaEfetiva) await page.evaluate(() => window.__modelarQuadros?.pausar()); };
    const aguardarCameraQuieta = async (ajuste = null) => {
      progresso.etapa = 'esperar a câmera parar';
      const terminou = await page.evaluate(esperarCameraEPararQuadros, [QUADROS_DEPOIS_DA_TRANSICAO, Math.max(espera, LIMITE_DA_TRANSICAO_MS), auditoriaEfetiva, ajuste]);
      if (!terminou) await page.waitForTimeout(espera);
    };
    /* O ajuste da câmera desta vista (ver `ajustarCamera`), ou null quando a vista é a da bancada sem mais nada. */
    const ajusteDaVista = (vista) => {
      if (mira) return { mirar: { mm: mira.mm, distanciaMm: mira.distanciaMm, direcao: DIRECAO_DAS_VISTAS[vista] ?? DIRECAO_DAS_VISTAS.isometrica } };
      const giro = vista === VISTA_ISO_TRASEIRA;
      const fora = Boolean(focar || par);
      return giro || fora ? { giro, fora } : null;
    };
    let ajusteInstalado = false;
    const instalarAjuste = async () => {
      if (ajusteInstalado) return;
      await page.evaluate((fonte) => { window.__modelarAjustarCamera = (0, eval)(`(${fonte})`); }, ajustarCamera.toString());
      ajusteInstalado = true;
    };
    const urlDa = (vista, sobrepor = {}) => {
      const alvos = sobrepor.selecionadas ?? selecionadas;
      const modoAlvo = sobrepor.modo ?? modo;
      const params = new URLSearchParams();
      if (ehFixtureHarness) params.set('peca', peca);
      if (sessaoDaCaptura) params.set('sessao', relative(REPO, sessaoDaCaptura).replaceAll('\\', '/'));
      if (alvos.length) params.set('selecionadas', [...alvos].sort().join(','));
      if (VISTAS_VALIDAS.includes(vista) && vista !== 'isometrica' && vista !== VISTA_ISO_TRASEIRA) params.set('vista', vista);
      if (projecao === 'ortografica') params.set('projecao', 'ortografica');
      if (modoAlvo !== 'todas') params.set('modo', modoAlvo);
      if (explosao > 0) params.set('explosao', explosao.toFixed(2));
      if (ambiente) params.set('ambiente', ambiente);
      const query = params.toString();
      return query ? `${base}?${query}` : base;
    };
    let falhou = false;
    const vistasRelatadas = [];
    const capturas = [];
    const paresCapturados = [];
    const dicas = criarDicas();
    const anotarDica = (chave, texto, vista = null) => dicas.anotar(chave, texto, vista);
    let pecaRelatada = null;
    progresso.total = vistas.length;
    let dadoDaChamada = null;
    for (const [indice, vista] of vistas.entries()) {
      progresso.vista = vista;
      const url = urlDa(vista);
      /* a primeira vista de uma página é a que a abre; as seguintes só trocam a câmera */
      const primeiraDaPagina = paginaNova && cargasDePagina === 0;
      if (primeiraDaPagina) {
        const tentativaDeAbertura = await abrirComRepeticao(url);
        garantirPrazo();
        if (tentativaDeAbertura > 1) registrar(relato, logger, 'stdout', `ferramenta: ${vista} abriu após repetição automática`);
      } else {
        progresso.etapa = 'trocar a vista na página aberta';
        if (!await page.evaluate(() => typeof window.__mecanificaBancada === 'object' && window.__mecanificaBancada !== null)) {
          throw new Error(`a página da bancada perdeu a ponte antes da vista ${vista} (recarregou ou caiu); repita a captura.`);
        }
        await page.evaluate((alvo) => {
          window.__modelarQuadros?.retomar();
          window.__mecanificaBancada.ambiente().definirVista(alvo, { instantaneo: true });
        }, vista === VISTA_ISO_TRASEIRA ? 'isometrica' : vista);
      }
      progresso.etapa = 'ler o estado da bancada';
      /* o que se lê da peça não muda de uma vista para a seguinte da mesma chamada */
      const dado = dadoDaChamada ?? await page.evaluate(() => {
        const b = window.__mecanificaBancada;
        return {
          ready: b.ready,
          erro: b.erro ?? null,
          // `peca` é função na ponte; ler o campo cru devolvia função (undefined ao serializar).
          peca: (typeof b.peca === 'function' ? b.peca() : b.peca) ?? b.nomePeca ?? null,
          partes: b.partes ?? [],
          selecaoIgnorada: b.selecaoIgnorada ?? [], diagnosticos: b.diagnosticos ?? null,
          estatisticas: b.estatisticas ?? null, estado: b.estado ? b.estado() : null,
        };
      });
      dadoDaChamada = dado;
      if (!dado.ready) {
        registrar(relato, logger, 'stderr', `\nBANCADA NÃO SUBIU\n  ${dado.erro}\n  ${url}`);
        falhou = true;
        break;
      }
      if (indice === 0) {
        if (listar) {
          const disponiveis = await page.evaluate(() => window.__mecanificaBancada.pecasDisponiveis);
          registrar(relato, logger, 'stdout', `peças disponíveis (${disponiveis.length}):\n  ${disponiveis.join('\n  ')}`);
          break;
        }
        const semParte = dado.diagnosticos?.facesSemParte?.length ?? 0;
        pecaRelatada = dado.peca;
        registrar(relato, logger, 'stdout', `peça: ${dado.peca}`);
        registrar(relato, logger, 'stdout', `partes (${dado.partes.length}): ${dado.partes.join(', ')}`);
        registrar(relato, logger, 'stdout', `malha: ${dado.estatisticas.facesNeutras} faces, ${dado.estatisticas.triangulos} triângulos, ${semParte} sem identidade`);
        /* a ponte confere os nomes que a URL da subida trouxe; numa página reaproveitada a seleção veio de fora da URL, e a conferência é daqui */
        const selecaoIgnorada = paginaNova ? dado.selecaoIgnorada : selecionadas.filter((nome) => !dado.partes.includes(nome));
        if (selecaoIgnorada.length) {
          registrar(relato, logger, 'stderr', `\nNOME DE PARTE INEXISTENTE: ${selecaoIgnorada.join(', ')}\n  a peça expõe: ${dado.partes.join(', ')}`);
          falhou = true;
          falhasRelatadas.push({ categoria: 'modelo', codigo: 'parte_inexistente', vista: null, mensagem: 'A seleção pediu parte que a peça não publica.', acao: 'Corrija o nome semântico; não substitua por índice ou UUID.' });
          break;
        }
        if (semParte && estritoEfetivo) {
          registrar(relato, logger, 'stderr', `\n${semParte} face(s) sem identidade semântica (--estrito)`);
          falhou = true;
          falhasRelatadas.push({ categoria: 'modelo', codigo: 'identidade_ausente', vista: null, mensagem: 'A peça contém face sem identidade semântica.', acao: 'Nomeie a origem ou a parte responsável antes da revisão visual.' });
          break;
        }
        registrar(relato, logger, 'stdout', '');
      }
      let resultadoPar = null;
      let vistaRelatada = vista;
      if (par) {
        resultadoPar = await page.evaluate((partes) => window.__mecanificaBancada.inspecionarPar(partes), par);
        if (!resultadoPar?.valida) {
          registrar(relato, logger, 'stderr', `\nINSPEÇÃO DE PAR RECUSADA\n  ${resultadoPar?.motivo ?? 'a bancada não devolveu resultado válido.'}`);
          falhou = true;
          falhasRelatadas.push({ categoria: 'modelo', codigo: 'par_invalido', vista: null, mensagem: 'A inspeção de par não recebeu duas partes semânticas válidas.', acao: 'Passe exatamente dois nomes publicados pela peça.' });
          break;
        }
        vistaRelatada = resultadoPar.vistaEscolhida;
        const leitura = resultadoPar.pixels.map((item) => `${item.nome}: ${item.pixels}px`).join(', ');
        registrar(relato, logger, 'stdout', `inspeção de par: ${resultadoPar.partes.join(' + ')}`);
        registrar(relato, logger, 'stdout', `vista escolhida: ${vistaRelatada} (${leitura})`);
        registrar(relato, logger, 'stdout', `candidatas: ${resultadoPar.candidatas.map((item) => `${item.vista}=${item.menor}px/${item.total}px`).join(', ')}`);
        if (!resultadoPar.legivel) {
          registrar(relato, logger, 'stderr', '  diagnóstico: nenhuma vista canônica deixou as duas partes legíveis (mínimo de 64px por parte).');
          falhou = true;
          falhasRelatadas.push({ categoria: 'camera', codigo: 'par_sem_vista_legivel', vista: vistaRelatada, mensagem: 'Nenhuma vista canônica mostrou as duas partes com leitura suficiente.', acao: 'Escolha uma vista explicitamente ou revise a peça; a ferramenta não moverá componentes.' });
        }
      }
      /* Numa página já em auditoria o foco desta posição seria refeito logo abaixo pelo enquadramento da auditoria, que o repete. */
      if (focar && (primeiraDaPagina || !auditoriaEfetiva)) {
        /* Depois da escolha de vista, e não em vez dela: a vista decide de ONDE
           olhar, o foco decide de QUÃO PERTO. São perguntas diferentes.
           No par, o foco é no CONTATO e não na união — a união de duas partes
           compridas que se tocam na ponta é as duas inteiras, e o encaixe volta
           a ficar com poucos pixels, que era o problema original. */
        if (par) {
          const contato = await page.evaluate(
            (partes) => window.__mecanificaBancada.focarContato(partes), par,
          );
          if (!contato?.valida) {
            registrar(relato, logger, 'stderr', `  foco de contato recusado: ${contato?.motivo ?? 'sem motivo'}`);
            falhou = true;
            falhasRelatadas.push({
              categoria: 'modelo', codigo: 'par_sem_contato', vista: vistaRelatada,
              mensagem: contato?.motivo ?? 'A bancada não conseguiu enquadrar o contato.',
              acao: 'Duas partes que não se sobrepõem não têm encaixe para julgar; confira a receita.',
            });
          } else {
            /* A cena é normalizada, então a caixa NÃO sai em milímetro. Sai
               como fração do maior lado da peça, que é o que responde "isto é
               um encaixe ou é a peça inteira?" sem fingir uma unidade. */
            const maior = Math.max(...contato.caixas.flatMap((c) => c.tamanho));
            const fracao = Math.max(...contato.contato.tamanho) / (maior || 1);
            registrar(relato, logger, 'stdout',
              `contato enquadrado: ${(fracao * 100).toFixed(1)}% do maior lado do par`);
          }
        } else {
          await page.evaluate(() => window.__mecanificaBancada.focar());
        }
      }
      /* O corte vale para todas as vistas da chamada: liga na primeira, pela ponte, e a cena o mantém. */
      if (corte && indice === 0) await page.evaluate((pedido) => window.__mecanificaBancada.corte(pedido), corte);
      /* AUDITORIA depois de escolher a vista e antes de esperar o quadro: o modo
         mexe no tamanho do canvas (o cromo sai e o desenho ocupa tudo), e mudar
         isso depois da espera capturaria o quadro do layout velho. */
      if (auditoriaEfetiva) {
        /* O modo de auditoria, as cores, o arame e a seleção valem para todas as vistas da chamada: ficam da primeira. */
        if (indice === 0) legendaDeAuditoria = await page.evaluate(
          ([cores, ar]) => window.__mecanificaBancada.auditoria({ cores, arame: ar }),
          [coresPorParte, arame],
        );
        /* Reenquadra só quando NINGUÉM pediu foco. `auditoria()` troca o
           tamanho do canvas, e sem reenquadrar a peça fica descentrada — mas
           chamar `enquadrar` depois de `focar` desfaz o zoom que o autor pediu,
           que foi o que aconteceu na primeira versão desta linha. */
        /* Seleção e foco são REAPLICADOS pela ponte, não deixados a cargo da
           URL. O parâmetro de URL é lido uma vez, na subida da página; a peça da
           sessão ativa chega segundos depois pelo polling, e o controlador é
           refeito com ela — levando junto a seleção que a URL tinha pedido. Em
           auditoria isso aparecia como uma imagem sem foco e sem fantasma, com o
           argumento aceito e ignorado em silêncio. */
        /* numa página reaproveitada a seleção anterior precisa sair, e por isso a ordem vai também com a lista vazia */
        if (indice === 0 && (selecionadas.length || !paginaNova)) {
          await page.evaluate(([nomes, m]) => {
            window.__mecanificaBancada.selecionar(nomes);
            window.__mecanificaBancada.modo(m);
          }, [selecionadas, modo]);
        }
        /* O REENQUADRE DA AUDITORIA PRECISA REPETIR A MESMA REGRA de cima, e
           não uma parecida. Ele roda DEPOIS e sobrescreve — foi assim que o foco
           de contato ficou sem efeito com `--cores`, aceito e desfeito em
           silêncio, que é exatamente o defeito que o comentário acima descreve
           para a seleção. */
        if (par && focar) {
          await page.evaluate((partes) => window.__mecanificaBancada.focarContato(partes), par);
        } else if (focar || parPedida) {
          await page.evaluate(() => window.__mecanificaBancada.focar());
        } else {
          await page.evaluate(() => window.__mecanificaBancada.enquadrar());
        }
      }
      const ajuste = ajusteDaVista(vista);
      if (ajuste) await instalarAjuste();
      if (primeiraDaPagina) {
        progresso.etapa = 'esperar a página assentar';
        await page.waitForTimeout(espera);
        if (ajuste) await aguardarCameraQuieta(ajuste);
        else await pararQuadros();
      } else {
        await aguardarCameraQuieta(ajuste);
      }
      garantirPrazo();
      if (ajuste) {
        const feito = await page.evaluate(() => window.__modelarAjuste ?? null);
        if (feito?.erro) registrar(relato, logger, 'stderr', `  ajuste da câmera recusado: ${feito.erro}`);
        if (feito?.mirou) registrar(relato, logger, 'stdout', `câmera mirando [${feito.mirou.ponto.join('; ')}] mm de ${feito.mirou.distanciaMm} mm (campo de ${feito.mirou.campoMm} mm de altura no ponto)`);
        if (feito?.afastou) {
          registrar(relato, logger, 'stdout', `a câmera de ${vista} estava dentro da peça; afastada de ${feito.afastou.deMm} para ${feito.afastou.paraMm} mm do alvo, com o mesmo quadro`);
          anotarDica('camera-recuada', 'a câmera recuou para fora da peça e o que fica entre ela e o alvo (a casca do lado oposto) pode escondê-lo: para ver a parte, use a vista do lado dela, --modo=isolar ou --corte.', vista);
        }
        if (feito?.mirou && feito.dentroDaPeca) anotarDica('mira-dentro', 'a câmera da mira está dentro da caixa da peça: o que a cerca (casca, cabine) fica atrás dela ou na frente do ponto; afaste com --distancia, ou isole as partes com --selecionadas --modo=isolar, ou corte com --corte.', vista);
      }
      progresso.etapa = 'medir o enquadramento';
      const { url: urlReproduzivel, enquadramento } = await page.evaluate(() => {
        const b = window.__mecanificaBancada;
        return { url: b.url(), enquadramento: b.enquadramento() };
      });
      /* Silhueta claramente vertical num quadro deitado: a peça cabe pela
         altura e sobra fundo dos dois lados. O enquadramento está CERTO — quem
         está errado é a proporção do quadro —, então isto é dica, não falha:
         quem julga forma decide se vale recapturar, e ninguém deve mexer na
         geometria por causa de moldura. */
      if (enquadramento.largura > 0 && enquadramento.altura / enquadramento.largura >= 2.5) {
        const sugerida = `${largura}x${Math.round(largura * 4 / 3)}`;
        anotarDica('silhueta-vertical',
          `silhueta vertical: ocupa ${(enquadramento.largura * 100).toFixed(0)}% da largura do quadro.`
          + ` Para não julgar forma em pouco pixel, tente --res=${sugerida}`, vista);
      }
      if (revisar) {
        const medida = `ocupação ${(enquadramento.area * 100).toFixed(1)}% (${(enquadramento.largura * 100).toFixed(1)}% × ${(enquadramento.altura * 100).toFixed(1)}%)`;
        if (!enquadramento.valida) {
          const codigo = enquadramento.cortado ? 'enquadramento_cortado' : 'enquadramento_pequeno';
          registrar(relato, logger, 'stderr', `\nFALHA DE CÂMERA em ${vista}: ${medida}${enquadramento.cortado ? '; silhueta cortada' : '; ocupação insuficiente após enquadramento automático'}\n  não altere a geometria apenas para preencher o quadro.`);
          falhasRelatadas.push({ categoria: 'camera', codigo, vista, mensagem: enquadramento.cortado ? 'A câmera cortou parte da silhueta.' : 'A câmera deixou a peça pequena demais para revisão.', acao: 'Corrija o enquadramento desta vista sem alterar a geometria da peça.' });
          falhou = true;
        } else registrar(relato, logger, 'stdout', `enquadramento ${vista}: ${medida}`);
      }
      const projecaoMm = projetar ? await page.evaluate(projetarPontos, projetar) : null;
      if (projecaoMm?.erro) erroDeUso(`não consegui projetar a caixa em mm: ${projecaoMm.erro}`);
      vistasRelatadas.push({
        nome: vistaRelatada,
        ...(projecaoMm ? { projecaoMm } : {}),
        enquadramento: {
          valida: enquadramento.valida, area: enquadramento.area, largura: enquadramento.largura,
          altura: enquadramento.altura, cortado: enquadramento.cortado,
        },
        ...(resultadoPar ? { inspecaoDePar: { partes: resultadoPar.partes, vistaEscolhida: resultadoPar.vistaEscolhida, pixels: resultadoPar.pixels, legivel: resultadoPar.legivel } } : {}),
      });
      pecaRelatada = dado.peca;
      progresso.etapa = 'fotografar a vista';
      if (capturarEmMemoria) {
        const dados = await fotografar();
        garantirPrazo();
        progresso.feitas += 1;
        capturas.push({ nome: vistaRelatada, mimeType: 'image/png', largura, altura, dados });
        registrar(relato, logger, 'stdout', `${vistaRelatada.padEnd(11)} memória: ${dados.byteLength} bytes`);
      } else {
        const apelidoEfetivo = apelidoDeArquivo(peca ?? dado.peca);
        const arquivo = join(saida, `bancada-${apelidoEfetivo}-${vista}${sufixo}.png`);
        verificarCaminhoConfinado(arquivo, { raiz: REPO });
        await fotografarParaArquivo(arquivo);
        progresso.feitas += 1;
        registrar(relato, logger, 'stdout', `${vistaRelatada.padEnd(11)} ${arquivo}`);
        if (legendaDeAuditoria?.cores) {
          const legenda = legendaDeAuditoria.legenda.map((e) => `${e.parte}=${e.cor}`).join(' ');
          registrar(relato, logger, 'stdout', `            legenda: ${legenda}`);
          /* A paleta CONFERE a si mesma e diz o que não conseguiu separar.
             Medido na bicicleta: `garfo` e `tirante` saíram a 0,079 de
             distância e o crítico visual cego leu os dois como uma peça só,
             reportando um achado falso com toda a confiança. Paleta que falha
             calada transfere o erro para quem olha; o aviso não decide nada,
             só impede que o silêncio decida. */
          const cores = Object.fromEntries(legendaDeAuditoria.legenda.map((e) => [e.parte, e.cor]));
          const proximos = paresIndistinguiveis(cores);
          if (proximos.length) {
            const lista = proximos.slice(0, 5)
              .map(({ a, b, distancia }) => `${a}~${b} (${distancia.toFixed(3)})`).join(', ');
            const resto = proximos.length > 5 ? `, e mais ${proximos.length - 5}` : '';
            anotarDica('cores-proximas',
              `cores próximas demais para distinguir na imagem: ${lista}${resto}.`
              + ' Isole essas partes por vez em vez de julgá-las nesta vista.', vista);
          }
        }
        registrar(relato, logger, 'stdout', `            local: ${urlReproduzivel}`);
      }
    }
    /* R02 — A VISTA DO PAR ACUSADO SAI COMO IMAGEM, junto das que foram pedidas.
       A rodada anterior fez o contato não declarado reprovar, e a reprovação
       nomeia o par em texto. Texto nomeia; imagem mostra. Quem recebe
       "tuboInferior ↔ rodaDianteiraPneu interpenetram" ainda precisa montar um
       comando para VER — e comando sugerido é tarefa de casa, que é o que esta
       sessão viu ser esquecido três vezes.
       Sem bandeira nova e sem comando novo: sai da mesma chamada.
       O teto existe porque uma peça de 24 partes tem 276 pares; sem ele, a
       primeira peça grande viraria um despejo de imagens que ninguém abre. */
    if (!falhou && !listar && !par && paresAcusados.length && !capturarEmMemoria) {
      const doTeto = paresAcusados.slice(0, TETO_DE_PARES_POR_CHAMADA);
      const excedente = paresAcusados.length - doTeto.length;
      progresso.total += doTeto.length;
      registrar(relato, logger, 'stdout',
        `\npares acusados pela medida (${paresAcusados.length}): capturando ${doTeto.length}`
        + `${excedente > 0 ? `, ${excedente} além do teto de ${TETO_DE_PARES_POR_CHAMADA}` : ''}`);
      for (const alvo of doTeto) {
        /* Esta imagem recarrega a página: a seleção e o isolamento do par vêm da URL, como sempre vieram, e a inspeção mede os
           pixels de cada vista com a interface ainda ligada. Reusar a página de uma vista em auditoria mudaria essa medida. */
        progresso.vista = `par ${alvo.join(' + ')}`;
        paginaSuja = true;
        const urlPar = urlDa('isometrica', { selecionadas: alvo, modo: 'isolar' });
        await abrirComRepeticao(urlPar);
        garantirPrazo();
        const inspecao = await page.evaluate((partes) => window.__mecanificaBancada.inspecionarPar(partes), alvo);
        if (!inspecao?.valida) {
          registrar(relato, logger, 'stdout', `  ${alvo.join(' ↔ ')}: bancada não conseguiu inspecionar — ${inspecao?.motivo ?? 'sem motivo'}`);
          continue;
        }
        /* SEMPRE EM AUDITORIA, mesmo que a chamada não tenha pedido. Esta imagem
           existe para ser LIDA — por quem revisa e pelo crítico cego, que recebe
           só o PNG. A primeira versão capturava com o cromo da bancada ligado, e
           os painéis de interface cobriam justamente o par que a imagem deveria
           mostrar. Cromo aqui não é preferência de estilo: é a prova tapada.
           A ordem repete a do laço principal e pela mesma razão: `auditoria()`
           troca o tamanho do canvas, e a seleção precisa ser reaplicada depois
           dela; o foco vem por último, senão o reenquadre desfaz o zoom. */
        await page.evaluate(
          ([cores, ar]) => window.__mecanificaBancada.auditoria({ cores, arame: ar }),
          [coresPorParte, arame],
        );
        await page.evaluate(([nomes]) => {
          window.__mecanificaBancada.selecionar(nomes);
          window.__mecanificaBancada.modo('isolar');
        }, [alvo]);
        const contato = await page.evaluate((partes) => window.__mecanificaBancada.focarContato(partes), alvo);
        await page.waitForTimeout(espera);
        await pararQuadros();
        garantirPrazo();
        const apelidoEfetivo = apelidoDeArquivo(peca ?? pecaRelatada);
        const arquivo = join(saida, `bancada-${apelidoEfetivo}-par-${alvo.map(apelidoDeArquivo).join('+')}.png`);
        verificarCaminhoConfinado(arquivo, { raiz: REPO });
        await fotografarParaArquivo(arquivo);
        progresso.feitas += 1;
        paresCapturados.push({ par: alvo, vista: inspecao.vistaEscolhida, arquivo, enquadrado: Boolean(contato?.valida) });
        registrar(relato, logger, 'stdout',
          `  ${alvo.join(' ↔ ')} (${inspecao.vistaEscolhida})${contato?.valida ? '' : ' — sem foco de contato'}: ${arquivo}`);
      }
    }

    progresso.etapa = 'reduzir e gravar as imagens';
    await Promise.all(gravacoes);
    garantirPrazo();

    /* A DICA QUE SÓ EXISTE SE TIVER O QUE DIZER. O plano que abriu esta rodada
       classificou a dica como a mais fraca das três defesas, e ela só se paga
       se disparar quando se aplica dizendo algo que ainda não se sabe.
       Por isso NÃO existe aqui uma dica genérica de "isole por pergunta": essa
       instrução já estava escrita, em destaque, em duas skills, foi lida e não
       foi seguida. Repeti-la em prosa seria a quarta tentativa do mesmo tipo.
       A R02 resolveu o problema fazendo — os pares acusados saem isolados como
       imagem sem ninguém precisar lembrar. O que sobra para a dica é o que a
       ferramenta sabe e quem lê não: quanto do acervo de pares ficou fora do
       teto, e por que a imagem pode enganar. */
    if (paresAcusados.length > paresCapturados.length && paresCapturados.length) {
      anotarDica('pares-alem-do-teto',
        `${paresAcusados.length - paresCapturados.length} par(es) acusado(s) ficaram sem imagem nesta chamada.`
        + ' Eles estão todos no veredito de `descrever --estrito`; o teto limita a exibição, nunca a detecção.');
    }
    const dicasListadas = dicas.listar();
    if (dicasListadas.length) {
      registrar(relato, logger, 'stdout', '\ndicas desta chamada:');
      for (const { texto, vistas } of dicasListadas) {
        const onde = vistas.length ? ` (${vistas.join(', ')})` : '';
        registrar(relato, logger, 'stdout', `  • ${texto}${onde}`);
      }
    }

    if (errosDaPagina.length) {
      registrar(relato, logger, 'stderr', `\nerros de página:\n  ${errosDaPagina.join('\n  ')}`);
      falhasRelatadas.push({ categoria: 'ferramenta', codigo: 'erro_da_pagina', vista: null, mensagem: 'A página da bancada emitiu erro durante a captura.', acao: 'Repita a captura depois de corrigir a ferramenta; não remodele a peça.' });
      falhou = true;
    }
    if (relatorio) {
      if (existsSync(relatorio)) {
        registrar(relato, logger, 'stderr', `\nolhar-bancada: --relatorio não sobrescreve '${relative(REPO, relatorio)}'.`);
        falhou = true;
      } else {
        criarDiretorioConfinado(dirname(relatorio), { raiz: REPO });
        verificarCaminhoConfinado(relatorio, { raiz: REPO });
        writeFileSync(relatorio, `${JSON.stringify({ peca: pecaRelatada, resultado: falhou ? 'recusada' : 'aceita', falhas: falhasRelatadas, vistas: vistasRelatadas })}\n`, { encoding: 'utf8', flag: 'wx' });
      }
    }
    const resultado = {
      peca: pecaRelatada, falhas: falhasRelatadas, vistas: vistasRelatadas, arquivos: arquivosPlanejados,
      paresAcusados: contatos.estado === 'pulados' || contatos.estado === 'falhou' ? null : paresAcusados, contatos, paresCapturados, cargasDePagina,
      dicas: dicas.listar(),
      ...(capturarEmMemoria ? { capturas } : {}),
    };
    resposta = {
      ok: !falhou, codigo: falhou ? 1 : 0, erro: falhou ? { categoria: 'bancada', codigo: 'bancada_recusou', mensagem: 'A bancada encerrou a captura sem aceitar a revisão.' } : null,
      stdout: relato.stdout.join(''), stderr: relato.stderr.join(''), resultado,
    };
  } catch (erro) {
    if (expirou || erro?.codigo === 'tempo_esgotado') {
      /* O prazo global derruba a chamada em curso com um erro de página fechada; a mensagem que vale é a do prazo, com a etapa em
         que ele venceu. O prazo de carga já traz a própria. */
      const doPrazo = expirou ? erroDeTempo(Number(timeoutMs), progressoDoPrazo ?? progresso) : erro;
      resposta = erroEstruturado({ relato, erro: doPrazo, resultado: { falhas: falhasRelatadas, progresso: { ...progresso } } });
      resposta.erro.codigo = 'tempo_esgotado';
    } else {
      resposta = erroEstruturado({ relato, erro, resultado: { falhas: falhasRelatadas } });
    }
  } finally {
    if (temporizador) clearTimeout(temporizador);
    if (batida) clearInterval(batida);
    for (const sinal of sinais) process.removeListener(sinal, aoSinal);
    await Promise.allSettled(gravacoes);
    const limpezaForcada = encerramentoForcado ? await encerramentoForcado : [];
    if (page && guardarErroDaPagina && typeof page.off === 'function') page.off('pageerror', guardarErroDaPagina);
    /* a página fica para a chamada seguinte só se esta terminou sem falha nem prazo e não a deixou em outro estado */
    const deixarAberta = Boolean(compartilhada && page && !paginaSuja && !expirou && resposta?.ok && reaproveitavelDaChamada);
    if (deixarAberta) compartilhada.pagina = { page, chave: chaveDaPaginaDaChamada };
    const limpeza = [
      ...limpezaForcada,
      ...await fecharRecursos({ browser, vite, pagina: deixarAberta ? null : page, proprios: !compartilhada }),
    ];
    if (sessaoDaCaptura && !compartilhada) rmSync(sessaoDaCaptura, { force: true });
    if (limpeza.length) {
      resposta ??= erroEstruturado({ relato, erro: new Error('A bancada falhou ao fechar seus recursos.') });
      resposta.ok = false;
      resposta.codigo = 1;
      resposta.limpeza = limpeza;
      resposta.erro ??= {
        categoria: 'execucao', codigo: 'falha_limpeza', mensagem: 'A bancada falhou ao fechar seus recursos.',
      };
      resposta.erro.limpeza = limpeza;
    }
  }
  return resposta;
}

/* A AJUDA. Em 2026-11-03 um modelador gastou chamadas para descobrir o que o comando oferecia: ele recusava `--ajuda` e
   listava só os nomes das opções. Cada linha diz o que a opção faz; o detalhe da análise mora em PARE-E-ANALISE.md. */
export const OPCOES_DA_CLI = ['peca', 'vistas', 'selecionadas', 'par', 'modo', 'projecao', 'explosao', 'res', 'espera', 'prazo', 'saida', 'relatorio', 'parte', 'zoom', 'zoom-antes', 'corte', 'corte-lado', 'ambiente', 'mirar', 'distancia'];
export const BANDEIRAS_DA_CLI = ['analise', 'listar', 'estrito', 'focar', 'revisar', 'auditoria', 'tela', 'cores', 'arame', 'wireframe', 'raio-x', 'sem-contatos', 'sem-cache'];
export const AJUDA = `npm run bancada -- <peça> [opções]  (node tools/modelar/olhar-bancada.mjs)
Captura a peça ou montagem na bancada, sem interface.

  --analise              o passo "Pare e analise": 6 vistas ortográficas em sombreado, arame e raio X, em tools/bancadas/out/analise-<peça>/, com a página e a peça carregadas uma vez só
  --parte=<nome>         com --analise, também a parte isolada e enquadrada nas 6 vistas
  --zoom=<vista>:<x0,y0,x1,y1>   com --analise, recorta o retângulo em pixels da vista (4 inteiros) e amplia 3 vezes
  --zoom=<vista>:mm:<x0,y0,z0,x1,y1,z1>   o mesmo recorte por uma caixa em mm do referencial da peça (dois cantos opostos), projetada na vista; o prefixo mm: é obrigatório, e 6 números sem ele são recusados
  --zoom-antes=<png>     com --zoom, põe o mesmo recorte de uma captura anterior ao lado
  --vistas=<a,b,...>     escolhe as vistas: ${VISTAS_VALIDAS.join(', ')}
  --arame | --wireframe  malha opaca sobre a peça (sem raio X e sem sombra da malha de trás)
  --raio-x               malha transparente, com o que fica atrás à vista
  --cores                uma cor por parte
  --corte=<x|y|z>:<mm>   vista de corte: um plano perpendicular ao eixo, na posição em mm do referencial da peça (ex.: z:0); um lado fica translúcido (opacidade 0,15) e o outro, normal e inteiro
  --corte-lado=<mais|menos>  com --corte: o lado do eixo que fica translúcido (padrão mais); não se mistura com --arame, --raio-x, --par nem --analise
  --ambiente=<estudio|ceu|nenhum>  o ambiente de reflexo da bancada; sem ele vale o padrão da página (a imagem de auditoria sai sem ambiente)
  --selecionadas=<a,b>   partes selecionadas; com --modo e --focar
  --modo=<${MODOS.join('|')}>  com --selecionadas: todas, a seleção no contexto, ou só ela
  --focar                enquadra a câmera nas selecionadas; se a câmera cair dentro da peça (parte pequena, vista de lado), recua-a para fora com o mesmo quadro
  --mirar=<x,y,z>        a câmera mira o ponto, em mm do referencial da peça, na vista de --vistas (ex.: --mirar=1200,900,-300 --vistas=direita); não se mistura com --focar, --par, --revisar nem --analise
  --distancia=<mm>       com --mirar: a distância da câmera ao ponto (padrão ${DISTANCIA_PADRAO_DA_MIRA_MM}; o campo visível no ponto tem 0,69 vez a distância de altura)
  --sem-contatos         não mede os contatos da peça (a medida executa a receita em Node, uns 100 s no furgão); o relato diz "NÃO medidos", e lista vazia de pares não quer dizer sem achado
  --sem-cache            executa a receita e mede os contatos de novo; sem ele, a execução e a medida da mesma receita (mesmo conteúdo) vêm de tmp/cache-de-medida/ e o relato diz "lidos do cache"
  --par=<a,b>            inspeção dirigida de duas partes (isola e escolhe a vista legível)
  --explosao=<0..1>      afasta as partes da montagem
  --projecao=<perspectiva|ortografica>  padrão perspectiva; ortográfica com --revisar e --par
  --res=<px>             largura da imagem (padrão 1280)
  --espera=<ms>          espera depois de carregar (padrão 1200)
  --prazo=<s>            prazo de carga da peça por tentativa, também na --analise (padrão 90; peça pesada pede mais)
  --saida=<pasta>        pasta relativa dentro do repositório (padrão tools/bancadas/out/); com --analise, as imagens vão para <pasta>/analise-<peça>/
  --relatorio=<arquivo>  grava o relatório da rodada em JSON
  --revisar              o conjunto de vistas da revisão
  --tela                 mostra a interface da bancada (não se mistura com --cores, --arame)
  --listar               lista as peças que a bancada abre
  --estrito              termina com erro se algo da captura falhar
  --auditoria            aceito por compatibilidade; a imagem já sai sem interface
  --peca=<nome>          a peça, no lugar do argumento posicional

Detalhe e leitura das imagens: docs/modelar/usar/PARE-E-ANALISE.md
`;

/** Encerra o processo com `codigo` se, passados `esperaMs`, algo ainda o mantiver vivo; o temporizador não o mantém vivo por si. */
export function agendarEncerramento(codigo, { esperaMs = ESPERA_DO_ENCERRAMENTO_MS, sair = (c) => process.exit(c), escrever = (t) => process.stderr.write(t) } = {}) {
  const temporizador = setTimeout(() => {
    escrever('olhar-bancada: algo mantinha o processo vivo depois da captura; encerrado à força.\n');
    sair(codigo);
  }, esperaMs);
  temporizador.unref();
  return temporizador;
}

export function comoCLI(argv, { aoProgredir = null } = {}) {
  if (argv.includes('--ajuda') || argv.includes('--help') || argv.includes('-h')) {
    return Promise.resolve({ ok: true, codigo: 0, stdout: AJUDA, stderr: '' });
  }
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: OPCOES_DA_CLI,
      bandeiras: BANDEIRAS_DA_CLI,
      posicional: { nome: 'a peça', obrigatorio: false },
    });
  } catch (erro) {
    return Promise.resolve(erroEstruturado({ relato: novoRelato(), erro: new ErroDeUso(erro.message) }));
  }
  /* `--raio-x` é o arame transparente, com o que fica atrás à vista; `--arame`
     sozinho é o arame opaco, que esconde o de trás. Os dois servem: o opaco
     mostra a malha da superfície que se vê, o raio X o que está escondido. */
  const arame = lido.bandeira('raio-x') ? 'raio-x' : (lido.bandeira('arame') || lido.bandeira('wireframe'));
  const tela = lido.bandeira('tela');
  const textoDoCorte = lido.opcao('corte');
  const textoDoLado = lido.opcao('corte-lado');
  let corte = null;
  try {
    if (textoDoLado !== undefined && textoDoLado !== null && (textoDoCorte === undefined || textoDoCorte === null)) {
      throw new Error('--corte-lado só vale junto de --corte.');
    }
    if (textoDoCorte !== undefined && textoDoCorte !== null) {
      corte = { ...lerCorte(textoDoCorte), lado: lerLadoDoCorte(textoDoLado) };
      if (lido.bandeira('analise')) throw new Error('--corte não se mistura com --analise: a análise tira as próprias vistas.');
      if (arame) throw new Error('--corte não se mistura com --arame, --wireframe ou --raio-x: o corte já usa a transparência para mostrar o que fica atrás.');
      if (lido.opcao('par')) throw new Error('--corte não se mistura com --par: a inspeção de par escolhe a vista e o foco por conta própria.');
    }
  } catch (erro) {
    return Promise.resolve(erroEstruturado({ relato: novoRelato(), erro: new ErroDeUso(erro.message) }));
  }
  const prazo = lido.opcao('prazo');
  if (prazo !== undefined && prazo !== null && !(Number(prazo) > 0)) {
    return Promise.resolve(erroEstruturado({ relato: novoRelato(), erro: new ErroDeUso(`--prazo pede segundos maiores que zero; veio "${prazo}".`) }));
  }
  /* `--analise`: o passo "Pare e analise" (docs/modelar/usar/PARE-E-ANALISE.md). */
  if (lido.bandeira('analise') && lido.opcao('mirar')) {
    return Promise.resolve(erroEstruturado({ relato: novoRelato(), erro: new ErroDeUso('--mirar não se mistura com --analise: a análise tira as próprias vistas.') }));
  }
  if (lido.bandeira('analise')) {
    const peca = lido.opcao('peca') ?? lido.posicional;
    const contatos = { medirContatos: !lido.bandeira('sem-contatos'), cacheDeContatos: !lido.bandeira('sem-cache') };
    return analisarNumaCarga({ peca, lido, prazo, contatos, aoProgredir });
  }
  if (tela && (lido.bandeira('cores') || arame || lido.bandeira('auditoria'))) {
    return Promise.resolve(erroEstruturado({
      relato: novoRelato(),
      erro: new ErroDeUso('--tela mostra a interface da bancada; não se mistura com --cores, --arame ou --auditoria.'),
    }));
  }
  return olharBancada({
    peca: lido.opcao('peca') ?? lido.posicional,
    ...(prazo !== undefined && prazo !== null ? { prazoDeCargaMs: Number(prazo) * 1000 } : {}),
    vistas: lido.opcao('vistas'), selecionadas: lido.opcao('selecionadas'), par: lido.opcao('par'),
    modo: lido.opcao('modo'), projecao: lido.opcao('projecao'), explosao: lido.opcao('explosao', '0'), ambiente: lido.opcao('ambiente') ?? null,
    res: lido.opcao('res', '1280'), espera: lido.opcao('espera', '1200'), saida: lido.opcao('saida'),
    relatorio: lido.opcao('relatorio'), listar: lido.bandeira('listar'), estrito: lido.bandeira('estrito'),
    focar: lido.bandeira('focar'), revisar: lido.bandeira('revisar'),
    mirar: lido.opcao('mirar') ?? null, distancia: lido.opcao('distancia') ?? null, aoProgredir,
    /* SEM INTERFACE POR PADRÃO desde 2026-09-23. Quem usa este comando é quase
       sempre a IA olhando a peça, e a imagem com painéis, cabeçalho, piso e
       grade deixava a peça numa faixa estreita no meio; a imagem limpa
       dependia de lembrar de `--auditoria`. `--tela` (ou `npm run
       bancada:tela`) mostra a interface, para quando o assunto é a própria
       bancada. `--auditoria` continua aceito e não muda nada. */
    auditoria: !tela,
    coresPorParte: lido.bandeira('cores'),
    arame,
    corte,
    medirContatos: !lido.bandeira('sem-contatos'), cacheDeContatos: !lido.bandeira('sem-cache'),
  });
}

/* A `--analise` NUMA CARGA SÓ: o servidor, o navegador, a peça da sessão e a página abrem uma vez, e as 18 vistas (mais a parte
   isolada) trocam a câmera e o modo nela, como a `vistas:critica` já fazia; a medida de contatos também é uma só. Antes cada vista
   recarregava a peça, 31 a 33 min no furgão realista. Quem abre fecha, e um sinal de parada fecha o Chromium e o servidor. */
async function analisarNumaCarga({ peca, lido, prazo, contatos, aoProgredir }) {
  let compartilhada = null;
  const aoSinal = (sinal) => {
    const limite = new Promise((ok) => setTimeout(ok, 4000));
    Promise.race([compartilhada ? compartilhada.fechar() : Promise.resolve(), limite]).finally(() => process.exit(sinal === 'SIGINT' ? 130 : 143));
  };
  const sinais = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  try {
    /* a recusa de uso vem antes de abrir servidor e navegador: o zoom mal escrito não custa uma carga */
    if (lido.opcao('zoom')) lerZoom(lido.opcao('zoom'));
    for (const sinal of sinais) process.once(sinal, aoSinal);
    compartilhada = await abrirCapturaCompartilhada();
    const r = await analisarPeca({
      peca, parte: lido.opcao('parte'), zoom: lido.opcao('zoom'), zoomAntes: lido.opcao('zoom-antes'),
      saida: lido.opcao('saida'), res: lido.opcao('res', '1280'), espera: lido.opcao('espera', '1200'),
      olhar: (opcoes) => olharBancada({ ...opcoes, aoProgredir, compartilhada }),
      contatos,
      ...(prazo !== undefined && prazo !== null ? { prazoDeCargaMs: Number(prazo) * 1000 } : {}),
    });
    if (!r.ok) return r;
    const estado = r.contatos?.estado ?? 'sem-receita';
    const linhaDosContatos = {
      medidos: `contatos: medidos agora em ${r.contatos?.segundos} s, ${r.contatos?.pares} par(es) acusado(s)`,
      'do-cache': `contatos: lidos do cache, ${r.contatos?.pares} par(es) acusado(s) (--sem-cache mede de novo)`,
      pulados: 'contatos: NÃO medidos (--sem-contatos); a análise não diz se há contato não declarado',
      falhou: `contatos: NÃO medidos, a medida falhou (${r.contatos?.motivo}); a análise não diz se há contato não declarado`,
      'sem-receita': 'contatos: sem receita para medir',
    }[estado];
    const zoom = r.zoomEmPixels ? `zoom em mm: caixa de ${r.zoomEmPixels.caixa.join(', ')} px na vista${r.zoomEmPixels.cortada ? ' (cortada pelo quadro: a caixa passa da borda da imagem)' : ''}\n` : '';
    return {
      ok: true, codigo: 0,
      stdout: `análise de ${peca}: ${r.cargasDePagina} carga(s) de página\n${linhaDosContatos}\n${zoom}${r.arquivos.map((a) => `  ${a}`).join('\n')}\n`,
      stderr: '', resultado: { arquivos: r.arquivos, cargasDePagina: r.cargasDePagina, contatos: r.contatos },
    };
  } catch (erro) {
    return erroEstruturado({ relato: novoRelato(), erro: erro instanceof ErroDeUso ? erro : new ErroDeUso(erro.message) });
  } finally {
    for (const sinal of sinais) process.removeListener(sinal, aoSinal);
    if (compartilhada) await compartilhada.fechar().catch(() => {});
  }
}

const executadoComoCLI = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const pedido = process.argv.slice(2).find((a) => a.startsWith('--peca='))?.slice('--peca='.length)
    ?? process.argv.slice(2).find((a) => !a.startsWith('-'));
  const fechar = iniciarRegistro('olhar-bancada', pedido);
  const resultado = await comoCLI(process.argv.slice(2), { aoProgredir: (linha) => process.stderr.write(`${linha}\n`) });
  process.stdout.write(resultado.stdout);
  process.stderr.write(resultado.stderr);
  process.exitCode = resultado.codigo;
  /* O PROCESSO TERMINA QUANDO A CAPTURA TERMINA. Uma captura recusada deixava o processo vivo, com o servidor segurando a porta até o
     prazo de quem o chamou; algo no Vite ou no navegador (uma conexão aberta, um filho) mantém o laço de eventos. Depois de fechar
     os recursos, quem ainda estiver vivo espera um pouco e é encerrado com o código da captura. */
  agendarEncerramento(resultado.codigo);
  /* `arquivos` aqui é a lista PLANEJADA, montada antes da captura. Vai como
     promessa; quem confere o disco é o diário. */
  fechar({
    codigo: resultado.codigo,
    prometeu: resultado.resultado?.arquivos ?? [],
    medidas: resultado.resultado?.vistas
      ? { vistas: resultado.resultado.vistas.length }
      : null,
    erro: resultado.erro?.mensagem ?? null,
  });
}
