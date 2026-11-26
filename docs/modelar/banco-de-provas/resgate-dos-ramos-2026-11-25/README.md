# Resgate dos ramos antigos: o inventário de 2026-11-25

Evidência do plano [resgate dos ramos antigos](../../planos/2026-11-25-resgate-dos-ramos-antigos.md). Cada item dos ramos que não entraram na main foi comparado com a main de 2026-11-25 (692ba0d8a); as receitas e o código dos ramos rodaram em memória contra o núcleo de hoje, sem gravar nada.

## Por que ficaram para trás

O passo `juntar` do CI (`.github/workflows/ci.yml`) só avança a main quando ela não andou desde a base do ramo. Nos ramos de 13 e 14 de novembro a main já tinha recebido de 31 a 44 commits antes da ponta deles; o passo falhou pedindo para juntar a main e enviar de novo, e nenhuma sessão voltou. O processo não pegou isso sozinho, e o plano traz `ramos:parados` para listar esses ramos.

## As peças

As onze automotivas (`claude/pecas-automotivas`) e as três mesas (`claude/mesas`) usam só operações que a main tem com o mesmo nome; todas executam, o PLANO é aceito e o descrever sai com código 0. O commit 83b6a4bf1 registra a aprovação da pessoa para o alternador, o radiador, o disco de embreagem, o turbocompressor e a junta do cabeçote; as outras nove não têm aprovação registrada. Nenhuma imagem de referência está versionada. A junta do cabeçote levou 123 s para executar no núcleo de hoje e o disco de embreagem de 9 a 10 s; as outras, de 0,1 a 2 s. Falta a cada uma o `PLANO.categoria`, que é de 17 de novembro.

A família `peca-de-revolucao` (`claude/familia-revolucao`) empacota perfis com parede deslocada, que a main passou a fazer no próprio `lathe` com `espessura` (1f0f48197, 0481ee6ae); as cinco peças reescritas sobre ela estão na main na forma de antes, com a categoria. A família e a reescrita ficam fora; reescrever as cinco com `lathe` e `espessura` vai ao backlog.

## As ferramentas

Da `claude/melhorias-ferramentas` entram a análise da bancada numa subpasta por peça (em `analise-da-peca.mjs` a segunda peça na mesma saída ainda apaga as imagens da primeira), quatro armadilhas confirmadas no motor de hoje e o polo do loft no guia, e a confirmação corpo a corpo em `relacaoConfirmadaPorSolido` (dois corpos da mesma parte que se sobrepõem anulam a contagem de cruzamentos, e um corpo aberto deixa o par inconclusivo). Ficam fora a invasão de contato e a lista de toleradas, que a `penetracaoMaxima` e a decisão de só avisar da main cobrem; os `MOVIMENTOS`, que a extensão de articulação cobre; o esqueleto de receita, que os guias cobrem; e a lista de operações que faltavam, nunca medida. O `auditar:forma` (`envio/auditar-forma`) fica fora: a ondulação, a dobra, o vinco oculto, as emendas e o vão entre partes medem o mesmo, melhor e com reprovação.

## O núcleo e a roda

Da `claude/roda-esportiva`, no `arredondarCostura` e nas booleanas: `limpar` e `pularOQueNaoCabe`, que só agem ligados; o fundo do tubo limitado pela meia espessura da parede, que muda o comportamento padrão onde a parede tem menos de dois raios (pode mudar o braço robótico, a empilhadeira e o carro quadrado); a nova tentativa com o mergulho do arco mudado quando a casca sai aberta; a face coberta pelo tubo fora das listas das outras origens, que tem de casar com `tirarDosPedacosDaDivisao`; e a volta dos pedaços refeitos às origens que citavam a face-mãe, que hoje mora dentro do `nucleoBooleano` e atinge as 61 receitas com booleana, por isso redesenhada. Os seletores `onde.radial` e `onde.setor` aplicam sem conflito. `PLANO.referenciasNaoConstruidas` entra com a roda, pausada pela pessoa na rodada 6, sem os caminhos absolutos com nome de usuário das rodadas 4 a 6. A fixture `roda-costura` fica fora, coberta pelo teste rápido de placa e barril. A `cascaPorPerfis` e o `enveloparNaChapa`/`embutirNoVao` (`envio/casca-por-perfis`, `envio/envelopar-e-embutir`) ficam fora, cobertos pela simetria da rede, pelo `rebaixoPorContorno` e pelo `conformarNaChapa`.

## Fora do resgate

O `envio/carro-quadrado-forma` é trabalho vivo de outra sessão, até 2026-11-24, com dois planos encerrados dentro do ramo e um terceiro ativo; muda `gaiola-por-rede.js`, que o plano G2 também muda. O `envio/carro-quadrado-v2` foi absorvido por ele. O `prova/mutacoes` guarda defeitos plantados para provar o CI, e o `referencias`, as imagens de referência fora da história da main; os dois existem de propósito.

## Fatia 1, 2026-11-26

O alternador, o radiador, o turbocompressor, o disco de embreagem e a junta do cabeçote voltaram do ramo com a categoria `veiculos` e passam no descrever da main, cada um só com um aviso de régua de malha. A junta levava 123 s porque a fusão dos triângulos da tampa em pedaços convexos (`procedural/nucleo/pedacos-convexos.js`) recomeçava a varredura do primeiro pedaço a cada fusão, um custo cúbico na chapa de 44 furos (41 s só nela). A fusão passou a olhar só os vizinhos por aresta, com o mesmo resultado provado contra a varredura antiga em `pedacos-convexos.test.mjs`; a chapa leva perto de 1 s. O retrato do acervo, com a main de antes e com a de agora, deu as 131 peças comparadas iguais. A pessoa confirmou em 2026-11-26 que as cinco continuam como aprovou em 2026-11-14 ("sim, continuam").

## Fatia 2, 2026-11-26

As seis automotivas sem aprovação e as três mesas voltaram com a categoria e passam no descrever da main. O crítico cego deu 9 à escrivaninha e ao amortecedor, 8 ao pistão, ao disco de freio, à biela e à vela, e 7 ao filtro de óleo, à mesa de jantar e à mesa de centro. Na mesa de centro as duas faixas de cada lado longo se encontravam em x = 0 e o `unir` as fundia; a receita ganhou `faixa_vao_meio` de 40 mm, e a segunda rodada deu 8. Na mesa de jantar o defeito não existia: as travessas longas já param na face de dentro dos pés, e o crítico leu a caixa da parte `saia` (1660 mm, das travessas curtas) como o comprimento das longas; o processo não teria pego isso sozinho, e o pacote do crítico com a caixa de cada corpo da parte vai ao backlog. No filtro, a faixa sob o rebordo é a tampa vista por baixo. Os facetados de acabamento (ombro do filtro, mola e pratos do amortecedor, rosca da vela, puxador) ficam em aberto. A pessoa aprovou as nove em 2026-11-26 ("Aprovo as nove, pode prosseguir").
