/* interfaces-montagem.js — resolve portas declaradas por peças, mede relações
   mecânicas e deriva poses sem Three.js, hierarquia ou solver. É o contrato
   mínimo e read-only do AUT-05 / T014.

   FORMATO DAS PORTAS DO NÚCLEO (AUT-05 & T014):

   1. Cilindro:
      {
        forma: 'cilindro',
        papel: 'externa' | 'interna',
        eixo: [x, y, z],
        centro: [x, y, z],
        raio: number (> 0),
        inicio: number,
        fim: number (> inicio),
        referencia?: [x, y, z], // perpendicular ao eixo
        mao?: 'espelhada'
      }

   2. Anel:
      {
        forma: 'anel',
        papel: 'recebe' | 'ocupa',
        eixo: [x, y, z],
        centro: [x, y, z],
        raioInterno: number (>= 0),
        raioExterno: number (> raioInterno),
        inicio: number,
        fim: number (> inicio),
        parte?: string,
        mao?: 'espelhada'
      }

   3. Plano de Apoio:
      {
        forma: 'plano',
        papel: 'recebe' | 'apoia',
        ponto: [x, y, z],         // ponto de ancoragem no plano
        normal: [nx, ny, nz],     // vetor normal unitário apontando para fora da peça
        extensao: [largura, comprimento] | { largura, comprimento }, // dimensões finitas > 0
        referencia?: [x, y, z],   // vetor de orientação contido no plano (perpendicular à normal)
        parte?: string,
        mao?: 'espelhada'
      }

   4. Padrão de Furos:
      {
        forma: 'padraoFuros',
        papel: 'recebe' | 'ocupa',
        plano: { ponto: [x, y, z], normal: [nx, ny, nz] },
        diametro: number (> 0),   // diâmetro nominal dos furos
        centros?: Array<[x, y, z]>, // lista de centros no plano
        padrao?: {                // gerador alternativo de furos
          tipo: 'linear', direcao: [x, y, z], passo: number, quantidade: number, origem?: [x, y, z]
        } | {
          tipo: 'circular', centro: [x, y, z], raio: number, quantidade: number, anguloInicial?: number
        },
        profundidade?: number (> 0),
        classeAjuste?: 'folgado' | 'transicao' | 'interferencia',
        referencia?: [x, y, z],
        parte?: string,
        mao?: 'espelhada'
      }

   5. Trilho:
      {
        forma: 'trilho',
        papel: 'guia' | 'deslizador',
        eixo: [x, y, z],          // vetor unitário ao longo do caminho de translação
        centro: [x, y, z],        // ponto de referência
        perfil: { largura: number (> 0), altura: number (> 0), tipo?: string },
        curso: number (> 0),      // curso útil do movimento linear [0, curso]
        classeAjuste?: 'folgado' | 'transicao' | 'interferencia',
        referencia?: [x, y, z],   // vetor unitário perpendicular ao eixo (topo/orientação da seção)
        parte?: string,
        mao?: 'espelhada'
      }

   CLASSES DE AJUSTE (ISO 286 COMPACTA - V1):
   Tabela versionada (TABELA_CLASSES_AJUSTE_V1) que define folga em milímetros
   para faixas de dimensão nominal (d <= 500 mm):
   - 'folgado' (ex.: H7/g6, H8/f7): folga positiva garantida para movimento livre.
   - 'transicao' (ex.: H7/k6, H7/js6): ajuste com folga mínima ou leve aperto.
   - 'interferencia' (ex.: H7/p6, H7/s6): montagem sob pressão / interferência negativa.
*/

import { relacaoEntreCaixas } from './descrever-partes.js';
import { validarTransformacaoRigida, comporTransformacoesRigidas, localDaTransformacaoRigida } from './transformacao-rigida.js';

const EPSILON_ANGULAR = 1e-9;

/** Estados estáveis do encaixe cilíndrico, em ordem de decisão. */
export const ESTADOS_DE_ENCAIXE_CILINDRICO = [
  'impossivel', 'divergente', 'subdeterminada', 'satisfeita',
];

/** Tabela compacta e versionada de ajustes baseada em ISO 286 (dimensões em mm). */
export const TABELA_CLASSES_AJUSTE_V1 = Object.freeze([
  { ateMm: 3,   folgado: { min: 0.006, max: 0.020 }, transicao: { min: -0.004, max: 0.006 }, interferencia: { min: -0.018, max: -0.006 } },
  { ateMm: 6,   folgado: { min: 0.010, max: 0.028 }, transicao: { min: -0.005, max: 0.009 }, interferencia: { min: -0.023, max: -0.009 } },
  { ateMm: 10,  folgado: { min: 0.013, max: 0.035 }, transicao: { min: -0.006, max: 0.010 }, interferencia: { min: -0.028, max: -0.012 } },
  { ateMm: 18,  folgado: { min: 0.016, max: 0.043 }, transicao: { min: -0.008, max: 0.012 }, interferencia: { min: -0.035, max: -0.015 } },
  { ateMm: 30,  folgado: { min: 0.020, max: 0.053 }, transicao: { min: -0.009, max: 0.015 }, interferencia: { min: -0.042, max: -0.018 } },
  { ateMm: 50,  folgado: { min: 0.025, max: 0.064 }, transicao: { min: -0.011, max: 0.018 }, interferencia: { min: -0.050, max: -0.022 } },
  { ateMm: 80,  folgado: { min: 0.030, max: 0.076 }, transicao: { min: -0.013, max: 0.022 }, interferencia: { min: -0.062, max: -0.026 } },
  { ateMm: 120, folgado: { min: 0.036, max: 0.090 }, transicao: { min: -0.015, max: 0.026 }, interferencia: { min: -0.073, max: -0.032 } },
  { ateMm: 180, folgado: { min: 0.043, max: 0.106 }, transicao: { min: -0.018, max: 0.031 }, interferencia: { min: -0.085, max: -0.037 } },
  { ateMm: 250, folgado: { min: 0.050, max: 0.122 }, transicao: { min: -0.021, max: 0.036 }, interferencia: { min: -0.098, max: -0.043 } },
  { ateMm: 315, folgado: { min: 0.056, max: 0.137 }, transicao: { min: -0.023, max: 0.040 }, interferencia: { min: -0.110, max: -0.048 } },
  { ateMm: 400, folgado: { min: 0.062, max: 0.151 }, transicao: { min: -0.025, max: 0.044 }, interferencia: { min: -0.122, max: -0.054 } },
  { ateMm: 500, folgado: { min: 0.068, max: 0.165 }, transicao: { min: -0.027, max: 0.048 }, interferencia: { min: -0.135, max: -0.060 } },
]);

export const CLASSES_DE_AJUSTE = Object.freeze(['folgado', 'transicao', 'interferencia']);

export function obterFolgaPorClasseAjuste(classe, dimensaoNominalMm) {
  if (!CLASSES_DE_AJUSTE.includes(classe)) {
    throw new Error(`obterFolgaPorClasseAjuste: classe '${classe}' desconhecida (aceitas: ${CLASSES_DE_AJUSTE.join(', ')}).`);
  }
  if (!Number.isFinite(dimensaoNominalMm) || dimensaoNominalMm <= 0) {
    throw new Error(`obterFolgaPorClasseAjuste: dimensaoNominalMm precisa ser número finito > 0 (recebido ${dimensaoNominalMm}).`);
  }
  const entrada = TABELA_CLASSES_AJUSTE_V1.find((e) => dimensaoNominalMm <= e.ateMm) ?? TABELA_CLASSES_AJUSTE_V1[TABELA_CLASSES_AJUSTE_V1.length - 1];
  const faixa = entrada[classe];
  return {
    classe,
    nominalMm: dimensaoNominalMm,
    min: faixa.min,
    max: faixa.max,
    folgaMinMm: faixa.min,
    folgaMaxMm: faixa.max,
    interferenciaMaxMm: Math.max(0, -faixa.min),
    unidade: 'mm',
  };
}

export function obterFolgaPorClasseAjusteEmMetros(classe, dimensaoNominalMetros) {
  const folgaMm = obterFolgaPorClasseAjuste(classe, dimensaoNominalMetros * 1000);
  return {
    classe,
    nominal: dimensaoNominalMetros,
    minimo: folgaMm.min / 1000,
    maximo: folgaMm.max / 1000,
    folgaMinM: folgaMm.min / 1000,
    folgaMaxM: folgaMm.max / 1000,
    unidade: 'm',
  };
}

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
const aplicarMatriz = (matriz, valor) => matriz.map((linha) => produto(linha, valor));
const transpor = (matriz) => matriz[0].map((_, coluna) => matriz.map((linha) => linha[coluna]));
const multiplicarMatrizes = (a, b) => a.map((linha) => b[0].map((_, coluna) => produto(linha, b.map((outra) => outra[coluna]))));
function mundoDaInstancia(instancia, quem) {
  const local = validarTransformacaoRigida({
    escala: instancia.escala, rotacao: instancia.rotacao, deslocamento: instancia.deslocamento,
  }, `${quem}.local`);
  const referencial = validarTransformacaoRigida(instancia.referencial, `${quem}.referencial`, { aceitarEscala: false });
  return { local, referencial, mundo: comporTransformacoesRigidas(referencial, local) };
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
  if (i.mao !== undefined && i.mao !== 'espelhada') falhar(quem, "mao só aceita 'espelhada' quando declarada.");
  return {
    forma: 'cilindro', papel: i.papel, eixo: multiplicar(eixo, 1 / tamanho),
    centro: vetor(i.centro, `${quem}.centro`), raio: escalar(i.raio, `${quem}.raio`, { positivo: true }),
    inicio, fim,
    ...(i.referencia === undefined ? {} : { referencia: vetor(i.referencia, `${quem}.referencia`) }),
    ...(i.mao === undefined ? {} : { mao: i.mao }),
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
  if (i.mao !== undefined && i.mao !== 'espelhada') falhar(quem, "mao só aceita 'espelhada' quando declarada.");
  return {
    forma: 'anel', papel: i.papel, eixo: multiplicar(eixo, 1 / tamanho),
    centro: vetor(i.centro, `${quem}.centro`), raioInterno, raioExterno, inicio, fim,
    ...(i.parte === undefined ? {} : { parte: i.parte }),
    ...(i.mao === undefined ? {} : { mao: i.mao }),
  };
}

function interfacePlano(porta, quem) {
  const i = porta?.interface;
  if (!i || typeof i !== 'object' || Array.isArray(i)) falhar(quem, 'não publica interface.');
  if (i.forma !== 'plano' || (i.papel !== 'recebe' && i.papel !== 'apoia')) {
    falhar(quem, "interface precisa ser plano que 'recebe' ou 'apoia'.");
  }
  const normalBruta = vetor(i.normal ?? i.eixo, `${quem}.normal`);
  const tamanho = comprimento(normalBruta);
  if (!(tamanho > 0)) falhar(`${quem}.normal`, 'não pode ser nulo.');
  const normal = multiplicar(normalBruta, 1 / tamanho);
  const ponto = vetor(i.ponto ?? i.centro, `${quem}.ponto`);
  let extensao;
  if (Array.isArray(i.extensao) && i.extensao.length === 2) {
    extensao = [
      escalar(i.extensao[0], `${quem}.extensao[0]`, { positivo: true }),
      escalar(i.extensao[1], `${quem}.extensao[1]`, { positivo: true }),
    ];
  } else if (i.extensao && typeof i.extensao === 'object' && !Array.isArray(i.extensao)) {
    extensao = [
      escalar(i.extensao.largura, `${quem}.extensao.largura`, { positivo: true }),
      escalar(i.extensao.comprimento, `${quem}.extensao.comprimento`, { positivo: true }),
    ];
  } else {
    falhar(quem, 'extensao precisa ser [largura, comprimento] ou {largura, comprimento} com valores finitos > 0.');
  }
  if (i.mao !== undefined && i.mao !== 'espelhada') falhar(quem, "mao só aceita 'espelhada' quando declarada.");
  let referencia;
  if (i.referencia !== undefined) {
    const ref = vetor(i.referencia, `${quem}.referencia`);
    const tamRef = comprimento(ref);
    if (!(tamRef > 0)) falhar(`${quem}.referencia`, 'não pode ser nulo.');
    referencia = multiplicar(ref, 1 / tamRef);
    if (Math.abs(produto(normal, referencia)) > 1e-4) falhar(quem, 'referencia precisa ser perpendicular à normal.');
  }
  return {
    forma: 'plano', papel: i.papel, normal, eixo: normal,
    ponto, centro: ponto, extensao, largura: extensao[0], comprimento: extensao[1],
    ...(referencia === undefined ? {} : { referencia }),
    ...(i.parte === undefined ? {} : { parte: i.parte }),
    ...(i.mao === undefined ? {} : { mao: i.mao }),
  };
}

function interfacePadraoFuros(porta, quem) {
  const i = porta?.interface;
  if (!i || typeof i !== 'object' || Array.isArray(i)) falhar(quem, 'não publica interface.');
  const formaValida = i.forma === 'padraoFuros' || i.forma === 'padrao-furos' || i.forma === 'furos';
  if (!formaValida || (i.papel !== 'recebe' && i.papel !== 'ocupa')) {
    falhar(quem, "interface precisa ser padrão de furos que 'recebe' ou 'ocupa'.");
  }
  const planoObj = i.plano ?? { ponto: i.ponto ?? i.centro, normal: i.normal ?? i.eixo };
  if (!planoObj || typeof planoObj !== 'object') falhar(quem, 'exige plano {ponto, normal}.');
  const normalBruta = vetor(planoObj.normal ?? planoObj.eixo, `${quem}.plano.normal`);
  const tamanhoNormal = comprimento(normalBruta);
  if (!(tamanhoNormal > 0)) falhar(`${quem}.plano.normal`, 'não pode ser nulo.');
  const normal = multiplicar(normalBruta, 1 / tamanhoNormal);
  const ponto = vetor(planoObj.ponto ?? planoObj.centro, `${quem}.plano.ponto`);
  const diametro = escalar(i.diametro ?? (i.raio !== undefined ? i.raio * 2 : undefined), `${quem}.diametro`, { positivo: true });
  let centros = [];
  if (Array.isArray(i.centros)) {
    if (i.centros.length === 0) falhar(quem, 'centros precisa ser lista não vazia de pontos [x,y,z].');
    centros = i.centros.map((c, idx) => vetor(c, `${quem}.centros[${idx}]`));
  } else if (i.padrao && typeof i.padrao === 'object') {
    if (i.padrao.tipo === 'linear') {
      const qtd = escalar(i.padrao.quantidade, `${quem}.padrao.quantidade`, { positivo: true });
      const passo = escalar(i.padrao.passo, `${quem}.padrao.passo`);
      const dirBruta = vetor(i.padrao.direcao, `${quem}.padrao.direcao`);
      const dirTam = comprimento(dirBruta);
      if (!(dirTam > 0)) falhar(`${quem}.padrao.direcao`, 'não pode ser nulo.');
      const dir = multiplicar(dirBruta, 1 / dirTam);
      const origem = i.padrao.origem ? vetor(i.padrao.origem, `${quem}.padrao.origem`) : ponto;
      for (let k = 0; k < qtd; k++) {
        centros.push(somar(origem, multiplicar(dir, k * passo)));
      }
    } else if (i.padrao.tipo === 'circular') {
      const qtd = escalar(i.padrao.quantidade, `${quem}.padrao.quantidade`, { positivo: true });
      const raioPadrao = escalar(i.padrao.raio, `${quem}.padrao.raio`, { positivo: true });
      const centroPadrao = i.padrao.centro ? vetor(i.padrao.centro, `${quem}.padrao.centro`) : ponto;
      const anguloInicial = i.padrao.anguloInicial ? escalar(i.padrao.anguloInicial, `${quem}.padrao.anguloInicial`) : 0;
      const refApoio = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u = multiplicar(vetorProduto(normal, refApoio), 1 / comprimento(vetorProduto(normal, refApoio)));
      const v = vetorProduto(normal, u);
      for (let k = 0; k < qtd; k++) {
        const theta = anguloInicial + (2 * Math.PI * k) / qtd;
        const offset = somar(multiplicar(u, raioPadrao * Math.cos(theta)), multiplicar(v, raioPadrao * Math.sin(theta)));
        centros.push(somar(centroPadrao, offset));
      }
    } else {
      falhar(quem, "padrao.tipo precisa ser 'linear' ou 'circular'.");
    }
  } else {
    falhar(quem, 'exige centros (lista) ou padrao ({tipo: linear|circular}).');
  }
  let referencia;
  if (i.referencia !== undefined) {
    const ref = vetor(i.referencia, `${quem}.referencia`);
    const tamRef = comprimento(ref);
    if (!(tamRef > 0)) falhar(`${quem}.referencia`, 'não pode ser nulo.');
    referencia = multiplicar(ref, 1 / tamRef);
  }
  if (i.classeAjuste !== undefined && !CLASSES_DE_AJUSTE.includes(i.classeAjuste)) {
    falhar(quem, `classeAjuste desconhecida: '${i.classeAjuste}' (aceitas: ${CLASSES_DE_AJUSTE.join(', ')}).`);
  }
  return {
    forma: 'padraoFuros', papel: i.papel, plano: { ponto, normal }, ponto, centro: ponto,
    normal, eixo: normal, centros, diametro, raio: diametro / 2, quantidade: centros.length,
    ...(i.profundidade !== undefined ? { profundidade: escalar(i.profundidade, `${quem}.profundidade`, { positivo: true }) } : {}),
    ...(i.classeAjuste !== undefined ? { classeAjuste: i.classeAjuste } : {}),
    ...(referencia === undefined ? {} : { referencia }),
    ...(i.parte === undefined ? {} : { parte: i.parte }),
    ...(i.mao === undefined ? {} : { mao: i.mao }),
  };
}

function interfaceTrilho(porta, quem) {
  const i = porta?.interface;
  if (!i || typeof i !== 'object' || Array.isArray(i)) falhar(quem, 'não publica interface.');
  const papelValido = i.papel === 'guia' || i.papel === 'deslizador' || i.papel === 'recebe' || i.papel === 'ocupa';
  if (i.forma !== 'trilho' || !papelValido) {
    falhar(quem, "interface precisa ser trilho ('guia' ou 'deslizador').");
  }
  const eixoBruto = vetor(i.eixo, `${quem}.eixo`);
  const tamanhoEixo = comprimento(eixoBruto);
  if (!(tamanhoEixo > 0)) falhar(`${quem}.eixo`, 'não pode ser nulo.');
  const eixo = multiplicar(eixoBruto, 1 / tamanhoEixo);
  const centro = vetor(i.centro ?? i.ponto, `${quem}.centro`);
  if (!i.perfil || typeof i.perfil !== 'object') falhar(quem, 'exige perfil {largura, altura}.');
  const largura = escalar(i.perfil.largura, `${quem}.perfil.largura`, { positivo: true });
  const altura = escalar(i.perfil.altura, `${quem}.perfil.altura`, { positivo: true });
  const curso = escalar(i.curso, `${quem}.curso`, { positivo: true });
  let referencia;
  if (i.referencia !== undefined) {
    const ref = vetor(i.referencia, `${quem}.referencia`);
    const tamRef = comprimento(ref);
    if (!(tamRef > 0)) falhar(`${quem}.referencia`, 'não pode ser nulo.');
    referencia = multiplicar(ref, 1 / tamRef);
    if (Math.abs(produto(eixo, referencia)) > 1e-4) falhar(quem, 'referencia precisa ser perpendicular ao eixo.');
  }
  if (i.classeAjuste !== undefined && !CLASSES_DE_AJUSTE.includes(i.classeAjuste)) {
    falhar(quem, `classeAjuste desconhecida: '${i.classeAjuste}' (aceitas: ${CLASSES_DE_AJUSTE.join(', ')}).`);
  }
  return {
    forma: 'trilho', papel: i.papel, eixo, centro, ponto: centro,
    perfil: { largura, altura, ...(i.perfil.tipo ? { tipo: i.perfil.tipo } : {}) },
    largura, altura, curso, inicio: 0, fim: curso,
    ...(i.classeAjuste !== undefined ? { classeAjuste: i.classeAjuste } : {}),
    ...(referencia === undefined ? {} : { referencia }),
    ...(i.parte === undefined ? {} : { parte: i.parte }),
    ...(i.mao === undefined ? {} : { mao: i.mao }),
  };
}

function interfaceDeMontagem(porta, quem) {
  const forma = porta?.interface?.forma;
  if (forma === 'anel') return interfaceAnular(porta, quem);
  if (forma === 'plano') return interfacePlano(porta, quem);
  if (forma === 'padraoFuros' || forma === 'padrao-furos' || forma === 'furos') return interfacePadraoFuros(porta, quem);
  if (forma === 'trilho') return interfaceTrilho(porta, quem);
  if (forma === 'cilindro') return interfaceCilindrica(porta, quem);
  falhar(quem, `forma de interface desconhecida: '${forma}'`);
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
        transformacao: {
          mundo: { escala: mundo.escala, rotacao: mundo.rotacao.map((linha) => linha.slice()), deslocamento: mundo.deslocamento.slice() },
          local: { escala: local.escala, rotacao: local.rotacao.map((linha) => linha.slice()), deslocamento: local.deslocamento.slice() },
          referencial: { escala: referencial.escala, rotacao: referencial.rotacao.map((linha) => linha.slice()), deslocamento: referencial.deslocamento.slice() },
        },
      };
      if (base.inicio !== undefined) resolvida.inicio = base.inicio * mundo.escala;
      if (base.fim !== undefined) resolvida.fim = base.fim * mundo.escala;

      if (base.forma === 'cilindro') {
        resolvida.raio = base.raio * mundo.escala;
      } else if (base.forma === 'anel') {
        resolvida.raioInterno = base.raioInterno * mundo.escala;
        resolvida.raioExterno = base.raioExterno * mundo.escala;
      } else if (base.forma === 'plano') {
        resolvida.normal = resolvida.eixo;
        resolvida.ponto = resolvida.centro;
        resolvida.extensao = [base.extensao[0] * mundo.escala, base.extensao[1] * mundo.escala];
        resolvida.largura = resolvida.extensao[0];
        resolvida.comprimento = resolvida.extensao[1];
      } else if (base.forma === 'padraoFuros') {
        resolvida.normal = resolvida.eixo;
        resolvida.ponto = resolvida.centro;
        resolvida.plano = { ponto: resolvida.centro, normal: resolvida.eixo };
        resolvida.diametro = base.diametro * mundo.escala;
        resolvida.raio = resolvida.diametro / 2;
        resolvida.centros = base.centros.map((c) =>
          somar(multiplicar(aplicarMatriz(mundo.rotacao, c), mundo.escala), mundo.deslocamento)
        );
        resolvida.quantidade = resolvida.centros.length;
      } else if (base.forma === 'trilho') {
        resolvida.curso = base.curso * mundo.escala;
        resolvida.fim = resolvida.curso;
        resolvida.perfil = {
          ...base.perfil,
          largura: base.perfil.largura * mundo.escala,
          altura: base.perfil.altura * mundo.escala,
        };
        resolvida.largura = resolvida.perfil.largura;
        resolvida.altura = resolvida.perfil.altura;
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
  const maoEspelhada = diagnosticoDeMaoEspelhada(referencia, movel);
  if (maoEspelhada) diagnosticos.push(maoEspelhada);
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
  const local = localDaTransformacaoRigida(movel.transformacao.referencial, mundo);
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

/* Uma reflexão interna já foi aplicada à geometria e aos vetores da porta,
   mas ela troca a mão do quadro. As relações atuais só sabem construir uma
   rotação própria; medir ou derivar pose como se esse quadro fosse direto
   produziria uma resposta convincente e falsa. A recusa é estruturada para a
   IA saber que falta uma relação com contrato de espelho, não uma tolerância. */
function diagnosticoDeMaoEspelhada(referencia, movel) {
  const portas = [referencia, movel].filter((porta) => porta.mao === 'espelhada').map((porta) => porta.id);
  return portas.length ? {
    codigo: 'mao-espelhada',
    observado: portas,
    esperado: 'quadro de mão direta; relações sob espelho exigem contrato próprio',
  } : null;
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
  const maoEspelhada = diagnosticoDeMaoEspelhada(referencia, movel);
  if (maoEspelhada) diagnosticos.push(maoEspelhada);
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
  /* FRESTA SÓ QUANDO DECLARADA. A separação entre as faces era medida e não
     cobrada: uma peça posta alguns milímetros acima da outra passava. Sem
     `separacaoAxial` na declaração, a fresta permitida é zero; quem quer folga
     entre faces escreve a faixa, e ela fica visível na montagem. */
  const frestaEsperada = declaracao.separacaoAxial === undefined
    ? { minimo: 0, maximo: 0, nominal: 0, toleranciaFabricacao: null, formato: 'sem-fresta' }
    : faixaDeEspecificacao(declaracao, 'separacaoAxial', `${quem}.${id}`);
  const referencia = portaDo(portas, declaracao.referencia, quem);
  const movel = portaDo(portas, declaracao.movel, quem);
  const diagnosticos = [];
  if (referencia.forma !== 'anel' || movel.forma !== 'anel') diagnosticos.push({ codigo: 'forma-incompativel', esperado: 'anel' });
  if (referencia.papel !== 'recebe' || movel.papel !== 'ocupa') {
    diagnosticos.push({ codigo: 'direcao-incompativel', esperado: 'referencia recebe e movel ocupa', observado: `${referencia.papel}->${movel.papel}` });
  }
  const maoEspelhada = diagnosticoDeMaoEspelhada(referencia, movel);
  if (maoEspelhada) diagnosticos.push(maoEspelhada);
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
  if (separacaoAxial < frestaEsperada.minimo - tolerancia || separacaoAxial > frestaEsperada.maximo + tolerancia) {
    diagnosticos.push({ codigo: 'fresta-fora', observado: separacaoAxial, ...frestaEsperada, tolerancia });
  }
  return {
    id, tipo: 'assentaAnular', satisfeita: diagnosticos.length === 0,
    referencia: referencia.id, movel: movel.id,
    medidas: { disponiveis: true, alinhamento, descentro, sobreposicaoRadial, sobreposicaoAxial, separacaoAxial, tolerancia, toleranciaNumerica: tolerancia, radialEsperado, axialEsperado, frestaEsperada },
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
  const estruturais = new Set(['forma-incompativel', 'direcao-incompativel', 'mao-espelhada']);
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

/** Mede um assentamento plano a plano; confere normais opostas e contato sem fresta. */
export function validarAssentamentoPlano(declaracao, portas) {
  const quem = 'validarAssentamentoPlano';
  if (!declaracao || typeof declaracao !== 'object' || Array.isArray(declaracao)) {
    falhar(quem, 'declaração precisa ser objeto.');
  }
  const id = declaracao.id;
  if (typeof id !== 'string' || !id) falhar(quem, 'declaração precisa de id não vazio.');
  if (declaracao.tipo !== 'assentaPlano') falhar(quem, "tipo precisa ser 'assentaPlano'.");
  const tolerancia = toleranciaNumericaDe(declaracao, `${quem}.${id}`);
  const frestaEsperada = declaracao.separacao === undefined && declaracao.fresta === undefined
    ? { minimo: 0, maximo: 0, nominal: 0, toleranciaFabricacao: null, formato: 'sem-fresta' }
    : faixaDeEspecificacao(declaracao, declaracao.separacao !== undefined ? 'separacao' : 'fresta', `${quem}.${id}`);

  const referencia = portaDo(portas, declaracao.referencia, quem);
  const movel = portaDo(portas, declaracao.movel, quem);
  const diagnosticos = [];
  if (referencia.forma !== 'plano' || movel.forma !== 'plano') {
    diagnosticos.push({ codigo: 'forma-incompativel', esperado: 'plano' });
  }
  if (referencia.papel !== 'recebe' || movel.papel !== 'apoia') {
    diagnosticos.push({ codigo: 'direcao-incompativel', esperado: 'referencia recebe e movel apoia', observado: `${referencia.papel}->${movel.papel}` });
  }
  const maoEspelhada = diagnosticoDeMaoEspelhada(referencia, movel);
  if (maoEspelhada) diagnosticos.push(maoEspelhada);

  if (diagnosticos.length) {
    return {
      id, tipo: 'assentaPlano', satisfeita: false,
      referencia: referencia.id, movel: movel.id,
      medidas: { disponiveis: false, tolerancia, frestaEsperada },
      diagnosticos,
    };
  }

  const alinhamento = produto(referencia.normal, movel.normal);
  if (Math.abs(alinhamento + 1) > EPSILON_ANGULAR) {
    diagnosticos.push({ codigo: 'normais-nao-opostas', observado: alinhamento, esperado: -1 });
  }

  const entrePontos = subtrair(movel.ponto, referencia.ponto);
  const separacao = produto(entrePontos, referencia.normal);
  if (separacao < frestaEsperada.minimo - tolerancia || separacao > frestaEsperada.maximo + tolerancia) {
    diagnosticos.push({ codigo: 'contato-fora', observado: separacao, ...frestaEsperada, tolerancia });
  }

  const lateral = subtrair(entrePontos, multiplicar(referencia.normal, separacao));
  const descentro = comprimento(lateral);

  return {
    id, tipo: 'assentaPlano', satisfeita: diagnosticos.length === 0,
    referencia: referencia.id, movel: movel.id,
    medidas: {
      disponiveis: true, alinhamento, separacao, descentro,
      tolerancia, toleranciaNumerica: tolerancia, frestaEsperada,
    },
    diagnosticos,
  };
}

export function formatarDiagnosticoDeAssentamentoPlano(resultado, casas = 6) {
  if (!resultado || typeof resultado !== 'object' || !Array.isArray(resultado.diagnosticos)) {
    falhar('formatarDiagnosticoDeAssentamentoPlano', 'esperava resultado de validarAssentamentoPlano().');
  }
  const n = (valor) => Number.isFinite(valor) ? valor.toFixed(casas).replace(/^-0(\.0+)?$/, '0') : String(valor);
  const m = resultado.medidas;
  if (m?.disponiveis === false) {
    const linhas = [
      `relação: ${resultado.id} (${resultado.tipo})`,
      `portas: referência ${resultado.referencia} -> móvel ${resultado.movel}`,
      'medição: reprovada',
      'medidas: indisponíveis (interfaces estruturalmente incompatíveis)',
    ];
    if (resultado.diagnosticos.length) linhas.push(`causas: ${resultado.diagnosticos.map((d) => d.codigo).join(', ')}`);
    return `${linhas.join('\n')}\n`;
  }
  const linhas = [
    `relação: ${resultado.id} (${resultado.tipo})`,
    `portas: referência ${resultado.referencia} -> móvel ${resultado.movel}`,
    `medição: ${resultado.satisfeita ? 'aprovada' : 'reprovada'}`,
    `contato: separação ${n(m.separacao)} m (esperada ${n(m.frestaEsperada.minimo)}…${n(m.frestaEsperada.maximo)})`,
    `normais: alinhamento ${n(m.alinhamento)} (esperado -1.000000)`,
    `apoio: descentro lateral ${n(m.descentro)} m`,
  ];
  if (resultado.diagnosticos.length) linhas.push(`causas: ${resultado.diagnosticos.map((d) => d.codigo).join(', ')}`);
  return `${linhas.join('\n')}\n`;
}

/** Mede um padrão de furos; confere paralelismo, contagem, coincidência dos centros e folga/ajuste. */
export function validarEncaixePadraoFuros(declaracao, portas) {
  const quem = 'validarEncaixePadraoFuros';
  if (!declaracao || typeof declaracao !== 'object' || Array.isArray(declaracao)) {
    falhar(quem, 'declaração precisa ser objeto.');
  }
  const id = declaracao.id;
  if (typeof id !== 'string' || !id) falhar(quem, 'declaração precisa de id não vazio.');
  if (declaracao.tipo !== 'encaixaPadraoFuros') falhar(quem, "tipo precisa ser 'encaixaPadraoFuros'.");
  const tolerancia = toleranciaNumericaDe(declaracao, `${quem}.${id}`);

  const referencia = portaDo(portas, declaracao.referencia, quem);
  const movel = portaDo(portas, declaracao.movel, quem);
  const diagnosticos = [];
  if (referencia.forma !== 'padraoFuros' || movel.forma !== 'padraoFuros') {
    diagnosticos.push({ codigo: 'forma-incompativel', esperado: 'padraoFuros' });
  }
  if (referencia.papel !== 'recebe' || movel.papel !== 'ocupa') {
    diagnosticos.push({ codigo: 'direcao-incompativel', esperado: 'referencia recebe e movel ocupa', observado: `${referencia.papel}->${movel.papel}` });
  }
  const maoEspelhada = diagnosticoDeMaoEspelhada(referencia, movel);
  if (maoEspelhada) diagnosticos.push(maoEspelhada);

  if (diagnosticos.length) {
    return {
      id, tipo: 'encaixaPadraoFuros', satisfeita: false,
      referencia: referencia.id, movel: movel.id,
      medidas: { disponiveis: false, tolerancia },
      diagnosticos,
    };
  }

  const normalRef = referencia.normal ?? referencia.plano?.normal ?? [0, 1, 0];
  const normalMov = movel.normal ?? movel.plano?.normal ?? [0, 1, 0];
  const alinhamentoNormais = Math.abs(produto(normalRef, normalMov));
  if (1 - alinhamentoNormais > EPSILON_ANGULAR) {
    diagnosticos.push({ codigo: 'planos-divergentes', observado: alinhamentoNormais, limite: 1 - EPSILON_ANGULAR });
  }

  const contagemRef = referencia.centros.length;
  const contagemMov = movel.centros.length;
  if (contagemRef !== contagemMov) {
    diagnosticos.push({ codigo: 'contagem-furos-divergente', referencia: contagemRef, movel: contagemMov });
  }

  let maiorDesvioCentros = 0;
  for (const cr of referencia.centros) {
    const menor = Math.min(...movel.centros.map((cm) => comprimento(subtrair(cm, cr))));
    if (menor > maiorDesvioCentros) maiorDesvioCentros = menor;
    if (menor > tolerancia) {
      diagnosticos.push({ codigo: 'centros-nao-coincidentes', menorDistancia: menor, tolerancia });
      break;
    }
  }

  const folgaDiametral = referencia.diametro - movel.diametro;
  const classeAjuste = declaracao.classeAjuste ?? movel.classeAjuste ?? referencia.classeAjuste;
  let especificacaoFolga;
  if (classeAjuste) {
    especificacaoFolga = obterFolgaPorClasseAjusteEmMetros(classeAjuste, referencia.diametro);
    if (folgaDiametral < especificacaoFolga.minimo - tolerancia || folgaDiametral > especificacaoFolga.maximo + tolerancia) {
      diagnosticos.push({
        codigo: 'folga-fora-da-classe',
        classe: classeAjuste,
        observado: folgaDiametral,
        minimo: especificacaoFolga.minimo,
        maximo: especificacaoFolga.maximo,
        tolerancia,
      });
    }
  } else if (declaracao.folga !== undefined || declaracao.folgaDiametral !== undefined) {
    especificacaoFolga = faixaDeEspecificacao(declaracao, declaracao.folga !== undefined ? 'folga' : 'folgaDiametral', `${quem}.${id}`);
    if (folgaDiametral < especificacaoFolga.minimo - tolerancia || folgaDiametral > especificacaoFolga.maximo + tolerancia) {
      diagnosticos.push({
        codigo: 'folga-diametral-fora',
        observado: folgaDiametral,
        minimo: especificacaoFolga.minimo,
        maximo: especificacaoFolga.maximo,
        tolerancia,
      });
    }
  }

  return {
    id, tipo: 'encaixaPadraoFuros', satisfeita: diagnosticos.length === 0,
    referencia: referencia.id, movel: movel.id,
    medidas: {
      disponiveis: true,
      alinhamentoNormais,
      contagemFuros: contagemRef,
      maiorDesvioCentros,
      diametroReferencia: referencia.diametro,
      diametroMovel: movel.diametro,
      folgaDiametral,
      especificacaoFolga,
      classeAjuste,
      tolerancia,
      toleranciaNumerica: tolerancia,
    },
    diagnosticos,
  };
}

export function formatarDiagnosticoDePadraoFuros(resultado, casas = 6) {
  if (!resultado || typeof resultado !== 'object' || !Array.isArray(resultado.diagnosticos)) {
    falhar('formatarDiagnosticoDePadraoFuros', 'esperava resultado de validarEncaixePadraoFuros().');
  }
  const n = (valor) => Number.isFinite(valor) ? valor.toFixed(casas).replace(/^-0(\.0+)?$/, '0') : String(valor);
  const m = resultado.medidas;
  if (m?.disponiveis === false) {
    const linhas = [
      `relação: ${resultado.id} (${resultado.tipo})`,
      `portas: referência ${resultado.referencia} -> móvel ${resultado.movel}`,
      'medição: reprovada',
      'medidas: indisponíveis (interfaces estruturalmente incompatíveis)',
    ];
    if (resultado.diagnosticos.length) linhas.push(`causas: ${resultado.diagnosticos.map((d) => d.codigo).join(', ')}`);
    return `${linhas.join('\n')}\n`;
  }
  const linhas = [
    `relação: ${resultado.id} (${resultado.tipo})`,
    `portas: referência ${resultado.referencia} -> móvel ${resultado.movel}`,
    `medição: ${resultado.satisfeita ? 'aprovada' : 'reprovada'}`,
    `furos: quantidade ${m.contagemFuros}, desvio máximo de centros ${n(m.maiorDesvioCentros)} m`,
    `diâmetros: referência ${n(m.diametroReferencia)} m, móvel ${n(m.diametroMovel)} m, folga ${n(m.folgaDiametral)} m`,
  ];
  if (m.classeAjuste) linhas.push(`classe de ajuste: ${m.classeAjuste} (esperada ${n(m.especificacaoFolga?.minimo)}…${n(m.especificacaoFolga?.maximo)} m)`);
  if (resultado.diagnosticos.length) linhas.push(`causas: ${resultado.diagnosticos.map((d) => d.codigo).join(', ')}`);
  return `${linhas.join('\n')}\n`;
}

/** Mede um encaixe de guia e deslizador (trilho); confere colinearidade, descentro, curso e perfil. */
export function validarEncaixeTrilho(declaracao, portas) {
  const quem = 'validarEncaixeTrilho';
  if (!declaracao || typeof declaracao !== 'object' || Array.isArray(declaracao)) {
    falhar(quem, 'declaração precisa ser objeto.');
  }
  const id = declaracao.id;
  if (typeof id !== 'string' || !id) falhar(quem, 'declaração precisa de id não vazio.');
  if (declaracao.tipo !== 'encaixaTrilho') falhar(quem, "tipo precisa ser 'encaixaTrilho'.");
  const tolerancia = toleranciaNumericaDe(declaracao, `${quem}.${id}`);

  const referencia = portaDo(portas, declaracao.referencia, quem);
  const movel = portaDo(portas, declaracao.movel, quem);
  const diagnosticos = [];
  if (referencia.forma !== 'trilho' || movel.forma !== 'trilho') {
    diagnosticos.push({ codigo: 'forma-incompativel', esperado: 'trilho' });
  }
  const papelValido = (referencia.papel === 'guia' && movel.papel === 'deslizador')
    || (referencia.papel === 'recebe' && movel.papel === 'ocupa');
  if (!papelValido) {
    diagnosticos.push({
      codigo: 'direcao-incompativel',
      esperado: 'referencia guia e movel deslizador',
      observado: `${referencia.papel}->${movel.papel}`,
    });
  }
  const maoEspelhada = diagnosticoDeMaoEspelhada(referencia, movel);
  if (maoEspelhada) diagnosticos.push(maoEspelhada);

  if (diagnosticos.length) {
    return {
      id, tipo: 'encaixaTrilho', satisfeita: false,
      referencia: referencia.id, movel: movel.id,
      medidas: { disponiveis: false, tolerancia },
      diagnosticos,
    };
  }

  const alinhamento = Math.abs(produto(referencia.eixo, movel.eixo));
  if (1 - alinhamento > EPSILON_ANGULAR) {
    diagnosticos.push({ codigo: 'eixos-divergentes', observado: alinhamento, limite: 1 - EPSILON_ANGULAR });
  }

  const entreCentros = subtrair(movel.centro, referencia.centro);
  const posicaoAoLongo = produto(entreCentros, referencia.eixo);
  const lateral = subtrair(entreCentros, multiplicar(referencia.eixo, posicaoAoLongo));
  const descentro = comprimento(lateral);
  if (descentro > tolerancia) {
    diagnosticos.push({ codigo: 'eixos-descentrados', observado: descentro, limite: tolerancia });
  }

  if (posicaoAoLongo < -tolerancia || posicaoAoLongo > referencia.curso + tolerancia) {
    diagnosticos.push({
      codigo: 'curso-excedido',
      posicao: posicaoAoLongo,
      curso: referencia.curso,
      tolerancia,
    });
  }

  const classeAjuste = declaracao.classeAjuste ?? movel.classeAjuste ?? referencia.classeAjuste;
  const folgaLargura = movel.perfil.largura - referencia.perfil.largura;
  const folgaAltura = movel.perfil.altura - referencia.perfil.altura;
  let especificacaoFolga;
  if (classeAjuste) {
    especificacaoFolga = obterFolgaPorClasseAjusteEmMetros(classeAjuste, referencia.perfil.largura);
    if (folgaLargura < especificacaoFolga.minimo - tolerancia || folgaLargura > especificacaoFolga.maximo + tolerancia) {
      diagnosticos.push({
        codigo: 'folga-fora-da-classe',
        classe: classeAjuste,
        observado: folgaLargura,
        minimo: especificacaoFolga.minimo,
        maximo: especificacaoFolga.maximo,
        tolerancia,
      });
    }
  } else {
    if (Math.abs(folgaLargura) > tolerancia || Math.abs(folgaAltura) > tolerancia) {
      diagnosticos.push({
        codigo: 'perfil-incompativel',
        folgaLargura,
        folgaAltura,
        tolerancia,
      });
    }
  }

  return {
    id, tipo: 'encaixaTrilho', satisfeita: diagnosticos.length === 0,
    referencia: referencia.id, movel: movel.id,
    medidas: {
      disponiveis: true,
      alinhamento,
      descentro,
      posicaoAoLongo,
      curso: referencia.curso,
      folgaLargura,
      folgaAltura,
      classeAjuste,
      especificacaoFolga,
      tolerancia,
      toleranciaNumerica: tolerancia,
    },
    diagnosticos,
  };
}

export function formatarDiagnosticoDeTrilho(resultado, casas = 6) {
  if (!resultado || typeof resultado !== 'object' || !Array.isArray(resultado.diagnosticos)) {
    falhar('formatarDiagnosticoDeTrilho', 'esperava resultado de validarEncaixeTrilho().');
  }
  const n = (valor) => Number.isFinite(valor) ? valor.toFixed(casas).replace(/^-0(\.0+)?$/, '0') : String(valor);
  const m = resultado.medidas;
  if (m?.disponiveis === false) {
    const linhas = [
      `relação: ${resultado.id} (${resultado.tipo})`,
      `portas: referência ${resultado.referencia} -> móvel ${resultado.movel}`,
      'medição: reprovada',
      'medidas: indisponíveis (interfaces estruturalmente incompatíveis)',
    ];
    if (resultado.diagnosticos.length) linhas.push(`causas: ${resultado.diagnosticos.map((d) => d.codigo).join(', ')}`);
    return `${linhas.join('\n')}\n`;
  }
  const linhas = [
    `relação: ${resultado.id} (${resultado.tipo})`,
    `portas: referência ${resultado.referencia} -> móvel ${resultado.movel}`,
    `medição: ${resultado.satisfeita ? 'aprovada' : 'reprovada'}`,
    `guia: alinhamento ${n(m.alinhamento)}, descentro ${n(m.descentro)} m`,
    `curso: posição ${n(m.posicaoAoLongo)} m de ${n(m.curso)} m`,
    `perfil: folga largura ${n(m.folgaLargura)} m, folga altura ${n(m.folgaAltura)} m`,
  ];
  if (m.classeAjuste) linhas.push(`classe de ajuste: ${m.classeAjuste} (esperada ${n(m.especificacaoFolga?.minimo)}…${n(m.especificacaoFolga?.maximo)} m)`);
  if (resultado.diagnosticos.length) linhas.push(`causas: ${resultado.diagnosticos.map((d) => d.codigo).join(', ')}`);
  return `${linhas.join('\n')}\n`;
}

/** Texto curto, estável e utilizável por agente/CLI; não omite a causa numérica. */
export function formatarDiagnosticoDeEncaixe(resultado, casas = 6) {
  if (!resultado || typeof resultado !== 'object' || !Array.isArray(resultado.diagnosticos)) {
    falhar('formatarDiagnosticoDeEncaixe', 'esperava resultado de relação.');
  }
  if (resultado.tipo === 'assentaAnular') return formatarDiagnosticoDeAssentamentoAnular(resultado, casas);
  if (resultado.tipo === 'assentaPlano') return formatarDiagnosticoDeAssentamentoPlano(resultado, casas);
  if (resultado.tipo === 'encaixaPadraoFuros') return formatarDiagnosticoDePadraoFuros(resultado, casas);
  if (resultado.tipo === 'encaixaTrilho') return formatarDiagnosticoDeTrilho(resultado, casas);

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
