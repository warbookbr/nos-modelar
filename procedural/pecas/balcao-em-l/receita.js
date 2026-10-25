/* balcao-em-l — balcão de canto em L, como uma peça só por camada: o contorno em L de seis pontos é desenhado uma vez por camada e extrudado na
 * vertical com `extrusao`, de y0 a y1. Não há dois blocos por camada e nenhuma emenda dentro de uma camada.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente do balcão em +z. O braço longo corre em x, de -450 a 500 mm, e fica atrás, em z
 * de -450 a 115 mm. O braço curto corre em z, da face interna do braço longo até a frente (z 500), e fica à esquerda, em x de -450 a 95 mm.
 * A origem está em metro, com z para cima e a frente em -y; a conversão é z_núcleo = -y_origem e y_núcleo = z_origem. A TABELA é em milímetro, a
 * única fonte das medidas; `derivar` transforma a tabela em camadas, e `gerarPassos` escreve uma `extrusao` por camada, com a parte nomeada logo
 * depois.
 *
 * Camadas, de baixo para cima: rodapeBase (y 0 a 20, 12 mm para fora e 27 mm para dentro do contorno do corpo), rodape (y 20 a 100, 15 mm para
 * dentro), corpo (y 100 a 1100) e tampo (y 1100 a 1200, 15 mm para dentro). "Para fora" é a face que dá para o exterior do L; "para dentro" é a
 * face que dá para o canto aberto, entre os dois braços. Nas faces externas, o tampo e o rodape ficam no mesmo plano do corpo.
 *
 * Origem: receita de externo de balcão de canto (quatro camadas em oito caixas), convertida em `tools/mecanifica/fixtures/receita-externa-balcoes`.
 * As oito caixas da origem começam o rodapé em y 0, por baixo da placa de base; aqui o rodapé começa em y 20, sobre a placa, para não haver
 * sobreposição. A caixa total é a mesma da origem: x -462 a 512, y 0 a 1200, z -462 a 512.
 */

export const TABELA = {
  canto_x: -450,                  // x da face de fora do L, à esquerda (vale para o corpo)
  canto_z: -450,                  // z da face de trás do braço longo (vale para o corpo)
  braco_longo_comprimento: 950,   // em x, de canto_x até a face de fora na ponta do braço longo (500)
  braco_longo_largura: 565,       // em z, de canto_z até a face interna do braço longo (115)
  braco_curto_largura: 545,       // em x, de canto_x até a face interna do braço curto (95)
  braco_curto_comprimento: 385,   // em z, da face interna do braço longo até a frente (500)

  rodape_base_altura: 20,
  rodape_base_fora: 12,
  rodape_base_dentro: 27,

  rodape_altura: 80,
  rodape_fora: 0,
  rodape_dentro: 15,

  corpo_altura: 1000,

  tampo_altura: 100,
  tampo_fora: 0,
  tampo_dentro: 15,
};

/* Os seis pontos do contorno em L, em [x, z] de milímetro, no sentido do contorno do corpo: canto de trás-esquerda, trás-direita, a ponta do braço
 * longo, a quina interna, a ponta do braço curto e a frente-esquerda. `fora` afasta as faces externas do L e `dentro` as faces internas. */
export function contornoEmL(T, { fora, dentro }) {
  const x0 = T.canto_x - fora;
  const z0 = T.canto_z - fora;
  const x1 = T.canto_x + T.braco_longo_comprimento + fora;
  const zInterno = T.canto_z + T.braco_longo_largura + dentro;
  const xInterno = T.canto_x + T.braco_curto_largura + dentro;
  const z1 = T.canto_z + T.braco_longo_largura + T.braco_curto_comprimento + fora;
  return [[x0, z0], [x1, z0], [x1, zInterno], [xInterno, zInterno], [xInterno, z1], [x0, z1]];
}

/* Camadas em milímetro: { nome, pontos (o contorno em [x, z]), y0, y1 }. */
export function derivar(T) {
  const rodapeBaseY1 = T.rodape_base_altura;
  const rodapeY0 = rodapeBaseY1;
  const rodapeY1 = rodapeY0 + T.rodape_altura;
  const corpoY0 = rodapeY1;
  const corpoY1 = corpoY0 + T.corpo_altura;
  const tampoY0 = corpoY1;
  const tampoY1 = tampoY0 + T.tampo_altura;

  return [
    { nome: 'rodapeBase', pontos: contornoEmL(T, { fora: T.rodape_base_fora, dentro: T.rodape_base_dentro }), y0: 0, y1: rodapeBaseY1 },
    { nome: 'rodape', pontos: contornoEmL(T, { fora: T.rodape_fora, dentro: T.rodape_dentro }), y0: rodapeY0, y1: rodapeY1 },
    { nome: 'corpo', pontos: contornoEmL(T, { fora: 0, dentro: 0 }), y0: corpoY0, y1: corpoY1 },
    { nome: 'tampo', pontos: contornoEmL(T, { fora: T.tampo_fora, dentro: T.tampo_dentro }), y0: tampoY0, y1: tampoY1 },
  ];
}

const m = (mm) => mm / 1000;

/** Os PASSOS: uma `extrusao` por camada, do contorno em L em [x, z] de metro, de y0 a y1, com a parte nomeada logo depois. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((c, i) => {
    const id = i + 1;
    passos.push(['extrusao', {
      origemId: id,
      altura: m(c.y1 - c.y0),
      perfil: c.pontos.map(([x, z]) => [m(x), m(z)]),
      em: [0, m(c.y0), 0],
    }]);
    passos.push(['parte', { nome: c.nome, sel: { origem: { op: 'extrusao', id } } }]);
  });
  return passos;
}

/* Os contatos entre camadas: cada par se toca em um plano horizontal e nenhum se atravessa. */
export const CONTATOS = [
  { par: ['rodapeBase', 'rodape'], motivo: 'a face de cima da placa de base, de y 20, recebe a face de baixo do rodape, que fica dentro do contorno da placa' },
  { par: ['rodape', 'corpo'], motivo: 'a face de cima do rodape, de y 100, recebe a face de baixo do corpo, que tem o mesmo contorno externo' },
  { par: ['corpo', 'tampo'], motivo: 'a face de cima do corpo, de y 1100, recebe a face de baixo do tampo, que passa 15 mm para dentro do corpo' },
];

const receita = {
  meta: { nome: 'balcao-em-l', desc: 'balcão de canto em L, de quatro camadas extrudadas do mesmo contorno em L, com tampo de 15 mm de balanço interno' },
  PARAMS: TABELA,
  MATERIAIS: {
    madeira: { cor: '#3a2a1e', metalicidade: 0, aspereza: 0.7 },
  },
  TOPO: { origem: 'chão, no canto de trás-esquerda do balcão; y para cima e a frente do balcão em +z' },
  PLANO: {
    objeto: 'balcão de canto em L de 950 mm no braço longo, 545 mm no braço curto e 1200 mm de altura total, com tampo de 100 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total do balcão', milimetros: 1200 },
    partes: [
      { nome: 'rodapeBase', forma: 'placa em L de 20 mm de altura, 12 mm para fora e 27 mm para dentro do contorno do corpo', tecnica: 'extrusao do contorno em L de seis pontos, de y 0 a 20 mm' },
      { nome: 'rodape', forma: 'faixa em L de 80 mm de altura, 15 mm para dentro do contorno do corpo', tecnica: 'extrusao do contorno em L de seis pontos, de y 20 a 100 mm, sobre a placa de base' },
      { nome: 'corpo', forma: 'bloco em L de 1000 mm de altura, com braço longo de 950 por 565 mm e braço curto de 545 por 385 mm', tecnica: 'extrusao do contorno em L de seis pontos, de y 100 a 1100 mm' },
      { nome: 'tampo', forma: 'tampo em L de 100 mm de altura, 15 mm para dentro do contorno do corpo', tecnica: 'extrusao do contorno em L de seis pontos, de y 1100 a 1200 mm' },
    ],
    criteriosDeReprovacao: [
      'alguma camada não é um sólido só, com linha de emenda entre dois blocos',
      'alguma camada não tem o contorno em L de seis pontos, ou o braço longo e o braço curto não se encontram em esquadria',
      'a caixa total não fica em x -462 a 512, y 0 a 1200 e z -462 a 512',
      'o tampo não passa 15 mm para dentro do corpo nas faces internas, ou o balanço aparece na face externa',
    ],
  },
  contatos: CONTATOS,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
