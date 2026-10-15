/* aviao/trem-do-nariz — o trem do nariz do avião de pequeno porte baixado, na pose de pouso: a carenagem, o pivô e os mancais, a
 * alavanca e o atuador, o compasso, a perna, o pistão, o garfo, o eixo e a roda.
 *
 * Sétima etapa do avião (`../../montagem.json`), planejada e ainda sem passos: o plano está em `../../ALINHAMENTO.md` e as formas vêm da
 * unidade `trem-do-nariz` do esboço aprovado da segunda rodada (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/`, o mestre
 * e `aviao-detalhe-trem-do-nariz.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. A roda é
 * a da família `roda-pneu`, perfil `carro`, expandida dentro dos PASSOS (`docs/mecanifica/usar/AUTORIA-DE-PECA.md`). A carenagem leva
 * recortado o alojamento do trem (`alojamentoNariz`), como no esboço.
 */

const ESBOCO = '../../../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const slug = (id) => id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/* parte -> [forma prometida, técnica], no nome da forma do esboço */
const PARTES = {
  carenagemTremNariz: ['carenagem sob o nariz, de canto arredondado, com o alojamento do trem recortado por baixo', 'caixa do esboço recortada pelo alojamento por subtrair'],
  eixoPivoNariz: ['eixo do pivô, de lado a lado do alojamento, em torno do qual o trem gira', 'cilindro entre os pontos do esboço'],
  mancalNarizE: ['mancal esquerdo do pivô, preso à carenagem', 'caixa do esboço'],
  mancalNarizD: ['mancal direito do pivô, preso à carenagem', 'caixa do esboço'],
  alavancaNariz: ['alavanca que sai do pivô para o atuador', 'cilindro entre os pontos do esboço'],
  pinoAtuadorNariz: ['pino que liga o atuador à alavanca', 'cilindro entre os pontos do esboço'],
  atuadorHasteNariz: ['haste do atuador', 'cilindro entre os pontos do esboço'],
  atuadorCorpoNariz: ['corpo do atuador, mais grosso que a haste', 'cilindro entre os pontos do esboço'],
  orelhaAtuadorNariz: ['orelha que prende o corpo do atuador à estrutura', 'caixa do esboço'],
  compassoSupNariz: ['braço de cima do compasso, da perna ao pino do meio', 'cilindro entre os pontos do esboço'],
  compassoInfNariz: ['braço de baixo do compasso, do pino do meio ao garfo', 'cilindro entre os pontos do esboço'],
  pinoCompassoNariz: ['pino do meio do compasso', 'cilindro entre os pontos do esboço'],
  pernaNariz: ['perna do trem, do pivô para baixo', 'cilindro entre os pontos do esboço'],
  pistaoNariz: ['pistão que sai da perna, mais fino que ela', 'cilindro entre os pontos do esboço'],
  coroaNariz: ['coroa no pé do pistão, onde o garfo se prende', 'cilindro entre os pontos do esboço'],
  garfoNariz: ['garfo que segura o eixo da roda', 'cilindro entre os pontos do esboço'],
  eixoRodaNariz: ['eixo da roda, atravessando o garfo e o cubo', 'cilindro entre os pontos do esboço'],
  rodaNariz: ['roda do nariz com o pneu, de 364 mm de diâmetro, encostando no chão', 'a roda da família roda-pneu, perfil carro, com os parâmetros do esboço, expandida nos PASSOS'],
};
const NOMES = Object.keys(PARTES);

export default {
  meta: { nome: 'aviao/trem-do-nariz', desc: 'trem do nariz do avião de pequeno porte, baixado: carenagem, pivô, atuador, compasso, perna, garfo e roda' },
  PARAMS: {},
  MATERIAIS: {},
  TOPO: { origem: 'a proa do avião em z 0; y para cima com o chão em y 0; x para a direita do piloto; o trem sob o nariz, de z 1558 a z 2760' },
  PLANO: {
    objeto: 'trem do nariz de um avião monomotor de pequeno porte, baixado: a perna presa ao pivô sob o nariz, com o atuador, o compasso, o pistão, o garfo e a roda no chão',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
    ],
    escala: { medida: 'altura do trem do nariz no esboço, do pé da roda ao alto da carenagem', milimetros: 773 },
    partes: NOMES.map((nome) => ({ nome, forma: PARTES[nome][0], tecnica: PARTES[nome][1] })),
    criteriosDeReprovacao: [
      'roda solta, fora do chão, ou atravessando o garfo',
      'perna, pistão, garfo ou eixo desalinhados entre si, ou soltos',
      'atuador ou compasso solto, que não liga as peças que o esboço liga',
      'carenagem sem o alojamento recortado',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  contatos: [
    { par: ['eixoPivoNariz', 'mancalNarizE'], motivo: 'o eixo do pivô gira no mancal esquerdo' },
    { par: ['eixoPivoNariz', 'mancalNarizD'], motivo: 'o eixo do pivô gira no mancal direito' },
    { par: ['pernaNariz', 'eixoPivoNariz'], motivo: 'a perna pende do pivô' },
    { par: ['pistaoNariz', 'pernaNariz'], motivo: 'o pistão sai da perna' },
    { par: ['coroaNariz', 'pistaoNariz'], motivo: 'a coroa fica no pé do pistão' },
    { par: ['garfoNariz', 'coroaNariz'], motivo: 'o garfo se prende na coroa' },
    { par: ['eixoRodaNariz', 'garfoNariz'], motivo: 'o eixo da roda atravessa o garfo' },
    { par: ['rodaNariz', 'eixoRodaNariz'], motivo: 'a roda gira no eixo' },
  ],
  formas: Object.fromEntries(NOMES.map((p) => [p, 'solido'])),
  REFINA: {
    andaime: '../../andaime.json',
    partes: Object.fromEntries(NOMES.map((p) => [p, slug(p)])),
    tolerancia: { envelope: 5, porta: 0.5 },
    esboco: { arquivo: ESBOCO, opcao: 1, formas: Object.fromEntries(NOMES.map((p) => [p, p])), minimo: 0.95 },
  },
  PASSOS: [],
};
