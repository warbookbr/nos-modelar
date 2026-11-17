/* analiticas.test.mjs — o gate de continuidade que faltou na fatia 4 (fatia 5 do plano das ferramentas de correção de superfície): toda
 * opção de continuidade deixa o paraboloide, a calota e o toro analíticos de `chapas.mjs` a menos de 0,05 mm, medidos na superfície limite
 * pelo oráculo exato (`analiticas.mjs`). As três são lisas em todo ponto, e nenhuma declaração tem o que corrigir nelas.
 *
 * O LIMITE NÃO É ALCANÇADO HOJE, NEM SEM OPÇÃO. A rede sem declaração nenhuma já sai de 0,39 a 1,11 mm da superfície analítica (0,23 a 0,94 a
 * duas arestas da borda livre), e a G1 a move mais 0,21 a 0,38 mm; a G2 experimental, 7,8 a 20 mm. As três entradas por superfície ficam em
 * `CONHECIDAS` com a medida de 2026-11-17, todas acima de 0,05 mm; a meta do degrau 3 é cada uma caber nele, e então sai de `CONHECIDAS`
 * (o teste falha quando uma passa a caber, para a marca sair). A catraca cobra que nenhuma das três medidas (a distância na chapa inteira, a
 * distância longe da borda e o deslocamento pela opção) piore (2% e 1 micrômetro de folga); melhorar uma delas, a G2 inclusive, não é punido. A causa sem opção não é a continuidade: a régua confere com a rede sem o alisamento do miolo
 * e com o interior cotado (`liso: false, interior: 100`), em que o paraboloide, que o preenchimento de Coons reproduz exato, fica a 0,02 mm
 * a duas arestas da borda. O que sobra é o alisamento do miolo, a regra de borda (que zera a curvatura que atravessa a borda livre) e a cota
 * de peso 1 do interior, e é isso que a energia sobre a gaiola inteira (o degrau 3 do caminho decidido) tem de levar ao limite. */
import { describe, expect, it } from 'vitest';
import { amostrasAnaliticas, DENTRO_DA_BORDA_MM, medirAnaliticas } from './analiticas.mjs';
import { SUPERFICIES_ANALITICAS } from './chapas.mjs';

const LIMITE_MM = 0.05;
const folga = (x) => x * 1.02 + 0.001;

/** As entradas que ainda NÃO cabem no limite de 0,05 mm (todas as nove, hoje): a distância na chapa inteira, a distância a mais de
 *  `DENTRO_DA_BORDA_MM` da borda e o deslocamento pela opção, medidos em 2026-11-17. O limite de 0,05 mm é a meta do degrau 3 do caminho
 *  decidido, e cada entrada sai desta lista quando passa a caber nele (o teste falha para ela sair). Enquanto estão aqui, a catraca só cobra
 *  que nenhuma das três medidas piore; uma opção que melhore uma delas não é punida. */
const CONHECIDAS = Object.freeze({
  'paraboloide nenhuma': { distanciaMm: 0.3929, distanciaDentroMm: 0.2314, deslocamentoMm: 0 },
  'paraboloide G1': { distanciaMm: 0.3975, distanciaDentroMm: 0.147, deslocamentoMm: 0.2055 },
  'paraboloide G2': { distanciaMm: 8.0438, distanciaDentroMm: 8.0438, deslocamentoMm: 7.8188 },
  'calota nenhuma': { distanciaMm: 0.6155, distanciaDentroMm: 0.386, deslocamentoMm: 0 },
  'calota G1': { distanciaMm: 0.633, distanciaDentroMm: 0.4652, deslocamentoMm: 0.219 },
  'calota G2': { distanciaMm: 8.1328, distanciaDentroMm: 8.1328, deslocamentoMm: 8.4895 },
  'toro nenhuma': { distanciaMm: 1.1099, distanciaDentroMm: 0.9384, deslocamentoMm: 0 },
  'toro G1': { distanciaMm: 1.1814, distanciaDentroMm: 1.1814, deslocamentoMm: 0.3803 },
  'toro G2': { distanciaMm: 19.1218, distanciaDentroMm: 19.1218, deslocamentoMm: 19.9963 },
});

describe('o gate de continuidade nas superfícies analíticas', () => {
  it('a régua: a distância é zero nos pontos da função, e a rede sem alisamento e com o interior cotado leva o paraboloide a 0,05 mm', () => {
    for (const S of Object.values(SUPERFICIES_ANALITICAS)) {
      for (const a of [0, 0.3, 0.5, 1]) for (const b of [0, 0.7, 1]) expect(Math.abs(S.distancia(S.ponto(a, b)))).toBeLessThan(1e-9);
    }
    const S = SUPERFICIES_ANALITICAS.paraboloide;
    const { pontos } = amostrasAnaliticas('paraboloide', null, { liso: false, interior: 100 });
    const dentro = pontos.filter((p) => S.aBorda(p) >= DENTRO_DA_BORDA_MM).map((p) => Math.abs(S.distancia(p)));
    expect(dentro.length).toBeGreaterThan(1000);
    expect(Math.max(...dentro)).toBeLessThan(LIMITE_MM);
  });

  it('toda opção de continuidade a menos de 0,05 mm, ou conhecida (acima dele) e sem piorar nenhuma medida', () => {
    const medidas = medirAnaliticas();
    expect(medidas).toHaveLength(9);
    for (const m of medidas) {
      const chave = `${m.superficie} ${m.continuidade ?? 'nenhuma'}`;
      const conhecida = CONHECIDAS[chave];
      if (!conhecida) { expect(m.distanciaMm, chave).toBeLessThan(LIMITE_MM); continue; }
      expect(m.distanciaMm, `${chave} passou a caber no limite: tire a marca de CONHECIDAS`).toBeGreaterThanOrEqual(LIMITE_MM);
      expect(m.distanciaMm, `${chave} piorou a distância na chapa inteira`).toBeLessThanOrEqual(folga(conhecida.distanciaMm));
      expect(m.distanciaDentroMm, `${chave} piorou a distância longe da borda`).toBeLessThanOrEqual(folga(conhecida.distanciaDentroMm));
      expect(m.deslocamentoMm, `${chave} move mais a superfície`).toBeLessThanOrEqual(folga(conhecida.deslocamentoMm));
    }
    const medidasPorChave = new Set(medidas.map((m) => `${m.superficie} ${m.continuidade ?? 'nenhuma'}`));
    for (const chave of Object.keys(CONHECIDAS)) expect(medidasPorChave.has(chave), `${chave} não é uma entrada medida`).toBe(true);
  });
});
