# Leitura de referência rasterizada

**Estado:** concluído

**Responsável:** Claude

## Objetivo

Destravar a comparação quantitativa entre desenho e referência. O plano anterior
do motor de prancha declarou isso fora de escopo e bloqueado, porque a prancha
de referência não existia em disco. Ela existe agora.

## Problema

Sem ler a referência, a comparação era leitura a olho: "está uns 30% parecido".
Isso não vira correção. E a análise visual pode estar simplesmente errada — foi
o que aconteceu.

## Invariantes

- a imagem de terceiro **não** entra no repositório público; entram apenas as
  coordenadas derivadas, que são fato sobre proporção;
- sem dependência nova: o PNG é decodificado em Node puro com `zlib`;
- todo derivado declara origem, método de calibração e resíduo;
- limite de confiança é medido, não suposto.

## O que foi entregue

`tools/mecanifica/prancha-referencia.mjs`:

- decodificador PNG mínimo, sem navegador e sem dependência;
- detecção dos painéis com tinta, para não chutar recorte à mão;
- envelope superior e inferior com mediana móvel;
- calibração pixel→milímetro por entre-eixos entre as manchas de contato das
  rodas, com resíduo contra comprimento e altura declarados;
- simplificação por Douglas-Peucker;
- comparação de silhuetas por desvio, estação a estação em z.

## Resultados medidos

Calibração da prancha do fastback: 9,113 mm/px, resíduo de −1,9% no comprimento
e +1,8% na altura.

Comparação do meu estudo contra ela: desvio absoluto médio 45,6 mm, rms 70,3 mm.
Por região: capô −17 mm, teto −17 mm, para-brisa +24 mm, vidro traseiro +27 mm,
nariz +69 mm, traseira **+112 mm**.

**A medida contrariou minha análise visual.** Eu havia afirmado que o erro grave
era a linha do teto abaulada. O teto desvia 17 mm. Os erros reais são a traseira
alta e a ponta do nariz, que eu não tinha apontado. Sempre que medida e olho
divergirem, a medida ganha, e este caso é a evidência.

## Limite, medido e registrado

Variando a janela de suavização de 1 a 41 px:

- desvio absoluto médio: 46 → 39 mm, estável — **confiável**;
- inversões de curvatura: 31 → 51, sem convergir, e piora ao suavizar mais —
  **é ruído**, não forma.

Comparar proporção e posição contra raster funciona. Julgar caráter de
superfície por curvatura de raster, não.

## Correção de bug encontrada pelos testes

`calibrarPorRodas` media altura e comprimento contra o retângulo de recorte, que
é palpite do chamador: recorte com folga inflava o resíduo. Passou a medir contra
a tinta. Coberto por teste de regressão.

## Fora deste plano

Vistas frontal, traseira e superior da referência; extração de linhas internas;
sobreposição visual renderizada; qualquer geometria 3D.

## Registro

- **V1 — 2026-08-19:** plano aberto e concluído no mesmo recorte. 15 testes
  novos, com o PNG de teste montado em memória para não versionar imagem.
