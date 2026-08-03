// Prova determinismo, validação e comparação dos artefatos neutros de revisão e crítica.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
import * as jardineira from '../../prototipos/fps/v3/pecas/_jardineira.js';
import { descreverPeca } from '../../src/autoria/descrever-partes.js';
import {
  FORMATO_CRITICA,
  FORMATO_REVISAO,
  compararRevisoes,
  construirRevisao,
  jsonCanonico,
  marcarCriticaObsoleta,
  validarCritica,
  validarRevisao,
  VERSAO,
} from './revisao-modelagem.mjs';

function descricao({ raio = 10, faces = 12, porta = 'eixo', rotulo = porta, relacaoTipo = 'interpenetra' } = {}) {
  return {
    totais: { partes: 2, faces, vertices: 16, facesSemParte: 0, orfaos: 0, portas: 1 },
    partes: [
      { nome: 'aro', faces: 8, corpos: 1, min: [-raio, -2, -raio], max: [raio, 2, raio], centro: [0, 0, 0], dimensoes: [raio * 2, 4, raio * 2] },
      { nome: 'cubo', faces: 4, corpos: 1, min: [-2, -3, -2], max: [2, 3, 2], centro: [0, 0, 0], dimensoes: [4, 6, 4] },
    ],
    relacoes: [
      { a: 'cubo', b: 'aro', tipo: relacaoTipo, distancia: 2, eixo: 'x', porEixo: [-2, -4, -2] },
    ],
    /* Forma real da jardineira: uma origem semântica pode ter id numérico,
       como `cone:405`; isso NÃO é a posição do passo 17, que sai da revisão. */
    portas: [{ id: porta, rotulo, op: 'cone', origemId: 405, recorte: '', origem: 'cone:405', passo: 17 }],
    aparencia: {
      materiais: [{ nome: 'metal', propriedades: { cor: '#808080', aspereza: 0.5 } }],
      partes: [
        { nome: 'aro', coberturas: [{ material: 'metal', cor: '#808080', liso: false, pinturas: [], faces: 8 }] },
        { nome: 'cubo', coberturas: [{ material: 'metal', cor: '#808080', liso: false, pinturas: [], faces: 4 }] },
      ],
    },
  };
}

function vistas() {
  return ['superior', 'direita', 'isometrica', 'frontal'].map((nome) => ({
    nome,
    enquadramento: { valida: true, area: 0.6, largura: 0.8, altura: 0.75, cortado: false },
  }));
}

function revisao(opcoes) {
  return construirRevisao({ peca: 'rodaTeste', descricao: descricao(opcoes), vistas: vistas() });
}

function neutroComMaterial({ cor = '#808080', aspereza = 0.5, ordemInvertida = false } = {}) {
  const propriedades = ordemInvertida ? { aspereza, cor } : { cor, aspereza };
  return nucleo([
    ['cubo', { origemId: 1, lado: 1 }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['material', { sel: { grupo: 'corpo' }, usa: 'acabamento' }],
  ], {}, {}, { acabamento: propriedades });
}

describe('revisão assistida por IA', () => {
  it('é byte-idêntica apesar da ordem de partes e vistas de entrada', () => {
    const a = revisao();
    const b = construirRevisao({
      peca: 'rodaTeste',
      descricao: { ...descricao(), partes: [...descricao().partes].reverse() },
      vistas: vistas().reverse(),
    });
    expect(jsonCanonico(a)).toBe(jsonCanonico(b));
    expect(a.formato).toBe(FORMATO_REVISAO);
    expect(a.vistas.map((vista) => vista.nome)).toEqual(['isometrica', 'frontal', 'direita', 'superior']);
    expect(jsonCanonico(a)).not.toContain('passo');
    expect(jsonCanonico(a)).not.toContain('127.0.0.1');
    expect(a.modelo.portas[0]).toMatchObject({ id: 'eixo', rotulo: 'eixo', op: 'cone', origemId: 405, origem: 'cone:405' });
  });

  it('recusa UUID, identidade posicional persistida e enquadramento sem gate', () => {
    expect(() => construirRevisao({ peca: '550e8400-e29b-41d4-a716-446655440000', descricao: descricao(), vistas: vistas() })).toThrow(/UUID/);
    const adulterada = structuredClone(revisao());
    adulterada.modelo.portas[0].passo = 2;
    expect(() => validarRevisao(adulterada)).toThrow(/não é reconhecido|posicional/);
    expect(() => construirRevisao({
      peca: 'rodaTeste', descricao: descricao(),
      vistas: vistas().map((vista) => vista.nome === 'direita' ? { ...vista, enquadramento: { ...vista.enquadramento, valida: false } } : vista),
    })).toThrow();
  });

  it('preserva a origem numérica real das portas da jardineira e descarta o passo', () => {
    const neutro = nucleo(
      jardineira.PASSOS, jardineira.PARAMS ?? {}, jardineira.TOPO ?? {},
      jardineira.MATERIAIS ?? {}, jardineira.ESQUELETO ?? null, jardineira.ALIASES ?? [],
    );
    const resultado = construirRevisao({ peca: '_jardineira', descricao: descreverPeca(neutro), vistas: vistas() });
    expect(resultado.modelo.portas).toContainEqual(expect.objectContaining({
      id: 'assentoDoBotao', rotulo: 'assentoDoBotao', op: 'cone', origemId: 405, origem: 'cone:405 tampa=fundo',
    }));
    expect(jsonCanonico(resultado)).not.toContain('"passo"');
  });

  it('assina aparência neutra: mudar só cor ou aspereza aparece no diff', () => {
    const anterior = construirRevisao({
      peca: 'acabamentoTeste', descricao: descreverPeca(neutroComMaterial()), vistas: vistas(),
    });
    const atual = construirRevisao({
      peca: 'acabamentoTeste', descricao: descreverPeca(neutroComMaterial({ cor: '#556677', aspereza: 0.82 })), vistas: vistas(),
    });
    const diff = compararRevisoes(anterior, atual);
    expect(anterior.assinaturaModelo).not.toBe(atual.assinaturaModelo);
    expect(diff.modeloMudou).toBe(true);
    expect(diff.aparencia.materiais.alteradas).toHaveLength(1);
    expect(diff.aparencia.materiais.alteradas[0]).toMatchObject({
      chave: 'acabamento', anterior: { propriedades: { cor: '#808080', aspereza: 0.5 } },
      atual: { propriedades: { cor: '#556677', aspereza: 0.82 } },
    });
    expect(diff.aparencia.partes.alteradas).toHaveLength(0);
  });

  it('canonicaliza aparência apesar da ordem de materiais, partes e coberturas', () => {
    const a = construirRevisao({ peca: 'acabamentoTeste', descricao: descreverPeca(neutroComMaterial()), vistas: vistas() });
    const descricaoInvertida = structuredClone(descreverPeca(neutroComMaterial({ ordemInvertida: true })));
    descricaoInvertida.aparencia.materiais.reverse();
    descricaoInvertida.aparencia.partes.reverse();
    for (const parte of descricaoInvertida.aparencia.partes) parte.coberturas.reverse();
    const b = construirRevisao({ peca: 'acabamentoTeste', descricao: descricaoInvertida, vistas: vistas().reverse() });
    expect(jsonCanonico(a)).toBe(jsonCanonico(b));
  });

  it('valida crítica objetiva e recusa referência inexistente', () => {
    const base = revisao();
    const critica = {
      formato: FORMATO_CRITICA, versao: VERSAO, peca: 'rodaTeste', assinaturaModelo: base.assinaturaModelo,
      itens: [{
        checklist: 'transicaoAro', parte: 'aro', regiao: 'ombroExterno', vista: 'direita', categoria: 'transicao',
        evidencia: 'Na vista direita, o ombro externo termina em uma quina plana.',
        aceite: 'O ombro externo terá transição contínua sem alterar a largura total declarada.',
        viabilidade: 'ajuste',
      }],
      estadosChecklist: [{ checklist: 'transicaoAro', estado: 'divergente' }],
      obsoleta: false,
    };
    expect(validarCritica(critica, base, ['transicaoAro']).obsoleta).toBe(false);
    expect(() => validarCritica({ ...critica, itens: [{ ...critica.itens[0], parte: 'inexistente' }] }, base, ['transicaoAro'])).toThrow(/inexistente/);
    expect(() => validarCritica({ ...critica, itens: [{ ...critica.itens[0], vista: 'traseira' }] }, base, ['transicaoAro'])).toThrow(/vista inexistente/);
    expect(() => validarCritica({ ...critica, obsoleta: undefined }, base, ['transicaoAro'])).toThrow(/obsoleta: false/);
    expect(() => validarCritica({ ...critica, estadosChecklist: [{ checklist: 'transicaoAro', estado: 'atendido' }] }, base, ['transicaoAro'])).toThrow(/exatamente um item/);
    expect(() => validarCritica({ ...critica, estadosChecklist: [] }, base, ['transicaoAro'])).toThrow(/cobrir exatamente/);
    const duasCoberturas = {
      ...critica,
      estadosChecklist: [
        { checklist: 'transicaoAro', estado: 'divergente' },
        { checklist: 'silhueta', estado: 'atendido' },
      ],
    };
    expect(() => validarCritica(duasCoberturas, base, ['silhueta', 'transicaoAro'])).toThrow(/ordem do checklist/);
  });

  it('o CLI recusa crítica pretty e campos obrigatórios ausentes', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'mecanifica-critica-'));
    try {
      const base = revisao();
      const critica = {
        formato: FORMATO_CRITICA, versao: VERSAO, peca: 'rodaTeste', assinaturaModelo: base.assinaturaModelo,
        itens: [], estadosChecklist: [{ checklist: 'silhueta', estado: 'atendido' }], obsoleta: false,
      };
      const criticaArquivo = join(pasta, 'critica.json');
      const revisaoArquivo = join(pasta, 'revisao.json');
      const checklistArquivo = join(pasta, 'checklist.json');
      writeFileSync(criticaArquivo, `${jsonCanonico(critica)}\n`, 'utf8');
      writeFileSync(revisaoArquivo, `${jsonCanonico(base)}\n`, 'utf8');
      writeFileSync(checklistArquivo, `${JSON.stringify({ checklist: [{ id: 'silhueta' }] })}\n`, 'utf8');
      const executar = () => spawnSync(process.execPath, [
        'tools/modelagem/critica-modelagem.mjs', criticaArquivo, revisaoArquivo, checklistArquivo,
      ], { cwd: process.cwd(), encoding: 'utf8' });
      expect(executar().status).toBe(0);
      writeFileSync(criticaArquivo, `${JSON.stringify(critica, null, 2)}\n`, 'utf8');
      expect(executar().stderr).toMatch(/não está canonicalizado/);
      const semObrigatorio = { ...critica };
      delete semObrigatorio.obsoleta;
      writeFileSync(criticaArquivo, `${jsonCanonico(semObrigatorio)}\n`, 'utf8');
      expect(executar().stderr).toMatch(/precisa declarar: obsoleta/);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });

  it('mostra diff estrutural e obsoleta a crítica quando a assinatura muda', () => {
    const anterior = revisao({ raio: 10, faces: 12, porta: 'eixo' });
    const atual = revisao({ raio: 12, faces: 20, porta: 'eixoNovo', relacaoTipo: 'encosta' });
    const critica = { formato: FORMATO_CRITICA, versao: VERSAO, peca: 'rodaTeste', assinaturaModelo: anterior.assinaturaModelo, itens: [] };
    const diff = compararRevisoes(anterior, atual, critica);
    expect(diff.modeloMudou).toBe(true);
    expect(diff.caixas.alteradas.map((item) => item.chave)).toEqual(['aro']);
    expect(diff.contagens).toContainEqual({ campo: 'faces', anterior: 12, atual: 20 });
    expect(diff.portas.removidas).toEqual(['eixo']);
    expect(diff.portas.adicionadas).toEqual(['eixoNovo']);
    expect(diff.relacoes.alteradas).toHaveLength(1);
    expect(diff.criticaAnterior.obsoleta).toBe(true);
    expect(marcarCriticaObsoleta(critica, anterior.assinaturaModelo).obsoleta).toBe(false);
  });

  it('trocar apenas o rótulo altera a mesma porta, sem removê-la ou recriá-la', () => {
    const anterior = revisao({ porta: 'baseDoEixo', rotulo: 'Base do eixo' });
    const atual = revisao({ porta: 'baseDoEixo', rotulo: 'Base inferior do eixo' });
    const diff = compararRevisoes(anterior, atual);
    expect(diff.portas.adicionadas).toEqual([]);
    expect(diff.portas.removidas).toEqual([]);
    expect(diff.portas.alteradas).toHaveLength(1);
    expect(diff.portas.alteradas[0].chave).toBe('baseDoEixo');
  });
});
