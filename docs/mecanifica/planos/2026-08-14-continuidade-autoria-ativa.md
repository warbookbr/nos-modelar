# Continuidade de autoria ativa

**Estado:** concluído

**Responsável:** Codex (análise, implementação e prova)

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/mcp-montagens-leitura` em `40d7206`.

## Problema observado

A autoria transacional já publica revisões imutáveis de montagens e receitas,
mas o catálogo de leitura continua resolvendo apenas os JSONs estáticos do
host. Uma revisão publicada pode ser observada pela ferramenta específica de
autoria, porém não alimenta `descrever_montagem`, vistas, relações nem a
revalidação de propostas posteriores. Além disso, o perfil `autoria` substitui
as ferramentas de leitura pelas de escrita.

O resultado é uma quebra entre criar, observar, corrigir, reutilizar e continuar
em outra sessão: a revisão existe, mas não se torna o estado operacional do
agente.

## Resultado verificável

Uma revisão ativa autorizada de peça ou montagem sobrepõe somente sua fonte
estática correspondente no catálogo. Leitura, descrição, captura e revalidação
usam a mesma visão ativa. O perfil de autoria conserva todas as ferramentas de
leitura e acrescenta as ferramentas de escrita. Uma nova sessão com a mesma
configuração do host descobre as revisões ativas e resolve o resultado
publicado, sem receber caminhos locais.

## Hipótese

Fechar a continuidade do estado já produzido reduz mais atrito e risco para a
IA do que acrescentar uma nova operação geométrica isolada: elimina troca de
perfil, estado divergente e correções feitas sobre uma base obsoleta sem ampliar
o núcleo ou executar código do agente.

## Incluído

- provedores neutros de revisões ativas para receitas e montagens;
- sobreposição explícita no catálogo, com fallback para a base estática quando
  não existe revisão ativa;
- resolução da raiz, referências recursivas e revalidação sobre a mesma visão;
- perfil MCP de autoria aditivo às ferramentas de leitura;
- recurso MCP que anuncia revisão e origem ativa por identidade semântica;
- prova caixa-preta de publicação, releitura na mesma sessão e continuidade em
  nova sessão;
- relatório priorizado das próximas melhorias grandes.

## Excluído

- mapa global ou descoberta implícita de dependências;
- edição automática de dependentes;
- publicação em `prototipos/fps/v3/pecas/`, geração de módulo JavaScript ou Git;
- alterações de geometria, materiais, câmera, relações ou núcleo procedural;
- rollback, variantes simultâneas, HTTP e coordenação entre hosts.

## Invariantes

1. Somente IDs autorizados pelo host podem receber sobreposição.
2. Ausência de revisão ativa usa a fonte estática; revisão ativa inválida falha
   fechada e nunca é ocultada por fallback.
3. A revisão imutável continua sendo a única fonte da sobreposição; nenhum
   snapshot parcial é consumido.
4. Leitura e autoria usam os mesmos carregadores durante toda operação.
5. Caminhos locais, bytes privados e detalhes do repositório não cruzam o MCP.
6. O núcleo continua neutro, sem MCP, Three.js ou domínio automotivo.

## Filtro Agent-First

- **USAR DIRETO:** repositório imutável, resolvedor e catálogo explícito.
- **ENVOLVER:** carregadores do catálogo com provedores de revisão ativa.
- **REFATORAR:** composição dos perfis MCP, hoje mutuamente exclusiva.
- **ADIAR:** mapa global, edição automática de dependentes, rollback e variantes.

## Fatias

- **R00 — análise e contrato:** registrar o ciclo quebrado, prioridades e
  invariantes.
- **R01 — sobreposição neutra:** ler revisões ativas autorizadas e compor os
  carregadores sem alterar a base estática.
- **R02 — catálogo único:** usar a sobreposição em raízes, referências e
  revalidação, com testes de fallback e falha fechada.
- **R03 — MCP contínuo:** tornar autoria aditiva, anunciar estado ativo e usar o
  mesmo catálogo em todas as ferramentas.
- **R04 — prova caixa-preta:** publicar receita e montagem, reler por ferramentas
  comuns e repetir em processo novo.
- **R05 — fechamento:** relatório, documentação, gates completos, decisão e
  continuidade.

## Gates e evidências

- testes unitários dos provedores e catálogo;
- revisão inexistente mantém exatamente o resultado estático;
- revisão ativa inválida não cai silenciosamente para o estático;
- `descrever_montagem` e revalidação refletem a peça ativa;
- montagem ativa é resolvida por ferramenta comum;
- perfil de autoria anuncia leitura e escrita juntas;
- consumidor MCP fecha publicação → leitura → nova sessão sem paths;
- gates completos de `docs/mecanifica/INDEX.md`.

## Riscos e parada

- Parar se a sobreposição exigir mutar o catálogo ou o snapshot publicado.
- Parar se houver ambiguidade entre identidade semântica e nome de arquivo; a
  revisão é vinculada ao ID, e o arquivo estático permanece detalhe do host.
- Não mascarar corrupção de revisão ativa com fallback.
- Não chamar catálogo explícito de mapa global.

## Encerramento

R00–R05 foram concluídos. O catálogo ganhou provedores de revisão ativa com
fallback exato e falha fechada; o MCP v4 tornou autoria aditiva, anunciou o
estado em `mecanifica://autoria` e usou a mesma visão em leitura, relações,
vistas e revalidação.

A prova caixa-preta publicou e releu uma montagem alterada pela ferramenta
comum. Em seguida publicou uma receita com geometria diferente, verificou sua
caixa pela montagem e abriu outro processo, que observou a mesma revisão e a
mesma medida. Os gates completos fecharam com 71 arquivos de teste, 1.221 testes
aprovados e 2 ignorados; typecheck, build, bancada, guardas, inventários,
documentação, planos, exportação e criação passaram. **Decisão: aprovar.**
