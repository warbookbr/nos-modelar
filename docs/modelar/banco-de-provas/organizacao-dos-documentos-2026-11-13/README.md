# Organização dos documentos: o levantamento das decisões em vigor

Pasta do plano [organização dos documentos](../../decisoes/PLANOS-ENCERRADOS.md). Guarda a resposta da fatia 2 para cada plano encerrado e cada arquivo de histórico, antes de as duas pastas saírem da árvore. Levantado em 2026-11-13 por três agentes de leitura, um lote cada, e não conferido linha a linha por quem conduz: os agentes dizem que leram as seções de decisão, invariantes e fechamento de cada arquivo, e não o corpo inteiro dos maiores.

- [Planos encerrados, lote 1](decisoes-planos-encerrados-1.md): 59 planos, 84 decisões, 2 sem lugar vivo.
- [Planos encerrados, lote 2](decisoes-planos-encerrados-2.md): 58 planos, 76 decisões, 3 sem lugar vivo.
- [Histórico](decisoes-historico.md): 64 arquivos, 6 com decisão ou lição sem lugar vivo, e a lista dos 24 arquivos que ainda têm citante vivo.

## As onze decisões que viram registro

Cada uma tem o rascunho do registro no arquivo do lote.

1. A pele de carroceria nasce de subdivisão com vincos, e não de `loft`, envelope varrido, SDF nem kernel próprio; o `loft` vale para peça varrida de fato (plano do chassi realista, cancelado).
2. A ciência de materiais mora no repositório irmão, sem import nos dois sentidos, e o cruzamento é manual, com versão e commit (plano do laboratório computacional).
3. O OCCT é kernel só da exportação STEP, não de autoria, e a hipótese só reabre por requisito de fabricação ou de tolerância (plano das ferramentas de modelagem).
4. Não há glossário separado: o termo é definido no documento que o governa, e a página de entrada o liga a ele (plano do glossário e entrada para pessoas).
5. Textura, relevo e ambiente são gerados de números, sem imagem de fora; a exceção por material registra origem e licença (plano dos materiais realistas).
6. O grafo de capacidades saiu e só volta se o motor ganhar tipos intermediários; o código está no commit `7d733520` (histórico).
7. Os importadores de `.csg`, STEP e STL saíram; o desenho está no commit `37665caa` (histórico).
8. O esboço antigo só se recria se voltar a haver objeto sem forma de referência; o código está no commit `f9bfad3a` (histórico).
9. Potrace e VectorCraft não substituem a borda subpixel, e o resolvedor de restrições devolve solução espelhada quando o chute inicial cai do lado errado (levantamento do desenho sem referência).
10. As hipóteses de forma já reprovadas, medidas em 38 falhas de autoria, que não voltam como base, e as duas regras de processo que saíram delas (registro de falhas de autoria).
11. Potrace e o traçador do Inkscape ficam fora do caminho crítico por licença: um é GPL e o núcleo é MIT (relatório do motor de prancha).

Seis respostas "já coberta" do histórico se apoiam no registro de falhas de autoria (item 10): se ele saísse sem virar registro, elas ficariam sem lugar vivo.

## O que mais o levantamento achou

Quinze planos encerrados não têm linha na crônica de `planos/encerrados/README.md`, e ganham a linha antes de a pasta sair. Um documento do histórico traz três candidatos que não estão no backlog (o carrinho de mão como família, a bacia em casca e a dobradiça de caneco); a pessoa decide se entram. Vinte e quatro arquivos do histórico têm citante vivo, entre eles quatro comentários de código do núcleo e três listas de exceção em `tools/mapa/`, que mudam quando a pasta sair.
