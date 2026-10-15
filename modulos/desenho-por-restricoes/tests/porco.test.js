/* porco.test.js — o desenho de uma folha de instruções escritas (o exercício 1 das instruções de trabalho padronizado), que dá um porco.
   `porco/pedido.txt` guarda o pedido (as 13 instruções, as leituras que a pessoa aceitou e as escolhas do roteiro) e
   `porco/porco.desenho.json` o roteiro, o desenho escrito a partir do pedido: as linhas da grade são referências, as letras são barras,
   os arcos são partes `arco`, e cada medida e cada encontro das instruções é uma relação de nome "Instrução N: ...". O teste resolve o
   roteiro com o módulo e confere, nos pontos resolvidos, cada instrução que tem medida ou encontro. Não grava nem compara imagem, e
   quem aprova a forma do porco é a pessoa.

   O que o formato não expressa, e este teste confere depois de resolver: o lado para onde um arco abre (o planegcs só tem o raio, e o
   ramo vem do chute do centro), "sem encostá-la" e "dentro do quadrado" (desigualdades), o arco aberto (o formato fecha o arco pela
   corda ou pelo centro, então os contornos trazem a corda que a folha não tem), a letra como letra (o "M", o "W" e o "e" são barras e
   um arco, e que se leiam como letra é julgamento da pessoa), o ponto (é um círculo pequeno) e o meio do caminho (são duas relações,
   o ponto sobre o segmento e equidistante das pontas). "Aproximadamente" vira o valor exato do roteiro. */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { desenhar, validarDescricao } from '../src/index.js';

const fixture = (nome) => readFileSync(new URL(`./porco/${nome}`, import.meta.url), 'utf8');
const pedido = fixture('pedido.txt');
const roteiro = JSON.parse(fixture('porco.desenho.json'));

/* A leitura da pessoa: quadrados de 50 mm. A fileira 1 é a de cima e a coluna 1 a da esquerda; h cresce para a direita e v para cima. */
const CASA = 50;
const CM = 10;
const centroDaCasa = (fileira, coluna) => [(coluna - 0.5) * CASA, (3 - fileira + 0.5) * CASA];
const caixaDaCasa = (fileira, coluna) => ({ hMin: (coluna - 1) * CASA, hMax: coluna * CASA, vMin: (3 - fileira) * CASA, vMax: (4 - fileira) * CASA });

const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const menos = (a, b) => [a[0] - b[0], a[1] - b[1]];
const escalar = (a, b) => a[0] * b[0] + a[1] * b[1];
const vetorial = (a, b) => a[0] * b[1] - a[1] * b[0];
const graus = (rad) => (rad * 180) / Math.PI;
const volta = (g) => ((g % 360) + 360) % 360;
const FOLGA = 0.01;

let relatorio; let contornos; let P; let partes;

const esperarPonto = (p, [h, v]) => {
  expect(p[0]).toBeCloseTo(h, 2);
  expect(p[1]).toBeCloseTo(v, 2);
};
const noMesmoLugar = (p, q) => dist(p, q) < FOLGA;
/* O arco com as medidas que a leitura precisa. O centro fica do lado para onde o arco abre quando ele é menor que meia volta
   (`menorQueMeiaVolta`: o centro à esquerda do início ao fim, que é o sentido do arco), e o ápice é o ponto do meio do arco. */
function arco(nome) {
  const { centro, inicio, fim } = roteiro.partes[nome].arco;
  const c = P[centro]; const a = P[inicio]; const b = P[fim];
  const m = meio(a, b);
  const raio = dist(c, a);
  const corda = dist(a, b);
  const apice = [c[0] + ((m[0] - c[0]) / dist(c, m)) * raio, c[1] + ((m[1] - c[1]) / dist(c, m)) * raio];
  return {
    a, b, c, m, raio, corda, apice,
    menorQueMeiaVolta: vetorial(menos(b, a), menos(c, a)) > 0,
    flecha: raio - dist(c, m),
    comprimento: raio * 2 * Math.asin(corda / (2 * raio)),
    concavidade: menos(c, m),
    abaulamento: menos(apice, m),
  };
}
const ligaEntre = (x, p, q) => (noMesmoLugar(x.a, p) && noMesmoLugar(x.b, q)) || (noMesmoLugar(x.a, q) && noMesmoLugar(x.b, p));
const dentroDaCasa = (nome, fileira, coluna) => {
  const caixa = caixaDaCasa(fileira, coluna); const m = partes[nome];
  expect(m.hMin, `${nome}: hMin`).toBeGreaterThanOrEqual(caixa.hMin - FOLGA);
  expect(m.hMax, `${nome}: hMax`).toBeLessThanOrEqual(caixa.hMax + FOLGA);
  expect(m.vMin, `${nome}: vMin`).toBeGreaterThanOrEqual(caixa.vMin - FOLGA);
  expect(m.vMax, `${nome}: vMax`).toBeLessThanOrEqual(caixa.vMax + FOLGA);
};
/* O arco abre para o quadrado citado e abaula para longe dele. */
const abreParaACasa = (x, fileira, coluna) => {
  const alvo = menos(centroDaCasa(fileira, coluna), x.m);
  expect(x.menorQueMeiaVolta).toBe(true);
  expect(escalar(x.concavidade, alvo)).toBeGreaterThan(0);
  expect(escalar(x.abaulamento, alvo)).toBeLessThan(0);
};
const poligonal = (nomes) => nomes.map((n) => roteiro.partes[n].barra);

beforeAll(async () => {
  ({ relatorio, contornos } = await desenhar(structuredClone(roteiro)));
  P = relatorio.medidas.pontos;
  partes = relatorio.medidas.partes;
});

describe('o pedido e o roteiro', () => {
  it('o pedido guarda as 13 instruções, na ordem, e as 7 leituras que a pessoa aceitou', () => {
    const instrucoes = [...pedido.matchAll(/^(\d+)\. (.+)$/gm)];
    expect(instrucoes.map((i) => Number(i[1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    const leituras = pedido.split('Leituras de um primeiro desenho')[1].split('O desenho resultante')[0].match(/^- /gm);
    expect(leituras).toHaveLength(7);
    expect(pedido).toMatch(/Suporte: uma grade de 9 quadrados iguais, 3 linhas de 3\./);
  });

  it('o roteiro resolve com zero grau de liberdade, sem conflito, sem redundância, sem aviso e sem parte escondida', () => {
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.grausDeLiberdade).toBe(0);
    expect(relatorio.conflitantes).toEqual([]);
    expect(relatorio.redundantes).toEqual([]);
    expect(relatorio.desvios).toEqual([]);
    expect(relatorio.avisos).toEqual([]);
    expect(relatorio.ocultas).toEqual([]);
    expect(Object.keys(contornos.regioes).sort()).toEqual(Object.keys(roteiro.partes).sort());
  });

  it('cada relação do roteiro cita o número de uma instrução do pedido, e cada instrução tem ao menos uma relação', () => {
    const numeros = roteiro.relacoes.map((r) => Number(r.nome.match(/^Instrução (\d+): /)?.[1]));
    expect(numeros.every((n) => n >= 1 && n <= 13)).toBe(true);
    expect([...new Set(numeros)].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('a grade são oito referências, as linhas e as divisórias de 50 em 50 mm, de 0 a 150', () => {
    const { modelo } = validarDescricao(roteiro);
    const valores = (reta) => Object.values(modelo.referencias).filter((r) => r.reta === reta).map((r) => r.valor).sort((x, y) => x - y);
    expect(valores('horizontal')).toEqual([0, CASA, 2 * CASA, 3 * CASA]);
    expect(valores('vertical')).toEqual([0, CASA, 2 * CASA, 3 * CASA]);
  });

  it('o mesmo roteiro dá os mesmos pontos e os mesmos contornos a cada execução', async () => {
    const outra = await desenhar(structuredClone(roteiro));
    expect(outra.relatorio.medidas).toEqual(relatorio.medidas);
    expect(JSON.stringify(outra.contornos)).toBe(JSON.stringify(contornos));
  });
});

describe('instrução 1: o "M" de 1 cm entre o primeiro e o segundo quadrado superior', () => {
  it('o vértice do meio toca a linha entre as fileiras 1 e 2 e fica na divisória das colunas 1 e 2', () => {
    esperarPonto(P.mVertice, [CASA, 2 * CASA]);
  });

  it('a metade da letra fica em cada quadrado, seguindo a divisória: 5 mm de cada lado do vértice', () => {
    const hs = ['mPeEsq', 'mTopoEsq', 'mVertice', 'mTopoDir', 'mPeDir'].map((n) => P[n][0]);
    expect(CASA - Math.min(...hs)).toBeCloseTo(CM / 2, 2);
    expect(Math.max(...hs) - CASA).toBeCloseTo(CM / 2, 2);
    expect(Math.min(...hs)).toBeLessThan(CASA);
    expect(Math.max(...hs)).toBeGreaterThan(CASA);
  });

  it('tem 1 cm de altura, em pé sobre a linha: os pés na linha e os topos 10 mm acima', () => {
    for (const n of ['mPeEsq', 'mPeDir']) expect(P[n][1]).toBeCloseTo(2 * CASA, 2);
    for (const n of ['mTopoEsq', 'mTopoDir']) expect(P[n][1]).toBeCloseTo(2 * CASA + CM, 2);
    esperarPonto(P.mTopoEsq, [CASA - CM / 2, 2 * CASA + CM]);
    esperarPonto(P.mTopoDir, [CASA + CM / 2, 2 * CASA + CM]);
  });

  it('fica dentro da fileira de cima e é a poligonal pé, topo, vértice, topo, pé, em quatro traços ligados', () => {
    for (const n of ['mPeEsq', 'mTopoEsq', 'mVertice', 'mTopoDir', 'mPeDir']) {
      expect(P[n][1]).toBeGreaterThanOrEqual(2 * CASA - FOLGA);
      expect(P[n][1]).toBeLessThanOrEqual(3 * CASA);
    }
    expect(poligonal(['mHasteEsq', 'mPernaEsq', 'mPernaDir', 'mHasteDir'])).toEqual([
      ['mPeEsq', 'mTopoEsq'], ['mTopoEsq', 'mVertice'], ['mVertice', 'mTopoDir'], ['mTopoDir', 'mPeDir'],
    ]);
  });
});

describe.each([
  [2, 'o quadrado inferior esquerdo e o do meio', 'we', CASA],
  [3, 'o quadrado inferior do meio e o da direita', 'wd', 2 * CASA],
])('instrução %i: o "W" de 1 cm entre %s', (numero, quadrados, prefixo, divisoria) => {
  const ponto = (sufixo) => P[`${prefixo}${sufixo}`];

  it(`o meio fica na divisória e metade da letra em cada quadrado (${quadrados}): 5 mm de cada lado`, () => {
    expect(ponto('Meio')[0]).toBeCloseTo(divisoria, 2);
    expect(ponto('PontaEsq')[0]).toBeCloseTo(divisoria - CM / 2, 2);
    expect(ponto('PontaDir')[0]).toBeCloseTo(divisoria + CM / 2, 2);
  });

  it('a parte de cima acompanha a linha superior da fileira de baixo: as duas pontas e o pico do meio a 50 mm do chão', () => {
    for (const n of ['PontaEsq', 'Meio', 'PontaDir']) expect(ponto(n)[1]).toBeCloseTo(CASA, 2);
  });

  it('tem 1 cm de altura, com os dois vãos 10 mm abaixo da linha, e fica dentro da fileira de baixo', () => {
    for (const n of ['VaoEsq', 'VaoDir']) expect(ponto(n)[1]).toBeCloseTo(CASA - CM, 2);
    for (const n of ['PontaEsq', 'VaoEsq', 'Meio', 'VaoDir', 'PontaDir']) {
      expect(ponto(n)[1]).toBeLessThanOrEqual(CASA + FOLGA);
      expect(ponto(n)[1]).toBeGreaterThanOrEqual(0);
    }
  });

  it('é a poligonal ponta, vão, pico, vão, ponta, em quatro traços ligados, com o vão no quarto da largura', () => {
    const letra = ['PontaEsq', 'VaoEsq', 'Meio', 'VaoDir', 'PontaDir'].map((n) => `${prefixo}${n}`);
    expect(poligonal([1, 2, 3, 4].map((k) => `${prefixo}Traco${k}`))).toEqual([[letra[0], letra[1]], [letra[1], letra[2]], [letra[2], letra[3]], [letra[3], letra[4]]]);
    expect(ponto('VaoEsq')[0]).toBeCloseTo(divisoria - CM / 4, 2);
    expect(ponto('VaoDir')[0]).toBeCloseTo(divisoria + CM / 4, 2);
  });

  it(numero === 2 ? 'começa no primeiro quadrado e termina no quadrado ao lado' : 'metade no quadrado ao lado e metade no próprio quadrado', () => {
    expect(ponto('PontaEsq')[0]).toBeLessThan(divisoria);
    expect(ponto('PontaDir')[0]).toBeGreaterThan(divisoria);
    expect(ponto('PontaEsq')[0]).toBeGreaterThan(divisoria - CASA);
    expect(ponto('PontaDir')[0]).toBeLessThan(divisoria + CASA);
  });
});

describe('instrução 4: o arco das costas, do pé direito do "M" ao canto do quadrado superior central', () => {
  it('liga o pé direito do "M" ao canto inferior direito do quadrado superior central', () => {
    const costas = arco('costas');
    esperarPonto(P.costasNoCanto, [2 * CASA, 2 * CASA]);
    expect(ligaEntre(costas, P.mPeDir, [2 * CASA, 2 * CASA])).toBe(true);
  });

  it('sobe em direção à linha superior sem encostá-la, e fica dentro do quadrado superior central', () => {
    const costas = arco('costas');
    expect(costas.menorQueMeiaVolta).toBe(true);
    expect(costas.abaulamento[1]).toBeGreaterThan(0);
    expect(partes.costas.vMax).toBeGreaterThan(2 * CASA);
    expect(partes.costas.vMax).toBeLessThan(3 * CASA);
    dentroDaCasa('costas', 1, 2);
  });
});

describe('instrução 5: o arco do traseiro, do final do arco anterior ao final do "W" da direita', () => {
  it('parte do final do arco das costas e termina na ponta direita do "W" do quadrado inferior direito', () => {
    const traseiro = arco('traseiro');
    expect(noMesmoLugar(P.traseiroNoCanto, P.costasNoCanto)).toBe(true);
    expect(ligaEntre(traseiro, P.costasNoCanto, P.wdPontaDir)).toBe(true);
    esperarPonto(P.wdPontaDir, [2 * CASA + CM / 2, CASA]);
  });

  it('abaula para a direita, dentro do quadrado central direito', () => {
    const traseiro = arco('traseiro');
    expect(traseiro.menorQueMeiaVolta).toBe(true);
    expect(traseiro.abaulamento[0]).toBeGreaterThan(0);
    expect(partes.traseiro.hMax).toBeGreaterThan(Math.max(traseiro.a[0], traseiro.b[0]));
    dentroDaCasa('traseiro', 2, 3);
  });
});

describe('instrução 6: o arco da barriga, do final do "W" da esquerda ao início do "W" da direita', () => {
  it('liga a ponta direita do "W" do quadrado inferior esquerdo à ponta esquerda do "W" da direita', () => {
    expect(ligaEntre(arco('barriga'), P.wePontaDir, P.wdPontaEsq)).toBe(true);
    esperarPonto(P.wePontaDir, [CASA + CM / 2, CASA]);
    esperarPonto(P.wdPontaEsq, [2 * CASA - CM / 2, CASA]);
  });

  it('tem inclinação em direção à parte inferior: o meio do arco fica abaixo das pontas, ainda na fileira de baixo', () => {
    const barriga = arco('barriga');
    expect(barriga.menorQueMeiaVolta).toBe(true);
    expect(barriga.abaulamento[1]).toBeLessThan(0);
    expect(barriga.apice[1]).toBeLessThan(Math.min(barriga.a[1], barriga.b[1]));
    expect(partes.barriga.vMin).toBeGreaterThanOrEqual(0);
  });
});

describe('instrução 7: o círculo de ½ cm no centro do quadrado esquerdo central', () => {
  it('tem 5 mm de diâmetro', () => {
    expect(partes.focinho.raioMm).toBeCloseTo(CM / 4, 3);
    expect(partes.focinho.larguraMm).toBeCloseTo(CM / 2, 2);
    expect(partes.focinho.alturaMm).toBeCloseTo(CM / 2, 2);
  });

  it('o centro está a meio quadrado das quatro linhas do quadrado central esquerdo', () => {
    const c = P.centroDoCirculo;
    esperarPonto(c, centroDaCasa(2, 1));
    /* Esquerda da grade, divisória das colunas 1 e 2, linha entre as fileiras 2 e 3 e linha entre as fileiras 1 e 2. */
    for (const d of [c[0], CASA - c[0], c[1] - CASA, 2 * CASA - c[1]]) expect(d).toBeCloseTo(CASA / 2, 2);
    dentroDaCasa('focinho', 2, 1);
  });
});

describe('instrução 8: o arco da testa, do "M" ao círculo, com a concavidade para o quadrado inferior direito', () => {
  it('parte do pé esquerdo do "M" e chega ao topo do círculo', () => {
    const topo = [P.centroDoCirculo[0], P.centroDoCirculo[1] + partes.focinho.raioMm];
    expect(ligaEntre(arco('testa'), P.mPeEsq, topo)).toBe(true);
  });

  it('abre para o quadrado inferior direito e abaula para fora, dentro do quadrado central esquerdo', () => {
    abreParaACasa(arco('testa'), 3, 3);
    dentroDaCasa('testa', 2, 1);
  });
});

describe('instrução 9: o arco do queixo, do "W" ao círculo, com a concavidade para o quadrado superior direito', () => {
  it('parte do início do "W" do quadrado inferior esquerdo e chega à base do círculo', () => {
    const base = [P.centroDoCirculo[0], P.centroDoCirculo[1] - partes.focinho.raioMm];
    expect(ligaEntre(arco('queixo'), P.wePontaEsq, base)).toBe(true);
  });

  it('abre para o quadrado superior direito e abaula para fora, dentro do quadrado central esquerdo', () => {
    abreParaACasa(arco('queixo'), 1, 3);
    dentroDaCasa('queixo', 2, 1);
  });
});

describe.each([
  [10, 'olho', 10, 'o início do arco no "M"', 'mPeEsq'],
  [11, 'boca', 15, 'o início do arco no "W"', 'wePontaEsq'],
])('instrução %i: o arco do %s, de %i mm, no meio do caminho entre o círculo e %s', (_numero, nome, milimetros, _quem, origem) => {
  it(`a corda é horizontal e mede ${milimetros} mm, e o comprimento do arco fica a 3% disso`, () => {
    const x = arco(nome);
    expect(x.a[1]).toBeCloseTo(x.b[1], 2);
    expect(x.corda).toBeCloseTo(milimetros, 2);
    expect(Math.abs(x.comprimento - milimetros) / milimetros).toBeLessThan(0.03);
  });

  it('o meio da corda é o ponto médio entre o início do arco no "M" ou no "W" e o centro do círculo', () => {
    esperarPonto(arco(nome).m, meio(P[origem], P.centroDoCirculo));
  });

  it('tem leve curvatura para baixo: o meio do arco fica abaixo das pontas, a menos de um décimo da corda', () => {
    const x = arco(nome);
    expect(x.menorQueMeiaVolta).toBe(true);
    expect(x.abaulamento[1]).toBeLessThan(0);
    expect(x.flecha).toBeGreaterThan(0);
    expect(x.flecha).toBeLessThan(0.1 * x.corda);
  });

  it('fica dentro do quadrado central esquerdo', () => {
    dentroDaCasa(nome, 2, 1);
  });
});

describe('instrução 12: o "e" minúsculo encostado por fora na parte de cima do arco do traseiro', () => {
  it('o contato está sobre o arco do traseiro, na metade de cima dele, no lado direito', () => {
    const traseiro = arco('traseiro');
    const t = P.contatoDoE;
    expect(dist(t, traseiro.c)).toBeCloseTo(traseiro.raio, 2);
    /* Do lado do arco, e não do lado do centro: o ponto está do outro lado da corda em relação ao centro. */
    expect(vetorial(menos(traseiro.b, traseiro.a), menos(t, traseiro.a)) * vetorial(menos(traseiro.b, traseiro.a), menos(traseiro.c, traseiro.a))).toBeLessThan(0);
    expect(dist(t, P.traseiroNoCanto)).toBeLessThan(dist(t, P.traseiroNoW));
    expect(t[1]).toBeGreaterThan(meio(traseiro.a, traseiro.b)[1]);
    expect(t[0]).toBeGreaterThan(2 * CASA);
  });

  it('encosta por fora: o círculo do "e" toca o do arco num ponto só, com os centros a raio mais raio', () => {
    const traseiro = arco('traseiro');
    const r = partes.rabo.raioMm;
    expect(dist(P.centroDoE, P.contatoDoE)).toBeCloseTo(r, 2);
    expect(dist(P.centroDoE, traseiro.c)).toBeCloseTo(traseiro.raio + r, 2);
  });

  it('é minúsculo diante do "M" maiúsculo: 5 mm de diâmetro contra 10 mm de altura', () => {
    expect(2 * partes.rabo.raioMm).toBeCloseTo(CM / 2, 2);
    expect(2 * partes.rabo.raioMm).toBeLessThan(P.mTopoEsq[1] - P.mPeEsq[1]);
  });

  it('tem a forma do "e": a travessa horizontal pelo centro, de um lado ao outro do laço, e o laço dando 320 graus com a abertura embaixo à direita', () => {
    const c = P.centroDoE;
    expect(P.travessaDoEEsq[1]).toBeCloseTo(c[1], 2);
    expect(P.travessaDoEDir[1]).toBeCloseTo(c[1], 2);
    expect(dist(P.travessaDoEEsq, P.travessaDoEDir)).toBeCloseTo(2 * partes.rabo.raioMm, 2);
    expect(P.travessaDoEDir[0]).toBeGreaterThan(c[0]);
    const angulo = (p) => graus(Math.atan2(p[1] - c[1], p[0] - c[0]));
    const { inicio, fim } = roteiro.partes.rabo.arco;
    expect(volta(angulo(P[fim]) - angulo(P[inicio]))).toBeCloseTo(320, 1);
    expect(volta(angulo(P.contatoDoE) - angulo(P[inicio]))).toBeLessThan(320);
    expect(P[fim][1]).toBeLessThan(c[1]);
    expect(P[fim][0]).toBeGreaterThan(c[0]);
  });
});

describe('instrução 13: dois pontos alinhados horizontalmente no meio do círculo', () => {
  it('estão na mesma horizontal, que passa pelo centro do círculo, e o meio deles é o centro', () => {
    const [e, d] = [P.centroDoPontoEsq, P.centroDoPontoDir];
    expect(e[1]).toBeCloseTo(d[1], 3);
    expect(e[1]).toBeCloseTo(P.centroDoCirculo[1], 2);
    esperarPonto(meio(e, d), P.centroDoCirculo);
  });

  it('são dois pontos distintos, cada um inteiro dentro do círculo', () => {
    const [e, d] = [P.centroDoPontoEsq, P.centroDoPontoDir];
    expect(d[0] - e[0]).toBeGreaterThan(0.5);
    for (const [centro, nome] of [[e, 'pontoEsq'], [d, 'pontoDir']]) {
      expect(dist(centro, P.centroDoCirculo) + partes[nome].raioMm).toBeLessThan(partes.focinho.raioMm);
    }
  });
});

describe('o porco', () => {
  it('está virado para a esquerda: o círculo do focinho é a parte mais à esquerda', () => {
    const outras = Object.keys(partes).filter((n) => n !== 'focinho');
    for (const n of outras) expect(partes[n].hMin, n).toBeGreaterThan(partes.focinho.hMin);
    expect(relatorio.medidas.vista.hMin).toBeCloseTo(partes.focinho.hMin, 2);
  });
});
