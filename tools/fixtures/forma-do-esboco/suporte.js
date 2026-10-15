/* suporte.js — a receita de prova da conferência da forma contra o esboço.
 *
 * Um bloco de 200 por 100 por 120 mm com um furo passante de 60 mm de diâmetro e, acima dele, uma viga de 300 por 40 por 60 mm inclinada
 * 30 graus em z. `bloco.esboco.json` desenha as duas formas (o furo é o recorte de um cilindro) e `andaime.json` reserva uma caixa para
 * cada uma, folgada o bastante para o envelope do `REFINA` aprovar também as variantes defeituosas, de modo que só a razão de volume
 * contra o esboço as recuse. Cada pasta ao lado (`ok`, `sem-recorte`, `menor`, `deslocada`, `viga-reta`, `minimo-proprio`) é uma receita
 * de uma linha que chama esta função com um defeito diferente; `deslocada-declarada` é o bloco deslocado de propósito, com o
 * deslocamento e o motivo declarados e o envelope em 5 mm.
 *
 * ELA NÃO É CONTEÚDO. Mora em `tools/fixtures/`, fora do acervo publicado; `guarda:acervo` não a varre. */

const m = (mm) => mm / 1000;

export function receitaDoBloco({
  /* o furo recortado do bloco (false entrega o bloco inteiro) */
  furo = true,
  /* o bloco encolhido nesta escala em torno do centro dele */
  escala = 1,
  /* o bloco deslocado em x, em milímetro */
  deslocamentoX = 0,
  /* o giro da viga em z, em graus (30 é o do esboço) */
  graus = 30,
  /* REFINA.esboco.minimo e as formas de cada parte (o mínimo próprio de uma parte vai em `formas`) */
  minimo = 0.99,
  formas = { bloco: 'bloco', viga: 'viga' },
  /* o que mais sobrescrever em REFINA.esboco */
  esboco = {},
  /* REFINA.tolerancia: folgada por padrão, de modo que só a razão de volume recuse; a prova do deslocamento a aperta para 5 mm */
  tolerancia = { envelope: 50, porta: 0.5 },
} = {}) {
  const largura = 200 * escala;
  const altura = 100 * escala;
  const profundidade = 120 * escala;
  const passos = [
    ['cubo', { origemId: 1, larg: m(largura), alt: m(altura), prof: m(profundidade), em: [m(deslocamentoX), m(50 - 50 * escala), 0] }],
  ];
  if (furo) {
    passos.push(
      ['cilindro', { origemId: 2, raio: m(30), altura: m(160), lados: 128, em: [m(30 + deslocamentoX), m(-30), 0] }],
      ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'cubo', id: 1 } }, { alias: 'furoInteiro' }] }],
      ['parte', { nome: 'bloco', sel: { origem: { op: 'subtrair', id: 3 } } }],
    );
  } else {
    passos.push(['parte', { nome: 'bloco', sel: { origem: { op: 'cubo', id: 1 } } }]);
  }
  passos.push(
    ['cubo', { origemId: 4, larg: m(300), alt: m(40), prof: m(60), em: [0, m(380), 0] }],
    ['rotaciona', { eixo: 'z', graus, pivo: [0, m(400), 0], sel: { origem: { op: 'cubo', id: 4 } } }],
    ['parte', { nome: 'viga', sel: { origem: { op: 'cubo', id: 4 } } }],
  );
  return {
    meta: { nome: 'forma-do-esboco/bloco', desc: 'bloco furado e viga inclinada, para provar a conferência da forma contra o esboço' },
    TOPO: { origem: 'centro da base do bloco, no chão; y para cima' },
    PLANO: {
      objeto: 'bloco com um furo passante e uma viga inclinada acima dele, para provar a conferência da forma contra o esboço',
      referencias: ['../andaime.json', '../bloco.esboco.json'],
      escala: { medida: 'largura do bloco', milimetros: 200 },
      partes: [
        { nome: 'bloco', forma: 'caixa de 200 por 100 por 120 mm com um furo passante de 60 mm de diâmetro, 30 mm para o lado +x', tecnica: 'caixa menos cilindro' },
        { nome: 'viga', forma: 'caixa de 300 por 40 por 60 mm girada 30 graus em z, com o centro 400 mm acima do chão', tecnica: 'caixa girada' },
      ],
      criteriosDeReprovacao: [
        'o bloco sem o furo, menor ou deslocado em relação à forma do esboço',
        'a viga sem a inclinação do esboço',
      ],
    },
    REFINA: {
      andaime: '../andaime.json',
      esboco: { arquivo: '../bloco.esboco.json', opcao: 1, formas, minimo, ...esboco },
      partes: { bloco: 'bloco', viga: 'viga' },
      tolerancia,
    },
    /* o cilindro do furo só fecha com as duas tampas, e a subtração exige sólido fechado */
    ALIASES: furo
      ? [['furoInteiro', { unir: [{ origem: { op: 'cilindro', id: 2 } }, { origem: { op: 'cilindro', id: 2, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: 2, tampa: 'topo' } }] }]]
      : [],
    PASSOS: passos,
  };
}
