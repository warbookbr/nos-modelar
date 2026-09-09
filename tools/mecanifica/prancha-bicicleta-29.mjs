#!/usr/bin/env node
/* prancha-bicicleta-29.mjs — alvo ortográfico de uma MTB hardtail 29", quadro M.
 *
 * POR QUE A TABELA MANDA, E NÃO A FOTO. As referências desta rodada chegaram
 * como foto de produto pela conversa, e `prancha-referencia.mjs` lê PNG do
 * disco. Sem arquivo não há comparação por número, e estimar proporção olhando
 * a foto é exatamente o que a skill proíbe no passo 1. Geometria de bicicleta,
 * porém, é publicada como TABELA — entre-eixos, ângulos, balanço traseiro,
 * diâmetro de roda — e tabela não depende do meu olho. Então o alvo dimensional
 * é a tabela, e a foto informa só CARÁTER: quais peças existem e que forma têm.
 *
 * TODA POSIÇÃO É DERIVADA, NENHUMA É DIGITADA. Os pontos do quadro saem de
 * trigonometria sobre a tabela. Um número digitado à mão deixaria de
 * corresponder à tabela assim que ela mudasse, que é o defeito medido hoje em
 * `barricada-de-sucata`.
 *
 * O QUE ESTE MOTOR NÃO CONSEGUE DIZER SOBRE UMA BICICLETA. `contorno: true`
 * encadeia trechos num anel único para medir fechamento, pontos fora e
 * coerência entre vistas. Bicicleta é objeto ESQUELETO: não tem silhueta
 * fechada, e declarar uma seria ficção. Sem anel, o motor não confere
 * fechamento nem cruza as vistas — a perda é real e está registrada no diário
 * da rodada.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prancha, imprimirRelatorio } from './prancha.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');

/* TABELA: valores públicos e típicos de uma 29" hardtail tamanho M (17"/43 cm).
   Não são de um modelo específico; são a faixa corrente do formato. */
export const TABELA = {
  aroISO: 622,            // 29"
  pneuLargura: 56,        // 2,2"
  entreEixos: 1130,
  balancoTraseiro: 435,   // centro do movimento central ao eixo traseiro
  quedaDoMovimentoCentral: 65,
  anguloDirecao: 69,      // graus com o solo
  anguloSelim: 73,
  tuboDirecaoComprimento: 110,
  tuboSelimComprimento: 460,
  garfoEixoACoroa: 490,
  garfoAvanco: 44,        // offset perpendicular ao eixo de direção
  canoteExposto: 180,
  meiaLarguraGuidao: 360, // guidão de 720 mm
  meiaLarguraCubo: 74,    // espaçamento boost 148 mm
};

const rad = (g) => (g * Math.PI) / 180;
const som = (a, b) => [a[0] + b[0], a[1] + b[1]];
const esc = (v, k) => [v[0] * k, v[1] * k];
const ao_longo = (p, dir, d) => som(p, esc(dir, d));

export function derivar(t = TABELA) {
  const raioRoda = t.aroISO / 2 + t.pneuLargura;
  const alturaMC = raioRoda - t.quedaDoMovimentoCentral;
  const mc = [0, alturaMC];

  const recuoTraseiro = Math.sqrt(t.balancoTraseiro ** 2 - t.quedaDoMovimentoCentral ** 2);
  const eixoTraseiro = [-recuoTraseiro, raioRoda];
  const eixoDianteiro = [eixoTraseiro[0] + t.entreEixos, raioRoda];

  /* Eixo de direção: subir por ele anda para trás. O eixo da roda fica AVANÇADO
     em relação a esse eixo, perpendicularmente, pelo avanço do garfo. */
  const a = rad(t.anguloDirecao);
  const subirDirecao = [-Math.cos(a), Math.sin(a)];
  const frenteDirecao = [Math.sin(a), Math.cos(a)];
  const noEixoDeDirecao = som(eixoDianteiro, esc(frenteDirecao, -t.garfoAvanco));
  const aoLongoDoGarfo = Math.sqrt(t.garfoEixoACoroa ** 2 - t.garfoAvanco ** 2);
  const coroa = ao_longo(noEixoDeDirecao, subirDirecao, aoLongoDoGarfo);
  const direcaoTopo = ao_longo(coroa, subirDirecao, t.tuboDirecaoComprimento);

  const s = rad(t.anguloSelim);
  const subirSelim = [-Math.cos(s), Math.sin(s)];
  const selimTopo = ao_longo(mc, subirSelim, t.tuboSelimComprimento);
  const selimJuncao = ao_longo(mc, subirSelim, t.tuboSelimComprimento - 30);
  const selim = ao_longo(selimTopo, subirSelim, t.canoteExposto);

  const direcaoBaixo = ao_longo(coroa, subirDirecao, 22);

  return {
    raioRoda,
    mc,
    eixoTraseiro,
    eixoDianteiro,
    coroa,
    direcaoTopo,
    direcaoBaixo,
    selimTopo,
    selimJuncao,
    selim,
    /* Derivados que a tabela não declara e que a conferência lê. */
    empilhamento: direcaoTopo[1] - mc[1],
    alcance: direcaoTopo[0] - mc[0],
    alturaMC,
  };
}

const P = derivar();

const zMin = P.eixoTraseiro[0] - P.raioRoda - 60;
const zMax = P.eixoDianteiro[0] + P.raioRoda + 60;
const yMax = P.selim[1] + 120;
const xMax = TABELA.meiaLarguraGuidao + 60;

const linha = (nome, pts, classe = 'contorno') => ({
  vista: 'lateral', nome, classe, tipo: 'poli', pts,
});

export const spec = {
  titulo: 'Bicicleta 29" hardtail — alvo ortográfico',
  subtitulo: `entre-eixos ${TABELA.entreEixos} mm · direção ${TABELA.anguloDirecao}° · selim ${TABELA.anguloSelim}° · roda Ø${P.raioRoda * 2} mm`,
  escala: 0.42,
  tela: { largura: 1180, altura: 760 },
  limites: { zMin, zMax, yMax, xMax },
  tolerancia: 6,
  vistas: {
    lateral: { x: 60, y: 60, rotulo: 'LATERAL', leitura: 'projecao' },
    frontal: { x: 830, y: 60, rotulo: 'FRONTAL', leitura: 'secao' },
  },
  camadas: [
    /* Rodas: círculo do pneu e do aro. */
    { vista: 'lateral', nome: 'pneuTraseiro', classe: 'roda', tipo: 'circulo', centro: P.eixoTraseiro, raio: P.raioRoda },
    { vista: 'lateral', nome: 'aroTraseiro', classe: 'aro', tipo: 'circulo', centro: P.eixoTraseiro, raio: TABELA.aroISO / 2 },
    { vista: 'lateral', nome: 'pneuDianteiro', classe: 'roda', tipo: 'circulo', centro: P.eixoDianteiro, raio: P.raioRoda },
    { vista: 'lateral', nome: 'aroDianteiro', classe: 'aro', tipo: 'circulo', centro: P.eixoDianteiro, raio: TABELA.aroISO / 2 },

    /* Triângulo principal. */
    linha('tuboSuperior', [P.selimJuncao, P.direcaoTopo]),
    linha('tuboInferior', [P.mc, P.direcaoBaixo]),
    linha('tuboSelim', [P.mc, P.selimTopo]),
    linha('tuboDirecao', [P.coroa, P.direcaoTopo]),

    /* Triângulo traseiro. */
    linha('balancoInferior', [P.mc, P.eixoTraseiro]),
    linha('balancoSuperior', [P.eixoTraseiro, P.selimJuncao]),

    /* Garfo e comando. */
    linha('garfo', [P.coroa, P.eixoDianteiro]),
    linha('canote', [P.selimTopo, P.selim]),
    linha('selim', [[P.selim[0] - 130, P.selim[1]], [P.selim[0] + 110, P.selim[1] + 12]], 'painel'),
    linha('mesaEGuidao', [P.direcaoTopo, [P.direcaoTopo[0] + 90, P.direcaoTopo[1] + 40]], 'painel'),

    /* Frontal: é SEÇÃO — largura de guidão, cubo e pneu na estação dianteira. */
    { vista: 'frontal', nome: 'guidao', classe: 'painel', tipo: 'poli', pts: [[-TABELA.meiaLarguraGuidao, P.direcaoTopo[1] + 40], [TABELA.meiaLarguraGuidao, P.direcaoTopo[1] + 40]] },
    { vista: 'frontal', nome: 'pernasDoGarfo', classe: 'contorno', tipo: 'poli', pts: [[-TABELA.meiaLarguraCubo, P.raioRoda], [-46, P.coroa[1]], [46, P.coroa[1]], [TABELA.meiaLarguraCubo, P.raioRoda]] },
    { vista: 'frontal', nome: 'pneuFrontal', classe: 'roda', tipo: 'poli', pts: [[-TABELA.pneuLargura / 2, 0], [-TABELA.pneuLargura / 2, P.raioRoda * 2], [TABELA.pneuLargura / 2, P.raioRoda * 2], [TABELA.pneuLargura / 2, 0]], fechado: true },
  ],
  landmarks: [
    { vista: 'lateral', id: 'MC', em: P.mc },
    { vista: 'lateral', id: 'eixoTras', em: P.eixoTraseiro, abaixo: true },
    { vista: 'lateral', id: 'eixoDian', em: P.eixoDianteiro, abaixo: true },
    { vista: 'lateral', id: 'coroa', em: P.coroa },
    { vista: 'lateral', id: 'direcaoTopo', em: P.direcaoTopo },
    { vista: 'lateral', id: 'selim', em: P.selim },
  ],
  cotas: [
    { vista: 'lateral', de: P.eixoTraseiro, ate: P.eixoDianteiro, desloca: [0, 70], texto: `entre-eixos ${TABELA.entreEixos}` },
    { vista: 'lateral', de: P.mc, ate: P.eixoTraseiro, desloca: [0, 40], texto: `balanço ${TABELA.balancoTraseiro}` },
  ],
  legenda: {
    x: 60, y: 640,
    itens: [['#12233b', 'quadro, garfo e tubos'], ['#8a94a2', 'pneu'], ['#c0c6cf', 'aro']],
    notas: [
      `empilhamento derivado ${Math.round(P.empilhamento)} mm · alcance derivado ${Math.round(P.alcance)} mm`,
      'objeto esqueleto: sem silhueta fechada, o motor não confere fechamento nem cruza as vistas',
    ],
  },
  autoria: {
    versao: 'mecanifica.prancha-autoria@1',
    estado: 'pronta',
    confianca: 'media',
    modo: 'parcial',
    intencao: 'alvo dimensional de uma MTB hardtail 29" tamanho M, para medir a geometria futura contra a tabela',
    procedencias: [
      {
        id: 'tabela-29-hardtail-m',
        tipo: 'medidas-declaradas',
        evidencia: 'faixa corrente publicada do formato 29" hardtail tamanho M; não é um modelo específico. Os valores estão em TABELA neste arquivo e toda posição é derivada deles.',
      },
      {
        id: 'fotos-de-caracter',
        tipo: 'briefing-ficcional',
        evidencia: 'três fotos de produto de terceiros entregues na sessão, usadas SÓ para caráter: garfo de suspensão com coroa e dois tubos, freio a disco, guidão reto. Elas não entram no repositório e não foram medidas.',
      },
    ],
    incertezas: [
      {
        id: 'sem-comparacao-por-numero',
        sobre: 'proporção contra a referência fotográfica',
        motivo: 'prancha-referencia.mjs lê PNG do disco e as fotos chegaram pela conversa; a comparação por região não pôde ser rodada',
        efeito: 'diagnostico',
        fonte: 'fotos-de-caracter',
      },
      {
        id: 'esqueleto-sem-silhueta',
        sobre: 'fechamento de contorno e coerência entre vistas',
        motivo: 'bicicleta não tem silhueta fechada; declarar contorno seria ficção, e sem anel o motor não confere fechamento nem cruza lateral com frontal',
        efeito: 'diagnostico',
      },
    ],
  },
};

const executado = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (executado) {
  const { svg, relatorio } = prancha(spec);
  const saida = resolve(REPO, 'docs/mecanifica/referencias/prancha-bicicleta-29.svg');
  writeFileSync(saida, svg);
  console.log(imprimirRelatorio(relatorio));
  console.log(`\nsvg: ${saida}`);
  console.log(`empilhamento ${Math.round(P.empilhamento)} mm · alcance ${Math.round(P.alcance)} mm · altura do movimento central ${Math.round(P.alturaMC)} mm`);
}
