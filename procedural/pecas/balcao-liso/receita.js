/* balcao-liso — balcão liso de três partes: um rodapé no chão, um corpo sobre ele e um tampo sobre o corpo, todos caixas retas sem
 * chanfro.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente do balcão em +z; x cresce para a direita de quem olha o balcão de
 * frente. A TABELA, em milímetro, é a única fonte das medidas; `derivar` transforma a tabela em caixas e `gerarPassos` escreve, por
 * parte, a `cubo`, a `parte` com o nome e o `material` que a parte usa.
 *
 * Encaixes: o rodapé fica no chão, de y 0 a 80; o corpo assenta na face de cima do rodapé, de y 80 a 835; o tampo assenta na face de
 * cima do corpo, de y 835 a 885. O tampo passa 20 mm do corpo em x dos dois lados e em z à frente, e 10 mm em z atrás. O rodapé fica
 * dentro da projeção do corpo.
 *
 * Origem: a base é `balcao_baixo_simples`, convertida de receita de externo (caixas em z para cima) para o referencial do acervo,
 * com z_núcleo = -y_origem e y_núcleo = z_origem. Medidas da base, em metro, com diferença máxima de 0,5 mm na caixa de cada parte e na
 * caixa total (x -505 a 495, y 0 a 885, z -445 a 130). Nenhuma medida foi mudada.
 *
 * Decisões. (1) Forma: as três partes são `cubo`, sem chanfro, como na base; a base não tem chanfro e um chanfro de 0 mm não entra no
 * passo. (2) Centro em x: a base está 5 mm para -x, e centrar em zero desviaria 5 mm, acima da tolerância; por isso o centro em x
 * fica em `centro_x`, com -5. (3) Profundidade: a base não é centrada em z (o centro fica em z -160 a -165); mantida. (4) Materiais: a
 * base dá só o nome `liso` a cada parte e nenhuma cor; a cor usada é a de `balcao-em-l` e precisa de confirmação.
 */

export const TABELA = {
  centro_x: -5,

  rodape_largura: 930,
  rodape_altura: 80,
  rodape_z0: -425,
  rodape_z1: 95,

  corpo_largura: 960,
  corpo_altura: 755,
  corpo_z0: -435,
  corpo_z1: 110,

  tampo_largura: 1000,
  tampo_espessura: 50,
  tampo_z0: -445,
  tampo_z1: 130,
};

/* Caixas em milímetro: { nome, x0, x1, y0, y1, z0, z1, material }. */
export function derivar(T) {
  const rodapeY0 = 0;
  const rodapeY1 = rodapeY0 + T.rodape_altura;
  const corpoY0 = rodapeY1;
  const corpoY1 = corpoY0 + T.corpo_altura;
  const tampoY0 = corpoY1;
  const tampoY1 = tampoY0 + T.tampo_espessura;

  const caixa = (largura) => ({ x0: T.centro_x - largura / 2, x1: T.centro_x + largura / 2 });

  return [
    { nome: 'rodape', ...caixa(T.rodape_largura), y0: rodapeY0, y1: rodapeY1, z0: T.rodape_z0, z1: T.rodape_z1, material: 'liso' },
    { nome: 'corpo', ...caixa(T.corpo_largura), y0: corpoY0, y1: corpoY1, z0: T.corpo_z0, z1: T.corpo_z1, material: 'liso' },
    { nome: 'tampo', ...caixa(T.tampo_largura), y0: tampoY0, y1: tampoY1, z0: T.tampo_z0, z1: T.tampo_z1, material: 'liso' },
  ];
}

const m = (mm) => mm / 1000;

/** Os PASSOS: uma `cubo` por parte, em metro. `em` é o centro em x e z e a base em y. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((c, i) => {
    const id = i + 1;
    const sel = { origem: { op: 'cubo', id } };
    passos.push(['cubo', {
      origemId: id,
      larg: m(c.x1 - c.x0),
      alt: m(c.y1 - c.y0),
      prof: m(c.z1 - c.z0),
      em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)],
    }]);
    passos.push(['parte', { nome: c.nome, sel }]);
    passos.push(['material', { sel, usa: c.material }]);
  });
  return passos;
}

/* Os contatos entre as partes: cada par se toca na face de cima ou de baixo e nenhum se atravessa. */
export const CONTATOS = [
  { par: ['rodape', 'corpo'], motivo: 'a face de cima do rodapé, em y 80, recebe a face de baixo do corpo, que cobre a projeção do rodapé' },
  { par: ['corpo', 'tampo'], motivo: 'a face de cima do corpo, em y 835, recebe a face de baixo do tampo, que passa 20 mm do corpo em x e à frente' },
];

const receita = {
  meta: { nome: 'balcao-liso', desc: 'balcão liso de três partes: rodapé, corpo e tampo, todos caixas retas' },
  PARAMS: TABELA,
  MATERIAIS: {
    liso: { cor: '#3a2a1e', metalicidade: 0, aspereza: 0.7 },
  },
  TOPO: { origem: 'chão, 5 mm para -x do meio do balcão (centro_x -5); y para cima e a frente do balcão em +z' },
  PLANO: {
    objeto: 'balcão liso de 1000 mm de largura, 575 mm de profundidade e 885 mm de altura, com tampo de 50 mm sobre um corpo e um rodapé recuado',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total do balcão', milimetros: 885 },
    familia: 'movel-de-caixa',
    partes: [
      { nome: 'rodape', forma: 'caixa de 930 por 80 por 520 mm, no chão, dentro da projeção do corpo', tecnica: 'cubo no chão, de y 0 a 80' },
      { nome: 'corpo', forma: 'caixa de 960 por 755 por 545 mm, de y 80 a 835', tecnica: 'cubo sobre o rodapé' },
      { nome: 'tampo', forma: 'tampo de 1000 por 50 por 575 mm, de y 835 a 885, com balanço de 20 mm em x e à frente', tecnica: 'cubo sobre o corpo' },
    ],
    criteriosDeReprovacao: [
      'o rodapé não fica no chão ou o corpo não assenta sobre ele',
      'o tampo não assenta sobre o corpo em y 835, ou o balanço do tampo não é de 20 mm em x e à frente',
      'alguma parte sai da caixa total de x -505 a 495, y 0 a 885 e z -445 a 130',
      'alguma parte é maciça onde o plano prometeu caixa, ou tem chanfro que o plano não pede',
    ],
  },
  contatos: CONTATOS,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
