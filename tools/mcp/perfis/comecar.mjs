/* comecar.mjs — a entrada por intenção no MCP.
 *
 * A mesma função de `npm run comecar`: sem roteiro, a lista dos roteiros com a frase de cada um e o estado do trabalho; com um
 * roteiro, o que ler antes, o que abrir só quando a condição aparecer, a skill, os comandos e o passo seguinte lido do
 * estado. Um agente que fala com o Mecanifica por MCP começa por aqui em vez de abrir documentos para descobrir por onde
 * entrar. Só lê.
 */
import { z } from 'zod';
import { comecar } from '../../mecanifica/comecar.mjs';

export const comecarEntrada = z.object({
  roteiro: z.string().min(1).optional(),
  /* O esboço em andamento, relativo à raiz do repositório; com ele, o passo seguinte do esboço vem do Condutor. */
  arquivo: z.string().min(1).optional(),
}).strict();

export function criarFerramentasComecar() {
  return Object.freeze([
    {
      nome: 'comecar',
      descricao:
        'Por onde começar uma tarefa no Mecanifica. Sem roteiro, lista os roteiros por intenção (mudar, documentar, pesquisar, '
        + 'modelar/...) e o estado do trabalho. Com um roteiro, devolve o que ler antes, o que abrir só quando a condição aparecer, '
        + 'a skill, os comandos e o passo seguinte, lido do plano ativo, de comunicacao.md ou, com arquivo, do Condutor do esboço.',
      inputSchema: comecarEntrada,
      outputSchema: z.object({
        ok: z.boolean(),
        codigo: z.number().int(),
        texto: z.string(),
        resultado: z.record(z.string(), z.unknown()),
        erro: z.object({ codigo: z.string(), mensagem: z.string(), acao: z.string() }).optional(),
      }).strict(),
      executar: async (entrada) => comecar({ roteiro: entrada.roteiro ?? null, arquivo: entrada.arquivo ?? null }),
      conteudo: (executado) => [{ type: 'text', text: executado.texto }],
      anotacoes: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
  ]);
}
