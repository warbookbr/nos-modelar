/* refinamento-global.test.js — a declaração REFINA, as portas do andaime e a conferência contra a peça executada. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import { normalizarAndaimeGlobal } from './forma-global.js';
import {
  conferirRefinamentoGlobal, LIMITE_DA_TOLERANCIA_DA_PORTA_MM, LIMITE_DA_TOLERANCIA_DO_ENVELOPE_MM, LIMITE_DO_DESLOCAMENTO_MM,
  normalizarRefinamentoGlobal, textoDoAfastamento,
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

describe('REFINA.esboco: a parte que se afasta do esboço de propósito', () => {
  const MOTIVO = 'a roda encosta no chão';
  const comParte = (entrada) => ({ ...REFINA, esboco: { arquivo: 'a.esboco.json', minimo: 0.95, formas: { roda: entrada } } });
  const entradaCanonica = (entrada) => normalizarRefinamentoGlobal(comParte(entrada)).esboco.formas[0];

  it('o deslocamento e o motivo entram na forma canônica, depois do mínimo, e a normalização é idempotente', () => {
    const canonica = normalizarRefinamentoGlobal(comParte({ motivo: ` ${MOTIVO} `, minimo: 0.9, deslocamento: [0, -17, 0], formas: 'roda' }));
    expect(Object.keys(canonica.esboco.formas[0])).toEqual(['parte', 'formas', 'minimo', 'deslocamento', 'motivo']);
    expect(canonica.esboco.formas[0]).toEqual({ parte: 'roda', formas: ['roda'], minimo: 0.9, deslocamento: [0, -17, 0], motivo: MOTIVO });
    expect(normalizarRefinamentoGlobal(canonica)).toEqual(canonica);
    expect(JSON.stringify(normalizarRefinamentoGlobal(canonica))).toBe(JSON.stringify(canonica));
  });

  it('o alongamento entra com os lados em ordem fixa, e a escrita em outra ordem dá a mesma forma canônica', () => {
    const a = entradaCanonica({ formas: 'pistao', alongamento: { '+z': 3, '-y': 17 }, motivo: MOTIVO });
    const b = entradaCanonica({ formas: 'pistao', alongamento: { '-y': 17, '+z': 3 }, motivo: MOTIVO });
    expect(Object.keys(a.alongamento)).toEqual(['-y', '+z']);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const canonica = normalizarRefinamentoGlobal(comParte({ formas: 'pistao', alongamento: { '-y': 17 }, motivo: MOTIVO }));
    expect(normalizarRefinamentoGlobal(canonica)).toEqual(canonica);
  });

  it('o zero negativo vira zero, e as duas declarações juntas valem', () => {
    const e = entradaCanonica({ formas: 'roda', deslocamento: [-0, -17, 0], alongamento: { '+y': 2 }, motivo: MOTIVO });
    expect(Object.is(e.deslocamento[0], 0)).toBe(true);
    expect(e).toMatchObject({ deslocamento: [0, -17, 0], alongamento: { '+y': 2 }, motivo: MOTIVO });
  });

  it('a entrada sem os campos novos não ganha nenhum, e o mínimo próprio sem deslocamento não pede motivo', () => {
    expect(entradaCanonica({ formas: 'roda', minimo: 0.8 })).toEqual({ parte: 'roda', formas: ['roda'], minimo: 0.8 });
    expect(entradaCanonica('roda')).toEqual({ parte: 'roda', formas: ['roda'] });
  });

  it.each([
    [{ formas: 'roda', deslocamento: [0, -17, 0] }, /'formas\.roda' declara deslocamento ou alongamento e precisa dizer o 'motivo'/],
    [{ formas: 'roda', deslocamento: [0, -17, 0], motivo: '   ' }, /precisa dizer o 'motivo'/],
    [{ formas: 'roda', deslocamento: [0, -17, 0], motivo: 7 }, /precisa dizer o 'motivo'/],
    [{ formas: 'roda', alongamento: { '-y': 17 } }, /precisa dizer o 'motivo'/],
    [{ formas: 'roda', motivo: MOTIVO }, /'formas\.roda\.motivo' só acompanha 'deslocamento' ou 'alongamento'/],
    [{ formas: 'roda', deslocamento: [0, -17], motivo: MOTIVO }, /'formas\.roda\.deslocamento' precisa ser o vetor \[dx, dy, dz\] em milímetro/],
    [{ formas: 'roda', deslocamento: [0, '-17', 0], motivo: MOTIVO }, /'formas\.roda\.deslocamento' precisa ser o vetor/],
    [{ formas: 'roda', deslocamento: [0, Number.NaN, 0], motivo: MOTIVO }, /'formas\.roda\.deslocamento' precisa ser o vetor/],
    [{ formas: 'roda', deslocamento: 17, motivo: MOTIVO }, /'formas\.roda\.deslocamento' precisa ser o vetor/],
    [{ formas: 'roda', deslocamento: [0, 0, 0], motivo: MOTIVO }, /'formas\.roda\.deslocamento' nulo não desloca nada/],
    [{ formas: 'roda', deslocamento: [0, -(LIMITE_DO_DESLOCAMENTO_MM + 1), 0], motivo: MOTIVO }, /passa de 1000 mm em algum eixo/],
    [{ formas: 'roda', alongamento: {}, motivo: MOTIVO }, /'formas\.roda\.alongamento' precisa ser objeto \{lado: mm\}/],
    [{ formas: 'roda', alongamento: [17], motivo: MOTIVO }, /'formas\.roda\.alongamento' precisa ser objeto/],
    [{ formas: 'roda', alongamento: { y: 17 }, motivo: MOTIVO }, /'formas\.roda\.alongamento\.y': o lado precisa ser um de -x, \+x, -y, \+y, -z, \+z/],
    [{ formas: 'roda', alongamento: { '-y': 0 }, motivo: MOTIVO }, /'formas\.roda\.alongamento\.-y' precisa ser número maior que 0 e até 1000 mm/],
    [{ formas: 'roda', alongamento: { '-y': -3 }, motivo: MOTIVO }, /'formas\.roda\.alongamento\.-y' precisa ser número maior que 0/],
    [{ formas: 'roda', alongamento: { '-y': LIMITE_DO_DESLOCAMENTO_MM + 1 }, motivo: MOTIVO }, /até 1000 mm/],
    [{ formas: 'roda', deslocamento: [0, -17, 0], motivo: MOTIVO, translada: 1 }, /'formas\.roda\.translada' não é permitido; aceita formas, minimo, deslocamento, alongamento e motivo/],
  ])('recusa %j', (entrada, mensagem) => {
    expect(() => normalizarRefinamentoGlobal(comParte(entrada))).toThrow(mensagem);
  });

  it('o texto do relatório diz o deslocamento, o alongamento e o motivo, e é vazio sem afastamento', () => {
    expect(textoDoAfastamento(entradaCanonica({ formas: 'roda', deslocamento: [0, -8.5, 0], motivo: MOTIVO }))).toBe(`deslocada [0, -8.5, 0] mm; motivo: ${MOTIVO}`);
    expect(textoDoAfastamento(entradaCanonica({ formas: 'p', alongamento: { '-y': 8.5, '+x': 2 }, motivo: MOTIVO }))).toBe(`passa do volume +x 2 mm, -y 8.5 mm; motivo: ${MOTIVO}`);
    expect(textoDoAfastamento(entradaCanonica({ formas: 'roda', minimo: 0.9 }))).toBe('');
    expect(textoDoAfastamento(undefined)).toBe('');
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

  describe('o afastamento declarado em REFINA.esboco.formas', () => {
    const MOTIVO = 'a sapata é posta 30 mm para +x por decisão da pessoa';
    /* a sapata de 200 mm está em x 30: o volume do andaime vai de x -100 a 100, e a parte de -70 a 130 */
    const conferirComEsboco = (opcoes, formas, vinculo) => {
      const receita = receitaDoSuporte({ sapataEmX: 30, ...opcoes, ...(vinculo ? { vinculo } : {}) });
      const { neutro } = executarReceita(receita);
      const refinamento = { ...receita.REFINA, esboco: { arquivo: 'suporte.esboco.json', minimo: 0.9, formas } };
      return conferirRefinamentoGlobal({ refinamento, andaime: ANDAIME, neutro });
    };

    it('o deslocamento move o volume do andaime junto: a sapata em x 30 declarada deslocada 30 passa com a tolerância de 2 mm, e a medida diz o afastamento', () => {
      const r = conferirComEsboco({}, { sapata: { formas: 'sapata', deslocamento: [30, 0, 0], motivo: MOTIVO } });
      expect(r.achados).toEqual([]);
      const sapata = r.partes.find((p) => p.parte === 'sapata');
      expect(sapata.excessoMm).toBeLessThanOrEqual(1e-6);
      expect(sapata).toMatchObject({ deslocamento: [30, 0, 0], motivo: MOTIVO });
      expect(r.partes.find((p) => p.parte === 'coluna')).not.toHaveProperty('deslocamento');
    });

    it('o deslocamento não afrouxa a régua: 3 mm a menos que o declarado reprova com a tolerância de 2 mm, e o sentido contrário reprova por inteiro', () => {
      const curto = conferirComEsboco({}, { sapata: { formas: 'sapata', deslocamento: [27, 0, 0], motivo: MOTIVO } });
      expect(curto.achados.map((a) => [a.codigo, a.lado, Math.round(a.desvio)])).toEqual([['parte-fora-do-envelope', '+x', 3]]);
      expect(conferirComEsboco({}, { sapata: { formas: 'sapata', deslocamento: [28, 0, 0], motivo: MOTIVO } }).ok).toBe(true);
      const contrario = conferirComEsboco({}, { sapata: { formas: 'sapata', deslocamento: [-30, 0, 0], motivo: MOTIVO } });
      expect(contrario.achados.map((a) => [a.lado, Math.round(a.desvio)])).toEqual([['+x', 60]]);
    });

    it('a mensagem do envelope diz que o volume está deslocado, por quanto e onde a receita o declarou', () => {
      const r = conferirComEsboco({}, { sapata: { formas: 'sapata', deslocamento: [-30, 0, 0], motivo: MOTIVO } });
      expect(r.achados[0].mensagem).toBe("a parte 'sapata' sai do envelope do volume 'sapata' deslocado [-30, 0, 0] mm (REFINA.esboco.formas.sapata) em +x por 60 mm (tolerância 2 mm): a parte vai até x=130 mm e o envelope termina em x=70 mm.");
    });

    it('o deslocamento de uma parte não muda o envelope das outras', () => {
      const r = conferirComEsboco({ sapataEmX: 0 }, { coluna: { formas: 'coluna', deslocamento: [50, 0, 0], motivo: 'a coluna é posta 50 mm para +x' } });
      expect(r.achados.map((a) => [a.parte, a.lado])).toContainEqual(['coluna', '-x']);
      expect(r.achados.some((a) => a.parte === 'sapata')).toBe(false);
    });

    it('o alongamento deixa a parte passar do volume só no lado declarado, além da tolerância', () => {
      expect(conferirComEsboco({}, { sapata: { formas: 'sapata', alongamento: { '+x': 28 }, motivo: MOTIVO } }).achados).toEqual([]);
      const curto = conferirComEsboco({}, { sapata: { formas: 'sapata', alongamento: { '+x': 20 }, motivo: MOTIVO } });
      expect(curto.achados).toEqual([expect.objectContaining({ codigo: 'parte-fora-do-envelope', parte: 'sapata', lado: '+x' })]);
      expect(curto.achados[0].mensagem).toContain('(tolerância 22 mm)');
      const outroLado = conferirComEsboco({}, { sapata: { formas: 'sapata', alongamento: { '-x': 28 }, motivo: MOTIVO } });
      expect(outroLado.achados.map((a) => a.codigo).sort()).toEqual(['alongamento-maior-que-a-parte', 'parte-fora-do-envelope']);
    });

    it('o alongamento que a parte não usa é recusado, com o lado, o declarado e o que a parte passa', () => {
      const r = conferirComEsboco({ sapataEmX: 0 }, { sapata: { formas: 'sapata', alongamento: { '+x': 20 }, motivo: MOTIVO } });
      expect(r.achados).toEqual([expect.objectContaining({ codigo: 'alongamento-maior-que-a-parte', parte: 'sapata', volume: 'sapata', lado: '+x' })]);
      expect(r.achados[0].desvio).toBeCloseTo(20, 6);
      expect(r.achados[0].mensagem).toContain("declara passar do volume 'sapata' em +x por 20 mm");
      expect(r.achados[0].mensagem).toContain('e passa por 0 mm (o declarado pode passar da medida em até 1 mm)');
      /* o declarado fica a 1 mm do medido, e não a uma tolerância que a receita escolhe: com o envelope em 50 mm a declaração ainda prova o alongamento */
      expect(conferirComEsboco({}, { sapata: { formas: 'sapata', alongamento: { '+x': 31 }, motivo: MOTIVO } }).ok).toBe(true);
      expect(conferirComEsboco({}, { sapata: { formas: 'sapata', alongamento: { '+x': 32 }, motivo: MOTIVO } }).achados.map((a) => a.codigo)).toEqual(['alongamento-maior-que-a-parte']);
      const larga = conferirComEsboco({ sapataEmX: 0, tolerancia: { envelope: 50, porta: 0.5 } }, { sapata: { formas: 'sapata', alongamento: { '+x': 17 }, motivo: MOTIVO } });
      expect(larga.achados.map((a) => a.codigo)).toEqual(['alongamento-maior-que-a-parte']);
    });

    it('o alongamento de uma parte sem volume em REFINA.partes é recusado: não há envelope a alongar', () => {
      const r = conferirComEsboco({ sapataEmX: 0 }, { coluna: { formas: 'coluna', alongamento: { '+y': 5 }, motivo: MOTIVO } }, { sapata: 'sapata' });
      expect(r.achados.map((a) => a.codigo)).toEqual(['alongamento-sem-volume']);
      expect(r.achados[0].mensagem).toContain("a parte 'coluna' declara alongamento");
    });

    it('a entrada sem deslocamento nem alongamento deixa a conferência idêntica, com mínimo próprio ou sem', () => {
      const sem = conferir({ sapataEmX: 30 });
      const com = conferirComEsboco({}, { sapata: { formas: 'sapata', minimo: 0.5 }, coluna: 'coluna' });
      expect(JSON.stringify(com)).toBe(JSON.stringify(sem));
    });

    it('a declaração é determinística', () => {
      const entrada = { sapata: { formas: 'sapata', deslocamento: [30, 0, 0], alongamento: { '+x': 1 }, motivo: MOTIVO } };
      expect(JSON.stringify(conferirComEsboco({}, entrada))).toBe(JSON.stringify(conferirComEsboco({}, entrada)));
    });
  });

  it('é determinística', () => {
    expect(JSON.stringify(conferir({ sapataEmX: 30 }))).toBe(JSON.stringify(conferir({ sapataEmX: 30 })));
  });
});
