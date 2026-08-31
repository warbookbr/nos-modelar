/* exportar-obj.mjs — CLI para exportação atômica e segura de receitas procedurais em Wavefront OBJ (.obj). */
import { existsSync, mkdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { exportarObj, resolverEscalaPadrao, validarMalhaObj, validarOpcoes } from '../../modulos/exportador-obj/src/index.js';
import { separarCorpos } from '../../modulos/exportador-cad/src/separar-corpos.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { importarReceita } from './importar-receita.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(AQUI, '../..');

export function conferirSemOrfaos(nome, orfaos) {
  if (!orfaos || orfaos.length === 0) return;
  const primeiro = orfaos[0];
  throw new Error(
    `exportar-obj: a receita '${nome}' possui ${orfaos.length} órfão(s) e não pode ser exportada. `
    + `Primeiro: passo ${primeiro.passo}, op '${primeiro.op}', ${primeiro.ref} — ${primeiro.motivo}`,
  );
}

export function parseArgs(args = process.argv.slice(2)) {
  const opcoes = {
    arquivo: null,
    saida: null,
    unidade: 'm',
    tolerancia: 0.001,
    escala: null,
    sobrescrever: false,
    diagnosticoJson: false,
    somenteValidar: false,
    exigirFechado: false,
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
    } else if (arg === '--exigir-fechado') {
      opcoes.exigirFechado = true;
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

export async function exportarArquivoObj(opcoesArg) {
  const {
    arquivo,
    saida,
    unidade = 'm',
    tolerancia = 0.001,
    escala: escalaInformada,
    sobrescrever = false,
    diagnosticoJson = false,
    somenteValidar = false,
    exigirFechado = false,
  } = opcoesArg;

  const escala = resolverEscalaPadrao(unidade, escalaInformada);
  const { receita, nome } = await carregarReceita(arquivo);
  const { neutro } = executarReceita(receita);
  conferirSemOrfaos(nome, neutro.orfaos);

  const nomeNormalizado = nome.replace(/[^a-zA-Z0-9_-]/g, '_');
  const normalizadas = validarOpcoes({
    nome: nomeNormalizado,
    unidade,
    tolerancia,
    escala,
    exigirFechado,
  });

  if (somenteValidar) {
    const malha = validarMalhaObj(neutro, normalizadas);
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

  const resultado = await exportarObj({
    nome: nomeNormalizado,
    neutro,
    unidade: normalizadas.unidade,
    tolerancia: normalizadas.tolerancia,
    escala: normalizadas.escala,
    exigirFechado: normalizadas.exigirFechado,
  });

  const caminhoSaida = saida
    ? (isAbsolute(saida) ? resolve(saida) : resolve(process.cwd(), saida))
    : resolve(REPO, 'exportacoes/obj', `${nomeNormalizado}.obj`);

  if (existsSync(caminhoSaida) && !sobrescrever) {
    throw new Error(`Arquivo de destino já existe: ${caminhoSaida}. Use --sobrescrever para substituir.`);
  }

  const pastaDestino = dirname(caminhoSaida);
  mkdirSync(pastaDestino, { recursive: true });

  const tempPath = `${caminhoSaida}.tmp.${Date.now()}`;
  try {
    writeFileSync(tempPath, resultado.bytes);
    renameSync(tempPath, caminhoSaida);
  } catch (err) {
    if (existsSync(tempPath)) unlinkSync(tempPath);
    throw err;
  }

  const stat = statSync(caminhoSaida);
  return {
    caminhoSaida,
    caminhoRelativo: relative(REPO, caminhoSaida),
    tamanhoBytes: stat.size,
    diagnostico: resultado.diagnostico,
    diagnosticoJson,
  };
}

async function main() {
  try {
    const opcoes = parseArgs();
    if (!opcoes.arquivo) {
      process.stderr.write('Uso: node tools/mecanifica/exportar-obj.mjs --arquivo=<caminho> [opções]\n');
      process.stderr.write('Opções:\n');
      process.stderr.write('  --saida=<caminho>       Caminho do arquivo .obj de destino\n');
      process.stderr.write('  --unidade=<m|cm|mm>     Unidade de exportação (padrão: m)\n');
      process.stderr.write('  --escala=<fator>        Fator multiplicador explícito\n');
      process.stderr.write('  --sobrescrever          Sobrescreve arquivo de destino existente\n');
      process.stderr.write('  --somente-validar       Apenas valida a receita e malha sem gravar\n');
      process.stderr.write('  --diagnostico=json      Emite diagnóstico detalhado em JSON no stdout\n');
      process.exit(1);
    }

    const res = await exportarArquivoObj(opcoes);

    if (opcoes.somenteValidar) {
      if (opcoes.diagnosticoJson) {
        process.stdout.write(JSON.stringify(res.diagnostico, null, 2) + '\n');
      } else {
        process.stdout.write(`Validação concluída com sucesso para '${res.diagnostico.nome}'.\n`);
        process.stdout.write(`Corpos: ${res.diagnostico.corpos.length} | Vértices: ${res.diagnostico.vertices} | Faces: ${res.diagnostico.facesOriginais}\n`);
      }
      return;
    }

    if (opcoes.diagnosticoJson) {
      process.stdout.write(JSON.stringify({
        arquivo: res.caminhoRelativo,
        bytes: res.tamanhoBytes,
        diagnostico: res.diagnostico,
      }, null, 2) + '\n');
    } else {
      process.stdout.write(`Exportação Wavefront OBJ concluída com sucesso!\n`);
      process.stdout.write(`Destino:  ${res.caminhoRelativo} (${(res.tamanhoBytes / 1024).toFixed(1)} KB)\n`);
      process.stdout.write(`Unidade:  ${res.diagnostico.unidade} (escala x${res.diagnostico.escala})\n`);
      process.stdout.write(`Corpos:   ${res.diagnostico.totalCorpos}\n`);
      process.stdout.write(`Vértices: ${res.diagnostico.totalVertices}\n`);
      process.stdout.write(`Faces:    ${res.diagnostico.totalTriangulos} triângulos\n`);
    }
  } catch (err) {
    process.stderr.write(`Erro: ${err.message}\n`);
    process.exit(1);
  }
}

const executadoDireto = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (executadoDireto) {
  main();
}
