/* manifesto.js — contrato versionado da extensão neutra de prova. */
import { FORMATO_EXTENSAO_NATIVA } from '../../motor/extensoes.js';
import { criarContratoUsoOperacao } from '../../motor/uso-operacoes.js';

export const MANIFESTO = Object.freeze({
  formato: FORMATO_EXTENSAO_NATIVA, id: 'mecanifica.extensao.prisma-triangular', versao: '1.0.0',
  operacao: {
    id: 'mecanifica.operacao.prismaTriangular', nome: 'prismaTriangular', versao: '1.0.0',
    categoria: 'extensao', artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1'] },
    efeitos: ['cria-geometria'], identidade: 'cria-por-passo',
    uso: criarContratoUsoOperacao('prismaTriangular', {
      intencao: 'Criar prisma reto de seção triangular equilátera, apoiado em y=0.',
      campos: {
        raio: ['escalar', 'Distância positiva do centro da seção a cada vértice.'],
        altura: ['escalar', 'Comprimento positivo no eixo y.'],
      },
      passos: [['prismaTriangular', { raio: 0.5, altura: 1 }]],
      limites: ['A seção e o eixo são fixos nesta versão; não há transformação embutida.'],
      diagnosticos: [{ quando: 'raio ou altura não positivo', acao: 'use valores finitos maiores que zero' }],
    }),
  },
});
