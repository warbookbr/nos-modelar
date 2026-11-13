# Saída de manual: pesquisa e medidas

Pasta do plano [saída de manual a partir da montagem](../../planos/2026-11-13-saida-de-manual-a-partir-da-montagem.md), ativo desde 2026-11-13. Aqui entram a pesquisa do que outras ferramentas fazem, a comparação do que o módulo gera com o manual da instalação solar feito à mão, e o custo de cada saída.

## Pesquisa de 2026-11-13, pela web, só pelo resumo da busca

Lista de peças. O [PartCAD](https://pypi.org/project/partcad/0.2.6/), gerenciador de pacotes de modelos para CadQuery e build123d, diz produzir a lista de materiais de cada montagem em CSV ou Markdown, e a documentação dele cita instruções de montagem, sem que o resumo diga como são feitas. No [build123d](https://build123d.readthedocs.io/en/latest/assemblies.html) a montagem é uma árvore de partes com rótulo, que é de onde a lista sai. Não achei fonte sobre passo a passo com vista por etapa gerado de código.

Desenho técnico. O [tutorial de desenho técnico do build123d](https://build123d.readthedocs.io/en/latest/tech_drawing_tutorial.html) projeta a peça em 2D e separa as arestas visíveis das escondidas, exporta em SVG com uma camada para cada, e deixa as cotas como trabalho manual: a lista de pendências do próprio tutorial pede mais rótulos e cotas. Não achei fonte de cotagem automática. Leitura minha: a projeção com linha escondida é problema resolvido em outras ferramentas, e a escolha de quais cotas mostrar não é; por isso o desenho cotado fica para a segunda etapa e começa por cotas declaradas pela receita.
