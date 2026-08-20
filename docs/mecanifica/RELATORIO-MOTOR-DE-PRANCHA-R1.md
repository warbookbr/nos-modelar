# Motor de Prancha — R1: comparação externa controlada

**Data:** 2026-08-20  
**Plano:** `2026-08-20-motor-de-prancha-autonomia.md`  
**Decisão:** adiar OpenCV; rejeitar Potrace/Inkscape do caminho crítico.

## Hipótese

O leitor local extrai um envelope por coluna, calibra pelas rodas e simplifica
uma única silhueta declarada. OpenCV pode oferecer `findContours` e
`approxPolyDP`; a hipótese era que ele recuperaria uma forma editável melhor em
um raster de prancha, sem custo semântico que anulasse esse ganho.

## Mesmo caso para os dois caminhos

`tools/mecanifica/prancha-r1-opencv.py` cria um PNG sintético de 760×360 px:
carroceria fechada com seis vértices no topo, duas rodas que determinam
entre-eixos de 330 px, e uma linha interna de caráter. É conteúdo artificial,
sem referência de terceiro, e torna a verdade conhecida antes de medir.

Escala declarada: 8 mm/px, entre-eixos 2640 mm, comprimento 4800 mm e altura
1360 mm. O protótipo OpenCV foi instalado somente em
`/tmp/mecanifica-r1-opencv`; ele não entrou em `package.json`, no repositório
nem no caminho de execução do produto.

## Resultado

| Critério | Leitor atual | OpenCV 5 `findContours` + `approxPolyDP` |
| --- | --- | --- |
| escala | 8 mm/px | não calcula escala |
| resíduo independente | comprimento +0,67%; altura +1,18% | não calcula resíduo |
| vetor de topo | 6 vértices, igual à intenção | 12 vértices na maior fronteira |
| seleção semântica | topo declarado de uma vista | 7 contornos: duas bordas da carroceria, quatro partes de rodas e um detalhe |
| confiança/recusa | calibração acima de 3% é recusada | não possui contrato de calibração |
| quatro vistas | integrado ao motor | nenhuma relação entre vistas |
| dependência | Node e `zlib` já existentes | wheel Python de 61 MB + NumPy de 17 MB no ensaio |
| determinismo portátil | sim, em Node | exige runtime Python/binário externo |

O maior contorno OpenCV teve caixa `78,109,605,173`, área 65828,5 e 12
vértices aproximados. Seu filho, a outra face da mesma tinta, teve caixa
`84,112,594,127`, área 51187 e também 12 vértices. Escolher um deles como
silhueta seria uma regra de domínio adicional; sem ela, o traçador não sabe se
uma fronteira é exterior, espessura de traço, roda ou detalhe. Logo não reduz o
trabalho cognitivo da IA e pode criar falsa confiança.

## Veredito dos candidatos

- **SVG Path: usar.** Continua sendo a saída vetorial interoperável e editável;
  a especificação cobre linhas, curvas, arcos e fechamento, mas não substitui o
  contrato semântico da prancha.
- **OpenCV: adiar.** A licença Apache-2.0 é compatível, e a biblioteca pode ser
  reconsiderada se surgir corpus que o envelope local não consegue diagnosticar.
  Neste ensaio ela não supera escala, semântica, determinismo ou custo.
- **Potrace / Inkscape Trace Bitmap: rejeitar para o caminho crítico.** O próprio
  Inkscape descreve o resultado como conjunto de curvas de bitmap; isso ainda
  exige seleção e semântica posteriores. Potrace é GPL, incompatível com trazer
  a implementação para o núcleo MIT sem novo recorte de licença.

Fontes: [SVG Paths — W3C](https://www.w3.org/TR/SVG/paths.html),
[OpenCV](https://github.com/opencv/opencv) (Apache-2.0),
[OpenCV `approxPolyDP`](https://docs.opencv.org/3.4.2/d3/dc0/group__imgproc__shape.html),
[Inkscape Trace Bitmap](https://inkscape.org/en/doc/tutorials/tracing/tutorial-tracing.ru.html/)
e [Potrace](https://potrace.sourceforge.net/).

## Reprodução

```bash
PYTHONPATH=/tmp/mecanifica-r1-opencv \
  python3 tools/mecanifica/prancha-r1-opencv.py

node --input-type=module -e "import { lerPng, envelope, calibrarPorRodas, paraMilimetros, simplificar } from './tools/mecanifica/prancha-referencia.mjs'; const p='/tmp/mecanifica-r1-opencv-prancha.png'; const i=lerPng(p); const r={x0:50,x1:710,y0:80,y1:300}; const e=envelope(i,r); const c=calibrarPorRodas(e,r,{entreEixos:2640,comprimento:4800,altura:1360}); console.log(c, simplificar(paraMilimetros(e,c,{qual:'topo'}),{tolerancia:24}));"
```

## Consequência

R1 não adiciona biblioteca externa. R2 deve formalizar a autoria que nenhum
vetorizador entrega: procedência, confiança, bloqueio por informação insuficiente
e relações de vistas numa especificação curta, verificável e Agent-First.
