/* plano-de-modelagem.test.js — o contrato do que a peça promete ser.
 *
 * O defeito que este arquivo guarda é a parte prometida e não entregue. Numa
 * bicicleta anterior o pneu saiu maciço: aro, cubo e raios não chegaram a
 * existir, e como não havia segunda parte para acusar contato, a peça passou
 * limpa em todas as medidas. Ausência só vira mensurável se a lista tiver sido
 * escrita antes. */
import { describe, expect, it } from 'vitest';
import {
  caminhosDaReferencia,
  conferirPartesContraPlano,
  normalizarPlanoDeModelagem,
} from './plano-de-modelagem.js';

const PLANO = {
  objeto: 'quadro de bicicleta de estrada, modulo 1 de 5',
  referencias: ['docs/referencias/bicicleta-lateral.png'],
  escala: { medida: 'diametro da roda montada', milimetros: 734 },
  partes: [
    { nome: 'tuboInferior', forma: 'tubo achatado do movimento central ao tubo de direcao', tecnica: 'loft de superelipse' },
    { nome: 'tuboSelim', forma: 'tubo quase vertical, da caixa ao topo do selim', tecnica: 'loft de superelipse' },
  ],
  criteriosDeReprovacao: ['tubo do selim com angulo diferente do da referencia'],
};

const com = (mudanca) => normalizarPlanoDeModelagem({ ...PLANO, ...mudanca });

describe('plano de modelagem', () => {
  it('aceita um plano completo e devolve forma canônica, ordenada por nome', () => {
    const plano = normalizarPlanoDeModelagem(PLANO);
    expect(plano.formato).toBe('mecanifica.plano-de-modelagem');
    expect(plano.partes.map((p) => p.nome)).toEqual(['tuboInferior', 'tuboSelim']);
    expect(plano.escala).toEqual({ medida: 'diametro da roda montada', milimetros: 734 });
    /* A ordem da declaração não pode mudar a entrada: plano igual, diff vazio. */
    const invertido = normalizarPlanoDeModelagem({ ...PLANO, partes: [...PLANO.partes].reverse() });
    expect(invertido).toEqual(plano);
  });

  describe('dePerto da parte', () => {
    const parte = (dePerto) => ({ nome: 'barra', forma: 'barra com a ponta de raio 6 mm', tecnica: 'extrusao', ...(dePerto === undefined ? {} : { dePerto }) });
    const entrada = { ponto: [856, 0, -120], oQue: 'a ponta da barra: raio de 6 mm, e não quina viva' };
    const aceita = (dePerto) => normalizarPlanoDeModelagem({ ...PLANO, partes: [parte(dePerto)] }).partes[0];

    it('campo ausente não muda a parte, e o presente passa para a forma canônica na ordem declarada', () => {
      expect(aceita(undefined)).toEqual({ nome: 'barra', forma: 'barra com a ponta de raio 6 mm', tecnica: 'extrusao' });
      const dois = [{ ...entrada, distancia: 90 }, { ponto: [-856, 0, -120], oQue: 'a outra ponta, simétrica' }];
      expect(aceita(dois).dePerto).toEqual(dois);
    });

    it('RECUSA lista vazia, com mais de quatro, ponto fora do formato e distância inválida, dizendo o campo e o motivo', () => {
      const recusa = (dePerto) => () => aceita(dePerto);
      expect(recusa([])).toThrow(/'partes\[0\]\.dePerto' precisa ser lista de 1 a 4 entradas/);
      expect(recusa(Array(5).fill(entrada))).toThrow(/'partes\[0\]\.dePerto' precisa ser lista de 1 a 4/);
      expect(recusa([{ ...entrada, ponto: [1, 2] }])).toThrow(/'partes\[0\]\.dePerto\[0\]\.ponto' precisa ser \[x, y, z\].*milímetros/);
      expect(recusa([{ ...entrada, ponto: [1, 2, Number.NaN] }])).toThrow(/dePerto\[0\]\.ponto/);
      expect(recusa([{ ...entrada, distancia: 0 }])).toThrow(/dePerto\[0\]\.distancia' precisa ser número em milímetros maior que zero/);
      expect(recusa([{ ponto: entrada.ponto }])).toThrow(/precisa declarar: oQue/);
      expect(recusa([{ ...entrada, indice: 1 }])).toThrow(/dePerto\[0\]\.indice' não é permitido/);
    });

    it('RECUSA o oQue acima de 120 caracteres e o curto demais', () => {
      expect(() => aceita([{ ...entrada, oQue: 'x'.repeat(121) }])).toThrow(/'partes\[0\]\.dePerto\[0\]\.oQue' excede 120 caracteres \(tem 121\)/);
      expect(() => aceita([{ ...entrada, oQue: 'raio' }])).toThrow(/oQue' precisa ter pelo menos 10 caracteres/);
    });
  });

  it('o texto acima de 240 caracteres é recusado dizendo o campo, o tamanho e o limite', () => {
    const longo = 'x'.repeat(253);
    expect(() => com({ objeto: longo })).toThrow(/'objeto' excede 240 caracteres \(tem 253, 13 a mais/);
    expect(() => com({ criteriosDeReprovacao: ['tubo do selim com angulo errado', longo] }))
      .toThrow(/'criteriosDeReprovacao\[1\]' excede 240 caracteres \(tem 253/);
    expect(() => com({ partes: [{ nome: 'tubo', forma: 'forma de prova da parte', tecnica: longo }] }))
      .toThrow(/'partes\[0\]\.tecnica' excede 240 caracteres \(tem 253/);
    expect(com({ objeto: 'y'.repeat(240) }).objeto).toHaveLength(240);
  });

  it('as partes vão até 128 e as outras listas até 64', () => {
    const partes = (n) => Array.from({ length: n }, (_, k) => ({ nome: `parte${k}`, forma: 'forma de prova da parte', tecnica: 'caixa' }));
    expect(com({ partes: partes(128) }).partes).toHaveLength(128);
    expect(() => com({ partes: partes(129) })).toThrow(/no máximo 128/);
    const criterios = Array.from({ length: 65 }, (_, k) => `critério de prova número ${k}`);
    expect(() => com({ criteriosDeReprovacao: criterios })).toThrow(/no máximo 64/);
  });

  it('ausência é ausência, e não invalidez: quem exige plano é o gate', () => {
    expect(normalizarPlanoDeModelagem(undefined)).toBe(null);
    expect(normalizarPlanoDeModelagem(null)).toBe(null);
  });

  it('RECUSA plano sem escala, porque sem ela a referência não tem tamanho', () => {
    expect(() => com({ escala: undefined })).toThrow(/escala/);
    expect(() => com({ escala: { medida: 'diametro da roda', milimetros: 0 } })).toThrow(/maior que zero/);
    expect(() => com({ escala: { medida: 'diametro da roda' } })).toThrow(/milimetros/);
  });

  it('RECUSA critério curto demais, que é o campo que some', () => {
    expect(() => com({ criteriosDeReprovacao: ['ok'] })).toThrow(/pelo menos 15/);
    expect(() => com({ criteriosDeReprovacao: [] })).toThrow(/não vazia/);
  });

  it('RECUSA chave desconhecida e campo de runtime', () => {
    expect(() => normalizarPlanoDeModelagem({ ...PLANO, cor: 'azul' })).toThrow(/não é permitido/);
    expect(() => normalizarPlanoDeModelagem({ ...PLANO, timestamp: '2026' })).toThrow(/não é permitido/);
  });

  it('RECUSA nome de parte que não serve de endereço no passo `parte`', () => {
    const parte = { nome: 'tubo do selim', forma: 'tubo quase vertical da caixa ao topo', tecnica: 'loft' };
    expect(() => com({ partes: [parte] })).toThrow(/sem espaço/);
  });

  it('RECUSA repetição de parte e caminho absoluto na referência', () => {
    expect(() => com({ partes: [PLANO.partes[0], PLANO.partes[0]] })).toThrow(/repetir nome/);
    expect(() => com({ referencias: ['/home/alguem/foto.png'] })).toThrow(/caminho absoluto/);
  });

  it('acusa parte prometida e não entregue, e parte entregue sem promessa', () => {
    const plano = normalizarPlanoDeModelagem(PLANO);
    expect(conferirPartesContraPlano(plano, ['tuboInferior', 'tuboSelim']))
      .toMatchObject({ faltando: [], naoPrometidas: [] });
    expect(conferirPartesContraPlano(plano, ['tuboSelim']).faltando).toEqual(['tuboInferior']);
    expect(conferirPartesContraPlano(plano, ['tuboInferior', 'tuboSelim', 'selim']).naoPrometidas)
      .toEqual(['selim']);
  });

  it('a referência é procurada na pasta da peça antes da raiz do repositório', () => {
    expect(caminhosDaReferencia('referencias/lateral.png', 'procedural/pecas/bicicleta'))
      .toEqual([
        'procedural/pecas/bicicleta/referencias/lateral.png',
        'referencias/lateral.png',
      ]);
    /* Peça sem pasta própria só tem a forma antiga, e caminho repetido não
       aparece duas vezes. */
    expect(caminhosDaReferencia('docs/x.png', null)).toEqual(['docs/x.png']);
    expect(caminhosDaReferencia('  ', 'qualquer')).toEqual([]);
  });

  it('sem plano não há conferência, e isso não é aprovação', () => {
    expect(conferirPartesContraPlano(null, ['qualquer']))
      .toEqual({ faltando: [], naoPrometidas: [], prometidas: [] });
  });
});

describe('espessuraMinima do plano', () => {
  const com = (espessuraMinima) => normalizarPlanoDeModelagem({ ...PLANO, espessuraMinima });
  it('é opcional: sem ela o plano sai como antes', () => {
    expect(normalizarPlanoDeModelagem(PLANO)).not.toHaveProperty('espessuraMinima');
  });
  it('aceita { mm } e { mm, partes }, com as partes em ordem', () => {
    expect(com({ mm: 1 }).espessuraMinima).toEqual({ mm: 1 });
    expect(com({ mm: 0.8, partes: ['tuboSelim', 'tuboInferior'] }).espessuraMinima).toEqual({ mm: 0.8, partes: ['tuboInferior', 'tuboSelim'] });
  });
  it('recusa mm ausente, não positivo ou enorme, parte que não existe, lista vazia ou repetida e campo alheio', () => {
    expect(() => com({})).toThrow(/precisa declarar: mm/);
    expect(() => com({ mm: 0 })).toThrow(/maior que zero/);
    expect(() => com({ mm: -1 })).toThrow(/maior que zero/);
    expect(() => com({ mm: 5000 })).toThrow(/até 1000/);
    expect(() => com({ mm: 1, partes: ['inexistente'] })).toThrow(/não está em 'partes'/);
    expect(() => com({ mm: 1, partes: [] })).toThrow(/lista não vazia/);
    expect(() => com({ mm: 1, partes: ['tuboSelim', 'tuboSelim'] })).toThrow(/repetir/);
    expect(() => com({ mm: 1, cor: 1 })).toThrow(/não é permitido/);
    expect(() => com('1')).toThrow(/objeto/);
  });
});
