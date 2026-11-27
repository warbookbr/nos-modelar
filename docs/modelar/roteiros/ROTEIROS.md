# Roteiros de leitura por intenção

<!-- Gerado de roteiros.json por `npm run roteiros:gerar`. Não edite à mão. -->

Cada roteiro diz o que ler antes de começar, o que abrir só quando a condição aparecer, a
skill, os comandos e o que se confere no fim, e `npm run comecar -- <roteiro>` (ou a ferramenta
MCP `comecar`) devolve o mesmo com o passo seguinte lido do estado. Todo roteiro começa pelo
`CLAUDE.md`, que traz as regras que nenhuma ferramenta confere e a lista destes roteiros. `npm run leitura:obrigatoria` imprime
o tamanho da leitura de cada roteiro contra o orçamento e a linha de base, e o gate recusa o
roteiro que passa de um ou do outro. A leitura soma a lista de cada roteiro e a skill que o passo seguinte manda aplicar. O `AGENTS.md` faz para outros agentes o papel do
`CLAUDE.md` e não entra na soma.

| roteiro | intenção | quando |
| --- | --- | --- |
| `mudar/plano` | trabalhar no projeto | Mudar núcleo, gate, arquitetura, ferramenta ou plano, pela fatia de um dos planos ativos. |
| `mudar/defeito` | trabalhar no projeto | Um comportamento relatado contradiz o que o código ou a documentação promete. |
| `documentar` | trabalhar na documentação | Escrever, mover ou cortar documento, fora de um plano. |
| `pesquisar` | pesquisar | Saber o que já se tentou, mediu ou pesquisou antes de propor algo. |
| `modelar/peca/familia` | modelar | A peça é um caso de uma família que já existe, como aparelho, móvel, cadeira ou roda. |
| `modelar/peca/nova` | modelar | Nenhuma família serve, e a receita nova se escreve com as operações do motor. |
| `modelar/peca/corrigir` | modelar | Corrigir ou refinar uma peça que já está no acervo, ou absorver um ajuste feito na bancada. |
| `modelar/opcoes` | modelar | Há escolha de forma no alinhamento ou na modelagem: as opções saem lado a lado pelo esboço 2.0 ou pelas variantes da receita. |
| `modelar/rodada` | modelar | A peça já tem alvo combinado, e o trabalho é conduzir modelador e crítico rodada a rodada até a pessoa decidir. |
| `modelar/montar` | modelar | O objeto tem várias partes, e cada uma entra encaixada nas que já estão prontas, numa montagem por etapas. |
| `modelar/auditar-peca` | modelar | Obter evidência objetiva de uma peça antes de publicar ou homologar. |
| `modelar/auditar-montagem` | modelar | Conferir composição, relações, encaixes e impacto de um conjunto montado. |
| `modelar/exportar` | modelar | A peça ou a montagem está pronta e sai em STEP, OBJ, glTF ou ficha do objeto. |

## Perguntas da árvore

Sem roteiro, ou com o nome de um grupo, o `comecar` faz a pergunta do grupo e lista os ramos:

- `mudar`: A mudança segue o plano ativo ou corrige um defeito pontual?
- `modelar`: Peça, opções, rodada, montagem, auditoria ou exportação?
- `modelar/peca`: A peça sai de uma família que já existe, é uma receita nova por operações, ou é a correção de uma peça do acervo?

## Regras cobradas por gate

Valem em toda intenção e saem do `CLAUDE.md` porque o gate as recusa no momento do erro:

- O núcleo de autoria é independente de Three.js. O teste
  `tools/arquitetura/nucleo-sem-three.test.mjs`, do gate `test`, confere.
- IDs internos, índices de arrays e posições de passos nunca são identidade persistida; a receita do
  acervo que endereça a malha por id posicional é recusada. O gate `guarda:acervo` confere.
- Não edite `docs/MAPA.md` à mão; depois de mexer em documentação, rode `npm run mapa`. O gate
  `mapa:check` confere.

## mudar/plano: Mudar pelo plano

Mudar núcleo, gate, arquitetura, ferramenta ou plano, pela fatia de um dos planos ativos.

Ler antes de começar, num orçamento de 23.000 bytes (linha de base de 59.061 bytes em 2026-10-08):

- `CLAUDE.md`
- `docs/modelar/INDEX.md`
- `docs/modelar/planos/README.md`

Abrir só quando a condição aparecer:

- `comunicacao.md`, quando o trabalho é dividido com a outra IA, e então passa por ele, com uma tarefa por seção.
- `docs/modelar/contratos/ARQUITETURA.md`, quando a mudança atravessa camadas.
- `docs/modelar/decisoes/UPSTREAM-NOS.md`, quando a mudança é geral e pode voltar ao NÓS, e então fica isolada e registrada nele.
- `docs/modelar/guias/LEITURA-POR-TAREFA.md`, quando a pergunta é por assunto e nenhum roteiro a responde.

Comandos: `npm run gates`, `npm run mapa`, `npm run uso`, `npm run ramos:parados`, `npm run pedido -- <plano> --fatia=<n>`.

Passo seguinte, sem estado lido: Escolha um dos planos ativos, pelo território, e trabalhe na fatia em aberto dele; sem plano ativo, proponha um plano antes de implementar.

Conferido no fim: npm run gates, com a bateria completa quando muda código.

## mudar/defeito: Corrigir um defeito

Um comportamento relatado contradiz o que o código ou a documentação promete.

Ler antes de começar, num orçamento de 6.000 bytes (linha de base de 17.443 bytes em 2026-10-27):

- `CLAUDE.md`
- `docs/modelar/INDEX.md#corrigir-um-defeito`

Abrir só quando a condição aparecer:

- `docs/modelar/contratos/ARQUITETURA.md`, quando a correção atravessa camadas.
- `docs/modelar/planos/README.md`, quando a correção vira plano.

Comandos: `npm run test -- <arquivo de teste>`, `npm run gates -- --completo`.

Passo seguinte, sem estado lido: Ache o teste que falha pelo defeito, ou escreva um, corrija na origem e veja o teste passar.

Conferido no fim: O teste do defeito passando e npm run gates -- --completo.

## documentar: Escrever ou reorganizar documentação

Escrever, mover ou cortar documento, fora de um plano.

Ler antes de começar, num orçamento de 13.600 bytes (linha de base de 13.635 bytes em 2026-10-08):

- `CLAUDE.md`
- `docs/modelar/INDEX.md`

Abrir só quando a condição aparecer:

- `docs/modelar/planos/README.md`, quando o documento é um plano.
- `docs/modelar/usar/README.md`, quando o documento é de uso, em docs/modelar/usar/.
- `docs/modelar/decisoes/HISTORICO-RETIRADO.md`, quando o documento sai da árvore: a crônica guarda o commit onde o texto está.
- `docs/modelar/guias/LEITURA-POR-TAREFA.md`, quando a pergunta é por assunto e nenhum roteiro a responde.

Comandos: `npm run mapa`, `npm run gates`.

Passo seguinte, sem estado lido: Edite o documento, rode npm run mapa e confira com npm run gates.

Conferido no fim: npm run gates, que roda os gates de documentação (links, sumário, estrutura, citações e mapa).

## pesquisar: Procurar o que já foi feito ou pesquisado

Saber o que já se tentou, mediu ou pesquisou antes de propor algo.

Ler antes de começar, num orçamento de 6.600 bytes (linha de base de 8.948 bytes em 2026-10-08):

- `CLAUDE.md`
- `docs/modelar/decisoes/README.md`

Abrir só quando a condição aparecer:

- `docs/modelar/decisoes/PLANOS-ENCERRADOS.md`, quando a pergunta é sobre um plano concluído ou cancelado.
- `docs/modelar/decisoes/HISTORICO-RETIRADO.md`, quando a pergunta é sobre um relatório, dossiê ou diário que saiu da árvore.
- `docs/modelar/pesquisas/PESQUISA-ABERTA-2026-10.md`, quando a pergunta é sobre ferramentas de outros projetos.
- `docs/modelar/pesquisas/FERRAMENTAS-POR-OBJETO.md`, quando a pergunta é que ferramenta cada objeto pede.
- `docs/modelar/banco-de-provas/BANCO-DE-PROVAS.md`, quando a pergunta é quanto custou modelar um objeto.
- `docs/modelar/pesquisas/ANALISES-DE-2026-10.md`, quando a pergunta é sobre a avaliação da estrutura do projeto.

Passo seguinte, sem estado lido: Abra docs/modelar/decisoes/README.md: as decisões em vigor estão nos registros, e a crônica de planos e de histórico diz o commit onde cada texto está.

Conferido no fim: Nada a conferir: pesquisa não muda o repositório, e o que dela virar trabalho precisa de plano.

## modelar/peca/familia: Peça de uma família

A peça é um caso de uma família que já existe, como aparelho, móvel, cadeira ou roda.

Ler antes de começar, num orçamento de 16.500 bytes (linha de base de 62.482 bytes em 2026-10-08):

- `CLAUDE.md`
- `.claude/skills/criar-peca/SKILL.md`
- `docs/modelar/usar/AUTORIA-DE-PECA.md#peça-de-uma-família`
- `procedural/familias/exemplo/receita.js`
- `docs/modelar/usar/LACO-VISUAL.md#3-despachar-o-crítico-sem-contexto`

Lista gerada na hora: familias.

Abrir só quando a condição aparecer:

- `docs/modelar/usar/GUIA-AUTORIA-IA.md`, quando for preciso ver a anatomia inteira da receita ou a esteira de validação.
- `docs/modelar/usar/LACO-VISUAL.md`, quando for olhar a imagem, sobrepor ao alvo ou medir onde o método diagnóstico para.
- `docs/modelar/usar/AUTORIA-DE-PECA.md`, quando a dúvida for o contrato da receita, a identidade, a seleção ou o que separa peça de montagem.
- `docs/modelar/usar/AUTORIA-RECEITA-DECLARATIVA.md`, quando a receita for escrita como dado JSON, pela autoria por MCP.
- `docs/modelar/usar/INTENCAO-PECA-V1.md`, quando a função da peça não for óbvia pela geometria e pedir o contrato INTENCAO.
- `docs/modelar/usar/GOTCHAS-AUTORIA-VISUAL.md`, quando for gerar forma pela primeira vez ou um defeito visual se repetir.
- `docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md`, quando for montar o pacote do crítico ou parear referência e render.
- `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`, quando uma operação se comportar diferente do esperado e for preciso o caso medido dela.
- `docs/modelar/usar/FLUXO-DO-OBJETO.md`, quando o objeto tiver várias partes, da imagem à montagem.
- `docs/modelar/usar/RODADA-DE-ALINHAMENTO-EXEMPLO.md`, quando a peça for nova e precisar da rodada de alinhamento antes do PLANO.
- `.claude/skills/criar-peca/references/operacoes-procedurais.md`, quando for escolher uma operação.
- `docs/modelar/usar/METODO-DIAGNOSTICO-E-SEU-LIMITE.md`, quando os achados encolhem e a qualidade não sobe.
- `docs/modelar/usar/CRITICA-VISUAL-CONTRATO-E-CASOS.md`, quando for montar o pedido ao crítico ou ler o formato do achado.
- `docs/modelar/usar/MONTAGENS-SEMANTICAS.md`, quando a peça entra numa montagem.
- `docs/modelar/usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md`, quando for carregar a peça na bancada da sessão.
- `docs/modelar/usar/CONTRATO-AUTORIA-PRANCHA.md`, quando a peça parte de uma prancha.
- `docs/modelar/usar/PARAMETROS-VIVOS.md`, quando for alterar um número da receita.
- `docs/modelar/usar/PARE-E-ANALISE.md`, quando for declarar a forma pronta.
- `docs/modelar/usar/README.md`, quando a tarefa pede o mapa dos contratos de uso que o roteiro não cita.
- `docs/modelar/usar/CACHE-POR-PASSO.md`, quando um comando repetido sobre a mesma peça parece lento ou serve um resultado suspeito, para ligar, limpar ou desligar o cache por passo.
- `docs/modelar/usar/CONFERIR-CONTRA-REFERENCIA.md`, quando há foto de referência e não há prancha, para medir a borda em milímetro.
- `docs/modelar/guias/modelar-carroceria.md`, quando a peça é uma chapa contínua de superfície lisa, com dobras vivas, raio de borda, arcos e vãos, modelada por subdivisão.
- `docs/modelar/guias/modelar-veiculo-em-chassi-e-lataria.md`, quando o objeto é um veículo com chassi por baixo e lataria em painéis separados por vãos.
- `.claude/skills/laco-de-modelagem/processo-leve.md`, quando o objeto for um perfil de uma família existente ou uma família de caixa com frente: o processo leve, sem laço por unidade.
- `docs/modelar/usar/MEDIDAS-AVULSAS.md`, quando a medida que falta não está nos comandos do roteiro: reflexo de chapa, distância à pele, material de uma vista ou parte fora do contorno de outra.
- `docs/modelar/usar/EXPORTACAO.md`, quando a forma foi aprovada e a peça sai em STEP, OBJ, glTF ou ficha.

Skill: `criar-peca`.

Comandos: `node tools/modelar/olhar-bancada.mjs --analise --peca=<nome>`, `npm run parametros`, `npm run conferir:referencia`.

Passo seguinte, sem estado lido: Escolha a família e o perfil mais perto do pedido, escreva a receita que a chama com os parâmetros da TABELA e prove a peça na bancada.

Conferido no fim: A análise da bancada aberta e lida, o crítico visual sem contexto e npm run gates.

## modelar/peca/nova: Receita nova por operações

Nenhuma família serve, e a receita nova se escreve com as operações do motor.

Ler antes de começar, num orçamento de 26.500 bytes (linha de base de 62.482 bytes em 2026-10-08):

- `CLAUDE.md`
- `.claude/skills/criar-peca/SKILL.md`
- `docs/modelar/usar/GUIA-AUTORIA-IA.md#2-anatomia-canônica-de-uma-receita-procedural`
- `docs/modelar/usar/LACO-VISUAL.md#3-despachar-o-crítico-sem-contexto`
- `.claude/skills/alinhar-modelagem/SKILL.md`, a skill que o passo seguinte manda aplicar

Lista gerada na hora: operacoes.

Abrir só quando a condição aparecer:

- `docs/modelar/usar/GUIA-AUTORIA-IA.md`, quando for preciso ver a anatomia inteira da receita ou a esteira de validação.
- `docs/modelar/usar/LACO-VISUAL.md`, quando for olhar a imagem, sobrepor ao alvo ou medir onde o método diagnóstico para.
- `docs/modelar/usar/AUTORIA-DE-PECA.md`, quando a dúvida for o contrato da receita, a identidade, a seleção ou o que separa peça de montagem.
- `docs/modelar/usar/AUTORIA-RECEITA-DECLARATIVA.md`, quando a receita for escrita como dado JSON, pela autoria por MCP.
- `docs/modelar/usar/INTENCAO-PECA-V1.md`, quando a função da peça não for óbvia pela geometria e pedir o contrato INTENCAO.
- `docs/modelar/usar/GOTCHAS-AUTORIA-VISUAL.md`, quando for gerar forma pela primeira vez ou um defeito visual se repetir.
- `docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md`, quando for montar o pacote do crítico ou parear referência e render.
- `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`, quando uma operação se comportar diferente do esperado e for preciso o caso medido dela.
- `docs/modelar/usar/FLUXO-DO-OBJETO.md`, quando o objeto tiver várias partes, da imagem à montagem.
- `docs/modelar/usar/RODADA-DE-ALINHAMENTO-EXEMPLO.md`, quando a peça for nova e precisar da rodada de alinhamento antes do PLANO.
- `.claude/skills/criar-peca/references/operacoes-procedurais.md`, quando for escolher uma operação.
- `docs/modelar/usar/METODO-DIAGNOSTICO-E-SEU-LIMITE.md`, quando os achados encolhem e a qualidade não sobe.
- `docs/modelar/usar/CRITICA-VISUAL-CONTRATO-E-CASOS.md`, quando for montar o pedido ao crítico ou ler o formato do achado.
- `docs/modelar/usar/MONTAGENS-SEMANTICAS.md`, quando a peça entra numa montagem.
- `docs/modelar/usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md`, quando for carregar a peça na bancada da sessão.
- `docs/modelar/usar/CONTRATO-AUTORIA-PRANCHA.md`, quando a peça parte de uma prancha.
- `docs/modelar/usar/PARAMETROS-VIVOS.md`, quando for alterar um número da receita.
- `docs/modelar/usar/PARE-E-ANALISE.md`, quando for declarar a forma pronta.
- `docs/modelar/usar/README.md`, quando a tarefa pede o mapa dos contratos de uso que o roteiro não cita.
- `docs/modelar/usar/CACHE-POR-PASSO.md`, quando um comando repetido sobre a mesma peça parece lento ou serve um resultado suspeito, para ligar, limpar ou desligar o cache por passo.
- `docs/modelar/usar/CONFERIR-CONTRA-REFERENCIA.md`, quando há foto de referência e não há prancha, para medir a borda em milímetro.
- `docs/modelar/guias/modelar-carroceria.md`, quando a peça é uma chapa contínua de superfície lisa, com dobras vivas, raio de borda, arcos e vãos, modelada por subdivisão.
- `docs/modelar/guias/modelar-veiculo-em-chassi-e-lataria.md`, quando o objeto é um veículo com chassi por baixo e lataria em painéis separados por vãos.
- `.claude/skills/laco-de-modelagem/processo-leve.md`, quando o objeto for um perfil de uma família existente ou uma família de caixa com frente: o processo leve, sem laço por unidade.
- `docs/modelar/usar/MEDIDAS-AVULSAS.md`, quando a medida que falta não está nos comandos do roteiro: reflexo de chapa, distância à pele, material de uma vista ou parte fora do contorno de outra.
- `docs/modelar/usar/EXPORTACAO.md`, quando a forma foi aprovada e a peça sai em STEP, OBJ, glTF ou ficha.

Skill: `criar-peca`.

Comandos: `node tools/modelar/olhar-bancada.mjs --analise --peca=<nome>`, `npm run parametros`, `npm run conferir:referencia`, `npm run silhueta:referencia -- --imagem=<foto.png> --regioes=<regioes.json> --escala=<x1,y1,x2,y2,mm> --alinhar=<8 números> --cortes=<x,y;...> --trechos=<nomes> --saida=<trechos.json>`, `npm run silhueta:desvio -- <peça> --referencia=<contorno.json> --plano=<xy|xz|yz>`.

Passo seguinte, sem estado lido: Com peça nova, parta da forma de referência ou da medida (conversão, modelo de referência, imagem, prancha), combine o alvo pela skill alinhar-modelagem; depois escreva a receita pela skill criar-peca.

Conferido no fim: A análise da bancada aberta e lida, o crítico visual sem contexto e npm run gates.

## modelar/peca/corrigir: Corrigir uma peça do acervo

Corrigir ou refinar uma peça que já está no acervo, ou absorver um ajuste feito na bancada.

Ler antes de começar, num orçamento de 15.000 bytes (linha de base de 62.482 bytes em 2026-10-08):

- `CLAUDE.md`
- `.claude/skills/criar-peca/SKILL.md`
- `docs/modelar/usar/GUIA-AUTORIA-IA.md#4-esteira-canônica-de-validação-local`
- `docs/modelar/usar/LACO-VISUAL.md#3-despachar-o-crítico-sem-contexto`

Lista gerada na hora: pecas.

Abrir só quando a condição aparecer:

- `docs/modelar/usar/GUIA-AUTORIA-IA.md`, quando for preciso ver a anatomia inteira da receita ou a esteira de validação.
- `docs/modelar/usar/LACO-VISUAL.md`, quando for olhar a imagem, sobrepor ao alvo ou medir onde o método diagnóstico para.
- `docs/modelar/usar/AUTORIA-DE-PECA.md`, quando a dúvida for o contrato da receita, a identidade, a seleção ou o que separa peça de montagem.
- `docs/modelar/usar/AUTORIA-RECEITA-DECLARATIVA.md`, quando a receita for escrita como dado JSON, pela autoria por MCP.
- `docs/modelar/usar/INTENCAO-PECA-V1.md`, quando a função da peça não for óbvia pela geometria e pedir o contrato INTENCAO.
- `docs/modelar/usar/GOTCHAS-AUTORIA-VISUAL.md`, quando for gerar forma pela primeira vez ou um defeito visual se repetir.
- `docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md`, quando for montar o pacote do crítico ou parear referência e render.
- `docs/modelar/usar/GOTCHAS-POR-OPERACAO.md`, quando uma operação se comportar diferente do esperado e for preciso o caso medido dela.
- `docs/modelar/usar/FLUXO-DO-OBJETO.md`, quando o objeto tiver várias partes, da imagem à montagem.
- `docs/modelar/usar/RODADA-DE-ALINHAMENTO-EXEMPLO.md`, quando a peça for nova e precisar da rodada de alinhamento antes do PLANO.
- `.claude/skills/criar-peca/references/operacoes-procedurais.md`, quando for escolher uma operação.
- `docs/modelar/usar/METODO-DIAGNOSTICO-E-SEU-LIMITE.md`, quando os achados encolhem e a qualidade não sobe.
- `docs/modelar/usar/CRITICA-VISUAL-CONTRATO-E-CASOS.md`, quando for montar o pedido ao crítico ou ler o formato do achado.
- `docs/modelar/usar/MONTAGENS-SEMANTICAS.md`, quando a peça entra numa montagem.
- `docs/modelar/usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md`, quando for carregar a peça na bancada da sessão.
- `docs/modelar/usar/CONTRATO-AUTORIA-PRANCHA.md`, quando a peça parte de uma prancha.
- `docs/modelar/usar/PARAMETROS-VIVOS.md`, quando for alterar um número da receita.
- `docs/modelar/usar/PARE-E-ANALISE.md`, quando for declarar a forma pronta.
- `docs/modelar/usar/README.md`, quando a tarefa pede o mapa dos contratos de uso que o roteiro não cita.
- `docs/modelar/usar/CACHE-POR-PASSO.md`, quando um comando repetido sobre a mesma peça parece lento ou serve um resultado suspeito, para ligar, limpar ou desligar o cache por passo.
- `docs/modelar/usar/CONFERIR-CONTRA-REFERENCIA.md`, quando há foto de referência e não há prancha, para medir a borda em milímetro.
- `docs/modelar/guias/modelar-carroceria.md`, quando a peça é uma chapa contínua de superfície lisa, com dobras vivas, raio de borda, arcos e vãos, modelada por subdivisão.
- `docs/modelar/guias/modelar-veiculo-em-chassi-e-lataria.md`, quando o objeto é um veículo com chassi por baixo e lataria em painéis separados por vãos.
- `.claude/skills/laco-de-modelagem/processo-leve.md`, quando o objeto for um perfil de uma família existente ou uma família de caixa com frente: o processo leve, sem laço por unidade.
- `docs/modelar/usar/AJUSTE-DA-BANCADA.md`, quando a pessoa salvou um ajuste na bancada que precisa voltar à receita.
- `docs/modelar/usar/MEDIDAS-AVULSAS.md`, quando a medida que falta não está nos comandos do roteiro: reflexo de chapa, distância à pele, material de uma vista ou parte fora do contorno de outra.
- `docs/modelar/usar/EXPORTACAO.md`, quando a forma foi aprovada e a peça sai em STEP, OBJ, glTF ou ficha.

Skill: `criar-peca`.

Comandos: `npm run dossie -- <objeto>`, `node tools/modelar/olhar-bancada.mjs --analise --peca=<nome>`, `npm run parametros`, `npm run conferir:referencia`.

Passo seguinte, sem estado lido: Leia a receita da peça e o veredito ou o ajuste que pede a correção, mude a TABELA ou os passos e prove de novo na bancada.

Conferido no fim: A análise da bancada aberta e lida, o crítico visual sem contexto e npm run gates.

## modelar/opcoes: Mostrar as opções de forma em disputa

Há escolha de forma no alinhamento ou na modelagem: as opções saem lado a lado pelo esboço 2.0 ou pelas variantes da receita.

Ler antes de começar, num orçamento de 12.000 bytes (linha de base de 6.830 bytes em 2026-11-05):

- `CLAUDE.md`
- `.claude/skills/esbocar-opcoes/SKILL.md`

Abrir só quando a condição aparecer:

- `modulos/esboco-nucleo/README.md`, quando a opção pede um campo do esboço 2.0 que a skill não traz.

Skill: `esbocar-opcoes`.

Comandos: `npm run esboco:nucleo -- <arquivo> [--so-montar]`, `npm run variantes -- <peça> [--so-montar]`.

Passo seguinte, sem estado lido: Escreva as opções como variantes da receita ou como esboço do 2.0, confira com --so-montar e mostre a imagem à pessoa com a referência.

Conferido no fim: A pessoa escolhe pela imagem, e a escolha vira decisão escrita no PLANO e valor da TABELA.

## modelar/rodada: Conduzir a rodada de modelagem

A peça já tem alvo combinado, e o trabalho é conduzir modelador e crítico rodada a rodada até a pessoa decidir.

Ler antes de começar, num orçamento de 11.900 bytes (linha de base de 32.617 bytes em 2026-11-26):

- `CLAUDE.md`
- `.claude/skills/laco-de-modelagem/SKILL.md`

Abrir só quando a condição aparecer:

- `.claude/skills/laco-de-modelagem/processo-leve.md`, quando o objeto for um perfil de uma família existente ou uma família de caixa com frente, antes de começar.
- `.claude/skills/laco-de-modelagem/parte-por-parte.md`, quando o objeto tiver mais de uma parte, antes da primeira etapa e antes de fixar, reabrir ou aceitar uma etapa.
- `.claude/skills/laco-de-modelagem/pacote-e-referencia.md`, quando for despachar o modelador ou o crítico de uma peça com imagem de referência, prancha, mapa de partes ou lugar numa montagem.
- `.claude/skills/laco-de-modelagem/refino.md`, quando a entrega passou na medição e começa a rodada de refino.
- `.claude/skills/laco-de-modelagem/registro-a-mao.md`, quando não houver como obter os arquivos dos agentes para o registro.
- `docs/modelar/usar/LACO-VISUAL.md`, quando for olhar a imagem, sobrepor ao alvo ou medir onde o método diagnóstico para.
- `docs/modelar/usar/MEDIDAS-AVULSAS.md`, quando a medida que falta não está nos comandos do roteiro.

Skill: `laco-de-modelagem`.

Comandos: `npm run rodada -- <peça> --acao`, `npm run rodada -- <peça> --registrar --modelador <arquivo> --critico <arquivo>`, `npm run rodada -- <peça> --decisao-da-pessoa "<quem decidiu>, <AAAA-MM-DD>: <as palavras>" --rodada <n>`, `npm run dossie -- <objeto>`.

Passo seguinte, sem estado lido: Rode npm run rodada -- <peça> --acao, que mede a receita atual e diz a próxima ação, e conduza a rodada pela skill laco-de-modelagem.

Conferido no fim: A rodada gravada com o relato do modelador, o veredito do crítico e a decisão da pessoa, e npm run gates.

## modelar/montar: Montar um objeto de várias partes

O objeto tem várias partes, e cada uma entra encaixada nas que já estão prontas, numa montagem por etapas.

Ler antes de começar, num orçamento de 12.800 bytes (linha de base de 29.182 bytes em 2026-11-26):

- `CLAUDE.md`
- `docs/modelar/usar/FLUXO-DO-OBJETO.md#5-montagem`
- `docs/modelar/usar/MONTAGENS-SEMANTICAS.md#construção-parte-por-parte-montagem-v5`
- `docs/modelar/usar/MEDIDAS-AVULSAS.md#montagem`

Abrir só quando a condição aparecer:

- `docs/modelar/usar/MONTAGENS-SEMANTICAS.md`, quando a dúvida for a relação entre as peças, a porta publicada, a classe de ajuste ou o que a montagem não faz.
- `docs/modelar/usar/AUDITORIA-DA-MONTAGEM.md`, quando a montagem declarar apoio no chão ou auditoria de interseções.
- `docs/modelar/usar/FLUXO-DO-OBJETO.md`, quando for preciso ver os seis passos do objeto, do alinhamento ao fechamento.
- `.claude/skills/laco-de-modelagem/parte-por-parte.md`, quando cada parte passar pelo laço de modelagem, antes de fixar, reabrir ou aceitar uma etapa.
- `.claude/skills/auditar-montagem/SKILL.md`, quando as etapas estiverem fixas e a montagem for auditada, pelo roteiro modelar/auditar-montagem.
- `docs/modelar/usar/EXPORTACAO.md`, quando a montagem estiver aceita e sair em glTF ou em ficha do objeto.

Comandos: `npm run etapas -- <montagem.json> --auditar`, `npm run etapas -- <montagem.json> --fixar <instância> --por "<quem, data>"`, `npm run olhar:montagem`, `npm run planejado -- --montagem=<montagem.json>`, `npm run proporcoes -- --proporcoes=<proporcoes.json>`, `npm run esqueleto -- --proporcoes=<proporcoes.json>`, `npm run sobra:partes -- <esboço> --dentro=<contida>:<continente>`, `npm run descrever:montagem:persistida`.

Passo seguinte, sem estado lido: Declare na montagem v5 as etapas, os vínculos e as posições, rode npm run etapas -- <montagem.json> --auditar a cada parte que entra e leve cada etapa à pessoa antes de fixá-la.

Conferido no fim: O registro de etapas com cada etapa fixa pelo aceite da pessoa, a auditoria do roteiro modelar/auditar-montagem e npm run gates.

## modelar/auditar-peca: Auditar uma peça pronta

Obter evidência objetiva de uma peça antes de publicar ou homologar.

Ler antes de começar, num orçamento de 24.000 bytes (linha de base de 24.773 bytes em 2026-10-08):

- `CLAUDE.md`
- `.claude/skills/auditar-peca/SKILL.md`
- `docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md`

Abrir só quando a condição aparecer:

- `docs/modelar/usar/PARE-E-ANALISE.md`, quando a silhueta, um encontro ou um corte mudou.
- `docs/modelar/usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md`, quando for carregar a peça na bancada da sessão.
- `docs/modelar/usar/PARAMETROS-VIVOS.md`, quando o achado leva a alterar um número da receita.
- `docs/modelar/usar/CRITICA-VISUAL-CONTRATO-E-CASOS.md`, quando for ler o formato do achado do crítico.
- `docs/modelar/usar/README.md`, quando a tarefa pede o mapa dos contratos de uso que o roteiro não cita.

Skill: `auditar-peca`.

Comandos: `npm run descrever`, `npm run malha:conferir`, `npm run revisar:modelagem`.

Passo seguinte, sem estado lido: Descreva a peça com npm run descrever e siga a skill auditar-peca.

Conferido no fim: O relato com os defeitos por vista e região e o que não foi conferido, com o motivo.

## modelar/auditar-montagem: Auditar uma montagem

Conferir composição, relações, encaixes e impacto de um conjunto montado.

Ler antes de começar, num orçamento de 27.000 bytes (linha de base de 27.936 bytes em 2026-10-08):

- `CLAUDE.md`
- `.claude/skills/auditar-montagem/SKILL.md`
- `docs/modelar/usar/MONTAGENS-SEMANTICAS.md`

Abrir só quando a condição aparecer:

- `docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md`, quando for julgar as vistas do conjunto.
- `docs/modelar/usar/README.md`, quando a tarefa pede o mapa dos contratos de uso que o roteiro não cita.
- `docs/modelar/usar/AUDITORIA-DA-MONTAGEM.md`, quando a dúvida for o apoio no chão ou a auditoria da montagem construída.

Skill: `auditar-montagem`.

Comandos: `npm run descrever:montagem:persistida`, `npm run olhar:montagem`.

Passo seguinte, sem estado lido: Descreva a árvore com npm run descrever:montagem:persistida e siga a skill auditar-montagem.

Conferido no fim: O relato por relação, impacto de revalidação e vistas.

## modelar/exportar: Exportar a peça ou a montagem

A peça ou a montagem está pronta e sai em STEP, OBJ, glTF ou ficha do objeto.

Ler antes de começar, num orçamento de 5.300 bytes (linha de base de 27.249 bytes em 2026-11-26):

- `CLAUDE.md`
- `docs/modelar/usar/EXPORTACAO.md`

Abrir só quando a condição aparecer:

- `modulos/exportador-obj/README.md`, quando o OBJ recusar triângulo degenerado ou for preciso a tolerância.
- `modulos/exportador-gltf/README.md`, quando for preciso saber o que do material e da bancada o glTF leva.
- `modulos/ficha-do-objeto/README.md`, quando for escrever a ponte do objeto ou ler o pedido que volta da simulação.

Comandos: `npm run exportar:step -- <peça> --somente-validar`, `npm run exportar:step -- <peça>`, `npm run exportar:obj -- --arquivo=<peça>`, `npm run exportar:gltf -- <peça ou objeto montado>`, `npm run exportar:ficha -- <objeto>`.

Passo seguinte, sem estado lido: Valide a malha com npm run exportar:step -- <peça> --somente-validar e rode o comando do formato pedido; o arquivo sai em exportacoes/.

Conferido no fim: O arquivo gravado em exportacoes/ e o comando sem recusa; exportar não muda a receita.
