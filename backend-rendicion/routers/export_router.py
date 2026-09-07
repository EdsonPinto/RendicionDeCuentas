from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from auth import obtener_usuario_actual
from database import get_session
from schemas import Usuario
from services.excel_service import cargar_dataframe_desde_db
from services.export_service import generar_excel_exportacion

router = APIRouter()


@router.get("/api/exportar-excel")
def exportar_excel(
    desde: str = None,
    hasta: str = None,
    ponente: str = None,
    carga_id: int = None,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    df, meta_db = cargar_dataframe_desde_db(session, carga_id)

    if df is None or df.empty:
        raise HTTPException(
            status_code=400,
            detail="No hay datos cargados para exportar.",
        )

    output, filename = generar_excel_exportacion(
        df,
        meta_db,
        desde,
        hasta,
        ponente,
    )

    return StreamingResponse(
        output,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
