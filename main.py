from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from datetime import datetime
from contextlib import asynccontextmanager
from typing import List, Optional
from sqlmodel import Session, select
import pandas as pd
import io

# ─── IMPORTAR CONFIGURACIÓN CENTRALIZADA ──────────────────────────────────────
from config import CORS_ORIGINS
from database import get_session
from models import Usuario as UsuarioDB, CargaExcel, DatoProcesal, MapeoDinamico
from auth import (
    hash_password,
    obtener_usuario_actual,
    verificar_admin,
)
from schemas import (
    ListaMagistradosDTO,
    NuevoMapeoRequest,
    Token,
    Usuario,
    UsuarioCreateDTO,
    UsuarioUpdateDTO,
)
from services.clasificacion_service import (
    CATEGORIA_CONST,
    CATEGORIA_ORD,
    MAPEO_NORM,
    MAPEO_UNIFICADO,
    aplicar_categorizacion,
    normalizar,
)
from services.mapeo_service import obtener_mapeos_dinamicos
from services.excel_service import (
    cargar_dataframe_desde_db,
    obtener_df_desde_bd,
    procesar_archivo_excel,
)
from services.estadisticas_service import (
    generar_reporte as generar_reporte_estadisticas,
    obtener_estadisticas as obtener_estadisticas_service,
)
from services.comparativa_service import obtener_comparativa as obtener_comparativa_service
from services.cuello_botella_service import obtener_cuellos_botella as obtener_cuellos_botella_service
from services.export_service import generar_excel_exportacion
from routers.auth_router import router as auth_router
from routers.admin_router import router as admin_router

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


MAGISTRADOS_OFICIALES = [
    "DR. MAURICIO JAVIER ROJAS",
    "DRA. MARIA ELENA GOMEZ",
    "DR. CARLOS ALBERTO PEREZ",
]


MAPEO_DINAMICO_UI = {}

db_temporal = None
meta = {}

@app.post("/api/logout")
def cerrar_sesion(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    global db_temporal, meta
    db_temporal = None
    meta = {}
    return {"status": "ok", "mensaje": "Sesión cerrada y datos temporales purgados."}


@app.get("/api/admin/magistrados")
def listar_magistrados(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    return {"magistrados": MAGISTRADOS_OFICIALES}


@app.post("/api/admin/magistrados")
def guardar_magistrados(
    dto: ListaMagistradosDTO, admin: Usuario = Depends(verificar_admin)
):
    global MAGISTRADOS_OFICIALES
    MAGISTRADOS_OFICIALES = [m.strip().upper() for m in dto.magistrados if m.strip()]
    return {"status": "ok", "magistrados": MAGISTRADOS_OFICIALES}


@app.post("/api/subir-archivo")
async def subir_archivo(
    file: UploadFile = File(...),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    global db_temporal, meta
    try:
        content = await file.read()
        df, metadata, carga_id, registros_guardados = procesar_archivo_excel(
            content,
            file.filename or "archivo_sin_nombre.xlsx",
            usuario_actual.username,
            session,
        )
        db_temporal = df
        meta = metadata
        return {
            "status": "ok",
            "operador": usuario_actual.nombre,
            "archivo": file.filename,
            "carga_id": carga_id,
            "registros_guardados": registros_guardados,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def generar_reporte(df_base: pd.DataFrame) -> dict:
    return generar_reporte_estadisticas(df_base, meta)


@app.get("/api/estadisticas")
def obtener_estadisticas(
    desde: str = None,
    hasta: str = None,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    df, meta_db = cargar_dataframe_desde_db(session)

    global meta

    if df is not None:
        meta = meta_db.copy()

    if df is None:
        return {"error": "No hay datos"}

    return obtener_estadisticas_service(
        df,
        meta_db,
        usuario_actual.nombre,
        usuario_actual.rol,
        desde,
        hasta,
    )


@app.get("/api/comparativa")
def obtener_comparativa(
    modo: str = Query("periodo"),
    desde_a: Optional[str] = Query(None),
    hasta_a: Optional[str] = Query(None),
    ponente_a: Optional[str] = Query("General"),
    tipo_a: Optional[str] = Query("todos"),
    desde_b: Optional[str] = Query(None),
    hasta_b: Optional[str] = Query(None),
    ponente_b: Optional[str] = Query("General"),
    tipo_b: Optional[str] = Query("todos"),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    df, meta_db = cargar_dataframe_desde_db(session)

    if df is None or df.empty:
        raise HTTPException(
            status_code=400,
            detail="No hay datos cargados en el sistema.",
        )

    return obtener_comparativa_service(
        df,
        meta_db,
        modo,
        desde_a,
        hasta_a,
        ponente_a,
        tipo_a,
        desde_b,
        hasta_b,
        ponente_b,
        tipo_b,
        generar_reporte,
    )


@app.get("/api/cuello-botella")
def obtener_cuellos_botella(
    umbral_atencion: int = Query(180, ge=0),
    umbral_critico: int = Query(365, ge=1),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    df, meta_db = cargar_dataframe_desde_db(session)

    if df is None or df.empty:
        raise HTTPException(
            status_code=400,
            detail="No hay datos cargados en el sistema.",
        )

    col_ent = meta_db.get("col_ent")
    col_ponente = meta_db.get("col_ponente")
    col_vigente = meta_db.get("col_vigente")
    col_rad = meta_db.get("col_rad")
    col_medio = meta_db.get("col_medio")

    if not col_ent:
        raise HTTPException(
            status_code=400,
            detail="No se encontró la columna de fecha de entrada.",
        )

    if not col_vigente:
        raise HTTPException(
            status_code=400,
            detail="No se encontró la columna de vigencia.",
        )

    if not col_ponente:
        raise HTTPException(
            status_code=400,
            detail="No se encontró la columna de ponente.",
        )

    return obtener_cuellos_botella_service(
        df,
        meta_db,
        umbral_atencion,
        umbral_critico,
    )

@app.get("/api/no-clasificados")
def obtener_no_clasificados(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    if usuario_actual.rol != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acceso restringido.",
        )

    df, meta_db = cargar_dataframe_desde_db(session)

    if df is None or df.empty:
        return {
            "no_clasificados": [],
            "categorias_disponibles": CATEGORIA_ORD + CATEGORIA_CONST,
        }

    if "_categoria" not in df.columns:
        return {
            "no_clasificados": [],
            "categorias_disponibles": CATEGORIA_ORD + CATEGORIA_CONST,
        }

    sin_clasificar_df = df[df["_categoria"] == "SIN_CLASIFICAR"]

    if sin_clasificar_df.empty:
        return {
            "no_clasificados": [],
            "categorias_disponibles": CATEGORIA_ORD + CATEGORIA_CONST,
        }

    col_medio = meta_db.get("col_medio")

    if not col_medio or col_medio not in sin_clasificar_df.columns:
        return {
            "no_clasificados": [],
            "categorias_disponibles": CATEGORIA_ORD + CATEGORIA_CONST,
        }

    conteo = sin_clasificar_df[col_medio].fillna("S.D.").value_counts().to_dict()

    return {
        "no_clasificados": [
            {
                "texto_original": str(k),
                "frecuencia": int(v),
            }
            for k, v in conteo.items()
        ],
        "categorias_disponibles": CATEGORIA_ORD + CATEGORIA_CONST,
    }


@app.post("/api/agregar-mapeo")
def agregar_mapeo_dinamico(
    req: NuevoMapeoRequest,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    """
    Crea un mapeo dinámico persistente.

    El mapeo se almacena en PostgreSQL para que no se pierda
    cuando se reinicie la API.

    Solo los administradores pueden crear mapeos.
    """

    global db_temporal, meta

    # ---------------------------------------------------------
    # 1. Validar permisos
    # ---------------------------------------------------------
    if usuario_actual.rol != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acceso restringido.",
        )

    # ---------------------------------------------------------
    # 2. Validar texto recibido
    # ---------------------------------------------------------
    texto_original = (req.texto_origen or "").strip()

    if not texto_original:
        raise HTTPException(
            status_code=400,
            detail="El texto a mapear no puede estar vacío.",
        )

    # ---------------------------------------------------------
    # 3. Validar categoría
    # ---------------------------------------------------------
    categorias_validas = CATEGORIA_ORD + CATEGORIA_CONST

    if req.categoria_destino not in categorias_validas:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Categoría inválida. Categorías disponibles: "
                f"{', '.join(categorias_validas)}"
            ),
        )

    # ---------------------------------------------------------
    # 4. Normalizar texto
    # ---------------------------------------------------------
    texto_norm = normalizar(texto_original)

    if not texto_norm:
        raise HTTPException(
            status_code=400,
            detail="El texto no contiene caracteres válidos para crear un mapeo.",
        )

    # ---------------------------------------------------------
    # 5. Comprobar si ya existe
    # ---------------------------------------------------------
    mapeo_existente = session.exec(
        select(MapeoDinamico).where(MapeoDinamico.texto_normalizado == texto_norm)
    ).first()

    if mapeo_existente:
        # Si apunta a la misma categoría, no creamos duplicado.
        if mapeo_existente.categoria_destino == req.categoria_destino:
            MAPEO_DINAMICO_UI[texto_norm] = req.categoria_destino

            return {
                "status": "ok",
                "mensaje": (
                    f"El texto '{texto_original}' ya estaba "
                    f"mapeado a '{req.categoria_destino}'."
                ),
                "existente": True,
            }

        # Si existe pero apunta a otra categoría, no sobrescribimos
        # silenciosamente una regla existente.
        raise HTTPException(
            status_code=409,
            detail=(
                f"El texto '{texto_original}' ya está mapeado a "
                f"'{mapeo_existente.categoria_destino}'. "
                "Elimine o modifique el mapeo existente antes de cambiarlo."
            ),
        )

    # ---------------------------------------------------------
    # 6. Crear mapeo persistente
    # ---------------------------------------------------------
    nuevo_mapeo = MapeoDinamico(
        texto_origen=texto_original,
        texto_normalizado=texto_norm,
        categoria_destino=req.categoria_destino,
        usuario_id=usuario_actual.id,
    )

    session.add(nuevo_mapeo)

    try:
        session.commit()
        session.refresh(nuevo_mapeo)

    except Exception:
        session.rollback()

        raise HTTPException(
            status_code=500,
            detail="No fue posible guardar el nuevo mapeo.",
        )

    # ---------------------------------------------------------
    # 7. Mantener cache en memoria durante esta ejecución
    # ---------------------------------------------------------
    MAPEO_DINAMICO_UI[texto_norm] = req.categoria_destino

    # ---------------------------------------------------------
    # 8. Reaplicar categorización inmediatamente
    # ---------------------------------------------------------
    df, meta_db = cargar_dataframe_desde_db(session)

    if df is not None and not df.empty:
        col_medio = meta_db.get("col_medio")

        if col_medio and col_medio in df.columns:
            df = aplicar_categorizacion(df, col_medio)

        db_temporal = df
        meta = meta_db

    elif db_temporal is not None and meta.get("col_medio"):
        db_temporal = aplicar_categorizacion(
            db_temporal,
            meta["col_medio"],
        )

    return {
        "status": "ok",
        "mensaje": (f"Mapeado '{texto_original}' -> " f"'{req.categoria_destino}'"),
        "id": nuevo_mapeo.id,
        "persistente": True,
    }


@app.get("/api/exportar-excel")
def exportar_excel(
    desde: str = None,
    hasta: str = None,
    ponente: str = None,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    # Reconstruir los datos desde PostgreSQL
    df, meta_db = cargar_dataframe_desde_db(session)

    if df is None or df.empty:
        raise HTTPException(
            status_code=400,
            detail="No hay datos cargados para exportar.",
        )

    output, filename = generar_excel_exportacion(
        df,
        meta_db,
        desde,
        hasta,
        ponente,
    )

    return StreamingResponse(
        output,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
