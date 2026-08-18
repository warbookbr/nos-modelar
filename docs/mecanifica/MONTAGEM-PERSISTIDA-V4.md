# Montagem persistida v4 e expectativas de interseção

A v4 preserva a composição, as poses e as relações da v3 e acrescenta uma
política explícita para a auditoria geométrica de interseções. Ela não muda a
geometria das peças nem transforma uma expectativa em aprovação.

## Formato

Além dos campos da v3, a raiz v4 exige:

```json
{
  "auditoriaIntersecoes": {
    "toleranciaNumerica": 0.000001,
    "expectativas": [
      {
        "id": "interferencia-do-encaixe",
        "a": { "caminho": ["pino"] },
        "b": { "caminho": ["luva"] },
        "motivo": "interferencia de montagem declarada"
      }
    ]
  }
}
```

Cada lado termina em uma peça e usa caminho semântico relativo à montagem
declarante. IDs de expectativa são únicos. O leitor ordena expectativas por ID,
recusa caminhos iguais, duplicidades, tolerância negativa e motivo vazio.

Uma expectativa somente explica a intenção registrada. O par continua sendo
auditado e continua aparecendo como `interpenetram`, `encostam`, `separadas` ou
`inconclusivo`. Nenhuma relação existente cria expectativa automaticamente.

## Auditoria

`src/autoria/auditar-intersecoes-montagem.js` exporta:

```js
auditarIntersecoesMontagem(montagemResolvida, {
  caminho: ['submontagem', 'peca'],
  modoFoco: 'incidente',
  toleranciaNumerica: 0.000001,
})
```

O serviço expande submontagens até peças-folha. Sem `caminho`, testa todos os
pares da raiz. Com foco, `modoFoco: 'incidente'` (padrão retrocompatível)
testa cada folha do foco contra todas as folhas da raiz; `modoFoco: 'interno'`
restringe o escopo a pares em que os dois lados pertencem ao foco. Em ambos os
modos, `paresOmitidosPorFoco` informa os pares fora do escopo e a cobertura fica
incompleta quando há omissões. Caixas mundiais só eliminam pares seguramente
separados; a decisão restante usa a malha final e teste de contenção.

A saída usa `formato: mecanifica.auditoria-intersecoes`, `versao: 1` e informa
escopo, tolerância, pares ordenados, método, expectativas associadas e
cobertura. `inconclusivo` é obrigatório para malha inválida/aberta quando a
geometria exige concluir sobre um sólido. Timeout ou falta de cobertura não
vira ausência de interseção.

## Consumo pela IA

`descrever_montagem` continua sendo contexto estrutural barato e não executa a
auditoria por implicação. `revisar_montagem` executa a auditoria e transporta o
resultado em `auditoriaIntersecoes`. A revisão:

- reprova se encontrar `interpenetram`;
- fica incompleta se houver `inconclusivo`, foco parcial ou vista indisponível;
- só remove a limitação de colisão do contexto quando todos os pares da raiz
  foram decididos;
- nunca chama o resultado de homologação, aprovação ou validade completa.

V1, v2 e v3 continuam legíveis com seus significados anteriores. Solver,
reposicionamento, folga universal, movimento e espaço varrido permanecem fora.
