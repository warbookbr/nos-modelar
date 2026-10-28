# Relatório N2 — forma global

**Estado:** implementação concluída; encerramento bloqueado em G02
**Decisão atual:** não abrir N3 antes de crítica independente e aceite do usuário

## Resultado

A fatia técnica da N2 está implementada. A Mecanifica agora possui alvo global,
andaime semântico, compilador de blocagem neutra, vistas canônicas, comparação
de silhueta, gate G01 e decisão G02 com falha segura. O serviço é nativo do
repositório, não importa Three.js no núcleo e não depende de Blender, DCC, CAD
ou formatos externos.

O fluxo configurado passou de 1/10 para 4/10 etapas cobertas em veículo:
`briefing`, `alvo`, `andaime` e `blocagem`. As seis etapas posteriores continuam
bloqueadas; N2 não as declara prontas.

## Prova inteira

A prova usa seis volumes semânticos: corpo, cabine e quatro rodas. O alvo e a
autoria possuem números próximos, mas deliberadamente diferentes, evitando uma
comparação tautológica. A compilação resultou em:

| Medida | Resultado |
|---|---:|
| volumes | 6 |
| vértices derivados | 154 |
| triângulos derivados | 284 |
| regiões obrigatórias cobertas | 4/4 |
| landmarks dentro da tolerância | 5/5 |

### Silhuetas G01

| Vista | IoU | Falta | Excesso | Desvio máximo | Estado |
|---|---:|---:|---:|---:|---|
| frontal | 0,971762 | 0,028238 | 0 | 0,014731 | aprovada |
| direita | 0,970554 | 0,027173 | 0,002342 | 0,023292 | aprovada |
| superior | 0,984458 | 0,015542 | 0 | 0,010417 | aprovada |

G01 ficou `aprovado`. G02 ficou `bloqueado`, como deveria: ainda não há crítica
independente nem decisão do usuário registradas.

## Evidência visual

- [painel cego](historico/evidencias-n2-forma-global/painel-cego.png): quatro vistas sem o
  nome esperado;
- [painel de comparação](historico/evidencias-n2-forma-global/painel-comparacao.png): alvo
  tracejado e blocagem na mesma escala;
- [avaliação G01](../historico/evidencias-n2-forma-global/avaliacao-g01.json) e
  [decisão G02 pendente](../historico/evidencias-n2-forma-global/decisao-g02-pendente.json);
- [manifesto com hashes](../historico/evidencias-n2-forma-global/manifesto.json) e
  [pacote limitado do crítico](../historico/evidencias-n2-forma-global/pacote-critica.json).

A primeira renderização foi rejeitada durante a própria inspeção porque uma
roda traseira aparecia sobre a cabine por ordenação inadequada dos volumes SVG.
O adaptador foi corrigido e as imagens foram regeneradas. Isso não alterou a
geometria nem as métricas; eliminou uma evidência visual enganosa.

## Corpus adversarial

Os testes não contêm apenas o caso verde. Eles provam que:

- perfil côncavo falha antes da compilação;
- orçamento de cinco volumes rejeita a prova de seis;
- cabine achatada e landmark deslocado reprovam G01;
- remover as quatro rodas reprova completude e silhuetas;
- G01 aprovado sem crítica/usuário mantém G02 bloqueado;
- crítica reprovando impede aprovação;
- plano de veículo permanece bloqueado na decomposição e nas fases posteriores.

## Reutilização e limites

Foram preservados o fluxo N1, seus schemas, o registro de provedores e o
procedural dimensional. O adaptador SVG é novo porque as vistas da N2 precisam
consumir diretamente a blocagem neutra; ele não duplicou identidade, montagem,
revisão, prancha ou o porteiro visual existente.

N2 não é N3 nem N4. Os prismas são blocagem, não superfície final. A prova não
autoriza detalhe, integração mecânica ou promoção de um carro.

## Gates executados

Os gates específicos de N1 e N2 passaram com 30/30 testes. Também passaram
`typecheck`, `build`, arquitetura, catálogo, exportação, porteiro, mapa, planos,
links, sumários, schemas, evidências N2, bancada vazia, guardas de portas,
câmera e pares, além do ensaio MCP.

O agregado `npm test` terminou com 1.252 testes aprovados, 14 falhas e dois
ignorados. Nenhuma falha pertence à implementação N2. Três casos que excederam
o limite de cinco segundos sob carga passaram quando executados isoladamente;
as outras 11 falhas reproduzem categorias já presentes na linha de base:
resolução de caminhos `repo://` em temporários, guarda histórica de `fps` e
importação isolada do perfil de revisão MCP. O `mcp:check` mantém a mesma falha
isolada conhecida, com 43 aprovações, uma falha e dois casos ignorados.

## Condição de encerramento

Falta somente G02:

1. despachar `pacote-critica.json` a um revisor realmente separado;
2. registrar crítica reconhecida, reprovada ou inconclusiva;
3. apresentar as mesmas vistas ao usuário e registrar `aprovar` ou `reprovar`;
4. somente se ambos aprovarem, atualizar este relatório, a matriz e o plano para
   N2 concluída e abrir N3.

Sem esses dois atos, chamar N2 de concluída repetiria exatamente a falha que o
programa foi criado para impedir.
