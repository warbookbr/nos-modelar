/* O --proximo do esboço só gera o brief do crítico depois das medidas do plano aprovadas, as em milímetro e as razões.
   O brief do objeto inteiro sai quando o Portão da Conferência passa e a conclusão espera o crítico; com uma medida fora da
   tolerância, ou uma razão fora da faixa, o --proximo recusa, não devolve o pedido de brief e diz que o crítico só vem depois
   das medidas. Corrigida a medida, o mesmo --proximo pede o brief. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { avancar, criarEstado } from '../../modulos/esboco/src/condutor.js';
import { condutorArquivo } from './esboco.mjs';

const caixa = (id, centro, l = 20, a = 20, p = 20) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro });
const medida = (nome, valor, mede) => ({ nome, valor, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede });
const razao = (faixa) => ({ nome: 'alturaPeloComprimento', origem: 'ficha', mede: { razao: ['alturaTotal', 'larguraTotal'], faixa } });

/* quatro caixas em fila: 20 mm de altura por 80 de comprimento (razão 0,25), nível médio (a Maquete e a Conferência da maquete) */
const fila = ({ altura = 20, faixa = [0.2, 0.3] } = {}) => ({
  contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 },
  plano: {
    nivel: 'medio',
    medidas: [medida('altura', 20, 'alturaTotal'), medida('largura', 80, 'larguraTotal'), medida('l2', 80, 'larguraTotal'), razao(faixa)],
    contrato: { tocam: [['a', 'b']] },
  },
  opcoes: [{ titulo: 'T', formas: [caixa('a', [10, altura / 2, 0], 20, altura), caixa('b', [30, altura / 2, 0], 20, altura), caixa('c', [50, altura / 2, 0], 20, altura), caixa('d', [70, altura / 2, 0], 20, altura)] }],
});

function naConferencia(esboco) {
  const dir = mkdtempSync(join(tmpdir(), 'proximo-'));
  const arq = join(dir, 'f.esboco.json');
  writeFileSync(arq, JSON.stringify(esboco));
  const maquete = condutorArquivo(arq, { proximo: true });
  expect(maquete.estado.atual).toBe('conferencia-da-maquete');
  return arq;
}
const regravar = (arq, esboco) => writeFileSync(arq, JSON.stringify(esboco));

describe('--proximo só pede o brief do crítico depois das medidas aprovadas', () => {
  it('com as medidas e a razão aprovadas, o Portão passa e o --proximo pede o brief do objeto, dizendo quantas medidas', () => {
    const arq = naConferencia(fila());
    const r = condutorArquivo(arq, { proximo: true });
    expect(r.objetoDe).toBe(true);
    expect(r.codigo).toBe(1);
    expect(r.texto).toContain('o Portão de Conferência da maquete passa (4 medidas do plano dentro da tolerância)');
    expect(r.texto).toContain('a conclusão espera o veredito do crítico sobre o objeto inteiro (rodada 1)');
  });

  it('com uma medida em milímetro fora da tolerância o --proximo recusa, sem brief e dizendo que o crítico só vem depois das medidas', () => {
    const arq = naConferencia(fila());
    const quebrado = fila();
    quebrado.plano.medidas[1] = medida('largura', 95, 'larguraTotal');
    regravar(arq, quebrado);
    const r = condutorArquivo(arq, { proximo: true });
    expect(r.objetoDe).toBeFalsy();
    expect(r.pedeCritico).toBeUndefined();
    expect(r.codigo).toBe(1);
    expect(r.estado.atual).toBe('conferencia-da-maquete');
    expect(r.texto).toContain('avanço recusado: o Portão de Conferência da maquete não passa; falta:');
    expect(r.texto).toMatch(/medida "largura" fora da tolerância/);
    expect(r.texto).toContain('o brief do crítico não sai: ele só é gerado depois de as medidas do plano estarem aprovadas');
    expect(r.texto).not.toContain('a conclusão espera o veredito');
    /* corrigida a medida, o mesmo comando pede o brief */
    regravar(arq, fila());
    expect(condutorArquivo(arq, { proximo: true }).objetoDe).toBe(true);
  });

  it('com a razão fora da faixa o --proximo recusa do mesmo jeito, e a mensagem traz o valor medido e a faixa', () => {
    const arq = naConferencia(fila());
    regravar(arq, fila({ faixa: [0.3, 0.4] }));
    const r = condutorArquivo(arq, { proximo: true });
    expect(r.objetoDe).toBeFalsy();
    expect(r.texto).toContain('razão "alturaPeloComprimento" fora da faixa');
    /* o Condutor lê as medidas na blocagem do andaime compilado (o nível zero), e a mensagem diz quem mediu */
    expect(r.texto).toContain('a blocagem do andaime mede 0,25 (20 mm sobre 80 mm) e o plano declara de 0,3 a 0,4');
    expect(r.texto).toContain('o brief do crítico não sai');
    regravar(arq, fila());
    expect(condutorArquivo(arq, { proximo: true }).objetoDe).toBe(true);
  });

  it('a recusa vem do Portão: o estado não anda e nenhum veredito é pedido', () => {
    const quebrado = fila({ faixa: [0.3, 0.4] });
    const antes = criarEstado(fila(), 'f.esboco.json');
    const r = avancar(quebrado, avancar(fila(), antes).estado);
    expect(r).toMatchObject({ ok: false });
    expect(r.pedeCritico).toBeUndefined();
    expect(r.portao.divergencias.map((d) => d.classe)).toEqual(['medida']);
    expect(r.estado.atual).toBe('conferencia-da-maquete');
  });

  it('uma razão bem abaixo da faixa trava do mesmo jeito', () => {
    const arq = naConferencia(fila());
    regravar(arq, fila({ faixa: [0.9, 1] }));
    const r = condutorArquivo(arq, { proximo: true });
    expect(r.objetoDe).toBeFalsy();
    expect(r.texto).toContain('abaixo da faixa por 0,65');
  });
});
