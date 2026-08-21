/* Materializa um despacho visual mínimo. Não é sandbox de modelo: prova os
   bytes entregues, e deixa explícito que isolamento do processo é outra camada. */
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { verificarPreparacaoVisualRegionalNoDisco } from './aceite-visual-regional.mjs';

function falhar(texto) { throw new Error(`despachar-consulta-visual: ${texto}`); }
function arquivoDaEvidencia(evidencia, raiz) {
  const candidato = resolve(raiz, evidencia.localizador.slice('repo://'.length));
  if (!candidato.startsWith(`${raiz}/`) || !existsSync(candidato) || !lstatSync(candidato).isFile()) falhar(`evidência ausente: ${evidencia.localizador}.`);
  const real = realpathSync(candidato); if (!real.startsWith(`${raiz}/`)) falhar(`symlink fora da raiz: ${evidencia.localizador}.`);
  return real;
}

/** Copia unicamente as evidências declaradas para um papel e região. */
export function despacharConsultaVisual({ aceite, opcoes, papel, regiao, raizRepositorio, destino } = {}) {
  if (!raizRepositorio || !destino) falhar('raizRepositorio e destino são obrigatórios.');
  const raiz = realpathSync(raizRepositorio);
  const valido = verificarPreparacaoVisualRegionalNoDisco(aceite, opcoes, { raizRepositorio: raiz });
  const consulta = valido.consultas.find((c) => c.papel === papel && c.regiao === regiao);
  if (!consulta) falhar(`não existe consulta para ${papel}:${regiao}.`);
  const saida = resolve(destino);
  if (existsSync(saida)) falhar(`destino já existe: ${saida}.`);
  mkdirSync(saida, { recursive: true });
  const entregues = consulta.entradas.map((entrada) => {
    const origem = arquivoDaEvidencia(entrada.evidencia, raiz);
    const nome = `${entrada.id}${extname(basename(origem)) || '.bin'}`;
    copyFileSync(origem, join(saida, nome));
    return { id: entrada.id, classe: entrada.classe, escopo: entrada.escopo, vista: entrada.vista, arquivo: nome, sha256: entrada.evidencia.hash };
  });
  const manifesto = { formato: 'mecanifica.despacho-visual@1', papel, regiao, proposito: consulta.proposito, entradas: entregues };
  writeFileSync(join(saida, 'manifesto.json'), `${JSON.stringify(manifesto, null, 2)}\n`, { flag: 'wx' });
  return { destino: saida, manifesto };
}
