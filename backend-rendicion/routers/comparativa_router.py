from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

import app_state
from auth import obtener_usuario_actual
from database import get_session
from schemas import Usuario
from services.comparativa_service import obtener_comparativa
from services.estadisticas_service import generar_reporte
from services.excel_service import cargar_dataframe_desde_db

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
    df, meta_db = cargar_dataframe_desde_db(session, carga_id)

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
