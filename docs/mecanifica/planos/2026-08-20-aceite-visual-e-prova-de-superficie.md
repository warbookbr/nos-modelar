# Aceite visual vinculante e prova de superfície

**Estado:** ativo

**Responsável:** Codex

**Base:** auditoria concluída em `75f2649` e
`RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md`.

## Objetivo

Impedir que uma prova de forma seja encerrada só por métricas estruturais e
provar, em zona privada, se uma cage com seções de caráter declaradas pode
responder ao alvo visual. O plano não promove uma geometria nem altera o núcleo
procedural antes de a prova passar.

## Hipótese

O problema observado no P2 é a ausência de um aceite visual vinculante e a
interpolação genérica da seção transversal, não uma falha de identidade,
composição ou determinismo. Se o pacote visual for obrigatório e as seções de
caráter forem autorais, as rejeições P0 podem decidir a prova antes de qualquer
alegação de aprovação.

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

**Decisão de versão:** `mecanifica.aceite-visual` v1 continua imutável como
linha de base. A R1A decide por evidência executável se o manifesto cabe como
extensão compatível do pacote ou exige v2; não se muda o significado de v1 em
silêncio.

**Decisão executada:** exige v2. A v1 fixa quatro vistas globais e seus campos
exatos não carregam região, papel, propósito nem classe de contorno sem perder
o significado. A v2 regional é validada, verifica hashes no disco e é entendida
pelo porteiro de fechamento.

**R1A concluída:** a consulta regional do arco já foi reproduzida para modelador
e crítico, com alvo, modelo e comparação isolados e hashes conferidos. A crítica
visual reprovou o arco pelo raio menor e pelos segmentos angulares. A separação
de arquivos está provada. O despacho material copia somente os bytes declarados
e a v2 já é reconhecida pelo porteiro, que a bloqueia em reprovação. Isolamento
técnico do revisor Node está provado por teste de acesso negado a arquivo fora
do despacho. Uma prova temporária já fechou v2 com briefing assinado, revisão,
seis evidências regionais e crítica hasheada. A preparação sem crítica só serve
ao despacho; o orquestrador limitado persiste a crítica e devolve o aceite
pronto para o porteiro. Testes cobrem ausência, mutação e achado aberto.

### R2 — prova privada de seções de caráter

Construir somente um quarto dianteiro novo com cage de quadriláteros e seções
transversais declaradas: largura, altura, quebra de ombro, abertura e recorte
de farol. Compilar em produto descartável e comparar com a prancha P0.

**Prova:** abrir alvo, render e sobreposição; ler as vistas frontal, lateral,
superior e isométrica; executar as oito rejeições P0 antes do fechamento;
despachar crítico independente apenas com os arquivos visuais. A prova passa
somente se não houver rejeição, a medida contra a prancha estiver no limite e o
usuário aceitar a forma.

**R2 pausada para correção do fluxo:** a exploração privada demonstrou arco e
farol como aberturas topológicas, mas a forma segue visualmente reprovada. A
comparação parcial também revelou que a sobreposição de silhueta exterior não
mostra o contorno interno do arco. Nenhum desses resultados fecha a R2. A
modelagem só retoma após a R1A provar consulta por demanda, vistas isoladas e
comparação regional que inclua os recortes relevantes.

### R3 — síntese e decisão

Publicar relatório com pacote reproduzível, mutações, custos e falhas. Decidir:

- `aprovar`: manter o porteiro e reavaliar a retomada da validação integrada;
- `corrigir`: localizar defeito restante sem promover representação;
- `redesenhar`: se seções declaradas e ciclo completo ainda não permitirem
  controlar a forma;
- `interromper`: se o custo exceder o valor demonstrado.

## Arquivos inicialmente esperados

- `tools/modelagem/validar-pacote.mjs`, `revisar-pacote.mjs` e seus testes;
- `tools/mecanifica/comparar-alvo.mjs`, `olhar.mjs` somente se uma lacuna
  reproduzível exigir alteração;
- `autoria-assistida/experimentos/prova-superficie-aceite/` e evidências;
- contrato, skill e relatório novos sob `docs/mecanifica/`.

Nenhum desses arquivos, exceto este plano e seus índices, está autorizado a
mudar sem reserva específica na fatia correspondente.

## Gates de saída

1. não existe caminho de aprovação visual sem pacote completo e reproduzível;
2. os três defeitos P2 e omissões do pacote são recusados por testes;
3. a prova usa seções de caráter declaradas, não interpolação genérica;
4. medidas, leitura de PNG e crítico independente aparecem como evidências
   distintas; silêncio do crítico não aprova;
5. imagem composta não substitui vista isolada e cada papel recebe somente o
   conjunto declarado para sua região e propósito;
6. abertura interna declarada tem alvo e comparação próprios, sem ser inferida
   da silhueta exterior;
7. a decisão final distingue forma, representação e infraestrutura;
8. `npm test`, tipagem, build e os gates do `INDEX.md` passam;
9. nenhuma receita, catálogo ou geometria pública é promovida sem autorização
   posterior.

## Riscos e parada

- Medida de silhueta não mede qualidade completa de superfície; ela não pode
  substituir as rejeições visuais ou o aceite humano.
- Recortar demais o contexto pode esconder incoerência entre regiões. Por isso
  cada aprovação regional exige uma checagem posterior de conjunto, também em
  vistas isoladas; a prancha composta continua apenas resumo.
- Uma prova aceita não homologa o chassi inteiro nem reabre P2 automaticamente.
- Falha visual com pacote íntegro suspende a retomada da validação integrada e
  leva a decisão de representação, não a refino cosmético.

## Fechamento

Preencher com relatório, decisão, gates, commit e estado dos planos congelados.
