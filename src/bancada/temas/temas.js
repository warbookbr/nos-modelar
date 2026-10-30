/* temas.js — os temas da bancada: Foco, Bancada e Revisão, cada um declarado como dados.
 *
 * Os três temas usam os mesmos componentes e o mesmo estado; um tema só decide a aparência e onde cada componente fica
 * (decisão 4 do plano das visões e da interface). Por isso um tema é uma declaração, e não código:
 *
 *   `cores`      o conjunto de cores de `sistema-visual.css` (`claro` ou `escuro`), escrito em `data-cores` na raiz;
 *   `arrumacao`  a arrumação da folha de estilo (`foco` ou `classica`), escrita em `data-arrumacao` na raiz;
 *   `lugares`    para cada componente móvel (`data-movel` na página), o lugar (`data-lugar`) para onde ele vai; o que o
 *                tema não cita fica onde a página o pôs;
 *   `rotulos`    o texto de um controle que muda de nome no tema (`data-rotulo` na página);
 *   `paineis`    os painéis que o tema deixa abrir e se eles nascem abertos, e a largura de cada um, que a regra dos 70%
 *                da cena usa para recolher um quando o outro abre (`paineis-do-tema.js`);
 *   `cena`       o que o tema muda na cena 3D (fundo, grade, sombra e contorno da seleção), ou `null` para a cena de antes.
 *
 * O módulo não toca a página: o componente `componentes/tema.js` lê esta tabela e arruma a página. */

export const TEMA_PADRAO = 'foco';

export const TEMAS = Object.freeze([
  Object.freeze({
    id: 'foco',
    rotulo: 'Foco',
    descricao: 'Clara, a peça na tela inteira e os controles em painéis flutuantes.',
    cores: 'claro',
    arrumacao: 'foco',
    lugares: Object.freeze({
      abrir: 'topo-peca',
      juntas: 'topo-peca',
      controles: 'topo-direita',
      estado: 'topo-direita',
      projecao: 'barra-cena',
      'seletor-visao': 'barra-cena',
      enquadrar: 'barra-cena',
      'preferencias-cena': 'popover-cena',
      explosao: 'popover-cena',
      'regua-metrica': 'barra-estado',
      'rodape-juntas': 'barra-edicao',
    }),
    rotulos: Object.freeze({
      juntas: 'Editar', 'titulo-partes': 'Partes', 'aba-inspecao': 'Seleção', 'aba-referencias': 'Referência', 'aba-anotacoes': 'Notas',
    }),
    paineis: Object.freeze({
      partes: Object.freeze({ abertoAoNascer: false, largura: 240 }),
      inspecao: Object.freeze({ abertoAoNascer: false, largura: 272 }),
    }),
    cena: Object.freeze({ fundo: '--cena', grade: '--linha-forte', gradeEsmaecida: true, sombraSuave: true, contornoDaSelecao: '--destaque' }),
  }),
  Object.freeze({
    id: 'bancada',
    rotulo: 'Bancada',
    descricao: 'Escura, com os painéis fixos dos lados.',
    cores: 'escuro',
    arrumacao: 'classica',
    lugares: Object.freeze({}),
    rotulos: Object.freeze({}),
    paineis: null,
    cena: null,
  }),
  /* O Revisão é a proposta C sem a faixa de decisão: a cena dividida entre a peça e a referência, cada uma com um
     cabeçalho fino, a árvore plana encostada à esquerda e o painel da direita encostado do outro lado quando abre. A
     mesa da comparação (`componentes/mesa-de-revisao.js`) só existe onde o tema lhe dá lugar, e é este o tema que dá;
     os outros componentes são os do Foco, noutros lugares. A barra da cena desce para o pé da mesa, com focar e copiar
     a vista ao lado de enquadrar. */
  Object.freeze({
    id: 'revisao',
    rotulo: 'Revisão',
    descricao: 'Clara, a peça e a referência lado a lado, com a mesma câmera.',
    cores: 'claro',
    arrumacao: 'revisao',
    lugares: Object.freeze({
      'mesa-comparacao': 'mesa',
      abrir: 'topo-peca',
      juntas: 'topo-peca',
      controles: 'topo-direita',
      estado: 'topo-direita',
      projecao: 'barra-cena',
      'seletor-visao': 'barra-cena',
      enquadrar: 'barra-cena',
      focar: 'barra-cena',
      'copiar-vista': 'barra-cena',
      'preferencias-cena': 'popover-cena',
      explosao: 'popover-cena',
      'regua-metrica': 'barra-estado',
      'rodape-juntas': 'barra-edicao',
    }),
    rotulos: Object.freeze({
      juntas: 'Editar', 'titulo-partes': 'Partes', 'aba-inspecao': 'Seleção', 'aba-referencias': 'Referência', 'aba-anotacoes': 'Notas',
      focar: 'Focar', 'copiar-vista': 'Copiar vista',
    }),
    paineis: Object.freeze({
      partes: Object.freeze({ abertoAoNascer: true, largura: 240 }),
      inspecao: Object.freeze({ abertoAoNascer: false, largura: 272 }),
    }),
    cena: Object.freeze({ fundo: '--cena', grade: '--linha-forte', gradeEsmaecida: true, sombraSuave: true, contornoDaSelecao: '--destaque' }),
  }),
]);

/** O tema de `id`, ou o padrão quando o id não é de tema nenhum. */
export function temaPorId(id) {
  return TEMAS.find((tema) => tema.id === id) ?? TEMAS.find((tema) => tema.id === TEMA_PADRAO);
}

/** Os campos que todo tema declara; o teste dos temas cobra que nenhum falte. */
export const CAMPOS_DO_TEMA = Object.freeze(['id', 'rotulo', 'descricao', 'cores', 'arrumacao', 'lugares', 'rotulos', 'paineis', 'cena']);
