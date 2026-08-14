# Relatório — estudo de campo do conjunto dianteiro

**Data:** 2026-08-14
**Natureza:** evidência experimental; não autoriza implementação
**Artefatos:** [experimento reproduzível](../../autoria-assistida/experimentos/estudo-campo-conjunto-dianteiro/README.md)

## Resultado

A Mecanifica já oferece uma base forte para uma IA criar e auditar **peças
individuais**: as seis receitas ficaram estruturalmente válidas, as quatro
vistas revelaram um defeito de suavização que a inspeção numérica não via, e o
resolvedor validou de forma determinística quatro relações locais em uma árvore
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
| Relações satisfeitas | 4 de 4 | 4 de 4 |
| Raio externo do disco | 140 mm | 165 mm |
| Folga disco–ponte da pinça | +20 mm | **−5 mm** |
| Diagnósticos das relações | 0 | 0 |

O resultado não é falso positivo do resolvedor. As relações persistidas cobrem
eixo–cubo, cubo–aro, cubo–disco e aro–pneu; nenhuma expressa a folga
disco–pinça. A R002 demonstra que validação local correta não substitui contexto
de dependências.

## Avaliação por capacidade

| Capacidade | Estado observado | Decisão Agent-First |
|---|---|---|
| Receita procedural, identidade, partes, portas e descrição estrita | Robusta nas seis peças; zero órfãos e zero faces sem parte. | **USAR DIRETO** |
| Vistas de peça individual | Úteis e capazes de revelar defeito real; o gate mede enquadramento, não qualidade estética. | **USAR DIRETO** e **ENVOLVER** com crítica do agente |
| Relações cilíndricas e anulares locais | Determinísticas, diagnosticáveis e funcionais também através da árvore. | **USAR DIRETO** |
| Descrever e renderizar montagem persistida arbitrária | Não há porta genérica; a bancada só recebe receitas e a CLI de montagem enumera pilotos fixos. | **ENVOLVER** o resolvedor em serviço neutro |
| Impacto de alteração e folga entre dependentes | A intenção ausente não é descoberta; a invasão de 5 mm ficou fora dos quatro contratos. | **ADIAR** durante o plano ativo; candidato prioritário posterior |
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

Os próximos candidatos de maior ganho são portas finas sobre serviços internos
que ainda precisam existir:

1. descrever uma montagem persistida arbitrária, com árvore, poses, portas,
   relações e diagnósticos;
2. renderizar em lote um contexto escolhido — conjunto, par de interfaces ou
   subárvore — com imagens e métricas reproduzíveis;
3. consultar dependentes afetados por uma mudança e solicitar sua revalidação;
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

## Próximo experimento recomendado

Após encerrar o plano ativo, implementar apenas um serviço genérico de
**descrição de montagem persistida**, sem MCP e sem nova relação, e repetir este
mesmo conjunto. Se a IA conseguir localizar o disco e a ponte, explicar as
quatro relações e produzir um contexto estável para auditoria, então a
renderização de montagem será uma segunda fatia justificável. O invariante de
folga e o mapa de impacto vêm depois, com contrato próprio.

O registro cronológico, comandos, medidas e atritos completos estão em
[`REGISTRO.md`](../../autoria-assistida/experimentos/estudo-campo-conjunto-dianteiro/REGISTRO.md).
