/* aviao/helice — o cone e as cinco pás da hélice do avião de pequeno porte, parada na pose do esboço.
 *
 * Terceira etapa do avião (`../../montagem.json`), planejada e ainda sem passos: o plano está em `../../ALINHAMENTO.md` e as formas
 * vêm da unidade `helice` do esboço aprovado da segunda rodada (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/`, o
 * mestre e `aviao-detalhe-helice.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. O
 * eixo da hélice é a reta x = 0, y = 1330. As pás são a pá da família `superficie-aerodinamica`, com o perfil `pa-de-helice`,
 * expandida dentro dos PASSOS (`docs/mecanifica/usar/AUTORIA-DE-PECA.md`).
 */

const ESBOCO = '../../../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const PAS = ['pa1', 'pa2', 'pa3', 'pa4', 'pa5'];
const FORMA_DA_PA = { pa1: 'helicePa', pa2: 'helicePa1', pa3: 'helicePa2', pa4: 'helicePa3', pa5: 'helicePa4' };

export default {
  meta: { nome: 'aviao/helice', desc: 'hélice do avião de pequeno porte: o cone e as cinco pás' },
  PARAMS: {},
  MATERIAIS: {},
  TOPO: { origem: 'a proa do avião em z 0; o eixo da hélice em x 0 e y 1330; y para cima com o chão em y 0; x para a direita do piloto' },
  PLANO: {
    objeto: 'hélice de cinco pás de um avião monomotor de pequeno porte, parada: o cone na frente do capô e as cinco pás saindo dele em arranjo radial',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
    ],
    escala: { medida: 'diâmetro da hélice no esboço, de ponta a ponta das pás (o dobro de 1090 mm do eixo à ponta)', milimetros: 2180 },
    partes: [
      {
        nome: 'cone',
        forma: 'cone da hélice, de revolução em torno do eixo z, da proa em z 8 até dentro do lábio do capô, com 424 mm de diâmetro na base',
        tecnica: 'revolução pelo perfil do esboço com sombreado liso',
      },
      ...PAS.map((nome, i) => ({
        nome,
        forma: `pá ${i + 1} de 5, torcida, com a raiz dentro do cone e a ponta a 1090 mm do eixo, a ${72 * i} graus da primeira em torno do eixo da hélice`,
        tecnica: 'a pá da família superficie-aerodinamica, perfil pa-de-helice, com os parâmetros do esboço, expandida nos PASSOS e girada em torno do eixo da hélice',
      })),
    ],
    criteriosDeReprovacao: [
      'pá reta, sem a torção da família',
      'pá que não entra no cone, ou solta',
      'pás fora do arranjo radial de 72 graus',
      'cone facetado em vez de liso',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  contatos: PAS.map((pa) => ({ par: [pa, 'cone'], motivo: 'a raiz da pá entra no cone' })),
  formas: { cone: 'solido', ...Object.fromEntries(PAS.map((pa) => [pa, 'solido'])) },
  REFINA: {
    andaime: '../../andaime.json',
    /* só a primeira pá tem volume no andaime; as outras quatro são giradas, que a N2 não traduz, e se conferem só pelo esboço */
    partes: { cone: 'cone', pa1: 'helice-pa' },
    tolerancia: { envelope: 5, porta: 0.5 },
    esboco: { arquivo: ESBOCO, opcao: 1, formas: { cone: 'cone', ...FORMA_DA_PA }, minimo: 0.95 },
  },
  PASSOS: [],
};
