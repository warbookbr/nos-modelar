/* refinamento-global.test.js — a declaração REFINA, as portas do andaime e a conferência contra a peça executada. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import { normalizarAndaimeGlobal } from './forma-global.js';
import {
  conferirRefinamentoGlobal, LIMITE_DA_TOLERANCIA_DA_PORTA_MM, LIMITE_DA_TOLERANCIA_DO_ENVELOPE_MM, normalizarRefinamentoGlobal,
} from './refinamento-global.js';
import { receitaDoSuporte } from '../../tools/fixtures/refina-forma-global/suporte.js';

const ANDAIME = JSON.parse(readFileSync(new URL('../../tools/fixtures/refina-forma-global/andaime.json', import.meta.url), 'utf8'));
const copia = (x) => JSON.parse(JSON.stringify(x));
const conferir = (opcoes = {}, andaime = ANDAIME) => {
  const receita = receitaDoSuporte(opcoes);
  const { neutro } = executarReceita(receita);
  expect(neutro.orfaos).toEqual([]);
  return conferirRefinamentoGlobal({ refinamento: receita.REFINA, andaime, neutro });
};
const REFINA = { andaime: 'andaime.json', partes: { sapata: 'sapata' }, tolerancia: { envelope: 2, porta: 0.5 } };

describe('REFINA', () => {
  it('ausente não declara refinamento', () => {
    expect(normalizarRefinamentoGlobal(undefined)).toBeNull();
    expect(normalizarRefinamentoGlobal(null)).toBeNull();
  });

  it('canonicaliza em ordem de nome, com formato e versão, e é idempotente', () => {
    const canonica = normalizarRefinamentoGlobal({ ...REFINA, partes: { sapata: 'sapata', coluna: 'coluna-central' } });
    expect(canonica).toEqual({
      formato: 'mecanifica.refinamento-global', versao: 1, andaime: 'andaime.json',
      partes: [{ parte: 'coluna', volume: 'coluna-central' }, { parte: 'sapata', volume: 'sapata' }],
      tolerancia: { envelope: 2, porta: 0.5 },
    });
    expect(normalizarRefinamentoGlobal(canonica)).toEqual(canonica);
    expect(normalizarRefinamentoGlobal({ ...REFINA, versao: 1 }).versao).toBe(1);
  });

  it('o alvo N2 é opcional: sem ele a forma canônica não ganha o campo, e com ele o caminho entra e a normalização continua idempotente', () => {
    expect(normalizarRefinamentoGlobal(REFINA)).not.toHaveProperty('alvo');
    const comAlvo = normalizarRefinamentoGlobal({ ...REFINA, alvo: ' alvo.json ' });
    expect(comAlvo.alvo).toBe('alvo.json');
    expect(normalizarRefinamentoGlobal(comAlvo)).toEqual(comAlvo);
  });

  it.each([
    [{ ...REFINA, versao: 2 }, /versão 1/],
    [{ ...REFINA, alvo: '/etc/alvo.json' }, /'alvo' precisa ser o caminho relativo/],
    [{ ...REFINA, alvo: 'https://exemplo/alvo.json' }, /'alvo' precisa ser o caminho relativo/],
    [{ ...REFINA, alvo: 'alvo.txt' }, /'alvo' precisa ser o caminho relativo/],
    [{ ...REFINA, alvo: 7 }, /'alvo' precisa ser o caminho relativo/],
    [{ ...REFINA, formato: 'outro' }, /formato/],
    [{ ...REFINA, extra: 1 }, /'REFINA.extra' não é permitido/],
    [{ andaime: 'a.json', partes: { sapata: 'sapata' } }, /precisa declarar: tolerancia/],
    [{ ...REFINA, andaime: '/etc/andaime.json' }, /caminho relativo/],
    [{ ...REFINA, andaime: 'https://exemplo/andaime.json' }, /caminho relativo/],
    [{ ...REFINA, andaime: 'pasta\\andaime.json' }, /caminho relativo/],
    [{ ...REFINA, andaime: 'andaime.txt' }, /caminho relativo/],
    [{ ...REFINA, partes: {} }, /ao menos uma parte/],
    [{ ...REFINA, partes: { 'a b': 'sapata' } }, /sem espaço/],
    [{ ...REFINA, partes: { sapata: 'Sapata Grande' } }, /ID de um volume/],
    [{ ...REFINA, tolerancia: { envelope: -1, porta: 0 } }, /tolerancia\.envelope/],
    [{ ...REFINA, tolerancia: { envelope: LIMITE_DA_TOLERANCIA_DO_ENVELOPE_MM + 1, porta: 0 } }, /tolerancia\.envelope/],
    [{ ...REFINA, tolerancia: { envelope: 1, porta: LIMITE_DA_TOLERANCIA_DA_PORTA_MM + 1 } }, /tolerancia\.porta/],
    [{ ...REFINA, tolerancia: { envelope: 1, porta: 0, folga: 3 } }, /tolerancia\.folga/],
  ])('recusa %j', (valor, mensagem) => {
    expect(() => normalizarRefinamentoGlobal(valor)).toThrow(mensagem);
  });
});

describe('REFINA.esboco', () => {
  const ESBOCO = { arquivo: '../aviao.esboco.json', formas: { fuselagem: 'fuselagem', asa: ['pontaD', 'asaD'], porta: { formas: 'porta', minimo: 0.9 } }, minimo: 0.95 };

  it('sem o campo a forma canônica não ganha nada, e com o campo entra a lista de partes em ordem, com as formas em ordem', () => {
    expect(normalizarRefinamentoGlobal(REFINA)).not.toHaveProperty('esboco');
    const canonica = normalizarRefinamentoGlobal({ ...REFINA, esboco: ESBOCO });
    expect(canonica.esboco).toEqual({
      arquivo: '../aviao.esboco.json', opcao: 1, minimo: 0.95,
      formas: [
        { parte: 'asa', formas: ['asaD', 'pontaD'] },
        { parte: 'fuselagem', formas: ['fuselagem'] },
        { parte: 'porta', formas: ['porta'], minimo: 0.9 },
      ],
    });
    expect(normalizarRefinamentoGlobal(canonica)).toEqual(canonica);
  });

  it('a opção é o número a partir de 1 ou o título, e o arquivo é aparado', () => {
    expect(normalizarRefinamentoGlobal({ ...REFINA, esboco: { ...ESBOCO, opcao: 2 } }).esboco.opcao).toBe(2);
    expect(normalizarRefinamentoGlobal({ ...REFINA, esboco: { ...ESBOCO, opcao: ' Opção B ', arquivo: ' a.esboco.json ' } }).esboco).toMatchObject({ opcao: 'Opção B', arquivo: 'a.esboco.json' });
  });

  it.each([
    [{ ...ESBOCO, extra: 1 }, /'REFINA.esboco.extra' não é permitido/],
    [{ formas: ESBOCO.formas, minimo: 0.9 }, /precisa declarar: arquivo/],
    [{ arquivo: 'a.esboco.json', minimo: 0.9 }, /precisa declarar: formas/],
    [{ arquivo: 'a.esboco.json', formas: ESBOCO.formas }, /precisa declarar: minimo/],
    [{ ...ESBOCO, arquivo: 'andaime.json' }, /'arquivo' precisa ser o caminho relativo de um \.esboco\.json/],
    [{ ...ESBOCO, arquivo: '/etc/a.esboco.json' }, /'arquivo' precisa ser o caminho relativo/],
    [{ ...ESBOCO, arquivo: 'https://exemplo/a.esboco.json' }, /'arquivo' precisa ser o caminho relativo/],
    [{ ...ESBOCO, arquivo: 'pasta\\a.esboco.json' }, /'arquivo' precisa ser o caminho relativo/],
    [{ ...ESBOCO, opcao: 0 }, /'opcao' precisa ser o número da opção/],
    [{ ...ESBOCO, opcao: 1.5 }, /'opcao' precisa ser o número da opção/],
    [{ ...ESBOCO, opcao: '' }, /'opcao' precisa ser o número da opção/],
    [{ ...ESBOCO, minimo: 0 }, /'minimo' precisa ser a razão interseção\/união mínima/],
    [{ ...ESBOCO, minimo: 1.2 }, /'minimo' precisa ser a razão interseção\/união mínima/],
    [{ ...ESBOCO, minimo: '0.9' }, /'minimo' precisa ser a razão interseção\/união mínima/],
    [{ ...ESBOCO, minimo: Number.NaN }, /'minimo' precisa ser a razão interseção\/união mínima/],
    [{ ...ESBOCO, formas: {} }, /'formas' precisa ser objeto \{parte: id da forma\} com ao menos uma parte/],
    [{ ...ESBOCO, formas: 'fuselagem' }, /'formas' precisa ser objeto/],
    [{ ...ESBOCO, formas: { 'a b': 'x' } }, /o nome da parte precisa ser o mesmo identificador do passo 'parte'/],
    [{ ...ESBOCO, formas: { asa: [] } }, /'formas\.asa' precisa ser o id de uma forma do esboço ou uma lista de ids/],
    [{ ...ESBOCO, formas: { asa: ['asaD', ''] } }, /'formas\.asa' precisa ser o id de uma forma/],
    [{ ...ESBOCO, formas: { asa: 7 } }, /'formas\.asa' precisa ser o id de uma forma/],
    [{ ...ESBOCO, formas: { asa: ['asaD', 'asaD'] } }, /'formas\.asa' não pode repetir forma/],
    [{ ...ESBOCO, formas: { asa: { formas: 'asaD', minimo: 2 } } }, /'formas\.asa\.minimo' precisa ser a razão/],
    [{ ...ESBOCO, formas: { asa: { formas: 'asaD', tolerancia: 2 } } }, /'formas\.asa\.tolerancia' não é permitido/],
    [{ ...ESBOCO, formas: [{ parte: 'asa', formas: 'asaD' }, { parte: 'asa', formas: 'pontaD' }] }, /'formas' não pode repetir parte/],
  ])('recusa %j', (esboco, mensagem) => {
    expect(() => normalizarRefinamentoGlobal({ ...REFINA, esboco })).toThrow(mensagem);
  });

  it('esboco que não é objeto é recusado', () => {
    expect(() => normalizarRefinamentoGlobal({ ...REFINA, esboco: 'a.esboco.json' })).toThrow(/REFINA\.esboco: precisa ser objeto/);
    expect(() => normalizarRefinamentoGlobal({ ...REFINA, esboco: [] })).toThrow(/precisa ser objeto/);
  });

  it('a conferência do envelope não muda com o campo, que ela não lê', () => {
    const sem = conferir();
    const receita = receitaDoSuporte();
    const { neutro } = executarReceita(receita);
    const com = conferirRefinamentoGlobal({ refinamento: { ...receita.REFINA, esboco: ESBOCO }, andaime: ANDAIME, neutro });
    expect(JSON.stringify(com)).toBe(JSON.stringify(sem));
  });
});

describe('portas do andaime', () => {
  it('andaime sem portas continua canônico e sem o campo', () => {
    const { portas, ...semPortas } = copia(ANDAIME);
    expect(portas).toHaveLength(1);
    expect(Object.hasOwn(normalizarAndaimeGlobal(semPortas), 'portas')).toBe(false);
  });

  it('andaime com portas as ordena por id', () => {
    const outra = { id: 'apoio', interface: { forma: 'plano', papel: 'apoia', ponto: [0, 0, 0], normal: [0, 1, 0], extensao: [200, 200] } };
    const andaime = normalizarAndaimeGlobal({ ...copia(ANDAIME), portas: [...copia(ANDAIME).portas, outra] });
    expect(andaime.portas.map(({ id }) => id)).toEqual(['apoio', 'assento']);
  });

  it.each([
    [[], /lista de 1 a 64 portas/],
    [[{ id: 'a b', interface: { forma: 'anel', papel: 'recebe' } }], /identificador/],
    [[{ id: 'a', interface: { forma: 'rosca', papel: 'recebe' } }], /aceita anel, cilindro, plano, padraoFuros, trilho/],
    [[{ id: 'a', interface: { forma: 'anel' } }], /papel/],
    [[{ id: 'a', interface: { forma: 'padraoFuros', papel: 'recebe', padrao: { tipo: 'linear' } } }], /escreva `centros`/],
    [[{ id: 'a', interface: { forma: 'plano', papel: 'apoia', extensao: { largura: 1, comprimento: 2 } } }], /\[largura, comprimento\]/],
    [[{ id: 'a', interface: { forma: 'anel', papel: 'recebe', raioExterno: 'grande' } }].concat([{ id: 'a', interface: { forma: 'anel', papel: 'recebe' } }]), /repetir ID de porta/],
    [[{ id: 'a', interface: { forma: 'anel', papel: 'recebe' }, extra: true }], /campos ausentes: \(nenhum\); extras: extra/],
  ])('recusa %j', (portas, mensagem) => {
    expect(() => normalizarAndaimeGlobal({ ...copia(ANDAIME), portas })).toThrow(mensagem);
  });
});

describe('conferência do refinamento', () => {
  it('a receita que refina dentro do envelope e na porta passa', () => {
    const r = conferir();
    expect(r.achados).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.portas).toEqual([{ id: 'assento', estado: 'no-lugar' }]);
    expect(r.partes.map(({ parte, volume }) => `${parte}>${volume}`)).toEqual(['coluna>coluna-central', 'sapata>sapata']);
    for (const { excessoMm } of r.partes) expect(excessoMm).toBeLessThanOrEqual(1e-6);
  });

  it('a parte deslocada para fora do envelope é recusada, com parte, volume, lado e desvio', () => {
    const r = conferir({ sapataEmX: 30 });
    expect(r.ok).toBe(false);
    expect(r.achados).toHaveLength(1);
    expect(r.achados[0]).toMatchObject({ codigo: 'parte-fora-do-envelope', parte: 'sapata', volume: 'sapata', lado: '+x' });
    expect(r.achados[0].desvio).toBeCloseTo(30, 6);
    expect(r.achados[0].mensagem).toBe("a parte 'sapata' sai do envelope do volume 'sapata' em +x por 30 mm (tolerância 2 mm): a parte vai até x=130 mm e o envelope termina em x=100 mm.");
  });

  it('o desvio dentro da tolerância declarada passa e logo acima dela reprova', () => {
    expect(conferir({ sapataEmX: 2 }).ok).toBe(true);
    expect(conferir({ sapataEmX: 2.5 }).achados.map((a) => a.codigo)).toEqual(['parte-fora-do-envelope']);
    expect(conferir({ sapataEmX: 2.5, tolerancia: { envelope: 3, porta: 0.5 } }).ok).toBe(true);
  });

  it('a porta movida é recusada pelo andaime e pela forma, com o campo e o desvio', () => {
    const r = conferir({ portaY: 205 });
    expect(r.ok).toBe(false);
    expect(r.portas).toEqual([{ id: 'assento', estado: 'reprovada' }]);
    expect(r.achados.map((a) => a.codigo)).toEqual(['porta-fora-do-lugar', 'porta-fora-do-plano']);
    expect(r.achados[0].mensagem).toContain("a porta 'assento' não está onde o andaime a declarou");
    expect(r.achados[0].mensagem).toContain('centro[1]: o andaime declara 200 e a peça publica 205 (desvio 5 mm, tolerância 0.5 mm)');
    expect(r.achados[0].desvio).toBeCloseTo(5, 6);
  });

  it('a porta dentro da tolerância declarada mas fora da malha ainda é recusada pela régua da forma', () => {
    const r = conferir({ portaY: 200.3 });
    expect(r.achados.map((a) => a.codigo)).toEqual(['porta-fora-do-plano']);
  });

  it('a porta que a peça não publica é recusada', () => {
    const receita = receitaDoSuporte();
    receita.PASSOS = receita.PASSOS.filter(([op]) => op !== 'publicarPorta');
    const { neutro } = executarReceita(receita);
    const r = conferirRefinamentoGlobal({ refinamento: receita.REFINA, andaime: ANDAIME, neutro });
    expect(r.achados).toEqual([expect.objectContaining({ codigo: 'porta-ausente', porta: 'assento' })]);
  });

  it('a porta com outro raio ou outro eixo diverge do andaime', () => {
    const andaime = copia(ANDAIME);
    andaime.portas[0].interface.raioExterno = 45;
    andaime.portas[0].interface.eixo = [1, 0, 0];
    const r = conferir({}, andaime);
    const divergente = r.achados.find((a) => a.codigo === 'porta-fora-do-lugar');
    expect(divergente.divergencias.map((d) => d.campo)).toEqual(['eixo', 'raioExterno']);
  });

  it('a parte entregue sem volume e o volume que o andaime não tem são recusados', () => {
    expect(conferir({ vinculo: { sapata: 'sapata' } }).achados).toEqual([expect.objectContaining({ codigo: 'parte-sem-volume', parte: 'coluna' })]);
    const r = conferir({ vinculo: { sapata: 'sapata', coluna: 'pilar' } });
    expect(r.achados).toEqual([expect.objectContaining({ codigo: 'volume-desconhecido', parte: 'coluna', volume: 'pilar' })]);
    expect(r.achados[0].mensagem).toContain('tem: coluna-central, sapata');
  });

  it('a parte sem volume ligada a uma forma do esboço não é recusada pelo envelope: a conferência dela é a razão de volume', () => {
    const receita = receitaDoSuporte({ vinculo: { sapata: 'sapata' } });
    const { neutro } = executarReceita(receita);
    const refinamento = { ...receita.REFINA, esboco: { arquivo: 'suporte.esboco.json', formas: { coluna: 'coluna' }, minimo: 0.9 } };
    expect(conferirRefinamentoGlobal({ refinamento, andaime: ANDAIME, neutro }).achados).toEqual([]);
    const semForma = { ...refinamento, esboco: { ...refinamento.esboco, formas: { sapata: 'sapata' } } };
    const r = conferirRefinamentoGlobal({ refinamento: semForma, andaime: ANDAIME, neutro });
    expect(r.achados).toEqual([expect.objectContaining({ codigo: 'parte-sem-volume', parte: 'coluna' })]);
    expect(r.achados[0].mensagem).toContain('nem em REFINA.esboco a forma do esboço');
  });

  it('o vínculo com parte que a peça não entrega é recusado', () => {
    const r = conferir({ vinculo: { sapata: 'sapata', coluna: 'coluna-central', tampa: 'sapata' } });
    expect(r.achados).toEqual([expect.objectContaining({ codigo: 'parte-ausente', parte: 'tampa', volume: 'sapata' })]);
  });

  it('é determinística', () => {
    expect(JSON.stringify(conferir({ sapataEmX: 30 }))).toBe(JSON.stringify(conferir({ sapataEmX: 30 })));
  });
});
