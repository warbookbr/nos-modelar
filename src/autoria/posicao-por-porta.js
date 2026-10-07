/* posicao-por-porta.js — a pose de uma instância derivada do encaixe de uma
   porta dela numa porta de outra instância já construída.

   POR QUE EXISTE. O vínculo de medida dá à peça o tamanho certo, e a `pose`
   continuava digitada: o furo tinha o raio do pino, e alguém escrevia a
   coordenada onde a peça ficava. Aqui a montagem declara "a porta `furo` desta
   instância no mesmo eixo da porta `pino` daquela, com tal afastamento", e a
   pose sai alinhando as duas portas. É derivação direta, sem solver.

   A regra de alinhamento: o eixo da porta própria passa a apontar na direção do
   eixo da porta vizinha, e o centro da porta própria vai para o centro da
   vizinha deslocado do afastamento ao longo desse eixo. O giro em torno do eixo
   só é definido quando as duas portas publicam `referencia`; sem ela, fica a
   menor rotação que alinha os eixos, e isso é dito no resultado. */

import { UNIDADES_DE_PARAMETRO } from './vinculos-de-medida.js';

export class ErroPosicaoPorPorta extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroPosicaoPorPorta';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

function falhar(codigo, caminho, mensagem) {
  throw new ErroPosicaoPorPorta(codigo, caminho, mensagem);
}

function objetoSimples(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    && Object.getPrototypeOf(valor) === Object.prototype;
}

function chavesExatas(valor, permitidas, caminho) {
  const extras = Object.keys(valor).filter((chave) => !permitidas.includes(chave));
  if (extras.length) falhar('chave-desconhecida', caminho, `chave(s) desconhecida(s): ${extras.sort().join(', ')}.`);
}

function texto(valor, caminho) {
  if (typeof valor !== 'string' || !valor) falhar('posicao-invalida', caminho, 'precisa ser texto não vazio.');
  return valor;
}

/* Lê `posicoes` de uma montagem v5. Cada instância tem no máximo uma posição
   derivada, e uma instância com posição derivada não pode declarar `pose`: as
   duas seriam duas respostas para a mesma pergunta. `posesDeclaradas` é o
   conjunto das instâncias que trouxeram `pose` no documento. */
export function lerPosicoes(valor, instancias, posesDeclaradas) {
  if (!Array.isArray(valor)) falhar('posicao-invalida', 'posicoes', 'precisa ser lista, mesmo que vazia.');
  const porId = new Map(instancias.map((instancia) => [instancia.id, instancia]));
  const ids = new Set();
  const posicionadas = new Set();
  /* PORTA OCUPADA. Duas partes mandadas para a mesma porta ficam no mesmo
     lugar, e nada acusava: a montagem conferia só que cada parte tem uma
     posição. Porta que recebe várias peças de propósito, como arruelas no mesmo
     parafuso, ainda não tem caso real; quando tiver, entra como declaração
     explícita, e não como silêncio. */
  const ocupadas = new Map();
  const posicoes = valor.map((item, indice) => {
    const caminho = `posicoes[${indice}]`;
    if (!objetoSimples(item)) falhar('posicao-invalida', caminho, 'precisa ser objeto simples.');
    chavesExatas(item, ['id', 'instancia', 'porta', 'em', 'unidade', 'afastamento'], caminho);
    const id = texto(item.id, `${caminho}.id`);
    if (ids.has(id)) falhar('posicao-duplicada', `${caminho}.id`, `ID '${id}' duplicado.`);
    ids.add(id);
    const instancia = texto(item.instancia, `${caminho}.instancia`);
    if (porId.get(instancia)?.alvo.tipo !== 'peca') falhar('posicao-invalida', `${caminho}.instancia`, `'${instancia}' precisa ser peça da montagem.`);
    if (posicionadas.has(instancia)) falhar('posicao-duplicada', `${caminho}.instancia`, `'${instancia}' já tem posição derivada.`);
    if (posesDeclaradas.has(instancia)) falhar('posicao-com-pose', `${caminho}.instancia`, `'${instancia}' declara pose e posição derivada ao mesmo tempo.`);
    posicionadas.add(instancia);
    const porta = texto(item.porta, `${caminho}.porta`);
    if (!objetoSimples(item.em)) falhar('posicao-invalida', `${caminho}.em`, 'precisa ser objeto simples.');
    chavesExatas(item.em, ['instancia', 'porta'], `${caminho}.em`);
    const emInstancia = texto(item.em.instancia, `${caminho}.em.instancia`);
    if (porId.get(emInstancia)?.alvo.tipo !== 'peca') falhar('posicao-invalida', `${caminho}.em.instancia`, `'${emInstancia}' precisa ser peça da montagem.`);
    if (emInstancia === instancia) falhar('vinculo-ciclo', caminho, `'${instancia}' não pode se posicionar em si mesma.`);
    const emPorta = texto(item.em.porta, `${caminho}.em.porta`);
    const vaga = `${emInstancia}.${emPorta}`;
    if (ocupadas.has(vaga)) {
      falhar('porta-ocupada', `${caminho}.em`, `a porta '${emPorta}' de '${emInstancia}' já recebe '${ocupadas.get(vaga)}'; '${instancia}' não pode ir no mesmo lugar.`);
    }
    ocupadas.set(vaga, instancia);
    if (!Object.hasOwn(UNIDADES_DE_PARAMETRO, item.unidade)) {
      falhar('posicao-invalida', `${caminho}.unidade`, `aceita somente ${Object.keys(UNIDADES_DE_PARAMETRO).join(', ')}.`);
    }
    if (!Number.isFinite(item.afastamento)) falhar('posicao-invalida', `${caminho}.afastamento`, 'precisa ser número finito, mesmo que zero.');
    const afastamento = Object.is(item.afastamento, -0) ? 0 : item.afastamento;
    return { id, instancia, porta, em: { instancia: emInstancia, porta: emPorta }, unidade: item.unidade, afastamento };
  });
  return posicoes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

const aplicar = (m, v) => [0, 1, 2].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]);
const multiplicar = (a, b) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]));
const escalar = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vetorial = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unitario = (a) => { const n = norma(a); return [a[0] / n, a[1] / n, a[2] / n]; };
const identidade = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/* Rotação de Rodrigues que leva o unitário `a` ao unitário `b` pelo menor
   ângulo. Eixos opostos giram meia volta em torno de um perpendicular. */
function rotacaoEntre(a, b) {
  const c = escalar(a, b);
  if (c > 1 - 1e-12) return identidade();
  if (c < -1 + 1e-12) {
    const apoio = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const k = unitario(vetorial(a, apoio));
    return [0, 1, 2].map((i) => [0, 1, 2].map((j) => 2 * k[i] * k[j] - (i === j ? 1 : 0)));
  }
  const v = vetorial(a, b);
  const x = [[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]];
  const x2 = multiplicar(x, x);
  const f = 1 / (1 + c);
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 1 : 0) + x[i][j] + x2[i][j] * f));
}

/* Rotação de `angulo` em torno do unitário `k`. */
function rotacaoEmTorno(k, angulo) {
  const c = Math.cos(angulo);
  const s = Math.sin(angulo);
  const t = 1 - c;
  return [
    [t * k[0] * k[0] + c, t * k[0] * k[1] - s * k[2], t * k[0] * k[2] + s * k[1]],
    [t * k[0] * k[1] + s * k[2], t * k[1] * k[1] + c, t * k[1] * k[2] - s * k[0]],
    [t * k[0] * k[2] - s * k[1], t * k[1] * k[2] + s * k[0], t * k[2] * k[2] + c],
  ];
}

const projetarNoPlano = (v, k) => { const d = escalar(v, k); return [v[0] - d * k[0], v[1] - d * k[1], v[2] - d * k[2]]; };

/* A pose no mundo que põe a porta própria sobre a porta vizinha.
   `propria` é a interface da porta na peça, em coordenada local;
   `vizinha` é a interface da porta vizinha JÁ no mundo;
   `afastamento` está em metro, ao longo do eixo da vizinha. */
export function poseQueEncaixa(propria, vizinha, afastamento) {
  if (propria.forma && vizinha.forma && propria.forma !== vizinha.forma) {
    falhar('portas-incompativeis', 'poseQueEncaixa', `não é possível encaixar porta '${propria.forma}' em porta '${vizinha.forma}'.`);
  }
  const ehPlanoOuFuros = propria.forma === 'plano' || propria.forma === 'padraoFuros';
  const eixoProprio = unitario(propria.normal ?? propria.eixo);
  const eixoVizinho = unitario(vizinha.normal ?? vizinha.eixo);

  // Recusa pose indeterminada quando a orientação em torno da normal importa:
  if (propria.forma === 'padraoFuros') {
    if (!propria.referencia || !vizinha.referencia) {
      falhar('orientacao-indeterminada', 'poseQueEncaixa', "encaixe de padrão de furos exige vetor 'referencia' em ambas as portas para definir a rotação em torno da normal.");
    }
  } else if (propria.forma === 'plano') {
    const temRefPropria = Boolean(propria.referencia);
    const temRefVizinha = Boolean(vizinha.referencia);
    if (temRefPropria !== temRefVizinha) {
      falhar('orientacao-indeterminada', 'poseQueEncaixa', "encaixe de planos com orientação exige vetor 'referencia' em ambas as portas.");
    }
    if (!temRefPropria && !temRefVizinha) {
      const assimetricaPropria = Array.isArray(propria.extensao) && Math.abs(propria.extensao[0] - propria.extensao[1]) > 1e-6;
      const assimetricaVizinha = Array.isArray(vizinha.extensao) && Math.abs(vizinha.extensao[0] - vizinha.extensao[1]) > 1e-6;
      if (assimetricaPropria || assimetricaVizinha) {
        falhar('orientacao-indeterminada', 'poseQueEncaixa', "encaixe de plano retangular assimétrico exige vetor 'referencia' em ambas as portas para definir a orientação.");
      }
    }
  }

  // Para planos e padrões de furos que se apoiam face a face, a normal da peça própria aponta no sentido oposto à da vizinha
  const direcaoAlvo = ehPlanoOuFuros ? eixoVizinho.map((x) => -x) : eixoVizinho;
  let rotacao = rotacaoEntre(eixoProprio, direcaoAlvo);
  let giroDefinido = false;
  if (propria.referencia && vizinha.referencia) {
    const refPropria = unitario(projetarNoPlano(aplicar(rotacao, propria.referencia), eixoVizinho));
    const refVizinha = unitario(projetarNoPlano(vizinha.referencia, eixoVizinho));
    const angulo = Math.atan2(escalar(vetorial(refPropria, refVizinha), eixoVizinho), escalar(refPropria, refVizinha));
    rotacao = multiplicar(rotacaoEmTorno(eixoVizinho, angulo), rotacao);
    giroDefinido = true;
  }
  const centroVizinho = vizinha.centro ?? vizinha.ponto;
  const centroProprio = propria.centro ?? propria.ponto;
  const alvo = centroVizinho.map((c, i) => c + eixoVizinho[i] * afastamento);
  const centroGirado = aplicar(rotacao, centroProprio);
  return {
    pose: { escala: 1, rotacao, deslocamento: alvo.map((c, i) => c - centroGirado[i]) },
    giroDefinido,
  };
}

/* A interface de uma porta levada ao mundo por uma pose rígida sem escala. */
export function interfaceNoMundo(interfaceLocal, pose) {
  const centroTransformado = aplicar(pose.rotacao, interfaceLocal.centro ?? interfaceLocal.ponto ?? [0, 0, 0]).map((c, i) => c + pose.deslocamento[i]);
  const eixoTransformado = interfaceLocal.eixo ? aplicar(pose.rotacao, interfaceLocal.eixo) : undefined;
  const normalTransformada = interfaceLocal.normal ? aplicar(pose.rotacao, interfaceLocal.normal) : undefined;
  const saida = {
    ...interfaceLocal,
    centro: centroTransformado,
    ...(interfaceLocal.ponto ? { ponto: centroTransformado } : {}),
    ...(eixoTransformado ? { eixo: eixoTransformado } : {}),
    ...(normalTransformada ? { normal: normalTransformada } : {}),
  };
  if (interfaceLocal.referencia) saida.referencia = aplicar(pose.rotacao, interfaceLocal.referencia);
  if (interfaceLocal.plano) {
    saida.plano = {
      ponto: centroTransformado,
      normal: normalTransformada ?? eixoTransformado,
    };
  }
  if (Array.isArray(interfaceLocal.centros)) {
    saida.centros = interfaceLocal.centros.map((c) =>
      aplicar(pose.rotacao, c).map((coord, i) => coord + pose.deslocamento[i])
    );
  }
  return saida;
}
