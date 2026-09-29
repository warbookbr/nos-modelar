/* Contrato do esboço: posição relativa por sobre/ponta, recusa de referência
   inexistente e PNG no tamanho que o desenho declara. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { desenharEsboco, resolverOpcao, ErroDeEsboco, faces } from '../src/index.js';
import { fileURLToPath } from 'node:url';
import { gerarEsboco, analisarEsboco, variante, lerZoomDoEsboco, VISTAS_DA_ANALISE } from '../../../tools/mecanifica/esboco.mjs';

const deitadoSobreAnel = {
  opcoes: [{
    titulo: 'teste', nota: 'cilindro deitado sobre anel',
    formas: [
      { id: 'base', tipo: 'anel', diametroExterno: 210, diametroInterno: 120, espessura: 30, eixo: 'y', centro: [0, 0, 0], cor: 'roxo', rotulo: 'base' },
      { id: 'corpo', tipo: 'cilindro', diametro: 177, comprimento: 194, eixo: 'x', sobre: 'base', cor: 'cinza' },
      { id: 'ponta', tipo: 'anel', diametroExterno: 164, diametroInterno: 110, espessura: 20, eixo: 'x', ponta: { id: 'corpo', lado: '+x' }, cor: 'verde' },
      { id: 'caixa', tipo: 'caixa', largura: 40, altura: 20, profundidade: 30, raio: 5, ponta: ['base', '-z'] },
    ],
  }],
};

describe('esboço', () => {
  it('sobre apoia a base no topo e ponta encosta na face indicada', () => {
    const [base, corpo, ponta, caixa] = resolverOpcao(deitadoSobreAnel.opcoes[0]);
    expect(base.max[1]).toBeCloseTo(15, 6);
    expect(corpo.min[1]).toBeCloseTo(base.max[1], 6);
    expect(corpo.centro[1]).toBeCloseTo(15 + 88.5, 6);
    expect(corpo.max[0]).toBeCloseTo(97, 6);
    expect(ponta.min[0]).toBeCloseTo(corpo.max[0], 6);
    expect(ponta.centro[1]).toBeCloseTo(corpo.centro[1], 6);
    expect(caixa.max[2]).toBeCloseTo(base.min[2], 6);
  });

  it('ponta respeita a face achatada do cilindro', () => {
    const [c, a] = resolverOpcao({ formas: [
      { id: 'c', tipo: 'cilindro', diametro: 200, comprimento: 177, achatado: { lado: '+x', profundidade: 20 }, centro: [0, 0, 0] },
      { id: 'a', tipo: 'anel', diametroExterno: 164, diametroInterno: 110, espessura: 20, eixo: 'x', ponta: ['c', '+x'] },
    ] });
    expect(c.max[0]).toBeCloseTo(80, 6);
    expect(a.min[0]).toBeCloseTo(80, 6);
  });

  it('recusa sobre inexistente com mensagem clara', () => {
    const ruim = { opcoes: [{ formas: [{ id: 'a', tipo: 'cilindro', diametro: 10, comprimento: 10, sobre: 'fantasma' }] }] };
    expect(() => desenharEsboco(ruim)).toThrow(ErroDeEsboco);
    expect(() => desenharEsboco(ruim)).toThrow(/"sobre" aponta para "fantasma", que não existe/);
  });

  it('é determinístico', () => {
    expect(desenharEsboco(deitadoSobreAnel).svg).toBe(desenharEsboco(deitadoSobreAnel).svg);
  });

  it('gera PNG e SVG do tamanho declarado', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'esboco-'));
    const arquivo = join(pasta, 'teste.esboco.json');
    writeFileSync(arquivo, JSON.stringify(deitadoSobreAnel));
    const r = await gerarEsboco(arquivo);
    expect(existsSync(r.svg)).toBe(true);
    const png = readFileSync(r.png);
    expect(png.readUInt32BE(16)).toBe(620);
    expect(png.readUInt32BE(20)).toBe(720);
  });

  it('fatía formas longas em múltiplos segmentos para Z-sorting fino', () => {
    const forma = { id: 'eixo', tipo: 'cilindro', diametro: 20, comprimento: 100, eixo: 'z', centro: [0, 0, 0] };
    const [resolvida] = resolverOpcao({ formas: [forma] });
    const fs = faces(resolvida, [1, 1, 1]);
    expect(fs.length).toBeGreaterThan(10);
    expect(fs.some((f) => f.papel === 'tampa')).toBe(true);
    expect(fs.some((f) => f.papel === 'lado')).toBe(true);
  });

  it('suporta múltiplos furos passantes na caixa', () => {
    const esb = {
      opcoes: [{
        formas: [{
          id: 'base', tipo: 'caixa', largura: 100, altura: 20, profundidade: 80,
          furos: [
            { diametro: 10, centro: [-30, -20] },
            { diametro: 10, centro: [30, 20] },
          ],
        }],
      }],
    };
    const r = desenharEsboco(esb);
    expect(r.svg).toContain('fill-rule="evenodd"');
    const [resolvida] = resolverOpcao(esb.opcoes[0]);
    expect(resolvida.prisma.furos.length).toBe(2);
    const fs = faces(resolvida, [1, 1, 1]);
    expect(fs.some((f) => f.papel === 'dentro')).toBe(true);
  });

  it('suporta rotação angular 3D em componentes', () => {
    const esb = {
      opcoes: [{
        formas: [
          { id: 'haste', tipo: 'cilindro', diametro: 20, comprimento: 100, eixo: 'z', rotacao: [0, 45, 0] },
        ],
      }],
    };
    const [resolvida] = resolverOpcao(esb.opcoes[0]);
    expect(resolvida.matriz).not.toBeNull();
    const fs = faces(resolvida, [1, 1, 1]);
    expect(fs.length).toBeGreaterThan(0);
    const r = desenharEsboco(esb);
    expect(r.svg).toContain('<svg');
  });

  it('gera linhas de centro técnicas (traço-ponto) com fusão colinear em corpos de revolução e furos', () => {
    const esb = {
      opcoes: [{
        linhasCentro: true,
        formas: [
          { id: 'alojamento', tipo: 'anel', diametroExterno: 40, diametroInterno: 20, espessura: 30, eixo: 'z', centro: [0, 0, 0] },
          { id: 'eixo', tipo: 'cilindro', diametro: 18, comprimento: 80, eixo: 'z', ponta: ['alojamento', '-z'], desloca: [0, 0, 50] },
          { id: 'base', tipo: 'caixa', largura: 60, altura: 15, profundidade: 40, centro: [0, -30, 0], furos: [{ diametro: 8, centro: [20, 0] }] },
        ],
      }],
    };
    const r = desenharEsboco(esb);
    expect(r.svg).toContain('stroke-dasharray="14,3,2,3"');
  });

  describe('legenda e linhas de centro', () => {
    const formas = [
      { id: 'a', tipo: 'cilindro', diametro: 60, comprimento: 80, eixo: 'z', centro: [0, 0, 0], rotulo: '1. pe' },
      { id: 'b', tipo: 'caixa', largura: 40, altura: 20, profundidade: 30, centro: [90, 0, 0], rotulo: 'sem_numero' },
    ];
    const textos = (svg) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
    const nLinhas = (svg) => (svg.match(/stroke-dasharray="14,3,2,3"/g) ?? []).length;

    it('não duplica o número quando o rótulo já traz', () => {
      const t = textos(desenharEsboco({ opcoes: [{ formas }] }).svg);
      expect(t).toContain('1. pe');
      expect(t.some((x) => /^1\.\s*1\./.test(x))).toBe(false);
      expect(t).toContain('2. sem_numero');
    });

    it('linhasCentro no topo vale para todas as opções e a da opção sobrepõe', () => {
      const cru = (extra) => ({ ...extra, opcoes: [{ formas }, { formas }] });
      expect(nLinhas(desenharEsboco(cru({})).svg)).toBe(0);
      expect(nLinhas(desenharEsboco(cru({ linhasCentro: true })).svg)).toBe(2);
      const so1 = { linhasCentro: true, opcoes: [{ formas }, { linhasCentro: false, formas }] };
      expect(nLinhas(desenharEsboco(so1).svg)).toBe(1);
      const so2 = { opcoes: [{ formas }, { linhasCentro: true, formas }] };
      expect(nLinhas(desenharEsboco(so2).svg)).toBe(1);
    });
  });

  describe('ocultar e oculto', () => {
    const formas = () => [
      { id: 'a', tipo: 'cilindro', diametro: 60, comprimento: 80, eixo: 'z', centro: [0, 0, 0], rotulo: 'peca_a' },
      { id: 'b', tipo: 'caixa', largura: 40, altura: 20, profundidade: 30, centro: [90, 0, 0], rotulo: 'peca_b' },
    ];
    const textos = (svg) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
    const nLinhas = (svg) => (svg.match(/stroke-dasharray="14,3,2,3"/g) ?? []).length;
    const nBolas = (svg) => (svg.match(/<circle/g) ?? []).length;
    const gerar = (e) => desenharEsboco(e).svg;

    it('topo desliga, opção sobrepõe e forma sobrepõe', () => {
      const cru = { linhasCentro: true, ocultar: ['linhasCentro', 'legendas'], opcoes: [
        { titulo: 'T1', formas: formas() },
        { titulo: 'T2', ocultar: [], formas: formas() },
        { titulo: 'T3', ocultar: ['legendas'], formas: [{ ...formas()[0], ocultar: [] }, formas()[1]] },
      ] };
      const svg = gerar(cru);
      expect(textos(svg).filter((x) => /peca_/.test(x)).length).toBe(2 + 1);
      /* T1 herda o topo (0 linhas); T2 religa tudo (1); T3 troca a lista por [legendas] e o cilindro volta a ter linha (1). */
      expect(nLinhas(svg)).toBe(2);
      const so1 = gerar({ linhasCentro: true, ocultar: ['linhasCentro'], opcoes: [{ formas: formas() }] });
      expect(nLinhas(so1)).toBe(0);
      const so2 = gerar({ linhasCentro: true, ocultar: ['linhasCentro'], opcoes: [{ ocultar: [], formas: formas() }] });
      expect(nLinhas(so2)).toBe(1);
    });

    it('cada nome desliga o seu elemento', () => {
      const base = { linhasCentro: true, opcoes: [{ titulo: 'TITULO_X', nota: 'nota_x', formas: formas() }] };
      const com = gerar(base);
      expect(textos(com)).toEqual(expect.arrayContaining(['TITULO_X', 'nota_x', '100 mm', '1. peca_a']));
      const sem = (n) => gerar({ ...base, ocultar: [n] });
      expect(textos(sem('titulo'))).not.toContain('TITULO_X');
      expect(textos(sem('nota'))).not.toContain('nota_x');
      expect(textos(sem('escala'))).not.toContain('100 mm');
      expect(textos(sem('numeracao'))).toContain('peca_a');
      expect(textos(sem('legendas')).some((x) => /peca_/.test(x))).toBe(false);
      expect(nBolas(sem('marcadores'))).toBe(nBolas(com) - 2);
      expect(nLinhas(sem('linhasCentro'))).toBe(0);
    });

    it('nome inválido grita com a lista dos válidos', () => {
      expect(() => gerar({ ocultar: ['hachura'], opcoes: [{ formas: formas() }] })).toThrow(/hachura.*linhasCentro, legendas/);
      expect(() => gerar({ opcoes: [{ ocultar: 'legendas', formas: formas() }] })).toThrow(ErroDeEsboco);
      expect(() => gerar({ opcoes: [{ formas: [{ ...formas()[0], ocultar: ['x'] }] }] })).toThrow(/forma "a"/);
    });

    it('oculto remove a forma do desenho mas mantém a referência de posição', () => {
      const cru = (oculto) => ({ opcoes: [{ formas: [
        { id: 'apoio', tipo: 'caixa', largura: 40, altura: 10, profundidade: 40, centro: [0, 0, 0], rotulo: 'apoio', oculto },
        { id: 'eixo', tipo: 'cilindro', diametro: 20, comprimento: 80, eixo: 'x', sobre: 'apoio', rotulo: 'eixo' },
      ] }] });
      const visivel = gerar(cru(false));
      const escondido = gerar(cru(true));
      expect(textos(visivel).some((x) => /apoio/.test(x))).toBe(true);
      expect(textos(escondido).some((x) => /apoio/.test(x))).toBe(false);
      expect(textos(escondido)).toContain('1. eixo');
      expect(nBolas(escondido)).toBe(1);
      expect(escondido.length).toBeLessThan(visivel.length);
      expect(() => gerar({ opcoes: [{ formas: [{ ...formas()[0], oculto: true }] }] })).toThrow(/oculto/);
    });
  });

  it('rotacao positiva gira pela regra da mão direita em torno do eixo declarado', () => {
    const gira = (rotacao, v) => {
      const [r] = resolverOpcao({ formas: [{ id: 'c', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: [0, 0, 0], rotacao }] });
      return r.matriz.map((linha) => Math.round(linha[0] * v[0] + linha[1] * v[1] + linha[2] * v[2]));
    };
    expect(gira([90, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(gira([0, 90, 0], [0, 0, 1])).toEqual([1, 0, 0]);
    expect(gira([0, 0, 90], [1, 0, 0])).toEqual([0, 1, 0]);
  });

  describe('análise (matriz de conferência)', () => {
    const cru = {
      linhasCentro: false,
      ocultar: ['titulo', 'legendas'],
      opcoes: [{ linhasCentro: false, ocultar: ['nota'], formas: [
        { id: 'a', tipo: 'cilindro', diametro: 60, comprimento: 80, eixo: 'z', centro: [0, 0, 0], rotulo: 'peca_a', ocultar: ['marcadores', 'linhasCentro'], linhaCentro: false },
      ] }],
    };

    it('variante impõe vista, legendas e centros em todos os níveis e preserva o resto', () => {
      const v = variante(cru, { vista: 'lateral', legendas: true, centros: true });
      expect(v.vista).toBe('lateral');
      expect(v.linhasCentro).toBe(true);
      expect(v.ocultar).toEqual(['titulo']);
      expect(v.opcoes[0].linhasCentro).toBeUndefined();
      expect(v.opcoes[0].ocultar).toEqual(['nota']);
      expect(v.opcoes[0].formas[0].ocultar).toEqual(['marcadores']);
      expect(v.opcoes[0].formas[0].linhaCentro).toBeUndefined();
      const w = variante(cru, { vista: 'frontal', legendas: false, centros: false });
      expect(w.opcoes[0].formas[0].ocultar).toEqual(expect.arrayContaining(['marcadores', 'legendas', 'linhasCentro']));
      expect(cru.vista).toBeUndefined();
    });

    it('lerZoomDoEsboco recusa vista desconhecida e recorte invertido', () => {
      expect(lerZoomDoEsboco('frontal:1,2,30,40')).toEqual({ vista: 'frontal', caixa: [1, 2, 30, 40] });
      expect(() => lerZoomDoEsboco('inferior:1,2,30,40')).toThrow(ErroDeEsboco);
      expect(() => lerZoomDoEsboco('frontal:30,2,1,40')).toThrow(ErroDeEsboco);
    });

    it('gera 8 imagens sem centros, o zoom e um manifesto com o hash e o plano, sem alterar o JSON', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'analise-esboco-'));
      const arquivo = join(dir, 'peca.esboco.json');
      const origem = JSON.stringify({ ...cru, linhasCentro: true, plano: 'nível: conceito' });
      writeFileSync(arquivo, origem);
      const { pasta, manifesto } = await analisarEsboco(arquivo, { zoom: 'frontal:100,150,300,300' });
      const imagens = manifesto.arquivos.filter((a) => !a.startsWith('zoom-'));
      expect(imagens.length).toBe(VISTAS_DA_ANALISE.length * 2);
      expect(imagens.some((a) => /-centros\.png$/.test(a) && !/sem-centros/.test(a))).toBe(false);
      expect(manifesto.arquivos.filter((a) => a.startsWith('zoom-')).length).toBe(2);
      for (const a of manifesto.arquivos) expect(existsSync(join(pasta, a))).toBe(true);
      expect(manifesto.esboco).toMatch(/^[0-9a-f]{64}$/);
      expect(manifesto.centros).toBe(false);
      expect(manifesto.forcado).toEqual({ linhasCentro: false });
      expect(manifesto.plano).toBe('nível: conceito');
      expect(readFileSync(arquivo, 'utf8')).toBe(origem);
      expect(JSON.parse(readFileSync(join(pasta, 'manifesto.json'), 'utf8')).arquivos).toEqual(manifesto.arquivos);
    }, 60000);

    it('com centros gera as 16 imagens', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'analise-esboco-'));
      const arquivo = join(dir, 'peca.esboco.json');
      writeFileSync(arquivo, JSON.stringify(cru));
      const { manifesto } = await analisarEsboco(arquivo, { centros: true });
      expect(manifesto.arquivos.length).toBe(VISTAS_DA_ANALISE.length * 4);
      expect(manifesto.arquivos.filter((a) => /-centros\.png$/.test(a) && !/sem-centros/.test(a)).length).toBe(VISTAS_DA_ANALISE.length * 2);
      expect(manifesto.forcado).toEqual({});
    }, 60000);

    it('o campo plano é aceito e não muda o desenho', () => {
      const base = { opcoes: [{ formas: [{ id: 'a', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, cor: 'cinza' }] }] };
      expect(desenharEsboco({ ...base, plano: 'texto' }).svg).toBe(desenharEsboco(base).svg);
    });
  });
});

describe('legendas em lista', () => {
  const fixture = (nome) => JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/${nome}`, import.meta.url)), 'utf8'));
  /* Vista frontal: a (fundo, 100 x 100), b (à frente, 20 x 40) e c (atrás de a, sem cobrir b, totalmente oculta). */
  const tres = (extra = {}) => ({
    vista: 'frontal',
    legendas: 'lista',
    opcoes: [{
      titulo: 'T', nota: 'n',
      formas: [
        { id: 'a', tipo: 'caixa', largura: 100, altura: 100, profundidade: 40, centro: [0, 50, -40], cor: 'azul', rotulo: 'placa de fundo' },
        { id: 'b', tipo: 'caixa', largura: 20, altura: 40, profundidade: 20, centro: [0, 40, 20], cor: 'laranja', rotulo: 'pino' },
        { id: 'c', tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro: [30, 80, -100], cor: 'verde', rotulo: 'peça escondida' },
      ],
    }],
    ...extra,
  });
  const dentro = (x, y, [x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

  it('o modo padrão fica idêntico byte a byte ao svg gravado antes do modo lista', () => {
    const casa = fixture('casa.esboco.json');
    const svgAntes = readFileSync(fileURLToPath(new URL('./fixtures/casa.svg', import.meta.url)), 'utf8');
    expect(desenharEsboco(casa).svg).toBe(svgAntes);
    expect(desenharEsboco({ ...casa, legendas: 'colunas' }).svg).toBe(svgAntes);
    expect(desenharEsboco(casa).baloes).toBeUndefined();
  });

  it('recusa valor desconhecido de legendas', () => {
    expect(() => desenharEsboco(tres({ legendas: 'nuvem' }))).toThrow(/"legendas" deve ser "colunas" ou "lista"/);
  });

  it('a chave sai em ordem crescente, sem linha de chamada e sem colunas laterais', () => {
    const { svg } = desenharEsboco(tres());
    expect(svg).not.toContain('<polyline');
    const numeros = [...svg.matchAll(/font-size="14" font-weight="bold">(\d+)</g)].map((m) => Number(m[1]));
    expect(numeros).toEqual([1, 2, 3]);
    expect(svg).toContain('>placa de fundo<');
    expect(svg).toContain('>pino<');
  });

  it('cada balão cai no polígono visível da própria peça', () => {
    const { baloes, escala } = desenharEsboco(tres());
    const porId = Object.fromEntries(baloes.map((b) => [b.id, { x: b.u, y: -b.v }]));
    const A = [-50, 0, 50, 100];
    const B = [-10, 20, 10, 60];
    expect(dentro(porId.b.x, porId.b.y, B)).toBe(true);
    expect(dentro(porId.a.x, porId.a.y, A)).toBe(true);
    expect(dentro(porId.a.x, porId.a.y, B)).toBe(false);
    expect(escala).toBeGreaterThan(0);
  });

  it('peça totalmente oculta ganha balão tracejado na borda de quem a oculta e marca na chave', () => {
    const { baloes, svg, escala } = desenharEsboco(tres());
    const c = baloes.find((b) => b.id === 'c');
    expect(c.oculta).toBe(true);
    expect(baloes.filter((b) => b.oculta)).toHaveLength(1);
    expect(svg).toMatch(/<circle data-balao="3"[^>]*stroke-dasharray/);
    expect(svg).toContain('peça escondida (oculta nesta vista)');
    expect(svg).not.toContain('placa de fundo (oculta');
    const x = c.u;
    const y = -c.v;
    const distBorda = Math.min(Math.abs(x + 50), Math.abs(x - 50), Math.abs(y), Math.abs(y - 100));
    expect(distBorda).toBeLessThan(3 / escala);
    expect(dentro(x, y, [-52, -2, 52, 102])).toBe(true);
  });

  it('os balões não se sobrepõem', () => {
    const moto = { ...fixture('moto.esboco.json'), legendas: 'lista' };
    for (const vista of ['isometrica', 'lateral', 'frontal', 'superior']) {
      const { baloes } = desenharEsboco({ ...moto, vista });
      expect(baloes.length).toBeGreaterThan(8);
      for (let i = 0; i < baloes.length; i++) {
        for (let j = i + 1; j < baloes.length; j++) expect(Math.hypot(baloes[i].x - baloes[j].x, baloes[i].y - baloes[j].y)).toBeGreaterThanOrEqual(18);
      }
    }
  }, 60000);

  it('respeita ocultar: legendas, numeracao e marcadores', () => {
    const tudo = desenharEsboco({ ...tres(), ocultar: ['legendas'] });
    expect(tudo.svg).not.toContain('data-balao');
    expect(tudo.svg).not.toContain('placa de fundo');
    const semNum = desenharEsboco({ ...tres(), ocultar: ['numeracao'] }).svg;
    expect(semNum).toContain('data-balao');
    expect(semNum).not.toMatch(/font-weight="bold">\d</);
    const semMarc = desenharEsboco({ ...tres(), ocultar: ['marcadores'] }).svg;
    expect(semMarc).not.toContain('data-balao');
    expect(semMarc).toContain('>placa de fundo<');
  });

  it('na moto a escala em px/mm é maior que a do modo padrão (isométrica e lateral)', () => {
    for (const vista of ['isometrica', 'lateral']) {
      const moto = { ...fixture('moto.esboco.json'), vista };
      const padrao = desenharEsboco(moto);
      const lista = desenharEsboco({ ...moto, legendas: 'lista' });
      expect(lista.escala).toBeGreaterThan(padrao.escala * 1.5);
    }
  }, 60000);
});
