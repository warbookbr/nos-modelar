/* autoria-execucao.mjs — ferramentas MCP para ativacao em tempo real na bancada e exportacao CAD/STEP. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { caixasPorParte, portasPublicadas } from '../../../src/autoria/descrever-partes.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { exportarArquivoStep } from '../../mecanifica/exportar-step.mjs';
import { exportarArquivoObj } from '../../mecanifica/exportar-obj.mjs';
import { ErroDeConfinamento, verificarCaminhoConfinado } from '../../mecanifica/caminho-confinado.mjs';
import { importarReceita } from '../../mecanifica/importar-receita.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../..');

const modoVisualizacao = z.enum(['todas', 'contexto', 'isolar']);
const unidadeCad = z.enum(['mm', 'cm', 'm']);

export const ativarBancadaEntrada = z.object({
  arquivo: z.string().min(1),
  focar: z.string().optional(),
  modo: modoVisualizacao.optional(),
  porta: z.number().int().min(1024).max(65535).optional(),
}).strict();

export const exportarStepEntrada = z.object({
  arquivo: z.string().min(1),
  saida: z.string().optional(),
  unidade: unidadeCad.optional(),
  escala: z.number().positive().optional(),
  sobrescrever: z.boolean().optional(),
}).strict();

export const exportarObjEntrada = z.object({
  arquivo: z.string().min(1),
  saida: z.string().optional(),
  unidade: unidadeCad.optional(),
  escala: z.number().positive().optional(),
  sobrescrever: z.boolean().optional(),
}).strict();

const erroAcionavel = (codigo, mensagem, acao) => ({ codigo, mensagem, acao });
const respostaOk = (resultado) => ({ ok: true, codigo: 0, resultado });
const respostaErro = (codigo, erro) => ({ ok: false, codigo, erro });

export async function executarAtivarBancada(input) {
  try {
    const caminhoAbsoluto = resolve(REPO, input.arquivo);
    verificarCaminhoConfinado(caminhoAbsoluto, { raiz: REPO });

    if (!existsSync(caminhoAbsoluto)) {
      return respostaErro(1, erroAcionavel(
        'arquivo_nao_encontrado',
        `Arquivo '${input.arquivo}' não existe.`,
        'Informe um caminho relativo válido dentro do repositório.',
      ));
    }

    const modulo = await importarReceita(caminhoAbsoluto);
    const receita = modulo.default
      ?? Object.values(modulo).find((v) => v && typeof v === 'object' && Array.isArray(v.PASSOS));

    if (!receita || !Array.isArray(receita.PASSOS)) {
      return respostaErro(1, erroAcionavel(
        'receita_invalida',
        `O arquivo '${input.arquivo}' não exporta uma receita válida com PASSOS.`,
        'Garanta que o arquivo exporte um objeto de receita procedural.',
      ));
    }

    const { neutro } = executarReceita(receita);
    const { caixas, facesSemParte } = caixasPorParte(neutro);
    const portas = portasPublicadas(neutro);
    const partesNomes = Array.from(caixas.keys());

    const nomeAlvo = receita.meta?.nome ?? 'Peça Ativa';
    const idAlvo = input.arquivo.replace(/[\/\\]/g, '-').replace(/\.js$/, '');

    const payload = {
      status: 'conectado',
      alvo: {
        id: idAlvo,
        tipo: 'peca',
        nome: nomeAlvo,
        versao: receita.meta?.versao ?? '1.0.0',
        atualizadoEm: new Date().toISOString(),
      },
      intencaoIA: {
        titulo: `Modelagem: ${nomeAlvo}`,
        resumo: `Carregado via MCP ativar_bancada a partir de ${input.arquivo}.`,
        checklist: partesNomes.slice(0, 8),
      },
      referencias: {
        pranchas: [],
        imagens: [],
        criterios: ['Validado sem órfãos', `${partesNomes.length} corpos identificados`],
      },
      receita,
    };

    mkdirSync(resolve(REPO, 'public'), { recursive: true });
    writeFileSync(resolve(REPO, 'public/sessao-ativa.json'), JSON.stringify(payload, null, 2), 'utf8');
    writeFileSync(resolve(REPO, 'sessao-ativa.json'), JSON.stringify(payload, null, 2), 'utf8');

    const porta = input.porta ?? 5174;
    const modo = input.modo ?? (input.focar ? 'isolar' : 'todas');
    let query = '';
    if (input.focar) {
      query = `?selecionadas=${encodeURIComponent(input.focar)}&modo=${encodeURIComponent(modo)}&focar=true`;
    }

    const url = `http://localhost:${porta}/nos-mecanifica/bancada.html${query}`;

    return respostaOk({
      alvo: nomeAlvo,
      totalPartes: partesNomes.length,
      partes: partesNomes,
      orfaos: neutro.orfaos?.length ?? 0,
      facesSemParte: facesSemParte.length,
      portas: portas.map((p) => p.id),
      arquivoSessao: 'public/sessao-ativa.json',
      url,
    });
  } catch (erro) {
    if (erro instanceof ErroDeConfinamento) {
      return respostaErro(1, erroAcionavel('caminho_recusado', erro.message, 'Use caminho confinado no repositório.'));
    }
    return respostaErro(1, erroAcionavel('falha_ativacao', erro?.message ?? 'Falha ao ativar bancada.', 'Revise o arquivo da receita.'));
  }
}

export async function executarExportarStep(input) {
  try {
    const caminhoAbsoluto = resolve(REPO, input.arquivo);
    verificarCaminhoConfinado(caminhoAbsoluto, { raiz: REPO });

    if (!existsSync(caminhoAbsoluto)) {
      return respostaErro(1, erroAcionavel(
        'arquivo_nao_encontrado',
        `Arquivo '${input.arquivo}' não existe.`,
        'Informe um caminho relativo válido dentro do repositório.',
      ));
    }

    const saida = input.saida ? resolve(REPO, input.saida) : undefined;
    if (saida) {
      verificarCaminhoConfinado(saida, { raiz: REPO });
    }

    const resultado = await exportarArquivoStep({
      arquivo: input.arquivo,
      saida,
      unidade: input.unidade ?? 'mm',
      escala: input.escala,
      sobrescrever: input.sobrescrever ?? true,
    });

    const destinoRelativo = relative(REPO, resultado.arquivo).replace(/\\/g, '/');

    return respostaOk({
      arquivoStep: destinoRelativo,
      bytes: resultado.bytesGravados,
      unidade: resultado.diagnostico.unidade,
      escala: resultado.diagnostico.escala,
      totalSolidos: resultado.diagnostico.corpos.length,
      solidos: resultado.diagnostico.corpos,
      metadados: resultado.diagnostico,
    });
  } catch (erro) {
    if (erro instanceof ErroDeConfinamento) {
      return respostaErro(1, erroAcionavel('caminho_recusado', erro.message, 'Use caminho confinado no repositório.'));
    }
    return respostaErro(1, erroAcionavel('falha_exportacao_step', erro?.message ?? 'Falha ao exportar STEP.', 'Verifique a geometria neutra da receita.'));
  }
}

export async function executarExportarObj(input) {
  try {
    const caminhoAbsoluto = resolve(REPO, input.arquivo);
    verificarCaminhoConfinado(caminhoAbsoluto, { raiz: REPO });

    if (!existsSync(caminhoAbsoluto)) {
      return respostaErro(1, erroAcionavel(
        'arquivo_nao_encontrado',
        `Arquivo '${input.arquivo}' não existe.`,
        'Informe um caminho relativo válido dentro do repositório.',
      ));
    }

    const saida = input.saida ? resolve(REPO, input.saida) : undefined;
    if (saida) {
      verificarCaminhoConfinado(saida, { raiz: REPO });
    }

    const resultado = await exportarArquivoObj({
      arquivo: input.arquivo,
      saida,
      unidade: input.unidade ?? 'm',
      escala: input.escala,
      sobrescrever: input.sobrescrever ?? true,
    });

    const destinoRelativo = relative(REPO, resultado.caminhoSaida).replace(/\\/g, '/');

    return respostaOk({
      arquivoObj: destinoRelativo,
      bytes: resultado.tamanhoBytes,
      unidade: resultado.diagnostico.unidade,
      escala: resultado.diagnostico.escala,
      totalCorpos: resultado.diagnostico.totalCorpos,
      totalVertices: resultado.diagnostico.totalVertices,
      totalTriangulos: resultado.diagnostico.totalTriangulos,
      corpos: resultado.diagnostico.corpos,
      metadados: resultado.diagnostico,
    });
  } catch (erro) {
    if (erro instanceof ErroDeConfinamento) {
      return respostaErro(1, erroAcionavel('caminho_recusado', erro.message, 'Use caminho confinado no repositório.'));
    }
    return respostaErro(1, erroAcionavel('falha_exportacao_obj', erro?.message ?? 'Falha ao exportar OBJ.', 'Verifique a geometria da receita.'));
  }
}

export function conteudoAtivarBancada(executado) {
  if (!executado?.ok) {
    return [{ type: 'text', text: `ativar_bancada: ${executado?.erro?.mensagem ?? 'falha ao ativar bancada.'}` }];
  }
  const r = executado.resultado;
  const texto = [
    `Bancada ativada: ${r.alvo}`,
    `Partes (${r.totalPartes}): ${r.partes.join(', ')}`,
    `Órfãos: ${r.orfaos} | Faces sem parte: ${r.facesSemParte}`,
    `URL local: ${r.url}`,
    `Sessão: ${r.arquivoSessao}`,
  ].join('\n');
  return [{ type: 'text', text: texto }];
}

export function conteudoExportarStep(executado) {
  if (!executado?.ok) {
    return [{ type: 'text', text: `exportar_step: ${executado?.erro?.mensagem ?? 'falha na exportação STEP.'}` }];
  }
  const r = executado.resultado;
  const solidosTxt = (r.solidos ?? []).map((s) => `  - ${s.nome} (${s.faces} faces)`).join('\n');
  const texto = [
    `Exportação STEP concluída: ${r.arquivoStep} (${r.bytes} bytes)`,
    `Unidade: ${r.unidade} (escala ${r.escala})`,
    `Total de sólidos: ${r.totalSolidos}`,
    solidosTxt,
  ].filter(Boolean).join('\n');
  return [{ type: 'text', text: texto }];
}

export function conteudoExportarObj(executado) {
  if (!executado?.ok) {
    return [{ type: 'text', text: `exportar_obj: ${executado?.erro?.mensagem ?? 'falha na exportação OBJ.'}` }];
  }
  const r = executado.resultado;
  const texto = [
    `Exportação OBJ concluída: ${r.arquivoObj} (${r.bytes} bytes)`,
    `Unidade: ${r.unidade} (escala ${r.escala})`,
    `Total de corpos: ${r.totalCorpos} | Vértices: ${r.totalVertices} | Triângulos: ${r.totalTriangulos}`,
  ].join('\n');
  return [{ type: 'text', text: texto }];
}

export function criarFerramentasAutoriaExecucao() {
  return Object.freeze([
    {
      nome: 'ativar_bancada',
      descricao: 'Sincroniza e ativa em tempo real uma peça ou montagem procedural na bancada 3D Three.js.',
      inputSchema: ativarBancadaEntrada,
      outputSchema: z.object({
        ok: z.boolean(),
        codigo: z.number().int(),
        resultado: z.object({
          alvo: z.string(),
          totalPartes: z.number().int(),
          partes: z.array(z.string()),
          orfaos: z.number().int(),
          facesSemParte: z.number().int(),
          portas: z.array(z.string()),
          arquivoSessao: z.string(),
          url: z.string(),
        }).optional(),
        erro: z.object({ codigo: z.string(), mensagem: z.string(), acao: z.string() }).optional(),
      }).strict(),
      executar: executarAtivarBancada,
      conteudo: conteudoAtivarBancada,
      anotacoes: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    {
      nome: 'exportar_step',
      descricao: 'Exporta a geometria procedural para arquivo CAD STEP (.step) com conversão de escala milimétrica e sólidos nomeados.',
      inputSchema: exportarStepEntrada,
      outputSchema: z.object({
        ok: z.boolean(),
        codigo: z.number().int(),
        resultado: z.object({
          arquivoStep: z.string(),
          bytes: z.number().int(),
          unidade: z.string(),
          escala: z.number(),
          totalSolidos: z.number().int(),
          solidos: z.array(z.object({ nome: z.string(), faces: z.number().int() })),
          metadados: z.any().optional(),
        }).optional(),
        erro: z.object({ codigo: z.string(), mensagem: z.string(), acao: z.string() }).optional(),
      }).strict(),
      executar: executarExportarStep,
      conteudo: conteudoExportarStep,
      anotacoes: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    {
      nome: 'exportar_obj',
      descricao: 'Exporta a geometria procedural para arquivo Wavefront OBJ (.obj) com multipartes semânticas (o Nome) para Unreal Engine e Blender.',
      inputSchema: exportarObjEntrada,
      outputSchema: z.object({
        ok: z.boolean(),
        codigo: z.number().int(),
        resultado: z.object({
          arquivoObj: z.string(),
          bytes: z.number().int(),
          unidade: z.string(),
          escala: z.number(),
          totalCorpos: z.number().int(),
          totalVertices: z.number().int(),
          totalTriangulos: z.number().int(),
          corpos: z.array(z.object({
            nome: z.string(),
            parte: z.string(),
            vertices: z.number().int(),
            facesOriginais: z.number().int(),
            triangulos: z.number().int(),
          })),
          metadados: z.any().optional(),
        }).optional(),
        erro: z.object({ codigo: z.string(), mensagem: z.string(), acao: z.string() }).optional(),
      }).strict(),
      executar: executarExportarObj,
      conteudo: conteudoExportarObj,
      anotacoes: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
  ]);
}
