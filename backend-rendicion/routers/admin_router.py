from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select, delete

from auth import hash_password, obtener_usuario_actual, verificar_admin
from database import get_session
from models import MagistradoOficial
from models import Usuario as UsuarioDB
from schemas import Usuario, UsuarioCreateDTO, UsuarioUpdateDTO

router = APIRouter()

class ListaMagistradosDTO(BaseModel):
    magistrados: List[str]


MAGISTRADOS_OFICIALES_DEFECTO = [
    "DR. MAURICIO JAVIER ROJAS",
    "DRA. MARIA ELENA GOMEZ",
    "DR. CARLOS ALBERTO PEREZ",
]


@router.get("/api/admin/usuarios", response_model=List[Usuario])
def listar_usuarios(
    admin: Usuario = Depends(verificar_admin),
    session: Session = Depends(get_session),
):
    usuarios = session.exec(select(UsuarioDB)).all()

    return [
        Usuario(
            username=u.email,
            nombre=u.nombre,
            rol=u.rol,
        )
        for u in usuarios
    ]


@router.post("/api/admin/usuarios")
def crear_usuario(
    dto: UsuarioCreateDTO,
    admin: Usuario = Depends(verificar_admin),
    session: Session = Depends(get_session),
):
    usuario_existente = session.exec(
        select(UsuarioDB).where(UsuarioDB.email == dto.username)
    ).first()

    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="El usuario ya existe.",
        )

    nuevo_usuario = UsuarioDB(
        nombre=dto.nombre.strip().upper(),
        email=dto.username.strip().lower(),
        password_hash=hash_password(dto.password),
        rol=dto.rol.strip().lower(),
    )

    session.add(nuevo_usuario)
    session.commit()
    session.refresh(nuevo_usuario)

    return {
        "status": "ok",
        "mensaje": f"Usuario {nuevo_usuario.email} creado exitosamente.",
    }


@router.put("/api/admin/usuarios/{target_username}")
def editar_usuario(
    target_username: str,
    dto: UsuarioUpdateDTO,
    admin: Usuario = Depends(verificar_admin),
    session: Session = Depends(get_session),
):
    usuario = session.exec(
        select(UsuarioDB).where(UsuarioDB.email == target_username)
    ).first()

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado.",
        )

    if dto.nombre is not None and dto.nombre.strip():
        usuario.nombre = dto.nombre.strip().upper()

    if dto.rol is not None and dto.rol.strip():
        usuario.rol = dto.rol.strip().lower()

    if dto.password is not None and dto.password.strip():
        usuario.password_hash = hash_password(dto.password)

    session.add(usuario)
    session.commit()
    session.refresh(usuario)

    return {
        "status": "ok",
        "mensaje": f"Usuario {usuario.email} actualizado.",
    }


@router.delete("/api/admin/usuarios/{target_username}")
def eliminar_usuario(
    target_username: str,
    admin: Usuario = Depends(verificar_admin),
    session: Session = Depends(get_session),
):
    if target_username == admin.username:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminar tu propio usuario administrador en sesión.",
        )

    usuario = session.exec(
        select(UsuarioDB).where(UsuarioDB.email == target_username)
    ).first()

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado.",
        )

    session.delete(usuario)
    session.commit()

    return {
        "status": "ok",
        "mensaje": f"Usuario {target_username} eliminado exitosamente.",
    }


@router.get("/api/admin/magistrados")
def listar_magistrados(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    registros = session.exec(
        select(MagistradoOficial).order_by(MagistradoOficial.nombre)
    ).all()

    if not registros:
        for nombre in MAGISTRADOS_OFICIALES_DEFECTO:
            session.add(MagistradoOficial(nombre=nombre))
        session.commit()
        registros = session.exec(
            select(MagistradoOficial).order_by(MagistradoOficial.nombre)
        ).all()

    return {"magistrados": [r.nombre for r in registros]}


@router.post("/api/admin/magistrados")
def guardar_magistrados(
    dto: ListaMagistradosDTO,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    try:
        # 1. Limpiar lista de duplicados y vacíos
        nombres = sorted({m.strip().upper() for m in dto.magistrados if m and m.strip()})

        # 2. Borrar registros previos de forma atómica en SQL
        session.exec(delete(MagistradoOficial))

        # 3. Insertar nuevos magistrados
        for nombre in nombres:
            session.add(MagistradoOficial(nombre=nombre))

        session.commit()

        return {"status": "ok", "magistrados": nombres}
    except Exception as e:
        session.rollback()
        print(f"ERROR DETALLADO EN POST /api/admin/magistrados: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al sincronizar magistrados: {str(e)}"
        )