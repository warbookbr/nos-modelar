"""Linha de comando do laboratório: passar o caso como parâmetro, sem editar Python.

O QUE ELA É E O QUE NÃO É. Ela é uma casca fina: lê números, chama `consulta` e
imprime JSON. Nenhuma decisão de física mora aqui, e nenhuma propriedade de
material também — se um comando quisesse aceitar `--resistencia`, ele estaria
deixando qualquer pessoa inventar um material sem fonte pela porta dos fundos.
Material se acrescenta no estudo, com procedência por propriedade.

Uso:
    python3 -m laboratorio.cli candidatos
    python3 -m laboratorio.cli avaliar bambu-colmo --diametro-mm 32
    python3 -m laboratorio.cli diametro-minimo pinus-comercial --forca 400
    python3 -m laboratorio.cli peneirar --massa-maxima 0.8
    python3 -m laboratorio.cli ensaio flexao --largura-mm 25 ...
"""
from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from . import consulta, ensaio
from .erros import ErroLaboratorio

MM = 1000.0


def _caso(args: argparse.Namespace) -> consulta.Caso:
    return consulta.Caso(
        forca_n=args.forca,
        comprimento_m=args.comprimento,
        massa_maxima_kg=args.massa_maxima,
        flecha_maxima_m=args.flecha_maxima,
        margem_alvo=args.margem,
        diametro_maximo_m=args.diametro_maximo_mm / MM,
    )


def _opcoes_de_caso(sub: argparse.ArgumentParser) -> None:
    padrao = consulta.Caso()
    sub.add_argument("--forca", type=float, default=padrao.forca_n,
                     help="carga de ponta, em newton")
    sub.add_argument("--comprimento", type=float, default=padrao.comprimento_m,
                     help="comprimento livre, em metro")
    sub.add_argument("--massa-maxima", type=float, default=padrao.massa_maxima_kg,
                     help="massa máxima da peça, em quilo")
    sub.add_argument("--flecha-maxima", type=float, default=padrao.flecha_maxima_m,
                     help="flecha máxima aceita, em metro")
    sub.add_argument("--margem", type=float, default=padrao.margem_alvo,
                     help="margem contra falha exigida")
    sub.add_argument("--diametro-maximo-mm", type=float,
                     default=padrao.diametro_maximo_m * MM,
                     help="limite de empunhadura, em milímetro")


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="laboratorio",
        description="Roda os candidatos curados do estudo em qualquer caso de projeto.")
    subs = p.add_subparsers(dest="comando", required=True)

    subs.add_parser("candidatos", help="lista os materiais com propriedade curada")

    proc = subs.add_parser("procedencia", help="de onde veio cada número de um material")
    proc.add_argument("material")

    av = subs.add_parser("avaliar", help="tensão, flecha, massa e margem de um candidato")
    av.add_argument("material")
    av.add_argument("--diametro-mm", type=float, default=None,
                    help="sem isto, usa o diâmetro do estudo")
    av.add_argument("--parede-mm", type=float, default=None,
                    help="só para quem existe como tubo")
    _opcoes_de_caso(av)

    dm = subs.add_parser("diametro-minimo",
                         help="o mais fino que cumpre a margem, exato e em milímetro")
    dm.add_argument("material")
    dm.add_argument("--parede-mm", type=float, default=None)
    _opcoes_de_caso(dm)

    pe = subs.add_parser("peneirar", help="quem está eliminado pelo piso físico do caso")
    pe.add_argument("--diametro-mm", type=float, default=None,
                    help="sem isto, usa o limite de empunhadura, que é o piso mais frouxo")
    _opcoes_de_caso(pe)

    en = subs.add_parser("ensaio", help="bancada virtual, sem material curado")
    ensubs = en.add_subparsers(dest="tipo", required=True)

    # AQUI a propriedade entra pela linha de comando, e é de propósito: a bancada
    # virtual existe para rodar um material HIPOTÉTICO, que ainda não tem fonte.
    # A diferença para os comandos de cima é que nada disto vira candidato nem
    # entra em comparação — sai marcado como simulado e morre na tela.
    fl = ensubs.add_parser("flexao", help="flexão em três pontos, material hipotético")
    fl.add_argument("--largura-mm", type=float, required=True)
    fl.add_argument("--altura-mm", type=float, required=True)
    fl.add_argument("--vao-mm", type=float, required=True)
    fl.add_argument("--forca", type=float, required=True)
    fl.add_argument("--modulo-gpa", type=float, required=True)
    fl.add_argument("--resistencia-mpa", type=float, required=True)

    tr = ensubs.add_parser("tracao", help="tração uniaxial, material hipotético")
    tr.add_argument("--area-mm2", type=float, required=True)
    tr.add_argument("--forca", type=float, required=True)
    tr.add_argument("--comprimento-mm", type=float, required=True)
    tr.add_argument("--modulo-gpa", type=float, required=True)
    tr.add_argument("--resistencia-mpa", type=float, required=True)

    es = ensubs.add_parser("escala", help="quanto a resistência cai quando a peça cresce")
    es.add_argument("--resistencia-mpa", type=float, required=True)
    es.add_argument("--volume-ensaio-cm3", type=float, required=True)
    es.add_argument("--volume-peca-cm3", type=float, required=True)
    es.add_argument("--modulo-de-weibull", type=float, required=True)
    es.add_argument("--material", default="não declarado")

    return p


def executar(argv: list[str] | None = None) -> dict[str, Any]:
    args = _parser().parse_args(argv)

    if args.comando == "candidatos":
        return {"candidatos": list(consulta.candidatos())}
    if args.comando == "procedencia":
        from .estudos.cabo_de_pa import procedencia
        return procedencia(args.material)
    if args.comando == "avaliar":
        return consulta.avaliar(
            args.material, caso=_caso(args),
            diametro_m=None if args.diametro_mm is None else args.diametro_mm / MM,
            parede_m=None if args.parede_mm is None else args.parede_mm / MM)
    if args.comando == "diametro-minimo":
        return consulta.diametro_minimo(
            args.material, caso=_caso(args),
            parede_m=None if args.parede_mm is None else args.parede_mm / MM)
    if args.comando == "peneirar":
        return consulta.peneirar(
            caso=_caso(args),
            diametro_m=None if args.diametro_mm is None else args.diametro_mm / MM)
    if args.comando == "ensaio":
        if args.tipo == "flexao":
            return ensaio.flexao_tres_pontos(
                largura_m=args.largura_mm / MM, altura_m=args.altura_mm / MM,
                vao_m=args.vao_mm / MM, forca_n=args.forca,
                modulo_pa=args.modulo_gpa * 1e9,
                resistencia_pa=args.resistencia_mpa * 1e6)
        if args.tipo == "tracao":
            return ensaio.tracao(
                area_m2=args.area_mm2 / MM ** 2, forca_n=args.forca,
                comprimento_m=args.comprimento_mm / MM,
                modulo_pa=args.modulo_gpa * 1e9,
                resistencia_pa=args.resistencia_mpa * 1e6)
        return ensaio.efeito_de_escala(
            resistencia_pa=args.resistencia_mpa * 1e6,
            volume_do_ensaio_m3=args.volume_ensaio_cm3 / 1e6,
            volume_da_peca_m3=args.volume_peca_cm3 / 1e6,
            modulo_de_weibull=args.modulo_de_weibull, material=args.material)
    raise AssertionError(f"comando sem rota: {args.comando}")


def main(argv: list[str] | None = None) -> int:
    """Erro do laboratório sai como JSON e código 1 — não como pilha de Python.

    Quem chama a casca de fora precisa poder LER a recusa, e uma pilha de Python
    não é contrato. O erro já carrega categoria, código e ação sugerida; aqui ele
    só troca de canal.
    """
    try:
        print(json.dumps(executar(argv), ensure_ascii=False, indent=2, default=str))
    except ErroLaboratorio as erro:
        print(json.dumps({"erro": erro.para_dict()}, ensure_ascii=False, indent=2),
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
