# Ferramentas de prancha para IA: grade calibrada sobre a foto, coerência entre vistas e sobreposição limpa com desvio

**Estado:** concluído

**Território:** `tools/modelar/prancha/referencia-grade.mjs`, `tools/modelar/prancha/referencia-grade.test.mjs`, `tools/modelar/prancha/prancha-coerencia.mjs`, `tools/modelar/prancha/prancha-coerencia.test.mjs`, `tools/modelar/prancha/prancha-sobrepor.mjs`, `tools/modelar/prancha/prancha-sobrepor.test.mjs`, `tools/fixtures/prancha-apoio-ia/`, `docs/modelar/banco-de-provas/prancha-apoio-ia-2026-11-20/`, `.claude/skills/desenhar-prancha/SKILL.md`

Ativado pela pessoa em 2026-11-20 na branch `envio/ferramentas-de-prancha`, após o teste de modelagem do carro quadrado revelar a lacuna entre a imagem de referência e o traçado das quatro pranchas.

**Responsável:** a IA da sessão implementa, testa e mede; a pessoa avalia o ganho na prova prática das quatro vistas.

**Repositório e base:** `warbookbr/nos-modelar`, main `96e926b8`.

## Problema observado

Ao desenhar quatro pranchas ortográficas (`lateral`, `frontal`, `traseira`, `superior`) a partir de imagens de referência geradas por IA, o motor atual (`tools/modelar/prancha/prancha.mjs`) valida apenas regras internas do SVG (contorno fechado, envelope declarado e colisões de texto) e aprova com zero alertas mesmo quando alturas de para-choque, largura de teto, posição de vidros ou recorte da tampa divergem de 50 a 150 mm das imagens ou discordam entre si de uma vista para outra.

O processo não pega esses desvios sozinho porque faltam três ferramentas diretas: leitura de coordenadas internas sobre foto sem estimativa a olho nem confusão com sombra e acessórios, conferência automática de coerência geométrica entre as quatro vistas parciais e sobreposição limpa da geometria da prancha (sem título, cotas ou legenda deslocando a caixa) sobre cada foto calibrada com medida de desvio.

## Resultado

Em três comandos integrados à skill `desenhar-prancha`, qualquer agente consegue estampar uma grade numerada em milímetros e pixels sobre a foto calibrada (`npm run referencia:grade`), conferir automaticamente que as quatro vistas parciais concordam em envelope, alturas, comprimentos e larguras compartilhadas (`npm run prancha:coerencia`) e gerar a sobreposição limpa de alto contraste (na escala rígida e na proporção original da foto) com quadro 2×2 e medida de desvio contra o contorno (`npm run prancha:sobrepor`).

## Filtro Agent-First

- `referencia:grade`: CRIAR em `tools/modelar/prancha/referencia-grade.mjs`. Recebe foto (PNG ou JPG), caixa calibrada do objeto em pixels (`--caixa=x0,y0,x1,y1`, com `--espelhar-x` opcional) e faixa em milímetros dos eixos (`--eixo-h=min,max`, `--eixo-v=min,max`), grava SVG (e PNG via `olhar.mjs` quando pedido) com grade numerada em mm e pixels, e recortes ampliados opcionais por região.
- `prancha:coerencia`: CRIAR em `tools/modelar/prancha/prancha-coerencia.mjs`. Lê os módulos `.prancha.mjs` de uma pasta (ou lista explícita) via `prancha(ESPEC)`, extrai o desenho e os landmarks compartilhados e confere envelope e cotas cruzadas entre `lateral`, `frontal`, `traseira` e `planta`, reprovando divergências acima da tolerância declarada em milímetros.
- `prancha:sobrepor`: CRIAR em `tools/modelar/prancha/prancha-sobrepor.mjs`, ENVOLVENDO `prancha(ESPEC).desenho` e `olhar.mjs`. Renderiza apenas as camadas geométricas da prancha em alto contraste sobre cada imagem calibrada — no modo `escala-rigida` (preservando a razão da tabela) e no modo `proporcao-foto` (desfazendo a razão externa para auditar o traçado puro) —, monta o quadro 2×2 quando receber quatro vistas e mede o desvio de silhueta quando houver contorno de referência.
- `prancha.mjs`, `leitura-por-regioes.mjs` e núcleo geométrico: NÃO ALTERAR; todas as novas ferramentas consomem as exportações existentes.

## Incluído

- os três comandos e seus módulos exportáveis em `tools/modelar/prancha/`, com `--ajuda` e scripts no `package.json`;
- testes unitários e de integração em fixtures sintéticas neutras (`tools/fixtures/prancha-apoio-ia/`) com deslocamentos e incoerências conhecidas;
- atualização da skill `.claude/skills/desenhar-prancha/SKILL.md` documentando o uso dos três comandos;
- prova prática nas quatro imagens do carro quadrado registrada em `docs/modelar/banco-de-provas/prancha-apoio-ia-2026-11-20/` (sem versionar as imagens raster de referência).

## Excluído

- alteração do motor `tools/modelar/prancha/prancha.mjs` ou do formato de `ESPEC`;
- alteração de `tools/modelar/leitura-por-regioes.mjs` (território do plano congelado de leitura por partes);
- traçado automático de prancha a partir de foto ou alteração do núcleo 3D.

## Invariantes

- Nenhuma imagem de referência de terceiros ou gerada por IA entra versionada no repositório.
- Nenhuma prancha existente no acervo (`carro-fastback` e demais fixtures) tem sua saída alterada.
- Todos os testes existentes de prancha e `npm run gates` seguem verdes.

## Gate de saída

1. `referencia:grade` gera SVG/PNG válidos com grade calibrada e recortes, verificado por teste em fixture sintética onde um ponto conhecido em pixels cai na coordenada exata em mm (erro < 0,5 mm).
2. `prancha:coerencia` aprova um conjunto sintético coerente de quatro vistas e reprova (exit 1) cada tipo de divergência injetada (envelope, altura `y`, posição `z`, largura `x`) indicando a vista e o erro exato em mm.
3. `prancha:sobrepor` projeta somente a geometria do `desenho` (sem título, cotas nem legenda deslocando a caixa), gera os modos `escala-rigida`, `proporcao-foto` e o quadro 2×2, e mede o desvio conhecido em fixture sintética com erro abaixo de 2 mm.
4. Prova prática registrada nas quatro vistas do carro quadrado passando pelo ciclo completo (`referencia:grade` → pranchas → `prancha:coerencia` zero divergências → `prancha:sobrepor` → crítico visual sem contexto → correção), nota na skill `desenhar-prancha` (incluindo o crítico sobre a sobreposição) e `npm run gates` verde.

## Fatias

1. Feita: `referencia:grade` e `prancha:coerencia`, com fixtures sintéticas e testes passando.
2. Feita: `prancha:sobrepor` (modos `escala-rigida`, `proporcao-foto`, quadro 2×2 e desvio contra contorno), com testes passando.
3. Feita: prova prática nas quatro vistas do carro quadrado com duas rodadas de crítico visual cego sobre `prancha:sobrepor`, atualização da skill `desenhar-prancha` (incluindo conferência visual da moldura amarela de `--caixa` e o passo do crítico visual sobre a sobreposição) e gates validados.

## Riscos e parada

Se o `olhar.mjs` não embutir imagens locais por restrição de caminho do navegador headless, o gerador embute a foto em base64 (`data:image/...`) dentro do SVG temporário sem alterar `olhar.mjs`. Se o desvio automático contra silhueta raster apresentar ruído acima de 5 mm em fixture limpa por sombra, a ferramenta exige `--caixa` ou máscara explícita em vez de heurística silenciosa.

## Fechamento

Concluído em 2026-11-20 na branch `envio/ferramentas-de-prancha`. Entregou `referencia:grade`, `prancha:coerencia` e `prancha:sobrepor` com 12 testes verdes, atualização da skill `desenhar-prancha` e prova prática nas quatro vistas do carro quadrado registrada no banco de provas. Os 4 gates de documentação, arquitetura, build e testes das ferramentas novas passaram; as únicas falhas na bateria local (`calibracao:check` e testes Windows ESM em `test:rapidos`) são preexistentes fora do escopo deste plano.
