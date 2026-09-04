import pandas as pd

from services.clasificacion_service import CATEGORIA_CONST, CATEGORIA_ORD


def generar_reporte(df_base: pd.DataFrame, metadata: dict) -> dict:
    col_sal = metadata.get("col_sal")
    col_rad = metadata.get("col_rad")
    col_ent = metadata.get("col_ent")
    col_ponente = metadata.get("col_ponente")
    col_dem = metadata.get("col_dem")
    col_vigente = metadata.get("col_vigente")

    if not col_vigente or df_base.empty:
        return {
            "ing_ord": {"p": 0, "s": 0},
            "ing_const": {"p": 0, "s": 0},
            "egr_ord": {"p": 0, "s": 0},
            "egr_const": {"p": 0, "s": 0},
            "entidades": [],
            "metricas": {
                "ingresos_totales": len(df_base),
                "activos": 0,
                "finalizados": 0,
                "inconsistentes": 0,
                "eficiencia": 0,
                "lista_vigentes": [],
                "lista_inconsistentes": [],
            },
            "tablas": {"ord_1": [], "ord_2": [], "const_1": [], "const_2": []},
        }

    vig_raw = df_base[col_vigente].astype(str).str.strip().str.upper()
    es_activo = vig_raw.isin(["SI", "VIGENTE", "ACTIVO"])

    df_act = df_base[es_activo]
    df_inactivos = df_base[~es_activo]

    if col_sal:
        df_out = df_inactivos[df_inactivos[col_sal].notna()]
        df_inconsistentes = df_inactivos[df_inactivos[col_sal].isna()]
    else:
        df_out = df_inactivos
        df_inconsistentes = pd.DataFrame()

    def contar_p_s(mask_df: pd.DataFrame):
        if mask_df.empty:
            return 0, 0
        p = int(mask_df["_es_primera"].sum())
        return p, len(mask_df) - p

    i_c1, i_c2 = contar_p_s(df_base[df_base["_es_const"]])
    i_o1, i_o2 = contar_p_s(df_base[~df_base["_es_const"]])
    e_c1, e_c2 = contar_p_s(df_out[df_out["_es_const"]])
    e_o1, e_o2 = contar_p_s(df_out[~df_out["_es_const"]])

    lista_v = []
    if not df_act.empty and col_rad:
        df_act_calc = df_act.copy()
        if col_ent and col_ent in df_act_calc.columns:
            fechas_reparto = pd.to_datetime(df_act_calc[col_ent], errors="coerce")
            dias = (pd.Timestamp.now() - fechas_reparto).dt.days.fillna(-1).astype(int)
        else:
            dias = [-1] * len(df_act_calc)

        rads = df_act_calc[col_rad].fillna("S.D.").astype(str).values
        meds = df_act_calc[metadata["col_medio"]].fillna("S.D.").astype(str).values
        pons = (
            df_act_calc[col_ponente].fillna("S.D.").astype(str).values
            if col_ponente
            else ["S.D."] * len(df_act_calc)
        )
        dias_arr = dias.values if hasattr(dias, "values") else dias

        lista_v = [
            {
                "radicado": rads[i],
                "medio": meds[i],
                "ponente": pons[i],
                "dias": int(dias_arr[i]),
            }
            for i in range(len(df_act_calc))
        ]

    lista_inc = []
    if not df_inconsistentes.empty and col_rad:
        df_inc_calc = df_inconsistentes.copy()
        rads = df_inc_calc[col_rad].fillna("S.D.").astype(str).values
        meds = df_inc_calc[metadata["col_medio"]].fillna("S.D.").astype(str).values
        pons = (
            df_inc_calc[col_ponente].fillna("S.D.").astype(str).values
            if col_ponente
            else ["S.D."] * len(df_inc_calc)
        )

        lista_inc = [
            {
                "radicado": rads[i],
                "medio": meds[i],
                "ponente": pons[i],
                "dias": -1,
                "sin_salida": True,
            }
            for i in range(len(df_inc_calc))
        ]

    top_ent = df_base[col_dem].value_counts().to_dict() if col_dem else {}

    def obtener_tabla_ing_egr(categorias, df_in_f, df_out_f, es_primera):
        def contar(df_f):
            if df_f.empty:
                return {cat: 0 for cat in categorias}
            grp = (
                df_f[df_f["_categoria"].isin(set(categorias))]
                .groupby(["_categoria", "_es_primera"])
                .size()
            )
            return {cat: int(grp.get((cat, es_primera), 0)) for cat in categorias}

        ing = contar(df_in_f)
        egr = contar(df_out_f)
        return [
            {"medio": cat, "ingresos": ing[cat], "egresos": egr[cat]}
            for cat in categorias
        ]

    mask_base_ord = ~df_base["_es_const"]
    mask_base_const = df_base["_es_const"]

    return {
        "ing_ord": {"p": i_o1, "s": i_o2},
        "ing_const": {"p": i_c1, "s": i_c2},
        "egr_ord": {"p": e_o1, "s": e_o2},
        "egr_const": {"p": e_c1, "s": e_c2},
        "entidades": [
            {"nombre": str(n), "cantidad": int(v)} for n, v in top_ent.items()
        ],
        "metricas": {
            "ingresos_totales": len(df_base),
            "activos": len(df_act),
            "finalizados": len(df_out),
            "inconsistentes": len(df_inconsistentes),
            "eficiencia": (
                round(len(df_out) / len(df_base) * 100, 1) if len(df_base) > 0 else 0
            ),
            "lista_vigentes": lista_v,
            "lista_inconsistentes": lista_inc,
        },
        "tablas": {
            "ord_1": obtener_tabla_ing_egr(
                CATEGORIA_ORD,
                df_base[mask_base_ord],
                df_out[~df_out["_es_const"]],
                True,
            ),
            "ord_2": obtener_tabla_ing_egr(
                CATEGORIA_ORD,
                df_base[mask_base_ord],
                df_out[~df_out["_es_const"]],
                False,
            ),
            "const_1": obtener_tabla_ing_egr(
                CATEGORIA_CONST,
                df_base[mask_base_const],
                df_out[df_out["_es_const"]],
                True,
            ),
            "const_2": obtener_tabla_ing_egr(
                CATEGORIA_CONST,
                df_base[mask_base_const],
                df_out[df_out["_es_const"]],
                False,
            ),
        },
    }


def obtener_estadisticas(
    df: pd.DataFrame,
    metadata: dict,
    nombre_usuario: str,
    rol_usuario: str,
    desde: str = None,
    hasta: str = None,
):
    col_ent = metadata.get("col_ent")
    col_ponente = metadata.get("col_ponente")

    if desde and desde.strip().lower() not in ("", "undefined", "null", "none"):
        try:
            fecha_desde = pd.to_datetime(desde, errors="coerce")
            if pd.notna(fecha_desde) and col_ent:
                df = df[df[col_ent] >= fecha_desde]
        except Exception:
            pass

    if hasta and hasta.strip().lower() not in ("", "undefined", "null", "none"):
        try:
            fecha_hasta = pd.to_datetime(hasta, errors="coerce")
            if pd.notna(fecha_hasta) and col_ent:
                df = df[df[col_ent] <= fecha_hasta]
        except Exception:
            pass

    list_p = (
        sorted([str(p) for p in df[col_ponente].dropna().unique()])
        if col_ponente
        else []
    )

    return {
        "usuario": nombre_usuario,
        "rol": rol_usuario,
        "general": generar_reporte(df, metadata),
        "ponentes": {
            p: generar_reporte(df[df[col_ponente] == p], metadata) for p in list_p
        },
        "lista_ponentes": list_p,
    }
