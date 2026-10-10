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
