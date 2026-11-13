# Decisões em vigor, lote 1

Nota sobre as datas: os planos deste lote não registram o dia do fechamento; a data após "em" é a do nome do arquivo (início do plano) e serve só de referência. "Tem linha" significa que o plano aparece na crônica de `planos/encerrados/README.md`, em linha própria ou na lista corrida de planos de agosto.

## 2026-08-04-mcp-para-agentes.md
Estado: concluído, em 2026-08-04. Crônica: não tem linha.
- [B] O servidor MCP é adaptador fino sobre serviços do núcleo, com CLI e MCP como consumidores de contratos e sem regra de negócio própria. Porquê: evita duas implementações divergentes da mesma regra. Lugar: `docs/modelar/CONTINUIDADE-ARQUITETURAL.md` (seção sobre portas consumidoras) e `docs/modelar/planos/mcp/INDEX.md`.
- [C] Teto de 6 ferramentas por perfil, perfis `revisao`/`autoria`/`materiais`/`coordenacao` e linha-base de bytes do piloto. Porquê: era limite do piloto da Fatia 1A; os perfis atuais em `tools/mcp/perfis/` já passaram dele e o catálogo exato é conferido por `tools/mcp/mcp.test.mjs`.

## 2026-08-05-mcp-autoria-controlada.md
Estado: concluído (decisão `interromper`), em 2026-08-05. Crônica: tem linha.
- [B] Publicar um diretório de pacote com transição única e sem sobrescrita não é garantido pela API portátil de `fs` do Node; a autoria controlada foi interrompida e só retoma com primitivo `no-replace` ou protocolo de commit revisado. Porquê: `mkdir` exclusivo seguido de dois `rename` deixa janela observável. Lugar: `docs/modelar/ESCRITA-TRANSACIONAL-MONTAGEM.md` (o experimento do PR #25 e a solução por revisões imutáveis) e `docs/modelar/FLUXO-MODELAGEM-IA.md`.

## 2026-08-05-mcp-avaliacao-consolidada.md
Estado: concluído (decisão `corrigir`), em 2026-08-05. Crônica: tem linha.
- [C] Avaliação caixa-preta do MCP de leitura que achou o atrito AVAL-01 (validar e comparar não se descobrem sozinhos). Porquê: a correção entrou como recurso `mecanifica://pacotes` (plano seguinte) e o protocolo da rodada era só daquela avaliação.

## 2026-08-05-mcp-correcao-descoberta.md
Estado: concluído (decisão `aprovar`), em 2026-08-05. Crônica: tem linha.
- [C] Recurso aditivo `mecanifica://pacotes` com contrato `mecanifica.catalogo-pacotes` v1, sem nova ferramenta e sem bump do contrato global. Porquê: está em `tools/mcp/contratos.mjs` e `servidor.mjs` e conferido por `tools/mcp/mcp.test.mjs`.

## 2026-08-05-mcp-fatia-1b-visual.md
Estado: concluído, em 2026-08-05. Crônica: tem linha.
- [C] A ferramenta `renderizar_vistas` devolve as quatro vistas oficiais em memória, com limites de payload e tempo e recusa (sem reduzir silenciosamente) ao ultrapassar. Porquê: entregue em código e teste; nenhuma regra além do que o código e `tools/mcp/mcp.test.mjs` já impõem.

## 2026-08-06-diagnostico-motor-procedural.md
Estado: concluído, em 2026-08-06. Crônica: tem linha.
- [B] O motor resolve uma peça em coordenadas locais; montagem instancia, transforma e mantém relações; a bancada só observa; carro e motor são montagens e o núcleo não ganha caso especial de domínio. Porquê: o diagnóstico concluiu "motor adequado" para a montagem v1. Lugar: `docs/modelar/CONTINUIDADE-ARQUITETURAL.md`, `docs/modelar/MONTAGEM-PERSISTIDA-V1.md` e a primeira regra de `CLAUDE.md`.

## 2026-08-07-montagem-minima-persistida-v1.md
Estado: concluído, em 2026-08-07. Crônica: tem linha.
- [B] Montagem referencia peças por identidade semântica, com pose por instância, sem copiar `PASSOS` nem geometria, e a resolução falha fechado em ciclo, duplicidade, referência ausente ou pose inválida. Porquê: manter a peça como única fonte da geometria. Lugar: `docs/modelar/MONTAGEM-PERSISTIDA-V1.md`, `src/autoria/ler-montagem-persistida.js`.

## 2026-08-09-montagem-persistida-v2-relacoes-locais.md
Estado: concluído, em 2026-08-09. Crônica: tem linha.
- [B] A v1 é fechada e não muda em silêncio; a v2 acrescenta `relacoes` por caminho semântico, e relação não satisfeita é resultado (`satisfeita:false`), não erro estrutural. Porquê: separa autoria inválida de mecânica reprovada. Lugar: `docs/modelar/MONTAGEM-PERSISTIDA-V2.md`.

## 2026-08-14-autoria-segura-receitas.md
Estado: concluído (decisão `aprovar`), em 2026-08-14. Crônica: tem linha.
- [B] A receita de autoria por IA é JSON declarativo; o agente nunca envia código executável ou caminho local, e a revisão velha, o candidato inválido ou a captura incompleta nunca ativam. Porquê: segurança da porta de escrita. Lugar: `docs/modelar/usar/AUTORIA-RECEITA-DECLARATIVA.md` (Contrato, Ciclo seguro e Limites).

## 2026-08-14-contexto-de-montagem-para-ia.md
Estado: concluído (decisão aprovar), em 2026-08-14. Crônica: tem linha.
- [B] O contexto de montagem para IA não transporta malha nem identidade de runtime, e a cobertura declara `colisaoGlobalVerificada:false`: caixa não é colisão nem folga. Porquê: impedir que satisfação local seja lida como validade global. Lugar: `docs/modelar/CONTEXTO-MONTAGEM-IA.md` e `src/autoria/descrever-montagem-resolvida.js`.

## 2026-08-14-contexto-visual-e-autoria-segura.md
Estado: concluído, em 2026-08-14. Crônica: não tem linha.
- [B] Vista visual é evidência e nunca prova colisão, folga ou validade global; impacto e catálogo declaram fronteiras e não inventam dependência por proximidade; o writer só publica com todas as precondições e deixa o estado anterior intacto no erro. Porquê: honestidade da cobertura. Lugar: `docs/modelar/CONTEXTO-VISUAL-REVALIDACAO.md` e `docs/modelar/ESCRITA-TRANSACIONAL-MONTAGEM.md`.

## 2026-08-14-continuidade-autoria-ativa.md
Estado: concluído (decisão aprovar), em 2026-08-14. Crônica: tem linha.
- [B] A revisão ativa autorizada sobrepõe só a fonte estática do mesmo ID; ausência usa o estático, revisão ativa inválida falha fechada e nunca cai em fallback; leitura e autoria usam os mesmos carregadores. Porquê: evitar estado divergente e correção sobre base obsoleta. Lugar: `docs/modelar/usar/AUTORIA-RECEITA-DECLARATIVA.md` (seção Perfil MCP) e `docs/modelar/ESCRITA-TRANSACIONAL-MONTAGEM.md`.

## 2026-08-14-experimento-autoria-geometrica.md
Estado: concluído (decisão corrigir), em 2026-08-14. Crônica: tem linha.
- [B] Alterar uma peça pela montagem não simula correção geométrica; a autoria da peça precisa de receita declarativa própria. Porquê: o experimento viu que a montagem só recusava a relação direcional. Lugar: `docs/modelar/usar/AUTORIA-RECEITA-DECLARATIVA.md` (a receita declarativa é a porta de autoria de peça, que o plano seguinte entregou).

## 2026-08-14-mapa-canonico-dependencias.md
Estado: concluído (decisão aprovar), em 2026-08-14. Crônica: tem linha.
- [B] "Global" significa completo dentro de um universo explícito declarado pelo host, nunca varredura de disco; o mapa é derivado da autoria e nunca editado à mão; mudança concorrente recusa snapshot misto. Porquê: cobertura honesta. Lugar: `docs/modelar/MAPA-CANONICO-DEPENDENCIAS.md` (Universo de autoria v1).

## 2026-08-14-materializacao-autoria-segura.md
Estado: concluído (decisão aprovar), em 2026-08-14. Crônica: tem linha.
- [B] Publicação por snapshots imutáveis e transição por hard link exclusivo (um vencedor por pai, base velha recusada, nenhum leitor vê parcial); se o filesystem não garantir link atômico, para e não reduz a garantia em silêncio. Porquê: sem primitivo `no-replace` para diretório. Lugar: `docs/modelar/ESCRITA-TRANSACIONAL-MONTAGEM.md`.

## 2026-08-14-mcp-montagens-leitura.md
Estado: concluído, em 2026-08-14. Crônica: tem linha.
- [B] O cliente MCP usa só IDs semânticos e nunca envia nem recebe caminho; o catálogo contém só raízes declaradas pelo host, sem varredura implícita; a ausência de escrita é limite temporal e não proibição. Porquê: confinamento da porta. Lugar: `docs/modelar/CONTEXTO-VISUAL-REVALIDACAO.md`, `tools/mcp/catalogo-montagens.mjs` e `tools/mcp/mcp.test.mjs`.

## 2026-08-14-revalidacao-cascata-persistida.md
Estado: concluído (decisão aprovar), em 2026-08-14. Crônica: tem linha.
- [B] A campanha de revalidação é derivada da causa e do snapshot completo; a aprovação vale só para a revisão exata observada, revisão diferente só conclui em `obsoleto`, e a campanha não corrige nem promove dependentes. Porquê: impedir aprovação herdada em silêncio. Lugar: `docs/modelar/CONTEXTO-VISUAL-REVALIDACAO.md` e `src/autoria/protocolo-revalidacao.js`.

## 2026-08-14-separacao-direcional-e-impacto-local.md
Estado: concluído, em 2026-08-14. Crônica: não tem linha.
- [B] A separação direcional medida por projeção não é colisão nem folga euclidiana, e o impacto local separa direto, indireto e limitação global sem inferir dependência por proximidade. Porquê: não alegar colisão geral. Lugar: `docs/modelar/CONTEXTO-MONTAGEM-IA.md` e `docs/modelar/MONTAGEM-PERSISTIDA-V3.md`.

## 2026-08-17-abertura-oblonga.md
Estado: concluído (decisão aprovar), em 2026-08-17. Crônica: tem linha.
- [B] O rasgo é o `furo` com `ate` (estádio com os mesmos `lados` do círculo), e não uma operação `rasgo` nova; a alternativa recusada duplicaria margem, partição, projeção de saída e ids. Porquê: manter um só vocabulário de endereço. Lugar: `procedural/nucleo/operacoes/estruturais.js` (comentário do bloco RASGO) e `procedural/nucleo/uso-operacoes.js`.

## 2026-08-17-alteracao-compacta.md
Estado: concluído (decisão aprovar), em 2026-08-17. Crônica: não tem linha.
- [B] A alteração de montagem endereça por identidade semântica, nunca por posição de array ou JSON Patch; o que não foi declarado permanece idêntico; alteração sem efeito e duas alterações no mesmo endereço são recusadas. Porquê: identidade nunca é posição. Lugar: `tools/mcp/guias/processo/evidencia-e-iteracao.md` e a recusa testada em `tools/mcp/mcp.test.mjs`.

## 2026-08-17-correcoes-fluxo-dobradica.md
Estado: concluído (decisão aprovar), em 2026-08-17. Crônica: tem linha.
- [C] Corrigiu os atritos do estudo da dobradiça (contrato de `encostar`, pose de criação, cópias nomeadas, enquadramento por envelope); união topológica, cinemática e materiais genéricos ficaram para decisão própria. Porquê: entregue em código e skill; o que ficou de fora está no backlog.

## 2026-08-17-desacoplamento-catalogo-validacao.md
Estado: concluído, em 2026-08-17. Crônica: tem linha.
- [B] O catálogo homologado pode estar vazio ou ser trocado sem quebrar núcleo, validadores, bancada e consumidor; núcleo e serviço puro não importam peças nem conhecem disco; fixtures usam nome de capacidade e nunca de produto. Porquê: o acervo não pode virar contrato acidental. Lugar: gate `tools/arquitetura/independencia-catalogo.mjs`, `docs/modelar/MATRIZ-TESTES-ACOPLADOS.md` e `.claude/skills/auditar-peca/SKILL.md`.

## 2026-08-17-encostar.md
Estado: concluído (decisão aprovar), em 2026-08-17. Crônica: não tem linha.
- [B] `encostar` deriva o contato por extensão na direção declarada, nunca infere qual face toca qual (sem `toca`, `oposta`, `maisProxima`), e não é colisão nem solver. Porquê: inferir par de faces exigiria desempate e quebraria o determinismo. Lugar: `procedural/nucleo/operacoes/transformacoes.js` (comentário da operação) e `.claude/skills/criar-peca/references/operacoes-procedurais.md`.
- [B] O gate de id posicional conta toda chave de seleção (`referencia` como `sel`). Porquê: evita reabrir a cegueira do gate por porta nova. Lugar: o próprio gate de id cru, com prova no teste.

## 2026-08-17-estudo-conjunto-dobradica.md
Estado: concluído (decisão corrigir), em 2026-08-17. Crônica: tem linha.
- [C] Estudo de campo que registrou nove atritos com causa e ação; as correções saíram no plano `2026-08-17-correcoes-fluxo-dobradica.md`. Porquê: sem decisão a guardar além do que a linha da crônica diz.

## 2026-08-17-historico-de-revisao.md
Estado: concluído (decisão aprovar), em 2026-08-17. Crônica: tem linha.
- [B] Restaurar uma revisão antiga publica uma revisão nova com aquele conteúdo, por plano que segue os gates, e nunca move o estado ativo nem reescreve a história; a diferença sai na língua da alteração, e mudança estrutural sai separada. Porquê: o agente não pode crer que toda diferença se desfaz trocando um campo. Lugar: `tools/mcp/perfis/autoria-montagens.mjs` (comentário de `planejarRestauracao`, com teste em `tools/mcp/mcp.test.mjs`).
- [C] Retirada do Caso 3 da homologação do fluxo. Porquê: evidência mais forte veio dos experimentos posteriores; a decisão está em `docs/modelar/HOMOLOGACAO-FLUXO-IA.md`.

## 2026-08-17-lathe-fechado.md
Estado: concluído (decisão aprovar), em 2026-08-17. Crônica: não tem linha.
- [B] O `lathe` fecha o laço só quando o último ponto é coincidente exato com o primeiro, nunca por limiar; a prova é topológica (toda aresta com duas faces). Porquê: um limiar mudaria a topologia em silêncio. Lugar: `procedural/nucleo/operacoes/geradores-avancados.js` (comentário "A comparação é EXATA de propósito").
- [B] O encaixe oco (A-16) foi retirado porque o assento intencional se declara na montagem por `assentaAnular` e `encaixaCilindrico`, sem segundo vocabulário dentro da peça; materiais genéricos continuam travados. Porquê: evitar duplicação de conceito. Lugar: `docs/modelar/ATRITOS-AUTORIA.md` (linha A-16), `docs/modelar/usar/MONTAGENS-SEMANTICAS.md` e `CLAUDE.md` (regra de material).

## 2026-08-17-migracao-fps-para-procedural.md
Estado: concluído (decisão aprovar), em 2026-08-17. Crônica: tem linha.
- [B] A árvore canônica é `procedural/`; mover e nunca copiar, sem symlink nem alias permanente, sem regravar hash para passar, e evidência imutável não é reescrita. Porquê: uma só fonte de receitas e o gabarito byte-idêntico. Lugar: `tools/modelar/caminho-procedural.test.ts` (guarda de caminho) e `docs/modelar/ARQUITETURA.md`; o que sobra é história da migração.

## 2026-08-17-nome-de-copia.md
Estado: concluído (decisão aprovar), em 2026-08-17. Crônica: não tem linha.
- [B] `nomes` do `arranja` é lista exata (uma entrada por cópia, sem repetição), `copia` e `nome` não convivem na mesma origem, e mexer no `total` sem revisar os nomes grita. Porquê: endereço de autor só vale se todas as cópias têm nome. Lugar: `procedural/nucleo/operacoes/estruturais.js` (validação `nomes`, com os gritos) e `.claude/skills/criar-peca/references/operacoes-procedurais.md`.

## 2026-08-17-ponto-nomeado.md
Estado: concluído (decisão aprovar), em 2026-08-17. Crônica: não tem linha.
- [B] Um nome guarda o ponto inteiro em qualquer campo que aceita ponto (corrigido na rede central `vec`); seletores relacionais (`toca`, `oposta`, `normal`, `maisProxima`) foram retirados e só reabrem com evidência nova; `alinhar` é candidato sem plano; peça de exemplo não vira pendência da oficina. Porquê: sem caso de campo que exija o que não se declara por direção. Lugar: `docs/modelar/planos/BACKLOG.md` (tabela de candidatos recusados, `alinhar` recusado), `docs/modelar/ATRITOS-AUTORIA.md` (A-7, A-8, A-29, A-32) e `README.md` ("Peças são exemplos").

## 2026-08-17-pose-de-criacao.md
Estado: concluído (decisão aprovar), em 2026-08-17. Crônica: não tem linha.
- [B] `em` e `eixo` são lidos no despacho do laço de `PASSOS` (uma só transformação para todo gerador), a ordem é gira-depois-move com giro na origem, `eixo` só vale em gerado por revolução e continua sendo o eixo de giro em `rotaciona` e `arranja`. Porquê: oito geradores teriam oito chances de divergir de sinal. Lugar: `.claude/skills/criar-peca/references/operacoes-procedurais.md` (seção da pose) e o contrato no núcleo.

## 2026-08-18-auditoria-intersecoes-montagem.md
Estado: concluído (decisão aprovar), em 2026-08-18. Crônica: tem linha.
- [B] Caixa alinhada aos eixos nunca é veredito de colisão; malha aberta ou ambígua fica `inconclusivo` e não "sem colisão"; interseção esperada é anotação explícita com motivo (montagem v4) e nunca suprime o achado; timeout não vira "sem colisão". Porquê: honestidade da cobertura da auditoria. Lugar: `docs/modelar/MONTAGEM-PERSISTIDA-V4.md` e `src/autoria/` (auditoria de interseções, com testes).

## 2026-08-18-chassi-realista-kernel-geometrico.md
Estado: cancelado, em 2026-11-05 (encerramento escrito no plano). Crônica: tem linha.
- [B] A pele exterior de carroceria é malha de controle de quads com vincos avaliada por subdivisão Catmull-Clark no núcleo, sem dependência externa, com a malha compilada sem identidade persistida (persistem a cage e o nome semântico). Porquê: foi o que o plano decidiu e o núcleo depois construiu. Lugar: `docs/modelar/UPSTREAM-NOS.md` (subdivisão entregue), `docs/modelar/modelar-carroceria.md` e `procedural/nucleo/` (subdivisão e gaiolas).
- [B] OCCT/B-rep não serve à autoria sem camada que leve id, origem e nome de cada face pelo histórico (índice de face não é identidade), e Blender headless não é backend porque quebra determinismo. Porquê: o conteúdo salvo precisa ser determinístico e reexecutável. Lugar: `docs/modelar/PESQUISA-ABERTA-2026-10.md` (item OpenCASCADE), `docs/modelar/DOSSIE-EXPORTACAO-CAD-STEP.md` e `docs/modelar/blender/README.md`.
- [A] A pele exterior não nasce de `loft` nem de envelope varrido (não abre para-brisa, vidro nem vão de porta sem booleana, acopla capô, para-lama e túnel, converge para tubo), SDF/implícito não serve a painel fino, vinco e vão, e um kernel B-rep próprio tem risco desproporcional; `loft` segue válido em peça genuinamente varrida. Porquê: guarda quem for propor outra representação de pele ou de carroceria. Procurei: "loft", "SDF", "implícit", "kernel", "pele", "envelope varrido", "Catmull" em `docs/modelar/*.md`, `docs/modelar/usar/`, `.claude/`, `procedural/nucleo/`, `tools/`; só achei `alinhar-modelagem/SKILL.md` linha 138 (loft de carroceria precisa declarar `lataria`) e `ANALISES-DE-2026-10.md` propondo SDF para outros usos, nada que diga por que a pele não é loft nem SDF. Rascunho do registro: A pele exterior de carroceria é autorada por subdivisão de malha de quads com vincos, e não por `loft`, envelope varrido, campo implícito (SDF) nem kernel B-rep próprio. O `loft` não abre para-brisa, vidro nem vão de porta sem booleana e acopla capô, para-lama e túnel; o SDF é ruim em painel fino, vinco e vão; um kernel próprio custa risco desproporcional. O `loft` continua válido para peças genuinamente varridas, e a decisão reabre se aparecer forma orgânica sem requisito de painel ou requisito real de fabricação. (Confiança média: o dossiê em `docs/modelar/historico/` carrega o mesmo motivo e sai junto; cabe à pessoa decidir se isto vale um registro ou se a subdivisão entregue basta.)

## 2026-08-18-ensaio-ponta-a-ponta-dobradica.md
Estado: concluído (decisão aprovar), em 2026-08-18. Crônica: tem linha.
- [B] Ganho real se julga em praticidade, assertividade e elevação do teto, medidos no ciclo descobrir, planejar, criar, inspecionar, diagnosticar, corrigir e revalidar; abstração, documentação ou ferramenta a mais não contam como ganho por si. Porquê: evitar medir progresso por superfície de contrato. Lugar: `docs/modelar/planos/2026-11-12-revisao-do-projeto-para-o-trabalho-da-ia.md` (critério da pessoa) e `docs/modelar/AGENT-FIRST.md`.

## 2026-08-18-plataforma-procedural-extensivel.md
Estado: concluído (decisão aprovar), em 2026-08-18. Crônica: tem linha.
- [B] O motor tem registro explícito de módulos e operações (sem autorregistro por `import` nem mutação global), receitas continuam dados sem JavaScript, extensão nativa é código versionado do repositório com contexto limitado, e código movido sai da origem na mesma mudança (sem cópia `legacy` nem segundo executor). Porquê: descobrir e estender o motor sem ler um monólito e sem duas fontes. Lugar: `docs/modelar/EXTENSOES-NATIVAS-V1.md`, `docs/modelar/SERVICOS-PROCEDURAL-V1.md`, `docs/modelar/COMPOSICAO-PROCEDURAL-V1.md`, `procedural/nucleo/registro.js` e o gate `tools/arquitetura/independencia-catalogo.mjs`.
- [B] Lacuna de capacidade é registrada e persistível (`mecanifica.lacuna-capacidade`), classificada sem promoção automática, e remover extensão gera diagnóstico e nunca sucesso parcial. Porquê: não esconder o que falta. Lugar: `docs/modelar/LACUNAS-DE-CAPACIDADE-V1.md`.

## 2026-08-18-sonda-armadura-humanoide-1-0.md
Estado: concluído (decisão aprovar), em 2026-08-18. Crônica: tem linha.
- [B] Imagem não comprova ergonomia, proteção, fabricação nem movimento; pose neutra e articulada são estados estáticos derivados, e amostra de movimento é declarada como amostra, nunca contínua; esquerda e direita são dado explícito quando afetam identidade; o núcleo não conhece anatomia nem personagem. Porquê: evitar prova falsa de movimento. Lugar: `.claude/skills/auditar-montagem/SKILL.md`, `docs/modelar/CONTRATO-DA-FAMILIA.md` (quiralidade) e `CLAUDE.md` (o núcleo não conhece domínio de objeto).
- [C] Fixture privada de 22 peças-folha e 16 vistas, com relatório em `historico/`. Porquê: entregou prova de escala, sem regra além do que as skills e contratos já têm.

## 2026-08-18-sonda-supercarro-1-0.md
Estado: concluído (decisão aprovar), em 2026-08-18. Crônica: tem linha.
- [B] Não esconder limitação para completar a silhueta: registrar a lacuna, implementar o menor contrato genérico com ganho comprovado ou declarar a aproximação; nenhuma melhoria especializa núcleo ou ferramenta para o carro. Porquê: a peça não justifica lógica de domínio no núcleo. Lugar: `CLAUDE.md` (regra "a correção que um objeto revela vai para a ferramenta geral") e `docs/modelar/LACUNAS-DE-CAPACIDADE-V1.md`.
- [C] Fixture do supercarro (12 definições, 27 peças-folha, 351/351 pares) e melhorias neutras de vista e auditoria já entregues em código. Porquê: sem decisão além da linha da crônica.

## 2026-08-19-chassi-p2-prova-do-quarto.md
Estado: cancelado, em 2026-11-05 (encerramento escrito no plano). Crônica: tem linha.
- [B] Prova reprovada não fecha o plano, as condições de rejeição visual rodam antes de apresentar à pessoa, e o aceite da forma é dela e nenhuma medida o substitui. Porquê: a prova do quarto dianteiro foi reprovada no aceite apesar de medidas verdes. Lugar: `CLAUDE.md` (regra "nenhuma métrica aprova forma sozinha, e quem aprova forma é a pessoa") e `.claude/skills/laco-de-modelagem/SKILL.md`.
- [C] Prova descartável da subdivisão, apagada em 2026-09-22; a subdivisão entrou no núcleo pelo plano da carroceria por subdivisão. Porquê: cancelado sem lição além da que a linha da crônica já traz.

## 2026-08-19-coerencia-entre-vistas.md
Estado: concluído, em 2026-08-19. Crônica: tem linha.
- [B] A coerência entre vistas é derivada do traçado (faixa por eixo compartilhado, envelope e simetria), nunca declarada à mão, e cada vista declara a leitura `projecao` ou `secao`; silenciar uma checagem exige comentário do porquê. Porquê: o defeito do pneu era teste silenciado, não falta de coerência. Lugar: `.claude/skills/desenhar-prancha/SKILL.md` (leitura de cada vista) e `docs/modelar/usar/CONTRATO-AUTORIA-PRANCHA.md`.

## 2026-08-19-leitura-de-referencia-medida.md
Estado: concluído, em 2026-08-19. Crônica: tem linha.
- [B] A imagem de terceiro não entra no repositório, só as coordenadas derivadas; a medida contra raster serve a proporção e posição e não a caráter de curvatura (inversões de curvatura vão de 31 a 51 sem convergir ao suavizar), e onde medida e olho divergem a medida ganha. Porquê: limite medido do raster. Lugar: `CLAUDE.md` (regra de imagem de referência) e `tools/modelar/prancha/prancha-referencia.mjs` (comentário "LIMITE MEDIDO, não suposto").

## 2026-08-19-motor-de-prancha-medida.md
Estado: concluído, em 2026-08-19. Crônica: tem linha.
- [B] A prancha traça polilinha com filete (raio por vértice) e reserva `suave` para spline genuína; a métrica que separa rampa de cúpula é a concentração do giro e não a retidão; toda métrica emitida é derivada da saída. Porquê: a spline por três pontos também é quase reta e arredonda tudo. Lugar: `.claude/skills/desenhar-prancha/SKILL.md` (seção "Traçar com filete, não com spline" e tabela de métricas).

## 2026-08-20-aceite-visual-e-prova-de-superficie.md
Estado: concluído (decisão redesenhar), em 2026-08-20. Crônica: tem linha.
- [B] O aceite visual exige pacote completo e reproduzível (alvo, sobreposição, vistas isoladas, uma condição de rejeição por resultado, crítico independente), o veredito é derivado e nunca fornecido pelo autor, silêncio do crítico não aprova, imagem composta não substitui vista isolada, seção mede a cage e nunca a gera, e cage crua não se passa por superfície final. Porquê: o P2 foi encerrado por evidência estrutural sem prova visual. Lugar: `docs/modelar/CONTRATO-ACEITE-VISUAL.md`, `tools/modelagem/aceite-visual.mjs` e `.claude/skills/laco-de-modelagem/SKILL.md`.
- [C] O sucessor da prova (redesenho da cage R2b) segue no plano `2026-08-23-redesenho-cage-r2b-controle-vertical.md`. Porquê: a decisão `redesenhar` se resolve lá.

## 2026-08-20-auditoria-praticas-autoria-3d.md
Estado: concluído (decisão corrigir), em 2026-08-20. Crônica: tem linha.
- [B] O ciclo de autoria de superfície não fecha por métricas estruturais sem evidência visual vinculante; a base semântica, determinística e de composição é mantida. Porquê: foi a causa das reprovações da carroceria. Lugar: `docs/modelar/CONTRATO-ACEITE-VISUAL.md` e `CLAUDE.md` ("nenhuma métrica aprova forma sozinha").
- [C] A régua de nove práticas públicas (decompor, separar planejador, autor e crítico, variantes, inspeção visual, etc.) como perguntas e não como autoridade. Porquê: as práticas viraram as skills `alinhar-modelagem`, `laco-de-modelagem` e `esbocar-opcoes`, e o relatório está em `historico/`.

## 2026-08-20-motor-de-prancha-autonomia.md
Estado: concluído (R0 a R3 aprovadas, R4 parcial, R5 não rodou), em 2026-11-05 (encerramento escrito no plano; a congelação original é de 2026-08-20). Crônica: tem linha.
- [B] Métrica do caminho crítico declara o defeito que mata e, se não separa variante ruim de boa, não é gate; referência insuficiente registra insuficiência e não é preenchida com imaginação; ganho que não sobrevive à comparação controlada é revertido e não promovido por esforço gasto; imagem generativa não vira especificação sem contrato vetorial. Porquê: evitar falsa segurança por métrica sem poder de discriminar. Lugar: `.claude/skills/desenhar-prancha/SKILL.md`, `docs/modelar/usar/CONTRATO-AUTORIA-PRANCHA.md` (contrato `mecanifica.prancha-autoria@1`) e `docs/modelar/usar/METODO-DIAGNOSTICO-E-SEU-LIMITE.md`.
- [C] O impacto da prancha sobre uma modelagem 3D comparável não foi demonstrado. Porquê: já dito na linha da crônica; o item voltou ao backlog.

## 2026-08-20-validacao-integrada-modelar.md
Estado: cancelado, em 2026-11-05 (encerramento escrito no plano). Crônica: tem linha.
- [C] Ensaio comparativo da trava articulada que não começou; o fluxo que ele compararia mudou. Porquê: cancelado sem lição; um ensaio novo pede protocolo próprio.

## 2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md
Estado: cancelado, em 2026-08-23 (substituído pelo modelador inverso com priors por família). Crônica: tem linha.
- [B] A IA não digita coordenada nem parâmetro de forma (seis tentativas, seis reprovações), alvo inventado pela IA não vale como referência vinculante, mosaico/painel/métrica não aprovam, detector fora do escopo devolve não avaliável e nunca `passa`, e forma ruim não se conserta depois de pronta. Porquê: práticas proibidas por evidência de seis rotas automotivas reprovadas. Lugar: `docs/modelar/usar/GOTCHAS-AUTORIA-VISUAL.md`, `docs/modelar/usar/METODO-DIAGNOSTICO-E-SEU-LIMITE.md`, `docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md` (mosaico é só índice), `docs/modelar/DOSSIE-MODELADOR-INVERSO-PRIORS-FAMILIA.md` e `CLAUDE.md` (imagem de IA vale como caráter, nunca como medida).
- [C] O mecanismo cancelado (gerador de linhas de caráter, costurador, julgador aprendido, condições S0 a S5). Porquê: cancelado por falta de teste repetido; a hipótese de ordenar candidatos está no dossiê do modelador inverso.

## 2026-08-23-redesenho-cage-r2b-controle-vertical.md
Estado: concluído (decisão interromper), em 2026-08-23. Crônica: tem linha.
- [C] A faixa vertical extra da cage direta foi provada na B1 e o campeão reprovado ficou como contraevidência privada; B2 a B4 não prosseguiram porque o ciclo regional otimizaria uma representação global já rejeitada. Porquê: a subdivisão com vincos que entrou depois no núcleo substituiu a rota; nada a guardar além da linha da crônica.

## 2026-08-28-exportacao-cad-step.md
Estado: concluído (decisão aprovar), em 2026-08-28. Crônica: tem linha.
- [B] A exportação STEP é capacidade derivada da malha neutra, isolada em `modulos/exportador-cad/` atrás de adaptador substituível: unidade e tolerância nunca presumidas, borda aberta e não-manifold recusadas sem reparo silencioso, sem arquivo parcial, STEP facetado nunca anunciado como paramétrico, sem fallback silencioso. Porquê: manter o núcleo sem CAD e a saída honesta. Lugar: `docs/modelar/DOSSIE-EXPORTACAO-CAD-STEP.md` e o gate `tools/arquitetura/nucleo-sem-three.mjs`.

## 2026-08-31-malha-otimizada-e-prova-por-objeto.md
Estado: concluído (H0 a H5 entregues, H6 parcial), em 2026-09-01. Crônica: tem linha.
- [B] Limiar de uma medida é declarado antes de medir (limiar escolhido depois é resultado inventado), detector que só aprova é aprovação por vacuidade e módulo declara o que não verifica; teto de três rodadas num objeto que não converge. Porquê: falhas já registradas neste repositório. Lugar: `docs/modelar/usar/GOTCHAS-AUTORIA-VISUAL.md`, `.claude/skills/auditar-montagem/SKILL.md` (expectativa declarada antes de medir) e `docs/modelar/usar/METODO-DIAGNOSTICO-E-SEU-LIMITE.md`.
- [C] Módulos de redução de vértice e de preparação para micropolígono, o conferente de malha e cinco peças do acervo; A14 (tolerância de planaridade do `furo`) medido e deixado sem correção. Porquê: entregue em código ou em backlog; sem regra a guardar.

## 2026-08-31-reorganizacao-por-uso.md
Estado: concluído (decisão aprovar; F5 recusada com custo medido), em 2026-08-31. Crônica: tem linha.
- [B] Documento em `usar/` não cita a raiz de `docs/modelar/` nem `planos/`, todo documento de `usar/` é citado por uma skill, documento vivo não cita `historico/` como fonte de regra e o gate de links resolve também link relativo; teto de linhas das portas. Porquê: manter a separação entre quem usa e quem desenvolve verificável. Lugar: `tools/mapa/estrutura-docs.test.mjs` e `docs:links:check` (gates), `CLAUDE.md` ("Histórico e evidências encerradas não governam") e o plano ativo `2026-11-13-organizacao-dos-documentos.md`.
- [C] Troca da pasta `desenvolver/` pela raiz de `docs/modelar/` como área de desenvolvimento. Porquê: o plano ativo de organização dos documentos redesenha a árvore e a substitui.

## 2026-09-01-laboratorio-computacional-ia.md
Estado: concluído (laboratório migrado em 2026-09-03), em 2026-09-01. Crônica: tem linha.
- [A] A ciência de materiais não mora neste repositório: o laboratório saiu para `warbookbr/nos-ciencia`, a separação é sem conhecimento nos dois sentidos (este repositório não importa nem referencia o laboratório, e o laboratório não importa o motor de receitas), o cruzamento é manual citando versão e commit, e só o instrumento que roda o motor (`tools/modelar/medir-torcao.mjs`) ficou aqui. Porquê: manter ciência e autoria 3D no mesmo repositório obriga toda leitura, humana ou de IA, a atravessar os dois domínios. Procurei: "nos-ciencia", "laboratório", "laboratorio", "ciência de materiais", "medir-torcao" em `docs/modelar/*.md`, `docs/modelar/usar/`, `.claude/`, `tools/`, `src/`, `procedural/`, `modulos/`, `CLAUDE.md`, `README.md`; só achei menções soltas de "laboratório" em famílias de objetos e em `tools/mapa/gates-espelham-ci.test.mjs` (história de um gate removido), nenhuma regra de fronteira nem o nome do repositório irmão. Rascunho do registro: O laboratório de ciência de materiais foi incubado aqui em 2026-09-01 e migrado em 2026-09-03 para `warbookbr/nos-ciencia`, com histórico, por decisão da pessoa. Este repositório não importa nem cita nada do laboratório, e o laboratório não importa o motor de receitas; quem precisar cruzar peça e estudo de materiais faz a ponte à mão, citando versão e commit do lado citado. O motivo é que manter os dois domínios juntos obriga qualquer leitura a atravessá-los. O instrumento que executa receitas (`tools/modelar/medir-torcao.mjs`) ficou aqui porque mora onde o motor mora.
- [C] Foco único do laboratório em materiais, gates L1 a L5 e a regra de que restrição nova se passa nas linhas velhas do estudo do cabo. Porquê: tudo isso viajou com o laboratório para `nos-ciencia` e não governa este repositório.

## 2026-09-07-atrito-achado-modelando.md
Estado: concluído (decisão aprovar), em 2026-09-07. Crônica: tem linha.
- [B] Chave desconhecida em passo GRITA com a lista do aceito e sugestão de nome, e chave conhecida ausente mantém o padrão; a paleta de auditoria pinta e relata e nunca aprova, com cor estável por índice e o contrato "digo o que não separei" (cor estável por índice é incompatível com separação garantida). Porquê: erro de escrita precisa doer na hora e a imagem deve denunciar o que não separa. Lugar: `procedural/nucleo/uso-operacoes.js` (validação de argumento), `src/autoria/cor-de-auditoria.js` e `tools/modelar/olhar-bancada.mjs` (aviso de cores próximas).
- [C] Busca vazia diagnostica por quê sem mudar o casamento por substring; operação de tubo entre dois pontos e medida de oclusão entre partes devolvidas ao backlog. Porquê: entregue em código; o resto está no backlog.

## 2026-09-07-esteira-confiavel-para-ia.md
Estado: concluído (decisão aprovar), em 2026-09-07. Crônica: tem linha.
- [B] A leitura obrigatória tem teto de tamanho que age como catraca (voltar a crescer exige decisão explícita), toda citação de caminho ou `npm run` nela é conferida por gate, o instrumento mede a ferramenta e nunca pede relato ao agente, e teste que não pode rodar é ignorado com motivo (nunca vermelho nem silenciado). Porquê: o custo dominante da IA era a esteira, e duas verdades sobre a mesma coisa em dois documentos é pior que uma verdade longe. Lugar: gates `npm run leitura:obrigatoria` (`tools/mapa/leitura-obrigatoria.mjs`) e `tools/mapa/citacoes.mjs`, `tools/testes/nenhum-teste-desligado.test.mjs` e `npm run diario` (`tools/modelar/ler-diario.mjs`).
- [C] A saída de `descrever` resume por padrão (alvo de 2 KB não perseguido para não esconder relação de contato), `--res` na captura e a separação entre onde a sessão é gravada e onde a receita é procurada. Porquê: entregue em código; "alvo escrito antes de medir pode estar errado" é a lição da própria linha da crônica.

## 2026-09-07-o-que-nenhuma-vista-mostra.md
Estado: concluído (decisão aprovar), em 2026-09-08. Crônica: tem linha.
- [B] A declaração de contato é contrato e não escapatória: a receita lista os contatos intencionais antes de medir, par que toca fora da lista reprova, o motivo tem tamanho mínimo, a medida é contra o sólido e nunca contra a caixa, e a forma prometida da parte é `solido` ou `anel` (sem `tubo` separado, que a régua não distingue). Porquê: se declarar servisse para calar reprovação já emitida o veredito viraria carimbo. Lugar: `src/autoria/contatos-da-peca.js` e `src/autoria/forma-da-parte.js` (comentários de projeto) com testes `contatos-da-peca.test.mjs`.
- [B] O gate de fechamento de uma ferramenta de veredito é o prompt mínimo repetido por quem não a construiu (subagente frio), e relato de agente não substitui rodar o gate. Porquê: foi o laço que falhou e não a aritmética. Lugar: `.claude/skills/laco-de-modelagem/SKILL.md` e `CLAUDE.md` ("Agente despachado não o roda" / "Todo achado responde se o processo o teria pego").
- [C] Oclusão por pixel e texto dentro da imagem ficaram excluídos (custo da bancada inteira por medição; texto estragaria o crítico cego). Porquê: já constam na crônica; `REFERENCIA-E-CRITICA-VISUAL.md` cobre o crítico cego recebendo só o PNG.

## 2026-09-07-parametro-que-move-a-peca.md
Estado: concluído (decisão aprovar), em 2026-09-07. Crônica: tem linha.
- [B] A varredura de parâmetros devolve candidatos e nunca aplica um vencedor, o candidato escolhido é remedido de verdade, todo candidato traz quantas relações pioraram (otimizar um critério sem contar o resto acha solução pior mais rápido), e efeito abaixo de 1 nm não conta. Porquê: métrica não aprova forma. Lugar: `src/autoria/varrer-parametros.js` (comentário "REGRA QUE NÃO SE NEGOCIA"), `docs/modelar/usar/PARAMETROS-VIVOS.md` e `docs/modelar/usar/METODO-DIAGNOSTICO-E-SEU-LIMITE.md`.

## 2026-09-08-esquecer-precisa-falhar.md
Estado: concluído, em 2026-09-08. Crônica: tem linha.
- [B] O veredito de contato e de forma é o padrão de `descrever` e `descrever:montagem` (esquecer declarar falha), a opção que o desliga tem nome explícito (`--sem-veredito`) e a saída avisa que foi desligado, e par inconclusivo nunca conta como livre. Porquê: execução relaxada não pode parecer execução aprovada. Lugar: `tools/modelar/descrever-peca.mjs` (aviso "VEREDITO DESLIGADO"), `src/autoria/auditar-intersecoes-montagem.js` e `.claude/skills/criar-peca/references/operacoes-procedurais.md`.
- [B] Um gate que exige reprovação não pode depender de o agente errar nem de ambiente descontaminado; a prova é tirar a declaração de uma peça pronta e ver o veredito mudar, e a contenção amostra também o centroide do triângulo. Porquê: o agente do gate leu a implementação e uma peça já declarada. Lugar: a regra geral "gate é visto reprovando" está em `tools/mapa/estrutura-docs.test.mjs` e `tools/mapa/reguas-nos-gates.mjs`; o detalhe da amostragem está em `src/autoria/contato-de-solidos.js`. A nuance de "não esperar o agente errar" só está neste plano e cabe numa frase se a pessoa quiser guardá-la.
- [C] Os defeitos reais revelados (`barricada-de-sucata`, `bicicleta-urbana`) foram registrados e não corrigidos. Porquê: eram peças de exemplo do acervo antigo.

## 2026-09-09-bancada-referencias-e-controles.md
Estado: concluído, em 2026-09-10. Crônica: tem linha.
- [B] A referência visual da bancada nunca entra em medida (caixa da raiz, enquadramento, estatística ou medição sem cabeça), nunca entra em receita nem montagem, e a falha de persistência local é dita e nunca fingida; atalho ocupado informa quem o ocupa e não transfere a tecla. Porquê: a bancada mediria a foto em vez da peça. Lugar: `src/bancada/referencias/prancha-overlay.test.js` (teste da fronteira) e `docs/modelar/BANCADA-E-APRESENTACAO.md`.

## 2026-09-10-ponte-do-gesto-ao-parametro.md
Estado: concluído, em 2026-09-11 (aberto em 2026-09-10). Crônica: tem linha.
- [B] O desenho do gesto na bancada tornou-se livre e a tradução em receita organizada virou uma rodada com dono, porque num quadro em treliça nenhum número empurra um tubo sem descolar as juntas; a bancada salva um ajuste que a IA absorve, e não grava passo com id literal de vértice. Porquê: a regra "gesto cai num parâmetro nomeado no arrasto" foi medida e revertida depois deste plano. Lugar: `docs/modelar/BANCADA-E-APRESENTACAO.md` (papel da bancada e fronteira `src/bancada`/`src/autoria`), `.claude/skills/absorver-ajuste-da-bancada/SKILL.md` e `docs/modelar/usar/AJUSTE-DA-BANCADA.md`.
- [C] "Mexer é prévia, salvar é gravação em lote" e o limite do desfazer na linha de base do arquivo. Porquê: o desfazer parando no estado que veio do arquivo está em `BANCADA-E-APRESENTACAO.md` (linha sobre `Ctrl+Z`); o resto foi código.

## 2026-09-11-a-peca-mora-num-lugar-so.md
Estado: concluído, em 2026-09-11. Crônica: tem linha.
- [B] A peça é uma pasta (`procedural/pecas/<peça>/receita.js` com `referencias/` e `rodadas/`), a identidade dela é a pasta e não a posição num glob, peça nova em arquivo solto reprova, referência declarada e ausente reprova, e a recusa da forma antiga só entra depois que o acervo migrou. Porquê: duas formas custam um `if` por comando e uma dúvida por sessão. Lugar: `.claude/skills/criar-peca/references/por-que.md`, `.claude/skills/alinhar-modelagem/SKILL.md` e os gates `npm run guarda:acervo` e `npm run guarda:referencia`.

## 2026-09-11-orquestracao-de-modelagem.md
Estado: concluído, em 2026-09-11. Crônica: tem linha.
- [B] Alinha, modela e julga são três papéis em arquivos e ferramentas separados (o crítico só lê, o modelador não aprova nem decide parada, quem orquestra não edita veredito nem receita), nenhum arquivo de agente cita o objeto da vez, o vocabulário de defeito é fechado (ângulo e posição distintos, e veredito em prosa é recusado), e o laço para por critério, limite ou três rodadas sem os defeitos caírem, nunca por concordância do autor. Porquê: ninguém aprova o próprio trabalho. Lugar: `.claude/agents/`, `.claude/REGRAS-DOS-AGENTES.md`, `.claude/skills/laco-de-modelagem/SKILL.md`, `src/autoria/veredito-de-forma.js` e `tools/modelar/papeis-do-laco.test.mjs`.
- [C] A medida automática de ângulo e comprimento contra a imagem de referência e a convergência ponta a ponta numa peça nova ficaram para depois. Porquê: entregues por planos posteriores e já na crônica.

## Resumo

Planos lidos: 59 de 59 (nenhum faltou). Decisões classificadas: 84 (A: 2, B: 57, C: 25).

Lista das A:
- `2026-08-18-chassi-realista-kernel-geometrico.md`: a pele exterior de carroceria não nasce de `loft`, envelope varrido, SDF nem kernel B-rep próprio; só a subdivisão de quads com vincos. Confiança média, porque o motivo também está no dossiê em `historico/`, que sai junto; a subdivisão entregue pode bastar como registro.
- `2026-09-01-laboratorio-computacional-ia.md`: a ciência de materiais mora em `warbookbr/nos-ciencia`, com separação sem conhecimento nos dois sentidos e cruzamento manual citando versão e commit. Nenhum documento vivo escreve essa fronteira.

Observações para quem for escrever os registros: os planos de agosto não registram o dia do fechamento, então as datas dos blocos são as dos nomes dos arquivos, salvo onde o próprio plano escreve o encerramento (2026-11-05 para os cancelados e para o motor de prancha). Os documentos de `docs/modelar/planos/mcp/` e `docs/modelar/planos/concluidos/` foram tratados como vivos, porque ficam fora de `encerrados/` e `historico/`. Se a fatia 4 também os tirar da árvore, as citações a `planos/mcp/INDEX.md` neste arquivo deixam de valer; as B que dependem só dele são a do plano `2026-08-04-mcp-para-agentes.md`, que também aponta `CONTINUIDADE-ARQUITETURAL.md`.
