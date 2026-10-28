/* cortes-de-detalhe.test.mjs — os cortes de detalhe ampliados do pacote cego: uma região de detalhe declarada numa janela do plano
   gera, ao lado do corte do trecho inteiro, um corte com 4 pixels por milímetro, que ler-corte lê com o erro da escala dele e que
   ler-perfil prefere ao corte do trecho inteiro. A prova usa só formas desenhadas por código (cordao-de-prova.mjs): uma chapa de
   2,2 m de corte, inclinada e abaulada, com um cordão de 10 mm e uma calha de canal duplo de 62 mm, desenhada pelo imagens.py como o
   pacote cego. No corte do trecho inteiro, com menos de meio pixel por milímetro, o erro de leitura passa de 2 mm e o cordão de
   10 mm não se resolve; no corte ampliado o erro de leitura fica abaixo de 0,5 mm, o contorno lido fica dentro dele do desenhado e
   o cordão sai a menos de 1 mm do desenhado. A mesma declaração, num pacote feito pelo pacote-cego.py de verdade, está em
   leitura-blender.test.mjs. Só precisa de python3 com Pillow e numpy. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { distancias, pontosDe } from './distancias-de-prova.mjs';
import { py, temPillow } from './pacote-de-prova.mjs';
import { doAmbiente } from '../ambiente.mjs';
import {
  CALHA, CORDAO_10, contornoDoCorte, corteDe, linhaDeFeicao, montarDetalhesDaChapa, montarPacoteDaChapa, perfilEsperado, secaoDoDetalhe,
} from './cordao-de-prova.mjs';

const SEMI = 1100; // mm de chapa de cada lado do detalhe: o corte do trecho inteiro cobre uns 2,4 m
const WA_CORDAO = -5;
const WA_CALHA = -31;
const JANELA_MM = 150;

/** Distâncias nos dois sentidos, em mm, entre dois contornos abertos. Com LER_PERFIL_MEDIDAS=1 as medidas saem no console. */
function entre(lido, esperado, rotulo = '') {
  const a = distancias(pontosDe([{ fechada: false, pontos: lido }], 0.1), [{ fechada: false, pontos: esperado }]);
  const b = distancias(pontosDe([{ fechada: false, pontos: esperado }], 0.1), [{ fechada: false, pontos: lido }]);
  const d = { lidoParaEsperado: Math.max(...a), esperadoParaLido: Math.max(...b), maxima: Math.max(...a, ...b) };
  if (process.env.LER_PERFIL_MEDIDAS) console.log(`medida ${rotulo} ${JSON.stringify(d)}`);
  return d;
}

describe.skipIf(!temPillow)('cortes de detalhe ampliados, em chapa desenhada por código', () => {
  let dir;
  const p = (...n) => join(dir, ...n);
  const lidos = {};
  const nomes = ['z400', 'z600', 'x300'];
  const ler = (nome, args, saida) => {
    py('ler-perfil.py', ['--pacote', p(nome, 'pacote'), '--fora', '0,1,0', ...args, '--saida', p(`${saida}.json`)]);
    return JSON.parse(readFileSync(p(`${saida}.json`), 'utf8'));
  };
  const lerCorte = (nome, args) => {
    py('ler-corte.py', ['--pacote', p(nome, 'pacote'), ...args, '--saida', p('corte.json')]);
    return JSON.parse(readFileSync(p('corte.json'), 'utf8')).cortes;
  };
  const corte = (r, nome) => r.cortes.find((c) => (c.corte_pedido ?? c.corte) === nome);

  /** A janela de 150 mm em volta do meio do detalhe (w = 0) no corte dado, em metro: [u0, u1, v0, v1]. */
  const janelaDe = (c, lado = JANELA_MM) => {
    const [u, v] = contornoDoCorte(c, [[0, 0]])[0];
    return [u - lado / 2000, u + lado / 2000, v - lado / 2000, v + lado / 2000];
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'cortes-de-detalhe-'));
    for (const [nome, detalhe, wa] of [['cordao', CORDAO_10, WA_CORDAO], ['calha', CALHA, WA_CALHA]]) {
      const sec = secaoDoDetalhe(detalhe, { semi: SEMI });
      const cortes = [corteDe('z', 0.4, sec), corteDe('z', 0.6, sec), corteDe('x', 0.3, sec)];
      montarPacoteDaChapa(p(nome), cortes);
      montarDetalhesDaChapa(p(nome), cortes, cortes.map((c) => ({ regiao: nome, corte: c.nome, janela: janelaDe(c), px_por_mm: 4 })));
      writeFileSync(p(`linha-${nome}.json`), JSON.stringify({ linhas_3d: linhaDeFeicao(wa, { comprimento: 1600 }) }));
      lidos[nome] = ler(nome, ['--linhas', p(`linha-${nome}.json`), '--linha', '0', '--corte', nomes.join(',')], `ampliado-${nome}`);
      lidos[`${nome}-comum`] = ler(nome, ['--linhas', p(`linha-${nome}.json`), '--linha', '0', '--corte', nomes.join(','), '--sem-ampliado'], `comum-${nome}`);
    }
  }, 240000);
  afterAll(() => {
    if (!dir) return;
    if (doAmbiente('BLENDER_GUARDAR')) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });

  it('grava os cortes ampliados ao lado dos do trecho inteiro, com o quadro à parte e a escala pedida', () => {
    const q = JSON.parse(readFileSync(p('cordao', 'pacote', 'cortes', 'quadro-detalhe.json'), 'utf8'));
    expect(Object.keys(q).sort()).toEqual(['x300-cordao', 'z400-cordao', 'z600-cordao']);
    const base = JSON.parse(readFileSync(p('cordao', 'pacote', 'cortes', 'quadro.json'), 'utf8'));
    expect(Object.keys(base).sort()).toEqual(['x300', 'z400', 'z600']);
    for (const [nome, e] of Object.entries(q)) {
      expect(e.escala_px_m / 1000, nome).toBe(4);
      expect(e.corte_base, nome).toBe(nome.split('-')[0]);
      expect(e.regiao, nome).toBe('cordao');
      // a janela declarada de 150 mm cabe no desenho
      expect(e.W, nome).toBeGreaterThan(70 + 4 * 150);
      expect(e.escala_px_m, nome).toBeGreaterThan(base[e.corte_base].escala_px_m * 5);
    }
  });

  it('o corte do trecho inteiro tem menos de meio pixel por milímetro e erra mais de 1,5 mm; o ampliado erra menos de 0,5 mm', () => {
    const comum = lerCorte('cordao', ['--corte', 'z400'])[0];
    expect(comum.escala_px_por_mm).toBeLessThan(0.6);
    expect(comum.erro_mm).toBeGreaterThan(1.5);
    const amp = lerCorte('cordao', ['--regiao', 'cordao']);
    expect(amp.map((c) => c.corte).sort()).toEqual(['x300-cordao', 'z400-cordao', 'z600-cordao']);
    for (const c of amp) {
      expect(c.ampliado, c.corte).toBe(true);
      expect(c.escala_px_por_mm, c.corte).toBe(4);
      expect(c.erro_mm, c.corte).toBeLessThan(0.5);
      expect(c.polilinhas.length, c.corte).toBeGreaterThanOrEqual(1);
    }
  });

  it('o contorno lido do corte ampliado fica, nos dois sentidos, a menos de 0,5 mm do desenhado, dentro da janela', () => {
    const c = corteDe('z', 0.4, secaoDoDetalhe(CORDAO_10, { semi: SEMI }));
    const exato = contornoDoCorte(c, c.secao).map(([u, v]) => [u * 1000, v * 1000]);
    const r = lerCorte('cordao', ['--corte', 'z400-cordao'])[0];
    const lido = r.polilinhas[0].pontos_mm;
    const [[u0, v0], [u1, v1]] = r.moldura_mm;
    const dentro = exato.filter(([u, v]) => u > u0 + 3 && u < u1 - 3 && v > v0 + 3 && v < v1 - 3);
    const a = distancias(pontosDe([{ fechada: false, pontos: lido }], 0.1).filter(([u, v]) => u > u0 + 3 && u < u1 - 3 && v > v0 + 3 && v < v1 - 3), [{ fechada: false, pontos: exato }]);
    const b = distancias(pontosDe([{ fechada: false, pontos: dentro }], 0.1), [{ fechada: false, pontos: lido }]);
    const estat = (d) => { const s = [...d].sort((x, y) => x - y); return { p95: s[Math.floor(0.95 * (s.length - 1))], maxima: s[s.length - 1] }; };
    expect(estat(a).maxima, `lido para exato ${JSON.stringify(estat(a))}`).toBeLessThan(0.5);
    expect(estat(b).maxima, `exato para lido ${JSON.stringify(estat(b))}`).toBeLessThan(0.5);
    expect(estat(a).p95, 'lido para exato').toBeLessThanOrEqual(r.erro_mm);
    expect(estat(b).p95, 'exato para lido').toBeLessThanOrEqual(r.erro_mm);
  });

  it('o contorno do corte ampliado acaba na borda da janela: nada do trecho de fora entra no desenho', () => {
    const r = lerCorte('cordao', ['--corte', 'z400-cordao'])[0];
    const [[u0, v0], [u1, v1]] = r.moldura_mm;
    for (const q of r.polilinhas) {
      for (const [u, v] of q.pontos_mm) {
        expect(u).toBeGreaterThanOrEqual(u0 - 0.5);
        expect(u).toBeLessThanOrEqual(u1 + 0.5);
        expect(v).toBeGreaterThanOrEqual(v0 - 0.5);
        expect(v).toBeLessThanOrEqual(v1 + 0.5);
      }
    }
  });

  it('ler-perfil prefere o corte ampliado e lê o cordão de 10 mm a menos de 1 mm do desenhado', () => {
    const esperado = perfilEsperado(CORDAO_10, WA_CORDAO);
    const largura = Math.max(...esperado.map((q) => q[0])) - Math.min(...esperado.map((q) => q[0]));
    expect(largura).toBeGreaterThan(9.5);
    for (const nome of nomes) {
      const c = corte(lidos.cordao, nome);
      expect(c.corte, nome).toBe(`${nome}-cordao`);
      expect(c.corte_pedido, nome).toBe(nome);
      expect(c.ampliado, nome).toBe(true);
      expect(c.detalhe, nome).toBe(true);
      expect(c.erro_leitura_mm ?? c.erro_mm.leitura, nome).toBeLessThan(0.5);
      const d = entre(c.perfil_aberto_mm, esperado, `cordão ampliado ${nome} erro ${JSON.stringify(c.erro_mm)} largura ${c.largura_mm} altura ${c.altura_mm}`);
      expect(d.maxima, `${nome}: ${JSON.stringify(d)} erro ${JSON.stringify(c.erro_mm)}`).toBeLessThan(1);
      expect(d.maxima, `${nome}: ${JSON.stringify(d)}`).toBeLessThan(0.5);
      expect(Math.abs(c.largura_mm - largura), nome).toBeLessThan(1);
      expect(c.altura_mm, nome).toBeGreaterThan(2.3);
      expect(c.altura_mm, nome).toBeLessThan(3.7);
    }
  });

  it('o corte do trecho inteiro não resolve o cordão de 10 mm: não o acha ou erra mais de 1 mm', () => {
    const esperado = perfilEsperado(CORDAO_10, WA_CORDAO);
    for (const nome of nomes) {
      const c = corte(lidos['cordao-comum'], nome);
      if (c) {
        expect(c.corte, nome).toBe(nome);
        expect(c.ampliado, nome).toBe(false);
        if (c.detalhe) {
          const d = entre(c.perfil_aberto_mm, esperado, `cordão comum ${nome} erro ${JSON.stringify(c.erro_mm)}`);
          expect(c.erro_mm.total > 1 || d.maxima > 1, `${nome}: ${JSON.stringify(d)} erro ${JSON.stringify(c.erro_mm)}`).toBe(true);
        }
      }
    }
    const recusados = lidos['cordao-comum'].recusados.length;
    const semDetalhe = lidos['cordao-comum'].cortes.filter((c) => !c.detalhe).length;
    const medidos = lidos['cordao-comum'].cortes.filter((c) => c.detalhe);
    expect(recusados + semDetalhe + medidos.length).toBe(3);
  });

  it('a calha de canal duplo de 62 mm sai do corte ampliado a menos de 1 mm', () => {
    const esperado = perfilEsperado(CALHA, WA_CALHA);
    for (const nome of ['z400', 'z600']) {
      const c = corte(lidos.calha, nome);
      expect(c.ampliado, nome).toBe(true);
      expect(c.detalhe, nome).toBe(true);
      const d = entre(c.perfil_aberto_mm, esperado, `calha ampliada ${nome} erro ${JSON.stringify(c.erro_mm)} largura ${c.largura_mm} altura ${c.altura_mm}`);
      expect(d.maxima, `${nome}: ${JSON.stringify(d)} erro ${JSON.stringify(c.erro_mm)}`).toBeLessThan(1);
    }
  });

  it('o corte ampliado pedido pelo nome, a região pedida e o corte comum forçado escolhem a fonte certa, e o ponto fora da janela volta ao comum com o motivo', () => {
    const pelaNome = ler('cordao', ['--linhas', p('linha-cordao.json'), '--linha', '0', '--corte', 'z400-cordao'], 'pelo-nome');
    expect(pelaNome.cortes[0].corte).toBe('z400-cordao');
    const regiao = ler('cordao', ['--linhas', p('linha-cordao.json'), '--linha', '0', '--corte', 'z400', '--regiao', 'cordao'], 'regiao');
    expect(regiao.cortes[0].ampliado).toBe(true);
    expect(() => py('ler-perfil.py', ['--pacote', p('cordao', 'pacote'), '--linhas', p('linha-cordao.json'), '--linha', '0', '--corte', 'z400', '--regiao', 'outra'])).toThrow(/regiões que o pacote não tem/);
    // um alvo na chapa a 300 mm do cordão cai fora do desenho ampliado, e a leitura volta ao corte do trecho inteiro
    const [uL, vL] = contornoDoCorte({ eixo: 'z', valor: 0.4 }, [[300, 0]])[0].map((v) => Math.round(v * 1e4) / 10);
    const longe = JSON.parse(py('ler-perfil.py', ['--pacote', p('cordao', 'pacote'), '--fora', '0,1,0', '--alvo', `z400:${uL},${vL}`, '--corte', 'z400', '--tangente', '0.57,0,0.82']));
    expect(longe.resumo.join(' ')).toMatch(/lido no corte do trecho inteiro, porque/);
  });

  it('repete a mesma saída', () => {
    const a = ler('cordao', ['--linhas', p('linha-cordao.json'), '--linha', '0', '--corte', nomes.join(',')], 'repete');
    expect(a.cortes.map((c) => c.perfil)).toEqual(lidos.cordao.cortes.map((c) => c.perfil));
  });
});
