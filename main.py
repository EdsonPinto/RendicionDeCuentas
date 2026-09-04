from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

import app_state
from auth import obtener_usuario_actual
from config import CORS_ORIGINS
from schemas import Usuario
from services.estadisticas_service import generar_reporte as generar_reporte_estadisticas
from routers.admin_router import router as admin_router
from routers.auth_router import router as auth_router
from routers.comparativa_router import router as comparativa_router
from routers.cuello_botella_router import router as cuello_botella_router
from routers.estadisticas_router import router as estadisticas_router
from routers.excel_router import router as excel_router
from routers.export_router import router as export_router
from routers.mapeos_router import router as mapeos_router

app = FastAPI(title="Rendición de Cuentas - API Completa", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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


def generar_reporte(df_base: pd.DataFrame) -> dict:
    return generar_reporte_estadisticas(df_base, app_state.meta)


@app.post("/api/logout")
def cerrar_sesion(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    app_state.db_temporal = None
    app_state.meta = {}
    return {"status": "ok", "mensaje": "Sesión cerrada y datos temporales purgados."}
