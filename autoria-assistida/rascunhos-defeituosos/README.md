# Rascunhos defeituosos

Este diretório guarda receitas, peças, sondas e provas privadas que não atendem
ao padrão visual atual da Mecanifica. Elas não são catálogo, biblioteca de
partes, exemplos para nova autoria nem base de promoção.

São preservadas para manter a procedência de relatórios, reproduzir falhas e
comparar contra a futura cage autoral direta. Consumidores de teste que precisam
dessas peças usam caminhos explícitos para este diretório; isso não homologa a
geometria.

Fixtures mínimos de teste vivem fora daqui porque exercitam contratos do motor,
não representam acervo visual ou receitas candidatas a uso.

## Relações preservadas na migração

- Cada experimento foi movido inteiro; seus imports relativos entre carregador,
  composição, montagem e `receitas/` continuam no mesmo lugar relativo.
- Os testes de MCP, da bancada e de revalidação que carregam esses rascunhos
  agora os apontam explicitamente para esta pasta. Eles verificam integração e
  procedência, não qualidade geométrica.
- Planos e relatórios históricos também foram atualizados para manter links e
  rastreabilidade sem apresentar os arquivos como biblioteca ativa.
- `autoria-assistida/experimentos/ab-fluxo-ia-dobradica` não foi movido: é
  infraestrutura de experimento de fluxo, sem receitas de peças neste acervo.
