---
name: auditar-peca
description: Verificar uma peça da Mecanifica pelo fluxo atual de descrição, bancada neutra, revisão do pacote e gates do repositório.
---

# Verificar peça

Use esta skill para obter evidência objetiva antes de publicar ou homologar uma
peça. O fluxo atual é semântico e visual; não depende do jogo antigo nem de uma
paleta fixa.

## Fluxo oficial

Se o alvo for uma árvore de composição, relações entre peças ou impacto de
revalidação, mude para `../auditar-montagem/SKILL.md`. Esta skill cobre uma
peça isolada e não inventa validade global de uma montagem.

1. Gere a descrição estrita da peça:

   ```bash
   npm run descrever -- <peca> --estrito
   ```

   Confira contagens, órfãos, partes, portas, materiais e o envelope.

2. Abra uma bancada/harness privado explicitamente configurado e leia as quatro
   vistas canônicas:

   ```bash
   npm run bancada -- <peca> --vistas=isometrica,frontal,direita,superior
   ```

   O catálogo homologado da bancada publicada pode estar vazio. Não use uma URL
   pública com `?peca=` para validar receita privada; use um pacote de modelagem,
   o harness autorizado ou o perfil MCP correspondente. Leia as imagens
   produzidas. Verifique enquadramento, escala, cortes,
   legibilidade das partes e coerência da forma. Não conclua apenas pela
   existência de um PNG.

3. **Isole por pergunta.** Auditar tudo junto esconde erro estrutural debaixo de
   detalhe. Rode os três modos para a parte sob suspeita:

   ```bash
   npm run bancada -- <peca> --selecionadas=<parte> --modo=isolar --focar
   npm run bancada -- <peca> --selecionadas=<parte> --modo=contexto
   npm run bancada -- <peca> --par=<parte>,<vizinha>
   ```

   | modo | pergunta | o que avaliar |
   |---|---|---|
   | `isolar` | a superfície está boa? | continuidade, vinco, transição, ondulação |
   | `contexto` | cabe e encaixa? | folga, interferência, proporção, alinhamento |
   | `par` | este encaixe específico fecha? | contato, coaxialidade, penetração |
   | `todas` | lê como o objeto certo? | leitura geral, que **não** se decide sozinho |

   **Peça com vizinho nunca é aprovada só em `isolar`**: forma impossível passa
   isolada. Um arco que não comporta a própria roda só aparece em `contexto`.

4. Se existir um pacote de modelagem associado, rode a revisão oficial:

   ```bash
   npm run revisar:modelagem -- <pacote> --revisao=r001
   ```

   A promoção deve ser feita pelo fluxo; não crie `revisao.json` manualmente.

5. Rode os gates aplicáveis:

   ```bash
   npm test
   npm run typecheck
   npm run build
   npm run porteiro
   npm run guarda:portas
   npm run guarda:camera
   npm run guarda:par
   npm run mapa:check
   npm run docs:toc:check
   npm run docs:links:check
   npm run planos:check
   npm run exportar:check
   ```

   Para uma peça nova ou alterada, inclua também:

   ```bash
   npm run criar -- <peca>
   ```

   `porteiro`, `npm run peca` e `npm run criar` ainda podem ajudar a diagnosticar
   o visor v3, mas são compatibilidade legada, não publicação nem o gate visual
   oficial da Mecanifica.

## O que não é requisito

- A paleta não é gate atual: Resurrect64, `distancia-paleta`, seam, banding,
  contador de pixels órfãos e benchmark não fazem parte dos gates atuais.
- A bancada Three não exige `meta.colisao`, `colisaoDe` nem que toda face seja
  `solido`. Esses recursos permanecem disponíveis apenas para compatibilidade
  com peças e ferramentas v3; use-os quando o formato legado exigir.
- Não trate câmera, material, geometria ou identidade semântica como defeito
  sem evidência correspondente no fluxo atual.
- Receita privada não é peça homologada: a ausência no catálogo é um estado
  válido e deve ser relatada separadamente da falha geométrica.

## Relato

Registre comandos, medidas, vistas lidas, falhas e decisões. Diferencie um gate
reprodutível de uma observação visual. Se o briefing exigir algo que as vistas
não conseguem mostrar, registre a divergência honestamente em vez de alterar a
peça ou simular a capacidade.

### Antes de tudo: OLHE a imagem

Rasterize as vistas e **abra o PNG**:

```
node tools/mecanifica/olhar.mjs saida.png vista-a.svg vista-b.svg
```

Ler o PNG como imagem é passo obrigatório antes de julgar, antes de despachar
crítico e antes de levar qualquer coisa ao usuário. SVG gerado, entregue e nunca
aberto por quem desenhou é o modo de falha real: um nariz aberto de 600 x 370 mm
ficou várias rodadas visível na vista frontal e só foi achado por um script.
Medição pega o defeito que alguém já imaginou; olhar pega o resto.

## Despachar o crítico, sem contexto

Em marco — antes de propor promoção, publicação ou de levar o resultado ao
usuário — despache um subagente como **crítico visual**. O protocolo está em
[`../../../docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`](../../../docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md).

Passe **apenas o PNG** e a pergunta. **Não passe receita, código, passos,
relatório, o seu raciocínio nem o histórico de construção.** O crítico é para
VER a imagem — revisão de receita é outro trabalho, com outro dono, e um crítico
que lê a receita volta a julgar a intenção em vez do resultado, que é
exatamente o defeito que este papel existe para cobrir. Papel separado dentro da
mesma sessão é ficção: quem modelou tem a narrativa e não consegue não tê-la.

A forma padrão é legibilidade cega: entregue a imagem sem dizer o que é e
pergunte "o que é isto?". Se a resposta não bate com a intenção, é achado, e o
teste não exige gosto — só verifica se a forma comunica.

Três limites, todos inegociáveis:

- **achado, nunca aprovação.** Silêncio do crítico não é evidência de qualidade
  e não entra em registro como aceite. Forma quem aprova é o usuário;
- **depois dos gates, nunca no lugar deles.** Se descrição, medida ou gate ainda
  acusam, corrija primeiro;
- **em marco, não a cada rodada.** Cada despacho é partida fria.
