/* ondulacao-da-superficie.test.mjs — a ferramenta de ondulação endereçada sobre a chapa desenhada por código.
 *
 * O gate da fatia 19 do plano da carroceria por subdivisão: na forma lisa a ferramenta não acusa nada; com uma ondulação
 * de 1 mm plantada entre dois pontos nomeados, ela acusa a ondulação com a amplitude a 30% do plantado e esses dois
 * pontos à frente; os vincos declarados não são acusados, e a mesma forma sem a declaração é. A emenda, que a superfície
 * limite só tem num vinco, é provada tirando da leitura a declaração do vinco vivo. Mesma receita, mesma saída. */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ondulacaoDaReceita, ondulacaoDaSuperficie, superficiesDaReceita } from './ondulacao-da-superficie.mjs';
import { PLANTADA, receitaDeProva } from './fixtures/ondulacao-prova.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = (opcoes) => ondulacaoDaReceita(receitaDeProva(opcoes)).superficies[0];
const nomes = (falha) => falha.pontos.map((p) => p.nome);

describe('ondulação endereçada aos pontos da gaiola', () => {
  it('na forma lisa não acusa nada, e o maior desvio fica abaixo do limiar', () => {
    const s = ler({});
    expect(s.falhas).toEqual([]);
    expect(s.junto).toEqual([]);
    expect(s.desvioMm.maximo).toBeLessThan(0.3);
    expect(s.vertices).toBe(2337);
  });

  it('a ondulação de 1 mm entre dois pontos nomeados sai com a amplitude a 30% e os dois pontos à frente', () => {
    const s = ler({ vincos: true, plantar: PLANTADA });
    expect(s.falhas).toHaveLength(1);
    const [f] = s.falhas;
    expect(f.tipo).toBe('ondulacao');
    expect(f.amplitudeMm).toBeGreaterThan(0.7);
    expect(f.amplitudeMm).toBeLessThan(1.3);
    expect(f.picosMm.fora).toBeGreaterThan(0.7);
    expect(f.picosMm.dentro).toBeLessThan(-0.7);
    expect(new Set(nomes(f).slice(0, 2))).toEqual(new Set(['p5_3', 'p6_3']));
    expect(f.pontos.length).toBeGreaterThanOrEqual(2);
    expect(f.pontos.length).toBeLessThanOrEqual(4);
    /* o pico fica num dos dois pontos plantados (x 500 ou 600 mm, z 300 mm) */
    expect(Math.min(Math.abs(f.posicaoMm[0] - 500), Math.abs(f.posicaoMm[0] - 600))).toBeLessThan(5);
    expect(f.posicaoMm[2]).toBeCloseTo(300, -1);
    expect(f.curvatura.superficie).toHaveLength(2);
    expect(f.curvatura.suavizada).toHaveLength(2);
  });

  it('a lombada de 1 mm sobre dois pontos sai como calombo para fora, com os dois pontos à frente', () => {
    const s = ler({ vincos: true, plantar: { p5_3: 1, p6_3: 1 } });
    expect(s.falhas).toHaveLength(1);
    expect(s.falhas[0]).toMatchObject({ tipo: 'calombo', sentido: 'fora' });
    expect(s.falhas[0].amplitudeMm).toBeGreaterThan(0.5);
    expect(new Set(nomes(s.falhas[0]).slice(0, 2))).toEqual(new Set(['p5_3', 'p6_3']));
  });

  it('os vincos declarados, vivo e de nitidez 0,6, não são acusados; sem a declaração, a mesma forma é', () => {
    const declarada = ler({ vincos: true });
    expect(declarada.falhas).toEqual([]);
    expect(declarada.junto.length).toBeGreaterThan(0);
    for (const j of declarada.junto) expect(j.distanciaDaFeicaoMm).toBeLessThanOrEqual(j.espacamentoMm);
    /* a vizinhança vai pelo caminho e não contorna a ponta do vinco: em linha reta, ela pegava o outro lado da crista
       e o desvio junto dela chegava a 6 mm */
    expect(Math.max(...declarada.junto.map((j) => j.amplitudeMm))).toBeLessThan(1.5);
    /* o mesmo desenho sem os vincos: a crista e a quebra viram falha, com os pontos delas */
    const semDeclarar = ler({ vincos: true, declarar: false });
    expect(semDeclarar.falhas.length).toBeGreaterThanOrEqual(2);
    const crista = semDeclarar.falhas.find((f) => f.posicaoMm[2] === 700);
    const quebra = semDeclarar.falhas.find((f) => f.posicaoMm[0] === 1100);
    expect(crista.amplitudeMm).toBeGreaterThan(2);
    expect(nomes(crista).every((n) => /^p\d+_[67]$/.test(n))).toBe(true);
    expect(quebra.amplitudeMm).toBeGreaterThan(0.5);
    expect(nomes(quebra)[0]).toMatch(/^p11_/);
  });

  it('a dobra que a leitura não sabe declarada sai como emenda, com o salto de normal', () => {
    const sup = superficiesDaReceita(receitaDeProva({ vincos: true }))[0];
    const r = ondulacaoDaSuperficie({ ...sup, vincos: sup.vincos.filter(([, , viva]) => !viva) });
    const emenda = r.falhas.find((f) => f.tipo === 'emenda');
    expect(emenda.saltoDeNormalGraus).toBeGreaterThan(10);
    expect(emenda.posicaoMm[2]).toBeCloseTo(700, 0);
    expect(nomes(emenda).every((n) => /_7$/.test(n))).toBe(true);
    expect(ondulacaoDaSuperficie(sup).falhas.filter((f) => f.tipo === 'emenda')).toEqual([]);
  });

  it('cada ponto nomeado traz o desvio com sinal do vértice dele: a ondulação tem os dois sinais e a lombada, o do sentido', () => {
    const [onda] = ler({ vincos: true, plantar: PLANTADA }).falhas;
    const porNome = Object.fromEntries(onda.pontos.map((p) => [p.nome, p.desvioMm]));
    expect(porNome.p5_3).toBeGreaterThan(0.5);
    expect(porNome.p6_3).toBeLessThan(-0.5);
    expect(onda.extensaoEmEspacamentos).toBeLessThan(3);
    const [fora] = ler({ vincos: true, plantar: { p5_3: 1, p6_3: 1 } }).falhas;
    expect(fora.sentido).toBe('fora');
    for (const p of fora.pontos.slice(0, 2)) expect(p.desvioMm).toBeGreaterThan(0.3);
    const [dentro] = ler({ vincos: true, plantar: { p5_3: -1, p6_3: -1 } }).falhas;
    expect(dentro.sentido).toBe('dentro');
    for (const p of dentro.pontos.slice(0, 2)) expect(p.desvioMm).toBeLessThan(-0.3);
  });

  it('a ondulação de seis pontos passa de três espaçamentos: uma rodada tira pouco, e mexer os nomeados pelo desvio tira em poucas', () => {
    /* lóbulos de dois pontos, de 2 mm para fora e para dentro, ao longo de x */
    const plantar = Object.fromEntries([3, 4, 5, 6, 7, 8].map((i) => [`p${i}_3`, (Math.floor((i - 3) / 2) % 2 ? -1 : 1) * 2]));
    const rodadas = [];
    for (let r = 0; r <= 10; r++) {
      const s = ler({ plantar });
      rodadas.push(s.falhas);
      if (!s.falhas.length) break;
      /* o que a instrução manda: cada ponto nomeado anda contra o desvio dele, e o ganho 1,5 cobre o que a versão
         suavizada acompanha */
      for (const p of s.falhas[0].pontos) plantar[p.nome] = (plantar[p.nome] ?? 0) - 1.5 * p.desvioMm;
    }
    const [primeira] = rodadas[0];
    expect(primeira.tipo).toBe('ondulacao');
    expect(primeira.extensaoEmEspacamentos).toBeGreaterThan(3);
    expect(primeira.amplitudeMm).toBeGreaterThan(1.2);
    /* uma rodada tira menos de um terço, porque o ponto que anda leva consigo a versão suavizada */
    expect(rodadas[1][0].amplitudeMm).toBeGreaterThan(0.6 * primeira.amplitudeMm);
    /* e as rodadas seguintes a tiram, com o plantado de volta quase a zero */
    expect(rodadas.length).toBeLessThanOrEqual(8);
    expect(rodadas.at(-1)).toEqual([]);
  });

  it('a mesma receita dá a mesma saída, e a linha de comando a imprime em JSON', () => {
    const a = JSON.stringify(ler({ vincos: true, plantar: PLANTADA }));
    expect(JSON.stringify(ler({ vincos: true, plantar: PLANTADA }))).toBe(a);
    const r = spawnSync(process.execPath, [join(AQUI, 'ondulacao-da-superficie.mjs'), 'tools/mecanifica/fixtures/ondulacao-prova.js'], { cwd: join(AQUI, '../..'), encoding: 'utf8' });
    expect(r.status).toBe(0);
    const saida = JSON.parse(r.stdout);
    expect(saida.falhas).toBe(1);
    expect(JSON.stringify(saida.superficies[0])).toBe(a);
    const ruim = spawnSync(process.execPath, [join(AQUI, 'ondulacao-da-superficie.mjs'), 'tools/mecanifica/fixtures/ondulacao-prova.js', '--limiar=1'], { cwd: join(AQUI, '../..'), encoding: 'utf8' });
    expect(ruim.status).toBe(1);
    expect(ruim.stderr).toMatch(/opção desconhecida --limiar=1/);
  });
});
