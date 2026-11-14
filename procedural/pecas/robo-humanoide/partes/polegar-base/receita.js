/* robo-humanoide/polegar-base — base do polegar direito: elo que gira no eixo inclinado da palma e leva as duas falanges do polegar para fora do plano dos dedos.
 *
 * Etapa do braço direito da montagem `../../montagem.json`. O combinado com a pessoa está em `../../ALINHAMENTO.md`, e a caixa
 * planejada e as juntas desta parte estão no esqueleto `../../andaime.json`. A receita só tem o PLANO: nenhum passo de forma foi
 * escrito, e a guarda do acervo avisa disso sem reprovar enquanto a etapa não está fixa.
 *
 * Portas que a receita vai publicar: raiz (cilindro, no eixo inclinado da palma); ponta (cilindro), onde a falange proximal do polegar gira.
 *
 * A TABELA está em milímetro e em grau. O valor marcado como proposta não foi fixado pela pessoa e está na lista de decisões do
 * alinhamento; o marcado como vindo por vínculo só vale para ver a parte sozinha. */

export const TABELA = {
  comprimentoEntreEixos: 40, // proposta
  largura: 24, // proposta
  espessura: 22, // proposta
  raioDoPino: 3, // proposta
  cursoMinimo: 0,
  cursoMaximo: 90,
};

export const CONTATOS = [];

export const PLANO = {
  "objeto": "base do polegar da mão direita do robô humanoide de 1.750 mm: elo curto que gira no eixo inclinado da saída da palma e carrega as duas falanges do polegar fora do plano dos outros dedos",
  "referencias": [
    "../../referencias/alvo.md",
    "../../referencias/locais/frontal.jpg",
    "../../referencias/locais/traseira.jpg"
  ],
  "escala": {
    "medida": "comprimento entre os dois eixos da base do polegar",
    "milimetros": 40
  },
  "partes": [
    {
      "nome": "base",
      "forma": "elo curto com garfo nas duas pontas, a de trás no eixo inclinado da palma e a da frente no eixo da primeira falange do polegar",
      "tecnica": "corpo de seção variável com os dois garfos cortados e furos passantes"
    }
  ],
  "criteriosDeReprovacao": [
    "polegar no mesmo plano dos outros dedos",
    "segmento que não gira em torno do centro da sua junta (disco, pino do cotovelo ou anel do punho fora do eixo)",
    "duas partes que se atravessam em qualquer ponto do curso da junta"
  ]
};

const receita = {
  meta: { nome: 'robo-humanoide/polegar-base', desc: "base do polegar direito: elo que gira no eixo inclinado da palma e leva as duas falanges do polegar para fora do plano dos dedos" },
  PARAMS: TABELA,
  PLANO,
  contatos: CONTATOS,
  PASSOS: [],
};

export default receita;
