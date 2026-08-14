# Contexto visual e autoria segura de montagem

**Estado:** ativo

**Responsável:** GPT (arquitetura, execução e revisão)

**Repositório e base:** `warbookbr/nos-mecanifica`, após PR #42 (`ed737b9`).

## Problema observado

Após o estudo de campo, a IA consegue resolver uma montagem, consultar seu
contexto compacto e derivar impacto local. Ainda não consegue inspecionar uma
montagem escolhida visualmente, receber um roteiro de revalidação após uma
alteração, descobrir usos entre raízes explicitamente fornecidas nem publicar
autoria com transação. O backlog também ainda marcava como ativo o plano v3 já
encerrado.

## Resultado

Entregar uma progressão verificável de serviços neutros: contexto visual
reproduzível de uma montagem; roteiro de revalidação explícito; catálogo de usos
confinado a raízes declaradas; e, somente se as provas de segurança fecharem,
escrita transacional local para autoria persistida. MCP continua consumidor
posterior, não definição de modelo.

## Filtro Agent-First

- **USAR DIRETO:** resolvedor v1/v2/v3, contexto JSON, impacto local, bancada,
  renderizador de peças, relações validadas e identidade semântica.
- **ENVOLVER:** seleção visual de montagem, relatório de revalidação e índice
  de usos por serviços puros com entrada explícita.
- **REFATORAR:** escrita somente se o contrato atual não puder garantir
  validação antes de publicar, operação atômica e recusa de sobrescrita.
- **ADIAR:** colisão geral/BVH, cinemática, solver, descoberta implícita no
  disco, renderização como nova aplicação publicada e escrita via MCP/API.

## Incluído

- corrigir estado do backlog e registrar este plano;
- serviço e CLI confinada para gerar vistas reproduzíveis de montagem, conjunto
  ou subárvore, sem tornar a bancada uma segunda fonte de composição;
- mapa de revalidação que explique relações/montagens diretas e indiretas,
  entrada necessária e limitações, sem corrigir ou publicar automaticamente;
- índice global somente sobre raízes passadas explicitamente pelo chamador, com
  usos, relações e caminhos semânticos determinísticos;
- desenho, implementação e prova de writer transacional local apenas se puder
  validar integralmente antes da troca atômica e recusar destino concorrente.

## Excluído

- alterar geometria, materiais, câmera ou a aplicação publicada sem escopo
  próprio;
- tratar projeção direcional como colisão geral;
- busca global implícita no repositório ou uso fora das raízes declaradas;
- revalidação automática, solver ou alteração de vizinhos;
- MCP, API, rede, Git remoto e publicação de autoria por porta externa.

## Contratos e invariantes

1. Caminho, parte, porta e montagem persistida são identidade; UUID, índice e
   objeto de runtime não são.
2. Toda saída é serializável, determinística e não transporta malha/runtime
   quando basta contexto semântico.
3. Vista visual é evidência e nunca prova colisão, folga ou validade global.
4. Impacto local e catálogo explícito devem declarar fronteiras, não inventar
   dependências por proximidade ou por arquivos não informados.
5. Writer só publica se todas as validações e precondições passarem; erro deixa
   o estado anterior intacto e explica ação possível.
6. Nenhuma fatia abre MCP automaticamente.

## Fatias

1. **R00 — concluído:** corrigir backlog, fixtures, métricas e plano.
2. **R01 — em andamento:** projetar montagem resolvida em entrada compatível
   com capturador existente; prover vistas determinísticas, seleção de
   subárvore/par e relatório sem alterar a bancada publicada.
3. **R02 — revalidação assistida:** derivar um roteiro a partir de impacto,
   relações resolvidas e limites; executar apenas validações explicitamente
   disponíveis e separar pendentes de não verificáveis.
4. **R03 — catálogo entre raízes:** ler somente raízes declaradas, indexar usos
   e relações por caminhos semânticos; provar ordem, duplicata, raiz inválida e
   ausência de inferência fora do conjunto.
5. **R04 — autoria transacional local:** antes de código, registrar contrato de
   destino, validação, lock/concorrência, troca atômica e recuperação. Implementar
   somente se a prova puder simular falha e concorrência sem estado parcial.
6. **R05 — documentação e decisão:** atualizar fontes de verdade, repetir o
   conjunto de campo, medir contexto, rodar gates e decidir explicitamente se
   MCP pode consumir leitura, nunca escrita neste plano.

## Provas obrigatórias

1. Plano v3 deixa de aparecer como ativo no backlog; só este plano fica ativo.
2. Duas execuções da mesma montagem geram as mesmas vistas e metadados; seleção
   não usa identidade de runtime e uma vista é lida em mais de um enquadramento.
3. Roteiro de revalidação distingue direto, indireto, executável, pendente e
   fora de cobertura; não chama o conjunto de "válido".
4. Catálogo explícito ordena por raiz/caminho, não muta entrada e só encontra
   usos dentro das raízes recebidas.
5. Writer, se aberto, prova pré-validação, escrita atômica, recusa de conflito,
   falha recuperável e estado anterior byte-idêntico após erro.
6. V1/v2/v3 permanecem compatíveis; núcleo não recebe domínio automotivo ou
   import de Three.js.
7. Suíte, typecheck, build, porteiro, guardas, exportação, mapa, links e planos
   passam; toda nova capacidade tem documentação Agent-First.

## Riscos e parada

- Parar R01 se exigir modificar a aplicação publicada ou duplicar composição no
  renderizador.
- Parar R02 se "revalidar" exigir inventar geometria, colisão ou política de
  correção.
- Parar R03 se catálogo explícito virar varredura implícita do repositório.
- Não iniciar writer se não houver troca atômica confiável e teste de falha;
  registrar bloqueio e fechar as fatias de leitura já comprovadas.
- Abrir plano separado para MCP ou para qualquer mudança no núcleo procedural.

## Fechamento

Registrar cada fatia com commit, fixtures, bytes/metadados, imagens lidas,
limitações e decisão sobre R04. Se writer não puder provar atomicidade, concluir
o plano como leitura/revalidação e devolver autoria transacional ao backlog com
o bloqueio concreto.
