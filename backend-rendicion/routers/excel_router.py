from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlmodel import Session, select
from typing import List

import app_state
from database import get_session
from auth import obtener_usuario_actual
from models import Usuario, CargaExcel
from services.excel_service import procesar_archivo_excel

router = APIRouter(prefix="/api/excel", tags=["Excel"])

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
            usuario_actual.id,
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

@router.get("/", response_model=List[CargaExcel])
def listar_excels(
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    if usuario_actual.rol == "admin":
        return session.exec(select(CargaExcel)).all()
    
    resultados = session.exec(
        select(CargaExcel).where(
            (CargaExcel.usuario_id == usuario_actual.id) | (CargaExcel.es_global == True)
        )
    ).all()
    
    if not resultados:
        return session.exec(select(CargaExcel)).all()
        
    return resultados

@router.post("/cargar-seleccionado/{excel_id}")
def cargar_excel_seleccionado(
    excel_id: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    excel = session.get(CargaExcel, excel_id)
    if not excel:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    return {
        "status": "ok",
        "carga_id": excel.id,
        "nombre_archivo": excel.nombre_archivo,
        "mensaje": "Archivo seleccionado correctamente"
    }

@router.delete("/{excel_id}")
def borrar_excel(
    excel_id: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    excel = session.get(CargaExcel, excel_id)
    if not excel:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    if usuario_actual.rol != "admin" and excel.usuario_id != usuario_actual.id:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permisos para eliminar este archivo."
        )
    
    app_state.db_temporal = None
    app_state.meta = None
    
    session.delete(excel)
    session.commit()
    return {"message": "Excel eliminado exitosamente"}