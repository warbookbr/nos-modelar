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
   vistas canônicas **em modo de auditoria**:

   ```bash
   npm run bancada -- <peca> --vistas=isometrica,frontal,direita,superior --cores
   ```

   `--cores` liga a auditoria e pinta uma cor por parte; `--auditoria` sozinho dá
   o mesmo enquadramento limpo mantendo o material do autor. Em auditoria a
   imagem perde o cromo da interface, o piso, a grade e a sombra, e a peça passa
   a ocupar o quadro inteiro.

   **Peça sempre `--cores` numa peça de mais de uma parte.** Sem isso, partes do
   mesmo material são um borrão só e a junção entre elas é invisível — três peças
   de aço lado a lado leem como uma. O comando imprime a LEGENDA (`aba=#ebb78e
   colar=#978eeb …`); use-a para citar a peça pelo nome, nunca pela posição.

   Sem `--cores` a captura sai como a pessoa vê a bancada: painel de componentes
   à esquerda, inspeção à direita, cabeçalho, barra de vistas e rodapé. Nessa
   imagem a peça fica numa tira estreita no meio, e a sombra no chão já foi lida
   como geometria. Para leitura humana está certo; para auditar, não.

   O catálogo homologado da bancada publicada pode estar vazio — isso é
   proposital, não defeito. Para carregar a peça sem publicá-la, use a sessão
   ativa: o procedimento está em
   [`ATIVACAO-BANCADA-SESSAO-ATIVA.md`](../../../docs/mecanifica/usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md).

   Não use uma URL
   pública com `?peca=` para validar receita privada; use um pacote de modelagem,
   o harness autorizado ou o perfil MCP correspondente. Leia as imagens
   produzidas. Verifique enquadramento, escala, cortes,
   legibilidade das partes e coerência da forma. Não conclua apenas pela
   existência de um PNG.

3. **Isole por pergunta.** Auditar tudo junto esconde erro estrutural debaixo de
   detalhe. Rode os três modos para a parte sob suspeita:

   ```bash
   npm run bancada -- <peca> --cores --selecionadas=<parte> --modo=isolar --focar
   npm run bancada -- <peca> --cores --selecionadas=<parte> --modo=contexto
   npm run bancada -- <peca> --cores --par=<parte>,<vizinha>
   ```

   **Para APROXIMAR numa parte, use `--modo=isolar --focar`.** Em `contexto` o
   enquadramento inclui a montagem inteira de propósito — é o que dá o contexto —
   então `--focar` ali não aproxima nada, e a imagem volta igual à geral. Quem
   quer ver de perto pede `isolar`.

   | modo | pergunta | o que avaliar |
   |---|---|---|
   | `isolar` | a superfície está boa? | continuidade, vinco, transição, ondulação |
   | `contexto` | cabe e encaixa? | folga, interferência, proporção, alinhamento |
   | `par` | este encaixe específico fecha? | contato, coaxialidade, penetração |
   | `todas` | lê como o objeto certo? | leitura geral, que **não** se decide sozinho |

   **Peça com vizinho nunca é aprovada só em `isolar`**: forma impossível passa
   isolada. Um arco que não comporta a própria roda só aparece em `contexto`.

4. **Conferência de Juntas e Contato:**
   Para peças com múltiplos corpos ou encaixes (como marcenaria ou mecânica),
   confira vãos reais e paralelismo angular das faces com:

   ```bash
   npm run conferir:juntas -- <peca> [--entre=parteA,parteB] [--estrito]
   ```

   O comando mede a distância euclidiana normal entre faces opostas e o ângulo
   de desvio, acusando imediatamente frestas em cunha (`⚠ CUNHA / DESALINHADA`)
   ou folgas indesejadas (`⚠ FRESTA VISÍVEL`).

5. Se existir um pacote de modelagem associado, rode a revisão oficial:

   ```bash
   npm run revisar:modelagem -- <pacote> --revisao=r001
   ```

   A promoção deve ser feita pelo fluxo; não crie `revisao.json` manualmente.

6. Rode os gates aplicáveis:

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
[`../../../docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md`](../../../docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md).

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

## Antes de qualquer julgamento: abra o alvo e sobreponha

Não é opcional e não é passo final. Uma prova inteira do chassi foi feita sem
isto: doze rodadas de modelagem sem que o desenho de referência fosse aberto uma
única vez, e o crítico visual recebendo só o render.

1. `npm run olhar -- alvo.png caminho/do/desenho.svg` e **leia a imagem**;
2. `npm run comparar:alvo -- cmp.svg caminho/da/malha.json` para pôr a silhueta
   do modelo sobre as curvas do alvo, em milímetros e na mesma origem;
3. despache o agente `critico-visual` passando os **três** caminhos — alvo,
   modelo e sobreposição. Crítico que recebe só o render dá opinião.

Sem alvo desenhado, desenhe antes: veja
[`REFERENCIA-E-CRITICA-VISUAL.md`](../../../docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md).

## Antes de caçar defeito: o método tem limite

Se você está tentando decidir **forma, proporção ou caráter**, não é problema
diagnóstico, e eliminar defeito ali rende conserto certo num objeto que continua
ruim. O sintoma é os achados encolherem e a nota não subir. Ver
[`METODO-DIAGNOSTICO-E-SEU-LIMITE.md`](../../../docs/mecanifica/usar/METODO-DIAGNOSTICO-E-SEU-LIMITE.md).

Quando o método valer, dois passos são obrigatórios e são os que mais somem:
**identificar o que falta** (o desenho de referência existia desde a primeira
rodada e nunca foi aberto) e **levantar hipóteses no plural antes de testar**
(o serrilhado foi culpa do renderizador duas vezes antes de alguém rastrear o
loop).
