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

6. Rode os gates:

   ```bash
   npm run gates
   ```

   Roda todos e relata todos numa execução. Esta seção listava doze deles à mão,
   e a lista já tinha ficado para trás — a fonte é `tools/gates.mjs`, conferida
   contra o `ci.yml` nos dois sentidos.

   Para uma peça nova ou alterada, inclua também:

   ```bash
   npm run criar -- <peca>
   npm run malha:conferir -- <peca>
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

## O laço visual — obrigatório, e mora num lugar só

Olhar o PNG, sobrepor ao alvo, despachar o crítico sem contexto e reconhecer o
limite do método diagnóstico valem em toda tarefa que produz forma. As quatro
regras estão em
[`LACO-VISUAL.md`](../../../docs/mecanifica/usar/LACO-VISUAL.md), e estavam
copiadas palavra por palavra aqui e na outra skill — regra duplicada envelhece
em lugares diferentes.

Quando precisar EMITIR um achado em formato reexecutável — ou consultar o caso
aplicado da roda dianteira —, o contrato está em
[`CRITICA-VISUAL-CONTRATO-E-CASOS.md`](../../../docs/mecanifica/usar/CRITICA-VISUAL-CONTRATO-E-CASOS.md).
É consulta: o esquema JSON de um achado não é coisa que se leia para decidir uma
proporção.
