import unicodedata


MAPEO_UNIFICADO = {
    "Nulidad y Restablecimiento": ["ACCION DE NULIDAD Y RESTABLECIMIENTO DEL DERECHO"],
    "Reparación Directa": ["ACCION DE REPARACION DIRECTA"],
    "Controversias Contractuales": ["ACCION CONTRACTUAL"],
    "Nulidad Electoral": ["ACCION DE NULIDAD CONTRA ACTOS ELECTORALES", "ELECTORALES"],
    "Nulidad Simple": [
        "ACCION DE NULIDAD",
        "ACCION DE NULIDAD Y SUSPENSION PROVISIONAL",
    ],
    "Tutela": ["ACCIONES DE TUTELA", "TUTELA"],
    "Popular": ["ACCIONES POPULARES", "ACCION POPULAR"],
    "Cumplimiento": ["ACCIONES DE CUMPLIMIENTO"],
    "Grupo": ["ACCION DE GRUPO"],
    "Ejecutivo": ["EJECUTIVO"],
    "Conciliación": ["CONCILIACION"],
    "Hábeas Corpus": ["HABEAS CORPUS", "HABEAS CORPUS (IMPUGNACION)"],
    "Repetición": ["ACCION DE REPETICION"],
    "Pérdida de Investidura": ["PERDIDA DE INVESTIDURA"],
    "Revisión de Acuerdos": ["REVISION DE ACUERDOS"],
    "Conflictos": ["CONFLICTO DE COMPETENCIA"],
    "Despachos": ["DESPACHOS COMISORIOS", "DESPACHO COMISORIO"],
    "Recursos de Insistencia": [
        "RECURSO DE INSISTENCIA",
        "INSISTENCIA",
        "RECURSOS DE INSISTENCIA",
    ],
    "Restitución de Inmueble": ["RESTITUCION DE INMUEBLE"],
    "Pago por Consignación": ["PAGO POR CONSIGNACION"],
    "Control de Constitucionalidad": ["CONTROL PREVIO DE CONSTITUCIONALIDAD"],
    "Peticiones": ["PETICIONES", "DERECHO DE PETICION"],
    "Control de Legalidad": ["CONTROL INMEDIATO DE LEGALIDAD"],
    "Nulidad por Inconstitucionalidad": ["ACCION DE NULIDAD POR INCONSTITUCIONALIDAD"],
    "Recurso de Revisión": ["RECURSO EXTRAORDINARIO DE REVISION", "ACCION DE REVISION"],
    "Incidente de Impedimento": [
        "INCIDENTE DE INPEDIMENTO",
        "INCIDENTE DE IMPEDIMENTO",
    ],
}

CATEGORIA_ORD = [
    "Nulidad y Restablecimiento",
    "Ejecutivo",
    "Reparación Directa",
    "Controversias Contractuales",
    "Nulidad Electoral",
    "Nulidad Simple",
    "Conciliación",
    "Repetición",
    "Pérdida de Investidura",
    "Revisión de Acuerdos",
    "Conflictos",
    "Despachos",
    "Recursos de Insistencia",
    "Restitución de Inmueble",
    "Pago por Consignación",
    "Recurso de Revisión",
    "Incidente de Impedimento",
    "SIN_CLASIFICAR",
]

CATEGORIA_CONST = [
    "Tutela",
    "Popular",
    "Hábeas Corpus",
    "Cumplimiento",
    "Grupo",
    "Control de Constitucionalidad",
    "Peticiones",
    "Control de Legalidad",
    "Nulidad por Inconstitucionalidad",
]


def normalizar(texto):
    if not isinstance(texto, str):
        return ""
    return (
        "".join(
            c
            for c in unicodedata.normalize("NFKD", texto)
            if not unicodedata.combining(c)
        )
        .strip()
        .upper()
    )


MAPEO_NORM = {k: set(normalizar(v) for v in vs) for k, vs in MAPEO_UNIFICADO.items()}


def aplicar_categorizacion(df, col_medio, mapeos_dinamicos=None):
    df["_medio_norm"] = df[col_medio].apply(normalizar)

    norm_a_cat = {
        v: k
        for k, vs in MAPEO_NORM.items()
        for v in vs
    }

    if mapeos_dinamicos:
        norm_a_cat.update(mapeos_dinamicos)

    df["_categoria"] = (
        df["_medio_norm"]
        .map(norm_a_cat)
        .fillna("SIN_CLASIFICAR")
    )

    const_set = set(
        v
        for k in CATEGORIA_CONST
        for v in MAPEO_NORM[k]
    )

    if mapeos_dinamicos:
        for texto_norm, cat in mapeos_dinamicos.items():
            if cat in CATEGORIA_CONST:
                const_set.add(texto_norm)

    df["_es_const"] = df["_medio_norm"].isin(const_set)

    return df
