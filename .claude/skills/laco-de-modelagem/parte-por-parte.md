# Parte por parte

Apoio da skill [`laco-de-modelagem`](SKILL.md). Leia quando o objeto tiver mais de uma parte, antes de despachar a primeira etapa e de novo antes de fixar, reabrir ou aceitar uma etapa.

Num conjunto complexo, a parte em trabalho é vista e criticada isolada
(`--selecionadas=<parte> --modo=isolar --focar`), ao lado do recorte dela na
referência, além da vista do conjunto, como diz a skill
[`criar-peca`](../criar-peca/SKILL.md).

Um objeto de várias partes é construído uma etapa por vez, na ordem de
`etapas` da montagem v5
([`MONTAGENS-SEMANTICAS.md`](../../../docs/modelar/usar/MONTAGENS-SEMANTICAS.md)).
Cada etapa é uma parte: ela nasce com o tamanho e a posição que os vínculos e
as posições por porta tiram das partes já fixas, e a junta com elas é medida
quando ela entra. Uma peça de uma parte só é uma etapa só.

Cada etapa despacha um `modelador` NOVO. Ele lê do disco o plano, as partes já
fixas, o registro das rodadas anteriores e a nota que o modelador da etapa
anterior deixou. O estado mora nos arquivos; um agente que atravessa várias
etapas leva para as seguintes o que entendeu errado na primeira.

Ao fim de cada etapa, pare e mostre à pessoa as vistas da parte montada sobre
as já fixas, as medidas da junta e o veredito do crítico. A parte sozinha não
basta: a pessoa não julga a altura de um anel sem vê-lo sobre a base. As vistas
montadas, em ortográfica, saem de
`npm run etapas -- <montagem.json> --olhar` (com `--foco <instância>` o quadro fecha na caixa dela), e entram também
no pacote do crítico, que `vistas:critica` já monta com o quadro na peça. A etapa só fica fixa com o aceite dela, e só
depois disso a próxima começa. Antes de mostrar, o modelador vê a chapa da etapa em segundos com `npm run vista:rapida -- <peça> --ate-passo=N`
e um ponto de perto com `bancada --mirar=x,y,z`
([`PARE-E-ANALISE.md`](../../../docs/modelar/usar/PARE-E-ANALISE.md#olhar-de-perto-sem-recortar-captura)). Etapa fixa que uma mudança anterior quebrou
volta na frente de todas. O estado e a próxima etapa saem de:

```bash
npm run etapas -- <montagem.json>
npm run etapas -- <montagem.json> --fixar <instância> --por <quem aceitou>
```

O segundo comando recusa fixar fora de ordem, sem o crítico ter fechado a peça
da etapa, sem nota de passagem na última rodada, com junta reprovada ou sem
aceite. Não contorne a recusa: ela é o motivo de o laço não virar bola de
neve.

Uma etapa só passa com defeito em aberto por aceite humano. Quando o laço
para no limite ou sem convergência e a pessoa diz, com as palavras dela, que
aceita a etapa como está, fixe com `--aceite-humano` e ponha em `--por` quem
aceitou. Os defeitos entram no aceite gravado. Nenhum agente usa essa opção por
conta própria, nem por achar o defeito pequeno, e ela é recusada no meio do
laço.

Só a pessoa reabre uma etapa fixa, pelo mesmo critério do aceite humano, com
`npm run etapas -- <montagem.json> --reabrir <instância> --por "<quem, data: motivo>"`.
Reabrir só acrescenta um evento, sem medir: o aceite fica no registro e a etapa volta a aberta. O estado nunca é gravado, sai da
comparação da impressão de agora com a do aceite vigente; a quebrada cuja mudança é desfeita volta a fixa sozinha, e só a reabertura a faz
aberta. Aceitar uma etapa não refixa as posteriores quebradas (o `--fixar` avisa): reabra e aceite cada uma. O registro antigo recusa e diz como
recuperar do histórico a migração, que saiu em 2026-11-26. Contrato em
[`MONTAGENS-SEMANTICAS.md`](../../../docs/modelar/usar/MONTAGENS-SEMANTICAS.md#o-registro-de-etapas-eventos-impressão-e-leitura-derivada).
