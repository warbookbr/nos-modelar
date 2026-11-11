/* casamento-da-vista.test.mjs — o casamento do modelo com a referência numa vista, sobre uma cena sintética: duas partes lado a lado,
   uma laranja e uma cinza, contra um PNG com as mesmas duas cores e a divisa no lugar ou deslocada. */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { imagem, paraPng, regioesDaGrade } from './leitura-por-regioes.mjs';
import { lerClasses } from './perfil-por-cor.mjs';
import { abertura, desenharCasamento, executar, medirCasamento, paraJson, quadroDaReferencia, transformadaDeDistancia } from './casamento-da-vista.mjs';

const LARANJA = [226, 100, 30]; const CINZA = [107, 112, 116];
const classes = lerClasses('laranja:#e2641e,cinza:#6b7074');
/* vista frontal, 1 mm por px: a parte "esq" de x = 0 a 100 mm, a "dir" de 100 a 200, de y = 0 a 100 */
const quad = (x0, x1, parte) => ({ pts: [[x0, 0, 0], [x1, 0, 0], [x1, 100, 0], [x0, 100, 0]], parte });
const faces = [quad(0, 100, 1), quad(100, 200, 2)];
const partes = ['esq', 'dir'];
const classeDaParte = { esq: 'laranja', dir: 'cinza' };
/* a referência: 220 x 120 px, o objeto na caixa 10,10,210,110, o laranja até x = 10 + divisa */
function referencia(divisa) {
  const im = imagem(220, 120);
  for (let y = 10; y < 110; y += 1) for (let x = 10; x < 210; x += 1) im.dados.set(x < 10 + divisa ? LARANJA : CINZA, (y * 220 + x) * 3);
  return im;
}
const base = { faces, partes, classeDaParte, vista: 'frontal', largura: 200, caixaRef: [10, 10, 210, 110], classes, grade: [4, 3] };
const medir = (o) => medirCasamento({ ...base, ...o });
const porNome = (m) => Object.fromEntries(m.regioes.map((r) => [r.nome, r]));

describe('casamento da vista', () => {
  it('a transformada de distância dá a distância de chanfro e a abertura apaga a franja de dois pixels', () => {
    const L = 30; const A = 20; const fonte = new Uint8Array(L * A); fonte[10 * L + 5] = 1;
    const d = transformadaDeDistancia(fonte, L, A);
    expect(d[10 * L + 15]).toBe(10); expect(d[0]).toBeCloseTo((4 * 5 + 3 * 0) / 3 + (3 * 5) / 3, 6);
    expect(transformadaDeDistancia(new Uint8Array(4), 2, 2)[0]).toBe(Infinity);
    const mapa = new Uint8Array(L * A);
    for (let y = 0; y < A; y += 1) { mapa[y * L + 2] = 1; mapa[y * L + 3] = 1; for (let x = 10; x < 20; x += 1) mapa[y * L + x] = 1; }
    const aberto = abertura(mapa, L, A, 2);
    expect(aberto.reduce((s, v) => s + v, 0)).toBe(10 * A);
    expect(aberto[5 * L + 2]).toBe(0); expect(aberto[5 * L + 10]).toBe(1); expect(aberto[5 * L + 19]).toBe(1);
  });

  it('com a divisa no mesmo lugar não há troca nem linha sem borda', () => {
    const m = medir({ referencia: referencia(100) });
    expect(m.largura).toBe(200); expect(m.altura).toBe(100); expect(m.mmPorPx).toBeCloseTo(1, 6);
    expect(m.proporcao.referencia).toBeCloseTo(0.5, 6); expect(m.proporcao.modelo).toBeCloseTo(0.5, 6);
    expect(m.regioes).toHaveLength(12);
    for (const r of m.regioes) {
      expect(r.troca.fracao).toBe(0); expect(r.troca.pares).toEqual([]);
      expect(r.linhaSemBorda.fora).toBe(0); expect(r.bordaSemLinha.fora).toBe(0);
      if (r.linhaSemBorda.px) expect(r.linhaSemBorda.maiorMm).toBe(0);
      expect(r.nota).toBe(0);
    }
  });

  it('com a divisa deslocada 10 px a região dela tem a troca esperada e a maior distância igual ao deslocamento', () => {
    const m = medir({ referencia: referencia(110), toleranciaMm: 5 });
    const regioes = porNome(m);
    for (const g of regioesDaGrade(200, 100, [4, 3])) {
      const xa = Math.max(0, g.x); const xb = Math.min(200, g.x + g.largura); const ya = Math.max(0, g.y); const yb = Math.min(100, g.y + g.altura);
      const faixa = Math.max(0, Math.min(xb, 110) - Math.max(xa, 100));
      const r = regioes[g.nome];
      expect(r.troca.fracao).toBeCloseTo(faixa / (xb - xa), 3);
      if (faixa >= 10) {
        expect(r.troca.pares[0]).toMatchObject({ referencia: 'laranja', modelo: 'cinza' });
        expect(Math.abs(r.linhaSemBorda.maiorMm - 10)).toBeLessThan(1.5);
        expect(Math.abs(r.bordaSemLinha.maiorMm - 10)).toBeLessThan(1.5);
        expect(r.linhaSemBorda.fora).toBeGreaterThan(0);
      }
      if (faixa === 0 && (xb <= 90 || xa >= 120)) { expect(r.linhaSemBorda.fora).toBe(0); expect(r.nota).toBe(0); }
    }
    /* a ordem segue a nota */
    for (let i = 1; i < m.regioes.length; i += 1) expect(m.regioes[i - 1].nota).toBeGreaterThanOrEqual(m.regioes[i].nota);
    expect(['A3', 'B3', 'C3']).toContain(m.regioes[0].nome);
    const nota = (r) => r.troca.fracao * 100 + (100 * (r.linhaSemBorda.fora + r.bordaSemLinha.fora)) / (r.linhaSemBorda.px + r.bordaSemLinha.px || 1);
    for (const r of m.regioes) expect(r.nota).toBeCloseTo(nota(r), 1);
  });

  it('o retângulo ignorado tira os pixels e a região inteira da conta', () => {
    /* o ignorado cobre a faixa trocada inteira, com folga: a troca e a linha sem borda somem */
    const sem = medir({ referencia: referencia(110), toleranciaMm: 5, ignorar: [[100, 0, 130, 120]] });
    for (const r of sem.regioes) { expect(r.troca.fracao).toBe(0); expect(r.linhaSemBorda.fora).toBe(0); expect(r.bordaSemLinha.fora).toBe(0); }
    /* o ignorado cobre a coluna 1 inteira: as regiões dela saem da lista */
    const [a1] = regioesDaGrade(200, 100, [4, 3]);
    const fora = medir({ referencia: referencia(110), ignorar: [[0, 0, 10 + a1.x + a1.largura, 120]] });
    expect(fora.ignoradas).toEqual(['A1', 'B1', 'C1']);
    expect(fora.regioes.map((r) => r.nome)).not.toContain('A1');
    expect(fora.regioes).toHaveLength(9);
  });

  it('com escalaVertical a altura da referência tem a escala da largura vezes o fator, com a base na base', () => {
    /* a referência desenhada com 1 mm por px na largura e 1,25 na altura: os 100 mm de altura viram 80 px, de y = 30 a 110 */
    const desenho = (alturaPx) => {
      const im = imagem(220, 150);
      for (let y = 110 - alturaPx; y < 110; y += 1) for (let x = 10; x < 210; x += 1) im.dados.set(x < 110 ? LARANJA : CINZA, (y * 220 + x) * 3);
      return im;
    };
    expect(quadroDaReferencia([10, 30, 210, 110], 200, 100)).toEqual([10, 30, 210, 110]);
    expect(quadroDaReferencia([10, 30, 210, 110], 200, 100, 1.25)).toEqual([10, 30, 210, 110]);
    expect(quadroDaReferencia([10, 46, 210, 110], 200, 100, 1.25)).toEqual([10, 30, 210, 110]);
    const certa = medir({ referencia: desenho(80), caixaRef: [10, 30, 210, 110], escalaVertical: 1.25 });
    expect(certa.proporcao.referencia).toBeCloseTo(0.5, 6); expect(certa.proporcao.caixaEmPx).toBeCloseTo(0.4, 6);
    for (const r of certa.regioes) expect(r.troca.fracao).toBe(0);
    /* a referência com 64 px, 80 mm na escala declarada: o modelo passa 20 mm por cima, e a troca está na faixa de cima; caixa a
       caixa, a mesma referência é esticada até o modelo e não troca nada */
    const baixa = medir({ referencia: desenho(64), caixaRef: [10, 46, 210, 110], escalaVertical: 1.25 });
    const trocados = baixa.mapas.troca.reduce((s, v) => s + v, 0);
    expect(Math.abs(trocados - 200 * 20) / (200 * 20)).toBeLessThan(0.05);
    for (let y = 22; y < 100; y += 1) for (let x = 0; x < 200; x += 1) expect(baixa.mapas.troca[y * 200 + x]).toBe(0);
    for (const r of medir({ referencia: desenho(64), caixaRef: [10, 46, 210, 110] }).regioes) expect(r.troca.fracao).toBe(0);
    /* o ignorado vale nos px da referência, no quadro já corrigido: a faixa de cima dela (y 30 a 46) cobre a troca */
    const ignorada = medir({ referencia: desenho(64), caixaRef: [10, 46, 210, 110], escalaVertical: 1.25, ignorar: [[0, 25, 220, 47]] });
    for (const r of ignorada.regioes) expect(r.troca.fracao).toBe(0);
    /* sem o campo o JSON é o de hoje, e com ele diz o fator e o quadro */
    expect(paraJson(medir({ referencia: referencia(100) }))).not.toHaveProperty('escalaVertical');
    expect(paraJson(baixa)).toMatchObject({ escalaVertical: 1.25, quadroRef: [10, 30, 210, 110] });
    expect(() => medir({ referencia: referencia(100), escalaVertical: 0 })).toThrow('maior que zero');
  });

  it('a saída é igual a cada execução', () => {
    const um = medir({ referencia: referencia(110) }); const dois = medir({ referencia: referencia(110) });
    expect(JSON.stringify(paraJson(um))).toBe(JSON.stringify(paraJson(dois)));
    expect(Buffer.compare(paraPng(desenharCasamento(um)), paraPng(desenharCasamento(dois)))).toBe(0);
  });

  it('recusa parte sem classe, classe que não está nas cores e caixa fora da referência', () => {
    expect(() => medir({ referencia: referencia(100), classeDaParte: { esq: 'laranja' } })).toThrow('não diz a classe de dir');
    expect(() => medir({ referencia: referencia(100), classeDaParte: { esq: 'laranja', dir: 'verde' } })).toThrow('não está em --cores');
    expect(() => medir({ referencia: referencia(100), classeDaParte: { ...classeDaParte, outra: 'cinza' } })).toThrow('a opção não tem');
    expect(() => medir({ referencia: referencia(100), caixaRef: [10, 10, 300, 110] })).toThrow('não cabe');
  });

  it('o comando mede uma opção do esboço, grava as saídas e recusa argumento ruim com código 2', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'casamento-'));
    writeFileSync(join(pasta, 'bloco.esboco.json'), JSON.stringify({ opcoes: [{ titulo: 'bloco', formas: [
      { id: 'base', op: 'cubo', args: { larg: 100, alt: 60, prof: 40 } }, { id: 'topo', op: 'cubo', args: { larg: 60, alt: 30, prof: 40 }, sobre: 'base' }] }] }));
    writeFileSync(join(pasta, 'ref.png'), paraPng(referencia(100)));
    const args = [join(pasta, 'bloco.esboco.json'), '--vista=frontal', `--referencia=${join(pasta, 'ref.png')}`, '--caixa-ref=10,10,210,110',
      '--cores=laranja:#e2641e,cinza:#6b7074', '--largura=100', '--grade=2x2'];
    const semClasse = await executar([...args, '--partes=base:laranja']);
    expect(semClasse.codigo).toBe(2); expect(semClasse.stderr).toContain('não diz a classe de topo'); expect(semClasse.stderr).toContain('base, topo');
    expect((await executar([...args.filter((a) => !a.startsWith('--vista')), '--partes=base:laranja,topo:cinza'])).codigo).toBe(2);
    expect((await executar([...args.filter((a) => !a.startsWith('--vista')), '--partes=base:laranja,topo:cinza', '--vista=de-lado'])).codigo).toBe(2);
    expect((await executar([...args, '--partes=base:laranja,topo:cinza', '--ignorar=1,2,3'])).codigo).toBe(2);
    expect((await executar([...args, '--partes=base:laranja,topo:cinza', '--opcao=3'])).codigo).toBe(2);
    const r = await executar([...args, '--partes=base:laranja,topo:cinza', `--saida=${pasta}`]);
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0);
    expect(r.stdout).toContain('não aprova forma'); expect(r.stdout).not.toContain('duas escalas');
    expect((await executar([...args, '--partes=base:laranja,topo:cinza', '--escala-vertical=1.25'])).stdout).toContain('duas escalas');
    expect((await executar([...args, '--partes=base:laranja,topo:cinza', '--escala-vertical=-1'])).codigo).toBe(2);
    const json = JSON.parse(readFileSync(join(pasta, 'casamento.json'), 'utf8'));
    expect(json.formato).toBe('modelar.casamento-da-vista@1');
    expect(json.regioes.map((x) => x.nome).sort()).toEqual(['A1', 'A2', 'B1', 'B2']);
    expect(r.stdout.split('\n').filter((l) => /^[AB]\d /.test(l))).toHaveLength(4);
    expect(readFileSync(join(pasta, 'casamento.png')).subarray(1, 4).toString()).toBe('PNG');
  });
});
