import pandas as pd


def obtener_cuellos_botella(
    df: pd.DataFrame,
    metadata: dict,
    umbral_atencion: int,
    umbral_critico: int,
) -> dict:
    col_ent = metadata.get("col_ent")
    col_ponente = metadata.get("col_ponente")
    col_vigente = metadata.get("col_vigente")
    col_rad = metadata.get("col_rad")
    col_medio = metadata.get("col_medio")

    vig_raw = df[col_vigente].astype(str).str.strip().str.upper()
    df_vigentes = df[vig_raw.isin(["SI", "VIGENTE", "ACTIVO"])].copy()
    df_vigentes["_fecha_entrada_cb"] = pd.to_datetime(df_vigentes[col_ent], errors="coerce")
    hoy = pd.Timestamp.now().normalize()
    df_vigentes["_dias_cb"] = (hoy - df_vigentes["_fecha_entrada_cb"]).dt.days
    df_vigentes = df_vigentes[df_vigentes["_dias_cb"].notna()].copy()
    df_vigentes["_dias_cb"] = df_vigentes["_dias_cb"].astype(int)

    def clasificar_nivel(dias):
        if dias >= umbral_critico:
            return "critico"
        if dias >= umbral_atencion:
            return "atencion"
        return "normal"

    df_vigentes["_nivel_cb"] = df_vigentes["_dias_cb"].apply(clasificar_nivel)
    df_vigentes["_ponente_cb"] = (
        df_vigentes[col_ponente]
        .astype(str)
        .str.replace(r"\s*\*?\s*cambio\s+ponente", "", case=False, regex=True)
        .str.strip()
    )

    total_vigentes = len(df_vigentes)
    total_normales = int((df_vigentes["_nivel_cb"] == "normal").sum())
    total_atencion = int((df_vigentes["_nivel_cb"] == "atencion").sum())
    total_criticos = int((df_vigentes["_nivel_cb"] == "critico").sum())
    promedio_dias = round(float(df_vigentes["_dias_cb"].mean()), 1) if total_vigentes else 0
    max_dias = int(df_vigentes["_dias_cb"].max()) if total_vigentes else 0

    rangos = [("0-179", 0, 179), ("180-364", 180, 364), ("365-449", 365, 449), ("450-539", 450, 539), ("540-629", 540, 629), ("630+", 630, None)]
    antiguedad = []
    for nombre, minimo, maximo in rangos:
        mask = df_vigentes["_dias_cb"] >= minimo if maximo is None else ((df_vigentes["_dias_cb"] >= minimo) & (df_vigentes["_dias_cb"] <= maximo))
        antiguedad.append({"rango": nombre, "desde_dias": minimo, "hasta_dias": maximo, "cantidad": int(mask.sum())})

    ranking_ponentes = []
    for ponente, grupo in df_vigentes.groupby("_ponente_cb"):
        total = len(grupo)
        criticos = int((grupo["_nivel_cb"] == "critico").sum())
        atencion = int((grupo["_nivel_cb"] == "atencion").sum())
        promedio = round(float(grupo["_dias_cb"].mean()), 1)
        maximo = int(grupo["_dias_cb"].max())
        porcentaje_critico = round(criticos / total * 100, 2) if total else 0
        ranking_ponentes.append({"ponente": str(ponente), "procesos_vigentes": total, "criticos": criticos, "atencion": atencion, "porcentaje_critico": porcentaje_critico, "promedio_dias": promedio, "max_dias": maximo})
    ranking_ponentes.sort(key=lambda x: (x["criticos"], x["porcentaje_critico"], x["promedio_dias"]), reverse=True)

    por_categoria = []
    if "_categoria" in df_vigentes.columns:
        for categoria, grupo in df_vigentes.groupby("_categoria"):
            total = len(grupo)
            criticos = int((grupo["_nivel_cb"] == "critico").sum())
            atencion = int((grupo["_nivel_cb"] == "atencion").sum())
            por_categoria.append({"categoria": str(categoria), "procesos_vigentes": total, "criticos": criticos, "atencion": atencion, "porcentaje_critico": round(criticos / total * 100, 2) if total else 0})
    por_categoria.sort(key=lambda x: x["criticos"], reverse=True)

    por_medio = []
    if col_medio:
        for medio, grupo in df_vigentes.groupby(col_medio):
            total = len(grupo)
            criticos = int((grupo["_nivel_cb"] == "critico").sum())
            atencion = int((grupo["_nivel_cb"] == "atencion").sum())
            por_medio.append({"medio": str(medio), "procesos_vigentes": total, "criticos": criticos, "atencion": atencion, "porcentaje_critico": round(criticos / total * 100, 2) if total else 0})
    por_medio.sort(key=lambda x: x["criticos"], reverse=True)

    df_criticos = df_vigentes[df_vigentes["_nivel_cb"] == "critico"].copy().sort_values("_dias_cb", ascending=False)
    procesos_criticos = []
    for _, fila in df_criticos.iterrows():
        radicado = str(fila[col_rad]) if col_rad and pd.notna(fila[col_rad]) else "S.D."
        ponente_original = str(fila[col_ponente]) if pd.notna(fila[col_ponente]) else "S.D."
        ponente = str(fila["_ponente_cb"]) if pd.notna(fila["_ponente_cb"]) else "S.D."
        medio = str(fila[col_medio]) if col_medio and pd.notna(fila[col_medio]) else "S.D."
        categoria = str(fila["_categoria"]) if "_categoria" in fila.index and pd.notna(fila["_categoria"]) else "Sin categoría"
        fecha_entrada = fila["_fecha_entrada_cb"].strftime("%Y-%m-%d") if pd.notna(fila["_fecha_entrada_cb"]) else None
        procesos_criticos.append({"radicado": radicado, "ponente": ponente, "ponente_original": ponente_original, "medio": medio, "categoria": categoria, "fecha_entrada": fecha_entrada, "dias": int(fila["_dias_cb"]), "nivel": "critico"})

    return {"umbrales": {"atencion_desde": umbral_atencion, "critico_desde": umbral_critico}, "resumen": {"procesos_vigentes": total_vigentes, "normales": total_normales, "atencion": total_atencion, "criticos": total_criticos, "promedio_dias": promedio_dias, "max_dias": max_dias}, "antiguedad": antiguedad, "ranking_ponentes": ranking_ponentes, "por_categoria": por_categoria, "por_medio": por_medio, "procesos_criticos": procesos_criticos}
