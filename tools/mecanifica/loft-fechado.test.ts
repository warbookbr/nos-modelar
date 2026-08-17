/* loft-fechado.test.ts — caminho que volta em si e fecha de verdade.

   O `lathe` fechado resolveu a seção que dá a volta. Este é o outro laço: o
   CAMINHO que volta em si — mangueira em anel, aro fechado, tubo em laço.

   POR QUE ESTE CASO É MAIS DIFÍCIL QUE O DO LATHE. No `loft`, o quadro que
   orienta cada anel é TRANSPORTADO ao longo do caminho, e a ponta de um caminho
   aberto só conhece o segmento que chega nela. Num laço, a ponta é um ponto
   interior como qualquer outro: a tangente ali é a média do segmento que fecha
   com o que abre. Sem isso, os dois anéis da emenda se encontram girados —
   medido, no anel de 12 seções, em exatamente os 30° de um segmento.

   Por isso a detecção do fechamento acontece ANTES do transporte, e não depois:
   ela muda a tangente, não só a contagem de vértices.

   E o giro residual continua sendo medido. Se sobrar torção, o passo GRITA em
   vez de entregar uma superfície fechada TORCIDA — que passaria em contagem de
   vértices, em contagem de faces e em foto. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';

const LADOS = 8;
const RAIO_ANEL = 0.2;
const RAIO_TUBO = 0.03;
const N = 12;

/* anel de mangueira: caminho circular no plano XZ. O autor fecha repetindo a
   PRIMEIRA seção — exatamente, porque o fechamento não é por limiar. */
function anel(fecha: boolean) {
  const secoes = [];
  for (let k = 0; k < N; k++) {
    const t = (k / N) * 2 * Math.PI;
    secoes.push({ pos: [Math.cos(t) * RAIO_ANEL, 0, Math.sin(t) * RAIO_ANEL], raio: RAIO_TUBO });
  }
  if (fecha) secoes.push(secoes[0]);
  return nucleo([['loft', { origemId: 1, lados: LADOS, secoes }]], {});
}

function arestasIrregulares(malha: any): number {
  const uso = new Map<string, number>();
  for (const f of malha.F.values()) {
    for (let k = 0; k < f.vs.length; k++) {
      const a = f.vs[k];
      const b = f.vs[(k + 1) % f.vs.length];
      const chave = a < b ? `${a}-${b}` : `${b}-${a}`;
      uso.set(chave, (uso.get(chave) ?? 0) + 1);
    }
  }
  return [...uso.values()].filter((n) => n !== 2).length;
}

const gritos = (malha: any) => (malha.orfaos ?? []).map((o: any) => o.motivo).join(' | ');

describe('caminho fechado produz tubo fechado', () => {
  it('toda aresta serve exatamente duas faces', () => {
    const malha = anel(true);
    expect(gritos(malha)).toBe('');
    expect(arestasIrregulares(malha)).toBe(0);
  });

  it('o caminho aberto continua com as duas bocas', () => {
    expect(arestasIrregulares(anel(false))).toBeGreaterThan(0);
  });

  it('a seção repetida não gasta anel novo', () => {
    const fechado = anel(true);
    expect(fechado.V.size).toBe(N * LADOS);
    /* e ganha a faixa que liga a última seção de volta à primeira */
    expect(fechado.F.size).toBe(N * LADOS);
    expect(fechado.F.size).toBe(anel(false).F.size + LADOS);
  });

  it('é determinístico', () => {
    const chave = (m: any) => JSON.stringify([...m.V.entries()].sort((a: any, b: any) => a[0] - b[0]));
    expect(chave(anel(true))).toBe(chave(anel(true)));
  });
});

describe('a torção não passa calada', () => {
  /* A prova que separa "fechou" de "fechou certo". Uma superfície fechada mas
     torcida tem a MESMA contagem de vértices, a MESMA contagem de faces e uma
     foto plausível — só a medida do quadro a distingue. */
  it('caminho que fecha com o quadro girado GRITA em vez de costurar torto', () => {
    /* caminho em L que volta ao começo: o quadro não retorna alinhado. */
    const p = [[0, 0, 0], [0.2, 0, 0], [0.2, 0, 0.2], [0, 0.1, 0.2]];
    const secoes = p.map((pos) => ({ pos, raio: 0.02 }));
    secoes.push(secoes[0]);
    const malha = nucleo([['loft', { origemId: 1, lados: LADOS, secoes }]], {});
    expect(gritos(malha)).toMatch(/volta girado|fecharia torcida/);
    /* fail-closed: nada foi construído */
    expect(malha.V.size).toBe(0);
  });
});

describe('o que já existia continua igual', () => {
  it('fechamento é exato: seção quase igual não fecha', () => {
    const secoes = [];
    for (let k = 0; k < N; k++) {
      const t = (k / N) * 2 * Math.PI;
      secoes.push({ pos: [Math.cos(t) * RAIO_ANEL, 0, Math.sin(t) * RAIO_ANEL], raio: RAIO_TUBO });
    }
    secoes.push({ pos: [RAIO_ANEL, 1e-12, 0], raio: RAIO_TUBO });
    const malha = nucleo([['loft', { origemId: 1, lados: LADOS, secoes }]], {});
    expect(malha.V.size).toBe((N + 1) * LADOS);
  });

  it('tubo aberto comum não é afetado', () => {
    const malha = nucleo([['loft', {
      origemId: 1, lados: LADOS,
      secoes: [{ pos: [0, 0, 0], raio: 0.02 }, { pos: [0, 0.1, 0], raio: 0.02 }, { pos: [0, 0.2, 0], raio: 0.03 }],
    }]], {});
    expect(gritos(malha)).toBe('');
    expect(malha.V.size).toBe(3 * LADOS);
  });
});
