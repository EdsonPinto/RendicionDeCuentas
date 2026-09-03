import pandas as pd


def obtener_comparativa(
    df: pd.DataFrame,
    metadata: dict,
    modo: str,
    desde_a,
    hasta_a,
    ponente_a,
    tipo_a,
    desde_b,
    hasta_b,
    ponente_b,
    tipo_b,
    generar_reporte,
):
    col_ent = metadata.get("col_ent")
    col_ponente = metadata.get("col_ponente")

    def filtrar_df_por_criterios(desde, hasta, ponente, tipo):
        df_f = df.copy()

        if col_ent:
            if desde and desde.strip().lower() not in (
                "",
                "undefined",
                "null",
                "none",
            ):
                fecha_desde = pd.to_datetime(desde, errors="coerce")
                if pd.notna(fecha_desde):
                    df_f = df_f[df_f[col_ent] >= fecha_desde]

            if hasta and hasta.strip().lower() not in (
                "",
                "undefined",
                "null",
                "none",
            ):
                fecha_hasta = pd.to_datetime(hasta, errors="coerce")
                if pd.notna(fecha_hasta):
                    df_f = df_f[df_f[col_ent] <= fecha_hasta]

        if ponente and ponente != "General" and col_ponente:
            base_col = (
                df_f[col_ponente]
                .astype(str)
                .str.replace(
                    r"\s*\*?\s*cambio\s+ponente",
                    "",
                    case=False,
                    regex=True,
                )
                .str.strip()
                .str.lower()
            )

            target_base = ponente.strip().lower()

            if tipo == "principal":
                df_f = df_f[
                    (base_col == target_base)
                    & (
                        ~df_f[col_ponente]
                        .astype(str)
                        .str.contains(
                            r"cambio\s+ponente",
                            case=False,
                            regex=True,
                        )
                    )
                ]

            elif tipo == "cambio":
                df_f = df_f[
                    (base_col == target_base)
                    & (
                        df_f[col_ponente]
                        .astype(str)
                        .str.contains(
                            r"cambio\s+ponente",
                            case=False,
                            regex=True,
                        )
                    )
                ]

            else:
                df_f = df_f[base_col == target_base]

        return df_f

    df_a = filtrar_df_por_criterios(
        desde_a,
        hasta_a,
        ponente_a,
        tipo_a,
    )

    df_b = filtrar_df_por_criterios(
        desde_b,
        hasta_b,
        ponente_b,
        tipo_b,
    )

    rep_a = generar_reporte(df_a)
    rep_b = generar_reporte(df_b)

    def pct_change(val_a, val_b):
        if val_a == 0:
            return 100.0 if val_b > 0 else 0.0

        return round(
            ((val_b - val_a) / abs(val_a)) * 100,
            2,
        )

    met_a = rep_a["metricas"]
    met_b = rep_b["metricas"]

    variaciones = {
        "ingresos_pct": pct_change(
            met_a["ingresos_totales"],
            met_b["ingresos_totales"],
        ),
        "egresos_pct": pct_change(
            met_a["finalizados"],
            met_b["finalizados"],
        ),
        "activos_pct": pct_change(
            met_a["activos"],
            met_b["activos"],
        ),
        "eficiencia_diff": round(
            met_b["eficiencia"] - met_a["eficiencia"],
            2,
        ),
    }

    return {
        "modo": modo,
        "grupo_a": rep_a,
        "grupo_b": rep_b,
        "variaciones": variaciones,
    }
