/* junta-com-cabo-alinhamento.test.mjs — a régua de alinhamento da ponta do cabo com a saída real da peça: a porta tem de ficar no centro da face plana em que pousa, nas três coordenadas (0,1 mm), com a saída para fora na direção da
 * normal (1 grau). Os casos de hoje, as portas postas à mão na primeira prova (a de A no topo do tambor, fora da saída, e a de B rente à borda do cilindro de saída), reprovam; as portas que a família publica passam. */
import { describe, expect, it } from 'vitest';
import { prepararSolido } from '../../../src/autoria/contato-de-solidos.js';
import { conferirAlinhamentoDasPontas, portasDaResolvida, refazerNaPose } from '../../../procedural/familias/cabo/montagem.js';
import { ARRANJOS, prepararJuntaComCabo } from './junta-com-cabo.mjs';

const { resolvida } = prepararJuntaComCabo();
const reais = portasDaResolvida(resolvida);
const solidos = new Map();
const solidoDe = (id) => {
  if (!solidos.has(id)) { const i = resolvida.instancias.find((x) => x.id === id); solidos.set(id, prepararSolido(i.definicao.neutro, { rotacao: i.poseMundo.rotacao, deslocamento: i.poseMundo.deslocamento, escala: 1 }, [id])); }
  return solidos.get(id);
};
const comPorta = (chave, centroMm, eixo) => new Map([...reais, [chave, { ...reais.get(chave), centro: centroMm.map((v) => v / 1000), ...(eixo ? { eixo } : {}) }]]);
const pedido = ARRANJOS.passa.pedido;

describe('a ponta do cabo no centro da saída', () => {
  it('as portas que a família publica passam: o desvio ao centro da face é zero e a normal é o eixo', () => {
    expect(conferirAlinhamentoDasPontas(pedido, reais, solidoDe)).toEqual([]);
  });

  it('a fixture antiga reprova: a porta de A no topo do tambor (44, 65, 0) e a de B rente à borda do cilindro de saída (22,4, 88, 0)', () => {
    const antigas = comPorta('carcacaB.cabo', [22.4, 88, 0], [1, 0, 0]);
    antigas.set('carcacaA.cabo', { ...reais.get('carcacaA.cabo'), centro: [0.044, 0.065, 0], eixo: [0, 1, 0] });
    const problemas = conferirAlinhamentoDasPontas(pedido, antigas, solidoDe);
    expect(problemas).toHaveLength(2);
    expect(problemas[0]).toMatch(/pedido\.de: a porta 'carcacaA\.cabo' está a \[44, 0, 0\] mm \(x, y, z\) do centro da face em que pousa/);
    expect(problemas[1]).toMatch(/pedido\.para: a porta 'carcacaB\.cabo' não fica numa face da peça/);
    const feito = refazerNaPose(pedido, antigas, { solidoDe });
    expect(feito.chamadas).toBeNull();
    expect(feito.recusa.motivo).toBe('desalinhada');
  });

  it('a porta rente à borda do cilindro de saída (2,5 mm acima do centro, na própria face) reprova pela coordenada y', () => {
    const p = conferirAlinhamentoDasPontas(pedido, comPorta('carcacaB.cabo', [22.32, 85.5 + 2.5, 0]), solidoDe);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/\[0, 2\.5, 0\] mm/);
  });

  it('cada coordenada é conferida: 0,5 mm fora em x (para dentro da face), y ou z reprova, e 0,05 mm em y passa', () => {
    const base = [62, 26.5, 0];
    expect(conferirAlinhamentoDasPontas(pedido, comPorta('carcacaA.cabo', [base[0], base[1] + 0.05, base[2]]), solidoDe)).toEqual([]);
    expect(conferirAlinhamentoDasPontas(pedido, comPorta('carcacaA.cabo', [base[0], base[1] + 0.5, base[2]]), solidoDe)).toHaveLength(1);
    expect(conferirAlinhamentoDasPontas(pedido, comPorta('carcacaA.cabo', [base[0], base[1], base[2] - 0.5]), solidoDe)).toHaveLength(1);
    expect(conferirAlinhamentoDasPontas(pedido, comPorta('carcacaA.cabo', [base[0] - 0.5, base[1], base[2]]), solidoDe)).toHaveLength(1);
  });

  it('a direção de saída reprova a mais de 1 grau da normal da face: 2° reprova, 0,5° passa, e o sentido −1 (para dentro da peça) reprova', () => {
    const giro = (graus) => { const a = (graus * Math.PI) / 180; return [Math.cos(a), Math.sin(a), 0]; };
    expect(conferirAlinhamentoDasPontas(pedido, comPorta('carcacaA.cabo', [62, 26.5, 0], giro(2)), solidoDe)).toHaveLength(1);
    expect(conferirAlinhamentoDasPontas(pedido, comPorta('carcacaA.cabo', [62, 26.5, 0], giro(0.5)), solidoDe)).toEqual([]);
    const invertido = { ...pedido, de: { ...pedido.de, sentido: -1 } };
    expect(conferirAlinhamentoDasPontas(invertido, reais, solidoDe)[0]).toMatch(/180 graus da normal da face/);
  });
});
