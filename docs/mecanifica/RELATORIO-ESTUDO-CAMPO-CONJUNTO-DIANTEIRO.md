# Relatório — estudo de campo do conjunto dianteiro

**Data:** 2026-08-14
**Natureza:** evidência experimental; não autoriza implementação
**Artefatos:** [experimento reproduzível](../../autoria-assistida/experimentos/estudo-campo-conjunto-dianteiro/README.md)

## Resultado

A Mecanifica já oferece uma base forte para uma IA criar e auditar **peças
individuais**: as seis receitas ficaram estruturalmente válidas, as quatro
vistas revelaram um defeito de suavização que a inspeção numérica não via, e o
resolvedor validou de forma determinística cinco relações locais em uma árvore
com duas montagens filhas.

O nível de excelência cai na passagem de peça para **contexto de conjunto**. A
IA ainda não consegue pedir uma descrição ou uma imagem de uma montagem
persistida arbitrária, nem descobrir o impacto físico de uma alteração sobre
uma dependência que não tenha sido declarada. Esse é o gargalo principal; não é
falta de mais primitivas geométricas.

## Prova em números

| Prova | R001 | R002 |
|---|---:|---:|
| Peças / montagens filhas | 6 / 2 | 6 / 2 |
| Relações satisfeitas | 5 de 5 | **4 de 5** |
| Raio externo do disco | 140 mm | 165 mm |
| Folga disco–ponte da pinça | +20 mm | **−5 mm** |
| Diagnósticos das relações | 0 | **1** |

As quatro relações v2 continuam satisfeitas. A relação v3
`mantemSeparacaoDirecional` mede a projeção disco–ponte em eixo declarado e é a
única reprovada na R002. Isso transforma o atrito observado em intenção
mensurável sem alegar colisão volumétrica.

## Avaliação por capacidade

| Capacidade | Estado observado | Decisão Agent-First |
|---|---|---|
| Receita procedural, identidade, partes, portas e descrição estrita | Robusta nas seis peças; zero órfãos e zero faces sem parte. | **USAR DIRETO** |
| Vistas de peça individual | Úteis e capazes de revelar defeito real; o gate mede enquadramento, não qualidade estética. | **USAR DIRETO** e **ENVOLVER** com crítica do agente |
| Relações cilíndricas e anulares locais | Determinísticas, diagnosticáveis e funcionais também através da árvore. | **USAR DIRETO** |
| Descrever e renderizar montagem persistida arbitrária | Não há porta genérica; a bancada só recebe receitas e a CLI de montagem enumera pilotos fixos. | **ENVOLVER** o resolvedor em serviço neutro |
| Impacto de alteração e separação entre dependentes | Relação direcional v3 mede regiões semânticas; mapa local separa 2 relações diretas de 3 indiretas no caso do disco. | **USAR DIRETO** dentro da raiz; não confundir com colisão ou mapa global |
| Hierarquia de partes no artefato resolvido | A descrição aceita, mas o formato v1 recusa transporte. | **ENVOLVER** ou versionar explicitamente |
| Revisão de objeto naturalmente fino | Tentativas preservadas e bem diagnosticadas, porém vistas inteiras foram recusadas como pequenas. | **REFATORAR** o contrato de enquadramento |
| Comparação de revisões | Serviço funciona para revisões oficiais; CLI/documentação divergem e tentativas rejeitadas não são comparáveis. | **USAR DIRETO** no caso aceito; **REFATORAR** descoberta |

## Robustez das skills locais

`criar-peca` orienta corretamente o ciclo receita → descrição estrita → quatro
vistas → crítica. Foi suficiente para construir as seis peças, mas não impediu
o uso excessivo de `liso`: a regra existe no texto e ainda depende de atenção
manual. Seu maior ganho viria de diagnóstico progressivo e exemplos mínimos por
operação, não de mais instruções gerais.

`auditar-peca` acerta ao exigir leitura real das imagens e revisão oficial. O
fluxo de pacote é fail-safe: recusou as duas rodadas e preservou evidências. Os
atritos são o gate de vistas naturalmente finas e a descoberta inconsistente do
comparador. A skill é sólida como protocolo, mas ainda não fecha sozinha o ciclo
de comparação quando a revisão é rejeitada.

## O que vale empacotar em MCP

O perfil `revisao` atual deve ser usado como está para peças: quatro ferramentas
somente leitura e os recursos de descoberta passaram no gate real (36 testes,
um skip). Ele já empacota descrição, validação, comparação oficial e quatro
imagens sem duplicar regra de negócio.

Os próximos candidatos de maior ganho são portas finas sobre serviços internos;
descrição e impacto local já existem, mas ainda não foram publicados:

1. descrever uma montagem persistida arbitrária, com árvore, poses, portas,
   relações e diagnósticos;
2. renderizar em lote um contexto escolhido — conjunto, par de interfaces ou
   subárvore — com imagens e métricas reproduzíveis;
3. consultar o impacto local já derivado e, em etapa separada, solicitar
   revalidação;
4. comparar uma tentativa rejeitada com outra sem promovê-las a revisões.

Esses nomes são capacidades, não contratos de ferramentas. Primeiro deve haver
um serviço neutro compartilhado por CLI, bancada e MCP. A crítica visual
subjetiva deve permanecer no agente consumidor; o MCP transporta evidência e
contexto, não inventa um veredito estético determinístico.

Não há ganho claro em expor cada operação de `PASSOS` como ferramenta MCP. Para
autoria, editar receitas com as skills e os gates atuais continua mais útil. A
escrita via MCP deve permanecer adiada até existir publicação transacional,
recusa de sobrescrita, mapa de dependentes e revalidação — exatamente as
garantias que interromperam a tentativa anterior de autoria controlada.

## Continuidade executada

O serviço genérico de contexto, a separação direcional v3 e o mapa de impacto
local foram implementados e repetidos neste conjunto. O contexto completo ficou
em 18.611 bytes; a consulta reduzida, em 9.002 bytes. O mapa do disco relaciona
diretamente cubo e pinça e preserva eixo, aro e pneu como impacto indireto.

O próximo ganho comprovável é renderizar uma montagem ou par selecionado usando
esse contexto. Revalidação automática e MCP continuam separados: primeiro
precisam de contrato transacional e de política explícita para falhas.

O registro cronológico, comandos, medidas e atritos completos estão em
[`REGISTRO.md`](../../autoria-assistida/experimentos/estudo-campo-conjunto-dianteiro/REGISTRO.md).

## Repetição R06 — autoria segura

A repetição preservou a base R001: seis peças, duas montagens filhas e 5/5
relações satisfeitas. A alteração localizada do disco para raio de 165 mm
preservou os quatro encaixes e recusou a relação direcional disco–pinça com
separação de −5 mm. O erro é mensurável e limitado à relação declarada; não é
apresentado como colisão global.

Sobre o mesmo contexto, o consumidor MCP caixa-preta descobriu o alvo, leu a
revisão, planejou, inspecionou duas vistas reais, aplicou bytes confirmados,
releu a revisão e teve proposta irmã recusada por revisão desatualizada. A prova
visual real passou 42/42; não houve shell ou caminho local na interface do
consumidor. A decisão do plano de materialização é **aprovar**. Isso habilita
autoria de montagem no perfil opt-in, não autoria de receitas nem inferência de
dependências fora do catálogo.
