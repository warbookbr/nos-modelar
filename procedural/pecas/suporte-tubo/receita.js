/* suporte-tubo — suporte em L de chapa grossa que prende um tubo de 30 mm a uma parede.
 *
 * Duas abas de 6 mm: a aba de parede, vertical, com dois furos oblongos de
 * 8 por 16 mm para parafuso, e a aba do tubo, horizontal, que sai a 90 graus da
 * parede e tem um recorte em arco que abraça o tubo.
 *
 * Referencial do acervo: Y para cima, o chão da peça em y = 0, a parede no plano
 * z = 0 e a peça avançando para +z. A aba de parede ocupa z de 0 a 6; a aba do
 * tubo nasce na face da frente dela (z = 6) e avança até a borda livre. O eixo do
 * tubo é vertical e passa pelo centro do arco do recorte.
 *
 * Cada aba é uma `extrusao` do próprio perfil: a de parede em z, com os dois furos
 * oblongos em contorno por trechos; a do tubo em y, com o contorno por trechos do
 * recorte (reto, concordância de 5 mm, reto e arco tangente de meia volta). As
 * arestas externas arredondam em 3 mm direto sobre cada extrusão, uma chamada de
 * `arredondarAresta` por aresta, cada uma escolhida por `sel.onde` (normal da face e
 * posição extrema), sem número de vértice, face ou aresta. Nas arestas de um mesmo
 * canto o raio e o número de painéis são iguais e elas se encontram a 90 graus, que
 * é a condição para o canto fechar em esquadria.
 *
 * As duas abas ficam como dois sólidos fechados que se encostam em z = 6, e não
 * fundidas por `unir`: a medida por parte e o contato declarado só decidem entre
 * corpos fechados, e a fusão deixa as duas partes abertas. Arredondar cada aba
 * antes de encostá-las também evita o canto composto que a união cria onde a borda
 * de cima da aba do tubo chega à face da frente da aba de parede.
 *
 * As 13 arestas externas arredondam, e a ordem na aba de parede importa: a tampa da
 * frente tem furos e é partida em faces, então as três arestas dela (a borda de cima
 * e as duas laterais) entram antes dos quatro cantos ao longo da espessura; na ordem
 * inversa o núcleo recusa a tampa. A face de trás, que encosta na parede, e a de
 * baixo ficam vivas, e uma chapa de 6 mm não comporta 3 mm de arredondamento nas
 * duas faces da mesma borda. Os furos e o recorte ficam com a aresta viva.
 *
 * As duas bordas livres da face de cima da aba do tubo e o contorno do recorte são uma
 * cadeia só em tangência, de um canto vivo ao outro, arredondada por `cadeia` numa
 * chamada, sem degrau. As duas bordas têm o mesmo extremo em z; a aresta de partida é
 * escolhida pela `regiao` da face de ponta da borda da direita, que sai da tabela, e a
 * cadeia vem antes das laterais e dos cantos livres.
 */

export const TABELA = {
  /* Chapa grossa: as duas abas têm a mesma espessura. */
  espessura: 6,
  /* Aba de parede: largura (x) e altura (y). */
  larguraAbaParede: 80,
  alturaAbaParede: 60,
  /* Furo oblongo de parafuso: 8 mm de largura e 16 mm de comprimento, com o
     comprimento na vertical para permitir ajuste de altura. */
  furoLargura: 8,
  furoComprimento: 16,
  furoEntreCentros: 48,
  furoAlturaDoCentro: 36,
  /* Aba do tubo: largura (x) e saída contada da superfície da parede até a borda livre. */
  larguraAbaTubo: 60,
  saidaAbaTubo: 50,
  /* Tubo que o recorte abraça. Folga zero: o arco tem o raio do tubo. */
  diametroDoTubo: 30,
  folgaDoTubo: 0,
  /* Distância do eixo do tubo até a borda livre, que é também o comprimento da
     parte reta do recorte antes do arco. */
  eixoDoTuboAteBorda: 15,
  /* Concordância nos cantos onde o recorte encontra a borda livre. */
  concordanciaDoRecorte: 5,
  /* Arredondamento das arestas externas. */
  arredondamentoExterno: 3,
  paineisDoArredondamento: 6,
  segmentosArco: 16,
};

const m = (mm) => mm / 1000;

export function derivar(t = TABELA) {
  const e = m(t.espessura);
  const L = m(t.larguraAbaParede);
  const H = m(t.alturaAbaParede);
  const meiaFuro = m(t.furoLargura) / 2;
  const retoDoFuro = m(t.furoComprimento) / 2 - meiaFuro;
  const Lt = m(t.larguraAbaTubo);
  const zFora = m(t.saidaAbaTubo);
  const raioDoRecorte = m(t.diametroDoTubo) / 2 + m(t.folgaDoTubo);
  const zCentroDoArco = zFora - m(t.eixoDoTuboAteBorda);
  const concordancia = m(t.concordanciaDoRecorte);
  /* No perfil de uma extrusão em z, u vai para x e v vai para -y. */
  const furo = (lado) => {
    const cu = lado * m(t.furoEntreCentros) / 2;
    const cv = -m(t.furoAlturaDoCentro);
    return {
      contorno: {
        inicio: [cu + meiaFuro, cv],
        trechos: [
          { reto: [cu + meiaFuro, cv - retoDoFuro] },
          { arcoTangente: [cu - meiaFuro, cv - retoDoFuro] },
          { reto: [cu - meiaFuro, cv + retoDoFuro] },
          { arcoTangente: [cu + meiaFuro, cv + retoDoFuro] },
        ],
      },
    };
  };
  /* A face de ponta de cada trecho livre da borda de fora da aba do tubo: do fim da
     concordância ao canto da aba, na espessura inteira da chapa, com uma folga de
     meio milímetro em torno que não muda a escolha. */
  const folga = m(0.5);
  const pontaLivre = (lado) => {
    const a = lado * (raioDoRecorte + concordancia);
    const b = lado * Lt / 2;
    return {
      min: [Math.min(a, b) - folga, -folga, zFora - folga],
      max: [Math.max(a, b) + folga, e + folga, zFora + folga],
    };
  };
  return {
    e,
    raioDoArredondamento: m(t.arredondamentoExterno),
    abaParede: {
      altura: e,
      perfil: { retangulo: { largura: L, profundidade: H, centro: [0, -H / 2] } },
      furos: [furo(-1), furo(1)],
    },
    abaTubo: {
      altura: e,
      contorno: {
        inicio: [-Lt / 2, e],
        trechos: [
          { reto: [Lt / 2, e] },
          { reto: [Lt / 2, zFora] },
          { reto: [raioDoRecorte, zFora] },
          { concordancia },
          { reto: [raioDoRecorte, zCentroDoArco] },
          { arcoTangente: [-raioDoRecorte, zCentroDoArco] },
          { reto: [-raioDoRecorte, zFora] },
          { concordancia },
          { reto: [-Lt / 2, zFora] },
        ],
      },
      pontaLivre: { direita: pontaLivre(1) },
    },
  };
}

/* Identidade estrutural dos passos, escolhida aqui: as duas extrusões e, de dez em
   dez, os arredondamentos de cada aba. */
const ID = { parede: 1, tubo: 2, arredondaParede: 10, arredondaTubo: 20 };

const NORMAL = { cima: [0, 1, 0], baixo: [0, -1, 0], frente: [0, 0, 1], direita: [1, 0, 0], esquerda: [-1, 0, 0] };

/* As arestas externas que o plano pede arredondadas, cada uma dita por propriedade:
   a normal de uma das faces que a usam e o extremo de um eixo, dentro do que
   `dentro` junta antes (a aba inteira ou a região da face de ponta de uma borda
   livre, onde duas arestas têm o mesmo extremo). A ordem da lista é a ordem dos
   passos: na aba de parede a tampa da frente vem antes dos cantos. */
const ARESTAS_PAREDE = [
  { nome: 'borda lateral direita da frente', normal: 'frente', eixo: 'x', lado: 'max' },
  { nome: 'borda lateral esquerda da frente', normal: 'frente', eixo: 'x', lado: 'min' },
  { nome: 'borda de cima da frente', normal: 'frente', eixo: 'y', lado: 'max' },
  { nome: 'canto de cima à direita', normal: 'cima', eixo: 'x', lado: 'max' },
  { nome: 'canto de cima à esquerda', normal: 'cima', eixo: 'x', lado: 'min' },
  { nome: 'canto de baixo à direita', normal: 'baixo', eixo: 'x', lado: 'max' },
  { nome: 'canto de baixo à esquerda', normal: 'baixo', eixo: 'x', lado: 'min' },
];
const ARESTAS_TUBO = [
  /* A borda livre de cima é uma cadeia só: reto, concordância, reto, semicírculo do recorte, reto, concordância e reto, de um
     canto vivo ao outro. Uma chamada com `cadeia` a arredonda sem degrau, e ela vem antes das laterais e dos cantos livres. */
  { nome: 'borda livre de cima', cadeia: true, dentro: 'pontaDireita', normal: 'cima', eixo: 'z', lado: 'max' },
  { nome: 'borda lateral direita de cima', normal: 'cima', eixo: 'x', lado: 'max' },
  { nome: 'borda lateral esquerda de cima', normal: 'cima', eixo: 'x', lado: 'min' },
  { nome: 'canto livre à direita', normal: 'direita', eixo: 'z', lado: 'max' },
  { nome: 'canto livre à esquerda', normal: 'esquerda', eixo: 'z', lado: 'max' },
];

const idDoArredondamento = (base, aresta, arestas) => base + arestas.indexOf(aresta);

/* Os arredondamentos de cada aba são parte da aba: sem eles a seleção da parte
   e a união deixariam as faixas de fora. */
const doGrupo = (extrusao, base, arestas) => ({
  unir: [
    { origem: { op: 'extrusao', id: extrusao } },
    ...arestas.map((aresta) => ({ origem: { op: 'arredondarAresta', id: idDoArredondamento(base, aresta, arestas) } })),
  ],
});
const soArredondamentos = (base, arestas) => ({
  unir: arestas.map((aresta) => ({ origem: { op: 'arredondarAresta', id: idDoArredondamento(base, aresta, arestas) } })),
});

export const ALIASES = [
  ['abaParede', doGrupo(ID.parede, ID.arredondaParede, ARESTAS_PAREDE)],
  ['abaTubo', doGrupo(ID.tubo, ID.arredondaTubo, ARESTAS_TUBO)],
  ['arredondamentosDaAbaParede', soArredondamentos(ID.arredondaParede, ARESTAS_PAREDE)],
  ['arredondamentosDaAbaTubo', soArredondamentos(ID.arredondaTubo, ARESTAS_TUBO)],
];

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];

  const arredondaAba = (extrusao, base, arestas) => {
    const dentro = {
      padrao: { origem: { op: 'extrusao', id: extrusao } },
      pontaDireita: { regiao: P.abaTubo.pontaLivre.direita },
    };
    for (const aresta of arestas) {
      passos.push(['arredondarAresta', {
        origemId: idDoArredondamento(base, aresta, arestas),
        raio: P.raioDoArredondamento,
        paineis: t.paineisDoArredondamento,
        ...(aresta.cadeia ? { cadeia: true } : {}),
        sel: {
          ...dentro[aresta.dentro ?? 'padrao'],
          onde: { alvo: 'aresta', normal: { dir: NORMAL[aresta.normal], ate: 5 }, extremo: { eixo: aresta.eixo, lado: aresta.lado } },
        },
      }]);
    }
  };

  /* Cada aba sai do próprio perfil e recebe, antes da união, o arredondamento das
     arestas externas, a parte, o material e o sombreamento liso: depois da união a
     face de trás da aba do tubo, que encosta na parede, deixa de existir e uma
     seleção que a cite grita. As faces que a união não toca levam parte, material e
     sombreamento adiante, e as que ela corta herdam da face de origem. */
  const acabamento = (aba, aliasDosPaineis, paredesLisas) => {
    passos.push(['parte', { nome: aba, sel: { alias: aba } }]);
    passos.push(['material', { usa: 'aco', sel: { alias: aba } }]);
    /* O arredondamento sai em painéis; o ângulo de 30 graus os liga numa curva e
       deixa nítidas as quinas de 90 graus. */
    passos.push(['liso', { angulo: 30, sel: { alias: aliasDosPaineis } }]);
    /* As paredes dos furos e do recorte são curvas em facetas: lisas, com as quinas de 90 graus nítidas. */
    passos.push(['liso', { angulo: 30, sel: { origem: paredesLisas } }]);
  };

  passos.push(['extrusao', {
    origemId: ID.parede, eixo: 'z', altura: P.abaParede.altura,
    perfil: P.abaParede.perfil, furos: P.abaParede.furos, segmentosArco: t.segmentosArco,
  }]);
  arredondaAba(ID.parede, ID.arredondaParede, ARESTAS_PAREDE);
  acabamento('abaParede', 'arredondamentosDaAbaParede', { op: 'extrusao', id: ID.parede, parede: 'furos' });
  /* A face de trás da aba de parede, a que encosta na parede, é a de normal -z no
     extremo mínimo de z; ela ganha o material de apoio. */
  passos.push(['material', {
    usa: 'apoio',
    sel: {
      origem: { op: 'extrusao', id: ID.parede },
      onde: { normal: { dir: [0, 0, -1], ate: 5 }, extremo: { eixo: 'z', lado: 'min' } },
    },
  }]);

  passos.push(['extrusao', {
    origemId: ID.tubo, altura: P.abaTubo.altura, perfil: { contorno: P.abaTubo.contorno }, segmentosArco: t.segmentosArco,
  }]);
  arredondaAba(ID.tubo, ID.arredondaTubo, ARESTAS_TUBO);
  acabamento('abaTubo', 'arredondamentosDaAbaTubo', { op: 'extrusao', id: ID.tubo, parede: 'externo' });

  return passos;
}

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(t = TABELA) {
  const meiaParede = t.larguraAbaParede / 2;
  const meiaTubo = t.larguraAbaTubo / 2;
  return [
    { nome: 'canto de baixo da aba de parede', parte: 'abaParede', medida: 'minimo', em: [-meiaParede, 0, 0], toleranciaMm: 0.5 },
    { nome: 'canto de cima da aba de parede', parte: 'abaParede', medida: 'maximo', em: [meiaParede, t.alturaAbaParede, t.espessura], toleranciaMm: 0.5 },
    { nome: 'canto junto à parede da aba do tubo', parte: 'abaTubo', medida: 'minimo', em: [-meiaTubo, 0, t.espessura], toleranciaMm: 0.5 },
    { nome: 'canto da borda livre da aba do tubo', parte: 'abaTubo', medida: 'maximo', em: [meiaTubo, t.espessura, t.saidaAbaTubo], toleranciaMm: 0.5 },
  ];
}

const receita = {
  meta: { nome: 'suporte-tubo', desc: 'suporte em L de chapa grossa que prende um tubo de 30 mm a uma parede' },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS: {
    aco: { cor: '#6b737b', metalicidade: 0.8, aspereza: 0.4 },
    apoio: { cor: '#3f464c', metalicidade: 0.8, aspereza: 0.55 },
  },
  TOPO: { origem: 'canto de baixo da aba de parede, no meio da largura e encostado na parede; y para cima e a aba do tubo avança para +z' },
  PLANO: {
    objeto: 'suporte em L de chapa grossa que prende um tubo de 30 mm de diâmetro a uma parede, com duas abas de 6 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'diâmetro do tubo que o recorte abraça', milimetros: 30 },
    partes: [
      {
        nome: 'abaParede',
        forma: 'chapa vertical de 80 por 60 mm e 6 mm de espessura, com dois furos oblongos de 8 por 16 mm para parafuso, quatro cantos e a borda de cima e as laterais da frente arredondados em 3 mm',
        tecnica: 'extrusão com furos oblongos de contorno por trechos, encostada na aba do tubo, com as arestas externas arredondadas por arredondarAresta escolhida por sel.onde',
      },
      {
        nome: 'abaTubo',
        forma: 'chapa horizontal de 60 mm de largura e 6 mm de espessura que sai a 90 graus da aba de parede, com recorte em arco que abraça o tubo e concordância de 5 mm nos cantos do recorte, e os cantos livres e as bordas de cima arredondados em 3 mm',
        tecnica: 'extrusão de contorno por trechos com reto, arco tangente e concordância, encostada na aba de parede, com as arestas externas arredondadas por arredondarAresta escolhida por sel.onde',
      },
    ],
    criteriosDeReprovacao: [
      'o recorte da aba do tubo não é um arco de 30 mm de diâmetro aberto na borda livre',
      'os furos da aba de parede não são oblongos de 8 por 16 mm',
      'as duas abas não formam um L a 90 graus, ou a aba do tubo sai para o lado da parede',
      'os cantos do recorte na borda livre ficam vivos, sem concordância de 5 mm',
      'canto livre de uma aba com quina viva onde o plano pede arredondamento de 3 mm',
      'a peça fica abaixo do chão ou deitada, fora do referencial de Y para cima',
    ],
  },
  contatos: [
    { par: ['abaParede', 'abaTubo'], motivo: 'a aba do tubo nasce na face da frente da aba de parede, rente à base' },
  ],
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
