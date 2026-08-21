/* Caminho único R1A: despacho mínimo, revisor limitado e crítica persistida. */
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve } from 'node:path';
import { despacharConsultaVisual } from './despachar-consulta-visual.mjs';
import { executarRevisorLimitado } from './revisor-limitado.mjs';
import { validarCriticaVisual } from './revisao-modelagem.mjs';

export function orquestrarRevisaoRegional({ aceite, opcoes, papel = 'critico-visual-independente', regiao, raizRepositorio, destino, arquivoProibido, critica, despachar = despacharConsultaVisual, executar = executarRevisorLimitado } = {}) {
  const despacho = despachar({ aceite, opcoes, papel, regiao, raizRepositorio, destino });
  const execucao = executar({ despacho: despacho.destino, arquivoProibido });
  const criticaValida = validarCriticaVisual(critica);
  const arquivoCritica = join(despacho.destino, 'critica-visual.json');
  writeFileSync(arquivoCritica, `${JSON.stringify(criticaValida, null, 2)}\n`, { flag: 'wx' });
  const hashCritica = `sha256:${createHash('sha256').update(readFileSync(arquivoCritica)).digest('hex')}`;
  const raiz = resolve(raizRepositorio);
  const localizador = relative(raiz, arquivoCritica).replaceAll('\\', '/');
  if (!localizador || localizador.startsWith('../') || localizador.includes('/../')) {
    throw new Error('orquestrar-revisao-regional: crítica precisa ficar dentro da raiz do repositório.');
  }
  const criticaAceite = {
    assinaturaModelo: aceite.assinaturaModelo,
    evidencia: { hash: hashCritica, localizador: `repo://${localizador}` },
    papel: 'critico-visual-independente',
  };
  return { despacho: despacho.manifesto, execucao, arquivoCritica, hashCritica, critica: criticaValida, aceiteComCritica: { ...aceite, critica: criticaAceite } };
}
