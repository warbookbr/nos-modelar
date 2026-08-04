---
name: auditar-peca
description: Verificar uma peça da Mecanifica pelo fluxo atual de descrição, bancada neutra, revisão do pacote e gates do repositório.
---

# Verificar peça

Use esta skill para obter evidência objetiva antes de publicar ou homologar uma
peça. O fluxo atual é semântico e visual; não depende do jogo antigo nem de uma
paleta fixa.

## Fluxo oficial

1. Gere a descrição estrita da peça:

   ```bash
   npm run descrever -- <peca> --estrito
   ```

   Confira contagens, órfãos, partes, portas, materiais e o envelope.

2. Abra a bancada neutra e leia as quatro vistas canônicas:

   ```bash
   npm run bancada -- <peca> --vistas=isometrica,frontal,direita,superior
   ```

   Leia as imagens produzidas. Verifique enquadramento, escala, cortes,
   legibilidade das partes e coerência da forma. Não conclua apenas pela
   existência de um PNG.

3. Para um pacote de modelagem, rode a revisão oficial:

   ```bash
   npm run revisar:modelagem -- <pacote> --revisao=r001
   ```

   A promoção deve ser feita pelo fluxo; não crie `revisao.json` manualmente.

4. Rode os gates aplicáveis:

   ```bash
   npm test
   npm run typecheck
   npm run build
   npm run porteiro
   npm run gabarito:selecao:check
   npm run id-cru:check
   npm run guarda:portas
   npm run guarda:camera
   npm run guarda:par
   npm run mapa:check
   npm run docs:toc:check
   npm run docs:links:check
   npm run planos:check
   npm run exportar:check
   ```

   `porteiro` e `npm run peca` ainda podem ajudar a diagnosticar o visor v3,
   mas são compatibilidade legada, não o gate visual oficial da Mecanifica.

## O que não é requisito

- A paleta não é gate atual: Resurrect64, `distancia-paleta`, seam, banding,
  contador de pixels órfãos e benchmark não fazem parte dos gates atuais.
- A bancada Three não exige `meta.colisao`, `colisaoDe` nem que toda face seja
  `solido`. Esses recursos permanecem disponíveis apenas para compatibilidade
  com peças e ferramentas v3; use-os quando o formato legado exigir.
- Não trate câmera, material, geometria ou identidade semântica como defeito
  sem evidência correspondente no fluxo atual.

## Relato

Registre comandos, medidas, vistas lidas, falhas e decisões. Diferencie um gate
reprodutível de uma observação visual. Se o briefing exigir algo que as vistas
não conseguem mostrar, registre a divergência honestamente em vez de alterar a
peça ou simular a capacidade.
