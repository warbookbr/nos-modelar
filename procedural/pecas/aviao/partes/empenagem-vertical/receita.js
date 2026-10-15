/* aviao/empenagem-vertical — a deriva do avião de pequeno porte, com a dorsal, o leme, o eixo dele e as dobradiças, na pose de pouso,
 * com o leme neutro.
 *
 * Sexta etapa do avião (`../../montagem.json`), planejada e ainda sem passos: o plano está em `../../ALINHAMENTO.md` e as formas vêm da
 * unidade `empenagem-vertical` do esboço aprovado da segunda rodada (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/`, o
 * mestre e `aviao-detalhe-empenagem-vertical.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. A deriva
 * é a superfície da família `superficie-aerodinamica`, perfil `deriva`, expandida dentro dos PASSOS
 * (`docs/mecanifica/usar/AUTORIA-DE-PECA.md`), cortada na raiz e no vão do leme como no esboço (`deriva.fin`, `deriva.corteRaiz`,
 * `vaoDoLeme`). Os nomes das partes não levam ponto: `deriva` é a forma `deriva.fin` e `dorsal` é a `deriva.dorsal`.
 */

const ESBOCO = '../../../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const DOBRADICAS = [1, 2, 3].flatMap((n) => [['D', 'd', 'direita'], ['E', 'e', 'esquerda']].map(([L, l, lado]) => ({ n, L, l, lado })));

const VOLUMES = {
  deriva: 'deriva-fin', dorsal: 'deriva-dorsal', leme: 'leme', eixoLeme: 'eixo-leme',
  ...Object.fromEntries(DOBRADICAS.map(({ n, L, l }) => [`dobradicaLeme${n}${L}`, `dobradica-leme${n}-${l}`])),
};
const FORMAS = {
  deriva: 'deriva.fin', dorsal: 'deriva.dorsal', leme: 'leme', eixoLeme: 'eixoLeme',
  ...Object.fromEntries(DOBRADICAS.map(({ n, L }) => [`dobradicaLeme${n}${L}`, `dobradicaLeme${n}${L}`])),
};
const PARTES = Object.keys(VOLUMES);

export default {
  meta: { nome: 'aviao/empenagem-vertical', desc: 'empenagem vertical do avião de pequeno porte: a deriva, a dorsal, o leme, o eixo e as dobradiças' },
  PARAMS: {},
  MATERIAIS: {},
  TOPO: { origem: 'a proa do avião em z 0; y para cima com o chão em y 0; x para a direita do piloto; a deriva no plano x 0, de z 6960 a z 10398' },
  PLANO: {
    objeto: 'empenagem vertical de um avião monomotor de pequeno porte: a deriva sobre a cauda, a dorsal que a liga ao dorso da fuselagem, o leme no bordo de fuga, o eixo dele e três pares de dobradiças',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
    ],
    escala: { medida: 'altura da deriva com o leme no esboço, da raiz em y 2225 ao topo do leme em y 4185', milimetros: 1960 },
    partes: [
      {
        nome: 'deriva',
        forma: 'deriva de perfil simétrico, enflechada para trás, da raiz sobre a cauda até o topo, com o vão do leme recortado no bordo de fuga',
        tecnica: 'a superfície da família superficie-aerodinamica, perfil deriva, com os parâmetros do esboço, expandida nos PASSOS, cortada na raiz e no vão do leme por subtrair',
      },
      {
        nome: 'dorsal',
        forma: 'dorsal, a aleta baixa que desce da frente da deriva ao dorso da fuselagem',
        tecnica: 'loft das seções do esboço, com as pontas fechadas e sombreado liso',
      },
      {
        nome: 'leme',
        forma: 'leme no vão do bordo de fuga da deriva, da raiz ao topo, com a fresta do esboço em volta',
        tecnica: 'loft das seções do esboço, com as pontas fechadas e sombreado liso',
      },
      { nome: 'eixoLeme', forma: 'eixo do leme, haste de 30 mm ao longo da dobradiça', tecnica: 'cilindro entre as duas pontas da dobradiça do esboço' },
      ...DOBRADICAS.map(({ n, L, lado }) => ({
        nome: `dobradicaLeme${n}${L}`,
        forma: `dobradiça ${n} do leme, do lado ${lado}, peça fina que liga a deriva ao eixo`,
        tecnica: 'loft das seções do esboço',
      })),
    ],
    criteriosDeReprovacao: [
      'deriva reta, sem o enflechamento ou o afinamento do esboço',
      'dorsal solta, ou com degrau para a deriva',
      'leme fora do vão, sem a fresta, ou atravessando a deriva',
      'eixo ou dobradiça solta, que não segura o leme',
      'vão do leme sem recorte na deriva',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  contatos: [
    { par: ['dorsal', 'deriva'], motivo: 'a dorsal continua a frente da deriva' },
    { par: ['eixoLeme', 'leme'], motivo: 'o eixo corre na dobradiça do leme' },
    ...DOBRADICAS.map(({ n, L, lado }) => ({ par: [`dobradicaLeme${n}${L}`, 'deriva'], motivo: `a dobradiça ${n} do lado ${lado} sai da deriva` })),
  ],
  formas: Object.fromEntries(PARTES.map((p) => [p, 'solido'])),
  REFINA: {
    andaime: '../../andaime.json',
    partes: VOLUMES,
    tolerancia: { envelope: 5, porta: 0.5 },
    esboco: { arquivo: ESBOCO, opcao: 1, formas: FORMAS, minimo: 0.95 },
  },
  PASSOS: [],
};
