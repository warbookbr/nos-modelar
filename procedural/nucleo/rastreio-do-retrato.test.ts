/* rastreio-do-retrato.test.ts — o atalho do retrato da procedência devolve exatamente a procedência da conta completa.
 *
 * `nucleo` tira a cada passo um retrato de `st.V` e `st.F` para a procedência dizer quais vértices e faces o passo mudou. As
 * operações do próprio núcleo declaram em `ESCRITA_DAS_OPERACOES` o que escrevem nas entradas já existentes, e o atalho só olha
 * o que a declaração permite. A referência é `OPCOES.retrato: 'completo'`, a conta de antes (serializar e comparar tudo);
 * 'conferido' roda as duas a cada passo e recusa a divergência. */
import { describe, expect, it } from 'vitest';
import { ESCRITA_DAS_OPERACOES, OPS, REGISTRO_OPERACOES, nucleo, rastrearEntradas } from './nucleo.js';
import { entradaDaReceita } from '../../src/autoria/executar-receita.js';
import { importarReceita, receitaDoModulo } from '../../tools/modelar/importar-receita.mjs';
import { resolverCaminhoReceita } from '../../tools/modelar/resolver-caminho-receita.mjs';

type Passo = [string, Record<string, unknown>?];
type Entrada = { PASSOS: Passo[]; PARAMS?: object; TOPO?: object; MATERIAIS?: object; ESQUELETO?: unknown; ALIASES?: unknown[] };

function rodar(entrada: Entrada, retrato: string | undefined, registroOperacoes?: unknown) {
  const opcoes: Record<string, unknown> = {};
  if (retrato) opcoes.retrato = retrato;
  if (registroOperacoes) opcoes.registroOperacoes = registroOperacoes;
  return nucleo(entrada.PASSOS as any, entrada.PARAMS ?? {}, entrada.TOPO ?? {}, entrada.MATERIAIS ?? {}, (entrada.ESQUELETO ?? null) as any, (entrada.ALIASES ?? []) as any, opcoes);
}

/** A procedência (e o neutro) do caminho de agora, a do 'conferido' e a da conta completa têm de ser a mesma. */
function igualNosTresCaminhos(entrada: Entrada, registroOperacoes?: unknown) {
  const completo = rodar(entrada, 'completo', registroOperacoes);
  const rapido = rodar(entrada, undefined, registroOperacoes);
  const conferido = rodar(entrada, 'conferido', registroOperacoes);
  const texto = (n: any) => JSON.stringify({ procedencia: n.procedencia, artefato: n.artefato, V: [...n.V], F: [...n.F], orfaos: n.orfaos, partes: n.partes });
  expect(texto(rapido)).toBe(texto(completo));
  expect(texto(conferido)).toBe(texto(completo));
  return completo;
}

const verticesMudados = (neutro: any) => neutro.procedencia.passos.map((p: any) => p.saidas.vertices);

const MATERIAIS = { a: { cor: [1, 0, 0] }, b: { cor: [0, 1, 0] } };
const TUDO = { tudo: true };

describe('declaração de escrita por operação', () => {
  it('só nomeia operações do próprio núcleo e níveis conhecidos', () => {
    for (const [nome, { V, F }] of Object.entries(ESCRITA_DAS_OPERACOES)) {
      expect(Object.keys(OPS), nome).toContain(nome);
      expect(['nada', 'alvos', 'acrescenta']).toContain(V);
      expect(['nada', 'alvos', 'acrescenta']).toContain(F);
      expect(V, `${nome}: 'alvos' só vale para faces`).not.toBe('alvos');
    }
  });

  it('o rastreio recusa o que a declaração não sustenta (tamanho diferente do esperado)', () => {
    const retrato = (mapa: Map<number, unknown>) => new Map([...mapa].map(([id, v]) => [id, { copia: v, json: JSON.stringify(v) }]));
    const antes = retrato(new Map([[1, [0, 0, 0]], [2, [1, 1, 1]]]));
    expect(rastrearEntradas(new Map([[1, [0, 0, 0]]]), antes, 'nada', null)).toBeNull();
    expect(rastrearEntradas(new Map([[1, [0, 0, 0]], [2, [1, 1, 1]], [3, [2, 2, 2]]]), antes, 'nada', null)).toBeNull();
    expect(rastrearEntradas(new Map([[1, [0, 0, 0]], [3, [1, 1, 1]], [4, [9, 9, 9]]]), antes, 'acrescenta', [3, 4])).toBeNull();   // apagou a 2
    expect(rastrearEntradas(new Map([[1, [0, 0, 0]], [2, [1, 1, 1]], [4, [9, 9, 9]]]), antes, 'acrescenta', [2])).toBeNull();        // o 2 já existia
    expect(rastrearEntradas(new Map([[1, [0, 0, 0]], [2, [1, 1, 1]], [4, [9, 9, 9]], [5, [8, 8, 8]]]), antes, 'acrescenta', [4])).toBeNull();   // o 5 veio por outro caminho
    expect(rastrearEntradas(new Map([[1, [0, 0, 0]], [3, [1, 1, 1]]]), antes, 'alvos', [2])).toBeNull();
    const mudou = rastrearEntradas(new Map([[1, [0, 0, 0]], [2, [5, 5, 5]]]), antes, 'alvos', [2]);
    expect(mudou?.mudados).toEqual([2]);
  });
});

describe('casos sintéticos: o atalho devolve a procedência da conta completa', () => {
  it('cada criadora declarada, com e sem pose de criação', () => {
    const criadoras: Passo[] = [
      ['cubo', {}], ['cilindro', {}], ['esfera', {}], ['cone', {}], ['plano', {}], ['chamferBox', {}],
      ['cubo', { em: [1, 0, 0] }], ['cilindro', { em: [0, 2, 0], eixo: 'x' }],
    ];
    const completo = igualNosTresCaminhos({ PASSOS: criadoras });
    const novos = verticesMudados(completo).filter((v: number[]) => v.length > 0).length;
    expect(novos).toBeGreaterThan(5);
  });

  it('atributos: o mesmo valor de novo não muda nada, o valor novo muda só as faces escolhidas', () => {
    const passos: Passo[] = [
      ['cubo', {}], ['cubo', {}],
      ['material', { usa: 'a', sel: TUDO }], ['material', { usa: 'a', sel: TUDO }], ['material', { usa: 'b', faces: [1] }],
      ['parte', { nome: 'corpo', sel: TUDO }], ['parte', { nome: 'corpo', sel: TUDO }],
      ['parte', { nome: 'outra', sel: TUDO }],                       // roubo: grita e a face fica com o dono antigo
      ['parte', { nome: 'outra', sel: TUDO, substituir: true }],
      ['liso', { angulo: 30, sel: TUDO }], ['liso', { angulo: 30, faces: [0] }], ['solido', { faces: [2, 3] }],
      ['moveV', { v: 0, d: [0, 1, 0] }], ['pincel', { faces: [0], cor: '#ff0000' }], ['moveV', { v: 0, d: [0, 0, 0] }], ['material', { usa: 'inexistente', sel: TUDO }], ['material', { usa: 'a', faces: [9999] }],
    ];
    igualNosTresCaminhos({ PASSOS: passos, MATERIAIS });
  });

  it('passo que sai antes do fim (recusa) deixa o seguinte refazer o retrato', () => {
    igualNosTresCaminhos({ PASSOS: [['cubo', {}], ['inexistente', {}], ['material', { usa: 'a', sel: TUDO }], ['cilindro', { lados: -3 }], ['material', { usa: 'b', sel: TUDO }]], MATERIAIS });
  });

  it('mudança no lugar por operação sem declaração é vista, e a declarada que vem depois não a esconde', () => {
    const mexe = {
      ...REGISTRO_OPERACOES.resolver('cubo'), id: 'prova.mexe', nome: 'mexe', uso: undefined,
      executar(st: any, a: any) {
        const v = st.V.get(a.v); v[1] += 0.25;                       // dentro do array de entrada
        const f = st.F.get(a.f); f.vs.push(f.vs[0]); f.material = 'a'; f.tinta.push({ a: 0, b: 0, cor: 'x', raio: 1, dureza: 0 });
      },
    };
    const registro = {
      resolver: (nome: string) => (nome === 'mexe' ? mexe : REGISTRO_OPERACOES.resolver(nome)),
    };
    const passos: Passo[] = [
      ['cubo', {}], ['material', { usa: 'b', sel: TUDO }], ['mexe', { v: 2, f: 1 }], ['parte', { nome: 'x', faces: [0] }], ['mexe', { v: 3, f: 2 }], ['cubo', {}], ['mexe', { v: 2, f: 1 }],
    ];
    const n = igualNosTresCaminhos({ PASSOS: passos, MATERIAIS }, registro);
    const doPasso = (k: number) => n.procedencia.passos.find((p: any) => p.passo === k)?.saidas;
    expect(doPasso(2)?.vertices).toEqual([2]);
    expect(doPasso(2)?.faces).toEqual([1]);
    expect(doPasso(3)?.vertices).toEqual([]);
    expect(doPasso(4)?.vertices).toEqual([3]);
  });

  it('a declaração não vale para função de outro registro com o nome de uma operação do núcleo', () => {
    const material = {
      ...REGISTRO_OPERACOES.resolver('material'),
      executar(st: any) { st.V.get(0)[0] += 1; st.F.get(1).cor = '#123456'; },   // escreve onde `material` nunca escreve
    };
    const registro = { resolver: (nome: string) => (nome === 'material' ? material : REGISTRO_OPERACOES.resolver(nome)) };
    const n = igualNosTresCaminhos({ PASSOS: [['cubo', {}], ['material', { usa: 'a', sel: TUDO }]], MATERIAIS }, registro);
    expect(n.procedencia.passos.find((p: any) => p.passo === 1).saidas.vertices).toEqual([0]);
  });
});

describe('receitas reais do acervo: o atalho devolve a procedência da conta completa', () => {
  const PECAS = [
    'ambulancia', 'braco-robotico/ombro-tambor', 'caminhao-entrega', 'carro-policia', 'carro-sedan-compacto',
    'furgao', 'micro-ondas-branco', 'onibus-urbano', 'picape-compacta', 'suporte-tubo', 'trator-pa',
  ];
  it.each(PECAS)('%s', async (nome) => {
    const receita = receitaDoModulo(await importarReceita(resolverCaminhoReceita(nome)));
    const entrada = entradaDaReceita(receita) as unknown as Entrada;
    const completo = igualNosTresCaminhos(entrada);
    expect(completo.procedencia.passos.length).toBeGreaterThan(0);
  }, 60_000);
});
