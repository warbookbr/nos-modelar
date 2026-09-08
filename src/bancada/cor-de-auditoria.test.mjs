/* A paleta da auditoria e a conferência dela.
 *
 * Existe porque o crítico visual cego — o instrumento em que o laço confia para
 * julgar forma — leu duas partes da bicicleta como uma peça só e reportou como
 * achado. As cores eram `#eb8ec5` e `#dd8eeb`, a 0,079 de distância. Duas das
 * cinco críticas daquela rodada eram falsas, e as duas vinham da cor. */
import { describe, expect, it } from 'vitest';
import {
  LIMIAR_DISTINCAO,
  distanciaDeCor,
  hexDeAuditoria,
  hslDeAuditoria,
  paresIndistinguiveis,
} from './cor-de-auditoria.js';

const legendaDe = (n) => Object.fromEntries(
  Array.from({ length: n }, (_, i) => [`parte${i}`, hexDeAuditoria(i)]),
);

describe('paleta de auditoria', () => {
  it('prevê a cor que a bancada realmente pinta, não a conta crua de HSL', async () => {
    /* Three trata o resultado de setHSL como linear e emite sRGB. Sem esta
       transferência, calibrar a paleta fora do navegador calibraria uma cor que
       ninguém vê — e o limiar seria ajustado contra o par errado. */
    const THREE = await import('three');
    for (let i = 0; i < 24; i++) {
      const { h, s, l } = hslDeAuditoria(i);
      const three = `#${new THREE.Color().setHSL(h, s, l).getHexString()}`;
      expect(hexDeAuditoria(i), `índice ${i}`).toBe(three);
    }
  });

  it('a mesma parte recebe a mesma cor, não importa quantas partes existam', () => {
    /* É a promessa que torna duas imagens da mesma peça comparáveis, e é
       exatamente ela que impede uma paleta escolhida em função do total. */
    expect(hexDeAuditoria(3)).toBe(hexDeAuditoria(3));
    expect(legendaDe(24).parte3).toBe(legendaDe(40).parte3);
  });

  it('separa índices vizinhos por valor, não só por matiz', () => {
    for (let i = 0; i < 23; i++) {
      expect(distanciaDeCor(hexDeAuditoria(i), hexDeAuditoria(i + 1)), `${i}→${i + 1}`)
        .toBeGreaterThan(LIMIAR_DISTINCAO);
    }
  });

  it('supera o par que enganou o crítico', () => {
    const parCulpado = distanciaDeCor('#eb8ec5', '#dd8eeb');
    expect(parCulpado).toBeCloseTo(0.079, 2);
    expect(parCulpado).toBeLessThan(LIMIAR_DISTINCAO);

    const pares = paresIndistinguiveis(legendaDe(24));
    const pior = pares.length ? pares[0].distancia : 1;
    expect(pior).toBeGreaterThan(parCulpado);
  });

  it('em 24 partes sobram poucos pares confundíveis — e ela os NOMEIA', () => {
    /* O número não é zero e não vai ser: cor estável por índice é incompatível
       com separação garantida quando o total cresce. O contrato desta ferramenta
       não é "separo sempre", é "digo o que não separei". Se a paleta piorar,
       este teto acusa. */
    const pares = paresIndistinguiveis(legendaDe(24));
    expect(pares.length).toBeLessThanOrEqual(6);
    for (const { a, b, distancia } of pares) {
      expect(a).not.toBe(b);
      expect(distancia).toBeLessThan(LIMIAR_DISTINCAO);
    }
    /* Ordenado do mais parecido ao menos: quem lê resolve o pior primeiro. */
    const distancias = pares.map((p) => p.distancia);
    expect([...distancias].sort((x, y) => x - y)).toEqual(distancias);
  });

  it('confere a legenda que foi mostrada, não uma re-derivação', () => {
    /* Se alguém pintar à mão, ou a paleta mudar, a conferência continua valendo:
       ela recebe nome→cor e não sabe de onde a cor veio. */
    const pares = paresIndistinguiveis({ a: '#eb8ec5', b: '#dd8eeb', c: '#101010' });
    expect(pares).toHaveLength(1);
    expect([pares[0].a, pares[0].b].sort()).toEqual(['a', 'b']);
  });

  it('cor ilegível não vira distância inventada', () => {
    expect(distanciaDeCor('#zzzzzz', '#101010')).toBeNull();
    expect(paresIndistinguiveis({ a: 'vermelho', b: '#101010' })).toEqual([]);
  });
});
