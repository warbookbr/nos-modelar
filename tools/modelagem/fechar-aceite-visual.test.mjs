/* fechar-aceite-visual.test.mjs — o fechamento não concede aceite retroativo. */
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fecharAceiteVisual, verificarAceiteParaFechamento } from './fechar-aceite-visual.mjs';
import { FORMATO_ACEITE_VISUAL_REGIONAL } from './aceite-visual-regional.mjs';
import { serializarCanonico } from './formato-pacote.mjs';

const assinaturaModelo = `sha256:${'a'.repeat(64)}`; const assinaturaBriefing = `sha256:${'b'.repeat(64)}`;
const opcoesV2 = { assinaturaModelo, assinaturaBriefing, rejeicoesObrigatorias: ['arco'], recortesObrigatorios: ['arco-dianteiro'] };
const hash = (texto) => `sha256:${createHash('sha256').update(texto).digest('hex')}`;
function evidencia(raiz, id) { const texto = `${id}-bytes`; writeFileSync(join(raiz, `${id}.svg`), texto); return { hash: hash(texto), localizador: `repo://${id}.svg` }; }
function consulta(raiz, papel) { return { papel, proposito: papel === 'modelador' ? 'comparar' : 'revisar', regiao: 'arco-dianteiro', entradas: ['alvo', 'modelo', 'comparacao-regional'].map((classe) => ({ id: `${papel}-${classe}`, classe, escopo: 'recorte-interno', vista: 'lateral', evidencia: evidencia(raiz, `${papel}-${classe}`) })) }; }
function assinatura(arquivo) { return `sha256:${createHash('sha256').update(readFileSync(arquivo)).digest('hex')}`; }
function critica(raiz, modelo) { const texto = JSON.stringify({ formato: 'mecanifica.achados-critica-visual', versao: 1, achados: [] }); writeFileSync(join(raiz, 'critica.json'), texto); return { assinaturaModelo: modelo, evidencia: { hash: hash(texto), localizador: 'repo://critica.json' }, papel: 'critico-visual-independente' }; }

function fixtureCompletaV2() {
  const raiz = mkdtempSync(join(tmpdir(), 'fechar-v2-completo-')); const repositorio = join(raiz, 'repo'); const pacotes = join(raiz, 'pacotes'); const id = 'fechamento-v2'; const pacote = join(pacotes, id);
  mkdirSync(join(pacote, 'revisoes', 'r001'), { recursive: true }); mkdirSync(join(repositorio, 'evidencias'), { recursive: true });
  const briefing = {
    aceiteVisual: { rejeicoes: ['arco'] }, aceiteVisualRegional: { recortes: ['arco-dianteiro'] },
    alvo: { caminho: 'prototipos/procedural/v3/pecas/_caixote-filetado.js', modo: 'criacao', peca: '_caixote-filetado' },
    checklist: [{ criterio: 'O arco acompanha o alvo regional.', estado: 'aberto', id: 'arco', prioridade: 1 }],
    formato: 'mecanifica.pacote-modelagem', guias: ['forma/silhueta-e-transicoes'], id,
    objetivo: 'Prova positiva do fechamento visual regional.', partesEsperadas: ['caixote'],
    perfil: { distanciaMinima: 0.5, fidelidade: 'F2', interacao: 'montagem', orcamento: { faces: 2000 }, origem: 'declarado', precisao: 'dimensional', visual: 'tecnicoDidatico' },
    provas: ['descricao-headless'], versao: 1,
  };
  writeFileSync(join(pacote, 'briefing.json'), serializarCanonico(briefing));
  writeFileSync(join(pacote, 'referencias.json'), readFileSync('autoria-assistida/pacotes/prova-caixote/referencias.json'));
  writeFileSync(join(pacote, 'revisoes', 'r001', 'revisao.json'), readFileSync('autoria-assistida/pacotes/prova-caixote/revisoes/r003/revisao.json'));
  const modelo = JSON.parse(readFileSync(join(pacote, 'revisoes', 'r001', 'revisao.json'))).assinaturaModelo;
  const provaRegional = (papel, classe) => {
    const nome = `${papel}-${classe}.svg`; const conteudo = `${nome}-bytes`; writeFileSync(join(repositorio, 'evidencias', nome), conteudo);
    return { id: `${papel}-${classe}`, classe, escopo: 'recorte-interno', vista: 'lateral', evidencia: { hash: hash(conteudo), localizador: `repo://evidencias/${nome}` } };
  };
  const consultas = ['modelador', 'critico-visual-independente'].map((papel) => ({ papel, proposito: papel === 'modelador' ? 'comparar' : 'revisar', regiao: 'arco-dianteiro', entradas: ['alvo', 'modelo', 'comparacao-regional'].map((classe) => provaRegional(papel, classe)) }));
  const textoCritica = JSON.stringify({ formato: 'mecanifica.achados-critica-visual', versao: 1, achados: [] }); writeFileSync(join(repositorio, 'critica.json'), textoCritica);
  const aceite = { formato: FORMATO_ACEITE_VISUAL_REGIONAL, versao: 2, assinaturaModelo: modelo, assinaturaBriefing: assinatura(join(pacote, 'briefing.json')), consultas, critica: { assinaturaModelo: modelo, evidencia: { hash: hash(textoCritica), localizador: 'repo://critica.json' }, papel: 'critico-visual-independente' }, rejeicoes: [{ id: 'arco', resultado: 'passa', evidencias: ['modelador-comparacao-regional', 'critico-visual-independente-comparacao-regional'] }] };
  writeFileSync(join(pacote, 'aceite-v2.json'), `${JSON.stringify(aceite, null, 2)}\n`);
  return { raiz, repositorio, pacotes, id };
}

describe('fechamento privado de aceite visual', () => {
  it('recusa pacote legado sem uma régua visual já assinada no briefing', async () => {
    await expect(fecharAceiteVisual({
      id: 'prova-caixote', revisao: 'r003', arquivoAceite: 'aceite.json',
    })).rejects.toThrow(/não declarou briefing.aceiteVisual/);
  });

  it('reconhece a v2 regional e mantém sua reprovação como bloqueio', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'fechar-v2-')); try {
      const aceite = { formato: FORMATO_ACEITE_VISUAL_REGIONAL, versao: 2, assinaturaModelo, assinaturaBriefing, consultas: [consulta(raiz, 'modelador'), consulta(raiz, 'critico-visual-independente')], critica: critica(raiz, assinaturaModelo), rejeicoes: [{ id: 'arco', resultado: 'reprova', evidencias: ['critico-visual-independente-comparacao-regional'] }] };
      expect(verificarAceiteParaFechamento(aceite, opcoesV2, { raizRepositorio: raiz }).veredito).toEqual({ estado: 'reprovado', motivos: ['rejeicao:arco'] });
    } finally { rmSync(raiz, { recursive: true, force: true }); }
  });

  it('fecha uma prova v2 completa com briefing, revisão e evidências regionais', async () => {
    const fixture = fixtureCompletaV2(); try {
      const fechado = await fecharAceiteVisual({ id: fixture.id, revisao: 'r001', arquivoAceite: 'aceite-v2.json', raizPacotes: fixture.pacotes, raizRepositorio: fixture.repositorio });
      expect(fechado.resultado.veredito).toEqual({ estado: 'aprovavel', motivos: [] });
      expect(fechado.destino.endsWith('aceites/r001/aceite-tecnico.json')).toBe(true);
    } finally { rmSync(fixture.raiz, { recursive: true, force: true }); }
  });
});
