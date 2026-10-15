/* aviao/trens-principais — os dois trens principais do avião de pequeno porte baixados, na pose de pouso: em cada um a perna, o pino
 * do pivô, a coroa, o garfo de dois lados, o eixo, a roda, o compasso e o atuador.
 *
 * Oitava etapa do avião (`../../montagem.json`), planejada e ainda sem passos: o plano está em `../../ALINHAMENTO.md` e as formas vêm da
 * unidade `trens-principais` do esboço aprovado da segunda rodada (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/`, o
 * mestre e `aviao-detalhe-trens-principais.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. Cada
 * forma do lado direito (D) tem a do esquerdo (E) espelhada em x. As rodas são a da família `roda-pneu`, perfil `carro`, expandida dentro
 * dos PASSOS (`docs/mecanifica/usar/AUTORIA-DE-PECA.md`). Os alojamentos dos trens são cortadores da asa, e as asas já os recortam.
 */

const ESBOCO = '../../../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const slug = (id) => id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/* base do nome -> [forma prometida, técnica], sem o lado */
const BASES = {
  perna: ['perna do trem, do pivô sob a asa para baixo e para fora', 'caixa de canto arredondado do esboço'],
  pinoPivo: ['pino do pivô, onde a perna gira para recolher', 'cilindro entre os pontos do esboço'],
  coroa: ['coroa no pé da perna, onde o garfo se prende', 'caixa do esboço'],
  garfoExt: ['lado de fora do garfo, que segura o eixo da roda', 'caixa do esboço'],
  garfoInt: ['lado de dentro do garfo, que segura o eixo da roda', 'caixa do esboço'],
  eixoRoda: ['eixo da roda, atravessando os dois lados do garfo e o cubo', 'cilindro entre os pontos do esboço'],
  roda: ['roda principal com o pneu, de 593 mm de diâmetro, encostando no chão', 'a roda da família roda-pneu, perfil carro, com os parâmetros do esboço, expandida nos PASSOS'],
  compassoSup: ['braço de cima do compasso', 'cilindro entre os pontos do esboço'],
  compassoInf: ['braço de baixo do compasso', 'cilindro entre os pontos do esboço'],
  pinoCompasso: ['pino do meio do compasso', 'cilindro entre os pontos do esboço'],
  pinoCompassoAlto: ['pino de cima do compasso, na perna', 'cilindro entre os pontos do esboço'],
  pinoCompassoBaixo: ['pino de baixo do compasso, na coroa', 'cilindro entre os pontos do esboço'],
  atuadorCorpo: ['corpo do atuador, mais grosso que a haste', 'cilindro entre os pontos do esboço'],
  atuadorHaste: ['haste do atuador', 'cilindro entre os pontos do esboço'],
  pinoAtuador: ['pino que liga o atuador à perna', 'cilindro entre os pontos do esboço'],
  orelhaAtuador: ['orelha que prende o atuador à perna', 'caixa do esboço'],
};
const LADOS = [['D', 'direito'], ['E', 'esquerdo']];
const NOMES = LADOS.flatMap(([L]) => Object.keys(BASES).map((b) => `${b}Principal${L}`));
const ladoDe = (nome) => (nome.endsWith('D') ? 'direito' : 'esquerdo');
const baseDe = (nome) => nome.replace(/Principal[DE]$/, '');

export default {
  meta: { nome: 'aviao/trens-principais', desc: 'trens principais do avião de pequeno porte, baixados: perna, pivô, coroa, garfo, eixo, roda, compasso e atuador de cada lado' },
  PARAMS: {},
  MATERIAIS: {},
  TOPO: { origem: 'a proa do avião em z 0; y para cima com o chão em y 0; x para a direita do piloto; os trens sob as asas, em x de 1850 a 2072 de cada lado' },
  PLANO: {
    objeto: 'trens principais de um avião monomotor de pequeno porte, baixados: de cada lado, a perna presa ao pivô sob a asa, com a coroa, o garfo, o eixo, a roda no chão, o compasso e o atuador',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.prancha.png',
    ],
    escala: { medida: 'altura do trem principal no esboço, do pé da roda ao alto do pivô', milimetros: 1198 },
    partes: NOMES.map((nome) => ({ nome, forma: `${BASES[baseDe(nome)][0]}, do lado ${ladoDe(nome)}`, tecnica: BASES[baseDe(nome)][1] })),
    criteriosDeReprovacao: [
      'roda solta, fora do chão, ou atravessando o garfo',
      'perna, coroa, garfo ou eixo desalinhados entre si, ou soltos',
      'atuador ou compasso solto, que não liga as peças que o esboço liga',
      'os dois lados que não são espelho um do outro',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  contatos: LADOS.flatMap(([L, lado]) => [
    { par: [`pernaPrincipal${L}`, `pinoPivoPrincipal${L}`], motivo: `a perna do lado ${lado} gira no pino do pivô` },
    { par: [`coroaPrincipal${L}`, `pernaPrincipal${L}`], motivo: `a coroa fica no pé da perna do lado ${lado}` },
    { par: [`garfoExtPrincipal${L}`, `coroaPrincipal${L}`], motivo: `o lado de fora do garfo se prende na coroa (${lado})` },
    { par: [`garfoIntPrincipal${L}`, `coroaPrincipal${L}`], motivo: `o lado de dentro do garfo se prende na coroa (${lado})` },
    { par: [`eixoRodaPrincipal${L}`, `garfoExtPrincipal${L}`], motivo: `o eixo da roda atravessa o garfo (${lado})` },
    { par: [`rodaPrincipal${L}`, `eixoRodaPrincipal${L}`], motivo: `a roda do lado ${lado} gira no eixo` },
  ]),
  formas: Object.fromEntries(NOMES.map((p) => [p, 'solido'])),
  REFINA: {
    andaime: '../../andaime.json',
    partes: Object.fromEntries(NOMES.map((p) => [p, slug(p)])),
    tolerancia: { envelope: 5, porta: 0.5 },
    esboco: { arquivo: ESBOCO, opcao: 1, formas: Object.fromEntries(NOMES.map((p) => [p, p])), minimo: 0.95 },
  },
  PASSOS: [],
};
