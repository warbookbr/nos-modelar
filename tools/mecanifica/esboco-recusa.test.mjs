/* esboco-recusa.test.mjs — toda recusa do esboço aponta o tópico que resolve, e o tópico existe no índice real de
   `npm run esboco -- --ajuda`: a forma e o campo desconhecidos, o contrato de contato, o gate de contato que reprova e o Portão
   do Condutor que não passa, na linha de comando de verdade. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ajuda, lerTopicos, README_DO_ESBOCO } from './esboco-ajuda.mjs';
import { dica, TOPICO_DO_TIPO, textoDaRecusa, topicoDaRecusa, topicoDoContato, topicoDoPortao, TOPICOS_DAS_RECUSAS } from './esboco-recusa.mjs';

const ESBOCO = fileURLToPath(new URL('./esboco.mjs', import.meta.url));
const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro, ...extra });
const longe = [caixa('a', [0, 0, 0]), caixa('b', [500, 0, 0])];

const topicosDoIndice = () => new Set(lerTopicos(readFileSync(README_DO_ESBOCO, 'utf8')).map((t) => t.id));

/* Roda a linha de comando num esboço de teste, numa pasta temporária. */
function rodar(esboco, ...args) {
  const pasta = mkdtempSync(join(tmpdir(), 'recusa-'));
  const arquivo = join(pasta, 'r.esboco.json');
  writeFileSync(arquivo, typeof esboco === 'string' ? esboco : JSON.stringify(esboco));
  return spawnSync(process.execPath, [ESBOCO, arquivo, ...args], { encoding: 'utf8' });
}
const topicoCitado = (texto) => /veja npm run esboco -- --ajuda (\S+)\n?$/.exec(texto)?.[1] ?? null;

describe('os tópicos que as recusas citam', () => {
  it('existem todos no índice real da ajuda, para o apontamento não envelhecer', () => {
    const indice = topicosDoIndice();
    const faltam = [...TOPICOS_DAS_RECUSAS].filter((t) => !indice.has(t));
    expect(faltam, `tópicos citados e ausentes do índice (${[...indice].join(', ')})`).toEqual([]);
    for (const t of TOPICOS_DAS_RECUSAS) expect(ajuda(t).codigo, t).toBe(0);
    expect(Object.keys(TOPICO_DO_TIPO)).toEqual(expect.arrayContaining(['caixa', 'tubo', 'envolve']));
  });
});

describe('o tópico de cada mensagem', () => {
  const casos = [
    ['forma "perna": o campo "raio" não existe em tubo; campos válidos: caminho, diametro', 'tubo'],
    ['forma "tampa": o campo "diametro" não existe em caixa; o campo "diametro" vale em cilindro', 'caixa'],
    ['forma "cinta": o campo "x" não existe em envolve; campos válidos: circulos', 'faixa'],
    ['opção 1, forma "a": tipo "cubo" desconhecido; use cilindro, anel, caixa', 'formas'],
    ['opção 1 (T), forma "a": "tipo" com o valor "cubo" deve ser um de caixa, cilindro, anel, cone, esfera, extrusao, loft, revolucao, tubo, envolve (quis dizer "tubo"?)', 'formas'],
    ['esboço: o campo "formaz" não existe; campos válidos: nota, opcoes', 'esquema'],
    ['opção 1 (A), forma "x": porta: o papel da porta "recebee" deve ser um de recebe, ocupa, apoia (quis dizer "recebe"?)', 'portas'],
    ['esboço: o par presilha ↔ guidao (tipo atravessa) precisa dizer por que a exceção existe: falta o campo "motivo". A porta não o justifica: "a" (apoia) e "b" (apoia): as duas portas não se encaixam', 'portas'],
    ['as portas de "a" e "b" declaram classes de ajuste diferentes (folgado, transicao)', 'portas'],
    ['esboço: contato: o campo "tol" não existe; campos válidos: usar', 'contrato'],
    ['opção 1: o par a ↔ b (tipo atravessa) precisa dizer por que a exceção existe: falta o campo "motivo". Exemplo: {}', 'contrato'],
    ['esboço: plano: o campo "niveel" não existe', 'plano'],
    ['forma "x": cilindro precisa de "diametro" positivo em mm', 'cilindro'],
    ['forma "x": "eixo" deve ser "x", "y" ou "z"', 'esquema'],
    ['editar: "tanque" não começa por uma forma declarada', 'editar'],
    ['condutor: --feito vale no estágio Detalhe por unidade (o estágio atual é Maquete)', 'unidades'],
    ['--corte precisa de <eixo>=<valor>', 'vistas-ia'],
  ];
  for (const [mensagem, topico] of casos) it(`${topico}: ${mensagem.slice(0, 70)}`, () => expect(topicoDaRecusa(mensagem)).toBe(topico));

  it('um JSON ilegível ou um arquivo que não existe apontam o arquivo e a raiz do JSON', () => {
    expect(topicoDaRecusa('Unexpected token }', new SyntaxError('x'))).toBe('como-escrever');
    expect(topicoDaRecusa('arquivo não encontrado (x.json)', Object.assign(new Error('x'), { code: 'ENOENT' }))).toBe('como-escrever');
  });

  it('a mensagem que nenhuma regra reconhece sai sem dica, e a recusa ganha a linha com o comando', () => {
    expect(topicoDaRecusa('nada que alguma regra reconheça')).toBeNull();
    expect(textoDaRecusa('nada que alguma regra reconheça').texto).toBe('esboço recusado: nada que alguma regra reconheça\n');
    expect(textoDaRecusa('forma "x": o campo "raio" não existe em tubo').texto).toBe(`esboço recusado: forma "x": o campo "raio" não existe em tubo\n${dica('tubo')}\n`);
  });

  it('o gate de contato aponta o conserto quando ele propôs um, e o contato quando só relata', () => {
    expect(topicoDoContato({ achados: [{ tipo: 'voando' }, { tipo: 'colisao', sugestao: { texto: 'x' } }] })).toBe('conserto');
    expect(topicoDoContato({ achados: [{ tipo: 'voando' }] })).toBe('contato');
    expect(topicoDoContato({ achados: [{ tipo: 'porta-fora' }] })).toBe('portas');
    expect(topicoDoContato({ achados: [{ tipo: 'porta-fora' }, { tipo: 'voando' }] })).toBe('contato');
  });

  it('o Portão aponta o envelope, as unidades, o crítico ou, no resto, o Condutor', () => {
    expect(topicoDoPortao(['2 unidades sem o Envelope conferido (--envelope <unidade> <arquivo>): a, b'])).toBe('envelope');
    expect(topicoDoPortao(['3 unidades de detalhe sem marcar como feita (--feito <unidade>): a'])).toBe('unidades');
    expect(topicoDoPortao(['as formas mudaram desde o Plano de detalhe (sem unidade: x)'])).toBe('unidades');
    expect(topicoDoPortao([], 'condutor: a unidade tem nota 6 do crítico')).toBe('critico');
    expect(topicoDoPortao(['[1] atravessa: a e b se atravessam'])).toBe('contato');
    expect(topicoDoPortao(['o plano declara 0 medidas e o nível medio pede pelo menos 3'])).toBe('condutor');
  });
});

describe('a linha de comando recusa apontando o tópico', () => {
  it('o campo que não existe numa forma aponta o tipo da forma', () => {
    const r = rodar({ opcoes: [{ titulo: 'T', formas: [{ id: 't', tipo: 'tubo', caminho: [[0, 0, 0], [0, 100, 0]], diametro: 10, raio: 5 }] }] });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/^esboço recusado: .*o campo "raio" não existe em tubo/);
    expect(topicoCitado(r.stderr)).toBe('tubo');
  });

  it('o tipo de forma que não existe aponta as formas', () => {
    const r = rodar({ opcoes: [{ titulo: 'T', formas: [{ id: 'a', tipo: 'cubo', largura: 1 }] }] });
    expect(r.status).toBe(1);
    expect(topicoCitado(r.stderr)).toBe('formas');
  });

  it('o JSON ilegível aponta como escrever', () => {
    const r = rodar('{ "opcoes": ');
    expect(r.status).toBe(1);
    expect(topicoCitado(r.stderr)).toBe('como-escrever');
  });

  it('o par de contato sem motivo aponta o contrato', () => {
    const r = rodar({ opcoes: [{ titulo: 'T', formas: longe }], contato: { usar: true, pares: [{ a: 'a', b: 'b', tipo: 'atravessa', max: 15 }] } });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/^esboço recusado: .*a ↔ b.*falta o campo "motivo".*Exemplo:/);
    expect(topicoCitado(r.stderr)).toBe('contrato');
  });

  it('o bloco do gate de contato que reprova termina com o conserto (ele propôs um) e a projeção vem depois', () => {
    const r = rodar({ opcoes: [{ titulo: 'T', formas: longe }], contato: { usar: true, tolerancia: 1, folga: 50 } }, '--rapido');
    const bloco = /contato \(.*\): reprovado\n(?:.*\n)*?veja npm run esboco -- --ajuda \S+\n/.exec(r.stdout)?.[0] ?? '';
    expect(topicoCitado(bloco)).toBe('conserto');
    expect(r.stdout.indexOf('sobreposição na projeção')).toBeGreaterThan(r.stdout.indexOf(bloco));
  }, 60000);

  it('o Portão do Condutor que não passa termina com um tópico do índice', () => {
    const r = rodar({ opcoes: [{ titulo: 'T', formas: longe }], contato: { usar: true, tolerancia: 1, folga: 50 } }, '--condutor', '--proximo');
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/avanço recusado: o Portão de Maquete não passa/);
    const topico = topicoCitado(r.stdout);
    expect(['condutor', 'unidades', 'envelope', 'critico', 'contato']).toContain(topico);
    expect(topicosDoIndice().has(topico)).toBe(true);
  }, 60000);
});
