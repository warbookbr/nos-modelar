# Rebaixo por contorno: o degrau, o sulco e a borda rebaixada num corpo

**Estado:** rascunho

**Território:** nenhum (aguarda aprovação)

**Responsável:** a definir; proposta: a IA da sessão da empilhadeira conduz e
mede, e a pessoa julga a forma por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-10.

## Problema observado

Na traseira da empilhadeira (`carcaca-traseira.esboco.mjs`) a borda em volta do
vão da grade é um degrau de 16 mm de fundo e uns 20 mm de largura, feito com um
segundo corpo inteiro de `lacosPelasVistas` com a ponta recuada 16 mm
(`capoRecuado`) e duas booleanas; sai com a aresta viva, e a leitura
(`leitura-traseira/rodada-01.json`) diz que na referência a borda do vão é
arredondada. Os cinco rebaixos do contrapeso são prismas ao longo de z com
fundo plano a 45 a 200 mm da borda da planta e aresta viva, e a mesma leitura
pede canto arredondado, degrau e moldura no rasgo e no nicho. A torre deixou a
carcaça devendo um rebaixo no painel, de x 305 a 405, y 810 a 910 e z 0 a -160
(`ATRITOS.md`, item 17). As frestas do furgão são vãos de 6 mm numa chapa com
espessura, com a borda dobrada 4 mm (`ATRITOS.md` do furgão, itens 8 e 9), e
atravessam a chapa. Nenhuma operação rebaixa a uma profundidade:
`aberturaPorContorno` atravessa, `friso` soma sólido e `subtrair` pede a
ferramenta desenhada à mão.

O `relevo` de um anel da `gaiolaPorEstacoes` já cobre o rebaixo com a abertura (o farol do sedã, com a lente como saída do anel, na receita de `modelar-carroceria.md`); só o rebaixo por contorno resolveria o de fundo fechado, como a maçaneta e a placa.

## Resultado

O ajudante `rebaixoPorContorno` devolve os passos que rebaixam, numa vista, a
região de um contorno, a faixa de largura dada em volta dele ou a faixa ao longo
de uma linha aberta, a uma profundidade ao longo da vista, com o fundo seguindo
a superfície e a borda no raio pedido; a borda do vão e os rebaixos da traseira
saem dele sem o corpo recuado. A técnica é a da traseira: o corpo menos (o
prisma menos a cópia do corpo transladada da profundidade); sai só a camada
vista, e a outra camada do corpo não muda, sem `sentido`.

## Filtro Agent-First

- `subtrair`, `arranja` (a cópia) e `extrusao` (o prisma): ENVOLVER no
  ajudante; a receita declara contorno, vista, profundidade e raio.
- `arredondarCostura`: USAR DIRETO no `subtrair` final, `'convexas'` na borda
  e `'concavas'` no fundo; se recusar a borda sobre a superfície subdividida,
  a correção é REFATORAR em `booleanas.js`, pedida ao plano de costuras.
- `aberturaPorContorno`: USAR DIRETO para o vão dentro da borda rebaixada, e
  só importar `quadroDaVista`, já exportado; dar `profundidade` a ela mudaria
  um contrato que o plano da abertura refaz: ADIAR.
- `friso` (soma sólido, não corta) e `vizinhancaDoVao`: ADIAR.

## Incluído

- `procedural/nucleo/rebaixo-por-contorno.js` e teste: `corpo`, `vista`,
  `contorno` (de `curva2d`), `profundidade`, `largura?`, `linha?` e `raio?`,
  com as recusas com a medida antes de emitir passo;
- `tools/fixtures/rebaixo-por-contorno/`, o corpo de prova sem domínio;
- a borda do vão e os rebaixos do contrapeso da traseira refeitos por ele.

## Excluído

- profundidade pela normal (no flanco a 45 graus sai 71% dela; vai à ficha);
- corte que atravessa e fresta em chapa fina, que já têm operação;
- operação registrada no núcleo e o custo da booleana do corpo inteiro.

## Gate de saída

1. No corpo de prova, a profundidade ao longo da vista em nove pontos do fundo
   fica a 0,5 mm da pedida, e com raio nenhuma aresta da borda passa de 30
   graus de diedro, contra os 90 da aresta viva de hoje.
2. Malha fechada, sem face degenerada pelas réguas de `reguas-de-malha/`; a
   mesma receita dá a mesma malha, e nenhuma peça existente muda.
3. Na traseira o `capoRecuado` sai, `silhueta:pedida` e `sobra:partes` ficam
   iguais fora da borda e dos rebaixos, e a pessoa aceita por imagem.
4. Ficha em `npm run capacidade`, testes e `npm run gates` verdes.

## Fatias

1. O caso que falha hoje: o corpo de prova com a borda feita como na traseira,
   medindo profundidade, diedro, faces e tempo, e `arredondarCostura` aplicado
   a ela, com o resultado; e se `arranja` copia um passo `subdivisao` (se não,
   o ajudante recebe a gaiola e emite a segunda subdivisão transladada).
2. O ajudante com rebaixo, faixa em volta e sulco, sem raio, com a malha igual
   à da técnica à mão no corpo de prova.
3. O raio pelo `arredondarCostura`, ou o pedido ao plano de costuras.
4. A traseira refeita, as medidas, a imagem à pessoa e o fechamento.

## Riscos e parada

Três fatos não foram medidos e a fatia 1 os mede: se `arredondarCostura`
arredonda a borda de um rebaixo numa superfície subdividida, se `arranja` copia
um passo `subdivisao`, e o tempo da booleana do corpo inteiro. Se
`arredondarCostura` não arredondar a borda e a correção cair em `booleanas.js`
com o plano de costuras ativo, o plano entrega o rebaixo sem raio e para a
fatia 3, com a peça de prova entregue a ele. Se a booleana do corpo inteiro
passar de 10 s por rebaixo na traseira (estimativa a confirmar na fatia 1),
para antes de recortar a vizinhança, que é do plano da abertura.

## O que precisa ser combinado antes de ativar

Os seis lugares de plano ativo estão ocupados: ativar pede que um feche ou que
a pessoa decida. A empilhadeira tem `procedural/pecas/empilhadeira/` e
`tools/modelar/capacidade.mjs`: este plano pediria a troca na traseira e a linha
da ficha, ou que a empilhadeira as faça na fatia 2 dela. O de costuras tem
`booleanas.js`, `uso-operacoes.js`, `nucleo.js` e `reguas-de-malha/`: este
plano usaria as réguas como estão, pediria o aviso do `subtrair` que não corta
(a fatia 3 dele), para recusar contorno fora do corpo, e, se a fatia 1 mostrar
recusa, a borda convexa do `arredondarCostura` sobre superfície subdividida. O
da abertura tem `abertura-por-contorno.js`: este plano só importa
`quadroDaVista` e pediria que a assinatura dela não mude.

## Fechamento

Preencher somente ao concluir ou cancelar.
