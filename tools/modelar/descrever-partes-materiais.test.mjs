/* descrever-partes-materiais.test.mjs — a revisão persiste os campos novos do material (verniz, transmissão, relevo e os demais) e
   as revisões já gravadas seguem iguais: campo novo ausente não gera diferença. */
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../procedural/nucleo/entrada.js';
import { descreverPeca } from '../../src/autoria/descrever-partes.js';
import { CAMPOS_DA_APARENCIA } from '../../src/autoria/material-da-receita.js';
import { compararRevisoes, construirRevisao, rotaCanonica } from '../modelagem/revisao-modelagem.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OITO_DE_ANTES = ['cor', 'emissivo', 'aspereza', 'metalicidade', 'semLuz', 'contorno', 'mistura', 'opacidade'];

const comMaterial = (declaracao) => nucleo([
  ['cubo', { origemId: 1, lado: 1 }],
  ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }],
  ['material', { sel: { origem: { op: 'cubo', id: 1 } }, usa: 'm' }],
], {}, {}, { m: declaracao }, null, []);

const vistas = ['isometrica', 'frontal', 'direita', 'superior'].map((nome) => ({
  nome,
  rota: rotaCanonica('material-fixture', nome),
  enquadramento: { valida: true, area: 0.5, largura: 0.8, altura: 0.8, cortado: false },
}));
const revisao = (declaracao) => construirRevisao({ peca: 'material-fixture', descricao: descreverPeca(comMaterial(declaracao)), vistas });

function arquivosJs(pasta) {
  const achados = [];
  for (const e of readdirSync(pasta, { withFileTypes: true })) {
    const c = join(pasta, e.name);
    if (e.isDirectory()) achados.push(...arquivosJs(c));
    else if (e.name.endsWith('.js') && !e.name.endsWith('.test.js')) achados.push(c);
  }
  return achados.sort();
}

describe('a revisão e o material', () => {
  it('persiste os oito de antes e os sete novos, nessa ordem', () => {
    expect(CAMPOS_DA_APARENCIA.slice(0, 8)).toEqual(OITO_DE_ANTES);
    expect(CAMPOS_DA_APARENCIA).toHaveLength(15);
  });

  it('as declarações do acervo persistem exatamente os oito de antes, sem campo novo', async () => {
    const vistos = new Map();
    for (const raiz of ['procedural/pecas', 'tools/fixtures/acervo']) {
      for (const arquivo of arquivosJs(join(REPO, raiz))) {
        if (arquivo.includes('/rodadas/')) continue;
        const modulo = await import(pathToFileURL(arquivo).href);
        const materiais = modulo.MATERIAIS ?? modulo.default?.MATERIAIS;
        if (!materiais || typeof materiais !== 'object') continue;
        for (const declaracao of Object.values(materiais)) {
          if (CAMPOS_DA_APARENCIA.slice(8).some((campo) => Object.hasOwn(declaracao, campo))) continue;
          vistos.set(JSON.stringify(declaracao), declaracao);
        }
      }
    }
    expect(vistos.size).toBeGreaterThan(40);
    for (const declaracao of vistos.values()) {
      const esperado = {};
      for (const campo of OITO_DE_ANTES) if (Object.hasOwn(declaracao, campo)) esperado[campo] = declaracao[campo];
      expect(descreverPeca(comMaterial(declaracao)).aparencia.materiais[0].propriedades, JSON.stringify(declaracao)).toEqual(esperado);
    }
  }, 120000);

  it('persiste cada campo novo declarado, e o relevo completo com os padrões do tipo', () => {
    const declaracao = {
      cor: '#223344', verniz: 0.8, asperezaDoVerniz: 0.1, transmissao: 0.5, indiceDeRefracao: 1.45, tomDoVidro: '#a8cdbd', flocos: 0.3,
      relevo: { tipo: 'granulado' },
    };
    expect(descreverPeca(comMaterial(declaracao)).aparencia.materiais[0].propriedades).toEqual({
      ...declaracao, relevo: { tipo: 'granulado', escala: 0.4, intensidade: 0.35, projecao: 'caixa', eixo: 'y' },
    });
  });

  it('declarar só o tipo do relevo e declarar os padrões por extenso é a mesma revisão', () => {
    const a = revisao({ cor: '#223344', relevo: { tipo: 'granulado' } });
    const b = revisao({ cor: '#223344', relevo: { tipo: 'granulado', escala: 0.4, intensidade: 0.35, projecao: 'caixa', eixo: 'y' } });
    expect(a.assinaturaModelo).toBe(b.assinaturaModelo);
  });

  it('a troca de verniz e a troca de relevo aparecem como alteração rastreável', () => {
    const base = { cor: '#223344', verniz: 1, relevo: { tipo: 'prismas', escala: 6, intensidade: 0.5 } };
    const anterior = revisao(base);
    const semVerniz = revisao({ ...base, verniz: 0 });
    const outroRelevo = revisao({ ...base, relevo: { tipo: 'prismas', escala: 6, intensidade: 0.9 } });
    expect(semVerniz.assinaturaModelo).not.toBe(anterior.assinaturaModelo);
    expect(outroRelevo.assinaturaModelo).not.toBe(anterior.assinaturaModelo);
    const diff = compararRevisoes(anterior, semVerniz);
    expect(diff.modeloMudou).toBe(true);
    expect(diff.aparencia.materiais.alteradas).toHaveLength(1);
    expect(diff.aparencia.materiais.alteradas[0].anterior.propriedades.verniz).toBe(1);
    expect(diff.aparencia.materiais.alteradas[0].atual.propriedades.verniz).toBe(0);
    expect(compararRevisoes(anterior, outroRelevo).aparencia.materiais.alteradas).toHaveLength(1);
  });

  it('campo ausente não gera diferença: a revisão sem campo novo é a de sempre', () => {
    const velho = revisao({ cor: '#223344', aspereza: 0.4 });
    const igual = revisao({ cor: '#223344', aspereza: 0.4 });
    expect(compararRevisoes(velho, igual).modeloMudou).toBe(false);
    expect(velho.assinaturaModelo).toBe(igual.assinaturaModelo);
  });
});
