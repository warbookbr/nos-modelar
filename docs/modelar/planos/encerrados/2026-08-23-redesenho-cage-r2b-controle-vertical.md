# Redesenho R2B — controle vertical da cage direta

**Estado:** concluído

**Decisão:** `interromper`

**Responsável:** Codex

**Base:** decisão `redesenhar` em
[`../RELATORIO-R2-CAGE-DIRETA-R3.md`](../../historico/RELATORIO-R2-CAGE-DIRETA-R3.md).

## Objetivo

Provar, em zona privada, que uma cage direta com controle independente entre
ombro e flanco pode passar os três limiares de silhueta P0 sem recortes e sem
regredir as garantias R0–R1B.

## Hipótese

A R2 falhou porque uma única faixa vertical precisa controlar ao mesmo tempo a
largura em planta e os limites baixo e alto da frontal. Uma faixa adicional de
quads, declarada por identidade semântica e compilada pelo mesmo
Catmull–Clark, separa essas decisões sem voltar a gerar a pele por seções.

## Escopo e invariantes

- Inclui somente a prova privada `prova-cage-direta-r2`, suas evidências,
  testes e documentação de decisão.
- Mantém núcleo neutro, P2, receitas, catálogo, bancada publicada, câmeras,
  material de julgamento e alvo P0 sem alteração.
- Mantém z-buffer, vistas isoladas, despacho regional e rejeições R0–R1B.
- Não cria arco, farol, vidro, booleana, receita pública ou promoção automática
  antes dos três limites de silhueta.
- Identidades existentes não podem mudar quando a nova faixa for inserida.

## Fatias

### B0 — baseline e infraestrutura

Fixar a evidência R2 rejeitada, reproduzir 20,5/31,5/32,7 mm e localizar a
suite que bloqueia `npm test` agregado. Sem essa base, nenhuma melhora fecha.

**Resultado parcial:** a evidência rejeitada está congelada e os testes focados
da prova são reproduzíveis. O `npm test` agregado continua parando antes de
identificar arquivos; isso não impede sondas privadas B2, mas bloqueia o
fechamento de B3 e do plano até a causa ser isolada.

### B1 — faixa vertical direta

Inserir uma faixa de quads entre ombro e flanco com loop semântico próprio,
linhagem determinística e IDs estáveis. Provar fechamento, quads, simetria,
envelope e edição isolada de cada faixa.

**Resultado:** concluída. A `faixaVertical` usa o deslocamento de ID `+6`,
preserva todos os IDs R2 e ganha duas tampas centrais adicionais; a prova tem
100 vértices, 81 quads e continua fechada depois do espelhamento. A evidência
reproduzível está em
`autoria-assistida/experimentos/prova-cage-direta-r2/evidencias/forma-global-r2b-b1/`.
Ela não substitui a B0 rejeitada: a forma global ainda segue para B2.

### B2 — forma global

Calibrar por regiões e resolução final. A saída exige lateral ≤14 mm, planta
≤16 mm e frontal ≤16 mm.

**Em curso:** a medição B1 isolou três correções independentes: teto dianteiro
na lateral (20,5 mm), alargamento traseiro na planta (44,8 mm) e faixa alta da
frontal (43,5 mm). A comparação agora pode expor todas as amostras assinadas,
para que cada ajuste seja promovido somente se não piorar as outras vistas.

**Progresso:** a primeira promoção preservou exatamente o envelope compilado
e reduziu planta para 42,9 mm e frontal para 32,7 mm, sem regredir lateral
(20,5 mm). Continua reprovada: B2 segue até os três limites, sem antecipar B3.

#### B2.0 — campeão congelado

Cada rodada compara com o último candidato promovido, nunca apenas com B1. O
campeão atual é `forma-global-r2b-b2`, assinatura `r1b-52ea8d67`, com máximos
20,5/42,9/32,7 mm em lateral/planta/frontal e envelope exato
2,00 × 4,60 × 1,19 m.

#### B2.1 — contrato de promoção

Um candidato só substitui o campeão se, na resolução final e na mesma câmera:

1. preservar envelope, topologia, IDs, fechamento e quads;
2. não aumentar o máximo de nenhuma vista;
3. reduzir de forma rasterizável o máximo da região-alvo;
4. usar média apenas como desempate, nunca para ocultar pior máximo;
5. gerar comparação e vistas em pasta nova antes de alterar a cage padrão.

A compensação do envelope faz parte do candidato. Resultado obtido encolhendo
ou ampliando o carro fora do P0 é rejeição, não melhora.

#### B2.2 — ordem regional

Trabalhar uma região por vez, mantendo as demais congeladas:

1. teto dianteiro lateral, em `z ≈ 0,40 m`, hoje baixo em 20,5 mm;
2. largura central em planta, em `z ≈ 0,06 m`, hoje excessiva em 42,9 mm;
3. cintura alta frontal, em `y ≈ 0,83 m`, hoje excessiva em 32,7 mm;
4. repetir a medição completa, porque o pior ponto pode migrar após a correção.

#### B2.3 — busca limitada e decisão de topologia

Para cada região, medir primeiro a sensibilidade de cada controle permitido
com um deslocamento positivo e um negativo. Prosseguir somente com controles
que alterem o raster final; testar isoladamente os sensíveis e, se necessário,
os pares formados pelos três melhores. Não fazer busca global sem limite.

Se a varredura completa não produzir candidato pelo contrato B2.1, registrar o
grau de liberdade ausente. Inserir no máximo um controle semântico local quando
a ausência estiver medida. Se a mesma região falhar novamente com esse
controle, encerrar B2 com decisão `redesenhar` ou `interromper`, em vez de
continuar ajustando números.

#### B2.4 — saída

B2 termina somente quando as três vistas passam simultaneamente. Até lá, cada
promoção parcial permanece privada e não habilita superfície, crítico ou
recortes.

### B3 — superfície e pacote

Somente após B2, verificar normais/continuidade, executar rejeições, despachar
o crítico independente com vistas isoladas e produzir pacote reproduzível.

### B4 — recortes e decisão

Somente após B3 e aceite humano, provar arco e demais recortes com comparação
interna própria e regressão global. Consolidar `aprovar`, `corrigir`,
`redesenhar` ou `interromper`.

## Gates de saída

1. `npm test`, tipagem, build e gates do `INDEX.md` passam;
2. a cage continua direta, quadrilateral, fechada e semanticamente editável;
3. a faixa nova resolve o acoplamento medido, não apenas a média;
4. as três silhuetas passam P0 antes de recortes;
5. o pacote visual e o crítico independente não têm achados abertos;
6. somente aceite humano explícito permite B4 e qualquer promoção posterior.

## Encerramento

Encerrado em 2026-08-23 por decisão explícita do usuário. A B1 provou a faixa
vertical e a B2 preserva como contraevidência o campeão reprovado
`forma-global-r2b-b2`, com 20,5/42,9/32,7 mm. B2–B4 não prosseguem.

O motivo não é apenas o não atendimento dos três limiares: as imagens abertas
não apresentam leitura convincente de carro, e o ciclo regional continuaria
otimizando uma representação global já rejeitada. Evidências, IDs, testes e
artefatos privados permanecem preservados; nada é promovido ao núcleo, receita
pública ou catálogo.

O sucessor é o plano ativo de
[`arquitetura híbrida nativa de autoria por famílias`](2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md),
que separa aprovação da plataforma e do artefato, exige blocagem global
reconhecível e abre capacidade nativa de superfície antes de novo refinamento.
