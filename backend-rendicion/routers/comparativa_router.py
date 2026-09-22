from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session

import app_state
from auth import obtener_usuario_actual
from database import get_session
from schemas import Usuario
from services.comparativa_service import obtener_comparativa, filtrar_df_por_criterios
from services.estadisticas_service import generar_reporte
from services.excel_service import cargar_dataframe_desde_db
from services.export_service import generar_excel_comparativa

router = APIRouter()


@router.get("/api/comparativa")
def obtener_comparativa_endpoint(
    modo: str = Query("periodo"),
    desde_a: Optional[str] = Query(None),
    hasta_a: Optional[str] = Query(None),
    ponente_a: Optional[str] = Query("General"),
    tipo_a: Optional[str] = Query("todos"),
    desde_b: Optional[str] = Query(None),
    hasta_b: Optional[str] = Query(None),
    ponente_b: Optional[str] = Query("General"),
    tipo_b: Optional[str] = Query("todos"),
    carga_id: Optional[int] = Query(None),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    df, meta_db = cargar_dataframe_desde_db(session, carga_id, usuario_actual)

    if df is None or df.empty:
        raise HTTPException(
            status_code=400,
            detail="No hay datos cargados en el sistema.",
        )

    def generar_reporte_compatible(df_base):
        return generar_reporte(df_base, app_state.meta)

    return obtener_comparativa(
        df,
        meta_db,
        modo,
        desde_a,
        hasta_a,
        ponente_a,
        tipo_a,
        desde_b,
        hasta_b,
        ponente_b,
        tipo_b,
        generar_reporte_compatible,
    )


@router.get("/api/comparativa/exportar")
def exportar_comparativa_endpoint(
    modo: str = Query("periodo"),
    desde_a: Optional[str] = Query(None),
    hasta_a: Optional[str] = Query(None),
    ponente_a: Optional[str] = Query("General"),
    tipo_a: Optional[str] = Query("todos"),
    desde_b: Optional[str] = Query(None),
    hasta_b: Optional[str] = Query(None),
    ponente_b: Optional[str] = Query("General"),
    tipo_b: Optional[str] = Query("todos"),
    carga_id: Optional[int] = Query(None),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    df, meta_db = cargar_dataframe_desde_db(session, carga_id, usuario_actual)

    if df is None or df.empty:
        raise HTTPException(
            status_code=400,
            detail="No hay datos cargados en el sistema.",
        )

    def generar_reporte_compatible(df_base):
        return generar_reporte(df_base, app_state.meta)

    df_a = filtrar_df_por_criterios(df, meta_db, desde_a, hasta_a, ponente_a, tipo_a)
    df_b = filtrar_df_por_criterios(df, meta_db, desde_b, hasta_b, ponente_b, tipo_b)

    rep_a = generar_reporte_compatible(df_a)
    rep_b = generar_reporte_compatible(df_b)

    resultado = obtener_comparativa(
        df, meta_db, modo, desde_a, hasta_a, ponente_a, tipo_a,
        desde_b, hasta_b, ponente_b, tipo_b, generar_reporte_compatible,
    )

    if modo == "periodo":
        desc_a = f"Selección A: {desde_a or 'inicio'} al {hasta_a or 'hoy'}"
        desc_b = f"Selección B: {desde_b or 'inicio'} al {hasta_b or 'hoy'}"
    else:
        desc_a = f"Selección A: {ponente_a} ({tipo_a})"
        desc_b = f"Selección B: {ponente_b} ({tipo_b})"

    output, filename = generar_excel_comparativa(
        df_a,
        df_b,
        rep_a,
        rep_b,
        resultado["variaciones"],
        resultado["diferencias"],
        descripcion_a=desc_a,
        descripcion_b=desc_b,
    )

    return StreamingResponse(
        output,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )