from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from auth import hash_password, verificar_admin
from database import get_session
from models import Usuario as UsuarioDB
from schemas import Usuario, UsuarioCreateDTO, UsuarioUpdateDTO

router = APIRouter()


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
