# Sonda de escala — supercarro exterior 1.0

**Estado:** concluído

**Responsável:** Codex

**Base:** ensaio da dobradiça 1.0 concluído com decisão `aprovar`.

## Objetivo verificável

Modelar um supercarro ficcional completo por fora, adequado a visualização de
jogo, como fixture privada e sistema composto. O carro precisa ter carroceria,
cabine envidraçada, quatro rodas, iluminação, portas/painéis, espelhos e
aerodinâmica exterior semanticamente separáveis; resolver montagem recursiva,
repetição, materiais, vistas locais e globais, exportação reproduzível e
orçamento geométrico. Não é réplica exata nem usa marca, logotipo ou desenho
industrial de fabricante.

A execução deve localizar e corrigir imediatamente limitações genéricas que
prejudiquem uma IA em pelo menos outro domínio plausível. A peça não justifica
lógica automotiva no núcleo: cada melhoria aceita recebe contrato neutro,
diagnóstico, medição e teste independente do carro.

## Hipótese

A plataforma validada pela dobradiça consegue crescer de três peças para um
sistema exterior com dezenas de identidades se usar hierarquia, instâncias,
consulta progressiva e inspeção localizada. O ensaio deve separar quatro
classes de falha: vocabulário geométrico, estrutura de montagem, orçamento de
contexto e crítica visual. Passar somente em uma imagem global não aprova o
fluxo.

## Critério de evolução

Praticidade, assertividade e elevação de teto continuam sendo a régua. Também
serão medidos:

- passos e decisões semânticas por componente;
- vértices, faces, triângulos estimados, bytes e tempo por peça/subconjunto;
- repetição evitada por composição ou instância;
- tamanho de respostas globais e de consultas reduzidas;
- cobertura de relações e pares auditados versus omitidos por foco;
- quantidade de iterações visuais e defeitos encontrados por vista;
- custo no bundle, memória e contratos para cada melhoria de plataforma.

Trade-offs são permitidos quando o ganho líquido é registrado. Uma abstração,
operação ou ferramenta nova não conta como evolução apenas por existir.

## Escopo

- fixture privada `autoria-assistida/experimentos/sonda-supercarro-1-0/`;
- envelope e carroceria facetada de baixo/médio orçamento para jogo;
- subconjuntos recursivos de carroceria, cabine, eixos/rodas, óptica e aero;
- peças externas semanticamente isoláveis, com esquerda/direita por instância
  ou transformação declarada, sem cópia manual silenciosa;
- materiais declarados para pintura, vidro, borracha, metal e emissores;
- ao menos duas variantes de apresentação ou nível de detalhe se o contrato
  atual conseguir representá-las; caso contrário, lacuna persistível;
- montagem e portas/relações somente onde houver semântica geométrica real;
- descrição global sob orçamento e consultas de peça, interface e subconjunto;
- auditoria de interseções focada, com cobertura e omissões explícitas;
- vistas de rodas isoladas, lateral/cabine, frente, traseira e conjunto;
- crítica visual de silhueta, proporção, encaixe e legibilidade dos materiais;
- round-trip por exportação oficial e assinaturas reproduzíveis;
- auditoria contínua de skills, MCP, diagnósticos, schemas e acessibilidade para
  um agente que não leu a implementação.

## Invariantes

- catálogo público de peças permanece vazio;
- núcleo não conhece carro, fabricante, Three.js, MCP, filesystem ou câmera;
- nenhuma imagem aprova engenharia, aerodinâmica, segurança ou fabricação;
- identidade persistida é semântica; posições e índices não viram identidade;
- instância repetida referencia a mesma definição e recebe pose explícita;
- falha, truncamento e par não verificado permanecem visíveis;
- toda mudança genérica preserva a baseline R00 e o estudo da dobradiça.

## Fora

Motor, transmissão, suspensão funcional, molas, interior, ocupantes, direção,
física veicular, deformação, animação de portas, colisão em movimento,
homologação de jogo e réplica fiel. Freio ou cubo visível pode ser forma de
apresentação da roda, não promessa de mecanismo completo.

## Rodadas

1. **R00 — envelope e orçamento:** referência ficcional, dimensões, eixos,
   hierarquia e baseline de contexto.
2. **R01 — roda e repetição:** roda isolada, material, instância em quatro poses
   e inspeção de encaixe com caixa de roda.
3. **R02 — carroceria e cabine:** envelope, painéis, vidros e silhueta em vistas
   ortogonais e isométricas.
4. **R03 — óptica e aerodinâmica:** faróis, lanternas, espelhos, entradas,
   splitter, difusor e asa/spoiler quando coerente.
5. **R04 — sistema composto:** montagem recursiva, relações aplicáveis,
   descrição progressiva, impacto e exportação.
6. **R05 — crítica e correção:** inspeção de componentes no contexto, revisão
   visual comparativa e correções genéricas encontradas em execução.
7. **R06 — fechamento:** gates completos, métricas antes/depois, decisão e
   abertura da sonda de armadura humanoide.

## Gates

1. O conjunto possui pelo menos 12 identidades externas úteis e quatro rodas
   como instâncias de definição compartilhada.
2. Cada receita executa/descreve/exporta sem órfão e com faces nomeadas.
3. Hierarquia e consultas reduzidas recuperam componente, subconjunto e carro
   sem depender de UUID, posição ou caminho local.
4. Materiais e orçamento geométrico são dados consultáveis, não só aparência.
5. Resposta global declara tamanho/truncamento; resposta local é menor e mantém
   contexto suficiente para agir.
6. Auditoria declara pares verificados, omitidos e inconclusivos; nenhum passe
   global é inferido de amostra silenciosa.
7. Ao menos dez vistas válidas cobrem rodas, laterais, cabine, frente, traseira
   e conjunto, com duas vistas globais e duas de cada alvo crítico.
8. Uma alteração em definição compartilhada reaparece nas quatro instâncias e
   o impacto/revalidação identifica os consumidores corretos.
9. Round-trip e assinaturas são determinísticos.
10. Toda melhoria de plataforma é neutra, testada e medida; nenhuma especializa
    núcleo ou ferramenta para este carro.
11. Baseline R00, dobradiça, MCP, skills e gates completos do `INDEX.md` passam.

## Parada e decisão

Não esconder uma limitação para completar a silhueta. Quando a plataforma não
representar algo, registrar a lacuna, implementar o menor contrato genérico que
produza ganho comprovado ou declarar a aproximação visual. O fechamento será
`aprovar`, `corrigir` ou `cancelar`, seguido do plano separado da armadura.

## Fechamento

R00–R06 foram concluídas em 2026-08-18 com decisão `aprovar`. A fixture privada
possui 12 definições, 27 peças-folha, quatro submontagens compartilhadas,
1.428 vértices e 1.434 faces únicas. As 13 vistas são válidas; a auditoria
decide 351/351 pares globais e a consulta interna de uma roda decide 3 pares
com 348 omissões explícitas. Exportação, contexto progressivo e impacto por
definição são determinísticos.

O relatório e as limitações estão em
`docs/mecanifica/RELATORIO-SONDA-SUPERCARRO-1-0.md`. Enquadramento por
profundidade, sete direções de vista, foco interno de auditoria, impacto por
definição compartilhada, metalicidade observável e correções das skills foram
integrados como melhorias neutras. Caixa de roda subtrativa, movimento,
catálogo compartilhado de materiais e crítica visual estruturada continuam
limites explícitos.

A continuidade foi aberta no plano separado
`2026-08-18-sonda-armadura-humanoide-1-0.md`.
