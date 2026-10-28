/* O recorte de envelope igual na blocagem do nível zero: a forma recortada vai inteira ao andaime quando o recorte não muda o
   envelope, e só fica fora quando o recorte tira da silhueta além de `MUDANCA_MAXIMA_DA_SILHUETA_POR_RECORTE`. Um cortador que
   vara a forma abre um vão na vista ao longo dele, e o desenho das formas o deixa aberto; um cortador interno, ou coberto por outra
   forma, não muda a silhueta. A origem do caso é um caminhão importado de OpenSCAD, cujo chassi tinha arcos de
   roda que o atravessavam; o objeto saiu do repositório e os casos abaixo o reproduzem com caixas. */
import { describe, expect, it } from 'vitest';
import { blocagemDaOpcao, MUDANCA_MAXIMA_DA_SILHUETA_POR_RECORTE } from './esboco-blocagem.mjs';
import { recortesAbertos } from './esboco-blocagem-recorte.mjs';

const caixa = (id, centro, [l, a, p], extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
/* o bloco de 400 x 100 x 300 (x, y, z) com um cortador de 100 x 60 e a profundidade dada, e uma caixa ao lado que dá ao conjunto
   uma forma que sobra quando o bloco sai */
const comCortador = (profundidadeDoCortador, extra = []) => ({
  opcoes: [{
    titulo: 'T',
    formas: [
      caixa('bloco', [0, 0, 0], [400, 100, 300], { subtrai: ['vao'] }),
      caixa('vao', [0, 0, 0], [100, 60, profundidadeDoCortador], { cortador: true }),
      caixa('anexo', [400, 0, 0], [100, 100, 100]),
      ...extra,
    ],
  }],
});

describe('o recorte que abre um vão na silhueta', () => {
  it('o cortador que vara o bloco deixa o envelope igual e tira o vão da vista frontal: o bloco fica sem equivalente, com o motivo', () => {
    const r = blocagemDaOpcao(comCortador(400));
    expect(r.traducao.naoTraduzidas.map((n) => n.id)).toEqual(['bloco']);
    expect(r.traducao.naoTraduzidas[0].motivo).toMatch(/o recorte por vao abre um vão na vista frontal, em 1[12]\.\d+% da silhueta da blocagem/);
    expect(r.traducao.naoTraduzidas[0].motivo).toContain(`o limite é ${MUDANCA_MAXIMA_DA_SILHUETA_POR_RECORTE * 100}%`);
    expect(r.traducao.andaime.volumes.map((v) => v.id)).toEqual(['anexo']);
  });

  it('a fração medida é a área do vão sobre a da silhueta da blocagem (6000 de 50000 mm2 na frontal) e só passa do limite na vista ao longo do cortador', () => {
    const bruto = comCortador(400);
    const b = blocagemDaOpcao(bruto);
    /* a tradução sem a recusa, em que o bloco entra inteiro: a medida lê a perda `recorte` dele */
    const inteira = { ...b.traducao, perdas: [{ id: 'bloco', perdido: [{ codigo: 'recorte' }] }], tabela: { bloco: 'bloco', anexo: 'anexo' }, naoTraduzidas: [] };
    const abertos = recortesAbertos({ bruto, numero: 1, traducao: inteira, blocagem: { malha: { vertices: [[-200, -50, -150], [450, 50, 150]] } } });
    /* nas outras vistas só sobra o ruído de borda de pixel, abaixo do limite */
    const acima = abertos.filter((a) => a.fracao > MUDANCA_MAXIMA_DA_SILHUETA_POR_RECORTE);
    expect(acima.map((a) => a.vista)).toEqual(['frontal']);
    expect(acima[0].fracao).toBeGreaterThan(0.11);
    expect(acima[0].fracao).toBeLessThan(0.125);
  });

  it('o cortador interno, que não chega a nenhuma face, deixa o bloco no andaime', () => {
    const r = blocagemDaOpcao(comCortador(100));
    expect(r.traducao.naoTraduzidas).toEqual([]);
    expect(r.traducao.andaime.volumes.map((v) => v.id)).toEqual(['anexo', 'bloco']);
    expect(r.traducao.perdas.find((p) => p.id === 'bloco').aproximacao).toBe('recorte-ignorado');
  });

  it('o vão que outra forma cobre por trás não conta: a tampa atrás do bloco mantém o bloco no andaime', () => {
    const r = blocagemDaOpcao(comCortador(400, [caixa('tampa', [0, 0, -200], [200, 200, 50])]));
    expect(r.traducao.naoTraduzidas).toEqual([]);
    expect(r.traducao.andaime.volumes.map((v) => v.id)).toEqual(['anexo', 'bloco', 'tampa']);
  });
});
