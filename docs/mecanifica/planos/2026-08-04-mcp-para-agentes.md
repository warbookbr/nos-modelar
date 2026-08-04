# MCP para agentes — reduzir contexto sem perder rastreabilidade

**Estado:** ativo

**Responsável:** a definir

**Repositório e base:** `warbook`, `043081bab5bbeee49f154e7ae7c012c6108d0e3b`

**Arquivos reservados nesta fatia:**

- `tools/mecanifica/descrever-peca.mjs`
- `tools/mecanifica/olhar-bancada.mjs`
- `tools/modelagem/revisar-pacote.mjs`
- `tools/mecanifica/mcp-degrau-1-preparacao.test.mjs`
- `tools/modelagem/revisar-pacote.test.mjs`, este plano, `planos/README.md` e `planos/BACKLOG.md`
## Problema observado

O Caso 1 exigiu, antes da primeira fonte, 10 documentos, 3 guias, 6 exemplos e
2 trechos de ferramenta. Esse custo aumenta tentativas e ambiguidade e torna
difícil provar qual contrato e evidência foram usados. O objetivo é diminuir
contexto, tentativas e ambiguidade para agentes, preservando rastreabilidade.

## Resultado e hipótese

Um núcleo compartilhado, exposto por CLI e MCP, deve permitir revisão normal com
até 3 recursos lidos, sem fallback para shell e com as mesmas assinaturas e
evidências do CLI. A hipótese só autoriza ampliação se o piloto medir redução de
contexto ou de falhas contra a linha-base.

## Invariantes e fronteiras

- MCP não substitui CI nem GitHub.
- As CLIs permanecem para CI, depuração e uso humano.
- Adaptadores não duplicam regras de negócio: toda regra fica no núcleo
  compartilhado.
- Cada execução/configuração anuncia somente o perfil necessário. Separar
  arquivos sem restringir `tools/list` não é modularização.
- O piloto não cria contrato novo de materiais, não edita fonte, não usa Git,
  servidor remoto nem sobrescreve tentativas ou revisões.
- O produto continua neutro; não entram Three.js, domínio automotivo ou
  capacidades de produto no núcleo.

## Arquitetura proposta

```text
núcleo compartilhado → adaptadores CLI e MCP → CI testando o mesmo núcleo
```

O núcleo fornece serviços e resultados/erros estruturados. A CLI e o servidor
MCP apenas traduzem entrada, saída e transporte. O CI continua executando as
CLIs e, futuramente, `npm run mcp:check`, sempre contra o mesmo núcleo.

### Perfis e catálogo

Cada perfil tem catálogo próprio e somente as ferramentas necessárias.

**`revisao` — no máximo 6 ferramentas:**

1. `descrever_peca`
2. `validar_pacote`
3. `renderizar_vistas`
4. `promover_revisao`
5. `comparar_revisoes`
6. `validar_critica`

**`autoria` — somente no segundo degrau:** preparação e escrita controlada de
pacotes, com dry-run, confinamento ao repositório, escrita atômica e sem
sobrescrita. A edição da receita JavaScript pode continuar inicialmente com o
agente de código.

**`materiais` — posterior:** só após alinhar metalness/metalicidade. Deve haver
contrato canônico mínimo antes das ferramentas, provas controladas de material
e comparação determinística; o perfil terá no máximo 4 ou 5 ferramentas.

**`coordenacao` — futuro e separado:** não inclui Git, commit, push, PR ou
merge.

### Recursos planejados

- `mecanifica://estado`
- `mecanifica://capacidades/modelagem`
- `mecanifica://pecas/{nome}/descricao`
- `mecanifica://pacotes/{id}/briefing`
- `mecanifica://pacotes/{id}/referencias`
- `mecanifica://revisoes/{pacote}/{revisao}`
- `mecanifica://revisoes/{pacote}/{revisao}/vistas/{vista}`
- `mecanifica://guias/{id}`

Não criar prompts MCP no primeiro piloto.

## Degrau 1 — piloto local de revisão

Usar transporte stdio e o SDK oficial atual, fixado em versão exata na
implementação. Extrair serviços reutilizáveis de `descrever-peca` e
`olhar-bancada`, sem executar CLI ao importar. O servidor não pode emitir logs
comuns em stdout: somente o protocolo MCP pode ocupar stdout.

As respostas devem conter `structuredContent`, mensagens curtas e links para
recursos. Reproduzir os Casos 1 e 2 pelo MCP, preservando assinaturas,
contagens, revisão e quatro vistas. Não exigir igualdade byte a byte dos PNGs.
Anunciar no máximo 6 ferramentas.

### Critérios de saída do Degrau 1

- no máximo 3 recursos lidos antes da primeira revisão normal;
- zero fallback para shell no fluxo coberto;
- nenhuma leitura do código de implementação para a revisão normal;
- mesmas assinaturas e evidências do fluxo CLI;
- erros estruturados e acionáveis;
- stdout contendo exclusivamente o protocolo MCP;
- caminhos confinados e ausência de sobrescrita;
- benefício mensurável contra a linha-base do Caso 1.

## Degrau 2 — autoria e materiais

Só começa se o piloto provar redução de contexto ou falhas. Inclui escrita
controlada de pacotes e revisões, contrato canônico de materiais antes do
perfil `materiais`, testes de round-trip e renders diferenciais. Guias extensos
passam a ser recursos sob demanda. Skills de agentes só viram roteadores
curtos após paridade comprovada. Testar em famílias distintas de peças.

## Degrau 3 — distribuição

Streamable HTTP é opcional e posterior. O escopo de prova inclui autenticação,
isolamento por workspace, auditoria de operações e mais de um cliente/agente.
Servidor remoto é decisão separada: o produto atual não exige servidor próprio.

## Fatia preparatória do Degrau 1

- tornar `descrever-peca` e `olhar-bancada` importáveis sem executar CLI;
- substituir `process.exit` e logs diretos por resultados/erros estruturados;
- impedir que `revisarPacote` encaminhe stdout de subprocessos para o protocolo;
- chamar diretamente o serviço reutilizável da bancada quando a revisão padrão
  for executada, mantendo promoção atômica, tentativas recusadas e artefatos;
- provar importação silenciosa, limpeza de recursos, resultados estruturados e
  paridade das CLIs nos testes focados e gates completos.
- mapear, para correção durante a implementação, a referência documental
  incorreta a `adaptarThree.ts`, os exemplos removidos ainda citados pela skill
  `criar-peca` e a classificação ambígua de `peca`/`porteiro` como fluxo atual.

Essas correções não fazem parte desta fatia.

### Saída desta fatia

O serviço compartilhado não conhece CLI nem MCP. A CLI continua responsável por
argumentos, streams e código de saída; a bancada devolve caminhos, métricas,
vistas e falhas estruturadas, com logger opcional. A revisão chama o serviço
diretamente e não encaminha stdout comum. Não há schema MCP, servidor, recurso,
dependência ou contrato de pacote novo.

### Gate da fatia

Importações não produzem saída nem iniciam Vite, Playwright ou escrita; funções
reutilizáveis não encerram o processo. A CLI mantém diagnósticos, streams,
códigos, revisão, tentativas, promoção atômica e assinaturas; falhas fecham
navegador e servidor, e `git diff --check` permanece limpo.

## Testes planejados

- testes unitários do núcleo;
- contrato dos schemas MCP;
- snapshot do catálogo de ferramentas por perfil;
- paridade CLI versus MCP;
- smoke test real de stdio;
- teste de stdout exclusivamente protocolar;
- confinamento de caminhos e escrita atômica;
- integração Playwright somente no caminho de renderização;
- futuro `npm run mcp:check` no CI.

## Métricas e evidências

Medir documentos/recursos lidos, caracteres ou tokens carregados, chamadas
malsucedidas, fallbacks para CLI/shell, tempo até o primeiro pacote ou revisão
válida, quantidade e causa das iterações, tamanho do catálogo e dos schemas por
perfil e percentual de erros estruturados acionáveis. Comparar cada execução
com a linha-base do Caso 1 e registrar Caso 2, assinaturas, contagens, revisão,
quatro vistas e divergências visuais permitidas.

## Paradas obrigatórias

- parar se o adaptador duplicar regras do núcleo;
- parar se um perfil exceder 6 ferramentas sem justificativa;
- parar se não houver redução mensurável de contexto;
- não avançar ao servidor remoto antes da validação local;
- não misturar contrato de materiais com o piloto inicial.

## Incluído e excluído

Inclui contrato documental, piloto local de revisão, recursos, perfis, métricas,
testes e critérios acima. Exclui implementação MCP nesta tarefa, autoria,
materiais, prompts, mudanças em skills, dependências, scripts npm, GitHub,
servidor remoto e qualquer alteração de comportamento, geometria, material ou
câmera.

## Encerramento

O plano está ativo somente para esta fatia preparatória, com escopo e arquivos
reservados acima. O próximo degrau só começa após evidências do piloto local,
redução mensurável e decisão registrada; ao concluir ou cancelar, registrar
resultado, gates, medições e candidatos devolvidos ao backlog.
