/* Receita autoral independente. Não importa nem referencia código da Mecanifica. */
(function () {
  'use strict';

  window.RECEITA_CUPE_LIVRE = Object.freeze({
    meta: {
      id: 'gran-turismo-rosso-01',
      versao: 2,
      intencao: 'cupê italiano de motor central, inspirado na linguagem de um carro esportivo italiano sem copiar um modelo específico',
      unidade: 'metro',
      eixos: { direita: '+x', cima: '+y', frente: '+z' },
      isolamento: 'zero imports, assets ou contratos do repositório hospedeiro',
    },

    proporcoes: {
      comprimento: 4.56,
      largura: 2.04,
      altura: 1.19,
      entreEixos: 2.65,
      bitolaDianteira: 1.72,
      bitolaTraseira: 1.76,
      diametroRodaDianteira: 0.70,
      diametroRodaTraseira: 0.74,
    },

    materiais: {
      carroceria: { cor: [0.72, 0.012, 0.018], metalico: 0.62, rugosidade: 0.19 },
      carroceriaEscura: { cor: [0.31, 0.006, 0.01], metalico: 0.5, rugosidade: 0.24 },
      vidro: { cor: [0.012, 0.026, 0.044], metalico: 0.12, rugosidade: 0.07, alfa: 0.86 },
      pneu: { cor: [0.012, 0.014, 0.017], metalico: 0.05, rugosidade: 0.72 },
      carbono: { cor: [0.018, 0.022, 0.026], metalico: 0.35, rugosidade: 0.32 },
      aluminio: { cor: [0.48, 0.51, 0.54], metalico: 0.92, rugosidade: 0.2 },
      freio: { cor: [0.19, 0.2, 0.21], metalico: 0.84, rugosidade: 0.3 },
      pinca: { cor: [0.95, 0.72, 0.03], metalico: 0.55, rugosidade: 0.24 },
      farol: { cor: [0.54, 0.78, 1.0], metalico: 0.08, rugosidade: 0.06, emissao: 0.85 },
      lanterna: { cor: [1.0, 0.012, 0.006], metalico: 0.08, rugosidade: 0.10, emissao: 0.82 },
    },

    /* Massa inferior. Cada estação descreve uma seção transversal completa.
       O gerador interpola estações, preservando cintura, ombros e afunilamentos. */
    carroceria: {
      amostrasEntreSecoes: 8,
      secoes: [
        { z: -2.28, fundo: 0.20, ventre: 0.34, cintura: 0.56, topo: 0.57, wFundo: 0.60, wMax: 0.82, wOmbro: 0.74, wTopo: 0.48 },
        { z: -2.16, fundo: 0.12, ventre: 0.32, cintura: 0.66, topo: 0.64, wFundo: 0.83, wMax: 0.98, wOmbro: 0.94, wTopo: 0.66 },
        { z: -1.78, fundo: 0.10, ventre: 0.34, cintura: 0.74, topo: 0.67, wFundo: 0.91, wMax: 1.01, wOmbro: 0.99, wTopo: 0.62 },
        { z: -1.45, fundo: 0.09, ventre: 0.33, cintura: 0.80, topo: 0.69, wFundo: 0.90, wMax: 1.03, wOmbro: 1.00, wTopo: 0.58 },
        { z: -1.05, fundo: 0.09, ventre: 0.31, cintura: 0.76, topo: 0.68, wFundo: 0.90, wMax: 1.01, wOmbro: 0.98, wTopo: 0.62 },
        { z: -0.55, fundo: 0.085, ventre: 0.30, cintura: 0.69, topo: 0.66, wFundo: 0.87, wMax: 0.98, wOmbro: 0.93, wTopo: 0.72 },
        { z: 0.10, fundo: 0.085, ventre: 0.29, cintura: 0.66, topo: 0.64, wFundo: 0.86, wMax: 0.97, wOmbro: 0.92, wTopo: 0.72 },
        { z: 0.65, fundo: 0.09, ventre: 0.30, cintura: 0.66, topo: 0.61, wFundo: 0.88, wMax: 0.99, wOmbro: 0.95, wTopo: 0.68 },
        { z: 1.05, fundo: 0.10, ventre: 0.32, cintura: 0.70, topo: 0.58, wFundo: 0.91, wMax: 1.01, wOmbro: 0.98, wTopo: 0.59 },
        { z: 1.35, fundo: 0.10, ventre: 0.34, cintura: 0.77, topo: 0.60, wFundo: 0.92, wMax: 1.02, wOmbro: 0.99, wTopo: 0.53 },
        { z: 1.67, fundo: 0.11, ventre: 0.34, cintura: 0.70, topo: 0.54, wFundo: 0.88, wMax: 0.98, wOmbro: 0.92, wTopo: 0.46 },
        { z: 1.95, fundo: 0.13, ventre: 0.32, cintura: 0.57, topo: 0.47, wFundo: 0.78, wMax: 0.90, wOmbro: 0.82, wTopo: 0.38 },
        { z: 2.18, fundo: 0.18, ventre: 0.32, cintura: 0.45, topo: 0.40, wFundo: 0.58, wMax: 0.74, wOmbro: 0.62, wTopo: 0.28 },
        { z: 2.32, fundo: 0.30, ventre: 0.35, cintura: 0.37, topo: 0.36, wFundo: 0.12, wMax: 0.28, wOmbro: 0.20, wTopo: 0.08 }
      ]
    },

    cabine: {
      amostrasEntreSecoes: 8,
      secoes: [
        { z: -1.15, base: 0.68, ombro: 0.76, teto: 0.80, wBase: 0.70, wOmbro: 0.67, wTeto: 0.62 },
        { z: -0.90, base: 0.67, ombro: 0.91, teto: 0.99, wBase: 0.72, wOmbro: 0.63, wTeto: 0.54 },
        { z: -0.55, base: 0.66, ombro: 1.08, teto: 1.16, wBase: 0.72, wOmbro: 0.58, wTeto: 0.49 },
        { z: -0.15, base: 0.65, ombro: 1.12, teto: 1.18, wBase: 0.71, wOmbro: 0.56, wTeto: 0.47 },
        { z: 0.22, base: 0.64, ombro: 1.09, teto: 1.16, wBase: 0.70, wOmbro: 0.57, wTeto: 0.48 },
        { z: 0.52, base: 0.63, ombro: 0.99, teto: 1.08, wBase: 0.69, wOmbro: 0.60, wTeto: 0.51 },
        { z: 0.78, base: 0.61, ombro: 0.82, teto: 0.90, wBase: 0.67, wOmbro: 0.63, wTeto: 0.57 },
        { z: 0.92, base: 0.60, ombro: 0.65, teto: 0.68, wBase: 0.63, wOmbro: 0.62, wTeto: 0.60 }
      ]
    },

    teto: {
      amostrasEntreSecoes: 6,
      secoes: [
        { z: -0.66, y: 1.105, w: 0.47 },
        { z: -0.48, y: 1.172, w: 0.46 },
        { z: -0.14, y: 1.192, w: 0.445 },
        { z: 0.16, y: 1.172, w: 0.455 },
        { z: 0.29, y: 1.135, w: 0.47 }
      ]
    },

    rodas: [
      { eixo: 'traseiro', z: -1.36, y: 0.37, x: 0.88, raio: 0.37, largura: 0.32, aro: 0.255 },
      { eixo: 'dianteiro', z: 1.35, y: 0.35, x: 0.86, raio: 0.35, largura: 0.27, aro: 0.245 }
    ],

    detalhes: {
      farois: [
        { lado: -1, centro: [-0.63, 0.59, 1.90], raios: [0.255, 0.032, 0.105], inclinacao: -0.18 },
        { lado: 1, centro: [0.63, 0.59, 1.90], raios: [0.255, 0.032, 0.105], inclinacao: 0.18 }
      ],
      lanternas: [
        { centro: [-0.55, 0.61, -2.305], raio: 0.112 }, { centro: [0.55, 0.61, -2.305], raio: 0.112 },
        { centro: [-0.29, 0.60, -2.31], raio: 0.082 }, { centro: [0.29, 0.60, -2.31], raio: 0.082 }
      ],
      entradasLaterais: [
        { lado: -1, x: -0.992, perfil: [[0.35, -0.32], [0.69, -0.48], [0.69, -1.02], [0.38, -0.89]] },
        { lado: 1, x: 0.992, perfil: [[0.35, -0.32], [0.69, -0.48], [0.69, -1.02], [0.38, -0.89]] }
      ],
      espelhos: [
        { lado: -1, centro: [-0.91, 0.87, 0.50] },
        { lado: 1, centro: [0.91, 0.87, 0.50] }
      ],
      bocaDianteira: { z: 2.205, profundidade: 0.028, perfil: [[-0.52, 0.20], [0.52, 0.20], [0.43, 0.39], [-0.43, 0.39]] },
      painelTraseiro: { z: -2.292, profundidade: 0.032, perfil: [[-0.71, 0.29], [0.71, 0.29], [0.67, 0.61], [-0.67, 0.61]] }
    }
  });
}());
