import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { FORMATO_ACEITE_VISUAL_REGIONAL, validarAceiteVisualRegional, verificarEvidenciasAceiteRegionalNoDisco } from './aceite-visual-regional.mjs';

const modelo = `sha256:${'a'.repeat(64)}`; const briefing = `sha256:${'b'.repeat(64)}`;
const opcoes = { assinaturaModelo: modelo, assinaturaBriefing: briefing, rejeicoesObrigatorias: ['arco'], recortesObrigatorios: ['arco-dianteiro'] };
const prova = (raiz, id) => { const texto = `${id}-bytes`; writeFileSync(join(raiz, `${id}.svg`), texto); return { hash: `sha256:${createHash('sha256').update(texto).digest('hex')}`, localizador: `repo://${id}.svg` }; };
function consulta(raiz, papel) { return { papel, proposito: papel === 'modelador' ? 'comparar' : 'revisar', regiao: 'arco-dianteiro', entradas: ['alvo', 'modelo', 'comparacao-regional'].map((classe) => ({ id: `${papel}-${classe}`, classe, escopo: 'recorte-interno', vista: 'lateral', evidencia: prova(raiz, `${papel}-${classe}`) })) }; }
function critica(raiz, aberta = false) {
  const achados = aberta ? [{ alvo: { tipo: 'peca', id: 'quarto-dianteiro' }, vista: 'frontal', severidade: 'alta', observacao: 'O arco ainda não acompanha o alvo.', decisao: 'corrigir', estado: 'aberto', vinculo: { antes: modelo, depois: null } }] : [];
  const texto = JSON.stringify({ formato: 'mecanifica.achados-critica-visual', versao: 1, achados });
  writeFileSync(join(raiz, 'critica.json'), texto);
  return { assinaturaModelo: modelo, evidencia: { hash: `sha256:${createHash('sha256').update(texto).digest('hex')}`, localizador: 'repo://critica.json' }, papel: 'critico-visual-independente' };
}
function completo(raiz, aberta = false) { const consultas = [consulta(raiz, 'modelador'), consulta(raiz, 'critico-visual-independente')]; return { formato: FORMATO_ACEITE_VISUAL_REGIONAL, versao: 2, assinaturaModelo: modelo, assinaturaBriefing: briefing, consultas, critica: critica(raiz, aberta), rejeicoes: [{ id: 'arco', resultado: 'reprova', evidencias: ['modelador-comparacao-regional', 'critico-visual-independente-comparacao-regional'] }] }; }

it('v2 vincula modelos e crítico às três imagens isoladas do recorte', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'aceite-regional-')); try { expect(verificarEvidenciasAceiteRegionalNoDisco(completo(raiz), opcoes, { raizRepositorio: raiz }).veredito.estado).toBe('reprovado'); } finally { rmSync(raiz, { recursive: true, force: true }); }
});

it('v2 recusa painel composto e recorte sem comparação interna do crítico', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'aceite-regional-')); try {
    const aceite = completo(raiz); aceite.consultas[0].entradas[0].classe = 'painel-composto';
    expect(() => validarAceiteVisualRegional(aceite, opcoes)).toThrow(/painel composto/);
    const outro = completo(raiz); outro.consultas[1].entradas.forEach((e) => { e.escopo = 'silhueta-exterior'; });
    expect(() => validarAceiteVisualRegional(outro, opcoes)).toThrow(/não recebeu comparação interna/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

it('v2 recusa crítica ausente, adulterada ou com achado aberto', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'aceite-regional-')); try {
    const semCritica = completo(raiz); delete semCritica.critica;
    expect(() => validarAceiteVisualRegional(semCritica, opcoes)).toThrow(/chaves inválidas/);
    const adulterada = completo(raiz); writeFileSync(join(raiz, 'critica.json'), 'adulterada');
    expect(() => verificarEvidenciasAceiteRegionalNoDisco(adulterada, opcoes, { raizRepositorio: raiz })).toThrow(/hash diverge/);
    const aberta = completo(raiz, true);
    expect(verificarEvidenciasAceiteRegionalNoDisco(aberta, opcoes, { raizRepositorio: raiz }).veredito.motivos).toContain('critica:achado-aberto');
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});
