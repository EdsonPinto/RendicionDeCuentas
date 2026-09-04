from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from auth import obtener_usuario_actual
from database import get_session
from schemas import Usuario
from services.cuello_botella_service import obtener_cuellos_botella
from services.excel_service import cargar_dataframe_desde_db

router = APIRouter()


@router.get("/api/cuello-botella")
def obtener_cuellos_botella_endpoint(
    umbral_atencion: int = Query(180, ge=0),
    umbral_critico: int = Query(365, ge=1),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    df, meta_db = cargar_dataframe_desde_db(session)

    if df is None or df.empty:
        raise HTTPException(
            status_code=400,
            detail="No hay datos cargados en el sistema.",
        )

    col_ent = meta_db.get("col_ent")
    col_vigente = meta_db.get("col_vigente")
    col_ponente = meta_db.get("col_ponente")

    if not col_ent:
        raise HTTPException(
            status_code=400,
            detail="No se encontró la columna de fecha de entrada.",
        )

    if not col_vigente:
        raise HTTPException(
            status_code=400,
            detail="No se encontró la columna de vigencia.",
        )

    if not col_ponente:
        raise HTTPException(
            status_code=400,
            detail="No se encontró la columna de ponente.",
        )

    return obtener_cuellos_botella(
        df,
        meta_db,
        umbral_atencion,
        umbral_critico,
    )
