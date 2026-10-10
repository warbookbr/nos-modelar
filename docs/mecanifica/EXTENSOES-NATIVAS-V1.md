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
