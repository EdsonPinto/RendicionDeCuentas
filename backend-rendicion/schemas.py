from typing import List, Optional

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str

class Usuario(BaseModel):
    username: str
    nombre: str
    rol: str

class UsuarioAutenticado(Usuario):
    id: Optional[int] = None

class UsuarioCreateDTO(BaseModel):
    username: str
    nombre: str
    rol: str
    password: str

class UsuarioUpdateDTO(BaseModel):
    nombre: Optional[str] = None
    rol: Optional[str] = None
    password: Optional[str] = None

class NuevoMapeoRequest(BaseModel):
    texto_origen: str
    categoria_destino: str

class ListaMagistradosDTO(BaseModel):
    magistrados: List[str]

class DocumentoExcelBase(BaseModel):
    nombre_archivo: str

class DocumentoExcelCreate(DocumentoExcelBase):
    pass

class DocumentoExcelResponse(DocumentoExcelBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True