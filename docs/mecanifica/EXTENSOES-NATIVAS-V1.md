# Extensões nativas v1

Uma extensão nativa é código versionado do repositório, nunca JavaScript vindo
de receita. Seu pacote possui manifesto, implementação e fixture/teste.

O manifesto `mecanifica.extensao-nativa@1` declara a operação completa:
identidade, versão, artefatos, efeitos, política de identidade e o mesmo
contrato de uso descobrível das operações do núcleo. Schema de argumentos,
exemplo, pré-condições, limites e diagnósticos entram na assinatura do registro.
A extensão é
combinada explicitamente ao registro base; não há autorregistro nem mutação
global.

Durante execução, a implementação recebe somente contexto limitado:

- resolução numérica e vetorial;
- `emitirVertice` e `emitirFace` com IDs locais do bloco;
- publicação transacional depois de toda a operação validar.

Ela não recebe estado da malha, filesystem, Three.js, MCP, relógio, aleatoriedade
ou acesso a outras operações, com uma exceção declarada no manifesto: a extensão
que lista `mecanifica.malha-poligonal@1` em `artefatos.entra` recebe a leitura de
um sólido, e só dele. IDs locais são finitos, faces só citam vértices
emitidos na mesma extensão e qualquer erro descarta o buffer inteiro do passo.

A leitura é `selecionar(sel)`, que copia vértices e faces da seleção (a mesma
gramática de `sel` das operações do núcleo, nunca id numérico) e recusa seleção
vazia ou inexistente com o campo na mensagem. Com ela vêm `vertice(id)` e
`face(id)`, que devolvem uma referência a um elemento já lido para a face nova
citá-lo sem copiá-lo, `consumirFace(id)`, que tira da malha uma face lida na
publicação (ela entra em `consumidas`, como no `furo` e nas booleanas, e o vértice
que nenhuma face usa mais sai), `declararOrigem(origemId, grupos)`, que publica a
origem estrutural do resultado, e a opção `herda` de `emitirFace`, que copia cor,
material, parte, liso e sólido de uma face lida. Tudo é conferido antes de qualquer
escrita, o bloco do passo continua em 1000 ids (`limiteDeIds`), e o contrato de
argumentos do manifesto passa a recusar chave desconhecida com sugestão, como nas
operações do núcleo.

O pacote `extensoes/prisma-triangular/` é a prova neutra: cria um prisma
triangular, roda por receita e composição sintéticas e é determinístico. Sem a
extensão, `diagnosticarExtensaoAusente` descreve a capacidade ausente e o núcleo
não publica estado parcial.

O pacote `extensoes/casca/` é a primeira ferramenta da lista por objeto feita como
extensão: `casca` esvazia um sólido fechado e deixa parede de espessura constante,
com as faces abertas escolhidas por seleção (`solido`, `abertas`, `espessura`,
`origemId`). A conta é a função pura `procedural/nucleo/casca.js`, que recua cada
face pelo plano em vez de passar por um campo de distância: o `levelSet` do
Manifold foi medido e dá 9056 triângulos para uma caixa de seis faces e erra a
parede em até 23% no cilindro, contra 1000 ids por passo. As faces fechadas do
sólido mantêm id, vértices e parte; a parede interna e a borda das aberturas
nascem no passo e saem em `{op:'casca', id, parte:'externa'|'interna'|'borda'}`.
A espessura é medida na malha devolvida (amostras da parede contra a superfície
fechada, dentro de 2% da pedida) e a casca é recusada com campo, valor e o que é
aceito quando a parede não cabe, invade a si mesma ou cobriria a abertura. A prova
é `procedural/nucleo/casca.test.mjs`; o host combina a extensão ao registro
explicitamente, como na prova do prisma.
