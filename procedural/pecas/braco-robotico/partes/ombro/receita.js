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
  alturaDoEixo: 95,
  raioDoTambor: 95,
  espessuraDoTambor: 60,
  /* Distância, em Z, do eixo vertical da cintura até a face da frente do
     tambor. */
  avancoDaFace: 130,
};

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
      { nome: 'tambor', forma: 'disco grosso de eixo Z na ponta do pescoço, bem mais largo que o tubo, face da frente plana com filete na borda', tecnica: 'revolução com perfil' },
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
  get PASSOS() { return []; },
};

export default receita;
