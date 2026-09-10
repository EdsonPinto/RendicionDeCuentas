from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from database import create_db_and_tables
from routers.admin_router import router as admin_router
from routers.auth_router import router as auth_router
from routers.comparativa_router import router as comparativa_router
from routers.cuello_botella_router import router as cuello_botella_router
from routers.documentos_router import router as documentos_router
from routers.estadisticas_router import router as estadisticas_router
from routers.excel_router import router as excel_router
from routers.export_router import router as export_router
from routers.mapeos_router import router as mapeos_router

app = FastAPI(title="Rendición de Cuentas - API Completa", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(excel_router)
app.include_router(estadisticas_router)
app.include_router(comparativa_router)
app.include_router(cuello_botella_router)
app.include_router(export_router)
app.include_router(mapeos_router)
app.include_router(documentos_router)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
