# Materialização e autoria segura de montagens

**Estado:** ativo

**Responsável:** GPT (arquitetura, execução e revisão)

**Repositório e base:** `warbookbr/nos-mecanifica`, branch do PR #44 em
`e169594`.

## Problema observado

A Mecanifica já preserva objetos e commits de autoria imutáveis, resolve
montagens v1/v2/v3, deriva impacto e revalidação, captura vistas e oferece essa
leitura por MCP. Ainda não existe uma promoção segura da revisão observada para
um workspace consumível: alterar um arquivo mutável após comparar seu hash
deixa corrida entre comparação e troca; publicar vários arquivos diretamente
pode expor estado parcial; e a porta MCP ainda não consegue completar o ciclo.

## Resultado verificável

Uma IA poderá planejar, inspecionar e aplicar a criação ou alteração de uma
montagem por ID semântico em um workspace local autorizado. A aplicação usará
exatamente os bytes confirmados, recusará revisão-base desatualizada, executará
as revalidações cobertas e só tornará visível uma materialização completa. O
MCP exporá o mesmo serviço quando os gates internos fecharem neste plano.

## Decisão de materialização a provar

O recorte parte de snapshots imutáveis e uma transição atômica de visibilidade,
sem sobrescrever um caminho de trabalho mutável:

1. o conteúdo canônico e o commit candidato entram no repositório imutável;
2. todos os arquivos do snapshot são gravados, sincronizados e validados sob o
   hash do commit, ainda invisíveis para leitores oficiais;
3. uma transição completa liga `pai observado → commit candidato`;
4. a transição é publicada por hard link em destino determinístico e
   inexistente, no mesmo filesystem;
5. somente uma transição pode vencer para cada pai; concorrente perde com
   `revisao-desatualizada`, sem sobrescrever o vencedor;
6. leitores seguem apenas transições publicadas e nunca varrem temporários ou
   snapshots órfãos.

Uma queda antes da transição deixa apenas candidato órfão; após a transição,
todo o snapshot já existe. R01 deve provar o protocolo sob corrida e falha
injetada antes de ampliar a autoria. Se o filesystem não garantir `link`
atômico e exclusivo, parar e registrar outra fronteira de visibilidade; não
reduzir silenciosamente a garantia.

### Evidência executável de R00/R01

O serviço interno recalcula os bytes antes de escrever e publica objeto, commit
e transição por temporário sincronizado e hard link exclusivo. Ele recusa base
velha, deixa apenas um vencedor em cem concorrentes e reaplica esse vencedor
sem alterar bytes. Falha fechado para raiz, diretório, transição ou objeto
simbólico, JSON inválido, filesystem sem hard link e hash adulterado. A limpeza
valida todas as transições, simula por padrão e só remove órfãos com
`aplicar: true` explícito. As provas focadas cobrem criação, alteração, falha,
concorrência, idempotência, symlink interno, adulteração e limpeza. R00/R01
estão executáveis; autoria interna, impacto, revalidação, MCP e consumo
caixa-preta continuam nas fatias abaixo.

## Contrato da proposta

O planejamento é puro e recebe: montagem-alvo semântica, revisão observada ou
`null` na criação, documento v1/v2/v3 candidato, raízes autorizadas e política
de revalidação. Ele devolve:

- bytes canônicos, hashes e confirmação vinculada à versão do contrato;
- resumo estrutural da alteração, sem depender de índice ou UUID;
- dependentes diretos e indiretos dentro do catálogo explícito;
- verificações executáveis, pendentes e fora de cobertura;
- vistas necessárias e estado esperado do destino.

A aplicação recalcula o plano, compara a revisão ativa com a observada e recusa
confirmação divergente. Estados públicos mínimos: `planejado`, `aplicado`,
`revisao-desatualizada`, `revalidacao-recusada` e `falha-recuperavel`.

## Filtro Agent-First

- **USAR DIRETO:** montagem v1/v2/v3, resolvedor, descritor, catálogo explícito,
  impacto local, roteiro de revalidação, captura e revisões imutáveis.
- **ENVOLVER:** proposta, confirmação, snapshot, ativação e diagnóstico em um
  serviço neutro importável por CLI ou MCP.
- **REFATORAR:** repositório de autoria e catálogo apenas no necessário para
  distinguir candidato armazenado, revisão ativa e transição recusada.
- **ADIAR:** autoria de receita JavaScript, mapa global implícito, solver,
  colisão geral, materiais e distribuição remota.

Adiar receita neste primeiro piloto reduz a superfície executável; não cria
proibição arquitetural. A mesma decisão vale para MCP: ele entra na primeira
fatia em que reduzir custo do agente sem duplicar regras, inclusive neste plano.

## Incluído

- criar e alterar uma montagem persistida v1/v2/v3 em workspace gerenciado;
- importar uma montagem existente como revisão inicial sem mudar seus bytes;
- snapshots imutáveis, transições, resolução da revisão ativa e limpeza segura
  de órfãos não referenciados;
- planejamento sem escrita, confirmação determinística e comparação otimista;
- validação integral antes da ativação e revalidação dos usos encontrados nas
  raízes explicitamente autorizadas;
- inspeção da proposta em ao menos duas vistas quando composição, pose ou
  relação visual mudar;
- perfil MCP de autoria opt-in, fino e separado do perfil somente leitura, se
  os gates internos de R01–R03 passarem;
- fixture neutra e repetição curta no conjunto dianteiro como prova de campo.

## Excluído

- editar receitas de peça, o núcleo procedural, geometria, materiais ou câmera;
- sobrescrever diretamente arquivos mutáveis ou prometer atomicidade em
  filesystem de rede;
- inferir dependências fora do catálogo declarado;
- considerar imagem como prova de colisão, folga ou validade global;
- Git remoto, push, PR automático, HTTP, autenticação ou múltiplos hosts;
- corrigir automaticamente montagens dependentes ou resolver relações
  classificadas como pendentes.

## Invariantes

1. Identidade persistida é semântica; caminho de runtime, índice e UUID não são.
2. Cliente MCP não fornece nem recebe caminhos locais.
3. Planejamento não escreve; aplicação usa os mesmos bytes e regras.
4. Revisão-base divergente nunca é mesclada ou sobrescrita implicitamente.
5. Nenhum leitor oficial observa snapshot parcial.
6. Falha preserva a revisão ativa anterior e informa recuperação possível.
7. Ativação só ocorre depois das validações obrigatórias executáveis; pendência
   obrigatória bloqueia e aparece no diagnóstico.
8. Cobertura explícita não é chamada de mapa global ou validade completa.
9. MCP, CLI e leitores reutilizam o serviço interno; não duplicam validação.
10. V1/v2/v3 e catálogo MCP v1 permanecem compatíveis.

## Fatias

1. **R00 — abertura:** plano, baseline, fixture de criação/alteração e métricas
   de bytes, chamadas, duração e arquivos visíveis.
2. **R01 — visibilidade:** implementar e provar snapshot + transição por pai,
   leitura do ativo, corrida, queda, órfão, symlink e filesystem inadequado.
3. **R02 — autoria interna:** planejar, confirmar, validar e materializar a
   montagem; importar a base; diagnosticar criação, alteração e revisão velha.
4. **R03 — impacto e promoção:** resolver candidato sem ativá-lo, derivar usos,
   executar revalidação coberta, capturar vistas e condicionar a transição aos
   gates. Catálogo gerenciado passa a resolver a revisão ativa.
5. **R04 — porta MCP:** se R01–R03 passarem, expor planejamento, inspeção da
   proposta e aplicação em perfil opt-in. O host escolhe catálogo/workspace; o
   agente usa IDs, revisão observada, documento e confirmação.
6. **R05 — consumo real:** cliente caixa-preta descobre alvo, lê estado, planeja
   mudança, observa vistas, aplica, relê e comprova recusa de uma proposta
   concorrente sem shell ou correção manual.
7. **R06 — fechamento:** repetir o estudo de campo, rodar gates completos,
   atualizar contratos e decidir `aprovar`, `corrigir` ou `interromper`.

## Provas obrigatórias

1. Planejar não altera nenhum byte; confirmação muda com qualquer entrada
   semanticamente relevante.
2. O snapshot inteiro existe e passa pelos validadores antes da transição.
3. Falha em cada fronteira deixa a revisão anterior ativa e byte-idêntica.
4. Cem disputas a partir do mesmo pai produzem um vencedor visível e 99 recusas,
   nunca duas ativações nem estado parcial.
5. Reaplicar o vencedor não altera bytes; proposta de pai antigo é recusada.
6. Traversal, raiz externa, symlink e hash adulterado falham com código e ação.
7. V1/v2/v3 válidas continuam resolvendo; documento inválido nunca ativa.
8. Impacto declara a fronteira do catálogo e não inventa usos globais.
9. Revalidação distingue aprovado, falhou, pendente e fora de cobertura.
10. Duas vistas da proposta e duas do resultado ficam enquadradas e ligadas aos
    mesmos IDs semânticos quando houver efeito visual.
11. Perfil MCP de revisão continua sem escrita; autoria inexiste sem opt-in.
12. Cliente MCP aplica somente o plano confirmado e não recebe caminho local.

## Gates

- testes focados de repositório, materialização, catálogo, revalidação e MCP;
- `MCP_VISUAL_REAL=1 npm run mcp:check` quando R04 abrir;
- todos os gates completos de `docs/mecanifica/INDEX.md`;
- inspeção visual em pelo menos dois enquadramentos;
- relatório final com tempos, payloads, cobertura e falhas injetadas.

## Riscos e parada

- Parar em R01 se a transição exclusiva puder substituir destino, apontar para
  snapshot incompleto ou exigir confiança em lock apenas cooperativo.
- Parar a aplicação se não for possível resolver e validar o candidato antes
  da visibilidade.
- Não ativar quando uma validação obrigatória estiver pendente ou quando o
  catálogo autorizado não cobrir os dependentes exigidos pelo caso.
- Manter o MCP somente leitura se a porta exigir shell, caminho do cliente,
  estado oculto irrecuperável ou regra duplicada. Isso é decisão pela prova,
  não veto a uma retomada tecnicamente superior.

## Fechamento esperado

Registrar commits/PR, formato de armazenamento e transição, matriz de falhas,
gates, consumo caixa-preta, limites observados e decisão final. Candidatos fora
do recorte voltam ao backlog sem bloquear expansões que apresentem evidência
melhor.
