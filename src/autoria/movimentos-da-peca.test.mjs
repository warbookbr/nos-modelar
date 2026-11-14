/* movimentos-da-peca.test.mjs — o curso declarado em `MOVIMENTOS` é medido posição a posição contra as outras partes. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import { lerMovimentos, medirMovimentos, poseDoMovimento } from './movimentos-da-peca.js';

/* a gaveta (cubo de 10, x e z centrados, y de 0 a 10) e um batente 20 à frente em z: o vão entre os dois é de 10 */
const PASSOS = [
  ['cubo', { origemId: 1, larg: 10, alt: 10, prof: 10 }],
  ['parte', { nome: 'gaveta', sel: { origem: { op: 'cubo', id: 1 } } }],
  ['cubo', { origemId: 2, larg: 10, alt: 10, prof: 10 }],
  ['transladar', { d: [0, 0, 20], sel: { origem: { op: 'cubo', id: 2 } } }],
  ['parte', { nome: 'batente', sel: { origem: { op: 'cubo', id: 2 } } }],
];
const medir = (movimentos, passos = PASSOS) => {
  const receita = { meta: { nome: 'movimento' }, PASSOS: passos, MOVIMENTOS: movimentos };
  return medirMovimentos(executarReceita(receita).neutro, receita);
};
const gaveta = (ate, extra = {}) => ({ tipo: 'prismatico', partes: ['gaveta'], eixo: [0, 0, 1], de: 0, ate, motivo: 'a gaveta corre até o curso que o desenho promete', ...extra });

describe('medirMovimentos', () => {
  it('o curso que para antes do batente passa, com as 11 posições medidas', () => {
    const { movimentos, invasoes } = medir([gaveta(8)]);
    expect(invasoes).toEqual([]);
    expect(movimentos[0].posicoes).toHaveLength(11);
    expect(movimentos[0].posicoes[10]).toEqual({ posicao: 8, profundidade: 0 });
  });

  it('o curso que passa do vão reprova na primeira posição que invade, com a posição, o par e a profundidade', () => {
    const { movimentos, invasoes } = medir([gaveta(14, { passos: 14 })]);
    expect(invasoes.length).toBeGreaterThan(0);
    const primeira = invasoes[0];
    expect(primeira.par).toEqual(['gaveta', 'batente']);
    expect(primeira.posicao).toBe(11); /* o vão é 10: em 10 só encosta, em 11 afunda 1 */
    expect(primeira.profundidade).toBeCloseTo(1, 6);
    expect(movimentos[0].profundidadeMaxima).toBeCloseTo(4, 6);
    expect(invasoes.at(-1).posicao).toBe(14);
  });

  it('encostar na ponta do curso passa (a gaveta toca o batente em 10)', () => {
    expect(medir([gaveta(10)]).invasoes).toEqual([]);
  });

  it('`invasaoMaxima` admite o afundamento declarado', () => {
    expect(medir([gaveta(14, { invasaoMaxima: 5 })]).invasoes).toEqual([]);
  });

  it('o movimento rotativo leva a parte ao giro em torno do pivô e mede o arco', () => {
    const passos = [
      ['cubo', { origemId: 1, larg: 10, alt: 10, prof: 2 }],
      ['parte', { nome: 'porta', sel: { origem: { op: 'cubo', id: 1 } } }],
      ['cubo', { origemId: 2, larg: 4, alt: 10, prof: 4 }],
      ['transladar', { d: [-5, 0, 8], sel: { origem: { op: 'cubo', id: 2 } } }],
      ['parte', { nome: 'batente', sel: { origem: { op: 'cubo', id: 2 } } }],
    ];
    const giro = (de, ate) => ({ tipo: 'rotativo', partes: ['porta'], eixo: [0, 1, 0], pivo: [-5, 0, 0], de, ate, motivo: 'a porta abre em torno da dobradiça' });
    const abre = medir([giro(0, 90)], passos).invasoes.length > 0;
    const abreAoContrario = medir([giro(0, -90)], passos).invasoes.length > 0;
    expect(abre).not.toBe(abreAoContrario); /* um sentido bate no batente, o outro não */
    expect(medir([giro(0, 20)], passos).invasoes).toEqual([]);
    expect(medir([giro(0, -20)], passos).invasoes).toEqual([]);
  });

  it('a pose rotativa gira em torno do pivô: o pivô fica onde está', () => {
    const pose = poseDoMovimento({ tipo: 'rotativo', eixo: [0, 1, 0], pivo: [-5, 0, 0] }, 90);
    const [r, d] = [pose.rotacao, pose.deslocamento];
    const p = [-5, 3, 0];
    const q = [0, 1, 2].map((i) => r[i][0] * p[0] + r[i][1] * p[1] + r[i][2] * p[2] + d[i]);
    q.forEach((v, i) => expect(v).toBeCloseTo(p[i], 12));
  });
});

describe('lerMovimentos', () => {
  const partes = ['gaveta', 'batente'];
  const le = (item) => lerMovimentos({ MOVIMENTOS: [item] }, partes);
  it('recusa o que falta dizendo o recebido e o esperado', () => {
    expect(() => le({ ...gaveta(8), tipo: 'deslizante' })).toThrow(/'tipo' precisa ser 'prismatico' ou 'rotativo', recebi "deslizante"/);
    expect(() => le({ ...gaveta(8), partes: ['saia'] })).toThrow(/a peça não tem parte 'saia'.*Partes disponíveis: batente, gaveta/);
    expect(() => le({ ...gaveta(8), eixo: [0, 0, 0] })).toThrow(/'eixo' precisa ser \[x, y, z\].*recebi \[0,0,0\]/);
    expect(() => le({ ...gaveta(8), de: 3, ate: 3 })).toThrow(/'de' e 'ate' precisam ser dois números diferentes/);
    expect(() => le({ ...gaveta(8), tipo: 'rotativo' })).toThrow(/pede 'pivo'/);
    expect(() => le({ ...gaveta(8), motivo: 'curto' })).toThrow(/'motivo' precisa dizer/);
    expect(() => le({ ...gaveta(8), contra: ['gaveta'] })).toThrow(/'contra' cita parte que também se move/);
    expect(() => le({ ...gaveta(8), passos: 0 })).toThrow(/'passos' precisa ser inteiro de 1 a 200, recebi 0/);
    expect(() => le({ ...gaveta(8), extra: 1 })).toThrow(/campo desconhecido 'extra'/);
    expect(() => lerMovimentos({ MOVIMENTOS: {} }, partes)).toThrow(/'MOVIMENTOS' precisa ser lista/);
  });
  it('sem MOVIMENTOS não há nada a medir', () => {
    expect(lerMovimentos({}, partes)).toEqual([]);
  });
});

describe('o `descrever` com MOVIMENTOS', () => {
  async function descrever(movimentos) {
    const { descreverPecaReutilizavel } = await import('../../tools/modelar/descrever-peca.mjs');
    return descreverPecaReutilizavel({ peca: 'movimento', modulo: { meta: { nome: 'movimento' }, PASSOS, MOVIMENTOS: movimentos }, estrito: true });
  }
  it('reprova o curso que invade, com a posição e o que fazer, e aprova o que só chega perto', async () => {
    const ruim = await descrever([gaveta(14)]);
    expect(ruim.codigo).toBe(1);
    expect(ruim.stderr).toContain('POSIÇÃO(ÕES) DO CURSO EM QUE UMA PARTE INVADE A OUTRA');
    expect(ruim.stderr).toMatch(/gaveta ↔ batente afunda [\d,]+ mm \(admite 0,1 mm\)/);
    expect(ruim.stderr).toContain('invasaoMaxima');
    const boa = await descrever([gaveta(8)]);
    expect(boa.stderr).not.toContain('CURSO EM QUE UMA PARTE INVADE');
    expect(boa.stdout).toContain('MOVIMENTOS (curso medido em 11 posições)');
  });
});
