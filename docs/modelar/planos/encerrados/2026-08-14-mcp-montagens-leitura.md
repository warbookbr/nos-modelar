# MCP — leitura e auditoria de montagens

**Estado:** concluído

**Responsável:** GPT (arquitetura, execução e revisão)

**Repositório e base:** `warbookbr/nos-mecanifica`, `main` após PR #43
(`bd92220`).

## Problema observado

Contexto estrutural, impacto local, roteiro de revalidação, catálogo explícito
e captura visual de montagem existem como serviços ou CLIs internos. Um agente
consumidor do MCP ainda não consegue descobrir uma montagem autorizada nem usar
essas capacidades sem conhecer caminhos e detalhes do repositório.

## Objetivo verificável

Expor pelo MCP somente leitura um catálogo explicitamente configurado de
montagens e ferramentas para descrição, revalidação assistida, catálogo entre
raízes escolhidas e vistas visuais. Provar o fluxo por um cliente MCP caixa-preta
que descobre IDs, consulta, renderiza e não recebe nem fornece caminhos locais.

## Hipótese

Os serviços internos já são suficientemente estáveis para ganhar uma porta MCP
fina. A única costura nova necessária é separar a configuração confiável do
servidor — que conhece raízes confinadas — da entrada do agente, que usa apenas
IDs e caminhos semânticos de instâncias.

## Escopo e arquivos

- `tools/mcp/catalogo-montagens.mjs` para configuração explícita e leitura
  confinada, sem varredura implícita;
- contratos, perfil e servidor em `tools/mcp/`;
- captura reutilizável em memória extraída de `olhar-montagem.mjs`;
- testes MCP unitários e caixa-preta;
- fontes de verdade e painel MCP afetados por esta fatia.

## Invariantes

1. Cliente MCP usa IDs semânticos; não envia nem recebe caminhos do sistema.
2. O catálogo contém apenas raízes declaradas na configuração confiável; não
   varre repositório, workspace ou diretórios vizinhos.
3. Todas as ferramentas são somente leitura, sem shell, Git ou publicação.
4. Imagem continua evidência, não prova colisão, folga ou validade global.
5. Roteiro informa cobertura e pendências; não corrige nem chama a montagem de
   válida depois de uma alteração ainda não executada.
6. O núcleo procedural não importa MCP ou Three.js e não ganha domínio
   automotivo.
7. A ausência de escrita neste recorte é um limite temporal, não uma proibição:
   materialização e escrita MCP podem abrir quando seus gates próprios forem
   definidos e provados.

## Fatias

1. **R00 — concluído:** registrar o plano, corrigir estado documental e definir a
   configuração explícita do catálogo.
2. **R01 — concluído:** expor descoberta e descrição de montagem por ID, com
   confinamento, schema público e erros acionáveis.
3. **R02 — concluído:** expor roteiro de revalidação e catálogo entre raízes
   explicitamente escolhidas pelo agente.
4. **R03 — concluído:** extrair captura visual em memória e transportar vistas
   solicitadas por MCP com limites de payload e enquadramento.
5. **R04 — concluído:** executar consumo caixa-preta, medir respostas, rodar os
   gates completos, atualizar contratos e decidir o próximo recorte.

## Provas obrigatórias

1. Um cliente descobre montagens pelo recurso antes de chamar ferramentas.
2. Entrada inválida, ID ausente, traversal e configuração insegura falham sem
   revelar caminho local.
3. Descrição MCP mantém paridade com o serviço puro e resposta determinística.
4. Roteiro distingue direto, indireto, executável e pendente; catálogo só inclui
   as raízes pedidas.
5. Captura devolve imagens em memória, respeita limites e não cria arquivos.
6. `tools/list`, recursos e respostas não expõem escrita nem caminhos de
   runtime.
7. `npm test`, `npm run typecheck`, `npm run build` e os gates do índice passam.

## Fora do recorte

- escrita, materialização no workspace, Git, API ou servidor HTTP;
- descoberta implícita de montagens;
- colisão geral, solver, cinemática ou revalidação automática;
- alteração de geometria, materiais, câmera publicada ou receitas.

## Critérios de parada e encerramento

Parar se a porta exigir caminhos fornecidos pelo agente, busca implícita no
disco, duplicação de regra do resolvedor ou escrita para transportar imagens.
Concluir somente com cliente caixa-preta, documentação atualizada, plano sem
itens ativos e decisão explícita entre: avançar para materialização/autoria,
corrigir a leitura ou interromper a exposição MCP.

## Fechamento

A leitura de montagens por MCP foi aprovada. O contrato público v3 anuncia o
recurso `mecanifica://montagens` e quatro ferramentas somente leitura. O host
configura raízes e referências; o agente usa apenas IDs e caminhos semânticos.
Catálogo ausente mantém as ferramentas de peça funcionais e anuncia lista vazia.

O cliente caixa-preta descobriu as duas raízes de prova, descreveu montagem,
derivou revalidação, catalogou usos e recebeu duas vistas PNG em memória sem
alterar o worktree. As respostas textuais medidas ocuparam 1.728 bytes para
descrição, 1.049 para revalidação e 984 para catálogo. As vistas isométrica e
direita ficaram enquadradas e sem corte.

`npm test` passou com 66 arquivos, 1.190 testes aprovados e 2 ignorados. A prova
visual MCP passou com 41/41. Typecheck, build, porteiro 7/7, exportação,
gabaritos, guardas de portas/câmera/par, mapa, links, planos e criação de
`_viga` passaram. A varredura geométrica A-33 manteve as mesmas 147 combinações
e asserções, mas recebeu orçamento explícito de 15 s após exceder repetidamente
o default de 5 s sob carga.

**Decisão:** avançar, em plano posterior, para materialização/autoria segura.
Escrita MCP não está proibida: ela pode entrar quando o fluxo interno provar
pré-validação, comparação com a revisão observada, revalidação e publicação sem
estado parcial.
