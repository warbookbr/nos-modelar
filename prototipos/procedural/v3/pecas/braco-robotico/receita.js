/* braco-robotico.js — braço industrial fictício de 6 eixos, alcance 850 mm,
 * classe de 5 kg de carga. Peça inteira, e não módulo de um conjunto maior.
 *
 * DE ONDE VÊM OS NÚMEROS. Não há imagem cotada deste robô, porque ele não
 * existe. A tabela é a de um braço real dessa classe: alcance de 850 mm
 * repartido entre braço, antebraço e punho, base de 180 mm de diâmetro e
 * coluna de 160. As três imagens em `referencias/` foram geradas e servem de
 * consulta de FORMA, e não de cota: elas dizem que o punho tem forquilha
 * vazada, que os anéis entre carcaças são peças salientes e que o antebraço
 * sai do flanco da carcaça do cotovelo, e não do topo dela. Onde imagem e
 * tabela discordarem, a tabela manda, e isso já aconteceu uma vez: a lateral
 * põe a razão entre alcance horizontal e altura em 0,73 e a tabela põe em
 * 0,61, porque a imagem tem leve perspectiva e o antebraço dela é
 * proporcionalmente mais comprido do que o de um braço de 850 mm.
 *
 * ESCALA: metros, como o resto do acervo. A tabela é em milímetro porque é
 * assim que cota de robô é publicada, e `m()` converte num lugar só.
 *
 * GEOMETRIA AINDA NÃO ESCRITA. `gerarPassos` devolve lista vazia de propósito:
 * esta receita nasceu na rodada de alinhamento, antes de existir passo, para
 * que o plano e os contatos pudessem ser cobrados por gate antes de qualquer
 * malha. Quem escreve os passos é o modelador, com este plano na mão.
 */

const m = (mm) => mm / 1000;

export const TABELA = {
  baseDiametro: 180,
  baseAltura: 150,
  colunaDiametro: 160,
  colunaAltura: 180,
  bracoComprimento: 380,
  bracoLargura: 130,
  bracoProfundidade: 110,
  cotoveloDesvio: 90,
  antebracoComprimento: 370,
  antebracoDiametroRaiz: 100,
  antebracoDiametroPonta: 85,
  punhoComprimento: 100,
  flangeDiametro: 90,
  flangeEspessura: 12,
  flangeFuros: 8,
  flangeCircunferenciaDeFuros: 65,
  flangeFuroCentral: 35,
};

export function derivar(t = TABELA) {
  /* Os centros de junta são a verdade dimensional desta peça, e cada um sai da
     soma dos elos anteriores. Nenhuma coordenada é digitada à mão: mexer num
     comprimento tem que arrastar tudo o que vem depois dele. */
  const junta2 = [0, 0, m(t.baseAltura + t.colunaAltura)];
  const junta3 = [0, 0, junta2[2] + m(t.bracoComprimento)];
  const punho = [m(t.antebracoComprimento), m(t.cotoveloDesvio), junta3[2]];
  const flange = [punho[0] + m(t.punhoComprimento), punho[1], punho[2]];
  const alcance = m(t.bracoComprimento + t.antebracoComprimento + t.punhoComprimento);
  return { junta2, junta3, punho, flange, alcance };
}

export const ORIGENS = {
  baseDiametro: 'cota de base de braco industrial de 5 kg de carga',
  baseAltura: 'cota de base de braco industrial de 5 kg de carga',
  colunaDiametro: 'cota de coluna giratoria da mesma classe',
  colunaAltura: 'cota de coluna giratoria da mesma classe',
  bracoComprimento: 'reparticao do alcance de 850 mm entre braco, antebraco e punho',
  bracoLargura: 'secao de carcaca de braco da mesma classe',
  bracoProfundidade: 'secao de carcaca de braco da mesma classe',
  cotoveloDesvio: 'desvio lateral do cotovelo visto na referencia de perto',
  antebracoComprimento: 'reparticao do alcance de 850 mm entre braco, antebraco e punho',
  antebracoDiametroRaiz: 'secao de antebraco da mesma classe',
  antebracoDiametroPonta: 'secao de antebraco da mesma classe',
  punhoComprimento: 'reparticao do alcance de 850 mm entre braco, antebraco e punho',
  flangeDiametro: 'padrao de flange de ferramenta da mesma classe',
  flangeEspessura: 'padrao de flange de ferramenta da mesma classe',
  flangeFuros: 'padrao de flange de ferramenta da mesma classe',
  flangeCircunferenciaDeFuros: 'padrao de flange de ferramenta da mesma classe',
  flangeFuroCentral: 'padrao de flange de ferramenta da mesma classe',
};

function gerarPassos() { return []; }

export const receitaBracoRobotico = {
  meta: {
    nome: 'Braço robótico de 6 eixos',
    versao: '0.1.0',
    autor: 'Mecanifica Procedural AI',
    desc: 'braço industrial fictício, alcance 850 mm, classe de 5 kg',
  },

  PARAMS: TABELA,

  ORIGENS,

  PLANO: {
    objeto: 'braco robotico industrial ficticio de 6 eixos, alcance 850 mm, classe de 5 kg, peca inteira',
    referencias: [
      'referencias/lateral.png',
      'referencias/punho.png',
      'referencias/cotovelo.png',
    ],
    escala: { medida: 'alcance do braco esticado, do eixo da coluna ao flange', milimetros: 850 },
    partes: [
      { nome: 'base', forma: 'cilindro chato apoiado no chao, de 180 de diametro e 150 de altura', tecnica: 'cilindro com tampas' },
      { nome: 'coluna', forma: 'cilindro de 160 de diametro que gira sobre a base e sobe ate a junta 2', tecnica: 'cilindro com tampas' },
      { nome: 'braco', forma: 'carcaca de secao retangular que sobe 380 da coluna ate o cotovelo, com topo arredondado', tecnica: 'loft de superelipse ao longo de reta' },
      { nome: 'antebraco', forma: 'cilindro de 370 que sai do flanco da carcaca do cotovelo, afinando de 100 para 85', tecnica: 'loft de secao circular' },
      { nome: 'punho', forma: 'conjunto de 100 com forquilha vazada de lado a lado, onde ficam as juntas 4, 5 e 6', tecnica: 'caixa com rasgo passante mais cilindro interno' },
      { nome: 'flange', forma: 'disco chato de 90 de diametro e 12 de espessura, com oito furos e um furo central', tecnica: 'cilindro com furos booleanos' },
    ],
    criteriosDeReprovacao: [
      'centro da junta 2 fora de (0, 0, 330), tolerancia de 5 mm',
      'centro da junta 3 fora de (0, 0, 710), tolerancia de 5 mm',
      'centro do punho fora de (370, 90, 710), tolerancia de 5 mm',
      'centro do flange fora de (470, 90, 710), tolerancia de 5 mm',
      'base com diametro diferente de 180 mm, tolerancia de 3 mm',
    ],
  },

  /* CONTATOS INTENCIONAIS. Um braço é uma cadeia contínua: cada elo encosta no
     anterior porque é ali que a junta trabalha. Elo que não encosta é braço
     partido, e par que se toca fora desta lista é colisão. */
  contatos: [
    { par: ['base', 'coluna'], motivo: 'a coluna gira apoiada na base, na junta 1' },
    { par: ['braco', 'coluna'], motivo: 'o braco articula no topo da coluna, na junta 2' },
    { par: ['antebraco', 'braco'], motivo: 'o antebraco articula no flanco do braco, na junta 3' },
    { par: ['antebraco', 'punho'], motivo: 'o punho fecha a ponta do antebraco, nas juntas 4, 5 e 6' },
    { par: ['flange', 'punho'], motivo: 'o flange e a saida de ferramenta do punho' },
  ],

  TOPO: {
    origem: 'centro da base no chao; x para a frente, y para a esquerda, z para cima',
    simetria: 'nenhuma: o desvio do cotovelo quebra a simetria bilateral de proposito',
    modulo: 'peça inteira; nenhum módulo separado',
  },

  MATERIAIS: {
    carcacaCinza: { cor: '#c9c9c6', metalicidade: 0.15, aspereza: 0.55 },
    anelEscuro: { cor: '#55585c', metalicidade: 0.75, aspereza: 0.30 },
  },

  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receitaBracoRobotico;
