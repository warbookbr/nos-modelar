# Relatório R05 — estudo de campo da revalidação persistida

**Data:** 2026-08-14  
**Plano:** `2026-08-14-revalidacao-cascata-persistida.md`  
**Escopo:** uma peça compartilhada por duas raízes e um ramo isolado.

## Resultado

R05 foi concluída com decisão de prosseguir para o fechamento R06. O estudo
partiu da fixture real de dependências, criou uma campanha para
`peca-compartilhada`, publicou uma nova revisão declarativa da peça, reconstruiu
o mapa e derivou uma segunda campanha.

As raízes `sistema-a` e `sistema-b` permaneceram afetadas; `sistema-isolado`
ficou fora das duas campanhas. A nova revisão recebeu commit próprio e não
herdou a identidade nem os resultados da campanha anterior.

## Execução observada

1. O mapa estático foi capturado com a campanha antiga persistida.
2. A receita declarativa de `peca-compartilhada` foi alterada em um parâmetro e
   materializada como revisão ativa no repositório temporário.
3. O snapshot foi capturado novamente por provedores ativos; a proveniência da
   causa passou de `base-estatica` para `revisao-ativa`.
4. O resolvedor persistido existente validou `sistema-a`, `sistema-b` e
   `sistema-isolado` sem corrigir ou publicar nenhuma montagem.
5. O resolvedor também foi executado com uma referência ausente para provar a
   falha; o resultado `reprovado` foi registrado na campanha antiga.
6. A campanha antiga foi obsoletada pela nova identidade com a operação MCP
   `obsoletar_campanha_revalidacao`; seus itens ficaram obsoletos e seu histórico
   foi preservado.
7. Uma nova sessão MCP consultou a campanha e outra sessão registrou os três
   resultados aprovados na campanha nova.

## Evidências e métricas

- Itens derivados por campanha: `3` — subconjunto compartilhado, sistema A e
  sistema B.
- Raízes afetadas: `2`; raiz não afetada: `1`.
- Validações executadas pelo resolvedor: `3/3` aprovadas.
- Campanha antiga após a troca: `3/3` itens obsoletos, `1` resultado reprovado
  preservado no histórico.
- Campanha nova após autoria explícita: `3/3` itens aprovados, `3` resultados.
- Contexto público inicial antigo: `1.709` bytes; campanha completa antiga:
  `2.138` bytes.
- Contexto público inicial novo: `1.833` bytes; campanha completa nova:
  `2.326` bytes.

As respostas MCP não expuseram paths, documentos internos, malha ou a chave
técnica de armazenamento. A promoção não aconteceu durante a derivação, a
troca de causa ou a consulta; os estados aprovados só surgiram após chamadas
explícitas de registro de resultado.

## Correção generalizada aplicada

Foi adicionada `obsoletarCampanhaRevalidacao`, exposta somente no perfil MCP de
autoria opt-in. Ela aceita a identidade substituta — nova revisão de causa,
universo ou mapa — e obsoleta todos os itens ainda ativos em uma transação CAS.
O motivo e a identidade substituta ficam registrados na campanha antiga.

Isso cobre a situação geral em que a causa muda antes de cada dependente
receber uma revisão própria. A operação não altera geometria, mapa, receita ou
montagem e não promove a campanha nova. A obsolescência individual continua
disponível para mudança observada de um dependente específico.

## Limites e decisão

O estudo não autoriza correção automática, publicação automática, solver,
visualização ou inferência geométrica. A aprovação registrada é um fato
produzido pelo validador/host; a campanha apenas preserva sua proveniência e
estado.

R05 sustenta `prosseguir`: o próximo passo é revisar contratos, documentação e
gates no R06 e decidir o fechamento do plano. Nenhum novo mecanismo de
promoção deve ser aberto por implicação.
