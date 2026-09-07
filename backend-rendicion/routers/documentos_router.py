from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from auth import obtener_usuario_actual
from database import get_session
from models import CargaExcel, DatoProcesal
from schemas import UsuarioAutenticado
from services.excel_service import listar_documentos

router = APIRouter()


@router.get("/api/documentos")
def obtener_documentos(
    usuario_actual: UsuarioAutenticado = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    return {"documentos": listar_documentos(session, usuario_actual.id)}


@router.delete("/api/documentos/{carga_id}")
def eliminar_documento(
    carga_id: int,
    usuario_actual: UsuarioAutenticado = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    carga = session.get(CargaExcel, carga_id)

    if not carga:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    es_propietario = carga.usuario_id == usuario_actual.id
    es_admin = usuario_actual.rol == "admin"

    if not es_propietario and not es_admin:
        raise HTTPException(
            status_code=403,
            detail="Solo puedes eliminar documentos que tú mismo hayas cargado.",
        )

    registros = session.exec(
        select(DatoProcesal).where(DatoProcesal.carga_id == carga_id)
    ).all()
    for registro in registros:
        session.delete(registro)

    session.delete(carga)
    session.commit()

    return {"status": "ok", "mensaje": f"Documento '{carga.nombre_archivo}' eliminado."}
