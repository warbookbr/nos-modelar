/* visao-curvatura.js — a visão Curvatura da bancada: a curvatura média pintada nos vértices da peça, com a escala, as cores e a
 * faixa ocre dos vincos das vistas obrigatórias do pacote do crítico, e uma legenda pequena sobre a cena.
 *
 * A COR DE CADA CANTO DA CENA vem do vértice do estado neutro de que ele nasceu (o atributo `origemVertice` de `adaptarThree`), e a
 * conta corre sobre os triângulos do estado neutro (`malhaDoNeutro`), nunca sobre os da cena, que triangulam de outro jeito e mudam
 * o resultado (ver `malhaDoNeutro`). O material é o da imagem do Blender: a cor do vértice sem luz, sem o mapeamento de tons da cena
 * (`toneMapped: false`), de modo que o pixel da bancada é o mesmo do PNG do crítico para a mesma cor.
 *
 * A CONTA REFAZ DEPOIS DE CADA EDIÇÃO, fora do quadro do arrasto. Uma peça nova, uma junta arrastada e uma operação de malha refazem
 * o modelo e chegam aqui pelo `aplicar`; enquanto o ponteiro está apertado (o arrasto da junta refaz o modelo a cada quadro) a peça
 * é pintada com a última conta, ligada pelos ids dos vértices, e a conta nova sai quando o ponteiro sobe. O movimento de vértices
 * da edição de malha escreve na malha sem refazer o modelo, e a visão o percebe ao soltar o ponteiro ou a tecla, pela impressão das
 * posições (`impressaoDoNeutro`). A conta roda num trabalhador (`curvatura.worker.js`) e só a pintura volta ao quadro da cena; um
 * pedido que chega com outro em curso espera por ele, e só o último vale.
 *
 * A visão não toca a página: a legenda é descrita à caixa da visão e a soltura do ponteiro chega por ela (`contexto.pagina`,
 * `componentes/caixa-da-visao.js`). */
import * as THREE from 'three';
import { idDeOrigem } from '../../autoria/adaptar-three.js';
import { CINZA_DA_BORDA, CINZA_SEM_DADO, COR_CONCAVA, COR_CONVEXA, COR_DA_FAIXA } from '../../autoria/curvatura-da-lataria.js';
import { criarCalculadoraDaCurvatura, desempacotarNeutro, empacotarNeutro, impressaoDoNeutro } from './calculo-da-curvatura.js';
import { fonteDaCurvatura } from './fonte-da-curvatura.js';
import { restaurarMateriais, superficiesDe, trocarMateriais } from './materiais-da-visao.js';

const ID = 'curvatura';
/* a cor do canto que ainda espera a primeira conta: um cinza mais claro que os dois da escala, para não ser lido como dado */
const COR_DE_ESPERA = 0.82;

/* ---------- quem calcula ---------- */

/* O trabalhador, quando o navegador o tem; sem ele (nos testes), a mesma conta logo depois do quadro. `calcular(mensagem)` devolve
   uma promessa do resultado. */
export function criarClienteDaCurvatura() {
  if (typeof Worker === 'undefined') {
    const calcular = criarCalculadoraDaCurvatura();
    return {
      calcular: (m) => new Promise((resolver, rejeitar) => {
        setTimeout(() => {
          try { resolver(calcular({ ...m, neutro: desempacotarNeutro(m.neutro) })); } catch (erro) { rejeitar(erro); }
        }, 0);
      }),
      encerrar() {},
    };
  }
  const trabalhador = new Worker(new URL('./curvatura.worker.js', import.meta.url), { type: 'module' });
  const esperando = new Map();
  /* as mensagens esperam o aviso de que o trabalhador subiu (ver `curvatura.worker.js`) */
  let pronto = false;
  const fila = [];
  const enviar = (mensagem, transferir) => {
    if (pronto) trabalhador.postMessage(mensagem, transferir);
    else fila.push([mensagem, transferir]);
  };
  trabalhador.onmessage = ({ data }) => {
    if (data?.pronto) {
      pronto = true;
      for (const [mensagem, transferir] of fila.splice(0)) trabalhador.postMessage(mensagem, transferir);
      return;
    }
    const promessa = esperando.get(data.pedido);
    esperando.delete(data.pedido);
    if (!promessa) return;
    if (data.erro) promessa.rejeitar(new Error(data.erro));
    else promessa.resolver(data.resultado);
  };
  /* o trabalhador que não sobe (o módulo dele não carregou) recusa os pedidos em espera, e a legenda diz o erro */
  trabalhador.onerror = (evento) => {
    evento.preventDefault?.();
    for (const { rejeitar } of esperando.values()) rejeitar(new Error(evento.message || 'o trabalhador da curvatura não subiu'));
    esperando.clear();
  };
  return {
    calcular(m) {
      return new Promise((resolver, rejeitar) => {
        esperando.set(m.pedido, { resolver, rejeitar });
        enviar(m, m.neutro.buffers);
      });
    },
    encerrar() {
      trabalhador.terminate();
      for (const { rejeitar } of esperando.values()) rejeitar(new Error('encerrado'));
      esperando.clear();
    },
  };
}

/* ---------- o estado da visão, um por cena ---------- */

const estados = new WeakMap();
const SEM_AMBIENTE = {};

function estadoDe(ambiente) {
  const chave = ambiente ?? SEM_AMBIENTE;
  if (!estados.has(chave)) {
    estados.set(chave, {
      ativa: false, contexto: null, fonte: null, chaves: 0, cliente: null, pedido: 0, emVoo: false, pendente: false,
      resultado: null, indice: null, impressaoPedida: null, ouvinte: null, ultimo: null, erro: null,
      criarCliente: criarClienteDaCurvatura,
    });
  }
  return estados.get(chave);
}

/* A receita só chega com a peça aberta; a peça refeita por uma junta ou por uma operação de malha vem sem ela e com o mesmo nome,
   e herda a fonte. Outra peça sem receita (uma montagem, uma peça do catálogo antigo) fica sem lataria e sem vincos. */
function atualizarFonte(e, modelo) {
  const receita = modelo?.receita ?? null;
  if (receita) {
    if (e.fonte?.receita !== receita) {
      const inicio = performance.now();
      e.fonte = { nome: modelo.nome, receita, ...fonteDaCurvatura(receita, modelo.neutro), chave: ++e.chaves };
      e.fonte.tempoMs = performance.now() - inicio;
    }
  } else if (!e.fonte || e.fonte.nome !== (modelo?.nome ?? null)) {
    e.fonte = { nome: modelo?.nome ?? null, receita: null, ...fonteDaCurvatura(null), chave: ++e.chaves };
  }
}

/* ---------- a pintura ---------- */

function pintar(e) {
  const grupo = e.contexto?.grupo;
  if (!grupo) return;
  const { indice, resultado } = e;
  for (const malha of superficiesDe(grupo)) {
    const geometria = malha.geometry;
    const n = geometria.getAttribute('position')?.count ?? 0;
    const origem = geometria.getAttribute('origemVertice');
    let cor = geometria.getAttribute('color');
    if (!cor || cor.count !== n) {
      cor = new THREE.Float32BufferAttribute(new Float32Array(3 * n), 3);
      geometria.setAttribute('color', cor);
    }
    geometria.userData.corDaCurvatura = true;
    const alvo = cor.array;
    for (let i = 0; i < n; i++) {
      const k = origem && indice ? indice.get(idDeOrigem(origem, i)) : undefined;
      if (k === undefined) {
        alvo[3 * i] = COR_DE_ESPERA; alvo[3 * i + 1] = COR_DE_ESPERA; alvo[3 * i + 2] = COR_DE_ESPERA;
      } else {
        alvo[3 * i] = resultado.cores[3 * k]; alvo[3 * i + 1] = resultado.cores[3 * k + 1]; alvo[3 * i + 2] = resultado.cores[3 * k + 2];
      }
    }
    cor.needsUpdate = true;
  }
}

function despintar(grupo) {
  for (const malha of superficiesDe(grupo)) {
    const geometria = malha.geometry;
    if (!geometria.userData.corDaCurvatura) continue;
    geometria.deleteAttribute('color');
    delete geometria.userData.corDaCurvatura;
  }
}

/* ---------- a legenda ---------- */

const numero = (x) => x.toLocaleString('pt-BR', { maximumSignificantDigits: 3 });

/**
 * O que a legenda diz para um resultado (`calcular`): o título, a escala em texto e as linhas das cores fora da escala, com a cor
 * de cada uma. Sem resultado, só o título.
 */
export function legendaDaCurvatura(resultado, { semNeutro = false } = {}) {
  if (semNeutro) return { titulo: 'Curvatura média', escala: null, linhas: [{ texto: 'A curvatura pede uma peça aberta: a montagem não tem o estado neutro.' }] };
  if (!resultado) return { titulo: 'Curvatura média', escala: null, linhas: [] };
  const linhas = [];
  if (resultado.faixa) {
    const nomes = resultado.vincos.slice(0, 6).join(', ') + (resultado.vincos.length > 6 ? ` e mais ${resultado.vincos.length - 6}` : '');
    linhas.push({ cor: COR_DA_FAIXA, texto: `ocre: até ${numero(resultado.faixa * 1000)} mm dos vincos que a forma desenha (${nomes}), fora da escala; ali a cor não mede defeito` });
  }
  if (resultado.contagens?.borda) linhas.push({ cor: [CINZA_DA_BORDA, CINZA_DA_BORDA, CINZA_DA_BORDA], texto: 'cinza claro: peça de borda' });
  if (resultado.contagens?.semDado) linhas.push({ cor: [CINZA_SEM_DADO, CINZA_SEM_DADO, CINZA_SEM_DADO], texto: 'cinza escuro: sem dado, junto da borda livre e das dobras vivas' });
  if (resultado.semLataria) linhas.push({ texto: 'A peça não tem lataria declarada: a curvatura é da peça inteira.' });
  return {
    titulo: resultado.semLataria ? 'Curvatura média da peça inteira' : 'Curvatura média da lataria',
    escala: `vermelho: abaulado, azul: afundado, saturam em ±${numero(resultado.escala)} 1/m`,
    linhas,
  };
}

function desenharLegenda(e, { calculando = false, semNeutro = false } = {}) {
  const pagina = e.contexto?.pagina;
  if (!pagina) return;
  const legenda = legendaDaCurvatura(e.resultado, { semNeutro });
  const s = e.resultado ? numero(e.resultado.escala) : null;
  let estado = '';
  if (e.erro) estado = `A conta falhou: ${e.erro}`;
  else if (calculando || !e.resultado) estado = semNeutro ? '' : 'calculando…';
  else if (e.ultimo) estado = `refeita em ${Math.round(e.ultimo.totalMs)} ms, fora do quadro da cena`;
  pagina.mostrar(ID, {
    titulo: legenda.titulo,
    barra: legenda.escala ? { cores: [COR_CONCAVA, [1, 1, 1], COR_CONVEXA], marcas: [`−${s}`, '0', `+${s} 1/m`] } : null,
    linhas: [...(legenda.escala ? [{ texto: legenda.escala }] : []), ...legenda.linhas],
    estado,
    dados: {
      estado: e.erro ? 'erro' : calculando || !e.resultado ? 'calculando' : 'pronta',
      escala: e.resultado?.escala,
      semLataria: e.resultado?.semLataria,
      tempoCalculo: e.ultimo?.calculoMs,
      tempoTotal: e.ultimo?.totalMs,
      tempoNoQuadro: e.ultimo?.quadroMs,
      tempoDaFonte: e.fonte?.tempoMs,
      contas: e.ultimo?.contas,
    },
  });
}

/* ---------- a conta ---------- */

function solicitar(e) {
  const neutro = e.contexto?.modelo?.neutro;
  if (!e.ativa || !neutro) return;
  if (e.emVoo) { e.pendente = true; return; }
  e.pendente = false;
  const pedido = ++e.pedido;
  const chave = e.fonte.chave;
  const inicio = performance.now();
  e.impressaoPedida = impressaoDoNeutro(neutro);
  e.emVoo = true;
  e.cliente ??= e.criarCliente();
  desenharLegenda(e, { calculando: true });
  const pacote = empacotarNeutro(neutro);
  /* o que a conta toma do quadro da cena: a impressão e o pacote aqui, a pintura na volta */
  const quadroDoPedidoMs = performance.now() - inicio;
  e.cliente.calcular({ pedido, vincos: e.fonte.vincos, lataria: e.fonte.lataria, neutro: pacote }).then((resultado) => {
    e.emVoo = false;
    if (!e.ativa || pedido !== e.pedido) return;
    if (chave === e.fonte.chave) {
      const volta = performance.now();
      e.erro = null;
      e.resultado = resultado;
      e.indice = new Map();
      resultado.ids.forEach((id, k) => e.indice.set(id, k));
      pintar(e);
      const agora = performance.now();
      e.ultimo = {
        calculoMs: resultado.tempoMs,
        totalMs: agora - inicio,
        quadroMs: quadroDoPedidoMs + (agora - volta),
        contas: (e.ultimo?.contas ?? 0) + 1,
      };
      desenharLegenda(e);
    }
    conferir(e);
  }, (erro) => {
    e.emVoo = false;
    if (!e.ativa || pedido !== e.pedido) return;
    e.erro = String(erro?.message ?? erro);
    desenharLegenda(e);
  });
}

/* Refaz a conta se a malha mudou desde a última, ou se um pedido esperava; nunca com o ponteiro apertado. */
function conferir(e) {
  if (!e.ativa || e.ouvinte?.apertado() || e.emVoo) return;
  const neutro = e.contexto?.modelo?.neutro;
  if (!neutro) return;
  if (e.pendente || impressaoDoNeutro(neutro) !== e.impressaoPedida) solicitar(e);
}

function ouvir(e) {
  if (e.ouvinte || !e.contexto?.pagina) return;
  e.ouvinte = e.contexto.pagina.aoSoltar(() => setTimeout(() => conferir(e), 0));
}

function calar(e) {
  e.ouvinte?.desligar();
  e.ouvinte = null;
}

/* ---------- a visão ---------- */

export function aplicarCurvatura(contexto) {
  const e = estadoDe(contexto.ambiente);
  if (contexto.criarCliente) e.criarCliente = contexto.criarCliente;
  e.ativa = true;
  e.contexto = contexto;
  if (contexto.modelo?.neutro) atualizarFonte(e, contexto.modelo);
  trocarMateriais(contexto.grupo, () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }), contexto.controlador);
  pintar(e);
  ouvir(e);
  if (!contexto.modelo?.neutro) {
    desenharLegenda(e, { semNeutro: true });
    return;
  }
  desenharLegenda(e, { calculando: true });
  e.pendente = true;
  if (!e.ouvinte?.apertado()) setTimeout(() => conferir(e), 0);
}

export function desfazerCurvatura(contexto) {
  const e = estadoDe(contexto.ambiente);
  e.ativa = false;
  e.pedido++;
  e.pendente = false;
  e.emVoo = false;
  e.erro = null;
  restaurarMateriais(contexto.grupo, contexto.controlador);
  despintar(contexto.grupo);
  calar(e);
  contexto.pagina?.fechar(ID);
  e.cliente?.encerrar();
  e.cliente = null;
}

/** O estado da conta na cena do `ambiente`, para os testes: o último resultado, os tempos e se há conta em curso. */
export function estadoDaCurvatura(ambiente) {
  const e = estadoDe(ambiente);
  return { ativa: e.ativa, resultado: e.resultado, ultimo: e.ultimo, emVoo: e.emVoo, pendente: e.pendente, erro: e.erro, fonte: e.fonte };
}
