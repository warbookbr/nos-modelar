"""Revisor de documento: caça número sem rastro e conclusão apoiada em número sem fonte.

O BURACO QUE ELE FECHA. O laboratório já recusa PROPRIEDADE sem fonte: nenhum
material carrega desde que `_conferir_fontes` existe. Mas ele não olhava para o
outro lado da ponte — o DOCUMENTO. O dossiê é escrito à mão a partir da saída do
estudo, e todo número que passa por uma mão pode chegar lá sem origem: um valor
lembrado, um arredondamento que virou outro número, uma conta refeita de cabeça.

Nada disso aparece como erro. Aparece como frase bem escrita.

O QUE ELE SABE FAZER, e é pouco de propósito:

1. Junta TODO número que o estudo consegue produzir — propriedade, dispersão,
   constante declarada e resultado calculado de cada candidato — e confere cada
   número do documento contra esse conjunto. O que não bate com nada é NÃO
   RASTREADO, e não "errado": o revisor não sabe se a frase está certa, sabe que
   não achou de onde o número veio.

2. Confere se propriedade que NENHUMA fonte mediu aparece no documento sem a
   ressalva que o próprio estudo declara. Este é o caso que já aconteceu duas
   vezes aqui: amortecimento e preço entraram em conclusão como se fossem dado.

O QUE ELE NÃO SABE FAZER. Ler. Ele não julga se a frase conclui certo a partir do
número certo — isso continua sendo trabalho de quem revisa. Ele só garante que
nenhum número chegue ao documento sem poder dizer de onde veio.

A LISTA DE EXCEÇÕES EXIGE MOTIVO ESCRITO. Número que vem de fora do estudo é
legítimo — diâmetro de catálogo de fornecedor, ano de artigo, número de página.
Sem obrigar um motivo, a lista viraria o lugar onde tudo o que incomoda vai
morar, e o revisor viraria enfeite.
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any, Iterable

from .erros import falhar
from .estudos import cabo_de_pa as estudo

INSTRUMENTO = "revisor"
VERSAO = "1.0.0"

#: Quanto um número do documento pode diferir do número do estudo e ainda ser
#: considerado o mesmo. Texto arredonda, e cobrar igualdade exata encheria o
#: relatório de ruído — mas folga demais faz o conjunto conhecido cobrir a reta
#: inteira, e aí o revisor aprova qualquer coisa. Ver `poder_de_deteccao`.
TOLERANCIA = 0.001

#: A UNIDADE ESCRITA AO LADO DO NÚMERO É O QUE SALVA ESTE REVISOR.
#:
#: A primeira versão comparava cada número do texto contra TODO valor do estudo
#: em nove escalas. O conjunto ficou com 8 mil valores espalhados por ordens de
#: grandeza, e a medição foi impiedosa: de 2000 números inventados ao acaso, ele
#: acusava 172. Passavam 91%. Um gate que aprova nove de cada dez invenções não
#: protege nada — ele só faz parecer que protege, que é pior do que não existir.
#:
#: A correção é não comparar número solto com número solto. "37 mm" só se compara
#: com comprimento; "112 MPa" só com pressão. Fora de dimensão, número parecido
#: deixa de ser desculpa.
UNIDADES = {
    "mm": ("comprimento", 1e-3), "cm": ("comprimento", 1e-2),
    "m": ("comprimento", 1.0),
    "kg": ("massa", 1.0), "g": ("massa", 1e-3),
    "mpa": ("pressao", 1e6), "gpa": ("pressao", 1e9), "pa": ("pressao", 1.0),
    "hz": ("frequencia", 1.0),
    "%": ("fracao", 1e-2),
    "r$": ("dinheiro", 1.0),
    "kg/m³": ("densidade", 1.0), "kg/m3": ("densidade", 1.0),
}

#: Número pequeno e inteiro é numeração de seção, item de lista, contagem de
#: linha. Rastrear isso não protege nada e afogaria o que importa.
INTEIRO_IGNORADO_ATE = 30

RAIZ = Path(__file__).resolve().parents[3]
EXCECOES = Path(__file__).resolve().parents[2] / "dados" / "revisor-excecoes.json"

#: Número SEM unidade escrita — razão, margem, nota, contagem. Ele não tem
#: dimensão para restringir a busca, então continua sendo comparado solto, e o
#: revisor é fraco justamente aí. Isso está medido e declarado, não escondido.
SEM_UNIDADE = "sem-unidade"

NUMERO = re.compile(r"(?<![\w.])(\d{1,3}(?:[. ]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?![\w])")

#: Onde o revisor não entra, e cada motivo é estrutural e não conveniência.
#: Referência bibliográfica é ano, volume, página e DOI — números de fora por
#: definição, e conferi-los contra o estudo seria erro de categoria.
SECOES_IGNORADAS = ("## 14. Literatura",)


#: Como o nome do campo revela a dimensão. O repositório já escreve `_pa`, `_kg`,
#: `_m` e `_hz` com rigor, então a informação existe — ela só não estava sendo
#: usada. Campo sem sufixo reconhecido cai em SEM_UNIDADE, que é o balde fraco.
SUFIXOS = (
    ("_kg_m3", "densidade"), ("_m3", "volume"), ("_m2", "area"),
    ("_pa", "pressao"), ("_kg", "massa"), ("_hz", "frequencia"), ("_m", "comprimento"),
)
PREFIXOS = (("preco", "dinheiro"), ("custo", "dinheiro"))


def _dimensao_do_campo(nome: str) -> str:
    baixo = nome.lower()
    for prefixo, dimensao in PREFIXOS:
        if baixo.startswith(prefixo):
            return dimensao
    for sufixo, dimensao in SUFIXOS:
        if baixo.endswith(sufixo):
            return dimensao
    return SEM_UNIDADE


def _achatar(valor: Any, dimensao: str = SEM_UNIDADE):
    """Todo número de uma estrutura, carregando a dimensão que o nome do campo diz."""
    if isinstance(valor, bool):
        return
    if isinstance(valor, (int, float)):
        if math.isfinite(valor):
            yield dimensao, float(valor)
    elif isinstance(valor, dict):
        for chave, item in valor.items():
            filho = _dimensao_do_campo(str(chave))
            yield from _achatar(item, filho if filho != SEM_UNIDADE else dimensao)
    elif isinstance(valor, (list, tuple, set, frozenset)):
        for item in valor:
            yield from _achatar(item, dimensao)


def numeros_do_estudo() -> dict[str, frozenset[float]]:
    """Todo número que o estudo produz, separado por dimensão.

    Inclui o calculado, e não só o tabelado: margem, massa, custo e flecha de cada
    candidato nascem aqui, e é justamente esse tipo de número que chega ao
    documento pela memória de quem escreve.
    """
    fonte: list[Any] = [estudo.MATERIAIS, estudo.GEOMETRIAS, estudo.CORPOS_DE_PROVA,
                        estudo.CANDIDATOS_INCOMPLETOS, estudo.SELECAO_DE_LOTE]
    for nome, valor in vars(estudo).items():
        if nome.isupper() and isinstance(valor, (int, float, dict, list, tuple)):
            fonte.append({nome: valor})
    for nome in estudo.MATERIAIS:
        fonte.append(estudo.medir(nome))
    for chamada in (estudo.comparar, estudo.recomendar, estudo.avaliar_variantes,
                    estudo.comparar_preparo_da_materia_prima):
        try:
            fonte.append(chamada())
        except Exception:  # noqa: BLE001 — instrumento indisponível não invalida a revisão
            continue

    por_dimensao: dict[str, set[float]] = {}
    for dimensao, valor in _achatar(fonte):
        por_dimensao.setdefault(dimensao, set()).add(valor)

    # O documento diz quanto DISSIPA onde o estudo diz quanto SOBRA: mesma medida,
    # lida do outro lado. Só vale para número adimensional entre 0 e 1.
    fracoes = {v for v in por_dimensao.get(SEM_UNIDADE, set()) if 0.0 <= v <= 1.0}
    por_dimensao.setdefault("fracao", set()).update(fracoes | {1.0 - v for v in fracoes})

    # GEOMETRIAS guarda diâmetro e parede em tuplas sem nome: a dimensão existe
    # na cabeça de quem escreveu e não no campo, então entra à mão.
    for tipo, diametro, parede in estudo.GEOMETRIAS.values():
        por_dimensao.setdefault("comprimento", set()).add(diametro)
        if parede is not None:
            por_dimensao["comprimento"].add(parede)

    for nome, material in estudo.MATERIAIS.items():
        densidade = material["densidade_kg_m3"]
        escala = estudo.fator_de_escala(nome, 1.0)["fator"]
        por_dimensao.setdefault("resistencia-especifica", set()).update(
            {material["resistencia_pa"] / densidade,
             material["resistencia_pa"] * escala / densidade})
        por_dimensao.setdefault("rigidez-especifica", set()).add(
            material["modulo_pa"] / densidade)

    razoes = _comparacoes_com_a_referencia()
    por_dimensao.setdefault("fracao", set()).update(razoes)
    por_dimensao.setdefault(SEM_UNIDADE, set()).update(razoes)
    return {chave: frozenset(valores) for chave, valores in por_dimensao.items()}


def _comparacoes_com_a_referencia() -> set[float]:
    """"43% mais leve que o eucalipto" é conta do documento, não saída do estudo.

    O DOSSIÊ COMPARA, e comparar produz número que nenhuma tabela contém. Aceitar
    qualquer razão entre dois números conhecidos resolveria isso e destruiria o
    revisor junto: com milhares de valores, toda diferença acharia par e nada mais
    seria acusado.

    Então só esta família entra, que é a única que o documento usa: cada candidato
    contra o candidato de REFERÊNCIA, campo a campo. É pequena, é nomeável, e
    comparação de outro tipo continua precisando de motivo escrito.
    """
    referencia = estudo.medir(estudo.REFERENCIA)
    derivados: set[float] = set()
    for nome in estudo.MATERIAIS:
        medida = estudo.medir(nome)
        for campo, valor in medida.items():
            base = referencia.get(campo)
            if not isinstance(valor, (int, float)) or isinstance(valor, bool):
                continue
            if not isinstance(base, (int, float)) or isinstance(base, bool) or base == 0:
                continue
            razao = valor / base
            derivados.update({razao, razao - 1, 1 - razao})
    return derivados


def _corpo_conferivel(texto: str) -> list[tuple[int, str]]:
    """As linhas que fazem AFIRMAÇÃO, separadas das que fazem referência."""
    linhas = []
    ignorando = False
    for indice, linha in enumerate(texto.split("\n"), start=1):
        if linha.startswith("## "):
            ignorando = any(linha.startswith(s) for s in SECOES_IGNORADAS)
        if ignorando:
            continue
        # Linha com endereço é citação: o número dentro dela é de quem publicou.
        if "http://" in linha or "https://" in linha or "doi.org" in linha:
            continue
        linhas.append((indice, linha))
    return linhas


#: A unidade colada no número, ou logo depois dele. `37 mm`, `0,90 kg`, `31%`,
#: `R$ 3,09`. Sem isto o número volta a ser solto e o revisor volta a ser fraco.
UNIDADE_DEPOIS = re.compile(r"^\s*(kg/m³|kg/m3|mm|cm|m|kg|g|MPa|GPa|Pa|Hz)\b|^(%)",
                            re.IGNORECASE)
UNIDADE_NA_CELULA = re.compile(r"\b(kg/m³|kg/m3|mm|cm|kg|MPa|GPa|Hz)\b", re.IGNORECASE)
MOEDA_ANTES = re.compile(r"R\$\s*$", re.IGNORECASE)


def _dimensao_escrita(linha: str, inicio: int, fim: int,
                      cabecalho: str = SEM_UNIDADE) -> tuple[str, float]:
    """A dimensão que o texto declara ao lado do número, e o fator para o SI."""
    if MOEDA_ANTES.search(linha[:inicio]):
        return "dinheiro", 1.0
    # A unidade pode estar colada no número, ou mais adiante NA MESMA CÉLULA:
    # "32 × 6.0 mm" diz milímetro uma vez para os dois números. Procurar na linha
    # inteira pegaria a unidade da célula vizinha, que é outro assunto.
    resto = linha[fim:].split("|", 1)[0]
    depois = UNIDADE_DEPOIS.match(resto) or UNIDADE_NA_CELULA.search(resto)
    if depois is not None:
        achado = next(g for g in depois.groups() if g)
        return UNIDADES[achado.lower()]
    return cabecalho, 1.0


#: 210.526 em pt-BR é duzentos e dez mil, não duzentos e dez vírgula cinco. Ler
#: errado transformaria um número correto do estudo em "sem rastro", e o revisor
#: acusaria a própria formatação do documento.
MILHAR = re.compile(r"^\d{1,3}(?:[. ]\d{3})+$")


def _em_ponto_decimal(cru: str) -> str:
    if MILHAR.match(cru):
        return cru.replace(".", "").replace(" ", "")
    if "," in cru:
        return cru.replace(" ", "").replace(".", "").replace(",", ".")
    return cru


#: Cabeçalho de tabela carrega a unidade que a célula omite. "custo" é dinheiro,
#: "massa" é massa, "dissipa" é fração — sem isto, toda tabela do dossiê vira
#: número solto, e é em tabela que este documento diz quase tudo.
CABECALHO_DIMENSAO = (
    ("custo", "dinheiro"), ("preço", "dinheiro"), ("preco", "dinheiro"),
    ("massa", "massa"), ("densidade", "densidade"), ("geometria", "comprimento"),
    ("diâmetro", "comprimento"), ("diametro", "comprimento"),
    ("dissipa", "fracao"), ("vs.", "fracao"), ("σ/ρ", "resistencia-especifica"),
    ("e/ρ", "rigidez-especifica"), ("mor", "pressao"), ("resistência", "pressao"),
)


def _dimensoes_das_colunas(linha: str) -> list[str]:
    return [next((d for termo, d in CABECALHO_DIMENSAO if termo in celula.lower()),
                 SEM_UNIDADE)
            for celula in linha.split("|")]


def _coluna(linha: str, posicao: int) -> int:
    return linha[:posicao].count("|")


def _numeros_do_texto(texto: str) -> list[dict[str, Any]]:
    achados = []
    #: A dimensão vale enquanto a tabela durar. O cabeçalho é a primeira linha de
    #: tubo sem dígito; a tabela acaba na primeira linha que não é de tubo.
    #: O cabeçalho é a linha ANTERIOR à de separação — é a única regra que o
    #: Markdown garante. Tentar reconhecê-lo por "linha sem dígito" falha no
    #: primeiro cabeçalho que diga "p05", e falhava.
    colunas: list[str] = []
    anterior = ""
    for indice, linha in _corpo_conferivel(texto):
        if not linha.lstrip().startswith("|"):
            colunas = []
        elif set(linha.strip()) <= set("|-: "):
            colunas = _dimensoes_das_colunas(anterior)
        anterior = linha
        # Bloco de código é comando, não afirmação: o que ele contém já é
        # conferível rodando-o, e é onde moram os exemplos de uso.
        if linha.lstrip().startswith(("```", "npm run")):
            continue
        for ocorrencia in NUMERO.finditer(linha):
            cru = ocorrencia.group(1)
            normalizado = _em_ponto_decimal(cru)
            try:
                valor = float(normalizado)
            except ValueError:
                continue
            do_cabecalho = (colunas[_coluna(linha, ocorrencia.start(1))]
                            if colunas and _coluna(linha, ocorrencia.start(1)) < len(colunas)
                            else SEM_UNIDADE)
            dimensao, fator = _dimensao_escrita(linha, ocorrencia.start(1),
                                                ocorrencia.end(1), do_cabecalho)
            achados.append({"linha": indice, "escrito": cru, "valor": valor,
                            "dimensao": dimensao, "emSI": valor * fator,
                            "fator": fator})
    return achados


def _casas(escrito: str) -> int:
    """Quantas casas decimais o documento escreveu."""
    if "," in escrito:
        return len(escrito.rsplit(",", 1)[1])
    if MILHAR.match(escrito):
        return 0
    return len(escrito.rsplit(".", 1)[1]) if "." in escrito else 0


def _bate(valor: float, conhecidos: frozenset[float], escrito: str | None = None,
          fator: float = 1.0) -> bool:
    """Confere na PRECISÃO EM QUE O DOCUMENTO ESCREVEU, e não numa folga fixa.

    "1,77" no texto é o intervalo [1,765; 1,775] — quem escreveu arredondou, e
    cobrar mais do que isso acusaria o arredondamento como invenção. Já "1,7719"
    aperta sozinho. Uma folga fixa erra dos dois lados: some com número curto e
    perdoa demais número longo.
    """
    if valor == 0:
        return True
    if escrito is None:
        janela = abs(valor) * TOLERANCIA
    else:
        janela = 0.5 * (10 ** -_casas(escrito)) * abs(fator)
    return any(abs(candidato - valor) <= janela for candidato in conhecidos)


def poder_de_deteccao(amostras: int = 2000, semente: int = 7) -> dict[str, Any]:
    """Quantos números inventados este revisor acusaria — medido, não afirmado.

    UM GATE PRECISA DIZER O QUANTO ELE PEGA. Sem esta medida, "o revisor aprovou"
    não quer dizer nada, e a primeira versão deste arquivo provou por quê: ela
    deixava passar 91% dos números aleatórios e ainda assim devolvia "aprovado".
    """
    import random

    aleatorio = random.Random(semente)
    conhecidos = numeros_do_estudo()
    por_dimensao = {}
    for dimensao, valores in conhecidos.items():
        if not valores:
            continue
        menor, maior = min(v for v in valores if v > 0), max(valores)
        pegos = 0
        for _ in range(amostras):
            # Sorteia na faixa em que os números daquela dimensão de fato vivem —
            # sortear longe seria fácil demais e inflaria o resultado.
            falso = math.exp(aleatorio.uniform(math.log(menor), math.log(maior)))
            if not _bate(falso, valores):
                pegos += 1
        por_dimensao[dimensao] = {"conhecidos": len(valores), "detectados": pegos / amostras}
    return {
        "instrumento": INSTRUMENTO,
        "versao": VERSAO,
        "porDimensao": por_dimensao,
        "leiaAssim": ("fração de números inventados que o revisor acusaria, por "
                      "dimensão; SEM_UNIDADE é o balde fraco e é onde ele menos "
                      "protege"),
    }


def carregar_excecoes() -> dict[str, str]:
    """Número de fora do estudo, cada um com o motivo escrito por extenso."""
    if not EXCECOES.exists():
        return {}
    dados = json.loads(EXCECOES.read_text(encoding="utf-8"))
    for chave, motivo in dados.items():
        if not isinstance(motivo, str) or len(motivo.strip()) < 15:
            raise falhar(
                "contrato", "excecao-sem-motivo",
                f"'{chave}' está na lista de exceções sem motivo escrito.",
                local=str(EXCECOES),
                acaoSugerida="Sem obrigar motivo, a lista vira o lugar onde tudo o "
                             "que incomoda vai morar.",
            )
    return dados


def _nome_curto(documento: Path) -> str:
    """Caminho relativo à raiz quando ele estiver dentro dela; absoluto quando não."""
    try:
        return str(documento.relative_to(RAIZ))
    except ValueError:
        return str(documento)


def numeros_sem_rastro(caminho: str | Path) -> dict[str, Any]:
    """Números do documento que o estudo não consegue produzir nem explicar."""
    documento = Path(caminho)
    if not documento.exists():
        raise falhar("contrato", "documento-ausente", f"'{documento}'.", local="caminho")
    conhecidos = numeros_do_estudo()
    excecoes = carregar_excecoes()
    sem_rastro = []
    for achado in _numeros_do_texto(documento.read_text(encoding="utf-8")):
        if float(achado["valor"]).is_integer() and abs(achado["valor"]) <= INTEIRO_IGNORADO_ATE:
            continue
        if achado["escrito"] in excecoes:
            continue
        candidatos = conhecidos.get(achado["dimensao"], frozenset())
        if achado["dimensao"] == SEM_UNIDADE:
            # Sem dimensão declarada não há como restringir: o número é comparado
            # contra tudo, e é aqui que o revisor é fraco. Está medido.
            candidatos = frozenset().union(*conhecidos.values()) if conhecidos else frozenset()
        if _bate(achado["emSI"], candidatos, achado["escrito"], achado["fator"]):
            continue
        sem_rastro.append(achado)
    return {
        "instrumento": INSTRUMENTO,
        "versao": VERSAO,
        "documento": _nome_curto(documento),
        "semRastro": tuple(sem_rastro),
        "leiaAssim": ("NÃO RASTREADO não quer dizer errado: quer dizer que o revisor "
                      "não achou de onde o número veio. Ou ele vem do estudo e a "
                      "conta mudou, ou vem de fora e precisa de motivo escrito."),
    }


def propriedades_sem_fonte_no_documento(caminho: str | Path) -> dict[str, Any]:
    """Propriedade que NENHUMA fonte mediu, e se o documento avisa disso.

    O caso que já aconteceu duas vezes aqui: amortecimento e preço entraram em
    conclusão com cara de dado. O rótulo de fonte do MATERIAL cobria visualmente
    propriedades que a fonte nunca mediu.
    """
    documento = Path(caminho)
    if not documento.exists():
        raise falhar("contrato", "documento-ausente", f"'{documento}'.", local="caminho")
    texto = documento.read_text(encoding="utf-8").lower()

    # BASTA UM MATERIAL SEM FONTE para a coluna inteira ficar suspeita no
    # documento. Exigir que TODOS fossem de memória era um critério que nunca
    # dispara: o dossiê compara materiais lado a lado, e a linha medida empresta
    # credibilidade à linha lembrada só por estar na mesma tabela.
    sem_fonte = {}
    for propriedade in estudo.PROPRIEDADES_COM_FONTE:
        de_memoria = tuple(m for m in estudo.MATERIAIS
                           if estudo.FONTES_POR_PROPRIEDADE[m][propriedade] == estudo.MEMORIA)
        if de_memoria:
            sem_fonte[propriedade] = de_memoria
    sem_fonte_em_nenhum = tuple(sem_fonte)

    #: Como cada propriedade é chamada em português no documento, e que palavra
    #: prova que a ressalva está escrita. A ressalva tem de estar no MESMO
    #: documento: quem lê o dossiê não vai abrir o código para descobrir.
    COMO_APARECE = {
        "fator_de_perda": (("amortec", "vibraç", "absorç"), ("nenhuma fonte", "não mediu",
                                                             "nao mediu", "não medido")),
        "preco_por_kg": (("preço", "custo", "r$"), ("inventad", "não é cotação",
                                                    "nao e cotacao", "sem cotação")),
        "modulo_pa": (("rigidez", "módulo"), ("de memória", "nao conferido",
                                              "não conferido")),
        "densidade_kg_m3": (("densidade",), ("de memória", "não conferido")),
        "resistencia_pa": (("resistência", "ruptura"), ("de memória", "não conferido")),
    }

    faltando = []
    for propriedade in sem_fonte_em_nenhum:
        termos, ressalvas = COMO_APARECE[propriedade]
        usada = any(termo in texto for termo in termos)
        avisada = any(ressalva in texto for ressalva in ressalvas)
        if usada and not avisada:
            faltando.append({"propriedade": propriedade, "termosNoTexto": termos,
                             "ressalvaEsperada": ressalvas})
    return {
        "instrumento": INSTRUMENTO,
        "versao": VERSAO,
        "documento": str(documento),
        "semFonteEmAlgumMaterial": sem_fonte,
        "usadasSemRessalva": tuple(faltando),
        "leiaAssim": ("propriedade que nenhuma fonte mediu pode aparecer no "
                      "documento; o que não pode é aparecer sem a ressalva, porque "
                      "aí ela lê como dado"),
    }


def revisar(caminho: str | Path) -> dict[str, Any]:
    """As duas conferências juntas, com o veredito que um gate pode usar.

    O VEREDITO NÃO COBRE AS DUAS. Só a segunda conferência entra em `aprovado`, e
    a razão é medida: a caça a número sem rastro ainda deixa dezenas de achados
    por triar num documento correto, entre nome de liga (aço 1020, alumínio 6061),
    catálogo de fornecedor e valor citado de artigo. Reprovar por isso ensinaria a
    ignorar o relatório, e um gate ignorado é pior que gate nenhum — ele dá a
    sensação de proteção sem a proteção.

    Então: a conferência precisa REPROVA, a barulhenta RELATA. Quando a lista de
    exceções estiver escrita com motivo para cada número de fora, a segunda pode
    passar a reprovar também.
    """
    rastro = numeros_sem_rastro(caminho)
    fontes = propriedades_sem_fonte_no_documento(caminho)
    return {
        "instrumento": INSTRUMENTO,
        "versao": VERSAO,
        "documento": rastro["documento"],
        "numerosSemRastro": rastro["semRastro"],
        "propriedadesUsadasSemRessalva": fontes["usadasSemRessalva"],
        "aprovado": not fontes["usadasSemRessalva"],
        "relataSemReprovar": ("numerosSemRastro", ),
        "leiaAssim": ("aprovado quer dizer que toda propriedade sem fonte está "
                      "avisada no documento; NÃO quer dizer que todo número tem "
                      "origem, e nem que o documento conclui certo"),
    }
