/* robo-humanoide/punho — punho direito: anel que gira em torno do antebraço e carrega o eixo de flexão da mão.
 *
 * Etapa do braço direito da montagem `../../montagem.json`. O combinado com a pessoa está em `../../ALINHAMENTO.md`, e a caixa
 * planejada e as juntas desta parte estão no esqueleto `../../andaime.json`. A receita só tem o PLANO: nenhum passo de forma foi
 * escrito, e a guarda do acervo avisa disso sem reprovar enquanto a etapa não está fixa.
 *
 * Portas que a receita vai publicar: antebraco (cilindro fêmea, eixo y), que gira no antebraço; flexao (cilindro, eixo x, nas orelhas), onde a palma gira.
 *
 * A TABELA está em milímetro e em grau. O valor marcado como proposta não foi fixado pela pessoa e está na lista de decisões do
 * alinhamento; o marcado como vindo por vínculo só vale para ver a parte sozinha. */

export const TABELA = {
  diametroExterno: 64, // proposta, a pessoa não fixou
  alturaDoAnel: 30, // proposta
  raioDoFuro: 20, // vem do antebraço por vínculo
  raioDoEixoDeFlexao: 6, // proposta
  rotacaoMinima: -90,
  rotacaoMaxima: 90,
  flexaoMinima: -60,
  flexaoMaxima: 60,
};

export const CONTATOS = [];

export const PLANO = {
  "objeto": "punho direito do robô humanoide de 1.750 mm: anel que gira de -90 a 90 graus em torno do eixo do antebraço e carrega o eixo de flexão da mão, de -60 a 60 graus",
  "referencias": [
    "../../referencias/alvo.md",
    "../../referencias/locais/frontal.jpg",
    "../../referencias/locais/traseira.jpg"
  ],
  "escala": {
    "medida": "diâmetro externo do anel do punho",
    "milimetros": 64
  },
  "partes": [
    {
      "nome": "anel",
      "forma": "anel de eixo ao longo do antebraço, com chanfro nas bordas e duas orelhas para baixo que carregam o eixo de flexão da mão, perpendicular ao do anel",
      "tecnica": "revolução de um perfil com furo, unida às orelhas com furo passante"
    }
  ],
  "criteriosDeReprovacao": [
    "anel fora do eixo do antebraço",
    "eixo de flexão da mão que não é perpendicular ao eixo do anel",
    "segmento que não gira em torno do centro da sua junta (disco, pino do cotovelo ou anel do punho fora do eixo)",
    "duas partes que se atravessam em qualquer ponto do curso da junta"
  ]
};

const receita = {
  meta: { nome: 'robo-humanoide/punho', desc: "punho direito: anel que gira em torno do antebraço e carrega o eixo de flexão da mão" },
  PARAMS: TABELA,
  PLANO,
  contatos: CONTATOS,
  PASSOS: [],
};

export default receita;
