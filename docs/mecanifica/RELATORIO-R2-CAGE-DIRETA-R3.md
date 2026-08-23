# R2 — relatório de decisão da cage direta

**Decisão:** `redesenhar` a faixa vertical da prova privada; não promover.

## O que passou

- O pacote visual, suas rejeições, a consulta regional e o porteiro foram
  exercitados pelos testes de `tools/modelagem`.
- A captura R1B produz superfície, silhueta, wireframe, normais, profundidade
  e identidade a partir da mesma malha com z-buffer.
- A R2 é uma cage direta de quads, fechada, simétrica e com loops semânticos.
  As provas focadas R1B/R2 totalizaram 21 testes aprovados; as de modelagem,
  24 aprovados.
- A forma melhorou em planta por rodadas rastreáveis: 38,2 mm para 31,5 mm no
  máximo, sem promover geometria pública.

## O que reprovou

O P0 exige no máximo 14 mm na lateral e 16 mm em planta e frontal. A última
medição R2 foi 20,5/31,5/32,7 mm. Portanto a forma global reprova nas três
vistas e bloqueia, pelo contrato, continuidade de recortes, crítica de
aprovação, aceite humano e promoção.

O diagnóstico não atribui essa reprovação ao renderer: as vistas usam a mesma
malha e câmeras declaradas, e os testes de oclusão passam. Tampouco é uma
falha de identidade ou de fechamento. O conflito está na seção vertical: o
ombro controla o limite frontal alto, enquanto o flanco controla o baixo e a
planta; a grade R2 não oferece um controle independente entre eles.

## Infraestrutura de teste

`npm test` agregado ficou sem saída após iniciar o Vitest, inclusive com um
worker. Para não mascarar o problema, ele conta como achado aberto. As suites
relevantes foram executadas isoladamente e passaram. O R2B precisa localizar o
arquivo ou recurso que bloqueia a agregação antes de alegar gate completo.

## Consequência

O sucessor R2B introduz uma faixa vertical explícita na cage direta, mantendo
os mesmos alvos, câmeras, z-buffer e proibição de recortes até passar a forma
global. Esta prova R2 fica preservada como contraevidência mensurada.
