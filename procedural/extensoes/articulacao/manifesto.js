/* manifesto.js — contrato versionado da extensão de articulação. */
import { FORMATO_EXTENSAO_NATIVA } from '../../nucleo/extensoes.js';
import { criarContratoUsoOperacao } from '../../nucleo/uso-operacoes.js';
import { PASSOS } from './fixture.js';

export const MANIFESTO = Object.freeze({
  formato: FORMATO_EXTENSAO_NATIVA, id: 'mecanifica.extensao.articulacao', versao: '1.0.0',
  operacao: {
    id: 'mecanifica.operacao.articulacao', nome: 'articulacao', versao: '1.0.0',
    categoria: 'extensao',
    artefatos: { entra: ['mecanifica.porta@1'], sai: ['mecanifica.articulacao@1'] },
    efeitos: ['declara-relacao', 'confere-movimento'], identidade: 'nao-cria',
    uso: criarContratoUsoOperacao('articulacao', {
      intencao: 'Declarar entre duas peças uma articulação de revolução (graus) ou prismática (mm), presa a uma porta com eixo de cada peça, e conferir que nada colide ao longo do curso.',
      campos: {
        id: ['texto', 'Identidade estável da articulação na montagem.'],
        tipo: ['texto', "'revolucao' ou 'prismatica'."],
        fixo: ['objeto', '{caminho, porta}: a peça que fica; o eixo ou a direção sai do eixo desta porta (cilindro, anel ou trilho).'],
        movel: ['objeto', '{caminho, porta}: a peça que se move; a porta precisa estar sobre o eixo da porta fixa.'],
        unidade: ['texto', "Unidade do curso: 'graus' ou 'rad' na revolução, 'mm' ou 'm' na prismática."],
        curso: ['objeto', '{minimo, maximo}; 0 é a pose da montagem resolvida, positivo é o sentido do eixo da porta fixa.'],
        passos: ['inteiro', 'Divisões do curso: o curso é conferido em passos+1 posições, de 1 a 720.'],
        folga: ['objeto', '{valor, unidade}: penetração tolerada entre peça móvel e peça fixa, mesmo que zero.'],
        acompanham: ['lista', 'Caminhos de outras instâncias que se movem rigidamente junto com a móvel.'],
        permitidos: ['lista', '[{movel, fixo, motivo}]: pares que se tocam de propósito durante o curso, com o motivo.'],
      },
      obrigatorios: ['id', 'tipo', 'fixo', 'movel', 'unidade', 'curso', 'passos', 'folga'],
      passos: PASSOS,
      precondicoes: ['As duas peças estão numa montagem resolvida e publicam a porta citada, com eixo.', 'A porta móvel está sobre a reta do eixo da porta fixa.'],
      limites: [
        'Não cria geometria: a dobradiça ou o pino vêm de componentes que já existem.',
        'O curso é amostrado; colisão entre duas posições amostradas não é vista, e a conferência devolve o último valor livre por bisseção.',
        'A penetração é um piso: sai dos vértices e centroides amostrados pelo contato de sólidos.',
        'Não resolve dinâmica, nem cadeia de articulações: cada articulação é conferida com as demais peças paradas.',
      ],
      diagnosticos: [
        { quando: 'porta ausente ou sem eixo', acao: 'publique a porta com cilindro, anel ou trilho na peça citada' },
        { quando: 'colisão no curso', acao: 'reduza o curso, mude a peça ou declare o par em permitidos com o motivo' },
      ],
    }),
  },
});
