/* parametros.mjs — ferramentas MCP da varredura paramétrica.
 *
 * Expõe pelo MCP as duas CLIs do plano "parâmetro que move a peça". Sem isto,
 * um agente que fale com o Mecanifica por MCP em vez de terminal não enxerga
 * nenhuma das duas: ele continua alterando número no escuro e remedindo, que é
 * exatamente o desperdício que elas existem para cortar.
 *
 * As duas são SOMENTE LEITURA. Nada é escrito: as variantes vivem em memória e
 * o arquivo da receita não é tocado. Elas devolvem candidatos medidos e o custo
 * de cada um; escolher continua sendo de quem chama.
 */
import { z } from 'zod';
import { parametrosReutilizavel } from '../../mecanifica/parametros-peca.mjs';
import { varrerReutilizavel } from '../../mecanifica/varrer-peca.mjs';
import { ORCAMENTO_PADRAO } from '../../../src/autoria/varrer-parametros.js';

export const diagnosticarParametrosEntrada = z.object({
  alvo: z.string().min(1).optional(),
  acervo: z.boolean().optional(),
  completo: z.boolean().optional(),
}).strict();

export const varrerParametrosEntrada = z.object({
  alvo: z.string().min(1),
  criterio: z.string().min(1).optional(),
  delta: z.number().gt(0).lt(1).optional(),
  /* Cada liberdade é `caminho:min..max:passos`. Presente, escolhe o modo lote. */
  livres: z.array(z.string().min(1)).optional(),
  objetivo: z.enum(['maximizar', 'minimizar', 'alvo']).optional(),
  valorAlvo: z.number().optional(),
  orcamento: z.number().int().min(1).optional(),
  mostrar: z.number().int().min(1).optional(),
}).strict();

const erro = z.object({ codigo: z.string(), mensagem: z.string(), acao: z.string() }).optional();

/* O texto que a CLI já imprime é a melhor resposta para um agente: cabe em
   centenas de bytes e traz o custo de cada candidato. Repetir a estrutura em
   prosa seria duplicar a régua num lugar que envelhece sozinho. */
const conteudoDeTexto = (executado) => [{
  type: 'text',
  text: executado.stdout || executado.stderr || 'sem saída.',
}];

function comAcao(resposta, acao) {
  if (resposta.ok) return resposta;
  return {
    ok: false,
    codigo: resposta.codigo,
    erro: {
      codigo: resposta.erro?.codigo ?? 'falha',
      mensagem: resposta.erro?.mensagem ?? 'a ferramenta não concluiu.',
      acao,
    },
  };
}

async function executarDiagnosticar(entrada) {
  const bruto = await parametrosReutilizavel({
    alvo: entrada.alvo ?? null,
    acervo: entrada.acervo ?? false,
    completo: entrada.completo ?? false,
  });
  return { ...bruto, ...comAcao(bruto, 'Informe um alvo do acervo, ou acervo:true para o retrato inteiro.') };
}

async function executarVarrer(entrada) {
  if (entrada.objetivo === 'alvo' && entrada.valorAlvo === undefined) {
    return {
      ok: false,
      codigo: 2,
      stdout: '',
      stderr: '',
      erro: {
        codigo: 'objetivo_incompleto',
        mensagem: "objetivo 'alvo' precisa de valorAlvo.",
        acao: 'Informe valorAlvo, ou use objetivo maximizar/minimizar.',
      },
    };
  }
  const objetivo = entrada.objetivo
    ? (entrada.objetivo === 'alvo'
      ? { modo: 'alvo', alvo: entrada.valorAlvo }
      : { modo: entrada.objetivo })
    : null;
  const bruto = await varrerReutilizavel({
    alvo: entrada.alvo,
    criterio: entrada.criterio ?? 'menor-folga',
    delta: entrada.delta ?? 0.1,
    liberdades: entrada.livres ?? [],
    objetivo,
    orcamento: entrada.orcamento ?? ORCAMENTO_PADRAO,
    mostrar: entrada.mostrar ?? 5,
  });
  return { ...bruto, ...comAcao(bruto, 'Confira alvo, critério e formato das liberdades (caminho:min..max:passos).') };
}

/* A estrutura devolvida é deliberadamente rasa. O relatório completo tem
   dezenas de sondas; despejá-lo inteiro custaria mais contexto do que a
   pergunta que ele responde, e o texto já traz o que decide. */
const estruturarDiagnostico = (executado) => (executado.ok
  ? {
    ok: true,
    codigo: 0,
    resultado: executado.resultado?.registro
      ? {
        alvo: executado.resultado.registro.alvo,
        totais: executado.resultado.registro.totais,
        vivos: executado.resultado.registro.parametros
          .filter((p) => p.estado === 'vivo').map((p) => p.caminho),
        indiagnosticavel: executado.resultado.registro.indiagnosticavel ?? null,
      }
      : {
        totais: executado.resultado.totais,
        porAlvo: executado.resultado.registros.map((r) => ({
          alvo: r.alvo, carregou: r.carregou, ...r.totais,
        })),
      },
  }
  : executado);

const estruturarVarredura = (executado) => (executado.ok
  ? {
    ok: true,
    codigo: 0,
    resultado: {
      criterio: executado.resultado.criterio,
      unidade: executado.resultado.unidade,
      variantes: executado.resultado.variantes,
      base: executado.resultado.base.valor,
      movem: executado.resultado.efeitos
        ? executado.resultado.efeitos.filter((e) => e.move).map((e) => e.caminho)
        : undefined,
      candidatos: executado.resultado.viaveis
        ? executado.resultado.viaveis.slice(0, 5).map((c) => ({
          valores: c.valores, valor: c.valor, custo: c.custo,
        }))
        : undefined,
      ondeOlhar: executado.resultado.movidas.map((m) => m.nome),
    },
  }
  : executado);

export function criarFerramentasParametros() {
  return Object.freeze([
    {
      nome: 'diagnosticar_parametros',
      descricao:
        'Diz quais números de PARAMS realmente movem a peça medida e quais estão só declarados. '
        + 'Receita cujos PASSOS são literais fixos aceita qualquer alteração de parâmetro sem mudar um vértice '
        + 'e sem avisar; pergunte aqui ANTES de alterar um valor. Sem alvo e com acervo:true, faz o retrato de todas.',
      inputSchema: diagnosticarParametrosEntrada,
      outputSchema: z.object({
        ok: z.boolean(),
        codigo: z.number().int(),
        resultado: z.object({
          alvo: z.string().optional(),
          totais: z.object({
            declarados: z.number().int(), vivos: z.number().int(), inertes: z.number().int(),
          }),
          vivos: z.array(z.string()).optional(),
          indiagnosticavel: z.string().nullable().optional(),
          porAlvo: z.array(z.object({
            alvo: z.string(),
            carregou: z.boolean(),
            declarados: z.number().int(),
            vivos: z.number().int(),
            inertes: z.number().int(),
          })).optional(),
        }).optional(),
        erro,
      }).strict(),
      executar: executarDiagnosticar,
      estruturar: estruturarDiagnostico,
      conteudo: conteudoDeTexto,
      anotacoes: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    {
      nome: 'varrer_parametros',
      descricao:
        'Mede quais parâmetros movem um critério, quanto, e o que cada movimento QUEBRA. '
        + 'Sem `livres`, faz sensibilidade (um parâmetro por vez, ±delta). Com `livres` '
        + '(cada uma `caminho:min..max:passos`) e um objetivo, mede a grade e ordena os sobreviventes. '
        + 'Critérios: menor-folga, interpenetracoes, contatos, folga:<a>,<b>, dimensao:<parte>:<x|y|z>, envelope:<x|y|z>. '
        + 'Devolve CANDIDATOS com custo, nunca aplica nada — leia quantas juntas pioraram antes de escolher o melhor número.',
      inputSchema: varrerParametrosEntrada,
      outputSchema: z.object({
        ok: z.boolean(),
        codigo: z.number().int(),
        resultado: z.object({
          criterio: z.string(),
          unidade: z.string(),
          variantes: z.number().int(),
          base: z.number().nullable(),
          movem: z.array(z.string()).optional(),
          candidatos: z.array(z.object({
            valores: z.record(z.string(), z.number()),
            valor: z.number().nullable(),
            custo: z.object({
              interpenetracoes: z.number().int(),
              pioradas: z.number().int(),
            }),
          })).optional(),
          ondeOlhar: z.array(z.string()),
        }).optional(),
        erro,
      }).strict(),
      executar: executarVarrer,
      estruturar: estruturarVarredura,
      conteudo: conteudoDeTexto,
      anotacoes: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
  ]);
}
