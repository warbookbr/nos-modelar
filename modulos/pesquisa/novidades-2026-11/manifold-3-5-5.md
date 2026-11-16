# Manifold (manifold-3d): versões depois da 3.5.4, até 2026-11-16

## Situação

Instalada: manifold-3d 3.5.4 (package.json, package-lock.json e node_modules/manifold-3d/package.json), publicada no npm em 2026-09-25 (https://registry.npmjs.org/manifold-3d, consultado em 2026-11-16). A última é a 3.5.5, publicada em 2026-11-13. Não existe outra versão entre as duas. A licença do pacote é Apache-2.0 (package.json da 3.5.5), não MIT; o item "compatível com MIT" abaixo é lido como licença permissiva compatível.

O núcleo usa o Manifold como motor de união, subtração e interseção (booleanas.js): entra malha soldada em grade Float32, saída refeita em leque convexo, e o código contorna cantos quase coincidentes, faces sem área, cascas abertas e o refazer com reforços. BIBLIOTECAS.md só registra CrossSection e levelSet como o que foi adotado do Manifold; não registra versão.

## O que mudou na 3.5.5 (2026-11-13)

Fontes: https://github.com/elalish/manifold/releases/tag/v3.5.5 e https://github.com/elalish/manifold/compare/v3.5.4...v3.5.5 (ambas lidas em 2026-11-16). São 5 commits, 36 arquivos.

- Corrige par de meia-aresta deixado sem inicializar quando a contagem é ímpar (PR #1885, backport em #1943). Segundo a descrição, o efeito comum era recusa com NotManifold e, às vezes, queda. É o único item que toca a construção da malha no núcleo C++.
- Validação de entrada: Merge de MeshGL com índices fora da faixa, NumVert, tamanho de grade do levelSet, Extrude e canais de normal ausentes passam a ser rejeitados ou tratados (#1934, #1936). Um set_properties com contagem negativa passa a devolver InvalidConstruction. Isso pode mudar o comportamento de entradas limite que antes eram aceitas; o levelSet é usado por nós, então vale testar.
- Remove um laço redundante de zeragem em SetProperties (a descrição diz neutro).
- Resto é Python (exportação de símbolos, wheels 3.15 e Windows Arm64) e CI. Nada de WASM nem de desempenho nas notas. Nenhuma mudança marcada como quebra de compatibilidade.

Saída bit a bit: nenhuma nota declara mudança de saída, mas o .wasm da 3.5.5 tem hash diferente do da 3.5.4 (sha256 b1724387... contra 73e3b419..., conferido em 2026-11-16 comparando os tarballs do npm), o que é esperado em qualquer recompilação e não prova nem descarta diferença de malha. Eu não consegui rodar uma comparação de malhas (o ambiente recusou executar o código baixado). Precisa ser medido no acervo.

## Mudanças já embutidas na nossa 3.5.4 (contexto para a decisão)

Estas valem para saber o que o núcleo já recebe, não são novidade.

- 3.5.0 (2026-05-23, https://github.com/elalish/manifold/releases/tag/v3.5.0): determinismo entre arquiteturas em precisão dupla, com verificação no CI; refatoração da estrutura de meia-arestas (ganho de velocidade, sem número publicado); ExecutionContext com progresso e cancelamento; segurança para acesso concorrente; propagação do status de erro; normais gravadas e devolvidas no MeshGL (muda comportamento existente).
- 3.4.0 (2026-02-27 na página da versão, 2026-03-14 no npm; https://github.com/elalish/manifold/releases/tag/v3.4.0): MinkowskiSum e MinkowskiDifference (feitos por muitas uniões, lentos e pesados em malha complexa); perturbação simbólica nova e correção de determinismo; triangulador mais robusto (keyhole) e hull degenerado; Boolean3 otimizado e colisor preguiçoso; flag de -ffp-contract=off no clang; MeshIO saiu da API pública; Manifold.compose() em desuso.
- 3.5.4 (2026-09-25): corrige o WASM sob Content-Security-Policy sem unsafe-eval.
- smooth/refine, MeshGL64 e propriedades por vértice já existem desde a série 2.x/3.0; a 3.5.5 não traz API nova nessa área.

## Issues que batem com o que contornamos

Fonte: listas de issues em https://github.com/elalish/manifold/issues (lidas em 2026-11-16); os títulos são o que a página mostrou, não li todos os corpos.

- Abertas e próximas do nosso caso: #1946 (Simplify: aleta fina some mesmo com tolerância pequena; o mantenedor disse em 2026-11-12 que é intencional e que a garantia é só ao longo da normal da face); #1965 (o piso de tolerância do Merge ignora SetRelativePrecision; aberta em 2026-11-16, ligada a mudanças de epsilon da PR #1836 e a uma possível versão 4.0 que quebraria compatibilidade); #745 (volume negativo), #1193 (arestas não 2-manifold), #1163 (vértices removidos na triangulação), #289 (remoção de sobreposição), #667 (mais testes de fuzz).
- Abertas novas de Minkowski: #1968 e #1970 (2026-11-16), relevantes só se formos usar MinkowskiSum.
- Fechadas relevantes (não confirmei em qual versão cada uma saiu): #1191 (regressão com faces se tocando), #1262 (rachaduras após simplificação), #1239 e #1017 (simplificação agressiva e tolerância), #970 e #1266 (bug de booleana; a #1266 era dependente de flags de compilação), #634 (precisão causava erro de colisor), #545 (volume não determinístico), #1158 (triangulador lento com muitos furos).
- Nenhuma issue aberta trata de faces coplanares ou determinismo. A próxima mudança grande anunciada é a 4.0 (epsilon, PR #1836), que é o ponto em que a saída provavelmente mudará; a 3.5.5 não é esse ponto.

## Alternativas

Busca em 2026-11-16 (WebSearch) não achou biblioteca booleana WASM madura com licença permissiva que substitua o Manifold. solidboolean (MIT, https://www.github.com/huxingyi/solidboolean) se diz em desenvolvimento e sem uso em produção, sem alvo WASM confirmado. boolmesh (Rust, MPL-2.0, https://docs.rs/crate/boolmesh/latest) é cópia do algoritmo do Manifold em outra linguagem e tem licença de cópialeft de arquivo. MeshLib (LGPL, https://meshlib.io/) e CGAL (GPL) não servem pela licença. OCCT segue só na exportação STEP, como no registro. Não há razão para trocar de biblioteca.

## Recomendação

Atualizar para a 3.5.5, sem pressa e fora de qualquer plano aberto de forma (CLAUDE.md: sem plano ativo o backlog não autoriza implementação; a troca de versão é correção pontual de dependência e precisa ser aprovada como tal). A 3.5.5 só traz correções pequenas e validação de entrada, e o ganho para nós é baixo: nenhuma melhoria de velocidade ou de robustez de booleana é anunciada, e nenhum dos nossos contornos desaparece. O risco é também baixo, mas a regra de malha idêntica no acervo exige medir antes de fixar a versão. Não esperar a 4.0 para atualizar; ela deve mudar a saída e pede plano próprio.

O que medir antes, nesta ordem: (1) rodar o acervo inteiro com 3.5.4 e 3.5.5 e comparar o hash de cada malha de saída e de cada id de face, e anotar toda divergência; (2) reexecutar os casos que hoje caem nos portões de canto quase coincidente, face degenerada e casca aberta, e contar quantos refazeres com reforço ainda acontecem (a mudança do halfedge pode alterar casos que hoje recusam por NotManifold); (3) conferir o levelSet e o Extrude do acervo contra as novas validações de entrada; (4) medir o tempo das maiores uniões (por exemplo dois lofts de 1000 faces), pois não há número publicado; (5) conferir que a mesma malha sai em Node e no navegador com o .wasm novo. Se o passo 1 mostrar diferença, tratar como mudança de acervo (regerar e revisar por pessoa) ou ficar na 3.5.4; os testes de determinismo do projeto são o gate. Para a saída diferente de bit a bit, o hash do .wasm novo já indica que a comparação é obrigatória.

Limitações: as notas de lançamento são da página do GitHub (a página não mostra ano; as datas de commit mostram 2026), não li os diffs do C++, e as datas de 3.4.0 diferem entre GitHub (2026-02-27) e npm (2026-03-14).
