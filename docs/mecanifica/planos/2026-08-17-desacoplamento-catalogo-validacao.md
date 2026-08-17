# Independência entre núcleo, validação e catálogo

**Estado:** ativo

**Responsável pela execução:** a definir

**Base medida:** `warbookbr/nos-mecanifica` `main` em `2dd9fa1` e consumidor
`warbookbr/mecanica` `main` em `9127321`.

## Objetivo verificável

Permitir que o catálogo homologado esteja vazio, seja substituído ou tenha uma
peça removida sem quebrar o núcleo, seus validadores, os testes fundamentais, a
bancada ou o consumidor. Receitas de teste deixam de morar no catálogo e nenhum
contrato geral pode depender do nome ou da geometria de uma peça de produto.

O recorte entrega os ganhos prometidos: catálogo livremente substituível,
receitas sem virar contratos acidentais, diagnóstico que separa falha do motor
de falha do conteúdo, testes genéricos pequenos, migrações mais seguras e menor
custo de homologação e remoção.

## Hipótese

O motor não depende de peças: suas 32 operações recebem dados e nenhum módulo
de `motor/` importa `pecas/`. O acoplamento está nas portas que descobrem
arquivos, escolhem padrão, reutilizam receitas e publicam duas externamente.

## Evidência inicial

- `pecas/` contém 39 módulos: 32 prefixados por `_` e 7 sem prefixo;
- 34 arquivos em `src/`/`tools/` citam a raiz; 26 testes dependem de receita ou
  peça resolvida nomeada;
- a bancada descobre tudo por glob e fixa `drone-inspecao`; `porteiro`,
  gabarito de seleção e `id-cru` também varrem o diretório;
- há três montagens legadas, uma concreta, e `PUBLICADAS` fixa duas peças que
  `warbookbr/mecanica` copia e importa estaticamente;
- a baseline atual está vermelha: 1.462 testes passam, 2 são ignorados e um
  espera 38 receitas, mas encontra 39. Trocar `38` por `39` é proibido.

## Arquitetura-alvo

```text
motor puro <- serviço validar/executar receita <- entrada explícita
                                               ├─ catálogo homologado
                                               ├─ arquivo confinado da CLI
                                               └─ fixture privada do teste

bancada publicada <- catálogo explícito (pode ser vazio)
harness privado    <- catálogo sintético de teste
```

1. **Núcleo:** aceita dados; não descobre arquivos nem catálogos.
2. **Serviço puro:** valida um módulo recebido, sem nome conhecido ou disco.
3. **Catálogo:** lista só homologadas; vazio é válido e arquivo não é publicação.
4. **Fixtures:** são mínimas; compartilhamento exige integração real.
5. **Bancada:** recebe catálogo; fixtures privadas não entram no build.
6. **Exportação:** recebe lista/carregador; vazio gera manifesto válido.

## Decisões de desenho

- manter `pecas/` exclusivamente para homologadas e criar catálogo explícito
  com `id`, carregador e evidência; a primeira versão terá zero entradas;
- receitas unitárias ficam inline; fixtures de integração ficam sob `tools/`,
  com nomes de capacidade como `placa-com-porta`, nunca nomes de produto;
- extrair a bancada para função injetável e manter entrada fina de produção;
- usar harness HTML privado para câmera, portas, seleção e render; ele não pode
  ser entrada do Vite Pages nem ser importado por `src/`;
- separar gates de shell vazio, contrato de receita, render sintético e
  conteúdo homologado. Um `0/0` não vale como prova geométrica;
- não adicionar pacote, gerador ou registro global de fixtures;
- manter o formato `mecanifica.peca-resolvida` v1 se o manifesto vazio já for
  representável; subir versão somente se o leitor atual não puder aceitá-lo.

## Fatias de implementação

### R00 — baseline verde e matriz de cobertura

1. registrar arquivos acoplados, operações, contratos e gates atuais;
2. substituir a asserção `38` por propriedades reais: IDs únicos, resultado
   estruturado por entrada e catálogo vazio aceito;
3. rodar a suíte até ficar verde antes de qualquer remoção;
4. classificar cada teste ligado a receita como `contrato do motor`,
   `integração`, `peça específica` ou `histórico` e registrar sua substituição.

**Parada:** falha não explicada ou contrato coberto apenas por uma receita que
ninguém conseguiu reduzir impede avançar.

### R01 — serviço puro e firewall arquitetural

1. extrair dos CLIs o serviço que recebe módulo de receita já carregado;
2. fazer descrição, execução, exportação e validação consumirem esse serviço;
3. deixar resolução de caminho apenas nos adaptadores confinados;
4. adicionar guarda que proíba `motor/` importar catálogo, Three.js ou domínio,
   `src/` importar fixtures e testes fundamentais importar `pecas/`.

### R02 — fixtures mínimas e preservação de contratos

1. migrar testes de operações para receitas inline mínimas;
2. mover provas compartilhadas de portas, hierarquia, materiais, esqueleto,
   exportação e montagem para fixtures privadas focadas;
3. substituir peças resolvidas de testes por JSON mínimo ou geração em pasta
   temporária; nenhuma suíte grava `pecas-resolvidas/` real;
4. preservar casos positivos, negativos, determinismo, IDs, topologia, medidas
   e diagnósticos; teste só da aparência da peça removida é removido com ela;
5. provar que todas as 32 chaves atuais de `OPS` continuam expostas e exercidas.

### R03 — catálogo explícito e bancada vazia

1. introduzir contrato de catálogo homologado com lista vazia válida;
2. remover descoberta pública por glob e a peça padrão;
3. mostrar estado vazio informativo em `bancada.html`, sem erro ou fallback;
4. permitir seleção apenas de entrada explícita e falhar alto para ID ausente;
5. criar harness privado com uma fixture composta para os gates visuais;
6. provar build/Pages sem receitas e provar a mesma UI com catálogo injetado.

### R04 — ferramentas e gates independentes

1. fazer `criar`, `descrever`, `gabarito`, `id-cru`, `porteiro` e exportação
   aceitarem entrada/catálogo explícito conforme seu papel;
2. trocar `gabarito-selecao.json` global por canons pequenos de capacidade;
3. separar `bancada:check`, `fixtures:check` e `catalogo:check` no CI;
4. exigir pelo menos uma fixture em cada gate que precisa provar geometria;
5. fazer catálogo vazio passar somente nos gates de catálogo e shell.

### R05 — consumidor externo compatível

1. primeiro alterar `warbookbr/mecanica` para carregar o manifesto sem imports
   estáticos e aceitar zero peças com estado vazio explícito;
2. manter compatibilidade temporária com o manifesto atual e provar build/teste;
3. integrar esse commit antes de retirar artefatos da Mecanifica;
4. depois sincronizar manifesto vazio, remover os dois JSONs e provar que o
   produto não pede `freio-disco` nem `roda-dianteira` por fallback.

### R06 — remoção do acervo não homologado

1. apagar os 39 módulos de `pecas/`, o gabarito `_viga`, a montagem concreta,
   as peças resolvidas e listas de dívida que só descrevem esse acervo;
2. mover apenas montagens genuinamente neutras para fixtures; não arquivar
   receitas executáveis em outra pasta;
3. preservar estudos e histórico como evidência, sem fazê-los fonte operacional;
4. atualizar comandos, skills, README, índice, workflows e mapa gerado;
5. auditar nomes removidos em código vivo e classificar cada resíduo documental.

### R07 — prova de substituição e encerramento

1. executar com catálogo vazio e depois com catálogo temporário de uma peça;
2. adicionar, validar, renderizar e remover essa peça sem editar motor ou testes
   fundamentais; o diff deve tocar apenas catálogo/conteúdo/evidência;
3. repetir todos os gates nos dois estados e comparar API, diagnósticos e canons;
4. registrar commits dos dois repositórios e decisão final.

## Invariantes e política de regressão

- nenhuma operação, assinatura pública, semântica de passo ou formato persistido
  muda por consequência da limpeza;
- as 32 operações, resultados canônicos e recusas existentes permanecem;
- motor continua determinístico, neutro, sem Three.js e sem domínio automotivo;
- bancada continua publicada e funcional em estado vazio;
- não reduzir asserções, pular suítes, atualizar snapshots em massa ou aceitar
  `0/0` para obter verde;
- remoção das peças é mudança intencional de conteúdo, não licença para perder
  capacidade; toda asserção geral migra antes do arquivo desaparecer;
- nenhuma cópia, symlink, fixture escondida em produção ou “peça padrão de
  testes” monolítica substitui o acervo antigo;
- materiais, geometria, câmera e contratos não relacionados ficam inalterados.

## Gates e evidências

Executar os gates completos do `INDEX.md`, mais:

```text
npm test
npm run mcp:check
build da bancada com catálogo vazio
smoke da bancada vazia no navegador
gates visuais contra harness privado
auditoria de imports entre camadas
busca por cada receita e artefato removido em código vivo
build e testes de warbookbr/mecanica antes e depois do manifesto vazio
git diff --check
```

Evidências obrigatórias: matriz antes/depois dos 26 testes acoplados, lista das
32 operações, saída dos dois estados de catálogo, PNGs do harness em duas
vistas, manifesto vazio, auditoria residual e commits coordenados.

## Critério de saída

O plano só pode receber `aprovar` quando catálogo vazio e catálogo temporário
passarem; núcleo/testes fundamentais não importarem receitas homologadas;
bancada e consumidor tiverem estado vazio real; nenhuma receita não homologada
permanecer executável; todos os gates estiverem verdes; e adicionar/remover a
peça temporária não exigir alteração no motor, nos validadores ou nos testes.
Teste vermelho, quebra externa ou fixture no bundle impede `aprovar`.

## Fora do recorte

- criar peças homologadas ou preservar a aparência removida;
- ampliar geometria, materiais, cinemática, solver ou contratos de montagem;
- publicar fixtures ou remover documentação histórica/evidências imutáveis.
