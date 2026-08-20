# Auditoria das práticas de autoria 3D da Mecanifica

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, `0ce0a14`

## Problema observado

A Mecanifica tem contratos e ferramentas distintos, mas ainda não há uma
avaliação única que determine se seu modo de trabalhar preserva as práticas que
produzem bons resultados em workflows agentivos 3D atuais. Aprovações locais
podem coexistir com representação inadequada, crítica tardia, decomposição ruim
ou teto geométrico baixo.

## Resultado

Uma auditoria baseada somente em evidência local classifica o que a Mecanifica
faz bem, o que está ausente, o que está errado e o que limita seu teto. A saída
prioriza correções e decide entre `preservar`, `corrigir`, `redesenhar` ou
`interromper` a tese, sem executar Blender nem outro comparador externo.

## Régua de auditoria

As práticas públicas observadas servem como perguntas, não como autoridade nem
dependência:

1. decompor o objeto e atribuir partes antes de modelar;
2. separar planejador, autor e crítico, limitando o contexto de cada papel;
3. criar variantes comparáveis e escolher por evidência;
4. inspecionar visualmente durante o processo, em mais de um enquadramento;
5. escolher representação e operações conforme a classe de forma;
6. medir topologia, continuidade, proporção e legibilidade, não só validade;
7. fixar briefing, orçamento e condições de rejeição antes da autoria;
8. manter artefatos editáveis e corrigir localmente sem destruir identidade;
9. julgar o resultado final acima da sofisticação da infraestrutura.

## Incluído

- núcleo e registro de capacidades;
- receitas, composição procedural e extensões;
- peças, montagens, identidade, impacto e revalidação;
- prancha, referência, bancada, captura e crítica visual;
- cage privada e evidências do chassi apenas como diagnóstico de teto;
- skills e portas Agent-First usadas por um agente novo;
- planos e sondas recentes como evidência, nunca como autorização.

## Excluído

- instalar ou executar Blender, CAD, MCP externo ou gerador 3D;
- modelar objeto novo, reativar P2 ou alterar geometria existente;
- implementar melhorias durante a auditoria;
- inferir qualidade por teste verde, quantidade de ferramentas ou opinião sem
  artefato reproduzível.

## Filtro Agent-First

| Elemento | Decisão inicial | Condição |
| --- | --- | --- |
| contratos semânticos | USAR DIRETO | se reduzirem ambiguidade no caso real |
| catálogo e descoberta | ENVOLVER | se o custo de consulta superar o ganho |
| validação e métricas | REFATORAR | se aprovarem artefato visualmente ruim |
| skills e subagentes | REFATORAR | se papel, contexto e entrega não forem isoláveis |
| nova operação ou representação | ADIAR | exige lacuna causal e plano próprio |
| integração externa | ADIAR | fora desta auditoria |

## Fatias

### R0 — inventário de evidências

Mapear cada prática para contratos, código, testes, skills, relatórios e
contraexemplos locais. Marcar `provada`, `parcial`, `ausente` ou `contradita`;
ausência de evidência não conta como capacidade.

### R1 — workflow e orquestração

Auditar decomposição, planejamento, descoberta, separação autor–crítico,
variantes, orçamento de contexto e retomada. Verificar se um agente novo recebe
o mínimo necessário e se os papéis podem ser realmente independentes.

### R2 — representação e teto geométrico

Auditar quais classes de forma cada representação suporta, onde operações
genéricas produzem forma inadequada, como topologia e continuidade são medidas
e quais reprovações visuais escaparam dos gates.

### R3 — ciclo visual e manutenção

Auditar enquadramentos, referência, sobreposição, crítica, correção local,
identidade, impacto e revalidação. Toda defesa deve apontar a mutação concreta
que detecta e o erro real que já evitou ou deixou passar.

### R4 — síntese e decisão

Publicar uma matriz curta de forças, falhas, causas e prioridade. Propor apenas
os recortes mínimos sustentados por evidência e registrar a decisão sobre a
tese antes de descongelar qualquer prova de modelagem.

## Gates de saída

1. as nove práticas estão classificadas com fonte local e contraevidência;
2. cada afirmação de teto distingue contrato, implementação e resultado visual;
3. ao menos as reprovações da carroceria e da alteração local são explicadas
   causalmente pela matriz;
4. redundância, complexidade sem retorno e validação de falsa segurança aparecem
   explicitamente, se existirem;
5. prioridades usam impacto × evidência × custo, sem lista de desejos;
6. o relatório final termina em `preservar`, `corrigir`, `redesenhar` ou
   `interromper`, com condição verificável para a próxima decisão;
7. gates de documentação do índice passam sem alterar comportamento.

## Riscos e parada

- Se uma prática não puder ser avaliada sem executar um comparador externo, ela
  fica `inconclusiva`; não se inventa equivalência.
- Se a auditoria revelar falha estrutural, nenhuma melhoria cosmética autoriza
  descongelar a validação integrada ou P2.
- Se faltar evidência local, abre-se uma prova confinada posterior; a auditoria
  não modela para justificar a própria conclusão.

## Fechamento

Relatório: [`../RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md`](../RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md).

**Decisão: `corrigir`.** A base semântica, determinística e de composição é
mantida. O ciclo de autoria de superfície não pode voltar a fechar por métricas
estruturais sem evidência visual vinculante. P2 e a validação integrada
permanecem congelados; um plano sucessor deve primeiro provar o porteiro de
aceite visual e uma cage com seções de caráter declaradas.

Gates de documentação: `mapa:check`, `docs:toc:check`, `docs:links:check` e
`planos:check` passam na entrega desta rodada. Nenhum comportamento, geometria,
material ou câmera foi alterado.
