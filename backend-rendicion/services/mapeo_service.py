from sqlmodel import Session, select

from models import MapeoDinamico


def obtener_mapeos_dinamicos(session: Session):
    """
    Obtiene los mapeos agregados por los administradores desde PostgreSQL.

    Devuelve:
        {
            "TEXTO NORMALIZADO": "categoria_destino"
        }
    """
    registros = session.exec(select(MapeoDinamico).order_by(MapeoDinamico.id)).all()

    return {
        registro.texto_normalizado: registro.categoria_destino for registro in registros
    }
