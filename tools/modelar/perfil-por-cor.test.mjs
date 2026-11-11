/* perfil-por-cor.test.mjs — o perfil por cor: os trechos de cada classe numa linha, a meia largura de uma classe em cada altura, a
   classificação que aguenta a sombra, o mapa pintado, a saída igual a cada execução e as recusas. */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dePng, imagem, paraPng } from './leitura-por-regioes.mjs';
import { FUNDO, classificar, executar, lerClasses, medirPerfil } from './perfil-por-cor.mjs';

const LARANJA = [226, 100, 30]; const CINZA = [107, 112, 116]; const ESCURO = [30, 32, 34];
const CORES = 'laranja:#e2641e,cinza:#6b7074,escuro:#1e2022';
function retangulo(im, [x0, y0, x1, y1], cor) {
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) im.dados.set(cor, (y * im.largura + x) * 3);
}
/* um corpo laranja de 80 x 60 px em (20, 10) sobre branco, com um painel cinza de 40 x 30 px em (40, 20), um vão escuro de 20 x 10 px
   em (50, 55) e um friso escuro de 2 px em x = 90 nas linhas 10 a 19, mais estreito que o mínimo; `sombra` escurece a metade direita do
   painel e do corpo, ainda acima do limiar entre cinza e escuro */
function vista(sombra = false) {
  const im = imagem(120, 80);
  retangulo(im, [20, 10, 100, 70], LARANJA);
  if (sombra) retangulo(im, [60, 10, 100, 70], [150, 66, 20]);
  retangulo(im, [40, 20, 80, 50], CINZA);
  if (sombra) retangulo(im, [60, 20, 80, 50], [78, 82, 86]);
  retangulo(im, [50, 55, 70, 65], ESCURO);
  retangulo(im, [90, 10, 92, 20], ESCURO);
  return im;
}
const CAIXA = [10, 5, 110, 75];
const linha = (r, y) => r.linhas.find((l) => l.y === y).trechos;

describe('perfil por cor', () => {
  it('classifica pela saturação e pelo matiz, pela luminância sem saturação e pela distância ao fundo', () => {
    const classes = lerClasses(CORES);
    expect(classes.map((c) => [c.nome, c.saturada])).toEqual([['laranja', true], ['cinza', false], ['escuro', false]]);
    expect(classificar(LARANJA, classes)).toBe(0);
    expect(classificar([120, 52, 14], classes)).toBe(0);          // laranja na sombra funda
    expect(classificar([20, 60, 220], classes)).toBe(1);          // azul saturado longe do laranja: vai pela luminância
    expect(classificar([78, 82, 86], classes)).toBe(1);           // cinza na sombra, luminância 82, acima do meio (71,8)
    expect(classificar([66, 68, 70], classes)).toBe(2);           // abaixo do meio: escuro
    expect(classificar([210, 210, 212], classes)).toBe(FUNDO);
    expect(classificar([190, 190, 190], classes)).toBe(1);        // luminância 190 está longe do branco: cinza
    expect(classificar([60, 60, 60], classes, [40, 40, 40])).toBe(FUNDO);
  });

  it('lista os trechos de cada classe numa linha, sem o que é mais estreito que o mínimo', () => {
    const r = medirPerfil({ imagem: vista(), caixa: CAIXA, classes: lerClasses(CORES), passo: 5 });
    expect(r.centro).toBe(60);
    expect(r.linhas.map((l) => l.y)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]);
    expect(linha(r, 5)).toEqual([]);
    expect(linha(r, 10)).toEqual([['laranja', 20, 89], ['laranja', 92, 99]]);
    expect(linha(r, 30)).toEqual([['laranja', 20, 39], ['cinza', 40, 79], ['laranja', 80, 99]]);
    expect(linha(r, 60)).toEqual([['laranja', 20, 49], ['escuro', 50, 69], ['laranja', 70, 99]]);
    expect(medirPerfil({ imagem: vista(), caixa: CAIXA, classes: lerClasses(CORES), passo: 5, minimo: 2 }).linhas[1].trechos)
      .toEqual([['laranja', 20, 89], ['escuro', 90, 91], ['laranja', 92, 99]]);
  });

  it('dá a meia largura de cada classe a partir do centro, só nas linhas em que ela aparece', () => {
    const r = medirPerfil({ imagem: vista(), caixa: CAIXA, classes: lerClasses(CORES), passo: 5 });
    expect(r.perfis.cinza).toEqual([[20, 20], [25, 20], [30, 20], [35, 20], [40, 20], [45, 20]]);
    expect(r.perfis.escuro).toEqual([[55, 10], [60, 10]]);
    expect(r.perfis.laranja.map(([y]) => y)).toEqual([10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65]);
    expect(r.perfis.laranja.every(([, m]) => m === 40)).toBe(true);
    /* com o centro deslocado, a meia largura é a maior distância até a borda de fora do trecho */
    const torto = medirPerfil({ imagem: vista(), caixa: CAIXA, classes: lerClasses(CORES), passo: 5, centro: 50 });
    expect(torto.perfis.cinza[0]).toEqual([20, 30]);
  });

  it('aguenta a sombra: a metade escurecida do painel e do corpo dá os mesmos trechos e o mesmo perfil', () => {
    const claro = medirPerfil({ imagem: vista(), caixa: CAIXA, classes: lerClasses(CORES), passo: 5 });
    const sombra = medirPerfil({ imagem: vista(true), caixa: CAIXA, classes: lerClasses(CORES), passo: 5 });
    expect(sombra.linhas).toEqual(claro.linhas);
    expect(sombra.perfis).toEqual(claro.perfis);
    expect(sombra.fracoes).toEqual(claro.fracoes);
  });

  it('pinta o mapa da caixa com a cor declarada de cada classe e o fundo em branco', () => {
    const r = medirPerfil({ imagem: vista(true), caixa: CAIXA, classes: lerClasses(CORES) });
    expect([r.mapa.largura, r.mapa.altura]).toEqual([100, 70]);
    const em = (x, y) => [...r.mapa.dados.slice(((y - 5) * 100 + x - 10) * 3, ((y - 5) * 100 + x - 10) * 3 + 3)];
    expect(em(12, 7)).toEqual([255, 255, 255]);
    expect(em(25, 30)).toEqual(LARANJA); expect(em(95, 30)).toEqual(LARANJA);
    expect(em(45, 30)).toEqual(CINZA); expect(em(75, 30)).toEqual(CINZA);
    expect(em(60, 60)).toEqual(ESCURO);
    expect(r.fracoes.cinza).toBeCloseTo(1200 / 7000, 10);
  });

  it('o comando grava o JSON e o mapa iguais a cada execução e recusa com código 2 o argumento errado', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'perfil-'));
    writeFileSync(join(pasta, 'vista.png'), paraPng(vista(true)));
    const args = [`--imagem=${join(pasta, 'vista.png')}`, '--caixa=10,5,110,75', `--cores=${CORES}`, '--passo=5', `--saida=${join(pasta, 'p.json')}`, `--mapa=${join(pasta, 'm.png')}`];
    const a = executar(args);
    expect(a.codigo).toBe(0);
    expect(a.stdout).toContain('14 linhas de 5 a 74, a cada 5 px, centro em x = 60');
    expect(a.stdout).toContain('cinza 17.1%');
    expect(a.stdout).toContain(join(pasta, 'p.json')); expect(a.stdout).toContain(join(pasta, 'm.png'));
    const antes = ['p.json', 'm.png'].map((f) => readFileSync(join(pasta, f)));
    executar(args);
    ['p.json', 'm.png'].forEach((f, i) => expect(readFileSync(join(pasta, f)).equals(antes[i]), f).toBe(true));
    const json = JSON.parse(antes[0]);
    expect(json.formato).toBe('modelar.perfil-por-cor@1');
    expect(json).toMatchObject({ caixa: [10, 5, 110, 75], centro: 60, classes: [{ nome: 'laranja', cor: '#e2641e' }, { nome: 'cinza' }, { nome: 'escuro' }] });
    expect(json.linhas[5]).toEqual({ y: 30, trechos: [['laranja', 20, 39], ['cinza', 40, 79], ['laranja', 80, 99]] });
    expect(json.perfis.escuro).toEqual([[55, 10], [60, 10]]);
    expect(dePng(antes[1]).largura).toBe(100);

    const recusa = (extra, sem = null) => executar([...args.filter((x) => !(sem && x.startsWith(`--${sem}=`)) && !extra.some((e) => x.startsWith(e.split('=')[0]))), ...extra]);
    const casos = [
      [recusa([], 'imagem'), 'falta --imagem'],
      [recusa(['--caixa=10,5,130,75']), '--caixa 10,5,130,75 não cabe na imagem de 120 x 80 px'],
      [recusa(['--cores=laranja:#e2641,cinza:#6b7074']), 'a classe "laranja" espera #rrggbb e veio "#e2641"'],
      [recusa(['--cores=laranja:#e2641e,laranja:#6b7074']), '--cores repete a classe "laranja"'],
      [recusa(['--fundo=branco']), '--fundo espera #rrggbb'],
      [recusa(['--passo=0']), '--passo espera um inteiro positivo'],
      [recusa([`--imagem=${join(pasta, 'nao-ha.png')}`]), 'ENOENT'],
    ];
    for (const [r, medida] of casos) { expect(r.codigo, medida).toBe(2); expect(r.stderr).toContain(medida); }
    expect(executar(['--ajuda']).stdout).toContain('npm run perfil:cor');
  });
});
