/* O Condutor: estágios, Portão de estágio, nível de detalhe, Plano de detalhe (unidades e ordem), agrupamento com motivo e Marcos. */
import { describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ErroDeEsboco } from '../src/index.js';
import { avancar, conferirEnvelope, criarEstado, liberar, registrarVeredito, UNIDADE_DO_OBJETO, custoDe, definirModo, ESTAGIOS_POR_NIVEL, formatarEnvelope, formatarSituacao, gravarNotaDePassagem, LIMITE_DA_FUNCAO, LIMITE_DA_NOTA_DE_PASSAGEM, marcarFeito, MODOS, MODO_PADRAO, moverForma, planoDeDetalhe, portaoDoEstagio, registrarEnvelope, replanejar, textoDoEnvelope } from '../src/condutor.js';
import { condutorArquivo } from '../../../tools/modelar/esboco.mjs';

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
    expect(r).toMatchObject({ ok: false, pedeCritico: true });
    r = avancar(rapido, registrarVeredito(r.estado, { unidade: 'objeto', nota: 9, motivo: 'sem defeito estrutural visível' }));
    expect(r.estado.atual).toBe('concluido');
    expect(avancar(rapido, r.estado)).toMatchObject({ ok: false, concluido: true });
    const medio = fila({ nivel: 'medio', medidas: [medida(), medida({ nome: 'l', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l2', valor: 80, mede: 'larguraTotal' })] });
    r = avancar(medio, estadoNaMaquete(medio));
    expect(r.estado.atual).toBe('conferencia-da-maquete');
    r = avancar(medio, registrarVeredito(r.estado, { unidade: 'objeto', nota: 8, motivo: 'só detalhe de acabamento' }));
    expect(r.estado.atual).toBe('concluido');
    expect(r.estado.unidades).toEqual([]);
    /* mudar o nível no plano muda os estágios ligados na chamada seguinte */
    const mudado = { ...medio, plano: { ...medio.plano, nivel: 'detalhado', medidas: fila().plano.medidas } };
    const depois = avancar(mudado, criarEstado(medio, 'x')).estado;
    expect(depois.estagios).toHaveLength(5);
    expect(depois.avisos[0]).toContain('o nível mudou de medio para detalhado');
  });

  it('o nível sem Detalhe por unidade só conclui com o veredito do crítico sobre o objeto inteiro, com a regra da nota', () => {
    const medio = fila({ nivel: 'medio', medidas: [medida(), medida({ nome: 'l', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l2', valor: 80, mede: 'larguraTotal' })] });
    let s = avancar(medio, estadoNaMaquete(medio)).estado;
    expect(s.atual).toBe('conferencia-da-maquete');
    expect(avancar(medio, s)).toMatchObject({ ok: false, pedeCritico: true, rodada: 1 });
    s = registrarVeredito(s, { unidade: UNIDADE_DO_OBJETO, nota: 6, motivo: 'tubo atravessa o piso sem explicação' });
    expect(avancar(medio, s)).toMatchObject({ ok: false, pedeCritico: true, rodada: 2 });
    s = registrarVeredito(s, { unidade: UNIDADE_DO_OBJETO, nota: 6, motivo: 'tubo atravessa o piso sem explicação' });
    s = registrarVeredito(s, { unidade: UNIDADE_DO_OBJETO, nota: 7, motivo: 'tubo atravessa o piso sem explicação' });
    const travado = avancar(medio, s);
    expect(travado.ok).toBe(false);
    expect(travado.bloqueio).toContain('--liberar objeto');
    const liberado = avancar(medio, liberar(s, { unidade: UNIDADE_DO_OBJETO, motivo: 'a pessoa autorizou seguir assim' }));
    expect(liberado.estado.atual).toBe('concluido');
    /* no detalhado o crítico julga unidades e Marcos, e o veredito do objeto é recusado */
    expect(() => registrarVeredito(estadoNaMaquete(fila()), { unidade: UNIDADE_DO_OBJETO, nota: 9, motivo: 'sem defeito estrutural visível' })).toThrow(ErroDeEsboco);
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
    expect(formatarSituacao(novo, portaoDoEstagio(e, novo))).not.toContain('agrupamento alterado');
    expect(formatarSituacao(novo, portaoDoEstagio(e, novo), { historico: true })).toContain('agrupamento alterado: b de b para a (a e b são a mesma peça usinada)');
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

  it('o custo é o número de formas: uma unidade grande cruza vários limiares e registra só o mais alto', () => {
    const e = { ...fila(), contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 } };
    e.opcoes[0].formas = [caixa('a', [10, 10, 0]), caixa('b', [30, 10, 0], 20, 20, 20, { daInstancia: { id: 'g', principal: true } }), caixa('c', [50, 10, 0], 20, 20, 20, { daInstancia: { id: 'g', principal: false } }), caixa('d', [70, 10, 0], 20, 20, 20, { daInstancia: { id: 'g', principal: false } })];
    let s = passar(e, estadoNaMaquete(e), 3);
    expect(s.unidades.map((u) => `${u.id}:${u.custo}`)).toEqual(['a:1', 'g:3']);
    const r = marcarFeito(e, s, 'g');
    expect(r.novosMarcos.map((m) => [m.limiar, m.saltou])).toEqual([[75, [25, 50]]]);
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
    copyFileSync(new URL('moto-curvas.esboco.json', pasta), arq);
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

/* O Envelope: a caixa e as portas de cada Unidade de detalhe, e a conferência da versão detalhada contra ele. */
describe('o Envelope de cada Unidade de detalhe', () => {
  const moto = fixture('moto-curvas.esboco.json');
  const unidade = (id) => planoDeDetalhe(moto).unidades.find((u) => u.id === id);
  /* a versão detalhada de uma unidade é um esboço à parte: as formas das outras unidades ficam ocultas, só como referência */
  const detalhe = (id, mexer = () => {}) => {
    const d = JSON.parse(JSON.stringify(moto));
    for (const f of d.formas) if (f.id !== id) f.oculto = true;
    mexer(d.formas.find((f) => f.id === id), d);
    return d;
  };

  it('cada unidade ganha a caixa que envolve as formas dela na maquete, em mm', () => {
    const p = planoDeDetalhe(moto);
    expect(p.unidades.every((u) => u.envelope !== undefined)).toBe(true);
    expect(unidade('rodaFrente').envelope.caixa).toEqual({ x: [-62.5, 62.5], y: [0, 610], z: [395, 1005] });
    expect(unidade('motor').envelope.caixa).toEqual({ x: [-130, 130], y: [230, 530], z: [-190, 190] });
    expect(unidade('tanque').envelope.caixa.z).toEqual([-140, 280]);
    /* a caixa de uma unidade com várias formas é a de todas elas: o guidão passa dos dois garfos */
    expect(unidade('garfoE+garfoD+guidao').envelope.caixa.x).toEqual([-380, 380]);
  });

  it('as portas são as âncoras da unidade que outras unidades usam, com o ponto e quem usa', () => {
    const portas = (id) => unidade(id).envelope.portas.map((q) => `${q.forma}.${q.ancora} [${q.ponto.join(' ')}] <- ${q.usadaPor.join(',')}`);
    expect(portas('motor')).toEqual(['motor.+y [0 530 0] <- quadro', 'motor.-x [-130 380 0] <- balancimE', 'motor.-z [0 380 -190] <- balancimE']);
    expect(portas('tanque')).toEqual(['tanque.-z [0 690.8 -140] <- banco']);
    expect(portas('carenagem')).toEqual(['carenagem.+z [0 710 720] <- farol', 'carenagem.nariz [0 698 720] <- farol']);
    /* a âncora que o garfo cita é a do quadro, e a que o quadro cita é a face do motor */
    expect(portas('quadro')).toContain('quadro.coluna.+y [0 830 400] <- garfoE+garfoD+guidao');
    /* quem só é usado por citação de id, sem âncora, não tem porta; quem ninguém usa também não */
    expect(portas('farol')).toEqual([]);
    expect(portas('banco')).toEqual([]);
    expect(textoDoEnvelope(unidade('tanque').envelope)).toBe('envelope: x -155..155 y 590..791,5 z -140..280; portas tanque.-z [0 690,8 -140] (usada por banco)');
  });

  it('o envelope é determinístico e segue o agrupamento quando a forma muda de unidade', () => {
    expect(JSON.stringify(planoDeDetalhe(moto).unidades)).toBe(JSON.stringify(planoDeDetalhe(moto).unidades));
    const e = fila();
    const s = passar(e, estadoNaMaquete(e), 2);
    expect(s.unidades.map((u) => u.envelope.caixa.x)).toEqual([[0, 20], [20, 40], [40, 60], [60, 80]]);
    const novo = moverForma(e, s, { forma: 'b', para: 'a', motivo });
    expect(novo.unidades[0].envelope.caixa.x).toEqual([0, 40]);
    expect(novo.unidades.map((u) => u.id)).toEqual(['a', 'c', 'd']);
  });

  it('a versão detalhada igual cabe e mantém as portas', () => {
    const r = conferirEnvelope(moto, null, 'tanque', detalhe('tanque'));
    expect(r).toMatchObject({ unidade: 'tanque', ok: true, falta: [], tolerancia_declarada: false });
    expect(r.tolerancia_mm).toBe(4.2);
    expect(r.portas).toEqual([{ forma: 'tanque', ancora: '-z', esperado: [0, 690.8, -140], medido: [0, 690.8, -140], desvio_mm: 0, ok: true }]);
    expect(formatarEnvelope(r, 'tanque.esboco.json')).toBe('envelope da unidade tanque contra tanque.esboco.json: cabe (tolerância 4,2 mm, padrão de 1% da maior dimensão)\n  caixa: x cabe; y cabe; z cabe\n  portas: tanque.-z no lugar (0 mm)\n');
  });

  it('a versão detalhada maior que o envelope não cabe, com o excesso em mm', () => {
    const r = conferirEnvelope(moto, null, 'tanque', detalhe('tanque', (t) => { t.secoes[2].tamanho = [330, 200]; }));
    expect(r.ok).toBe(false);
    expect(r.caixa.x).toMatchObject({ envelope: [-155, 155], detalhe: [-165, 165], excesso_mm: 10, ok: false });
    expect(r.caixa.y.ok).toBe(true);
    expect(r.falta).toEqual(['a versão detalhada passa 10 mm do Envelope em x (detalhe -165..165, envelope -155..155, tolerância 4,2 mm)']);
  });

  it('a tolerância declarada em plano.envelope vale, e um detalhe menor que o envelope cabe', () => {
    const maior = detalhe('tanque', (t) => { t.secoes[2].tamanho = [330, 200]; });
    const com = (tolerancia) => ({ ...moto, plano: { ...moto.plano, envelope: { tolerancia } } });
    expect(conferirEnvelope(com(12), null, 'tanque', maior)).toMatchObject({ ok: true, tolerancia_mm: 12, tolerancia_declarada: true });
    expect(conferirEnvelope(com(5), null, 'tanque', maior).ok).toBe(false);
    expect(conferirEnvelope(moto, null, 'tanque', detalhe('tanque', (t) => { t.secoes[2].tamanho = [250, 170]; })).ok).toBe(true);
  });

  it('a porta que sai do lugar ou que some da versão detalhada reprova, com o ponto esperado e o medido', () => {
    const movida = conferirEnvelope(moto, null, 'tanque', detalhe('tanque', (t) => { t.desloca = [0, 0, 30]; }));
    expect(movida.ok).toBe(false);
    expect(movida.portas[0]).toMatchObject({ forma: 'tanque', ancora: '-z', esperado: [0, 690.8, -140], medido: [0, 690.8, -110], desvio_mm: 30, ok: false });
    expect(movida.falta.some((f) => f.startsWith('a porta tanque.-z (usada por banco) saiu do lugar: [0 690,8 -110] na versão detalhada e [0 690,8 -140] na maquete, 30 mm de diferença'))).toBe(true);
    /* uma versão detalhada sem a forma da porta (aqui o tanque tem outro nome) não mantém a porta */
    const r = conferirEnvelope(moto, null, 'tanque', { opcoes: [{ titulo: 'A. Naked', formas: [caixa('tanqueDetalhado', [0, 690, 70], 300, 200, 400)] }] });
    expect(r.portas[0]).toMatchObject({ medido: null, ok: false });
    expect(r.falta.some((f) => f.includes('a porta tanque.-z (usada por banco) não existe na versão detalhada'))).toBe(true);
  });

  it('uma unidade inexistente é recusada com o "quis dizer"', () => {
    expect(() => conferirEnvelope(moto, null, 'tanqe', moto)).toThrow(/"tanqe" não é uma unidade de detalhe \(quis dizer "tanque"\?\)/);
  });

  describe('com plano.envelope declarado o Portão do Detalhe exige a conferência', () => {
    const e = () => ({ ...fila(), plano: { ...fila().plano, envelope: { tolerancia: 1 } } });
    const noDetalhe = () => passar(e(), estadoNaMaquete(e()), 3);

    it('--feito só vale depois do Envelope conferido, e o Portão lista as unidades sem conferência', () => {
      const s = noDetalhe();
      expect(s.atual).toBe('detalhe-por-unidade');
      expect(() => marcarFeito(e(), s, 'a')).toThrow(/só vira feita depois de o Envelope conferir a versão detalhada dela \(plano.envelope está declarado\): rode --envelope a <arquivo-detalhado.esboco.json>/);
      const portao = portaoDoEstagio(e(), s);
      expect(portao.envelopeDeclarado).toBe(true);
      expect(portao.falta).toContain('4 unidades sem o Envelope conferido (--envelope <unidade> <arquivo-detalhado.esboco.json>): a, b, c, d');
      const maior = JSON.parse(JSON.stringify(e()));
      maior.opcoes[0].formas = [caixa('a', [10, 10, 0], 20, 20, 24), ...['b', 'c', 'd'].map((id, k) => caixa(id, [30 + 20 * k, 10, 0], 20, 20, 20, { oculto: true }))];
      const ruim = conferirEnvelope(e(), s, 'a', maior);
      expect(ruim.ok).toBe(false);
      const falhou = registrarEnvelope(s, ruim, 'a.esboco.json');
      expect(falhou.unidades[0].envelopeConferido).toMatchObject({ ok: false, arquivo: 'a.esboco.json', tolerancia_mm: 1 });
      expect(() => marcarFeito(e(), falhou, 'a')).toThrow(/a última conferência falhou: a versão detalhada passa 2 mm do Envelope em z \(detalhe -12..12, envelope -10..10, tolerância 1 mm\)/);
      let ok = s;
      const so = (id) => ({ ...e(), opcoes: [{ titulo: 'T', formas: e().opcoes[0].formas.map((f) => (f.id === id ? f : { ...f, oculto: true })) }] });
      for (const u of s.unidades) ok = registrarEnvelope(ok, conferirEnvelope(e(), ok, u.id, so(u.id)), 'mesmo.esboco.json');
      for (const u of s.unidades) ok = marcarFeito(e(), ok, u.id).estado;
      expect(portaoDoEstagio(e(), ok).passa).toBe(true);
      expect(formatarSituacao(s, portao)).toContain('     envelope: x 0..20 y 0..20 z -10..10; sem portas [envelope a conferir]');
    });

    it('sem plano.envelope o Condutor é o de antes: nada pede a conferência e a situação não mostra o envelope', () => {
      const s = passar(fila(), estadoNaMaquete(fila()), 3);
      expect(marcarFeito(fila(), s, 'a').estado.unidades[0].feito).toBe(true);
      expect(portaoDoEstagio(fila(), s).envelopeDeclarado).toBeUndefined();
      expect(formatarSituacao(s, portaoDoEstagio(fila(), s))).not.toContain('envelope');
    });
  });

  it('pela linha de comando --envelope confere, grava o resultado no estado e sai com 1 quando não cabe', () => {
    const dir = mkdtempSync(join(tmpdir(), 'envelope-'));
    const arq = join(dir, 'moto-curvas.esboco.json');
    writeFileSync(arq, JSON.stringify({ ...moto, plano: { ...moto.plano, envelope: { tolerancia: 2 } } }));
    const bom = join(dir, 'tanque.esboco.json');
    writeFileSync(bom, JSON.stringify(detalhe('tanque')));
    const largo = join(dir, 'tanque-largo.esboco.json');
    writeFileSync(largo, JSON.stringify(detalhe('tanque', (t) => { t.secoes[2].tamanho = [330, 200]; })));
    /* sem estado a conferência é só lida, e não cria o arquivo de estado */
    let r = condutorArquivo(arq, { envelope: { unidade: 'tanque', arquivo: bom } });
    expect(r.codigo).toBe(0);
    expect(r.texto).toContain('o estado do Condutor não existe');
    expect(existsSync(`${arq}.condutor.json`)).toBe(false);
    for (let i = 0; i < 3; i++) condutorArquivo(arq, { proximo: true });
    condutorArquivo(arq, { proximo: true });
    r = condutorArquivo(arq, { envelope: { unidade: 'tanque', arquivo: largo } });
    expect(r.codigo).toBe(1);
    expect(r.texto).toContain('envelope da unidade tanque contra tanque-largo.esboco.json: não cabe (tolerância 2 mm)');
    expect(JSON.parse(readFileSync(`${arq}.condutor.json`, 'utf8')).unidades.find((u) => u.id === 'tanque').envelopeConferido).toMatchObject({ ok: false, arquivo: 'tanque-largo.esboco.json' });
    expect(() => condutorArquivo(arq, { feito: 'tanque' })).toThrow(/a última conferência falhou/);
    r = condutorArquivo(arq, { envelope: { unidade: 'tanque', arquivo: bom } });
    expect(r.codigo).toBe(0);
    expect(condutorArquivo(arq, { feito: 'tanque' }).texto).toContain('unidade tanque marcada como feita');
    expect(condutorArquivo(arq).texto).toContain('envelope: x -155..155 y 590..791,5 z -140..280; portas tanque.-z [0 690,8 -140] (usada por banco) [envelope conferido com tanque.esboco.json]');
  }, 120000);

  describe('modo de execução e nota de passagem no Condutor', () => {
    /* Cria um esboço com 9 formas na mesma unidade 'bloco' (mais que LIMITE_DA_FUNCAO = 8), com funcao declarada */
    const formasBloco = Array.from({ length: 9 }, (_, k) => caixa(`f${k + 1}`, [10 + 20 * k, 10, 0], 20, 20, 20, { unidade: 'bloco' }));
    const medidasBloco = [
      medida(),
      medida({ nome: 'largura', valor: 180, mede: 'larguraTotal' }),
      medida({ nome: 'l2', valor: 180, mede: 'larguraTotal' }),
      medida({ nome: 'l3', valor: 180, mede: 'larguraTotal' }),
      medida({ nome: 'l4', valor: 180, mede: 'larguraTotal' }),
    ];
    const esbocoComBloco = () => ({
      ...fila({ medidas: medidasBloco, contrato: { tocam: [['f1', 'f2']] } }, { opcoes: [{ titulo: 'T', formas: formasBloco }] }),
      unidades: { bloco: { funcao: 'conjunto de nove caixas para teste de brief' } },
    });

    it('permite escolher o modo objeto ou por-unidade e recusa modo inválido', () => {
      const e = fila();
      const s0 = estadoNaMaquete(e);
      expect(s0.modo).toBe('objeto');
      const s1 = definirModo(s0, 'por-unidade');
      expect(s1.modo).toBe('por-unidade');
      expect(s1.versao).toBe(4);
      const s2 = definirModo(s1, 'objeto');
      expect(s2.modo).toBe('objeto');
      expect(s2.versao).toBe(4);
      expect(() => definirModo(s0, 'invalido')).toThrow(/--modo precisa ser/);
    });

    it('grava a nota de passagem de uma unidade de detalhe existente e eleva versão para 4', () => {
      const e = fila();
      const s = passar(e, estadoNaMaquete(e), 3);
      const s2 = gravarNotaDePassagem(s, { unidade: 'a', texto: 'escolha do ponto de fixação da unidade a' });
      expect(s2.notasDePassagem).toEqual({ a: 'escolha do ponto de fixação da unidade a' });
      expect(s2.versao).toBe(4);
    });

    it('recusa texto vazio ou com apenas espaços em branco', () => {
      const e = fila();
      const s = passar(e, estadoNaMaquete(e), 3);
      expect(() => gravarNotaDePassagem(s, { unidade: 'a', texto: '' })).toThrow(/--texto não vazio/);
      expect(() => gravarNotaDePassagem(s, { unidade: 'a', texto: '   ' })).toThrow(/--texto não vazio/);
      expect(() => gravarNotaDePassagem(s, { unidade: 'a' })).toThrow(/--texto não vazio/);
    });

    it('recusa nota de passagem com mais de 240 caracteres e aceita com até 240', () => {
      const e = fila();
      const s = passar(e, estadoNaMaquete(e), 3);
      const longo = 'a'.repeat(LIMITE_DA_NOTA_DE_PASSAGEM + 1);
      expect(() => gravarNotaDePassagem(s, { unidade: 'a', texto: longo })).toThrow(/não pode passar de 240/);
      const noLimite = 'b'.repeat(LIMITE_DA_NOTA_DE_PASSAGEM);
      const s2 = gravarNotaDePassagem(s, { unidade: 'a', texto: noLimite });
      expect(s2.notasDePassagem.a).toBe(noLimite);
    });

    it('recusa unidade que não existe no esboço / plano de detalhe', () => {
      const e = fila();
      const s = passar(e, estadoNaMaquete(e), 3);
      expect(() => gravarNotaDePassagem(s, { unidade: 'fantasma', texto: 'alguma nota' })).toThrow(/não é uma unidade de detalhe/);
    });

    it('no modo por-unidade, unidade com brief (> 8 formas) recusa --feito sem nota de passagem', () => {
      const e = esbocoComBloco();
      const s = definirModo(passar(e, estadoNaMaquete(e), 3), 'por-unidade');
      expect(() => marcarFeito(e, s, 'bloco')).toThrow(/só vira feita depois de gravar a nota de passagem/);
    });

    it('no modo por-unidade, unidade com brief é aceita após gravar a nota de passagem', () => {
      const e = esbocoComBloco();
      let s = definirModo(passar(e, estadoNaMaquete(e), 3), 'por-unidade');
      s = gravarNotaDePassagem(s, { unidade: 'bloco', texto: 'estruturas alinhadas em x' });
      const r = marcarFeito(e, s, 'bloco');
      expect(r.estado.unidades.find((u) => u.id === 'bloco').feito).toBe(true);
    });

    it('no modo por-unidade, unidade sem brief (<= 8 formas) não exige nota de passagem', () => {
      const e = fila();
      const s = definirModo(passar(e, estadoNaMaquete(e), 3), 'por-unidade');
      const r = marcarFeito(e, s, 'a');
      expect(r.estado.unidades.find((u) => u.id === 'a').feito).toBe(true);
    });

    it('no modo objeto (padrão), unidade com brief é aceita sem exigir nota de passagem', () => {
      const e = esbocoComBloco();
      const s = passar(e, estadoNaMaquete(e), 3);
      expect(s.modo).toBe('objeto');
      const r = marcarFeito(e, s, 'bloco');
      expect(r.estado.unidades.find((u) => u.id === 'bloco').feito).toBe(true);
    });

    it('migra versão do estado antigo preservando compatibilidade', () => {
      const estadoLegado = {
        versao: 1,
        esboco: 'legado.esboco.json',
        nivel: 'detalhado',
        estagios: ['detalhe-por-unidade'],
        atual: 'detalhe-por-unidade',
        historico: [],
        unidades: [{ id: 'u1', membros: ['f1'], formas: 1, custo: 1, depende: [], feito: false }],
        alteracoes: [],
        marcos: [],
        avisos: [],
      };
      const sModo = definirModo(estadoLegado, 'por-unidade');
      expect(sModo.versao).toBe(4);
      expect(sModo.modo).toBe('por-unidade');

      const sNota = gravarNotaDePassagem(estadoLegado, { unidade: 'u1', texto: 'nota migrada' });
      expect(sNota.versao).toBe(4);
      expect(sNota.notasDePassagem).toEqual({ u1: 'nota migrada' });

      /* marcarFeito no estado legado sem modo funciona no modo objeto */
      const e = fila({}, { opcoes: [{ titulo: 'T', formas: [caixa('f1', [0, 0, 0], 20, 20, 20, { unidade: 'u1' })] }] });
      const r = marcarFeito(e, estadoLegado, 'u1');
      expect(r.estado.unidades[0].feito).toBe(true);
    });

    it('--historico exibe as notas de passagem gravadas e a situação exibe o modo', () => {
      const e = fila();
      let s = passar(e, estadoNaMaquete(e), 3);
      s = definirModo(s, 'por-unidade');
      s = gravarNotaDePassagem(s, { unidade: 'a', texto: 'escolha de fixacao em trilho' });
      const portao = portaoDoEstagio(e, s);
      const semHist = formatarSituacao(s, portao);
      expect(semHist).toContain('modo por-unidade');
      expect(semHist).not.toContain('nota de passagem de a');

      const comHist = formatarSituacao(s, portao, { historico: true });
      expect(comHist).toContain('modo por-unidade');
      expect(comHist).toContain('nota de passagem de a: escolha de fixacao em trilho');
    });

    it('linha de comando: --modo, --nota-de-passagem e --historico via condutorArquivo', () => {
      const dir = mkdtempSync(join(tmpdir(), 'condutor-modo-'));
      const arq = join(dir, 'bloco.esboco.json');
      const e = esbocoComBloco();
      writeFileSync(arq, JSON.stringify(e));

      /* cria o estado e avança até detalhe-por-unidade */
      for (let i = 0; i < 4; i++) condutorArquivo(arq, { proximo: true });

      /* altera modo */
      let r = condutorArquivo(arq, { modo: 'por-unidade' });
      expect(r.texto).toContain('modo do Condutor alterado para "por-unidade"');
      expect(r.texto).toContain('modo por-unidade');

      /* recusa --feito da unidade bloco (9 formas) antes de ter nota */
      expect(() => condutorArquivo(arq, { feito: 'bloco' })).toThrow(/só vira feita depois de gravar a nota de passagem/);

      /* grava nota de passagem */
      r = condutorArquivo(arq, { notaDePassagem: 'bloco', texto: 'justificativa das escolhas do bloco' });
      expect(r.texto).toContain('nota de passagem registrada para a unidade bloco');

      /* agora --feito passa */
      r = condutorArquivo(arq, { feito: 'bloco' });
      expect(r.texto).toContain('unidade bloco marcada como feita');

      /* --historico exibe a nota de passagem */
      r = condutorArquivo(arq, { historico: true });
      expect(r.texto).toContain('nota de passagem de bloco: justificativa das escolhas do bloco');
    });
  });
});
