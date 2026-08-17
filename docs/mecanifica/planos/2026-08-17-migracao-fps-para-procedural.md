# Migração estrutural de `fps` para `procedural`

**Estado:** concluído

**Responsável pela execução:** Codex

**Base do levantamento:** `warbookbr/nos-mecanifica`, `main` em `7adc657`, com
as correções locais do estudo de dobradiça ainda não commitadas.

## Objetivo verificável

Renomear a árvore canônica
`prototipos/fps/v3/` para `prototipos/procedural/v3/`, removendo do caminho a
identidade histórica de jogo/FPS sem acoplar a estrutura ao nome do repositório,
do produto ou ao domínio automotivo.

A migração é aprovada somente se não alterar geometria, comportamento do núcleo,
identidades semânticas, contratos persistidos ou resultado visual.

## Por que este nome

`procedural` descreve o conteúdo comum da árvore — núcleo, receitas, montagens,
gabaritos e visor compatível — sem prometer que ela contém somente geometria,
somente motor ou uma aplicação humana. O segmento `v3` permanece; versioná-lo
ou removê-lo é outra decisão.

## Levantamento de influência

Inventário medido antes da execução:

- a árvore contém **52 arquivos**: 7 em `motor/`, 39 em `pecas/`, 3 em
  `montagens/`, 1 em `gabaritos/`, `README.md` e `visor.html`;
- fora das zonas históricas há **316 ocorrências** em **155 arquivos**;
- **274 ocorrências em 115 arquivos** ficam fora da própria árvore movida;
- **74 executáveis/testes/configurações** externos citam o caminho antigo;
- há 50 ocorrências nas duas zonas históricas, que são evidência;
- o trabalho local ainda não commitado acrescenta referências nas receitas e no
  carregador do estudo de dobradiça, no seu registro e no novo
  `_modelo-procedural.js`. O executor deve repetir o inventário sobre o HEAD
  efetivo, não confiar apenas nestes números.

Comando-base do inventário:

```bash
git grep -n -I -E 'prototipos/fps|/fps/v3|fps/v3|\bfps\b'
```

### Matriz de dependências

| Área | Influência observada | Tratamento |
|---|---|---|
| árvore canônica | `motor/`, `pecas/`, `montagens/`, `gabaritos/`, `README.md`, `visor.html` | mover a árvore inteira com histórico de rename; imports relativos internos devem continuar relativos |
| bancada publicada | import de `oficina.js` e `import.meta.glob` em `src/bancada/carregar-peca.js` | trocar raiz e confirmar catálogo/nomes idênticos no build |
| CLIs e gates | raízes em `tools/bancadas/`, `tools/mecanifica/`, `tools/modelagem/` e testes `tools/oficina/` | atualizar imports estáticos, `join`/`resolve`, mensagens e URLs locais |
| autoria assistida | experimentos e receitas confinadas importam o núcleo; briefings guardam `alvo.caminho` | atualizar código executável; tratar dados persistidos conforme a política de evidência abaixo |
| caminhos como contrato | `tools/modelagem/formato-pacote.mjs`, preparação de pacote e testes exigem `prototipos/fps/v3/pecas/<id>.js` | migrar a forma canônica em uma única fatia e provar criação/refinamento de pacote |
| montagem legada | `tools/mecanifica/descrever-montagem.mjs` descobre `montagens/` pelo caminho | atualizar raiz e executar a descrição real das montagens |
| visor e URLs locais | `criar`, `gabarito`, `olhar-peca` e `porteiro` navegam para `/prototipos/fps/v3/visor.html` | mudar a URL e provar carregamento pelo browser, não apenas existência em disco |
| Pages/CI | `.github/workflows/pages.yml` observa `prototipos/fps/v3/**` | trocar o filtro, garantindo que alterações futuras na nova árvore disparem deploy |
| regras auxiliares | `.gitignore`, skill de criação, README raiz e cabeçalhos das peças citam a raiz | atualizar instrução vigente e regra de ignore; regenerar mapa, nunca editá-lo à mão |
| documentação atual | `INDEX`, arquitetura, pranchas, contrato e protocolos apontam para arquivos reais | atualizar referências operacionais para o novo caminho |
| planos e evidências encerrados | planos concluídos, relatórios, JSONs do ciclo 6 e zonas históricas registram o caminho existente à época | preservar o sentido histórico; mudar apenas referências que precisam continuar resolvendo, com nota de migração quando necessário |
| consumidor externo | o índice afirma que `warbookbr/mecanica` consome peças resolvidas, não esta fonte | confirmar por busca no repositório consumidor antes de remover a raiz antiga |

## Decisões de migração

1. Destino canônico: `prototipos/procedural/v3/`.
2. Mover, não copiar; nunca manter dois núcleos/duas fontes de receitas.
3. Não criar symlink: é frágil em Windows, empacotamento e Pages.
4. Não criar alias ou redirect permanente por precaução. Se a busca externa
   encontrar consumidor da URL antiga, parar e registrar quem consome, por
   quanto tempo a compatibilidade será mantida e qual gate prova sua retirada.
5. Preservar imports relativos entre arquivos movidos juntos.
6. Não regravar hash para “fazer passar”; o gabarito fica byte-idêntico.
7. `docs/uso/MAPA.md` será atualizado somente por `npm run mapa`.

## Política para dados e história

Campos atuais que identificam o arquivo de autoria, como `alvo.caminho` em
briefings, passam a usar `prototipos/procedural/v3/pecas/<id>.js`. Antes da
troca, o executor deve verificar se esse campo participa de assinatura ou
imutabilidade de revisão:

- pacote ativo/fixture validada pelo fluxo atual: migrar pela ferramenta oficial
  e regenerar apenas artefato derivado autorizado;
- revisão ou tentativa declarada imutável: não reescrever silenciosamente;
  preservar a evidência e documentar a resolução do caminho legado;
- documento histórico narrativo: conservar a frase sobre o estado da época;
- instrução, comando ou link que ainda deve funcionar: atualizar para o destino.

Se o gate documental exigir que uma evidência antiga aponte para um arquivo
existente, prefira uma nota explícita “movido para …” no documento vivo que a
indexa. Não espalhar allowlists nem falsificar o caminho original dentro da
evidência.

## Fatias de execução

### R00 — baseline e consumidores

1. partir do HEAD com as correções aprovadas e worktree conhecido;
2. repetir o inventário por código, dado, documentação viva e história;
3. buscar caminho e URLs antigos em `warbookbr/mecanica` e automações;
4. guardar baseline de gabarito, catálogo, testes e build.

**Parada:** consumidor externo real, assinatura imutável dependente do caminho
ou outra branch com alterações simultâneas na árvore exige decisão antes do
move.

### R01 — movimento atômico da árvore

1. mover a árvore preservando todos os arquivos do HEAD efetivo;
2. conferir subpastas, README, visor e reconhecimento dos renames pelo Git;
3. não editar geometria, operações, materiais, IDs, parâmetros ou gabaritos.

### R02 — consumidores executáveis

Atualizar em conjunto `src/bancada/carregar-peca.js` e seu glob; ferramentas de
bancada, mecanificação, modelagem, MCP e Oficina; experimentos; contrato de
pacotes; URLs do visor; teste de imports; `.gitignore`; workflow de Pages.

Adicionar ou adaptar uma guarda que falhe se código executável voltar a citar
`prototipos/fps/v3`. A própria documentação de migração e evidências históricas
devem ser exceções deliberadas, não um `grep` global impossível de satisfazer.

### R03 — dados e documentação

1. migrar briefings/fixtures atuais conforme a política de dados;
2. atualizar README, skill, índice, arquitetura, pranchas, contratos e exemplos
   de coordenação que continuam operacionais;
3. classificar planos concluídos e JSONs de evidência sem substituição cega;
4. rodar `npm run mapa` após o caminho final estar estável.

### R04 — prova de equivalência e encerramento

1. provar catálogo idêntico e abrir peça publicada/fixture em múltiplas vistas;
2. provar novo URL e fluxos de descrição, criação, exportação, pacote e montagem;
3. conferir gabarito byte-idêntico e auditar resíduos antigos por categoria;
4. atualizar índice e planos com resultado e decisão.

## Invariantes

- `bancada.html` continua sendo a única aplicação publicada;
- o núcleo continua sem Three.js e sem domínio automotivo;
- nomes de peça, IDs semânticos, `origemId`, partes, portas e relações não mudam;
- formato de receita, montagem e pacote não ganha versão nova só por causa do
  caminho físico;
- contagens, hashes, colisão derivada, medidas e PNGs não mudam por intenção;
- nenhuma receita é publicada ou removida como efeito colateral;
- não editar `docs/uso/MAPA.md` manualmente;
- a palavra `fps` pode sobreviver apenas onde descreve história ou a própria
  migração, nunca como raiz operacional silenciosa.

## Gates

Executar os gates completos do `INDEX.md`, mais
`npm run descrever -- freio-disco --estrito`. Rodar `npm run mapa` antes de
`mapa:check`; não editar o arquivo gerado.

Auditoria residual obrigatória:

```text
git grep -n -I -E 'prototipos/fps|/fps/v3|fps/v3|\bfps\b'
git diff --summary
git diff --check
```

O primeiro comando pode listar evidência histórica e este plano; cada resultado
restante precisa ser classificado. Qualquer ocorrência em import, glob, caminho
de catálogo, URL ativa, mensagem operacional, workflow ou regra de ignore
reprova a migração.

## Critério de saída

A migração termina quando:

1. `prototipos/procedural/v3/` é a única árvore canônica;
2. nenhum consumidor executável ou instrução vigente depende de
   `prototipos/fps/v3/`;
3. consumidor externo e dados imutáveis foram verificados, não presumidos;
4. catálogo, núcleo, peças, montagens, visor, pacote e Pages têm prova focada;
5. gabaritos e resultados permanecem equivalentes;
6. os gates completos passam e os resíduos históricos estão justificados no
   fechamento.

## Fora do recorte

- renomear `v3`, `motor`, `pecas`, `montagens` ou `gabaritos`;
- reorganizar módulos internos ou criar pacote npm;
- alterar API, geometria, materiais, câmera ou comportamento;
- converter receitas antigas para outro formato;
- resolver dívidas documentais não causadas pelo caminho;
- publicar mudanças no repositório consumidor.

## Fechamento

**Decisão: `aprovar`.** `warbookbr/mecanica` não consome a raiz v3; a árvore
canônica foi movida, a guarda nova impede regressão e gabaritos, testes, build,
bancada, montagem e documentação preservaram equivalência.
