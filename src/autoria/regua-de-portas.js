/* regua-de-portas.js — a conta das portas, pura e sem nenhum import.

   O núcleo (`interfaces-montagem.js`, em metro) e o gate de contato do esboço
   (`modulos/esboco/src/portas.js`, em milímetro) medem os mesmos encaixes: a
   classe de ajuste de um eixo num furo, a coaxialidade de duas portas e o
   assentamento de um plano sobre outro. A conta mora aqui, uma vez, para que o
   módulo do esboço a leia sem importar o núcleo (o README do módulo proíbe a
   importação por conveniência, e este arquivo não importa nada). Os vetores são
   listas [x, y, z] na unidade de quem chama, e as funções não dependem dela,
   salvo a tabela de classes, que é em milímetro.

   Nada aqui lança por geometria ruim: as funções de medida devolvem os
   diagnósticos, e quem chama decide se reprova. */

export const EPSILON_ANGULAR = 1e-9;

export const subtrair = (a, b) => a.map((n, i) => n - b[i]);
export const multiplicar = (a, n) => a.map((x) => x * n);
export const produto = (a, b) => a.reduce((soma, n, i) => soma + n * b[i], 0);
export const comprimento = (a) => Math.sqrt(produto(a, a));
export const vetorProduto = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * Tabela de ajustes normalizados baseada em ISO 286-1 e ISO 286-2 (dimensões em mm).
 * Sistema furo-base (H7) com desvios fundamentais:
 *   - EI = 0 (afastamento inferior do furo é nulo)
 *   - ES = +IT7 (afastamento superior do furo dado pelo grau de tolerância IT7)
 *
 * Classes padronizadas:
 *   - 'folgado'       -> Ajuste H7/g6 (ajuste móvel com folga livre para deslizamento/giro)
 *                        Eixo g6: es < 0, ei = es - IT6
 *                        Folga mínima: F_min = EI - es = -es (mm)
 *                        Folga máxima: F_max = ES - ei = IT7 - (es - IT6) (mm)
 *
 *   - 'transicao'     -> Ajuste H7/k6 (ajuste de transição para centragem de precisão)
 *                        Eixo k6: desvios es e ei pequenos positivos
 *                        Folga mínima: F_min = EI - es = -es (mm, geralmente negativo: leve interferência)
 *                        Folga máxima: F_max = ES - ei = IT7 - ei (mm, positivo: leve folga)
 *
 *   - 'interferencia' -> Ajuste H7/p6 (ajuste forçado sob pressão para fixação rígida)
 *                        Eixo p6: ei > 0, es = ei + IT6
 *                        Folga mínima: F_min = EI - es = -es (mm, interferência máxima = es)
 *                        Folga máxima: F_max = ES - ei = IT7 - ei (mm, interferência mínima)
 */
export const TABELA_CLASSES_AJUSTE_V1 = Object.freeze([
  // <= 3 mm: H7(+10, 0), g6(-2, -8), k6(+6, 0), p6(+12, +6) um
  { ateMm: 3,   folgado: { min: 0.002, max: 0.018 }, transicao: { min: -0.006, max: 0.010 }, interferencia: { min: -0.012, max: 0.004 } },
  // > 3 até 6 mm: H7(+12, 0), g6(-4, -12), k6(+9, +1), p6(+20, +12) um
  { ateMm: 6,   folgado: { min: 0.004, max: 0.024 }, transicao: { min: -0.009, max: 0.011 }, interferencia: { min: -0.020, max: 0.000 } },
  // > 6 até 10 mm: H7(+15, 0), g6(-5, -14), k6(+10, +1), p6(+24, +15) um
  { ateMm: 10,  folgado: { min: 0.005, max: 0.029 }, transicao: { min: -0.010, max: 0.014 }, interferencia: { min: -0.024, max: 0.000 } },
  // > 10 até 18 mm: H7(+18, 0), g6(-6, -17), k6(+12, +1), p6(+29, +18) um
  { ateMm: 18,  folgado: { min: 0.006, max: 0.035 }, transicao: { min: -0.012, max: 0.017 }, interferencia: { min: -0.029, max: 0.000 } },
  // > 18 até 30 mm: H7(+21, 0), g6(-7, -20), k6(+15, +2), p6(+35, +22) um
  { ateMm: 30,  folgado: { min: 0.007, max: 0.041 }, transicao: { min: -0.015, max: 0.019 }, interferencia: { min: -0.035, max: -0.001 } },
  // > 30 até 50 mm: H7(+25, 0), g6(-9, -25), k6(+18, +2), p6(+42, +26) um
  { ateMm: 50,  folgado: { min: 0.009, max: 0.050 }, transicao: { min: -0.018, max: 0.023 }, interferencia: { min: -0.042, max: -0.001 } },
  // > 50 até 80 mm: H7(+30, 0), g6(-10, -29), k6(+21, +2), p6(+51, +32) um
  { ateMm: 80,  folgado: { min: 0.010, max: 0.059 }, transicao: { min: -0.021, max: 0.028 }, interferencia: { min: -0.051, max: -0.002 } },
  // > 80 até 120 mm: H7(+35, 0), g6(-12, -34), k6(+25, +3), p6(+59, +37) um
  { ateMm: 120, folgado: { min: 0.012, max: 0.069 }, transicao: { min: -0.025, max: 0.032 }, interferencia: { min: -0.059, max: -0.002 } },
  // > 120 até 180 mm: H7(+40, 0), g6(-14, -39), k6(+28, +3), p6(+68, +43) um
  { ateMm: 180, folgado: { min: 0.014, max: 0.079 }, transicao: { min: -0.028, max: 0.037 }, interferencia: { min: -0.068, max: -0.003 } },
  // > 180 até 250 mm: H7(+46, 0), g6(-15, -44), k6(+33, +4), p6(+79, +50) um
  { ateMm: 250, folgado: { min: 0.015, max: 0.090 }, transicao: { min: -0.033, max: 0.042 }, interferencia: { min: -0.079, max: -0.004 } },
  // > 250 até 315 mm: H7(+52, 0), g6(-17, -49), k6(+36, +4), p6(+88, +56) um
  { ateMm: 315, folgado: { min: 0.017, max: 0.101 }, transicao: { min: -0.036, max: 0.048 }, interferencia: { min: -0.088, max: -0.004 } },
  // > 315 até 400 mm: H7(+57, 0), g6(-18, -54), k6(+40, +4), p6(+98, +62) um
  { ateMm: 400, folgado: { min: 0.018, max: 0.111 }, transicao: { min: -0.040, max: 0.053 }, interferencia: { min: -0.098, max: -0.005 } },
  // > 400 até 500 mm: H7(+63, 0), g6(-20, -60), k6(+45, +5), p6(+108, +68) um
  { ateMm: 500, folgado: { min: 0.020, max: 0.123 }, transicao: { min: -0.045, max: 0.058 }, interferencia: { min: -0.108, max: -0.005 } },
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

/** Eixo e centro de duas portas: o quanto os eixos são paralelos (1 é paralelo) e a distância entre as duas retas. */
export function medirCoaxialidade(referencia, movel) {
  const alinhamento = Math.abs(produto(referencia.eixo, movel.eixo));
  const entreCentros = subtrair(movel.centro, referencia.centro);
  const aoLongo = produto(entreCentros, referencia.eixo);
  const descentro = comprimento(subtrair(entreCentros, multiplicar(referencia.eixo, aoLongo)));
  return { alinhamento, descentro };
}

/** O diagnóstico da folga diametral fora da faixa da classe de ajuste, ou nulo quando está dentro (com a tolerância numérica). */
export function diagnosticoDeFolgaForaDaClasse({ folgaDiametral, classe, minimo, maximo, tolerancia }) {
  if (folgaDiametral >= minimo - tolerancia && folgaDiametral <= maximo + tolerancia) return null;
  return { codigo: 'folga-fora-da-classe', classe, observado: folgaDiametral, minimo, maximo, tolerancia };
}

/**
 * Eixo (cilindro que ocupa) dentro de furo (anel que recebe), pela classe de ajuste. `furo` e `eixo` levam
 * { eixo, centro, diametro } em milímetro, com o eixo unitário; a faixa da classe vem da tabela pelo diâmetro nominal
 * do furo, como em `validarEncaixePadraoFuros`. Devolve { alinhamento, descentro, folgaDiametral, especificacao,
 * interferenciaRadialMaxima, diagnosticos, satisfeita }; a folga é positiva quando o eixo é menor que o furo, e a faixa
 * da classe é diametral (furo menos eixo).
 */
export function medirAjusteDeEixoEmFuro({ furo, eixo, classe, tolerancia }) {
  const diagnosticos = [];
  const { alinhamento, descentro } = medirCoaxialidade(furo, eixo);
  if (1 - alinhamento > EPSILON_ANGULAR) diagnosticos.push({ codigo: 'eixos-divergentes', observado: alinhamento, limite: 1 - EPSILON_ANGULAR });
  if (descentro > tolerancia) diagnosticos.push({ codigo: 'eixos-descentrados', observado: descentro, limite: tolerancia });
  const folgaDiametral = furo.diametro - eixo.diametro;
  const especificacao = obterFolgaPorClasseAjuste(classe, furo.diametro);
  const fora = diagnosticoDeFolgaForaDaClasse({ folgaDiametral, classe, minimo: especificacao.min, maximo: especificacao.max, tolerancia });
  if (fora) diagnosticos.push(fora);
  return {
    alinhamento, descentro, folgaDiametral, especificacao,
    interferenciaRadialMaxima: especificacao.interferenciaMaxMm / 2,
    diagnosticos, satisfeita: diagnosticos.length === 0,
  };
}

/**
 * Plano que apoia sobre plano que recebe: normais opostas, separação dentro da fresta esperada e o apoio dentro da face
 * que recebe. `referencia` e `movel` levam { normal, ponto, extensao: [a, b], referencia? } com a normal unitária; a
 * `referencia` (vetor no plano) orienta a extensão da face que recebe. `frestaEsperada` é { minimo, maximo }.
 * Devolve { alinhamento, separacao, descentro, extrapolacaoApoio, diagnosticos }.
 */
export function medirAssentamentoDePlanos(referencia, movel, tolerancia, frestaEsperada) {
  const diagnosticos = [];
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

  let extrapolacaoApoio = 0;
  if (Array.isArray(referencia.extensao) && Array.isArray(movel.extensao)) {
    const meiaRefX = referencia.extensao[0] / 2;
    const meiaRefY = referencia.extensao[1] / 2;
    const meiaMovX = movel.extensao[0] / 2;
    const meiaMovY = movel.extensao[1] / 2;

    let extrapolacaoX = 0;
    let extrapolacaoY = 0;
    if (referencia.referencia) {
      const projRef = subtrair(referencia.referencia, multiplicar(referencia.normal, produto(referencia.referencia, referencia.normal)));
      const compProj = comprimento(projRef);
      if (compProj > 1e-9) {
        const uRef = multiplicar(projRef, 1 / compProj);
        const vRef = vetorProduto(referencia.normal, uRef);
        const dx = Math.abs(produto(lateral, uRef));
        const dy = Math.abs(produto(lateral, vRef));
        extrapolacaoX = dx + meiaMovX - meiaRefX;
        extrapolacaoY = dy + meiaMovY - meiaRefY;
      }
    }
    if (extrapolacaoX === 0 && extrapolacaoY === 0) {
      const menorMeiaRef = Math.min(meiaRefX, meiaRefY);
      const maiorMeiaMov = Math.max(meiaMovX, meiaMovY);
      extrapolacaoX = descentro + maiorMeiaMov - menorMeiaRef;
    }

    extrapolacaoApoio = Math.max(extrapolacaoX, extrapolacaoY);
    if (extrapolacaoApoio > tolerancia) {
      diagnosticos.push({
        codigo: 'extrapolacao-de-apoio',
        descentro,
        extrapolacao: extrapolacaoApoio,
        tolerancia,
      });
    }
  }

  return { alinhamento, separacao, descentro, extrapolacaoApoio, diagnosticos };
}
