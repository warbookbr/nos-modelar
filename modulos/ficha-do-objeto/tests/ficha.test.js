/* ficha.test.js — a ficha montada de um objeto de prova de duas peças e uma junta: sai em milímetro, passa na cópia do esquema,
   igual em duas montagens, com o eixo da junta medido na porta declarada; a declaração errada é recusada dizendo o que falta. */
import { describe, expect, it } from 'vitest';
import { ErroFicha, conferirDocumento, eixoEAngulo, girar, idDaFicha, montarFicha } from '../src/index.js';

const declaracao = {
  formato: 'modelar.ponte', versao: 1, objeto: 'objeto-de-prova', revisao: 1,
  referencial: { frente: '+z', origem: 'centro do pé', poseZero: 'a pose da montagem' },
  conjuntos: [{ id: 'fixo', movel: false, instancias: ['pe'] }, { id: 'giro', movel: true, instancias: ['bracoLongo2'] }],
  juntas: [{
    id: 'giro', pai: 'pe', filho: 'bracoLongo2', eixoDe: { instancia: 'bracoLongo2', porta: 'apoio' }, acionadaPor: null,
    curso: { min: -90, max: 90, origem: 'estimativa' }, reducao: { valor: 50, origem: 'estimativa', nota: 'de prova' },
  }],
};
const quarto = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]]; /* um quarto de volta em torno de +y */
const instancias = [
  { id: 'pe', ref: 'prova/pe', pose: { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] }, portas: [] },
  { id: 'bracoLongo2', ref: 'prova/braco', pose: { rotacao: quarto, deslocamento: [0, 0.1, 0.02] }, portas: [{ id: 'apoio', interface: { eixo: [1, 0, 0], centro: [0.01, 0, 0] } }] },
];
const malha = { caminho: 'objeto-de-prova.glb', caixa: { min: [-10, 0, -10], max: [10, 120.0004, 10] }, faces: 96 };
const montar = (d = declaracao) => montarFicha({ declaracao: d, instancias, malha });

describe('montarFicha', () => {
  it('passa na cópia do esquema e sai igual em duas montagens', () => {
    const f = montar();
    expect(conferirDocumento(f).erros).toEqual([]);
    expect(JSON.stringify(montar())).toBe(JSON.stringify(f));
  });

  it('dá a posição em mm, a orientação em eixo e ângulo e o eixo da junta pela porta, no referencial da montagem', () => {
    const f = montar();
    const braco = f.pecas.find((p) => p.id === 'braco-longo-2');
    expect(braco.posicao.valor).toEqual([0, 100, 20]);
    expect(braco.orientacao.valor).toEqual({ eixo: [0, 1, 0], angulo: 90 });
    expect(f.juntas[0]).toMatchObject({ pai: 'pe', filho: 'braco-longo-2', acionadaPor: null });
    expect(f.juntas[0].eixo.valor).toEqual({ ponto: [0, 100, 10], direcao: [0, 0, -1] });
    expect(f.juntas[0].curso).toEqual({ valor: { min: -90, max: 90 }, origem: 'estimativa' });
    expect(f.malha.caixa.valor.max).toEqual([10, 120, 10]);
  });

  it('diz a massa ausente com o motivo enquanto não há densidade', () => {
    expect(montar().conjuntos[1].massa).toEqual({ ausente: true, motivo: expect.stringContaining('densidade') });
  });

  it('recusa instância fora de conjunto, instância inexistente e porta de eixo que não existe', () => {
    const d = structuredClone(declaracao);
    d.conjuntos[1].instancias = [];
    expect(() => montar(d)).toThrow(/bracoLongo2 não estão em nenhum conjunto/);
    const e = structuredClone(declaracao); e.conjuntos[0].instancias.push('fantasma');
    expect(() => montar(e)).toThrow(ErroFicha);
    const g = structuredClone(declaracao); g.juntas[0].eixoDe.porta = 'topo';
    expect(() => montar(g)).toThrow(/porta 'topo'.*as portas dela são apoio/);
  });
});

describe('componentes carregados por uma instância', () => {
  const componentes = [{ id: 'r1', instancia: 'bracoLongo2', familia: 'componente-eletronico', variante: 'resistor-1-4w', posicao: [10, 0, 0], orientacao: { eixo: [0, 1, 0], angulo: 90 } }];
  const portasEletricas = [{ peca: 'r1', id: '1', tipo: 'passivo', posicao: { valor: [-5, 0, 0], origem: 'medido' }, tensao: { ausente: true, motivo: 'passivo' } }];

  it('entram como peças no conjunto da instância, com a pose composta, e as portas passam no esquema', () => {
    const f = montarFicha({ declaracao, instancias, malha, componentes, portasEletricas });
    expect(conferirDocumento(f).erros).toEqual([]);
    const r1 = f.pecas.find((p) => p.id === 'r1');
    expect(r1).toMatchObject({ conjunto: 'giro', familia: 'componente-eletronico', variante: 'resistor-1-4w' });
    /* 10 mm em x da instância, que está girada um quarto de volta em y: vai a -10 em z, somado ao deslocamento dela */
    expect(r1.posicao.valor).toEqual([0, 100, 10]);
    expect(r1.orientacao.valor).toEqual({ eixo: [0, 1, 0], angulo: 180 });
  });

  it('recusa o componente com o identificador de outra peça', () => {
    expect(() => montarFicha({ declaracao, instancias, malha, componentes: [{ ...componentes[0], id: 'pe' }] })).toThrow(/já é de outra peça/);
  });
});

describe('eixoEAngulo', () => {
  it('reconstrói a rotação pela fórmula de Rodrigues, inclusive meia volta e identidade', () => {
    const matrizes = [quarto, [[1, 0, 0], [0, -1, 0], [0, 0, -1]], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]];
    for (const r of matrizes) {
      const o = eixoEAngulo(r);
      for (const e of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
        const esperado = r.map((linha) => linha[0] * e[0] + linha[1] * e[1] + linha[2] * e[2]);
        girar(o, e).forEach((x, k) => expect(x).toBeCloseTo(esperado[k], 9));
      }
    }
  });
});

it('idDaFicha passa camelCase com número para minúsculas e hífen', () => {
  expect(['anelPunho4', 'base', 'eloPunho5', 'anelCintura'].map(idDaFicha)).toEqual(['anel-punho-4', 'base', 'elo-punho-5', 'anel-cintura']);
});
