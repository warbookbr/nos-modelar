/* O Condutor: estágios, Portão de estágio, nível de detalhe, Plano de detalhe (unidades e ordem), agrupamento com motivo e Marcos. */
import { describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ErroDeEsboco } from '../src/index.js';
import { avancar, criarEstado, custoDe, ESTAGIOS_POR_NIVEL, formatarSituacao, marcarFeito, moverForma, planoDeDetalhe, portaoDoEstagio, replanejar } from '../src/condutor.js';
import { condutorArquivo } from '../../../tools/mecanifica/esboco.mjs';

const pasta = new URL('./fixtures/', import.meta.url);
const fixture = (nome) => JSON.parse(readFileSync(new URL(nome, pasta), 'utf8'));
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const medida = (extra) => ({ nome: 'altura', valor: 20, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede: 'alturaTotal', ...extra });
const motivo = 'as peças se cruzam de propósito neste teste';
/* Quatro caixas em fila, todas encostadas, cada uma posicionada sobre a anterior: quatro unidades, uma dependendo da outra. */
const fila = (plano = {}, extra = {}) => ({
  contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 },
  plano: { nivel: 'detalhado', medidas: [medida(), medida({ nome: 'largura', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l2', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l3', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l4', valor: 80, mede: 'larguraTotal' })], contrato: { tocam: [['a', 'b']] }, ...plano },
  opcoes: [{ titulo: 'T', formas: [caixa('a', [10, 10, 0]), caixa('b', [30, 10, 0]), caixa('c', [50, 10, 0]), caixa('d', [70, 10, 0])] }],
  ...extra,
});
const estadoNaMaquete = (e) => criarEstado(e, 'x.esboco.json');
const passar = (e, estado, n) => { let s = estado; for (let i = 0; i < n; i++) { const r = avancar(e, s); expect(r.ok).toBe(true); s = r.estado; } return s; };

describe('estágios e Portão', () => {
  it('cria o estado no primeiro estágio, com o nível do plano e os estágios que ele liga', () => {
    const s = estadoNaMaquete(fila());
    expect(s).toMatchObject({ versao: 1, nivel: 'detalhado', nivelDoPlano: true, atual: 'maquete', estagios: ['maquete', 'conferencia-da-maquete', 'plano-de-detalhe', 'detalhe-por-unidade', 'montagem'] });
    expect(estadoNaMaquete({ opcoes: [] }).nivel).toBe('medio');
    expect(ESTAGIOS_POR_NIVEL.esquematico).toEqual(['maquete']);
    expect(ESTAGIOS_POR_NIVEL.medio).toEqual(['maquete', 'conferencia-da-maquete']);
  });

  it('pular estágio é recusado: sem o Portão o estado não muda e a mensagem diz o que falta', () => {
    const solta = fila({}, { opcoes: [{ titulo: 'T', formas: [caixa('a', [10, 10, 0]), caixa('b', [30, 10, 0]), caixa('c', [50, 10, 0]), caixa('d', [70, 10, 0]), caixa('longe', [500, 10, 0])] }] });
    const s = estadoNaMaquete(solta);
    const r = avancar(solta, s);
    expect(r.ok).toBe(false);
    expect(r.estado.atual).toBe('maquete');
    expect(r.estado.historico).toEqual([]);
    expect(r.portao.falta).toHaveLength(5);
    expect(r.portao.falta[0]).toMatch(/^\[1\] solto: longe fora do grupo conectado/);
    expect(r.portao.falta[1]).toMatch(/medida "largura" fora da tolerância/);
    expect(formatarSituacao(r.estado, r.portao)).toContain('Portão de Maquete: não passa, falta:');
    /* um estágio adiante só se chega passando por cada Portão, um por vez */
    const bom = fila();
    const um = avancar(bom, estadoNaMaquete(bom));
    expect(um.ok).toBe(true);
    expect(um.estado.atual).toBe('conferencia-da-maquete');
  });

  it('o Portão pede o gate ligado, as medidas e o contrato que o nível exige', () => {
    const semGate = fila(); delete semGate.contato;
    expect(portaoDoEstagio(semGate, estadoNaMaquete(semGate)).falta[0]).toMatch(/o gate de contato não está ligado na opção "T" \(contato\.usar: true; a política liga a partir de 4 formas\)/);
    const poucas = fila({ medidas: [medida()], contrato: undefined });
    const f = portaoDoEstagio(poucas, estadoNaMaquete(poucas)).falta;
    expect(f).toContain('o plano declara 1 medida nomeada e o nível detalhado pede pelo menos 5 (plano.medidas: nome, valor, unidade, origem e mede)');
    expect(f).toContain('o nível detalhado pede o contrato de relações declarado (plano.contrato: tocam, livres, simetricas) e ele está vazio');
    /* o esquemático pede uma medida e nada de contrato */
    const rapido = fila({ nivel: 'esquematico', medidas: [medida()], contrato: undefined });
    expect(portaoDoEstagio(rapido, estadoNaMaquete(rapido))).toMatchObject({ passa: true, falta: [] });
  });

  it('o nível de detalhe liga e desliga estágios: o esquemático termina na Maquete e o médio na Conferência', () => {
    const rapido = fila({ nivel: 'esquematico', medidas: [medida()], contrato: undefined });
    let r = avancar(rapido, estadoNaMaquete(rapido));
    expect(r.estado.atual).toBe('concluido');
    expect(avancar(rapido, r.estado)).toMatchObject({ ok: false, concluido: true });
    const medio = fila({ nivel: 'medio', medidas: [medida(), medida({ nome: 'l', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l2', valor: 80, mede: 'larguraTotal' })] });
    r = avancar(medio, estadoNaMaquete(medio));
    expect(r.estado.atual).toBe('conferencia-da-maquete');
    r = avancar(medio, r.estado);
    expect(r.estado.atual).toBe('concluido');
    expect(r.estado.unidades).toEqual([]);
    /* mudar o nível no plano muda os estágios ligados na chamada seguinte */
    const mudado = { ...medio, plano: { ...medio.plano, nivel: 'detalhado', medidas: fila().plano.medidas } };
    const depois = avancar(mudado, criarEstado(medio, 'x')).estado;
    expect(depois.estagios).toHaveLength(5);
    expect(depois.avisos[0]).toContain('o nível mudou de medio para detalhado');
  });

  it('percorre os cinco estágios do nível detalhado e termina concluído', () => {
    const e = fila();
    let s = passar(e, estadoNaMaquete(e), 2);
    expect(s.atual).toBe('plano-de-detalhe');
    s = passar(e, s, 1);
    expect(s.atual).toBe('detalhe-por-unidade');
    expect(avancar(e, s).ok).toBe(false);
    for (const u of s.unidades) s = marcarFeito(e, s, u.id).estado;
    s = passar(e, s, 2);
    expect(s.atual).toBe('concluido');
    expect(s.historico.map((h) => `${h.de}>${h.para}`)).toEqual(['maquete>conferencia-da-maquete', 'conferencia-da-maquete>plano-de-detalhe', 'plano-de-detalhe>detalhe-por-unidade', 'detalhe-por-unidade>montagem', 'montagem>concluido']);
  });

  it('o estado é determinístico: o mesmo esboço e os mesmos passos dão o mesmo JSON', () => {
    const a = passar(fila(), estadoNaMaquete(fila()), 3);
    const b = passar(fila(), estadoNaMaquete(fila()), 3);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toMatch(/20\d\d-\d\d-\d\d/);
  });
});

describe('Plano de detalhe', () => {
  it('agrupa o componente numa unidade, une as formas de acoplamento apertado e ordena por dependência', () => {
    const p = planoDeDetalhe(fixture('moto-curvas.esboco.json'));
    const ids = p.unidades.map((u) => u.id);
    expect(ids).toEqual(['rodaTras', 'rodaFrente', 'motor', 'quadro', 'tanque', 'banco', 'balancimE', 'balancimD', 'garfoE+garfoD+guidao', 'carenagem', 'farol']);
    const de = (id) => p.unidades.find((u) => u.id === id);
    expect(de('rodaTras').membros).toEqual(['rodaTras.pneu', 'rodaTras.disco', 'rodaTras.cuboE', 'rodaTras.cuboD']);
    /* o guidão atravessa a coroa dos dois garfos: as três peças são uma unidade */
    expect(de('garfoE+garfoD+guidao').membros).toHaveLength(7);
    expect(de('banco').depende).toEqual(['rodaTras', 'tanque']);
    expect(p.unidades.reduce((s, u) => s + u.custo, 0)).toBe(24);
    /* toda dependência vem antes de quem depende dela */
    p.unidades.forEach((u, i) => u.depende.forEach((d) => expect(ids.indexOf(d)).toBeLessThan(i)));
  });

  it('as formas de uma junta atravessa entram na mesma unidade, e um ciclo de dependência vai para os avisos', () => {
    const j = { contato: { usar: true, juntas: [{ pecas: ['x', 'y'], max: 30, motivo }] }, opcoes: [{ titulo: 'T', formas: [caixa('x', [0, 0, 0]), caixa('y', [10, 0, 0]), caixa('z', [0, 0, 0], 20, 20, 20, { sobre: 'y' })] }] };
    expect(planoDeDetalhe(j).unidades.map((u) => `${u.id}:${u.membros}`)).toEqual(['x+y:x,y', 'z:z']);
    const ciclo = { opcoes: [{ titulo: 'T', formas: [caixa('p', [0, 0, 0], 20, 20, 20, { alinha: { com: 'q.centro', eixos: ['x'] } }), caixa('q', [0, 0, 0], 20, 20, 20, { centro: 'p.centro' })] }] };
    expect(() => planoDeDetalhe(ciclo)).not.toThrow();
  });

  it('mudar o agrupamento exige motivo de pelo menos 15 caracteres, só no Plano de detalhe, e fica registrado', () => {
    const e = fila();
    const s = passar(e, estadoNaMaquete(e), 2);
    expect(s.atual).toBe('plano-de-detalhe');
    expect(s.unidades.map((u) => u.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(() => moverForma(e, s, { forma: 'b', para: 'a' })).toThrow(/mudar o agrupamento exige "motivo" de pelo menos 15 caracteres \(falta o campo\)/);
    expect(() => moverForma(e, s, { forma: 'b', para: 'a', motivo: 'curto demais' })).toThrow(/pelo menos 15 caracteres \(veio 12\)/);
    expect(() => moverForma(e, s, { forma: 'zz', para: 'a', motivo })).toThrow(/"zz" não é uma forma de nenhuma unidade/);
    expect(() => moverForma(e, s, { forma: 'b', para: 'b', motivo })).toThrow(/já está na unidade "b"/);
    const novo = moverForma(e, s, { forma: 'b', para: 'a', motivo: 'a e b são a mesma peça usinada' });
    expect(novo.unidades.map((u) => `${u.id}:${u.membros}`)).toEqual(['a:a,b', 'c:c', 'd:d']);
    expect(novo.alteracoes).toEqual([{ forma: 'b', de: 'b', para: 'a', motivo: 'a e b são a mesma peça usinada' }]);
    expect(formatarSituacao(novo, portaoDoEstagio(e, novo))).toContain('agrupamento alterado: b de b para a (a e b são a mesma peça usinada)');
    /* uma unidade nova leva o nome dado */
    expect(moverForma(e, s, { forma: 'd', para: 'ultima', motivo }).unidades.map((u) => u.id)).toEqual(['a', 'b', 'c', 'ultima']);
    /* fora do estágio */
    expect(() => moverForma(e, estadoNaMaquete(e), { forma: 'b', para: 'a', motivo })).toThrow(/só muda no estágio Plano de detalhe \(o estágio atual é Maquete\)/);
    expect(() => moverForma(e, passar(e, s, 1), { forma: 'b', para: 'a', motivo })).toThrow(/só muda no estágio Plano de detalhe/);
  });

  it('se as formas mudam depois do plano o Portão pede refazer o agrupamento, com motivo', () => {
    const e = fila();
    const s = passar(e, estadoNaMaquete(e), 2);
    const mudado = { ...e, opcoes: [{ titulo: 'T', formas: [...e.opcoes[0].formas, caixa('e', [90, 10, 0])] }], plano: { ...e.plano, medidas: e.plano.medidas.map((m) => (m.nome === 'largura' ? { ...m, valor: 100 } : m)).map((m) => (['l2', 'l3', 'l4'].includes(m.nome) ? { ...m, valor: 100 } : m)) } };
    const p = portaoDoEstagio(mudado, s);
    expect(p.passa).toBe(false);
    expect(p.falta.join('\n')).toContain('as formas mudaram desde o Plano de detalhe (sem unidade: e)');
    expect(() => replanejar(mudado, s, { motivo: 'curto' })).toThrow(/pelo menos 15 caracteres/);
    const refeito = replanejar(mudado, s, { motivo: 'entrou a peça e no fim da fila' });
    expect(refeito.unidades.map((u) => u.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(portaoDoEstagio(mudado, refeito).passa).toBe(true);
  });
});

describe('Marco a cada 25% do custo estimado', () => {
  it('registra "chamar crítico" no estado quando o custo feito cruza 25, 50, 75 e 100%, sem despachar nada', () => {
    const e = fila();
    let s = passar(e, estadoNaMaquete(e), 3);
    expect(s.atual).toBe('detalhe-por-unidade');
    expect(custoDe(s)).toEqual({ total: 4, feito: 0, percentual: 0 });
    const marcos = [];
    for (const id of ['a', 'b', 'c', 'd']) {
      const r = marcarFeito(e, s, id);
      s = r.estado;
      marcos.push(r.novosMarcos.map((m) => m.limiar));
    }
    expect(marcos).toEqual([[25], [50], [75], [100]]);
    expect(s.marcos.map((m) => [m.limiar, m.custoFeito, m.custoTotal, m.chamar, m.imagens])).toEqual([[25, 1, 4, 'critico', 'limpas'], [50, 2, 4, 'critico', 'limpas'], [75, 3, 4, 'critico', 'limpas'], [100, 4, 4, 'critico', 'limpas']]);
    expect(s.marcos[1].unidades).toEqual(['a', 'b']);
    /* marcar de novo não repete o marco */
    expect(marcarFeito(e, s, 'a').novosMarcos).toEqual([]);
  });

  it('o custo é o número de formas: uma unidade grande cruza vários marcos de uma vez', () => {
    const e = { ...fila(), contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 } };
    e.opcoes[0].formas = [caixa('a', [10, 10, 0]), caixa('b', [30, 10, 0], 20, 20, 20, { daInstancia: { id: 'g', principal: true } }), caixa('c', [50, 10, 0], 20, 20, 20, { daInstancia: { id: 'g', principal: false } }), caixa('d', [70, 10, 0], 20, 20, 20, { daInstancia: { id: 'g', principal: false } })];
    let s = passar(e, estadoNaMaquete(e), 3);
    expect(s.unidades.map((u) => `${u.id}:${u.custo}`)).toEqual(['a:1', 'g:3']);
    const r = marcarFeito(e, s, 'g');
    expect(r.novosMarcos.map((m) => m.limiar)).toEqual([25, 50, 75]);
    s = r.estado;
    expect(marcarFeito(e, s, 'a').novosMarcos.map((m) => m.limiar)).toEqual([100]);
  });

  it('--feito só vale no estágio Detalhe por unidade e a unidade tem de existir', () => {
    const e = fila();
    expect(() => marcarFeito(e, estadoNaMaquete(e), 'a')).toThrow(/--feito vale no estágio Detalhe por unidade/);
    const s = passar(e, estadoNaMaquete(e), 3);
    expect(() => marcarFeito(e, s, 'zz')).toThrow(ErroDeEsboco);
    expect(() => marcarFeito(e, s, 'A')).toThrow(/não é uma unidade de detalhe \(quis dizer "a"\?\) \(unidades: a, b, c, d\)/);
  });
});

describe('o Condutor na linha de comando, na moto de formas curvas', () => {
  it('roda o fluxo de ponta a ponta, grava o estado ao lado do arquivo e recusa pular estágio', () => {
    const dir = mkdtempSync(join(tmpdir(), 'condutor-'));
    const arq = join(dir, 'moto-curvas.esboco.json');
    copyFileSync(new URL('moto-curvas.esboco.json', pasta).pathname, arq);
    const memoria = `${arq}.condutor.json`;
    let r = condutorArquivo(arq);
    expect(existsSync(memoria)).toBe(true);
    expect(r.texto).toContain('estado criado em');
    expect(r.texto).toContain('Portão de Maquete: passa (--proximo avança)');
    expect(JSON.parse(readFileSync(memoria, 'utf8')).atual).toBe('maquete');
    r = condutorArquivo(arq, { proximo: true });
    expect(r.texto).toContain('avançou de Maquete para Conferência da maquete');
    r = condutorArquivo(arq, { proximo: true });
    r = condutorArquivo(arq, { proximo: true });
    expect(r.texto).toContain('unidades de detalhe (11, custo estimado 24 formas, feito 0, 0%)');
    r = condutorArquivo(arq, { proximo: true });
    expect(JSON.parse(readFileSync(memoria, 'utf8')).atual).toBe('detalhe-por-unidade');
    /* pular o Detalhe por unidade: recusado, com o que falta, e o estado fica onde estava */
    r = condutorArquivo(arq, { proximo: true });
    expect(r.codigo).toBe(1);
    expect(r.texto).toContain('avanço recusado: o Portão de Detalhe por unidade não passa; falta:');
    expect(r.texto).toContain('11 unidades de detalhe sem marcar como feita (--feito <unidade>)');
    expect(JSON.parse(readFileSync(memoria, 'utf8')).atual).toBe('detalhe-por-unidade');
    const estado = JSON.parse(readFileSync(memoria, 'utf8'));
    for (const u of estado.unidades) r = condutorArquivo(arq, { feito: u.id });
    expect(r.texto).toContain('marco de 100%: chamar o crítico visual sem contexto');
    expect(JSON.parse(readFileSync(memoria, 'utf8')).marcos.map((m) => m.limiar)).toEqual([25, 50, 75, 100]);
    r = condutorArquivo(arq, { proximo: true });
    r = condutorArquivo(arq, { proximo: true });
    expect(r.texto).toContain('o fluxo terminou');
    expect(condutorArquivo(arq, { proximo: true }).texto).toContain('o fluxo já terminou');
  }, 120000);

  it('mudar o agrupamento pela linha de comando exige o motivo', () => {
    const dir = mkdtempSync(join(tmpdir(), 'condutor-'));
    const arq = join(dir, 'f.esboco.json');
    writeFileSync(arq, JSON.stringify(fila()));
    for (let i = 0; i < 2; i++) condutorArquivo(arq, { proximo: true });
    expect(() => condutorArquivo(arq, { mover: 'b', para: 'a', motivo: 'curto' })).toThrow(/pelo menos 15 caracteres/);
    const r = condutorArquivo(arq, { mover: 'b', para: 'a', motivo: 'a e b são a mesma peça usinada' });
    expect(r.texto).toContain('b foi para a unidade a');
    expect(JSON.parse(readFileSync(`${arq}.condutor.json`, 'utf8')).alteracoes[0].motivo).toBe('a e b são a mesma peça usinada');
  });
});
