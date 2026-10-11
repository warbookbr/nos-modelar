/* movel-de-caixa.test.mjs — a família `movel-de-caixa`: contrato, recusas, os perfis, o roupeiro como antes, a malha medida
   contra as contas (zonas, frentes embutida, sobreposta e de correr, gavetas, base, prateleiras, cabideiro), a parede da casca,
   as dobradiças da porta embutida e da sobreposta, a montagem v5 resolvida pelo resolvedor real, o curso de cada porta e de
   cada gaveta conferido contra as malhas e a abertura de várias articulações ao mesmo tempo. */
import { describe, expect, it } from 'vitest';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { analisarTopologia } from '../../../modulos/topologia/src/analisar.js';
import { conferirAberturasSimultaneas, conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { FORMATO, VERSAO, parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { execucaoDe, invariantesDe } from '../../../src/autoria/varrer-parametros.js';
import { descreverPeca } from '../../../src/autoria/descrever-partes.js';
import { medirPonto, pontosDaFamilia, pontosDosPerfis } from '../../../tools/mecanifica/aprovacao-da-familia.mjs';
import { resolverMontagemDaFamilia } from '../../../tools/mecanifica/montagem-da-familia.mjs';
import { ErroChamadaDeFamilia, FAMILIAS, chamar, criarRegistroDeFamilias } from '../index.js';
import { DOBRADICA } from '../dobradica/index.js';
import { MOVEL_DE_CAIXA } from './index.js';
import {
  AFASTAMENTO_DA_SOBREPOSTA, ENCAIXE_MINIMO_DA_GAVETA, FOLGA_DA_PORTA, alturaDaPorta, cursoNaDivisoria, dobradicaDaPorta,
  geometriaDoMovel, larguraDaPorta, pesoDaPorta, zonasDoMovel,
} from './geometria.js';

const registro = criarRegistroDeFamilias({ familias: [MOVEL_DE_CAIXA] });
const execucao = execucaoDe({ registroComposicoes: registro.registroComposicoes, registroOperacoes: registro.registroOperacoes });
const MATERIAIS = { painel: { cor: '#c9a679' }, porta: { cor: '#e6dfd0' }, chapa: { cor: '#8e98a3' }, pino: { cor: '#c9ccd1' } };
const MM = 0.001;
const PERFIS = MOVEL_DE_CAIXA.contrato.perfis;
const NOMES_DOS_PERFIS = Object.keys(PERFIS);
const conjunto = (parametros = {}) => executarReceita({ meta: { nome: 'movel' }, CHAMADAS_COMPOSICOES: [chamar(MOVEL_DE_CAIXA, 'corpo', parametros)], MATERIAIS }, execucao).neutro;
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));
const recusa = (parametros) => { try { chamar(MOVEL_DE_CAIXA, 'corpo', parametros); } catch (erro) { return erro; } throw new Error('a chamada devia ser recusada'); };
const mm = (neutro) => [...neutro.V.values()].map(([x, y, z]) => [x / MM, y / MM, z / MM]);
const caixa = (neutro) => {
  const v = [...neutro.V.values()];
  return [0, 1, 2].map((i) => [Math.min(...v.map((p) => p[i])), Math.max(...v.map((p) => p[i]))]);
};
const completos = (parametros = {}) => ({ ...Object.fromEntries(Object.entries(MOVEL_DE_CAIXA.contrato.parametros).map(([nome, { padrao }]) => [nome, padrao])), ...parametros });
const doPerfil = (nome, ajustes = {}) => completos({ ...PERFIS[nome].parametros, ...ajustes });
/* o volume do sólido (as faces em fan), em centímetro cúbico */
function volume(neutro) {
  let total = 0;
  for (const f of neutro.F.values()) {
    const p = f.vs.map((id) => neutro.V.get(id));
    for (let i = 1; i < p.length - 1; i += 1) {
      const [a, b, c] = [p[0], p[i], p[i + 1]];
      total += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
  }
  return total * 1e6;
}
const impressaoDosVertices = (neutro) => {
  const unicos = new Set([...neutro.V.values()].map(([x, y, z]) => `${Math.round(x * 1e7)},${Math.round(y * 1e7)},${Math.round(z * 1e7)}`));
  return sha256Hex([...unicos].sort().join(';')).slice(0, 16);
};
const pecaDe = (montada, ref) => executarReceita(montada.receitas[ref], execucao).neutro;
const faces = (neutro, parte) => [...neutro.F.values()].filter((f) => f.parte === parte);
const verticesDaParte = (neutro, parte) => [...new Set(faces(neutro, parte).flatMap((f) => f.vs))].map((id) => neutro.V.get(id).map((c) => c / MM));
const faixa = (pontos, eixo) => [Math.min(...pontos.map((p) => p[eixo])), Math.max(...pontos.map((p) => p[eixo]))];

/* configurações leves para o curso medido contra as malhas: uma porta de três dobradiças, e cada uma das frentes */
const LEVE_EMBUTIDA = { portas: 1, largura: 600, altura: 1500, prateleiras: 2, cabideiro: 0 };
const LEVE_SOBREPOSTA = { portas: 1, frente: 0, largura: 600, altura: 1500, prateleiras: 2, cabideiro: 0 };
const QUATRO = { portas: 4, largura: 2400, altura: 2000, prateleiras: 2, cabideiro: 1 };

async function resolver(montada) {
  const carregarPeca = async (ref) => {
    const { neutro: bruto } = executarReceita(montada.receitas[ref], execucao);
    const neutro = neutroCanonico(bruto);
    return { formato: FORMATO, versao: VERSAO, peca: ref, meta: { nome: ref }, materiais: montada.receitas[ref].MATERIAIS, partes: [...new Set(neutro.F.map(parteDaFace).filter(Boolean))].sort(), portas: [...bruto.portas.values()], V: neutro.V, F: neutro.F };
  };
  return resolverMontagemPersistida(montada.montagem, { carregarPeca });
}

describe('o contrato e a chamada', () => {
  it('está registrada em FAMILIAS, é um objeto, publica a porta que declara e declara os perfis', () => {
    expect(FAMILIAS.map(({ contrato }) => contrato.id)).toContain('movel-de-caixa');
    expect(FAMILIAS.map(({ contrato }) => contrato.id)).not.toContain('roupeiro');
    expect(MOVEL_DE_CAIXA.contrato.nivel).toBe('objeto');
    expect([...conjunto().portas.keys()]).toEqual(['base-do-corpo']);
    expect(NOMES_DOS_PERFIS).toEqual(expect.arrayContaining(['roupeiro', 'guarda-roupa', 'armario-de-cozinha-aereo', 'armario-de-cozinha-de-chao', 'comoda', 'criado-mudo', 'estante-com-portas', 'gaveteiro']));
  });

  it('recusa cada impossível com o motivo da família', () => {
    expect(recusa({ portas: 5 }).message).toMatch(/parametros\.portas.*\[0, 4\]/);
    expect(recusa({ portas: 2.5 }).message).toMatch(/inteiro/);
    expect(recusa({ frente: 3 }).message).toMatch(/parametros\.frente.*\[0, 2\]/);
    expect(recusa({ portas: 1 })).toMatchObject({ restricao: 'porta-larga-demais' });
    expect(recusa({ largura: 3000 })).toMatchObject({ restricao: 'porta-larga-demais' });
    expect(recusa({ largura: 400 })).toMatchObject({ restricao: 'porta-estreita-demais' });
    expect(recusa({ altura: 2600 })).toMatchObject({ restricao: 'porta-alta-demais' });
    expect(recusa({ prateleiras: 8 })).toMatchObject({ restricao: 'prateleiras-cabem-atras-das-portas' });
    expect(recusa({ altura: 1200 })).toMatchObject({ restricao: 'prateleiras-cabem-atras-das-portas' });
    expect(recusa({ cabideiro: 2 })).toBeInstanceOf(ErroChamadaDeFamilia);
    expect(recusa({ portas: 3, largura: 2000, frente: 0 })).toMatchObject({ restricao: 'sobreposta-com-mais-de-duas-portas' });
    expect(recusa({ portas: 1, frente: 2 })).toMatchObject({ restricao: 'de-correr-com-menos-de-duas-portas' });
    expect(recusa({ portas: 4, frente: 2, largura: 3000, profundidade: 250, painel: 25, prateleiras: 0, cabideiro: 0 })).toMatchObject({ restricao: 'de-correr-sem-fundo' });
    expect(recusa({ alturaDasPortas: 2000, prateleiras: 0, cabideiro: 0 })).toMatchObject({ restricao: 'prateleiras-cabem-no-vao-aberto' });
    expect(recusa({ alturaDasPortas: 300, prateleiras: 0, cabideiro: 0 })).toMatchObject({ restricao: 'porta-baixa-demais' });
    expect(recusa({ gavetas: 5, alturaDaGaveta: 160, altura: 1300, cabideiro: 0, prateleiras: 0 })).toMatchObject({ restricao: 'porta-baixa-demais' });
    expect(recusa({ portas: 0, gavetas: 5, altura: 300, rodape: 0, largura: 600, prateleiras: 0, cabideiro: 0, painel: 15 })).toMatchObject({ restricao: 'gaveta-baixa-demais' });
    expect(recusa({ portas: 0, gavetas: 2, prateleiras: 1, cabideiro: 0 })).toMatchObject({ restricao: 'prateleiras-sem-lugar' });
    expect(recusa({ portas: 0, cabideiro: 1, prateleiras: 0 })).toMatchObject({ restricao: 'cabideiro-sem-porta' });
    expect(recusa({ portas: 0, prateleiras: 8, altura: 1000, cabideiro: 0 })).toMatchObject({ restricao: 'prateleiras-cabem-no-movel-aberto' });
    expect(recusa({ portas: 2, alturaDasPortas: 600, prateleiras: 8, cabideiro: 0 })).toMatchObject({ restricao: 'prateleiras-cabem-no-vao-aberto' });
    expect(recusa({ portas: 2, alturaDasPortas: 800, prateleiras: 0, cabideiro: 1, altura: 2200 })).toMatchObject({ restricao: 'cabideiro-cabe-sob-o-vao-aberto' });
    expect(recusa({ pes: 1, rodape: 40 })).toMatchObject({ restricao: 'pes-baixos-demais' });
    expect(recusa({ rodape: 20 })).toMatchObject({ restricao: 'rodape-fino-demais' });
    expect(recusa({ altura: 300, rodape: 100, painel: 15, portas: 0, prateleiras: 0, cabideiro: 0 })).toMatchObject({ restricao: 'vao-interno-baixo-demais' });
    expect(recusa({ perfil: 'inexistente' }).message).toMatch(/um perfil da família: .*comoda/);
    expect(() => MOVEL_DE_CAIXA.montar({ portas: 1 })).toThrow(/porta-larga-demais/);
  });

  it('o perfil preenche os parâmetros e quem chama sobrescreve só o que quiser', () => {
    for (const nome of NOMES_DOS_PERFIS) {
      expect(chamar(MOVEL_DE_CAIXA, 'x', { perfil: nome })).toEqual(chamar(MOVEL_DE_CAIXA, 'x', doPerfil(nome)));
    }
    const maisLargo = chamar(MOVEL_DE_CAIXA, 'x', { perfil: 'comoda', largura: 1100 });
    expect(maisLargo).toEqual(chamar(MOVEL_DE_CAIXA, 'x', doPerfil('comoda', { largura: 1100 })));
    expect(maisLargo).not.toEqual(chamar(MOVEL_DE_CAIXA, 'x', { perfil: 'comoda' }));
    expect(() => chamar(MOVEL_DE_CAIXA, 'x', { perfil: 'comoda', gavetas: 9 })).toThrow(/gavetas/);
  });

  it('os três pontos, o padrão e cada perfil são chamáveis, sem órfão nem face sem parte, com a malha fechada e a mesma chamada dá a mesma malha', () => {
    const a = conjunto();
    expect(hash(a)).toBe(hash(conjunto()));
    const todos = [['padrão', {}], ...Object.entries(pontosDaFamilia(MOVEL_DE_CAIXA.contrato)), ...Object.entries(pontosDosPerfis(MOVEL_DE_CAIXA.contrato)), ['aberta', { portas: 0, cabideiro: 0, altura: 1800, profundidade: 300, largura: 800 }]];
    for (const [nome, parametros] of todos) {
      const neutro = conjunto(parametros);
      expect(neutro.orfaos, nome).toEqual([]);
      expect(invariantesDe(descreverPeca(neutro)).facesSemParte, nome).toBe(0);
      const abertos = analisarTopologia({ vertices: neutro.V, faces: neutro.F }).achados.filter((x) => ['casca-aberta', 'aresta-nao-manifold', 'orientacao-incoerente'].includes(x.codigo));
      expect(abertos, nome).toEqual([]);
      expect(hash(neutro), nome).toBe(hash(conjunto(parametros)));
    }
    for (const portas of [0, 1, 2, 3, 4]) {
      expect(conjunto({ portas, largura: Math.max(400, portas * 700 + 100), prateleiras: 0, cabideiro: 0 }).orfaos).toEqual([]);
    }
  });

  it('a prateleira única existe (a repetição de uma só cópia que a versão anterior pedia não era aceita)', () => {
    const uma = conjunto({ portas: 2, largura: 1200, altura: 1500, prateleiras: 1, cabideiro: 0 });
    expect(uma.orfaos).toEqual([]);
    expect(faces(uma, 'prateleira').length).toBeGreaterThan(0);
    for (let n = 1; n <= 8; n += 1) {
      const neutro = conjunto({ portas: 0, prateleiras: n, altura: 2200, largura: 800, cabideiro: 0 });
      const topos = new Set(faces(neutro, 'prateleira').filter((f) => f.vs.every((id) => Math.abs(neutro.V.get(id)[1] - neutro.V.get(f.vs[0])[1]) < 1e-9)).map((f) => Number((neutro.V.get(f.vs[0])[1] / MM).toFixed(3))));
      expect(topos.size, `${n} prateleiras`).toBe(2 * n);
    }
  });
});

describe('o roupeiro continua chamável como antes', () => {
  /* o que a família `roupeiro` gerava, medido antes da ampliação: o volume em centímetro cúbico e a caixa em milímetro; o
     conjunto de vértices é o mesmo (a impressão bate) onde a triangulação das costuras é a mesma, e nas demais configurações a
     malha tem os mesmos cantos e o mesmo volume, com até quatro vértices a menos nas faces onde as prateleiras encontram a parede */
  const ANTES = {
    padrao: { parametros: {}, volume: 308266.41, caixa: [[-800, 800], [0, 2200], [-275, 295]] },
    quatro: { parametros: QUATRO, volume: 374826.181, caixa: [[-1200, 1200], [0, 2000], [-275, 295]], impressao: 'c49e3e12b7c4a82e' },
    tres: { parametros: { portas: 3, largura: 2400 }, volume: 433407.591, caixa: [[-1200, 1200], [0, 2200], [-275, 295]] },
    leve: { parametros: LEVE_EMBUTIDA, volume: 99299.551, caixa: [[-300, 300], [0, 1500], [-275, 295]] },
    minimo: { parametros: { largura: 400, altura: 1200, profundidade: 350, painel: 15, portas: 1, prateleiras: 0, rodape: 40, cabideiro: 0 }, volume: 32680.009, caixa: [[-200, 200], [0, 1200], [-175, 195]], impressao: '54931ec86bc8fa0b' },
    medio: { parametros: { largura: 1600, altura: 2200, profundidade: 600, painel: 18, portas: 2, prateleiras: 4, rodape: 80, cabideiro: 1 }, volume: 326784.01, caixa: [[-800, 800], [0, 2200], [-300, 320]] },
    maximo: { parametros: { largura: 3000, altura: 2600, profundidade: 800, painel: 25, portas: 4, prateleiras: 8, rodape: 150, cabideiro: 1 }, volume: 1155762.775, caixa: [[-1500, 1500], [0, 2600], [-400, 420]], impressao: 'd9a78bbd1104efd4' },
  };

  it('os parâmetros de antes, e o perfil roupeiro, dão o mesmo móvel: mesma caixa, mesmo volume, e a mesma impressão onde a costura é a mesma', () => {
    for (const [nome, antes] of Object.entries(ANTES)) {
      const neutro = conjunto(antes.parametros);
      expect(volume(neutro), nome).toBeCloseTo(antes.volume, 1);
      caixa(neutro).forEach((faixaDoEixo, i) => faixaDoEixo.forEach((v, j) => expect(v / MM, `${nome} ${i}${j}`).toBeCloseTo(antes.caixa[i][j], 6)));
      if (antes.impressao) expect(impressaoDosVertices(neutro), nome).toBe(antes.impressao);
    }
    expect(hash(conjunto({ perfil: 'roupeiro' }))).toBe(hash(conjunto()));
    expect(PERFIS.roupeiro.parametros).toMatchObject({ largura: 1600, altura: 2200, profundidade: 550, portas: 2, frente: 1 });
  });

  it('as portas do roupeiro são embutidas, à ras da frente, com as quatro prateleiras e o cabideiro de antes', () => {
    const montada = MOVEL_DE_CAIXA.montar({ perfil: 'roupeiro' });
    const g = montada.geometria;
    expect(g.sobreposta).toBe(false);
    expect(g.portas.map((porta) => porta.apoio)).toEqual(['lateral-esquerda', 'lateral-direita']);
    const porta = pecaDe(montada, 'movel-de-caixa-porta-1');
    const [x, y, z] = caixa(porta);
    expect(x[0] / MM).toBeCloseTo(g.portas[0].xMin, 6);
    expect(x[1] / MM).toBeCloseTo(g.portas[0].xMax, 6);
    expect(y[0] / MM).toBeCloseTo(g.y0DasPortas, 6);
    expect(y[1] / MM).toBeCloseTo(g.y0DasPortas + g.hd, 6);
    expect(z[0] / MM).toBeCloseTo(g.quadro.frente - 18, 6);
    expect(g.prateleiras.total).toBe(4);
    expect(g.cabideiro.y).toBeCloseTo(2200 - 18 - 120, 9);
  });
});

describe('as zonas, as frentes e a base contra as contas', () => {
  it('as zonas se empilham de lado a lado do vão interno, separadas por um painel, e a soma das alturas fecha o vão', () => {
    const configuracoes = [
      doPerfil('guarda-roupa'), doPerfil('armario-de-cozinha-de-chao'), doPerfil('comoda'), doPerfil('estante-com-portas'), doPerfil('criado-mudo'), doPerfil('roupeiro'),
      completos({ portas: 0, prateleiras: 0, cabideiro: 0 }), completos({ gavetas: 3, alturaDasPortas: 600, cabideiro: 0, prateleiras: 2 }),
    ];
    for (const p of configuracoes) {
      const z = zonasDoMovel(p);
      const interno = p.altura - p.rodape - 2 * p.painel;
      expect(z.interno).toBeCloseTo(interno, 9);
      expect(z.zonas[0].y0).toBeCloseTo(p.rodape + p.painel, 9);
      expect(z.zonas.at(-1).y1).toBeCloseTo(p.altura - p.painel, 9);
      z.zonas.slice(1).forEach((zona, i) => expect(zona.y0 - z.zonas[i].y1).toBeCloseTo(p.painel, 9));
      expect(z.separadores).toHaveLength(z.zonas.length - 1);
      z.separadores.forEach((s, i) => { expect(s.y0).toBeCloseTo(z.zonas[i].y1, 9); expect(s.y1 - s.y0).toBeCloseTo(p.painel, 9); });
      expect(z.zonas.reduce((s, zona) => s + zona.altura, 0) + z.separadores.length * p.painel).toBeCloseTo(interno, 9);
    }
  });

  it('as gavetas ficam embaixo (ou em cima), com a altura pedida quando há portas, e dividem a altura toda quando não há', () => {
    const embaixo = zonasDoMovel(doPerfil('guarda-roupa'));
    expect(embaixo.zonas.map((zona) => zona.tipo)).toEqual(['gavetas', 'portas']);
    expect(embaixo.porTipo.gavetas.altura).toBeCloseTo(2 * 160 + 3 * 3, 9);
    const emCima = zonasDoMovel(doPerfil('armario-de-cozinha-de-chao'));
    expect(emCima.zonas.map((zona) => zona.tipo)).toEqual(['portas', 'gavetas']);
    const cheia = geometriaDoMovel(doPerfil('comoda'));
    expect(cheia.zonas.zonas.map((zona) => zona.tipo)).toEqual(['gavetas']);
    cheia.gavetas.forEach((gaveta) => expect(gaveta.vao1 - gaveta.vao0).toBeCloseTo((850 - 120 - 36 - 5 * 3) / 4, 9));
    const estante = zonasDoMovel(doPerfil('estante-com-portas'));
    expect(estante.zonas.map((zona) => zona.tipo)).toEqual(['portas', 'vao']);
    expect(estante.porTipo.portas.altura).toBe(586);
    expect(estante.porTipo.vao.altura).toBeCloseTo(1800 - 60 - 36 - 18 - 586, 9);
    expect(zonasDoMovel(completos({ portas: 0, prateleiras: 0, cabideiro: 0 })).zonas.map((zona) => zona.tipo)).toEqual(['vao']);
  });

  it('a porta embutida e a sobreposta têm a largura e a altura das contas, com 3 mm de folga entre si e 1,5 mm da borda do corpo na sobreposta', () => {
    const g = geometriaDoMovel(doPerfil('guarda-roupa'));
    expect(g.sobreposta).toBe(true);
    expect(g.wd).toBeCloseTo((1500 - 7 - 3) / 2, 9);
    expect(g.wd).toBeCloseTo(larguraDaPorta(doPerfil('guarda-roupa')), 9);
    const [p1, p2] = g.portas;
    expect(p1.xMin).toBeCloseTo(-750 + 3.5, 9);
    expect(p2.xMin - p1.xMax).toBeCloseTo(FOLGA_DA_PORTA, 9);
    expect(p2.xMax).toBeCloseTo(750 - 3.5, 9);
    /* a altura vai da borda de cima do corpo, 1,5 mm abaixo, até a metade do painel que a separa da coluna de gavetas */
    const z = g.zonas.porTipo.portas;
    expect(p1.y0 + g.hd).toBeCloseTo(2200 - 1.5, 9);
    expect(p1.y0).toBeCloseTo(z.y0 - 7.5, 9);
    expect(g.hd).toBeCloseTo(alturaDaPorta(doPerfil('guarda-roupa')), 9);
    const embutida = geometriaDoMovel(doPerfil('roupeiro'));
    expect(embutida.hd).toBeCloseTo(2200 - 80 - 36 - 6, 9);
    expect(embutida.portas[0].xMin - embutida.quadro.x0).toBeCloseTo(FOLGA_DA_PORTA, 9);
  });

  it('as frentes sobrepostas ficam 2 mm à frente do corpo e cobrem as laterais, o tampo e a base; as gavetas e as portas ficam no mesmo plano', () => {
    const montada = MOVEL_DE_CAIXA.montar({ perfil: 'armario-de-cozinha-de-chao' });
    const g = montada.geometria;
    const frente = g.quadro.frente;
    const porta = caixa(pecaDe(montada, 'movel-de-caixa-porta-1'));
    expect(porta[2][0] / MM).toBeCloseTo(frente + AFASTAMENTO_DA_SOBREPOSTA, 6);
    expect(porta[2][1] / MM).toBeCloseTo(frente + AFASTAMENTO_DA_SOBREPOSTA + 18 + 20, 6); // a espessura mais o puxador
    expect(porta[0][0] / MM).toBeCloseTo(-400 + 3.5, 6);
    expect(porta[0][1] / MM).toBeCloseTo(0 - 1.5, 6);
    const gaveta = pecaDe(montada, 'movel-de-caixa-gaveta-1');
    const frenteDaGaveta = verticesDaParte(gaveta, 'frente');
    expect(faixa(frenteDaGaveta, 2)[0]).toBeCloseTo(frente + AFASTAMENTO_DA_SOBREPOSTA, 6);
    expect(faixa(frenteDaGaveta, 0)).toEqual([expect.closeTo(-396.5, 6), expect.closeTo(396.5, 6)]);
    expect(faixa(frenteDaGaveta, 1)[1]).toBeCloseTo(880 - 1.5, 6);
    /* a folga entre a frente da gaveta e a porta é de 3 mm */
    const portaY = faixa(mm(pecaDe(montada, 'movel-de-caixa-porta-1')), 1);
    expect(faixa(frenteDaGaveta, 1)[0] - portaY[1]).toBeCloseTo(FOLGA_DA_PORTA, 6);
  });

  it('o rodapé, os quatro pés e a falta de base têm a altura pedida, e a base deixa o corpo onde deve', () => {
    const rodape = conjunto(doPerfil('roupeiro'));
    const base = verticesDaParte(rodape, 'base');
    expect(faixa(base, 1)).toEqual([expect.closeTo(0, 6), expect.closeTo(80, 6)]); // o milímetro que entra na base some na união
    const pes = conjunto(doPerfil('comoda'));
    expect(faces(pes, 'base').length).toBeGreaterThan(0);
    const verticesDosPes = verticesDaParte(pes, 'base');
    expect(faixa(verticesDosPes, 1)[0]).toBeCloseTo(0, 6);
    expect(faixa(verticesDosPes, 1)[1]).toBeCloseTo(120, 6);
    const centrosX = new Set(verticesDosPes.filter((v) => Math.abs(v[1]) < 1e-6).map((v) => Math.round(v[0] / 100)));
    expect(centrosX.size).toBeGreaterThanOrEqual(2);
    const semBase = conjunto(doPerfil('armario-de-cozinha-aereo'));
    expect(faces(semBase, 'base')).toHaveLength(0);
    expect(caixa(semBase)[1][0]).toBeCloseTo(0, 9);
    expect(caixa(semBase)[1][1] / MM).toBeCloseTo(700, 6);
  });

  it('o que a chamada não pede não deixa geometria: o corpo vazio é a caixa aberta e cada recurso soma o volume das contas', () => {
    const vazio = conjunto({ largura: 800, altura: 700, profundidade: 400, painel: 18, portas: 0, prateleiras: 0, rodape: 0, cabideiro: 0 });
    const esperado = (800 * 700 * 400 - (800 - 36) * (700 - 36) * (400 - 18)) / 1000;
    expect(volume(vazio)).toBeCloseTo(esperado, 2);
    /* três prateleiras: a que ocupa a largura do vão e para 2 mm antes da frente */
    const com = conjunto({ largura: 800, altura: 700, profundidade: 400, painel: 18, portas: 0, prateleiras: 3, rodape: 0, cabideiro: 0 });
    const prateleira = (800 - 36) * 18 * (400 / 2 - 2 - (-400 / 2 + 18));
    expect(volume(com)).toBeCloseTo(esperado + (3 * prateleira) / 1000, 2);
    /* o rodapé de 60 mm, recuado 50 mm na frente e 20 mm no fundo */
    const rodape = conjunto({ largura: 800, altura: 700, profundidade: 400, painel: 18, portas: 0, prateleiras: 0, rodape: 60, cabideiro: 0 });
    const volumeDoRodape = (800 - 36) * 60 * (400 - 50 - 20);
    expect(volume(rodape)).toBeCloseTo((800 * 640 * 400 - (800 - 36) * (640 - 36) * (400 - 18)) / 1000 + volumeDoRodape / 1000, 2);
  });

  it('as prateleiras ficam no vão aberto da estante, e o cabideiro no teto da zona das portas', () => {
    const g = geometriaDoMovel(doPerfil('estante-com-portas'));
    const vao = g.zonas.porTipo.vao;
    expect(g.prateleiras.yPrimeira).toBeGreaterThan(vao.y0);
    expect(g.prateleiras.yPrimeira + 2 * g.prateleiras.passo + 18).toBeLessThan(vao.y1);
    expect(g.prateleiras.folga).toBeCloseTo((vao.altura - 3 * 18) / 4, 9);
    expect(g.prateleiras.recuoDaFrente).toBe(2);
    const guarda = geometriaDoMovel(doPerfil('guarda-roupa'));
    expect(guarda.cabideiro.y).toBeCloseTo(guarda.zonas.porTipo.portas.y1 - 120, 9);
    const abaixo = guarda.prateleiras.yPrimeira + 1 * guarda.prateleiras.passo + 18;
    expect(abaixo).toBeLessThan(guarda.cabideiro.y - 1000 - 12.5 + 1e-9);
  });

  it('a gaveta tem frente, laterais com o rasgo, traseira e fundo, e o trilho do corpo entra no rasgo com folga', () => {
    const montada = MOVEL_DE_CAIXA.montar({ perfil: 'gaveteiro' });
    const g = montada.geometria;
    const gaveta = g.gavetas[0];
    const peca = pecaDe(montada, 'movel-de-caixa-gaveta-1');
    for (const parte of ['frente', 'lateral', 'traseira', 'fundo', 'puxador']) expect(faces(peca, parte).length, parte).toBeGreaterThan(0);
    const laterais = verticesDaParte(peca, 'lateral');
    expect(faixa(laterais, 0)[0]).toBeCloseTo(-gaveta.caixa.largura / 2, 6);
    expect(faixa(laterais, 0)[1]).toBeCloseTo(gaveta.caixa.largura / 2, 6);
    /* o rasgo de 14 mm de altura e 6 mm de fundo na face de fora, e o trilho de 10 mm de altura sai 6 mm da lateral do corpo */
    const guia = pecaDe(montada, 'movel-de-caixa-guia-1');
    const trilho = verticesDaParte(guia, 'guia');
    const esquerdo = trilho.filter((v) => v[0] < 0);
    expect(faixa(esquerdo, 0)[1]).toBeCloseTo(g.quadro.x0 + 6, 6);
    expect(faixa(esquerdo, 1)).toEqual([expect.closeTo(gaveta.trilho.y - 5, 6), expect.closeTo(gaveta.trilho.y + 5, 6)]);
    const noRasgo = laterais.filter((v) => v[0] > -gaveta.caixa.largura / 2 + 1e-6 && v[0] < -gaveta.caixa.largura / 2 + 6 + 1e-6 && Math.abs(v[1] - gaveta.caixa.yDoMeio) < 7 + 1e-6);
    expect(noRasgo.length).toBeGreaterThan(0);
    /* folga: o fundo do rasgo está 3 mm além da ponta do trilho, e 2 mm sobram em cima e embaixo */
    expect((-gaveta.caixa.largura / 2 + 6) - faixa(esquerdo, 0)[1]).toBeCloseTo(3, 6);
    /* o curso deixa ao menos 100 mm de trilho engatado */
    expect(gaveta.trilho.z1 - (gaveta.caixa.zTraseira + gaveta.curso)).toBeGreaterThanOrEqual(ENCAIXE_MINIMO_DA_GAVETA);
    expect(gaveta.curso).toBe(Math.floor(450 - 36 - 117));
  });

  it('a folha de correr tem a largura das contas, cada uma numa camada atrás da frente, com um rasgo em cima e outro embaixo, e o trilho entra nos dois', () => {
    const p = doPerfil('guarda-roupa-de-correr');
    const g = geometriaDoMovel(p);
    expect(g.correr).toBe(true);
    expect(g.wd).toBeCloseTo((1800 - 36 - 6 + 2 * 40) / 3, 9);
    expect(g.wd).toBeCloseTo(larguraDaPorta(p), 9);
    g.portas.forEach((folha, k) => {
      expect(folha.zFrente).toBeCloseTo(300 - 20 - k * 24, 9);
      expect(folha.zVerso).toBeCloseTo(folha.zFrente - 18, 9);
      expect(folha.curso).toBe(Math.floor(g.wd - 40));
    });
    expect(g.portas.map((folha) => folha.direcao)).toEqual([1, 1, -1]);
    expect(g.portas[1].xMin - g.portas[0].xMin).toBeCloseTo(g.wd - 40, 9);
    expect(g.divisoria.centro).toBe(0);
    const montada = MOVEL_DE_CAIXA.montar(p);
    const folha = pecaDe(montada, 'movel-de-caixa-porta-1');
    const rasgos = verticesDaParte(folha, 'porta').filter((v) => Math.abs(v[1] - g.portas[0].y0) < 1e-6 || Math.abs(v[1] - g.portas[0].y0 - 10) < 1e-6);
    expect(rasgos.length).toBeGreaterThan(0);
    const trilho = pecaDe(montada, 'movel-de-caixa-trilho-1');
    const cantos = verticesDaParte(trilho, 'guia');
    expect(faixa(cantos, 0)).toEqual([expect.closeTo(g.quadro.x0 - 1, 6), expect.closeTo(g.quadro.x1 + 1, 6)]);
    expect(faixa(cantos, 1)[0]).toBeCloseTo(g.zonas.porTipo.portas.y0 - 1, 6);
    expect(faixa(cantos, 1)[1]).toBeCloseTo(g.zonas.porTipo.portas.y1 + 1, 6);
  });
});

describe('a parede da casca e as portas publicadas', () => {
  it('a parede da casca é a do painel, medida pela aprovação, nos três pontos e nos perfis', () => {
    const pontos = { ...pontosDaFamilia(MOVEL_DE_CAIXA.contrato), ...Object.fromEntries(Object.entries(pontosDosPerfis(MOVEL_DE_CAIXA.contrato)).map(([nome, p]) => [`perfil ${nome}`, p])) };
    for (const [nome, ponto] of Object.entries(pontos)) {
      const r = medirPonto(MOVEL_DE_CAIXA, ponto, nome, { montagem: 'nenhuma' });
      expect(r.problemas, nome).toEqual([]);
      const casca = r.medidas.find((m) => m.ferramenta === 'casca');
      expect(casca.espessuraMinima, nome).toBeCloseTo(ponto.painel * MM, 9);
      expect(casca.espessuraMaxima, nome).toBeCloseTo(ponto.painel * MM, 9);
    }
  }, 120_000);

  it('a porta base-do-corpo fica no plano de baixo do corpo, na altura da base', () => {
    for (const parametros of [doPerfil('roupeiro'), doPerfil('comoda'), doPerfil('armario-de-cozinha-aereo')]) {
      const porta = conjunto(parametros).portas.get('base-do-corpo').interface;
      expect(porta).toMatchObject({ forma: 'plano', papel: 'apoia' });
      expect(porta.ponto[1]).toBeCloseTo(parametros.rodape * MM, 9);
      expect(porta.normal).toEqual([0, -1, 0]);
    }
  });
});

describe('as portas e as dobradiças', () => {
  it('são da família dobradica, com parâmetros que crescem com o peso e a altura da porta, e a família as aceita', () => {
    const leve = dobradicaDaPorta({ peso: 4, altura: 800, painel: 18 });
    const pesada = dobradicaDaPorta({ peso: 22, altura: 2300, painel: 18 });
    expect(leve.quantidade).toBe(2);
    expect(pesada.quantidade).toBeGreaterThan(leve.quantidade);
    expect(pesada.parametros.altura).toBeGreaterThan(leve.parametros.altura);
    expect(pesada.parametros.diametroPino).toBeGreaterThan(leve.parametros.diametroPino);
    for (const d of [leve, pesada]) expect(() => chamar(DOBRADICA, 'dobradica', d.parametros)).not.toThrow();
    for (const nome of ['roupeiro', 'guarda-roupa', 'armario-de-cozinha-aereo', 'criado-mudo', 'estante-com-portas']) {
      const p = doPerfil(nome);
      const g = geometriaDoMovel(p);
      expect(g.peso).toBeCloseTo(pesoDaPorta(p), 9);
      expect(g.dobradica.quantidade).toBe(g.portas[0].dobradicas.length);
      expect(() => chamar(DOBRADICA, 'dobradica', g.dobradica.parametros)).not.toThrow();
    }
  });

  it('na embutida ficam por dentro: o tambor inteiro na espessura da parede e atrás da frente', () => {
    for (const parametros of [{}, QUATRO, LEVE_EMBUTIDA]) {
      const montada = MOVEL_DE_CAIXA.montar(parametros);
      const g = montada.geometria;
      const raio = g.raioDoTambor * MM;
      for (const porta of g.portas) {
        const t = montada.parametros.painel;
        const parede = { 'lateral-esquerda': [g.quadro.x0 - t, g.quadro.x0], 'lateral-direita': [g.quadro.x1, g.quadro.x1 + t] }[porta.apoio] ?? [g.divisoria.esquerda, g.divisoria.direita];
        porta.dobradicas.forEach((dobradica, k) => {
          for (const lado of ['d', 'e']) {
            const vertices = mm(pecaDe(montada, `movel-de-caixa-dobradica-${porta.indice + 1}-${k + 1}-${lado}`));
            for (const [x, , z] of vertices) {
              expect(z).toBeLessThan(g.quadro.frente - 0.4);
              expect(Math.abs(x)).toBeLessThan(montada.parametros.largura / 2);
            }
            const doTambor = vertices.filter(([x, , z]) => Math.hypot(x - dobradica.x, z - dobradica.z) < raio / MM + 1e-6);
            expect(doTambor.length).toBeGreaterThan(30);
            const xs = doTambor.map(([x]) => x);
            expect(Math.min(...xs)).toBeGreaterThan(Math.min(parede[0], parede[1]) + 0.2);
            expect(Math.max(...xs)).toBeLessThan(Math.max(parede[0], parede[1]) - 0.2);
          }
        });
      }
    }
  });

  /* o pino da sobreposta fica fora da lateral, no canto da face externa com a frente do corpo; a folha fixa é uma chapa no rasgo
     da face externa da lateral e a móvel uma chapa no rasgo do verso da porta, 2 mm à frente do corpo */
  it('na sobreposta o tambor fica no canto da face externa da lateral, a folha fixa no rasgo da lateral e a móvel no rasgo do verso da porta', () => {
    for (const parametros of [doPerfil('guarda-roupa'), doPerfil('armario-de-cozinha-aereo'), doPerfil('criado-mudo')]) {
      const montada = MOVEL_DE_CAIXA.montar(parametros);
      const g = montada.geometria;
      const dg = g.dobradicaGeometria.mm;
      const raio = g.raioDoTambor;
      const folha = g.dobradica.parametros;
      const corpo = mm(pecaDe(montada, 'movel-de-caixa-corpo'));
      const vistos = new Set();
      for (const porta of g.portas) {
        const d = porta.dobradicas[0];
        const metade = folha.altura / 2;
        const peca = (lado) => mm(pecaDe(montada, `movel-de-caixa-dobradica-${porta.indice + 1}-1-${lado}`));
        /* o pino: fora da lateral por (zDaChapa menos meia espessura), 2 mm à frente da frente menos o mesmo */
        expect(Math.abs(d.x) - Math.abs(porta.face)).toBeCloseTo(dg.zDaChapa - folha.espessura / 2, 9);
        expect(d.z).toBeCloseTo(g.quadro.frente + AFASTAMENTO_DA_SOBREPOSTA - (dg.zDaChapa - folha.espessura / 2), 9);
        const tambor = [...peca('d'), ...peca('e')].filter(([x, , z]) => Math.hypot(x - d.x, z - d.z) < raio + 1e-6);
        expect(tambor.length).toBeGreaterThan(30);
        /* o tambor sai pela face externa e entra na lateral menos que o rebaixo que o corpo abre para ele */
        expect(Math.min(...tambor.map(([x]) => x * porta.vao))).toBeLessThan(porta.face * porta.vao);
        const xDoRebaixo = porta.face + porta.abre * (-(porta.profundidadeDoPino + raio + 0.5));
        expect(Math.max(...tambor.map(([x]) => x * porta.vao))).toBeLessThanOrEqual(xDoRebaixo * porta.vao + 1e-6);
        /* a folha fixa no rasgo da lateral */
        const fixa = peca('d').filter(([, , z]) => z < d.z - 9);
        const xMin = Math.min(...fixa.map(([x]) => x));
        const xMax = Math.max(...fixa.map(([x]) => x));
        expect((xMin + xMax) / 2 - d.x).toBeCloseTo(porta.vao * dg.zDaChapa, 6);
        const paredes = [...new Set(corpo.filter(([x, y, z]) => z < d.z - raio - 1 && Math.abs(x - (xMin + xMax) / 2) < 2.5 && Math.abs(y - d.y) <= metade + 0.31).map(([x]) => Number(x.toFixed(6))))].sort((a, b) => a - b);
        /* o rasgo abre para fora: de um lado a parede dele fica 0,2 mm da folha, do outro a folha está à ras da face externa */
        expect(paredes).toHaveLength(2);
        expect([xMin - paredes[0], paredes[1] - xMax].map((v) => Number(v.toFixed(5))).sort((a, b) => a - b)).toEqual([0, 0.2]);
        /* a folha móvel no rasgo do verso da porta: ao centro da chapa, à frente do pino */
        const movel = peca('e').filter(([x]) => Math.abs(x - d.x) > 9);
        const zMin = Math.min(...movel.map(([, , z]) => z));
        const zMax = Math.max(...movel.map(([, , z]) => z));
        expect((zMin + zMax) / 2 - d.z).toBeCloseTo(dg.zDaChapa, 6);
        expect(zMin).toBeCloseTo(g.zDoVerso, 6);
        const lage = mm(pecaDe(montada, `movel-de-caixa-porta-${porta.indice + 1}`));
        const planos = [...new Set(lage.filter(([x, y, z]) => (x - porta.xDaBorda) * porta.vao > -0.01 && (x - porta.xDaBorda) * porta.vao < 20 && Math.abs(y - d.y) <= metade + 0.31 && z > zMin - 0.5 && z < zMax + 0.5).map(([, , z]) => Number(z.toFixed(6))))].sort((a, b) => a - b);
        expect(planos).toHaveLength(2);
        expect(zMin - planos[0]).toBeCloseTo(0, 5); // à ras do verso da porta
        expect(planos[1] - zMax).toBeCloseTo(0.2, 5);
        /* a borda da porta passa do tambor com folga */
        expect((porta.xDaBorda - d.x) * porta.vao).toBeGreaterThan(raio + 0.5 - 1e-9);
        vistos.add(porta.apoio);
      }
      expect([...vistos].sort()).toEqual(parametros.portas === 1 ? ['lateral-esquerda'] : ['lateral-direita', 'lateral-esquerda']);
    }
  });

  /* a dobradiça é quiral, a embutida usa a folha fixa e a móvel de um jeito e a sobreposta de outro: a folha fixa e a móvel de cada
     porta, na pose da montagem, conferem com a pose que a geometria diz */
  it('a folha fixa e a móvel de cada porta ficam na pose que a geometria diz, nas portas da esquerda e da direita, na embutida e na sobreposta', () => {
    for (const parametros of [doPerfil('guarda-roupa'), doPerfil('roupeiro')]) {
      const montada = MOVEL_DE_CAIXA.montar(parametros);
      const g = montada.geometria;
      const dg = g.dobradicaGeometria.mm;
      for (const porta of g.portas) {
        const d = porta.dobradicas[0];
        const fixa = mm(pecaDe(montada, `movel-de-caixa-dobradica-${porta.indice + 1}-1-d`)).filter(([x, , z]) => Math.hypot(x - d.x, z - d.z) > 12);
        const movel = mm(pecaDe(montada, `movel-de-caixa-dobradica-${porta.indice + 1}-1-e`)).filter(([x, , z]) => Math.hypot(x - d.x, z - d.z) > 12);
        /* a fixa vai para o fundo (-z) com a chapa do lado do vão, e a móvel para o lado da porta (x) */
        expect(Math.max(...fixa.map(([, , z]) => z))).toBeLessThan(d.z - 11);
        expect(Math.min(...movel.map(([x]) => (x - d.x) * porta.vao))).toBeGreaterThan(11);
        expect(((faixa(fixa, 0)[0] + faixa(fixa, 0)[1]) / 2 - d.x) * porta.vao).toBeCloseTo(dg.zDaChapa, 6);
        expect((faixa(movel, 2)[0] + faixa(movel, 2)[1]) / 2 - d.z).toBeCloseTo(porta.sinalDoPratoEmZ * dg.zDaChapa, 6);
      }
    }
  });

  it('as dobradiças das duas portas que giram nas faces da divisória ficam em alturas diferentes', () => {
    const g = geometriaDoMovel(completos(QUATRO));
    const esquerda = g.portas.find((porta) => porta.apoio === 'divisoria-esquerda').dobradicas.map((d) => d.y);
    const direita = g.portas.find((porta) => porta.apoio === 'divisoria-direita').dobradicas.map((d) => d.y);
    const altura = g.dobradica.parametros.altura;
    for (const a of esquerda) for (const b of direita) expect(Math.abs(a - b)).toBeGreaterThan(altura + 20);
  });
});

describe('a montagem v5 e o curso das portas e das gavetas', () => {
  it('resolve pelo resolvedor real sem mudar o formato, com uma articulação por porta e por gaveta e as peças contadas', async () => {
    const montada = MOVEL_DE_CAIXA.montar({ perfil: 'guarda-roupa' });
    expect(montada.montagem).toMatchObject({ formato: 'mecanifica.montagem', versao: 5 });
    const n = montada.geometria.dobradica.quantidade;
    const resolvida = await resolver(montada);
    expect(resolvida.instancias).toHaveLength(1 + 2 + 2 * 2 * n + 2 * 2);
    expect(montada.articulacoes.map(({ id, tipo, unidade }) => [id, tipo, unidade])).toEqual([
      ['abre-porta-1', 'revolucao', 'graus'], ['abre-porta-2', 'revolucao', 'graus'], ['abre-gaveta-1', 'prismatica', 'mm'], ['abre-gaveta-2', 'prismatica', 'mm'],
    ]);
    expect(montada.articulacoes[0]).toMatchObject({ curso: { minimo: 0, maximo: 110 } });
    expect(montada.articulacoes[0].acompanham).toHaveLength(n);
    expect(montada.articulacoes[2].curso).toEqual({ minimo: 0, maximo: montada.geometria.gavetas[0].curso });
    expect(montada.cursoMaximo).toBe(110);
    for (const peca of [pecaDe(montada, 'movel-de-caixa-guia-1'), pecaDe(montada, 'movel-de-caixa-gaveta-1')]) expect(peca.orfaos).toEqual([]);
    expect(pecaDe(montada, 'movel-de-caixa-guia-1').portas.get('guia-da-gaveta').interface).toMatchObject({ forma: 'trilho', papel: 'guia', eixo: [0, 0, 1] });
    expect(pecaDe(montada, 'movel-de-caixa-gaveta-1').portas.get('eixo-da-gaveta').interface).toMatchObject({ forma: 'trilho', papel: 'deslizador', eixo: [0, 0, 1] });
  });

  it('o curso de cada gaveta passa sem colisão, e a gaveta empurrada além do fundo do corpo colide com ele', () => {
    const { resolvida, problemas, gerada } = resolverMontagemDaFamilia(MOVEL_DE_CAIXA, doPerfil('gaveteiro'), execucao);
    expect(problemas).toEqual([]);
    for (const articulacao of gerada.articulacoes) {
      const r = conferirArticulacao(resolvida, articulacao);
      expect(r.ok, r.recusa.join(' ')).toBe(true);
      expect(r.posicoes.at(-1)).toMatchObject({ valor: gerada.geometria.gavetas[0].curso, livre: true });
      expect(r.eixo.direcao).toEqual([0, 0, 1]);
    }
    const alem = conferirArticulacao(resolvida, { ...gerada.articulacoes[0], curso: { minimo: -60, maximo: 0 }, passos: 6 });
    expect(alem.ok).toBe(false);
    expect(alem.colisoes[0]).toMatchObject({ movel: ['gaveta-1'], estado: 'interpenetram' });
    /* a frente embutida fecha o rasgo 2 mm adiante do fim do trilho: empurrada 10 mm para trás, a gaveta o atravessa (e a traseira
       dela bate no fundo do corpo, 15 mm atrás, depois) */
    expect(alem.posicoes.filter((p) => !p.livre).map((p) => p.valor)).toEqual([-60, -50, -40, -30, -20, -10]);
    expect(alem.colisoes.some((c) => c.fixo[0] === 'guia-1')).toBe(true);
    expect(alem.colisoes.some((c) => c.fixo[0] === 'corpo' && c.posicao.valor === -20)).toBe(true);
    expect(alem.posicoes.at(-1)).toMatchObject({ valor: 0, livre: true });
  }, 120_000);

  it('o curso de 0 a 110 graus da porta sobreposta passa sem colisão e a porta abre para a frente', () => {
    const montada = MOVEL_DE_CAIXA.montar(LEVE_SOBREPOSTA);
    const { resolvida, problemas } = resolverMontagemDaFamilia(MOVEL_DE_CAIXA, LEVE_SOBREPOSTA, execucao);
    expect(problemas).toEqual([]);
    const r = conferirArticulacao(resolvida, montada.articulacoes[0]);
    expect(r.ok, r.recusa.join(' ')).toBe(true);
    expect(r.colisoes).toEqual([]);
    expect(r.posicoes.at(-1)).toMatchObject({ valor: 110, livre: true });
    expect(r.eixo.direcao).toEqual([0, -1, 0]);
    /* a ponta livre da porta, em 90 graus em torno do eixo, vai para a frente do corpo */
    const g = montada.geometria;
    const porta = g.portas[0];
    const a = (90 * Math.PI) / 180;
    const dx = porta.xLivre - r.eixo.centro[0] / MM;
    const dz = g.zDoVerso - r.eixo.centro[2] / MM;
    const zGirado = dx * Math.sin(a) + dz * Math.cos(a);
    expect(zGirado + r.eixo.centro[2] / MM).toBeGreaterThan(g.quadro.frente + 100);
    /* a sobreposta passa de 110: a porta fica livre até onde a dobradiça deixa */
    const alem = conferirArticulacao(resolvida, { ...montada.articulacoes[0], curso: { minimo: 0, maximo: 170 }, passos: 17 });
    expect(alem.ok, alem.recusa.join(' ')).toBe(true);
  }, 600_000);

  it('o curso de 0 a 110 graus da porta embutida passa, e passando do curso a dobradiça móvel bate no corpo', () => {
    const montada = MOVEL_DE_CAIXA.montar(LEVE_EMBUTIDA);
    const { resolvida, problemas } = resolverMontagemDaFamilia(MOVEL_DE_CAIXA, LEVE_EMBUTIDA, execucao);
    expect(problemas).toEqual([]);
    const r = conferirArticulacao(resolvida, montada.articulacoes[0]);
    expect(r.ok).toBe(true);
    expect(r.posicoes.at(-1)).toMatchObject({ valor: 110, livre: true });
    const alem = conferirArticulacao(resolvida, { ...montada.articulacoes[0], curso: { minimo: 0, maximo: 180 }, passos: 18 });
    expect(alem.ok).toBe(false);
    expect(alem.colisoes[0]).toMatchObject({ fixo: ['corpo'], estado: 'interpenetram' });
    expect(alem.primeirasColisoes[0].livreAte).toBeGreaterThan(110);
    expect(alem.primeirasColisoes[0].livreAte).toBeLessThan(170);
  }, 600_000);

  it('a folha de correr abre até o curso sem colisão, e um pouco além bate na lateral do corpo', () => {
    const { resolvida, problemas, gerada } = resolverMontagemDaFamilia(MOVEL_DE_CAIXA, doPerfil('guarda-roupa-de-correr'), execucao);
    expect(problemas).toEqual([]);
    const folhas = gerada.articulacoes.filter((a) => a.id.startsWith('abre-porta'));
    expect(folhas).toHaveLength(gerada.geometria.portas.length);
    for (const articulacao of folhas) {
      const r = conferirArticulacao(resolvida, articulacao);
      expect(r.ok, r.recusa.join(' ')).toBe(true);
      expect(r.eixo.direcao[0]).toBe(gerada.geometria.portas[folhas.indexOf(articulacao)].direcao);
    }
    /* a folha da esquerda, empurrada 10 mm para a esquerda, atravessa a lateral (a folga é de 3 mm) */
    const alem = conferirArticulacao(resolvida, { ...folhas[0], curso: { minimo: -10, maximo: 0 }, passos: 5 });
    expect(alem.ok).toBe(false);
    expect(alem.colisoes[0].fixo).toEqual(['corpo']);
  }, 300_000);

  it('a mesma chamada dá a mesma montagem', () => {
    const a = resolverMontagemDaFamilia(MOVEL_DE_CAIXA, doPerfil('criado-mudo'), execucao);
    const b = resolverMontagemDaFamilia(MOVEL_DE_CAIXA, doPerfil('criado-mudo'), execucao);
    expect(a.hash).toBe(b.hash);
    expect(a.hash).not.toBe(resolverMontagemDaFamilia(MOVEL_DE_CAIXA, doPerfil('criado-mudo', { largura: 500 }), execucao).hash);
  });
});

describe('várias portas e gavetas abertas ao mesmo tempo', () => {
  it('a porta e a gaveta do criado-mudo, e as portas e as gavetas do guarda-roupa, não se tocam em nenhuma combinação de meio curso e curso', () => {
    for (const nome of ['criado-mudo', 'guarda-roupa']) {
      const { resolvida, problemas, gerada } = resolverMontagemDaFamilia(MOVEL_DE_CAIXA, doPerfil(nome), execucao);
      expect(problemas, nome).toEqual([]);
      const r = conferirAberturasSimultaneas(resolvida, gerada.articulacoes);
      expect(r.ok, r.recusa.join(' ')).toBe(true);
      const n = gerada.articulacoes.length;
      expect(r.paresDeArticulacoes).toBe((n * (n - 1)) / 2);
      expect(r.combinacoes).toBe(4 * r.paresDeArticulacoes);
      expect(r.paresDeSolidos).toBeGreaterThan(r.combinacoes);
      expect(r.articulacoes.every((a) => a.posicoes.length === 2)).toBe(true);
    }
  }, 300_000);

  it('as quatro portas embutidas se conferem abertas juntas até o curso de cada uma, e as duas portas da divisória se tocam acima do curso que a conta deu', () => {
    const { resolvida, problemas, gerada } = resolverMontagemDaFamilia(MOVEL_DE_CAIXA, QUATRO, execucao);
    expect(problemas).toEqual([]);
    const cursos = gerada.articulacoes.map((a) => a.curso.maximo);
    expect(cursos[0]).toBe(110);
    expect(cursos[1]).toBeLessThanOrEqual(90);
    expect(cursos[1]).toBe(cursoNaDivisoria(geometriaDoMovel(completos(QUATRO)), 18));
    const livres = conferirAberturasSimultaneas(resolvida, gerada.articulacoes);
    expect(livres.ok, livres.recusa.join(' ')).toBe(true);
    const n = gerada.articulacoes.length;
    expect(livres.paresDeArticulacoes).toBe((n * (n - 1)) / 2);
    const abertas = gerada.articulacoes.map((a, k) => (k === 1 || k === 2 ? { ...a, curso: { minimo: 0, maximo: 80 } } : a));
    const batem = conferirAberturasSimultaneas(resolvida, abertas);
    expect(batem.ok).toBe(false);
    expect(batem.colisoes.every((c) => [c.a, c.b].sort().join() === 'abre-porta-2,abre-porta-3' && c.valorA === 80 && c.valorB === 80)).toBe(true);
    expect(batem.recusa[0]).toMatch(/abre-porta-2.*abre-porta-3.*abertas ao mesmo tempo/);
  }, 600_000);

  it('uma peça movida por duas articulações é recusada', () => {
    const { resolvida, gerada } = resolverMontagemDaFamilia(MOVEL_DE_CAIXA, doPerfil('criado-mudo'), execucao);
    const [porta, gaveta] = [gerada.articulacoes.find((a) => a.id === 'abre-porta-1'), gerada.articulacoes.find((a) => a.id === 'abre-gaveta-1')];
    expect(() => conferirAberturasSimultaneas(resolvida, [porta, { ...gaveta, acompanham: [['porta-1']] }])).toThrow(/movida por/);
  }, 120_000);
});

describe('a aprovação mecânica de um perfil', () => {
  it('um perfil com portas e gavetas se mede como um dos três pontos, com a montagem e as aberturas simultâneas impressas', () => {
    const r = medirPonto(MOVEL_DE_CAIXA, pontosDosPerfis(MOVEL_DE_CAIXA.contrato)['criado-mudo'], 'perfil criado-mudo', { montagem: 'hash' });
    expect(r.problemas).toEqual([]);
    expect(r.estado).toBe('ok');
    expect(r.montagem.hash).toMatch(/^sha256:/);
    expect(r.montagem.pecas.length).toBeGreaterThan(6);
    expect(r.portas).toEqual(['base-do-corpo']);
  }, 120_000);
});
