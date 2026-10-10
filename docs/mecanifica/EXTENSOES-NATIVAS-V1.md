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

O pacote `extensoes/articulacao/` é a primeira extensão de relação, sem geometria.
Seu manifesto declara a operação `articulacao` com `identidade: 'nao-cria'` e os
efeitos `declara-relacao` e `confere-movimento`, e a implementação só lê e valida a
declaração, sem emitir vértice nem face, porque a extensão não enxerga malha. A
declaração `mecanifica.articulacao@1` liga duas peças de uma montagem por uma porta
com eixo de cada uma (cilindro, anel ou trilho): `tipo` `revolucao` (curso em
`graus` ou `rad`) ou `prismatica` (curso em `mm` ou `m`), `curso` com `minimo` e
`maximo`, `passos` que dividem o curso em `passos + 1` posições, e `folga`
obrigatória, mesmo que zero, com a penetração tolerada. O eixo ou a direção é o
eixo da porta da peça fixa, a porta da peça móvel tem de estar sobre ele, o valor 0
é a pose da montagem resolvida e o sentido positivo é o do eixo da porta fixa.
`acompanham` leva outras instâncias junto com a móvel, e `permitidos` nomeia os
pares que se tocam de propósito, com motivo de pelo menos 15 caracteres, como o
pino que atravessa o nó da dobradiça.

A conferência vive em `src/autoria/conferir-articulacao.js`, porque precisa das
malhas: `conferirArticulacao(montagemResolvida, declaracao)` leva as peças que se
movem à pose de cada posição e mede cada par móvel e fixo pela régua da auditoria
de interseções (`contato-de-solidos.js`). Encostar não é colidir. Penetração acima
da folga, ou indeterminada, recusa com a posição, o par e a penetração em metro, e
`livreAte` devolve por bisseção o último valor livre antes da primeira colisão.
Instância ou porta ausente, porta sem eixo, porta móvel fora do eixo da fixa e curso
maior que o do trilho lançam `ErroArticulacao` antes de medir. A medida é amostrada:
colisão que começa e termina entre duas posições não é vista, a penetração é um piso
(vértices e centroides) e as demais peças ficam paradas. A declaração ainda não mora
dentro da montagem persistida v5; quem chama a entrega junto com a montagem
resolvida.

O pacote `extensoes/chapa-dobrada/` é a primeira extensão com uso de produto: a
operação `chapaDobrada` recebe `espessura`, `raioInterno` e `largura` e descreve
a chapa por `abas` (cada uma com o `comprimento` do trecho reto e o `angulo` da
dobra que vem depois, em graus, positivo anti-horário visto de +z) ou por
`perfil` (os pontos da linha média onde cada dobra se cruzaria sem raio). A
saída é o sólido extrudado na largura, com as dobras em arcos cujos vértices
estão exatamente em `raioInterno` e `raioInterno + espessura` do centro da
dobra. A conta do contorno e as medidas ficam em `chapa.js`, que importa só
`procedural/nucleo/contorno.js` (`ehSimples`, `areaDoContorno`), e
`medidasDaChapa(argumentos)` devolve o que a extensão não pode devolver pelo
contexto limitado: o comprimento planificado, com o fator K declarado (padrão
0,44, só para a medida; a malha não depende dele), o recuo e o desenvolvimento
de cada dobra e a área da tira. O planificado é a soma dos trechos retos mais,
por dobra, `|ângulo em radianos| · (raioInterno + fatorK · espessura)`. A
recusa cita o campo, o valor e o que é aceito: raio negativo, aba reta sem
comprimento, segmento de `perfil` mais curto que o recuo das dobras das pontas e
abas que se cruzam ou se encostam. O manifesto traz os ids de vértice e de face.
O teste está em `chapa-dobrada.test.mjs`.

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
