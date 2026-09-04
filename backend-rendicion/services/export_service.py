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
