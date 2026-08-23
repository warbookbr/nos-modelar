# Aceite visual vinculante e prova de superfície

**Estado:** concluído

**Responsável:** Codex

**Base:** auditoria concluída em `75f2649` e
`RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md`.

## Objetivo

Impedir que uma prova de forma seja encerrada por evidência estrutural ou visual
inválida e provar, em zona privada, se uma cage autoral direta, compilada por
Catmull-Clark e medida por seções de caráter, pode responder ao alvo visual. O
plano não promove geometria nem altera o núcleo antes de a prova passar.

## Hipótese

O problema observado no P2 combina três falhas: aceite visual contornável,
representação autoral inadequada e captura incapaz de provar visibilidade 3D.
Se o pacote for obrigatório, a cage for editada diretamente e as vistas vierem
de um renderer com profundidade, a forma global pode ser decidida antes dos
recortes e antes de qualquer alegação de aprovação.

## Escopo e invariantes

- Inclui ferramentas e contratos de pacote de evidência visual, testes de
  recusa, uma prova privada nova e suas vistas; a bancada continua apenas visor.
- Mantém núcleo neutro, receitas públicas, catálogo, câmera, materiais e
  geometria existente sem mudança até uma decisão posterior.
- Mantém P2 e a validação integrada congelados: P2 é contraevidência, não alvo
  a ser reescrito; a nova prova usa diretório e identidade próprios.
- Não usa Blender, CAD, MCP externo, booleana genérica, promoção automática ou
  aprovação por crítico. O crítico só produz achados; o aceite continua humano.
- A evidência primária é uma imagem isolada, nomeada por região e vista. Uma
  prancha com várias vistas pode resumir a rodada para leitura humana, mas não
  substitui nenhuma imagem isolada nem satisfaz sozinha um gate visual.
- O agente de modelagem consulta referências por demanda, no recorte em que
  trabalha. O crítico recebe os arquivos visuais e critérios da mesma região no
  momento de revisão; não recebe uma montagem geral como única entrada.
- Seções transversais são medidores vinculantes da cage, nunca geradores dela.
- Forma global precede arco, farol e outros detalhes. Toda aprovação regional é
  seguida por regressão nas vistas globais válidas.
- Evidência de superfície vem da malha subdividida; wireframe da cage é uma
  modalidade separada e não pode se passar pelo produto visual final.

## Fatias

### R0 — contrato mínimo e corpus de falhas

Definir o pacote de aceite: alvo, sobreposição, vistas obrigatórias, condições
de rejeição executadas, achados independentes e decisão. Fixar fixtures que
omitem cada item e as três falhas P2: cápsula, ombro sem leitura e farol
invisível.

**Prova:** cada ausência e cada resultado `reprovar` impede `aprovar`; campos
sem identidade semântica, hash ou vínculo com a vista são recusados.

**R0 concluída:** contrato `mecanifica.aceite-visual` v1 e corpus das três
reprovações P2. O veredito é derivado de briefing e revisão assinados; a prova
em disco confere arquivos, hash e crítica real. Independência de papel continua
uma prova de orquestração da R1, não uma alegação que JSON possa autenticar.

### R1 — porteiro de fechamento

Integrar a validação do pacote no caminho privado de revisão, sem mudar a
renderização nem publicar receita. A revisão informa separadamente `válida
estruturalmente`, `evidência visual incompleta` e `reprovada visualmente`.

**Prova:** uma revisão estruturalmente verde sem sobreposição, sem crítico ou
sem execução das rejeições não fecha; o replay íntegro permanece determinístico
e uma mutação visual conhecida muda o veredito esperado.

**R1 em execução:** o briefing ganhou declaração opt-in de rejeições visuais e
o fechamento privado deriva dela, da assinatura do briefing e da revisão. A
prova positiva com crítico despachado permanece para a próxima rodada; pacotes
legados são recusados, sem aceite retroativo.

### R1A — distribuição visual por demanda

Antes de retomar o refinamento da prova, fixar como alvo e evidência chegam aos
papéis do fluxo. Cada tarefa declara uma região semântica, a vista necessária e
o propósito (`modelar`, `comparar` ou `revisar`). O agente de modelagem recebe
somente as referências e renders pedidos para a região atual. O crítico é
despachado no ponto de revisão com as imagens isoladas, os critérios aplicáveis
e a assinatura do mesmo modelo; a prancha composta fica apenas como síntese.

Comparações também separam classes de contorno: silhueta exterior não prova
abertura interna. Arco de roda, farol, vidro ou outro recorte declarado precisa
de alvo e sobreposição próprios; ausência desse contorno torna a evidência
`incompleta`, não aprovada.

**Prova:** manifestos registram, por papel, região, vista e propósito, quais
arquivos foram entregues. Testes recusam pacote cuja única entrada seja imagem
composta, revisão sem a vista pedida ou comparação que omita um recorte
declarado. Repetir uma consulta produz a mesma seleção e os mesmos hashes.

**R1A concluída:** a consulta regional do arco já foi reproduzida para modelador
e crítico com três imagens isoladas e hashes. Isso exigiu v2 sem mudar v1. O
despacho limita os bytes, o processo Node recusa leitura externa e o porteiro
fecha uma prova completa com crítica hasheada. Ausência, mutação e achado aberto
são recusados por teste.

### R1B — validade perceptiva da captura

Substituir a projeção privada que pinta faces por ordem de criação por uma
captura 3D com oclusão e profundidade reais, fora do núcleo neutro. Fixar
câmeras ortográficas calibradas e produzir, por vista, modalidades separadas:
superfície sombreada, silhueta, wireframe, normais, profundidade e identidade de
região. Meia peça precisa ser declarada como tal ou espelhada para a vista que
pretende provar o conjunto.

**Prova:** fixtures com faces sobrepostas trocam a visibilidade ao trocar a
profundidade; face traseira não cobre face dianteira; frontal, lateral e
superior mostram a mesma geometria sob câmeras assinadas; imagem vazia,
degenerada, sem profundidade ou com cobertura parcial não chega ao crítico.

**Estado atual:** obrigatória antes de qualquer nova correção de forma. A vista
frontal da prova em `prova-superficie-aceite/` sobrepõe estações sem teste de
profundidade e mostra meia pele como se fosse uma vista frontal completa. Ela e
a vista superior estão invalidadas; a aprovação local baseada no conjunto de
quatro vistas foi retirada. A comparação lateral isolada do arco permanece
válida porque compara diretamente dois contornos no mesmo plano.
**R1B em execução:** a prova privada `prova-captura-r1b/` introduz rasterização ortográfica por z-buffer e emite superfície, profundidade, normais, wireframe e
identidade regional a partir da mesma malha. O contraexemplo de duas placas
coincidentes prova por teste que a face frontal vence independentemente da ordem
de criação e que inverter as profundidades altera a face exposta. Cada captura
agora declara inteira/meia peça e finalidade; o pacote de conjunto exige as três
vistas da mesma malha assinada e recusa meia peça não espelhada. Ainda falta
declarar o quadro específico da futura cage; o mecanismo R1B está concluído e
impede reenquadrar a forma automaticamente. Essa declaração abre a R2, sem
autorizar refino do rascunho defeituoso.
### R2 — prova privada de cage autoral direta
Construir um quarto dianteiro em cage de quadriláteros editada diretamente, com
loops semânticos e vincos, e compilá-la pelo Catmull-Clark já provado. As seções
de caráter declaram largura, altura e quebra de ombro para medir a cage; não
criam vértices nem conectam estações. A unidade de edição da IA é operação
semântica reversível sobre loop, aresta ou região — não escrita manual de mapas
de IDs.

**Ordem obrigatória:** envelope e proporções; silhuetas frontal, lateral e
superior em conjunto; capô, ombro e flanco; continuidade por normais; somente
então arco, farol e demais recortes. Cada recorte encerra com regressão global.

**Prova:** abrir alvo, render subdividido e sobreposição; ler vistas e
modalidades válidas; executar as oito rejeições P0 antes do fechamento;
despachar crítico independente apenas com os arquivos declarados. A prova passa
somente se não houver rejeição, as medidas estiverem no limite e o usuário
aceitar a forma global.

**R2 redesenhada e liberada pela R1B:** `secoes-de-carater.mjs` é contraevidência porque gera a pele por varredura; permanece em rascunhos defeituosos, sem promoção. A nova prova `prova-cage-direta-r2/` usa envelope e quadro fixos.

**R2A — topologia global de controle:** antes de mover pontos, declarar loops distintos para capô, base do para-brisa, teto, queda traseira, ombro e cintura. Se uma vista medir região sem controle próprio, acrescentar o loop antes de forçar outro. A prova exige que cada um possa mudar isoladamente e que as três silhuetas globais melhorem sem arco, farol, vidro ou outro recorte.

### R3 — síntese e decisão

Publicar relatório com pacote, mutações, custos e falhas. Decidir `aprovar`,
`corrigir`, `redesenhar` ou `interromper`, sem promover representação por
silêncio.

**R3 concluída — decisão `redesenhar`:** R0–R1B demonstraram o pacote, a
captura e a cage íntegra. A R2 reprova P0 em 20,5/31,5/32,7 mm, contra
14/16/16 mm. A única faixa entre ombro e flanco acopla planta e dois níveis da
frontal; o R2B acrescenta controle vertical. Recortes, crítico de aprovação e
aceite humano ficam bloqueados antes da forma global.

## Gates de saída

1. não existe caminho de aprovação visual sem pacote completo e reproduzível;
2. os três defeitos P2 e omissões do pacote são recusados por testes;
3. a prova usa cage direta subdividida; seções medem e não geram geometria;
4. medidas, leitura de PNG e crítico independente aparecem como evidências
   distintas; silêncio do crítico não aprova;
5. imagem composta não substitui vista isolada e cada papel recebe somente o
   conjunto declarado para sua região e propósito;
6. abertura interna declarada tem alvo e comparação próprios, sem ser inferida
   da silhueta exterior;
7. toda vista usada no aceite prova oclusão, profundidade, câmera, cobertura e
   modalidade; cage crua não se passa por superfície final;
8. forma global passa antes dos recortes e todo recorte roda regressão global;
9. edição autoral usa operações semânticas reversíveis, não IDs manuais;
10. a decisão final distingue forma, representação e infraestrutura;
11. `npm test`, tipagem, build e os gates do `INDEX.md` passam;
12. nenhuma receita, catálogo ou geometria pública é promovida sem autorização
   posterior.

## Riscos e parada

- Medida de silhueta não substitui rejeições visuais nem aceite humano.
- Hash íntegro prova bytes, não projeção 3D; R1B fecha essa lacuna antes do crítico.
- Recortar contexto pode esconder incoerência; aprovação regional exige conjunto em vistas isoladas.
- Uma prova aceita não homologa o chassi inteiro nem reabre P2 automaticamente.
- Falha visual leva a decisão de representação, não a refino cosmético.

## Fechamento

Relatório e achado da suíte agregada:
[`../RELATORIO-R2-CAGE-DIRETA-R3.md`](../RELATORIO-R2-CAGE-DIRETA-R3.md).
Decisão: `redesenhar`; sem recortes, aceite ou promoção. Sucessor:
`2026-08-23-redesenho-cage-r2b-controle-vertical.md`.
