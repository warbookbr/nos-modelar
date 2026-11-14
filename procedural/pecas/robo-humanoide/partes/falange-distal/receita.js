/* robo-humanoide/falange-distal — terceira falange, a da ponta do dedo, com a ponta arredondada; a mesma receita serve aos quatro dedos e ao polegar.
 *
 * Etapa do braço direito da montagem `../../montagem.json`. O combinado com a pessoa está em `../../ALINHAMENTO.md`, e a caixa
 * planejada e as juntas desta parte estão no esqueleto `../../andaime.json`. A receita só tem o PLANO: nenhum passo de forma foi
 * escrito, e a guarda do acervo avisa disso sem reprovar enquanto a etapa não está fixa.
 *
 * Portas que a receita vai publicar: raiz (cilindro, eixo do pino), que gira na ponta do elo anterior.
 *
 * A TABELA está em milímetro e em grau. O valor marcado como proposta não foi fixado pela pessoa e está na lista de decisões do
 * alinhamento; o marcado como vindo por vínculo só vale para ver a parte sozinha. */

export const TABELA = {
  comprimento: 19, // proposta: 32, 24 e 19 mm somam os 75 mm do dedo médio
  largura: 18, // proposta
  espessura: 16, // proposta
  raioDoPino: 3, // proposta
  cursoMinimo: 0,
  cursoMaximo: 90,
};

export const CONTATOS = [];

export const PLANO = {
  "objeto": "falange distal dos dedos da mão direita do robô humanoide de 1.750 mm: terceira falange, a da ponta do dedo, com a ponta arredondada, de 19 mm entre eixos, que dobra de 0 a 90 graus para dentro da palma",
  "referencias": [
    "../../referencias/alvo.md",
    "../../referencias/locais/frontal.jpg",
    "../../referencias/locais/traseira.jpg"
  ],
  "escala": {
    "medida": "comprimento entre o eixo da raiz e o eixo ou a ponta da falange",
    "milimetros": 19
  },
  "partes": [
    {
      "nome": "elo",
      "forma": "elo de 19 mm com garfo na raiz e ponta arredondada, costas em casca cinza e face de dentro lisa",
      "tecnica": "corpo de seção variável com o garfo cortado e furo passante do pino"
    }
  ],
  "criteriosDeReprovacao": [
    "falange fundida à vizinha, sem a fresta da junta que as separa",
    "falange que dobra para fora da palma, ou passa de 90 graus",
    "segmento que não gira em torno do centro da sua junta (disco, pino do cotovelo ou anel do punho fora do eixo)",
    "duas partes que se atravessam em qualquer ponto do curso da junta",
    "medida do segmento com mais de 5% de diferença da medida fixada na TABELA"
  ]
};

const receita = {
  meta: { nome: 'robo-humanoide/falange-distal', desc: "terceira falange, a da ponta do dedo, com a ponta arredondada; a mesma receita serve aos quatro dedos e ao polegar" },
  PARAMS: TABELA,
  PLANO,
  contatos: CONTATOS,
  PASSOS: [],
};

export default receita;
