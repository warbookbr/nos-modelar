# Relatório — ensaio ponta a ponta da dobradiça 1.0

## Resultado

**Decisão: aprovar.** A dobradiça privada fecha a primeira sonda da Mecanifica
1.0. Três receitas passaram por composição, execução, descrição, exportação,
leitura, montagem v4, relações mecânicas, auditoria e inspeção visual sem entrar
no catálogo público. A prova também revelou e corrigiu duas lacunas genéricas:
composições não atravessavam as portas oficiais e a descoberta dizia quais
operações existiam, mas não ensinava uma IA a chamá-las.

## Peças e montagem

O estudo em
`autoria-assistida/experimentos/ensaio-ponta-a-ponta-dobradica/` modela folha do
batente, folha da porta e parafuso/pino central. As receitas reutilizam três
composições declarativas e publicam seis partes e seis portas semânticas. Os
neutros somam 402 vértices e 420 faces; não há face sem parte nem diagnóstico
órfão.

A montagem resolve três identidades e três relações `encaixaCilindrico`. Todas
passam com alinhamento 1, descentro 0 e folga radial medida de aproximadamente
0,0002 dentro do intervalo declarado de 0,00015 a 0,00025. A auditoria cobre
3/3 pares, classifica os três como contato de superfície, não deixa inconclusivo
e declara cobertura completa. Oito PNGs distintos, válidos e não cortados
registram duas vistas de cada peça e duas do conjunto.

O alvo é didático. Não há rosca helicoidal, resistência, torque, fabricação,
cinemática nem colisão em movimento; nenhuma dessas propriedades é inferida da
imagem ou das relações estáticas.

## Correções generalizadas durante a execução

`CHAMADAS_COMPOSICOES` e `registroComposicoes` agora atravessam execução,
descrição e exportação oficiais. Expansão, orçamento e assinatura fazem parte
da impressão reproduzível; chamadas ambíguas, operação nua e estouro de
orçamento são recusados antes de publicar estado. O estudo da dobradiça usa
somente essas portas, sem expansão manual privilegiada.

As 32 operações do núcleo e a extensão de prisma triangular agora publicam
`mecanifica.uso-operacao@1`: intenção, JSON Schema dos argumentos, exemplo
executável, pré-condições, limites e diagnósticos. Os exemplos são também a
fonte única do corpus R00; os 32 hashes anteriores permanecem iguais e os 32
casos executam com zero diagnóstico. A assinatura do registro passou a ser um
SHA-256 compacto e suas projeções são imutáveis, evitando que uma mutação do
chamador altere o contrato depois de assinado.

Catálogo e MCP usam descoberta progressiva. Busca aceita limite e cursor,
preserva intenção/schema no resumo e entrega o contrato completo só em
`descrever_capacidade`. Planejamento e lacuna resumem descartes por padrão. As
seis ferramentas procedurais possuem schemas de saída tipados; ID inválido de
composição falha na borda; ausência de extensão manda não executar e registrar
a lacuna, em vez de sugerir instalação por uma porta somente leitura.

## Ganho e custo medidos

No mesmo ambiente, o catálogo JSON compacto mede 28.630 bytes contra cerca de
30.677 antes da correção; o hipergrafo caiu de cerca de 19.467 para 8.340 bytes.
A busca ampla padrão mede 3.958 bytes contra cerca de 9.813, e o planejamento
resumido 2.558 bytes contra cerca de 5.800. Descrever apenas `cubo`, já com
schema e exemplo completos, custa 1.723 bytes. O índice de schemas custa 7.913
bytes; o conjunto completo de contratos fica no artefato gerado offline.

O custo é explícito: os contratos também acompanham o registro usado no
navegador. O build passou de 716,20 para 739,18 kB minificado e de 192,57 para
200,27 kB gzip, aproximadamente +22,98/+7,70 kB. O aumento compra descoberta
executável com uma fonte única; ele fica aceito nesta sonda e deverá ser
reavaliado quando carro e armadura pressionarem contexto e carregamento.

## Gates e continuidade

Passaram os testes da dobradiça, composições oficiais, registro, catálogo,
extensões, baseline R00, MCP caixa-preta, tipagem, build, arquitetura, catálogo
gerado, mapa, links, sumário e validação das três skills. O MCP focado executou
43 testes aprovados e dois ignorados previstos. A suíte integral executou 83
arquivos: 1.040 testes aprovados, dois ignorados previstos e zero falha.

A conclusão não encerra a Mecanifica 1.0. A próxima sonda é um supercarro
exterior privado para pressionar hierarquia, instâncias, escala de contexto,
materiais, orçamento geométrico, LOD, crítica visual, revisão localizada e
exportação. Depois, uma armadura humanoide testa generalidade, simetria,
múltiplas poses e espaço varrido. Dificuldades repetíveis continuam virando
contrato e prova neutros, não lógica de domínio.
