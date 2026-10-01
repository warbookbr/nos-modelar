/* O crítico por unidade (plano "O esboço detalhado coerente", fatia 2): `funcao` por unidade, `--largura` e `--saida` nas imagens
   de `--unidade`, o brief que o `--feito` imprime para a unidade com mais de 8 formas e o veredito no histórico do condutor. */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { avancar, criarEstado, marcarFeito, registrarVeredito } from '../src/condutor.js';
import { briefDoCritico, condutorArquivo, escalarSvg, lerArgumentos, lerLargura, PERGUNTAS_DO_CRITICO, unidadeArquivo } from '../../../tools/mecanifica/esboco.mjs';

const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro, ...extra });
const medida = (nome, valor, mede) => ({ nome, valor, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede });
/* nove caixas em fila (unidade "fila") e uma de fora (unidade "ponta") */
const grande = (funcao = 'fileira de caixas encostadas que faz o corpo do objeto') => ({
  contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 },
  plano: { nivel: 'detalhado', medidas: [medida('a', 20, 'alturaTotal'), medida('b', 200, 'larguraTotal'), medida('c', 200, 'larguraTotal'), medida('d', 200, 'larguraTotal'), medida('e', 200, 'larguraTotal')], contrato: { tocam: [['c0', 'c1']] } },
  ...(funcao === null ? {} : { unidades: { fila: { funcao } } }),
  opcoes: [{ titulo: 'T', formas: [...Array.from({ length: 9 }, (_, i) => caixa(`c${i}`, [10 + 20 * i, 10, 0], { unidade: 'fila' })), caixa('p', [190, 10, 0], { unidade: 'ponta' })] }],
});
const naDetalhe = (e) => { let s = criarEstado(e, 'x.esboco.json'); for (let i = 0; i < 3; i++) { const r = avancar(e, s); expect(r.ok).toBe(true); s = r.estado; } expect(s.atual).toBe('detalhe-por-unidade'); return s; };
const gravar = (e) => {
  const pasta = mkdtempSync(join(tmpdir(), 'critico-'));
  const arquivo = join(pasta, 'g.esboco.json');
  writeFileSync(arquivo, JSON.stringify(e, null, 2));
  writeFileSync(`${arquivo}.condutor.json`, JSON.stringify(naDetalhe(e), null, 2));
  return { pasta, arquivo };
};

describe('funcao por unidade', () => {
  it('a unidade com mais de 8 formas sem `funcao` não passa no --feito, e a mensagem diz o que escrever', () => {
    const e = grande(null);
    expect(() => marcarFeito(e, naDetalhe(e), 'fila')).toThrow(/tem 9 formas \(mais de 8\) e não declara "funcao".*unidades\["fila"\]\.funcao/);
  });

  it('com `funcao` passa, e a unidade de uma forma só não a exige', () => {
    const e = grande();
    expect(marcarFeito(e, naDetalhe(e), 'fila').estado.unidades.find((u) => u.id === 'fila').feito).toBe(true);
    const sem = grande(null);
    expect(marcarFeito(sem, naDetalhe(sem), 'ponta').estado.unidades.find((u) => u.id === 'ponta').feito).toBe(true);
  });

  it('o esquema recusa uma `funcao` vazia', () => {
    expect(() => marcarFeito(grande(' '), naDetalhe(grande(' ')), 'fila')).toThrow(/funcao/);
  });
});

describe('--largura e --saida', () => {
  it('lê e valida a largura, e escala o SVG mantendo a proporção', () => {
    expect(lerLargura(undefined)).toBeNull();
    expect(lerLargura('1500')).toBe(1500);
    expect(() => lerLargura('10')).toThrow(/inteiro de 200 a 8000/);
    expect(escalarSvg('<svg width="620" height="560">', 620, 560, 1240)).toEqual({ svg: '<svg width="1240" height="1120">', largura: 1240, altura: 1120 });
    expect(escalarSvg('<svg width="620" height="560">', 620, 560)).toMatchObject({ largura: 620, altura: 560 });
    const a = lerArgumentos(['x.esboco.json', '--unidade', 'fila', '--largura', '1500', '--saida', 'pasta']);
    expect([a.valor('--largura'), a.valor('--saida')]).toEqual(['1500', 'pasta']);
  });

  it('--unidade grava na largura pedida e na pasta de --saida; sem elas, a largura de antes', async () => {
    const { pasta, arquivo } = gravar(grande());
    const padrao = await unidadeArquivo(arquivo, 'fila', { vista: 'frontal' });
    const larga = await unidadeArquivo(arquivo, 'fila', { vista: 'frontal', largura: 1500, saida: join(pasta, 'imagens') });
    expect(larga.destinos[0].startsWith(join(pasta, 'imagens'))).toBe(true);
    expect(PNG.sync.read(readFileSync(larga.destinos[0])).width).toBe(1500);
    expect(PNG.sync.read(readFileSync(padrao.destinos[0])).width).not.toBe(1500);
  }, 120000);
});

describe('o brief do crítico no --feito', () => {
  it('a unidade grande gera as quatro vistas e o brief com a função, os caminhos e as cinco perguntas; o comando não despacha agente', async () => {
    const { pasta, arquivo } = gravar(grande());
    const r = condutorArquivo(arquivo, { feito: 'fila' });
    expect(r.criticoDe).toBe('fila');
    const b = await briefDoCritico(arquivo, 'fila', { saida: join(pasta, 'critico') });
    expect(b.destinos).toHaveLength(4);
    for (const d of b.destinos) { expect(existsSync(d)).toBe(true); expect(d.startsWith(join(pasta, 'critico'))).toBe(true); expect(PNG.sync.read(readFileSync(d)).width).toBe(1100); }
    expect(b.texto).toContain('Função da unidade: fileira de caixas encostadas que faz o corpo do objeto');
    /* o texto do --ligacoes da unidade entra no brief: a fila toca a ponta num ponto e não tem ponta livre */
    expect(b.texto).toContain('Ligações da unidade em texto');
    expect(b.texto).toMatch(/unidade fila \(9 formas; função: fileira de caixas encostadas que faz o corpo do objeto\):\n\s+toca ponta: 1 ponto \(c8 em p \[180 10 0\]\)\n\s+pontas livres: nenhuma/);
    expect(b.texto.indexOf('Ligações da unidade em texto')).toBeLessThan(b.texto.indexOf('Responda, olhando só as imagens'));
    for (const v of ['isometrica', 'frontal', 'lateral', 'superior']) expect(b.texto).toContain(`-unidade-fila-${v}.png`);
    expect(PERGUNTAS_DO_CRITICO).toHaveLength(5);
    PERGUNTAS_DO_CRITICO.forEach((p, i) => expect(b.texto).toContain(`${i + 1}. ${p}`));
    expect(b.texto).toMatch(/Despache o agente critico-visual/);
    expect(b.texto).toMatch(/--veredito <unidade> --nota <0-10> --motivo/);
  }, 120000);

  it('a unidade de 8 formas ou menos não pede o crítico', () => {
    const { arquivo } = gravar(grande());
    expect(condutorArquivo(arquivo, { feito: 'ponta' }).criticoDe).toBeNull();
  });
});

describe('o veredito no histórico do condutor', () => {
  it('registra a nota e o motivo, sobe o estado para a versão 2 e aparece em --historico', () => {
    const e = grande();
    const novo = registrarVeredito(naDetalhe(e), { unidade: 'fila', nota: 7.5, motivo: 'a ponta da direita fica no ar' });
    expect(novo.versao).toBe(2);
    expect(novo.vereditos).toEqual([{ ordem: 1, unidade: 'fila', nota: 7.5, motivo: 'a ponta da direita fica no ar' }]);
    expect(() => registrarVeredito(naDetalhe(e), { unidade: 'fila', nota: 11, motivo: 'a ponta da direita fica no ar' })).toThrow(/entre 0 e 10/);
    expect(() => registrarVeredito(naDetalhe(e), { unidade: 'fila', nota: 5, motivo: 'curto' })).toThrow(/motivo/);
    expect(() => registrarVeredito(naDetalhe(e), { unidade: 'filaa', nota: 5, motivo: 'a ponta da direita fica no ar' })).toThrow(/não é uma unidade/);
    const { arquivo } = gravar(e);
    condutorArquivo(arquivo, { veredito: 'fila', nota: '8', motivo: 'sem pontas no ar, mas a tampa está solta' });
    const r = condutorArquivo(arquivo, { historico: true });
    expect(r.texto).toContain('veredito do crítico 1: fila nota 8 (sem pontas no ar, mas a tampa está solta)');
    expect(JSON.parse(readFileSync(`${arquivo}.condutor.json`, 'utf8')).versao).toBe(2);
  });
});
