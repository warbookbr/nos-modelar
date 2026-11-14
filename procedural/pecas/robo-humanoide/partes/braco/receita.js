/* robo-humanoide/braco — braço direito: casca cinza com painel escuro, do centro do ombro ao centro do cotovelo.
 *
 * Etapa do braço direito da montagem `../../montagem.json`. O combinado com a pessoa está em `../../ALINHAMENTO.md`, e a caixa
 * planejada e as juntas desta parte estão no esqueleto `../../andaime.json`. A receita só tem o PLANO: nenhum passo de forma foi
 * escrito, e a guarda do acervo avisa disso sem reprovar enquanto a etapa não está fixa.
 *
 * Portas que a receita vai publicar: ombro (cilindro fêmea, eixo z, no alto), que encaixa no eixo de abdução do ombro; cotovelo (cilindro, eixo x, 300 mm abaixo), onde o cotovelo gira.
 *
 * A TABELA está em milímetro e em grau. O valor marcado como proposta não foi fixado pela pessoa e está na lista de decisões do
 * alinhamento; o marcado como vindo por vínculo só vale para ver a parte sozinha. */

export const TABELA = {
  comprimentoEntreCentros: 300,
  larguraDaCasca: 100, // proposta
  profundidadeDaCasca: 115, // proposta
  parede: 3, // proposta
  vaoDoPainel: 2, // proposta
  raioDoFuroDeAbducao: 14, // vem do ombro por vínculo; o valor daqui só vale para ver a parte sozinha
  raioDoPinoDoCotovelo: 12, // proposta
};

export const CONTATOS = [
  {
    "par": [
      "casca",
      "estrutura"
    ],
    "motivo": "a casca é presa à haste interna que liga as duas juntas"
  },
  {
    "par": [
      "casca",
      "painel"
    ],
    "motivo": "o painel escuro é vizinho da casca cinza, separado dela só pela costura"
  }
];

export const PLANO = {
  "objeto": "braço direito do robô humanoide de 1.750 mm: segmento de 300 mm do centro do ombro ao centro do cotovelo, em casca cinza de parede fina com um painel escuro separado por costura",
  "referencias": [
    "../../referencias/alvo.md",
    "../../referencias/locais/frontal.jpg",
    "../../referencias/locais/traseira.jpg"
  ],
  "escala": {
    "medida": "distância do centro do ombro ao centro do cotovelo",
    "milimetros": 300
  },
  "partes": [
    {
      "nome": "casca",
      "forma": "casca cinza de parede fina que envolve o segmento, mais larga no alto, junto ao ombro, e afinando até o cotovelo, com a borda de cima e a de baixo abertas mostrando a espessura",
      "tecnica": "subdivisão de gaiola por laços aberta nas duas pontas, com espessura e vincos nas bordas"
    },
    {
      "nome": "painel",
      "forma": "painel escuro liso na face de dentro e de trás do braço, separado da casca por um vão constante de costura",
      "tecnica": "painel cortado da mesma casca por linha de vão, com material escuro liso da paleta"
    },
    {
      "nome": "estrutura",
      "forma": "haste interna que liga o furo do eixo de abdução, no alto, ao garfo do pino do cotovelo, embaixo, e segura a casca",
      "tecnica": "corpo por laços com furos passantes nas duas pontas"
    }
  ],
  "criteriosDeReprovacao": [
    "segmento que não gira em torno do centro da sua junta (disco, pino do cotovelo ou anel do punho fora do eixo)",
    "duas partes que se atravessam em qualquer ponto do curso da junta",
    "medida do segmento com mais de 5% de diferença da medida fixada na TABELA",
    "casca sem parede fina visível nas bordas, ou segmento maciço onde deveria haver casca",
    "painel escuro feito só como cor, sem costura ou degrau de borda que o separe da casca cinza",
    "o antebraço entra no braço com o cotovelo dobrado a 140 graus"
  ]
};

const receita = {
  meta: { nome: 'robo-humanoide/braco', desc: "braço direito: casca cinza com painel escuro, do centro do ombro ao centro do cotovelo" },
  PARAMS: TABELA,
  PLANO,
  contatos: CONTATOS,
  PASSOS: [],
};

export default receita;
