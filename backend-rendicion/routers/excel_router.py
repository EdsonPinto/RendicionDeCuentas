import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from typing import List

import app_state
from database import get_session
from auth import obtener_usuario_actual
from models import Usuario, CargaExcel
from schemas import CargaExcelResponse
from services.excel_service import (
    procesar_archivo_excel,
    obtener_excel_por_usuario,
    eliminar_excel,
)

router = APIRouter(prefix="/api/excel", tags=["Excel"])


def validar_acceso_excel(excel: CargaExcel, usuario_actual: Usuario):
    if excel.es_global:
        return
    if excel.usuario_id == usuario_actual.id:
        return
    if usuario_actual.rol == "admin":
        return
    raise HTTPException(status_code=403, detail="No tienes permiso para acceder a este archivo.")


@router.post("/subir-archivo")
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[CargaExcelResponse])
def listar_excels(
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    return obtener_excel_por_usuario(session, usuario_actual)


@router.post("/cargar-seleccionado/{excel_id}")
def cargar_excel_seleccionado(
    excel_id: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    excel = session.get(CargaExcel, excel_id)
    if not excel:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    validar_acceso_excel(excel, usuario_actual)

    return {
        "status": "ok",
        "carga_id": excel.id,
        "nombre_archivo": excel.nombre_archivo,
        "mensaje": "Archivo seleccionado correctamente"
    }


@router.get("/{excel_id}/descargar")
def descargar_excel(
    excel_id: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    excel = session.get(CargaExcel, excel_id)
    if not excel:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    validar_acceso_excel(excel, usuario_actual)

    if not excel.ruta_archivo or not os.path.exists(excel.ruta_archivo):
        raise HTTPException(status_code=404, detail="El archivo físico no está disponible para descarga")

    return FileResponse(
        path=excel.ruta_archivo,
        filename=excel.nombre_archivo,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.delete("/{excel_id}")
def borrar_excel(
    excel_id: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    eliminado = eliminar_excel(session, excel_id, usuario_actual)

    if not eliminado:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    app_state.db_temporal = None
    app_state.meta = None

    return {"message": "Excel eliminado exitosamente"}