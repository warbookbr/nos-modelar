/* A integração do detalhe com o mestre e o Envelope (plano "O que o avião pede", fatia 5, onda 1), cada atrito do esboço do
   avião em reprodução mínima: o parâmetro que o detalhe reescreve (13, 19), a `funcao` da unidade (36), a junta que o detalhe
   apagou (37), o `tocam` do plano (41), o Envelope refeito de uma unidade só (14, 16, 27), a forma girada (22) e a divisão
   interna que contraria a referência (32). */
import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErroDeEsboco } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { conferirPlano, visiveisDoEsboco } from '../src/plano.js';
import { detalharUnidade, integrarUnidade } from '../src/detalhe.js';
import { editarEsboco } from '../src/editar.js';
import { conferirEnvelope, criarEstado, formatarSituacao, planoDeDetalhe, refazerEnvelope } from '../src/condutor.js';
import { condutorArquivo, detalharArquivo, editarArquivo, integrarArquivo } from '../../../tools/mecanifica/esboco.mjs';

const pasta = new URL('./fixtures/', import.meta.url);
const clone = (v) => JSON.parse(JSON.stringify(v));
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const motivo = 'a maquete estava errada neste teste e o detalhe vale';

/* um pé de três unidades: o chão (largura por `larguraChao`, que sai de `comum`), a perna com a sapata (`pe`) e o corpo. A perna
   usa `altPe`, `larguraPe` e `orfao`, só dela, e `sobra` não é usado por ninguém. */
const mestre = () => ({
  parametros: { altPe: 100, larguraPe: 40, comum: 50, larguraChao: '=comum*8', orfao: 40, sobra: 7 },
  unidades: { pe: { funcao: 'a perna do pé' }, corpo: { funcao: 'o corpo sobre o pé' } },
  plano: {
    nivel: 'detalhado',
    envelope: { tolerancia: 30 },
    contrato: { tocam: [['perna', 'chao'], ['corpo', 'perna']], livres: [] },
  },
  contato: {
    usar: true,
    tolerancia: 5,
    penetracao: 5,
    folga: 400,
    juntas: [
      { pecas: ['perna', 'chao'], max: 40, motivo: 'a perna entra no chão neste teste' },
      { pecas: ['corpo', 'chao'], max: 30, motivo: 'o corpo entra no chão neste teste' },
    ],
  },
  opcoes: [{
    titulo: 'T',
    formas: [
      caixa('chao', [0, -10, 0], 'larguraChao', 20, 400, { unidade: 'chao' }),
      caixa('perna', [0, '=altPe/2', 0], 'larguraPe', 'altPe', 'orfao', { unidade: 'pe' }),
      caixa('corpo', [0, 150, 0], 200, 100, 200, { unidade: 'corpo' }),
    ],
  }],
});
/* o detalhe da unidade `pe`: o isolado do mestre, com `edita(d)` aplicada */
const detalheDoPe = (m = mestre(), edita = () => {}) => {
  const d = detalharUnidade(m, null, 'pe');
  edita(d);
  return d;
};
const emFormas = (d, f) => { d.opcoes[0].formas ? f(d.opcoes[0].formas) : f(d.formas); };
const formaDe = (d, id) => (d.opcoes?.[0]?.formas ?? d.formas).find((f) => f.id === id);
const idsDe = (e) => expandirEsboco(e).opcoes[0].formas.map((f) => f.id);

describe('atritos 13 e 19: o parâmetro que o detalhe reescreve', () => {
  it('o parâmetro que só a unidade usa vale o do detalhe no mestre, sem recusa, e a saída diz o que mudou', () => {
    const d = detalheDoPe(mestre(), (x) => { x.parametros.altPe = 110; });
    const r = integrarUnidade(mestre(), null, 'pe', d);
    expect(r.mestre.parametros.altPe).toBe(110);
    expect(r.parametros.alterados).toEqual([{ nome: 'altPe', de: 100, para: 110 }]);
    expect(r.parametros.novos).toEqual([]);
  });

  it('o parâmetro novo do detalhe entra, e o do mestre que o detalhe só copiou fica como está', () => {
    const d = detalheDoPe(mestre(), (x) => { x.parametros.espessuraNova = 12; });
    const r = integrarUnidade(mestre(), null, 'pe', d);
    expect(r.parametros.novos).toEqual(['espessuraNova']);
    expect(r.mestre.parametros.espessuraNova).toBe(12);
    expect(r.parametros.alterados).toEqual([]);
  });

  it('o parâmetro que outra unidade usa, direto ou por outro parâmetro, recusa a mudança e diz o caminho', () => {
    const d = detalheDoPe(mestre(), (x) => { x.parametros.comum = 60; });
    expect(() => integrarUnidade(mestre(), null, 'pe', d)).toThrow(ErroDeEsboco);
    let erro;
    try { integrarUnidade(mestre(), null, 'pe', d); } catch (e) { erro = e.message; }
    expect(erro).toMatch(/o parâmetro "comum" \(mestre 50, detalhado 60\) também é usado por chao/);
    expect(erro).toMatch(/--editar <mestre> parametros\.comum=60/);
    expect(erro).toMatch(/dê outro nome no detalhado/);
    /* editado o mestre para o mesmo valor, a integração passa */
    const editado = editarEsboco(mestre(), { atribuicoes: ['parametros.comum=60'] }).esboco;
    const r = integrarUnidade(editado, null, 'pe', detalheDoPe(editado, (x) => { x.parametros.altPe = 105; }));
    expect(r.mestre.parametros.comum).toBe(60);
    expect(r.mestre.parametros.altPe).toBe(105);
  });

  it('o parâmetro que só a unidade usava e o detalhe deixou de usar sai do mestre; o que já estava sem uso fica e é acusado', () => {
    const d = detalheDoPe(mestre(), (x) => { formaDe(x, 'perna').profundidade = 40; });
    const r = integrarUnidade(mestre(), null, 'pe', d);
    expect(r.parametros.retirados).toEqual([{ nome: 'orfao', valor: 40 }]);
    expect(r.mestre.parametros).not.toHaveProperty('orfao');
    expect(r.mestre.parametros).toHaveProperty('sobra');
    expect(r.parametros.semUso).toEqual(['sobra']);
    /* o que outra unidade usa não sai, mesmo sem a unidade trocada o usar */
    expect(r.mestre.parametros.comum).toBe(50);
    expect(r.mestre.parametros.larguraChao).toBe('=comum*8');
    expect(() => expandirEsboco(r.mestre)).not.toThrow();
  });

  it('o parâmetro de uma expressão que sobrevive não é tido por órfão', () => {
    const m = mestre();
    m.parametros.metade = '=altPe/2';
    m.parametros.base = '=metade+1';
    formaDe(m, 'corpo').centro = [0, '=base+149', 0];
    const d = detalheDoPe(m, (x) => { formaDe(x, 'perna').altura = 100; });
    const r = integrarUnidade(m, null, 'pe', d);
    /* `altPe` deixou de ser usado pela perna, mas o corpo o usa por `base` e `metade` */
    expect(r.parametros.retirados.map((p) => p.nome)).toEqual([]);
    expect(r.mestre.parametros.altPe).toBe(100);
  });

  it('o ponto nomeado segue a mesma regra: o da unidade vale o do detalhe, o de outra unidade recusa', () => {
    const m = mestre();
    m.pontos = { cantoPe: [0, 0, 0], cantoChao: [100, 0, 0] };
    formaDe(m, 'chao').centro = 'cantoChao';
    formaDe(m, 'perna').centro = ['=0', '=altPe/2', 0];
    formaDe(m, 'perna').desloca = [0, 0, 0];
    const d = detalheDoPe(m, (x) => { x.pontos.cantoPe = [0, 5, 0]; });
    const ok = integrarUnidade(m, null, 'pe', d);
    expect(ok.pontos.alterados).toEqual([{ nome: 'cantoPe', de: [0, 0, 0], para: [0, 5, 0] }]);
    expect(ok.mestre.pontos.cantoPe).toEqual([0, 5, 0]);
    const mexe = detalheDoPe(m, (x) => { x.pontos.cantoChao = [90, 0, 0]; });
    expect(() => integrarUnidade(m, null, 'pe', mexe)).toThrow(/o ponto "cantoChao".*também é usado por chao/s);
  });

  it('pela linha de comando: o parâmetro se ajusta no próprio detalhe com --editar e o --integrar o leva ao mestre', () => {
    const dir = mkdtempSync(join(tmpdir(), 'integracao-'));
    const arq = join(dir, 'pe.esboco.json');
    writeFileSync(arq, `${JSON.stringify(mestre(), null, 2)}\n`);
    const d = detalharArquivo(arq, 'pe');
    editarArquivo(d.destino, { atribuicoes: ['parametros.altPe=115'] });
    const r = integrarArquivo(arq, 'pe', d.destino);
    expect(JSON.parse(readFileSync(arq, 'utf8')).parametros.altPe).toBe(115);
    expect(r.texto).toMatch(/parâmetros que o detalhado reescreveu e valem agora no mestre: altPe 100 -> 115/);
    expect(r.texto).toMatch(/parâmetros sem uso no mestre.*sobra/);
  });
});

describe('atrito 36: a `funcao` da unidade', () => {
  it('a funcao que o detalhe reescreve passa ao mestre, e a das outras unidades, que o detalhe só copiou, não', () => {
    const d = detalheDoPe(mestre(), (x) => { x.unidades.pe.funcao = 'a perna com sapata e mancal'; x.unidades.corpo.funcao = 'texto que não vale'; });
    const r = integrarUnidade(mestre(), null, 'pe', d);
    expect(r.mestre.unidades.pe.funcao).toBe('a perna com sapata e mancal');
    expect(r.mestre.unidades.corpo.funcao).toBe('o corpo sobre o pé');
    expect(r.devolvidos.join(' ')).toMatch(/"funcao" da unidade "pe" \(reescrita: a perna com sapata e mancal\)/);
  });

  it('sem mudança a funcao não volta nem aparece, e a unidade sem entrada em `unidades` ganha uma', () => {
    const r = integrarUnidade(mestre(), null, 'pe', detalheDoPe());
    expect(r.devolvidos).toEqual([]);
    const m = mestre();
    delete m.unidades.pe;
    const d = detalheDoPe(m, (x) => { x.unidades = { pe: { funcao: 'a perna nova' } }; });
    const nova = integrarUnidade(m, null, 'pe', d);
    expect(nova.mestre.unidades.pe).toEqual({ funcao: 'a perna nova' });
    expect(nova.devolvidos.join(' ')).toMatch(/nova: a perna nova/);
  });

  it('--editar aceita `unidades.<unidade>.funcao`, e cria a entrada da unidade que ainda não tem', () => {
    const r = editarEsboco(mestre(), { atribuicoes: ['unidades.pe.funcao=a perna, a sapata e o mancal', 'unidades.chao.funcao=o chão do pé'] });
    expect(r.esboco.unidades.pe.funcao).toBe('a perna, a sapata e o mancal');
    expect(r.esboco.unidades.chao).toEqual({ funcao: 'o chão do pé' });
    expect(r.mudancas[0]).toMatchObject({ forma: 'unidades', campo: 'pe.funcao', antes: 'a perna do pé' });
    expect(() => editarEsboco(mestre(), { atribuicoes: ['unidades.pe=x'] })).toThrow(/diga a unidade e o campo/);
  });
});

describe('atrito 37: a junta que o detalhe apagou', () => {
  const juntas = (m) => m.contato.juntas.map((j) => j.pecas.join('+'));

  it('sai a junta que cita a unidade e o detalhe apagou, mesmo com as formas existindo; a de fora fica', () => {
    const d = detalheDoPe(mestre(), (x) => { x.contato.juntas = x.contato.juntas.filter((j) => j.pecas[0] !== 'perna'); });
    const r = integrarUnidade(mestre(), null, 'pe', d);
    expect(juntas(r.mestre)).toEqual(['corpo+chao']);
    expect(r.apagados.juntas).toEqual(['perna + chao']);
    /* o detalhe que apagou também a junta de fora não a tira: ela não é da unidade */
    const dois = detalheDoPe(mestre(), (x) => { x.contato.juntas = []; });
    const r2 = integrarUnidade(mestre(), null, 'pe', dois);
    expect(juntas(r2.mestre)).toEqual(['corpo+chao']);
    expect(r2.apagados.juntas).toEqual(['perna + chao']);
  });

  it('a junta reescrita no detalhe (mesmas peças, outro max) vale no lugar da antiga, sem duplicar', () => {
    const d = detalheDoPe(mestre(), (x) => { x.contato.juntas[0] = { pecas: ['perna', 'chao'], max: 12, motivo: 'a perna entra pouco no chão agora' }; });
    const r = integrarUnidade(mestre(), null, 'pe', d);
    expect(r.mestre.contato.juntas).toHaveLength(2);
    expect(r.mestre.contato.juntas[0]).toMatchObject({ pecas: ['perna', 'chao'], max: 12 });
    expect(r.apagados.juntas).toEqual([]);
  });

  it('a junta nova entra se cita uma forma nova da unidade; a entre formas que já existiam e o mestre não tem não volta', () => {
    const m = mestre();
    const d = detalheDoPe(m, (x) => {
      emFormas(x, (fs) => fs.push(caixa('sapata', [0, 5, 0], 60, 10, 60, { unidade: 'pe' })));
      x.contato.juntas.push({ pecas: ['sapata', 'chao'], max: 8, motivo: 'a sapata entra no chão neste teste' });
      x.contato.juntas.push({ pecas: ['perna', 'corpo'], max: 8, motivo: 'a junta que o mestre tirou depois da cópia' });
    });
    const r = integrarUnidade(m, null, 'pe', d);
    expect(juntas(r.mestre)).toEqual(['perna+chao', 'corpo+chao', 'sapata+chao']);
  });

  it('o par `atravessa` do contato segue a mesma regra, e o contato que cita forma que saiu continua sendo limpo', () => {
    const m = mestre();
    m.contato.pares = [{ a: 'perna', b: 'chao', tipo: 'atravessa', max: 40, motivo: 'a perna entra no chão neste teste' }, { a: 'corpo', b: 'chao', tipo: 'encosta' }];
    const d = detalheDoPe(m, (x) => { x.contato.pares = x.contato.pares.filter((p) => p.a !== 'perna'); });
    const r = integrarUnidade(m, null, 'pe', d);
    expect(r.apagados.pares).toEqual(['perna + chao']);
    expect(r.mestre.contato.pares).toEqual([{ a: 'corpo', b: 'chao', tipo: 'encosta' }]);
    /* a forma que sai some do contato como antes */
    const trocada = detalheDoPe(m, (x) => { x.opcoes[0].formas = x.opcoes[0].formas.map((f) => (f.id === 'perna' ? { ...f, id: 'pernaNova' } : f)); x.plano.contrato = { tocam: [['pernaNova', 'chao']], livres: [] }; });
    const r2 = integrarUnidade(m, null, 'pe', trocada);
    expect(r2.removidos.pares).toBe(1);
    expect(r2.mestre.contato.pares.every((p) => p.a !== 'perna' && p.b !== 'perna')).toBe(true);
  });
});

describe('atrito 41: o contrato `tocam` do plano', () => {
  const tocam = (m) => m.plano.contrato.tocam.map((p) => p.join('+'));

  it('o detalhe que declara `plano.contrato.tocam` troca os pares que citam a unidade, e os de fora ficam', () => {
    const d = detalheDoPe(mestre(), (x) => {
      emFormas(x, (fs) => fs.push(caixa('baia', [0, 50, 0], 80, 100, 80, { unidade: 'pe' })));
      /* a lista do detalhe vale para todo par que cita a unidade: o que a perna ainda toca (o corpo) se declara de novo */
      x.plano = { ...x.plano, contrato: { tocam: [['baia', 'chao'], ['corpo', 'perna']] } };
    });
    const r = integrarUnidade(mestre(), null, 'pe', d);
    expect(tocam(r.mestre)).toEqual(['corpo+perna', 'baia+chao']);
    expect(r.contrato.tirados).toEqual(['tocam perna + chao']);
    expect(r.contrato.postos).toEqual(['tocam baia + chao']);
  });

  it('o detalhe sem `tocam` deixa o contrato do mestre como está; a lista vazia tira os pares da unidade', () => {
    const r = integrarUnidade(mestre(), null, 'pe', detalheDoPe());
    expect(tocam(r.mestre)).toEqual(['perna+chao', 'corpo+perna']);
    expect(r.contrato).toEqual({ tirados: [], postos: [] });
    const vazio = integrarUnidade(mestre(), null, 'pe', detalheDoPe(mestre(), (x) => { x.plano = { ...x.plano, contrato: { tocam: [] } }; }));
    expect(tocam(vazio.mestre)).toEqual([]);
  });

  it('o par do plano que cita forma que saiu não é removido: é acusado', () => {
    const d = detalheDoPe(mestre(), (x) => { x.opcoes[0].formas = x.opcoes[0].formas.map((f) => (f.id === 'perna' ? { ...f, id: 'pernaNova' } : f)); });
    const r = integrarUnidade(mestre(), null, 'pe', d);
    expect(tocam(r.mestre)).toEqual(['perna+chao', 'corpo+perna']);
    expect(r.avisos.join('\n')).toMatch(/plano\.contrato\.tocam cita "perna", que não existe mais \(perna \+ chao\)/);
    expect(r.avisos).toHaveLength(2);
  });
});

describe('atritos 14, 16 e 27: refazer o Envelope de uma unidade só', () => {
  /* o estado do Condutor já no Detalhe por unidade, sem passar pelos Portões */
  const estadoDoDetalhe = (m = mestre()) => {
    const e = criarEstado(m, 'pe.esboco.json');
    return { ...e, atual: 'detalhe-por-unidade', unidades: planoDeDetalhe(m).unidades };
  };
  /* a perna do detalhe passa 80 mm da caixa da maquete em y (a maquete a fez baixa demais) */
  const altaDemais = (m = mestre()) => detalheDoPe(m, (x) => { formaDe(x, 'perna').altura = 180; formaDe(x, 'perna').centro = [0, 90, 0]; delete x.parametros.altPe; });

  it('a caixa da maquete trava o detalhe, e refazer o Envelope pelo detalhe o libera, com o motivo e as caixas no histórico', () => {
    const m = mestre();
    const estado = estadoDoDetalhe(m);
    const d = altaDemais(m);
    const antes = conferirEnvelope(m, estado, 'pe', d);
    expect(antes.ok).toBe(false);
    expect(antes.falta.join(' ')).toMatch(/passa 80 mm do Envelope em y/);
    const novo = refazerEnvelope(m, estado, 'pe', { motivo, detalhado: d, arquivo: 'pe-detalhe.json' });
    const u = novo.unidades.find((x) => x.id === 'pe');
    expect(u.envelope.caixa.y).toEqual([0, 180]);
    expect(conferirEnvelope(m, novo, 'pe', d).ok).toBe(true);
    /* as outras unidades e o estado ficam; o histórico guarda unidade, motivo, origem e as duas caixas */
    expect(novo.unidades.filter((x) => x.id !== 'pe')).toEqual(estado.unidades.filter((x) => x.id !== 'pe'));
    expect(novo.alteracoes.at(-1)).toMatchObject({ envelopeRefeito: true, unidade: 'pe', motivo, de: 'do detalhado pe-detalhe.json', mudou: true });
    expect(novo.alteracoes.at(-1).antes.y).toEqual([0, 100]);
    expect(novo.alteracoes.at(-1).depois.y).toEqual([0, 180]);
    const texto = formatarSituacao(novo, { passa: true, falta: [] }, { historico: true });
    expect(texto).toMatch(/envelope refeito: pe a partir do detalhado pe-detalhe\.json; caixa x -?[\d,]+\.\.[\d,]+ y 0\.\.100 z .* -> x .* y 0\.\.180 z .* \(a maquete estava errada/);
    /* o estado de partida não muda */
    expect(estado.unidades.find((x) => x.id === 'pe').envelope.caixa.y).toEqual([0, 100]);
  });

  it('a conferência anterior da unidade deixa de valer quando o Envelope muda, e as portas da maquete continuam', () => {
    const m = mestre();
    const estado = estadoDoDetalhe(m);
    const conferido = { ...estado, unidades: estado.unidades.map((u) => (u.id === 'pe' ? { ...u, envelopeConferido: { ok: true, arquivo: 'a.json', tolerancia_mm: 30, falta: [] } } : u)) };
    const novo = refazerEnvelope(m, conferido, 'pe', { motivo, detalhado: altaDemais(m) });
    expect(novo.unidades.find((x) => x.id === 'pe').envelopeConferido).toBeUndefined();
    expect(novo.unidades.find((x) => x.id === 'pe').envelope.portas).toEqual(estado.unidades.find((x) => x.id === 'pe').envelope.portas);
  });

  it('sem detalhado o Envelope sai das formas que o mestre tem agora (a maquete corrigida)', () => {
    const m = mestre();
    const estado = estadoDoDetalhe(m);
    const corrigido = editarEsboco(m, { atribuicoes: ['perna.altura=180', 'perna.centro=[0,90,0]'] }).esboco;
    const novo = refazerEnvelope(corrigido, estado, 'pe', { motivo });
    expect(novo.unidades.find((x) => x.id === 'pe').envelope.caixa.y).toEqual([0, 180]);
    expect(novo.alteracoes.at(-1).de).toBe('das formas do mestre');
    /* sem nada para mudar, o histórico diz e a conferência continua */
    const igual = refazerEnvelope(m, estado, 'pe', { motivo });
    expect(igual.alteracoes.at(-1).mudou).toBe(false);
    expect(igual.unidades).toEqual(estado.unidades);
  });

  it('o Envelope por forma (`substitui`) também passa a ser o das formas do detalhe, e o motivo é exigido', () => {
    const m = mestre();
    const estado = estadoDoDetalhe(m);
    const d = detalheDoPe(m, (x) => { const f = formaDe(x, 'perna'); f.substitui = 'perna'; f.altura = 180; f.centro = [0, 90, 0]; });
    expect(conferirEnvelope(m, estado, 'pe', d).falta.join(' ')).toMatch(/a forma "perna" da maquete foi excedida/);
    const novo = refazerEnvelope(m, estado, 'pe', { motivo, detalhado: d });
    expect(novo.unidades.find((x) => x.id === 'pe').envelope.formas.perna.y).toEqual([0, 180]);
    expect(conferirEnvelope(m, novo, 'pe', d).ok).toBe(true);
    expect(() => refazerEnvelope(m, estado, 'pe', { motivo: 'curto', detalhado: d })).toThrow(/motivo/);
    expect(() => refazerEnvelope(m, estado, 'inexistente', { motivo })).toThrow(/não é uma unidade de detalhe/);
    expect(() => refazerEnvelope(m, criarEstado(m, 'pe.esboco.json'), 'pe', { motivo })).toThrow(/depois do Plano de detalhe/);
  });

  it('pela linha de comando: --refazer-envelope grava no estado, aparece no --historico e libera o --integrar', () => {
    const dir = mkdtempSync(join(tmpdir(), 'integracao-'));
    const arq = join(dir, 'moto.esboco.json');
    copyFileSync(fileURLToPath(new URL('moto-curvas.esboco.json', pasta)), arq);
    for (let i = 0; i < 4; i++) condutorArquivo(arq, { proximo: true });
    const d = detalharArquivo(arq, 'farol');
    const detalhe = JSON.parse(readFileSync(d.destino, 'utf8'));
    detalhe.formas.push({ id: 'farolExtra', tipo: 'caixa', largura: 600, altura: 600, profundidade: 600, centro: 'farol.centro', cor: 'cinza' });
    writeFileSync(d.destino, JSON.stringify(detalhe));
    const recusa = integrarArquivo(arq, 'farol', d.destino);
    expect(recusa.gravado).toBe(false);
    expect(recusa.texto).toMatch(/--condutor --refazer-envelope farol --de .*farol\.esboco\.json --motivo/);
    const r = condutorArquivo(arq, { refazerEnvelope: 'farol', de: d.destino, motivo });
    expect(r.texto).toMatch(/Envelope da unidade farol refeito do detalhado .*, e registrado no histórico do Condutor/);
    expect(r.texto).toMatch(/A conferência anterior deixou de valer/);
    const historico = condutorArquivo(arq, { historico: true }).texto;
    expect(historico).toMatch(/envelope refeito: farol a partir do detalhado/);
    const depois = integrarArquivo(arq, 'farol', d.destino);
    expect(depois.gravado).toBe(true);
    expect(depois.texto).toMatch(/cabe/);
    const estado = JSON.parse(readFileSync(`${arq}.condutor.json`, 'utf8'));
    expect(estado.unidades.find((u) => u.id === 'farol').envelopeConferido.ok).toBe(true);
    expect(estado.alteracoes.filter((a) => a.envelopeRefeito)).toHaveLength(1);
  }, 120000);
});

describe('atrito 22: a forma girada', () => {
  /* a porta de 36 de espessura e 939 de comprimento, girada 2,19 graus em torno de y para seguir o flanco que afina; a da
     maquete é uma placa de 30 mm sem giro, e a caixa dela vai de x -795 a -765 */
  const maquete = () => ({
    plano: { nivel: 'detalhado', envelope: { tolerancia: 30 } },
    unidades: {},
    opcoes: [{ titulo: 'T', formas: [
      caixa('fuselagem', [0, 0, 0], 1600, 800, 3000, { unidade: 'fuselagem' }),
      caixa('portaE', [-780, 1660, 5940], 30, 1040, 939, { unidade: 'porta' }),
    ] }],
  });
  const detalheDaPorta = (extra) => {
    const d = detalharUnidade(maquete(), null, 'porta');
    const f = formaDe(d, 'portaE');
    Object.assign(f, { substitui: 'portaE', largura: 36, rotacao: [0, 2.19, 0], centro: [-758, 1660, 5940], ...extra });
    return d;
  };
  const estado = () => ({ ...criarEstado(maquete(), 'p.esboco.json'), atual: 'detalhe-por-unidade', unidades: planoDeDetalhe(maquete()).unidades });

  it('a caixa da forma girada é a da forma depois do giro, e o relato diz quanto do excesso é do giro', () => {
    const r = conferirEnvelope(maquete(), estado(), 'porta', detalheDaPorta());
    const rad = (2.19 * Math.PI) / 180;
    const extensao = 36 * Math.cos(rad) + 939 * Math.sin(rad);
    const { detalhe } = r.formas[0].caixa.x;
    expect(detalhe[1] - detalhe[0]).toBeCloseTo(extensao, 0);
    expect(detalhe[1] - detalhe[0]).toBeGreaterThan(70);
    expect(r.ok).toBe(false);
    const texto = r.falta.join(' ');
    expect(texto).toMatch(/a forma "portaE" da maquete foi excedida: portaE passa 42,9 mm em x/);
    expect(texto).toMatch(/o giro das formas acrescenta 17,9 mm a esse excesso \(sem ele passaria 25 mm\)/);
    expect(texto).toMatch(/--condutor --refazer-envelope/);
  });

  it('sem giro o relato é o de antes, e a forma girada que cabe passa', () => {
    const reta = conferirEnvelope(maquete(), estado(), 'porta', detalheDaPorta({ rotacao: undefined, centro: [-758, 1660, 5940] }));
    expect(reta.falta.join(' ')).not.toMatch(/o giro das formas/);
    const cabe = conferirEnvelope(maquete(), estado(), 'porta', detalheDaPorta({ largura: 24, centro: [-780, 1660, 5940] }));
    expect(cabe.ok).toBe(true);
  });

  it('refazer o Envelope pelo detalhe guarda a caixa da forma girada, e a porta inclinada passa a caber', () => {
    const m = maquete();
    const d = detalheDaPorta();
    const novo = refazerEnvelope(m, estado(), 'porta', { motivo, detalhado: d });
    const caixaDaPorta = novo.unidades.find((u) => u.id === 'porta').envelope.formas.portaE.x;
    expect(caixaDaPorta[1] - caixaDaPorta[0]).toBeGreaterThan(70);
    expect(conferirEnvelope(m, novo, 'porta', d).ok).toBe(true);
  });
});

describe('atrito 32: a divisão interna que contraria a referência', () => {
  /* O Envelope é o contrato de lugar entre a maquete e o detalhe (uma caixa e as portas); a divisão entre flap e aileron é do
     que a forma é, e a referência a declara em `plano.medidas` (origem "referencia"), que o Portão confere no mestre integrado. */
  const asa = (fimDoFlap) => ({
    contato: { usar: true, tolerancia: 1, folga: 5000 },
    plano: { envelope: { tolerancia: 30 }, medidas: [{ nome: 'flap.comprimento', valor: 2300, unidade: 'mm', origem: 'referencia', tolerancia: 50, mede: { distancia: ['flap.-x', 'flap.+x'], eixo: 'x' } }] },
    opcoes: [{ titulo: 'T', formas: [
      caixa('flap', [(830 + fimDoFlap) / 2, 0, 0], fimDoFlap - 830, 100, 300, { unidade: 'asa' }),
      caixa('aileron', [(fimDoFlap + 20 + 5800) / 2, 0, 0], 5800 - fimDoFlap - 20, 100, 300, { unidade: 'asa' }),
    ] }],
  });
  const conferir = (e) => { const x = expandirEsboco(e); return conferirPlano(x, visiveisDoEsboco(x)); };

  it('a medida de `plano.medidas` acusa a maquete que divide fora da referência e passa a divisão da referência', () => {
    const errada = conferir(asa(4887));
    expect(errada.achados).toHaveLength(1);
    expect(errada.achados[0]).toMatchObject({ tipo: 'medida-fora', nome: 'flap.comprimento' });
    expect(errada.achados[0].texto).toMatch(/o esboço mede 4057 mm e o plano declara 2300 mm \(origem: referencia\)/);
    expect(conferir(asa(3130)).achados).toEqual([]);
  });

  it('o Envelope não olha a divisão: a unidade inteira cabe na mesma caixa com a divisão errada ou certa', () => {
    const errada = asa(4887);
    const certa = asa(3130);
    const estado = { ...criarEstado(errada, 'a.esboco.json'), atual: 'detalhe-por-unidade', unidades: planoDeDetalhe(errada).unidades };
    expect(estado.unidades.map((u) => u.id)).toEqual(['asa']);
    expect(idsDe(errada)).toEqual(idsDe(certa));
    const r = conferirEnvelope(errada, estado, 'asa', certa);
    expect(r.ok).toBe(true);
    expect(r.portas).toEqual([]);
  });
});
