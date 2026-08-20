# Aceite visual vinculante e prova de superfície

**Estado:** ativo

**Responsável:** Codex

**Base:** auditoria concluída em `75f2649` e
`RELATORIO-AUDITORIA-PRATICAS-AUTORIA-3D.md`.

## Objetivo

Impedir que uma prova de forma seja encerrada só por métricas estruturais e
provar, em zona privada, se uma cage com seções de caráter declaradas pode
responder ao alvo visual. O plano não promove uma geometria nem altera o núcleo
procedural antes de a prova passar.

## Hipótese

O problema observado no P2 é a ausência de um aceite visual vinculante e a
interpolação genérica da seção transversal, não uma falha de identidade,
composição ou determinismo. Se o pacote visual for obrigatório e as seções de
caráter forem autorais, as rejeições P0 podem decidir a prova antes de qualquer
alegação de aprovação.

## Escopo e invariantes

- Inclui ferramentas e contratos de pacote de evidência visual, testes de
  recusa, uma prova privada nova e suas vistas; a bancada continua apenas visor.
- Mantém núcleo neutro, receitas públicas, catálogo, câmera, materiais e
  geometria existente sem mudança até uma decisão posterior.
- Mantém P2 e a validação integrada congelados: P2 é contraevidência, não alvo
  a ser reescrito; a nova prova usa diretório e identidade próprios.
- Não usa Blender, CAD, MCP externo, booleana genérica, promoção automática ou
  aprovação por crítico. O crítico só produz achados; o aceite continua humano.

## Fatias

### R0 — contrato mínimo e corpus de falhas

Definir o pacote de aceite: alvo, sobreposição, vistas obrigatórias, condições
de rejeição executadas, achados independentes e decisão. Fixar fixtures que
omitem cada item e as três falhas P2: cápsula, ombro sem leitura e farol
invisível.

**Prova:** cada ausência e cada resultado `reprovar` impede `aprovar`; campos
sem identidade semântica, hash ou vínculo com a vista são recusados.

### R1 — porteiro de fechamento

Integrar a validação do pacote no caminho privado de revisão, sem mudar a
renderização nem publicar receita. A revisão informa separadamente `válida
estruturalmente`, `evidência visual incompleta` e `reprovada visualmente`.

**Prova:** uma revisão estruturalmente verde sem sobreposição, sem crítico ou
sem execução das rejeições não fecha; o replay íntegro permanece determinístico
e uma mutação visual conhecida muda o veredito esperado.

### R2 — prova privada de seções de caráter

Construir somente um quarto dianteiro novo com cage de quadriláteros e seções
transversais declaradas: largura, altura, quebra de ombro, abertura e recorte
de farol. Compilar em produto descartável e comparar com a prancha P0.

**Prova:** abrir alvo, render e sobreposição; ler as vistas frontal, lateral,
superior e isométrica; executar as oito rejeições P0 antes do fechamento;
despachar crítico independente apenas com os arquivos visuais. A prova passa
somente se não houver rejeição, a medida contra a prancha estiver no limite e o
usuário aceitar a forma.

### R3 — síntese e decisão

Publicar relatório com pacote reproduzível, mutações, custos e falhas. Decidir:

- `aprovar`: manter o porteiro e reavaliar a retomada da validação integrada;
- `corrigir`: localizar defeito restante sem promover representação;
- `redesenhar`: se seções declaradas e ciclo completo ainda não permitirem
  controlar a forma;
- `interromper`: se o custo exceder o valor demonstrado.

## Arquivos inicialmente esperados

- `tools/modelagem/validar-pacote.mjs`, `revisar-pacote.mjs` e seus testes;
- `tools/mecanifica/comparar-alvo.mjs`, `olhar.mjs` somente se uma lacuna
  reproduzível exigir alteração;
- `autoria-assistida/experimentos/prova-superficie-aceite/` e evidências;
- contrato, skill e relatório novos sob `docs/mecanifica/`.

Nenhum desses arquivos, exceto este plano e seus índices, está autorizado a
mudar sem reserva específica na fatia correspondente.

## Gates de saída

1. não existe caminho de aprovação visual sem pacote completo e reproduzível;
2. os três defeitos P2 e omissões do pacote são recusados por testes;
3. a prova usa seções de caráter declaradas, não interpolação genérica;
4. medidas, leitura de PNG e crítico independente aparecem como evidências
   distintas; silêncio do crítico não aprova;
5. a decisão final distingue forma, representação e infraestrutura;
6. `npm test`, tipagem, build e os gates do `INDEX.md` passam;
7. nenhuma receita, catálogo ou geometria pública é promovida sem autorização
   posterior.

## Riscos e parada

- Medida de silhueta não mede qualidade completa de superfície; ela não pode
  substituir as rejeições visuais ou o aceite humano.
- Uma prova aceita não homologa o chassi inteiro nem reabre P2 automaticamente.
- Falha visual com pacote íntegro suspende a retomada da validação integrada e
  leva a decisão de representação, não a refino cosmético.

## Fechamento

Preencher com relatório, decisão, gates, commit e estado dos planos congelados.
