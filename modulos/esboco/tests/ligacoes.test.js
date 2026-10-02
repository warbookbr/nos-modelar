/* As ligações estruturais do esboço (plano "O esboço detalhado coerente", fatia 2): `plano.contrato.fixa` (uma peça presa a outra por
   N pontos de contato distintos), o achado de ponta livre no gate e o campo `funcao` por unidade. Os exemplos usam caixas e tubos
   genéricos; a moto entra só como nome de peça. */
import { describe, expect, it } from 'vitest';
import { expandirEsboco } from '../src/expandir.js';
import { conferirPlano, lerPlano, visiveisDoEsboco } from '../src/plano.js';
import { medirEsboco, formatarResumo } from '../src/descrever.js';
import { verificarContato, descreverAchado } from '../src/contato.js';

const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const tubo = (id, caminho, extra = {}) => ({ id, tipo: 'tubo', diametro: 10, caminho, ...extra });
const conferir = (e) => { const x = expandirEsboco(e); return conferirPlano(x, visiveisDoEsboco(x)); };
const com = (formas, plano, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true, tolerancia: 2, penetracao: 2, folga: 500 }, plano, ...extra });
/* o motor (100 x 60 x 60) com a base em y = 0 */
const motor = (extra = {}) => caixa('motor', [0, 30, 0], 100, 60, 60, extra);
/* apoios de 20 mm sob o motor, centrados em x */
const apoio = (id, x, extra = {}) => caixa(id, [x, -10, 0], 20, 20, 20, extra);

describe('plano.contrato.fixa', () => {
  const fixa = (extra = {}) => ({ contrato: { fixa: [{ a: 'motor', b: 'quadro*', pontos: 2, ...extra }] } });

  it('reprova a peça presa por um só ponto e diz quantos pontos achou e onde', () => {
    const r = conferir(com([motor(), apoio('quadroA', -40)], fixa()));
    expect(r.achados).toHaveLength(1);
    expect(r.achados[0]).toMatchObject({ tipo: 'contrato-fixa', pecas: ['motor', 'quadroA'] });
    expect(r.achados[0].texto).toContain('motor');
    expect(r.achados[0].texto).toContain('quadro*');
    expect(r.achados[0].texto).toContain('2 pontos');
    expect(r.achados[0].texto).toMatch(/achou 1 ponto/);
    expect(r.achados[0].texto).toContain('[-40 0 0] (motor e quadroA)');
    expect(r.opcoes[0].contrato[0]).toMatchObject({ relacao: 'fixa', a: 'motor', b: 'quadro*', ok: false, pontos: 1, pedidos: 2 });
  });

  it('aprova a peça presa por dois pontos separados por mais que a tolerância', () => {
    const r = conferir(com([motor(), apoio('quadroA', -40), apoio('quadroB', 40)], fixa()));
    expect(r.achados).toEqual([]);
    expect(r.opcoes[0].contrato[0]).toMatchObject({ relacao: 'fixa', ok: true, pontos: 2, pedidos: 2 });
  });

  it('dois contatos a menos que a tolerância um do outro são o mesmo ponto', () => {
    const r = conferir(com([motor(), apoio('quadroA', -10), apoio('quadroB', -9)], fixa()));
    expect(r.achados).toHaveLength(1);
    expect(r.achados[0].texto).toMatch(/achou 1 ponto/);
  });

  it('diz que as peças não se tocam quando não há nenhum ponto', () => {
    const r = conferir(com([motor(), caixa('quadroA', [0, -200, 0])], fixa()));
    expect(r.achados[0].texto).toMatch(/achou 0 pontos/);
    expect(r.achados[0].texto).toContain('não se tocam');
  });

  it('vale também para unidades: o conjunto inteiro de cada lado conta', () => {
    const formas = [motor({ unidade: 'motor' }), caixa('tampa', [0, 70, 0], 100, 20, 60, { unidade: 'motor' }), apoio('quadroA', -40, { unidade: 'quadro' }), apoio('quadroB', 40, { unidade: 'quadro' })];
    const ok = conferir(com(formas, { contrato: { fixa: [{ a: 'unidade:motor', b: 'quadro', pontos: 2 }] } }));
    expect(ok.achados).toEqual([]);
    const pedeTres = conferir(com(formas, { contrato: { fixa: [['unidade:motor', 'quadro', 3]] } }));
    expect(pedeTres.achados).toHaveLength(1);
    expect(pedeTres.achados[0].texto).toMatch(/achou 2 pontos/);
  });

  it('o apoio na junção de peças convexas de uma forma só conta um ponto por local de contato (tubo com dois pés)', () => {
    const base = [tubo('quadro', [[-40, -60, 0], [-40, 0, 0]]), tubo('quadro2', [[40, -60, 0], [40, 0, 0]])];
    const r = conferir(com([motor(), ...base], fixa()));
    expect(r.achados).toEqual([]);
  });

  it('o esquema recusa o campo errado, o número de pontos inválido e a peça que não existe, com o válido na mensagem', () => {
    expect(() => lerPlano({ contrato: { fixa: [{ a: 'motor', b: 'quadro', pontos: 0 }] } })).toThrow(/pontos.*inteiro de 1 ou mais/);
    expect(() => lerPlano({ contrato: { fixa: [{ a: 'motor', b: 'quadro', ponto: 2 }] } })).toThrow(/o campo "ponto" não existe.*pontos/);
    expect(() => lerPlano({ contrato: { fixa: [{ a: 'motor', b: 'motor' }] } })).toThrow(/dois ids diferentes/);
    expect(() => conferir(com([motor(), apoio('quadroA', -40)], { contrato: { fixa: [{ a: 'motr', b: 'quadro*' }] } }))).toThrow(/"motr" não é uma forma nem uma unidade.*motor/);
  });

  it('entra na leitura padrão (--descrever) como divergência de classe contrato e conta como relação do plano', () => {
    const e = com([motor(), apoio('quadroA', -40)], fixa());
    const m = medirEsboco(e, { projecao: false });
    const d = m.divergencias.find((x) => x.tipo === 'contrato-fixa');
    expect(d).toMatchObject({ classe: 'contrato', pecas: ['motor', 'quadroA'] });
    expect(formatarResumo(m.descricao, m.divergencias)).toContain('contrato: ');
    expect(m.plano.resumo.relacoes).toBe(1);
  });
});

describe('achado de ponta livre no gate', () => {
  const gate = (formas, contato = {}) => verificarContato({ contato: { usar: true, tolerancia: 2, penetracao: 2, folga: 500, ...contato }, opcoes: [{ titulo: 'T', formas }] });
  const tipos = (g) => g.achados.map((a) => a.tipo);
  const bloco = (id, centro) => caixa(id, centro, 20, 20, 20);
  /* um tubo de 100 mm entre dois blocos de ponta */
  const ligacao = (extra = {}) => [bloco('a', [-10, 0, 0]), tubo('t', [[0, 0, 0], [100, 0, 0]], extra), bloco('b', [110, 0, 0])];

  it('o tubo preso nas duas pontas passa', () => {
    expect(gate(ligacao()).achados).toEqual([]);
  });

  it('a ponta de tubo que não encosta em nada reprova, diz qual ponta, onde e a distância até a peça mais próxima', () => {
    const g = gate(ligacao().slice(0, 2));
    expect(tipos(g)).toEqual(['ponta-livre']);
    expect(g.achados[0]).toMatchObject({ pecas: ['t'], ponta: 'fim', mm: 100 });
    expect(descreverAchado(g.achados[0])).toContain('t tem a ponta fim em [100 0 0] sem encostar em nada');
    expect(descreverAchado(g.achados[0])).toContain('"ponta": true');
    expect(g.resultado).toBe('reprovado');
  });

  it('`ponta: true` na forma silencia as duas pontas, e `ponta: { fim: true }` só o fim', () => {
    expect(gate(ligacao({ ponta: true }).slice(0, 2)).achados).toEqual([]);
    expect(gate(ligacao({ ponta: { fim: true } }).slice(0, 2)).achados).toEqual([]);
    const soInicio = gate(ligacao({ ponta: { inicio: true } }).slice(0, 2));
    expect(soInicio.achados.map((a) => a.ponta)).toEqual(['fim']);
  });

  it('a haste de caixa e a de cilindro (de/para) têm as pontas conferidas, e a forma oculta (a unidade isolada) conta como vizinha', () => {
    const haste = (tipoDaHaste) => (tipoDaHaste === 'caixa'
      ? { id: 'h', tipo: 'caixa', largura: 10, profundidade: 10, de: [0, 0, 0], para: [100, 0, 0] }
      : { id: 'h', tipo: 'cilindro', diametro: 10, de: [0, 0, 0], para: [100, 0, 0] });
    for (const t of ['caixa', 'cilindro']) {
      expect(gate([bloco('a', [-10, 0, 0]), haste(t), bloco('b', [110, 0, 0])]).achados, t).toEqual([]);
      const g = gate([bloco('a', [-10, 0, 0]), haste(t)]);
      expect(g.achados.map((a) => `${a.tipo}:${a.pecas[0]}:${a.ponta}`), t).toEqual(['ponta-livre:h:fim']);
    }
    const g = gate([bloco('a', [-10, 0, 0]), haste('cilindro'), { ...bloco('b', [110, 0, 0]), oculto: true }]);
    expect(g.achados).toEqual([]);
  });

  it('a cópia espelhada de um tubo silenciado herda o silêncio, e a de um tubo sem ele herda a pendência', () => {
    const base = (extra) => [bloco('a', [-10, 0, 0]), tubo('t', [[0, 0, 0], [100, 0, 0]], extra), { id: 'a2', espelha: { forma: 'a', eixo: 'z', pos: 10 } }, { id: 't2', espelha: { forma: 't', eixo: 'z', pos: 10 } }];
    expect(gate(base({ ponta: { fim: true } })).achados.map((a) => a.pecas[0])).toEqual([]);
    expect(gate(base({})).achados.map((a) => `${a.pecas[0]}:${a.ponta}`).sort()).toEqual(['t2:fim', 't:fim']);
  });

  it('`ponta: true` numa forma que não é tubo nem haste é recusado, dizendo o que vale', () => {
    expect(() => gate([bloco('a', [0, 0, 0]), { ...bloco('b', [20, 0, 0]), ponta: true }])).toThrow(/"ponta": true.*vale só em tubo e em cilindro ou caixa com "de"\/"para"/);
    expect(() => gate(ligacao({ ponta: { fim: 'sim' } }))).toThrow(/"ponta" como objeto deve ser \{ "inicio": true, "fim": true \}/);
  });

  describe('várias pontas no mesmo ponto', () => {
    /* quatro tubos que terminam no mesmo ponto, cada um preso por um bloco na outra ponta */
    const quatro = () => {
      const longe = [[100, 0, 0], [-100, 0, 0], [0, 100, 0], [0, -100, 0]];
      return longe.flatMap((p, k) => [tubo(`t${k + 1}`, [p, [0, 0, 0]]), bloco(`b${k + 1}`, p.map((c) => c * 1.1))]);
    };
    const cruzam = (extra = []) => ({ juntas: [{ pecas: ['t1', 't2', 't3', 't4', ...extra], max: 30, motivo: 'os quatro tubos se cruzam na ponta que têm em comum' }] });

    it('sem forma que os una reprova, diz quantas pontas e onde', () => {
      const g = gate(quatro(), cruzam());
      expect(g.achados.map((a) => a.tipo)).toEqual(['pontas-sem-coletor']);
      expect(g.achados[0]).toMatchObject({ pecas: ['t1', 't2', 't3', 't4'], ponto: [0, 0, 0] });
      expect(descreverAchado(g.achados[0])).toContain('4 pontas (t1, t2, t3, t4) terminam no mesmo ponto [0 0 0] e nenhuma forma as une');
    });

    it('com um coletor no ponto passa', () => {
      const g = gate([...quatro(), { id: 'coletor', tipo: 'esfera', diametro: 30, centro: [0, 0, 0] }], cruzam(['coletor']));
      expect(g.achados).toEqual([]);
    });

    it('`ponta: true` num dos tubos declara o encontro de propósito', () => {
      const formas = quatro();
      formas[0] = { ...formas[0], ponta: { fim: true } };
      expect(gate(formas, cruzam()).achados).toEqual([]);
    });

    it('dois tubos que se encontram numa ponta não pedem coletor', () => {
      const formas = quatro().filter((f) => !['t3', 't4', 'b3', 'b4'].includes(f.id));
      expect(gate(formas, { juntas: [{ pecas: ['t1', 't2'], max: 30, motivo: 'os dois tubos se cruzam na ponta que têm em comum' }] }).achados).toEqual([]);
    });
  });

  it('entra na leitura padrão (--descrever) como classe própria "ponta"', () => {
    const m = medirEsboco({ contato: { usar: true, tolerancia: 2, penetracao: 2, folga: 500 }, opcoes: [{ titulo: 'T', formas: ligacao().slice(0, 2) }] }, { projecao: false });
    const d = m.divergencias.find((x) => x.tipo === 'ponta-livre');
    expect(d).toMatchObject({ classe: 'ponta', pecas: ['t'] });
    expect(formatarResumo(m.descricao, m.divergencias)).toContain('ponta: t tem a ponta fim');
  });
});
