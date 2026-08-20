# Validação integrada da Mecanifica — valor Agent-First

**Estado:** ativo

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, `aef33b5`

## Problema observado

A Mecanifica já provou ferramentas isoladas: autoria declarativa, execução
procedural, montagem persistida, descoberta, revisão, revalidação, prancha e
crítica visual. Ainda não provou que o conjunto permite a um agente criar e
corrigir um objeto mecânico melhor do que uma linha de base equivalente. A R4
do Motor de Prancha confirma o limite: a prancha é consistente, mas não há uma
malha comparável para demonstrar seu efeito.

## Resultado

Um ensaio comparativo, reproduzível e de escopo pequeno decide se o fluxo
integrado reduz correções ou contexto e aumenta qualidade verificável de uma
montagem mecânica visualmente legível. O resultado final será `aprovar`,
`corrigir` ou `interromper`; nenhum resultado é presumido.

## Hipótese e comparador

Hipótese: para o mesmo briefing e orçamento, o fluxo oficial integrado torna
mais fácil produzir e corrigir uma trava articulada de segurança composta por
base, lingueta e pino, sem perder determinismo, identidade semântica ou
auditabilidade.

A linha de base usa o mesmo motor e o mesmo briefing, mas sem prancha
contratada, contexto/revisão de montagem, descoberta, impacto ou revalidação.
Ela deve registrar as decisões e correções manualmente. O tratamento integrado
usa somente portas e documentação oficiais, sem conhecimento da implementação.
Não se compara agentes, máquinas ou orçamentos diferentes.

## Filtro Agent-First

| Interface | Decisão | Motivo |
| --- | --- | --- |
| receita declarativa e executor | USAR DIRETO | preservam autoria auditável e determinística |
| prancha, contrato de autoria e comparação | USAR DIRETO | fixam alvo e bloqueiam falsa precisão |
| descoberta de capacidades | USAR DIRETO | reduz consulta a código e improviso de operação |
| montagem persistida, revisão e revalidação | USAR DIRETO | registram composição, impacto e diagnóstico |
| bancada e crítico visual | ENVOLVER | leitura visual é evidência, não aprovador automático |
| cage, Catmull-Clark e P2 | ADIAR | não são necessários para uma trava de três peças |
| operação ou ferramenta nova | ADIAR | só entra após defeito reproduzível que bloqueie o ensaio |

## Incluído

- briefing neutro, prancha ou bloqueio explícito, três peças e uma montagem
  privada para cada tratamento;
- execução por autor sem histórico da implementação e revisão por papel
  separado, sem raciocínio nem receita do autor;
- uma alteração local semântica no mesmo componente em ambos os tratamentos;
- medidas de contexto consultado, rodadas de correção, alertas, tempo de
  execução, identidade preservada, impacto e revalidação;
- inspeção visual dos enquadramentos necessários e sobreposição quando houver
  alvo ortográfico aplicável.

## Excluído

- promoção de geometria privada ao catálogo homologado;
- movimento contínuo, solver, materiais genéricos, carroceria, cage e P2;
- comparar gosto pessoal, velocidade de digitação ou uma IA com outra;
- implementar capacidade nova antes de uma falha medida no ensaio.

## Gates de saída

1. briefing, orçamento, ambiente e critérios são idênticos e registrados antes
   dos dois tratamentos;
2. ambos produzem artefatos determinísticos, com identidades semânticas e
   relatório de revisão preservados;
3. o revisor encontra mutações injetadas sem conhecer a autoria;
4. a correção local conserva a identidade e aciona apenas os dependentes
   demonstráveis;
5. a comparação apresenta pelo menos uma métrica vinculante de qualidade e uma
   de custo de trabalho, sem regressão silenciosa nas demais;
6. se não houver ganho, o relatório atribui a causa e decide corrigir ou
   interromper, sem criar ferramenta por inércia;
7. gates gerais de documentação e os gates proporcionais ao artefato passam.

## Fatias

### R0 — protocolo e linha de base

Fixar briefing, rubrica visual, orçamento, formato de telemetria e mutações
antes de criar a peça. Executar o tratamento sem fluxo integrado e preservar
artefatos, decisões e métricas como linha de base.

### R1 — execução integrada cega

Um autor que recebe somente a documentação e as portas públicas cria a mesma
trava; o revisor recebe apenas os artefatos necessários à crítica e à revisão.
Medir contexto, correções e diagnósticos sem consultar a receita do autor.

### R2 — correção e revalidação

Aplicar a mesma alteração local semântica nos dois tratamentos. Verificar a
identidade, o alcance do impacto, a revalidação e a qualidade final.

### R3 — decisão e continuidade

Publicar a matriz comparativa, registrar o veredito e consolidar somente o que
o ensaio demonstrar. Uma lacuna concreta pode abrir plano próprio; ausência de
ganho encerra ou corrige o recorte, sem expansão automática.

## Riscos e parada

- Se a trava exigir cinemática, booleana robusta ou operação ausente, o ensaio
  reduz o objeto ou registra a lacuna; não amplia o núcleo silenciosamente.
- Se os tratamentos não forem equivalentes, a rodada é inválida e reinicia em
  R0; diferença de contexto não é evidência de produto.
- Se a rubrica visual não puder separar duas variantes concretas, ela não é
  gate e deve ser corrigida antes de R1.
- Se a comparação não provar ganho, o resultado correto é `corrigir` ou
  `interromper`; não é promover a infraestrutura já existente.

## Fechamento

Preencher ao encerrar com o veredito, o commit, os artefatos comparados, as
métricas, os gates e as capacidades devolvidas ao backlog.
