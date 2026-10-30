/* molduras-do-vao-casos-reais.test.mjs — a conferência da moldura em volta do vão em dois casos reais (fatia 20 do plano de ajustes no
 * núcleo dos veículos).
 *
 * Caso 1: a chapa lateral feita pela rede de curvas (`procedural/nucleo/fixtures/gaiola-por-rede-prova.js`), 1000 × 600 mm, com a janela
 * em gota, o arco de roda, a coluna inclinada e a moldura de 10 mm sobre a curva da janela. Caso 2: o painel lateral da perua do acervo
 * como chapa (`tools/modelar/fixtures/painel-da-perua-prova.js`), com os três vãos de vidro na estufa que afunila 10,7 graus para dentro,
 * as medidas da TABELA da perua e uma moldura em volta de cada vão. Nos dois, a moldura inteira passa, e a que falta num trecho, a emenda
 * de perfis diferentes e o canto de cortes retos reprovam com o lugar dito.
 *
 * Os casos reais mostraram três defeitos da conferência, corrigidos em `procedural/nucleo/moldura-do-vao.js` e provados aqui: dois frisos
 * do mesmo perfil emendados num ponto em que a linha curva viram 'degrau' (os anéis eram comparados no espaço, e o giro de um corte em
 * relação ao outro dava meia largura × giro, 0,60 mm na janela com um nível de refino e 0 mm de diferença de perfil); a emenda no vinco
 * vivo da chapa virava 'canto' com entalhe de 3,8 mm (o giro contava a dobra da própria chapa, e o leque media pontos acima dela); e o
 * trecho descoberto longo dizia a faixa mais perto a '∞ mm' (a busca parava a 50 mm). */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../procedural/nucleo/entrada.js';
import { ESPESSURA, MOLDURA, montagem, receitaComMoldura } from '../../procedural/nucleo/fixtures/gaiola-por-rede-prova.js';
import * as painel from '../../tools/modelar/fixtures/painel-da-perua-prova.js';
import { TABELA } from '../../procedural/pecas/carro-perua/receita.js';
import { conferirVaosDaPeca, formatarVaos } from './molduras-do-vao.js';

const mm = (m) => m * 1000;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe('caso 1: a janela em gota da chapa feita pela rede de curvas', () => {
  const g = montagem();
  const janela = g.linha('janela');
  const perfil = (largura) => ({ retangulo: { largura, profundidade: MOLDURA.profundidade, centro: [0, MOLDURA.centro] } });
  /* a chapa da prova com os frisos dados, cada um [nome, pontos, largura], e a conferência do vão declarado */
  const confere = (frisos, { borda = janela, niveis = 2 } = {}) => {
    const passos = [
      ['subdivisao', { origemId: 1, ...g.passo, espessura: ESPESSURA, niveis }],
      ...frisos.map(([nome, pontos, largura], k) => ['friso', { origemId: k + 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome, pontos }, perfil: perfil(largura) }]),
    ];
    const neutro = nucleo(passos, g.pontos);
    expect(neutro.orfaos).toEqual([]);
    /* toda abertura da chapa é declarada: quando o vão medido não é a janela, ela entra sem moldura */
    const outra = borda === janela ? [] : [{ nome: 'janelaSemMoldura', borda: janela, semMoldura: { motivo: 'o caso mede só a borda da frente ou o arco de roda' } }];
    return conferirVaosDaPeca(neutro, { vaos: [{ nome: 'janela', borda, frisos: frisos.map(([nome]) => nome) }, ...outra] });
  };

  it('a moldura da prova, um friso só pela curva da janela, cobre a borda inteira nos dois refinos', () => {
    for (const niveis of [1, 2]) {
      const r = receitaComMoldura({}, niveis);
      const neutro = nucleo(r.PASSOS, r.TOPO);
      const c = conferirVaosDaPeca(neutro, { vaos: [{ nome: 'janela', borda: janela, frisos: ['molduraDaJanela'] }] });
      expect(c.problemas).toEqual([]);
      const v = c.vaos[0];
      expect(v.cobertas).toBe(v.amostras);
      expect(v.emendas).toEqual([]);
      /* a volta da gota, medida sobre a chapa: dois arcos de raio 115 e 20 mm e as duas tangentes */
      expect(mm(v.comprimento)).toBeGreaterThan(1330);
      expect(mm(v.comprimento)).toBeLessThan(1338);
    }
  });

  it('a moldura que vai de U1 a U2 e não fecha a volta reprova, com o trecho entre os dois nós e a distância da faixa em número', () => {
    const r = confere([['parcial', g.linha('janela', 'U1', 'U2'), 0.01]]);
    expect(r.ok).toBe(false);
    const v = r.vaos[0];
    expect(v.descobertos).toHaveLength(1);
    const t = v.descobertos[0];
    expect(t.entre).toEqual(['U2', 'U1']);
    /* o arco de cima da gota, da ponta à parte larga */
    expect(mm(t.comprimento)).toBeGreaterThan(550);
    expect(mm(t.comprimento)).toBeLessThan(560);
    /* o meio do trecho está a mais de 50 mm de qualquer faixa: antes a busca parava ali e o texto dizia '∞ mm' */
    expect(Number.isFinite(t.distanciaDaFaixa)).toBe(true);
    expect(mm(t.distanciaDaFaixa)).toBeGreaterThan(100);
    expect(mm(t.distanciaDaFaixa)).toBeLessThan(200);
    expect(r.problemas[0]).toMatch(/trecho da borda sem moldura, 55\d,\d mm entre 'U2' e 'U1' perto de .*; a faixa mais perto fica a 1\d\d,\d mm do meio do trecho/);
    expect(r.problemas[0]).not.toMatch(/∞/);
  });

  it('dois frisos de 10 e 14 mm emendados em U1 e L2 reprovam com o degrau de 2 mm nas duas emendas, sobre a curva', () => {
    const r = confere([['a', g.linha('janela', 'U1', 'L2'), 0.01], ['b', g.linha('janela', 'L2', 'U1'), 0.014]]);
    expect(r.ok).toBe(false);
    expect(r.vaos[0].descobertos).toEqual([]);
    expect(r.vaos[0].emendas).toHaveLength(2);
    for (const e of r.vaos[0].emendas) {
      expect(e.tipo).toBe('reta');
      expect(mm(e.degrau)).toBeCloseTo(2, 2);
    }
    expect(r.problemas).toHaveLength(2);
    expect(r.problemas[0]).toMatch(/degrau na emenda de 'a' com 'b' perto de .*: os perfis das duas pontas diferem em 2,0 mm \(larguras de 10,0 e 14,0 mm\)/);
  });

  it('os mesmos dois frisos com o mesmo perfil passam, e o degrau medido é zero', () => {
    const r = confere([['a', g.linha('janela', 'U1', 'L2'), 0.01], ['b', g.linha('janela', 'L2', 'U1'), 0.01]]);
    expect(r.problemas).toEqual([]);
    expect(r.vaos[0].emendas).toHaveLength(2);
    for (const e of r.vaos[0].emendas) expect(mm(e.degrau)).toBeLessThan(0.01);
  });

  describe('a emenda sobre a curva com um nível de refino, onde a linha vira 6,7 graus em U1', () => {
    it('com o mesmo perfil de 10 mm passa: o degrau é zero e o entalhe da cunha de fora é 5 mm × sen(giro / 2)', () => {
      /* antes da correção: degrau de 0,60 mm entre dois perfis iguais, e a emenda reprovava dizendo larguras de 10,0 e 10,0 mm */
      const r = confere([['a', g.linha('janela', 'U1', 'T2'), 0.01], ['b', g.linha('janela', 'T2', 'U1'), 0.01]], { niveis: 1 });
      expect(r.problemas).toEqual([]);
      const e = r.vaos[0].emendas.find((x) => x.giro > 5);
      expect(e.tipo).toBe('reta');
      expect(e.giro).toBeGreaterThan(6);
      expect(e.giro).toBeLessThan(7.5);
      expect(mm(e.degrau)).toBeLessThan(0.01);
      expect(mm(e.entalhe)).toBeCloseTo(5 * Math.sin((e.giro * Math.PI) / 360), 1);
    });

    it('com 20 mm a cunha de fora passa da tolerância e reprova como entalhe na emenda, e não como degrau', () => {
      const r = confere([['a', g.linha('janela', 'U1', 'T2'), 0.02], ['b', g.linha('janela', 'T2', 'U1'), 0.02]], { niveis: 1 });
      expect(r.ok).toBe(false);
      const e = r.vaos[0].emendas.find((x) => !x.ok);
      expect(mm(e.degrau)).toBeLessThan(0.01);
      expect(mm(e.entalhe)).toBeGreaterThan(0.5);
      expect(mm(e.entalhe)).toBeLessThan(0.7);
      expect(r.problemas).toHaveLength(1);
      expect(r.problemas[0]).toMatch(/entalhe na emenda de 'a' com 'b' perto de .*: a linha vira 6,\d graus ali, cada ponta é cortada reta na sua direção, e a cunha de fora da curva fica sem material até 0,\d mm da faixa/);
      expect(r.problemas[0]).not.toMatch(/degrau/);
    });
  });

  it('a borda da frente, que atravessa o vinco vivo da cintura, com dois frisos emendados no vinco: a dobra da chapa não é canto', () => {
    /* antes da correção: a dobra de 10 graus da chapa entrava no giro (11,3), a emenda virava canto e o leque, medido acima da chapa,
       dava entalhe de 3,8 mm */
    const frente = [...g.linha('frenteBaixa'), ...g.linha('frenteAlta').slice(1)];
    const r = confere([['baixa', g.linha('frenteBaixa'), 0.01], ['alta', g.linha('frenteAlta'), 0.01]], { borda: frente });
    expect(r.problemas).toEqual([]);
    const e = r.vaos[0].emendas[0];
    expect(e.tipo).toBe('reta');
    expect(e.giro).toBeLessThan(3);
    expect(mm(e.degrau)).toBeLessThan(0.01);
    expect(mm(e.entalhe)).toBeLessThan(0.2);
    expect(Math.round(mm(e.posicao[2]))).toBe(250);
  });

  it('o arco de roda, borda aberta na soleira, passa com o friso inteiro e reprova com o que para em a2', () => {
    const arco = g.linha('arco');
    expect(confere([['arco', arco, 0.01]], { borda: arco }).problemas).toEqual([]);
    const r = confere([['arco', g.linha('arco', 's1', 'a2'), 0.01]], { borda: arco });
    expect(r.ok).toBe(false);
    expect(r.vaos[0].descobertos).toHaveLength(1);
    expect(r.vaos[0].descobertos[0].entre).toEqual(['a2', 's2']);
    expect(r.problemas[0]).toMatch(/entre 'a2' e 's2'/);
  });
});

describe('caso 2: o painel lateral da perua, com os vãos na estufa inclinada', () => {
  const roda = (opcoes = {}) => {
    const c = painel.caso(opcoes);
    const neutro = nucleo(c.passos, c.pontos);
    expect(neutro.orfaos).toEqual([]);
    return { c, neutro, r: conferirVaosDaPeca(neutro, { vaos: c.vaos }) };
  };
  const g = painel.montagem();
  /* a normal da estufa da perua, que afunila de 1005 mm no vinco a 856 mm no topo */
  const [[, ], [x0, y0], [x1, y1]] = TABELA.frente;
  const normalDaEstufa = (() => { const n = [y1 - y0, x0 - x1, 0]; const l = Math.hypot(...n); return n.map((v) => v / l); })();

  it('a estufa da TABELA inclina 10,7 graus da vertical, e as comparações são a vertical e 30 graus', () => {
    expect(painel.inclinacao(painel.SECOES.perua)).toBeCloseTo(10.68, 2);
    expect(painel.inclinacao(painel.SECOES.vertical)).toBeCloseTo(0, 9);
    expect(painel.inclinacao(painel.SECOES.trintaGraus)).toBeCloseTo(30, 9);
  });

  it('a moldura fica na face inclinada: sai 3 mm pela normal da estufa e entra 0,5 mm, e a chapa em volta dos vãos é plana', () => {
    const { neutro } = roda();
    const ref = [x0 / 1000, y0 / 1000, 0];
    const alturas = (parte) => {
      const ids = new Set([...neutro.F.values()].filter((f) => f.parte === parte).flatMap((f) => f.vs));
      return [...ids].map((id) => neutro.V.get(id)).filter((p) => p[1] > 1.1 && p[1] < 1.52 && p[2] > -2.27 && p[2] < 1.11).map((p) => mm(dot(sub(p, ref), normalDaEstufa)));
    };
    const moldura = alturas('molduraVidroMeio');
    expect(Math.max(...moldura)).toBeCloseTo(3, 2);
    expect(Math.min(...moldura)).toBeCloseTo(-0.5, 2);
    const chapa = alturas('chapa');
    expect(Math.max(...chapa.map(Math.abs))).toBeLessThan(0.01);
  });

  for (const [nome, secao] of Object.entries(painel.SECOES)) {
    it(`com a estufa ${nome === 'perua' ? 'da perua' : nome === 'vertical' ? 'vertical' : 'a 30 graus'}, a moldura de cada vão cobre a borda inteira, e a borda tem o comprimento da inclinação`, () => {
      const { r } = roda({ secao });
      expect(r.problemas).toEqual([]);
      expect(r.vaos.map((v) => v.nome)).toEqual(['vidroTras', 'vidroMeio', 'vidroFrente']);
      for (const v of r.vaos) {
        expect(v.cobertas).toBe(v.amostras);
        expect(v.emendas).toEqual([]);
      }
      /* o vão do meio: 872 mm entre as colunas e 400 mm de altura medidos na face, que a inclinação alonga */
      const [cB, cC] = TABELA.colunas;
      const altura = (TABELA.y_teto - TABELA.y_cintura) / Math.cos((painel.inclinacao(secao) * Math.PI) / 180);
      expect(mm(r.vaos[1].comprimento)).toBeCloseTo(2 * (cB[0] - cC[1] + altura), 0);
    });
  }

  it('a moldura do vão da frente sem o lado da coluna A, inclinado na face inclinada, reprova com o trecho entre os dois pontos dele', () => {
    const borda = g.bordaDoVao('vidroFrente');
    const semColunaA = [...borda.slice(4, 6), ...borda.slice(0, 3)];
    expect(semColunaA).toEqual(['colunaA_teto', 'colunaB_frente_teto', 'colunaB_frente_quebra', 'colunaB_frente_cintura', 'colunaA_cintura']);
    const comprimentos = {};
    for (const [nome, secao] of Object.entries(painel.SECOES)) {
      const { r } = roda({ secao, molduras: { vidroFrente: [{ nome: 'semColunaA', pontos: semColunaA }] } });
      expect(r.ok).toBe(false);
      expect(r.problemas).toHaveLength(1);
      const v = r.vaos[2];
      expect(v.descobertos).toHaveLength(1);
      expect(v.descobertos[0].entre).toEqual(['colunaA_cintura', 'colunaA_teto']);
      expect(r.problemas[0]).toMatch(/^'vidroFrente': trecho da borda sem moldura, 7\d\d,\d mm entre 'colunaA_cintura' e 'colunaA_teto' perto de /);
      comprimentos[nome] = mm(v.descobertos[0].comprimento);
    }
    /* o lado da coluna A, de 604 mm em z e 400 mm de altura, mais longo quanto mais a face inclina, menos as pontas das faixas vizinhas */
    expect(comprimentos.vertical).toBeGreaterThan(700);
    expect(comprimentos.perua).toBeGreaterThan(comprimentos.vertical);
    expect(comprimentos.trintaGraus).toBeGreaterThan(comprimentos.perua);
    expect(comprimentos.trintaGraus).toBeLessThan(760);
  });

  it('um friso por lado do vão do meio deixa os quatro cantos com o entalhe de 3,5 mm, na face inclinada', () => {
    const b = g.bordaDoVao('vidroMeio');
    expect(b).toEqual(['colunaC_frente_quebra', 'colunaC_frente_cintura', 'colunaB_tras_cintura', 'colunaB_tras_quebra', 'colunaB_tras_teto', 'colunaC_frente_teto', 'colunaC_frente_quebra']);
    const lados = [[b[5], b[0], b[1]], [b[1], b[2]], [b[2], b[3], b[4]], [b[4], b[5]]].map((pontos, k) => ({ nome: `lado${k + 1}`, pontos }));
    const { r } = roda({ molduras: { vidroMeio: lados } });
    expect(r.ok).toBe(false);
    const cantos = r.vaos[1].emendas;
    expect(cantos).toHaveLength(4);
    for (const e of cantos) {
      expect(e.tipo).toBe('canto');
      expect(e.giro).toBeCloseTo(90, 0);
      expect(mm(e.entalhe)).toBeGreaterThan(3.4);
      expect(mm(e.entalhe)).toBeLessThan(3.6);
    }
    const zy = cantos.map((e) => `${Math.round(mm(e.posicao[2]))},${Math.round(mm(e.posicao[1]))}`).sort();
    expect(zy).toEqual(['-1197,1110', '-1197,1510', '-325,1110', '-325,1510']);
    expect(r.problemas).toHaveLength(4);
    expect(r.problemas.every((p) => /^'vidroMeio': entalhe no canto entre 'lado\d' e 'lado\d'/.test(p))).toBe(true);
  });

  it('dois frisos emendados no meio das colunas B e C passam com o mesmo perfil e reprovam com o degrau de 10 para 14 mm', () => {
    const b = g.bordaDoVao('vidroMeio');
    const metades = (largura) => ({ vidroMeio: [{ nome: 'a', pontos: b.slice(0, 4) }, { nome: 'b', pontos: b.slice(3), largura }] });
    const iguais = roda({ molduras: metades(0.01) }).r;
    expect(iguais.problemas).toEqual([]);
    expect(iguais.vaos[1].emendas.map((e) => e.tipo)).toEqual(['reta', 'reta']);
    const r = roda({ molduras: metades(0.014) }).r;
    expect(r.problemas).toHaveLength(2);
    for (const e of r.vaos[1].emendas) expect(mm(e.degrau)).toBeCloseTo(2, 2);
    expect(formatarVaos(r)).toMatch(/vidroMeio: frisos 'a', 'b'; borda de 2558,1 mm, 100,0% da borda coberta, 0 trecho\(s\) descoberto\(s\), 2 emenda\(s\) \(0 ok\)/);
  });
});
