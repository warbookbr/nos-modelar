# O apoio no chão e a auditoria da montagem construída

Consulta sob demanda de [`MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md), que traz o resumo. Nasceu na fatia 3 do
plano do avião, em 2026-10-16: as rodas dos trens tinham saído do esboço 17 mm
acima do chão e nenhum gate media apoio, e a auditoria de interseções entre peças só rodava sobre peças publicadas.

A montagem v5 pode declarar `apoioNoChao`, ao lado de `auditoriaIntersecoes`. O
campo é opcional, vale só na montagem raiz e não muda a versão: a montagem sem
ele é lida igual a antes, e um leitor anterior ao campo recusa a montagem que o
traz, porque as chaves da v5 são fechadas. Ele traz o `plano` do chão, com
`normal` unitária e `altura` ao longo dela, a `toleranciaNumerica`, que é
obrigatória, e `apoiam`, a lista não vazia de caminhos de instância que se
apoiam no chão.

```json
"apoioNoChao": {
  "plano": { "normal": [0, 1, 0], "altura": 0 },
  "toleranciaNumerica": 0.001,
  "apoiam": [{ "caminho": ["trem-do-nariz"] }, { "caminho": ["trens-principais"] }]
}
```

Cada item de `apoiam` pode trazer `parte`, e então só as faces dessa parte da
peça contam: os trens principais declaram `rodaPrincipalD` e `rodaPrincipalE`
em itens separados, e uma roda no ar não se esconde atrás da outra. Sem `parte`
vale a instância inteira, e nas peças declaradas só por parte as outras partes
entram na regra de não passar abaixo do chão.

A medida confere que o ponto mais baixo de cada instância de apoio, tomado nos
vértices que a malha usa e já no mundo, fica a no máximo a tolerância do plano,
para cima ou para baixo, e que nenhuma outra instância passa abaixo do plano
além da tolerância. Instância sem malha reprova como inconclusiva. A altura
medida está na unidade da montagem, e a tolerância também.

`npm run etapas -- <montagem.json> --auditar` resolve a montagem com as etapas
que já têm geometria e roda a auditoria de interseções, com a profundidade de
cada invasão, e a medida de apoio. O relatório traz primeiro os pares
`interpenetram` e `encostam` que a montagem não declarou, depois os declarados,
os declarados sem contato e a cobertura, e por fim o apoio de cada instância. A
saída é 1 quando um par não declarado se invade ou o apoio reprova, e 2 quando
nada reprova e a auditoria é incompleta, seja por par que não pôde ser medido,
seja por etapa ainda sem geometria. Nesse segundo caso o apoio declarado numa
instância ainda não construída fica fora da medida e o relatório diz qual, e
as peças que já existem continuam conferidas contra o chão. A profundidade é um
piso, porque só amostra pontos, e vem como indeterminada quando os sólidos se
cruzam apenas pelas arestas. `--json` imprime o resultado inteiro.

Uma expectativa explica um par que se invade e o tira da reprovação, seja qual
for a profundidade; o relatório continua mostrando a profundidade do par
declarado. As tolerâncias da auditoria de interseções e do apoio não têm teto,
e o relatório as imprime. A declaração de `apoioNoChao` numa submontagem não
vale, porque só a da raiz é lida, e o relatório lista as que encontrar. Só o
comando das etapas mede o campo: `descrever_montagem` e `revisar_montagem`
resolvem a montagem com ele e não o medem, de modo que uma roda no ar só reprova
quando alguém roda `--auditar`.
