from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select
from database import get_session
from models import Usuario as UsuarioDB
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from schemas import UsuarioAutenticado

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verificar_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def crear_token_acceso(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def obtener_usuario_actual(
    token: str = Depends(oauth2_scheme), 
    session: Session = Depends(get_session)
) -> UsuarioAutenticado:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales de acceso.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    usuario = session.exec(select(UsuarioDB).where(UsuarioDB.email == email)).first()
    if usuario is None:
        raise credentials_exception
    return UsuarioAutenticado(
        id=usuario.id,
        username=usuario.email,
        nombre=usuario.nombre,
        rol=usuario.rol,
    )

def verificar_admin(usuario_actual: UsuarioAutenticado = Depends(obtener_usuario_actual)):
    if usuario_actual.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso exclusivo para Administradores del sistema.",
        )
    return usuario_actual

def autenticar_usuario(session: Session, email: str, password: str):
    usuario = session.exec(
        select(UsuarioDB).where(UsuarioDB.email == email)
    ).first()

    if not usuario or not verificar_password(password, usuario.password_hash):
        return None

    return usuario