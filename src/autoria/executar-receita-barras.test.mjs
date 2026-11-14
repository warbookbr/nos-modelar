/* executar-receita-barras.test.mjs — a estruturaDeBarras na receita de peça: o tubo entre dois pontos, com as pontas fechadas pela operação. */
import { describe, expect, it } from 'vitest';
import { REGISTRO_OPERACOES, criarRegistroComExtensoes, neutroCanonico, nucleo } from '../../procedural/nucleo/entrada.js';
import { registroServeAMemoria } from '../../procedural/nucleo/memoria-de-execucao.js';
import { EXTENSOES_NATIVAS } from '../../procedural/familias/index.js';
import { REGISTRO_DA_RECEITA, executarReceita } from './executar-receita.js';

/* Arestas dirigidas sem par: zero quer dizer superfície fechada, sem borda livre. */
function arestasAbertas(neutro) {
  const d = new Map();
  for (const f of neutro.F.values()) f.vs.forEach((a, k) => { const c = `${a}>${f.vs[(k + 1) % f.vs.length]}`; d.set(c, (d.get(c) ?? 0) + 1); });
  let abertas = 0;
  for (const [c, q] of d) { const [a, b] = c.split('>'); if (q !== 1 || d.get(`${b}>${a}`) !== 1) abertas += 1; }
  return abertas;
}

/* Um quadro de prova em diamante, em milímetro: movimento central, eixo traseiro, canote, mesa e eixo dianteiro, com o garfo. */
const NOS = [
  { nome: 'movimento', posicao: [0, 300, 0] }, { nome: 'eixoTraseiro', posicao: [-420, 330, 0] }, { nome: 'canote', posicao: [-90, 760, 0] },
  { nome: 'mesaSuperior', posicao: [300, 780, 0] }, { nome: 'mesaInferior', posicao: [330, 700, 0] }, { nome: 'eixoDianteiro', posicao: [470, 330, 0] },
];
const BARRAS = [
  { nome: 'tuboDoSelim', de: 'movimento', para: 'canote' }, { nome: 'tuboSuperior', de: 'canote', para: 'mesaSuperior' },
  { nome: 'tuboDeDirecao', de: 'mesaSuperior', para: 'mesaInferior' }, { nome: 'tuboInferior', de: 'movimento', para: 'mesaInferior' },
  { nome: 'garfo', de: 'mesaInferior', para: 'eixoDianteiro' }, { nome: 'escoraTraseira', de: 'canote', para: 'eixoTraseiro' },
  { nome: 'baseTraseira', de: 'movimento', para: 'eixoTraseiro' },
];
const QUADRO = { PASSOS: [['estruturaDeBarras', { nos: NOS, barras: BARRAS, perfil: { tipo: 'tubo-redondo', diametro: 30, lados: 12 }, densidade: 7850 }]], PARAMS: {}, TOPO: {} };

describe('estruturaDeBarras na receita de peça', () => {
  it('o quadro de prova sai fechado, sem polo escrito à mão', () => {
    const { neutro } = executarReceita(QUADRO);
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.F.size).toBeGreaterThan(100);
    expect(arestasAbertas(neutro)).toBe(0);
    expect(QUADRO.PASSOS.some(([op]) => op === 'loft')).toBe(false);
    expect(JSON.stringify(QUADRO.PASSOS)).not.toMatch(/"raio":0\b/);
  });

  it('cada tubo entre dois pontos fecha as pontas sozinho, com ou sem parede', () => {
    for (const perfil of [{ tipo: 'tubo-redondo', diametro: 30, lados: 12 }, { tipo: 'tubo-redondo', diametro: 30, parede: 3, lados: 12 }]) {
      const { neutro } = executarReceita({ PASSOS: [['estruturaDeBarras', { nos: [{ nome: 'a', posicao: [0, 0, 0] }, { nome: 'b', posicao: [500, 0, 300] }], barras: [{ nome: 't', de: 'a', para: 'b' }], perfil }]] });
      expect(neutro.orfaos).toEqual([]);
      expect(arestasAbertas(neutro)).toBe(0);
    }
  });

  it('dá o mesmo neutro, bit a bit, que o registro com as extensões das famílias', () => {
    const familias = criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [...EXTENSOES_NATIVAS] });
    const daReceita = JSON.stringify(neutroCanonico(executarReceita(QUADRO).neutro));
    const dasFamilias = JSON.stringify(neutroCanonico(executarReceita(QUADRO, { registroOperacoes: familias }).neutro));
    expect(daReceita).toBe(dasFamilias);
  });

  it('as operações do núcleo seguem iguais com o registro da receita', () => {
    const passos = [['cubo', { origemId: 1, lado: 1 }], ['cilindro', { raio: 0.3, altura: 1, lados: 8, em: [2, 0, 0] }]];
    expect(JSON.stringify(neutroCanonico(executarReceita({ PASSOS: passos }).neutro))).toBe(JSON.stringify(neutroCanonico(nucleo(passos, {}, {}))));
  });

  it('o registro do núcleo sozinho não a conhece, e a recusa sugere o nome', () => {
    const { neutro } = executarReceita(QUADRO, { registroOperacoes: REGISTRO_OPERACOES });
    expect(neutro.orfaos[0].motivo).toContain("operação desconhecida 'estruturaDeBarras'");
    expect(REGISTRO_DA_RECEITA.resolver('estruturaDeBarras')).toBeTruthy();
  });

  it('a memória de execução aceita o registro da receita e não o do núcleo passado à mão', () => {
    expect(registroServeAMemoria(REGISTRO_DA_RECEITA)).toBe(true);
    expect(registroServeAMemoria(REGISTRO_OPERACOES)).toBe(false);
    expect(registroServeAMemoria(undefined)).toBe(true);
  });
});
