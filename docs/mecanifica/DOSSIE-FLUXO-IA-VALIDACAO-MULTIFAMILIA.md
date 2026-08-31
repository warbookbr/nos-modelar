# Dossiê — fluxo de IA e validação multifamília

## Papel

Este dossiê transforma o [plano mestre](./planos/encerrados/2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md)
num protocolo operacional para IA. Ele cobre autoria, crítica, usuário,
validadores e recuperação; não aprova sozinho nenhuma geometria.

## Estado da tarefa

Cada objetivo percorre estados explícitos:

`briefing → alvo → andaime → blocagem → decomposição → integração → superfície
→ estados → revisão → promoção`.

Cada transição possui entrada, artefato esperado, gates, decisão e retorno. Uma
falha volta ao primeiro estado cuja premissa foi invalidada; não acrescenta
detalhes no estado atual por inércia.

## Papéis separados

- **autor:** planeja e altera a fonte; conhece intenção e histórico;
- **validadores determinísticos:** medem contratos sem julgamento estético;
- **crítico visual independente:** recebe imagens e alvo, não a justificativa;
- **usuário:** decide reconhecimento, caráter e adequação do resultado;
- **publicador:** aplica somente revisão observada que passou pelos gates.

Um mesmo agente não simula independência mudando de prompt. O crítico precisa
de contexto realmente separado ou execução distinta.

## Protocolo por estado

### Briefing e alvo

Registrar família, função, nível de qualidade, vistas, dimensões rígidas,
referências, incertezas e rejeições. Referência insuficiente bloqueia precisão,
mas pode autorizar uma exploração explicitamente rotulada.

### Andaime e blocagem

Criar o objeto completo com landmarks e volumes maiores. Renderizar material
neutro em vistas canônicas. Medir envelope e proporções; depois executar leitura
cega. Sem reconhecimento, alterar andaime ou representação, nunca detalhar.

### Decomposição

Nomear regiões e decidir o que é peça, superfície ou montagem. Toda fronteira
declara vizinho, mobilidade e intenção: contínua, articulada, coberta, encaixada
ou separada. A decomposição não pode mudar silenciosamente a silhueta aprovada.

### Integração e superfície

Editar peça isolada para qualidade local, em par para interface e no conjunto
para leitura global. Toda rodada registra alvo, diff semântico, impacto,
medições, imagens e decisão. Mudança que toca região distante precisa ser
explicada ou recusada.

### Estados

Validar primeiro pose neutra conectada. Cada pose adicional é revisão derivada
com limites e cobertura próprios. Duas poses não provam trajetória; movimento
entra somente quando necessário e mede primeiro contato/folga no intervalo.

### Revisão e promoção

Revisão agrega plataforma e artefato em eixos separados. A promoção exige gates
obrigatórios verdes, crítico sem achado impeditivo e aceite humano nos marcos
visuais. Publicação nunca corrige ou completa a proposta implicitamente.

## Matriz mínima de contexto

| Escala | Pergunta |
|---|---|
| fonte/controle | a edição fez somente o que declarou? |
| peça isolada | a superfície local está correta? |
| par | encaixe, cobertura, orientação e folga estão corretos? |
| submontagem | a cadeia permanece conectada e coerente? |
| conjunto | a máquina é reconhecível e proporcional? |
| estado | a configuração continua válida nesta pose? |

Nenhuma escala substitui outra. O orquestrador escolhe o menor contexto útil e
sempre retorna ao conjunto nos marcos de promoção.

## Porteiros de conectividade

- grafo de adjacências obrigatórias alcança todas as partes funcionais;
- interface cita IDs semânticos dos dois lados e referencial local;
- distância e orientação ficam dentro da tolerância declarada;
- contato, sobreposição e separação são estados diferentes;
- componente visualmente flutuante exige justificativa explícita ou reprova;
- expectativa de interpenetração explica intenção, mas não apaga medição;
- cobertura parcial não vira contato completo;
- estado articulado revalida interfaces afetadas.

Para humanoide, deve existir cadeia do tronco a cabeça, mãos e pés. Para
veículo, rodas, eixos, carroceria e conjuntos estruturais declaram seus vínculos
relevantes; proximidade de câmera não conta como conexão.

## Porteiros visuais

1. abrir todas as imagens antes do julgamento;
2. conferir enquadramento, material neutro e paridade de câmera;
3. comparar alvo, modelo e sobreposição por vista/região;
4. executar reconhecimento cego sem revelar a família quando aplicável;
5. registrar observação objetiva e severidade;
6. pedir decisão do usuário nos marcos definidos;
7. preservar antes/depois e reexecutar o mesmo achado.

Crítico pode encontrar defeito; não concede aprovação. Usuário não substitui
gate técnico. Gate técnico não substitui reconhecimento humano.

## Três tentativas e alternativas

O limite de três blocagens vale para a mesma combinação de referência,
representação e estratégia. Cada rodada deve testar hipótese distinta e medir
efeito. Se nenhuma for reconhecível, a rota para e compara alternativas
previstas: revisar alvo, trocar composição de superfície, ampliar capacidade ou
reduzir a prova. Repetir números sobre a mesma forma não conta como alternativa.

## Operação por serviços e MCP

Capacidades candidatas, sempre sobre serviços puros:

- `descrever_objetivo_autoria` e `planejar_fluxo_autoria`;
- `observar_fonte_autoral` e `planejar_alteracao_semantica`;
- `compilar_proposta_autoral` e `consultar_influencia`;
- `renderizar_contexto_autoria` e `comparar_com_alvo`;
- `validar_superficie`, `validar_conectividade` e `revisar_objeto`;
- `registrar_decisao_visual` e `aplicar_revisao_autoral`.

Os nomes são candidatos de arquitetura, não autorização automática. Antes de
criar ferramenta MCP, provar o serviço por API interna/CLI e medir se a porta
reduz contexto ou erro da IA.

## Fluxo por família

### Peça mecânica

Referência dimensional → receita procedural → descrição → vistas → interfaces
→ revisão. Superfície semântica entra apenas se a peça tiver carenagem ou forma
estilizada que justifique o custo.

### Veículo

Andaime rodas/ocupantes → carro inteiro bruto → aceite → regiões da pele →
aberturas → integração mecânica → superfície → painéis/detalhe → estados
necessários → promoção.

### Humanoide

Esqueleto/proporção → corpo-base → aceite → segmentação anatômica → placas
conformadas → interfaces/juntas → pose neutra → superfície → poses adicionais
→ promoção.

### Sistema articulado mecânico

Peças dimensionais → interfaces/eixos → montagem neutra → limites → poses →
envelope quando necessário → revisão.

## Recuperação e bloqueios

- falha de schema: corrigir fonte sem renderizar;
- falha geométrica: voltar ao controle/região causadora;
- falha de conexão: corrigir interface antes de pose ou detalhe;
- falha visual global: voltar ao andaime/blocagem;
- falta de capacidade: registrar lacuna e executar prova técnica;
- referência contraditória: bloquear precisão e pedir decisão do usuário;
- orçamento excedido: medir gargalo e reduzir produto derivado, não semântica;
- abordagem reprovada: congelar evidência e ativar alternativa, sem renomear
  fracasso como sucesso parcial.

## Definição de concluído

Um objeto está concluído quando sua fonte é editável, o produto é recompilável,
identidades e interfaces são estáveis, dependentes são conhecidos, gates de
plataforma passam, gates do artefato passam, imagens foram abertas, achados
impeditivos estão resolvidos e o usuário aprovou os marcos visuais. Qualquer
item ausente mantém o estado incompleto ou explicitamente exploratório.

