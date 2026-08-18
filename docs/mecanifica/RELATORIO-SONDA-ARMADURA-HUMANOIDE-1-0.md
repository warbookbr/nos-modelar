# Relatório da sonda — armadura humanoide tecnológica 1.0

**Data:** 2026-08-18

**Decisão:** `aprovar`

## Resultado

A Mecanifica modelou uma armadura tecnológica humanoide original como sistema
privado, recursivo e multiestado. O resultado é um exotraje externo de jogo em
baixo/médio orçamento, não uma réplica de personagem, rig de produção,
equipamento protetor ou projeto fabricável.

A sonda aprovou a capacidade de decompor e manter o sistema. Ela não aprovou
movimento contínuo: pose neutra e pose articulada são duas amostras estáticas.

## Escala e estrutura

| Medida | Resultado |
|---|---:|
| definições privadas de peça | 13 |
| peças-folha resolvidas | 22 |
| submontagens resolvidas | 8 |
| profundidade máxima de caminho | 3 |
| partes semânticas nas definições | 43 |
| vértices/faces nas definições únicas | 1.148/1.196 |
| vértices/faces depois das instâncias | 1.748/1.718 |
| bytes dos exports JSON | 305.693 |
| vistas finais | 16 |
| pares por estado | 231/231 decididos |
| contexto global/neutro | 13.766 bytes |
| contexto de um braço | 3.803 bytes |
| contexto de uma junta | 1.489 bytes |
| bundle da bancada | 741,41 kB / 201,04 kB gzip |

As duas pernas reutilizam `montagem:perna`. Ombreiras, braços superiores,
antebraços, coxas, canelas, pés e a junta circular também usam definições
compartilhadas. As mãos são variantes quirais explícitas geradas pela mesma
família privada: polegar esquerdo e direito não são simulados por escala
negativa nem confundidos com posição da instância.

O catálogo público permaneceu vazio. As 13 peças executam, descrevem e exportam
sem órfãos ou faces sem parte, e o round-trip é reproduzível.

## Estados e impacto

A pose articulada não duplica receita. Nove alterações compactas, endereçadas
por identidade, derivam o estado:

- a raiz troca as referências do braço/perna direitos, gira ombro e quadril e
  recebe outro ID de estado;
- o braço gira `segmento-inferior` no cotovelo;
- a perna gira `segmento-inferior` no joelho;
- os diffs não contêm mudança estrutural nem índice de array.

Alterar a definição `peca:junta-articulada` localiza quatro consumidores — dois
cotovelos e dois joelhos — e solicita revalidação dos quatro membros e da raiz.
O foco interno de um braço reduz 231 pares a 10 e declara 221 omissões.

## Auditoria geométrica

Os dois estados têm cobertura completa de 231 pares e zero inconclusivos. A
pose neutra contém 15 interpenetrações; a articulada, 16. Todas têm expectativa
com ID e motivo: placas cobrem bordas de tórax, abdômen, pelve, braços, joelhos
e botas. Isso descreve a intenção de camada, mas não muda o estado do par. Uma
revisão geral continua reprovada diante de `interpenetram`.

Não houve par classificado como contato estático. Não foi feita varredura entre
poses, portanto não há prova de auto-colisão, folga mínima ou caminho livre
durante movimento.

## Crítica visual reexecutável

A primeira montagem passou em estrutura, mas foi rejeitada visualmente:

- lacunas grandes entre segmentos quebravam a leitura de cobertura;
- tórax/cabeça dominavam membros estreitos;
- flexionar somente cotovelo e joelho deixava a pose desequilibrada.

Os 16 PNGs dessa rodada foram preservados em `evidencias/antes/`. Três achados
foram registrados no novo contrato `mecanifica.achados-critica-visual` com
alvo, vista, severidade, observação, decisão, estado, hash e vínculo.

A segunda rodada estreitou o tórax, reforçou membros, aproximou articulações e
compensou a pose no ombro/quadril. Novos PNGs foram ligados aos anteriores por
hash e os mesmos três achados foram reexecutados. A proporção foi aceita; as
lacunas entre segmentos ficaram adiadas e a pose articulada continua aberta
para investigação. O resultado é deliberadamente facetado e modular e melhora
a primeira pilha de volumes, mas ainda lê mais como robô/exoesqueleto segmentado
do que como uma cobertura corporal contínua.

## Melhorias genéricas produzidas

1. **Crítica visual como dado.** Um contrato puro e determinístico permite
   reexecutar achados entre peças, montagens e domínios. Ele recusa UUID,
   timestamp, observação vaga, campo extra, hash inválido e duplicata.
2. **Estado por alteração semântica.** O estudo prova que poses alternativas
   podem reutilizar geometria e montagem base usando IDs e campos nomeados. O
   limite multi-documento continua explícito: a composição da transação ainda
   vive no estudo privado.
3. **Bilateralidade sem falsa simetria.** Definição compartilhada é usada onde
   a forma é igual; a família de mão exige lado e produz identidade quiral.
4. **Impacto por definição na prática.** A API e a porta MCP introduzidas no
   supercarro também fecham a manutenção dos quatro consumidores de junta.
5. **Conhecimento para agentes.** A skill de montagem agora ensina achados
   antes/depois, poses compactas, sete vistas, foco interno/incidente e a
   diferença entre estados estáticos e trajetória.
6. **Intenção de peça.** As 13 definições exercitam o contrato opcional que
   torna função, eixos, invariantes e critérios visuais descritíveis e
   comparáveis sem alterar o formato resolvido do cliente. A ausência preserva
   receitas antigas.

O custo observado desta rodada no cliente foi +2,23 kB minificados e +0,77 kB
gzip sobre os 739,18/200,27 kB medidos após a sonda do supercarro. O aumento é
aceito porque a validação opcional de intenção participa da fronteira de
receita usada pela bancada; nenhuma geometria privada entrou no bundle.

## Limites e próximos saltos

As sondas da dobradiça, carro e armadura expõem um teto seguinte maior que uma
nova peça:

- **cenários multi-documento:** um estado de sistema precisa agrupar alterações
  de várias montagens com observação, inspeção e aplicação atômicas;
- **envelope de movimento:** amostrar ou provar trajetória, registrar ângulos e
  localizar primeiro contato sem chamar duas poses de animação;
- **operações subtrativas robustas:** cavidades, caixas de roda e folgas de
  placas ainda dependem de aproximações ou sobreposição;
- **materiais e LOD compartilhados:** intenção/material são observáveis, mas
  biblioteca, UV/textura, variante e níveis de detalhe não são contratos de
  sistema;
- **crítica assistida:** o achado agora é dado, porém observação e severidade
  ainda dependem da IA consumidora; falta comparar métricas visuais de forma
  multimodal e auditável;
- **autoria por objetivo:** a IA ainda escolhe operações e parâmetros
  diretamente. Um compilador de intenção/restrições para propostas explicáveis
  é o salto de praticidade mais alto, desde que não esconda aproximações.

Essas linhas devem competir por ganho medido; não formam um checklist fechado e
não autorizam implementação automática.

## Reprodução

```text
node autoria-assistida/experimentos/sonda-armadura-humanoide-1-0/executar-estudo.mjs
node autoria-assistida/experimentos/sonda-armadura-humanoide-1-0/auditar-visual.mjs
npm exec vitest run -- tools/oficina/sonda-armadura-humanoide-1-0.test.mjs
```

O fechamento exige também os gates completos de `docs/mecanifica/INDEX.md`.
