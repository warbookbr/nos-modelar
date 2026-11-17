/* etapas-do-acervo.mjs — a conferência de um registro de etapas do acervo, pela impressão do aceite, que o teste da guarda e o teste de
   regressão dela usam. Só valem os aceites vigentes: o aceite anulado por uma reabertura não é cobrado, e o aceite novo depois dela
   vale no lugar. As origens listadas e contadas são só as dos eventos de migração que ainda estão vigentes, e a contagem gravada na
   migração é um máximo: reabrir e aceitar de novo, pelo caminho legítimo, só tira etapas dela. */
import { readFileSync } from 'node:fs';
import { eventosDeAceiteVigentes } from '../../../src/autoria/etapas-pela-impressao.js';
import { arquivoDoRegistro, estadoDasEtapas } from '../etapas-da-montagem.mjs';

export async function conferirEtapasDoAcervo(arquivoMontagem, { origensMaximas = null } = {}) {
  const gravado = JSON.parse(readFileSync(arquivoDoRegistro(arquivoMontagem), 'utf8'));
  if (gravado.versao !== 3) return { versaoErrada: gravado.versao ?? null, naoFixas: [], porOrigem: {}, listadas: [], excedidas: [] };
  const { leitura } = await estadoDasEtapas(arquivoMontagem);
  const vigentes = eventosDeAceiteVigentes(gravado);
  const naoFixas = leitura.etapas.filter((e) => vigentes.has(e.instancia) && e.estado !== 'fixa');
  const migrados = [...vigentes.values()].filter((e) => e.origem?.tipo === 'migração');
  const porOrigem = {};
  for (const e of migrados) porOrigem[e.origem.via] = (porOrigem[e.origem.via] ?? 0) + 1;
  const listadas = migrados.map((e) => `${e.instancia}: ${e.origem.via}${e.origem.portaNaoProvada ? ' (porta não provada)' : ''}`);
  const excedidas = origensMaximas ? Object.entries(porOrigem).filter(([via, n]) => n > (origensMaximas[via] ?? 0)).map(([via]) => via) : [];
  return { naoFixas, porOrigem, listadas, excedidas, vigentes };
}
