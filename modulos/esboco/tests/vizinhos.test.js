/* A vista `--unidade` desenha também as formas de outras unidades que a tocam (as do `--ligacoes`), em contorno claro e
   translúcido, sem rótulo; `--sem-vizinhos` desliga. O crítico cego passa a ver onde a unidade se prende. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { briefDoCritico, lerArgumentos, unidadeArquivo } from '../../../tools/modelar/esboco.mjs';

const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 40, altura: 20, profundidade: 20, centro, ...extra });
/* a unidade "esteira" (duas caixas) toca só a viga do "chassi"; a roda do chassi e a caixa "longe" não a tocam */
const esboco = () => ({
  contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 500 },
  vista: 'frontal',
  opcoes: [{ titulo: 'T', formas: [
    caixa('e1', [0, 0, 0], { unidade: 'esteira', rotulo: 'esteira' }),
    caixa('e2', [40, 0, 0], { unidade: 'esteira' }),
    caixa('viga', [20, 20, 0], { unidade: 'chassi', rotulo: 'viga do chassi', cor: '#ff0000' }),
    caixa('roda', [220, 20, 0], { unidade: 'chassi' }),
    caixa('longe', [400, 0, 0], { unidade: 'outra' }),
  ] }],
});
const gravar = (e = esboco()) => { const arq = join(mkdtempSync(join(tmpdir(), 'viz-')), 'm.esboco.json'); writeFileSync(arq, JSON.stringify(e)); return arq; };

describe('vizinhos na vista da unidade', () => {
  it('desenha só as formas de outras unidades que tocam a unidade, e diz quais', async () => {
    const r = await unidadeArquivo(gravar(), 'esteira', { vista: 'frontal', largura: 600, forcar: true });
    expect(r.vizinhos).toEqual(['viga']);
    expect(r.texto).toContain('1 forma de outra unidade em contorno claro: viga');
  }, 120000);

  it('a vista com vizinhos difere da sem vizinhos, e a vizinha sai sem rótulo e sem a cor própria', async () => {
    const arq = gravar();
    const com = await unidadeArquivo(arq, 'esteira', { vista: 'frontal', largura: 600, forcar: true });
    const sem = await unidadeArquivo(arq, 'esteira', { vista: 'frontal', largura: 600, forcar: true, vizinhos: false });
    expect(sem.vizinhos).toEqual([]);
    expect(com.svgs[0]).not.toBe(sem.svgs[0]);
    expect(com.svgs[0]).not.toContain('viga do chassi');
    expect(com.svgs[0]).not.toContain('#ff0000');
    expect(com.svgs[0]).toContain('<g opacity="0.4">');
    expect(sem.svgs[0]).not.toContain('<g opacity=');
    expect(sem.texto).not.toContain('contorno claro');
  }, 120000);

  it('a unidade sem vizinha que a toque sai igual com e sem a opção', async () => {
    const arq = gravar();
    const a = await unidadeArquivo(arq, 'outra', { vista: 'frontal', largura: 600, forcar: true });
    const b = await unidadeArquivo(arq, 'outra', { vista: 'frontal', largura: 600, forcar: true, vizinhos: false });
    expect(a.vizinhos).toEqual([]);
    expect(a.svgs[0]).toBe(b.svgs[0]);
  }, 120000);

  it('--sem-vizinhos é lida na linha de comando, e o brief do crítico avisa sobre as peças em contorno claro', async () => {
    expect(lerArgumentos(['x.esboco.json', '--unidade', 'esteira', '--sem-vizinhos']).tem('--sem-vizinhos')).toBe(true);
    const arq = gravar();
    const b = await briefDoCritico(arq, 'esteira', { saida: join(mkdtempSync(join(tmpdir(), 'viz-b-')), 'c') });
    expect(b.texto).toContain('peças em contorno claro são de outras unidades');
    const s = await briefDoCritico(arq, 'esteira', { saida: join(mkdtempSync(join(tmpdir(), 'viz-c-')), 'c'), vizinhos: false });
    expect(s.texto).not.toContain('contorno claro');
  }, 120000);
});
