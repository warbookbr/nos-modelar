/* esboco-blocagem-recorte.mjs — o que o recorte (`subtrai`) de uma forma tira da silhueta, medido contra o desenho das formas.
 *
 * A N2 não subtrai um volume de outro, e o tradutor leva a forma recortada inteira ao andaime quando o recorte não muda o envelope
 * dela (a perda `recorte`, ver `MUDANCA_MAXIMA_DO_ENVELOPE_POR_RECORTE`). O envelope não diz se a silhueta muda: um cortador que
 * atravessa a forma de lado a lado, na direção de uma vista, abre nela um vão por onde se vê o fundo (o arco de roda que vara o
 * chassi, a fenda que vara o assoalho), e o desenho das formas o deixa aberto, enquanto a blocagem pinta a forma inteira. Um
 * cortador que fica dentro da forma, ou que só a esvazia por cima, não muda a silhueta de nenhuma vista.
 *
 * `recortesAbertos` mede, por forma com recorte e por vista, a área que o recorte tira da silhueta e que nenhuma outra forma
 * cobre, em fração da silhueta da blocagem (a mesma conta de pixels do gate das silhuetas). Cada forma recortada é desenhada
 * sozinha pelo desenho das formas, com o recorte e sem ele; as outras formas, todas juntas, uma vez por vista; e todos os desenhos
 * saem no mesmo quadro, fixado por `enquadrar.pontos` nos cantos da caixa da blocagem, de modo que as máscaras se comparam pixel a
 * pixel. O vão da forma é o que ela cobre sem o recorte e não cobre com ele, menos o que as outras formas (com os recortes delas)
 * cobrem. O desenho de uma opção inteira por forma recortada custava minutos num esboço grande (o avião); assim sai um desenho da
 * opção por vista. */
import { desenharEsboco, VISTAS } from '../../modulos/esboco/src/index.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { CAMADA_DA_SILHUETA, mascaraDaCamada } from './esboco-silhueta.mjs';

/* Os 8 cantos da caixa dos vértices da malha da blocagem: o quadro de todos os desenhos desta medida. */
function cantosDaCaixa(vertices) {
  const min = [0, 1, 2].map((k) => Math.min(...vertices.map((v) => v[k])));
  const max = [0, 1, 2].map((k) => Math.max(...vertices.map((v) => v[k])));
  return Array.from({ length: 8 }, (_, i) => [i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]]);
}

/* A máscara da silhueta das formas `mostrar` da opção `numero`, na `vista`, no quadro dos `pontos`, com os lados do esboço, e com
   o recorte (`subtrai`) tirado das formas `semRecorte`. Aparecem só as formas mostradas e os cortadores de que elas precisam,
   com os que esses cortadores recortam; as outras ficam escondidas (`oculto`) e sem o recorte, porque a forma escondida com recorte
   ainda custa ao desenho das formas o recorte dela (1,5 s por desenho no caminhão importado), e a retirada da lista não serve,
   porque as formas se referenciam (`encaixa.em`). */
function mascaraDe(expandido, numero, vista, pontos, mostrar, semRecorte) {
  const o = expandido.opcoes[numero - 1];
  const porId = new Map(o.formas.map((f) => [f.id, f]));
  const precisos = new Set();
  const fila = [...mostrar].filter((id) => !semRecorte.has(id));
  while (fila.length > 0) {
    for (const c of porId.get(fila.pop())?.subtrai ?? []) if (!precisos.has(c)) { precisos.add(c); fila.push(c); }
  }
  const formas = o.formas.map((f) => {
    const aparece = mostrar.has(f.id) || precisos.has(f.id);
    if (aparece && !semRecorte.has(f.id)) return f;
    const { subtrai, ...resto } = f;
    return aparece ? resto : { ...resto, oculto: true };
  });
  const alvo = formas.find((f) => f.cortador !== true && f.oculto !== true);
  const e = JSON.parse(JSON.stringify({ ...expandido, opcoes: [{ ...o, formas }], ladosPorEscala: false, vista, linhasCentro: false }));
  e.ocultar = [...new Set([...(e.ocultar ?? []), 'legendas', 'linhasCentro'])];
  e.enquadrar = { formas: alvo.id, margem: 0, aviso: false, pontos };
  delete e.explosao;
  for (const op of e.opcoes) { delete op.explosao; delete op.linhasCentro; }
  return mascaraDaCamada(desenharEsboco(e, CAMADA_DA_SILHUETA).camada);
}

/**
 * Por forma que entrou no andaime inteira apesar do recorte, e por vista, a fração da silhueta da blocagem que o recorte tira no
 * desenho das formas. Devolve `[{ id, vista, fracao }]`, só as frações maiores que zero, em ordem de forma e de vista.
 * @param {{ bruto, numero, traducao, blocagem }} entrada o esboço, o número da opção, a tradução dela e a blocagem compilada
 */
export function recortesAbertos({ bruto, numero, traducao, blocagem }) {
  const expandido = expandirEsboco(bruto);
  const visiveis = new Set(expandido.opcoes[numero - 1].formas.filter((f) => f.oculto !== true).map((f) => f.id));
  const recortadas = traducao.perdas.filter((p) => p.perdido.some((d) => d.codigo === 'recorte') && traducao.tabela[p.id] !== undefined && visiveis.has(p.id)).map((p) => p.id);
  if (recortadas.length === 0) return [];
  const ocultas = new Set(traducao.naoTraduzidas.map((n) => n.id));
  const outras = new Set(expandido.opcoes[numero - 1].formas.filter((f) => f.cortador !== true && f.oculto !== true && !ocultas.has(f.id) && !recortadas.includes(f.id)).map((f) => f.id));
  const pontos = cantosDaCaixa(blocagem.malha.vertices);
  const resultado = [];
  for (const vista of Object.keys(VISTAS)) {
    const comRecorte = new Map();
    const semRecorte = new Map();
    for (const id of recortadas) {
      comRecorte.set(id, mascaraDe(expandido, numero, vista, pontos, new Set([id]), new Set()));
      semRecorte.set(id, mascaraDe(expandido, numero, vista, pontos, new Set([id]), new Set([id])));
    }
    const resto = outras.size > 0 ? mascaraDe(expandido, numero, vista, pontos, outras, new Set()) : null;
    const n = comRecorte.get(recortadas[0]).dados.length;
    /* por pixel: quantas formas recortadas o cobrem com o recorte, e se alguma o cobre sem ele (a silhueta da blocagem) */
    const cobertoPorRecortadas = new Uint16Array(n);
    let area = 0;
    for (let i = 0; i < n; i++) {
      let inteira = resto?.dados[i] ? 1 : 0;
      for (const id of recortadas) {
        cobertoPorRecortadas[i] += comRecorte.get(id).dados[i];
        inteira |= semRecorte.get(id).dados[i];
      }
      area += inteira;
    }
    for (const id of recortadas) {
      const com = comRecorte.get(id).dados;
      const sem = semRecorte.get(id).dados;
      let abertos = 0;
      /* o pixel que a forma cobre sem o recorte e não cobre com ele (a contagem das recortadas, nele, é só das outras), e que
         nenhuma outra forma cobre */
      for (let i = 0; i < n; i++) if (sem[i] && !com[i] && !resto?.dados[i] && cobertoPorRecortadas[i] === 0) abertos++;
      if (abertos > 0) resultado.push({ id, vista, fracao: abertos / area });
    }
  }
  return resultado;
}
