from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlmodel import Session
import io
import pandas as pd

from auth import obtener_usuario_actual
from database import get_session
from models import CargaExcel, Usuario
from services.excel_service import (
    cargar_dataframe_desde_db,
    procesar_archivo_excel,
    obtener_excel_por_usuario,
    eliminar_excel,
)

router = APIRouter()

@router.get("/api/excel/")
def listar_excels(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    """Lista todos los archivos Excel disponibles para el usuario o globales."""
    try:
        return obtener_excel_por_usuario(session, usuario_actual)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/excel/subir-archivo")
async def subir_archivo(
    file: UploadFile = File(...),
    es_global: str = Form("false"),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    """Sube y procesa un nuevo archivo Excel utilizando el servicio."""
    try:
        content = await file.read()
        es_global_bool = es_global.lower() == "true"
        
        _, _, carga_id, registros_guardados = procesar_archivo_excel(
            content=content,
            filename=file.filename,
            usuario_email=usuario_actual.email,
            session=session,
            es_global=es_global_bool,
        )
        
        return {
            "carga_id": carga_id,
            "nombre_archivo": file.filename,
            "registros": registros_guardados,
            "mensaje": "Archivo procesado y guardado exitosamente."
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/excel/cargar-seleccionado/{carga_id}")
def cargar_seleccionado(
    carga_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    """Marca o valida un archivo Excel específico como la fuente activa de trabajo."""
    carga = session.get(CargaExcel, carga_id)
    if not carga:
        raise HTTPException(status_code=404, detail="Archivo no encontrado.")
    return {"carga_id": carga.id, "nombre_archivo": carga.nombre_archivo}

@router.delete("/api/excel/{carga_id}")
def borrar_excel(
    carga_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    """Elimina un archivo Excel y sus registros asociados."""
    try:
        eliminar_excel(session, carga_id, usuario_actual)
        return {"mensaje": "Archivo eliminado exitosamente"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/exportar-excel")
def exportar_excel(
    carga_id: int = Query(None),
    ponente: str = Query(None),
    sub_modo: str = Query(None),
    entidad: str = Query(None),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    """Exporta a Excel los datos filtrados por ponente, submodo y/o entidad específica."""
    df, meta_db = cargar_dataframe_desde_db(session, carga_id, usuario_actual)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="No hay datos para exportar.")

    col_ponente = meta_db.get("col_ponente")
    
    # Búsqueda segura de la columna de entidad para evitar errores con columnas de fecha
    col_entidad = meta_db.get("col_entidad") or meta_db.get("entidad") or meta_db.get("col_ent")

    # 1. Filtrar por ponente si se especifica y no es General
    if ponente and ponente.strip().lower() != "general" and col_ponente and col_ponente in df.columns:
        df[col_ponente] = df[col_ponente].fillna("").astype(str)
        mask_p = df[col_ponente].str.contains(ponente, case=False, regex=False)
        if sub_modo == "principal":
            df = df[mask_p & ~df[col_ponente].str.contains("cambio", case=False, na=False)]
        elif sub_modo == "cambio":
            df = df[mask_p & df[col_ponente].str.contains("cambio", case=False, na=False)]
        else:
            df = df[mask_p]

    # 2. Filtrar por entidad específica (Top 15) de forma robusta
    if entidad and col_entidad and col_entidad in df.columns:
        df[col_entidad] = df[col_entidad].fillna("").astype(str)
        df = df[df[col_entidad].str.contains(entidad, case=False, regex=False)]

    if df.empty:
        raise HTTPException(status_code=404, detail="No hay registros que coincidan con el filtro aplicado.")

    # 3. Generar archivo Excel en memoria usando Pandas y Openpyxl
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Reporte")
    output.seek(0)

    nombre_archivo = entidad or (ponente if ponente else "General")
    filename = f"Reporte_{nombre_archivo.replace(' ', '_')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )