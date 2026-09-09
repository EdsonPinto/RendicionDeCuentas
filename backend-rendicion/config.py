import os
import sys
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# ─── SEGURIDAD (OBLIGATORIO) ────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    print("🔴 ERROR CRÍTICO DE CONFIGURACIÓN")
    print("   La variable de entorno SECRET_KEY no está definida.")
    print("   Por favor configura SECRET_KEY en el archivo .env")
    print("   o como variable de entorno del sistema.")
    print()
    print("   Para generar una clave segura, ejecuta:")
    print("   python -c \"import secrets; print(secrets.token_urlsafe(32))\"")
    print()
    sys.exit(1)

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

# ─── CORS ──────────────────────────────────────────────────────────────────
# Por defecto permite solo desarrollo local
CORS_ORIGINS_STR = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173"
)
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_STR.split(",")]

# ─── BASE DE DATOS ─────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:0420@localhost:5432/rendicion_db")
