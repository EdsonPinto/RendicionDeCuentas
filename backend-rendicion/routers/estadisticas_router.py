from fastapi import APIRouter, Depends
from sqlmodel import Session

import app_state
from auth import obtener_usuario_actual
from database import get_session
from schemas import Usuario as UsuarioSchema
from services.estadisticas_service import obtener_estadisticas as obtener_estadisticas_service
from services.excel_service import cargar_dataframe_desde_db

router = APIRouter()


@router.get("/api/estadisticas")
def obtener_estadisticas(
    desde: str = None,
    hasta: str = None,
    carga_id: int = None,
    usuario_actual: UsuarioSchema = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    df, meta_db = cargar_dataframe_desde_db(session, carga_id)

    if df is not None:
        app_state.meta = meta_db.copy()

    if df is None:
        return {"error": "No hay datos"}

    return obtener_estadisticas_service(
        df,
        meta_db,
        usuario_actual.nombre,
        usuario_actual.rol,
        desde,
        hasta,
    )
