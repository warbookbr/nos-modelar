# 2026-09-09 — referências visuais e controles da bancada

**Estado:** concluído

**Responsável:** Tiago, com execução assistida.

**Repositório e base:** `warbookbr/nos-mecanifica`, `main`, tarefas de um a
cinco já integradas.

**Desenho:** [DESENHO-bancada-referencias-e-controles.md](DESENHO-bancada-referencias-e-controles.md)

## Problema observado

A bancada só sabia mostrar o modelo procedural. Comparar uma peça com uma foto
exigia script fora do repositório que compunha o render sobre a imagem, e o
resultado morria no diretório temporário de quem rodou. O painel `IA & Ref`
ainda mostrava `undefined` porque a ativação publicava checklist e critérios
como texto enquanto o painel consumia objetos com `descricao`, `concluido`,
`texto` e `status`. Grade, chão e modo de inspeção voltavam ao padrão a cada
recarga, então toda análise recomeçava do zero.

## Resultado

A pessoa carrega uma imagem de referência na aba `IA & Ref`, materializa ela
como plano no espaço lateral `YZ` atrás da peça, ajusta deslocamento, escala e
opacidade, e encontra tudo isso de volta ao recarregar a página. A inspeção
desenha as partes selecionadas em wireframe ou com opacidade reduzida sem
tocar o material autoral. Nada disso entra em receita, geometria, identidade
semântica ou montagem persistida.

## Filtro Agent-First

A porta `npm run ativar:bancada -- <receita> --imagem=<caminho>` já existia e
foi **USADA DIRETO**: ela copia a imagem para a área pública e publica a URL na
sessão. O gerenciador de referências 3D, que só tratava contorno de prancha,
foi **ENVOLVIDO** para gerenciar em separado as camadas declaradas pela sessão
e a camada de imagem de trabalho local. O estado de apresentação foi
**REFATORADO** em três módulos sem Three.js — preferências, descritor de imagem
e catálogo de atalhos — porque estado de apresentação misturado com grafo de
cena não é testável sem navegador. Compartilhamento remoto de referência entre
computadores foi **ADIADO**.

## Incluído

- forma estruturada de checklist e critérios na sessão ativa, tolerando texto
  de sessões antigas;
- preferência de grade e chão persistida por alvo, reconciliada uma vez depois
  de auditoria e explosão;
- blob de imagem por alvo em IndexedDB, com adaptador de memória para teste;
- descritor validado de imagem e alinhamento inicial derivado da caixa da raiz;
- plano texturizado criado e descartado no Three.js, fora de `modeloAtual.raiz`;
- wireframe e opacidade aplicados só à seleção, com restauração do material;
- barra superior com painéis recolhíveis e atalhos remapeáveis;
- prova de que a ponte pública continua reportando só o modelo procedural.

## Excluído

- edição de receita, material canônico ou paleta pela bancada;
- medição automática contra fotografia, que é trabalho do
  `npm run conferir:referencia`;
- arrasto livre do plano na cena, servidor de upload, autenticação e
  sincronização remota de preferências;
- persistência de imagem de trabalho em Git.

## Gate de saída

1. o painel `IA & Ref` não escreve `undefined` em nenhuma sessão, nova ou
   legada;
2. referência, preferências e atalhos sobrevivem à recarga e não vazam de um
   alvo para outro;
3. o plano de imagem é criado e descartado sem deixar geometria, material ou
   textura viva;
4. limpar a seleção devolve o material original de cada parte;
5. atalho ocupado informa qual comando o ocupa e não transfere a tecla;
6. `npm run gates` verde nos vinte portões.

## Fatias

1. **Contrato que gera `undefined`.** `tools/mecanifica/ativar-bancada.mjs`
   passa a escrever `Array<{ descricao, concluido }>` e
   `Array<{ texto, status }>`; `src/bancada/sessao/estado-sessao.js` normaliza
   e tolera o formato antigo. Integrada.
2. **Preferências de cena.** `src/bancada/preferencias/estado-local.js` guarda
   grade e chão por alvo; `criar-ambiente.js` reconcilia a visibilidade uma vez
   só, de modo que auditoria e explosão escondam sem apagar a preferência-base.
   Integrada.
3. **Referência persistida.** `referencias/armazenamento-imagem.js` guarda o
   blob por alvo em IndexedDB e `referencias/imagem-referencia.js` valida o
   descritor e calcula o alinhamento inicial no plano `YZ`. Integrada.
4. **Plano no Three.js.** `referencias/prancha-overlay.js` materializa e
   descarta o plano texturizado, sempre fora da raiz do modelo. Integrada.
5. **Interface de referência e apresentação da seleção.**
   `referencias/painel-referencias.js` recebe arquivo, URL, pose e remoção;
   `controlar-partes.js` aplica wireframe e opacidade só à seleção. Integrada.
6. **Barra superior e atalhos.** Integrada. Criar `src/bancada/controles/atalhos.js` com
   `criarRegistroAtalhos({ padrao, armazenamento })` expondo `obter`,
   `atribuir`, `restaurarPadroes` e `comandoDaCombinacao`. Colisão devolve
   `{ ok: false, motivo: 'ocupado', comandoOcupante }` e não altera nada.
   Captura ignora campo de texto, seletor e elemento editável; `Esc` cancela.
   A barra fina no topo abre `Configurações`, com grade e chão, e `Controles`,
   com a lista de comandos e os gestos de ponteiro como linhas de leitura. Cada
   painel lateral ganha botão estreito de recolhimento no canto externo, com
   aba de borda para reabrir, e o botão não aparece em captura de auditoria.
7. **Fronteira entre referência visual e modelo procedural.** Integrada. Provar por teste
   que `peca()`, `partes`, `estatisticas` e `diagnosticos` continuam relatando
   só o modelo procedural, que o plano de referência nunca entra em seleção,
   caixa, enquadramento ou medição sem cabeça, e regenerar `docs/MAPA.md`
   por `npm run mapa`.

## Riscos e parada

O risco que obriga parar é a referência visual entrar em qualquer medida. Se o
plano texturizado aparecer na caixa da raiz, no enquadramento, na estatística
ou na medição sem cabeça, a bancada passa a medir a foto em vez da peça, e
todo número que sair dela vira ficção. A fatia sete existe para provar que isso
não acontece, e uma falha ali cancela a linha em vez de ser contornada.

O segundo risco é o armazenamento local indisponível ou cheio. Nesse caso a
referência vale enquanto a página estiver aberta e a bancada diz que não
conseguiu persistir; ela não pode fingir que guardou.

## Fechamento

Concluído em 2026-09-10 com os vinte gates verdes. As sete fatias estão em
`main`.

O que a fatia seis entregou difere do desenho em um ponto que vale registrar. O
desenho previa a barra fina apenas com `Configurações` e `Controles`; a
implementação manteve isso e tirou o rodapé de dicas, movendo os gestos de
ponteiro para dentro de `Controles` como linhas de leitura. A faixa que o rodapé
ocupava voltou para a cena, e dica que não faz nada deixou de disputar espaço
com controle que faz.

Depois do fechamento, os dois botões da barra deixaram de abrir menu suspenso e
passaram a abrir janela modal com título e X, reaproveitando o modal que já
existia para a imagem de referência. Menu suspenso fechava a qualquer clique, o
que atrapalhava marcar duas caixas seguidas ou escolher uma tecla; a janela só
fecha pelo X, pelo fundo ou por Esc.

Dois defeitos apareceram e foram corrigidos durante a integração. O menu nascia
aberto e cobria o painel de componentes, porque `display: grid` vence o
`[hidden]` do navegador e faltava dizer por escrito que escondido é escondido. E
a captura de tecla precisava desligar o atalho global enquanto está aberta,
senão escolher a tecla dispara o comando que já estava nela — é o registro que
resolve isso, por `deveIgnorar`, e há teste para o caso.

A inspeção manual foi feita no navegador com o `bicicleta-quadro` ativo e a
imagem de referência vinculada: o menu de controles lista os treze comandos com
a tecla de cada um, o recolhimento do painel de componentes devolve a cena
inteira e deixa a aba de borda, e desmarcar `Mostrar grade` apaga a grade sem
tocar no chão.
