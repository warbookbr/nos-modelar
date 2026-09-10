# Referências visuais e controles persistentes da bancada

**Estado:** pronto para revisão

**Data:** 2026-09-09

## Objetivo

A bancada passará a sustentar uma referência visual alinhável durante a sessão de autoria. A pessoa poderá arrastar um arquivo de imagem para a aba `IA & Ref`, escolher um arquivo pelo seletor ou informar uma URL. A imagem permanecerá associada ao alvo atual até que seja removida explicitamente e poderá ser materializada como um plano texturizado no espaço 3D, atrás da peça na vista lateral escolhida.

A mesma bancada também receberá controles persistentes para grade, chão, recolhimento dos painéis laterais e atalhos. A inspeção poderá desenhar as partes selecionadas em wireframe ou com opacidade reduzida. Essas mudanças pertencem à superfície de observação; elas não alteram receita, materiais autorais, geometria, identidade semântica nem montagem persistida.

## Escopo funcional

### Referência por imagem

A aba `IA & Ref` exibirá uma área de arrastar e soltar, um seletor de arquivo e um campo para URL ou caminho de imagem. O carregamento local aceitará formatos que o navegador consiga decodificar. A URL será carregada somente quando o navegador puder acessá-la; uma falha de rede, CORS ou decodificação aparecerá como diagnóstico no painel e não criará um plano parcialmente válido.

Depois de escolher uma fonte válida, a aba mostrará uma prévia e habilitará o botão `Gerar objeto imagem referência`. Esse botão cria uma única camada de imagem por alvo ativo. A camada será um plano no espaço lateral `YZ`, com material transparente de duas faces e profundidade normal. O plano será colocado do lado oposto à câmera lateral usada na geração, com uma pequena folga em `X`, para que a geometria continue à frente da foto nessa leitura. Em outras vistas a referência é apenas um elemento de contexto e não participa da medição, seleção, caixas, diagnósticos ou enquadramento da peça.

O alinhamento inicial usará a caixa da raiz do modelo: centro em `Y/Z`, altura proporcional à altura da peça e largura derivada da proporção da imagem. O painel oferecerá controles numéricos para deslocamento horizontal (`Z`), vertical (`Y`) e de profundidade (`X`), escala e opacidade. Toda alteração atualiza o plano na cena imediatamente e fica persistida junto com a referência.

O botão `Deletar imagem referência` remove o plano, a prévia e os dados persistidos da referência do alvo. Ele estará desabilitado quando não existir referência local. A remoção não tocará referências declaradas pela sessão nem arquivos de receita.

### Persistência e entrada pela IA

As preferências e a referência que a pessoa envia pelo navegador serão mantidas em armazenamento local do navegador, indexadas pelo identificador semântico do alvo ativo. O conteúdo do arquivo ficará em IndexedDB, pois `localStorage` não é adequado para blobs de imagem; os metadados de alinhamento e as preferências pequenas ficarão no mesmo repositório lógico de estado local. Ao atualizar a página ou receber novo polling da mesma sessão, a referência é recuperada e remontada. Ao trocar de alvo, cada alvo recupera somente a sua própria referência.

A sessão ativa continuará aceitando `referencias.imagens`. O caminho local da IA aproveita a porta já existente: `npm run ativar:bancada -- --arquivo=<receita> --imagem=<caminho>`. Essa ferramenta copia a imagem para a área pública da sessão e publica a URL correspondente. Uma IA também poderá publicar uma URL acessível no item de referência da sessão. A bancada normalizará fontes locais, URLs da sessão e uploads do navegador para o mesmo descritor de imagem antes de renderizar a prévia ou o plano 3D.

O estado local da pessoa não será sobrescrito por polling de `sessao-ativa.json`. A sessão declarada continua mostrando suas imagens na galeria; a imagem de trabalho local continua na camada 3D e só desaparece pela exclusão explícita. A primeira versão não cria API de upload, servidor novo, compartilhamento remoto de blobs ou sincronização da referência local entre computadores.

### Configurações de cena e painéis

Uma barra fina ficará no topo da bancada, acima do cabeçalho atual. No canto superior esquerdo ela terá `Configurações` e `Controles`. `Configurações` abre um menu compacto com as opções `Mostrar grade` e `Mostrar chão`. As duas começam marcadas por padrão e sua escolha fica persistida no navegador. A opção controla a visibilidade-base dos objetos existentes da cena; os modos de auditoria e explosão continuam podendo ocultá-los temporariamente e, quando esses modos terminarem, a preferência persistida volta a mandar.

Cada painel lateral terá, no seu canto externo superior, um botão estreito de recolhimento. Recolher o painel remove seu corpo do espaço de trabalho e preserva uma aba de borda para reabri-lo. Seleções, aba ativa, controles e dados do painel não são reinicializados por esse gesto. O botão não será exibido em capturas de auditoria, que já ocultam a interface.

### Central de controles e atalhos

O rodapé de dicas será removido. `Controles` abrirá um menu compacto ao lado de `Configurações`, listando as vistas canônicas, projeção, enquadramento, seleção, isolamento, wireframe e os outros comandos com tecla existente. Cada linha mostrará o comando e o atalho atual. Ao acionar o atalho, a linha entra em captura de teclado; `Esc` cancela a captura.

Um atalho já usado não pode ser transferido silenciosamente. A captura informa qual comando já ocupa a combinação e pede outra tecla, sem alterar nenhuma associação. Atalhos válidos são persistidos no navegador e substituem os padrões somente depois da captura bem-sucedida. Gestos de ponteiro, como arrastar para orbitar, roda para aproximar e duplo clique para focar, aparecem na lista como documentação e não são remapeáveis por tecla. Campos de texto, seletores e a própria captura não disparam atalhos globais.

### Wireframe e opacidade da seleção

A aba `Inspeção` ganhará, abaixo de `Isolar`, o botão `Wireframe` e abaixo dele um slider `Opacidade`. Ambos se aplicam somente às partes selecionadas e permanecem desabilitados sem seleção. Wireframe alterna a representação de arestas das malhas selecionadas. Opacidade regula a transparência das malhas selecionadas. Ao remover uma parte da seleção, trocar o modelo ou limpar a seleção, a bancada restaura seus materiais e aparência originais.

O controlador visual será a única camada responsável por esses estados. Ele preservará material, transparência, profundidade e auxiliares de wireframe originais antes de aplicar a apresentação temporária. Isso evita que isolamento, contexto fantasma, explosão ou nova seleção acumulem modificações no material autoral.

### Correção do painel `IA & Ref`

O painel atualmente mostra `undefined` porque a ativação da bancada publica itens de checklist e critérios como strings, enquanto o painel consome objetos com os campos `descricao`, `concluido`, `texto` e `status`. A ativação passará a publicar o formato estruturado que o painel já espera. O checklist usará objetos com descrição e estado, e os critérios usarão objetos com texto e estado. A normalização do painel também tolerará itens de texto de sessões anteriores para que uma sessão legada não produza interface quebrada.

## Estrutura e fronteiras

O estado de apresentação será dividido em três módulos: preferências locais da bancada, descritor persistido de imagem de referência e catálogo de comandos/atalhos. Cada módulo terá API sem Three.js para leitura, validação e persistência. A adaptação Three.js receberá somente um descritor já normalizado e será responsável por criar, atualizar e descartar o plano texturizado. O painel converte gestos do usuário em chamadas para esses módulos e não manipula diretamente o grafo da cena.

O sincronizador de sessão continuará sendo a fronteira do conteúdo publicado por IA. Ele não gravará blobs locais, nem a referência local será inserida na receita ou no formato de montagem. O gerenciador de referências 3D deixará de tratar apenas contornos de prancha e passará a gerenciar, separadamente, camadas declaradas pela sessão e a camada de imagem de trabalho local.

## Casos de falha

Um arquivo que não seja imagem, uma URL inválida ou uma imagem que não possa ser decodificada não altera a referência existente. Se o armazenamento local estiver indisponível ou cheio, a bancada mantém a referência apenas enquanto a página estiver aberta e informa que ela não pôde ser persistida. Uma textura descartada libera sua geometria, material e recurso de imagem. A exclusão remove também o blob associado, sem tocar arquivos em `public/` publicados pela ativação.

Se o alvo não possuir geometria carregada, gerar o plano fica indisponível e explica que o alinhamento depende de uma peça ou montagem na cena. Se a imagem for criada em uma vista que não seja lateral, a bancada pedirá a escolha de uma vista lateral antes de gerar, pois o plano de referência é definido no espaço `YZ`.

## Testes e evidências

Os testes unitários cobrirão a normalização da referência, o armazenamento por alvo, a remoção completa, as preferências de grade e chão e a resolução de atalhos sem colisão. O contrato de sessão terá uma prova que percorre a saída real de `ativar-bancada` até o painel e confirma que checklist e critérios não renderizam `undefined`.

Os testes de visualização cobrirão criação, atualização e descarte do plano; aplicação e restauração de wireframe/opacidade; e o fato de grade e chão respeitarem a preferência-base depois de auditoria ou explosão. A revisão manual abrirá a referência em mais de um enquadramento, verificará o alinhamento lateral, recolherá ambos os painéis e conferirá as configurações após recarregar a página. Ao final serão executados `npm test`, `npm run typecheck`, `npm run build`, `npm run porteiro`, `npm run exportar:check` e `npm run gates`.

## Fora de escopo

Esta mudança não adiciona edição de receita, materiais canônicos, medição automática contra fotografia, manipulação livre por arrasto do plano na cena, persistência de imagens em Git, servidor de upload, autenticação, compartilhamento remoto de preferências, revalidação de montagem ou mudança de comportamento do núcleo procedural.
