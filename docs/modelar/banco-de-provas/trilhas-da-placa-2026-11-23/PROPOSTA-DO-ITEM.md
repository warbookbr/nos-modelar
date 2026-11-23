# Proposta para o nos-mecatronica: o item `ligacoes` no pedido 1.1

Texto do Modelar para a mecatrônica, entregue pelo plano das trilhas e validação da placa (2026-11-23). Quem muda o esquema é a mecatrônica, pelo fluxo dela e pela decisão 0004 de lá; o Modelar usa o formato abaixo nos exemplos até a versão sair.

## O que o item pede

O item `ligacoes` diz ao Modelar que terminais de uma placa são a mesma rede, para o Modelar traçar o cobre e conferir que cada rede vira um cobre contínuo e que nenhum cobre une duas redes. Ele leva topologia e exigência de forma, sem circuito: tensão, corrente, polaridade e tipo de sinal continuam da mecatrônica.

```json
{
  "id": "ligacoes-placa",
  "tipo": "ligacoes",
  "placa": "placa",
  "redes": [
    { "id": "vin-12v", "terminais": [{ "peca": "j7", "porta": "1" }, { "peca": "u2", "porta": "1" }], "larguraMinima": 1.0, "distanciaMinima": 0.3 }
  ],
  "motivo": { "linhaDaMatriz": "lig-cobre-confere", "texto": "...", "resultado": { "grandeza": "redes da placa", "valor": 47, "unidade": "redes", "origem": "calculado" } }
}
```

- `placa`: o id da peça da ficha que é a placa.
- `redes`: ao menos uma; cada rede tem `id` no padrão de id da ponte e ao menos dois `terminais`, cada um uma porta `{ peca, porta }` da ficha, a peça sendo o componente montado na placa e a porta o terminal que ele publica.
- `larguraMinima` e `distanciaMinima`, opcionais, em mm: a largura da trilha e a distância até cobre de outra rede que a camada elétrica de lá calcula pela corrente e pela tensão. Sem elas valem as regras de fabricação do Modelar, e com elas vale o maior dos dois.
- `resposta`: o Modelar escreve `cumprido` com a revisão da ficha, ou `nao-cumprido` com o motivo e as redes que não fecharam, como nos outros itens.

## O que o conferidor de lá passaria a recusar

A porta que não existe na ficha, a porta citada em duas redes, a rede com menos de dois terminais e a placa que não é peça da ficha. O Modelar confere de novo do lado dele, pelo cobre medido.

## Versão

É tipo de item novo e opcional, então a versão sobe para 1.1, com o SHA-256 dos esquemas em `versoes.json` e a 1.0 continuando aceita.
