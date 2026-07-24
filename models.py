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

class DatoProcesal(SQLModel, table=True):
    __tablename__ = "datoprocesal"
    id: Optional[int] = Field(default=None, primary_key=True)
    radicado: str = Field(index=True)
    ponente: str = Field(index=True)
    demandante: Optional[str]
    demandado: Optional[str]
    clase: Optional[str]
    vigente: str
    # Relación opcional para saber de qué carga vienen estos datos
    carga_id: Optional[int] = Field(default=None, foreign_key="cargaexcel.id")