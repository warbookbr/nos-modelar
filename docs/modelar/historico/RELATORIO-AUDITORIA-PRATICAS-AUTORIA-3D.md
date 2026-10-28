# Auditoria das práticas de autoria 3D

**Data:** 2026-08-20
**Plano:** `2026-08-20-auditoria-praticas-autoria-3d.md`
**Decisão:** `corrigir`

## Veredito

A tese da Mecanifica é promissora onde identidade semântica, composição,
determinismo, contexto e diagnóstico local importam. Ela ainda não está provada
como fluxo confiável para forma de superfície exigente. O problema é localizado:
o caminho de autoria e aceite visual pode ser contornado por uma prova estrutural
verde. Portanto, não cabe interromper ou redesenhar o núcleo; cabe impedir que
medida estrutural encerre sozinha uma decisão de forma.

## Matriz de evidências

| prática | estado | evidência local | limite ou contraevidência |
| --- | --- | --- | --- |
| decompor antes de modelar | **provada** para sistemas | dobradiça, supercarro e armadura separam peças, montagens, portas e relações por identidade | a pele contínua do chassi ainda não tem decomposição de seções de caráter praticada até o aceite |
| papéis e contexto separados | **parcial** | skill `criar-peca`, crítica visual sem código e revisor adversarial definem papéis distintos | P2 fechou sem despachar o crítico e sem abrir/comparar o alvo na rodada |
| variantes comparáveis | **parcial** | supercarro e armadura preservam antes/depois, vistas e achados ligados por hash | não há pacote mínimo obrigatório que retenha alternativas, hipótese e motivo de descarte |
| inspeção visual recorrente | **parcial** | bancada exige vistas, isolamento e contexto; supercarro inspecionou 13 vistas e rejeitou a primeira carroceria | P2 só rodou as oito rejeições visuais depois do fechamento; três reprovam a forma |
| representação pela classe de forma | **parcial** | revolução, loft, composição e cage privada cobrem famílias diferentes; `loft` corrigiu a sonda de escala | o `loft` não serve para pele exterior com aberturas; a cage P2 interpolou seção transversal e não confirmou a representação |
| medir forma além de validade | **parcial** | prancha mede contorno, landmarks, coerência e referência; P2 mede cage, arco, vinco e alteração | topologia e medidas não detectaram cápsula, linha de ombro ilegível e farol invisível |
| briefing, orçamento e rejeição prévios | **provada** nos recortes recentes | P0 fixa perfil, landmarks e oito rejeições antes da geometria; R2 da prancha formaliza intenção, incerteza e bloqueio | o contrato não foi tornado condicionante do fechamento P2 |
| edição local com identidade preservada | **provada** para composição; **parcial** para superfície | IDs semânticos, impacto por definição e revalidação preservam manutenção nos estudos | elevar a crista do P2 toca dois loops e 1.324/3.835 vértices compilados; a localidade visual não está provada |
| resultado acima da infraestrutura | **contradita na execução** | a documentação declara crítica e aceite visual como obrigatórios | P2 registrou gates verdes e forma reprovada pelo usuário na mesma prova |

## Confronto causal

O núcleo não é a causa da reprovação: nos estudos de dobradiça, supercarro e
armadura ele preserva identidade, repetição, contexto progressivo e diagnóstico
reproduzível. A falha está entre representação autoral e decisão final.

No P2, a seção transversal foi interpolada genericamente em vez de declarada.
Assim não havia quebra material para o vinco revelar. O resultado visual —
cápsula, ombro sem leitura e farol invisível — era previsível pelas condições
P0, mas elas não bloquearam o fechamento. A imagem das vistas de nível 2
confirma que as métricas de contagem e abertura não bastam para comprovar
caráter de superfície.

Há também redundância operacional: protocolo, skills, prancha, sobreposição e
crítico já descrevem o ciclo correto, mas nenhum porteiro exige o pacote de
evidências antes de uma conclusão. Acrescentar mais ferramenta sem ligar esse
ciclo ao aceite aumentaria complexidade e falsa segurança.

## Prioridades

| prioridade | recorte mínimo | impacto × evidência × custo | condição de conclusão |
| --- | --- | --- | --- |
| 1 | porteiro de aceite visual | alto × alto × baixo | nenhuma prova de forma fecha sem alvo aberto, sobreposição, vistas exigidas, rejeições executadas e crítica independente registrada |
| 2 | prova privada de autoria de superfície | alto × alto × médio | uma cage com seções de caráter declaradas passa ou falha contra a prancha e as rejeições P0, sem promoção ao núcleo |
| 3 | pacote comparável de variantes | médio × médio × baixo | cada decisão visual retém hipótese, alternativa, vistas e motivo de escolha; não cria catálogo nem identidade nova |
| 4 | métrica localizada de continuidade/legibilidade | médio × médio × médio | uma medida só entra se detectar mutação visual real que hoje escapa; não substitui crítica ou aceite humano |

## Próxima decisão verificável

Manter congelados P2 e a validação integrada. Antes de qualquer retomada, abrir
um plano sucessor para os itens 1 e 2, nessa ordem. Ele deve provar que uma
forma de superfície não pode ser declarada aprovada enquanto faltar evidência
visual vinculante, e que a representação recebe seções de caráter autorais em
vez de interpolação genérica.

Se essa prova privada falhar mesmo com o ciclo visual aplicado, a próxima
decisão será `redesenhar` a representação de autoria de superfície. Se passar,
o núcleo semântico permanece e somente então a validação integrada pode ser
reavaliada. Nenhuma conclusão desta auditoria autoriza nova operação, Blender,
alteração do núcleo ou promoção de geometria.

## Evidências consultadas

- `AGENT-FIRST.md`, `ARQUITETURA.md`, `BANCADA-E-APRESENTACAO.md`,
  `REFERENCIA-E-CRITICA-VISUAL.md`, `INTENCAO-PECA-V1.md` e as skills de criação
  e auditoria;
- relatórios da dobradiça, supercarro, armadura, prancha R4 e chassi P2;
- vistas reais de nível 2 do P2, rasterizadas e lidas durante a auditoria.
