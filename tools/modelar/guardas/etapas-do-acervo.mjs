/* etapas-do-acervo.mjs — a conferência de um registro de etapas do acervo, pela impressão do aceite, que o teste da guarda e o teste de
   regressão dela usam. Só valem os aceites vigentes: o aceite anulado por uma reabertura não é cobrado, e o aceite novo depois dela
   vale no lugar. As origens listadas e contadas são só as dos eventos de migração que ainda estão vigentes, e a contagem gravada na
   migração é um máximo: reabrir e aceitar de novo, pelo caminho legítimo, só tira etapas dela. */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eventosDeAceiteVigentes } from '../../../src/autoria/etapas-pela-impressao.js';
import { arquivoDoRegistro, estadoDasEtapas } from '../etapas-da-montagem.mjs';
import { REPO } from '../resolver-caminho-receita.mjs';

/* A LISTA TRAVADA DOS EVENTOS MIGRADOS. A migração gravou os aceites do acervo com a impressão reconstruída, e um evento migrado
   forjado (a impressão trocada pela de agora com a origem mantida, ou o evento apagado e um aceite novo no lugar, sem reabertura)
   passaria na leitura. A referência guarda, por objeto e instância, o hash do aceite, da impressão e da origem de cada evento migrado;
   a guarda reprova o evento migrado que não está nela e o que sumiu do registro. Reabrir e aceitar de novo, pelo caminho legítimo,
   acrescenta eventos e não toca nos migrados, que seguem no registro (anulados pela reabertura). Quem muda a migração regera o arquivo:
   `node tools/modelar/guardas/etapas-do-acervo.mjs --gerar`. */
export const ARQUIVO_DAS_MIGRADAS = join(dirname(fileURLToPath(import.meta.url)), 'etapas-do-acervo.migradas.json');

const ordenado = (v) => (Array.isArray(v) ? v.map(ordenado) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordenado(v[k])])) : v);
const hash = (v) => `sha256:${createHash('sha256').update(JSON.stringify(ordenado(v))).digest('hex')}`;
export const hashesDoEvento = (evento) => ({ aceite: hash(evento.aceite), impressao: hash(evento.impressao), origem: hash(evento.origem) });

export function lerReferenciaDasMigradas(arquivo = ARQUIVO_DAS_MIGRADAS) {
  return existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, 'utf8')) : {};
}

/* A referência de um registro v3: os eventos de migração, por instância. */
export function referenciaDoRegistro(registro) {
  return Object.fromEntries((registro.eventos ?? []).filter((e) => e.tipo === 'aceite' && e.origem?.tipo === 'migração').map((e) => [e.instancia, hashesDoEvento(e)]));
}

export async function conferirEtapasDoAcervo(arquivoMontagem, { origensMaximas = null, migradas = null } = {}) {
  const gravado = JSON.parse(readFileSync(arquivoDoRegistro(arquivoMontagem), 'utf8'));
  if (gravado.versao !== 3) return { versaoErrada: gravado.versao ?? null, naoFixas: [], porOrigem: {}, listadas: [], excedidas: [], forjados: [], sumidos: [], orfaos: [] };
  const { leitura } = await estadoDasEtapas(arquivoMontagem);
  const vigentes = eventosDeAceiteVigentes(gravado);
  const naoFixas = leitura.etapas.filter((e) => vigentes.has(e.instancia) && e.estado !== 'fixa');
  const migrados = [...vigentes.values()].filter((e) => e.origem?.tipo === 'migração');
  const porOrigem = {};
  for (const e of migrados) porOrigem[e.origem.via] = (porOrigem[e.origem.via] ?? 0) + 1;
  const listadas = migrados.map((e) => `${e.instancia}: ${e.origem.via}${e.origem.portaNaoProvada ? ' (porta não provada)' : ''}`);
  const excedidas = origensMaximas ? Object.entries(porOrigem).filter(([via, n]) => n > (origensMaximas[via] ?? 0)).map(([via]) => via) : [];
  /* o aceite vigente de uma instância que a montagem já não tem não é cobrado por ninguém: reprova */
  const orfaos = (leitura.orfaos ?? []).filter((id) => vigentes.has(id));
  /* os eventos migrados, contra a lista travada: o que não está nela foi forjado, e o que sumiu do registro foi apagado */
  const forjados = [];
  const sumidos = [];
  if (migradas) {
    for (const e of (gravado.eventos ?? []).filter((x) => x.tipo === 'aceite' && x.origem?.tipo === 'migração')) {
      const esperado = migradas[e.instancia];
      const h = hashesDoEvento(e);
      if (!esperado || esperado.aceite !== h.aceite || esperado.impressao !== h.impressao || esperado.origem !== h.origem) forjados.push(e.instancia);
    }
    for (const [instancia, esperado] of Object.entries(migradas)) {
      const indice = (gravado.eventos ?? []).findIndex((e) => e.instancia === instancia && e.tipo === 'aceite' && e.origem?.tipo === 'migração' && hashesDoEvento(e).impressao === esperado.impressao);
      if (indice < 0) sumidos.push(instancia);
    }
  }
  return { naoFixas, porOrigem, listadas, excedidas, forjados, sumidos, orfaos, vigentes };
}

/* Regera a referência dos eventos migrados a partir dos registros do acervo (só quando a migração mudou de propósito). */
export function gerarReferenciaDasMigradas() {
  const acervo = join(REPO, 'procedural/pecas');
  const saida = {};
  for (const objeto of readdirSync(acervo).sort()) {
    const arquivo = join(acervo, objeto, 'montagem.etapas.json');
    if (!existsSync(arquivo)) continue;
    const referencia = referenciaDoRegistro(JSON.parse(readFileSync(arquivo, 'utf8')));
    if (Object.keys(referencia).length) saida[objeto] = referencia;
  }
  writeFileSync(ARQUIVO_DAS_MIGRADAS, `${JSON.stringify(saida, null, 2)}\n`);
  return saida;
}

if (process.argv[1] && process.argv[1].endsWith('etapas-do-acervo.mjs') && process.argv.includes('--gerar')) {
  const r = gerarReferenciaDasMigradas();
  console.log(`referência dos eventos migrados regerada: ${Object.entries(r).map(([o, e]) => `${o} ${Object.keys(e).length}`).join(', ')}.`);
}
