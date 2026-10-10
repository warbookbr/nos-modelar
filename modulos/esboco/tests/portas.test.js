/* Portas no esboço: o campo `porta` (`recebe`, `ocupa`, `apoia`) das formas e o gate de contato que o lê. A prova é por medida:
   a moto de curvas segue aprovada com um anel que recebe e um cilindro que ocupa justificados por porta, sem `motivo` nem
   `max`; o desalinhamento de raio reprova dizendo a folga medida e a da classe; o encosto de planos sai de
   `validarAssentamentoPlano`; e o esboço sem `porta` mantém o contato e o desenho de sempre. */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { desenharEsboco } from '../src/index.js';
import { descreverAchado, verificarContato } from '../src/contato.js';
import { avaliarPortas, lerPorta } from '../src/portas.js';
import { resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';

const lerFixture = (nome) => JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/${nome}`, import.meta.url)), 'utf8'));
const moto = lerFixture('moto-curvas.esboco.json');

/* A moto de curvas com uma presilha (anel) abraçando o guidão (cilindro de 26 mm), longe da coroa do garfo e da coluna. O par
   `atravessa` não leva `motivo` nem `max`: a justificativa é a porta das duas formas. */
function motoComPresilha({ furo = 26.02, classe, desloca = [250, 0, 0], papelDaPresilha = 'recebe', pares } = {}) {
  const e = structuredClone(moto);
  e.formas = e.formas.map((f) => (f.id === 'guidao' ? { ...f, porta: classe ? { papel: 'ocupa', classe } : 'ocupa' } : f));
  e.formas.push({ id: 'presilha', tipo: 'anel', diametroExterno: 60, diametroInterno: furo, espessura: 40, eixo: 'x', centro: 'guidao.centro', desloca, cor: 'preto', porta: papelDaPresilha });
  e.contato = { ...e.contato, pares: [...e.contato.pares, ...(pares ?? [{ a: 'presilha', b: 'guidao', tipo: 'atravessa' }])] };
  return e;
}

describe('o anel que recebe e o cilindro que ocupa', () => {
  it('a moto de curvas segue aprovada com o par justificado pela porta, sem motivo nem max', () => {
    const e = motoComPresilha();
    expect(e.contato.pares.at(-1)).toEqual({ a: 'presilha', b: 'guidao', tipo: 'atravessa' });
    const c = verificarContato(e);
    expect(c.resultado).toBe('aprovado');
    expect(c.achados).toEqual([]);
    expect(c.portas).toHaveLength(2);
    expect(c.portas[0]).toMatchObject({ tipo: 'ajuste', recebe: 'presilha', ocupa: 'guidao', classe: 'folgado', satisfeita: true, descentro_mm: 0 });
    expect(c.portas[0].folga_diametral_mm).toBeCloseTo(0.02, 9);
    expect(c.portas[0].faixa_mm).toEqual([0.007, 0.041]);
    /* a junta da coroa com o guidão continua com o motivo e o max dela */
    expect(c.atravessamentos.filter((t) => t.a.includes('coroa') || t.b.includes('coroa'))).toHaveLength(4);
  });

  it('o mesmo par sem porta continua pedindo o motivo', () => {
    const e = motoComPresilha();
    e.formas = e.formas.map(({ porta, ...f }) => f);
    expect(() => verificarContato(e)).toThrow(/presilha ↔ guidao \(tipo atravessa\) precisa dizer por que a exceção existe: falta o campo "motivo"/);
  });

  it('o par cujas portas não se encaixam também pede o motivo e diz por quê', () => {
    const e = motoComPresilha({ papelDaPresilha: 'apoia' });
    expect(() => verificarContato(e)).toThrow(/A porta não o justifica: .*as duas portas não se encaixam/);
  });

  it('o desalinhamento de raio reprova dizendo a folga medida e a da classe', () => {
    const c = verificarContato(motoComPresilha({ furo: 28 }));
    expect(c.resultado).toBe('reprovado');
    const a = c.achados.find((x) => x.opcao === 'A. Naked');
    expect(a).toMatchObject({ tipo: 'porta-fora', pecas: ['guidao', 'presilha'], porta: 'ajuste' });
    expect(a.mm).toBeCloseTo(1.959, 3);
    const texto = descreverAchado(a);
    expect(texto).toContain('a folga diametral medida é 2 mm e a da classe folgado vai de 0,007 a 0,041 mm para o nominal de 28 mm');
    expect(texto).toContain('presilha (anel que recebe, furo de 28 mm)');
    expect(texto).toContain('guidao (cilindro que ocupa, 26 mm)');
  });

  it('a classe do ajuste muda a faixa: a interferência de 0,02 mm passa em interferencia e reprova em folgado', () => {
    const dentro = verificarContato(motoComPresilha({ furo: 25.98, classe: 'interferencia' }));
    expect(dentro.resultado).toBe('aprovado');
    expect(dentro.portas[0]).toMatchObject({ classe: 'interferencia', faixa_mm: [-0.035, -0.001], satisfeita: true });
    /* a penetração medida (a do prisma) fica dentro do máximo que a porta justifica: metade do aperto da classe mais 0,1 mm */
    expect(dentro.portas[0].penetracao_mm).toBeLessThanOrEqual(dentro.portas[0].max_mm);
    expect(dentro.portas[0].max_mm).toBe(0.118);
    const fora = verificarContato(motoComPresilha({ furo: 25.98 }));
    expect(fora.resultado).toBe('reprovado');
    expect(descreverAchado(fora.achados[0])).toContain('a folga diametral medida é -0,02 mm e a da classe folgado vai de 0,007 a 0,041 mm');
  });

  it('o aperto além da classe reprova', () => {
    const c = verificarContato(motoComPresilha({ furo: 25.9, classe: 'interferencia' }));
    expect(c.resultado).toBe('reprovado');
    expect(descreverAchado(c.achados[0])).toContain('a folga diametral medida é -0,1 mm e a da classe interferencia vai de -0,035 a -0,001 mm');
  });

  it('eixos descentrados reprovam com a medida e a tolerância', () => {
    const c = verificarContato(motoComPresilha({ desloca: [250, 0.5, 0] }));
    expect(c.resultado).toBe('reprovado');
    expect(descreverAchado(c.achados[0])).toContain('os eixos estão descentrados 0,5 mm e a tolerância é 0,001 mm');
  });

  it('duas classes diferentes nas duas portas são recusadas', () => {
    const e = motoComPresilha({ classe: 'interferencia' });
    e.formas = e.formas.map((f) => (f.id === 'presilha' ? { ...f, porta: { papel: 'recebe', classe: 'folgado' } } : f));
    expect(() => verificarContato(e)).toThrow(/declaram classes de ajuste diferentes \(.*interferencia.*folgado|.*folgado.*interferencia\)/);
  });

  it('o par herdado do espelho lê as portas da cópia', () => {
    const e = structuredClone(moto);
    e.formas = e.formas.map((f) => (f.id === 'guidao' ? { ...f, porta: 'ocupa' } : f));
    e.formas.push({ id: 'presilhaE', tipo: 'anel', diametroExterno: 60, diametroInterno: 26.02, espessura: 40, eixo: 'x', centro: 'guidao.centro', desloca: [250, 0, 0], porta: 'recebe' });
    e.formas.push({ id: 'presilhaD', espelha: { forma: 'presilhaE', eixo: 'x' } });
    e.contato = { ...e.contato, pares: [...e.contato.pares, { a: 'presilhaE', b: 'guidao', tipo: 'atravessa' }] };
    const c = verificarContato(e);
    expect(c.resultado).toBe('aprovado');
    expect(c.portas.map((p) => p.recebe).sort()).toEqual(['presilhaD', 'presilhaD', 'presilhaE', 'presilhaE']);
  });
});

/* Duas caixas: a base que recebe e o bloco que apoia sobre ela. */
function apoio({ bloco = {}, base = {}, tolerancia = 2, tipo = 'encosta' } = {}) {
  return {
    contato: { usar: true, tolerancia, pares: [{ a: 'bloco', b: 'base', tipo }] },
    opcoes: [{ titulo: 'A' }],
    formas: [
      { id: 'base', tipo: 'caixa', largura: 200, altura: 20, profundidade: 100, centro: [0, 10, 0], porta: 'recebe', ...base },
      { id: 'bloco', tipo: 'caixa', largura: 100, altura: 50, profundidade: 60, sobre: 'base', porta: 'apoia', ...bloco },
    ],
  };
}

describe('a face que apoia e a que recebe', () => {
  it('o encosto exato passa pelo assentamento de plano', () => {
    const c = verificarContato(apoio());
    expect(c.resultado).toBe('aprovado');
    expect(c.portas).toEqual([{ opcao: 'A', a: 'base', b: 'bloco', tipo: 'assentamento', recebe: 'base', apoia: 'bloco', separacao_mm: 0, extrapolacao_mm: -20, satisfeita: true }]);
  });

  it('o bloco no ar reprova pela porta mesmo dentro da tolerância do gate', () => {
    const solto = apoio({ bloco: { desloca: [0, 3, 0] }, tolerancia: 5 });
    const semPorta = structuredClone(solto);
    semPorta.formas = semPorta.formas.map(({ porta, ...f }) => f);
    expect(verificarContato(semPorta).resultado).toBe('aprovado');
    const c = verificarContato(solto);
    expect(c.resultado).toBe('reprovado');
    expect(c.achados[0]).toMatchObject({ tipo: 'porta-fora', porta: 'assentamento' });
    expect(descreverAchado(c.achados[0])).toContain('as faces estão a 3 mm uma da outra e o apoio pede 0 mm');
  });

  it('o apoio que passa da borda da face que recebe reprova com a medida', () => {
    const c = verificarContato(apoio({ bloco: { largura: 300 } }));
    expect(c.resultado).toBe('reprovado');
    expect(descreverAchado(c.achados[0])).toContain('o apoio passa 50 mm da borda da face que recebe');
  });

  it('faces que não são paralelas e opostas reprovam', () => {
    const c = verificarContato(apoio({ bloco: { rotacao: { z: 5 } } }));
    expect(c.resultado).toBe('reprovado');
    expect(descreverAchado(c.achados[0])).toContain('as faces não são paralelas e opostas');
  });

  it('a face lateral se escolhe pelo lado do mundo', () => {
    const e = apoio({ bloco: { sobre: undefined, centro: [150, 10, 0] }, base: { porta: { papel: 'recebe', face: '+x' } } });
    e.formas[1].porta = { papel: 'apoia', face: '-x' };
    e.formas[1].altura = 20;
    const c = verificarContato(e);
    expect(c.portas[0]).toMatchObject({ tipo: 'assentamento', satisfeita: true });
    expect(c.portas[0].separacao_mm).toBeCloseTo(0, 9);
  });

  it('o par atravessa com portas de plano pede o motivo e diz que é um encosto', () => {
    expect(() => verificarContato(apoio({ tipo: 'atravessa' }))).toThrow(/A porta não o justifica: .*formam um encosto de planos, e o par é atravessa/);
  });

  it('o encosto implícito da própria geometria também é lido pelas portas', () => {
    const e = apoio();
    e.contato.pares = [];
    e.formas[1] = { ...e.formas[1], sobre: undefined, encosta: { referencia: 'base', direcao: '+y' }, centro: [0, 0, 0] };
    e.formas[1].centro = [0, 45, 0];
    const c = verificarContato(e);
    expect(c.portas?.[0]?.tipo).toBe('assentamento');
  });
});

describe('o campo porta', () => {
  it('é validado no esquema, com o que vale em cada forma', () => {
    const forma = (porta, extra = {}) => ({ opcoes: [{ titulo: 'A', formas: [{ id: 'x', tipo: 'caixa', largura: 10, altura: 10, profundidade: 10, porta, ...extra }] }] });
    expect(() => desenharEsboco(forma('recebee'))).toThrow(/o papel da porta "recebee" deve ser um de recebe, ocupa, apoia \(quis dizer "recebe"\?\)/);
    expect(() => desenharEsboco(forma('ocupa'))).toThrow(/a porta "ocupa" não vale em caixa; vale em cilindro/);
    expect(() => desenharEsboco(forma({ papel: 'recebe', classe: 'justo' }))).toThrow(/a classe de ajuste da porta "justo" deve ser uma de folgado, transicao, interferencia/);
    expect(() => desenharEsboco(forma({ papel: 'apoia', classe: 'folgado' }))).toThrow(/a "classe" é do ajuste de eixo em furo e não vale na porta que apoia/);
    expect(() => desenharEsboco(forma({ papel: 'recebe', lado: '+y' }))).toThrow(/a porta não tem o campo "lado"/);
    expect(() => desenharEsboco(forma({ papel: 'recebe', face: 'cima' }))).toThrow(/a face da porta "cima" deve ser uma de/);
    expect(() => desenharEsboco(forma(5))).toThrow(/"porta" deve ser "recebe", "ocupa", "apoia" ou um objeto/);
    expect(lerPorta({ papel: 'recebe', classe: 'transicao', face: '+y' }, 'x', 'caixa')).toEqual({ papel: 'recebe', classe: 'transicao', face: '+y' });
  });

  it('não muda o desenho: o SVG da moto é o mesmo com e sem porta', () => {
    const com = motoComPresilha();
    const sem = structuredClone(com);
    sem.formas = sem.formas.map(({ porta, ...f }) => f);
    expect(desenharEsboco(com).svg).toBe(desenharEsboco(sem).svg);
  });

  it('o esboço sem porta não ganha o bloco portas e o contato fica como era', () => {
    const c = verificarContato(moto);
    expect(c.resultado).toBe('aprovado');
    expect('portas' in c).toBe(false);
    expect(c.atravessamentos.every((t) => t.porta === undefined)).toBe(true);
  });

  it('o par sem porta numa das duas formas é julgado como sempre', () => {
    const e = motoComPresilha();
    e.formas = e.formas.map(({ porta, ...f }) => (f.id === 'presilha' ? { porta, ...f } : f));
    e.formas = e.formas.map((f) => (f.id === 'guidao' ? (({ porta, ...resto }) => resto)(f) : f));
    expect(() => verificarContato(e)).toThrow(/falta o campo "motivo"/);
    const exp = expandirEsboco(e);
    const rs = resolverOpcao(exp.opcoes[0], 'A', exp.pontos);
    expect(avaliarPortas(rs.find((r) => r.id === 'presilha'), rs.find((r) => r.id === 'guidao'), 'atravessa')).toBeNull();
  });
});

describe('a independência do módulo', () => {
  it('a única importação de fora do módulo, além de procedural/nucleo, é a régua pura das portas', () => {
    const pasta = fileURLToPath(new URL('../src/', import.meta.url));
    const fora = [];
    for (const arquivo of readdirSync(pasta).filter((n) => n.endsWith('.js'))) {
      for (const m of readFileSync(`${pasta}${arquivo}`, 'utf8').matchAll(/from '(\.\.\/\.\.\/\.\.\/[^']+)'/g)) fora.push(`${arquivo}: ${m[1]}`);
    }
    expect(fora.sort()).toEqual([
      "expandir.js: ../../../procedural/nucleo/expressoes.js",
      "index.js: ../../../procedural/nucleo/contorno.js",
      "portas.js: ../../../src/autoria/regua-de-portas.js",
    ]);
  });

  it('a régua não importa nada', () => {
    const texto = readFileSync(fileURLToPath(new URL('../../../src/autoria/regua-de-portas.js', import.meta.url)), 'utf8');
    expect(texto.match(/^\s*import\b/gm)).toBeNull();
  });
});
