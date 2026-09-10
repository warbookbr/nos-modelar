/* escrever-parametro.test.js — a escrita de UM número, e o arquivo intacto
 * quando ela é recusada.
 *
 * A receita é programa, com o motivo de cada número escrito ao lado dele, então
 * a troca é cirúrgica no texto. O que protege não é a expressão de busca e sim
 * a conferência depois: grava ao lado, importa de lá, exige que só o parâmetro
 * pedido tenha mudado, e só então substitui. Estes casos guardam as três
 * maneiras de isso dar errado em silêncio — acertar a linha errada, mexer em
 * dois números, e gravar uma receita que não executa mais. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { escreverParametro } from './escrever-parametro.js';

const AREA = mkdtempSync(join(tmpdir(), 'escrever-parametro-'));
afterAll(() => rmSync(AREA, { recursive: true, force: true }));

const RECEITA = `/* peça de prova */
export const TABELA = {
  /* o comentário PRECISA sobreviver: é ele que diz de onde veio a medida */
  comprimento: 480,
  raio: 17,
  folga: 0.5,
  ponto: [-134, 716],
};

export default {
  meta: { nome: 'prova' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro' },
  get PASSOS() {
    return [
      ['cilindro', { origemId: 10, raio: this.PARAMS.raio / 1000, altura: this.PARAMS.comprimento / 1000, lados: 12 }],
      ['parte', { nome: 'corpo', sel: { origem: { op: 'cilindro', id: 10 } } }],
    ];
  },
};
`;

function novaPeca(nome = 'peca', texto = RECEITA) {
  const caminho = join(AREA, `${nome}-${Math.random().toString(36).slice(2)}.js`);
  writeFileSync(caminho, texto, 'utf8');
  return caminho;
}

describe('escrever parâmetro na receita', () => {
  it('troca um número, preserva o resto do arquivo e diz de quanto para quanto', async () => {
    const caminho = novaPeca();
    const antes = readFileSync(caminho, 'utf8');

    const r = await escreverParametro(caminho, 'comprimento', 540);
    expect(r).toMatchObject({ estado: 'aplicado', id: 'comprimento', de: 480, para: 540 });

    const depois = readFileSync(caminho, 'utf8');
    expect(depois).toContain('comprimento: 540,');
    expect(depois).toContain('o comentário PRECISA sobreviver');
    /* Uma linha muda, e só uma. */
    const linhasAntes = antes.split('\n');
    const linhasDepois = depois.split('\n');
    expect(linhasDepois.length).toBe(linhasAntes.length);
    expect(linhasDepois.filter((linha, i) => linha !== linhasAntes[i])).toHaveLength(1);
  });

  it('arredonda o decimal contínuo do arrasto em vez de gravar ruído', async () => {
    const caminho = novaPeca();
    const r = await escreverParametro(caminho, 'folga', 0.30000000000000004);
    expect(r).toMatchObject({ estado: 'aplicado', para: 0.3 });
    expect(readFileSync(caminho, 'utf8')).toContain('folga: 0.3,');
  });

  it('RECUSA parâmetro que a peça não declara, e não toca no arquivo', async () => {
    const caminho = novaPeca();
    const antes = readFileSync(caminho, 'utf8');
    const r = await escreverParametro(caminho, 'espessura', 3);
    expect(r.estado).toBe('falha-recuperavel');
    expect(r.motivo).toMatch(/não é parâmetro declarado/);
    expect(r.declarados).toContain('comprimento');
    expect(readFileSync(caminho, 'utf8')).toBe(antes);
  });

  it('RECUSA valor que não é número finito, e não toca no arquivo', async () => {
    const caminho = novaPeca();
    const antes = readFileSync(caminho, 'utf8');
    for (const valor of ['540', NaN, Infinity, null]) {
      expect((await escreverParametro(caminho, 'comprimento', valor)).estado).toBe('falha-recuperavel');
    }
    expect(readFileSync(caminho, 'utf8')).toBe(antes);
  });

  it('RECUSA quando o nome aparece em mais de uma linha, em vez de escolher por sorte', async () => {
    const ambigua = RECEITA.replace('export default {', 'export const OUTRA = {\n  raio: 99,\n};\n\nexport default {');
    const caminho = novaPeca('ambigua', ambigua);
    const antes = readFileSync(caminho, 'utf8');
    const r = await escreverParametro(caminho, 'raio', 20);
    expect(r.estado).toBe('falha-recuperavel');
    expect(r.motivo).toMatch(/aparece em 2 linhas/);
    expect(readFileSync(caminho, 'utf8')).toBe(antes);
  });

  it('RECUSA valor que faz a receita parar de executar, e não toca no arquivo', async () => {
    /* O motor NÃO reclama de raio negativo: ele monta o cilindro invertido e
       segue, o que este teste descobriu na primeira escrita. Quem recusa valor
       impossível é a receita, e o ensaio existe para essa recusa acontecer
       ANTES de o arquivo real ser substituído. */
    const comGuarda = RECEITA.replace('  get PASSOS() {\n    return [',
      '  get PASSOS() {\n    if (this.PARAMS.raio <= 0) throw new Error(\'raio precisa ser positivo\');\n    return [');
    const caminho = novaPeca('com-guarda', comGuarda);
    const antes = readFileSync(caminho, 'utf8');

    const r = await escreverParametro(caminho, 'raio', -50);
    expect(r.estado).toBe('falha-recuperavel');
    expect(r.motivo).toMatch(/raio precisa ser positivo/);
    expect(readFileSync(caminho, 'utf8')).toBe(antes);
  });

  it('troca UMA casa da coordenada e deixa a outra em paz', async () => {
    const caminho = novaPeca();
    const r = await escreverParametro(caminho, 'ponto.1', 700);
    expect(r).toMatchObject({ estado: 'aplicado', id: 'ponto.1', de: 716, para: 700 });
    expect(readFileSync(caminho, 'utf8')).toContain('ponto: [-134, 700],');

    const volta = await escreverParametro(caminho, 'ponto.0', -120);
    expect(volta).toMatchObject({ de: -134, para: -120 });
    expect(readFileSync(caminho, 'utf8')).toContain('ponto: [-120, 700],');
  });

  it('RECUSA casa que a coordenada não tem, e não toca no arquivo', async () => {
    const caminho = novaPeca();
    const antes = readFileSync(caminho, 'utf8');
    const r = await escreverParametro(caminho, 'ponto.5', 10);
    expect(r.estado).toBe('falha-recuperavel');
    expect(readFileSync(caminho, 'utf8')).toBe(antes);
  });

  it('RECUSA caminho dentro de objeto aninhado, que o texto não endereça sem ambiguidade', async () => {
    const aninhada = RECEITA.replace('  folga: 0.5,', '  folga: 0.5,\n  secao: { raio: 8 },');
    const caminho = novaPeca('aninhada', aninhada);
    const antes = readFileSync(caminho, 'utf8');
    const r = await escreverParametro(caminho, 'secao.raio', 9);
    expect(r.estado).toBe('falha-recuperavel');
    expect(r.motivo).toMatch(/aninhado em objeto/);
    expect(readFileSync(caminho, 'utf8')).toBe(antes);
  });

  it('não deixa arquivo de ensaio para trás', async () => {
    const caminho = novaPeca();
    await escreverParametro(caminho, 'comprimento', 500);
    await escreverParametro(caminho, 'inexistente', 1);
    const { readdirSync } = await import('node:fs');
    expect(readdirSync(AREA).filter((n) => n.includes('.ensaio-'))).toEqual([]);
  });
});
