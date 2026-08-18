# Relatório da sonda de escala — supercarro exterior 1.0

**Data:** 2026-08-18

**Decisão:** `aprovar`

## Resultado

A Mecanifica produziu e manteve um supercarro exterior ficcional, privado e
sem marcas como sistema recursivo, não como receita monolítica. A sonda provou
escala de autoria, repetição, contexto progressivo, exportação determinística,
auditoria localizada e inspeção visual. Ela não aprova engenharia automotiva,
física, fabricação ou colisão em movimento.

O resultado visual é um carro baixo de jogo, com carroceria azul facetada,
canópia escura contínua, quatro rodas raiadas, óptica, entradas de ar, painéis,
espelhos, splitter, difusor e asa. A referência gerada para a forma é original,
sem logotipo ou desenho industrial copiado, e permanece junto ao experimento.

## Escala medida

| Medida | Resultado |
|---|---:|
| definições privadas de peça | 12 |
| peças-folha resolvidas | 27 |
| submontagens resolvidas | 4 |
| identidades semânticas de parte | 16 ou mais |
| relações declaradas/satisfeitas | 4/4 |
| vértices/faces nas definições únicas | 1.428/1.434 |
| vértices/faces depois das instâncias | 4.620/4.530 |
| bytes dos 12 exports JSON | 372.939 |
| vistas finais válidas | 13 |
| pares na auditoria global | 351/351 decididos |
| pares na auditoria interna de uma roda | 3 de 351; 348 omissões explícitas |
| contexto global | 18.482 bytes |
| contexto com profundidade 1 | 12.916 bytes |
| contexto de uma roda | 3.520 bytes |

O catálogo público continuou vazio. Cada definição executou, descreveu e
exportou sem órfãos nem faces sem parte, e a repetição produziu o mesmo texto de
exportação. As quatro rodas usam a mesma definição de montagem `roda`; não há
cópia silenciosa de aro, disco ou pneu.

## Iteração visual e orçamento

A primeira carroceria baseada em volumes inflados ficou alta, blocada e pouco
legível nas vistas ortogonais. Ela foi rejeitada durante a inspeção, embora os
gates estruturais passassem. Carroceria e cabine passaram a usar `loft` com
contornos explícitos e orientação local corrigida.

Essa correção reduziu as definições únicas de aproximadamente 548.613 para
372.939 bytes e de 2.152 para 1.434 faces: cerca de 32% menos bytes e 33% menos
faces, além de uma silhueta mais coerente. Frente, traseira, superior, lateral
e isométrica foram inspecionadas; roda, cabine, lateral e aerodinâmica também
foram isoladas em pares de vistas.

As evidências estão em
`autoria-assistida/experimentos/sonda-supercarro-1-0/evidencias/`. O experimento
e o teste ficam em zona privada; não promovem conteúdo ao catálogo.

## Auditoria geométrica

A auditoria global decidiu todos os 351 pares, sem inconclusivos. Há 16
interpenetrações visuais intencionais e todas possuem expectativa identificada
e motivo: encaixes aro–pneu e aro–disco nas quatro rodas, sobreposições de
carroceria com cabine/aerodinâmica e componentes externos deliberadamente
embutidos. Expectativa explica o achado, mas não o suprime: a revisão completa
continua reprovando uma montagem com interpenetração.

Todos os pares pneu–carroceria ficaram separados. As rodas permanecem um pouco
externas ao envelope, pois aproximá-las sem cavidade de caixa de roda produz
interpenetração real. A sonda não esconde esse limite.

## Melhorias genéricas produzidas

1. **Enquadramento por profundidade.** A câmera em perspectiva considerava só
   largura e altura projetadas. Frente e traseira de sistemas longos eram
   cortadas. O enquadrador agora soma a profundidade do canto mais próximo; a
   correção vale para qualquer montagem alongada.
2. **Sete direções de montagem.** Captura, schema MCP e skill alcançam
   isométrica, frente, trás, direita, esquerda, superior e inferior, com no
   máximo quatro vistas por chamada.
3. **Auditoria interna ou incidente.** O foco `interno` reduz uma submontagem
   aos pares entre seus próprios descendentes; o modo `incidente` preserva o
   comportamento anterior. Cobertura e omissões continuam explícitas e o modo
   é consumível por `revisar_montagem`.
4. **Impacto por definição compartilhada.** Além de caminho, o serviço aceita
   `{ tipo, ref }`, localiza todos os consumidores dentro da raiz, propaga
   relações e retorna as montagens a revalidar. O planejador MCP expõe o mesmo
   alvo. No carro, alterar `montagem:roda` encontra quatro consumidores, 16
   caminhos iniciais e as quatro submontagens mais a raiz.
5. **Material observável.** `metalicidade` passou a participar da descrição,
   assinatura e diff de revisão. Uma IA agora percebe troca entre acabamento
   metálico e não metálico em vez de depender somente da imagem.
6. **Conhecimento operacional corrigido.** A skill de criação documenta os
   geradores de revolução, o eixo direto e a semântica de `orientacao` do
   `loft`; a skill de auditoria documenta vistas, foco e omissões.

As mudanças têm testes neutros separados do carro. O motor não recebeu
vocabulário automotivo, câmera, MCP ou Three.js.

## Limites revelados e próximo teto

- Falta uma representação subtrativa/booleana robusta para cavidades como
  caixa de roda, recortes de painel e negativos complexos. A aproximação por
  sobreposição não equivale a topologia limpa.
- Materiais agora são comparáveis, mas ainda não há catálogo semântico
  compartilhado, texturas, UVs ou níveis de detalhe como contrato de sistema.
- A auditoria é estática. Não prova varredura de movimento, auto-colisão ao
  articular, folga ao longo de uma trajetória nem contatos contínuos.
- Espelhamento de forma e de identidade ainda exige cuidado: uma pose espelha
  localização, não necessariamente quiralidade, UV ou semântica esquerda/direita.
- A crítica visual é assistida por capturas, mas ainda não produz uma ficha
  estruturada de defeitos, severidade, evidência e decisão comparável entre
  revisões.
- O impacto por definição é completo somente na raiz resolvida; usos fora dela
  exigem catálogo explícito, e a resposta preserva essa limitação.

Esses limites orientam a sonda de armadura humanoide: hierarquia mais profunda,
bilateralidade, articulação, envelope de movimento, camadas, níveis de detalhe
e crítica visual estruturada serão testados como capacidades genéricas.

## Reprodução

```text
node autoria-assistida/experimentos/sonda-supercarro-1-0/executar-estudo.mjs
npm exec vitest run -- tools/oficina/sonda-supercarro-1-0.test.mjs
```

O fechamento também exige os gates completos de `docs/mecanifica/INDEX.md`.
