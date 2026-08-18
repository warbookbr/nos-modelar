# Extensões nativas v1

Uma extensão nativa é código versionado do repositório, nunca JavaScript vindo
de receita. Seu pacote possui manifesto, implementação e fixture/teste.

O manifesto `mecanifica.extensao-nativa@1` declara a operação completa:
identidade, versão, artefatos, efeitos e política de identidade. A extensão é
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
