/* Sonda 1.0: sistema humanoide original, hierárquico e multiestado. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { auditarIntersecoesMontagem } from '../../src/autoria/auditar-intersecoes-montagem.js';
import { derivarImpactoDefinicaoMontagem } from '../../src/autoria/derivar-impacto-montagem.js';
import { descreverMontagemResolvida } from '../../src/autoria/descrever-montagem-resolvida.js';
import { validarCriticaVisual } from '../modelagem/revisao-modelagem.mjs';
import { PUBLICADAS } from '../mecanifica/exportar-peca.mjs';
import { capturarMontagem } from '../mecanifica/capturar-montagem.mjs';
import {
  REFERENCIAS_ARMADURA,
  carregarEstudoArmadura,
  carregarPecaArmadura,
} from '../../autoria-assistida/experimentos/sonda-armadura-humanoide-1-0/carregar-estudo.mjs';

const RAIZ = new URL('../../autoria-assistida/experimentos/sonda-armadura-humanoide-1-0/', import.meta.url);
const bytes = (valor) => Buffer.byteLength(JSON.stringify(valor));
const hash = (arquivo) => `sha256:${createHash('sha256').update(readFileSync(new URL(arquivo, RAIZ))).digest('hex')}`;

describe('Mecanifica 1.0 — sonda da armadura humanoide original', () => {
  let estudo;

  beforeAll(async () => { estudo = await carregarEstudoArmadura(); });

  it('mantém treze definições privadas, sem órfãos e com exportação reproduzível', async () => {
    expect(PUBLICADAS).toEqual([]);
    expect(REFERENCIAS_ARMADURA).toHaveLength(13);
    let vertices = 0;
    let faces = 0;
    let bytesExportados = 0;
    let partes = 0;
    for (const item of estudo.pecas.values()) {
      expect(item.medida).toMatchObject({ ok: true, codigo: 0, stderr: '' });
      expect(item.medida.resultado.descricao.totais).toMatchObject({ orfaos: 0, facesSemParte: 0 });
      expect(JSON.stringify(item.medida.resultado.descricao)).toContain('metalicidade');
      expect(item.medida.resultado.intencao).toMatchObject({
        funcao: expect.any(String),
        familia: expect.any(String),
        eixosLocais: { x: expect.any(String), y: expect.any(String), z: expect.any(String) },
        invariantes: expect.any(Array),
        criteriosVisuais: expect.any(Array),
      });
      expect(item.medida.resultado.descricao.intencao).toEqual(item.medida.resultado.intencao);
      vertices += item.exportacao.dado.V.length;
      faces += item.exportacao.dado.F.length;
      partes += item.exportacao.dado.partes.length;
      bytesExportados += Buffer.byteLength(item.exportacao.texto);
      const repetida = await carregarPecaArmadura(item.ref);
      expect(repetida.exportacao.texto).toBe(item.exportacao.texto);
    }
    expect({ vertices, faces, partes }).toEqual({ vertices: 1148, faces: 1196, partes: 43 });
    expect(bytesExportados).toBeLessThan(350_000);
  });

  it('resolve três níveis, reutiliza membros e mantém mãos quirais explícitas', () => {
    const contexto = descreverMontagemResolvida(estudo.estados.neutra);
    expect(contexto.totais).toEqual({
      pecas: 22, montagens: 8, relacoesDeclaradas: 0, satisfeitas: 0, reprovadas: 0,
    });
    expect(Math.max(...contexto.instancias.map(({ caminho }) => caminho.length))).toBe(3);
    expect(contexto.instancias.filter(({ alvo }) => alvo.tipo === 'montagem' && alvo.ref === 'perna'))
      .toHaveLength(2);
    const maos = contexto.instancias.filter(({ caminho }) => caminho.at(-1) === 'mao');
    expect(maos.map(({ alvo }) => alvo.ref).sort()).toEqual(['mao-direita', 'mao-esquerda']);
    expect(estudo.pecas.get('mao-direita').exportacao.texto)
      .not.toBe(estudo.pecas.get('mao-esquerda').exportacao.texto);
  });

  it('deriva a pose articulada só por alterações semânticas e audita os dois estados', () => {
    expect(estudo.diferencas.raiz.estruturais).toEqual([]);
    expect(estudo.diferencas.bracoDireito.estruturais).toEqual([]);
    expect(estudo.diferencas.pernaDireita.estruturais).toEqual([]);
    expect(estudo.diferencas.raiz.alteracoes.map(({ campo }) => campo).sort()).toEqual([
      'alvo.ref', 'alvo.ref', 'id', 'pose.rotacao', 'pose.rotacao',
    ]);
    expect(estudo.diferencas.bracoDireito.alteracoes.map(({ campo }) => campo).sort())
      .toEqual(['id', 'pose.rotacao']);
    expect(estudo.diferencas.pernaDireita.alteracoes.map(({ campo }) => campo).sort())
      .toEqual(['id', 'pose.rotacao']);

    for (const [estado, montagem] of Object.entries(estudo.estados)) {
      const auditoria = auditarIntersecoesMontagem(montagem);
      expect(auditoria.cobertura).toEqual({
        paresTotais: 231, paresNoEscopo: 231, paresVerificados: 231,
        inconclusivos: 0, completa: true,
      });
      const interpenetracoes = auditoria.pares.filter(({ estado }) => estado === 'interpenetram');
      expect(interpenetracoes).toHaveLength(estado === 'neutra' ? 15 : 16);
      expect(interpenetracoes.every(({ expectativa }) => expectativa?.id && expectativa?.motivo)).toBe(true);
    }
  });

  it('reduz contexto e pares por membro e encontra quatro consumidores da junta', () => {
    const global = descreverMontagemResolvida(estudo.estados.neutra);
    const braco = descreverMontagemResolvida(estudo.estados.neutra, { caminho: ['braco-direito'] });
    expect(bytes(braco)).toBeLessThan(bytes(global) / 2);
    expect(braco.consulta.instanciasOmitidas).toBeGreaterThan(20);
    const interna = auditarIntersecoesMontagem(estudo.estados.neutra, {
      caminho: ['braco-direito'], modoFoco: 'interno',
    });
    expect(interna.cobertura).toEqual({
      paresTotais: 231, paresNoEscopo: 10, paresVerificados: 10,
      inconclusivos: 0, completa: false,
    });
    expect(interna.escopo.paresOmitidosPorFoco).toBe(221);

    const impacto = derivarImpactoDefinicaoMontagem(estudo.estados.neutra, {
      tipo: 'peca', ref: 'junta-articulada',
    });
    expect(impacto.consumidoresDefinicao.map(({ caminho }) => caminho)).toEqual([
      ['braco-direito', 'cotovelo'], ['braco-esquerdo', 'cotovelo'],
      ['perna-direita', 'joelho'], ['perna-esquerda', 'joelho'],
    ]);
    expect(impacto.montagensARevalidar.map(({ caminho }) => caminho)).toEqual([
      [], ['braco-direito'], ['braco-esquerdo'], ['perna-direita'], ['perna-esquerda'],
    ]);
  });

  it('reexecuta três achados e não encerra os que a segunda imagem ainda expõe', () => {
    const antes = validarCriticaVisual(JSON.parse(readFileSync(new URL('critica-visual-antes.json', RAIZ))));
    const depois = validarCriticaVisual(JSON.parse(readFileSync(new URL('critica-visual-depois.json', RAIZ))));
    expect(antes.achados).toHaveLength(3);
    expect(antes.achados.every(({ estado, decisao }) => estado === 'aberto' && decisao === 'corrigir')).toBe(true);
    const proporcao = depois.achados.find(({ observacao }) => observacao.startsWith('O tórax largo'));
    const lacunas = depois.achados.find(({ observacao }) => observacao.startsWith('Os espaços entre'));
    const pose = depois.achados.find(({ observacao }) => observacao.startsWith('A flexão isolada'));
    expect(proporcao).toMatchObject({ estado: 'resolvido', decisao: 'aceitar' });
    expect(lacunas).toMatchObject({ estado: 'adiado', decisao: 'adiar' });
    expect(pose).toMatchObject({ estado: 'aberto', decisao: 'investigar' });
    expect(depois.achados.every(({ vinculo }) => vinculo.antes && vinculo.depois)).toBe(true);
    expect(hash('evidencias/antes/neutra-conjunto-frontal.png'))
      .toBe('sha256:2a3a607d30f8ee24391e5082d3b35e454a2dd6035b26abb67941f5f2443b9346');
    expect(hash('evidencias/neutra-conjunto-frontal.png'))
      .toBe('sha256:5790bdb60e243781fab4b80df6464e75bc13b6fbe337b85c307034e7c3c0a2fc');
  });

  it('produz dezesseis vistas globais e isoladas válidas', async () => {
    const alvos = [
      { estado: 'neutra', caminho: [], vistas: ['isometrica', 'frontal', 'traseira', 'direita'], instancias: 22 },
      { estado: 'articulada', caminho: [], vistas: ['isometrica', 'frontal', 'traseira', 'direita'], instancias: 22 },
      { estado: 'neutra', caminho: ['capacete'], vistas: ['isometrica', 'frontal'], instancias: 1 },
      { estado: 'neutra', caminho: ['torax'], vistas: ['isometrica', 'traseira'], instancias: 1 },
      { estado: 'articulada', caminho: ['braco-direito'], vistas: ['isometrica', 'direita'], instancias: 5 },
      { estado: 'articulada', caminho: ['perna-direita'], vistas: ['isometrica', 'direita'], instancias: 4 },
    ];
    let total = 0;
    for (const alvo of alvos) {
      const captura = await capturarMontagem({
        montagem: estudo.estados[alvo.estado], caminho: alvo.caminho, vistas: alvo.vistas, espera: 0,
      });
      expect(captura.ok).toBe(true);
      for (const vista of captura.resultado.capturas) {
        expect(vista.dados.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
        expect(vista.enquadramento).toMatchObject({ valida: true, cortado: false });
        expect(vista.instancias).toHaveLength(alvo.instancias);
      }
      expect(new Set(captura.resultado.capturas.map(({ dados }) => dados.toString('base64'))).size)
        .toBe(alvo.vistas.length);
      total += alvo.vistas.length;
    }
    expect(total).toBe(16);
  }, 90_000);
});
