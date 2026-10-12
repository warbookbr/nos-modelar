/* `--ligacoes`: o mapa de ligações em texto (quem toca quem, em quantos pontos distintos, pontas livres e unidades presas a
   nada), por unidade e por forma, sem imagem, sem gravar nada e com saída 0. */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatarLigacoes, mapaDeLigacoes } from '../src/mapa-de-ligacoes.js';
import { ligacoesArquivo } from '../../../tools/mecanifica/esboco.mjs';
import { verificarContato } from '../src/contato.js';
import { conferirPlano, visiveisDoEsboco } from '../src/plano.js';
import { expandirEsboco } from '../src/expandir.js';

const cli = fileURLToPath(new URL('../../../tools/mecanifica/esboco.mjs', import.meta.url));
const caixa = (id, centro, l, a, p, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });

/* chão, dois pés, placa, antena de tubo com a ponta no ar e uma caixa longe de tudo */
const objeto = (extra = {}) => ({
  contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 1000 },
  unidades: { placa: { funcao: 'tampo que apoia a antena' } },
  opcoes: [{ titulo: 'T', formas: [
    caixa('chao', [0, 0, 0], 200, 10, 60, { unidade: 'chao' }),
    caixa('peE', [-40, 25, 0], 20, 40, 20, { unidade: 'pes' }),
    caixa('peD', [40, 25, 0], 20, 40, 20, { unidade: 'pes' }),
    caixa('placa', [0, 50, 0], 120, 10, 40, { unidade: 'placa' }),
    { id: 'antena', tipo: 'tubo', diametro: 6, caminho: [[0, 55, 0], [0, 135, 0]], unidade: 'antena' },
    caixa('orfa', [400, 0, 0], 20, 20, 20, { unidade: 'orfa' }),
  ], ...extra }],
});
const texto = (e, opcoes = {}) => formatarLigacoes(mapaDeLigacoes(e), opcoes);

describe('mapa de ligações por unidade', () => {
  it('diz quem toca quem e em quantos pontos distintos, pela regra do contrato.fixa', () => {
    const t = texto(objeto());
    expect(t).toContain('unidade pes (2 formas):');
    expect(t).toMatch(/unidade pes[\s\S]*toca chao: 2 pontos \(peE em chao \[-40 5 0\]; peD em chao \[40 5 0\]\)/);
    expect(t).toMatch(/toca placa: 2 pontos/);
    expect(t).toMatch(/unidade placa \(1 forma; função: tampo que apoia a antena\):[\s\S]*toca antena: 1 ponto \(placa em antena \[0 55 0\]\)/);
    expect(t).toMatch(/unidade chao \(1 forma\):\n  toca pes: 2 pontos/);
  });

  it('o número de pontos é o mesmo que o contrato.fixa conta', () => {
    const e = objeto();
    /* o mapa conta os locais de contato; a face que cobre a peça presa, que o `fixa` conta como plano (3 pontos), é um local só no mapa. Aqui a
       peça presa é a grande (o chão sobre os pés, a placa sob a antena), e a conta das duas é a mesma */
    e.plano = { contrato: { fixa: [{ a: 'chao', b: 'pes', pontos: 2 }, { a: 'placa', b: 'antena', pontos: 1 }] } };
    const x = expandirEsboco(e);
    const r = conferirPlano(x, visiveisDoEsboco(x));
    expect(r.opcoes[0].contrato.map((c) => c.pontos)).toEqual([2, 1]);
    const mapa = mapaDeLigacoes(e);
    expect(mapa.unidades.find((u) => u.id === 'pes').vizinhas.find((v) => v.unidade === 'chao').pontos).toBe(2);
    expect(mapa.unidades.find((u) => u.id === 'placa').vizinhas.find((v) => v.unidade === 'antena').pontos).toBe(1);
  });

  it('lista as pontas livres, as de verdade e só elas, e as unidades presas a nada', () => {
    const t = texto(objeto());
    expect(t).toMatch(/unidade antena \(1 forma\):\n  toca placa: 1 ponto[^\n]*\n  pontas livres: antena \(fim\) em \[0 135 0\]/);
    expect(t).toMatch(/unidade orfa \(1 forma\):\n  presa a nada: nenhuma outra unidade a toca\n  pontas livres: nenhuma/);
    expect(t).toMatch(/unidade placa[\s\S]*pontas livres: nenhuma/);
    expect(t.trimEnd().split('\n').pop()).toBe('unidades presas a nada: orfa');
    const sem = objeto();
    sem.opcoes[0].formas = sem.opcoes[0].formas.filter((f) => f.id !== 'orfa');
    expect(texto(sem).trimEnd().split('\n').pop()).toBe('unidades presas a nada: nenhuma');
  });

  it('a ponta declarada de propósito não é ponta livre, e o mapa vale com o contato desligado', () => {
    const e = objeto();
    e.opcoes[0].formas.find((f) => f.id === 'antena').ponta = true;
    e.contato.usar = false;
    expect(texto(e)).toMatch(/unidade antena[\s\S]*pontas livres: nenhuma/);
    const aberto = objeto();
    aberto.contato = { usar: false };
    expect(texto(aberto)).toContain('pontas livres: antena (fim) em [0 135 0]');
    /* o achado do gate é o mesmo */
    expect(verificarContato(objeto()).achados.filter((a) => a.tipo === 'ponta-livre').map((a) => a.pecas[0])).toEqual(['antena']);
  });

  it('com `unidade` mostra só ela, sem o rodapé, e recusa a unidade que não existe com as que existem', () => {
    const t = texto(objeto(), { unidade: 'pes' });
    expect(t).toContain('unidade pes');
    expect(t).not.toContain('unidade chao');
    expect(t).not.toContain('unidades presas a nada');
    expect(() => texto(objeto(), { unidade: 'pess' })).toThrow(/a unidade "pess" não existe na opção.*unidades: chao, pes, placa, antena, orfa/);
  });

  it('as unidades do Condutor valem no lugar do agrupamento por instância', () => {
    const e = objeto();
    const unidades = [{ id: 'estrutura', membros: ['chao', 'peE', 'peD', 'placa'] }, { id: 'antena', membros: ['antena'] }];
    for (const f of e.opcoes[0].formas) delete f.unidade;
    const t = formatarLigacoes(mapaDeLigacoes(e, { unidades }));
    expect(t).toMatch(/unidade estrutura \(4 formas\):\n  toca antena: 1 ponto/);
    expect(t).toContain('unidade orfa (1 forma)');
  });
});

describe('mapa de ligações por forma', () => {
  it('lista as formas que a forma toca, com a unidade delas e os pontos distintos', () => {
    const t = texto(objeto(), { forma: 'peE' });
    expect(t).toContain('forma peE (unidade pes):');
    expect(t).toContain('  toca chao (unidade chao): 1 ponto [-40 5 0]');
    expect(t).toContain('  toca placa (unidade placa): 1 ponto [-40 45 0]');
    expect(t).not.toContain('unidades presas a nada');
  });

  it('mostra a ponta livre da forma, a ligação criada por `ligar` e a instância inteira', () => {
    expect(texto(objeto(), { forma: 'antena' })).toMatch(/forma antena \(unidade antena\):\n  toca placa \(unidade placa\): 1 ponto \[0 55 0\]\n  pontas livres: antena \(fim\) em \[0 135 0\]/);
    const e = objeto();
    e.opcoes[0].formas.push({ id: 'elo', ligar: { de: 'peE.+y', para: 'peD.+y', tipo: 'tubo', diametro: 4 }, ponta: true });
    expect(texto(e, { forma: 'elo' })).toContain('forma elo (unidade elo), ligação tubo de peE.+y para peD.+y:');
    const c = { contato: { usar: true }, opcoes: [{ titulo: 'T', formas: [{ id: 'r', usa: 'rolamento', centro: [0, 0, 0] }] }] };
    const t = texto(c, { forma: 'r' });
    expect(t).toContain('forma r.anelExterno (unidade r)');
    expect(t).toContain('forma r.esfera3 (unidade r)');
    expect(t).toMatch(/forma r\.esfera3[\s\S]*toca r\.anelExterno: [12] pontos?/);
    expect(() => texto(objeto(), { forma: 'peX' })).toThrow(/"peX" não é uma forma visível.*peE/);
  });
});

describe('--ligacoes na linha de comando', () => {
  const gravar = (e) => {
    const dir = mkdtempSync(join(tmpdir(), 'ligacoes-'));
    const arquivo = join(dir, 'o.esboco.json');
    writeFileSync(arquivo, JSON.stringify(e));
    return { dir, arquivo };
  };

  it('imprime o texto, sai com 0 e não grava nada (nem imagem nem o próprio esboço)', () => {
    const { dir, arquivo } = gravar(objeto());
    const antes = readFileSync(arquivo, 'utf8');
    const lista = readdirSync(dir);
    const saida = execFileSync(process.execPath, [cli, arquivo, '--ligacoes'], { encoding: 'utf8' });
    expect(saida).toContain('unidade pes (2 formas):');
    expect(saida).toContain('unidades presas a nada: orfa');
    expect(readdirSync(dir)).toEqual(lista);
    expect(readFileSync(arquivo, 'utf8')).toBe(antes);
    expect(saida).toBe(ligacoesArquivo(arquivo).texto);
  }, 60000);

  it('--forma e --unidade escolhem a forma ou a unidade, e o código continua 0 com o gate reprovado', () => {
    const e = objeto();
    e.opcoes[0].formas.push(caixa('invasora', [0, 30, 0], 40, 40, 40));
    const { arquivo } = gravar(e);
    expect(verificarContato(e).resultado).toBe('reprovado');
    const porForma = execFileSync(process.execPath, [cli, arquivo, '--ligacoes', '--forma', 'peE'], { encoding: 'utf8' });
    expect(porForma).toContain('forma peE (unidade pes):');
    const porUnidade = execFileSync(process.execPath, [cli, arquivo, '--ligacoes', '--unidade', 'antena'], { encoding: 'utf8' });
    expect(porUnidade).toContain('unidade antena');
    expect(porUnidade).not.toContain('unidade pes');
  }, 60000);

  it('usa as unidades do Condutor gravado ao lado, e a função dele', () => {
    const e = objeto();
    for (const f of e.opcoes[0].formas) delete f.unidade;
    const { arquivo } = gravar(e);
    writeFileSync(`${arquivo}.condutor.json`, JSON.stringify({ unidades: [{ id: 'tudo', membros: ['chao', 'peE', 'peD', 'placa', 'antena'] }, { id: 'orfa', membros: ['orfa'] }] }));
    const t = ligacoesArquivo(arquivo).texto;
    expect(t).toContain('unidade tudo (5 formas):');
    expect(t).toContain('unidades presas a nada: tudo, orfa');
  });
});
