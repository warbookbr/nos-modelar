/* aviao/asas — as duas metades da asa do avião de pequeno porte, com a ponta levantada, os flaps, os ailerons, os eixos deles e os
 * suportes, na pose de pouso, com as superfícies de comando neutras.
 *
 * Quarta etapa do avião (`../../montagem.json`), planejada e ainda sem passos: o plano está em `../../ALINHAMENTO.md` e as formas vêm
 * da unidade `asas` do esboço aprovado da segunda rodada (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/`, o mestre e
 * `aviao-detalhe-asas.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. Cada
 * forma do lado direito (D) tem a do esquerdo (E) espelhada em x. As metades da asa e as pontas são a superfície da família
 * `superficie-aerodinamica`, perfil `asa`, expandida dentro dos PASSOS (`docs/mecanifica/usar/AUTORIA-DE-PECA.md`).
 */

const ESBOCO = '../../../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const LADOS = [['D', 'd', 'direito'], ['E', 'e', 'esquerdo']];
const porLado = (fazer) => LADOS.flatMap(([L, l, nome]) => fazer(L, l, nome));

/* parte da receita -> volume do andaime: o nome da forma do esboço em slug */
const VOLUMES = Object.fromEntries(porLado((L, l) => [
  [`asa${L}`, `asa-${l}`], [`ponta${L}`, `ponta-${l}`], [`flap${L}`, `flap-${l}`], [`aileron${L}`, `aileron-${l}`],
  [`eixoFlap${L}`, `eixo-flap-${l}`], [`eixoAileron${L}`, `eixo-aileron-${l}`],
  [`suporteFlap1${L}`, `suporte-flap1-${l}`], [`suporteFlap2${L}`, `suporte-flap2-${l}`],
  [`suporteAileron1${L}`, `suporte-aileron1-${l}`], [`suporteAileron2${L}`, `suporte-aileron2-${l}`],
]));
const PARTES = Object.keys(VOLUMES);

export default {
  meta: { nome: 'aviao/asas', desc: 'asas do avião de pequeno porte: as duas metades com a ponta levantada, os flaps, os ailerons, os eixos e os suportes' },
  PARAMS: {},
  MATERIAIS: {},
  TOPO: { origem: 'a proa do avião em z 0; y para cima com o chão em y 0; x para a direita do piloto; a asa direita em x positivo' },
  PLANO: {
    objeto: 'asa baixa de um avião monomotor de pequeno porte: as duas metades, cada uma com a ponta levantada, o flap e o aileron no bordo de fuga, os eixos deles e os suportes que os prendem',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png',
    ],
    escala: { medida: 'envergadura no esboço, de ponta a ponta das pontas levantadas', milimetros: 12825 },
    partes: [
      ...porLado((L, l, nome) => [
        {
          nome: `asa${L}`,
          forma: `metade ${nome} da asa, da raiz junto à fuselagem até o começo da ponta, com enflechamento e diedro, perfil de 15% afinando para a ponta e os vãos do flap, do aileron e do alojamento do trem principal recortados`,
          tecnica: 'a superfície da família superficie-aerodinamica, perfil asa, com os parâmetros do esboço, expandida nos PASSOS e recortada por subtrair',
        },
        {
          nome: `ponta${L}`,
          forma: `ponta ${nome} da asa, levantada a 56 graus, continuando a metade da asa sem degrau`,
          tecnica: 'a superfície da família com a ponta levantada, como no esboço, cortada para ficar só além da metade da asa',
        },
        {
          nome: `flap${L}`,
          forma: `flap ${nome}, superfície do bordo de fuga entre a raiz e o aileron, no vão da asa com a fresta do esboço em volta`,
          tecnica: 'loft das seções do esboço, com as pontas fechadas e sombreado liso',
        },
        {
          nome: `aileron${L}`,
          forma: `aileron ${nome}, superfície do bordo de fuga entre o flap e a ponta, no vão da asa com a fresta do esboço em volta`,
          tecnica: 'loft das seções do esboço, com as pontas fechadas e sombreado liso',
        },
        { nome: `eixoFlap${L}`, forma: `eixo do flap ${nome}, haste de 30 mm de diâmetro ao longo da dobradiça do flap`, tecnica: 'cilindro entre as duas pontas da dobradiça do esboço' },
        { nome: `eixoAileron${L}`, forma: `eixo do aileron ${nome}, haste de 30 mm de diâmetro ao longo da dobradiça do aileron`, tecnica: 'cilindro entre as duas pontas da dobradiça do esboço' },
        ...[1, 2].map((n) => ({ nome: `suporteFlap${n}${L}`, forma: `suporte ${n} do flap ${nome}, bloco de canto arredondado sob a asa que segura o eixo do flap`, tecnica: 'caixa de canto arredondado do esboço' })),
        ...[1, 2].map((n) => ({ nome: `suporteAileron${n}${L}`, forma: `suporte ${n} do aileron ${nome}, bloco de canto arredondado sob a asa que segura o eixo do aileron`, tecnica: 'caixa de canto arredondado do esboço' })),
      ]),
    ],
    criteriosDeReprovacao: [
      'asa reta, sem o enflechamento, o diedro ou o afinamento do esboço',
      'ponta sem a levantada, ou com degrau para a metade da asa',
      'flap ou aileron fora do vão, sem a fresta, ou atravessando a asa',
      'eixo ou suporte solto, que não segura o comando',
      'vão do flap, do aileron ou do alojamento do trem sem recorte na asa',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  contatos: porLado((L, l, nome) => [
    { par: [`ponta${L}`, `asa${L}`], motivo: `a ponta ${nome} continua a metade da asa` },
    { par: [`eixoFlap${L}`, `flap${L}`], motivo: `o eixo corre na dobradiça do flap ${nome}` },
    { par: [`eixoAileron${L}`, `aileron${L}`], motivo: `o eixo corre na dobradiça do aileron ${nome}` },
    ...[1, 2].flatMap((n) => [
      { par: [`suporteFlap${n}${L}`, `asa${L}`], motivo: `o suporte ${n} do flap ${nome} sai da asa` },
      { par: [`suporteFlap${n}${L}`, `eixoFlap${L}`], motivo: `o suporte ${n} segura o eixo do flap ${nome}` },
      { par: [`suporteAileron${n}${L}`, `asa${L}`], motivo: `o suporte ${n} do aileron ${nome} sai da asa` },
      { par: [`suporteAileron${n}${L}`, `eixoAileron${L}`], motivo: `o suporte ${n} segura o eixo do aileron ${nome}` },
    ]),
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
