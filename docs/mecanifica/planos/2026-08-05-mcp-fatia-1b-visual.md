# MCP — Fatia 1B visual somente leitura

**Estado:** ativo

**Responsável:** a definir

**Repositório e base:** `warbookbr/nos-mecanifica`; registrar o `HEAD` ao iniciar a implementação

**Programa:** `docs/mecanifica/planos/mcp/INDEX.md`

**Arquivos reservados:** `tools/mecanifica/olhar-bancada.mjs`,
`tools/mcp/contratos.mjs`, `tools/mcp/perfis/revisao.mjs`,
`tools/mcp/servidor.mjs`, `tools/mcp/mcp.test.mjs` e este plano.

## Problema observado

A Fatia 1A permite descrever, validar e comparar, mas o agente consumidor ainda
não recebe as quatro vistas oficiais. A revisão visual exige sair do MCP, chamar
a bancada por outro meio e localizar PNGs no disco. Isso reintroduz contexto,
fallback e caminhos que o piloto havia eliminado.

## Resultado verificável

Uma única ferramenta MCP somente leitura, `renderizar_vistas`, produz e
transporta as vistas `isometrica`, `frontal`, `direita` e `superior` usando o
serviço existente da bancada. Ela devolve quatro imagens PNG e um manifesto
estruturado, sem gravar arquivos, promover revisões ou duplicar Playwright/Vite.

## Hipótese

Se a bancada puder capturar em memória pelo mesmo serviço usado pela CLI, o MCP
entrega leitura visual com rastreabilidade e mantém zero fallback externo. A
fatia só é aprovada se o ganho sobreviver aos limites de payload, tempo e
limpeza de recursos.

## Contrato da ferramenta

Entrada fechada:

- `peca`: enumeração já publicada pelo descritor;
- nenhum caminho, diretório de saída, URL, resolução livre ou argumento de
  shell;
- vistas, projeção ortográfica, modo estrito e enquadramento são os oficiais e
  não configuráveis nesta fatia.

Saída estruturada:

- `formato: mecanifica.vistas-oficiais` e `versao: 1`;
- peça, duração e total de bytes;
- exatamente quatro vistas na ordem oficial;
- para cada vista: nome, `mimeType`, largura, altura, bytes, `sha256` e métricas
  de enquadramento;
- erro acionável com código estável quando a operação for recusada.

O `content` MCP contém uma mensagem curta e quatro blocos `image` com PNG em
base64 e `mimeType: image/png`. O base64 não é repetido em
`structuredContent`; o manifesto contém somente metadados verificáveis.

## Reuso da bancada

`olharBancada` continua sendo o único dono de Vite, Playwright, câmera, vistas,
métricas e diagnóstico. A implementação pode receber um destino de captura em
memória ou uma estratégia equivalente, mas não criar uma segunda rotina de
navegação.

A CLI preserva o comportamento atual de escrever PNGs quando chamada pelo fluxo
humano. No modo MCP, nenhuma pasta de saída é criada e nenhum PNG ou relatório é
persistido. A mesma captura alimenta o bloco MCP e o manifesto.

## Payload e timeout

Limites iniciais, medidos sobre o PNG decodificado e a resposta serializada:

- até 2 MiB por imagem;
- até 8 MiB para as quatro imagens decodificadas;
- até 11 MiB para a resposta MCP serializada;
- até 45 segundos para a chamada completa.

Ultrapassar qualquer limite retorna `payload_excedido` ou `tempo_esgotado`, sem
resultado parcial. A ferramenta não reduz resolução, troca formato ou omite
vista silenciosamente. Se as vistas oficiais não couberem, a fatia para e uma
decisão separada avalia recursos ou outro transporte.

## Segurança e invariantes

- ferramenta anotada como somente leitura, não destrutiva e de mundo fechado;
- somente identificadores conhecidos; traversal e caminhos são recusados pelo
  schema antes do serviço;
- sem Git, shell, rede externa, HTTP remoto, autoria, materiais ou promoção;
- servidor local efêmero da bancada continua preso a `127.0.0.1`;
- nenhuma regra de câmera, geometria ou revisão é duplicada no adaptador MCP;
- stdout permanece exclusivamente protocolar.

## Limpeza de Playwright e Vite

Browser, página e Vite fecham em sucesso, recusa, timeout, exceção e encerramento
do cliente. Falha de limpeza transforma a chamada em erro estruturado. O teste
deve comprovar ausência de processo, porta, listener, arquivo e diretório
residual após cada cenário.

## Testes consumidores

1. catálogo anuncia exatamente quatro ferramentas e os mesmos dois recursos;
2. cliente oficial valida o novo input/output schema;
3. uma chamada retorna uma mensagem e quatro imagens PNG decodificáveis, na
   ordem oficial, com assinatura, dimensões, hashes e métricas coerentes;
4. Casos 1 e 2 preservam peça, enquadramento e quatro vistas do serviço atual;
5. snapshot do workspace prova zero escrita em sucesso e falha;
6. entradas inválidas e `../segredo` são recusadas;
7. payload, timeout, erro de página, screenshot e fechamento são forçados por
   dependências injetadas e deixam recursos limpos;
8. stdout não recebe logs e o processo stdio encerra limpo;
9. um agente consumidor zerado conclui os Casos 1 e 2 com no máximo 2 recursos,
   8 chamadas de ferramentas, zero falhas inesperadas e zero fallback externo.

## Métricas

Registrar por caso:

- recursos e ferramentas chamados;
- bytes de `tools/list`, manifesto, cada PNG e resposta total;
- duração de inicialização, captura e serialização;
- falhas, repetições, fallback e resíduos de processo/arquivo;
- equivalência das quatro vistas e divergências permitidas;
- contexto total comparado à linha-base da Fatia 1A.

## Gates

```text
npm run mcp:check
npm test
npm run typecheck
npm run build
npm run mapa:check
npm run docs:toc:check
npm run docs:links:check
npm run planos:check
git diff --check
```

## Critérios de saída

- exatamente uma nova ferramenta e nenhuma capacidade de escrita;
- quatro imagens oficiais entregues por caso dentro dos limites;
- zero arquivo persistido e zero recurso vivo ao final;
- paridade com o serviço existente e diagnósticos estruturados;
- Casos 1 e 2 concluídos pelo consumidor sem fallback;
- benefício mensurável de contexto ou falhas em relação ao fluxo externo.

## Paradas obrigatórias

- parar se for necessário duplicar a navegação ou as regras da bancada;
- parar se o modo MCP precisar escrever PNG temporário ou revisão;
- parar se payload ou timeout exigirem reduzir silenciosamente a prova oficial;
- parar se Playwright/Vite não fecharem de modo determinístico;
- parar se surgir uma segunda ferramenta visual para completar o mesmo recorte;
- parar se autoria, materiais, Git ou promoção entrarem como dependência.

## Excluído

Crítica automática, promoção, persistência de revisão, autoria, materiais,
comparação visual inteligente, prompts MCP, Git, HTTP remoto, autenticação,
mudanças de câmera, geometria ou produto cliente.

## Encerramento

Ao concluir ou cancelar, registrar métricas reais, resultados dos Casos 1 e 2,
limites observados, gates, decisão do programa e candidatos devolvidos ao
painel. Nenhuma etapa posterior abre automaticamente.
