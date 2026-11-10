# Empilhadeira inteira, da carcaça aos garfos, por partes plugadas numa montagem

**Estado:** ativo

**Território:** `procedural/pecas/empilhadeira/`, `docs/modelar/banco-de-provas/empilhadeira-2026-11-09/`, `procedural/nucleo/lacos-pelas-vistas.js`, `procedural/nucleo/lacos-pelas-vistas.test.mjs`, `tools/modelar/capacidade.mjs`, `tools/modelar/leitura-por-regioes.mjs`, `tools/modelar/leitura-por-regioes.test.mjs`, `tools/modelar/linhas-do-modelo.mjs`, `tools/modelar/linhas-do-modelo.test.mjs`, `tools/modelar/perfil-por-cor.mjs`, `tools/modelar/perfil-por-cor.test.mjs`, `tools/modelar/sobra-entre-partes.mjs`, `tools/modelar/sobra-entre-partes.test.mjs`, `tools/modelar/casamento-da-vista.mjs`, `tools/modelar/casamento-da-vista.test.mjs`, `procedural/nucleo/gaiola-por-lacos.js`, `procedural/nucleo/gaiola-por-lacos.test.ts`

**Responsável:** Tiago (crítica visual e aceite) e a IA da sessão (condução, medidas, segmentação, despacho e implementação)

**Repositório e base:** `warbookbr/nos-modelar`, base na main em 2026-11-09.

## Problema observado

A empilhadeira foi alinhada só até a carcaça em 2026-10-09 e parou à espera de
ferramentas que hoje existem (gaiola por laços, união de tubos com
arredondamento, conferência de porta pela face que assenta, famílias de roda e de
cilindro hidráulico). Do trabalho de outubro ficaram a lateral em contornos por
parte (`docs/modelar/banco-de-provas/empilhadeira-2026-10-14/referencias/`) e o
alinhamento da carcaça (`.../empilhadeira-2026-10-09/ALINHAMENTO.md`). Em
2026-11-09 a pessoa trouxe três vistas geradas por IA da mesma máquina (de cima,
de trás e de frente) e pediu o objeto inteiro, feito de forma autônoma: a IA
decide medidas, segmentação, protótipos e despacho, e a pessoa faz o papel do
crítico visual quando chamada.

## Resultado

A empilhadeira inteira existe como montagem de partes no acervo, cada parte
fixa por aceite da pessoa por imagem, montada na ordem em que uma oficina a
montaria, com as juntas que giram (rodas, eixo traseiro direcional, inclinação
da torre, elevação, volante) nos eixos certos e nenhuma peça cruzando outra.

## Alinhado com a pessoa (2026-11-09)

- Trabalho autônomo: a IA decide medidas, partes, técnica e ordem, e registra
  cada decisão no `ALINHAMENTO.md` da peça. A pessoa é chamada para julgar forma,
  sempre com a imagem e um resumo curto do que deve validar.
- Primeiro a base: a carcaça central com a forma certa e detalhada; depois as
  partes plugadas nela.
- Atrito, limite ou ferramenta mal otimizada que aparecer vira correção na
  ferramenta geral, num plano à parte se for grande, ou item de backlog, sem
  esperar a pessoa.
- Os envios são checkpoints no ramo da sessão e **não** vão à main: o commit de
  checkpoint leva `[skip ci]` na mensagem, porque o CI junta à main todo envio
  verde a `claude/**`. A junção à main fica para quando a pessoa pedir.
- Em 2026-11-09 a pessoa pediu o gerador que leva a seção lateral ao longo da
  planta (`lacosPelasVistas`, no núcleo), depois de ver a divisa do capô em
  arco no rascunho da traseira; por isso o território inclui os arquivos dele.
- Em 2026-11-10 a pessoa pediu a camada de conferência que entrega a quem conduz
  cada lugar da vista, um por um (`npm run leitura:regioes`), depois de achar
  quatro defeitos na traseira que a vista inteira não mostrou; o território
  inclui os arquivos dela.
- As imagens de IA entram em `procedural/pecas/empilhadeira/referencias/` como
  alvo de caráter, uma vista por arquivo, sem valer como medida (CLAUDE.md); a
  lateral entra pelos contornos de outubro. A medida vem da `TABELA`.

## Filtro Agent-First

- Gaiola por laços (`gaiolaPorLacos`) e subdivisão: **USAR DIRETO** na carcaça,
  que é corpo moldado com cantos suaves e cortes de arco.
- `lathe` + `unir` + `arredondarCostura`: **USAR DIRETO** nos tubos do protetor,
  do escape e da coluna de direção, como no braço.
- Família `roda-pneu`: **USAR DIRETO**, com dois perfis novos (7.00-12 e 6.00-9),
  como o perfil do furgão.
- Família `cilindro-hidraulico`: **USAR DIRETO** nos cilindros de elevação e de
  inclinação.
- Esboço 2.0 (`npm run esboco:nucleo`): **USAR DIRETO** para toda escolha de forma
  levada à pessoa.
- Exportação da montagem: **ADIAR**; é a fatia 2 do plano do braço.

## Incluído

- Fatia 0: referências, medidas, partes, ordem de montagem e prancha das três
  vistas, aceitas pela pessoa.
- A carcaça e cada parte plugada, na ordem das fatias, cada uma pelo laço:
  esboço quando houver forma em disputa, modelador novo, medição, imagens à
  pessoa, aceite e etapa fixa.
- As correções de ferramenta que a empilhadeira revelar, na ferramenta geral.

## Excluído

- Motor, transmissão, hidráulica interna, fiação e qualquer interior que não se
  vê com a máquina fechada.
- PBR e paleta nova (CLAUDE.md); as cores entram por material da receita.
- A exportação da montagem e o .blend (plano do braço, fatia 2).
- Torre triplex, deslocador lateral e outros implementos.

## Gate de saída

1. Todas as etapas da `montagem.json` da empilhadeira fixas por aceite da
   pessoa, com as juntas passando.
2. `etapas --auditar` sem par que se cruze e sem par inconclusivo nas peças da
   empilhadeira (ou o inconclusivo com causa no backlog).
3. Vistas de três quartos, frente, lado, trás e cima da máquina inteira, lado a
   lado com as referências, aceitas pela pessoa.
4. `npm run gates` verde e o `ALINHAMENTO.md` com toda medida, fonte e decisão.

## Fatias

0. **Referências e medidas.** Tabela de medidas com a fonte de cada uma (ficha de
   classe 2,5 t a GLP e os contornos da lateral como conferência, com tolerância
   de 5%); partes e ordem de montagem; prancha das vistas lateral, frontal e de
   cima, desenhada pela `TABELA`, posta ao lado das imagens de IA; crítica da
   pessoa.
1. **Carcaça bruta.** Contrapeso, capô, laterais, piso e paralamas como um corpo
   só na silhueta e nos volumes certos, sem detalhe; aceite de proporção.
2. **Carcaça detalhada.** Arcos das rodas com os poços, tampa do capô, degrau,
   grade do contrapeso, lanternas traseiras rentes, anteparo dos pedais, painel.
3. **Eixos e rodas.** Eixo dianteiro (motriz) e eixo traseiro direcional, com as
   rodas da família `roda-pneu`; a máquina passa a apoiar no chão.
4. **Torre e garfos.** Canais externos e internos, travessas, cilindros de
   elevação e de inclinação, correntes, placa porta-garfos, grade de carga e os
   dois garfos.
5. **Protetor do operador.** Quatro colunas, teto em grade, luzes de trabalho,
   espelho e as lanternas do alto.
6. **Posto do operador.** Banco, coluna de direção com volante, pedais, alavancas.
7. **Acessórios.** Cilindro de GLP com berço e cintas, escape, alça de acesso.
8. **Fechamento.** Auditoria da montagem, vistas finais, atritos classificados,
   backlog e o plano movido para `encerrados/`.

## Fatias de ferramenta (camada de conferência)

A pessoa pediu em 2026-11-10 que a conferência que achou os defeitos da traseira
vire recurso geral, e deu liberdade para criar ferramenta e melhorar o núcleo. A
ordem veio de um agente de planejamento, por valor sobre custo; os defeitos de
origem estão em `ATRITOS.md`, itens 6 a 12. Nenhuma fatia aprova forma por número.

- **T0, entregue.** `leitura:regioes`, `linhas:modelo` e `lacosPelasVistas`.
- **T1, entregue.** `perfil:cor`: a referência reduzida às cores declaradas, com
  os trechos de cada cor por linha e a meia largura por altura; a classificação
  (`classificar` de `perfil-por-cor.mjs`) é a que as fatias seguintes usam.
- **T2 e T3, entregues.** `casamento:vista`: por região, a fração de pixels com
  a cor de material trocada (a cor chapada de cada parte, tirada da malha) e a
  distância de cada linha de contorno e de divisa do modelo à divisa de classes
  mais próxima da referência, nos dois sentidos; a nota ordena as regiões.
- **T4, entregue.** `sobra:partes`: quanto de uma parte aparece fora do contorno
  da parte que a contém em cada vista, com a relação declarada por quem conduz
  (item 12). Na traseira antiga acusa 29,4 mm da moldura na vista de cima.
- **T5, entregue.** Aviso `compensacaoPassa` em `gaiolaPorLacos` quando
  `compensar` leva a superfície mais de 2 mm além do contorno declarado (item
  8): mudança de núcleo, sem mudar malha. A causa é a quina do contorno sem
  vinco; a correção da conta muda peças aceitas e está no backlog.
- **T6.** Um comando por rodada (`conferir:vistas`) que encadeia T1 a T4 e a
  leitura para todas as vistas com referência, e a entrada nas skills.
- **Adiado.** A entrada pela receita de peça (`PLANO.referencias` com vista e
  caixa) encosta no território do plano de ferramentas de conferência e de
  vista; fica para ele ou para quando a pessoa passar o arquivo.

## Método de cada parte

1. Fonte de forma: a vista de IA que a mostra melhor e o contorno da lateral;
   fonte de medida: a `TABELA` da peça, tirada do `ALINHAMENTO.md`.
2. Forma em disputa vai em esboço lado a lado à pessoa antes de modelar.
3. Um modelador novo por parte, com o brief da parte, os contatos e a técnica
   sugerida; ele escreve a receita e a entrada da montagem.
4. Quem conduz mede (rodada `--acao`, `descrever`, guardas da peça, etapas) e
   gera as vistas montadas; só então chama a pessoa com a imagem e o resumo.
5. Aceite da pessoa fixa a etapa; recusa volta ao modelador com os defeitos.
6. Cada achado responde se o processo o teria pego; quando não, vira régua,
   gate ou instrução antes de a correção ser dada por pronta.

## Riscos e parada

A carcaça é a parte de maior risco: corpo moldado com dois arcos de roda e o
capô alto. Se a gaiola não fechar a silhueta em três rodadas, a carcaça volta à
pessoa com as opções (gaiola, extrusão com arredondamento, subdivisão). Para
também se uma correção geral pedir mudança em peça de outro plano, ou se as
cinco vagas de plano ativo impedirem abrir o plano de uma correção grande: aí
ela vai ao backlog e a pessoa decide.

## Andamento

Aberto em 2026-11-09 com as três vistas de IA, a lateral de outubro e o
alinhamento da carcaça, e o pedido de trabalho autônomo.

## Fechamento

Preencher somente ao concluir ou cancelar.
