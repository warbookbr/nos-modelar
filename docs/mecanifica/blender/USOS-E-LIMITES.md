# Usos do Blender, limites e regras

Cada uso abaixo diz o ganho esperado e o custo, e vem marcado como provado ou por provar. O que está por provar é hipótese, e nenhuma promessa dele vale até uma sessão medir.

| Uso | Estado | Ganho esperado | Custo |
|---|---|---|---|
| Conversão de formatos | provado | abrir `.blend` e outros formatos no fluxo de referência, que lê glb, obj e fbx | instalar 1,6 GB fora do repositório e rodar um script curto |
| Renderização com luz real | por provar | ler vincos e curvaturas que a máscara de silhueta e a cor chapada não mostram | script de câmera e luz, tempo de render e uma comparação com a folha atual |
| Diferença de superfície entre fonte e receita | provado em 2026-10-21 sobre forma desenhada por código, em `tools/blender/regua.py` | medir o que hoje só se vê por silhueta e folha de vistas, isto é, relevo dentro da silhueta, vincos e normais | exportar a receita como malha alinhada com a fonte e escolher a caixa; uso em [`REGUA-E-PACOTE-CEGO.md`](REGUA-E-PACOTE-CEGO.md) |
| Oráculo da subdivisão | provado em 2026-10-21: `tools/blender/oraculo-subdivisao.mjs` regera a fixture congelada do núcleo a 1e-7 | conferir a operação `subdivisao` contra o modificador do Blender sem que os testes do núcleo dependam dele | rodar o gerador quando a fixture mudar |
| Oráculo de booleana e arredondamento | por provar | comparar o que o núcleo gera com o que o Blender gera nos mesmos casos e achar as falhas listadas em "Ajustes no núcleo" do plano de veículos | casos mínimos reproduzíveis nos dois lados e leitura da diferença |
| Malha suave como alvo visual de forma curva | por provar | dar à pessoa um alvo mais liso que as primitivas facetadas do núcleo | risco de a malha virar fonte de forma que a receita não reproduz |

As falhas do núcleo a que o oráculo se aplicaria são a face fina deixada por subtrair cilindros em carroceria, os pontos alinhados em perfil de extrusão recusados pelo exportador, o `arredondarAresta` que deixa vértice solto, a parte de contorno com ponto repetido que some sem erro e a revolução de perfil que não toca o eixo. Estão descritas em "Ajustes no núcleo" de [`2026-10-20-veiculos-de-referencia-livre.md`](../planos/encerrados/2026-10-20-veiculos-de-referencia-livre.md) e dependem de plano próprio.

## Limites e regras

A licença da fonte é conferida antes do uso: licença livre sem exigência de crédito, sem marca nem nome de fabricante, sem GPL nem CC-BY-SA, e CC-BY só com arquivo de créditos. Imagem de referência com marca, logotipo ou nome de fabricante não entra no repositório. Nenhum arquivo `.blend`, `.obj`, `.mtl` nem GLB de terceiros é versionado, e o próprio Blender também não.

O Blender fica fora do `--completo` e do CI. Qualquer ferramenta nova para ele exige plano e testes que se ignorem quando o Blender não está instalado, para que a bateria passe em máquina sem ele. Sem plano ativo, nada aqui autoriza implementação.

O Blender não define identidade persistida nem IDs. Nomes de objetos, de malhas e de materiais do arquivo dele não viram identidade de parte, e índices de arrays e posições continuam sem valor de identidade. A decisão de forma continua da pessoa, que a toma olhando imagem, e nenhuma métrica do Blender aprova forma.

Se um uso por provar for experimentado numa sessão, o resultado e a medida entram neste documento com a data, e a ferramenta que dele sair nasce de um plano.
