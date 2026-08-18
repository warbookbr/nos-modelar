/* manifesto.js — contrato versionado da extensão neutra de prova. */
import { FORMATO_EXTENSAO_NATIVA } from '../../motor/extensoes.js';
export const MANIFESTO = Object.freeze({
  formato: FORMATO_EXTENSAO_NATIVA, id: 'mecanifica.extensao.prisma-triangular', versao: '1.0.0',
  operacao: { id: 'mecanifica.operacao.prismaTriangular', nome: 'prismaTriangular', versao: '1.0.0', categoria: 'extensao', artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1'] }, efeitos: ['cria-geometria'], identidade: 'cria-por-passo' },
});
