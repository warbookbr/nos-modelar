# Motor de Prancha — R0: linha de base e corpus adversarial

**Data:** 2026-08-20  
**Plano:** `2026-08-20-motor-de-prancha-autonomia.md`  
**Decisão:** corrigir o contrato local antes de incorporar vetor externo.

## Escopo executado

Foi auditado o caminho que uma IA nova encontra: skill `desenhar-prancha`,
`prancha.mjs`, geometria, leitura de raster, comparação de silhueta e os dois
exemplos declarativos. A linha de base anterior possuía 37 testes específicos;
o corpus R0 passou a ter 43.

Os alvos `chassi-p0` e `cupe-cunha` foram reexecutados depois da mudança. Os
dois continuam com contorno fechado, zero ponto fora, envelope dentro da
tolerância e sem alertas.

## Matriz de defeitos

| Defeito injetado | Defesa anterior | Resultado anterior | Defesa R0 | Resultado atual |
| --- | --- | --- | --- | --- |
| contorno aberto | encadeamento | rejeitado | preservada | rejeitado |
| detalhe fora da silhueta | ponto-em-polígono | rejeitado | preservada | rejeitado |
| cúpula onde há filete | concentração de giro | rejeitado | preservada | rejeitado |
| discordância entre vistas | faixas compartilhadas | rejeitado | preservada | rejeitado |
| silhueta fechada em gravata | somente fechamento de pontas | passava | interseção de trechos não adjacentes | alertado |
| `NaN` na coordenada | inexistente; SVG inválido possível | falha tardia | validação de entrada finita | recusado com causa |
| camada em vista ausente | exceção de projeção pouco clara | falha tardia | validação de contrato | recusado com causa |
| `foraDoContorno` sem razão | supressão livre | passava | `motivoForaDoContorno` obrigatório | alertado |
| calibração incompatível | resíduo apenas informativo | passava | teto de 3% | recusado com causa |
| sobreposição parcial | desvio calculado só na faixa comum | passava como desvio zero | cobertura mínima de 98% | recusado com causa |

O último caso é particularmente importante: uma linha curta coincidente com o
meio de uma referência longa podia receber desvio zero e ocultar nariz e
traseira ausentes. Cobertura é agora parte da medida, não uma observação do
chamador.

## Contrato que mudou

- toda especificação valida tela, limites, vistas, leitura, camadas e números
  finitos antes de renderizar;
- um anel fechado não é válido se tiver auto-interseção;
- cada exceção a `foraDoContorno` declara a razão semântica junto do dado;
- a calibração rejeita resíduo independente acima de 3%;
- comparação de silhueta exige 98% de cobertura dos dois contornos, salvo
  redução explicitamente autorizada pelo chamador e registrada no resultado.

Isso não promove imagem a verdade: continua sendo necessário vetor editável,
procedência e a medida independente já existente.

## Pesquisa externa inicial

Foram comparadas alternativas contra as lacunas reais acima, não contra a
qualidade aparente de pixels.

| Candidato | O que oferece | Veredito |
| --- | --- | --- |
| SVG Path | formato vetorial com linhas, curvas, arcos e fechamento | **usar**, já é a saída interoperável; não substitui o contrato semântico |
| Potrace / Trace Bitmap | vetorização de bitmap para curvas escaláveis | **rejeitar como dependência do caminho crítico**: a própria ferramenta é GPL e a saída não carrega landmarks, intenção, confiança ou quatro vistas |
| OpenCV `findContours` / `approxPolyDP` | extrair e simplificar contorno de pixel | **adiar**: sobrepõe a extração e simplificação local já existentes, mas não resolve calibração, procedência ou coerência; só merece protótipo se o corpus raster mostrar erro que o leitor atual não consegue diagnosticar |

Fontes primárias: [SVG Paths — W3C](https://www.w3.org/TR/SVG/paths.html),
[Potrace](https://potrace.sourceforge.net/) e [OpenCV — Shape descriptors](https://docs.opencv.org/3.4.2/d3/dc0/group__imgproc__shape.html).

## Limites que permanecem

R0 não prova que uma IA sem histórico desenha quatro vistas novas, nem mede
ainda o ganho da prancha sobre uma modelagem 3D. Também não converte raster em
autoria automática: a referência pode estar ambígua mesmo quando sua silhueta é
legível. Esses são os alvos de R1/R2/R4; nenhum deles é encoberto por teste verde
local.

## Reprodução

```bash
npx vitest run tools/mecanifica/prancha.test.mjs tools/mecanifica/prancha-referencia.test.mjs
node tools/mecanifica/prancha-chassi-p0.mjs
node tools/mecanifica/prancha-cupe-cunha.mjs
```
