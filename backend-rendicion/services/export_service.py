import io
from datetime import datetime

import pandas as pd


def generar_excel_exportacion(
    df: pd.DataFrame,
    metadata: dict,
    desde: str = None,
    hasta: str = None,
    ponente: str = None,
):
    col_ent = metadata.get("col_ent")
    col_ponente = metadata.get("col_ponente")

    if col_ent:
        try:
            if desde and desde not in ("undefined", "null", "none", ""):
                fecha_desde = pd.to_datetime(desde, errors="coerce")
                if pd.notna(fecha_desde):
                    df = df[df[col_ent] >= fecha_desde]
        except Exception:
            pass

    if col_ent:
        try:
            if hasta and hasta not in ("undefined", "null", "none", ""):
                fecha_hasta = pd.to_datetime(hasta, errors="coerce")
                if pd.notna(fecha_hasta):
                    df = df[df[col_ent] <= fecha_hasta]
        except Exception:
            pass

    if ponente and ponente != "General" and col_ponente:
        df = df[df[col_ponente] == ponente]

    cols_a_enviar = [c for c in df.columns if not str(c).startswith("_")]
    df_publico = df[cols_a_enviar]
    output = io.BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df_publico.to_excel(writer, index=False, sheet_name="Datos_Rendicion_Filtrados")

    output.seek(0)
    filename = f"reporte_{ponente or 'General'}_" f"{datetime.now().strftime('%Y%m%d')}.xlsx"
    return output, filename


def generar_excel_comparativa(
    df_a: pd.DataFrame,
    df_b: pd.DataFrame,
    resumen_a: dict,
    resumen_b: dict,
    variaciones: dict,
    diferencias: dict,
    descripcion_a: str = "Selección A",
    descripcion_b: str = "Selección B",
):
    met_a = resumen_a.get("metricas", {})
    met_b = resumen_b.get("metricas", {})

    filas_resumen = [
        {
            "Métrica": "Ingresos Totales",
            "Selección A": met_a.get("ingresos_totales", 0),
            "Selección B": met_b.get("ingresos_totales", 0),
            "Diferencia (B-A)": diferencias.get("ingresos", 0),
            "Variación %": variaciones.get("ingresos_pct", 0),
        },
        {
            "Métrica": "Egresos (Finalizados)",
            "Selección A": met_a.get("finalizados", 0),
            "Selección B": met_b.get("finalizados", 0),
            "Diferencia (B-A)": diferencias.get("egresos", 0),
            "Variación %": variaciones.get("egresos_pct", 0),
        },
        {
            "Métrica": "Procesos Activos",
            "Selección A": met_a.get("activos", 0),
            "Selección B": met_b.get("activos", 0),
            "Diferencia (B-A)": diferencias.get("activos", 0),
            "Variación %": variaciones.get("activos_pct", 0),
        },
        {
            "Métrica": "Procesos Sin Salida",
            "Selección A": met_a.get("inconsistentes", 0),
            "Selección B": met_b.get("inconsistentes", 0),
            "Diferencia (B-A)": diferencias.get("sin_salida", 0),
            "Variación %": variaciones.get("sin_salida_pct", 0),
        },
        {
            "Métrica": "Eficiencia Procesal (%)",
            "Selección A": met_a.get("eficiencia", 0),
            "Selección B": met_b.get("eficiencia", 0),
            "Diferencia (B-A)": variaciones.get("eficiencia_diff", 0),
            "Variación %": "-",
        },
    ]
    df_resumen = pd.DataFrame(filas_resumen)

    def limpiar(df_in):
        cols = [c for c in df_in.columns if not str(c).startswith("_")]
        return df_in[cols]

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df_resumen.to_excel(writer, index=False, sheet_name="Resumen Comparativo", startrow=3)
        ws_resumen = writer.sheets["Resumen Comparativo"]
        ws_resumen["A1"] = f"Comparativa generada: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        ws_resumen["A2"] = descripcion_a
        ws_resumen["A3"] = descripcion_b

        limpiar(df_a).to_excel(writer, index=False, sheet_name="Selección A")
        limpiar(df_b).to_excel(writer, index=False, sheet_name="Selección B")

    output.seek(0)
    filename = f"comparativa_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return output, filename