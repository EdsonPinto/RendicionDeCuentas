from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from auth import obtener_usuario_actual
from database import get_session
from schemas import UsuarioAutenticado
from services.excel_service import obtener_excel_por_usuario, eliminar_excel

router = APIRouter()


@router.get("/api/documentos")
def obtener_documentos(
    usuario_actual: UsuarioAutenticado = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    return {"documentos": obtener_excel_por_usuario(session, usuario_actual)}


@router.delete("/api/documentos/{carga_id}")
def eliminar_documento(
    carga_id: int,
    usuario_actual: UsuarioAutenticado = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    eliminado = eliminar_excel(session, carga_id, usuario_actual)

    if not eliminado:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    return {"status": "ok", "mensaje": "Documento eliminado."}