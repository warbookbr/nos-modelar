/* braco-robotico/ombro — o ombro do braço robótico, em forma de cotovelo de
 * cano, sobre o anel da cintura.
 *
 * Terceira etapa da montagem `braco-robotico/montagem.json`. O combinado com a
 * pessoa está em `../../ALINHAMENTO.md`, e o rascunho dela em
 * `../../referencias/ombro-rascunho-*.png`; os passos são escritos pelo
 * modelador. O raio do pescoço vem da porta `topo` do anel, por vínculo da
 * montagem.
 *
 * Portas que a receita publica:
 *   apoio        — anel que ocupa, eixo +Y, centro no meio da boca de baixo
 *                  do pescoço, borda de baixo do pescoço. Senta no `topo`
 *                  do anel.
 *   juntaDoOmbro — cilindro, eixo +Z, centro no meio da face da frente do
 *                  tambor, raio do tambor. O `braco` se prende aqui.
 *
 * Regra das portas de apoio do braço: quem recebe publica a face inteira,
 * de raio interno zero ao raio da face, numa faixa de 5 mm para dentro da
 * peça; quem se apoia publica só a borda de baixo, uma faixa de 10 mm de
 * largura até o raio dela e 5 mm para dentro dela. A montagem confere que a
 * borda inteira está sobre a face, sem fresta e no mesmo eixo.
 */

export const TABELA = {
  raioDoPescoco: 105,
  /* Trecho reto do pescoço, acima do anel, antes da curva. */
  alturaReta: 30,
  /* Altura do eixo do tambor acima da boca de baixo do pescoço. */
  alturaDoEixo: 120,
  raioDoTambor: 120,
  espessuraDoTambor: 80,
  /* Distância, em Z, do eixo vertical da cintura até a face da frente do
     tambor. */
  avancoDaFace: 150,
  /* Acabamento, escolhido pelo modelador. */
  /* Chanfro da borda de baixo do pescoço; com o chanfro do anel forma a linha
     escura de divisão. */
  chanfroDoPescoco: 2,
  /* Raio da linha de centro da curva; menor que o raio do pescoço, a dobra de
     dentro fica enterrada no tambor. */
  raioDaCurva: 100,
  /* Quanto o pescoço entra nas costas do tambor depois da curva. */
  entradaNoTambor: 10,
  fileteDoTambor: 8,
  estacoesDaCurva: 12,
  lados: 48,
};

const m = (mm) => mm / 1000;
const ID = { pescoco: 100, tambor: 200 };

export function derivar(t = TABELA) {
  const R = m(t.raioDoPescoco);
  const a = m(t.alturaReta);
  const Rc = m(t.raioDaCurva);
  const yEixo = m(t.alturaDoEixo);
  const Rt = m(t.raioDoTambor);
  const e = m(t.espessuraDoTambor);
  const zFace = m(t.avancoDaFace);
  const zCostas = zFace - e;
  const c = m(t.chanfroDoPescoco);
  const f = m(t.fileteDoTambor);
  /* Centro da curva: o trecho reto sobe até a, a curva gira 90 graus em torno
     de um eixo X em (y = a, z = Rc); a boca de cima fica em y = a + Rc. */
  const yBoca = a + Rc;
  const zFim = Rc + m(t.entradaNoTambor);
  return { R, a, Rc, yEixo, Rt, e, zFace, zCostas, c, f, yBoca, zFim };
}

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const { R, a, Rc, Rt, e, zFace, zCostas, c, f, yBoca, zFim, yEixo } = P;
  const passos = [];
  const secoes = [
    { pos: [0, 0, 0], raio: 0 },
    { pos: [0, 0.0004, 0], raio: R - c },
    { pos: [0, c, 0], raio: R },
    { pos: [0, a, 0], raio: R },
  ];
  const n = t.estacoesDaCurva;
  for (let i = 1; i <= n; i++) {
    const th = (Math.PI / 2) * (i / n);
    secoes.push({ pos: [0, a + Rc * Math.sin(th), Rc - Rc * Math.cos(th)], raio: R });
  }
  secoes.push({ pos: [0, yBoca, zFim], raio: R });
  secoes.push({ pos: [0, yBoca, zFim + 0.0004], raio: 0 });
  passos.push(['loft', { origemId: ID.pescoco, secoes, lados: t.lados, orientacao: [1, 0, 0] }]);
  passos.push(['parte', { nome: 'pescoco', sel: { origem: { op: 'loft', id: ID.pescoco } } }]);
  passos.push(['lathe', {
    origemId: ID.tambor, eixo: 'z', lados: t.lados, segmentosCurva: 4, em: [0, yEixo, zCostas],
    perfil: [[0, 0], [Rt, 0, f], [Rt, e, f], [0, e]],
  }]);
  passos.push(['parte', { nome: 'tambor', sel: { origem: { op: 'lathe', id: ID.tambor } } }]);
  passos.push(['publicarPorta', {
    nome: 'apoio', de: { op: 'loft', id: ID.pescoco },
    interface: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['publicarPorta', {
    nome: 'juntaDoOmbro', de: { op: 'lathe', id: ID.tambor },
    interface: { forma: 'cilindro', papel: 'externa', eixo: [0, 0, 1], centro: [0, yEixo, zFace], raio: Rt, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['liso', { sel: { origem: { op: 'loft', id: ID.pescoco } } }]);
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.tambor } } }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/ombro', desc: 'ombro em cotovelo de cano do braço robótico' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro da boca de baixo do pescoço; y para cima, a face do tambor para +Z' },
  PLANO: {
    objeto: 'ombro do braço robótico: gira com a cintura e carrega a junta do ombro, de eixo horizontal',
    referencias: [
      '../../referencias/lateral.png',
      '../../referencias/ombro-rascunho-frente.png',
      '../../referencias/ombro-rascunho-lado.png',
      '../../referencias/ombro-rascunho-perspectiva.png',
      '../../referencias/ombro-rascunho-tras.png',
    ],
    escala: { medida: 'diâmetro do anel da cintura, onde o pescoço assenta', milimetros: 180 },
    partes: [
      { nome: 'pescoco', forma: 'cilindro com o diâmetro do anel que sobe reto uns 30 mm e faz uma curva de 90 graus para +Z com o lado de fora arredondado', tecnica: 'tubo por caminho curvo' },
      { nome: 'tambor', forma: 'disco grosso de eixo Z na ponta da curva, 240 mm de diâmetro e 80 mm de espessura, quase encostando no anel, face da frente plana com filete na borda', tecnica: 'revolução com perfil' },
    ],
    criteriosDeReprovacao: [
      'tambor fino como chapa, em vez de grosso',
      'pescoço alto, deixando o tambor visivelmente afastado do anel',
      'face do tambor que não aponta para +Z, com o eixo fora da horizontal',
      'curva de 90 graus com canto vivo por fora',
      'ombro fora do eixo vertical da cintura',
    ],
  },
  contatos: [
    { par: ['pescoco', 'tambor'], motivo: 'o pescoço termina dentro das costas do tambor' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
