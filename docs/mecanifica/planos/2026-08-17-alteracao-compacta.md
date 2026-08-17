# Alteração semântica compacta de montagem

**Estado:** concluído

**Responsável:** execução assistida por IA

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/alteracao-compacta` sobre `main`.

## Problema observado

Melhoria 3 de
[`../RELATORIO-ANALISE-GRANDES-MELHORIAS.md`](../RELATORIO-ANALISE-GRANDES-MELHORIAS.md):
"hoje o agente envia o documento completo para mudar um parâmetro".

O custo de contexto é o motivo visível. O motivo caro é outro: **quem reenvia o
documento inteiro está afirmando cada byte dele**. Uma chave reordenada, um
número rearredondado ou um campo perdido na serialização vira alteração de
conteúdo que o serviço não tem como distinguir de uma alteração deliberada — o
documento é aceito porque é VÁLIDO, não porque é o pretendido. É a mesma família
de falha silenciosa que o resto do repositório persegue.

## Resultado

`planejar_alteracao_montagem` recebe alterações endereçadas por identidade. O
serviço reconstitui o documento completo a partir da revisão ativa, devolve o
diff e segue pelo mesmo caminho de gates: inspecionar, conferir, aplicar.

```json
{ "alvo": { "instancia": "movel" },
  "campo": "pose.deslocamento",
  "valor": [0, 1.04, 0] }
```

## Decisão de projeto

**O que não foi declarado permanece idêntico por construção**, e não por
disciplina de quem serializou o JSON. O agente não reenvia, logo não pode
alterar por acidente.

**O endereço é identidade, nunca posição.** `alvo` cita instância ou relação
pelo `id` semântico; `campo` percorre chaves nomeadas. Segmento numérico é
recusado com código próprio — o relatório impôs essa restrição ao recorte
("índice de array ou JSON Patch posicional não deve virar identidade
persistida"), e ela é o que impede o JSON Patch de reentrar por outra porta.

**Alteração troca valor, não cria contrato.** Campo inexistente é recusado:
criar `pose` numa instância que não tem pose seria acrescentar capacidade por
atalho, sem passar pelo formato.

**Duas recusas defendem a honestidade da revisão:** alteração sem efeito (uma
revisão afirmaria mudança que não houve) e duas alterações no mesmo endereço (o
resultado dependeria da ordem da lista, que é posição).

**Nada de novo depois do plano.** A saída é o mesmo plano de
`planejar_autoria_montagem`, mais o diff — daqui para a frente o caminho, os
gates e a transação são os que já estavam provados.

## Filtro Agent-First

| Interface | Decisão | Razão |
|---|---|---|
| `planejarAutoriaMontagem` e a transação | **USAR DIRETO** | a alteração termina em documento completo; tudo depois dela é o caminho já provado |
| `observarAutoriaMontagem` | **USAR DIRETO** | é a fonte do documento base, e já valida revisão observada |
| porta MCP de autoria | **ENVOLVER** | ganha uma ferramenta ao lado da existente, sem substituí-la |
| JSON Patch / JSON Pointer | **ADIAR** (recusado) | endereço posicional é exatamente o que o repositório proíbe |
| alteração compacta de receita | **ADIAR** | mesmo padrão, contrato diferente; merece recorte próprio com evidência |

## Incluído

- `src/autoria/alterar-montagem.js`, função pura com diff e sete recusas;
- ferramenta MCP `planejar_alteracao_montagem`;
- `tools/mecanifica/alterar-montagem.test.ts` com 16 provas;
- prova caixa-preta na suíte MCP, incluindo a recusa posicional pela porta.

## Excluído

- criar ou remover instância e relação;
- alteração compacta de receita declarativa;
- edição de geometria;
- aplicar sem passar por inspeção e gates;
- qualquer forma de endereço posicional.

## Gate de saída

1. **comportamento mensurável** — reverter apenas o campo alterado devolve o
   documento original byte a byte; a proposta compacta é menos de um quarto do
   documento que substitui; o resultado é idêntico ao do caminho longo;
2. **compatibilidade e determinismo** — `planejar_autoria_montagem` continua
   existindo e inalterado; a entrada não é mutada;
3. **prova visual** — dispensada: a afirmação é de conteúdo e endereço, medida
   por igualdade de documento;
4. **testes e documentação** — 16 provas unitárias e prova caixa-preta pela
   porta MCP real;
5. **decisão Agent-First registrada** — tabela acima.

## Fechamento

Gates completos de [`../INDEX.md`](../INDEX.md) verdes.

**Decisão: aprovar.** Continuam abertas as costuras de `lathe`, os materiais
genéricos, o Caso 3, o histórico operacional (melhoria 4) e os atritos A-6,
A-7, A-8, A-16 e A-29.
