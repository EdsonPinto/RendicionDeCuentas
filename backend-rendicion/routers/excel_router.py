from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlmodel import Session

import app_state
from auth import obtener_usuario_actual
from database import get_session
from schemas import Usuario
from services.excel_service import procesar_archivo_excel

router = APIRouter()


@router.post("/api/subir-archivo")
async def subir_archivo(
    file: UploadFile = File(...),
    es_global: bool = Form(False),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    try:
        content = await file.read()
        df, metadata, carga_id, registros_guardados = procesar_archivo_excel(
            content,
            file.filename or "archivo_sin_nombre.xlsx",
            usuario_actual.username,
            session,
            es_global=es_global and usuario_actual.rol == "admin",
        )
        app_state.db_temporal = df
        app_state.meta = metadata
        return {
            "status": "ok",
            "operador": usuario_actual.nombre,
            "archivo": file.filename,
            "carga_id": carga_id,
            "registros_guardados": registros_guardados,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
