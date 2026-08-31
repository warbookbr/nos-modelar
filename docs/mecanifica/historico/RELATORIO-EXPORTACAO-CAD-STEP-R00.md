# Relatório R00 — exportação CAD/STEP

**Estado:** concluído

**Data:** 2026-08-28

## Pergunta

Existe um kernel distribuível no Windows/Node do projeto capaz de construir um
sólido, escrever STEP e reler o resultado com medidas verificáveis?

## Candidatos

- `opencascade.js` 1.1.1: expõe escritor STEP, mas é um pacote de 2020 e seu
  carregador falhou no Node 24 por conflito entre `__dirname`, `__filename` e
  módulo ES. Não foi incorporado.
- FreeCAD: não está instalado no ambiente desta cópia; fica como verificador
  independente futuro, não como dependência invisível.
- `occt-wasm` 4.3.2: escolhido para o MVP após prova positiva. Licença declarada
  pelo pacote: `MIT OR Apache-2.0`; o WASM OCCT declara LGPL-2.1-only no README do
  pacote e essa obrigação permanece registrada para a distribuição.

## Prova executada

No diretório temporário `C:\tmp\mecanifica-step-r00`, sem alterar inicialmente
o projeto:

1. inicialização `OcctKernel` no Node;
2. criação de cubo de `20 × 30 × 40`;
3. exportação STEP direta;
4. reimportação do texto STEP;
5. conferência de um sólido, caixa e volume;
6. criação de documento XCAF com nome `corpo-teste`;
7. reimportação XCAF e conferência do nome;
8. costura de doze triângulos da malha de cubo;
9. exportação da forma costurada por XCAF.

Resultado observado:

```text
kernel: inicializa no Node 24.19.0
cubo direto: 1 sólido, volume 24000, caixa 20 x 30 x 40
cubo costurado: sólido válido, volume 24000
STEP costurado: ISO-10303-21, 23973 bytes
XCAF: nome corpo-teste preservado na reimportação
```

O Node 24 emite aviso de engine porque o projeto declara Node 20.19 ou 22.12;
isso não invalida a prova. A execução específica do projeto deve ser repetida
em Node 22 antes do fechamento R04.

## Decisão

R00 aprova `occt-wasm@4.3.2` como candidato de implementação para o backend
facetado. A dependência foi incorporada ao projeto somente depois da prova
isolada. O primeiro módulo usará `OcctKernel`, `sewAndSolidify`, validação de
forma e `XCAFDocument` para nomes.

## Limites confirmados

- o kernel não transforma automaticamente uma malha em cilindro analítico;
- o STEP facetado continuará contendo faces planas trianguladas;
- exportação de montagem e features paramétricas não foram provadas;
- tamanho e memória do WASM ainda precisam de medição com receita real;
- o verificador independente ainda não foi executado nesta máquina;
- o pacote ainda precisa de conferência final em Node 22 e no gate de licença.

## Próxima rodada

R01 fixa validação pura, identidade das partes, bordas, não-manifold,
orientação, unidade e tolerância. R02 termina a conversão das faces reais e a
impressão geométrica. R03 cria a CLI e a escrita atômica. A dependência não deve
ser atualizada nem substituída sem nova prova equivalente.
