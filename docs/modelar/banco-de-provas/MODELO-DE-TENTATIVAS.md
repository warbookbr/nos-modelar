# Modelo da tabela de tentativas

Todo plano de modelagem (o que tem no território um caminho em `procedural/pecas/`, `procedural/familias/` ou `procedural/nucleo/`) guarda no banco de provas dele uma tabela com uma linha por tentativa. Quem retoma um defeito lê a tabela antes de propor um ensaio, e não repete o que já falhou.

```
| Hipótese | Ensaio | Resultado medido | Destino |
| --- | --- | --- | --- |
| o que se achou ser a causa | o que se mudou ou mediu, com o comando | o número ou a imagem que saiu | ficou, ficou (parcial) ou descartada |
```

A hipótese diz a causa suspeita em uma frase. O ensaio diz o que foi mudado ou medido, com o comando que o repete. O resultado medido traz o número (antes e depois), e não a impressão. O destino é `ficou` ou `descartada`, com o motivo quando não for óbvio.

Preencha durante o trabalho, uma linha ao fim de cada ensaio, mesmo o que não deu certo: a tentativa descartada é a que mais poupa tempo a quem vem depois. Deixar para o fechamento perde as que ninguém mais lembra.

No fechamento, a lição da tabela vai para o guia da técnica (a pasta `docs/modelar/guias/` ou a instrução da ferramenta), numa frase abaixo da tabela, e a correção que o objeto revelou vai para a ferramenta ou o gate, e não para a receita do objeto. A conferência dos planos (`npm run planos:check`) recusa o plano de modelagem que passa a `concluído` sem uma tabela com estas quatro colunas, em ordem, num `.md` da pasta do banco de provas dele.

Exemplo real: a tabela do estudo dos arcos do carro quadrado, no banco de provas da topologia de vão.
