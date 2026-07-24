import os
from sqlmodel import create_engine, Session, SQLModel
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, echo=False)

def create_db_and_tables():
    from models import Usuario, CargaExcel, DatoProcesal
    SQLModel.metadata.create_all(engine)
    
    # Crear usuario admin por defecto si no existe
    with Session(engine) as session:
        usuario = session.get(Usuario, 1)
        if not usuario:
            nuevo_admin = Usuario(id=1, nombre="Admin", email="admin@sistema.com", password_hash="admin123", rol="admin")
            session.add(nuevo_admin)
            session.commit()

def get_session():
    with Session(engine) as session:
        yield session