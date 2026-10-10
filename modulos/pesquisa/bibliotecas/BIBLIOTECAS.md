# Bibliotecas avaliadas e ainda fora

Duas pesquisas de 2026-10-09, uma aberta e uma presa às restrições do núcleo
(sem Three.js, saída determinística byte a byte, Node e navegador, OCCT só na
exportação STEP). Licença e data foram conferidas no registro do pacote quando
indicado; o resto ficou sem conferir e precisa ser visto antes de qualquer uso.
O que entrou no plano ativo (a `CrossSection` e o `levelSet` do Manifold, e o
replicad como plano B da casca) está no [contexto do
plano](../../../docs/mecanifica/CONTEXTO-FERRAMENTAS-DE-MODELAGEM.md).

| Biblioteca | Licença | O que faz | Recomendação |
|---|---|---|---|
| [planegcs](https://www.npmjs.com/package/@salusoft89/planegcs) | LGPL-2.0+ (1.3.0, 2026-10-05) | Resolvedor de restrições 2D do FreeCAD em WebAssembly | Adotar só quando uma fatia mostrar que a IA precisa declarar perfil por restrição; antes, provar que dá o mesmo resultado em toda execução e ver o que a LGPL pede no navegador. |
| [Rapier](https://rapier.rs) | Apache-2.0 | Física com juntas de revolução e prismáticas | Usar para testar curso e colisão das articulações, fora do núcleo e com o modo determinístico ligado. |
| [flatten-js](https://github.com/alexbol99/flatten-js) | MIT | Geometria 2D com arcos, interseção e distância | Trazer só se as contas de arco e tangente da camada de features crescerem além de algumas funções. |
| [nurbs](https://github.com/StandardCyborg/nurbs) | não conferida | Curvas e superfícies NURBS em JS puro | Avaliar quando a spline entrar nas features; fixar o arredondamento da saída. |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | MIT | Distância, ponto mais próximo e interferência em malha | Depende de Three.js: serve à bancada, nunca ao núcleo. A distância contra referência do núcleo se escreve à mão. |
| [FEAScript](https://github.com/feascript/feascript-core) | não conferida | Elementos finitos em JS | API instável; para estrutura de barras, a rigidez direta escrita à mão é menor. |
| [Fidget](https://github.com/mkeeter/fidget) | MPL-2.0 | Superfícies implícitas em Rust com alvo wasm | Rever se o `levelSet` do Manifold não bastar para casca; ainda sem interface JS confirmada. |
| [truck](https://github.com/ricosjp/truck) | Apache-2.0 | Kernel B-rep com NURBS em Rust, com truck-js | Imaturo para autoria; rever se o núcleo precisar de NURBS exatas. |
| [meshoptimizer](https://github.com/zeux/meshoptimizer) | não conferida | Simplificação e otimização de malha | Para exportação e bancada, não para a geometria da receita. |
| [jolt-physics](https://www.npmjs.com/package/jolt-physics) | não conferida | Física com binding WebAssembly | Alternativa ao Rapier só se ele não cobrir limite de ângulo em junta. |
| [OpenSCAD wasm](https://github.com/ochafik/openscad-wasm) | GPL-2.0 | OpenSCAD no navegador | Fora pela licença; serviria só como verificador cruzado externo. |
| [SolveSpace](https://github.com/solvespace/solvespace) | GPL-3.0 | CAD com resolvedor de restrições | Fora pela licença e pela versão web experimental; fica como referência de comportamento. |
