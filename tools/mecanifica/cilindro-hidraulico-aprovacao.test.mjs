/* cilindro-hidraulico-aprovacao.test.mjs — a aprovação mecânica de uma família que gera montagem: o curso da articulação
   é conferido contra as malhas da camisa e da haste, e o gate `familias:check` percebe, sem repetir a conta, que a
   aprovação gravada deixou de valer. A prova: o `aprovacao.json` do cilindro hidráulico passa no gate; o curso que
   colide reprova a aprovação; e o gate reprova o curso não conferido, o aprovado com colisão, a peça da montagem que
   mudou e a declaração da articulação que mudou. */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { CILINDRO_HIDRAULICO } from '../../procedural/familias/cilindro-hidraulico/index.js';
import { TUBO_DE_PROVA } from '../fixtures/familia-chamavel/familia.js';
import { ARQUIVO_APROVACAO, conferirAprovacao, integrarOCurso, medirPonto, pontosDaFamilia } from './aprovacao-da-familia.mjs';
import { conferirCursoDaFamilia, geraMontagem, hashDaPeca, resumirCurso } from './curso-da-familia.mjs';
import { PASTA_DAS_FAMILIAS } from './familia.mjs';

const PASTA = join(PASTA_DAS_FAMILIAS, 'cilindro-hidraulico');
const raizes = [];
afterAll(() => { for (const raiz of raizes) rmSync(raiz, { recursive: true, force: true }); });

/* uma cópia da pasta aprovada, com o `aprovacao.json` alterado por `mudar` */
function copiaComAprovacao(mudar) {
  const raiz = mkdtempSync(join(tmpdir(), 'cilindro-'));
  raizes.push(raiz);
  const pasta = join(raiz, 'cilindro-hidraulico');
  mkdirSync(pasta);
  cpSync(join(PASTA, 'familia.json'), join(pasta, 'familia.json'));
  const aprovacao = JSON.parse(readFileSync(join(PASTA, ARQUIVO_APROVACAO), 'utf8'));
  mudar(aprovacao);
  writeFileSync(join(pasta, ARQUIVO_APROVACAO), JSON.stringify(aprovacao));
  return pasta;
}
const articulacaoDe = (aprovacao, ponto) => aprovacao.mecanica.pontos[ponto].medidas.find((m) => m.ferramenta === 'articulacao');
const gate = (pasta) => conferirAprovacao(CILINDRO_HIDRAULICO, { pasta, exigirNomeDaPasta: false });
const codigos = (resultado) => resultado.problemas.map(({ codigo, ponto }) => `${ponto ?? '-'}:${codigo}`);

describe('o cilindro hidráulico aprovado na camada mecânica', () => {
  it('passa no gate, com o curso conferido nos três pontos e nenhuma colisão', () => {
    expect(gate(PASTA)).toEqual({ ok: true, familia: 'cilindro-hidraulico', problemas: [] });
    const aprovacao = JSON.parse(readFileSync(join(PASTA, ARQUIVO_APROVACAO), 'utf8'));
    expect(aprovacao.formato).toBe('mecanifica.aprovacao-da-familia@1');
    expect(aprovacao.critico).toBeNull();
    expect(aprovacao.pessoa).toBeNull();
    expect(aprovacao.mecanica.portas).toEqual(['eixo-da-haste', 'guia-da-haste', 'olhal-dianteiro', 'olhal-traseiro']);
    for (const [nome, passos, curso] of [['minimo', 8, 50], ['medio', 20, 500], ['maximo', 60, 1500]]) {
      const medidas = aprovacao.mecanica.pontos[nome].medidas;
      const casca = medidas.find((m) => m.ferramenta === 'casca');
      expect(casca.espessuraMinima).toBeCloseTo(casca.espessura, 9);
      expect(casca.espessuraMaxima).toBeCloseTo(casca.espessura, 9);
      const articulacao = articulacaoDe(aprovacao, nome);
      expect(articulacao).toMatchObject({
        conferido: true, ok: true, tipo: 'prismatica', passos, posicoes: passos + 1, posicoesLivres: passos + 1, colisoes: 0, inconclusivos: 0,
        curso: { minimo: 0, maximo: curso, unidade: 'mm' }, moveis: ['haste'], fixos: ['camisa'],
        pares: [{ movel: 'haste', fixo: 'camisa', estadoMaisGrave: 'encostam', colisoes: 0 }],
      });
      expect(articulacao.motivo).toBeUndefined();
      expect(Object.keys(articulacao.hashDasPecas)).toEqual(['cilindro-hidraulico.camisa', 'cilindro-hidraulico.haste']);
    }
  });

  it('a espessura da casca medida é a parede pedida em cada ponto: 3, 8 e 25 mm', () => {
    const aprovacao = JSON.parse(readFileSync(join(PASTA, ARQUIVO_APROVACAO), 'utf8'));
    const paredes = ['minimo', 'medio', 'maximo'].map((nome) => aprovacao.mecanica.pontos[nome].medidas.find((m) => m.ferramenta === 'casca').espessura);
    expect(paredes).toEqual([0.003, 0.008, 0.025]);
  });
});

describe('o gate percebe a aprovação que deixou de valer, sem repetir a conta do curso', () => {
  it('reprova o curso que não foi conferido, dizendo o ponto', () => {
    const pasta = copiaComAprovacao((a) => {
      a.mecanica.pontos.medio.medidas = a.mecanica.pontos.medio.medidas.map((m) => (m.ferramenta === 'articulacao' ? { ...m, conferido: false } : m));
    });
    expect(codigos(gate(pasta))).toEqual(['medio:curso-nao-conferido']);
  });

  it('reprova o curso aprovado com colisão', () => {
    const pasta = copiaComAprovacao((a) => { articulacaoDe(a, 'maximo').ok = false; });
    expect(codigos(gate(pasta))).toEqual(['maximo:curso-colide']);
  });

  it('reprova a peça da montagem que mudou, mesmo com o conjunto igual', () => {
    const pasta = copiaComAprovacao((a) => { articulacaoDe(a, 'minimo').hashDasPecas['cilindro-hidraulico.haste'] = 'sha256:0'; });
    expect(codigos(gate(pasta))).toEqual(['minimo:montagem-mudou']);
  });

  it('reprova a declaração da articulação que mudou', () => {
    const pasta = copiaComAprovacao((a) => { articulacaoDe(a, 'medio').declaracao.passos = 3; });
    expect(codigos(gate(pasta))).toEqual(['medio:articulacao-mudou']);
  });
});

describe('a aprovação de uma família que gera montagem não passa sem o curso', () => {
  const sondaDoPonto = (estado = 'ok') => ({ estado, medidas: [{ ferramenta: 'articulacao', id: 'haste-na-camisa', conferido: false, motivo: 'x' }] });
  const pontos = () => ({ minimo: sondaDoPonto(), medio: sondaDoPonto(), maximo: sondaDoPonto() });
  const curso = (ok) => ({
    conferido: true, ok, articulacao: 'haste-na-camisa', recusa: ok ? [] : ['articulação \'haste-na-camisa\': na posição 3 de 8 (30 mm) ["haste"] penetra 2 mm ["camisa"].'],
  });

  it('sem o curso conferido, cada ponto reprova', () => {
    const problemas = [];
    integrarOCurso(pontos(), null, problemas);
    expect(problemas.map(({ ponto, codigo }) => `${ponto}:${codigo}`)).toEqual(['minimo:curso-nao-conferido', 'medio:curso-nao-conferido', 'maximo:curso-nao-conferido']);
  });

  it('com colisão no curso, o ponto reprova dizendo a posição e a penetração, e a medida guarda o resultado', () => {
    const problemas = [];
    const p = pontos();
    integrarOCurso(p, { minimo: curso(true), medio: curso(false), maximo: curso(true) }, problemas);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ ponto: 'medio', codigo: 'curso-colide' });
    expect(problemas[0].mensagem).toMatch(/posição 3 de 8 \(30 mm\) \["haste"\] penetra 2 mm/);
    const articulacao = p.medio.medidas.find((m) => m.ferramenta === 'articulacao');
    expect(articulacao).toMatchObject({ id: 'haste-na-camisa', conferido: true, ok: false });
    expect(articulacao.motivo).toBeUndefined();
    expect(p.medio.medidas).toHaveLength(1);
  });

  it('a família que não gera montagem fica como estava', async () => {
    expect(geraMontagem(TUBO_DE_PROVA)).toBe(false);
    expect(await conferirCursoDaFamilia(TUBO_DE_PROVA, pontosDaFamilia(TUBO_DE_PROVA.contrato))).toEqual({});
  });
});

describe('o curso conferido do cilindro com a faixa do ponto mínimo', () => {
  it('resume o relatório e a assinatura da montagem, que não muda de uma chamada para a outra', async () => {
    const parametros = pontosDaFamilia(CILINDRO_HIDRAULICO.contrato).minimo;
    const a = await conferirCursoDaFamilia(CILINDRO_HIDRAULICO, { minimo: parametros });
    expect(a.minimo).toMatchObject({ conferido: true, ok: true, passos: 8, posicoes: 9, colisoes: 0, curso: { minimo: 0, maximo: 50, unidade: 'mm' } });
    expect(Object.keys(a.minimo.hashDasPecas)).toEqual(['cilindro-hidraulico.camisa', 'cilindro-hidraulico.haste']);
    const montagem = CILINDRO_HIDRAULICO.montar(parametros);
    expect(a.minimo.hashDasPecas['cilindro-hidraulico.haste']).toBe(hashDaPeca(montagem.pecas.get('cilindro-hidraulico.haste')));
    expect(a.minimo.declaracao).toEqual(montagem.articulacao);
    expect(resumirCurso(await montagem.conferirCurso()).ok).toBe(true);
  }, 120_000);

  it('a articulação que o conjunto declara pela extensão é a da montagem: mesmo id, tipo, unidade, curso e passos', () => {
    for (const nome of ['minimo', 'medio', 'maximo']) {
      const parametros = pontosDaFamilia(CILINDRO_HIDRAULICO.contrato)[nome];
      const declarada = medirPonto(CILINDRO_HIDRAULICO, parametros, nome).medidas.find((m) => m.ferramenta === 'articulacao');
      const { articulacao } = CILINDRO_HIDRAULICO.montar(parametros);
      expect(declarada).toMatchObject({ id: articulacao.id, tipo: articulacao.tipo, unidade: articulacao.unidade, curso: articulacao.curso, passos: articulacao.passos });
    }
  });
});
