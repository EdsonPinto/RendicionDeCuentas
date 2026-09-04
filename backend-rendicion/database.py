from sqlmodel import create_engine, Session, SQLModel, select
from config import DATABASE_URL
from passlib.context import CryptContext

engine = create_engine(DATABASE_URL, echo=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_db_and_tables():
    from models import Usuario, CargaExcel, DatoProcesal
    SQLModel.metadata.create_all(engine)
    
    # Crear usuario admin por defecto si no existe
    with Session(engine) as session:
        usuario = session.exec(
            select(Usuario).where(Usuario.email == "admin@palacio.gov.co")
        ).first()
        if not usuario:
            nuevo_admin = Usuario(
                nombre="ADMINISTRADOR SISTEMA",
                email="admin@palacio.gov.co",
                password_hash=pwd_context.hash("admin123"),
                rol="admin"
            )
            session.add(nuevo_admin)
            session.commit()

def get_session():
    with Session(engine) as session:
        yield session