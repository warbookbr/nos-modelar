/* promessa-medida.test.mjs — os lados da revolução e a parte rente, medidos nos dois sentidos: em malhas de prova e nas cópias de ensaio
   da calibração do crítico (os controles passam, o para-brisa saliente e a revolução de doze lados reprovam). */
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FRACAO_DOS_LADOS, TOLERANCIA_DO_RENTE_MM, conferirPromessasMedidas, degrauDaParte, ladosEfetivos, ladosPrometidos, rentesPrometidos } from './promessa-medida.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { executarComCachePorPasso } from './entrada-de-medida.mjs';

const RAIZ = resolve(import.meta.dirname, '../..');

/* uma malha neutra de prova, em metro: `caixa` e `prisma` acrescentam faces de uma parte, com a normal para fora */
function malha() {
  const V = new Map(); const F = new Map();
  const ponto = (p) => { V.set(V.size, p); return V.size - 1; };
  const face = (parte, vs) => F.set(F.size, { id: F.size, vs, parte });
  const api = {
    V, F,
    /* caixa de [x0, y0, z0] a [x1, y1, z1]; `sem` tira faces pelo nome (a tampa de um rebaixo) */
    caixa(parte, [x0, y0, z0], [x1, y1, z1], { sem = [], paraDentro = false } = {}) {
      const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(ponto);
      const faces = { baixo: [0, 1, 5, 4], cima: [3, 7, 6, 2], frente: [4, 5, 6, 7], tras: [0, 3, 2, 1], esquerda: [0, 4, 7, 3], direita: [1, 2, 6, 5] };
      for (const [nome, q] of Object.entries(faces)) if (!sem.includes(nome)) face(parte, (paraDentro ? [...q].reverse() : q).map((k) => c[k]));
      return api;
    },
    quad(parte, pontos) { face(parte, pontos.map(ponto)); return api; },
    /* prisma de `n` lados em volta de y, de `de` a `ate` graus */
    prisma(parte, n, raio, altura, { de = 0, ate = 360, lados = n } = {}) {
      const passo = (ate - de) / lados;
      for (let k = 0; k < lados; k += 1) {
        const a = ((de + k * passo) * Math.PI) / 180, b = ((de + (k + 1) * passo) * Math.PI) / 180;
        const q = [[raio * Math.cos(a), 0, raio * Math.sin(a)], [raio * Math.cos(a), altura, raio * Math.sin(a)], [raio * Math.cos(b), altura, raio * Math.sin(b)], [raio * Math.cos(b), 0, raio * Math.sin(b)]].map(ponto);
        face(parte, q);
      }
      return api;
    },
  };
  return api;
}

/* a chapa de 1 m com um rebaixo de 200 por 200 mm e 20 mm de fundo, e a placa de 190 mm nele, com 5 mm de folga em volta e a face de
   cima a `sai` mm da face da chapa */
function placaNoRebaixo(sai) {
  const m = malha();
  const y = sai / 1000;
  /* a chapa é um sólido só: a caixa sem a face de cima, a face de cima em quatro tiras em volta do rebaixo, as quatro paredes do
     rebaixo viradas para dentro dele e o fundo */
  m.caixa('chapa', [-0.5, -0.1, -0.5], [0.5, 0, 0.5], { sem: ['cima'] });
  m.quad('chapa', [[-0.5, 0, -0.5], [-0.5, 0, -0.1], [0.5, 0, -0.1], [0.5, 0, -0.5]]);
  m.quad('chapa', [[-0.5, 0, 0.1], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, 0.1]]);
  m.quad('chapa', [[-0.5, 0, -0.1], [-0.5, 0, 0.1], [-0.1, 0, 0.1], [-0.1, 0, -0.1]]);
  m.quad('chapa', [[0.1, 0, -0.1], [0.1, 0, 0.1], [0.5, 0, 0.1], [0.5, 0, -0.1]]);
  m.caixa('chapa', [-0.1, -0.02, -0.1], [0.1, 0, 0.1], { sem: ['cima', 'baixo'], paraDentro: true });
  m.quad('chapa', [[-0.1, -0.02, -0.1], [-0.1, -0.02, 0.1], [0.1, -0.02, 0.1], [0.1, -0.02, -0.1]]);
  m.caixa('placa', [-0.095, -0.02, -0.095], [0.095, y, 0.095]);
  return m;
}

const PLANO_DA_PLACA = { partes: [
  { nome: 'chapa', forma: 'chapa plana de 1 m com um rebaixo no meio', tecnica: 'caixas' },
  { nome: 'placa', forma: 'placa de 190 mm rente à chapa, no rebaixo, com 5 mm de folga em volta', tecnica: 'caixa' },
] };

describe('os lados prometidos e os efetivos', () => {
  it('o texto promete o maior número de lados que cita, e nada quando não cita', () => {
    expect(ladosPrometidos('a camisa escura de Ø 60', 'círculo de 96 lados extrudado em y')).toBe(96);
    expect(ladosPrometidos('tampa de 8 lados', 'anel e círculos de 96 lados e retângulos extrudados em y')).toBe(96);
    expect(ladosPrometidos('caixa de 160 mm de largura', 'retângulo extrudado em y')).toBe(null);
    expect(ladosPrometidos(undefined, undefined)).toBe(null);
  });

  it('o prisma tem os lados que tem, inteiro, pela metade e ao lado de uma caixa', () => {
    expect(ladosEfetivos(malha().prisma('p', 96, 0.03, 0.8), 'p')).toEqual({ lados: 96, eixo: 'y' });
    expect(ladosEfetivos(malha().prisma('p', 12, 0.03, 0.8), 'p')).toEqual({ lados: 12, eixo: 'y' });
    /* a meia revolução de 96 lados: 48 faces com o passo de 3,75° */
    expect(ladosEfetivos(malha().prisma('p', 96, 0.03, 0.8, { ate: 180, lados: 48 }), 'p').lados).toBe(96);
    /* a revolução pequena ao lado de uma chapa grande continua com os lados dela */
    expect(ladosEfetivos(malha().prisma('p', 96, 0.01, 0.1).caixa('p', [0.1, 0, -1], [2, 1, 1]), 'p').lados).toBe(96);
    expect(ladosEfetivos(malha().caixa('p', [0, 0, 0], [1, 2, 3]), 'p').lados).toBe(4);
    expect(ladosEfetivos(malha().caixa('p', [0, 0, 0], [1, 2, 3]), 'outra')).toBe(null);
  });

  it('a conferência reprova a revolução com menos lados que o mínimo e passa a que tem os prometidos ou mais', () => {
    const plano = (n) => ({ partes: [{ nome: 'p', forma: 'cilindro', tecnica: `círculo de ${n} lados extrudado em y` }] });
    const facetada = conferirPromessasMedidas(plano(96), malha().prisma('p', 12, 0.03, 0.8));
    expect(facetada.medidas).toEqual([{ tipo: 'lados', parte: 'p', prometidos: 96, minimo: 72, efetivos: 12, eixo: 'y', ok: false }]);
    expect(facetada.falhas).toHaveLength(1);
    expect(facetada.falhas[0]).toMatch(/a parte 'p' saiu com 12 lados em volta de y, e o PLANO promete 96 lados \(mínimo 72\)/);
    expect(conferirPromessasMedidas(plano(96), malha().prisma('p', 96, 0.03, 0.8)).falhas).toEqual([]);
    expect(conferirPromessasMedidas(plano(12), malha().prisma('p', 96, 0.03, 0.8)).falhas).toEqual([]);
    /* o mínimo é a fração declarada do prometido, nos dois lados dele */
    expect(Math.ceil(96 * FRACAO_DOS_LADOS)).toBe(72);
    expect(conferirPromessasMedidas(plano(96), malha().prisma('p', 72, 0.03, 0.8)).falhas).toEqual([]);
    expect(conferirPromessasMedidas(plano(96), malha().prisma('p', 71, 0.03, 0.8)).falhas).toHaveLength(1);
    /* a parte prometida que a malha não tem, e o plano sem promessa de lados, não entram */
    expect(conferirPromessasMedidas(plano(96), malha().prisma('outra', 12, 0.03, 0.8))).toEqual({ falhas: [], medidas: [] });
    expect(conferirPromessasMedidas({ partes: [{ nome: 'p', forma: 'cilindro', tecnica: 'extrusão' }] }, malha().prisma('p', 12, 0.03, 0.8))).toEqual({ falhas: [], medidas: [] });
    expect(conferirPromessasMedidas(null, malha().prisma('p', 12, 0.03, 0.8))).toEqual({ falhas: [], medidas: [] });
  });
});

describe('a parte prometida rente', () => {
  it('a promessa se resolve pelo nome da vizinha ou pela primeira palavra da forma dela, e só quando é uma', () => {
    expect(rentesPrometidos(PLANO_DA_PLACA)).toEqual([{ parte: 'placa', vizinha: 'chapa', palavra: 'chapa' }]);
    const casco = { partes: [{ nome: 'fuselagem', forma: 'casco de seções arredondadas' }, { nome: 'vidro', forma: 'vidro de 20 mm rente ao casco, sem degrau' }] };
    expect(rentesPrometidos(casco)).toEqual([{ parte: 'vidro', vizinha: 'fuselagem', palavra: 'casco' }]);
    /* duas vizinhas com a mesma primeira palavra, ou nenhuma: não se resolve */
    expect(rentesPrometidos({ partes: [...casco.partes, { nome: 'outro', forma: 'casco menor' }] })).toEqual([]);
    expect(rentesPrometidos({ partes: [{ nome: 'a', forma: 'tampa rente ao topo' }, { nome: 'b', forma: 'caixa' }] })).toEqual([]);
    expect(rentesPrometidos(undefined)).toEqual([]);
  });

  it('o degrau é zero na placa rente, positivo na que sai e negativo na que afunda, sem contar o fundo nem a folga do rebaixo', () => {
    expect(degrauDaParte(placaNoRebaixo(0), 'placa', 'chapa').degrauMm).toBe(0);
    expect(degrauDaParte(placaNoRebaixo(30), 'placa', 'chapa').degrauMm).toBe(30);
    expect(degrauDaParte(placaNoRebaixo(-8), 'placa', 'chapa').degrauMm).toBe(-8);
    const d = degrauDaParte(placaNoRebaixo(30), 'placa', 'chapa');
    expect(d.ponto[1]).toBe(30);
    expect(d.amostras).toBeGreaterThan(0);
    /* a vizinha longe demais de lado não dá amostra */
    expect(degrauDaParte(placaNoRebaixo(30), 'placa', 'chapa', { vizinhancaMm: 2 })).toMatchObject({ degrauMm: null, amostras: 0 });
  });

  it('a conferência reprova o que sai e o que afunda além da tolerância, e passa o que fica dentro dela', () => {
    expect(conferirPromessasMedidas(PLANO_DA_PLACA, placaNoRebaixo(0)).falhas).toEqual([]);
    expect(conferirPromessasMedidas(PLANO_DA_PLACA, placaNoRebaixo(TOLERANCIA_DO_RENTE_MM)).falhas).toEqual([]);
    const sai = conferirPromessasMedidas(PLANO_DA_PLACA, placaNoRebaixo(30));
    expect(sai.falhas).toHaveLength(1);
    expect(sai.falhas[0]).toMatch(/a parte 'placa' sai 30 mm em relação à superfície de 'chapa', e o PLANO a promete rente \(até 5 mm\)/);
    expect(sai.medidas[0]).toMatchObject({ tipo: 'rente', parte: 'placa', vizinha: 'chapa', degrauMm: 30, ok: false });
    expect(conferirPromessasMedidas(PLANO_DA_PLACA, placaNoRebaixo(-8)).falhas[0]).toMatch(/a parte 'placa' afunda 8 mm/);
    /* a tolerância é opção de quem chama */
    expect(conferirPromessasMedidas(PLANO_DA_PLACA, placaNoRebaixo(30), { toleranciaMm: 40 }).falhas).toEqual([]);
    /* sem a promessa no texto, a mesma malha não é conferida */
    const semRente = { partes: PLANO_DA_PLACA.partes.map((p) => ({ ...p, forma: p.forma.replace('rente à chapa', 'sobre a chapa') })) };
    expect(conferirPromessasMedidas(semRente, placaNoRebaixo(30))).toEqual({ falhas: [], medidas: [] });
  });
});

describe('as cópias de ensaio da calibração do crítico', () => {
  const medir = async (peca) => {
    const caminho = resolve(RAIZ, 'tools/fixtures/acervo', peca, 'receita.js');
    const receita = receitaDoModulo(await importarReceita(caminho));
    return conferirPromessasMedidas(receita.PLANO, (await executarComCachePorPasso(caminho, receita, {})).executada.neutro);
  };

  it('o controle da fuselagem passa com o vidro a 0 mm do casco, e o para-brisa saliente reprova com 29,2 mm', async () => {
    const controle = await medir('peca-c01');
    expect(controle.falhas).toEqual([]);
    expect(controle.medidas).toMatchObject([{ tipo: 'rente', parte: 'parabrisa', vizinha: 'fuselagem', degrauMm: 0, ok: true }]);
    const saliente = await medir('peca-c02');
    expect(saliente.medidas).toMatchObject([{ tipo: 'rente', parte: 'parabrisa', vizinha: 'fuselagem', degrauMm: 29.2, ok: false }]);
    expect(saliente.falhas).toHaveLength(1);
  }, 60_000);

  it('o controle do cilindro passa com 96 e 81 lados, e a revolução de doze lados reprova nas duas partes', async () => {
    const controle = await medir('peca-c03');
    expect(controle.falhas).toEqual([]);
    expect(controle.medidas.map((m) => [m.parte, m.efetivos, m.ok])).toEqual([['cilindroElevacao', 96, true], ['hasteElevacao', 81, true]]);
    const facetada = await medir('peca-c04');
    expect(facetada.medidas.map((m) => [m.parte, m.efetivos, m.ok])).toEqual([['cilindroElevacao', 12, false], ['hasteElevacao', 12, false]]);
    expect(facetada.falhas).toHaveLength(2);
  }, 60_000);
});
