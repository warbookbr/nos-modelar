---
name: criar-peca
description: Criar ou refinar uma peça 3D procedural da Mecanifica como IA, escrevendo PASSOS e provando o resultado na bancada neutra com medidas, vistas e crítica objetiva.
---

# Criar peça

Antes de escrever o primeiro passo de uma peça NOVA, conduza a rodada de
alinhamento em [`../alinhar-modelagem/SKILL.md`](../alinhar-modelagem/SKILL.md)
e escreva o `PLANO` da receita. Sem ele, parte prometida e não entregue é
invisível para toda medida, e `npm run guarda:acervo` reprova a peça na entrada
do acervo.

Use esta skill quando o alvo for uma peça geométrica editável. Se o alvo for
uma árvore de composição, relações entre peças ou revalidação de conjunto,
use também `../auditar-montagem/SKILL.md`: cada peça é uma receita, e o conjunto
é uma montagem que as relaciona.

O contrato que esta skill executa é
[`AUTORIA-DE-PECA.md`](../../../docs/mecanifica/usar/AUTORIA-DE-PECA.md):
o que conta como peça e não montagem, identidade estável, isolamento, limites
do controle, propagação de alteração, validação em camadas, invariantes e
desvios a evitar. A skill diz **como fazer**; o contrato diz **o que vale**.
Para a anatomia de receitas procedurais, armadilhas conhecidas de sintaxe e
esteira de comandos para IA, consulte [`GUIA-AUTORIA-IA.md`](../../../docs/mecanifica/usar/GUIA-AUTORIA-IA.md).

## Caminho curto

1. Descubra capacidades no [catálogo gerado](../../../docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md)
   ou, pelo MCP procedural, em `mecanifica://procedural/catalogo` e
   `mecanifica://procedural/schemas`. Busque em modo resumido e use
   `descrever_capacidade` para obter schema, exemplo, pré-condições, limites e
   diagnósticos somente da operação escolhida. Combine/valide a cadeia antes
   de definir o alvo, `PARAMS`, `TOPO` e `PASSOS`. Toda operação usada vem do
   catálogo, lida por `descrever_capacidade`.
2. Escreva nomes semânticos (`origemId`, `ALIASES`, `parte`, `publicarPorta`)
   quando o contrato permitir: identidade persistida é sempre semântica.
3. Rode a descrição e obtenha vistas por uma bancada/harness privado
   explicitamente configurado. Esse é o laço oficial de inspeção visual:

   ```bash
   npm run descrever -- <peça>
   npm run bancada -- <peça> --vistas=isometrica,frontal,direita,superior --cores
   ```

   **Capture sempre com `--cores`, ou ao menos com `--auditoria`.** Sem isso a
   imagem sai como a pessoa vê a bancada — painel à esquerda, inspeção à
   direita, cabeçalho, barra de vistas, piso, grade e sombra —, e a peça fica
   numa tira estreita no meio. `--auditoria` tira o cromo, o piso, a grade e a
   sombra, e a peça ocupa o quadro inteiro; `--cores` faz o mesmo e ainda pinta
   uma cor por parte, imprimindo a legenda. Numa peça de mais de uma parte
   `--cores` é obrigatório: partes do mesmo material leem como um borrão só, e a
   junção entre elas fica invisível.

   O catálogo publicado está vazio de propósito: a peça em trabalho é ativada
   na sessão e capturada pelo nome curto.

4. **Cada imagem responde uma pergunta.** Escolha o modo pela pergunta que
   você precisa responder agora. A bancada tem três, e cada um responde uma
   coisa diferente:

   ```bash
   npm run bancada -- <peça> --selecionadas=carroceria --modo=isolar --focar --cores
   npm run bancada -- <peça> --selecionadas=carroceria --modo=contexto --cores
   npm run bancada -- <peça> --vistas=isometrica,frontal,direita,superior --cores
   ```

   | modo | pergunta | o que avaliar |
   |---|---|---|
   | `isolar` | a superfície está boa? | continuidade, vinco, transição entre regiões, ondulação, faceteamento onde deveria ser liso |
   | `contexto` (o resto vira fantasma) | cabe e encaixa? | folga, interferência, proporção contra o vizinho, alinhamento de eixo |
   | `todas` | lê como o objeto certo? | leitura geral — e aqui **você não decide sozinho** |

   **`isolar` sozinho aprova coisa impossível.** Um arco de roda que não cabe na
   própria roda passa isolado e só aparece em `contexto`. Regra: peça com
   vizinho conclui em `contexto`.

   `--par a,b` isola exatamente duas peças e já enquadra, para julgar um encaixe.

5. Registre pelo menos uma medida ou gate por rodada e itere sobre defeitos
   concretos. `npm run malha:conferir -- <peça>` pega fechamento e face de área
   nula, que o olho não vê e o `descrever` não cobre. `npm run diario` diz onde o
   tempo foi e o que você repetiu sem a receita mudar — as ferramentas registram
   sozinhas, você não relata nada. A bancada confirma enquadramento; não decide
   se a forma atende ao briefing.
6. Rode `npm run criar -- minha-peca` para o estado do núcleo, manifesto,
   compatibilidade e gabarito, quando a receita local e esses artefatos forem
   autorizados. Esse visor legado é diagnóstico; não transforma a peça em
   entrada publicada.

`npm run peca` e `porteiro` permanecem diagnósticos do mesmo visor legado do
item 6; não substituem a descrição nem as vistas da bancada. A peça mora em
`prototipos/procedural/v3/pecas/`; prefixo `_` indica exemplo/fixture.

Receita anterior é evidência do que foi feito, e o alvo autorizado é a fonte
dos nomes. Crie uma receita quando houver alvo e pacote de modelagem
autorizados; o
catálogo de **capacidades** continua disponível mesmo sem peça publicada.

Quando uma capacidade faltar, consulte primeiro `buscar_capacidades`,
`descrever_capacidade`, `combinar_capacidades`, `validar_composicao` e
`analisar_lacuna` pela descoberta procedural. Só depois diagnostique uma
extensão, que é a via declarada para capacidade ausente e mantém a receita
inteira dentro do vocabulário do motor.

## Contrato mínimo

**A convenção vem do catálogo, não do acervo.** As receitas de
`prototipos/procedural/v3/` são exemplo e não passaram por homologação: em
2026-09-08 a varredura com o veredito de contato ligado achou defeito real em
duas delas — `barricada-de-sucata`, que trata `em` como canto mínimo do cubo
quando é translação de um cubo centrado, e `bicicleta-urbana`, com o tubo
inferior atravessando o pneu. Aprender convenção lendo receita defeituosa
propaga o defeito. `descrever_capacidade` devolve schema, exemplo, pré-condições
e limites da operação, e é essa a fonte.

Abrir uma receita do acervo continua útil para VER uma operação em uso, e aí a
escolha é pela forma, não pelo tema:

O acervo publicado hoje tem uma receita só, o quadro da bicicleta em
`prototipos/procedural/v3/pecas/bicicleta-quadro/receita.js`, e é onde ver tubo de seção
que muda ao longo do comprimento e tubo descrito pelas duas bordas medidas em
vez de eixo mais seção. As receitas que ficaram de exemplo para outras formas
moram em `tools/fixtures/acervo/`, onde continuam servindo de assunto para os
testes de ferramenta: `tools/fixtures/acervo/cadeira-de-madeira.js` para caixa
e junção, `tools/fixtures/acervo/chapa-de-fixacao.js` para furo endereçado por
estação e lado, e `tools/fixtures/acervo/prensa-mecanica-industrial/montagem.js`
para montagem de várias receitas.

Rode
`npm run descrever` nela antes de copiar qualquer ideia: o que reprovar ali não
deve entrar na sua peça.

Para peças bilaterais com curvas ou arcos contínuos (como o encosto esculpido da cadeira), use `criarCaminhoSimetrico()` em `src/autoria/caminho-simetrico.js` para garantir simetria matemática e eliminar frestas de tangência angular nas pontas. O estudo de caso e notas técnicas estão em [`docs/mecanifica/usar/CADEIRA-REALISTA-NOTAS.md`](../../../docs/mecanifica/usar/CADEIRA-REALISTA-NOTAS.md).

Ler é para entender a operação e a convenção; **copiar uma receita histórica
como molde, não**. Para uma receita nova, use o contrato declarativo em
`docs/mecanifica/usar/AUTORIA-RECEITA-DECLARATIVA.md`, declare que ela é exemplo e
não referência de engenharia, e registre o pacote que autorizou a modelagem.

`PARAMS` guarda dimensões; `TOPO` guarda decisões que podem reconstruir a
topologia; `PASSOS` é a lista `[['op', {...}], ...]`. O núcleo calcula o bloco pela posição
do passo (`BLOCO=1000`), então o passo dispensa `id:`. `origemId` é identidade
estrutural, outra coisa, e essa o autor escolhe.

**Derive `PASSOS` de `PARAMS`** (`get PASSOS() { return gerarPassos(this.PARAMS); }`);
lista de literais congela os números e faz `PARAMS` virar enfeite, sem aviso.
`npm run parametros -- <peça>` diz quais estão ligados.

Como `PASSOS` é getter, **não copie a receita com `{...receita}`** para testar um
parâmetro diferente: o espalhamento AVALIA o getter uma vez com a tabela velha e
guarda o resultado como valor fixo, então o número novo não tem efeito e a peça
parece insensível ao parâmetro. Copie por descritores
(`Object.defineProperties({}, Object.getOwnPropertyDescriptors(receita))`) e só
então troque `PARAMS`. Medido em
`tools/mecanifica/ponte-gesto-parametro.test.mjs`.

Quando a função pretendida não for óbvia pela geometria, exporte o contrato
opcional `INTENCAO` descrito em `docs/mecanifica/usar/INTENCAO-PECA-V1.md`. Declare
função, família, significado dos eixos locais, invariantes e critérios visuais.
A descrição headless e a revisão preservam e comparam essa intenção; ela soma às
medidas, interfaces, relações e à inspeção das imagens. Grave nela só o que
sobrevive a uma reexecução em outra máquina.

Números precisam ser finitos e pontos precisam ter exatamente `[x,y,z]`.
`NaN`, `Infinity` e aridade errada devem lançar erro. Determinismo exige
semente explícita: todo sorteio parte dela, e a receita reexecuta igual.

`meta.colisao`, `colisaoDe` e `solido` são compatibilidade opcionais para
consumidores v3, não requisitos universais da bancada atual. Quando a peça
exportar `ALIASES`, encaminhe-os tanto a `colisaoDe` quanto a `executar`; caso
contrário, as citações podem virar órfãs mesmo quando a definição está correta.

## Quando existe referência fotográfica

Foto de produto de terceiro NUNCA entra no repositório; só coordenadas
derivadas dela, em `docs/mecanifica/referencias/`. Com uma foto em mãos, o alvo
vem antes da geometria: a skill `../desenhar-prancha/SKILL.md` produz a prancha
ortográfica, e ela é o que transforma "está coerente?" em desvio medido por
região. Sem alvo, a única coisa que sobra para julgar a peça é a opinião de quem
a fez. A comparação e seus limites estão em
[`REFERENCIA-E-CRITICA-VISUAL.md`](../../../docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md).

Quando a prancha não existe e a foto é o que há, `npm run conferir:referencia`
devolve o desvio em milímetro entre a borda da peça e a borda da foto, por
estação, e reprova acima da tolerância declarada. Média perto de zero com máximo
alto é erro de inclinação; média igual ao máximo é erro de altura. O contrato
está em
[`CONFERIR-CONTRA-REFERENCIA.md`](../../../docs/mecanifica/usar/CONFERIR-CONTRA-REFERENCIA.md).

## Seleção e operações

A referência completa de operações, argumentos e armadilhas está em
[`references/operacoes-procedurais.md`](references/operacoes-procedurais.md).
Leia-a quando precisar escolher uma operação ou depurar uma seleção; não
carregue a tabela inteira para uma tarefa simples.

<!-- operacoes-com-origem: arranja, arredondarAresta, chamferBox, cilindro, cone, cubo, esfera, espelha, filete, furo, inflate, lathe, loft, plano -->

As operações que publicam `origem` aceitam endereçamento estrutural conforme a
referência. `sel:{alias:...}` é nome de seleção, não nome de parte. Alias não
encadeia, é resolvido no momento da citação e falha de forma total; componha
listas de origens em JavaScript quando necessário.

As operações `moveV`, `moveF`, `moveA`, `vira`, `extruda`, `mescla` e `pesar`
continuam endereçadas por ID literal. Escolher uma delas é assumir essa dívida
posicional e ela deve ser relatada:

**ID LITERAL:** `moveV`, `moveF`, `moveA`, `vira`, `extruda`, `mescla` e
`pesar` não aceitam `sel`; `sel` não é atalho e deve falhar de forma explícita.
Para identidade estável, prefira uma primitiva com
`origemId` seguida de `transladar`, `rotaciona`, `espelha` ou outra operação
semântica documentada.

`apagaFace` é a exceção importante: aceita `sel: {...}`, exige exatamente uma face e é
a forma semântica de abrir um vão. Cada passo endereça por `face` ou por `sel`,
um dos dois.

## Orientação e casos recorrentes

Rotação usa a regra destrógira medida pelo núcleo. Com pivô explícito em
`[0,0,0]`, a tabela abaixo é a referência rápida:

| eixo | `graus` | leva | para |
|---|---:|---|---|
| `x` | `+90` | `+Y` | `+Z` |
| `x` | `-90` | `+Y` | `-Z` |
| `y` | `+90` | `+X` | `-Z` |
| `y` | `-90` | `+X` | `+Z` |
| `z` | `+90` | `+Y` | `-X` |
| `z` | `-90` | `+Y` | `+X` |

`cilindro`, `cone` e `lathe` nascem em torno de Y. Para pôr disco, eixo ou
pistão no eixo X, prefira `eixo:'x'` no próprio gerador; quando o pivô não for
a origem, use `rotaciona z -90` com pivô explícito. O pivô padrão é o centroide
da seleção e pode girar a peça no próprio lugar.

No `loft`, `orientacao` declara para onde aponta o eixo local `+u` de cada
seção — não o eixo do caminho. Em caminho ao longo de Z, use `[1,0,0]` quando
o primeiro componente do `contorno:[u,w]` deve ser a largura X. Sempre confira
frente, lateral e superior: trocar `u` e `w` pode preservar a lateral e deixar
a peça estreita ou alta nas outras vistas sem produzir órfão.

Prefira `PASSOS` para peças determinísticas e editáveis. Use `construir(ctx)`
com `ctx.{TS,tex,geo,m4}` apenas quando o vocabulário não cobrir a forma e
registre essa lacuna como evidência para uma futura operação.

## Entrega e gates

Peça nova precisa de cabeçalho no primeiro comentário, pois `mapa:check` o
exige. Para uma iteração local, execute descrição, bancada e `criar`. Antes de
publicar uma mudança:

```bash
npm run gates
```

Roda todos e relata todos numa execução, com saída não-zero se algum falhar.
Esta seção listava os gates um a um; era a terceira cópia da mesma lista, e
lista repetida em três lugares envelhece em três velocidades. A fonte é
`tools/gates.mjs`, conferida contra o `ci.yml` nos dois sentidos.

Enquanto conserta um gate específico: `npm run gates -- --parar-no-primeiro`.

O fluxo de commit e decisão segue `AGENTS.md` e `docs/mecanifica/INDEX.md`.

## O laço visual — obrigatório, e mora num lugar só

Olhar o PNG, sobrepor ao alvo, despachar o crítico sem contexto e reconhecer o
limite do método diagnóstico valem em toda tarefa que produz forma. As quatro
regras estão em
[`LACO-VISUAL.md`](../../../docs/mecanifica/usar/LACO-VISUAL.md), e estavam
copiadas palavra por palavra aqui e na outra skill — regra duplicada envelhece
em lugares diferentes.

Para EMITIR um achado em formato reexecutável, o contrato está em
[`CRITICA-VISUAL-CONTRATO-E-CASOS.md`](../../../docs/mecanifica/usar/CRITICA-VISUAL-CONTRATO-E-CASOS.md).
É consulta, não leitura de partida.
