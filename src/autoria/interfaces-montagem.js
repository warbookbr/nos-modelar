/* interfaces-montagem.js — resolve portas declaradas por peças, mede relações
   cilíndricas/anulares e deriva uma prévia cilíndrica sem Three.js, hierarquia
   ou solver. É o contrato mínimo e deliberadamente read-only do AUT-05: a
   montagem informa a escala/translação que JÁ usa; este módulo apenas confere,
   explica e propõe uma pose não persistida quando o contrato a determina. */

import { relacaoEntreCaixas } from './descrever-partes.js';

const EPSILON_ANGULAR = 1e-9;

/** Estados estáveis do encaixe cilíndrico, em ordem de decisão. */
export const ESTADOS_DE_ENCAIXE_CILINDRICO = [
  'impossivel', 'divergente', 'subdeterminada', 'satisfeita',
];

function falhar(quem, mensagem) {
  throw new Error(`${quem}: ${mensagem}`);
}

function vetor(valor, quem) {
  if (!Array.isArray(valor) || valor.length !== 3 || valor.some((n) => !Number.isFinite(n))) {
    falhar(quem, 'precisa ser vetor finito [x,y,z].');
  }
  return valor.slice();
}

function escalar(valor, quem, { positivo = false, naoNegativo = false } = {}) {
  if (!Number.isFinite(valor) || (positivo && !(valor > 0)) || (naoNegativo && !(valor >= 0))) {
    falhar(quem, `precisa ser número finito${positivo ? ' > 0' : naoNegativo ? ' >= 0' : ''}.`);
  }
  return Object.is(valor, -0) ? 0 : valor;
}

const somar = (a, b) => a.map((n, i) => n + b[i]);
const subtrair = (a, b) => a.map((n, i) => n - b[i]);
const multiplicar = (a, n) => a.map((x) => x * n);
const produto = (a, b) => a.reduce((soma, n, i) => soma + n * b[i], 0);
const comprimento = (a) => Math.sqrt(produto(a, a));
const vetorProduto = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const identidade3 = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const aplicarMatriz = (matriz, valor) => matriz.map((linha) => produto(linha, valor));
const transpor = (matriz) => matriz[0].map((_, coluna) => matriz.map((linha) => linha[coluna]));
const multiplicarMatrizes = (a, b) => a.map((linha) => b[0].map((_, coluna) => produto(linha, b.map((outra) => outra[coluna]))));

function matrizDeRotacao(valor, quem) {
  if (valor === undefined) return identidade3();
  if (!Array.isArray(valor) || valor.length !== 3) falhar(quem, 'precisa ser matriz 3×3.');
  const matriz = valor.map((linha, indice) => vetor(linha, `${quem}[${indice}]`));
  for (let i = 0; i < 3; i += 1) {
    if (Math.abs(comprimento(matriz[i]) - 1) > 1e-9) falhar(quem, 'precisa ter linhas unitárias.');
    for (let j = i + 1; j < 3; j += 1) {
      if (Math.abs(produto(matriz[i], matriz[j])) > 1e-9) falhar(quem, 'precisa ter linhas perpendiculares.');
    }
  }
  const determinante = produto(matriz[0], vetorProduto(matriz[1], matriz[2]));
  if (Math.abs(determinante - 1) > 1e-9) falhar(quem, 'precisa ser rotação própria (determinante +1); reflexões não entram neste recorte.');
  return matriz;
}

function transformacaoRigida(valor, quem, { aceitarEscala = true } = {}) {
  if (valor === undefined) return { escala: 1, rotacao: identidade3(), deslocamento: [0, 0, 0] };
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(quem, 'precisa ser objeto de transformação.');
  const permitidas = new Set([...(aceitarEscala ? ['escala'] : []), 'rotacao', 'deslocamento']);
  const extras = Object.keys(valor).filter((chave) => !permitidas.has(chave));
  if (extras.length) falhar(quem, `tem chave(s) desconhecida(s): ${extras.sort().join(', ')}.`);
  return {
    escala: escalar(valor.escala ?? 1, `${quem}.escala`, { positivo: true }),
    rotacao: matrizDeRotacao(valor.rotacao, `${quem}.rotacao`),
    deslocamento: vetor(valor.deslocamento ?? [0, 0, 0], `${quem}.deslocamento`),
  };
}

function comporTransformacoes(referencial, local) {
  return {
    escala: referencial.escala * local.escala,
    rotacao: multiplicarMatrizes(referencial.rotacao, local.rotacao),
    deslocamento: somar(
      multiplicar(aplicarMatriz(referencial.rotacao, local.deslocamento), referencial.escala),
      referencial.deslocamento,
    ),
  };
}

function localDaTransformacao(referencial, mundo) {
  const inversa = transpor(referencial.rotacao);
  return {
    escala: mundo.escala / referencial.escala,
    rotacao: multiplicarMatrizes(inversa, mundo.rotacao),
    deslocamento: multiplicar(
      aplicarMatriz(inversa, subtrair(mundo.deslocamento, referencial.deslocamento)),
      1 / referencial.escala,
    ),
  };
}

function mundoDaInstancia(instancia, quem) {
  const local = transformacaoRigida({
    escala: instancia.escala, rotacao: instancia.rotacao, deslocamento: instancia.deslocamento,
  }, `${quem}.local`);
  const referencial = transformacaoRigida(instancia.referencial, `${quem}.referencial`, { aceitarEscala: false });
  return { local, referencial, mundo: comporTransformacoes(referencial, local) };
}

function interfaceCilindrica(porta, quem) {
  const i = porta?.interface;
  if (!i || typeof i !== 'object' || Array.isArray(i)) falhar(quem, 'não publica interface.');
  if (i.forma !== 'cilindro' || (i.papel !== 'externa' && i.papel !== 'interna')) {
    falhar(quem, 'interface precisa ser cilindro interno ou externo.');
  }
  const eixo = vetor(i.eixo, `${quem}.eixo`);
  const tamanho = comprimento(eixo);
  if (!(tamanho > 0)) falhar(`${quem}.eixo`, 'não pode ser nulo.');
  const inicio = escalar(i.inicio, `${quem}.inicio`);
  const fim = escalar(i.fim, `${quem}.fim`);
  if (!(fim > inicio)) falhar(quem, 'exige fim > inicio.');
  return {
    forma: 'cilindro', papel: i.papel, eixo: multiplicar(eixo, 1 / tamanho),
    centro: vetor(i.centro, `${quem}.centro`), raio: escalar(i.raio, `${quem}.raio`, { positivo: true }),
    inicio, fim,
    ...(i.referencia === undefined ? {} : { referencia: vetor(i.referencia, `${quem}.referencia`) }),
  };
}

function interfaceAnular(porta, quem) {
  const i = porta?.interface;
  if (!i || typeof i !== 'object' || Array.isArray(i)) falhar(quem, 'não publica interface.');
  if (i.forma !== 'anel' || (i.papel !== 'recebe' && i.papel !== 'ocupa')) {
    falhar(quem, 'interface precisa ser anel que recebe ou ocupa.');
  }
  const eixo = vetor(i.eixo, `${quem}.eixo`);
  const tamanho = comprimento(eixo);
  if (!(tamanho > 0)) falhar(`${quem}.eixo`, 'não pode ser nulo.');
  const inicio = escalar(i.inicio, `${quem}.inicio`);
  const fim = escalar(i.fim, `${quem}.fim`);
  const raioInterno = escalar(i.raioInterno, `${quem}.raioInterno`, { naoNegativo: true });
  const raioExterno = escalar(i.raioExterno, `${quem}.raioExterno`, { positivo: true });
  if (!(fim > inicio)) falhar(quem, 'exige fim > inicio.');
  if (!(raioExterno > raioInterno)) falhar(quem, 'exige raioExterno > raioInterno.');
  if (i.parte !== undefined && (typeof i.parte !== 'string' || !i.parte)) falhar(quem, 'parte precisa ser nome não vazio quando declarada.');
  return {
    forma: 'anel', papel: i.papel, eixo: multiplicar(eixo, 1 / tamanho),
    centro: vetor(i.centro, `${quem}.centro`), raioInterno, raioExterno, inicio, fim,
    ...(i.parte === undefined ? {} : { parte: i.parte }),
  };
}

function interfaceDeMontagem(porta, quem) {
  if (porta?.interface?.forma === 'anel') return interfaceAnular(porta, quem);
  return interfaceCilindrica(porta, quem);
}

/**
 * Resolve portas de várias peças para uma montagem já posada. A transformação
 * suportada neste recorte é escala uniforme positiva, rotação própria 3×3 e
 * deslocamento explícitos. Um `referencial` técnico opcional é composto antes
 * da transformação local da instância; ele não tem id, filhos ou semântica de
 * pai. Espelho e composição em árvore pertencem aos níveis seguintes.
 */
export function resolverPortasDeMontagem(instancias) {
  const quem = 'resolverPortasDeMontagem';
  if (!Array.isArray(instancias) || !instancias.length) falhar(quem, 'instancias precisa ser lista não vazia.');
  const resultado = new Map();
  const vistos = new Set();
  for (const instancia of instancias) {
    const id = instancia?.id;
    if (typeof id !== 'string' || !id) falhar(quem, 'cada instância precisa de id não vazio.');
    if (vistos.has(id)) falhar(quem, `instância '${id}' duplicada.`);
    vistos.add(id);
    const { local, referencial, mundo } = mundoDaInstancia(instancia, `${quem}.${id}`);
    if (!(instancia.neutro?.portas instanceof Map)) falhar(quem, `instância '${id}' não traz portas do núcleo.`);
    for (const [idPorta, porta] of instancia.neutro.portas) {
      if (!porta?.interface) continue;
      const base = interfaceDeMontagem(porta, `${quem}.${id}.${idPorta}`);
      const chave = `${id}.${idPorta}`;
      const resolvida = {
        id: chave, instancia: id, porta: idPorta,
        rotulo: porta.rotulo ?? porta.nome ?? idPorta,
        ...base,
        eixo: multiplicar(aplicarMatriz(mundo.rotacao, base.eixo), 1 / comprimento(aplicarMatriz(mundo.rotacao, base.eixo))),
        ...(base.referencia === undefined ? {} : {
          referencia: multiplicar(aplicarMatriz(mundo.rotacao, base.referencia), 1 / comprimento(aplicarMatriz(mundo.rotacao, base.referencia))),
        }),
        centro: somar(multiplicar(aplicarMatriz(mundo.rotacao, base.centro), mundo.escala), mundo.deslocamento),
        inicio: base.inicio * mundo.escala,
        fim: base.fim * mundo.escala,
        transformacao: {
          mundo: { escala: mundo.escala, rotacao: mundo.rotacao.map((linha) => linha.slice()), deslocamento: mundo.deslocamento.slice() },
          local: { escala: local.escala, rotacao: local.rotacao.map((linha) => linha.slice()), deslocamento: local.deslocamento.slice() },
          referencial: { escala: referencial.escala, rotacao: referencial.rotacao.map((linha) => linha.slice()), deslocamento: referencial.deslocamento.slice() },
        },
      };
      if (base.forma === 'cilindro') resolvida.raio = base.raio * mundo.escala;
      else {
        resolvida.raioInterno = base.raioInterno * mundo.escala;
        resolvida.raioExterno = base.raioExterno * mundo.escala;
      }
      resultado.set(chave, resolvida);
    }
  }
  return resultado;
}

function caixaAmplaDaInstancia(instancia, quem, parte = null) {
  if (!(instancia?.neutro?.V instanceof Map) || !(instancia?.neutro?.F instanceof Map)) {
    falhar(quem, 'instância precisa trazer V e F do núcleo para alerta global.');
  }
  if (parte !== null && (typeof parte !== 'string' || !parte)) falhar(quem, 'parte precisa ser nome não vazio.');
  const { mundo } = mundoDaInstancia(instancia, quem);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const vertices = parte === null
    ? instancia.neutro.V.values()
    : [...new Set([...instancia.neutro.F.values()]
      .filter((face) => face.parte === parte)
      .flatMap((face) => face.vs)
      .map((id) => instancia.neutro.V.get(id)))];
  for (const ponto of vertices) {
    const local = vetor(ponto, `${quem}.V`);
    const transformado = somar(multiplicar(aplicarMatriz(mundo.rotacao, local), mundo.escala), mundo.deslocamento);
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i], transformado[i]);
      max[i] = Math.max(max[i], transformado[i]);
    }
  }
  if (!Number.isFinite(min[0])) falhar(quem, parte === null
    ? 'instância não tem vértices para alerta global.'
    : `instância não tem faces na parte '${parte}' para alerta global.`);
  return { nome: parte === null ? instancia.id : `${instancia.id}.${parte}`, min, max };
}

function instanciasPorId(instancias, quem) {
  if (!Array.isArray(instancias) || !instancias.length) falhar(quem, 'instancias precisa ser lista não vazia.');
  const resultado = new Map();
  for (const instancia of instancias) {
    const id = instancia?.id;
    if (typeof id !== 'string' || !id) falhar(quem, 'cada instância precisa de id não vazio.');
    if (resultado.has(id)) falhar(quem, `instância '${id}' duplicada.`);
    resultado.set(id, instancia);
  }
  return resultado;
}

function quadroDaPorta(porta) {
  if (!porta.referencia) return null;
  const referencia = vetor(porta.referencia, `quadroDaPorta.${porta.id}.referencia`);
  const tamanho = comprimento(referencia);
  if (!(tamanho > 0) || Math.abs(produto(porta.eixo, referencia) / tamanho) > 1e-9) return null;
  const acima = multiplicar(referencia, 1 / tamanho);
  const lado = vetorProduto(porta.eixo, acima);
  return [
    [porta.eixo[0], acima[0], lado[0]],
    [porta.eixo[1], acima[1], lado[1]],
    [porta.eixo[2], acima[2], lado[2]],
  ];
}

function pontoAxial(porta, lado, quem) {
  if (lado === 'inicio') return somar(porta.centro, multiplicar(porta.eixo, porta.inicio));
  if (lado === 'fim') return somar(porta.centro, multiplicar(porta.eixo, porta.fim));
  if (lado === 'centro') return porta.centro.slice();
  falhar(quem, "precisa ser 'inicio', 'fim' ou 'centro'.");
}

function contratoDePose(declaracao, quem) {
  const pose = declaracao.poseCanonica;
  if (!pose || typeof pose !== 'object' || Array.isArray(pose)) {
    falhar(quem, 'exige poseCanonica explícita.');
  }
  const chaves = Object.keys(pose).sort();
  if (chaves.join(',') !== 'giro,movelAxial,referenciaAxial') {
    falhar(quem, 'poseCanonica só aceita referenciaAxial, movelAxial e giro.');
  }
  pontoAxial({ centro: [0, 0, 0], eixo: [1, 0, 0], inicio: 0, fim: 1 }, pose.referenciaAxial, `${quem}.referenciaAxial`);
  pontoAxial({ centro: [0, 0, 0], eixo: [1, 0, 0], inicio: 0, fim: 1 }, pose.movelAxial, `${quem}.movelAxial`);
  if (pose.giro !== 0) falhar(quem, 'giro precisa ser 0 neste recorte; outros giros exigem contrato próprio.');
  return pose;
}

/**
 * Calcula, sem mutar nem persistir, a única pose de uma peça móvel para uma
 * relação cilíndrica. A referência fica fixa; o quadro e os dois pontos axiais
 * são dados declarados, nunca escolhas por proximidade ou ordem de coleção.
 */
export function derivarPreviaDeEncaixeCilindrico(declaracao, portas) {
  const quem = 'derivarPreviaDeEncaixeCilindrico';
  if (!declaracao || typeof declaracao !== 'object' || Array.isArray(declaracao)) falhar(quem, 'declaração precisa ser objeto.');
  if (declaracao.tipo !== 'encaixaCilindrico') falhar(quem, "tipo precisa ser 'encaixaCilindrico'.");
  const id = declaracao.id;
  if (typeof id !== 'string' || !id) falhar(quem, 'declaração precisa de id não vazio.');
  const pose = contratoDePose(declaracao, `${quem}.${id}.poseCanonica`);
  const referencia = portaDo(portas, declaracao.referencia, quem);
  const movel = portaDo(portas, declaracao.movel, quem);
  const diagnosticos = [];
  if (referencia.forma !== 'cilindro' || movel.forma !== 'cilindro') {
    diagnosticos.push({ codigo: 'forma-incompativel', esperado: 'cilindro' });
  }
  if (referencia.papel !== 'externa' || movel.papel !== 'interna') {
    diagnosticos.push({ codigo: 'direcao-incompativel', esperado: 'referencia externa e movel interna' });
  }
  if (diagnosticos.length) return { id, tipo: 'encaixaCilindrico', aplicavel: false, diagnosticos };
  const quadroReferencia = quadroDaPorta(referencia);
  const quadroMovel = quadroDaPorta(movel);
  if (!quadroReferencia || !quadroMovel) diagnosticos.push({ codigo: 'quadro-incompleto', esperado: 'eixo e referencia perpendicular em ambas as portas' });
  if (!movel.transformacao) diagnosticos.push({ codigo: 'transformacao-ausente', esperado: 'instância resolvida por resolverPortasDeMontagem' });
  if (diagnosticos.length) return { id, tipo: 'encaixaCilindrico', aplicavel: false, diagnosticos };

  const pontoReferencia = pontoAxial(referencia, pose.referenciaAxial, `${quem}.${id}.referenciaAxial`);
  const pontoMovel = pontoAxial(movel, pose.movelAxial, `${quem}.${id}.movelAxial`);
  const deltaRotacao = multiplicarMatrizes(quadroReferencia, transpor(quadroMovel));
  const deslocamentoDoDelta = subtrair(pontoReferencia, aplicarMatriz(deltaRotacao, pontoMovel));
  const mundo = {
    escala: movel.transformacao.mundo.escala,
    rotacao: multiplicarMatrizes(deltaRotacao, movel.transformacao.mundo.rotacao),
    deslocamento: somar(aplicarMatriz(deltaRotacao, movel.transformacao.mundo.deslocamento), deslocamentoDoDelta),
  };
  const local = localDaTransformacao(movel.transformacao.referencial, mundo);
  return {
    id, tipo: 'encaixaCilindrico', aplicavel: true, diagnosticos: [],
    previa: {
      instancia: movel.instancia,
      escala: local.escala,
      rotacao: local.rotacao,
      deslocamento: local.deslocamento,
      mundo,
    },
  };
}

/** Aplica uma prévia somente à cópia da lista; a entrada nunca é alterada. */
export function aplicarPreviaDePose(instancias, previa) {
  const quem = 'aplicarPreviaDePose';
  if (!Array.isArray(instancias)) falhar(quem, 'instancias precisa ser lista.');
  if (!previa?.aplicavel || !previa.previa) falhar(quem, 'exige prévia aplicável.');
  let encontrou = false;
  const copia = instancias.map((instancia) => {
    if (instancia?.id !== previa.previa.instancia) return instancia;
    encontrou = true;
    return {
      ...instancia,
      escala: previa.previa.escala,
      rotacao: previa.previa.rotacao.map((linha) => linha.slice()),
      deslocamento: previa.previa.deslocamento.slice(),
    };
  });
  if (!encontrou) falhar(quem, `instância '${previa.previa.instancia}' não existe.`);
  return copia;
}

/** Texto estável da prévia: útil para agente e CLI sem apresentar uma mutação como fato salvo. */
export function formatarPreviaDePose(resultado, casas = 6) {
  if (!resultado || typeof resultado !== 'object' || !Array.isArray(resultado.diagnosticos)) {
    falhar('formatarPreviaDePose', 'esperava resultado de derivarPreviaDeEncaixeCilindrico().');
  }
  if (!Number.isInteger(casas) || casas < 0 || casas > 12) falhar('formatarPreviaDePose', 'casas precisa ser inteiro entre 0 e 12.');
  if (!resultado.aplicavel) return `prévia: indisponível (${resultado.diagnosticos.map((d) => d.codigo).join(', ')})\n`;
  const n = (valor) => valor.toFixed(casas).replace(/^-0(\.0+)?$/, '0');
  const p = resultado.previa;
  return [
    `prévia: aplicável à instância ${p.instancia} (não persistida)`,
    `escala: ${n(p.escala)}`,
    `deslocamento: [${p.deslocamento.map(n).join(', ')}]`,
    `rotação: ${p.rotacao.map((linha) => `[${linha.map(n).join(', ')}]`).join(' ')}`,
  ].join('\n').concat('\n');
}

function portaDo(mapa, chave, quem) {
  if (!(mapa instanceof Map)) falhar(quem, 'portas precisa ser o Map de resolverPortasDeMontagem().');
  if (typeof chave !== 'string' || !chave) falhar(quem, 'referência de porta precisa ser texto não vazio.');
  const porta = mapa.get(chave);
  if (!porta) falhar(quem, `porta '${chave}' não foi resolvida.`);
  return porta;
}

function intervaloNoEixo(porta, eixoReferencia) {
  const sinal = produto(porta.eixo, eixoReferencia) >= 0 ? 1 : -1;
  const centro = produto(porta.centro, eixoReferencia);
  const inicio = sinal > 0 ? porta.inicio : -porta.fim;
  const fim = sinal > 0 ? porta.fim : -porta.inicio;
  return [centro + inicio, centro + fim];
}

function medidasIndisponiveisDeEncaixe(tolerancia, especificacaoFolgaRadial) {
  return {
    disponiveis: false,
    alinhamento: null, descentro: null, folgaRadial: null,
    folgaRadialMinima: especificacaoFolgaRadial.minimo,
    folgaRadialMaxima: especificacaoFolgaRadial.maximo,
    tolerancia, toleranciaNumerica: tolerancia, especificacaoFolgaRadial,
    inicioReferencia: null, fimReferencia: null, inicioMovel: null, fimMovel: null,
    sobraInicio: null, sobraFim: null, sobreposicaoAxial: null, separacaoAxial: null,
  };
}

function medidasIndisponiveisDeAssentamento(tolerancia, radialEsperado, axialEsperado) {
  return {
    disponiveis: false,
    alinhamento: null, descentro: null, sobreposicaoRadial: null,
    sobreposicaoAxial: null, separacaoAxial: null,
    tolerancia, toleranciaNumerica: tolerancia, radialEsperado, axialEsperado,
  };
}

/**
 * Mede um encaixe externo -> interno numa pose já declarada. A função não muda
 * instância alguma: seu retorno é apenas diagnóstico estruturado e ordenado.
 */
export function validarEncaixeCilindrico(declaracao, portas) {
  const quem = 'validarEncaixeCilindrico';
  if (!declaracao || typeof declaracao !== 'object' || Array.isArray(declaracao)) {
    falhar(quem, 'declaração precisa ser objeto.');
  }
  const id = declaracao.id;
  if (typeof id !== 'string' || !id) falhar(quem, 'declaração precisa de id não vazio.');
  if (declaracao.tipo !== 'encaixaCilindrico') falhar(quem, "tipo precisa ser 'encaixaCilindrico'.");
  const tolerancia = toleranciaNumericaDe(declaracao, `${quem}.${id}`);
  const especificacaoFolgaRadial = faixaDeEspecificacao(declaracao, 'folgaRadial', `${quem}.${id}`);
  const { minimo, maximo } = especificacaoFolgaRadial;

  const referencia = portaDo(portas, declaracao.referencia, quem);
  const movel = portaDo(portas, declaracao.movel, quem);
  const diagnosticos = [];
  if (referencia.forma !== 'cilindro' || movel.forma !== 'cilindro') {
    diagnosticos.push({ codigo: 'forma-incompativel', esperado: 'cilindro' });
  }
  if (referencia.papel !== 'externa' || movel.papel !== 'interna') {
    diagnosticos.push({ codigo: 'direcao-incompativel', esperado: 'referencia externa e movel interna', observado: `${referencia.papel}->${movel.papel}` });
  }
  if (diagnosticos.length) {
    return {
      id, tipo: 'encaixaCilindrico', satisfeita: false,
      referencia: referencia.id, movel: movel.id,
      medidas: medidasIndisponiveisDeEncaixe(tolerancia, especificacaoFolgaRadial),
      diagnosticos,
    };
  }

  const alinhamento = Math.abs(produto(referencia.eixo, movel.eixo));
  if (1 - alinhamento > EPSILON_ANGULAR) {
    diagnosticos.push({ codigo: 'eixos-divergentes', observado: alinhamento, limite: 1 - EPSILON_ANGULAR });
  }
  const entreCentros = subtrair(movel.centro, referencia.centro);
  const aoLongo = produto(entreCentros, referencia.eixo);
  const lateral = subtrair(entreCentros, multiplicar(referencia.eixo, aoLongo));
  const descentro = comprimento(lateral);
  if (descentro > tolerancia) {
    diagnosticos.push({ codigo: 'eixos-descentrados', observado: descentro, limite: tolerancia });
  }

  const folgaRadial = movel.raio - referencia.raio;
  if (folgaRadial < minimo - tolerancia || folgaRadial > maximo + tolerancia) {
    diagnosticos.push({ codigo: 'folga-radial-fora', observado: folgaRadial, minimo, maximo, tolerancia });
  }
  const [inicioReferencia, fimReferencia] = intervaloNoEixo(referencia, referencia.eixo);
  const [inicioMovel, fimMovel] = intervaloNoEixo(movel, referencia.eixo);
  const sobraInicio = inicioReferencia - inicioMovel;
  const sobraFim = fimMovel - fimReferencia;
  const sobreposicaoAxial = Math.max(0, Math.min(fimReferencia, fimMovel) - Math.max(inicioReferencia, inicioMovel));
  const separacaoAxial = Math.max(0, Math.max(inicioReferencia, inicioMovel) - Math.min(fimReferencia, fimMovel));
  if (sobraInicio < -tolerancia || sobraFim < -tolerancia) {
    diagnosticos.push({ codigo: 'intervalo-axial-fora', sobraInicio, sobraFim, tolerancia });
  }

  return {
    id, tipo: 'encaixaCilindrico', satisfeita: diagnosticos.length === 0,
    referencia: referencia.id, movel: movel.id,
    medidas: {
      disponiveis: true, alinhamento, descentro, folgaRadial, folgaRadialMinima: minimo,
      folgaRadialMaxima: maximo, tolerancia, toleranciaNumerica: tolerancia, especificacaoFolgaRadial, inicioReferencia, fimReferencia, inicioMovel,
      fimMovel, sobraInicio, sobraFim, sobreposicaoAxial, separacaoAxial,
    },
    diagnosticos,
  };
}

/**
 * Lê apenas o contato físico declarado pela interface. A folga de projeto
 * continua em `folgaRadialMinima/Maxima`; a tolerância aqui é exclusivamente
 * numérica. Portanto uma folga positiva pode estar fora do contrato de projeto
 * sem virar "interferência" por acidente.
 */
export function classificarContatoLocalCilindrico(resultado) {
  const quem = 'classificarContatoLocalCilindrico';
  const m = resultado?.medidas;
  if (m?.disponiveis === false) {
    falhar(quem, 'medidas estão indisponíveis para uma relação estruturalmente incompatível.');
  }
  if (!m || !Number.isFinite(m.folgaRadial) || !Number.isFinite(m.tolerancia)
    || !Number.isFinite(m.sobreposicaoAxial) || !Number.isFinite(m.separacaoAxial)) {
    falhar(quem, 'esperava medidas de validarEncaixeCilindrico().');
  }
  const radial = m.folgaRadial < -m.tolerancia
    ? 'interferencia'
    : Math.abs(m.folgaRadial) <= m.tolerancia ? 'encosta' : 'folga';
  const axial = m.separacaoAxial > m.tolerancia
    ? 'sem-alcance'
    : m.sobreposicaoAxial > m.tolerancia ? 'alcanca' : 'encosta';
  return {
    radial: { estado: radial, medida: m.folgaRadial, unidade: 'm', toleranciaNumerica: m.tolerancia },
    axial: {
      estado: axial, sobreposicao: m.sobreposicaoAxial, separacao: m.separacaoAxial,
      unidade: 'm', toleranciaNumerica: m.tolerancia,
    },
  };
}

/**
 * Mostra lado a lado a relação de porta e o alerta amplo por caixa das duas
 * instâncias que ela cita. A caixa não decide o contato local e nunca é
 * removida quando o encaixe passa.
 */
export function diagnosticarEncaixeCilindrico(declaracao, instancias) {
  const quem = 'diagnosticarEncaixeCilindrico';
  const portas = resolverPortasDeMontagem(instancias);
  const encaixe = avaliarEstadoDeEncaixeCilindrico(declaracao, portas);
  const referencia = portaDo(portas, declaracao.referencia, quem);
  const movel = portaDo(portas, declaracao.movel, quem);
  const porId = instanciasPorId(instancias, quem);
  const instanciaReferencia = porId.get(referencia.instancia);
  const instanciaMovel = porId.get(movel.instancia);
  const caixaReferencia = caixaAmplaDaInstancia(instanciaReferencia, `${quem}.${referencia.instancia}`);
  const caixaMovel = caixaAmplaDaInstancia(instanciaMovel, `${quem}.${movel.instancia}`);
  return {
    ...encaixe,
    contatoLocal: encaixe.medidas.disponiveis === false ? null : classificarContatoLocalCilindrico(encaixe),
    alertaGlobal: relacaoEntreCaixas(caixaReferencia, caixaMovel),
  };
}

function toleranciaNumericaDe(declaracao, quem) {
  if (declaracao.toleranciaNumerica !== undefined && declaracao.tolerancia !== undefined) {
    falhar(quem, "use 'toleranciaNumerica' ou o campo legado 'tolerancia', não os dois.");
  }
  return escalar(declaracao.toleranciaNumerica ?? declaracao.tolerancia ?? 1e-6, `${quem}.toleranciaNumerica`, { naoNegativo: true });
}

function faixaDeEspecificacao(declaracao, chave, quem) {
  const faixa = declaracao[chave];
  if (!faixa || typeof faixa !== 'object' || Array.isArray(faixa)) falhar(quem, `${chave} precisa ser {min,max}.`);
  const temFaixaLegada = Object.hasOwn(faixa, 'min') || Object.hasOwn(faixa, 'max');
  if (temFaixaLegada) {
    const extras = Object.keys(faixa).filter((chaveDaFaixa) => chaveDaFaixa !== 'min' && chaveDaFaixa !== 'max');
    if (extras.length || !Object.hasOwn(faixa, 'min') || !Object.hasOwn(faixa, 'max')) falhar(quem, `${chave} legado precisa ser exatamente {min,max}.`);
    const minimo = escalar(faixa.min, `${quem}.${chave}.min`, { naoNegativo: true });
    const maximo = escalar(faixa.max, `${quem}.${chave}.max`, { naoNegativo: true });
    if (maximo < minimo) falhar(quem, `${chave}.max precisa ser >= min.`);
    return { minimo, maximo, nominal: null, toleranciaFabricacao: null, formato: 'faixa-legada' };
  }
  const extras = Object.keys(faixa).filter((chaveDaFaixa) => chaveDaFaixa !== 'nominal' && chaveDaFaixa !== 'toleranciaFabricacao');
  if (extras.length || !Object.hasOwn(faixa, 'nominal') || !Object.hasOwn(faixa, 'toleranciaFabricacao')) {
    falhar(quem, `${chave} precisa ser {min,max} legado ou {nominal,toleranciaFabricacao}.`);
  }
  const nominal = escalar(faixa.nominal, `${quem}.${chave}.nominal`, { naoNegativo: true });
  const fabricacao = faixa.toleranciaFabricacao;
  if (!fabricacao || typeof fabricacao !== 'object' || Array.isArray(fabricacao)) falhar(quem, `${chave}.toleranciaFabricacao precisa ser {menos,mais}.`);
  const extrasFabricacao = Object.keys(fabricacao).filter((chaveDaFabricacao) => chaveDaFabricacao !== 'menos' && chaveDaFabricacao !== 'mais');
  if (extrasFabricacao.length || !Object.hasOwn(fabricacao, 'menos') || !Object.hasOwn(fabricacao, 'mais')) falhar(quem, `${chave}.toleranciaFabricacao precisa ser exatamente {menos,mais}.`);
  const menos = escalar(fabricacao.menos, `${quem}.${chave}.toleranciaFabricacao.menos`, { naoNegativo: true });
  const mais = escalar(fabricacao.mais, `${quem}.${chave}.toleranciaFabricacao.mais`, { naoNegativo: true });
  const minimo = nominal - menos;
  if (minimo < 0) falhar(quem, `${chave}.nominal - toleranciaFabricacao.menos precisa ser >= 0.`);
  return { minimo, maximo: nominal + mais, nominal, toleranciaFabricacao: { menos, mais }, formato: 'nominal-fabricacao' };
}

/** Mede uma faixa anular declarada; não infere borracha, pressão ou colisão de malha. */
export function validarAssentamentoAnular(declaracao, portas) {
  const quem = 'validarAssentamentoAnular';
  if (!declaracao || typeof declaracao !== 'object' || Array.isArray(declaracao)) falhar(quem, 'declaração precisa ser objeto.');
  const id = declaracao.id;
  if (typeof id !== 'string' || !id) falhar(quem, 'declaração precisa de id não vazio.');
  if (declaracao.tipo !== 'assentaAnular') falhar(quem, "tipo precisa ser 'assentaAnular'.");
  const tolerancia = toleranciaNumericaDe(declaracao, `${quem}.${id}`);
  const radialEsperado = faixaDeEspecificacao(declaracao, 'sobreposicaoRadial', `${quem}.${id}`);
  const axialEsperado = faixaDeEspecificacao(declaracao, 'sobreposicaoAxial', `${quem}.${id}`);
  const referencia = portaDo(portas, declaracao.referencia, quem);
  const movel = portaDo(portas, declaracao.movel, quem);
  const diagnosticos = [];
  if (referencia.forma !== 'anel' || movel.forma !== 'anel') diagnosticos.push({ codigo: 'forma-incompativel', esperado: 'anel' });
  if (referencia.papel !== 'recebe' || movel.papel !== 'ocupa') {
    diagnosticos.push({ codigo: 'direcao-incompativel', esperado: 'referencia recebe e movel ocupa', observado: `${referencia.papel}->${movel.papel}` });
  }
  if (diagnosticos.length) {
    return {
      id, tipo: 'assentaAnular', satisfeita: false,
      referencia: referencia.id, movel: movel.id,
      medidas: medidasIndisponiveisDeAssentamento(tolerancia, radialEsperado, axialEsperado),
      diagnosticos,
    };
  }
  const alinhamento = Math.abs(produto(referencia.eixo, movel.eixo));
  if (1 - alinhamento > EPSILON_ANGULAR) diagnosticos.push({ codigo: 'eixos-divergentes', observado: alinhamento, limite: 1 - EPSILON_ANGULAR });
  const entreCentros = subtrair(movel.centro, referencia.centro);
  const aoLongo = produto(entreCentros, referencia.eixo);
  const descentro = comprimento(subtrair(entreCentros, multiplicar(referencia.eixo, aoLongo)));
  if (descentro > tolerancia) diagnosticos.push({ codigo: 'eixos-descentrados', observado: descentro, limite: tolerancia });
  const inicioRadial = Math.max(referencia.raioInterno, movel.raioInterno);
  const fimRadial = Math.min(referencia.raioExterno, movel.raioExterno);
  const sobreposicaoRadial = Math.max(0, fimRadial - inicioRadial);
  if (sobreposicaoRadial < radialEsperado.minimo - tolerancia || sobreposicaoRadial > radialEsperado.maximo + tolerancia) {
    diagnosticos.push({ codigo: 'faixa-radial-fora', observado: sobreposicaoRadial, ...radialEsperado, tolerancia });
  }
  const [inicioReferencia, fimReferencia] = intervaloNoEixo(referencia, referencia.eixo);
  const [inicioMovel, fimMovel] = intervaloNoEixo(movel, referencia.eixo);
  const sobreposicaoAxial = Math.max(0, Math.min(fimReferencia, fimMovel) - Math.max(inicioReferencia, inicioMovel));
  const separacaoAxial = Math.max(0, Math.max(inicioReferencia, inicioMovel) - Math.min(fimReferencia, fimMovel));
  if (sobreposicaoAxial < axialEsperado.minimo - tolerancia || sobreposicaoAxial > axialEsperado.maximo + tolerancia) {
    diagnosticos.push({ codigo: 'faixa-axial-fora', observado: sobreposicaoAxial, ...axialEsperado, tolerancia });
  }
  return {
    id, tipo: 'assentaAnular', satisfeita: diagnosticos.length === 0,
    referencia: referencia.id, movel: movel.id,
    medidas: { disponiveis: true, alinhamento, descentro, sobreposicaoRadial, sobreposicaoAxial, separacaoAxial, tolerancia, toleranciaNumerica: tolerancia, radialEsperado, axialEsperado },
    diagnosticos,
  };
}

/** Junta a medida local do assentamento ao alerta amplo das partes declaradas. */
export function diagnosticarAssentamentoAnular(declaracao, instancias) {
  const quem = 'diagnosticarAssentamentoAnular';
  const portas = resolverPortasDeMontagem(instancias);
  const assentamento = validarAssentamentoAnular(declaracao, portas);
  const referencia = portaDo(portas, declaracao.referencia, quem);
  const movel = portaDo(portas, declaracao.movel, quem);
  const porId = instanciasPorId(instancias, quem);
  const caixaReferencia = caixaAmplaDaInstancia(porId.get(referencia.instancia), `${quem}.${referencia.instancia}`, referencia.parte ?? null);
  const caixaMovel = caixaAmplaDaInstancia(porId.get(movel.instancia), `${quem}.${movel.instancia}`, movel.parte ?? null);
  return { ...assentamento, alertaGlobal: relacaoEntreCaixas(caixaReferencia, caixaMovel) };
}

export function formatarDiagnosticoDeAssentamentoAnular(resultado, casas = 6) {
  if (!resultado || typeof resultado !== 'object' || !Array.isArray(resultado.diagnosticos)) {
    falhar('formatarDiagnosticoDeAssentamentoAnular', 'esperava resultado de validarAssentamentoAnular().');
  }
  if (!Number.isInteger(casas) || casas < 0 || casas > 12) falhar('formatarDiagnosticoDeAssentamentoAnular', 'casas precisa ser inteiro entre 0 e 12.');
  const n = (valor) => Number.isFinite(valor) ? valor.toFixed(casas).replace(/^-0(\.0+)?$/, '0') : String(valor);
  const m = resultado.medidas;
  if (m?.disponiveis === false) {
    const linhasIndisponiveis = [
      'relação: ' + resultado.id + ' (' + resultado.tipo + ')',
      'portas: referência ' + resultado.referencia + ' -> móvel ' + resultado.movel,
      'medição: reprovada',
      'medidas: indisponíveis (interfaces estruturalmente incompatíveis)',
    ];
    if (resultado.diagnosticos.length) linhasIndisponiveis.push('causas: ' + resultado.diagnosticos.map((d) => d.codigo).join(', '));
    if (resultado.alertaGlobal) linhasIndisponiveis.push('alerta global por caixa: ' + resultado.alertaGlobal.tipo + ' (' + n(resultado.alertaGlobal.distancia) + ' m; não substitui contato local)');
    return linhasIndisponiveis.join('\n') + '\n';
  }
  const linhas = [
    `relação: ${resultado.id} (${resultado.tipo})`,
    `portas: referência ${resultado.referencia} -> móvel ${resultado.movel}`,
    `medição: ${resultado.satisfeita ? 'aprovada' : 'reprovada'}`,
    `faixa radial: sobreposição ${n(m.sobreposicaoRadial)} m (esperada ${n(m.radialEsperado.minimo)}…${n(m.radialEsperado.maximo)})`,
    `faixa axial: sobreposição ${n(m.sobreposicaoAxial)} m, separação ${n(m.separacaoAxial)} m (esperada ${n(m.axialEsperado.minimo)}…${n(m.axialEsperado.maximo)})`,
    `eixos: alinhamento ${n(m.alinhamento)}, descentro ${n(m.descentro)} m`,
  ];
  if (m.radialEsperado?.formato === 'nominal-fabricacao' || m.axialEsperado?.formato === 'nominal-fabricacao') {
    const formato = (nome, especificacao) => especificacao.formato === 'nominal-fabricacao'
      ? `${nome}: nominal ${n(especificacao.nominal)} m, fabricação -${n(especificacao.toleranciaFabricacao.menos)}/+${n(especificacao.toleranciaFabricacao.mais)} m`
      : `${nome}: faixa legada ${n(especificacao.minimo)}…${n(especificacao.maximo)} m`;
    linhas.push(`projeto ${formato('radial', m.radialEsperado)}`);
    linhas.push(`projeto ${formato('axial', m.axialEsperado)}`);
    linhas.push(`tolerância numérica: ${n(m.toleranciaNumerica)} m`);
  }
  if (resultado.diagnosticos.length) linhas.push(`causas: ${resultado.diagnosticos.map((d) => d.codigo).join(', ')}`);
  if (resultado.alertaGlobal) linhas.push(`alerta global por caixa: ${resultado.alertaGlobal.tipo} (${n(resultado.alertaGlobal.distancia)} m; não substitui contato local)`);
  return `${linhas.join('\n')}\n`;
}

/**
 * Acrescenta a leitura de completude ao diagnóstico já mensurado. A função não
 * tenta corrigir nada: "subdeterminada" quer dizer que ainda existem poses
 * válidas, e não que a ferramenta escolheu uma delas. A precedência é fixa:
 * incompatibilidade estrutural > divergência mensurável > liberdade restante >
 * relação satisfeita.
 */
export function avaliarEstadoDeEncaixeCilindrico(declaracao, portas) {
  const resultado = validarEncaixeCilindrico(declaracao, portas);
  const referencia = portaDo(portas, declaracao.referencia, 'avaliarEstadoDeEncaixeCilindrico');
  const movel = portaDo(portas, declaracao.movel, 'avaliarEstadoDeEncaixeCilindrico');
  const diagnosticos = resultado.diagnosticos.map((diagnostico) => ({ ...diagnostico }));
  const estruturais = new Set(['forma-incompativel', 'direcao-incompativel']);
  if (diagnosticos.some((diagnostico) => estruturais.has(diagnostico.codigo))) {
    return { ...resultado, estado: 'impossivel', grausDeLiberdade: [], diagnosticos };
  }
  if (diagnosticos.length) {
    return { ...resultado, estado: 'divergente', grausDeLiberdade: [], diagnosticos };
  }
  if (!declaracao.poseCanonica) {
    return {
      ...resultado,
      estado: 'subdeterminada',
      grausDeLiberdade: ['giro-no-eixo', 'posicao-axial'],
      diagnosticos,
    };
  }
  contratoDePose(declaracao, `avaliarEstadoDeEncaixeCilindrico.${resultado.id}.poseCanonica`);
  if (!quadroDaPorta(referencia) || !quadroDaPorta(movel)) {
    diagnosticos.push({
      codigo: 'quadro-incompleto',
      esperado: 'eixo e referencia perpendicular em ambas as portas para poseCanonica',
    });
    return { ...resultado, satisfeita: false, estado: 'impossivel', grausDeLiberdade: [], diagnosticos };
  }
  return { ...resultado, estado: 'satisfeita', grausDeLiberdade: [], diagnosticos };
}

/** Texto curto, estável e utilizável por agente/CLI; não omite a causa numérica. */
export function formatarDiagnosticoDeEncaixe(resultado, casas = 6) {
  if (!resultado || typeof resultado !== 'object' || !Array.isArray(resultado.diagnosticos)) {
    falhar('formatarDiagnosticoDeEncaixe', 'esperava resultado de validarEncaixeCilindrico().');
  }
  if (!Number.isInteger(casas) || casas < 0 || casas > 12) falhar('formatarDiagnosticoDeEncaixe', 'casas precisa ser inteiro entre 0 e 12.');
  const n = (valor) => Number.isFinite(valor) ? valor.toFixed(casas).replace(/^-0(\.0+)?$/, '0') : String(valor);
  const m = resultado.medidas;
  if (m?.disponiveis === false) {
    const linhasIndisponiveis = [
      'relação: ' + resultado.id + ' (' + resultado.tipo + ')',
      'portas: referência ' + resultado.referencia + ' -> móvel ' + resultado.movel,
      'medição: reprovada',
      'medidas: indisponíveis (interfaces estruturalmente incompatíveis)',
    ];
    if (resultado.diagnosticos.length) linhasIndisponiveis.push('causas: ' + resultado.diagnosticos.map((d) => d.codigo).join(', '));
    if (resultado.alertaGlobal) linhasIndisponiveis.push('alerta global por caixa: ' + resultado.alertaGlobal.tipo + ' (' + n(resultado.alertaGlobal.distancia) + ' m; não substitui contato local)');
    return linhasIndisponiveis.join('\n') + '\n';
  }
  const linhas = [
    `relação: ${resultado.id} (${resultado.tipo})`,
    `portas: referência ${resultado.referencia} -> móvel ${resultado.movel}`,
    `medição: ${resultado.satisfeita ? 'aprovada' : 'reprovada'}`,
    `folga radial: ${n(m.folgaRadial)} (permitida ${n(m.folgaRadialMinima)}…${n(m.folgaRadialMaxima)})`,
    `axial: sobreposição ${n(m.sobreposicaoAxial)}, sobras início/fim ${n(m.sobraInicio)}/${n(m.sobraFim)}`,
    `eixos: alinhamento ${n(m.alinhamento)}, descentro ${n(m.descentro)}`,
  ];
  if (m.especificacaoFolgaRadial?.formato === 'nominal-fabricacao') {
    const f = m.especificacaoFolgaRadial.toleranciaFabricacao;
    linhas.push(`projeto radial: nominal ${n(m.especificacaoFolgaRadial.nominal)} m, fabricação -${n(f.menos)}/+${n(f.mais)} m`);
    linhas.push(`tolerância numérica: ${n(m.toleranciaNumerica)} m`);
  }
  if (typeof resultado.estado === 'string') {
    linhas.splice(3, 0, `estado do encaixe: ${resultado.estado}`);
    if (Array.isArray(resultado.grausDeLiberdade) && resultado.grausDeLiberdade.length) {
      linhas.push(`a declarar: ${resultado.grausDeLiberdade.join(', ')}`);
    }
  }
  if (resultado.diagnosticos.length) {
    linhas.push(`causas: ${resultado.diagnosticos.map((d) => d.codigo).join(', ')}`);
  }
  if (resultado.contatoLocal) {
    const local = resultado.contatoLocal;
    linhas.push(`contato local radial: ${local.radial.estado} (${n(local.radial.medida)} m)`);
    linhas.push(`contato local axial: ${local.axial.estado} (sobreposição ${n(local.axial.sobreposicao)} m, separação ${n(local.axial.separacao)} m)`);
  }
  if (resultado.alertaGlobal) {
    linhas.push(`alerta global por caixa: ${resultado.alertaGlobal.tipo} (${n(resultado.alertaGlobal.distancia)} m; não substitui contato local)`);
  }
  return `${linhas.join('\n')}\n`;
}
