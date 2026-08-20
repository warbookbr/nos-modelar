import { describe, it, expect } from 'vitest';
import { construirQuartoDianteiro } from './quarto-dianteiro.mjs';
import { avaliarRejeicoes, CONDICOES } from './rejeicoes-p0.mjs';

/* Um detector que nunca reprova e um que sempre reprova são igualmente inúteis.
   Cada condição automatizada ganha AQUI um par: uma cage que ela deve deixar
   passar e uma que ela deve barrar. Sem esse par, a condição é decoração — que
   é exatamente o defeito que a rodada Q7 revelou. */

const veredito = (av, n) => av.resultados.find((x) => x.n === n).veredito;
const medida = (av, n) => av.resultados.find((x) => x.n === n).medida;

/* Mutantes: partem da cage real e quebram UMA coisa. */
function mutar(fn, opcoes = {}) {
  const cage = construirQuartoDianteiro(opcoes);
  fn(cage);
  return cage;
}
const mover = (cage, id, d) => {
  const p = cage.V.get(id);
  cage.V.set(id, [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
};

describe('condições de rejeição do P0, executáveis', () => {
  it('cobre as nove condições e não devolve "passa" por vacuidade', () => {
    const av = avaliarRejeicoes();
    expect(av.resultados.map((x) => x.n)).toEqual(CONDICOES.map((c) => c.n));
    /* 1 e 4 falam de corpo inteiro e de cabine. Numa peça que é um quarto
       dianteiro elas têm de sair como n/a com motivo, nunca como aprovação. */
    expect(av.naoAplicaveis).toEqual([1, 4]);
    for (const x of av.resultados) {
      if (x.veredito === 'naoAplicavel') expect(x.detalhe).toBeTruthy();
    }
  });

  it('2 — sem retorno de borda, o arco vira borda pintada', () => {
    expect(veredito(avaliarRejeicoes(), 2)).toBe('passa');
    const av = avaliarRejeicoes({ cage: construirQuartoDianteiro({ retornoDeBorda: 0 }) });
    expect(veredito(av, 2)).toBe('reprova');
    expect(medida(av, 2).recuoDoRetorno).toBeLessThan(6);
  });

  it('3 — uma segunda quebra no capô delata volume anexo', () => {
    expect(veredito(avaliarRejeicoes(), 3)).toBe('passa');
    /* Levanta o anel 2 em todas as estações: cria uma segunda crista onde a
       superfície deveria ser contínua até a crista do para-lama. */
    /* Uma crista extra no meio do capô: sobe o anel 2 e desce o 3, para que a
       segunda quebra seja de tangente e não só uma barriga. */
    const cage = mutar((c) => {
      for (const l of c.grade) { mover(c, l[2], [0, 110, 0]); mover(c, l[3], [0, -70, 0]); }
    });
    expect(veredito(avaliarRejeicoes({ cage }), 3)).toBe('reprova');
  });

  it('5 — crista em zigue-zague reprova; a crista atual passa', () => {
    const av = avaliarRejeicoes();
    expect(veredito(av, 5)).toBe('passa');
    expect(medida(av, 5).ondulacao).toBeLessThan(6);
    const cage = mutar((c) => {
      c.grade.forEach((l, i) => mover(c, l[4], [0, i % 2 ? 60 : -60, 0]));
    });
    expect(veredito(avaliarRejeicoes({ cage }), 5)).toBe('reprova');
  });

  it('5 — a ondulação é estável entre níveis, não mede espaçamento de amostra', () => {
    /* A primeira versão do detector caía ~4x por nível: um zigue-zague grosseiro
       passava no nível 3 só porque havia mais vértices. Um limiar em milímetros
       exige número comparável entre níveis. */
    const cage = mutar((c) => {
      c.grade.forEach((l, i) => mover(c, l[4], [0, i % 2 ? 60 : -60, 0]));
    });
    const [n1, n2, n3] = [1, 2, 3].map((n) => medida(avaliarRejeicoes({ cage, niveis: n }), 5).ondulacao);
    expect(n3).toBeGreaterThan(n1 * 0.5);
    expect(n3).toBeLessThan(n1 * 1.5);
  });

  it('6 — sem recuo, o farol é decalque', () => {
    expect(veredito(avaliarRejeicoes(), 6)).toBe('passa');
    /* Comparar a cage sem farol contra ela mesma dá deslocamento zero: é o caso
       em que o recorte não existe, e a condição tem de disparar. */
    const av = avaliarRejeicoes({ cage: construirQuartoDianteiro({ recorteFarol: 0 }) });
    expect(veredito(av, 6)).toBe('reprova');
    expect(medida(av, 6).profundidade).toBe(0);
  });

  it('8 — sem linha de caráter declarada, a cage crua é facetamento puro', () => {
    /* A cage crua COM os loops declarados devolve `naoAvaliavel`, e está certo:
       no nível 0 a faixa de caráter cobre a peça inteira. Para provar que o
       detector morde, o fixture tira as declarações — aí não há nada a
       desconsiderar e o poliedro aparece como o que é. */
    const nua = construirQuartoDianteiro();
    nua.loops = {};
    const av = avaliarRejeicoes({ cage: nua, niveis: 0 });
    expect(veredito(av, 8)).toBe('reprova');
    expect(medida(av, 8).diedroMax).toBeGreaterThan(30);
    expect(medida(av, 8).fatiaEmLinhaDeCarater).toBe(0);
  });

  it('8 — a faixa de caráter é reportada e tem teto: acima dele, não avalia', () => {
    /* Sem este par o detector poderia aprovar excluindo tudo. Ele não aprova:
       diz que não sabe, e mostra quanto excluiu. */
    const av = avaliarRejeicoes();
    const m = medida(av, 8);
    expect(m.fatiaEmLinhaDeCarater).toBeGreaterThan(m.tetoDaFaixa);
    expect(veredito(av, 8)).toBe('naoAvaliavel');
    expect(av.resultados.find((x) => x.n === 8).detalhe).toMatch(/faixa de alguma linha de car/);
  });

  it('9 — capô abaulado passa; capô em calha reprova', () => {
    /* Conhecido-bom: empurra os anéis 1..3 para ACIMA da corda que liga o eixo
       de simetria à crista. É o abaulamento que falta na forma atual. */
    const bom = mutar((c) => { for (const l of c.grade) for (const j of [1, 2, 3]) mover(c, l[j], [0, 70, 0]); });
    expect(veredito(avaliarRejeicoes({ cage: bom }), 9)).toBe('passa');

    const calha = mutar((c) => { for (const l of c.grade) for (const j of [1, 2, 3]) mover(c, l[j], [0, -60, 0]); });
    const av = avaliarRejeicoes({ cage: calha });
    expect(veredito(av, 9)).toBe('reprova');
    expect(av.resultados.find((x) => x.n === 9).medida.afundamento).toBeGreaterThan(40); /* a subdivisão suaviza: -60 mm na cage viram ~52 mm na pele */
  });

  it('nenhuma condição de rejeição dispara; a 8 fica em não avaliável', () => {
    /* Este teste é o marcador da dívida, não um alvo. Quando a forma for
       corrigida ele vira `toEqual([])`. Enquanto isso ele impede que a lista
       de reprovações CRESÇA sem alguém notar. */
    expect(avaliarRejeicoes().reprovadas).toEqual([]);
  });
});
