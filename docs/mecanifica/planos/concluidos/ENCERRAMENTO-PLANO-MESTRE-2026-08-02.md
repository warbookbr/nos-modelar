# Encerramento do plano mestre — 2 de agosto de 2026

## Decisão

O plano mestre foi aposentado porque acumulou 2.417 linhas e passou a exercer
quatro papéis: histórico, backlog, especificação e diário. O tamanho não era
apenas editorial: havia decisões incompatíveis dentro das fontes de verdade.

A versão integral anterior permanece no commit `41f0c50`. O fechamento abaixo
é a síntese durável; não é um novo plano de implementação.

## Conflito que cancelou o restante do Ciclo 6

O Ciclo 6 importado mandava adicionar `segmentosCurva` a `filete` e fazê-lo
construir cantos compostos. Depois da convergência, o contrato aceito é outro:

- `filete` conserva o significado e a compatibilidade de chanfro com um painel;
- `arredondarAresta` representa arredondamento real com vários painéis;
- o Escopo A de `arredondarAresta` já está implementado;
- o canto composto de `chamferBox` permanece no Escopo B, falhando fechado.

Executar F0b, F3 e F4 como escritos criaria dois significados para `filete` e
contrariaria [`FILETE-V2.md`](../FILETE-V2.md). F2 e F5 estavam acoplados ao
mesmo pacote de 29 commits; não havia motivo para conservar a agregação depois
de sua premissa central cair.

## Destino de cada frente ainda citada como pendente

| Frente antiga | Destino final |
|---|---|
| F0a | concluída: régua, canons e ferramentas de gate entregues |
| F0b | cancelada: refatoração existia para suportar o desenho rejeitado do filete |
| F1 / A-30 | concluída e aceita separadamente; `_flange-de-tubulacao` prova grupos |
| F2 / A-34 | não iniciada; voltou como candidato `AUT-01`, sem acoplamento ao filete |
| F3 / A-36 | roteiro cancelado; aresta simples é atendida por `arredondarAresta` |
| F4 / A-37 | roteiro cancelado; canto composto voltou como `AUT-02`/Escopo B |
| F5 | cancelada como fechamento conjunto; documentação passa a refletir os resultados reais acima |

Cancelar significa que as fatias não são dívida residual. Qualquer capacidade
válida precisa de um plano novo, curto e aprovado.

## Fases e horizontes

- fases 0 a 4 permanecem concluídas;
- a antiga Fase 5 nunca teve plano executivo de narrativa. Seu conteúdo foi
  transferido como candidato `PROD-01` ao domínio do repositório do produto;
- a antiga Fase 6 entregou partes concretas — linguagem semântica, ferramentas
  headless e fluxo de IA — mas seu horizonte aberto foi desmontado em candidatos;
- caminhada, novos sistemas e realismo F3 continuam visão/backlog, não pendência
  deste encerramento.

## Numeração

A-38 já identifica a revisão visual econômica resolvida. O plano importado
tentou reutilizá-lo para a quina do furo e ensaiou A-39 a A-45 sem registrar as
entradas em `ATRITOS-AUTORIA.md`. Essa alocação fica anulada. IDs de atrito só
passam a existir quando entram no registro, sob reserva de coordenação.

## Resultado operacional

- nenhum plano está ativo por consequência automática deste fechamento;
- candidatos vivem no backlog e não autorizam implementação;
- novos planos têm um resultado, até 10 fatias, até 200 linhas e gate de saída;
- somente um plano pode estar ativo no índice;
- um plano concluído ou cancelado não volta a crescer.
