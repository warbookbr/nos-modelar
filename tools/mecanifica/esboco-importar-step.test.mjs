/* O importador de STEP: a fixture sintética (gerada com o OpenCascade WASM por `gerar-sintetico.mjs`) tem uma peça de cada tipo de forma,
   e cada peça é medida pelo próprio esboço (a caixa da forma depois de posta e recortada), e não pela conta do importador. */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { descreverEsboco } from '../../modulos/esboco/src/descrever.js';
import { conferirStep, decodificarTextoStep, idDoNome, importarStep, nomesDosSolidosNoTexto, RecusaDeImportacao } from './esboco-importar-step.mjs';
import { rodar } from './importar-step.mjs';

const FIXTURE = fileURLToPath(new URL('./fixtures/importar-step/sintetico.step', import.meta.url));
const texto = readFileSync(FIXTURE, 'utf8');

/* O intervalo de cada peça no quadro do CAD (z para cima), escrito no comentário do gerador, no quadro do esboço: (x, y, z) -> (x, z, -y). */
const ESPERADO = {
  placa: [[0, 100], [0, 8], [-60, 0]],
  garfo: [[150, 190], [0, 10], [-50, 0]],
  cantoneira: [[250, 310], [0, 12], [-60, 0]],
  pino: [[350, 410], [0, 8], [-24, -16]],
  bucha: [[410, 430], [0, 15], [-30, -10]],
  ponteira: [[430, 454], [0, 20], [-32, -8]],
  peca_07_caixa: [[520, 550], [0, 10], [-20, 0]],
  sapata: [[600, 620], [0, 5], [-10, 0]],
  escareada: [[700, 760], [0, 10], [-40, 0]],
  ponta_fenda: [[795, 805], [0, 50], [-25, -15]],
};

const areaDoPerfil = (pts) => Math.abs(pts.reduce((s, a, i) => { const b = pts[(i + 1) % pts.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);
const caixaDoPerfil = (pts) => { const u = pts.map((p) => p[0]); const v = pts.map((p) => p[1]); return [Math.max(...u) - Math.min(...u), Math.max(...v) - Math.min(...v)]; };

function caixasMedidas(esboco) {
  const d = descreverEsboco(JSON.parse(JSON.stringify(esboco)));
  return Object.fromEntries(d.opcoes[0].formas.map((f) => [f.id, [f.caixa.x, f.caixa.y, f.caixa.z]]));
}

describe('o texto do STEP', () => {
  it('decodifica as escapadas do STEP e tira o nome do B-rep na ordem do arquivo', () => {
    expect(decodificarTextoStep('K\\X\\F6rper1')).toBe('Körper1');
    expect(decodificarTextoStep("\\X2\\00E7\\X0\\a''b")).toBe("ça'b");
    expect(nomesDosSolidosNoTexto("#1 = MANIFOLD_SOLID_BREP('K\\X\\F6rper1',#2);\n#9 = MANIFOLD_SOLID_BREP('Eixo',#3);")).toEqual(['Körper1', 'Eixo']);
  });

  it('faz o id do nome sem acento, espaço nem ponto', () => {
    expect(idDoNome('Braço 2.A')).toBe('braco_2_a');
    expect(idDoNome('  ')).toBe('');
  });
});

describe('a fixture sintética', () => {
  let resultado; let medidas; let formas;
  beforeAll(async () => {
    resultado = await importarStep(texto, { arquivo: 'sintetico.step' });
    medidas = caixasMedidas(resultado.esboco);
    formas = Object.fromEntries(resultado.esboco.opcoes[0].formas.map((f) => [f.id, f]));
  }, 120000);

  it('põe cada peça onde o CAD a pôs, medida pelo esboço (z para cima vira y, a frente +y vira -z)', () => {
    for (const [id, esperado] of Object.entries(ESPERADO)) {
      expect(medidas[id], id).toBeDefined();
      medidas[id].forEach(([a, b], i) => {
        expect(a, `${id} eixo ${i} mínimo`).toBeCloseTo(esperado[i][0], 0);
        expect(b, `${id} eixo ${i} máximo`).toBeCloseTo(esperado[i][1], 0);
      });
    }
  });

  it('dá a cada peça o nome do sólido e, quando o nome é genérico, um nome da ordem e da forma', () => {
    const principais = resultado.relatorio.pecas.map((p) => p.id);
    expect(principais).toEqual(['placa', 'garfo', 'cantoneira', 'pino', 'bucha', 'ponteira', 'peca_07_caixa', 'sapata', 'escareada', 'ponta_fenda']);
    const genericas = resultado.relatorio.pecas.filter((p) => p.nomeGenerico).map((p) => [p.id, p.nomeNoStep]);
    expect(genericas).toEqual([['peca_07_caixa', 'Solid7']]);
  });

  it('faz da placa uma extrusão do contorno com os cinco furos passantes como cortadores', () => {
    expect(formas.placa).toMatchObject({ tipo: 'extrusao', comprimento: 8, eixo: 'y' });
    expect(areaDoPerfil(formas.placa.perfil)).toBeCloseTo(6000, 1);
    expect(caixaDoPerfil(formas.placa.perfil).sort((a, b) => a - b)).toEqual([60, 100]);
    expect(formas.placa.subtrai).toHaveLength(5);
    const furos = formas.placa.subtrai.map((id) => formas[id]);
    expect(furos.every((f) => f.cortador === true)).toBe(true);
    const redondos = furos.filter((f) => f.tipo === 'cilindro');
    expect(redondos).toHaveLength(4);
    expect(redondos.every((f) => f.diametro === 6 && f.eixo === 'y')).toBe(true);
    expect(redondos.map((f) => f.centro.map((x) => Math.round(x))).sort((a, b) => a[0] - b[0] || a[2] - b[2])).toEqual([[15, 4, -50], [15, 4, -10], [85, 4, -50], [85, 4, -10]]);
    const quadrado = furos.filter((f) => f.tipo === 'extrusao');
    expect(quadrado).toHaveLength(1);
    expect(caixaDoPerfil(quadrado[0].perfil)).toEqual([12, 12]);
    expect(quadrado[0].centro.map((x) => Math.round(x))).toEqual([50, 4, -30]);
  });

  it('faz do garfo em U e da peça em L extrusões do contorno côncavo', () => {
    expect(formas.garfo).toMatchObject({ tipo: 'extrusao', comprimento: 10 });
    expect(formas.garfo.perfil).toHaveLength(8);
    expect(areaDoPerfil(formas.garfo.perfil)).toBeCloseTo(1400, 1); // 40 x 50 menos o vão de 20 x 30
    expect(caixaDoPerfil(formas.garfo.perfil).sort((a, b) => a - b)).toEqual([40, 50]);
    expect(formas.garfo.subtrai).toBeUndefined();
    expect(formas.cantoneira).toMatchObject({ tipo: 'extrusao', comprimento: 12 });
    expect(formas.cantoneira.perfil).toHaveLength(6);
    expect(areaDoPerfil(formas.cantoneira.perfil)).toBeCloseTo(1575, 1); // 60 x 15 mais 15 x 45
  });

  it('faz o pino, a bucha e a ponteira de revolução', () => {
    expect(formas.pino).toMatchObject({ tipo: 'cilindro', diametro: 8, comprimento: 60, eixo: 'y' });
    expect(Math.abs(medidas.pino[0][1] - medidas.pino[0][0])).toBeCloseTo(60, 1); // deitado, com o eixo em x
    expect(formas.bucha).toMatchObject({ tipo: 'anel', diametroExterno: 20, diametroInterno: 10, espessura: 15 });
    expect(formas.ponteira).toMatchObject({ tipo: 'cone', diametro: 24, diametroTopo: 12, comprimento: 20 });
  });

  it('faz a caixa exata de um prisma retangular e a caixa de último recurso com a ocupação no relato', () => {
    expect(formas.sapata).toMatchObject({ tipo: 'caixa', largura: 20, altura: 5, profundidade: 10 });
    expect(formas.peca_07_caixa).toMatchObject({ tipo: 'caixa', largura: 30, altura: 10, profundidade: 20 });
    const caixa = resultado.relatorio.pecas.find((p) => p.id === 'peca_07_caixa');
    expect(caixa.ocupacao).toBeCloseTo(0.95, 2); // o furo cego tira 5% do volume
    expect(caixa.marcada).toMatch(/último recurso: ocupação 0\.9/);
    expect(resultado.relatorio.pecas.find((p) => p.id === 'sapata').marcada).toBeUndefined();
    expect(resultado.relatorio.caixas).toEqual([{ id: 'peca_07_caixa', ocupacao: caixa.ocupacao }]);
  });

  it('marca como aproximadas só as duas peças que não são exatas (escareado e fenda) e mede o quanto', () => {
    const rel = Object.fromEntries(resultado.relatorio.pecas.map((p) => [p.id, p]));
    expect(formas.escareada).toMatchObject({ tipo: 'extrusao', comprimento: 10 });
    expect(formas.escareada.subtrai).toHaveLength(2);
    expect(rel.escareada.aproximada).toMatch(/seção do meio/);
    expect(rel.escareada.ocupacao).toBeGreaterThan(0.98);
    expect(formas.ponta_fenda.tipo).toBe('revolucao');
    expect(Math.max(...formas.ponta_fenda.perfil.map((p) => p[0]))).toBeCloseTo(5, 1);
    expect(rel.ponta_fenda.aproximada).toBeDefined();
    expect(rel.ponta_fenda.ocupacao).toBeGreaterThan(0.85);
    expect(Object.values(rel).filter((p) => p.aproximada).map((p) => p.id)).toEqual(['escareada', 'ponta_fenda']);
    expect(resultado.relatorio).toMatchObject({ exatas: 7, aproximadas: 2, caixasUltimoRecurso: 1 });
  });

  it('fecha o volume das peças exatas com o do sólido (a forma é exata, e não só parecida)', () => {
    for (const p of resultado.relatorio.pecas.filter((x) => !x.aproximada && !x.marcada)) {
      expect(p.ocupacao, p.id).toBeGreaterThan(0.999);
      expect(p.ocupacao, p.id).toBeLessThan(1.001);
    }
  });

  it('declara em plano.contrato.tocam os pares a menos da tolerância, por proximidade', () => {
    expect(resultado.esboco.plano.contrato.tocam).toEqual([['pino', 'bucha'], ['bucha', 'ponteira']]);
    expect(resultado.relatorio.contatos.map((c) => c.distancia_mm)).toEqual([0, 0]);
  });

  it('gera um esboço que o módulo lê sem divergência de contrato', () => {
    const d = descreverEsboco(JSON.parse(resultado.texto));
    expect(d.opcoes[0].formas.length).toBe(resultado.esboco.opcoes[0].formas.filter((f) => !f.cortador).length); // os cortadores não se desenham
    expect(JSON.stringify(d)).not.toMatch(/contrato-/);
  });

  it('é determinístico: o mesmo STEP dá o mesmo texto', async () => {
    const outra = await importarStep(texto, { arquivo: 'sintetico.step' });
    expect(outra.texto).toBe(resultado.texto);
    expect(JSON.stringify(outra.relatorio)).toBe(JSON.stringify(resultado.relatorio));
  }, 120000);

  it('mede o esboço contra a malha de cada sólido: as peças exatas passam de 0,999 e o conjunto de 0,99', async () => {
    const c = await conferirStep(resultado);
    expect(c.pecasSemMedida).toBe(0);
    expect(c.iouDoConjunto).toBeGreaterThan(0.99);
    for (const p of c.porPeca.filter((x) => !['peca_07_caixa', 'escareada', 'ponta_fenda'].includes(x.id))) expect(p.iou, p.id).toBeGreaterThan(0.999);
    expect(c.porPeca.find((p) => p.id === 'peca_07_caixa').iou).toBeCloseTo(0.95, 2);
    expect(c.porPeca.find((p) => p.id === 'escareada').iou).toBeGreaterThan(0.99);
    expect(c.porPeca.find((p) => p.id === 'ponta_fenda').iou).toBeGreaterThan(0.85);
  }, 120000);

  it.each(['-y', '+x'])('a frente %s também põe a placa e o pino onde o CAD os pôs', async (frente) => {
    const giro = { '-y': ([x, y, z]) => [-x, y, -z], '+x': ([x, y, z]) => [z, y, -x] }[frente];
    const m = caixasMedidas((await importarStep(texto, { arquivo: 'sintetico.step', frente })).esboco);
    for (const id of ['placa', 'pino']) {
      const [[x0, x1], [y0, y1], [z0, z1]] = ESPERADO[id];
      const cantos = [];
      for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) cantos.push(giro([x, y, z]));
      [0, 1, 2].forEach((i) => {
        expect(m[id][i][0], `${frente} ${id} eixo ${i} mínimo`).toBeCloseTo(Math.min(...cantos.map((c) => c[i])), 0);
        expect(m[id][i][1], `${frente} ${id} eixo ${i} máximo`).toBeCloseTo(Math.max(...cantos.map((c) => c[i])), 0);
      });
    }
  }, 120000);

  it('recusa o que não é STEP de sólido, com a causa', async () => {
    await expect(importarStep('isto não é um STEP')).rejects.toThrow(RecusaDeImportacao);
    await expect(importarStep('isto não é um STEP')).rejects.toThrow(/STEP|sólido/);
    await expect(importarStep(texto, { frente: 'cima' })).rejects.toThrow(/frente/);
  });
});

describe('o comando', () => {
  it('grava o esboço e o relato ao lado do STEP (ou em --saida) e recusa o uso errado', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'importar-step-'));
    try {
      const saida = join(pasta, 'x.esboco.json');
      const linhas = await rodar([FIXTURE, '--saida', saida, '--conferir']);
      expect(linhas).toMatch(/10 peças/);
      expect(linhas).toMatch(/caixa \(último recurso\): peca_07_caixa/);
      expect(linhas).toMatch(/conferência contra a malha dos sólidos/);
      const esboco = JSON.parse(readFileSync(saida, 'utf8'));
      expect(esboco.opcoes[0].formas.some((f) => f.id === 'placa')).toBe(true);
      const relato = JSON.parse(readFileSync(join(pasta, 'x.importacao.json'), 'utf8'));
      expect(relato.fonte.arquivo).toBe('sintetico.step');
      expect(relato.conferencia.iouDoConjunto).toBeGreaterThan(0.99);
      await expect(rodar([FIXTURE, '--frente', 'cima'])).rejects.toThrow(/frente/);
      await expect(rodar([FIXTURE, '--girar', '90,0'])).rejects.toThrow(/três ângulos/);
      await expect(rodar([FIXTURE, '--inventada'])).rejects.toThrow(/desconhecida/);
      await expect(rodar([join(pasta, 'nao-existe.step')])).rejects.toThrow(/não existe/);
      await expect(rodar([])).rejects.toThrow(/falta o arquivo/);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  }, 120000);
});
