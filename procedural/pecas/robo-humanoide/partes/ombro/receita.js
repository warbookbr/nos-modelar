/* robo-humanoide/ombro — disco de junta do ombro direito, preso ao tronco, com os dois eixos perpendiculares de flexão e de abdução.
 *
 * Etapa do braço direito da montagem `../../montagem.json`. O combinado com a pessoa está em `../../ALINHAMENTO.md`, e a caixa
 * planejada e as juntas desta parte estão no esqueleto `../../andaime.json`. A receita só tem o PLANO: nenhum passo de forma foi
 * escrito, e a guarda do acervo avisa disso sem reprovar enquanto a etapa não está fixa.
 *
 * Portas que a receita vai publicar: tronco (anel que apoia, eixo x, face de dentro do disco, para o tronco futuro); flexao (cilindro, eixo x, centro do disco); abducao (cilindro macho, eixo z, centro do disco), onde o braço encaixa.
 *
 * A TABELA está em milímetro e em grau. O valor marcado como proposta não foi fixado pela pessoa e está na lista de decisões do
 * alinhamento; o marcado como vindo por vínculo só vale para ver a parte sozinha. */

export const TABELA = {
  diametroDoDisco: 110,
  espessuraDoDisco: 50, // proposta, a pessoa não fixou
  raioDoEixoDeAbducao: 14, // proposta, a pessoa não fixou
  flexaoMinima: -60,
  flexaoMaxima: 180,
  abducaoMinima: 0,
  abducaoMaxima: 90,
};

export const CONTATOS = [
  {
    "par": [
      "disco",
      "garfoDeAbducao"
    ],
    "motivo": "o garfo de abdução sai do disco e gira com ele na flexão"
  }
];

export const PLANO = {
  "objeto": "ombro direito do robô humanoide de 1.750 mm: disco de junta de 110 mm de diâmetro preso ao tronco, primeira etapa do braço direito, com o eixo de flexão ao longo do disco e o eixo de abdução perpendicular a ele",
  "referencias": [
    "../../referencias/alvo.md",
    "../../referencias/locais/frontal.jpg",
    "../../referencias/locais/traseira.jpg"
  ],
  "escala": {
    "medida": "diâmetro do disco do ombro",
    "milimetros": 110
  },
  "partes": [
    {
      "nome": "disco",
      "forma": "disco de 110 mm de diâmetro, eixo lateral (x), com anel externo, rebaixo e tampa central como nas juntas da referência, arestas com chanfro",
      "tecnica": "revolução de um perfil com degraus e chanfros"
    },
    {
      "nome": "garfoDeAbducao",
      "forma": "garfo curto sob o disco que carrega o eixo de abdução, perpendicular ao do disco e apontado para a frente (z), de onde o braço pende",
      "tecnica": "corpo por laços unido ao disco, com furo passante do eixo e costura arredondada"
    }
  ],
  "criteriosDeReprovacao": [
    "diâmetro do disco diferente de 110 mm em mais de 5%",
    "eixo de abdução que não é perpendicular ao eixo do disco, ou que não cruza o centro do disco",
    "segmento que não gira em torno do centro da sua junta (disco, pino do cotovelo ou anel do punho fora do eixo)",
    "duas partes que se atravessam em qualquer ponto do curso da junta"
  ]
};

const receita = {
  meta: { nome: 'robo-humanoide/ombro', desc: "disco de junta do ombro direito, preso ao tronco, com os dois eixos perpendiculares de flexão e de abdução" },
  PARAMS: TABELA,
  PLANO,
  contatos: CONTATOS,
  PASSOS: [],
};

export default receita;
