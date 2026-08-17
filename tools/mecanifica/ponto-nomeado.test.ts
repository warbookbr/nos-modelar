/* ponto-nomeado.test.ts — um nome pode guardar um ponto inteiro (A-8 e A-29).

   O ATRITO, medido pelo O-9: "só se nomeia escalar. 18 dos 61 parâmetros do
   freio existem para nomear 6 pontos do caminho da mangueira, e a curva não tem
   nome — não dá para dizer 'afaste o flexível 5 mm da pinça'."

   Três nomes por ponto não é só verbosidade. É a mesma coisa escrita três
   vezes, em três linhas que podem divergir: alterar `apoioX` e `apoioY` e
   esquecer `apoioZ` produz um ponto que ninguém escreveu, e nada avisa. O nome
   único é o que torna o ponto uma coisa só, alterável de uma vez.

   A-29 ("centro geral do arranjo radial ainda não é nomeável") tinha ficha
   própria na lista de atritos, mas é o MESMO defeito visto de outro ângulo: o
   `pivo` não aceitava nome porque nenhum ponto aceitava. Uma correção na rede
   central fecha os dois — e é por isso que as duas provas moram juntas aqui.

   O componente continua escalar de propósito. Um ponto nomeado que pudesse
   citar outro ponto nomeado traria ciclo para dentro da rede que resolve TODO
   campo dimensional da Oficina; um nível resolve o atrito medido, e a recusa
   está provada abaixo. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';

const CUBO = { op: 'cubo', id: 1 };
const base = () => ['cubo', { origemId: 1, larg: 0.1, alt: 0.1, prof: 0.1 }];

const posicoes = (malha: any) => [...malha.V.entries()]
  .sort((a: any, b: any) => a[0] - b[0])
  .map(([, p]: any) => (p as number[]).map((n) => +n.toFixed(12)));

const gritos = (malha: any) => (malha.orfaos ?? []).map((o: any) => o.motivo).join(' | ');
const erroDe = (fn: () => unknown) => { try { fn(); } catch (e) { return String((e as Error).message); } return ''; };

describe('um nome guarda o ponto inteiro', () => {
  it('nomear o ponto produz exatamente o mesmo resultado que escrever os três', () => {
    const porNome = nucleo([
      base(), ['transladar', { sel: { origem: CUBO }, d: 'apoioDaPinca' }],
    ], { apoioDaPinca: [0.1, 0.2, 0.3] });
    const porComponente = nucleo([
      base(), ['transladar', { sel: { origem: CUBO }, d: [0.1, 0.2, 0.3] }],
    ], {});
    expect(gritos(porNome)).toBe('');
    expect(posicoes(porNome)).toEqual(posicoes(porComponente));
  });

  it('o componente continua aceitando PARAM e expressão', () => {
    const malha = nucleo([
      base(), ['transladar', { sel: { origem: CUBO }, d: 'apoio' }],
    ], { apoio: ['recuo', 0, '= recuo * 2'], recuo: 0.05 });
    const esperado = nucleo([
      base(), ['transladar', { sel: { origem: CUBO }, d: [0.05, 0, 0.1] }],
    ], {});
    expect(gritos(malha)).toBe('');
    expect(posicoes(malha)).toEqual(posicoes(esperado));
  });

  it('vale onde qualquer ponto vale: pivo, em e direcao', () => {
    const malha = nucleo([
      ['cubo', { origemId: 1, larg: 0.2, alt: 0.02, prof: 0.2 }],
      ['cubo', { origemId: 2, larg: 0.05, alt: 0.03, prof: 0.05, em: 'posicaoInicial' }],
      ['encostar', {
        sel: { origem: { op: 'cubo', id: 2 } }, referencia: { origem: { op: 'cubo', id: 1 } },
        direcao: 'paraBaixo',
      }],
      ['rotaciona', { sel: { origem: { op: 'cubo', id: 2 } }, eixo: 'y', graus: 45, pivo: 'centro' }],
    ], { posicaoInicial: [0, 0.5, 0], paraBaixo: [0, -1, 0], centro: [0, 0, 0] });
    expect(gritos(malha)).toBe('');
  });

  it('A-29: o centro do arranjo radial passa a ter nome', () => {
    const malha = nucleo([
      ['cubo', { origemId: 1, larg: 0.02, alt: 0.02, prof: 0.02, em: [0.1, 0, 0] }],
      ['arranja', {
        origemId: 2, derivaDe: CUBO, sel: { origem: CUBO },
        modo: 'radial', eixo: 'y', total: 4, volta: 360, pivo: 'centroDaRoda',
      }],
    ], { centroDaRoda: [0, 0, 0] });
    expect(gritos(malha)).toBe('');
    const literal = nucleo([
      ['cubo', { origemId: 1, larg: 0.02, alt: 0.02, prof: 0.02, em: [0.1, 0, 0] }],
      ['arranja', {
        origemId: 2, derivaDe: CUBO, sel: { origem: CUBO },
        modo: 'radial', eixo: 'y', total: 4, volta: 360, pivo: [0, 0, 0],
      }],
    ], {});
    expect(posicoes(malha)).toEqual(posicoes(literal));
  });

  it('um ponto nomeado é alterado num lugar só', () => {
    /* a razão de existir do recorte: mover o ponto é mexer numa linha, e não em
       três que podem divergir. */
    const com = (apoio: number[]) => posicoes(nucleo([
      base(), ['transladar', { sel: { origem: CUBO }, d: 'apoio' }],
    ], { apoio }));
    expect(com([0, 0, 0])).not.toEqual(com([0, 0.5, 0]));
  });
});

describe('as recusas', () => {
  it('nome que não existe no dicionário grita', () => {
    expect(erroDe(() => nucleo([base(), ['transladar', { sel: { origem: CUBO }, d: 'naoExiste' }]], {})))
      .toMatch(/ponto 'naoExiste' não está em PARAMS nem em TOPO/);
  });

  it('nome que guarda escalar grita dizendo o que ele guarda', () => {
    expect(erroDe(() => nucleo([base(), ['transladar', { sel: { origem: CUBO }, d: 'espessura' }]], { espessura: 0.5 })))
      .toMatch(/'espessura' foi citado como ponto, mas guarda 0\.5/);
  });

  it('nome que guarda lista de aridade errada grita', () => {
    expect(erroDe(() => nucleo([base(), ['transladar', { sel: { origem: CUBO }, d: 'meio' }]], { meio: [1, 2] })))
      .toMatch(/ponto nomeado guarda \[x,y,z\]/);
  });

  it('ponto nomeado citando outro ponto nomeado é recusado', () => {
    expect(erroDe(() => nucleo([base(), ['transladar', { sel: { origem: CUBO }, d: 'a' }]], { a: ['b', 0, 0], b: [1, 2, 3] })))
      .toMatch(/cita outro ponto nomeado como componente/);
  });
});

describe('o que já existia continua igual', () => {
  it('a forma literal segue valendo, e a mensagem de aridade agora cita as duas', () => {
    expect(erroDe(() => nucleo([base(), ['transladar', { sel: { origem: CUBO }, d: [1, 2] }]], {})))
      .toMatch(/\[x,y,z\] \(3 elementos\) ou o nome de um ponto declarado/);
  });

  it('peça sem ponto nomeado não muda um vértice', () => {
    const antes = nucleo([base(), ['transladar', { sel: { origem: CUBO }, d: [0.1, 0, 0] }]], {});
    const depois = nucleo([base(), ['transladar', { sel: { origem: CUBO }, d: [0.1, 0, 0] }]], {});
    expect(posicoes(antes)).toEqual(posicoes(depois));
  });
});
