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
    carga_id: int = Query(None),
    ponente: str = Query(None),
    sub_modo: str = Query(None),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    # Cargamos el DataFrame completo sin filtrar por fechas
    df, meta_db = cargar_dataframe_desde_db(session, carga_id, usuario_actual)

    if df is None or df.empty:
        return {"sin_datos": True}

    col_ent = meta_db.get("col_ent")
    col_vigente = meta_db.get("col_vigente")
    col_ponente = meta_db.get("col_ponente")

    if not col_ent or not col_vigente or not col_ponente:
        raise HTTPException(
            status_code=400,
            detail="Faltan columnas clave (fecha de entrada, vigencia o ponente) en el archivo.",
        )

    # Filtrado estricto por ponente y sub_modo si se envían y no son "General"
    if ponente and ponente.strip().lower() != "general":
        df[col_ponente] = df[col_ponente].fillna("")
        mask_ponente = df[col_ponente].str.contains(ponente, case=False, regex=False)

        if sub_modo == "principal":
            mask_sub = ~df[col_ponente].str.contains("cambio", case=False, na=False)
            df = df[mask_ponente & mask_sub]
        elif sub_modo == "cambio":
            mask_sub = df[col_ponente].str.contains("cambio", case=False, na=False)
            df = df[mask_ponente & mask_sub]
        else:
            df = df[mask_ponente]

    if df.empty:
        return {"sin_datos": True}

    return obtener_cuellos_botella(
        df,
        meta_db,
        umbral_atencion,
        umbral_critico,
    )