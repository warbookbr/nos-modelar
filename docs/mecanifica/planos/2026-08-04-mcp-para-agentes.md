# MCP para agentes — reduzir contexto sem perder rastreabilidade

**Estado:** concluído

**Responsável:** a definir

**Repositório e base:** `warbook`, `8ccfaf2f991437b297f2e3757e90b290c023a9ef`

**Arquivos reservados nesta fatia:** `tools/mcp/`,
`tools/mecanifica/descrever-peca.mjs`, `package.json`, `package-lock.json`,
`.github/workflows/ci.yml` e este plano.
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
MCP apenas traduzem entrada, saída e transporte; o CI executa ambos os gates.

### Perfis e catálogo

Cada perfil tem catálogo próprio e somente as ferramentas necessárias.

**`revisao` — Fatia 1A anuncia exatamente 3 ferramentas:**

1. `descrever_peca`
2. `validar_pacote`
3. `comparar_revisoes`

Renderização, promoção e crítica permanecem capacidades futuras e não são
anunciadas neste perfil.

**`autoria` — somente no segundo degrau:** preparação e escrita controlada de
pacotes, com dry-run, confinamento ao repositório, escrita atômica e sem
sobrescrita. A edição da receita JavaScript pode continuar inicialmente com o
agente de código.

**`materiais` — posterior:** só após alinhar metalness/metalicidade. Deve haver
contrato canônico mínimo antes das ferramentas, provas controladas de material
e comparação determinística; o perfil terá no máximo 4 ou 5 ferramentas.

**`coordenacao` — futuro e separado:** não inclui Git, commit, push, PR ou
merge.

### Recursos iniciais da Fatia 1A

- `mecanifica://estado`
- `mecanifica://capacidades/modelagem`

Os demais recursos continuam planejados, mas não são registrados pelo piloto.

Não criar prompts MCP no primeiro piloto.

## Degrau 1 — piloto local de revisão

Usar transporte stdio e `@modelcontextprotocol/server@2.0.0`, linha v2 estável
oficial, fixado em versão exata. O Node do projeto atende ao requisito `>=20`.
O servidor é um adaptador fino: chama diretamente os serviços existentes de
descrição, validação e comparação, sem executar CLI ao importar. Logs comuns
não ocupam stdout: somente o protocolo MCP pode usar essa saída.

As respostas devem conter `structuredContent`, mensagens curtas e links para
recursos. Reproduzir os Casos 1 e 2 pelo MCP, preservando assinaturas,
contagens, revisão e quatro vistas. Não exigir igualdade byte a byte dos PNGs.
Anunciar somente as três ferramentas da Fatia 1A.

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

## Fatia 1A — base local somente leitura

- servidor importável em `tools/mcp/servidor.mjs`, com stdio apenas no entrypoint;
- perfil `revisao` em `tools/mcp/perfis/revisao.mjs`;
- contratos de entrada/saída e recursos em `tools/mcp/contratos.mjs`;
- três ferramentas, dois recursos, sem prompts, escrita, shell, Git ou HTTP;
- testes reais de handshake, catálogo, chamadas, confinamento, schemas, stderr
  e encerramento;
- gate `npm run mcp:check` executado localmente e no CI.

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

Essa fatia preparatória foi concluída antes da Fatia 1A.

### Saída da fatia preparatória

O serviço compartilhado não conhece CLI nem MCP. A CLI continua responsável por
argumentos, streams e código de saída; a bancada devolve caminhos, métricas,
vistas e falhas estruturadas, com logger opcional. A revisão chama o serviço
diretamente e não encaminha stdout comum.

### Gate da fatia

Importações não produzem saída nem iniciam Vite, Playwright ou escrita; funções
reutilizáveis não encerram o processo. A CLI mantém diagnósticos, streams,
códigos, revisão, tentativas, promoção atômica e assinaturas; falhas fecham
navegador e servidor, e `git diff --check` permanece limpo.

## Testes da Fatia 1A

- testes unitários do núcleo;
- contrato dos schemas MCP e catálogo exato do perfil;
- paridade dos serviços existentes versus structuredContent MCP;
- handshake, initialize/initialized e smoke test real de stdio;
- stdout exclusivamente protocolar, stderr separado e encerramento limpo;
- confinamento de caminhos e escrita atômica;
- integração Playwright somente no caminho de renderização;
- gate `npm run mcp:check` no CI.

## Métricas e evidências

Linha-base registrada: `tools/list` 11.824 B; `resources/list` 362 B;
`descrever_peca` 5.464 B; `validar_pacote` 320 B; `comparar_revisoes` 874 B.
Comparar contexto, falhas, fallbacks, tempo, assinaturas, contagens, revisão,
quatro vistas e divergências visuais permitidas contra os Casos 1 e 2.

## Paradas obrigatórias

- parar se o adaptador duplicar regras do núcleo;
- parar se um perfil exceder 6 ferramentas sem justificativa;
- parar se não houver redução mensurável de contexto;
- não avançar ao servidor remoto antes da validação local;
- não misturar contrato de materiais com o piloto inicial.

## Incluído e excluído

Inclui a base local somente leitura da Fatia 1A, seus recursos, perfil, testes,
gate e critérios acima. Exclui autoria, materiais, prompts, mudanças em skills,
GitHub, servidor remoto e qualquer alteração de comportamento, geometria,
material ou câmera.

## Encerramento

A Fatia 1A foi aprovada e encerrada em 2026-08-05. O registro canônico das
medições e limites está em
`docs/mecanifica/planos/mcp/concluidos/01-fatia-1a-piloto-leitura.md`. A única
continuação autorizada é o plano ativo
`docs/mecanifica/planos/2026-08-05-mcp-fatia-1b-visual.md`; autoria, materiais,
Git e servidor remoto permanecem candidatos sem autorização de implementação.
