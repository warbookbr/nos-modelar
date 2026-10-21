/* O importador de STL: a fixture sintética (o STEP sintético do importador de STEP, tesselado pelo OpenCascade, ver FONTE.md) dá uma peça de
   cada tipo de forma e é comparada com o que o importador de STEP faz do mesmo STEP; cada peça é medida pelo próprio esboço, e não
   pela conta do importador. Os prismas regulares montados aqui fixam o número de lados, e um anel denso gerado por código (`gerar-denso.mjs`,
   guardado compactado) fixa o anel de 252 lados numa malha de dezenas de milhares de triângulos. */
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { descreverEsboco } from '../../modulos/esboco/src/descrever.js';
import { importarStep } from './esboco-importar-step.mjs';
import { conferirStl, idDoArquivo, importarStl, lerStl, RecusaDeImportacao } from './esboco-importar-stl.mjs';
import { arquivosDasEntradas, rodar } from './importar-stl.mjs';

const PASTA = fileURLToPath(new URL('./fixtures/importar-stl/sintetico/', import.meta.url));
const ANEL_DENSO = fileURLToPath(new URL('./fixtures/importar-stl/denso/anel_espacador.stl.gz', import.meta.url));
const STEP = fileURLToPath(new URL('./fixtures/importar-step/sintetico.step', import.meta.url));

const arquivosDaPasta = () => readdirSync(PASTA).filter((n) => n.endsWith('.stl.gz')).sort().map((nome) => ({ nome, bytes: gunzipSync(readFileSync(join(PASTA, nome))) }));

/* O intervalo de cada peça no quadro do CAD (z para cima), o mesmo do STEP sintético, no quadro do esboço: (x, y, z) -> (x, z, -y). */
const ESPERADO = {
  placa: [[0, 100], [0, 8], [-60, 0]],
  garfo: [[150, 190], [0, 10], [-50, 0]],
  cantoneira: [[250, 310], [0, 12], [-60, 0]],
  pino_e_bucha_1: [[350, 410], [0, 8], [-24, -16]],
  pino_e_bucha_2: [[410, 430], [0, 15], [-30, -10]],
  ponteira: [[430, 454], [0, 20], [-32, -8]],
  bloco_furo_cego: [[520, 550], [0, 10], [-20, 0]],
  sapata: [[600, 620], [0, 5], [-10, 0]],
  escareada: [[700, 760], [0, 10], [-40, 0]],
  ponta_fenda: [[795, 805], [0, 50], [-25, -15]],
};

/* O nome do sólido no STEP sintético para o id da peça do STL (o STEP chama o bloco de Solid7, e o STL o chama pelo arquivo). */
const DO_STEP = { pino_e_bucha_1: 'pino', pino_e_bucha_2: 'bucha', bloco_furo_cego: 'peca_07_caixa' };

function caixasMedidas(esboco) {
  const d = descreverEsboco(JSON.parse(JSON.stringify(esboco)));
  return Object.fromEntries(d.opcoes[0].formas.map((f) => [f.id, [f.caixa.x, f.caixa.y, f.caixa.z]]));
}

/* ---- STL montado à mão ---- */

function stlBinario(tris) {
  const buf = Buffer.alloc(84 + 50 * tris.length);
  buf.write('solid cabecalho que parece ASCII', 0, 'latin1');
  buf.writeUInt32LE(tris.length, 80);
  tris.forEach((t, i) => t.flat().forEach((x, c) => buf.writeFloatLE(x, 84 + i * 50 + 12 + c * 4)));
  return buf;
}

/* Prisma regular de n lados (raio das quinas R, altura h, base em z = z0, centro em (cx, cy)), com a malha para fora. */
function prismaRegular(n, R, h, [cx, cy, z0] = [0, 0, 0]) {
  const anel = (z) => Array.from({ length: n }, (_, i) => [cx + R * Math.cos((2 * Math.PI * i) / n), cy + R * Math.sin((2 * Math.PI * i) / n), z]);
  const b = anel(z0); const t = anel(z0 + h);
  const cb = [cx, cy, z0]; const ct = [cx, cy, z0 + h];
  const tris = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tris.push([ct, t[i], t[j]], [cb, b[j], b[i]], [b[i], b[j], t[j]], [b[i], t[j], t[i]]);
  }
  return tris;
}

const caixaMalha = (x0, y0, z0, dx, dy, dz) => {
  const p = (i, j, k) => [x0 + i * dx, y0 + j * dy, z0 + k * dz];
  const quad = (a, b, c, d) => [[a, b, c], [a, c, d]];
  return [
    ...quad(p(0, 0, 0), p(0, 1, 0), p(1, 1, 0), p(1, 0, 0)), ...quad(p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)),
    ...quad(p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)), ...quad(p(0, 1, 0), p(0, 1, 1), p(1, 1, 1), p(1, 1, 0)),
    ...quad(p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)), ...quad(p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)),
  ];
};

describe('o nome da peça', () => {
  it('sai do nome do arquivo: sem pasta, extensão nem acento, minúsculo e com o camelCase separado', () => {
    expect(idDoArquivo('driveSmall_rotor.stl')).toBe('drive_small_rotor');
    expect(idDoArquivo('/x/y/Braço Esquerdo (v2).STL')).toBe('braco_esquerdo_v2');
    expect(idDoArquivo('connector_straight_shifted.stl.gz')).toBe('connector_straight_shifted');
    expect(idDoArquivo('HTTPServer.stl')).toBe('http_server');
    expect(idDoArquivo('3d part.stl')).toBe('peca_3d_part');
    expect(idDoArquivo('.stl')).toBe('');
  });
});

describe('o leitor de STL', () => {
  it('lê o binário pelo tamanho (mesmo com "solid" no cabeçalho) e o ASCII pelo texto', () => {
    const tris = caixaMalha(0, 0, 0, 2, 3, 4);
    const bin = lerStl(stlBinario(tris));
    expect(bin.formato).toBe('binário');
    expect(bin.vertices.length).toBe(12 * 9);
    const texto = `solid caixa\n${tris.map((t) => `facet normal 0 0 0\nouter loop\n${t.map((p) => `vertex ${p.join(' ')}`).join('\n')}\nendloop\nendfacet`).join('\n')}\nendsolid caixa\n`;
    const asc = lerStl(Buffer.from(texto));
    expect(asc.formato).toBe('ASCII');
    expect(Array.from(asc.vertices)).toEqual(Array.from(bin.vertices));
  });

  it('recusa o que não é STL e o ASCII com vértice que não fecha triângulo', () => {
    expect(() => lerStl(Buffer.from('isto não é um STL, é texto qualquer'), 'a.stl')).toThrow(/a\.stl não é um STL/);
    expect(() => lerStl(Buffer.from('solid x\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nendloop\nendfacet\nendsolid x\n'), 'b.stl')).toThrow(/b\.stl.*vértices/);
    expect(() => lerStl(stlBinario([]), 'c.stl')).toThrow(RecusaDeImportacao);
  });
});

describe('a fixture sintética', () => {
  let resultado; let medidas; let formas; let conferencia;
  beforeAll(async () => {
    resultado = await importarStl(arquivosDaPasta(), { conferir: true });
    medidas = caixasMedidas(resultado.esboco);
    formas = Object.fromEntries(resultado.esboco.opcoes[0].formas.map((f) => [f.id, f]));
    conferencia = await conferirStl(resultado);
  }, 120000);

  it('dá a cada peça o nome do arquivo e, num STL de dois componentes, o sufixo do componente', () => {
    expect(resultado.relatorio.pecas.map((p) => p.id)).toEqual(['bloco_furo_cego', 'cantoneira', 'escareada', 'garfo', 'pino_e_bucha_1', 'pino_e_bucha_2', 'placa', 'ponta_fenda', 'ponteira', 'sapata']);
    expect(resultado.relatorio.pecas.filter((p) => p.componente).map((p) => [p.id, p.componente])).toEqual([['pino_e_bucha_1', '1/2'], ['pino_e_bucha_2', '2/2']]);
    expect(resultado.relatorio.pecas.some((p) => p.nomeGenerico)).toBe(false);
    expect(resultado.relatorio.fonte.arquivos.find((a) => a.arquivo === 'sapata.stl.gz').formato).toBe('ASCII');
  });

  it('deixa cada peça onde o arquivo a pôs (z para cima vira y, a frente +y vira -z)', () => {
    for (const [id, esperado] of Object.entries(ESPERADO)) {
      expect(medidas[id], id).toBeDefined();
      medidas[id].forEach(([a, b], i) => {
        expect(a, `${id} eixo ${i} mínimo`).toBeCloseTo(esperado[i][0], 0);
        expect(b, `${id} eixo ${i} máximo`).toBeCloseTo(esperado[i][1], 0);
      });
    }
  });

  it('traduz cada peça para a mesma forma que o importador de STEP dá ao mesmo sólido', async () => {
    const step = await importarStep(readFileSync(STEP, 'utf8'), { arquivo: 'sintetico.step' });
    const doStep = Object.fromEntries(step.relatorio.pecas.map((p) => [p.id, p]));
    for (const p of resultado.relatorio.pecas) {
      const par = doStep[DO_STEP[p.id] ?? p.id];
      expect(par, p.id).toBeDefined();
      expect([p.id, p.classe, p.tipo, p.furos, Boolean(p.aproximada), Boolean(p.marcada)]).toEqual([p.id, par.classe, par.tipo, par.furos, Boolean(par.aproximada), Boolean(par.marcada)]);
      expect(p.volumeDoSolido_mm3 / par.volumeDoSolido_mm3, `${p.id} volume`).toBeGreaterThan(0.995);
      expect(p.volumeDoSolido_mm3 / par.volumeDoSolido_mm3, `${p.id} volume`).toBeLessThan(1.005);
    }
  });

  it('reconhece o círculo dos furos e o cilindro facetados e diz o número de lados', () => {
    expect(formas.placa).toMatchObject({ tipo: 'extrusao', comprimento: 8 });
    const furos = resultado.esboco.opcoes[0].formas.filter((f) => f.id.startsWith('placa_furo_'));
    expect(furos.map((f) => f.tipo).sort()).toEqual(['cilindro', 'cilindro', 'cilindro', 'cilindro', 'extrusao']);
    expect(furos.filter((f) => f.tipo === 'cilindro').every((f) => f.diametro === 6)).toBe(true);
    const placa = resultado.relatorio.pecas.find((p) => p.id === 'placa');
    expect(placa.furosRedondos).toHaveLength(4);
    expect(placa.furosRedondos.every((f) => f.lados >= 24)).toBe(true);
    expect(formas.pino_e_bucha_1).toMatchObject({ tipo: 'cilindro', diametro: 8, comprimento: 60 });
    expect(formas.pino_e_bucha_2).toMatchObject({ tipo: 'anel', diametroExterno: 20, diametroInterno: 10, espessura: 15 });
    expect(formas.ponteira).toMatchObject({ tipo: 'cone', comprimento: 20 });
    expect(formas.ponteira.diametro).toBeCloseTo(24, 1);
    expect(formas.ponteira.diametroTopo).toBeCloseTo(12, 1);
    for (const id of ['pino_e_bucha_1', 'pino_e_bucha_2', 'ponteira']) expect(resultado.relatorio.pecas.find((p) => p.id === id).lados, id).toBeGreaterThanOrEqual(24);
  });

  it('mede o esboço contra a malha de cada STL: as exatas passam de 0,99 e o conjunto de 0,99', () => {
    const exatas = new Set(resultado.relatorio.pecas.filter((p) => !p.aproximada && !p.marcada).map((p) => p.id));
    expect(exatas.size).toBe(7);
    for (const p of conferencia.porPeca) {
      expect(p.iou, p.id).not.toBeNull();
      if (exatas.has(p.id)) expect(p.iou, p.id).toBeGreaterThan(0.99);
    }
    expect(conferencia.iouDoConjunto).toBeGreaterThan(0.99);
    expect(conferencia.pecasSemMedida).toBe(0);
  });

  it('gera um esboço que o módulo lê sem divergência de contrato, com a montagem declarada fora do STL', () => {
    const d = descreverEsboco(JSON.parse(JSON.stringify(resultado.esboco)));
    expect(d.opcoes[0].formas.length).toBeGreaterThanOrEqual(10);
    expect(resultado.esboco.plano.texto).toContain('a montagem não vem do STL');
    expect(resultado.relatorio.contatos.map((c) => [c.a, c.b])).toEqual([['pino_e_bucha_1', 'pino_e_bucha_2'], ['pino_e_bucha_2', 'ponteira']]);
    expect(resultado.relatorio.contatos.every((c) => c.distancia_mm < 0.05)).toBe(true); // a flecha das facetas, e não folga
    expect(resultado.esboco.plano.contrato.tocam).toEqual([['pino_e_bucha_1', 'pino_e_bucha_2'], ['pino_e_bucha_2', 'ponteira']]);
  });

  it('é determinístico: os mesmos STL dão o mesmo texto', async () => {
    const outra = await importarStl(arquivosDaPasta());
    expect(outra.texto).toBe(resultado.texto);
  });
});

describe('o STL facetado', () => {
  const importar = async (tris, opcoes = {}) => importarStl([{ nome: 'peca.stl', bytes: stlBinario(tris) }], opcoes);

  it('com muitos lados é o cilindro, e com poucos diz o número de lados', async () => {
    const muitos = await importar(prismaRegular(48, 10, 20));
    expect(muitos.esboco.opcoes[0].formas[0]).toMatchObject({ id: 'peca', tipo: 'cilindro', diametro: 20, comprimento: 20 });
    expect(muitos.relatorio.pecas[0]).toMatchObject({ lados: 48, ocupacao: expect.any(Number) });
    expect(muitos.relatorio.pecas[0].poucosLados).toBeUndefined();
    const poucos = await importar(prismaRegular(16, 10, 20));
    expect(poucos.esboco.opcoes[0].formas[0]).toMatchObject({ tipo: 'cilindro', diametro: 20 });
    expect(poucos.relatorio.pecas[0].lados).toBe(16);
    expect(poucos.relatorio.pecas[0].poucosLados).toMatch(/16 lados/);
    expect(poucos.relatorio.pecas[0].ocupacao).toBeCloseTo(0.974, 2);
  });

  it('abaixo de 12 lados o polígono é prisma e sai como extrusão exata, e não como cilindro maior que a malha', async () => {
    const hexa = await importar(prismaRegular(6, 10, 20));
    const f = hexa.esboco.opcoes[0].formas[0];
    expect(f.tipo).toBe('extrusao');
    expect(f.perfil).toHaveLength(6);
    expect(hexa.relatorio.pecas[0]).toMatchObject({ classe: 'extrusao', ocupacao: 1 });
    expect(hexa.relatorio.pecas[0].lados).toBeUndefined();
  });

  it('a malha de dentro para fora (enrolamento invertido) dá a mesma peça', async () => {
    const tris = prismaRegular(32, 10, 20);
    const certa = await importar(tris);
    const invertida = await importar(tris.map(([a, b, c]) => [a, c, b]));
    expect(JSON.stringify(invertida.esboco.opcoes)).toBe(JSON.stringify(certa.esboco.opcoes));
  });

  it('a escala multiplica as coordenadas (polegadas) e recusa escala inválida', async () => {
    const cubo = await importar(caixaMalha(0, 0, 0, 1, 2, 3), { escala: 25.4 });
    expect(cubo.esboco.opcoes[0].formas[0].tipo).toBe('caixa');
    expect(caixasMedidas(cubo.esboco).peca.map((x) => Math.round((x[1] - x[0]) * 10) / 10)).toEqual([25.4, 76.2, 50.8]); // x, y (para cima) e z do esboço
    await expect(importar(caixaMalha(0, 0, 0, 1, 1, 1), { escala: 0 })).rejects.toThrow(/--escala/);
  });

  it('separa os componentes desconectados de um STL, ignora a superfície aberta e conta as arestas abertas', async () => {
    const aberta = [[[100, 0, 0], [101, 0, 0], [100, 1, 0]]];
    const r = await importar([...caixaMalha(0, 0, 0, 10, 10, 10), ...caixaMalha(50, 0, 0, 20, 5, 5), ...aberta]);
    expect(r.relatorio.pecas.map((p) => [p.id, p.componente, p.tipo])).toEqual([['peca_1', '1/2', 'caixa'], ['peca_2', '2/2', 'caixa']]);
    expect(r.relatorio.fonte.ignorados).toEqual([{ arquivo: 'peca.stl', triangulos: 1, motivo: 'sem volume (superfície aberta ou plana)' }]);
    const furada = caixaMalha(0, 0, 0, 10, 10, 10).slice(1);
    const f = await importar(furada);
    expect(f.relatorio.pecas[0].arestasAbertas).toBeGreaterThan(0);
  });

  it('recusa o STL sem nenhum sólido fechado', async () => {
    await expect(importar([[[0, 0, 0], [1, 0, 0], [0, 1, 0]]])).rejects.toThrow(/nenhum sólido fechado/);
  });

  it('com lado a lado dispõe as peças numa fileira em x sem sobreposição, apoiadas em y = 0, e não mede contato', async () => {
    const arquivos = arquivosDaPasta();
    const r = await importarStl(arquivos, { ladoALado: true });
    const m = caixasMedidas(r.esboco);
    const caixas = r.relatorio.pecas.map((p) => ({ id: p.id, ...Object.fromEntries(['x', 'y', 'z'].map((e, i) => [e, m[p.id][i]])) }));
    caixas.sort((a, b) => a.x[0] - b.x[0]);
    for (let i = 1; i < caixas.length; i++) expect(caixas[i].x[0], caixas[i].id).toBeGreaterThanOrEqual(caixas[i - 1].x[1] + 9.99);
    for (const c of caixas) {
      expect(c.y[0], c.id).toBeCloseTo(0, 2);
      expect(c.z[0] + c.z[1], c.id).toBeCloseTo(0, 2);
    }
    expect(r.relatorio.contatos).toEqual([]);
    expect(r.esboco.plano.contrato).toBeUndefined();
    expect(r.esboco.plano.texto).toContain('lado a lado');
  });
});

describe('a malha densa (anel_espacador)', () => {
  it('vira um anel exato de 252 lados, com a razão interseção/união acima de 0,98', async () => {
    const r = await importarStl([{ nome: 'anel_espacador.stl', bytes: gunzipSync(readFileSync(ANEL_DENSO)) }], { conferir: true });
    expect(r.esboco.opcoes[0].formas[0]).toMatchObject({ id: 'anel_espacador', tipo: 'anel', diametroExterno: 32, diametroInterno: 31, espessura: 9.5 });
    expect(r.relatorio.pecas[0]).toMatchObject({ classe: 'revolucao', ocupacao: 1, lados: 252 });
    const c = await conferirStl(r);
    expect(c.iouDoConjunto).toBeGreaterThan(0.98);
  }, 120000);
});

describe('a linha de comando', () => {
  it('grava o esboço e o relato (também de uma pasta com STL compactado) e recusa o uso errado', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'importar-stl-'));
    try {
      const saida = join(tmp, 'conjunto.esboco.json');
      const texto = await rodar([PASTA, '--saida', saida, '--conferir']);
      expect(texto).toContain('10 peças de 9 arquivo(s)');
      expect(texto).toContain('a montagem não vem do STL');
      expect(texto).toMatch(/placa: extrusao \(exata\), ocupação 1, interseção\/união 1/);
      expect(texto).toMatch(/pino_e_bucha_1: cilindro \(exata\), ocupação 0\.99\d, \d+ lados/);
      const esboco = JSON.parse(readFileSync(saida, 'utf8'));
      expect(esboco.opcoes[0].formas.some((f) => f.id === 'placa')).toBe(true);
      const relato = JSON.parse(readFileSync(join(tmp, 'conjunto.importacao.json'), 'utf8'));
      expect(relato.conferencia.pecasMedidas).toBe(10);
      const lado = await rodar([join(PASTA, 'placa.stl.gz'), join(PASTA, 'garfo.stl.gz'), '--lado-a-lado', '--saida', join(tmp, 'duas.esboco.json'), '--escala', '2']);
      expect(lado).toContain('numa fileira');
      expect(JSON.parse(readFileSync(join(tmp, 'duas.esboco.json'), 'utf8')).opcoes[0].formas.find((f) => f.id === 'garfo').comprimento).toBe(20);
      writeFileSync(join(tmp, 'ruim.stl'), 'nada de STL aqui');
      await expect(rodar([join(tmp, 'ruim.stl')])).rejects.toThrow(/não é um STL/);
      await expect(rodar([])).rejects.toThrow(/falta a pasta/);
      await expect(rodar([PASTA, '--girar', '1,2'])).rejects.toThrow(/--girar/);
      await expect(rodar([PASTA, '--zzz'])).rejects.toThrow(/desconhecida/);
      await expect(rodar([join(tmp, 'inexistente.stl')])).rejects.toThrow(/não existe/);
      expect(() => arquivosDasEntradas([tmp])).not.toThrow();
      rmSync(join(tmp, 'ruim.stl'));
      rmSync(join(tmp, 'conjunto.esboco.json'));
      rmSync(join(tmp, 'duas.esboco.json'));
      expect(() => arquivosDasEntradas([tmp])).toThrow(/nenhum \.stl/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 120000);
});
