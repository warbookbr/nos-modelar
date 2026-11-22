# Formas que faltavam: o anel, o toro e a bacia provados, a haste no esboço e a curva paralela na rede

**Estado:** ativo

**Território:** `modulos/esboco-nucleo/`, `src/autoria/executar-receita.js`, `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`, `procedural/nucleo/operacoes/primitivas-superficie.js`

A fatia 3 mexe em `procedural/nucleo/gaiola-por-rede.js` e só entra no território depois que o plano do G2 de produção na lataria fechar, porque os dois trabalham no núcleo de superfície e a pessoa decidiu em 2026-11-22 que o G2 vai antes.

**Responsável:** a IA da sessão na nuvem. A pessoa aprovou e ativou o plano em 2026-11-22.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-22.

## Problema observado

O backlog listava cinco formas como primitivas que faltavam: a tampa em anel dos sólidos ocos, o toro no esboço, a bacia em casca, a haste entre dois pontos no esboço 2.0 e a curva paralela a outra na rede de curvas. Ao ler o núcleo em 2026-11-22, o anel e o toro já existiam pelo `lathe` de perfil fechado, com teste próprio, e a bacia pela `casca` e pelo `lathe` com `espessura`. Mesmo assim, a `casca` não estava no registro da receita comum, só no das famílias. O backlog não foi atualizado quando as capacidades entraram, e um comentário do `lathe` ainda dizia que o toro estava fora do escopo. O processo não pegaria isso sozinho.

## Resultado

O agente faz anel, toro, bacia e tubo oco num esboço ou numa receita comum com as operações que existem, por exemplos provados, e faz a barra entre dois pontos no esboço 2.0 por `haste: { de, para, raio | secao }`.

## Filtro Agent-First

A `haste` é ENVOLVER: ela junta o gerador e a posição sobre o `cilindro`, o `cubo` e o `rotaciona` do núcleo, sem operação nova, e a caixa final é conferida contra a prevista como em toda forma do atalho. A `casca` no registro da receita é USAR DIRETO: a operação e o contrato de origem já existiam. A curva paralela fica ADIAR até o território do G2.

## Incluído

1. A prova de que o anel, o toro, a bacia redonda, a bandeja reta, a bacia inclinada e o tubo de seção variável saem fechados, escrita como no esboço 2.0 (`modulos/esboco-nucleo/tests/formas-ocas.test.js`), o caso no guia de gotchas por operação, a `casca` no registro da receita comum, a conversão em mm do esboço para `casca` e para a `espessura` do `lathe`, o comentário velho do `lathe` corrigido e os três itens tirados do backlog.
2. A forma `haste` no esboço 2.0, com as pontas em ponto ou em âncora de outra forma, o teste (`modulos/esboco-nucleo/tests/haste.test.js`), o README do esboço e o leitor do esboço antigo apontando para ela.
3. A curva paralela a outra na rede de curvas, com os retalhos entre as duas, quando o território permitir.

## Excluído

A comparação da silhueta com uma imagem de referência no esboço continua no backlog. A primitiva nova de bacia ou de anel não entra, porque as operações existentes bastam.

## Invariantes

O núcleo não ganha operação nem muda a malha de nenhuma peça. O acervo sai igual. A receita que não usa `casca` executa como antes.

## Gate de saída

1. Os testes de formas ocas e da haste passam, com a haste certa nas cinco direções, na seção retangular e na âncora, e as recusas dizem o campo e o motivo.
2. `npm run gates` verde e o CI verde.
3. Os itens resolvidos saem do backlog, e a instrução de conferir o backlog ao entregar uma capacidade está no índice de planos.

## Fatias

1. Feita em 2026-11-22: formas ocas provadas, `casca` no registro da receita comum, guia e backlog.
2. Feita em 2026-11-22: a `haste` no esboço 2.0.
3. A curva paralela na rede de curvas, depois do território do G2.

## Riscos e parada

Se a `casca` no registro da receita mudar a malha ou o tempo de alguma peça do acervo, ela sai do registro e volta à pessoa. Se a curva paralela pedir mudança na emenda da rede que o plano do G2 também toque, a fatia 3 espera o fechamento dele.

## Fechamento

Preencher somente ao concluir ou cancelar.

## Andamento

Em 2026-11-22 as fatias 1 e 2 foram entregues, e a fatia 3 espera o fechamento do G2.
