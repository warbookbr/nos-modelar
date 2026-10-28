# Homologação do fluxo de IA

O que é homologado aqui é o **fluxo de autoria** — briefing, execução na bancada,
medição e revisão. Nunca a geometria. A peça de cada caso é o veículo da prova e
continua sendo exemplo, como todas as outras; ver "Peças são exemplos" no
`README.md`.

## Protocolo

Cada caso começa com briefing fechado, referências identificadas e uma parte
semântica. A IA trabalha na bancada neutra. Cada tentativa é preservada. A
revisão oficial mede receita, identidade, envelope, orçamento, portas, vistas e
materiais. Quatro imagens canônicas são lidas. Promoção só ocorre pelo comando
oficial de revisão.

Critérios gerais: zero órfãos e faces sem identidade; corpos e partes conforme o
briefing; envelope e orçamento respeitados; passagem/abertura legível quando
expressável; vistas não cortadas nem pequenas; grupos semanticamente nomeáveis.

## Resultados

| Caso | Estado | Resultado |
|---|---|---|
| 1 | concluído | pacote e revisão promovida pelo fluxo oficial |
| 2 | concluído | `_placa-adaptadora`, revisão `r001` promovida; tentativa recusada preservada |
| 3 | retirado | a pergunta que ele faria foi respondida com evidência mais forte |

No Caso 2, vistas frontal e direita são naturalmente finas e válidas, mas não
mostram os furos de perfil. Essa divergência do briefing foi registrada, sem
distorcer geometria ou câmera. A abertura oblonga continua uma pergunta de
capacidade; não é simulada com pintura ou JavaScript.

## Limites e evidências

O fluxo não cria contrato genérico de materiais nem solver de montagem. A
abertura oblonga deixou de ser limite depois deste registro: `furo` passou a
expressar rasgo por `ate`, sem operação nova. Os pacotes dos dois casos moram
em `tools/mcp/pacotes/`, junto do servidor que os lê.

## O que os dois relatos da v2 ensinaram

Os relatos de processo dos casos 1 e 2 foram apagados em 2026-09-22 com a pasta
`autoria-assistida/`. O que eles registravam de durável está aqui; o resto era
diário de comandos de uma execução encerrada.

No caso 1, o mancal, o revisor recusava a `interface` que o descritor oficial
já emitia nas portas cilíndricas, e isso impedia qualquer peça com porta
mensurável de gerar revisão. O formato de revisão passou a aceitar a
interface. O mesmo caso mostrou que a peça declarava `fechada: true` com duas
costuras soltas em cada anel de `lathe`: descrição estrita, gabarito e revisão
visual aceitaram a promessa, e só o gate do acervo a confrontou. A costura hoje
é provada em `procedural/nucleo/operacoes/lathe-fechado.test.ts`.

No caso 2, a placa, a câmera recusava a vista frontal de uma chapa de 18 mm
porque exigia área mínima, e uma chapa fina tem área pequena de verdade. A regra
passou a pedir 32% no lado longo e 4% no curto, em `src/bancada/criar-ambiente.js`.
O caso deixou uma lição para quem escreve briefing: pedir que os furos sejam
distinguíveis nas quatro vistas é pedido impossível para uma chapa fina, porque
a vista de espessura não mostra furo nenhum. O critério certo nomeia as vistas
em que o detalhe aparece. O endereço único para uma fileira linear de furos
continua aberto no `BACKLOG.md` dos planos.
