from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

import app_state
from auth import autenticar_usuario, crear_token_acceso, obtener_usuario_actual
from database import get_session
from schemas import Token, Usuario

router = APIRouter()


@router.post("/token", response_model=Token)
async def login_por_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    usuario = autenticar_usuario(session, form_data.username, form_data.password)

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = crear_token_acceso(data={"sub": usuario.email})

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/api/me", response_model=Usuario)
def obtener_perfil_actual(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    return usuario_actual


@router.post("/api/logout")
def cerrar_sesion(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    app_state.db_temporal = None
    app_state.meta = {}
    return {"status": "ok", "mensaje": "Sesión cerrada y datos temporales purgados."}
