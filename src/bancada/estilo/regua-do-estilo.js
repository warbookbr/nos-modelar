/* regua-do-estilo.js — a régua do gate 5 do plano das visões e da interface: a folha de estilo da bancada usa só as definições do sistema visual.
 *
 * Lê o texto de uma folha de estilo e devolve cada declaração que escreve cor, tamanho de fonte ou espaçamento sem passar
 * pelas variáveis de `sistema-visual.css`. Cor é qualquer valor hexadecimal, `rgb()`, `hsl()` e afins, ou nome de cor,
 * em qualquer propriedade, inclusive numa variável própria declarada fora do sistema. Tamanho de fonte é `font-size` e o
 * tamanho dentro de `font`, que só podem ser uma variável ou herdar. Espaçamento é `padding`, `margin` e `gap`, com as
 * variantes de lado e de eixo, que aceitam variável, `0`, `auto` e conta entre variáveis, e nenhuma medida escrita.
 *
 * Posição e tamanho de caixa (`top`, `width`, `height`) ficam fora: são a arrumação de um tema, e não espaçamento entre
 * coisas. O módulo não toca a página nem o disco; o teste lê o arquivo e entrega o texto. */

const NOMES_DE_COR = new Set(`aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet
brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod
darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick
floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred
indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow
lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey
lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple
mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred
papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown
seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato
turquoise violet wheat white whitesmoke yellow yellowgreen`.split(/\s+/));

const ESPACAMENTO = /^(?:padding|margin)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?$|^(?:row-|column-)?gap$/;

/** O texto sem os comentários, com as quebras de linha preservadas para o número da linha continuar certo. */
function semComentarios(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, (comentario) => comentario.replace(/[^\n]/g, ' '));
}

/** Tira as chamadas `var(...)`, inclusive aninhadas, e devolve o que sobra do valor. */
function semVariaveis(valor) {
  let resto = valor;
  let anterior;
  do {
    anterior = resto;
    resto = resto.replace(/var\(\s*--[\w-]+\s*(?:,[^()]*)?\)/g, ' ');
  } while (resto !== anterior);
  return resto;
}

function corEscrita(valor) {
  const resto = semVariaveis(valor).replace(/url\([^)]*\)|'[^']*'|"[^"]*"/g, ' ');
  if (/#[0-9a-f]{3,8}\b/i.test(resto)) return true;
  if (/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i.test(resto)) return true;
  return resto.toLowerCase().split(/[^a-z-]+/).some((palavra) => NOMES_DE_COR.has(palavra));
}

/* Uma medida escrita é um número com unidade de comprimento; `0` sem unidade e número puro (o fator de uma conta) passam. */
const MEDIDA = /(?:^|[^\w.-])-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|ex|ch|vw|vh|vmin|vmax|pt|cm|mm|%)/i;

function medidaEscrita(valor) {
  return MEDIDA.test(semVariaveis(valor));
}

function tamanhoDeFonteEscrito(propriedade, valor) {
  if (propriedade === 'font-size') {
    const resto = semVariaveis(valor).trim();
    return resto !== '' && !/^(?:inherit|initial|unset|revert)$/.test(resto);
  }
  if (propriedade === 'font') return medidaEscrita(valor.replace(/\/\s*[\d.]+(?:px|em|rem|%)?/g, ' '));
  return false;
}

/**
 * As declarações de `texto` que escapam do sistema visual, cada uma com a linha, a propriedade, o valor e o motivo.
 * Uma folha que só usa as variáveis devolve uma lista vazia.
 */
export function foraDoSistemaVisual(texto) {
  const limpo = semComentarios(texto);
  const achados = [];
  const declaracao = /([\w-]+)\s*:\s*([^;{}]+?)\s*(?=;|})/g;
  for (const casamento of limpo.matchAll(declaracao)) {
    const [, propriedade, valor] = casamento;
    /* Um seletor como `a:hover {` não é declaração: o que vem depois dos dois pontos termina em chave aberta. */
    const depois = limpo.slice(casamento.index + casamento[0].length, casamento.index + casamento[0].length + 1);
    if (depois === '{') continue;
    const linha = limpo.slice(0, casamento.index).split('\n').length;
    const nome = propriedade.toLowerCase();
    if (corEscrita(valor)) achados.push({ linha, propriedade: nome, valor, motivo: 'cor fora do sistema visual' });
    else if (tamanhoDeFonteEscrito(nome, valor)) {
      achados.push({ linha, propriedade: nome, valor, motivo: 'tamanho de fonte fora do sistema visual' });
    } else if (ESPACAMENTO.test(nome) && medidaEscrita(valor)) {
      achados.push({ linha, propriedade: nome, valor, motivo: 'espaçamento fora do sistema visual' });
    }
  }
  return achados;
}
