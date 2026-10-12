/* A unidade declarada (`unidade` na forma, na instância e no espelho), a junta dentro da mesma unidade sem declaração, o gate
   que ignora forma oculta, `--mover` por instância, padrão e lote, `--replanejar` que preserva o agrupamento, `--detalhar` e
   `--integrar`, e a arrumação da linha de comando (caminho do chamador, saída do Condutor, `--forma` sem desenho). */
import { describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { avancar, criarEstado, formatarSituacao, moverEmLote, moverFormas, planoDeDetalhe, portaoDoEstagio, replanejar } from '../src/condutor.js';
import { detalharUnidade, integrarUnidade } from '../src/detalhe.js';
import { verificarContato } from '../src/contato.js';
import { expandirEsboco } from '../src/expandir.js';
import { desenharEsboco, ErroDeEsboco } from '../src/index.js';
import { medirEsboco } from '../src/descrever.js';
import { condutorArquivo, detalharArquivo, integrarArquivo, resolverCaminho } from '../../../tools/mecanifica/esboco.mjs';

const pasta = new URL('./fixtures/', import.meta.url);
const fixture = (nome) => JSON.parse(readFileSync(new URL(nome, pasta), 'utf8'));
const cli = fileURLToPath(new URL('../../../tools/mecanifica/esboco.mjs', import.meta.url));
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const motivo = 'as formas se separam por outra razão neste teste';
const esboco = (formas, contato = {}) => ({ contato: { usar: true, ...contato }, opcoes: [{ titulo: 'T', formas }] });
const passar = (e, estado, n) => { let s = estado; for (let i = 0; i < n; i++) { const r = avancar(e, s); expect(r.ok).toBe(true); s = r.estado; } return s; };
const unidadesDe = (p) => p.unidades.map((u) => `${u.id}:${u.membros.join(',')}`);

describe('unidade declarada', () => {
  it('a moto curva refeita com `unidade` declarada agrupa como a IA queria, com zero --mover', () => {
    const moto = fixture('moto-curvas.esboco.json');
    /* o agrupamento que a IA quis: a balança inteira, a carroceria e a frente com o farol */
    const desejado = { rodaTras: 'rodaTras', rodaFrente: 'rodaFrente', motor: 'motor', quadro: 'quadro', balancimE: 'balanca', balancimD: 'balanca', tanque: 'carroceria', banco: 'carroceria', carenagem: 'carroceria', garfoE: 'frente', garfoD: 'frente', guidao: 'frente', farol: 'frente' };
    const unidadeDesejada = (idDaForma) => desejado[idDaForma.split('.')[0]];
    const movimentosNecessarios = (plano) => {
      /* uma forma precisa de --mover quando a unidade planejada dela não é a dominante da unidade que se quer */
      const dominante = new Map();
      for (const u of plano.unidades) for (const m of u.membros) {
        const d = unidadeDesejada(m);
        if (!dominante.has(d)) dominante.set(d, new Map());
        dominante.get(d).set(u.id, (dominante.get(d).get(u.id) ?? 0) + 1);
      }
      let n = 0;
      for (const [, contagem] of dominante) { const total = [...contagem.values()].reduce((s, x) => s + x, 0); n += total - Math.max(...contagem.values()); }
      return n;
    };
    const automatico = planoDeDetalhe(moto);
    expect(automatico.unidades).toHaveLength(11);
    expect(movimentosNecessarios(automatico)).toBeGreaterThan(0);

    const declarado = JSON.parse(JSON.stringify(moto));
    for (const f of declarado.formas) f.unidade = desejado[f.id];
    const plano = planoDeDetalhe(declarado);
    expect(movimentosNecessarios(plano)).toBe(0);
    expect(plano.unidades.map((u) => u.id).sort()).toEqual(['balanca', 'carroceria', 'frente', 'motor', 'quadro', 'rodaFrente', 'rodaTras']);
    const de = (id) => plano.unidades.find((u) => u.id === id);
    expect(de('balanca').membros).toEqual(['balancimE', 'balancimD']);
    expect(de('carroceria').membros).toEqual(['tanque', 'banco', 'carenagem']);
    expect(de('frente').membros).toHaveLength(8);
    expect(de('frente').declarada).toBe(true);
    expect(plano.unidades.reduce((s, u) => s + u.custo, 0)).toBe(24);
  });

  it('a instância passa a unidade às formas dela, o espelho herda da fonte e a instância manda sobre o componente', () => {
    const e = esboco([caixa('base', [0, 10, 0], 40, 20, 40, { unidade: 'fundo' }), { id: 'r', usa: 'roda', centro: [0, 300, 0], unidade: 'rodas' }, { id: 'l', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, centro: [100, 10, 0], unidade: 'lado' }, { id: 'l2', espelha: { forma: 'l', eixo: 'x' } }, { id: 'l3', espelha: { forma: 'l', eixo: 'x', pos: 10 }, unidade: 'outro' }]);
    const p = planoDeDetalhe(e);
    const de = (id) => p.unidades.find((u) => u.id === id)?.membros;
    expect(de('rodas').every((m) => m.startsWith('r.'))).toBe(true);
    expect(de('rodas').length).toBeGreaterThan(1);
    expect(de('lado')).toEqual(['l', 'l2']);
    expect(de('outro')).toEqual(['l3']);
    expect(de('fundo')).toEqual(['base']);
  });

  it('o espelho de uma instância herda a unidade da fonte e aceita a própria', () => {
    const e = esboco([{ id: 'gE', usa: 'garfo', de: [0, 0, 0], para: [0, 500, 0], unidade: 'frente' }, { id: 'gD', espelha: { forma: 'gE', eixo: 'x' } }, { id: 'gX', espelha: { forma: 'gE', eixo: 'x', pos: 400 }, unidade: 'trás' }]);
    const p = planoDeDetalhe(e);
    const n = (id) => p.unidades.find((u) => u.id === id).membros.length;
    expect(p.unidades.map((u) => u.id)).toEqual(['frente', 'trás']);
    expect(n('frente')).toBe(2 * n('trás'));
  });

  it('recusa unidade que não é texto', () => {
    expect(() => planoDeDetalhe(esboco([caixa('a', [0, 0, 0], 10, 10, 10, { unidade: 3 })]))).toThrow(/"unidade" deve ser um texto não vazio/);
  });

  it('o agrupamento automático não junta mais de metade das formas e só agrupa as sem `unidade`', () => {
    const formas = Array.from({ length: 12 }, (_, k) => caixa(`c${k}`, [k * 15, 10, 0]));
    const pares = formas.slice(1).map((f, k) => ({ a: `c${k}`, b: f.id, tipo: 'atravessa', max: 15, motivo: 'elos de uma cadeia de teste' }));
    const p = planoDeDetalhe(esboco(formas, { pares }));
    expect(Math.max(...p.unidades.map((u) => u.custo))).toBeLessThanOrEqual(6);
    expect(p.unidades.reduce((s, u) => s + u.custo, 0)).toBe(12);
    expect(p.unidades.length).toBeGreaterThanOrEqual(2);
    /* c5 declarada fica de fora do agrupamento por atravessa */
    const com = formas.map((f) => (f.id === 'c5' ? { ...f, unidade: 'meio' } : f));
    const q = planoDeDetalhe(esboco(com, { pares }));
    expect(q.unidades.find((u) => u.id === 'meio').membros).toEqual(['c5']);
    expect(q.unidades.filter((u) => u.id !== 'meio').every((u) => !u.membros.includes('c5'))).toBe(true);
  });

  it('sem `unidade` o agrupamento e o estado são os de antes (a moto curva dá as mesmas 11 unidades)', () => {
    const p = planoDeDetalhe(fixture('moto-curvas.esboco.json'));
    expect(unidadesDe(p)[8]).toBe('garfoE+garfoD+guidao:garfoE.perna,garfoE.bengala,garfoE.coroa,garfoD.perna,garfoD.bengala,garfoD.coroa,guidao');
    expect(p.unidades.some((u) => 'declarada' in u)).toBe(false);
  });
});

describe('junta dentro da mesma unidade', () => {
  const dois = (extraA = {}, extraB = {}, par = { a: 'a', b: 'b', tipo: 'atravessa' }) => esboco([caixa('a', [0, 10, 0], 20, 20, 20, extraA), caixa('b', [15, 10, 0], 20, 20, 20, extraB)], { pares: [par] });

  it('passa sem motivo e sem max, com max padrão e motivo "mesma unidade" registrados como implícitos', () => {
    const g = verificarContato(dois({ unidade: 'u' }, { unidade: 'u' }));
    expect(g.resultado).toBe('aprovado');
    expect(g.implicitas).toEqual([{ opcao: 'T', a: 'a', b: 'b', unidade: 'u', motivo: 'mesma unidade', penetracao_mm: 5, max_mm: 20, maxImplicito: true }]);
    expect(g.atravessamentos[0]).toMatchObject({ a: 'a', b: 'b', penetracao_mm: 5, max_mm: 20, implicita: true });
  });

  it('entre unidades diferentes a mesma declaração é recusada, e entre unidades não relaxa nem com motivo sem max', () => {
    expect(() => verificarContato(dois({ unidade: 'u' }, { unidade: 'v' }))).toThrow(/o par a ↔ b \(tipo atravessa\) precisa dizer por que a exceção existe: falta o campo "motivo"/);
    expect(() => verificarContato(dois({ unidade: 'u' }, { unidade: 'v' }, { a: 'a', b: 'b', tipo: 'atravessa', motivo: 'um motivo de mais de quinze letras' }))).toThrow(/precisa de "max"/);
    expect(() => verificarContato(dois({ unidade: 'u' }, {}))).toThrow(/falta o campo "motivo"/);
    expect(() => verificarContato(dois())).toThrow(/falta o campo "motivo"/);
    const g = verificarContato(dois({ unidade: 'u' }, { unidade: 'v' }, { a: 'a', b: 'b', tipo: 'atravessa', max: 8, motivo: 'um motivo de mais de quinze letras' }));
    expect(g.resultado).toBe('aprovado');
    expect(g.implicitas).toBeUndefined();
  });

  it('o par `atravessa` da mesma unidade que passa do max implícito ainda reprova', () => {
    const e = esboco([caixa('a', [0, 10, 0], 20, 20, 20, { unidade: 'u' }), caixa('b', [0, 10, 0], 6, 6, 6, { unidade: 'u' })], { pares: [{ a: 'a', b: 'b', tipo: 'atravessa' }] });
    const g = verificarContato(e);
    expect(g.resultado).toBe('reprovado');
    expect(g.achados[0]).toMatchObject({ tipo: 'atravessa-excedido', implicita: true, max: 6 });
  });

  it('o max declarado vale dentro da unidade, e a junta de uma unidade só não pede nada', () => {
    const e = esboco([caixa('a', [0, 10, 0], 20, 20, 20, { unidade: 'u' }), caixa('b', [15, 10, 0], 20, 20, 20, { unidade: 'u' }), caixa('c', [30, 10, 0], 20, 20, 20, { unidade: 'u' })], { juntas: [{ pecas: ['a', 'b', 'c'] }] });
    const g = verificarContato(e);
    expect(g.resultado).toBe('aprovado');
    expect(g.implicitas).toHaveLength(3);
    const com = esboco([caixa('a', [0, 10, 0], 20, 20, 20, { unidade: 'u' }), caixa('b', [15, 10, 0], 20, 20, 20, { unidade: 'u' })], { pares: [{ a: 'a', b: 'b', tipo: 'atravessa', max: 3, motivo: 'o max declarado manda' }] });
    expect(verificarContato(com).achados[0]).toMatchObject({ tipo: 'atravessa-excedido', max: 3 });
    expect(verificarContato(com).achados[0].implicita).toBeUndefined();
  });

  it('a unidade planejada pelo Condutor vale como a declarada, e a declarada manda', () => {
    const e = dois();
    expect(verificarContato(e, { unidades: { a: 'u', b: 'u' } }).resultado).toBe('aprovado');
    expect(() => verificarContato(e, { unidades: { a: 'u', b: 'v' } })).toThrow(/falta o campo "motivo"/);
    expect(() => verificarContato(dois({ unidade: 'x' }, { unidade: 'y' }), { unidades: { a: 'u', b: 'u' } })).toThrow(/falta o campo "motivo"/);
  });

  it('o espelho herda a unidade e o par herdado também passa dentro da unidade', () => {
    const e = esboco([caixa('a', [0, 10, 0], 20, 20, 20, { unidade: 'u' }), caixa('b', [15, 10, 0], 20, 20, 20, { unidade: 'u' }), { id: 'a2', espelha: { forma: 'a', eixo: 'x', pos: 100 } }, { id: 'b2', espelha: { forma: 'b', eixo: 'x', pos: 100 } }], { pares: [{ a: 'a', b: 'b', tipo: 'atravessa' }] });
    const g = verificarContato(e);
    expect(g.implicitas.map((i) => `${i.a}-${i.b}`).sort()).toEqual(['a-b', 'a2-b2']);
  });
});

describe('formas ocultas no gate', () => {
  it('a instância com `oculto` e `contato.usar` não recusa mais, nem o par que cita forma oculta', () => {
    const e = esboco([caixa('a', [0, 10, 0]), { id: 'r', usa: 'roda', centro: [200, 300, 0], oculto: true }], { pares: [{ a: 'a', b: 'r', tipo: 'livre', motivo: 'a roda está oculta neste teste' }, { a: 'a', b: 'r.pneu', tipo: 'livre', motivo: 'a roda está oculta neste teste' }] });
    const g = verificarContato(e);
    expect(g.resultado).toBe('aprovado');
    expect(() => medirEsboco(e)).not.toThrow();
  });

  it('um par que cita um id que não existe em forma nenhuma continua recusado', () => {
    const e = esboco([caixa('a', [0, 10, 0]), caixa('z', [50, 10, 0], 20, 20, 20, { oculto: true })], { pares: [{ a: 'a', b: 'z', tipo: 'livre', motivo: 'z está oculta neste teste' }, { a: 'a', b: 'naoExiste', tipo: 'livre', motivo: 'este id não existe em lugar algum' }] });
    expect(() => verificarContato(e)).toThrow(/cita "naoExiste", que não é uma forma visível/);
  });

  it('a junta com peça oculta mantém o par com a visível (o isolado o confere) e descarta o par entre ocultas e a junta só de ocultas', () => {
    const formas = [caixa('a', [0, 10, 0]), caixa('b', [15, 10, 0]), caixa('z', [30, 10, 0], 20, 20, 20, { oculto: true }), caixa('zz', [45, 10, 0], 20, 20, 20, { oculto: true })];
    const juntas = [{ pecas: ['a', 'b', 'z'], max: 10, motivo: 'a presilha abraça as duas peças' }, { pecas: ['a', 'z'], max: 10, motivo: 'só sobra uma peça visível' }, { pecas: ['z*', 'a'], max: 10, motivo: 'o padrão só casa peças ocultas' }];
    const x = expandirEsboco(esboco(formas, { juntas }));
    /* a-z, b-z e zz-a são visível contra oculta; z-zz (as duas ocultas) saiu */
    expect(x.opcoes[0].contato.pares.map((p) => `${p.a}-${p.b}`)).toEqual(['a-b', 'a-z', 'b-z', 'zz-a']);
    expect(expandirEsboco(esboco(formas, { juntas: [{ pecas: ['z*'], max: 1, motivo: 'só há peças ocultas na junta' }] })).opcoes[0].contato.pares).toEqual([]);
    expect(() => expandirEsboco(esboco(formas, { juntas: [{ pecas: ['a', 'nada'], max: 1, motivo: 'um id que não existe em lugar nenhum' }] }))).toThrow(/cita "nada", que não é uma forma visível/);
    expect(() => expandirEsboco(esboco(formas, { juntas: [{ pecas: ['a'], max: 1, motivo: 'uma peça só, sem nada oculto' }] }))).toThrow(/pelo menos duas peças distintas/);
  });
});

describe('o agrupamento pelo Condutor', () => {
  const medida = (extra) => ({ nome: 'altura', valor: 20, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede: 'alturaTotal', ...extra });
  /* quatro caixas em fila, todas encostadas: quatro unidades */
  const fila = () => ({
    contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 },
    plano: { nivel: 'detalhado', medidas: [medida(), medida({ nome: 'l1', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l2', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l3', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l4', valor: 80, mede: 'larguraTotal' })], contrato: { tocam: [['a', 'b']] } },
    opcoes: [{ titulo: 'T', formas: [caixa('a', [10, 10, 0]), caixa('b', [30, 10, 0]), caixa('c', [50, 10, 0]), caixa('d', [70, 10, 0])] }],
  });
  const naPlano = (e) => passar(e, criarEstado(e, 'x.esboco.json'), 2);

  it('--mover aceita instância de componente, padrão e várias formas, e registra uma alteração por forma', () => {
    const moto = fixture('moto-curvas.esboco.json');
    let s = criarEstado(moto, 'moto.esboco.json');
    s = passar(moto, s, 2);
    expect(s.atual).toBe('plano-de-detalhe');
    const porInstancia = moverFormas(moto, s, { forma: 'garfoE', para: 'balancim', motivo });
    expect(porInstancia.unidades.find((u) => u.id === 'balancim').membros).toEqual(['garfoE.perna', 'garfoE.bengala', 'garfoE.coroa']);
    expect(porInstancia.alteracoes).toHaveLength(3);
    const porPadrao = moverFormas(moto, s, { padrao: 'garfoD.*', para: 'balancim', motivo });
    expect(porPadrao.unidades.find((u) => u.id === 'balancim').membros).toHaveLength(3);
    const varias = moverFormas(moto, s, { formas: ['tanque', 'banco'], para: 'carroceria', motivo });
    expect(varias.unidades.find((u) => u.id === 'carroceria').membros).toEqual(['tanque', 'banco']);
    expect(() => moverFormas(moto, s, { padrao: 'xyz.*', para: 'a', motivo })).toThrow(/o padrão "xyz\.\*" não casa/);
    expect(() => moverFormas(moto, s, { forma: 'garfoZ', para: 'a', motivo })).toThrow(/"garfoZ" não é uma forma de nenhuma unidade/);
    expect(() => moverFormas(moto, s, { forma: 'tanque', para: 'tanque', motivo })).toThrow(/já está na unidade "tanque"/);
    /* as que já estão no destino ficam, o resto vai */
    const parcial = moverFormas(moto, varias, { formas: ['garfoE', 'tanque'], para: 'garfoE+garfoD+guidao', motivo });
    expect(parcial.unidades.find((u) => u.id === 'garfoE+garfoD+guidao').membros).toHaveLength(8);
    expect(parcial.alteracoes).toHaveLength(3);
  });

  it('--mover-lote aplica a lista toda, ou nenhum movimento', () => {
    const moto = fixture('moto-curvas.esboco.json');
    const s = passar(moto, criarEstado(moto, 'moto.esboco.json'), 2);
    const lote = [{ formas: ['balancimE', 'balancimD'], para: 'balanca', motivo }, { padrao: 'rodaFrente.*', para: 'rodas', motivo }, { forma: 'rodaTras', para: 'rodas', motivo }];
    const novo = moverEmLote(moto, s, lote);
    expect(novo.unidades.find((u) => u.id === 'balanca').membros).toEqual(['balancimE', 'balancimD']);
    expect(novo.unidades.find((u) => u.id === 'rodas').membros).toHaveLength(8);
    expect(novo.alteracoes).toHaveLength(10);
    expect(() => moverEmLote(moto, s, [lote[0], { forma: 'nenhuma', para: 'x', motivo }])).toThrow(/movimento 2/);
    expect(() => moverEmLote(moto, s, [])).toThrow(/lista não vazia/);
    expect(s.unidades).toHaveLength(11);
  });

  it('--replanejar preserva o agrupamento das formas que continuam e só posiciona as novas', () => {
    const e = fila();
    let s = naPlano(e);
    s = moverFormas(e, s, { formas: ['b', 'c'], para: 'grupo', motivo });
    const mais = JSON.parse(JSON.stringify(e));
    mais.opcoes[0].formas.push(caixa('e', [90, 10, 0]), caixa('f', [110, 10, 0], 20, 20, 20, { unidade: 'grupo' }));
    const refeito = replanejar(mais, s, { motivo });
    const de = (id) => refeito.unidades.find((u) => u.id === id)?.membros;
    expect(de('grupo')).toEqual(['b', 'c', 'f']);
    expect(de('a')).toEqual(['a']);
    expect(de('d')).toEqual(['d']);
    expect(de('e')).toEqual(['e']);
    expect(refeito.alteracoes.at(-1).novas).toEqual([{ forma: 'e', unidade: 'e' }]);
    expect(refeito.unidades.find((u) => u.id === 'grupo').declarada).toBe(true);
  });

  it('a saída do --condutor não traz o histórico de agrupamento e abrevia nomes longos de unidade', () => {
    const e = fila();
    let s = moverFormas(e, naPlano(e), { formas: ['a', 'b'], para: 'u', motivo });
    expect(formatarSituacao(s, portaoDoEstagio(e, s))).not.toContain('agrupamento alterado');
    expect(formatarSituacao(s, portaoDoEstagio(e, s), { historico: true })).toContain('agrupamento alterado: a de a para u');
    const longo = 'u'.repeat(100);
    s = moverFormas(e, s, { forma: 'c', para: longo, motivo });
    const texto = formatarSituacao(s, portaoDoEstagio(e, s));
    expect(texto).toContain(`${'u'.repeat(47)}…`);
    expect(texto).not.toContain(longo);
  });
});

describe('--detalhar e --integrar', () => {
  const copiaDaMoto = () => {
    const dir = mkdtempSync(join(tmpdir(), 'detalhe-'));
    const arq = join(dir, 'moto.esboco.json');
    copyFileSync(fileURLToPath(new URL('moto-curvas.esboco.json', pasta)), arq);
    for (let i = 0; i < 4; i++) condutorArquivo(arq, { proximo: true });
    return { dir, arq };
  };
  const semConferencia = (estado) => ({ ...estado, unidades: estado.unidades.map(({ envelopeConferido, ...u }) => u) });

  it('detalhar grava o esboço isolado: só a unidade visível, as outras com oculto e o plano mínimo', () => {
    const moto = fixture('moto-curvas.esboco.json');
    const d = detalharUnidade(moto, null, 'garfoE+garfoD+guidao');
    expect(d.plano).toEqual({ texto: 'detalhe da unidade garfoE+garfoD+guidao', nivel: 'esquematico' });
    expect(d.opcoes).toHaveLength(1);
    const visiveis = d.formas.filter((f) => f.oculto !== true).map((f) => f.id);
    expect(visiveis).toEqual(['garfoE', 'garfoD', 'guidao']);
    expect(d.formas.filter((f) => f.oculto === true)).toHaveLength(10);
    const x = expandirEsboco(d);
    expect(x.opcoes[0].formas.filter((f) => f.oculto !== true).length).toBe(7);
    expect(() => medirEsboco(d)).not.toThrow();
    expect(() => detalharUnidade(moto, null, 'nenhuma')).toThrow(/não é uma unidade de detalhe/);
    expect(moto.formas.every((f) => f.oculto === undefined)).toBe(true);
  });

  it('ida e volta sem mudança devolve o mesmo esboço e preserva o estado do Condutor', () => {
    const { arq } = copiaDaMoto();
    const antesTexto = readFileSync(arq, 'utf8');
    const antesEstado = JSON.parse(readFileSync(`${arq}.condutor.json`, 'utf8'));
    expect(antesEstado.atual).toBe('detalhe-por-unidade');
    const d = detalharArquivo(arq, 'tanque');
    expect(d.destino).toBe(arq.replace('.esboco.json', '-detalhe-tanque.esboco.json'));
    expect(d.texto).toContain('--integrar tanque moto-detalhe-tanque.esboco.json');
    const r = integrarArquivo(arq, 'tanque', d.destino);
    expect(JSON.parse(readFileSync(arq, 'utf8'))).toEqual(JSON.parse(antesTexto));
    const depois = JSON.parse(readFileSync(`${arq}.condutor.json`, 'utf8'));
    expect(depois.unidades.find((u) => u.id === 'tanque').envelopeConferido.ok).toBe(true);
    expect(semConferencia(depois)).toEqual(semConferencia(antesEstado));
    expect(r.texto).toContain('o estado do Condutor foi mantido');
    expect(r.texto).toContain('cabe');
    /* e o esboço gera o mesmo desenho */
    expect(desenharEsboco(JSON.parse(readFileSync(arq, 'utf8'))).svg).toBe(desenharEsboco(JSON.parse(antesTexto)).svg);
  }, 120000);

  it('integrar um detalhe com formas novas troca os membros da unidade, mantém o resto e reconfere o Envelope', () => {
    const { arq } = copiaDaMoto();
    const antes = JSON.parse(readFileSync(`${arq}.condutor.json`, 'utf8'));
    const d = detalharArquivo(arq, 'farol');
    const detalhe = JSON.parse(readFileSync(d.destino, 'utf8'));
    const k = detalhe.formas.findIndex((f) => f.id === 'farol');
    detalhe.formas.splice(k + 1, 0, { id: 'farolAro', tipo: 'anel', eixo: 'z', diametroExterno: 90, diametroInterno: 76, espessura: 6, centro: 'farol.centro', cor: 'cinza' });
    detalhe.parametros = { ...(detalhe.parametros ?? {}), parametroNovo: 7 };
    detalhe.contato = { ...detalhe.contato, pares: [...(detalhe.contato.pares ?? []), { a: 'farolAro', b: 'farol', tipo: 'livre', motivo: 'o aro envolve a lente do farol' }] };
    writeFileSync(d.destino, JSON.stringify(detalhe));
    const r = integrarArquivo(arq, 'farol', d.destino);
    const mestre = JSON.parse(readFileSync(arq, 'utf8'));
    expect(mestre.formas.map((f) => f.id)).toContain('farolAro');
    expect(mestre.formas.filter((f) => f.oculto).length).toBe(0);
    expect(mestre.parametros.parametroNovo).toBe(7);
    expect(mestre.parametros.entreEixos).toBe(1400);
    expect(mestre.contato.pares.map((p) => p.b)).toContain('farol');
    const depois = JSON.parse(readFileSync(`${arq}.condutor.json`, 'utf8'));
    expect(depois.atual).toBe(antes.atual);
    expect(depois.unidades.find((u) => u.id === 'farol').membros).toEqual(['farol', 'farolAro']);
    expect(depois.unidades.find((u) => u.id === 'farol').envelope).toEqual(antes.unidades.find((u) => u.id === 'farol').envelope);
    expect(depois.unidades.filter((u) => u.id !== 'farol')).toEqual(antes.unidades.filter((u) => u.id !== 'farol'));
    expect(depois.unidades.find((u) => u.id === 'farol').envelopeConferido).toMatchObject({ arquivo: 'moto-detalhe-farol.esboco.json' });
    expect(r.texto).toMatch(/envelope da unidade farol contra moto-detalhe-farol\.esboco\.json/);
    const portao = portaoDoEstagio(mestre, depois);
    expect(portao.falta.filter((f) => /mudaram desde o Plano de detalhe/.test(f))).toEqual([]);
  }, 120000);

  it('a troca que deixa uma referência sem destino é recusada e não grava nada; a junta que cita forma que saiu é removida', () => {
    const moto = fixture('moto-curvas.esboco.json');
    const estado = passar(moto, criarEstado(moto, 'm.esboco.json'), 3);
    const d = detalharUnidade(moto, estado, 'motor');
    const novo = JSON.parse(JSON.stringify(d));
    novo.formas = novo.formas.map((f) => (f.id === 'motor' ? { ...f, id: 'motorNovo' } : f));
    expect(() => integrarUnidade(moto, estado, 'motor', novo)).toThrow(/não resolve/);
    expect(() => integrarUnidade(moto, estado, 'motor', { ...d, formas: d.formas.map((f) => ({ ...f, oculto: true })) })).toThrow(/nenhuma forma visível/);
    /* uma junta que cita só a forma que saiu some, e a outra perde a peça */
    const comJunta = JSON.parse(JSON.stringify(moto));
    comJunta.contato.juntas = [{ pecas: ['farol', 'banco'], max: 5, motivo: 'o farol entra no banco neste teste' }, { pecas: ['farol', 'banco', 'tanque'], max: 5, motivo: 'o farol entra no tanque neste teste' }];
    const detalheDoFarol = detalharUnidade(comJunta, estado, 'farol');
    const trocado = { ...detalheDoFarol, formas: [...detalheDoFarol.formas.filter((f) => f.oculto === true), caixa('lente', [0, 700, 900], 60, 60, 20, { cor: 'amarelo', unidade: 'farol' })] };
    const r = integrarUnidade(comJunta, estado, 'farol', trocado);
    expect(r.removidos).toEqual({ pares: 0, juntas: 1, pecas: 2 });
    expect(r.mestre.contato.juntas).toEqual([{ pecas: ['banco', 'tanque'], max: 5, motivo: 'o farol entra no tanque neste teste' }]);
    expect(r.formas).toEqual(['lente']);
    expect(r.estado.unidades.find((u) => u.id === 'farol').membros).toEqual(['lente']);
    expect(comJunta.contato.juntas).toHaveLength(2);
  });
});

describe('arrumação da linha de comando', () => {
  it('um caminho relativo vale a partir de INIT_CWD, e o absoluto fica como está', () => {
    const antes = process.env.INIT_CWD;
    try {
      process.env.INIT_CWD = resolve('/tmp/de-quem-chamou');
      expect(resolverCaminho('a/b.esboco.json')).toBe(resolve('/tmp/de-quem-chamou', 'a/b.esboco.json'));
      expect(resolverCaminho(resolve('/x/y.json'))).toBe(resolve('/x/y.json'));
      delete process.env.INIT_CWD;
      expect(resolverCaminho('a.json')).toBe(join(process.cwd(), 'a.json'));
    } finally { if (antes === undefined) delete process.env.INIT_CWD; else process.env.INIT_CWD = antes; }
  });

  it('a linha de comando lê o arquivo relativo a INIT_CWD, e --forma sozinha descreve sem desenhar nem gravar imagem', () => {
    const dir = mkdtempSync(join(tmpdir(), 'chamador-'));
    writeFileSync(join(dir, 'f.esboco.json'), JSON.stringify(esboco([caixa('a', [0, 10, 0]), caixa('b', [0, 40, 0])])));
    const r = spawnSync('node', [cli, 'f.esboco.json', '--forma', 'a'], { cwd: fileURLToPath(new URL('../../..', import.meta.url)), env: { ...process.env, INIT_CWD: dir }, encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/\ba\b/);
    expect(r.stdout).not.toMatch(/px\/mm/);
    expect(readdirSync(dir)).toEqual(['f.esboco.json']);
    const sem = spawnSync('node', [cli, 'f.esboco.json', '--descrever'], { cwd: dir, env: { ...process.env, INIT_CWD: '' }, encoding: 'utf8' });
    expect(sem.status).toBe(0);
    expect(existsSync(join(dir, 'f.svg'))).toBe(false);
  });
});

void ErroDeEsboco;
