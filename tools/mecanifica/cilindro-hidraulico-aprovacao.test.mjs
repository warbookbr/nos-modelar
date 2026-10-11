/* cilindro-hidraulico-aprovacao.test.mjs — a aprovação mecânica de uma família que gera montagem: o curso da articulação
   é conferido contra as malhas da camisa e da haste, e o gate `familias:check` percebe, sem repetir a conta, que a
   aprovação gravada deixou de valer. A prova: o `aprovacao.json` do cilindro hidráulico passa no gate; o curso que
   colide reprova a aprovação; e o gate reprova o curso não conferido, o aprovado com colisão e a montagem (peças ou
   declaração) que mudou. O mecanismo é o mesmo da dobradiça (`montagem-da-familia.mjs`), uma só conferência. */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { CILINDRO_HIDRAULICO } from '../../procedural/familias/cilindro-hidraulico/index.js';
import { TUBO_DE_PROVA } from '../fixtures/familia-chamavel/familia.js';
import { ARQUIVO_APROVACAO, conferirAprovacao, medirPonto, pontosDaFamilia } from './aprovacao-da-familia.mjs';
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
const montagemDe = (aprovacao, ponto) => aprovacao.mecanica.pontos[ponto].montagem;
const gate = (pasta) => conferirAprovacao(CILINDRO_HIDRAULICO, { pasta, exigirNomeDaPasta: false });
const codigos = (resultado) => resultado.problemas.map(({ codigo, ponto }) => `${ponto ?? '-'}:${codigo}`);

describe('o cilindro hidráulico aprovado na camada mecânica', () => {
  it('passa no gate, com o curso conferido nos três pontos e nenhuma colisão', () => {
    expect(gate(PASTA)).toEqual({ ok: true, familia: 'cilindro-hidraulico', problemas: [] });
    const aprovacao = JSON.parse(readFileSync(join(PASTA, ARQUIVO_APROVACAO), 'utf8'));
    expect(aprovacao.formato).toBe('mecanifica.aprovacao-da-familia@1');
    /* a camada do crítico, quando gravada, julgou a mesma geometria que a mecânica aprovou */
    for (const [nome, ponto] of Object.entries(aprovacao.critico?.pontos ?? {})) expect(ponto.hash).toBe(aprovacao.mecanica.pontos[nome].hash);
    expect(aprovacao.mecanica.portas).toEqual(['eixo-da-haste', 'guia-da-haste', 'olhal-dianteiro', 'olhal-traseiro']);
    for (const [nome, passos, curso] of [['minimo', 8, 50], ['medio', 20, 500], ['maximo', 60, 1500]]) {
      const { medidas } = aprovacao.mecanica.pontos[nome];
      const casca = medidas.find((m) => m.ferramenta === 'casca');
      expect(casca.espessuraMinima).toBeCloseTo(casca.espessura, 9);
      expect(casca.espessuraMaxima).toBeCloseTo(casca.espessura, 9);
      /* a medida da articulação declarada diz que o curso foi conferido, sem o motivo de quem não gera montagem */
      const declarada = medidas.find((m) => m.ferramenta === 'articulacao');
      expect(declarada).toMatchObject({ id: 'haste-na-camisa', tipo: 'prismatica', passos, conferido: true, curso: { minimo: 0, maximo: curso } });
      expect(declarada.motivo).toBeUndefined();
      const montagem = montagemDe(aprovacao, nome);
      expect(montagem).toMatchObject({ conferido: true, pecas: ['cilindro-hidraulico.camisa', 'cilindro-hidraulico.haste'] });
      expect(montagem.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(montagem.articulacoes).toEqual([{
        id: 'haste-na-camisa', tipo: 'prismatica', curso: { minimo: 0, maximo: curso, unidade: 'mm' }, passos, posicoes: passos + 1, colisoes: 0,
        paresConferidos: 1, pares: [{ movel: ['haste'], fixo: ['camisa'], estadoMaisGrave: 'encostam' }], conferido: true,
      }]);
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
    const pasta = copiaComAprovacao((a) => { montagemDe(a, 'medio').conferido = false; });
    expect(codigos(gate(pasta))).toEqual(['medio:curso-nao-conferido']);
  });

  it('reprova o curso aprovado com colisão', () => {
    const pasta = copiaComAprovacao((a) => { montagemDe(a, 'maximo').articulacoes[0].colisoes = 2; });
    expect(codigos(gate(pasta))).toEqual(['maximo:curso-nao-conferido']);
  });

  it('reprova a aprovação sem o resultado da montagem', () => {
    const pasta = copiaComAprovacao((a) => { delete a.mecanica.pontos.minimo.montagem; });
    expect(codigos(gate(pasta))).toEqual(['minimo:curso-nao-conferido', 'minimo:montagem-mudou']);
  });

  it('reprova a montagem que mudou, as peças ou a declaração', () => {
    const pasta = copiaComAprovacao((a) => { montagemDe(a, 'minimo').hash = 'sha256:0'; });
    expect(codigos(gate(pasta))).toEqual(['minimo:montagem-mudou']);
  });
});

describe('o curso que colide reprova o ponto na aprovação', () => {
  it('a haste declarada para trás do fundo da camisa reprova dizendo a posição e a penetração', () => {
    const atrasDoFundo = {
      ...CILINDRO_HIDRAULICO,
      montar: (parametros) => {
        const montada = CILINDRO_HIDRAULICO.montar(parametros);
        return { ...montada, articulacoes: [{ ...montada.articulacoes[0], curso: { minimo: -2, maximo: -1 }, passos: 1 }] };
      },
    };
    const ponto = medirPonto(atrasDoFundo, pontosDaFamilia(CILINDRO_HIDRAULICO.contrato).minimo, 'minimo');
    expect(ponto.estado).toBe('reprovado');
    expect(ponto.problemas.map(({ codigo }) => codigo)).toEqual(['curso-com-colisao', 'curso-com-colisao']);
    expect(ponto.problemas[0].mensagem).toMatch(/\["haste"\] penetra 2 mm \["camisa"\]/);
    expect(ponto.montagem.articulacoes[0]).toMatchObject({ conferido: false, colisoes: 2 });
  }, 120_000);
});

describe('a família que não gera montagem fica como estava', () => {
  it('o ponto não traz `montagem` e a medida da articulação declarada continua não conferida', () => {
    const ponto = medirPonto(TUBO_DE_PROVA, pontosDaFamilia(TUBO_DE_PROVA.contrato).medio);
    expect(ponto.montagem).toBeUndefined();
  });

  it('a articulação que o conjunto declara pela extensão é a da montagem: mesmo id, tipo, unidade, curso e passos', () => {
    for (const nome of ['minimo', 'medio', 'maximo']) {
      const parametros = pontosDaFamilia(CILINDRO_HIDRAULICO.contrato)[nome];
      const declarada = medirPonto(CILINDRO_HIDRAULICO, parametros, nome, { montagem: 'hash' }).medidas.find((m) => m.ferramenta === 'articulacao');
      const [articulacao] = CILINDRO_HIDRAULICO.montar(parametros).articulacoes;
      expect(declarada).toMatchObject({ id: articulacao.id, tipo: articulacao.tipo, unidade: articulacao.unidade, curso: articulacao.curso, passos: articulacao.passos });
    }
  });
});
