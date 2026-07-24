from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session
from database import get_session
import pandas as pd
import io

router = APIRouter(prefix="/api/excel", tags=["Procesamiento Excel"])

@router.post("/cargar")
def cargar_excel(
    despacho_id: int,
    usuario_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    # Validar que sea un archivo de Excel válido
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel (.xlsx o .xls)")
    
    try:
        # Leer el archivo directamente en memoria sin guardarlo en el disco duro
        contents = file.file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Limpiar espacios en blanco en los nombres de las columnas
        df.columns = df.columns.str.strip()
        
        # Aquí medimos cuántos registros procesaremos en total
        total_filas = len(df)
        
        # TODO: Aquí insertaremos la lógica para guardar fila por fila en la base de datos
        
        return {
            "mensaje": "Archivo recibido con éxito",
            "nombre_archivo": file.filename,
            "columnas_encontradas": list(df.columns),
            "total_registros_detectados": total_filas
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el Excel: {str(e)}")