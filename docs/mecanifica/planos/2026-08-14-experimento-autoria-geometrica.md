# Experimento de autoria geométrica do zero

**Estado:** concluído

**Responsável:** GPT (arquitetura, execução e revisão)

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/mcp-montagens-leitura` em `d6ab587`.

## Problema observado

A infraestrutura já permite autoria segura de montagem, mas ainda não há prova
recente de uma IA criando receitas novas, expondo suas interfaces e corrigindo
uma alteração dentro do mesmo ciclo de composição.

## Resultado verificável

Três receitas confinadas — suporte de eixo, eixo-guia e anel-tampa — passam por
descrição estrita e vistas; uma montagem v3 declara três relações; uma alteração
do eixo é recusada pela relação direcional, corrigida e publicada no repositório
autorizado por MCP sem caminho do consumidor.

## Filtro Agent-First

- **USAR DIRETO:** receitas determinísticas, partes, portas, relações v2/v3,
  montagem persistida, captura e autoria de montagem.
- **ENVOLVER:** crítica visual, catálogo explícito e roteiro de revalidação.
- **REFATORAR:** somente atrito reproduzível que bloqueie o ciclo completo.
- **ADIAR:** receita via MCP, novas relações, materiais, núcleo, solver, mapa
  global, publicação de catálogo e domínio automotivo.

## Incluído

- fixture isolada em `autoria-assistida/experimentos/autoria-geometrica-do-zero`;
- três receitas, montagem persistida e executor reproduzível;
- descrição, vistas e inspeção em dois enquadramentos;
- alteração deliberadamente inválida, correção, impacto e autoria MCP;
- relatório de evidências, limites e decisão final.

## Excluído

- mudar núcleo, relações existentes, bancada, câmera, materiais ou catálogo
  publicado;
- transformar o experimento em Caso 3 de homologação;
- inferir dependências fora das raízes configuradas;
- alegar colisão geral a partir de separação direcional.

## Invariantes

1. Todas as identidades são semânticas e estáveis.
2. As receitas não entram em `prototipos/procedural/v3/pecas/`.
3. O consumidor MCP não fornece nem recebe caminhos locais.
4. Alteração inválida não é ativada; correção usa nova confirmação.
5. A montagem reutiliza os contratos v1/v2/v3 sem extensão ad hoc.

## Fatias

1. Preparar fixture, receitas mínimas e baseline estrito.
2. Resolver montagem, registrar relações e capturar duas vistas.
3. Aumentar o eixo, provar recusa direcional e impacto declarado.
4. Corrigir, publicar por autoria MCP e reler a revisão.
5. Rodar gates, atualizar documentos e decidir `aprovar`, `corrigir` ou
   `interromper`.

## Gates de saída

1. Três peças sem órfãos, faces sem parte ou portas instáveis.
2. Base satisfaz três relações; alteração recusa só a relação direcional.
3. Duas vistas da montagem são capturadas e lidas antes e depois da alteração.
4. Cliente MCP caixa-preta aplica somente a correção confirmada.
5. Testes focados, `npm test`, typecheck, build e gates de `INDEX.md` passam.
6. Relatório registra bytes, duração, evidência visual e limites.

## Riscos e parada

- Parar se uma relação exigida não puder ser expressa pelos contratos atuais.
- Parar se a montagem exigir publicar receitas no catálogo público para resolver.
- Não corrigir núcleo ou câmera para satisfazer a fixture; registrar o atrito.
- Interromper autoria MCP se o ciclo exigir caminho, shell ou regra duplicada.

## Fechamento

As receitas passaram sem órfãos; a base satisfez 3/3 relações e a alteração do
eixo recusou somente a separação direcional (−0,010 m). Duas vistas reais foram
válidas. **Decisão: corrigir.** MCP materializa montagens, não receitas; simular
correção geométrica pela montagem seria prova falsa. Próximo recorte: receitas.
