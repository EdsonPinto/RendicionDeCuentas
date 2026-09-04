from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class Usuario(SQLModel, table=True):
    __tablename__ = "usuario"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    email: str = Field(unique=True, index=True)
    password_hash: str
    rol: str

    cargas: List["CargaExcel"] = Relationship(back_populates="usuario")


class CargaExcel(SQLModel, table=True):
    __tablename__ = "cargaexcel"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre_archivo: str
    fecha_carga: datetime = Field(default_factory=datetime.utcnow)

    usuario_id: int = Field(foreign_key="usuario.id")
    usuario: Usuario = Relationship(back_populates="cargas")

class MapeoDinamico(SQLModel, table=True):
    __tablename__ = "mapeodinamico"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Texto original encontrado en el Excel
    texto_origen: str = Field(index=True)

    # Texto normalizado para evitar duplicados por mayúsculas/acentos
    texto_normalizado: str = Field(unique=True, index=True)

    # Categoría destino: ord_1, ord_2, const_1 o const_2
    categoria_destino: str = Field(index=True)

    # Fecha en que se creó el mapeo
    fecha_creacion: datetime = Field(default_factory=datetime.utcnow)

    # Administrador que creó el mapeo
    usuario_id: Optional[int] = Field(
        default=None,
        foreign_key="usuario.id",
        index=True,
    )

class DatoProcesal(SQLModel, table=True):
    __tablename__ = "datoprocesal"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Campos principales del proceso
    radicado: str = Field(index=True)
    ponente: Optional[str] = Field(default=None, index=True)
    demandante: Optional[str] = Field(default=None)
    demandado: Optional[str] = Field(default=None)
    clase: Optional[str] = Field(default=None)
    vigente: Optional[str] = Field(default=None)

    # Información procesada por el sistema
    categoria: Optional[str] = Field(default=None, index=True)
    es_const: bool = Field(default=False)
    es_primera: bool = Field(default=False)

    # Fechas principales
    fecha_entrada: Optional[datetime] = Field(default=None, index=True)
    fecha_salida: Optional[datetime] = Field(default=None)

    # Medio original detectado en el Excel
    medio: Optional[str] = Field(default=None)

    # Relación con la carga que originó este registro
    carga_id: Optional[int] = Field(
        default=None,
        foreign_key="cargaexcel.id",
        index=True,
    )

    # Conserva columnas adicionales del Excel
    datos_extra: Optional[str] = Field(default=None)