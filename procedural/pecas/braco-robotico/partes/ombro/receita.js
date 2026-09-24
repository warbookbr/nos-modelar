/* braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura:
 * um colar redondo, um corpo com planta em "D" e o tambor da junta.
 *
 * Terceira etapa da montagem `braco-robotico/montagem.json`. O combinado com a
 * pessoa está em `../../ALINHAMENTO.md`, e o rascunho dela em
 * `../../referencias/ombro-rascunho2-*.png`; os passos são escritos pelo
 * modelador. O raio do colar vem da porta `topo` do anel, por vínculo da
 * montagem, e o corpo segue esse raio.
 *
 * A forma anterior, um cotovelo de cano, foi reprovada pela pessoa depois de
 * três rodadas; as duas julgadas estão em `rodadas/` como histórico.
 *
 * Portas que a receita publica:
 *   apoio        — anel que ocupa, eixo +Y, centro no meio da face de baixo do
 *                  colar, borda de baixo do colar. Senta no `topo` do anel.
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
  raioDoColar: 105,
  alturaDoColar: 30,
  /* Distância, em Z, do eixo vertical da cintura até a face plana do bloco
     da frente do corpo, onde o tambor encosta. */
  frenteDoBloco: 125,
  /* Altura do topo plano do corpo, medida da face de baixo do colar. */
  alturaDoTopo: 240,
  /* A rampa de trás começa no eixo vertical e desce, abaulada, até esta
     altura na borda de trás. */
  alturaDaRampaAtras: 120,
  raioDoTambor: 150,
  espessuraDoTambor: 40,
  /* Altura do eixo do tambor, no meio da face do bloco. */
  alturaDoEixo: 135,
};

const receita = {
  meta: { nome: 'braco-robotico/ombro', desc: 'ombro do braço robótico: colar, corpo em D e tambor' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro da face de baixo do colar; y para cima, a face do tambor para +Z' },
  PLANO: {
    objeto: 'ombro do braço robótico: gira com a cintura e carrega a junta do ombro, de eixo horizontal',
    referencias: [
      '../../referencias/lateral.png',
      '../../referencias/ombro-rascunho2-arame-costas.png',
      '../../referencias/ombro-rascunho2-arame-lado.png',
      '../../referencias/ombro-rascunho2-arame-perspectiva.png',
      '../../referencias/ombro-rascunho2-arame-tras.png',
      '../../referencias/ombro-rascunho2-colar-e-corpo.png',
      '../../referencias/ombro-rascunho2-corpo-cima.png',
      '../../referencias/ombro-rascunho2-corpo-frente.png',
      '../../referencias/ombro-rascunho2-corpo-lado.png',
    ],
    escala: { medida: 'diâmetro do anel da cintura, onde o colar assenta', milimetros: 210 },
    partes: [
      { nome: 'colar', forma: 'cilindro baixo, 30 mm, com o diâmetro do anel e chanfro na borda de cima; o topo tem o diâmetro do corpo e os dois parecem uma peça só', tecnica: 'revolução com perfil' },
      { nome: 'corpo', forma: 'bloco com planta em D, reto na frente e redondo atrás no raio do colar; topo plano, face da frente plana 20 mm além do colar, rampa abaulada descendo atrás', tecnica: 'cruzamento de silhueta lateral e planta' },
      { nome: 'tambor', forma: 'disco de eixo Z encostado na face plana do corpo, 300 mm de diâmetro e 40 mm de espessura, cobrindo a face quadrada inteira vista de frente', tecnica: 'revolução com perfil' },
    ],
    criteriosDeReprovacao: [
      'quinas da face quadrada do corpo aparecendo atrás do tambor na vista de frente',
      'colar com diâmetro diferente do anel ou do corpo, formando degrau na junção',
      'corpo redondo na frente, ou quadrado atrás, invertendo a planta em D',
      'rampa de trás reta ou côncava, ou topo do corpo que não é plano',
      'face do tambor que não aponta para +Z, ou eixo fora da horizontal',
      'parte de uma peça aparecendo por baixo ou por trás de outra onde não deveria',
    ],
  },
  contatos: [
    { par: ['colar', 'corpo'], motivo: 'o corpo sai do topo do colar, com o mesmo diâmetro atrás' },
    { par: ['corpo', 'tambor'], motivo: 'o tambor encosta na face plana da frente do corpo' },
  ],
  get PASSOS() { return []; },
};

export default receita;
