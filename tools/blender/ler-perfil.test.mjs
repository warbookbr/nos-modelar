/* ler-perfil.test.mjs — ler-perfil.py tira do contorno de um corte do pacote cego o perfil de um detalhe de borda, em milímetro,
   no plano normal à linha de feição e no formato do `perfil` do `friso`. A prova usa só formas desenhadas por código
   (cordao-de-prova.mjs): uma chapa inclinada e abaulada, cortada a 35 e a 55 graus da normal da linha, com um cordão de 25 mm e uma
   calha de canal duplo de 62 mm, desenhadas pelo imagens.py como o pacote cego (cotas e anéis por cima do traço). O perfil lido
   fica a menos de 1 mm do desenhado nos cortes a 35 graus e dentro do erro declarado no corte a 55, o friso refeito com ele
   sobre a chapa sem o detalhe volta à forma desenhada a menos de 1 mm no corte que o produziu e no outro plano, e a correção da
   projeção é o que separa o perfil certo do que se leria tomando o corte por normal. Só precisa de python3 com Pillow e numpy. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { nucleo } from '../../procedural/nucleo/entrada.js';
import { distancias, pontosDe } from './distancias-de-prova.mjs';
import { py, temPillow } from './pacote-de-prova.mjs';
import {
  CALHA, CORDAO, FI, ROLO, ROLO_CENTRO, ROLO_RAIO, SULCO, T0, W0, base, contornoDoCorte, corteDe, linhaDeFeicao, montarPacoteDaChapa, perfilEsperado, pontoEsperado,
  quadroEsperado, secaoDoDetalhe,
} from './cordao-de-prova.mjs';

const WA_CORDAO = -12.5; // a linha de feição no pé esquerdo do cordão (mm)
const WA_CALHA = -31;
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
/** O ponto da chapa em w = wa (mm) no plano de corte {eixo, valor}, em mm, como `u,w` de --alvo. */
const noCorte = (eixo, valor, wa) => contornoDoCorte({ eixo, valor }, [[wa, 0]])[0].map((v) => Math.round(v * 1e4) / 10).join(',');

/** Distâncias nos dois sentidos, em mm, entre o contorno lido e o esperado (aberto, de base a base). Com LER_PERFIL_MEDIDAS=1 as
    medidas saem no console, com o rótulo, para o texto da documentação. */
function entre(lido, esperado, rotulo = '') {
  const a = distancias(pontosDe([{ fechada: false, pontos: lido }], 0.25), [{ fechada: false, pontos: esperado }]);
  const b = distancias(pontosDe([{ fechada: false, pontos: esperado }], 0.25), [{ fechada: false, pontos: lido }]);
  const d = { lidoParaEsperado: Math.max(...a), esperadoParaLido: Math.max(...b), maxima: Math.max(...a, ...b) };
  if (process.env.LER_PERFIL_MEDIDAS) console.log(`medida ${rotulo} ${JSON.stringify(d)}`);
  return d;
}

/** Os segmentos do plano de corte (eixo, valor) com a malha {V, F}, em mm, como pares [[a, y], [a, y]] (a é x no corte z e z no corte x). */
function cortarMalha(V, F, eixo, valor) {
  const k = eixo === 'z' ? 2 : 0;
  const h = eixo === 'z' ? 0 : 2;
  const segs = [];
  for (const f of F.values()) {
    const P = f.vs.map((id) => V.get(id));
    for (let i = 1; i + 1 < P.length; i++) {
      const T = [P[0], P[i], P[i + 1]];
      const pts = [];
      for (let e = 0; e < 3; e++) {
        const [A, B] = [T[e], T[(e + 1) % 3]];
        const da = A[k] - valor;
        const db = B[k] - valor;
        if ((da < 0) !== (db < 0) && da !== db) { const t = da / (da - db); pts.push([(A[h] + t * (B[h] - A[h])) * 1000, (A[1] + t * (B[1] - A[1])) * 1000]); }
      }
      if (pts.length === 2) segs.push(pts);
    }
  }
  return segs;
}

/** A forma de baixo para cima do friso no plano de corte: para cada abscissa a, o ponto mais alto da seção. */
function topoDaSecao(segs, a) {
  let topo = -Infinity;
  for (const [p, q] of segs) {
    if ((p[0] - a) * (q[0] - a) > 0 || p[0] === q[0]) continue;
    const t = (a - p[0]) / (q[0] - p[0]);
    topo = Math.max(topo, p[1] + t * (q[1] - p[1]));
  }
  return topo;
}

describe.skipIf(!temPillow)('perfil lido do corte, em chapa desenhada por código', () => {
  let dir;
  const p = (...n) => join(dir, ...n);
  const lidos = {};
  const secCordao = secaoDoDetalhe(CORDAO);
  const secCalha = secaoDoDetalhe(CALHA);
  const ler = (nome, args, saida = nome) => { py('ler-perfil.py', ['--pacote', p(nome, 'pacote'), '--fora', '0,1,0', ...args, '--saida', p(`${saida}.json`)]); return JSON.parse(readFileSync(p(`${saida}.json`), 'utf8')); };
  const T = T0.map((v) => v.toFixed(4)).join(',');

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ler-perfil-'));
    const cortes = (sec) => [corteDe('z', 0.4, sec), corteDe('z', 0.6, sec), corteDe('x', 0.3, sec)];
    montarPacoteDaChapa(p('cordao'), cortes(secCordao));
    montarPacoteDaChapa(p('calha'), cortes(secCalha));
    montarPacoteDaChapa(p('afunilado'), [corteDe('z', 0.4, secCordao), corteDe('z', 0.6, secaoDoDetalhe(CORDAO, { largura: 0.8 }))]);
    montarPacoteDaChapa(p('sulco'), [corteDe('z', 0.4, secaoDoDetalhe(SULCO))]);
    montarPacoteDaChapa(p('rolo'), [corteDe('z', 0.4, secaoDoDetalhe(ROLO)), corteDe('z', 0.6, secaoDoDetalhe(ROLO))]);
    writeFileSync(p('linha-rolo.json'), JSON.stringify({ linhas_3d: linhaDeFeicao(0, { comprimento: 1600 }) }));
    writeFileSync(p('linha-exata.json'), JSON.stringify({ linhas_3d: linhaDeFeicao(WA_CORDAO, { comprimento: 1600 }) }));
    writeFileSync(p('linha-calha.json'), JSON.stringify({ linhas_3d: linhaDeFeicao(WA_CALHA, { comprimento: 1600 }) }));
    writeFileSync(p('linha-ruidosa.json'), JSON.stringify({ linhas_3d: linhaDeFeicao(WA_CORDAO, { comprimento: 1600, ruido: 0.6 }) }));
    lidos.cordao = ler('cordao', ['--linhas', p('linha-exata.json'), '--linha', '0', '--corte', 'z400,z600,x300', '--imagens', p('img')]);
    lidos.calha = ler('calha', ['--linhas', p('linha-calha.json'), '--linha', '0', '--corte', 'z400,z600,x300']);
  }, 180000);
  afterAll(() => {
    if (!dir) return;
    if (process.env.MECANIFICA_BLENDER_GUARDAR) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });
  const corte = (r, nome) => r.cortes.find((c) => c.corte === nome);

  it('o cordão de 25 mm sai a menos de 1 mm do desenhado nos cortes a 35 graus, nos dois sentidos, e dentro do erro declarado no de 55', () => {
    const esperado = perfilEsperado(CORDAO, WA_CORDAO);
    const largura = Math.max(...esperado.map((q) => q[0])) - Math.min(...esperado.map((q) => q[0]));
    expect(largura).toBeGreaterThan(24);
    expect(largura).toBeLessThan(27);
    for (const nome of ['z400', 'z600', 'x300']) {
      const c = corte(lidos.cordao, nome);
      expect(c.detalhe, nome).toBe(true);
      const d = entre(c.perfil_aberto_mm, esperado, `cordão ${nome} erro ${JSON.stringify(c.erro_mm)} largura ${c.largura_mm} altura ${c.altura_mm}`);
      // a leitura cobre o desvio medido: o erro declarado (leitura, base e direção da linha) é o limite
      expect(d.maxima, `${nome}: ${JSON.stringify(d)} erro ${JSON.stringify(c.erro_mm)}`).toBeLessThanOrEqual(c.erro_mm.total);
      if (nome !== 'x300') expect(d.maxima, `${nome}: ${JSON.stringify(d)}`).toBeLessThan(1);
      expect(c.largura_mm, nome).toBeGreaterThan(largura - 1.5);
      expect(c.largura_mm, nome).toBeLessThan(largura + 1.5);
      expect(c.altura_mm, nome).toBeGreaterThan(5.0);
      expect(c.altura_mm, nome).toBeLessThan(6.5);
      expect(c.abaixo_da_chapa_mm, nome).toBe(0);
      // u = 0 na linha, no pé esquerdo do cordão: o perfil fica do lado que o friso pede
      expect(Math.abs(c.u_min_mm), nome).toBeLessThan(1.5);
    }
  });

  it('a calha de canal duplo de 62 mm sai a menos de 1 mm do desenhado, com as três nervuras e os canais na base', () => {
    const esperado = perfilEsperado(CALHA, WA_CALHA);
    for (const nome of ['z400', 'z600']) {
      const c = corte(lidos.calha, nome);
      const d = entre(c.perfil_aberto_mm, esperado, `calha ${nome} erro ${JSON.stringify(c.erro_mm)} largura ${c.largura_mm} altura ${c.altura_mm}`);
      expect(d.maxima, `${nome}: ${JSON.stringify(d)} erro ${JSON.stringify(c.erro_mm)}`).toBeLessThan(1);
      const larguraEsperada = Math.max(...esperado.map((r) => r[0])) - Math.min(...esperado.map((r) => r[0]));
      expect(Math.abs(c.largura_mm - larguraEsperada), nome).toBeLessThan(1.5);
      // as cristas: a lista de alturas tem três máximos locais acima de 4 mm
      const v = c.perfil_aberto_mm.map((q) => q[1]);
      let cristas = 0;
      for (let i = 1; i + 1 < v.length; i++) if (v[i] > 4 && v[i] >= v[i - 1] && v[i] > v[i + 1] && v.slice(Math.max(0, i - 4), i + 5).every((x) => x <= v[i] + 1e-9)) cristas += 1;
      expect(cristas, nome).toBeGreaterThanOrEqual(3);
    }
    const c = corte(lidos.calha, 'x300');
    expect(entre(c.perfil_aberto_mm, esperado).maxima).toBeLessThanOrEqual(c.erro_mm.total);
  });

  it('o corte a 35 e a 55 graus da normal vem com a obliquidade e os fatores de projeção da forma, e a correção é o que acerta a largura', () => {
    const q = quadroEsperado(WA_CORDAO);
    const b = [W0[0], 0.3 - 2 * 0.25 * (WA_CORDAO / 1000), W0[2]];
    const bn = Math.hypot(...b);
    const beta = Math.abs(dot(b.map((x) => x / bn), q.u));
    const z = corte(lidos.cordao, 'z400');
    const x = corte(lidos.cordao, 'x300');
    expect(z.projecao.obliquidade_graus).toBeGreaterThan(34);
    expect(z.projecao.obliquidade_graus).toBeLessThan(37);
    expect(x.projecao.obliquidade_graus).toBeGreaterThan(53);
    expect(x.projecao.obliquidade_graus).toBeLessThan(57);
    expect(z.projecao.fator_largura).toBeGreaterThan(0.75);
    expect(z.projecao.fator_largura).toBeLessThan(0.9);
    expect(x.projecao.fator_largura).toBeLessThan(z.projecao.fator_largura);
    expect(beta).toBeGreaterThan(0.5); // a chapa inclinada, que o fator do corte de 35 graus leva em conta
    // sem a tangente, o mesmo corte tomado por normal à linha estica a largura pelo inverso do fator
    const sem = ler('cordao', ['--alvo', `z400:${noCorte('z', 0.4, WA_CORDAO)}`, '--corte', 'z400'], 'sem-tangente');
    expect(sem.cortes[0].tangente_dada).toBe(false);
    const larguraEsperada = Math.max(...perfilEsperado(CORDAO, WA_CORDAO).map((r) => r[0])) - Math.min(...perfilEsperado(CORDAO, WA_CORDAO).map((r) => r[0]));
    expect(Math.abs(z.largura_mm - larguraEsperada)).toBeLessThan(1.5);
    expect(Math.abs(sem.cortes[0].largura_mm - larguraEsperada)).toBeGreaterThan(3);
  });

  it('com a linha ruidosa de 0,6 mm a forma não muda (âncora no centro) e o erro da tangente entra no erro declarado', () => {
    const ruidosa = ler('cordao', ['--linhas', p('linha-ruidosa.json'), '--linha', '0', '--corte', 'z400,z600', '--ancora', 'centro']);
    const esperado = perfilEsperado(CORDAO, WA_CORDAO);
    const u0 = (Math.max(...esperado.map((q) => q[0])) + Math.min(...esperado.map((q) => q[0]))) / 2;
    const centrado = esperado.map(([u, v]) => [u - u0, v]);
    for (const c of ruidosa.cortes) {
      expect(c.projecao.erro_da_tangente_mm).toBeGreaterThan(0);
      expect(c.erro_mm.total).toBeGreaterThan(c.erro_mm.leitura);
      expect(entre(c.perfil_aberto_mm, centrado).maxima, `${c.corte}`).toBeLessThanOrEqual(Math.max(c.erro_mm.total, 1));
    }
  });

  it('com caixa no plano do corte, o perfil sai igual e a âncora padrão é o centro do detalhe', () => {
    const [x0, y0] = noCorte('z', 0.4, WA_CORDAO).split(',').map(Number);
    const caixa = ler('cordao', ['--caixa', `z400:${x0 - 3},${x0 + 37},${y0 - 6},${y0 + 16}`, '--corte', 'z400', '--tangente', T], 'caixa');
    const c = caixa.cortes[0];
    expect(c.ancora).toBe('centro');
    expect(c.tangente_dada).toBe(true);
    expect(Math.abs(c.u_min_mm + c.u_max_mm)).toBeLessThan(0.5);
    const esperado = perfilEsperado(CORDAO, WA_CORDAO);
    const u0 = (Math.max(...esperado.map((q) => q[0])) + Math.min(...esperado.map((q) => q[0]))) / 2;
    expect(entre(c.perfil_aberto_mm, esperado.map(([u, v]) => [u - u0, v])).maxima).toBeLessThan(1);
  });

  /** O friso de `perfil` (metro) na polilinha ao longo de t pelo âncora wa, com a normal da chapa, cortado pelo plano dado e unido à chapa sem o
      detalhe (o mais alto dos dois em cada abscissa), contra o contorno desenhado do detalhe nesse plano: as distâncias nos dois sentidos. */
  function refazerOFriso(nome, detalhe, wa, perfil, plano) {
    const q = quadroEsperado(wa);
    const A = q.p.map((v, i) => v - 0.8 * q.t[i]);
    const B = q.p.map((v, i) => v + 0.8 * q.t[i]);
    const n = nucleo([['friso', { origemId: 1, linha: { nome: 'detalhe', pontos: [A, q.p, B] }, normal: q.n, perfil, ponta: 'aberta' }]]);
    expect(n.orfaos, nome).toEqual([]);
    const segs = cortarMalha(n.V, n.F, plano.eixo, plano.valor);
    expect(segs.length, nome).toBeGreaterThan(10);
    const a = segs.flat().map((s) => s[0]);
    const [lo, hi] = [Math.min(...a) - 8, Math.max(...a) + 8];
    const yBase = (abs) => base(plano.eixo === 'z' ? (abs / 1000) * Math.cos(FI) - plano.valor * Math.sin(FI) : plano.valor * Math.cos(FI) - (abs / 1000) * Math.sin(FI)) * 1000;
    const uniao = [];
    for (let abs = lo; abs <= hi; abs += 0.25) uniao.push([abs, Math.max(yBase(abs), topoDaSecao(segs, abs))]);
    const desenhado = contornoDoCorte(plano, secaoDoDetalhe(detalhe)).map(([u, v]) => [u * 1000, v * 1000]).filter(([u]) => u >= lo && u <= hi).sort((r, s) => r[0] - s[0]);
    return entre(uniao, desenhado, `friso ${nome} ${plano.eixo}=${plano.valor}`);
  }

  it('o friso refeito com o perfil lido, sobre a chapa sem o detalhe, volta à forma desenhada a menos de 1 mm, nos planos z e x', () => {
    for (const [nome, lido, detalhe, wa] of [['cordão', lidos.cordao, CORDAO, WA_CORDAO], ['calha', lidos.calha, CALHA, WA_CALHA]]) {
      const c = corte(lido, 'z400');
      expect(c.perfil_valido, nome).toBe(true);
      for (const plano of [{ eixo: 'z', valor: 0.4 }, { eixo: 'z', valor: 0.55 }, { eixo: 'x', valor: 0.3 }]) {
        const d = refazerOFriso(nome, detalhe, wa, c.perfil, plano);
        expect(d.maxima, `${nome} no plano ${plano.eixo}=${plano.valor}: ${JSON.stringify(d)}`).toBeLessThan(1);
      }
    }
  });

  it('o teste do friso não é vazio: o perfil espelhado em u, que é o da linha percorrida ao contrário, fica a mais de 3 mm da forma desenhada', () => {
    const c = corte(lidos.cordao, 'z400');
    const d = refazerOFriso('cordão espelhado', CORDAO, WA_CORDAO, c.perfil_se_a_linha_for_percorrida_ao_contrario, { eixo: 'z', valor: 0.4 });
    expect(d.maxima, JSON.stringify(d)).toBeGreaterThan(3);
  });

  it('o lábio enrolado de uma calha, que a leitura quebra no cruzamento, sai como círculo ajustado, e o resto como polígono simples que o friso aceita', () => {
    const r = ler('rolo', ['--linhas', p('linha-rolo.json'), '--linha', '0', '--corte', 'z400,z600']);
    const [cu, cv] = pontoEsperado(0, ...ROLO_CENTRO);
    for (const c of r.cortes) {
      expect(c.perfil_valido, c.corte).toBe(true);
      expect(c.lacos.length, c.corte).toBe(1);
      const l = c.lacos[0];
      expect(Math.hypot(l.centro_mm[0] - cu, l.centro_mm[1] - cv), `${c.corte} centro ${l.centro_mm} contra ${[cu, cv]}`).toBeLessThan(1);
      // o raio encolhe de 6,5 para 5,5 mm ao longo da volta
      expect(l.raio_mm, c.corte).toBeGreaterThan(ROLO_RAIO - 1.5);
      expect(l.raio_mm, c.corte).toBeLessThan(ROLO_RAIO);
      expect(c.avisos.join(' '), c.corte).toMatch(/enrola 1 vez/);
      // os dois frisos, o polígono e o tubo no laço, são aceitos pelo passo
      const q = quadroEsperado(0);
      const linha = [q.p.map((v, i) => v - 0.8 * q.t[i]), q.p, q.p.map((v, i) => v + 0.8 * q.t[i])];
      for (const perfil of [c.perfil, l.perfil]) {
        const n = nucleo([['friso', { origemId: 1, linha: { nome: 'detalhe', pontos: linha }, normal: q.n, perfil }]]);
        expect(n.orfaos, c.corte).toEqual([]);
      }
    }
  });

  it('o perfil refeito ao contrário da linha é o espelho em u, e o aberto anda de base a base', () => {
    const c = corte(lidos.cordao, 'z400');
    expect(c.perfil_se_a_linha_for_percorrida_ao_contrario.length).toBe(c.perfil.length);
    const us = c.perfil.map((r) => r[0]).sort((a, b) => a - b);
    const ue = c.perfil_se_a_linha_for_percorrida_ao_contrario.map((r) => -r[0]).sort((a, b) => a - b);
    us.forEach((u, i) => expect(u).toBeCloseTo(ue[i], 6));
    const ab = c.perfil_aberto_mm;
    expect(Math.abs(ab[0][1])).toBeLessThan(0.3);
    expect(Math.abs(ab[ab.length - 1][1])).toBeLessThan(0.3);
  });

  it('com mais de um corte, diz quanto o perfil varia: nada num cordão uniforme, e a diferença de largura num cordão afunilado', () => {
    const u = lidos.cordao.conjunto;
    expect(u.cortes.sort()).toEqual(['x300', 'z400', 'z600']);
    expect(u.largura_mm.variacao).toBeLessThan(1.5);
    expect(u.altura_mm.variacao).toBeLessThan(0.6);
    expect(u.perfil.length).toBeGreaterThan(6);
    expect(u.perfil_medio.length).toBeGreaterThan(6);
    const afunilado = ler('afunilado', ['--alvo', `z400:${noCorte('z', 0.4, WA_CORDAO)};z600:${noCorte('z', 0.6, WA_CORDAO)}`, '--corte', 'z400,z600', '--tangente', T, '--ancora', 'inicio']);
    const v = afunilado.conjunto;
    if (process.env.LER_PERFIL_MEDIDAS) console.log(`medida afunilado ${JSON.stringify({ largura: v.largura_mm, altura: v.altura_mm, distancia: v.distancia_maxima_entre_perfis_mm, erro: v.erro_de_leitura_mm })}`);
    // o cordão de 25 mm contra o de 20 mm: a largura varia 5 mm no desenho, no perfil lido a menos do erro de leitura
    expect(v.largura_mm.variacao).toBeGreaterThan(3);
    expect(v.largura_mm.variacao).toBeLessThan(7);
    expect(v.variacao_acima_do_erro).toBe(true);
    expect(v.distancia_maxima_entre_perfis_mm).toBeGreaterThan(v.erro_de_leitura_mm);
  });

  it('avisa do que o friso não refaz: o sulco abaixo da chapa', () => {
    const r = ler('sulco', ['--alvo', `z400:${noCorte('z', 0.4, 0)}`, '--corte', 'z400', '--tangente', T]);
    const c = r.cortes[0];
    expect(c.abaixo_da_chapa_mm).toBeGreaterThan(2);
    expect(c.abaixo_da_chapa_mm).toBeLessThan(4);
    expect(c.avisos.join(' ')).toMatch(/abaixo da chapa/);
  });

  it('sem `fora`, numa chapa aberta, o palpite do lado de fora fica incerto e o perfil avisa', () => {
    const r = JSON.parse(py('ler-perfil.py', ['--pacote', p('cordao', 'pacote'), '--linhas', p('linha-exata.json'), '--linha', '0', '--corte', 'z400']));
    expect(r.cortes[0].fora_por).toMatch(/oposta ao centro/);
    expect(r.cortes[0].avisos.join(' ')).toMatch(/declare `fora`/);
    expect(lidos.cordao.cortes[0].fora_por).toBe('declarada');
  });

  it('repete a mesma saída e recusa o corte que não é do detalhe', () => {
    py('ler-perfil.py', ['--pacote', p('cordao', 'pacote'), '--fora', '0,1,0', '--linhas', p('linha-exata.json'), '--linha', '0', '--corte', 'z400,z600,x300', '--saida', p('cordao-2.json')]);
    const a = JSON.parse(readFileSync(p('cordao-2.json'), 'utf8'));
    expect(a.cortes.map((c) => c.perfil)).toEqual(lidos.cordao.cortes.map((c) => c.perfil));
    expect(() => py('ler-perfil.py', ['--pacote', p('cordao', 'pacote'), '--alvo', 'z400:0,0', '--corte', 'z400'])).toThrow(/mais perto/);
  });
});
