/* aceite-visual.test.mjs — corpus de vínculo, bytes e reprovações visuais. */
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORMATO_ACEITE_VISUAL, VERSAO_ACEITE_VISUAL, validarAceiteVisual, verificarEvidenciasAceiteNoDisco } from './aceite-visual.mjs';

const assinaturaModelo = `sha256:${'a'.repeat(64)}`;
const assinaturaBriefing = `sha256:${'b'.repeat(64)}`;
const rejeicoes = ['corpo-capsula', 'ombro-ilegivel', 'farol-invisivel'];
const opcoes = { assinaturaModelo, assinaturaBriefing, rejeicoesObrigatorias: rejeicoes };
const hash = (texto) => `sha256:${createHash('sha256').update(texto).digest('hex')}`;
function gravar(raiz, nome, conteudo) { writeFileSync(join(raiz, nome), conteudo); return { hash: hash(conteudo), localizador: `repo://${nome}` }; }
function critica(aberta = false) {
  return JSON.stringify({ formato: 'mecanifica.achados-critica-visual', versao: 1, achados: aberta ? [{ alvo: { tipo: 'peca', id: 'quarto-dianteiro' }, vista: 'frontal', severidade: 'alta', observacao: 'A linha de ombro não se lê na vista frontal da superfície.', decisao: 'corrigir', estado: 'aberto', vinculo: { antes: assinaturaModelo, depois: null } }] : [] });
}
function completo(raiz, { resultados = ['passa', 'passa', 'passa'], aberta = false } = {}) {
  const alvo = gravar(raiz, 'alvo.svg', 'alvo'); const sobreposicao = gravar(raiz, 'sobreposicao.svg', 'sobreposicao');
  const vistas = ['isometrica', 'frontal', 'direita', 'superior'].map((nome) => ({ nome, evidencia: gravar(raiz, `${nome}.png`, nome) }));
  return { formato: FORMATO_ACEITE_VISUAL, versao: VERSAO_ACEITE_VISUAL, assinaturaModelo, assinaturaBriefing, alvo, sobreposicao, vistas, rejeicoes: rejeicoes.map((id, i) => ({ id, resultado: resultados[i], evidencias: ['sobreposicao', 'frontal'] })), critica: { assinaturaModelo, evidencia: gravar(raiz, 'critica.json', critica(aberta)), papel: 'critico-visual-independente' } };
}
describe('aceite visual vinculante', () => {
  it('deriva aprovável somente do pacote completo e da mesma revisão', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'aceite-')); try { expect(verificarEvidenciasAceiteNoDisco(completo(raiz), opcoes, { raizRepositorio: raiz }).veredito).toEqual({ estado: 'aprovavel', motivos: [] }); } finally { rmSync(raiz, { recursive: true, force: true }); }
  });
  it.each([
    ['uma vista', (v) => v.vistas.pop()], ['uma rejeição P2', (v) => v.rejeicoes.pop()], ['assinatura do briefing', (v) => { v.assinaturaBriefing = `sha256:${'c'.repeat(64)}`; }],
  ])('recusa pacote sem %s', (_n, mutar) => { const raiz = mkdtempSync(join(tmpdir(), 'aceite-')); try { const v = completo(raiz); mutar(v); expect(() => validarAceiteVisual(v, opcoes)).toThrow(); } finally { rmSync(raiz, { recursive: true, force: true }); } });
  it('deriva reprovação, detecta hash adulterado e não ignora achado aberto', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'aceite-')); try {
      expect(validarAceiteVisual(completo(raiz, { resultados: ['reprova', 'passa', 'passa'] }), opcoes).veredito.motivos).toEqual(['rejeicao:corpo-capsula']);
      const adulterado = completo(raiz); adulterado.vistas[0].evidencia.hash = `sha256:${'0'.repeat(64)}`;
      expect(() => verificarEvidenciasAceiteNoDisco(adulterado, opcoes, { raizRepositorio: raiz })).toThrow(/hash diverge/);
      expect(verificarEvidenciasAceiteNoDisco(completo(raiz, { aberta: true }), opcoes, { raizRepositorio: raiz }).veredito.motivos).toContain('critica:achado-aberto');
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });
});
