/* vincos-da-rede.test.mjs — `vincos-das-linhas` sobre a gaiola por rede de curvas.
 *
 * A chapa é a de `fixtures/alisar-rede-prova.js` (19 curvas, 10 retalhos, a janela em gota, o arco de roda e a coluna), lida por uma receita que
 * monta a rede ao ser lida, com a cintura e a coluna sem o vinco declarado. As linhas 3D saem da forma desenhada (`altura`), com ruído de até
 * ±0,5 mm por um gerador sem acaso: uma que corre pela cintura inteira, com o ângulo da dobra; uma que corre a 50 mm dela dentro do retalho
 * sobre o arco de roda, que nenhuma curva acompanha; uma que cruza a cintura de baixo para cima e passa por dois retalhos, entre lados opostos
 * dos dois; e uma que cruza a cintura e parte os retalhos em pedaços de três e cinco lados. A ferramenta
 * casa a primeira com a curva `cintura` e devolve o vinco na curva, com a nitidez que a dobra na malha pede; para as outras duas devolve a curva
 * nova (os pontos-chave, os nós nas curvas vizinhas) e os retalhos que ela fecharia. A prova da sugestão é declará-la: a rede refeita com a
 * curva nova e os retalhos partidos monta sem grito, só de quadriláteros fora dos de três e cinco lados, e a curva passa pela linha a menos de
 * 2 mm. Nenhum dado vem de referência externa. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { altura } from '../../procedural/nucleo/fixtures/gaiola-por-rede-prova.js';
import { gaiolaPorRede } from '../../procedural/nucleo/gaiola-por-rede.js';
import { definicaoDaRede, receitaDeProva, tabelaDeProva } from './fixtures/alisar-rede-prova.js';
import { vincosDasLinhas } from './vincos-das-linhas.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = join(AQUI, '../..');

/* o ruído de cada amostra: um número determinístico em [−0,5; 0,5] */
const nota = (k) => ((k * 7 + 3) % 11) / 11 - 0.5;
const reta = (x0, z0, x1, z1, n) => Array.from({ length: n + 1 }, (_, k) => {
  const t = k / n; const x = x0 + (x1 - x0) * t; const z = z0 + (z1 - z0) * t;
  return [Math.round((x + nota(k + 2) * 0.4) * 100) / 100, Math.round((altura(x, z) + nota(k)) * 100) / 100, z];
});
const CINTURA = reta(40, 250, 960, 250, 230);
const PARALELA = reta(200, 200, 420, 200, 55);
const CRUZA = reta(300, 170, 300, 300, 52);
const CRUZA_TORTA = reta(100, 170, 100, 330, 60);
const linhas = () => ({ polilinhas_3d: [{ pontos_mm: CINTURA, angulo_graus: 10 }, { pontos_mm: PARALELA }, { pontos_mm: CRUZA }, { pontos_mm: CRUZA_TORTA }] });

const trechos = (s, linha) => s.linhas[linha].pecas.filter((p) => !p.espelhoDe).flatMap((p) => p.trechos);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/* a definição da rede com a sugestão de curva nova aplicada: os nós, a curva e os retalhos partidos no lugar dos que ela parte */
function comASugestao(def, sug) {
  const d = JSON.parse(JSON.stringify(def));
  d.nos = { ...d.nos, ...sug.nos };
  d.curvas.push({ nome: sug.nome, pontos: sug.pontos });
  for (const f of sug.fecham) {
    const i = d.retalhos.findIndex((r) => r.nome === f.retalho);
    d.retalhos.splice(i, 1, ...f.em.map((e) => ({ nome: e.nome, borda: e.borda })));
  }
  return d;
}
/* a maior das menores distâncias (mm) das amostras da linha à curva nova */
function afastamentoDaLinha(g, nome, amostras) {
  const pontos = Array.from({ length: 801 }, (_, k) => g.pontoDaCurva(nome, k / 800).map((x) => x * 1000));
  return Math.max(...amostras.map((q) => Math.min(...pontos.map((p) => dist(p, q)))));
}

describe('vincos das linhas 3D sobre a rede de curvas', () => {
  let s, outra, declarada;
  const { receita } = receitaDeProva({ dobra: true });

  beforeAll(() => {
    s = vincosDasLinhas(receita, linhas()).superficies[0];
    outra = vincosDasLinhas(receita, linhas()).superficies[0];
    declarada = vincosDasLinhas(receitaDeProva({}).receita, { polilinhas_3d: [{ pontos_mm: CINTURA, angulo_graus: 10 }] }).superficies[0];
  }, 300000);

  it('as cadeias são as curvas da rede, e não colunas, estações nem laços de arestas', () => {
    expect(s.cadeias).toMatchObject({ porNome: true, colunas: 0, estacoes: 0, arestas: 0, rede: true, curvas: 19 });
  });

  it('a linha que corre pela cintura casa com a curva `cintura`, de nó a nó, a menos de 2 mm', () => {
    const [t] = trechos(s, 0);
    expect(trechos(s, 0)).toHaveLength(1);
    expect(t.tipo).toBe('curva');
    expect(t.acompanha).toEqual({ curva: 'cintura', de: 'FB', ate: 'BR' });
    /* sem o vinco declarado a superfície arredonda a dobra de 10 graus, e a linha de feição fica a uns milímetros da curva limite junto dela */
    expect(t.distanciaMm.maxima).toBeLessThan(3);
    expect(t.distanciaMm.media).toBeLessThan(1);
    expect(t.comprimentoMm).toBeGreaterThan(900);
  });

  it('o vinco sai na curva, com a nitidez que a dobra na malha pede para o ângulo lido', () => {
    expect(s.vincos).toHaveLength(1);
    const v = s.vincos[0];
    expect(v).toMatchObject({ curva: 'cintura', acompanha: { curva: 'cintura', de: 'FB', ate: 'BR' } });
    expect(v.pontos).toBeUndefined();
    expect(v.parcial).toBeUndefined();
    expect(typeof v.vinco === 'number' || v.vinco === 'viva').toBe(true);
    expect(s.vincosNaRede).toEqual([{ nome: v.nome, curva: 'cintura', vinco: v.vinco }]);
    expect(s.vincosNaGaiola).toBeNull();
    /* a dobra na malha da receita com o vinco na curva chega a 90% dos 10 graus lidos */
    expect(v.comVinco.diedroGraus.mediana).toBeGreaterThanOrEqual(9);
    expect(v.comVinco.distanciaMm.maxima).toBeLessThan(2);
    expect(v.nitidezPorque).toMatch(/ângulo lido de 10 graus/);
    expect(s.comVincos.aceitos).toBe(true);
  });

  it('declarar o vinco na curva dá a dobra que a ferramenta mediu: com ele a ferramenta diz que a linha já está declarada', () => {
    const v = s.vincosNaRede[0];
    const com = vincosDasLinhas(receitaDeProva({ dobra: true, vincos: { cintura: v.vinco } }).receita, { polilinhas_3d: [{ pontos_mm: CINTURA, angulo_graus: 10 }] }).superficies[0];
    expect(com.vincos).toEqual([]);
    expect(trechos(com, 0)[0].jaDeclarado).toEqual(['cintura']);
    expect(com.vincosNaRede).toEqual([]);
  });

  it('a curva já declarada com vinco sai como já declarada, sem vinco novo', () => {
    expect(declarada.vincos).toEqual([]);
    expect(trechos(declarada, 0)[0].acompanha).toEqual({ curva: 'cintura', de: 'FB', ate: 'BR' });
    expect(trechos(declarada, 0)[0].jaDeclarado).toEqual(['cintura']);
  });

  it('a linha que nenhuma curva acompanha sai faltante, com a curva nova entre as ligações e o retalho que ela parte em dois', () => {
    const [t] = trechos(s, 1);
    expect(trechos(s, 1)).toHaveLength(1);
    expect(t.faltante).toBe(true);
    expect(t.sugestao).toMatchObject({ tipo: 'curva', nome: 'linha1', entre: ['ligA1', 'ligA2'], retalhos: ['sobreOArco'] });
    expect(t.sugestao.nos['linha1.a']).toMatchObject({ curva: 'ligA1' });
    expect(t.sugestao.nos['linha1.b']).toMatchObject({ curva: 'ligA2' });
    expect(t.sugestao.pontos[0]).toBe('linha1.a');
    expect(t.sugestao.pontos.at(-1)).toBe('linha1.b');
    expect(t.sugestao.pontos.length).toBeGreaterThanOrEqual(4);
    /* os pontos-chave de dentro estão sobre a linha: z = 200 mm */
    for (const p of t.sugestao.pontos.slice(1, -1)) expect(Math.abs(p[2] - 200)).toBeLessThan(1);
    const [f] = t.sugestao.fecham;
    expect(f.retalho).toBe('sobreOArco');
    expect(f.em.map((e) => e.lados)).toEqual([4, 4]);
    expect(f.em[0].borda.map((l) => l.curva)).toEqual(['ligA1', 'cintura', 'ligA2', 'linha1']);
    expect(f.em[1].borda.map((l) => l.curva)).toEqual(['ligA2', 'arco', 'ligA1', 'linha1']);
    expect(t.texto).toMatch(/^curva nova 'linha1' de 'ligA1' a 'ligA2'.*parte o retalho 'sobreOArco' em dois/);
    expect(t.sugestao.verificada).toMatchObject({ monta: true, retalhos: 11 });
    expect(s.faltantes.map((x) => x.linha)).toEqual([1, 2, 3]);
  });

  it('a sugestão declarada na rede monta sem grito, só de quadriláteros, e a curva nova passa pela linha a menos de 2 mm', () => {
    const [t] = trechos(s, 1);
    const def = definicaoDaRede(tabelaDeProva({}), { dobra: true });
    const g = gaiolaPorRede(comASugestao(def, t.sugestao));
    expect(g.passo.faces.every((f) => f.length === 4)).toBe(true);
    expect(Object.keys(g.retalhos)).toContain('sobreOArco_a');
    expect(Object.keys(g.retalhos)).not.toContain('sobreOArco');
    expect(Object.keys(g.retalhos)).toHaveLength(11);
    expect(afastamentoDaLinha(g, 'linha1', PARALELA)).toBeLessThan(2);
  });

  it('a linha que cruza a cintura passa por dois retalhos, ganha um nó na curva que cruza e parte os dois, e a rede monta com ela', () => {
    const [t] = trechos(s, 2);
    expect(t.faltante).toBe(true);
    expect(t.sugestao).toMatchObject({ tipo: 'curva', nome: 'linha2', retalhos: ['sobreOArco', 'baixo'], cruza: ['cintura'], entre: ['arco', 'janela'] });
    expect(t.sugestao.nos['linha2.x1']).toMatchObject({ curva: 'cintura' });
    expect(t.sugestao.pontos).toContain('linha2.x1');
    expect(t.sugestao.fecham.map((f) => f.retalho)).toEqual(['sobreOArco', 'baixo']);
    for (const f of t.sugestao.fecham) expect(f.em.map((e) => e.lados)).toEqual([4, 4]);
    expect(t.sugestao.verificada).toMatchObject({ monta: true, retalhos: 12 });
    const def = definicaoDaRede(tabelaDeProva({}), { dobra: true });
    const g = gaiolaPorRede(comASugestao(def, t.sugestao));
    expect(Object.keys(g.retalhos)).toHaveLength(12);
    expect(g.passo.faces.every((f) => f.length === 4)).toBe(true);
    expect(afastamentoDaLinha(g, 'linha2', CRUZA)).toBeLessThan(2);
  });

  it('a linha que parte os retalhos em três e cinco lados sai com a sugestão, e a ferramenta diz que a rede não fecha as divisões com ela', () => {
    const [t] = trechos(s, 3);
    expect(t.sugestao).toMatchObject({ tipo: 'curva', nome: 'linha3', retalhos: ['antesDoArco', 'baixo'], cruza: ['cintura'], entre: ['soleiraFrente', 'ligL1'] });
    expect(t.sugestao.fecham.map((f) => f.em.map((e) => e.lados))).toEqual([[4, 5], [5, 3]]);
    expect(t.sugestao.verificada.monta).toBe(false);
    expect(t.sugestao.verificada.erro).toMatch(/divisões/);
    expect(t.texto).toMatch(/a rede não monta com ela \(.*divisões/);
    const def = definicaoDaRede(tabelaDeProva({}), { dobra: true });
    expect(() => gaiolaPorRede(comASugestao(def, t.sugestao))).toThrow(/divisões/);
  });

  it('o canto fora de um nó e o vinco parcial não aparecem aqui, e a mesma entrada dá a mesma saída', () => {
    expect(s.cantosSemChave).toBeUndefined();
    expect(JSON.stringify(outra)).toBe(JSON.stringify(s));
  });
});

describe('linha de comando', () => {
  it('imprime o JSON com o vinco na curva e a curva nova', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'vincos-rede-'));
    try {
      const arquivo = join(pasta, 'linhas.json');
      writeFileSync(arquivo, JSON.stringify(linhas()));
      const r = spawnSync(process.execPath, ['tools/mecanifica/vincos-das-linhas.mjs', 'tools/mecanifica/fixtures/alisar-rede-prova.js', `--linhas=${arquivo}`, '--passo-da-curva-mm=80'], { cwd: REPO, encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 26 });
      expect(r.status).toBe(0);
      const saida = JSON.parse(r.stdout);
      const s = saida.superficies[0];
      expect(s.cadeias.rede).toBe(true);
      /* a receita da linha de comando tem a cintura vincada: a linha já está declarada, e a curva nova usa o passo pedido */
      expect(s.vincos).toEqual([]);
      expect(s.faltantes).toHaveLength(3);
      expect(s.faltantes[0].sugestao.pontos.length).toBeLessThanOrEqual(5);
      expect(saida.opcoes.passoDaCurvaMm).toBe(80);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  }, 300000);
});
