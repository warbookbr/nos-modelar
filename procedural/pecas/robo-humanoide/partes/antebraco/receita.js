/* robo-humanoide/antebraco — antebraço direito: casca com duas hastes expostas por baixo, do cotovelo ao punho.
 *
 * Etapa do braço direito da montagem `../../montagem.json`. O combinado com a pessoa está em `../../ALINHAMENTO.md`, e a caixa
 * planejada e as juntas desta parte estão no esqueleto `../../andaime.json`. A receita só tem o PLANO: nenhum passo de forma foi
 * escrito, e a guarda do acervo avisa disso sem reprovar enquanto a etapa não está fixa.
 *
 * Portas que a receita vai publicar: cotovelo (anel, eixo y, no alto), que assenta na saída do cotovelo; punho (cilindro macho, eixo y, 260 mm abaixo), onde o anel do punho gira.
 *
 * A TABELA está em milímetro e em grau. O valor marcado como proposta não foi fixado pela pessoa e está na lista de decisões do
 * alinhamento; o marcado como vindo por vínculo só vale para ver a parte sozinha. */

export const TABELA = {
  comprimentoEntreCentros: 260,
  larguraDaCasca: 85, // proposta
  profundidadeDaCasca: 95, // proposta
  parede: 3, // proposta
  diametroDaHaste: 12, // proposta
  distanciaEntreHastes: 30, // proposta
  raioDoAssentoDoCotovelo: 30, // vem do cotovelo por vínculo
  raioDoPunho: 20, // proposta
};

export const CONTATOS = [
  {
    "par": [
      "casca",
      "estrutura"
    ],
    "motivo": "a casca é presa ao núcleo interno"
  },
  {
    "par": [
      "hasteA",
      "estrutura"
    ],
    "motivo": "os terminais da haste A prendem no núcleo, junto ao cotovelo e junto ao punho"
  },
  {
    "par": [
      "hasteB",
      "estrutura"
    ],
    "motivo": "os terminais da haste B prendem no núcleo, junto ao cotovelo e junto ao punho"
  }
];

export const PLANO = {
  "objeto": "antebraço direito do robô humanoide de 1.750 mm: segmento de 260 mm do centro do cotovelo ao centro do punho, em casca cinza de parede fina aberta por baixo, com duas hastes paralelas expostas",
  "referencias": [
    "../../referencias/alvo.md",
    "../../referencias/locais/frontal.jpg",
    "../../referencias/locais/traseira.jpg"
  ],
  "escala": {
    "medida": "distância do centro do cotovelo ao centro do punho",
    "milimetros": 260
  },
  "partes": [
    {
      "nome": "casca",
      "forma": "casca cinza de parede fina sobre o lado de fora do antebraço, mais larga junto ao cotovelo e afinando até o punho, aberta no lado de dentro",
      "tecnica": "subdivisão de gaiola por estações com espessura e vincos nas bordas"
    },
    {
      "nome": "hasteA",
      "forma": "haste cilíndrica de 12 mm exposta no lado aberto, do cotovelo ao punho",
      "tecnica": "cilindro entre dois pontos com terminal em cada ponta"
    },
    {
      "nome": "hasteB",
      "forma": "segunda haste, paralela à primeira e afastada 30 mm dela",
      "tecnica": "cilindro entre dois pontos com terminal em cada ponta"
    },
    {
      "nome": "estrutura",
      "forma": "núcleo interno do cotovelo ao punho, que segura a casca e os terminais das hastes e termina no assento do anel do punho",
      "tecnica": "corpo de seção variável com assento de revolução na ponta"
    }
  ],
  "criteriosDeReprovacao": [
    "segmento que não gira em torno do centro da sua junta (disco, pino do cotovelo ou anel do punho fora do eixo)",
    "duas partes que se atravessam em qualquer ponto do curso da junta",
    "medida do segmento com mais de 5% de diferença da medida fixada na TABELA",
    "casca sem parede fina visível nas bordas, ou segmento maciço onde deveria haver casca",
    "faltar uma das duas hastes, ou hastes escondidas pela casca",
    "o antebraço entra no braço com o cotovelo dobrado a 140 graus"
  ]
};

const receita = {
  meta: { nome: 'robo-humanoide/antebraco', desc: "antebraço direito: casca com duas hastes expostas por baixo, do cotovelo ao punho" },
  PARAMS: TABELA,
  PLANO,
  contatos: CONTATOS,
  PASSOS: [],
};

export default receita;
