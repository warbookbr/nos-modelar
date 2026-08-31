/* exportar-step.mjs — CLI para exportação atômica e segura de receitas procedurais em formato STEP. */
import { existsSync, mkdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { exportarCad, separarCorpos, validarMalha, validarOpcoes } from '../../modulos/exportador-cad/src/index.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { importarReceita } from './importar-receita.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(AQUI, '../..');

export function conferirSemOrfaos(nome, orfaos) {
  if (!orfaos || orfaos.length === 0) return;
  const primeiro = orfaos[0];
  throw new Error(
    `exportar-step: a receita '${nome}' possui ${orfaos.length} órfão(s) e não pode ser exportada. `
    + `Primeiro: passo ${primeiro.passo}, op '${primeiro.op}', ${primeiro.ref} — ${primeiro.motivo}`,
  );
}

export function resolverEscalaPadrao(unidade, escalaInformada) {
  if (escalaInformada !== undefined && Number.isFinite(escalaInformada) && escalaInformada > 0) {
    return escalaInformada;
  }
  if (unidade === 'cm') return 100;
  if (unidade === 'm') return 1;
  return 1000;
}

export function parseArgs(args = process.argv.slice(2)) {
  const opcoes = {
    arquivo: null,
    saida: null,
    unidade: 'mm',
    tolerancia: 0.001,
    escala: null,
    sobrescrever: false,
    diagnosticoJson: false,
    somenteValidar: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--arquivo=')) {
      opcoes.arquivo = arg.slice('--arquivo='.length).trim();
    } else if (arg.startsWith('--saida=')) {
      opcoes.saida = arg.slice('--saida='.length).trim();
    } else if (arg.startsWith('--unidade=')) {
      opcoes.unidade = arg.slice('--unidade='.length).trim();
    } else if (arg.startsWith('--tolerancia=')) {
      opcoes.tolerancia = parseFloat(arg.slice('--tolerancia='.length));
    } else if (arg.startsWith('--escala=')) {
      opcoes.escala = parseFloat(arg.slice('--escala='.length));
    } else if (arg === '--sobrescrever') {
      opcoes.sobrescrever = true;
    } else if (arg === '--diagnostico=json') {
      opcoes.diagnosticoJson = true;
    } else if (arg === '--somente-validar') {
      opcoes.somenteValidar = true;
    } else if (!arg.startsWith('--') && !opcoes.arquivo) {
      opcoes.arquivo = arg.trim();
    }
  }

  opcoes.escala = resolverEscalaPadrao(opcoes.unidade, opcoes.escala);
  return opcoes;
}

export async function carregarReceita(caminhoArquivo) {
  if (!caminhoArquivo) {
    throw new Error('Caminho do arquivo da receita é obrigatório. Use --arquivo=<caminho>.');
  }

  const caminhoAbsoluto = isAbsolute(caminhoArquivo)
    ? resolve(caminhoArquivo)
    : resolve(process.cwd(), caminhoArquivo);

  const rel = relative(REPO, caminhoAbsoluto);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Confinamento violado: o arquivo '${caminhoArquivo}' está fora do repositório.`);
  }

  if (!existsSync(caminhoAbsoluto)) {
    throw new Error(`Arquivo da receita não encontrado: ${caminhoAbsoluto}`);
  }

  const mod = await importarReceita(caminhoAbsoluto);
  const receita = mod.PASSOS || mod.CHAMADAS_COMPOSICOES
    ? mod
    : (mod.default?.PASSOS || mod.default?.CHAMADAS_COMPOSICOES
        ? mod.default
        : Object.values(mod).find((v) => v && (Array.isArray(v.PASSOS) || Array.isArray(v.CHAMADAS_COMPOSICOES))));

  if (!receita) {
    throw new Error(`O módulo '${caminhoArquivo}' não exporta PASSOS nem CHAMADAS_COMPOSICOES.`);
  }

  const nomePadrao = basename(caminhoAbsoluto, extname(caminhoAbsoluto));
  const nome = (typeof receita.meta?.nome === 'string' && receita.meta.nome.trim().length > 0)
    ? receita.meta.nome.trim()
    : nomePadrao;

  return { receita, nome, caminhoAbsoluto };
}

export async function exportarArquivoStep(opcoesArg) {
  const {
    arquivo,
    saida,
    unidade = 'mm',
    tolerancia = 0.001,
    escala: escalaInformada,
    sobrescrever = false,
    diagnosticoJson = false,
    somenteValidar = false,
  } = opcoesArg;

  const escala = resolverEscalaPadrao(unidade, escalaInformada);

  const { receita, nome } = await carregarReceita(arquivo);
  const { neutro } = executarReceita(receita);
  conferirSemOrfaos(nome, neutro.orfaos);

  const nomeNormalizado = nome.replace(/[^a-zA-Z0-9_-]/g, '_');
  const normalizadas = validarOpcoes({
    nome: nomeNormalizado,
    formato: 'step',
    estrategia: 'facetada',
    unidade,
    tolerancia,
    escala,
  });

  if (somenteValidar) {
    const malha = validarMalha(neutro, normalizadas);
    const corpos = separarCorpos(malha);
    const diagnostico = {
      valido: true,
      nome: nomeNormalizado,
      unidade: normalizadas.unidade,
      escala: normalizadas.escala,
      tolerancia: normalizadas.tolerancia,
      vertices: malha.vertices.size,
      facesOriginais: malha.faces.length,
      corpos: corpos.map((c) => ({ nome: c.nome, faces: c.faces.length })),
    };
    return { diagnostico, somenteValidar: true };
  }

  const resultado = await exportarCad({
    nome: nomeNormalizado,
    neutro,
    formato: 'step',
    estrategia: 'facetada',
    unidade: normalizadas.unidade,
    escala: normalizadas.escala,
    tolerancia: normalizadas.tolerancia,
  });

  const destinoFinal = saida
    ? (isAbsolute(saida) ? resolve(saida) : resolve(process.cwd(), saida))
    : resolve(REPO, 'exportacoes/cad', `${nomeNormalizado}.step`);

  if (existsSync(destinoFinal) && !sobrescrever) {
    throw new Error(`Arquivo de saída já existe: ${destinoFinal}. Use --sobrescrever para substituir.`);
  }

  const pastaDestino = dirname(destinoFinal);
  mkdirSync(pastaDestino, { recursive: true });

  const tempFile = `${destinoFinal}.tmp.${process.pid}.${Date.now()}`;
  try {
    writeFileSync(tempFile, resultado.bytes);
    const stat = statSync(tempFile);
    if (stat.size === 0) {
      throw new Error('Arquivo temporário foi gravado com 0 bytes.');
    }
    renameSync(tempFile, destinoFinal);
  } catch (err) {
    try {
      if (existsSync(tempFile)) unlinkSync(tempFile);
    } catch {}
    throw err;
  }

  return {
    arquivo: destinoFinal,
    bytesGravados: resultado.bytes.length,
    diagnostico: resultado.diagnostico,
  };
}

async function main() {
  const opcoes = parseArgs(process.argv.slice(2));

  try {
    const res = await exportarArquivoStep(opcoes);

    if (opcoes.diagnosticoJson) {
      console.log(JSON.stringify(res.diagnostico, null, 2));
      return;
    }

    if (res.somenteValidar) {
      console.log(`Validação concluída com sucesso para '${res.diagnostico.nome}'.`);
      console.log(`Vértices: ${res.diagnostico.vertices}, Faces: ${res.diagnostico.facesOriginais}, Corpos: ${res.diagnostico.corpos.length}`);
      return;
    }

    console.log(`STEP exportado com sucesso: ${res.arquivo}`);
    console.log(`Tamanho: ${res.bytesGravados} bytes`);
    console.log(`Unidade: ${res.diagnostico.unidade} (escala ${res.diagnostico.escala})`);
    console.log(`Corpos (${res.diagnostico.corpos.length}): ${res.diagnostico.corpos.map((c) => c.nome).join(', ')}`);
  } catch (err) {
    console.error(`Erro na exportação STEP: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
