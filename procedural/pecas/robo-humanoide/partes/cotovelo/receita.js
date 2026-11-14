/* robo-humanoide/cotovelo — cotovelo direito: dobradiça com cilindro, de eixo paralelo ao de flexão do ombro.
 *
 * Etapa do braço direito da montagem `../../montagem.json`. O combinado com a pessoa está em `../../ALINHAMENTO.md`, e a caixa
 * planejada e as juntas desta parte estão no esqueleto `../../andaime.json`. A receita só tem o PLANO: nenhum passo de forma foi
 * escrito, e a guarda do acervo avisa disso sem reprovar enquanto a etapa não está fixa.
 *
 * Portas que a receita vai publicar: pino (cilindro, eixo x, centro do cilindro), que gira no braço; saida (anel, eixo y para baixo), onde o antebraço assenta.
 *
 * A TABELA está em milímetro e em grau. O valor marcado como proposta não foi fixado pela pessoa e está na lista de decisões do
 * alinhamento; o marcado como vindo por vínculo só vale para ver a parte sozinha. */

export const TABELA = {
  diametroDoCilindro: 76, // proposta, a pessoa não fixou
  larguraDoCilindro: 90, // proposta
  raioDoPino: 12, // vem do braço por vínculo; o valor daqui só vale para ver a parte sozinha
  cursoMinimo: 0,
  cursoMaximo: 140,
};

export const CONTATOS = [
  {
    "par": [
      "cilindro",
      "garfo"
    ],
    "motivo": "o garfo de saída é solidário ao cilindro e gira com ele"
  }
];

export const PLANO = {
  "objeto": "cotovelo direito do robô humanoide de 1.750 mm: dobradiça com um cilindro central de eixo lateral, paralelo ao eixo de flexão do ombro, que dobra o antebraço de 0 a 140 graus",
  "referencias": [
    "../../referencias/alvo.md",
    "../../referencias/locais/frontal.jpg",
    "../../referencias/locais/traseira.jpg"
  ],
  "escala": {
    "medida": "diâmetro do cilindro do cotovelo",
    "milimetros": 76
  },
  "partes": [
    {
      "nome": "cilindro",
      "forma": "cilindro de eixo lateral (x) com discos de tampa nas duas faces, como as juntas escuras da referência",
      "tecnica": "revolução de um perfil com degraus e chanfros"
    },
    {
      "nome": "garfo",
      "forma": "garfo que sai do cilindro para baixo e recebe o antebraço, com as duas orelhas abraçando o cilindro",
      "tecnica": "corpo por laços unido ao cilindro, com costura arredondada"
    }
  ],
  "criteriosDeReprovacao": [
    "eixo do cilindro que não é paralelo ao eixo de flexão do ombro",
    "segmento que não gira em torno do centro da sua junta (disco, pino do cotovelo ou anel do punho fora do eixo)",
    "duas partes que se atravessam em qualquer ponto do curso da junta",
    "cotovelo que dobra para trás de 0 grau ou passa de 140 graus sem tocar batente"
  ]
};

const receita = {
  meta: { nome: 'robo-humanoide/cotovelo', desc: "cotovelo direito: dobradiça com cilindro, de eixo paralelo ao de flexão do ombro" },
  PARAMS: TABELA,
  PLANO,
  contatos: CONTATOS,
  PASSOS: [],
};

export default receita;
