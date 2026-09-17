from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

class Usuario(SQLModel, table=True):
    __tablename__ = "usuario"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    email: str = Field(unique=True, index=True)
    password_hash: str
    rol: str  # "admin" o "usuario"

    cargas: List["CargaExcel"] = Relationship(back_populates="usuario")


class CargaExcel(SQLModel, table=True):
    __tablename__ = "cargaexcel"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre_archivo: str
    ruta_archivo: Optional[str] = Field(default=None)
    hash_archivo: Optional[str] = Field(default=None, index=True)  # SHA-256 del contenido, para evitar duplicados
    fecha_carga: datetime = Field(default_factory=datetime.utcnow)
    es_global: bool = Field(default=False)

    usuario_id: int = Field(foreign_key="usuario.id", index=True)
    usuario: Usuario = Relationship(back_populates="cargas")

    datos_procesales: List["DatoProcesal"] = Relationship(back_populates="carga")


class MagistradoOficial(SQLModel, table=True):
    __tablename__ = "magistradooficial"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(unique=True, index=True)


class MapeoDinamico(SQLModel, table=True):
    __tablename__ = "mapeodinamico"

    id: Optional[int] = Field(default=None, primary_key=True)
    texto_origen: str = Field(index=True)
    texto_normalizado: str = Field(unique=True, index=True)
    categoria_destino: str = Field(index=True)
    fecha_creacion: datetime = Field(default_factory=datetime.utcnow)
    usuario_id: Optional[int] = Field(
        default=None,
        foreign_key="usuario.id",
        index=True,
    )


class DatoProcesal(SQLModel, table=True):
    __tablename__ = "datoprocesal"

    id: Optional[int] = Field(default=None, primary_key=True)
    radicado: str = Field(index=True)
    ponente: Optional[str] = Field(default=None, index=True)
    demandante: Optional[str] = Field(default=None)
    demandado: Optional[str] = Field(default=None)
    clase: Optional[str] = Field(default=None)
    vigente: Optional[str] = Field(default=None)
    categoria: Optional[str] = Field(default=None, index=True)
    es_const: bool = Field(default=False)
    es_primera: bool = Field(default=False)
    fecha_entrada: Optional[datetime] = Field(default=None, index=True)
    fecha_salida: Optional[datetime] = Field(default=None)
    medio: Optional[str] = Field(default=None)
    carga_id: Optional[int] = Field(
        default=None,
        foreign_key="cargaexcel.id",
        index=True,
    )
    carga: Optional[CargaExcel] = Relationship(back_populates="datos_procesales")
    datos_extra: Optional[str] = Field(default=None)