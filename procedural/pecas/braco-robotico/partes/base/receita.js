/* braco-robotico/base — a base do braço robótico, com a caixa lateral.
 *
 * Primeira etapa da montagem `braco-robotico/montagem.json`. O combinado com a
 * pessoa está em `../../ALINHAMENTO.md`; este arquivo traz o PLANO, a TABELA e
 * os contatos, e os passos são escritos pelo modelador.
 *
 * Direções: Y para cima; a vista frontal da bancada, que olha de +Z, é a vista
 * lateral da foto; o braço alcança para +X e a caixa fica em -X.
 *
 * Porta que a receita publica, porque a etapa seguinte nasce dela:
 *   assento — anel que recebe, eixo +Y, centro no meio do topo do corpo, face
 *             inteira do topo. O `anelCintura` senta aqui.
 *
 * Regra das portas de apoio do braço: quem recebe publica a face inteira,
 * de raio interno zero ao raio da face, numa faixa de 5 mm para dentro da
 * peça; quem se apoia publica só a borda de baixo, uma faixa de 10 mm de
 * largura até o raio dela e 5 mm para dentro dela. A montagem confere que a
 * borda inteira está sobre a face, sem fresta e no mesmo eixo.
 */

export const TABELA = {
  raioDoCorpo: 90,
  alturaDoCorpo: 200,
  ladoDoPe: 200,
  alturaDoPe: 20,
  saidaDaCaixa: 50,
  larguraDaCaixa: 90,
  /* A caixa termina este tanto abaixo do topo do corpo. */
  caixaAbaixoDoTopo: 10,
};

const receita = {
  meta: { nome: 'braco-robotico/base', desc: 'base do braço robótico com a caixa lateral' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro do fundo do pé no chão; y para cima, a caixa em -X' },
  PLANO: {
    objeto: 'base do braço robótico industrial, presa no chão, com uma caixa colada no lado esquerdo',
    referencias: ['../../referencias/lateral.png'],
    escala: { medida: 'diâmetro do corpo da base', milimetros: 180 },
    partes: [
      { nome: 'corpo', forma: 'cilindro de revolução em pé, 180 mm de diâmetro e 200 mm de altura, com filete na quina do topo', tecnica: 'revolução com perfil' },
      { nome: 'pe', forma: 'placa quadrada de 200 mm de lado e 20 mm de altura, cantos arredondados vistos de cima e filete na borda', tecnica: 'placa com cantos e bordas arredondados' },
      { nome: 'caixaLateral', forma: 'caixa de cantos arredondados encostada no corpo em -X, 50 mm de saída, apoiada no pé só onde ele existe, 10 mm mais baixa que o corpo, com um botão ou conector na face de fora', tecnica: 'caixa com bordas arredondadas' },
    ],
    criteriosDeReprovacao: [
      'o corpo não é redondo visto de cima',
      'o pé não é quadrado de cantos arredondados visto de cima',
      'quina viva no topo do corpo ou na borda do pé',
      'a caixa solta do corpo, com fresta, ou flutuando acima do pé',
      'a caixa do lado errado: na vista frontal ela fica à esquerda, em -X',
    ],
  },
  contatos: [
    { par: ['corpo', 'pe'], motivo: 'o corpo nasce no centro do pé' },
    { par: ['caixaLateral', 'corpo'], motivo: 'a caixa encosta no corpo sem fresta' },
    { par: ['caixaLateral', 'pe'], motivo: 'a caixa se apoia no pé' },
  ],
  get PASSOS() { return []; },
};

export default receita;
