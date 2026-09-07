from sqlmodel import create_engine, Session, SQLModel, select
from config import DATABASE_URL
from passlib.context import CryptContext

engine = create_engine(DATABASE_URL, echo=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_db_and_tables():
    from models import CargaExcel, DatoProcesal, MagistradoOficial, MapeoDinamico, Usuario
    SQLModel.metadata.create_all(engine)
    _migrar_columnas_faltantes()

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

def _migrar_columnas_faltantes():
    """Agrega columnas nuevas a tablas ya existentes compatible con SQLite y PostgreSQL."""
    is_postgres = "postgresql" in engine.dialect.name.lower()

    with engine.connect() as conexion:
        # Inspección de columnas por motor
        if is_postgres:
            query_cols = "SELECT column_name FROM information_schema.columns WHERE table_name = 'cargaexcel'"
            columnas = [fila[0] for fila in conexion.exec_driver_sql(query_cols).fetchall()]
        else:
            columnas = [fila[1] for fila in conexion.exec_driver_sql("PRAGMA table_info(cargaexcel)").fetchall()]

        # Alter table según el motor
        if "es_global" not in columnas:
            default_val = "FALSE" if is_postgres else "0"
            conexion.exec_driver_sql(
                f"ALTER TABLE cargaexcel ADD COLUMN es_global BOOLEAN DEFAULT {default_val}"
            )
            conexion.commit()

def get_session():
    with Session(engine) as session:
        yield session