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
ou acesso a outras operações. IDs locais são finitos, faces só citam vértices
emitidos na mesma extensão e qualquer erro descarta o buffer inteiro do passo.

O pacote `extensoes/prisma-triangular/` é a prova neutra: cria um prisma
triangular, roda por receita e composição sintéticas e é determinístico. Sem a
extensão, `diagnosticarExtensaoAusente` descreve a capacidade ausente e o núcleo
não publica estado parcial.

## estruturaDeBarras

O pacote `extensoes/estrutura-de-barras/` é a primeira ferramenta real feita
como extensão nativa. A IA descreve nós com nome e posição (`nos`) e barras entre
pares de nós (`barras`, com `de` e `para` pelo nome do nó, nunca por índice) com
um perfil: tubo redondo, tubo quadrado, tubo retangular ou cantoneira, com as
medidas e, nos tubos, a parede (sem parede o perfil é maciço). Posições e
medidas aceitam parâmetros e expressões. A extensão devolve um sólido só, e
`descreverEstrutura` devolve as medidas: o comprimento de corte de cada barra
(a extensão axial da peça já cortada, que é o comprimento de barra a comprar), o
comprimento entre nós, o ângulo do corte, a área da seção e, com `densidade` em
kg/m³, o peso por metro, o peso do corte e a massa total. A seção tem cantos
vivos e a unidade das posições é `mm`, `cm` ou `m`.

O que acontece na ponta de cada barra depende do que mais chega ao nó. Uma barra
sozinha termina em corte reto. Duas barras alinhadas terminam em corte reto no
plano do nó. Se há um par alinhado e mais barras (a treliça de corda contínua), as
outras chegam retas e perdem o volume que cai dentro da seção da barra passante,
e só são aceitas se o corte reto inteiro cabe nessa seção. Sem par alinhado, as
barras precisam ter a mesma seção e são cortadas pelo plano bissetor com cada
vizinha, o que faz um canto de dois tubos em esquadria e um canto de cubo com
três; seções iguais que giram diferente em torno do eixo, e que por isso não se
espelham no plano de corte, são recusadas com a instrução de girar uma delas por
`orientacao`. Os planos de uma esquadria particionam o espaço em torno do nó, e
por isso as barras se tocam em faces planas, sem fresta e sem ponta. A
biblioteca de sólidos não une barras que só se tocam por uma face, e por isso a
peça que entra na união invade o vizinho por 1e-8 do raio; as medidas saem da
peça sem essa invasão.

As recusas dizem o campo, o valor e o que é aceito: nó inexistente, barra de
comprimento zero, nó sem barra, nome repetido, par de nós repetido, nó no meio
de uma barra (a barra é dividida no nó), ângulo menor que 15° entre barras de
um nó, seções diferentes numa esquadria, chegada que não cabe na passante,
perfil, densidade e unidade inválidos. No núcleo a recusa vira órfão do passo
sem publicar geometria.

A conferência das juntas (`descreverEstrutura(args, res, { conferir: true })`)
mede em sólidos de dupla precisão, sobre a estrutura maciça, a fresta de cada nó
(volume do prisma reto de cada barra que a união não tem) e o excesso (volume da
união que não está em nenhum prisma reto) nos nós que não são esquadria. Na
esquadria a conferência é o volume: o plano de corte que passa pelo ponto do
eixo no nó não muda o volume de uma seção cujo centroide está no eixo, e o
volume da união é a área vezes o comprimento entre nós. A cantoneira não é
simétrica no plano da esquadria, e nela a fresta não é medida (vale `null`); a
junta fica garantida pela simetria exigida na entrada.

A malha publicada é triangulada. Ela passa de 999 vértices ou faces com
facilidade, e por isso o contexto das extensões nativas passou a aceitar ids
locais da faixa estendida do passo (`idDoPasso`), como as booleanas; os ids de
extensões que emitem menos de 1000 continuam os mesmos. O teste do pacote cobre
um quadro plano, uma treliça triangular, um cubo de 12 barras, a conferência
ponto a ponto contra a união de caixas, o recuo de cada barra contra uma
amostragem da seção, o determinismo e as recusas.
