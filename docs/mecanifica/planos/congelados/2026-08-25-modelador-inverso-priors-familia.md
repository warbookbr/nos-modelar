# Modelador inverso com priors por família

**Estado:** congelado
**Congelado em:** 2026-08-26, por decisão do usuário · **Base:** `bb2e79a`
**Responsável original:** Codex
**Dossiê vinculante:** [`../../DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md`](../../DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md)
**Execução detalhada:** [`../../../superpowers/plans/2026-08-25-modelador-inverso-priors-familia-p0.md`](../../../superpowers/plans/2026-08-25-modelador-inverso-priors-familia-p0.md)
**Substituído por:** o plano de modelagem dirigida pelo usuário, que hoje vive
na branch `claude/revisar-plano-ativo-cyj8c3` e ainda não chegou à `main`. O
congelamento não depende dele: a decisão que tirou este plano do caminho crítico
foi tomada em 2026-08-26 e vale aqui do mesmo jeito.

## Por que foi congelado

Este plano gasta P0 inteiro provando que **uma IA julga forma de maneira
confiável**: corpus cego, pares A/B embaralhados, holdout, limiar escolhido só
na calibração, bootstrap por objeto. Toda essa maquinaria existe porque o
julgamento seria automático.

O usuário decidiu assumir o julgamento. Ele olha a imagem e diz o que está
errado em linguagem comum. Com isso, a pergunta que P0 tentava responder deixa
de estar no caminho crítico — e P0-C, que estava `bloqueado por execução
independente`, deixa de bloquear qualquer coisa.

Nada aqui foi refutado. O plano não está errado; está **fora do caminho
escolhido agora**. Ele foi movido inteiro, com suas ferramentas, para poder
voltar sem reconstrução.

## Condição de descongelamento

O usuário registrou a intenção de reavaliar este plano se a modelagem dirigida
não der certo — e também de considerá-lo **em adição** a ela, não só como
substituto. Dois gatilhos concretos:

- a modelagem dirigida falhar em produzir um carro aceito pelo usuário, ou
- a modelagem dirigida funcionar mas o custo de atenção do usuário por rodada
  se mostrar alto demais para escalar além do primeiro carro.

No segundo caso, o que se descongela primeiro é justamente a calibração cega do
crítico: ela vira a maneira de **filtrar rodadas antes de chegarem ao usuário**,
com o veredito humano continuando soberano.

## O que continua de pé e foi levado para o plano novo

- a classificação de alvo em `direcao-estetica`, `alvo-geometrico` e
  `indeterminado`, que impede tentar encaixe milimétrico num desenho que não
  suporta isso (`src/autoria/qualificacao-alvo.js`);
- a regra de julgar **cada vista separada e grande**, com mosaico servindo só de
  índice;
- os recortes regionais N6 já construídos (`tools/mecanifica/recortar-regioes-n6.mjs`).

## O que fica parado junto com ele

A infraestrutura de calibração cega em `tools/modelagem/`: geração de corpus,
inventário de candidatas, contrato de julgamento, transporte cego
`mecanifica.lote-critico-p0@2`, CLI de exportação/ingestão e análise com
bootstrap agrupado. Nada foi apagado e os testes continuam verdes; apenas não há
plano ativo que a consuma.

## Objetivo verificável

Entregar um sistema nativo em que IA consiga ajustar, revisar e editar objetos
reconhecíveis de veículos, robôs humanoides e peças mecânicas, usando núcleo
compartilhado e modelos de forma separados por família. O primeiro canário é um
cupê completo; detalhe só abre depois de reconhecimento multivista cego.

## Mudança de rota

O plano por seleção foi cancelado antes de implementação. Ele dependia de três
premissas não provadas: um gerador manual capaz de alcançar a forma, uma IA
repetível ao ordenar e um alvo multivista geometricamente consistente. O novo
plano mede essas condições antes de investir e parte de priors 3D plausíveis,
não de caixas ou linhas inventadas para a rodada.

## Invariantes

- Preservar receitas determinísticas, identidade semântica, montagem, revisão,
  impacto, bancada, câmeras, hashes e portas MCP existentes.
- O núcleo não conhece famílias nem importa Three.js.
- O runtime não depende de Blender ou outro modelador externo.
- Ativo externo só entra com licença, origem, hash e conversão para formato
  canônico interno; algoritmo publicado é hipótese a reproduzir, não atalho.
- Alvo é classificado como `direcao-estetica`, `alvo-geometrico` ou
  `indeterminado` antes do fitting.
- Cada vista é julgada separadamente, grande, em câmera pareada; mosaico apenas
  indexa. `reprovar` e `indeterminado` bloqueiam.
- Plataforma e artefato recebem vereditos separados. Métrica não promove forma.

## Progressão cumulativa

| Fase | Entrega | Gate de avanço | Parada |
| --- | --- | --- | --- |
| P0 | base de evidência confiável | suíte oficial verde; alvo classificado; avaliador calibrado | falha de portabilidade, alvo indeterminado ou crítico não repetível |
| P1 | corpus automotivo legal e canônico | 2+ arquétipos de base e 1 holdout com regiões/landmarks | licença, topologia ou correspondência insuficiente |
| P2 | prior automotivo deformável | holdout reconhecível e melhor que alinhamento rígido/caixas | espaço alcançável não cobre o holdout |
| P3 | grafo e compilador de superfície | corpus prova G0/G1/G2 normalizado e conectividade | continuidade depende da tesselação ou abre partes |
| P4 | fitting inverso de câmera e forma | vence rígido, vizinho e busca aleatória no holdout | otimização não supera baseline |
| P5 | preferência e diversidade | repetibilidade fora da amostra, empates e zero promoção grosseira | juiz instável, enviesado ou população colapsada |
| P6 | cupê canário completo | reconhecimento cego em vistas individuais + aceite do usuário | qualquer vista não lê como o mesmo carro |
| P7 | edição semântica e MCP | intenção altera região pedida sem regressão global | edição exige coordenada bruta ou rompe identidade |
| P8 | módulos humanoide e peça | plano e canário próprios por família | tentativa de forçar prior universal |

## P0 — confiança antes de geometria

1. Corrigir a resolução `repo://` para confinamento portátil, a guarda da raiz
   histórica `fps` e a instabilidade agregada do import MCP; registrar causa por
   falha e obter os gates completos no mesmo Windows.
2. Versionar contrato de qualificação de alvo. Reclassificar N6 como
   `direcao-estetica`; criar um alvo sintético calibrado do mesmo objeto para as
   provas quantitativas.
3. Montar corpus de avaliação com controles sadios, V-01 a V-32 e mutações de
   defeitos conhecidos, sempre por vista individual.
4. Executar comparação fria em pares repetidos e embaralhados, permitindo
   empate e `indeterminado`. Registrar distribuição, intervalo de confiança,
   holdout e erros. A calibração escolhe o limiar; manifesto e regra ficam
   congelados antes de revelar o holdout.

**Gate P0:** suíte completa verde; todos os alvos classificados; avaliador
passa o protocolo congelado: ao menos 80 itens de holdout balanceados (40 pares
decisivos, dos quais 20 têm defeito grosseiro; 20 empates; 20 indeterminados),
originados de ao menos 20 objetos e no máximo quatro itens por objeto; quatro
apresentações por item e ordem A/B invertida duas vezes. A unidade de análise é
o item; intervalos reamostram o objeto como cluster. O limite inferior bootstrap
95% da repetibilidade deve ser ≥ 0,80; o da diferença de acerto contra o melhor
baseline deve ser > 0; nenhum controle de defeito grosseiro pode ser promovido.
Sem suíte, alvo e avaliador, P1 não abre.

## P1 — aquisição e normalização do prior

Criar manifesto de licença/proveniência e representação neutra interna. O
canário começa com pelo menos dois arquétipos de cupê para formar a base e um
terceiro reservado como holdout. Cada ativo precisa de escala, eixos, landmarks,
regiões e relações automotivas. Cobertura insuficiente interrompe a fase; não se
preenche ausência com coordenadas da IA.

## P2 — modelo deformável por regiões

Separar proporção global de deformações de nariz, cabine, ombro, flanco, arcos e
traseira. Seleção discreta escolhe arquétipo; parâmetros contínuos deformam
regiões mantendo conectividade e correspondência semântica. O holdout precisa
ser reconstruído melhor que um template rígido e que o gerador manual cancelado.

## P3 — superfície semântica nativa

Introduzir grafo estável de regiões/fronteiras/landmarks e compilador que possa
combinar patches, SubD e deformação sem expor vértice como identidade. Fronteira
compartilhada vale apenas G0; G1/G2 exigem derivadas transversais/ribbons e
fairing. V-23 é corrigido antes de qualquer gate angular.

## P4 — modelagem inversa

Ajustar câmera e forma em conjunto contra landmarks, silhuetas e regularização
do prior. Perdas determinísticas e explicáveis vêm primeiro. Cada execução fixa
seed, orçamento, versões e baselines equivalentes; ganho só existe em holdout.

## P5 — preferência e Quality Diversity

Somente após P0, P2 e P4. Preferência ativa aprende comparações com incerteza,
empates e correção periódica; arquivo de diversidade conserva soluções de
caráter diferente. O julgamento subjetivo complementa o fitting, nunca substitui
alvo calibrado, conectividade ou veto visual.

## P6 e P7 — objeto e edição

O cupê nasce inteiro. Cada rodada regenera referência/render/diferença por vista
e uma regressão global; crítico frio vê o artefato sem a narrativa do autor.
Depois do reconhecimento cego e aceite, edição por intenção atua nos parâmetros
semânticos e publica receita/revisão pelas portas existentes.

## P8 — famílias seguintes

Humanoide recebe esqueleto, volumes, juntas e casca próprios. Peça mecânica usa
árvore de features e interfaces, reaproveitando primeiro o motor procedural.
Cada módulo tem corpus, perdas, canário e plano executivo separados; somente os
serviços neutros entram no núcleo.

## Rastreabilidade

Toda fase grava entradas, licenças, versões, seed, configuração, métricas,
imagens individuais, críticos, veredito e hashes. O gate seguinte referencia o
hash do anterior. Reprovação permanece no histórico e só reabre com nova
hipótese explícita e teste discriminante. O registro de falhas recebe toda nova
quebra antes da próxima rodada.

## Fora de escopo deste plano

Produção artística final, UV/textura, fabricação e recriar um modelador geral.
Implementa-se apenas a capacidade exigida pelos gates. Nenhuma fase autoriza a
seguinte automaticamente, e “mais detalhe” não corrige falha de reconhecimento.

## Registro

- **V1 — 2026-08-25:** plano aberto e plano por seleção cancelado. P0 é a única
  execução autorizada; P1–P8 são continuidade condicionada aos gates.
