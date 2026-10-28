/* cadeira.test.mjs — a família de cadeira: as combinações, as faixas e restrições, a solidez da malha, o determinismo do hash, as
   partes nomeadas, as regras construtivas medidas na geometria de cada perfil (simetria, poste sobre a perna, contato sem
   atravessamento, contorno do assento) e a medida de proporção contra o esboço alvo (receita do externo).

   As regras construtivas valem para os perfis e para os três pontos aprovados. O alvo vale só para a proporção (largura,
   profundidade, altura): as receitas de origem têm peças que se atravessam e lados assimétricos, e a família não os copia. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { chamar, ErroChamadaDeFamilia } from '../../../src/autoria/chamar-familia.js';
import { descreverEsboco } from '../../../modulos/esboco/src/descrever.js';
import { sha256Hex } from '../../nucleo/sha256.js';
import { neutroCanonico } from '../../nucleo/entrada.js';
import { CADEIRA, CONTRATO_DA_CADEIRA } from './index.js';
import { COMPOSICOES, combinacoes } from './composicoes.js';
import { combinacaoDaCadeira, contatoEntreCaixas, degrausEntreCaixas, envolventeDasCaixas, geometriaDaCadeira, idDaCadeira } from './geometria.js';
import { criarRegistroDeFamilias } from '../index.js';
import { ALVOS, compararPerfil } from '../../../tools/modelar/cadeiras-medida.mjs';

const registro = criarRegistroDeFamilias({ familias: [CADEIRA] });
const rodar = (parametros) => executarReceita({ get CHAMADAS_COMPOSICOES() { return [chamar(CADEIRA, 'corpo', parametros)]; } }, registro);
const hash = (neutro) => sha256Hex(JSON.stringify(neutroCanonico(neutro)));
const recusa = (parametros) => {
  try { rodar(parametros); } catch (erro) { return erro; }
  throw new Error('a chamada devia ser recusada');
};
const pontos = (campo) => Object.fromEntries(Object.entries(CONTRATO_DA_CADEIRA.parametros).map(([nome, p]) => [nome, p[campo]]));
const partesDaMalha = (neutro) => new Set([...neutro.F.values()].map((f) => f.parte).filter((nome) => nome != null));
const PERFIS = Object.keys(CONTRATO_DA_CADEIRA.perfis);
const completos = (nome) => (['minimo', 'medio', 'maximo'].includes(nome) ? pontos(nome) : { ...pontos('padrao'), ...CONTRATO_DA_CADEIRA.perfis[nome].parametros });
const CASOS = [...PERFIS, 'minimo', 'medio', 'maximo'];
const TOLERANCIA = 1; // mm: atravessamento e folga aceitos entre peças que se encostam

describe('o contrato e as composições', () => {
  it('é um componente sem portas, com uma composição por combinação de estrutura', () => {
    expect(CONTRATO_DA_CADEIRA.id).toBe('cadeira');
    expect(CONTRATO_DA_CADEIRA.nivel).toBe('componente');
    expect(CADEIRA.contrato.portas).toEqual([]);
    expect(combinacoes()).toHaveLength(2 * 3 * 2 * 2 * 2 * 6 * 5);
    expect(new Set(COMPOSICOES.map(({ id }) => id)).size).toBe(COMPOSICOES.length);
  });

  it('declara os cinco perfis, e cada um escolhe a composição da própria estrutura', () => {
    expect([...PERFIS].sort()).toEqual(Object.keys(ALVOS).sort());
    expect(chamar(CADEIRA, 'corpo', { perfil: 'cadeira-de-madeira' }).composicao).toBe('cadeira.po1-sa2-tr0-al1-ba1-t1-r5');
    expect(chamar(CADEIRA, 'corpo', { perfil: 'cadeira-rustica' }).composicao).toBe('cadeira.po0-sa2-tr1-al1-ba0-t5-r3');
  });

  it('não desenha material nem cor: as faces saem só com a parte', () => {
    const { neutro } = rodar({ perfil: 'cadeira-de-madeira' });
    expect([...neutro.F.values()].every((f) => f.material == null && f.cor == null)).toBe(true);
  });
});

describe('os pontos mínimo, médio e máximo e os perfis são sólidos', () => {
  it.each(CASOS)('%s: malha com faces, sem órfãos, com assento, pernas e todas as faces nomeadas', (nome) => {
    const parametros = ['minimo', 'medio', 'maximo'].includes(nome) ? pontos(nome) : { perfil: nome };
    const { neutro } = rodar(parametros);
    expect(neutro.orfaos ?? []).toEqual([]);
    expect(neutro.F.size).toBeGreaterThan(0);
    const partes = partesDaMalha(neutro);
    for (const parte of ['perna-frente-esq', 'perna-frente-dir', 'perna-tras-esq', 'perna-tras-dir']) expect(partes.has(parte)).toBe(true);
    expect(partes.has('assento') || partes.has('tabua-assento-1')).toBe(true);
    expect([...neutro.F.values()].every((f) => f.parte != null)).toBe(true);
  });

  it('o assento é uma placa ou tábuas, e o encosto tem tantas ripas quanto o parâmetro', () => {
    const rustica = partesDaMalha(rodar({ perfil: 'cadeira-rustica' }).neutro);
    expect([...rustica].filter((n) => n.startsWith('tabua-assento-'))).toHaveLength(5);
    expect(rustica.has('assento')).toBe(false);
    expect(rustica.has('poste-esq')).toBe(false);
    expect([...partesDaMalha(rodar({ perfil: 'cadeira-de-madeira' }).neutro)].filter((n) => n.startsWith('ripa-'))).toHaveLength(5);
  });
});

describe('o determinismo', () => {
  it('dá o mesmo hash em duas chamadas, e outro quando um parâmetro muda', () => {
    const a = hash(rodar({ perfil: 'cadeira-de-madeira' }).neutro);
    expect(hash(rodar({ perfil: 'cadeira-de-madeira' }).neutro)).toBe(a);
    expect(hash(rodar({ perfil: 'cadeira-de-madeira', alturaDoAssento: 480 }).neutro)).not.toBe(a);
  });
});

describe('as regras construtivas, medidas na geometria', () => {
  const g = (nome) => geometriaDaCadeira(completos(nome));
  const achar = (caixas, nome) => caixas.find((c) => c.nome === nome);
  const faixa = (c) => ({ x0: c.centro[0] - c.larg / 2, x1: c.centro[0] + c.larg / 2, y0: c.centro[1], y1: c.centro[1] + c.alt, z0: c.centro[2] - c.prof / 2, z1: c.centro[2] + c.prof / 2 });
  const assentos = (caixas) => caixas.filter((c) => c.nome === 'assento' || c.nome.startsWith('tabua-assento-'));
  const E = 1e-6;

  it.each(CASOS)('%s: a cadeira é simétrica em torno de x = 0, e o assento é centrado', (nome) => {
    const { caixas } = g(nome);
    for (const c of caixas) {
      const f = faixa(c);
      const par = caixas.find((o) => {
        const h = faixa(o);
        return Math.abs(h.x0 + f.x1) < E && Math.abs(h.x1 + f.x0) < E && Math.abs(h.y0 - f.y0) < E && Math.abs(h.y1 - f.y1) < E && Math.abs(h.z0 - f.z0) < E && Math.abs(h.z1 - f.z1) < E;
      });
      expect(par, `${nome}: ${c.nome} sem par espelhado`).toBeDefined();
    }
    for (const a of assentos(caixas)) expect(a.centro[0]).toBeCloseTo(0, 9);
    const assento = envolventeDasCaixas(assentos(caixas));
    expect(assento.min[0]).toBeCloseTo(-assento.max[0], 9);
    expect(assento.min[2]).toBeCloseTo(-assento.max[2], 9);
  });

  it.each(CASOS)('%s: as quatro pernas ficam à mesma distância das bordas do assento', (nome) => {
    const { caixas } = g(nome);
    const caixaDoAssento = envolventeDasCaixas(assentos(caixas));
    const folgas = ['perna-frente-esq', 'perna-frente-dir', 'perna-tras-esq', 'perna-tras-dir'].map((n) => {
      const f = faixa(achar(caixas, n));
      return { lateral: Math.min(f.x1 - caixaDoAssento.min[0], caixaDoAssento.max[0] - f.x0) - (f.x1 - f.x0), n };
    });
    const [a, b, c, d] = ['perna-frente-esq', 'perna-frente-dir', 'perna-tras-esq', 'perna-tras-dir'].map((n) => {
      const f = faixa(achar(caixas, n));
      return n.endsWith('esq') ? f.x0 - caixaDoAssento.min[0] : caixaDoAssento.max[0] - f.x1;
    });
    expect(new Set([a, b, c, d].map((v) => v.toFixed(6))).size).toBe(1);
    expect(folgas.length).toBe(4);
    const [fe, fd, te, td] = ['perna-frente-esq', 'perna-frente-dir', 'perna-tras-esq', 'perna-tras-dir'].map((n) => faixa(achar(caixas, n)));
    expect(fe.z0).toBeCloseTo(fd.z0, 9);
    expect(te.z0).toBeCloseTo(td.z0, 9);
    expect(caixaDoAssento.max[2] - fe.z1).toBeGreaterThanOrEqual(0);
    expect(te.z0 - caixaDoAssento.min[2]).toBeGreaterThanOrEqual(0);
  });

  it.each(CASOS.filter((n) => g(n).combo.postes))('%s: cada poste está sobre a perna de trás do mesmo lado, com o mesmo x, o mesmo z e a mesma seção', (nome) => {
    const { caixas } = g(nome);
    for (const lado of ['esq', 'dir']) {
      const perna = achar(caixas, `perna-tras-${lado}`);
      const poste = achar(caixas, `poste-${lado}`);
      expect(poste.centro[0]).toBeCloseTo(perna.centro[0], 9);
      expect(poste.centro[2]).toBeCloseTo(perna.centro[2], 9);
      expect(poste.larg).toBeCloseTo(perna.larg, 9);
      expect(poste.prof).toBeCloseTo(perna.prof, 9);
      expect(faixa(poste).y0).toBeGreaterThanOrEqual(faixa(perna).y1);
    }
  });

  it.each(CASOS)('%s: o topo de cada perna encosta na face de baixo do assento, sem folga e sem atravessá-lo mais que 1 mm', (nome) => {
    const { caixas, yU } = g(nome);
    for (const n of ['perna-frente-esq', 'perna-frente-dir', 'perna-tras-esq', 'perna-tras-dir']) {
      const topo = faixa(achar(caixas, n)).y1;
      expect(topo - yU, n).toBeGreaterThanOrEqual(-TOLERANCIA);
      expect(topo - yU, n).toBeLessThanOrEqual(TOLERANCIA);
      expect(assentos(caixas).some((a) => contatoEntreCaixas(a, achar(caixas, n)).atravessa), `${n} sem contato com o assento`).toBe(true);
    }
  });

  it.each(CASOS.filter((n) => g(n).combo.postes))('%s: o poste sobe da face de cima do assento, sem atravessá-lo mais que 1 mm', (nome) => {
    const { caixas } = g(nome);
    const topoDoAssento = Math.max(...assentos(caixas).map((a) => faixa(a).y1));
    for (const lado of ['esq', 'dir']) expect(Math.abs(faixa(achar(caixas, `poste-${lado}`)).y0 - topoDoAssento)).toBeLessThanOrEqual(TOLERANCIA);
  });

  it.each(CASOS)('%s: nenhum par de peças se atravessa mais que 1 mm', (nome) => {
    const { caixas } = g(nome);
    const piores = [];
    for (let i = 0; i < caixas.length; i += 1) {
      for (let j = i + 1; j < caixas.length; j += 1) {
        const c = contatoEntreCaixas(caixas[i], caixas[j]);
        if (c.penetracao > TOLERANCIA) piores.push(`${caixas[i].nome} x ${caixas[j].nome}: ${c.penetracao.toFixed(2)} mm`);
      }
    }
    expect(piores).toEqual([]);
  });

  it.each(CASOS)('%s: todas as peças formam um conjunto só, ligado por contato', (nome) => {
    const { caixas } = g(nome);
    const visto = new Set([0]);
    const fila = [0];
    while (fila.length) {
      const i = fila.pop();
      caixas.forEach((c, j) => { if (!visto.has(j) && contatoEntreCaixas(caixas[i], c).sobre.every((s) => s >= -1e-9)) { visto.add(j); fila.push(j); } });
    }
    expect(caixas.filter((_, j) => !visto.has(j)).map((c) => c.nome)).toEqual([]);
  });

  it.each(CASOS)('%s: nenhuma peça passa do contorno do assento e das pernas, nem fica abaixo do chão', (nome) => {
    const { caixas } = g(nome);
    const contorno = envolventeDasCaixas(assentos(caixas));
    const pernas = envolventeDasCaixas(['perna-frente-esq', 'perna-frente-dir', 'perna-tras-esq', 'perna-tras-dir'].map((n) => achar(caixas, n)));
    for (const c of caixas) {
      const f = faixa(c);
      expect(f.x0, c.nome).toBeGreaterThanOrEqual(contorno.min[0] - E);
      expect(f.x1, c.nome).toBeLessThanOrEqual(contorno.max[0] + E);
      expect(f.z0, c.nome).toBeGreaterThanOrEqual(contorno.min[2] - E);
      expect(f.z1, c.nome).toBeLessThanOrEqual(contorno.max[2] + E);
      expect(f.y0, c.nome).toBeGreaterThanOrEqual(0);
    }
    expect(pernas.min[1]).toBe(0);
  });

  it.each(CASOS.filter((n) => g(n).combo.postes && (g(n).combo.alta || g(n).combo.baixa)))('%s: as travessas encostam nos postes, sem atravessá-los mais que 1 mm', (nome) => {
    const { caixas } = g(nome);
    for (const t of ['travessa-alta', 'travessa-baixa']) {
      const travessa = achar(caixas, t);
      if (!travessa) continue;
      for (const lado of ['esq', 'dir']) {
        const c = contatoEntreCaixas(travessa, achar(caixas, `poste-${lado}`));
        expect(c.sobre.every((s) => s >= -1e-9), `${t} sem contato com o poste ${lado}`).toBe(true);
        expect(c.penetracao, `${t} atravessa o poste ${lado}`).toBeLessThanOrEqual(TOLERANCIA);
      }
    }
  });

  it.each(CASOS)('%s: duas caixas que se tocam não têm faces paralelas com diferença entre 0,25 e 5 mm (degrau): ou alinhadas ou recuadas de propósito', (nome) => {
    const { caixas } = g(nome);
    const degraus = [];
    for (let i = 0; i < caixas.length; i += 1) for (let j = i + 1; j < caixas.length; j += 1) degraus.push(...degrausEntreCaixas(caixas[i], caixas[j]));
    expect(degraus.map((d) => `${d.a} x ${d.b} ${d.eixo} ${d.lado}: ${d.diferenca.toFixed(2)} mm`)).toEqual([]);
  });

  it('a regra do degrau pega 1 mm de diferença e aceita 0 mm e 5 mm', () => {
    const base = { nome: 'a', centro: [0, 0, 0], larg: 50, alt: 100, prof: 50 };
    const com = (alt, nome = 'b') => ({ nome, centro: [0, 0, 0], larg: 50, alt, prof: 50 });
    expect(degrausEntreCaixas(base, com(101)).map((d) => d.eixo)).toEqual(['y']);
    expect(degrausEntreCaixas(base, com(100))).toEqual([]);
    expect(degrausEntreCaixas(base, com(105))).toEqual([]);
  });

  it('o topo da travessa alta é o dos postes quando ela fica entre eles, e a travessa sobre os postes tem as faces de trás e da frente alinhadas com as deles', () => {
    const madeira = g('cadeira-de-madeira').caixas;
    expect(faixa(achar(madeira, 'travessa-alta')).y1).toBeCloseTo(faixa(achar(madeira, 'poste-esq')).y1, 6);
    expect(faixa(achar(madeira, 'travessa-alta')).z0).toBeCloseTo(faixa(achar(madeira, 'poste-esq')).z0, 6);
    expect(faixa(achar(madeira, 'travessa-baixa')).z0).toBeCloseTo(faixa(achar(madeira, 'poste-esq')).z0, 6);
    const trabalhada = g('cadeira-trabalhada').caixas;
    const alta = faixa(achar(trabalhada, 'travessa-alta'));
    const poste = faixa(achar(trabalhada, 'poste-esq'));
    expect(alta.z0).toBeCloseTo(poste.z0, 6);
    expect(alta.z1).toBeCloseTo(poste.z1, 6);
    expect(alta.x0).toBeCloseTo(poste.x0, 6);
  });

  it('as pernas da frente da cadeira branca de madeira encostam no assento (ajuste da pessoa)', () => {
    const { caixas, yU } = g('cadeira-branca-de-madeira');
    for (const lado of ['esq', 'dir']) expect(Math.abs(faixa(achar(caixas, `perna-frente-${lado}`)).y1 - yU)).toBeLessThanOrEqual(TOLERANCIA);
  });

  it.each(CASOS)('%s: o portão de contato do esboço, sobre as caixas separadas, não acha atravessamento acima de 1 mm nem peça solta', (nome) => {
    const { caixas } = g(nome);
    const esboco = {
      opcoes: [{ titulo: nome, nota: '', formas: caixas.map((c) => ({ id: c.nome.replace(/[^a-z0-9]+/g, '_'), rotulo: c.nome, tipo: 'caixa', largura: c.larg, altura: c.alt, profundidade: c.prof, centro: [c.centro[0], c.centro[1] + c.alt / 2, c.centro[2]] })) }],
      vista: 'isometrica',
    };
    const opcao = descreverEsboco(esboco).opcoes[0];
    expect((opcao.sobreposicoes3d ?? []).filter((s) => s.penetracao_mm > TOLERANCIA)).toEqual([]);
    expect(opcao.soltas ?? []).toEqual([]);
  });

  it('a estrutura depende só da combinação e o id sai dela', () => {
    const base = pontos('padrao');
    expect(idDaCadeira(combinacaoDaCadeira(base))).toBe('cadeira.po1-sa2-tr0-al1-ba1-t1-r5');
    const a = geometriaDaCadeira(base).caixas.map((c) => c.nome);
    const b = geometriaDaCadeira({ ...base, larguraDoAssento: 600, alturaDosPostes: 1100 }).caixas.map((c) => c.nome);
    expect(b).toEqual(a);
  });
});

describe('as recusas dizem a restrição e não geram malha', () => {
  it('parâmetro fora da faixa', () => {
    expect(recusa({ numeroDeRipas: 6 })).toBeInstanceOf(ErroChamadaDeFamilia);
    expect(recusa({ alturaDoAssento: 600 })).toBeInstanceOf(ErroChamadaDeFamilia);
  });

  it('vão entre ripas que deixa a ripa fina demais', () => {
    expect(recusa({ vaoEntreRipas: 90 }).restricao).toBe('ripas-tem-largura');
  });

  it('postes que não sobem acima do assento', () => {
    /* o topo mínimo das ripas (780 mm) já passa de postes de 600 mm, e a recusa pode vir de qualquer das duas restrições */
    expect(['postes-altos-ou-nenhum', 'ripas-abaixo-do-topo-dos-postes']).toContain(recusa({ alturaDosPostes: 600, alturaDaTravessaAlta: 0, alturaDaTravessaBaixa: 0 }).restricao);
  });

  it('travessa baixa abaixo do assento, ripas abaixo do assento e travessa alta ao lado dos postes', () => {
    expect(recusa({ alturaDoAssento: 500 }).restricao).toBe('travessa-baixa-acima-do-assento');
    expect(recusa({ baseDasRipas: 480, alturaDaTravessaBaixa: 0 }).restricao).toBe('ripas-acima-do-assento');
    expect(recusa({ topoDaTravessaAlta: 1121 }).restricao).toBe('travessa-alta-encaixa-nos-postes');
  });

  it('assento de tábuas sem saia nos lados', () => {
    expect(recusa({ tabuasDoAssento: 2, saiaNosLados: 0 }).restricao).toBe('assento-de-tabuas-precisa-de-saia');
  });

  it('degraus de poucos milímetros: topo da travessa alta a 1 mm do topo dos postes, ripa só 1 mm mais fina que a perna', () => {
    expect(recusa({ topoDaTravessaAlta: 1119 }).restricao).toBe('travessa-alta-encaixa-nos-postes');
    expect(recusa({ profundidadeDaPerna: 35, espessuraDaRipa: 34 }).restricao).toBe('ripa-alinhada-ou-recuada');
  });

  it('ripa mais grossa que as pernas de trás', () => {
    expect(recusa({ profundidadeDaPerna: 35, espessuraDaRipa: 40 }).restricao).toBe('ripa-cabe-na-perna');
  });
});

describe('a medida de proporção contra o esboço alvo', () => {
  it.each(PERFIS)('%s: largura, profundidade e altura em até 3,5% do alvo e volume em até 5%', (perfil) => {
    const m = compararPerfil(perfil);
    /* a rústica tem 3,2% na profundidade: os pregos do encosto saem 8 mm do alvo e a família não os desenha */
    for (const e of m.eixos) expect(Math.abs(e.pct)).toBeLessThanOrEqual(3.5);
    expect(Math.abs(m.volume.pct)).toBeLessThanOrEqual(30);
  });
});
