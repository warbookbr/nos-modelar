# Arquitetura híbrida nativa de autoria por famílias para IA

**Estado:** ativo  
**Responsável:** Codex  
**Repositório e base:** `warbookbr/nos-mecanifica`, `7bb1bd8`  
**Execução:** N0 e N1 concluídos; N2 implementada com G01 verde e G02 pendente.

## Origem, decisão e objetivo

Este plano sintetiza o fluxo proposto pelo usuário, a reprovação visual da
carroceria, a revisão da sonda humanoide e as capacidades atuais da Mecanifica.
Ele substitui o R2B, encerrado com decisão explícita `interromper`.

A autoria deve ser **nativa deste repositório**. Blender, DCC, CAD, serviços de
modelagem e fluxos GLTF/OBJ/USD não são dependências nem rotas de produção. Uma
capacidade essencial ausente pode ser implementada aqui no menor recorte que
eleve o resultado. O objetivo não é clonar software geral, mas elevar o teto do
sistema e da receita para veículos, peças mecânicas e robôs humanoides
convincentes, editáveis, verificáveis e reutilizáveis.

> **Primeiro obter uma forma global reconhecível e aprovada. Depois decompor,
> conectar, refinar e tornar cada parte reproduzível sem perder o conjunto.**

**Dossiês vinculantes:**

- [`DOSSIE-PLATAFORMA-AUTORIA-3D-NATIVA.md`](../DOSSIE-PLATAFORMA-AUTORIA-3D-NATIVA.md): arquitetura, contratos, lacunas e garantias; [`MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md`](../MATRIZ-RASTREABILIDADE-AUTORIA-3D-NATIVA.md): rastreio executável;
- [`DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md`](../DOSSIE-MOTOR-SUPERFICIES-NATIVAS.md): fonte, compilação, operações e provas de superfície;
- [`DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md`](../DOSSIE-FLUXO-IA-VALIDACAO-MULTIFAMILIA.md): estados, papéis, gates e recuperação.

## Diagnóstico e contraevidência

A base já entrega motor procedural determinístico e descobrível, identidade,
partes, portas, montagens recursivas, impacto, revalidação, revisões, bancada,
captura, crítica e MCP. Ela permanece como infraestrutura compartilhada.

A carroceria passou por `loft`, cage, prancha e métricas sem adquirir leitura
convincente de carro. O fluxo refinou uma representação global já reprovada.

A sonda humanoide provou hierarquia, reutilização, bilateralidade e estados,
mas não um bom robô. A referência era uma armadura atlética e contínua; tórax e
capacete viraram envelopes genéricos; membros foram volumes separados colocados
por deslocamentos; corpo, braços e pernas mantiveram `relacoes: []`; a auditoria
registrou zero contatos e 15/16 interpenetrações. Lacunas graves foram adiadas e
o estudo aprovou a plataforma apesar do artefato facetado e desconectado.

A causa não é apenas "low poly": faltaram forma global, superfície adequada,
interfaces obrigatórias e um gate capaz de reprovar o objeto quando somente a
infraestrutura passa.

## Aprovação em dois eixos

Toda prova produz decisões independentes:

1. **plataforma:** determinismo, identidade, edição, montagem, impacto,
   cobertura e custo;
2. **artefato:** reconhecimento, proporção, superfície, continuidade, conexões
   e aderência ao alvo.

Uma capacidade pode ser aprovada com artefato reprovado. Prova de qualidade só
fecha com os dois eixos aprovados. Achado visual grave não pode ser adiado para
permitir aprovação do objeto.

## Famílias e base comum

| Família | Autoria principal | Base compartilhada |
|---|---|---|
| mecânica dimensional | receita procedural atual | identidade, portas, medidas, montagem |
| superfície estilizada | superfície semântica nativa | referência, regiões, restrições, crítica |
| sistema articulado | peças, juntas e estados | interfaces, impacto, validação de pose |
| máquina completa | composição híbrida nativa | orquestração, contexto, revalidação global |

A família escolhe como criar a forma, sem mudar peça, montagem, identidade ou
revisão. Carro e robô não são receitas monolíticas.

## Arquitetura proposta

1. **Núcleo compartilhado:** contratos neutros de artefato, peça, montagem,
   identidade, revisão, dependência e validação; sem domínio ou Three.js.
2. **Orquestrador por objetivo:** recebe família, alvo, referência, estado e
   aceite; escolhe capacidades, ordena o fluxo e interrompe rotas reprovadas.
3. **Procedural dimensional:** preserva operações e receitas atuais.
4. **Andaime global:** esqueleto, landmarks, envelopes e proporções do objeto
   completo antes da decomposição.
5. **Superfície semântica:** curvas, seções, patches ou malha de controle,
   simetria, vincos, aberturas, continuidade e regiões nomeadas.
6. **Integração:** interfaces de cobertura, contato, folga, orientação e
   separação intencional entre vizinhos.
7. **Cinemática:** juntas, limites e trajetória somente após estados estáticos
   conectados e necessidade comprovada.

Os provedores podem crescer por extensões confinadas, mas não duplicam
identidade, montagem ou revisão.

## Receita elevada

Conforme a família, a fonte editável nativa pode conter:

- intenção, referência, condições de rejeição e critérios de reconhecimento;
- parâmetros, landmarks, eixos, simetria e andaime global;
- grafo procedural, curvas, patches ou malha de controle;
- regiões, interfaces, vizinhanças e restrições de continuidade/cobertura;
- estados, variantes, malha neutra derivada, assinatura e diagnósticos.

A malha densa é produto compilado, não identidade persistida. Índices podem ser
detalhe interno de operação, nunca a identidade pública da autoria ou montagem.

## Fluxo vinculante

1. Fixar referência, intenção, vistas e rejeições antes da geometria.
2. Criar andaime e blocagem do objeto inteiro em material neutro.
3. Exigir reconhecimento em vistas globais e aceite do usuário.
4. Só então decompor regiões em peças e submontagens.
5. Editar cada peça isolada, com vizinhos e no conjunto completo.
6. Declarar toda adjacência relevante como contato, cobertura, folga ou
   separação intencional verificável.
7. Refinar em ordem: proporção, volumes, aberturas, caráter, painéis e detalhes.
8. Recompilar e rever consumidores e conjunto após mudanças locais relevantes.
9. Validar pose neutra e estados estáticos; trajetória entra quando necessária.
10. Promover somente com decisões explícitas de plataforma, artefato e usuário.

### Veículo

Rodas, entre-eixos, bitolas, envelope e ocupantes formam o andaime. Capô,
cabine, cintura, ombros, para-lamas e traseira devem existir na blocagem. A pele
usa edição regional; arcos, vidros e painéis são loops ligados a ela. Mecânica
permanece procedural. Se a leitura cega não for carro, métricas não autorizam
detalhe ou integração.

### Humanoide

Esqueleto e proporções formam o andaime. Cabeça, caixa torácica, cintura
escapular, pelve e membros devem ler como corpo antes da armadura. Placas são
conformadas à base corporal. Capacete declara frente, laterais, topo, mandíbula
e pescoço; tórax declara peitoral, costas, cintura e transições. Toda cadeia do
tronco à extremidade permanece conectada e a pose neutra precede articulação.

## Validadores e porteiros

| Camada | Verifica | Ação |
|---|---|---|
| estrutural | schema, determinismo, identidade, partes, portas | preservar |
| forma global | reconhecimento, silhueta, proporção, landmarks | acrescentar |
| superfície | facetas, ondulação, continuidade, vincos, normais | acrescentar |
| conectividade | componentes isolados e adjacências obrigatórias | acrescentar |
| interface | distância, orientação, contato, cobertura, folga | ampliar relações |
| contexto | isolado, par de vizinhos e conjunto completo | tornar vinculante |
| estados | pose estática e depois envelope de movimento | ampliar se necessário |
| visual | leitura cega, comparação e decisão humana | tornar impeditivo |

`relacoes: []` é falha em conjunto que exige encaixes. Zero contatos não é
sucesso quando o alvo pede cobertura contínua. Interpenetração esperada continua
mensurada. `Low poly` só vale quando declarado. Peça isolada não aprova máquina.

## Fatias propostas

1. **N0 — verdade:** congelar contraevidências, separar os dois eixos de decisão
   e fixar baseline, referência inicial e contratos.
2. **N1 — contrato:** receita elevada, provedores, orquestração e falha segura.
   [Concluída](../RELATORIO-N1-FLUXO-AUTORIA.md) com schemas e prova caixa-preta.
3. **N2 — forma global:** implementar andaime e gate de reconhecimento numa
   blocagem inteira pequena. Implementação e G01 concluídos; G02 aguarda crítica
   independente e aceite do usuário.
4. **N3 — superfície nativa:** provar edição regional, simetria, continuidade,
   vinco e compilação neutra.
5. **N4 — veículo bruto:** produzir carro reconhecível antes de detalhe.
6. **N5 — integração:** ligar superfície a peças procedurais por interfaces.
7. **N6 — humanoide:** provar corpo-base e poucas placas conectadas sem domínio
   automotivo no núcleo.
8. **N7 — Agent-First:** expor descoberta, edição, captura e gates por serviços,
   skills e MCP adequados.
9. **N8 — decisão:** promover, corrigir, redesenhar ou remover por evidência.

N4 não começa se N3 não elevar a forma; N6 não começa se N5 depender de regra
de carro. Solver geral e movimento contínuo só entram diante de gate essencial.

## Gates de saída

1. blocagem reconhecida cegamente e aprovada pelo usuário antes do detalhe;
2. fonte nativa reaberta e editada por regiões/intenção pela IA;
3. edição local preserva ou declara impacto global;
4. veículo combina superfície e mecânica pelas interfaces comuns;
5. humanoide mantém cadeia corporal conectada e cobertura coerente;
6. nenhuma parte obrigatória flutua ou se liga apenas por câmera;
7. superfície atende ao alvo sem faceteamento ou ondulação indevidos;
8. decisões de plataforma e artefato permanecem separadas;
9. autor e crítico independente usam evidência adequada e papéis separados;
10. corpus atual não regride e custo/contexto das capacidades novas são medidos.

## Parada, escopo e ativação

Após três blocagens não reconhecíveis, revisar referência, representação ou
ferramenta. Silhueta errada retorna à blocagem; parte flutuante com gate verde
obriga corrigir o contrato. Reprovação visual mantém o artefato reprovado.

Inclui arquitetura, receita, orquestração, andaime, superfície, interfaces,
validadores, carro bruto e prova humanoide. Exclui software externo, clone de
Blender/CAD, produção final imediata, fabricação e solver universal prematuro.

O plano foi ativado após o R2B. N0/N1 fecharam verdade e contratos; N2 entregou
alvo, andaime, blocagem, vistas e G01. G02 segue bloqueado sem crítico e usuário; métrica ou estrutura correta não encerram a forma.
