from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

import app_state
from auth import obtener_usuario_actual
from database import get_session
from models import MapeoDinamico
from schemas import NuevoMapeoRequest, Usuario
from services.clasificacion_service import (
    CATEGORIA_CONST,
    CATEGORIA_ORD,
    aplicar_categorizacion,
    normalizar,
)
from services.excel_service import cargar_dataframe_desde_db

router = APIRouter()

MAPEO_DINAMICO_UI = {}


@router.get("/api/no-clasificados")
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


@router.post("/api/agregar-mapeo")
def agregar_mapeo_dinamico(
    req: NuevoMapeoRequest,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    session: Session = Depends(get_session),
):
    if usuario_actual.rol != "admin":
        raise HTTPException(
            status_code=403,
            detail="Acceso restringido.",
        )

    texto_original = (req.texto_origen or "").strip()

    if not texto_original:
        raise HTTPException(
            status_code=400,
            detail="El texto a mapear no puede estar vacío.",
        )

    categorias_validas = CATEGORIA_ORD + CATEGORIA_CONST

    if req.categoria_destino not in categorias_validas:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Categoría inválida. Categorías disponibles: "
                f"{', '.join(categorias_validas)}"
            ),
        )

    texto_norm = normalizar(texto_original)

    if not texto_norm:
        raise HTTPException(
            status_code=400,
            detail="El texto no contiene caracteres válidos para crear un mapeo.",
        )

    mapeo_existente = session.exec(
        select(MapeoDinamico).where(MapeoDinamico.texto_normalizado == texto_norm)
    ).first()

    if mapeo_existente:
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

        raise HTTPException(
            status_code=409,
            detail=(
                f"El texto '{texto_original}' ya está mapeado a "
                f"'{mapeo_existente.categoria_destino}'. "
                "Elimine o modifique el mapeo existente antes de cambiarlo."
            ),
        )

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

    MAPEO_DINAMICO_UI[texto_norm] = req.categoria_destino

    df, meta_db = cargar_dataframe_desde_db(session)

    if df is not None and not df.empty:
        col_medio = meta_db.get("col_medio")

        if col_medio and col_medio in df.columns:
            df = aplicar_categorizacion(df, col_medio)

        app_state.db_temporal = df
        app_state.meta = meta_db

    elif app_state.db_temporal is not None and app_state.meta.get("col_medio"):
        app_state.db_temporal = aplicar_categorizacion(
            app_state.db_temporal,
            app_state.meta["col_medio"],
        )

    return {
        "status": "ok",
        "mensaje": (f"Mapeado '{texto_original}' -> " f"'{req.categoria_destino}'"),
        "id": nuevo_mapeo.id,
        "persistente": True,
    }
