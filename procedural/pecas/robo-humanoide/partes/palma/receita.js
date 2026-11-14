/* robo-humanoide/palma — palma da mão direita: placa de 90 mm de largura com os nós dos quatro dedos e a saída inclinada do polegar.
 *
 * Etapa do braço direito da montagem `../../montagem.json`. O combinado com a pessoa está em `../../ALINHAMENTO.md`, e a caixa
 * planejada e as juntas desta parte estão no esqueleto `../../andaime.json`. A receita só tem o PLANO: nenhum passo de forma foi
 * escrito, e a guarda do acervo avisa disso sem reprovar enquanto a etapa não está fixa.
 *
 * Portas que a receita vai publicar: punho (cilindro, eixo x), que gira nas orelhas do punho; noIndicador, noMedio, noAnelar e noMinimo (cilindros, eixo z, na linha dos nós); noPolegar (cilindro de eixo inclinado).
 *
 * A TABELA está em milímetro e em grau. O valor marcado como proposta não foi fixado pela pessoa e está na lista de decisões do
 * alinhamento; o marcado como vindo por vínculo só vale para ver a parte sozinha. */

export const TABELA = {
  largura: 90,
  comprimentoDoPunhoAosNos: 115, // proposta: dos 190 mm da mão, 115 para a palma e 75 para o dedo médio
  espessura: 28, // proposta
  passoEntreDedos: 22, // proposta
  raioDoPino: 3, // proposta
  inclinacaoDoEixoDoPolegar: 45, // proposta: a pessoa disse inclinado, sem o ângulo
};

export const CONTATOS = [
  {
    "par": [
      "placa",
      "saidaDoPolegar"
    ],
    "motivo": "a saída do polegar é um ressalto da própria placa"
  }
];

export const PLANO = {
  "objeto": "palma da mão direita do robô humanoide de 1.750 mm: placa de 90 mm de largura e 115 mm do centro do punho à linha dos nós, com um nó para cada um dos quatro dedos e a saída do polegar em eixo inclinado",
  "referencias": [
    "../../referencias/alvo.md",
    "../../referencias/locais/frontal.jpg",
    "../../referencias/locais/traseira.jpg"
  ],
  "escala": {
    "medida": "largura da palma",
    "milimetros": 90
  },
  "partes": [
    {
      "nome": "placa",
      "forma": "placa de 90 mm de largura, mais espessa junto ao punho, com as costas cobertas por casca cinza e a face de dentro lisa, terminando em quatro nós de dobradiça em linha",
      "tecnica": "corpo por fatias com os nós de garfo cortados e furo passante dos pinos"
    },
    {
      "nome": "saidaDoPolegar",
      "forma": "ressalto na borda da frente da palma, perto do punho, com o eixo do polegar inclinado em relação ao plano da palma",
      "tecnica": "corpo por laços unido à placa, com furo passante inclinado"
    }
  ],
  "criteriosDeReprovacao": [
    "largura da palma diferente de 90 mm em mais de 5%",
    "saída do polegar no mesmo plano dos quatro dedos",
    "menos de quatro nós de dedo na borda da palma",
    "segmento que não gira em torno do centro da sua junta (disco, pino do cotovelo ou anel do punho fora do eixo)",
    "duas partes que se atravessam em qualquer ponto do curso da junta"
  ]
};

const receita = {
  meta: { nome: 'robo-humanoide/palma', desc: "palma da mão direita: placa de 90 mm de largura com os nós dos quatro dedos e a saída inclinada do polegar" },
  PARAMS: TABELA,
  PLANO,
  contatos: CONTATOS,
  PASSOS: [],
};

export default receita;
