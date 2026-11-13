/* comecar.mjs — a entrada por intenção no MCP.
 *
 * A mesma função de `npm run comecar`: sem roteiro, a pergunta inicial da árvore com o estado do trabalho; com um grupo, a
 * pergunta dele e os ramos; com uma folha, a leitura com as seções entregues ali, o que abrir só quando a condição aparecer, a
 * skill, os comandos, a lista gerada e o passo seguinte lido do estado; com outro nome, os títulos de documento mais perto, e
 * com `arquivo#âncora`, a seção; um nome de operação, de extensão, de ficha de capacidade ou de comando recebe o comando que o explica. Um agente que fala com o Modelar por MCP começa por aqui em vez de abrir documentos para descobrir por onde
 * entrar. Só lê.
 */
import { z } from 'zod';
import { comecar } from '../../modelar/comecar.mjs';

export const comecarEntrada = z.object({
  roteiro: z.string().min(1).optional(),
}).strict();

export function criarFerramentasComecar() {
  return Object.freeze([
    {
      nome: 'comecar',
      descricao:
        'Por onde começar uma tarefa no Modelar, por perguntas. Sem roteiro, pergunta pela tarefa (mudar, documentar, pesquisar, '
        + 'modelar) e dá o estado do trabalho; com um grupo (modelar, modelar/peca), faz a pergunta dele e lista os ramos. Com uma '
        + 'folha, devolve a leitura com as seções entregues, o que abrir só quando a condição aparecer, a skill, os comandos, a lista '
        + 'gerada (famílias, peças, operações) e o passo seguinte, lido do plano ativo ou de comunicacao.md. Outro nome busca o tópico '
        + 'nos títulos dos documentos, e arquivo#âncora entrega a seção; nome de operação, extensão, ficha de capacidade ou comando '
        + 'devolve o comando que o explica.',
      inputSchema: comecarEntrada,
      outputSchema: z.object({
        ok: z.boolean(),
        codigo: z.number().int(),
        texto: z.string(),
        resultado: z.record(z.string(), z.unknown()),
        erro: z.object({ codigo: z.string(), mensagem: z.string(), acao: z.string() }).optional(),
      }).strict(),
      executar: async (entrada) => comecar({ roteiro: entrada.roteiro ?? null }),
      conteudo: (executado) => [{ type: 'text', text: executado.texto }],
      anotacoes: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
  ]);
}
