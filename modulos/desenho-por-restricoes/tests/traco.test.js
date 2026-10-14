/* traco.test.js — todo texto da vista em traço cabe na folha: com um subtítulo, um título e uma legenda das referências mais largos
   que o desenho, nenhum texto passa da largura do viewBox (nem sai pela esquerda, nas colunas de nomes à direita da âncora), o
   texto longo quebra em linhas sem se sobrepor, a folha só alarga para uma palavra que não quebra, e o SVG segue igual a cada
   execução. A estimativa de largura é conferida contra a fonte real no teste da porta (tools/mecanifica/desenho.test.mjs). */
import { describe, expect, it } from 'vitest';
import { desenhar } from '../src/index.js';
import { larguraDoTexto, quebrarEmLinhas } from '../src/traco.js';
import { carrinho } from './carrinho.js';

const SUBTITULO_LONGO = 'do lado esquerdo, com a roda à esquerda e a caçamba à direita, a coluna de apoio à esquerda e a barra de tração à direita, tudo sobre um piso nivelado de concreto liso';

const desentidade = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

/* Cada <text> do SVG com a posição, a âncora, o tamanho e o negrito, e a largura estimada do conteúdo. */
function textosDoSvg(svg) {
  const raiz = svg.match(/<svg [^>]*width="(\d+)" height="(\d+)" viewBox="0 0 (\d+) (\d+)"[^>]*font-size="(\d+)"/);
  const [largura, altura] = [Number(raiz[3]), Number(raiz[4])];
  const textos = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"([^>]*)>(.*?)<\/text>/g)].map(([, x, y, atributos, conteudo]) => {
    const tamanho = Number(atributos.match(/font-size="(\d+)"/)?.[1] ?? raiz[5]);
    const negrito = /font-weight="bold"/.test(atributos);
    const fim = /text-anchor="end"/.test(atributos);
    const texto = desentidade(conteudo);
    const w = larguraDoTexto(texto, tamanho, negrito);
    return { texto, x: Number(x), y: Number(y), tamanho, esquerda: fim ? Number(x) - w : Number(x), direita: fim ? Number(x) : Number(x) + w };
  });
  return { largura, altura, textos };
}

const longo = () => {
  const d = carrinho();
  d.objeto = 'carrinho de mão com caçamba de aço galvanizado e pneu de borracha maciça';
  d.olhando = SUBTITULO_LONGO;
  d.referencias.eixoDaTraseiraDoConjuntoInteiro = { reta: 'vertical', h: 1500 };
  return d;
};

describe('a vista em traço: o texto cabe na folha', () => {
  it('com o subtítulo, o título e a legenda mais largos que o desenho, nenhum texto passa da largura do viewBox', async () => {
    const { svg } = await desenhar(longo());
    const { largura, altura, textos } = textosDoSvg(svg);
    expect(textos.length).toBeGreaterThan(10);
    expect(textos.some((t) => t.texto.includes('concreto liso') || t.texto.endsWith('liso.'))).toBe(true);
    for (const t of textos) {
      expect(t.esquerda, `"${t.texto}" sai pela esquerda`).toBeGreaterThanOrEqual(0);
      expect(t.direita, `"${t.texto}" passa da largura ${largura}`).toBeLessThanOrEqual(largura);
      expect(t.y, `"${t.texto}" fica abaixo da folha`).toBeLessThanOrEqual(altura);
      expect(t.y).toBeGreaterThan(0);
    }
  });

  it('o texto longo quebra em linhas que não se sobrepõem e que juntas dizem o texto inteiro', async () => {
    const { svg } = await desenhar(longo());
    const { textos } = textosDoSvg(svg);
    const subtitulo = textos.filter((t) => t.x === 24 && t.tamanho === 14 && !t.texto.startsWith('tracejado') && !/ mm$/.test(t.texto));
    expect(subtitulo.length).toBeGreaterThan(1);
    expect(subtitulo.map((t) => t.texto).join(' ')).toBe(`Milímetros. Desenho por restrições; os nomes das partes ficam fora do desenho. Olhando ${SUBTITULO_LONGO}.`);
    const ys = textos.filter((t) => t.x === 24).map((t) => t.y);
    expect(new Set(ys).size).toBe(ys.length);
    const ordenados = [...ys].sort((a, b) => a - b);
    for (let i = 1; i < ordenados.length; i += 1) expect(ordenados[i] - ordenados[i - 1], `linhas em ${ordenados[i - 1]} e ${ordenados[i]}`).toBeGreaterThanOrEqual(18);
    const legenda = textos.filter((t) => /^tracejado|^[a-zA-Z]+ [vh] = /.test(t.texto) || t.texto.includes(' = ')).map((t) => t.texto).join(' ');
    expect(legenda).toContain('eixoDaTraseiraDoConjuntoInteiro h = 1500');
  });

  it('o desenho continua inteiro dentro da folha e abaixo do cabeçalho', async () => {
    const { svg } = await desenhar(longo());
    const { largura, altura, textos } = textosDoSvg(svg);
    const cabecalho = Math.max(...textos.filter((t) => t.x === 24 && t.tamanho >= 14 && t.y < 140 && !/ mm$/.test(t.texto)).map((t) => t.y));
    const numeros = [...svg.matchAll(/<path d="([^"]+)"/g)].flatMap((m) => [...m[1].matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((p) => [Number(p[1]), Number(p[2])]));
    expect(numeros.length).toBeGreaterThan(100);
    for (const [px, py] of numeros) {
      expect(px).toBeGreaterThanOrEqual(0);
      expect(px).toBeLessThanOrEqual(largura);
      expect(py).toBeGreaterThan(cabecalho);
      expect(py).toBeLessThanOrEqual(altura);
    }
  });

  it('uma palavra que não quebra alarga a folha em vez de ser cortada', async () => {
    const d = carrinho();
    d.olhando = `a${'x'.repeat(120)}`;
    const { svg } = await desenhar(d);
    const { largura, textos } = textosDoSvg(svg);
    expect(largura).toBeGreaterThan(larguraDoTexto('x'.repeat(120)));
    for (const t of textos) expect(t.direita).toBeLessThanOrEqual(largura);
  });

  it('um subtítulo curto continua numa linha só, e a mesma descrição dá o mesmo SVG', async () => {
    const curto = carrinho();
    const a = await desenhar(curto);
    const b = await desenhar(carrinho());
    expect(b.svg).toBe(a.svg);
    const linhas = textosDoSvg(a.svg).textos.filter((t) => t.texto.startsWith('Milímetros.'));
    expect(linhas).toHaveLength(1);
    const c = await desenhar(longo());
    const d = await desenhar(longo());
    expect(d.svg).toBe(c.svg);
  });
});

describe('quebrarEmLinhas', () => {
  it('quebra nos espaços, não perde palavra e não passa do máximo exceto em palavra sozinha', () => {
    const texto = 'um texto bastante comprido para precisar de mais de uma linha numa folha estreita';
    const linhas = quebrarEmLinhas(texto, 14, false, 200);
    expect(linhas.length).toBeGreaterThan(2);
    expect(linhas.join(' ')).toBe(texto);
    for (const l of linhas) expect(larguraDoTexto(l)).toBeLessThanOrEqual(200);
    expect(quebrarEmLinhas('supercalifragilisticoexpialidoso curta', 14, false, 50)).toEqual(['supercalifragilisticoexpialidoso', 'curta']);
    expect(quebrarEmLinhas('', 14, false, 200)).toEqual(['']);
  });
});
