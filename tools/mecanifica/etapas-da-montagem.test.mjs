/* etapas-da-montagem.test.mjs — a porta que fixa etapa. Fixar exige a etapa
   ser a próxima, o crítico ter fechado a peça dela, a nota de passagem, as
   juntas passando e o aceite da pessoa. Cada recusa tem o seu caso. */
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registrarRodada } from '../../src/autoria/laco-de-modelagem.js';
import { ErroEtapaDeConstrucao } from '../../src/autoria/etapas-de-construcao.js';
import { auditarEtapas, descreverAuditoria, estadoDasEtapas, fixar, montagemAteAGeometria, olharEtapas, reabrir } from './etapas-da-montagem.mjs';
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { RECEITAS } from '../fixtures/tres-blocos-vinculados/receitas/bloco.js';

const ORIGEM = fileURLToPath(new URL('../fixtures/tres-blocos-vinculados/montagens/tres-blocos.json', import.meta.url));
let area;
let arquivo;
beforeEach(() => {
  area = mkdtempSync(join(tmpdir(), 'etapas-'));
  arquivo = join(area, 'tres-blocos.json');
  copyFileSync(ORIGEM, arquivo);
});
afterEach(() => rmSync(area, { recursive: true, force: true }));

const rodada = (peca, { fechada = true, nota = 'folga de 0,2 porque o pino é retificado' } = {}) => registrarRodada({
  peca, numero: 1, medidas: { passou: true, relatorio: 'ok' }, partes: [{ nome: 'corpo', confere: true }],
  veredito: { alvo: 'referencias/x.png', nota: fechada ? 9 : 5, defeitos: [], observacao: 'a peça bate com a referência nas quatro vistas' },
  ...(nota ? { notaDePassagem: nota } : {}),
});
const todasFechadas = (ref) => [rodada(ref)];
const aceite = { por: 'pessoa' };

async function recusa(promessa, codigo) {
  let erro;
  try { await promessa; } catch (capturado) { erro = capturado; }
  expect(erro).toBeInstanceOf(ErroEtapaDeConstrucao);
  expect(erro.codigo).toBe(codigo);
}

describe('etapas ainda sem geometria', () => {
  /* O plano de todas as partes existe antes da geometria delas. O registro tem
     de sair para a etapa em trabalho mesmo com as seguintes vazias. */
  const comTopoVazio = () => ({ ...RECEITAS, 'bloco-com-furo': { ...RECEITAS['bloco-com-furo'], PASSOS: [] } });

  it('resolve até antes da primeira receita vazia e deixa as seguintes abertas sem junta', async () => {
    const { registro } = await estadoDasEtapas(arquivo, { receitas: comTopoVazio(), anterior: null });
    expect(registro.etapas.map((e) => [e.instancia, e.estado, e.juntas.length])).toEqual([
      ['base', 'aberta', 0], ['meio', 'aberta', 1], ['topo', 'aberta', 0],
    ]);
  });

  it('a etapa sem geometria não pode ser fixada', async () => {
    const receitas = comTopoVazio();
    let registro = await fixar(arquivo, 'base', aceite, { receitas, anterior: null, rodadasDe: todasFechadas });
    registro = await fixar(arquivo, 'meio', aceite, { receitas, anterior: registro, rodadasDe: todasFechadas });
    await recusa(fixar(arquivo, 'topo', aceite, { receitas, anterior: registro, rodadasDe: () => [] }), 'etapa-sem-critico');
  });
});

describe('etapas da montagem em disco', () => {
  it('mostra as etapas abertas e aponta a primeira', async () => {
    const { registro } = await estadoDasEtapas(arquivo, { receitas: RECEITAS, anterior: null });
    expect(registro.etapas.map((e) => e.estado)).toEqual(['aberta', 'aberta', 'aberta']);
    expect(registro.etapas[1].juntas[0]).toMatchObject({ relacao: 'meioNoPinoDaBase', satisfeita: true });
  });

  it('recusa fixar sem o crítico ter fechado a peça', async () => {
    await recusa(fixar(arquivo, 'base', aceite, { receitas: RECEITAS, anterior: null, rodadasDe: () => [] }), 'etapa-sem-critico');
    await recusa(fixar(arquivo, 'base', aceite, { receitas: RECEITAS, anterior: null, rodadasDe: (r) => [rodada(r, { fechada: false })] }), 'etapa-sem-critico');
  });

  it('recusa fixar sem a nota de passagem', async () => {
    await recusa(fixar(arquivo, 'base', aceite, { receitas: RECEITAS, anterior: null, rodadasDe: (r) => [rodada(r, { nota: null })] }), 'etapa-sem-nota');
  });

  it('recusa fixar fora de ordem ou sem aceite, e fixa quando tudo está em dia', async () => {
    const opcoes = { receitas: RECEITAS, anterior: null, rodadasDe: todasFechadas };
    await recusa(fixar(arquivo, 'meio', aceite, opcoes), 'etapa-fora-de-ordem');
    await recusa(fixar(arquivo, 'base', {}, opcoes), 'etapa-sem-aceite');
    const registro = await fixar(arquivo, 'base', aceite, opcoes);
    expect(registro.etapas.map((e) => e.estado)).toEqual(['fixa', 'aberta', 'aberta']);
    const seguinte = await fixar(arquivo, 'meio', aceite, { ...opcoes, anterior: registro });
    expect(seguinte.etapas.map((e) => e.estado)).toEqual(['fixa', 'fixa', 'aberta']);
  });
});

describe('aceite humano com defeito em aberto', () => {
  const comDefeito = (peca) => [registrarRodada({
    peca, numero: 1, medidas: { passou: true, relatorio: 'ok' }, partes: [{ nome: 'corpo', confere: true }],
    veredito: { alvo: 'referencias/x.png', nota: 7, defeitos: [{ parte: 'corpo', tipo: 'posicao', onde: 'canto de baixo', sentido: 'alta', evidencia: 'frente-orto.png: canto visível fora do disco em x≈380, y≈930' }], observacao: 'a peça bate com a referência, menos o canto de baixo' },
    notaDePassagem: 'o canto ficou assim porque o colar é mais largo',
  })];

  it('no meio do laço, grava que o crítico não fechou junto dos defeitos', async () => {
    const noMeio = { receitas: RECEITAS, anterior: null, rodadasDe: comDefeito, limiteDe: () => 6 };
    await recusa(fixar(arquivo, 'base', aceite, noMeio), 'etapa-sem-critico');
    const registro = await fixar(arquivo, 'base', { ...aceite, aceiteHumano: true }, noMeio);
    const aceitos = registro.etapas[0].aceite.defeitosAceitos;
    expect(aceitos[0]).toMatch(/^crítico não fechou: /);
    expect(aceitos.slice(1)).toEqual(['corpo: posicao em canto de baixo']);
  });

  it('com o laço parado, grava os defeitos aceitos', async () => {
    const noMeio = { receitas: RECEITAS, anterior: null, rodadasDe: comDefeito, limiteDe: () => 6 };
    const parado = { ...noMeio, limiteDe: () => 1 };
    await recusa(fixar(arquivo, 'base', aceite, parado), 'etapa-sem-critico');
    const registro = await fixar(arquivo, 'base', { ...aceite, aceiteHumano: true }, parado);
    expect(registro.etapas[0]).toMatchObject({ estado: 'fixa', aceite: { por: 'pessoa', defeitosAceitos: ['corpo: posicao em canto de baixo'] } });
  });
});


describe('reabrir etapa fixa', () => {
  const opcoes = { receitas: RECEITAS, anterior: null, rodadasDe: todasFechadas };
  const POR = 'pessoa, 2026-09-26: refazer pelo desenho novo';
  async function duasFixas() {
    const r = await fixar(arquivo, 'base', { por: 'pessoa', observacao: 'ok' }, opcoes);
    return fixar(arquivo, 'meio', aceite, { ...opcoes, anterior: r });
  }

  it('recusa sem --por completo e recusa etapa que não está fixa', async () => {
    const registro = await duasFixas();
    await recusa(reabrir(arquivo, 'meio', undefined, { ...opcoes, anterior: registro }), 'reabertura-sem-autor');
    await recusa(reabrir(arquivo, 'meio', 'pessoa', { ...opcoes, anterior: registro }), 'reabertura-sem-autor');
    await recusa(reabrir(arquivo, 'topo', POR, { ...opcoes, anterior: registro }), 'etapa-nao-fixa');
    await recusa(reabrir(arquivo, 'nada', POR, { ...opcoes, anterior: registro }), 'etapa-inexistente');
  });

  it('recusa reabrir etapa com posterior fixa, e reabre de trás para frente guardando o histórico', async () => {
    let registro = await duasFixas();
    await recusa(reabrir(arquivo, 'base', POR, { ...opcoes, anterior: registro }), 'etapa-com-posteriores-fixas');
    registro = await reabrir(arquivo, 'meio', POR, { ...opcoes, anterior: registro });
    expect(registro.etapas.map((e) => e.estado)).toEqual(['fixa', 'aberta', 'aberta']);
    expect(registro.etapas[1].aceite).toBeUndefined();
    expect(registro.etapas[1].reaberturas).toEqual([{ por: 'pessoa', quando: '2026-09-26', motivo: 'refazer pelo desenho novo', aceite: { por: 'pessoa', analise: 'ausente' } }]);
    /* A releitura mantém a etapa aberta e o histórico. */
    const { registro: relido } = await estadoDasEtapas(arquivo, { receitas: RECEITAS, anterior: registro });
    expect(relido.etapas[1]).toMatchObject({ estado: 'aberta', reaberturas: registro.etapas[1].reaberturas });
    /* Refixar acumula, sem apagar a reabertura. */
    const refixado = await fixar(arquivo, 'meio', aceite, { ...opcoes, anterior: relido });
    expect(refixado.etapas[1]).toMatchObject({ estado: 'fixa', reaberturas: [{ motivo: 'refazer pelo desenho novo' }] });
  });
});

describe('campo analise no aceite', () => {
  const opcoes = (manifesto) => ({
    receitas: RECEITAS, anterior: null, rodadasDe: todasFechadas,
    analise: { lerManifestoDe: () => manifesto, hashDe: () => 'hash-atual' },
  });

  it('grava feita quando o manifesto traz o hash da receita atual', async () => {
    const registro = await fixar(arquivo, 'base', aceite, opcoes({ receita: 'hash-atual' }));
    expect(registro.etapas[0].aceite.analise).toBe('feita');
  });

  it('grava ausente com hash errado ou sem manifesto, sem bloquear o aceite', async () => {
    const velho = await fixar(arquivo, 'base', aceite, opcoes({ receita: 'hash-velho' }));
    expect(velho.etapas[0]).toMatchObject({ estado: 'fixa', aceite: { analise: 'ausente' } });
    const sem = await fixar(arquivo, 'base', { ...aceite, aceiteHumano: true }, opcoes(null));
    expect(sem.etapas[0].aceite.analise).toBe('ausente');
  });
});

describe('as etapas construídas vistas juntas, com o quadro numa instância', () => {
  /* O quadro do conjunto faz a peça da etapa pequena demais para o crítico. Com `foco` o quadro fecha na caixa da instância e as outras
     peças ficam em volta; a captura é trocada por um gravador, e o que se confere é o que ela recebe e o que o arquivo leva no nome. */
  function capturaFalsa(pedidos) {
    return async (opcoes) => {
      pedidos.push(opcoes);
      return {
        ok: true,
        resultado: {
          capturas: opcoes.vistas.map((nome) => ({ nome, dados: Buffer.from(`png-${nome}`), enquadramento: { valida: true, area: 0.5, largura: 0.6, altura: 0.83, cortado: false } })),
        },
      };
    };
  }

  it('o foco chega à captura como caminho, com a folga e o quadro pedidos, e o arquivo leva a instância no nome', async () => {
    const pedidos = [];
    const saida = join(area, 'vistas');
    const r = await olharEtapas(arquivo, {
      vistas: ['frontal', 'direita'], saida, foco: 'meio', folga: 0.2, largura: 1200, altura: 1000, capturar: capturaFalsa(pedidos), receitas: RECEITAS,
    });
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]).toMatchObject({ vistas: ['frontal', 'direita'], projecao: 'ortografica', foco: ['meio'], folga: 0.2, largura: 1200, altura: 1000 });
    expect(r.construidas).toEqual(['base', 'meio', 'topo']);
    expect(r.foco).toEqual(['meio']);
    expect(r.arquivos.map((a) => a.slice(saida.length + 1))).toEqual(['etapas-tres-blocos-frontal-orto-foco-meio.png', 'etapas-tres-blocos-direita-orto-foco-meio.png']);
    expect(r.enquadramentos).toEqual([
      { vista: 'frontal', valida: true, area: 0.5, largura: 0.6, altura: 0.83, cortado: false },
      { vista: 'direita', valida: true, area: 0.5, largura: 0.6, altura: 0.83, cortado: false },
    ]);
  });

  it('sem foco o pedido é o de sempre, sem foco nem quadro, e os arquivos têm os nomes de sempre', async () => {
    const pedidos = [];
    const saida = join(area, 'vistas-sem-foco');
    const r = await olharEtapas(arquivo, { vistas: ['frontal'], saida, capturar: capturaFalsa(pedidos), receitas: RECEITAS });
    expect(Object.keys(pedidos[0]).sort()).toEqual(['montagem', 'projecao', 'vistas']);
    expect(r.foco).toBeNull();
    expect(r.arquivos.map((a) => a.slice(saida.length + 1))).toEqual(['etapas-tres-blocos-frontal-orto.png']);
  });

  it('o foco numa etapa que ainda não tem geometria recusa com o código que diz isso, sem capturar', async () => {
    let capturou = false;
    const semGeometria = { ...RECEITAS, 'bloco-com-furo': { ...RECEITAS['bloco-com-furo'], PASSOS: [] } };
    let erro;
    try {
      await olharEtapas(arquivo, { foco: 'topo', saida: join(area, 'v3'), capturar: async () => { capturou = true; }, receitas: semGeometria });
    } catch (capturado) { erro = capturado; }
    expect(erro?.codigo).toBe('foco-fora-das-etapas');
    expect(erro?.message).toContain("a instância 'topo' não está entre as etapas já construídas (base, meio)");
    expect(capturou).toBe(false);
  });

  it('a captura que falha vira erro com a mensagem dela', async () => {
    await expect(olharEtapas(arquivo, { saida: join(area, 'v4'), capturar: async () => ({ ok: false, erro: { mensagem: 'o visor caiu' } }), receitas: RECEITAS })).rejects.toThrow('o visor caiu');
  });
});

describe('a auditoria da montagem construída (--auditar)', () => {
  /* Um carro de dois cubos de lado 1: a roda assenta na base e o corpo vai em
     cima dela. O que está sob prova é a ligação das duas medidas ao comando; a
     geometria delas tem suítes próprias. */
  const CUBO = { 'cubo': { meta: { nome: 'cubo' }, PARAMS: {}, PASSOS: [
    ['cubo', { origemId: 1, larg: 1, alt: 1, prof: 1, em: [0, 0, 0] }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['solido', { sel: { grupo: 'corpo' } }],
  ] } };
  const pose = (x, y) => ({ rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [x, y, 0] });
  const CHAO = { plano: { normal: [0, 1, 0], altura: 0 }, toleranciaNumerica: 0.001, apoiam: [{ caminho: ['roda'] }] };
  const EXPECTATIVA = { id: 'corpo-na-roda', a: { caminho: ['corpo'] }, b: { caminho: ['roda'] }, motivo: 'o corpo assenta de propósito na roda, rente' };

  function escreverCarro({ alturaDaRoda = 0, alturaDoCorpo = 1, extras = {} } = {}) {
    const dado = {
      formato: 'mecanifica.montagem',
      versao: 5,
      id: 'carro',
      instancias: [
        { id: 'roda', alvo: { tipo: 'peca', ref: 'cubo' }, pose: pose(0, alturaDaRoda) },
        { id: 'corpo', alvo: { tipo: 'peca', ref: 'cubo' }, pose: pose(0, alturaDoCorpo) },
      ],
      relacoes: [],
      etapas: ['roda', 'corpo'],
      vinculos: [],
      posicoes: [],
      ...extras,
    };
    const caminho = join(area, 'carro.json');
    writeFileSync(caminho, JSON.stringify(dado), 'utf8');
    return caminho;
  }

  it('a descrição aceita uma auditoria de interseções feita sem profundidade', async () => {
    const r = await auditarEtapas(escreverCarro({ alturaDoCorpo: 0.6 }), { receitas: CUBO });
    const { profundidade, ...semProfundidade } = r.intersecoes.naoDeclarados[0];
    const sem = { ...r, intersecoes: { ...r.intersecoes, naoDeclarados: [semProfundidade], pares: [semProfundidade] } };
    expect(profundidade).toBeGreaterThan(0);
    expect(() => descreverAuditoria(sem)).not.toThrow();
    expect(descreverAuditoria(sem)).not.toContain('profundidade');
  });

  it('a roda no chão e o corpo rente em cima passam: o encosto não declarado avisa e não reprova', async () => {
    const r = await auditarEtapas(escreverCarro({ extras: { apoioNoChao: CHAO } }), { receitas: CUBO });
    expect(r.codigo).toBe(0);
    expect(r.construidas).toEqual(['roda', 'corpo']);
    expect(r.intersecoes.naoDeclarados.map((par) => par.estado)).toEqual(['encostam']);
    expect(r.apoio.apoios[0]).toMatchObject({ caminho: ['roda'], estado: 'apoia' });
    expect(descreverAuditoria(r)).toContain('resultado: passa.');
  });

  it('a roda 17 mm acima do chão reprova no apoio, com a altura no relatório', async () => {
    const r = await auditarEtapas(escreverCarro({ alturaDaRoda: 0.017, alturaDoCorpo: 1.017, extras: { apoioNoChao: CHAO } }), { receitas: CUBO });
    expect(r.codigo).toBe(1);
    expect(r.apoio.apoios[0].estado).toBe('flutua');
    const texto = descreverAuditoria(r);
    expect(texto).toContain('REPROVA roda: flutua, ponto mais baixo a 0.017 do chão');
    expect(texto).toContain('resultado: REPROVA.');
  });

  it('o corpo enterrado na roda e sem declaração reprova, com a profundidade, e a declaração o cala', async () => {
    const r = await auditarEtapas(escreverCarro({ alturaDoCorpo: 0.6 }), { receitas: CUBO });
    expect(r.codigo).toBe(1);
    expect(r.apoio).toBeNull();
    expect(r.intersecoes.naoDeclarados).toHaveLength(1);
    expect(r.intersecoes.naoDeclarados[0].estado).toBe('interpenetram');
    expect(r.intersecoes.naoDeclarados[0].profundidade).toBeGreaterThan(0);
    const texto = descreverAuditoria(r);
    expect(texto).toMatch(/REPROVA corpo x roda: interpenetram \(.+\), profundidade 0\.\d+/);
    expect(texto).toContain('a montagem não declara apoioNoChao; nada foi medido.');

    const declarado = await auditarEtapas(escreverCarro({ alturaDoCorpo: 0.6, extras: { auditoriaIntersecoes: { toleranciaNumerica: 1e-9, expectativas: [EXPECTATIVA] } } }), { receitas: CUBO });
    expect(declarado.codigo).toBe(0);
    expect(declarado.intersecoes.naoDeclarados).toEqual([]);
    expect(descreverAuditoria(declarado)).toMatch(/declara corpo x roda: interpenetram .*declarado 'corpo-na-roda'/);
  });

  it('os não declarados vêm antes dos declarados no relatório, e a declaração sem contato aparece', async () => {
    const r = await auditarEtapas(escreverCarro({ alturaDoCorpo: 5, extras: { auditoriaIntersecoes: { toleranciaNumerica: 1e-9, expectativas: [EXPECTATIVA] } } }), { receitas: CUBO });
    expect(r.codigo).toBe(0);
    expect(descreverAuditoria(r)).toContain("declarações sem contato (não reprovam, mas descrevem o que não existe):\n  corpo x roda: 'corpo-na-roda'");
  });

  it('o apoio reprova também quando uma peça que não se apoia passa abaixo do chão', async () => {
    const r = await auditarEtapas(escreverCarro({ alturaDoCorpo: -3, extras: { apoioNoChao: CHAO } }), { receitas: CUBO });
    expect(r.codigo).toBe(1);
    expect(r.apoio.abaixoDoChao.map((item) => item.caminho)).toEqual([['corpo']]);
    expect(descreverAuditoria(r)).toContain('REPROVA corpo: passa 3 abaixo do chão');
  });

  it('só as etapas construídas entram: a citação de instância sem geometria sai da auditoria, e o relatório diz', async () => {
    const semGeometria = { ...CUBO, 'cubo-vazio': { meta: { nome: 'v' }, PARAMS: {}, PASSOS: [] } };
    const arquivoParcial = join(area, 'parcial.json');
    const dado = JSON.parse(readFileSync(escreverCarro({ extras: { apoioNoChao: { ...CHAO, apoiam: [{ caminho: ['roda'] }, { caminho: ['corpo'] }] }, auditoriaIntersecoes: { toleranciaNumerica: 1e-9, expectativas: [EXPECTATIVA] } } }), 'utf8'));
    dado.instancias[1].alvo.ref = 'cubo-vazio';
    writeFileSync(arquivoParcial, JSON.stringify(dado), 'utf8');
    const r = await auditarEtapas(arquivoParcial, { receitas: semGeometria });
    expect(r.construidas).toEqual(['roda']);
    expect(r.foraDasEtapas).toEqual(['corpo']);
    expect(r.apoioForaDasEtapas).toEqual([['corpo']]);
    expect(r.apoio.apoios.map((item) => item.caminho)).toEqual([['roda']]);
    expect(descreverAuditoria(r)).toContain("apoio declarado em 'corpo', fora das etapas construídas, não medido.");
    /* Etapa sem geometria nunca passa por auditoria completa: o código é 2. */
    expect(r.codigo).toBe(2);
    expect(descreverAuditoria(r)).toContain('resultado: nada reprova, mas a auditoria é incompleta');
  });

  it('com o apoio todo em etapa sem geometria, a auditoria não diz que passou: mede só o que existe e sai com 2', async () => {
    const semGeometria = { ...CUBO, 'cubo-vazio': { meta: { nome: 'v' }, PARAMS: {}, PASSOS: [] } };
    const caminho = escreverCarro({ extras: { apoioNoChao: { ...CHAO, apoiam: [{ caminho: ['corpo'] }] } } });
    const dado = JSON.parse(readFileSync(caminho, 'utf8'));
    dado.instancias[1].alvo.ref = 'cubo-vazio';
    writeFileSync(caminho, JSON.stringify(dado), 'utf8');
    const { dado: parcial, construidas } = montagemAteAGeometria(dado, lerMontagemPersistida(dado), semGeometria);
    expect(construidas).toEqual(['roda']);
    expect(Object.hasOwn(parcial, 'apoioNoChao')).toBe(false);
    expect(() => lerMontagemPersistida(parcial)).not.toThrow();
    const r = await auditarEtapas(caminho, { receitas: semGeometria });
    expect(r.apoio.apoios).toEqual([]);
    expect(r.apoioForaDasEtapas).toEqual([['corpo']]);
    expect(r.codigo).toBe(2);
    /* e a peça construída ainda é conferida contra o chão */
    dado.instancias[0].pose = pose(0, -3);
    writeFileSync(caminho, JSON.stringify(dado), 'utf8');
    const funda = await auditarEtapas(caminho, { receitas: semGeometria });
    expect(funda.codigo).toBe(1);
    expect(funda.apoio.abaixoDoChao.map((item) => item.caminho)).toEqual([['roda']]);
  });

  it('a auditoria não grava o registro de etapas', async () => {
    const caminho = escreverCarro();
    await auditarEtapas(caminho, { receitas: CUBO });
    expect(() => readFileSync(caminho.replace(/\.json$/, '.etapas.json'))).toThrow();
  });
});
