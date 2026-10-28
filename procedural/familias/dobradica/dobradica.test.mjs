/* dobradica.test.mjs — a família `dobradica`: contrato, recusas, geometria medida contra a conta, a montagem v5 que ela
   gera (resolvida pelo resolvedor real) e o curso da articulação conferido contra as malhas, com o encosto no fim. */
import { describe, expect, it } from 'vitest';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { FORMATO, VERSAO, parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { execucaoDe } from '../../../src/autoria/varrer-parametros.js';
import { conferirFamiliaNosTresPontos } from '../../../tools/modelar/familia-com-esboco.mjs';
import { conferirMontagemDaFamilia } from '../../../tools/modelar/montagem-da-familia.mjs';
import { ErroChamadaDeFamilia, FAMILIAS, chamar, criarRegistroDeFamilias } from '../index.js';
import { DOBRADICA } from './index.js';
import { CURSO_MAXIMO, FOLGA_AXIAL, geometriaDaDobradica } from './geometria.js';

const registro = criarRegistroDeFamilias({ familias: [DOBRADICA] });
const execucao = execucaoDe({ registroComposicoes: registro.registroComposicoes, registroOperacoes: registro.registroOperacoes });
const MM = 0.001;
/* os três arcos do rolo têm o centro deslocado pelos trechos retos de 0,02 mm entre eles: o raio medido do eixo do pino varia até 0,03 mm */
const FOLGA_DO_ROLO = 0.04 * MM;
const MATERIAIS = { chapa: { cor: '#808080' }, pino: { cor: '#c0c0c0' } };
const conjunto = (parametros = {}) => executarReceita({ meta: { nome: 'dobradica' }, CHAMADAS_COMPOSICOES: [chamar(DOBRADICA, 'corpo', parametros)], MATERIAIS }, execucao).neutro;
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));
const recusa = (parametros) => { try { chamar(DOBRADICA, 'corpo', parametros); } catch (erro) { return erro; } throw new Error('a chamada devia ser recusada'); };

function volume(n) {
  let v = 0;
  for (const f of n.F.values()) {
    const p = f.vs.map((id) => n.V.get(id));
    for (let i = 1; i < p.length - 1; i += 1) {
      const [a, b, c] = [p[0], p[i], p[i + 1]];
      v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
  }
  return v;
}
const areaRegular = (n, r) => 0.5 * n * r * r * Math.sin((2 * Math.PI) / n);

async function resolver(montada) {
  const carregarPeca = async (ref) => {
    const { neutro: bruto } = executarReceita(montada.receitas[ref], execucao);
    const neutro = neutroCanonico(bruto);
    return { formato: FORMATO, versao: VERSAO, peca: ref, meta: { nome: ref }, materiais: montada.receitas[ref].MATERIAIS, partes: [...new Set(neutro.F.map(parteDaFace).filter(Boolean))].sort(), portas: [...bruto.portas.values()], V: neutro.V, F: neutro.F };
  };
  return resolverMontagemPersistida(montada.montagem, { carregarPeca });
}

describe('o contrato e a chamada', () => {
  it('está registrada em FAMILIAS, é um objeto e declara as portas e as ferramentas que a receita usa', () => {
    expect(FAMILIAS.map(({ contrato }) => contrato.id)).toContain('dobradica');
    expect(DOBRADICA.contrato.nivel).toBe('objeto');
    expect(DOBRADICA.contrato.portas.map(({ id }) => id)).toEqual(['eixo-do-pino', 'nos-da-folha-d', 'nos-da-folha-e', 'plano-da-folha-d', 'plano-da-folha-e']);
    expect(Object.keys(conjunto().portas ? Object.fromEntries(conjunto().portas) : {}).sort()).toEqual(DOBRADICA.contrato.portas.map(({ id }) => id).sort());
  });

  it('recusa cada impossível com o motivo da família', () => {
    expect(recusa({ nos: 10 }).message).toMatch(/parametros\.nos.*\[3, 9\]/);
    expect(recusa({ nos: 4.5 }).message).toMatch(/inteiro/);
    expect(recusa({ altura: 40, nos: 9, espessura: 3 })).toMatchObject({ restricao: 'no-com-comprimento' });
    expect(recusa({ diametroPino: 3, espessura: 3 })).toMatchObject({ restricao: 'pino-mais-grosso-que-a-chapa' });
    expect(recusa({ larguraFolha: 15, espessura: 4 })).toMatchObject({ restricao: 'folha-larga-o-bastante' });
    expect(recusa({ furos: 0 })).toBeInstanceOf(ErroChamadaDeFamilia);
    expect(() => DOBRADICA.montar({ nos: 2 })).toThrow(/parametros\.nos/);
  });

  it('o ponto médio, o padrão e os extremos são chamáveis e a malha tem os mesmos números em duas chamadas', () => {
    const a = conjunto();
    expect(hash(a)).toBe(hash(conjunto()));
    expect(a.orfaos).toEqual([]);
    for (const nos of [3, 4, 9]) expect(conjunto({ nos, furos: nos === 9 ? 5 : 1 }).orfaos).toEqual([]);
  });
});

describe('a geometria contra a conta', () => {
  it('o pino tem o volume do prisma de 24 lados e a altura pedida', () => {
    const { receitas } = DOBRADICA.montar({});
    const pino = executarReceita(receitas['dobradica-pino'], execucao).neutro;
    expect(volume(pino)).toBeCloseTo(areaRegular(24, 2.5 * MM) * 100 * MM, 12);
    const ys = [...pino.V.values()].map((p) => p[1]);
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([-0.05, 0.05]);
  });

  it('cada folha tem rolos exatamente nas alturas dos seus nós, alternados, e os furos nos centros calculados', () => {
    const geo = geometriaDaDobradica({ altura: 100, larguraFolha: 35, espessura: 2, diametroPino: 5, nos: 5, furos: 3 });
    const { receitas } = DOBRADICA.montar({});
    const raioDoNo = geo.mm.raioDoNo * MM;
    const noRaio = (ref) => {
      const n = executarReceita(receitas[ref], execucao).neutro;
      const ys = new Set();
      for (const [x, y, z] of n.V.values()) if (Math.abs(Math.hypot(x, z) - raioDoNo) < FOLGA_DO_ROLO) ys.add(Number(y.toFixed(7)));
      return [...ys].sort((a, b) => a - b);
    };
    const esperado = (indices) => indices.flatMap((k) => [geo.mm.noK[k].inicio, geo.mm.noK[k].fim]).map((y) => Number((y * MM).toFixed(7))).sort((a, b) => a - b);
    expect(noRaio('dobradica-folha-d')).toEqual(esperado([0, 2, 4]));
    expect(noRaio('dobradica-folha-e')).toEqual(esperado([1, 3]));
    expect(geo.mm.comprimentoDoNo).toBeCloseTo((100 - 4 * FOLGA_AXIAL) / 5, 12);
    const d = executarReceita(receitas['dobradica-folha-d'], execucao).neutro;
    const raioDoFuro = geo.mm.diametroDoFuro / 2 * MM;
    for (const y of geo.mm.furosK) {
      const centro = [geo.mm.xDoFuro * MM, y * MM];
      const nasBordas = [...d.V.values()].filter(([px, py, pz]) => Math.abs(Math.hypot(px - centro[0], py - centro[1]) - raioDoFuro) < 1e-9 && Math.abs(Math.abs(pz - geo.mm.zDaChapa * MM) - geo.mm.espessura / 2 * MM) < 1e-9);
      expect(nasBordas).toHaveLength(24); /* o polígono de 12 lados, nas duas faces da chapa */
    }
  });
});

describe('a conferência com o esboço', () => {
  it('o componente dobradica do esboço contém a peça no mínimo, no médio e no máximo', () => {
    const r = conferirFamiliaNosTresPontos({ familia: DOBRADICA });
    expect(r.estado).toBe('conferida');
    expect(r.pontos.map((p) => p.estado)).toEqual(['conferida', 'conferida', 'conferida']);
    for (const ponto of r.pontos) expect(ponto.portas).toEqual([{ id: 'eixo-do-pino', estado: 'no-lugar' }]);
  });
});

describe('a montagem v5 e o curso da articulação', () => {
  it('a montagem resolve pelo resolvedor real, sem mudar o formato, e o curso do padrão passa até o encosto', async () => {
    const montada = DOBRADICA.montar({});
    expect(montada.montagem).toMatchObject({ formato: 'mecanifica.montagem', versao: 5 });
    const resolvida = await resolver(montada);
    expect(resolvida.instancias.map((i) => i.id).sort()).toEqual(['folha-d', 'folha-e', 'pino']);
    const r = conferirArticulacao(resolvida, montada.articulacoes[0]);
    expect(r.ok).toBe(true);
    expect(r.colisoes).toEqual([]);
    expect(r.posicoes.at(-1)).toMatchObject({ valor: montada.cursoMaximo, livre: true });
    expect(r.eixo.direcao).toEqual([0, -1, 0]);
    /* com a chapa tangente ao rolo as duas folhas nem se encostam em todo o curso */
    expect(r.pares).toEqual([]);
    /* a conferência da aprovação, que junta as peças sem o resolvedor, dá o mesmo curso */
    const daAprovacao = conferirMontagemDaFamilia(DOBRADICA, {}, execucao);
    expect(daAprovacao.problemas).toEqual([]);
    expect(daAprovacao.resumo.articulacoes[0]).toMatchObject({ curso: r.curso, passos: r.passos, posicoes: r.posicoes.length, colisoes: 0, conferido: true });
    expect(daAprovacao.resumo.articulacoes[0].pares).toEqual([]);

    /* passando dos 180 graus a folha E volta a descer sobre a D: livre até pouco depois (189 graus no padrão), colide aos 200 */
    const alem = conferirArticulacao(resolvida, { ...montada.articulacoes[0], curso: { minimo: 0, maximo: 200 }, passos: 4 });
    expect(alem.ok).toBe(false);
    expect(alem.colisoes[0]).toMatchObject({ movel: ['folha-e'], fixo: ['folha-d'], estado: 'interpenetram' });
    expect(alem.primeirasColisoes[0].livreAte).toBeGreaterThan(CURSO_MAXIMO);
    expect(alem.primeirasColisoes[0].livreAte).toBeLessThan(200);
  });

  it('o curso declarado é o de dobrar a folha E de volta sobre a D, com folga, qualquer que seja a chapa', () => {
    for (const espessura of [1, 2.5, 4]) expect(DOBRADICA.montar({ espessura }).cursoMaximo).toBe(CURSO_MAXIMO);
    expect(CURSO_MAXIMO).toBe(180);
  });

  it('a mesma chamada dá a mesma montagem', () => {
    const a = conferirMontagemDaFamilia(DOBRADICA, { nos: 4 }, execucao, { conferirCurso: false });
    const b = conferirMontagemDaFamilia(DOBRADICA, { nos: 4 }, execucao, { conferirCurso: false });
    expect(a.resumo.hash).toBe(b.resumo.hash);
    expect(a.resumo.hash).not.toBe(conferirMontagemDaFamilia(DOBRADICA, { nos: 5 }, execucao, { conferirCurso: false }).resumo.hash);
  });
});
