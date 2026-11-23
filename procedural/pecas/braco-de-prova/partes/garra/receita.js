/* braco-de-prova/garra — a garra como volume, um bloco de 40 × 45 × 40 mm na ponta do segundo elo.
 *
 * Última etapa da montagem `braco-de-prova/montagem.json`. O plano do braço de prova exclui a garra em detalhe: ela entra
 * como volume, com a massa de 80 g dos requisitos (a massa é da ficha, não desta receita).
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`).
 *
 * Portas: `apoio` (plano, apoia, normal −x, na face de trás do bloco), que se apoia na `ponta` do segundo elo.
 */
import { passosDasFormas, aliasesDasFormas, porta, origemDa, MATERIAIS as CORES } from '../../comum/blocos.mjs';

export const TABELA = {
  alturaDoEixo: 140,
  /* Face de fora da placa da ponta do segundo elo. */
  ponta: 305,
  comprimento: 40,
  altura: 45,
  largura: 40,
  chanfro: 4,
};

export const MATERIAIS = CORES;

export function derivar(t = TABELA) {
  return [
    { nome: 'garra', material: 'estrutura', chanfro: t.chanfro,
      caixa: [t.ponta, t.ponta + t.comprimento, t.alturaDoEixo - t.altura / 2, t.alturaDoEixo + t.altura / 2, -t.largura / 2, t.largura / 2] },
  ];
}

export const ALIASES = aliasesDasFormas(derivar(TABELA));

export function gerarPassos(t = TABELA) {
  const formas = derivar(t);
  const { passos } = passosDasFormas(formas);
  passos.push(porta('apoio', origemDa(formas, 'garra'), { forma: 'plano', papel: 'apoia', ponto: [t.ponta, t.alturaDoEixo, 0], normal: [-1, 0, 0], extensao: [40, 40] }));
  return passos;
}

const receita = {
  meta: { nome: 'braco-de-prova/garra', desc: 'garra do braço de prova como volume: bloco chanfrado de 40 × 45 × 40 mm na ponta do segundo elo' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'chão, sob o eixo do ombro; y para cima, x ao longo do braço esticado, +z para a frente' },
  PLANO: {
    objeto: 'garra do braço de prova como volume, sem detalhe',
    referencias: ['../../../../../docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/elos-opcoes.png'],
    escala: { medida: 'altura do bloco', milimetros: 45 },
    partes: [
      { nome: 'garra', forma: 'bloco de 40 × 45 × 40 mm com chanfro de 4 mm, centrado no plano do braço, encostado na placa da ponta', tecnica: 'caixa chanfrada' },
    ],
    criteriosDeReprovacao: [
      'bloco com medida diferente de 40 × 45 × 40 mm',
      'garra solta da ponta do segundo elo ou fora do plano do braço',
    ],
  },
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
