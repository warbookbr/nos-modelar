/* balcao-de-bar — balcão de bar de madeira: corpo fechado por duas portas de frente, cada uma com moldura, rodapé, tampo que
 * avança sobre o corpo e dois puxadores horizontais, um em cada porta.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente do balcão em +z; o fundo fica em -z e x cresce para a direita
 * de quem olha o balcão de frente. A TABELA, em milímetro, é a única fonte das medidas; `derivar` transforma a tabela em caixas
 * e `gerarPassos` escreve, por parte, a forma (`chamferBox`, `cubo` ou `cilindro`) e a `parte` com o material que a parte usa.
 *
 * Forma e medidas: a base é uma receita externa de balcão de bar convertida em passos (conversão mecânica com alinhamento). Esta
 * reescrita mantém as caixas do tampo, do corpo, do rodapé e das portas da base, com diferença de até 0,4 mm. As molduras e os
 * puxadores mudam, pelos motivos abaixo, e cada mudança está listada com o motivo:
 *  - o balcão é deslocado 43,6 mm em x e 173,5 mm em z, para que o eixo de simetria caia em x 0 e o meio da caixa em z 0, como nas
 *    outras peças do acervo. A base tinha o eixo em x -43,6 e o meio em z -173,5. A forma não muda.
 *  - as duas portas passam a ser espelho exato em torno do eixo, com a mesma moldura em cada uma. Na base, as barras de dentro
 *    tinham 12,4 mm de largura, e as de uma porta não eram o espelho das da outra, com 6,4 mm de diferença. Aqui cada moldura tem
 *    barras de 6 mm, recuadas 30 mm das bordas da porta. As laterais vão de y 135 a 1000, de ponta a ponta, e a base as deixava de
 *    y 141 a 994, com um canto de 6 mm sem barra em cada extremidade. As travessas ficam entre as laterais. Diferenças para a base:
 *    12 mm no comprimento das laterais, 6,4 mm na largura e na posição das barras de dentro.
 *  - os puxadores ficam a 75 mm do eixo, espelhados. A base tinha -125 e +25 mm, ou -81,4 e +68,6 depois do deslocamento, e cada
 *    um se move 6,4 mm. A ponta do puxador continua 15 mm à frente da porta, com 7 mm embutidos, como na base. O cilindro é lido
 *    inteiro, com lateral e as duas tampas, por um alias em `ALIASES`, porque a seleção por origem sozinha leva só a lateral.
 *  - as medidas passam a ser redondas em milímetro: a altura do tampo de 106,6 para 107 mm (0,4 mm), a profundidade do tampo e do
 *    rodapé de 622,2 para 622 mm e a do corpo de 572,2 para 572 mm (0,2 mm cada).
 *  - os nomes das partes passam para camelCase em português (portaEsq, molduraPortaEsqBase, puxadorDir e assim por diante).
 *  - cada parte recebe o material declarado em MATERIAIS. As cores são as da base, como escolha de material por parte, sem PBR novo.
 *
 * Fora essas mudanças, cada caixa e cada posição da base ficam dentro de 0,4 mm depois do deslocamento.
 */

export const TABELA = {
  tampo_meia_x: 523.5,
  tampo_espessura: 117,
  tampo_meia_z: 311,
  tampo_chanfro: 8,

  corpo_meia_x: 498.5,
  corpo_altura: 955,
  corpo_meia_z: 286,
  corpo_chanfro: 5,

  rodape_meia_x: 523.5,
  rodape_altura: 90,
  rodape_meia_z: 311,
  rodape_chanfro: 5,

  porta_largura: 486.5,
  porta_eixo: 248.25,
  porta_z_frente: 311,
  porta_espessura: 25,
  porta_chanfro: 4,

  moldura_recuo_x: 30,
  moldura_recuo_y: 45,
  moldura_barra: 6,
  moldura_espessura: 6,

  puxador_eixo: 75,
  puxador_y: 905,
  puxador_z0: 304,
  puxador_raio: 18,
  puxador_comprimento: 22,
  puxador_lados: 16,
};

/* Caixas em milímetro. Cada uma tem `forma` (chamferBox, cubo ou cilindro) e `material`. Os cubos das molduras não têm chanfro;
 * o cilindro do puxador tem centro em (cx, y) e começa em z0, com o eixo em z. */
export function derivar(T) {
  const caixas = [];
  const corpoY0 = T.rodape_altura;
  const corpoY1 = corpoY0 + T.corpo_altura;
  const tampoY1 = corpoY1 + T.tampo_espessura;
  const portaZ1 = T.porta_z_frente;
  const portaZ0 = portaZ1 - T.porta_espessura;

  /* tampo: sobre o corpo, com 25 mm de balanço aos lados, à frente e atrás */
  caixas.push({
    nome: 'tampo', forma: 'chamferBox', x0: -T.tampo_meia_x, x1: T.tampo_meia_x, y0: corpoY1, y1: tampoY1,
    z0: -T.tampo_meia_z, z1: T.tampo_meia_z, chanfro: T.tampo_chanfro, material: 'madeiraTampo',
  });

  /* corpo: o volume fechado, do topo do rodapé até a face de baixo do tampo */
  caixas.push({
    nome: 'corpo', forma: 'chamferBox', x0: -T.corpo_meia_x, x1: T.corpo_meia_x, y0: corpoY0, y1: corpoY1,
    z0: -T.corpo_meia_z, z1: T.corpo_meia_z, chanfro: T.corpo_chanfro, material: 'madeiraCorpo',
  });

  /* rodapé: faixa do chão até o topo do rodapé, com a mesma frente e o mesmo fundo do tampo */
  caixas.push({
    nome: 'rodape', forma: 'chamferBox', x0: -T.rodape_meia_x, x1: T.rodape_meia_x, y0: 0, y1: corpoY0,
    z0: -T.rodape_meia_z, z1: T.rodape_meia_z, chanfro: T.rodape_chanfro, material: 'madeiraRodape',
  });

  /* portas: duas folhas na frente do corpo, com a face de trás encostada na face de frente do corpo, e a folha esquerda e a
   * direita espelhadas em torno do eixo, com um vão de 10 mm no meio */
  for (const [lado, cx] of [['Esq', -T.porta_eixo], ['Dir', +T.porta_eixo]]) {
    caixas.push({
      nome: `porta${lado}`, forma: 'chamferBox', x0: cx - T.porta_largura / 2, x1: cx + T.porta_largura / 2,
      y0: corpoY0, y1: corpoY1, z0: portaZ0, z1: portaZ1, chanfro: T.porta_chanfro, material: 'madeiraPorta',
    });
  }

  /* molduras: a mesma moldura em cada porta, com barras de 6 mm embutidas 6 mm na face de frente da porta. As laterais vão de
   * ponta a ponta da moldura e as travessas de cima e de baixo ficam entre elas. */
  const molduraMeiaX = T.porta_largura / 2 - T.moldura_recuo_x;
  const barraCentroX = molduraMeiaX - T.moldura_barra / 2;
  const travessaMeiaX = molduraMeiaX - T.moldura_barra;
  const molduraY0 = corpoY0 + T.moldura_recuo_y;
  const molduraY1 = corpoY1 - T.moldura_recuo_y;
  const molduraZ0 = portaZ1 - T.moldura_espessura;
  for (const [lado, cx] of [['Esq', -T.porta_eixo], ['Dir', +T.porta_eixo]]) {
    const moldura = (nome, x0, x1, y0, y1) => ({
      nome, forma: 'cubo', x0, x1, y0, y1, z0: molduraZ0, z1: portaZ1, material: 'madeiraMoldura',
    });
    caixas.push(moldura(`molduraPorta${lado}Base`, cx - travessaMeiaX, cx + travessaMeiaX, molduraY0, molduraY0 + T.moldura_barra));
    caixas.push(moldura(`molduraPorta${lado}Topo`, cx - travessaMeiaX, cx + travessaMeiaX, molduraY1 - T.moldura_barra, molduraY1));
    caixas.push(moldura(`molduraPorta${lado}LadoEsq`, cx - barraCentroX - T.moldura_barra / 2, cx - barraCentroX + T.moldura_barra / 2, molduraY0, molduraY1));
    caixas.push(moldura(`molduraPorta${lado}LadoDir`, cx + barraCentroX - T.moldura_barra / 2, cx + barraCentroX + T.moldura_barra / 2, molduraY0, molduraY1));
  }

  /* puxadores: cilindros horizontais de 36 mm de diâmetro, com a face de trás embutida 7 mm na porta e a ponta 15 mm à frente */
  for (const [lado, sinal] of [['Esq', -1], ['Dir', +1]]) {
    caixas.push({
      nome: `puxador${lado}`, forma: 'cilindro', cx: sinal * T.puxador_eixo, y: T.puxador_y, z0: T.puxador_z0,
      raio: T.puxador_raio, comprimento: T.puxador_comprimento, lados: T.puxador_lados, material: 'madeiraMoldura',
    });
  }

  return caixas;
}

const m = (mm) => mm / 1000;

/* O cilindro inteiro é a lateral mais as duas tampas; sem `tampa`, a origem leva só as laterais. O alias dá nome a essa união. */
const ALIAS_DO_CILINDRO = (nome) => `${nome}Inteiro`;
export const ALIASES = derivar(TABELA).flatMap((c, i) => (c.forma !== 'cilindro' ? [] : [[ALIAS_DO_CILINDRO(c.nome), { unir: [
  { origem: { op: 'cilindro', id: i + 1 } },
  { origem: { op: 'cilindro', id: i + 1, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id: i + 1, tampa: 'topo' } },
] }]]));

/** Os PASSOS: uma forma por parte, em metro, com a `parte` e o `material` logo depois. `em` é o centro em x e z e a base em y,
 *  e no cilindro é o centro da face de trás, com o eixo em z. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((c, i) => {
    const id = i + 1;
    const sel = () => (c.forma === 'cilindro' ? { alias: ALIAS_DO_CILINDRO(c.nome) } : { origem: { op: c.forma, id } });
    if (c.forma === 'cilindro') {
      passos.push(['cilindro', {
        origemId: id, raio: m(c.raio), altura: m(c.comprimento), lados: c.lados, eixo: 'z', em: [m(c.cx), m(c.y), m(c.z0)],
      }]);
    } else if (c.forma === 'cubo') {
      passos.push(['cubo', {
        origemId: id, larg: m(c.x1 - c.x0), alt: m(c.y1 - c.y0), prof: m(c.z1 - c.z0),
        em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)],
      }]);
    } else {
      passos.push(['chamferBox', {
        origemId: id, larg: m(c.x1 - c.x0), alt: m(c.y1 - c.y0), prof: m(c.z1 - c.z0), chanfro: m(c.chanfro),
        em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)],
      }]);
    }
    passos.push(['parte', { nome: c.nome, sel: sel() }]);
    passos.push(['material', { sel: sel(), usa: c.material }]);
  });
  return passos;
}

/* Os contatos por face do balcão: cada par se toca pela face indicada no motivo, ou embute o que o motivo diz. */
const PORTAS = ['portaEsq', 'portaDir'];
const MOLDURAS = ['molduraPortaEsqBase', 'molduraPortaEsqTopo', 'molduraPortaEsqLadoEsq', 'molduraPortaEsqLadoDir',
  'molduraPortaDirBase', 'molduraPortaDirTopo', 'molduraPortaDirLadoEsq', 'molduraPortaDirLadoDir'];
export const CONTATOS = [
  { par: ['rodape', 'corpo'], motivo: 'a face de cima do rodapé encosta na face de baixo do corpo, e o rodapé fica sob o corpo inteiro' },
  { par: ['corpo', 'tampo'], motivo: 'a face de baixo do tampo assenta na face de cima do corpo, e o tampo avança 25 mm aos lados e à frente' },
  { par: ['portaEsq', 'corpo'], motivo: 'a face de trás da porta esquerda encosta na face de frente do corpo, na metade esquerda' },
  { par: ['portaDir', 'corpo'], motivo: 'a face de trás da porta direita encosta na face de frente do corpo, na metade direita' },
  ...PORTAS.map((p) => ({ par: [p, 'tampo'], motivo: 'a face de cima da porta encosta na face de baixo do tampo, sem atravessá-lo' })),
  ...PORTAS.map((p) => ({ par: [p, 'rodape'], motivo: 'a face de baixo da porta assenta na face de cima do rodapé' })),
  ...MOLDURAS.map((nome) => ({ par: [nome, nome.includes('PortaEsq') ? 'portaEsq' : 'portaDir'], motivo: 'a moldura embute 6 mm na face de frente da porta, sem atravessar a folha' })),
  ...['Esq', 'Dir'].flatMap((lado) => [
    { par: [`molduraPorta${lado}Base`, `molduraPorta${lado}LadoEsq`], motivo: 'a travessa de baixo encosta na face interna da barra lateral esquerda, sem atravessá-la' },
    { par: [`molduraPorta${lado}Base`, `molduraPorta${lado}LadoDir`], motivo: 'a travessa de baixo encosta na face interna da barra lateral direita, sem atravessá-la' },
    { par: [`molduraPorta${lado}Topo`, `molduraPorta${lado}LadoEsq`], motivo: 'a travessa de cima encosta na face interna da barra lateral esquerda, sem atravessá-la' },
    { par: [`molduraPorta${lado}Topo`, `molduraPorta${lado}LadoDir`], motivo: 'a travessa de cima encosta na face interna da barra lateral direita, sem atravessá-la' },
  ]),
  { par: ['puxadorEsq', 'portaEsq'], motivo: 'o puxador embute 7 mm na face de frente da porta esquerda e sai 15 mm à frente' },
  { par: ['puxadorDir', 'portaDir'], motivo: 'o puxador embute 7 mm na face de frente da porta direita e sai 15 mm à frente' },
];

const receita = {
  meta: { nome: 'balcao-de-bar', desc: 'balcão de bar de madeira, com corpo fechado por duas portas com molduras, rodapé, tampo e dois puxadores' },
  PARAMS: TABELA,
  MATERIAIS: {
    madeiraCorpo: { cor: '#542808', metalicidade: 0, aspereza: 0.8 },
    madeiraTampo: { cor: '#582e12', metalicidade: 0, aspereza: 0.8 },
    madeiraRodape: { cor: '#784218', metalicidade: 0, aspereza: 0.8 },
    madeiraPorta: { cor: '#562a0a', metalicidade: 0, aspereza: 0.8 },
    madeiraMoldura: { cor: '#3c1c06', metalicidade: 0, aspereza: 0.8 },
  },
  TOPO: { origem: 'chão, no meio do balcão em x e em z; y para cima e a frente do balcão em +z' },
  PLANO: {
    objeto: 'balcão de bar de madeira de 1047 mm de largura, 622 mm de profundidade e 1152 mm de altura, com corpo fechado por duas portas com molduras, rodapé, tampo e dois puxadores horizontais',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total do balcão', milimetros: 1152 },
    familia: 'movel-de-caixa',
    partes: [
      { nome: 'tampo', forma: 'tampo de 1047 por 107 por 622 mm, chanfro de 8 mm, de y 1045 a 1152', tecnica: 'chamferBox assentada na face de cima do corpo, com balanço de 25 mm aos lados e à frente' },
      { nome: 'corpo', forma: 'caixa de 997 por 955 por 572 mm, chanfro de 5 mm, de y 90 a 1045', tecnica: 'chamferBox sobre o rodapé, com a face de frente em z 286' },
      { nome: 'rodape', forma: 'faixa de 1047 por 90 por 622 mm, chanfro de 5 mm, do chão a y 90', tecnica: 'chamferBox sob o corpo, com a face de cima encostada na face de baixo do corpo' },
      { nome: 'portaEsq', forma: 'folha de 486,5 por 955 por 25 mm, chanfro de 4 mm, na metade esquerda da frente do corpo', tecnica: 'chamferBox com a face de trás na face de frente do corpo, de x -491,5 a -5' },
      { nome: 'portaDir', forma: 'folha de 486,5 por 955 por 25 mm, chanfro de 4 mm, na metade direita da frente do corpo', tecnica: 'chamferBox com a face de trás na face de frente do corpo, de x 5 a 491,5' },
      { nome: 'molduraPortaEsqBase', forma: 'barra de 414,5 por 6 por 6 mm, na parte de baixo da porta esquerda', tecnica: 'cubo embutido 6 mm na face de frente da porta, entre as barras laterais' },
      { nome: 'molduraPortaEsqTopo', forma: 'barra de 414,5 por 6 por 6 mm, na parte de cima da porta esquerda', tecnica: 'cubo embutido 6 mm na face de frente da porta, entre as barras laterais' },
      { nome: 'molduraPortaEsqLadoEsq', forma: 'barra de 6 por 865 por 6 mm, na borda externa da porta esquerda', tecnica: 'cubo embutido 6 mm na face de frente da porta, de y 135 a 1000' },
      { nome: 'molduraPortaEsqLadoDir', forma: 'barra de 6 por 865 por 6 mm, na borda interna da porta esquerda', tecnica: 'cubo embutido 6 mm na face de frente da porta, de y 135 a 1000' },
      { nome: 'molduraPortaDirBase', forma: 'barra de 414,5 por 6 por 6 mm, na parte de baixo da porta direita', tecnica: 'cubo embutido 6 mm na face de frente da porta, entre as barras laterais' },
      { nome: 'molduraPortaDirTopo', forma: 'barra de 414,5 por 6 por 6 mm, na parte de cima da porta direita', tecnica: 'cubo embutido 6 mm na face de frente da porta, entre as barras laterais' },
      { nome: 'molduraPortaDirLadoEsq', forma: 'barra de 6 por 865 por 6 mm, na borda interna da porta direita', tecnica: 'cubo embutido 6 mm na face de frente da porta, de y 135 a 1000' },
      { nome: 'molduraPortaDirLadoDir', forma: 'barra de 6 por 865 por 6 mm, na borda externa da porta direita', tecnica: 'cubo embutido 6 mm na face de frente da porta, de y 135 a 1000' },
      { nome: 'puxadorEsq', forma: 'cilindro de 36 mm de diâmetro e 22 mm de comprimento, no eixo z, a 75 mm do eixo, à altura de y 905', tecnica: 'cilindro com o eixo em z, começando em z 304, embutido 7 mm na porta esquerda' },
      { nome: 'puxadorDir', forma: 'cilindro de 36 mm de diâmetro e 22 mm de comprimento, no eixo z, a 75 mm do eixo, à altura de y 905', tecnica: 'cilindro com o eixo em z, começando em z 304, embutido 7 mm na porta direita' },
    ],
    criteriosDeReprovacao: [
      'o balcão não toca o chão pelo rodapé, ou o corpo não assenta sobre o rodapé',
      'o tampo não assenta sobre o corpo, ou não avança à frente e aos lados do corpo',
      'uma porta atravessa o corpo ou o tampo em vez de encostar na face de frente',
      'um lado do balcão difere do outro em medida ou posição de peça',
      'uma moldura ou um puxador não fica na face de frente da porta, ou o puxador não está a 75 mm do eixo',
    ],
  },
  contatos: CONTATOS,
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
