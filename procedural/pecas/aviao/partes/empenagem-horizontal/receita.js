/* aviao/empenagem-horizontal — as duas metades do estabilizador do avião de pequeno porte, com os profundores, os eixos deles e os
 * suportes, na pose de pouso, com os profundores neutros.
 *
 * Quinta etapa do avião (`../../montagem.json`), planejada e ainda sem passos: o plano está em `../../ALINHAMENTO.md` e as formas vêm
 * da unidade `empenagem-horizontal` do esboço aprovado da segunda rodada (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/`,
 * o mestre e `aviao-detalhe-empenagem-horizontal.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. Cada
 * forma do lado direito (D) tem a do esquerdo (E) espelhada em x. As metades do estabilizador são a superfície da família
 * `superficie-aerodinamica`, perfil `estabilizador`, expandida dentro dos PASSOS (`docs/mecanifica/usar/AUTORIA-DE-PECA.md`).
 */

const ESBOCO = '../../../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const LADOS = [['D', 'd', 'direito'], ['E', 'e', 'esquerdo']];
const porLado = (fazer) => LADOS.flatMap(([L, l, nome]) => fazer(L, l, nome));

const VOLUMES = Object.fromEntries(porLado((L, l) => [
  [`estabilizador${L}`, `estabilizador-${l}`], [`profundor${L}`, `profundor-${l}`], [`eixoProfundor${L}`, `eixo-profundor-${l}`],
  ...[1, 2, 3].map((n) => [`suporteProfundor${n}${L}`, `suporte-profundor${n}-${l}`]),
]));
const PARTES = Object.keys(VOLUMES);

export default {
  meta: { nome: 'aviao/empenagem-horizontal', desc: 'empenagem horizontal do avião de pequeno porte: o estabilizador, os profundores, os eixos e os suportes' },
  PARAMS: {},
  MATERIAIS: {},
  TOPO: { origem: 'a proa do avião em z 0; y para cima com o chão em y 0; x para a direita do piloto; o estabilizador na cauda, de z 9077 a z 10289' },
  PLANO: {
    objeto: 'empenagem horizontal de um avião monomotor de pequeno porte: as duas metades do estabilizador na cauda, cada uma com o profundor no bordo de fuga, o eixo dele e três suportes',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
    ],
    escala: { medida: 'envergadura do estabilizador no esboço, de ponta a ponta', milimetros: 4780 },
    partes: porLado((L, l, nome) => [
      {
        nome: `estabilizador${L}`,
        forma: `metade ${nome} do estabilizador, da raiz junto à cauda até a ponta, com enflechamento e diedro, perfil de 9,5% afinando para a ponta e o vão do profundor recortado`,
        tecnica: 'a superfície da família superficie-aerodinamica, perfil estabilizador, com os parâmetros do esboço, expandida nos PASSOS e recortada por subtrair',
      },
      {
        nome: `profundor${L}`,
        forma: `profundor ${nome}, superfície do bordo de fuga do estabilizador, no vão dele com a fresta do esboço em volta`,
        tecnica: 'loft das seções do esboço, com as pontas fechadas e sombreado liso',
      },
      { nome: `eixoProfundor${L}`, forma: `eixo do profundor ${nome}, haste ao longo da dobradiça`, tecnica: 'cilindro entre as duas pontas da dobradiça do esboço' },
      ...[1, 2, 3].map((n) => ({ nome: `suporteProfundor${n}${L}`, forma: `suporte ${n} do profundor ${nome}, peça fina sob o estabilizador que segura o eixo`, tecnica: 'loft das seções do esboço' })),
    ]),
    criteriosDeReprovacao: [
      'estabilizador reto, sem o enflechamento, o diedro ou o afinamento do esboço',
      'profundor fora do vão, sem a fresta, ou atravessando o estabilizador',
      'eixo ou suporte solto, que não segura o profundor',
      'vão do profundor sem recorte no estabilizador',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  contatos: porLado((L, l, nome) => [
    { par: [`eixoProfundor${L}`, `profundor${L}`], motivo: `o eixo corre na dobradiça do profundor ${nome}` },
    ...[1, 2, 3].map((n) => ({ par: [`suporteProfundor${n}${L}`, `estabilizador${L}`], motivo: `o suporte ${n} sai do estabilizador ${nome}` })),
  ]),
  formas: Object.fromEntries(PARTES.map((p) => [p, 'solido'])),
  REFINA: {
    andaime: '../../andaime.json',
    partes: VOLUMES,
    tolerancia: { envelope: 5, porta: 0.5 },
    esboco: { arquivo: ESBOCO, opcao: 1, formas: Object.fromEntries(PARTES.map((p) => [p, p])), minimo: 0.95 },
  },
  PASSOS: [],
};
