/* argumentos-essenciais.test.mjs — o gate dos essenciais e a recusa na hora: cada receita mínima errada do inventário de erros
   (docs/modelar/banco-de-provas/revisao-do-projeto-2026-11-13) é recusada no passo certo, com a causa e o que fazer. */
import { describe, expect, it } from 'vitest';
import { chamadasDeNucleoSemRegistro, conferirArgumentosEssenciais } from './argumentos-essenciais.mjs';
import { nucleo } from '../../procedural/nucleo/nucleo.js';
import { REGISTRO_DA_RECEITA } from '../../src/autoria/executar-receita.js';
import { essenciaisDaOperacao, recusasDeEssenciais } from '../../procedural/nucleo/uso-operacoes.js';

const motivos = (neutro) => neutro.orfaos.map((o) => `passo ${o.passo} (${o.op}) ${o.ref}: ${o.motivo}`);

describe('o gate dos argumentos essenciais', () => {
  it('passa no núcleo de agora', () => {
    expect(conferirArgumentosEssenciais()).toEqual([]);
  });
});

describe('a tabela das primitivas', () => {
  it('diz o padrão de cada argumento que tem padrão, e a ausência não é recusada', () => {
    expect(essenciaisDaOperacao('cilindro').comPadrao).toEqual({ raio: 0.5, altura: 1, lados: 8 });
    expect(nucleo([['cilindro', {}], ['cone', {}], ['esfera', {}], ['plano', {}], ['cubo', {}]], {}, {}).orfaos).toEqual([]);
  });

  it('a operação que diz não ter essenciais declara o motivo', () => {
    expect(essenciaisDaOperacao('transladar')).toMatchObject({ essenciais: [], semEssenciais: expect.stringContaining('translação zero') });
  });
});

describe('o valor não positivo que vem declarado', () => {
  const casos = [
    ['cilindro', { raio: -1, altura: 1 }, 'raio', '-1'],
    ['cilindro', { raio: 0.5, altura: 0 }, 'altura', '0'],
    ['esfera', { raio: 0 }, 'raio', '0'],
    ['cone', { raio: 1, altura: -2 }, 'altura', '-2'],
    ['plano', { largura: -1, profundidade: 1 }, 'largura', '-1'],
    ['cubo', { lado: -1 }, 'lado', '-1'],
    ['cubo', { larg: 1, alt: 0, prof: 1 }, 'alt', '0'],
  ];
  for (const [op, args, campo, valor] of casos) {
    it(`${op} com ${campo} ${valor} é recusado no passo, com valor e limite, e não deixa geometria`, () => {
      const neutro = nucleo([['cubo', { lado: 1 }], [op, args]], {}, {});
      const achado = neutro.orfaos.find((o) => o.ref === campo);
      expect(achado, motivos(neutro).join('\n')).toBeTruthy();
      expect(achado.passo).toBe(1);
      expect(achado.motivo).toContain('passo 1');
      expect(achado.motivo).toContain(`'${campo}' vale ${valor}`);
      expect(achado.motivo).toContain('maior que 0');
      expect(neutro.V.size).toBe(8);
    });
  }

  it('nome de parâmetro que resolve para valor não positivo cita o valor resolvido', () => {
    const neutro = nucleo([['cilindro', { raio: 'r', altura: 1 }]], { r: -3 }, {});
    expect(neutro.orfaos[0].motivo).toContain("'raio' vale \"r\" (= -3)");
  });

  it('o cubo com prof negativo da receita do sedã continua passando, e prof zero (inclusive -0) é recusado', () => {
    expect(nucleo([['cubo', { larg: 1, alt: 1, prof: -1 }]], {}, {}).orfaos).toEqual([]);
    for (const zero of [0, -0]) {
      const neutro = nucleo([['cubo', { larg: 1, alt: 1, prof: zero }]], {}, {});
      expect(neutro.orfaos[0]).toMatchObject({ op: 'cubo', ref: 'prof' });
      expect(neutro.orfaos[0].motivo).toContain('diferente de 0');
      expect(neutro.V.size).toBe(0);
    }
  });

  it('lados, aneis e seg abaixo do mínimo são recusados dizendo o mínimo', () => {
    const casos = [['cilindro', { raio: 1, altura: 1, lados: 2 }, 'lados', 3], ['cone', { raio: 1, altura: 1, lados: 1 }, 'lados', 3],
      ['esfera', { raio: 1, aneis: 1 }, 'aneis', 2], ['esfera', { raio: 1, lados: 2 }, 'lados', 3], ['plano', { largura: 1, profundidade: 1, seg: 0 }, 'seg', 1]];
    for (const [op, args, campo, minimo] of casos) {
      const neutro = nucleo([[op, args]], {}, {});
      expect(neutro.orfaos[0], `${op} ${campo}`).toMatchObject({ op, ref: campo });
      expect(neutro.orfaos[0].motivo).toContain(`mínimo de '${op}', que é ${minimo}`);
      expect(neutro.V.size).toBe(0);
    }
    expect(nucleo([['cilindro', { raio: 1, altura: 1, lados: 3 }], ['esfera', { aneis: 2, lados: 3 }], ['plano', { seg: 1 }]], {}, {}).orfaos).toEqual([]);
    expect(nucleo([['cilindro', { raio: 1, altura: 1, lados: { desvio: 0.01 } }]], {}, {}).orfaos).toEqual([]);
  });

  it('o contrato próprio com positivos recusa zero e deixa passar o positivo', () => {
    const contrato = { essenciais: [['raio']], positivos: ['raio'] };
    expect(recusasDeEssenciais('x', { raio: 0 }, contrato, (v) => v)).toHaveLength(1);
    expect(recusasDeEssenciais('x', { raio: 0.1 }, contrato, (v) => v)).toEqual([]);
    expect(recusasDeEssenciais('x', {}, contrato, (v) => v)[0].motivo).toContain("falta o argumento essencial 'raio'");
  });
});

describe('nome de operação e de parâmetro errados', () => {
  it('operação desconhecida sugere o nome próximo', () => {
    const neutro = nucleo([['cubo', { lado: 1 }], ['transladr', { d: [1, 0, 0] }]], {}, {});
    const [o] = neutro.orfaos;
    expect(o.passo).toBe(1);
    expect(o.motivo).toContain("operação desconhecida 'transladr'");
    expect(o.motivo).toContain("Você quis dizer 'transladar'?");
  });

  it('a sugestão de nome tem distância proporcional ao tamanho do nome', () => {
    let erro;
    try { nucleo([['cilindro', { raio: '2', altura: 1 }]], { k: 1 }, {}); } catch (e) { erro = e; }
    expect(erro.message).toContain("parâmetro '2' não existe");
    expect(erro.message).not.toContain('você quis dizer');
  });

  it('ponto nomeado inexistente em `em` lança com o passo e a sugestão', () => {
    let erro;
    try { nucleo([['cubo', { lado: 1 }], ['cubo', { lado: 1, em: 'apoioo' }]], { apoio: [0, 0, 0] }, {}); } catch (e) { erro = e; }
    expect(erro.message).toContain('passo 1 (cubo)');
    expect(erro.message).toContain("ponto 'apoioo' não está em PARAMS nem em TOPO");
    expect(erro.message).toContain("você quis dizer 'apoio'?");
    expect(erro.passo).toBe(1);
  });

  it('parâmetro inexistente lança com passo, operação, argumento e nomes próximos', () => {
    const passos = [['cubo', { lado: 1 }], ['cilindro', { raio: 'grnade', altura: 1 }]];
    let erro;
    try { nucleo(passos, { grande: 1 }, {}); } catch (e) { erro = e; }
    expect(erro).toBeInstanceOf(Error);
    expect(erro.message).toContain('passo 1 (cilindro)');
    expect(erro.message).toContain("argumento 'raio'");
    expect(erro.message).toContain("parâmetro 'grnade' não existe em PARAMS/TOPO");
    expect(erro.message).toContain("você quis dizer 'grande'?");
    expect([erro.passo, erro.op, erro.chave]).toEqual([1, 'cilindro', 'raio']);
  });

  it('o nome dentro de uma expressão também é achado', () => {
    let erro;
    try { nucleo([['cilindro', { raio: '=metade * 2', altura: 1 }]], { meta: 1 }, {}); } catch (e) { erro = e; }
    expect(erro.message).toContain('passo 0 (cilindro)');
    expect(erro.message).toContain("argumento 'raio'");
    expect(erro.message).toContain("você quis dizer 'meta'?");
  });

  it('valor que não é número diz o passo e o argumento', () => {
    let erro;
    try { nucleo([['cubo', { lado: 1 }], ['transladar', { d: [1, { x: 1 }, 0] }]], {}, {}); } catch (e) { erro = e; }
    expect(erro.message).toContain('passo 1 (transladar)');
    expect(erro.message).toContain('valor numérico inválido');
    expect(erro.chave).toBe('d[1]');
  });
});

describe('as recusas que diziam undefined', () => {
  const base = [['cubo', { origemId: 1, lado: 1 }]];
  const casos = [
    ['arranja sem modo', [...base, ['arranja', { total: 3, d: [1, 0, 0], origemId: 2, derivaDe: { op: 'cubo', id: 1 } }]], 'modo'],
    ['espelha sem eixo', [...base, ['espelha', { pos: 0 }]], 'eixo'],
    ['rotaciona sem eixo', [...base, ['rotaciona', { graus: 10 }]], 'eixo'],
    ['material sem usa', [...base, ['material', {}]], 'usa'],
  ];
  for (const [nome, passos, campo] of casos) {
    it(`${nome} diz o campo que faltou`, () => {
      const neutro = nucleo(passos, {}, {}, { aco: { cor: '#888' } });
      const achado = neutro.orfaos.find((o) => o.ref === campo);
      expect(achado, motivos(neutro).join('\n')).toBeTruthy();
      expect(achado.motivo).toContain(`falta o argumento '${campo}'`);
      expect(achado.motivo).not.toContain('undefined');
    });
  }
  it('pesar sem osso diz o campo que faltou', () => {
    const neutro = nucleo([...base, ['pesar', { peso: 1 }]], {}, {}, {}, { ossos: [{ nome: 'raiz' }] });
    const achado = neutro.orfaos.find((o) => o.ref === 'osso');
    expect(achado.motivo).toContain("falta o argumento 'osso'");
  });
});

describe('o registro da receita nas ferramentas', () => {
  const barras = [['estruturaDeBarras', { nos: [{ nome: 'a', posicao: [0, 0, 0] }, { nome: 'b', posicao: [0, 200, 0] }], barras: [{ nome: 't', de: 'a', para: 'b' }], perfil: { tipo: 'tubo-redondo', diametro: 30, lados: 12 } }],
    ['parte', { nome: 'tubo', sel: { tudo: true } }]];

  it('o gate acha a chamada de nucleo( sem registro e deixa passar a que passa o registro', async () => {
    const { mkdtempSync, mkdirSync, rmSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const raiz = mkdtempSync(join(tmpdir(), 'nucleo-sem-registro-'));
    try {
      mkdirSync(join(raiz, 'tools/modelar'), { recursive: true }); mkdirSync(join(raiz, 'src/autoria'), { recursive: true });
      writeFileSync(join(raiz, 'tools/modelar/ruim.mjs'), "const a = nucleo(passos, {}, {}, {}, null, []);\n");
      writeFileSync(join(raiz, 'tools/modelar/boa.mjs'), "// nucleo(passos) em comentário\nconst a = nucleo(passos, {}, {}, {}, null, [], { registroOperacoes: REGISTRO_DA_RECEITA });\nconst b = nucleo();\n");
      writeFileSync(join(raiz, 'src/autoria/executar-receita.js'), "const n = nucleo(a, b, c);\n");
      expect(chamadasDeNucleoSemRegistro(raiz)).toEqual(['tools/modelar/ruim.mjs:1']);
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  it('o repositório não tem chamada de nucleo( sem registro em tools/modelar e src', () => {
    expect(chamadasDeNucleoSemRegistro()).toEqual([]);
  });

  it('uma peça de barras passa na guarda de casca aberta e na autoria declarativa', async () => {
    const { motivoDeCascaAberta } = await import('./../modelar/guardas/guarda-acervo.mjs');
    const forma = nucleo(barras, {}, {}, {}, null, [], { registroOperacoes: REGISTRO_DA_RECEITA });
    expect(forma.orfaos).toEqual([]);
    expect(motivoDeCascaAberta(forma, barras)).toBeNull();
    const { executarReceitaDeclarativa } = await import('./../modelar/autoria-receita.mjs');
    const peca = executarReceitaDeclarativa({ formato: 'mecanifica.receita-declarativa', versao: 1, id: 'tubo-guia', params: {}, topo: {}, passos: barras, materiais: {}, aliases: [], meta: { nome: 'tubo-guia' } });
    expect(JSON.stringify(peca)).toContain('tubo');
  });
});
