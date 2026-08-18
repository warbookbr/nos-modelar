# Sonda de sistema — armadura humanoide tecnológica 1.0

**Estado:** concluído

**Responsável:** Codex

**Base:** sonda do supercarro 1.0 concluída com decisão `aprovar`.

## Objetivo verificável

Modelar uma armadura tecnológica humanoide exterior, original e sem marcas,
adequada a visualização de jogo, como fixture privada e sistema hierárquico.
Cabeça, tórax, pelve, braços e pernas precisam ser semanticamente isoláveis;
membros repetidos devem testar reutilização sem apagar quiralidade; juntas e
placas sobrepostas devem ser inspecionáveis em pose neutra e em pelo menos uma
pose articulada.

A finalidade não é reproduzir personagem protegido nem criar somente uma
silhueta. A sonda deve elevar a capacidade genérica da IA para sistemas
articulados: intenção declarada, simetria, variantes, envelopes de movimento,
contexto progressivo, crítica visual comparável e correção localizada com
impacto conhecido.

## Hipótese

O modelo de peça/montagem que escalou para o carro consegue representar um
sistema corporal mais profundo, mas vai revelar limites que uma montagem
estática não pressiona: referenciais locais encadeados, lados espelhados,
folgas durante movimento, camadas externas e consistência entre dezenas de
alvos semelhantes. As melhorias só serão aceitas quando úteis também para um
robô industrial, exoesqueleto, ferramenta articulada ou outro sistema composto.

## Eixos de evolução

- **Intenção antes da malha:** dimensões, lado, função visual, interfaces,
  material e tolerância relevantes devem ser consultáveis como dados.
- **Autoria multiescala:** a IA deve navegar de corpo inteiro para membro,
  junta, placa e interface sem carregar sempre a cena completa.
- **Bilateralidade consciente:** reutilização geométrica, espelhamento de pose
  e identidade esquerda/direita não podem ser confundidos.
- **Espaço de estados:** validar ao menos pose neutra e pose articulada, com
  pares e limitações explícitos; uma foto não prova movimento livre.
- **Crítica reexecutável:** defeito visual deve registrar alvo, vista,
  severidade, evidência, decisão e estado após correção.
- **Economia de contexto e geometria:** medir definições únicas, instâncias,
  faces, bytes, tempo e redução por consulta/nível de detalhe.
- **Interface Agent-First:** skills, schemas, MCP, diagnósticos e recursos
  devem permitir descobrir e usar a capacidade sem ler implementação.

## Escopo

- fixture privada `autoria-assistida/experimentos/sonda-armadura-humanoide-1-0/`;
- referência visual original gerada e preservada com sua intenção;
- capacete, tórax/costas, pelve, ombros, braços, antebraços, mãos simplificadas,
  coxas, pernas e pés como peças ou subconjuntos justificáveis;
- montagem recursiva por tronco e membros, com identidades semânticas estáveis;
- ao menos uma família bilateral reutilizada e uma variante quiral explícita;
- materiais de placas, juntas, visor e emissores como dados revisáveis;
- pose neutra e uma pose articulada coerente, sem animação prometida;
- inspeção global e isolada de cabeça, tórax, braço, perna e juntas críticas;
- auditoria estática das poses e, se a representação permitir, envelope
  amostrado de movimento; ausência vira lacuna, não passe;
- round-trip, impacto de definição compartilhada e orçamento de contexto;
- melhorias genéricas descobertas e implementadas durante a execução.

## Invariantes

- catálogo público de peças permanece vazio;
- núcleo não conhece anatomia, armadura, personagem, jogo, Three.js ou MCP;
- identidade salva é semântica, nunca índice, UUID ou posição de passo;
- imagem não comprova ergonomia, proteção, fabricação, segurança ou movimento;
- lado esquerdo/direito é dado explícito quando afeta identidade ou geometria;
- falha, truncamento, amostra e par não verificado permanecem visíveis;
- baseline R00, dobradiça e supercarro continuam verdes.

## Fora

Interior biológico, rosto de pessoa real, armas, propulsão funcional,
eletrônica, física de tecido, dano, rigging de produção, animação final,
segurança, fabricação e réplica de Homem de Ferro ou de qualquer franquia.

## Rodadas

1. **R00 — referência e esquema de intenção:** proporção original, eixos,
   hierarquia, interfaces, materiais e orçamento antes da malha.
2. **R01 — tronco e cabeça:** linguagem de placas, camadas, visor e leitura de
   silhueta frontal/lateral/traseira.
3. **R02 — membro reutilizável:** braço e perna, bilateralidade, quiralidade,
   juntas e impacto de definição compartilhada.
4. **R03 — corpo composto:** montagem recursiva completa, pose neutra, contexto
   progressivo, descrição e exportação.
5. **R04 — estados e folgas:** pose articulada, auditoria interna/incidente e
   prova ou lacuna persistida de envelope de movimento.
6. **R05 — crítica estruturada:** capturas isoladas/globais, defeitos
   comparáveis, correções e medição antes/depois.
7. **R06 — elevação de plataforma:** generalizar os ganhos em API, MCP, skills,
   schemas, diagnóstico e acessibilidade sem domínio no núcleo.
8. **R07 — fechamento:** gates completos, relatório, decisão e definição do
   próximo salto com base na evidência, não em uma lista fechada.

## Gates

1. Pelo menos 18 identidades externas úteis e três níveis de montagem são
   navegáveis por identidade semântica.
2. O corpo possui os dois lados, reutiliza definições onde correto e distingue
   variante quiral de mera transformação.
3. Pose neutra e pose articulada resolvem de forma determinística; diferenças
   de estado são localizáveis e não exigem duplicar receitas.
4. Materiais e intenção de componente participam de descrição, assinatura e
   diff, não apenas do render.
5. Contextos global, por membro e por junta têm tamanho/cobertura medidos; o
   recorte menor preserva ancestrais e interfaces necessárias para agir.
6. Auditoria informa todos os pares do escopo, omissões e inconclusivos em cada
   pose. Amostragem de movimento é declarada como amostra, nunca contínua.
7. Pelo menos 16 vistas válidas cobrem corpo, frente, costas, perfil e alvos
   críticos; nenhuma vista única aprova a geometria.
8. Uma mudança compartilhada alcança todos os consumidores e produz roteiro de
   revalidação consumível pela porta oficial.
9. Ao menos um defeito visual passa pelo ciclo estruturado observar, registrar,
   corrigir e comparar.
10. Cada melhoria de plataforma é neutra, testada, documentada e descoberta
    por agente sem leitura da implementação.
11. Orçamento geométrico, exportação, tempo e bundle são comparados com as
    sondas anteriores; regressão só é aceita com ganho explícito.
12. Todos os gates do `INDEX.md`, baseline R00, dobradiça e supercarro passam.

## Parada e decisão

Não especializar o núcleo para concluir a aparência. Uma lacuna pode receber
contrato genérico, ficar persistida com evidência ou bloquear o gate que dela
depende. O fechamento será `aprovar`, `corrigir` ou `cancelar` e deverá indicar
o próximo salto de capacidade da Mecanifica 1.0.

## Fechamento

R00–R07 foram concluídas em 2026-08-18 com decisão `aprovar`. A fixture privada
possui 13 definições, 22 peças-folha, oito submontagens, profundidade três, 43
partes semânticas e dois estados derivados sem duplicar receitas. As 16 vistas
finais e as 16 evidências preservadas da primeira rodada sustentam um ciclo de
três achados visuais antes/depois.

Cada estado decide 231/231 pares sem inconclusivos; interpenetrações continuam
visíveis e explicadas, não suprimidas. O estudo prova estados estáticos, não
trajetória livre. Métricas, melhorias e próximos saltos estão em
`docs/mecanifica/RELATORIO-SONDA-ARMADURA-HUMANOIDE-1-0.md`.

Nenhum plano novo foi aberto automaticamente. O próximo recorte deve escolher
entre cenário multi-documento, envelope de movimento, subtração robusta,
materiais/LOD ou autoria por intenção a partir de ganho verificável.
