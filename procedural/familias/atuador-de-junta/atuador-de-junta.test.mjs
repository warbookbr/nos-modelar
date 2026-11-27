/* atuador-de-junta.test.mjs — a família `atuador-de-junta`: cada tamanho da tabela sai com a carcaça e a flange de saída,
 * cada uma num pedaço só; a saída só encosta na face da frente da carcaça; as portas dos furos casam com os furos (a
 * conferência da família cobra isso); e a tabela recusa o tamanho que não existe. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { ATUADORES, parametrosDoAtuador } from './tabela.js';
import { SERVOS, parametrosDoServo } from './servo.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('atuador-de-junta');

describe('família atuador-de-junta', () => {
  for (const diametro of Object.keys(ATUADORES)) it(`o atuador de ${diametro} mm sai com a carcaça e a saída, a saída só encostando`, () => {
    const receita = { meta: { nome: 'atuador' }, contatos: [{ par: ['carcaca', 'saida'], motivo: 'a flange de saída gira sobre a face da frente da carcaça' }], get CHAMADAS_COMPOSICOES() { return [chamar(F, 'a', parametrosDoAtuador(diametro))]; } };
    const n = executarReceita(receita, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
    expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    for (const parte of ['carcaca', 'saida']) expect(pedacosDaMalha({ V: n.V, F: new Map([...n.F].filter(([, f]) => f.parte === parte)) }), parte).toBe(1);
    const c = contatosDaPeca(n, receita);
    expect(c.paresEmContato.map((p) => `${p.par.join('+')}:${p.estado}`)).toEqual(['carcaca+saida:encostam']);
    expect(c.atravessados).toEqual([]);
  });

  for (const tamanho of Object.keys(SERVOS)) it(`o servo ${tamanho} sai com a caixa e o horn, o horn só encostando na torre`, () => {
    const receita = { meta: { nome: 'servo' }, contatos: [{ par: ['carcaca', 'saida'], motivo: 'o horn gira sobre o topo da torre do eixo do servo' }], get CHAMADAS_COMPOSICOES() { return [chamar(F, 's', parametrosDoServo(tamanho))]; } };
    const n = executarReceita(receita, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
    expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    for (const parte of ['carcaca', 'saida']) expect(pedacosDaMalha({ V: n.V, F: new Map([...n.F].filter(([, f]) => f.parte === parte)) }), parte).toBe(1);
    const c = contatosDaPeca(n, receita);
    expect(c.paresEmContato.map((p) => `${p.par.join('+')}:${p.estado}`)).toEqual(['carcaca+saida:encostam']);
    expect(c.atravessados).toEqual([]);
  });

  it('recusa o tamanho que não existe, dizendo os aceitos', () => {
    expect(() => parametrosDoAtuador(70)).toThrow(/70 não existe; aceitos: 40, 60, 80, 100, 120/);
    expect(() => parametrosDoServo('gigante')).toThrow(/gigante não existe; aceitos: pequeno, medio, grande/);
  });
});

describe('a porta `cabo` do atuador', () => {
  /* a medida independente: o centro dos vértices da tampa do cilindro de saída do cabo, no plano da porta */
  const casos = [
    ...Object.keys(ATUADORES).map((d) => [`atuador de ${d} mm`, { forma: 1, ...parametrosDoAtuador(d) }, 1]),
    ...Object.keys(SERVOS).map((t) => [`servo ${t}`, parametrosDoServo(t), -1]),
  ];
  for (const [nome, parametros, sinal] of casos) it(`${nome}: a porta fica no centro da ponta do cilindro de saída, com o eixo para fora dele`, () => {
    const receita = { meta: { nome: 'a' }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'a', parametros)]; } };
    const n = executarReceita(receita, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
    const I = n.portas.get('cabo').interface;
    expect(I.forma).toBe('plano');
    expect(I.eixo).toEqual([sinal, 0, 0]);
    /* os vértices no plano da porta e dentro do raio do cilindro: o círculo da tampa */
    const rc = parametros.forma === 2 ? 0.12 * parametros.larguraDaCaixa : parametros.diametroDoCabo / 2;
    const redondos = [...n.V.values()].filter((v) => Math.abs(v[0] - I.centro[0]) < 1e-9 && Math.hypot(v[1] - I.centro[1], v[2] - I.centro[2]) <= rc / 1000 + 1e-9);
    expect(redondos.length).toBeGreaterThanOrEqual(16);
    const c = [1, 2].map((e) => redondos.reduce((s, v) => s + v[e], 0) / redondos.length);
    expect(c[0]).toBeCloseTo(I.centro[1], 9);
    expect(c[1]).toBeCloseTo(I.centro[2], 9);
  });
});
