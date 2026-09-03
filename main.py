from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from datetime import datetime
from contextlib import asynccontextmanager
from typing import List, Optional
from sqlmodel import Session, select
import pandas as pd
import io
import json

# ─── IMPORTAR CONFIGURACIÓN CENTRALIZADA ──────────────────────────────────────
from config import CORS_ORIGINS
from database import get_session
from models import Usuario as UsuarioDB, CargaExcel, DatoProcesal, MapeoDinamico
from auth import (
    autenticar_usuario,
    crear_token_acceso,
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

app = FastAPI(title="Rendición de Cuentas - API Completa", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MAGISTRADOS_OFICIALES = [
    "DR. MAURICIO JAVIER ROJAS",
    "DRA. MARIA ELENA GOMEZ",
    "DR. CARLOS ALBERTO PEREZ",
]


MAPEO_DINAMICO_UI = {}

db_temporal = None
meta = {}

def obtener_df_desde_bd(session: Session):
    """
    Reconstruye el DataFrame utilizado por el dashboard
    a partir de los registros persistidos en PostgreSQL.
    """

    registros = session.exec(select(DatoProcesal).order_by(DatoProcesal.id)).all()

    if not registros:
        return pd.DataFrame()

    datos = []

    for registro in registros:
        datos.append(
            {
                "RADICADO": registro.radicado,
                "PONENTE": registro.ponente,
                "DEMANDANTE": registro.demandante,
                "DEMANDADO": registro.demandado,
                "CLASE": registro.clase,
                "VIGENTE": registro.vigente,
                "_categoria": registro.categoria or "SIN_CLASIFICAR",
                "_es_const": registro.es_const,
                "_es_primera": registro.es_primera,
                "FECHA_ENTRADA": registro.fecha_entrada,
                "FECHA_SALIDA": registro.fecha_salida,
                "MEDIO": registro.medio,
                "CARGA_ID": registro.carga_id,
            }
        )

    df = pd.DataFrame(datos)

    return df


@app.post("/token", response_model=Token)
async def login_por_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    usuario = autenticar_usuario(session, form_data.username, form_data.password)

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = crear_token_acceso(data={"sub": usuario.email})

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/me", response_model=Usuario)
def obtener_perfil_actual(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    return usuario_actual


@app.post("/api/logout")
def cerrar_sesion(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    global db_temporal, meta
    db_temporal = None
    meta = {}
    return {"status": "ok", "mensaje": "Sesión cerrada y datos temporales purgados."}


def cargar_dataframe_desde_db(session: Session):
    global db_temporal, meta
    db_temporal = None
    meta = {}
    """
    Reconstruye el DataFrame de la última carga almacenada en PostgreSQL.
    Esto permite que el sistema siga funcionando después de reiniciar la API.
    """

    carga = session.exec(select(CargaExcel).order_by(CargaExcel.id.desc())).first()

    if not carga:
        return None, {}

    registros = session.exec(
        select(DatoProcesal)
        .where(DatoProcesal.carga_id == carga.id)
        .order_by(DatoProcesal.id)
    ).all()

    if not registros:
        return None, {}

    filas = []

    for dato in registros:
        fila = {}

        # Recuperar las columnas originales conservadas del Excel
        if dato.datos_extra:
            try:
                extra = json.loads(dato.datos_extra)
                if isinstance(extra, dict):
                    fila.update(extra)
            except (json.JSONDecodeError, TypeError):
                pass

        # Garantizar los campos principales
        fila["RADICADO"] = dato.radicado
        fila["PONENTE"] = dato.ponente
        fila["DEMANDANTE"] = dato.demandante
        fila["DEMANDADO"] = dato.demandado
        fila["CLASE"] = dato.clase
        fila["VIGENTE"] = dato.vigente
        fila["CATEGORIA"] = dato.categoria
        fila["_es_const"] = dato.es_const
        fila["_es_primera"] = dato.es_primera
        fila["FECHA_ENTRADA"] = dato.fecha_entrada
        fila["FECHA_SALIDA"] = dato.fecha_salida
        fila["MEDIO"] = dato.medio

        filas.append(fila)

    df = pd.DataFrame(filas)

    # Normalizar fechas conocidas
    columnas_fecha = [
        "FECHAREPARTO",
        "FECHFINA",
        "FECHASALIDA",
        "FECHAPRESENTACION",
        "FECHA_ENTRADA",
        "FECHA_SALIDA",
    ]

    for col in columnas_fecha:
        if col in df.columns:
            df[col] = pd.to_datetime(
                df[col],
                errors="coerce",
                dayfirst=False,
            )

    # Detectar columnas utilizando la misma lógica del cargador Excel
    cols = df.columns

    col_ent = next(
        (
            c
            for c in ["FECHAREPARTO", "FECHAPRESENTACION", "FECHA_ENTRADA"]
            if c in cols
        ),
        None,
    )

    col_sal = next(
        (c for c in ["FECHFINA", "FECHASALIDA", "FECHA_SALIDA"] if c in cols),
        None,
    )

    col_rad = next(
        (c for c in cols if "RADIC" in str(c)),
        None,
    )

    col_ponente = next(
        (
            c
            for c in cols
            if any(k in str(c) for k in ["PONENTE", "MAGISTRADO", "DESPACHO"])
        ),
        None,
    )

    col_medio = next(
        (c for c in cols if "MEDIO" in str(c) or "CLASE" in str(c)),
        None,
    )

    col_dem = next(
        (
            c
            for c in cols
            if any(k in str(c) for k in ["DEMANDADO", "ENTIDAD", "CONTRA"])
        ),
        None,
    )

    col_vigente = next(
        (c for c in cols if "VIGENTE" in str(c)),
        None,
    )

    # Si no encontramos medio pero existe MEDIO, utilizarlo
    if not col_medio and "MEDIO" in df.columns:
        col_medio = "MEDIO"

    # Volver a aplicar categorización
    if col_medio:
        mapeos_dinamicos = obtener_mapeos_dinamicos(session)
        df = aplicar_categorizacion(df, col_medio, mapeos_dinamicos)

    meta_db = {
        "col_ent": col_ent,
        "col_sal": col_sal,
        "col_rad": col_rad,
        "col_ponente": col_ponente,
        "col_medio": col_medio,
        "col_dem": col_dem,
        "col_vigente": col_vigente,
        "carga_id": carga.id,
        "nombre_archivo": carga.nombre_archivo,
    }

    return df, meta_db
    return {"status": "ok", "mensaje": "Sesión cerrada y datos temporales purgados."}


@app.get("/api/admin/usuarios", response_model=List[Usuario])
def listar_usuarios(
    admin: Usuario = Depends(verificar_admin),
    session: Session = Depends(get_session),
):
    usuarios = session.exec(select(UsuarioDB)).all()

    return [
        Usuario(
            username=u.email,
            nombre=u.nombre,
            rol=u.rol,
        )
        for u in usuarios
    ]


@app.post("/api/admin/usuarios")
def crear_usuario(
    dto: UsuarioCreateDTO,
    admin: Usuario = Depends(verificar_admin),
    session: Session = Depends(get_session),
):
    usuario_existente = session.exec(
        select(UsuarioDB).where(UsuarioDB.email == dto.username)
    ).first()

    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="El usuario ya existe.",
        )

    nuevo_usuario = UsuarioDB(
        nombre=dto.nombre.strip().upper(),
        email=dto.username.strip().lower(),
        password_hash=hash_password(dto.password),
        rol=dto.rol.strip().lower(),
    )

    session.add(nuevo_usuario)
    session.commit()
    session.refresh(nuevo_usuario)

    return {
        "status": "ok",
        "mensaje": f"Usuario {nuevo_usuario.email} creado exitosamente.",
    }


@app.put("/api/admin/usuarios/{target_username}")
def editar_usuario(
    target_username: str,
    dto: UsuarioUpdateDTO,
    admin: Usuario = Depends(verificar_admin),
    session: Session = Depends(get_session),
):
    usuario = session.exec(
        select(UsuarioDB).where(UsuarioDB.email == target_username)
    ).first()

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado.",
        )

    if dto.nombre is not None and dto.nombre.strip():
        usuario.nombre = dto.nombre.strip().upper()

    if dto.rol is not None and dto.rol.strip():
        usuario.rol = dto.rol.strip().lower()

    if dto.password is not None and dto.password.strip():
        usuario.password_hash = hash_password(dto.password)

    session.add(usuario)
    session.commit()
    session.refresh(usuario)

    return {
        "status": "ok",
        "mensaje": f"Usuario {usuario.email} actualizado.",
    }


@app.delete("/api/admin/usuarios/{target_username}")
def eliminar_usuario(
    target_username: str,
    admin: Usuario = Depends(verificar_admin),
    session: Session = Depends(get_session),
):
    if target_username == admin.username:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminar tu propio usuario administrador en sesión.",
        )

    usuario = session.exec(
        select(UsuarioDB).where(UsuarioDB.email == target_username)
    ).first()

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado.",
        )

    session.delete(usuario)
    session.commit()

    return {
        "status": "ok",
        "mensaje": f"Usuario {target_username} eliminado exitosamente.",
    }


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
        df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        df.columns = [normalizar(c) for c in df.columns]

        fechas = ["FECHAREPARTO", "FECHFINA", "FECHASALIDA", "FECHAPRESENTACION"]
        for col in df.columns:
            if col in fechas:
                df[col] = pd.to_datetime(
                    df[col].astype(str).str.strip().replace(["nan", "NaT", ""], None),
                    errors="coerce",
                    dayfirst=False,
                )

        cols = df.columns
        col_ent = next(
            (c for c in ["FECHAREPARTO", "FECHAPRESENTACION"] if c in cols), None
        )
        col_sal = next((c for c in ["FECHFINA", "FECHASALIDA"] if c in cols), None)
        col_rad = next((c for c in cols if "RADIC" in c), None)
        col_ponente = next(
            (
                c
                for c in cols
                if any(k in c for k in ["PONENTE", "MAGISTRADO", "DESPACHO"])
            ),
            None,
        )
        col_medio = next((c for c in cols if "MEDIO" in c or "CLASE" in c), cols[0])
        col_dem = next(
            (
                c
                for c in cols
                if any(k in c for k in ["DEMANDADO", "ENTIDAD", "CONTRA"])
            ),
            None,
        )
        col_vigente = next((c for c in cols if "VIGENTE" in c), None)

        if col_rad:
            rad_str = df[col_rad].astype(str).str.strip()
            df["_es_primera"] = rad_str.str.endswith("00")
        else:
            df["_es_primera"] = False

        df = aplicar_categorizacion(df, col_medio)

        # ============================================================
        # PERSISTENCIA EN BASE DE DATOS
        # ============================================================

        nueva_carga = CargaExcel(
            nombre_archivo=file.filename or "archivo_sin_nombre.xlsx",
            usuario_id=(
                session.exec(
                    select(UsuarioDB).where(UsuarioDB.email == usuario_actual.username)
                ).first()
            ).id,
        )

        session.add(nueva_carga)
        session.commit()
        session.refresh(nueva_carga)

        registros_guardados = 0

        for _, fila in df.iterrows():

            def valor_columna(columna):
                if not columna or columna not in df.columns:
                    return None

                valor = fila[columna]

                if pd.isna(valor):
                    return None

                return str(valor).strip()

            dato = DatoProcesal(
                radicado=valor_columna(col_rad) or "SIN_RADICADO",
                ponente=valor_columna(col_ponente),
                demandante=valor_columna(
                    next(
                        (c for c in cols if "DEMANDANTE" in c),
                        None,
                    )
                ),
                demandado=valor_columna(col_dem),
                clase=valor_columna(col_medio),
                vigente=valor_columna(col_vigente),
                categoria=valor_columna("_categoria"),
                es_const=bool(fila.get("_es_const", False)),
                es_primera=bool(fila.get("_es_primera", False)),
                fecha_entrada=(
                    fila[col_ent]
                    if col_ent and col_ent in df.columns and pd.notna(fila[col_ent])
                    else None
                ),
                fecha_salida=(
                    fila[col_sal]
                    if col_sal and col_sal in df.columns and pd.notna(fila[col_sal])
                    else None
                ),
                medio=valor_columna(col_medio),
                carga_id=nueva_carga.id,
                datos_extra=json.dumps(
                    {
                        str(c): (None if pd.isna(fila[c]) else str(fila[c]))
                        for c in cols
                        if not str(c).startswith("_")
                    },
                    ensure_ascii=False,
                ),
            )

            session.add(dato)
            registros_guardados += 1

        session.commit()

        # ============================================================
        # MANTENER FUNCIONAMIENTO ACTUAL DEL DASHBOARD
        # ============================================================

        db_temporal = df
        meta = {
            "col_ent": col_ent,
            "col_sal": col_sal,
            "col_rad": col_rad,
            "col_ponente": col_ponente,
            "col_medio": col_medio,
            "col_dem": col_dem,
            "col_vigente": col_vigente,
        }
        return {
            "status": "ok",
            "operador": usuario_actual.nombre,
            "archivo": file.filename,
            "carga_id": nueva_carga.id,
            "registros_guardados": registros_guardados,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def generar_reporte(df_base: pd.DataFrame) -> dict:
    col_sal = meta.get("col_sal")
    col_rad = meta.get("col_rad")
    col_ent = meta.get("col_ent")
    col_ponente = meta.get("col_ponente")
    col_dem = meta.get("col_dem")
    col_vigente = meta.get("col_vigente")

    if not col_vigente or df_base.empty:
        return {
            "ing_ord": {"p": 0, "s": 0},
            "ing_const": {"p": 0, "s": 0},
            "egr_ord": {"p": 0, "s": 0},
            "egr_const": {"p": 0, "s": 0},
            "entidades": [],
            "metricas": {
                "ingresos_totales": len(df_base),
                "activos": 0,
                "finalizados": 0,
                "inconsistentes": 0,
                "eficiencia": 0,
                "lista_vigentes": [],
                "lista_inconsistentes": [],
            },
            "tablas": {"ord_1": [], "ord_2": [], "const_1": [], "const_2": []},
        }

    vig_raw = df_base[col_vigente].astype(str).str.strip().str.upper()
    es_activo = vig_raw.isin(["SI", "VIGENTE", "ACTIVO"])

    df_act = df_base[es_activo]
    df_inactivos = df_base[~es_activo]

    if col_sal:
        df_out = df_inactivos[df_inactivos[col_sal].notna()]
        df_inconsistentes = df_inactivos[df_inactivos[col_sal].isna()]
    else:
        df_out = df_inactivos
        df_inconsistentes = pd.DataFrame()

    def contar_p_s(mask_df: pd.DataFrame):
        if mask_df.empty:
            return 0, 0
        p = int(mask_df["_es_primera"].sum())
        return p, len(mask_df) - p

    i_c1, i_c2 = contar_p_s(df_base[df_base["_es_const"]])
    i_o1, i_o2 = contar_p_s(df_base[~df_base["_es_const"]])
    e_c1, e_c2 = contar_p_s(df_out[df_out["_es_const"]])
    e_o1, e_o2 = contar_p_s(df_out[~df_out["_es_const"]])

    lista_v = []
    if not df_act.empty and col_rad:
        df_act_calc = df_act.copy()
        if col_ent and col_ent in df_act_calc.columns:
            fechas_reparto = pd.to_datetime(df_act_calc[col_ent], errors="coerce")
            dias = (pd.Timestamp.now() - fechas_reparto).dt.days.fillna(-1).astype(int)
        else:
            dias = [-1] * len(df_act_calc)

        rads = df_act_calc[col_rad].fillna("S.D.").astype(str).values
        meds = df_act_calc[meta["col_medio"]].fillna("S.D.").astype(str).values
        pons = (
            df_act_calc[col_ponente].fillna("S.D.").astype(str).values
            if col_ponente
            else ["S.D."] * len(df_act_calc)
        )
        dias_arr = dias.values if hasattr(dias, "values") else dias

        lista_v = [
            {
                "radicado": rads[i],
                "medio": meds[i],
                "ponente": pons[i],
                "dias": int(dias_arr[i]),
            }
            for i in range(len(df_act_calc))
        ]

    lista_inc = []
    if not df_inconsistentes.empty and col_rad:
        df_inc_calc = df_inconsistentes.copy()
        rads = df_inc_calc[col_rad].fillna("S.D.").astype(str).values
        meds = df_inc_calc[meta["col_medio"]].fillna("S.D.").astype(str).values
        pons = (
            df_inc_calc[col_ponente].fillna("S.D.").astype(str).values
            if col_ponente
            else ["S.D."] * len(df_inc_calc)
        )

        lista_inc = [
            {
                "radicado": rads[i],
                "medio": meds[i],
                "ponente": pons[i],
                "dias": -1,
                "sin_salida": True,
            }
            for i in range(len(df_inc_calc))
        ]

    top_ent = df_base[col_dem].value_counts().to_dict() if col_dem else {}

    def obtener_tabla_ing_egr(categorias, df_in_f, df_out_f, es_primera):
        def contar(df_f):
            if df_f.empty:
                return {cat: 0 for cat in categorias}
            grp = (
                df_f[df_f["_categoria"].isin(set(categorias))]
                .groupby(["_categoria", "_es_primera"])
                .size()
            )
            return {cat: int(grp.get((cat, es_primera), 0)) for cat in categorias}

        ing = contar(df_in_f)
        egr = contar(df_out_f)
        return [
            {"medio": cat, "ingresos": ing[cat], "egresos": egr[cat]}
            for cat in categorias
        ]

    mask_base_ord = ~df_base["_es_const"]
    mask_base_const = df_base["_es_const"]

    return {
        "ing_ord": {"p": i_o1, "s": i_o2},
        "ing_const": {"p": i_c1, "s": i_c2},
        "egr_ord": {"p": e_o1, "s": e_o2},
        "egr_const": {"p": e_c1, "s": e_c2},
        "entidades": [
            {"nombre": str(n), "cantidad": int(v)} for n, v in top_ent.items()
        ],
        "metricas": {
            "ingresos_totales": len(df_base),
            "activos": len(df_act),
            "finalizados": len(df_out),
            "inconsistentes": len(df_inconsistentes),
            "eficiencia": (
                round(len(df_out) / len(df_base) * 100, 1) if len(df_base) > 0 else 0
            ),
            "lista_vigentes": lista_v,
            "lista_inconsistentes": lista_inc,
        },
        "tablas": {
            "ord_1": obtener_tabla_ing_egr(
                CATEGORIA_ORD,
                df_base[mask_base_ord],
                df_out[~df_out["_es_const"]],
                True,
            ),
            "ord_2": obtener_tabla_ing_egr(
                CATEGORIA_ORD,
                df_base[mask_base_ord],
                df_out[~df_out["_es_const"]],
                False,
            ),
            "const_1": obtener_tabla_ing_egr(
                CATEGORIA_CONST,
                df_base[mask_base_const],
                df_out[df_out["_es_const"]],
                True,
            ),
            "const_2": obtener_tabla_ing_egr(
                CATEGORIA_CONST,
                df_base[mask_base_const],
                df_out[df_out["_es_const"]],
                False,
            ),
        },
    }


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

    col_ent = meta_db.get("col_ent")
    col_ponente = meta_db.get("col_ponente")

    if desde and desde.strip().lower() not in ("", "undefined", "null", "none"):
        try:
            fecha_desde = pd.to_datetime(desde, errors="coerce")
            if pd.notna(fecha_desde) and col_ent:
                df = df[df[col_ent] >= fecha_desde]
        except Exception:
            pass

    if hasta and hasta.strip().lower() not in ("", "undefined", "null", "none"):
        try:
            fecha_hasta = pd.to_datetime(hasta, errors="coerce")
            if pd.notna(fecha_hasta) and col_ent:
                df = df[df[col_ent] <= fecha_hasta]
        except Exception:
            pass

    list_p = (
        sorted([str(p) for p in df[col_ponente].dropna().unique()])
        if col_ponente
        else []
    )

    return {
        "usuario": usuario_actual.nombre,
        "rol": usuario_actual.rol,
        "general": generar_reporte(df),
        "ponentes": {p: generar_reporte(df[df[col_ponente] == p]) for p in list_p},
        "lista_ponentes": list_p,
    }


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

    col_ent = meta_db.get("col_ent")
    col_ponente = meta_db.get("col_ponente")

    def filtrar_df_por_criterios(desde, hasta, ponente, tipo):
        df_f = df.copy()

        if col_ent:
            if desde and desde.strip().lower() not in (
                "",
                "undefined",
                "null",
                "none",
            ):
                fecha_desde = pd.to_datetime(desde, errors="coerce")
                if pd.notna(fecha_desde):
                    df_f = df_f[df_f[col_ent] >= fecha_desde]

            if hasta and hasta.strip().lower() not in (
                "",
                "undefined",
                "null",
                "none",
            ):
                fecha_hasta = pd.to_datetime(hasta, errors="coerce")
                if pd.notna(fecha_hasta):
                    df_f = df_f[df_f[col_ent] <= fecha_hasta]

        if ponente and ponente != "General" and col_ponente:
            base_col = (
                df_f[col_ponente]
                .astype(str)
                .str.replace(
                    r"\s*\*?\s*cambio\s+ponente",
                    "",
                    case=False,
                    regex=True,
                )
                .str.strip()
                .str.lower()
            )

            target_base = ponente.strip().lower()

            if tipo == "principal":
                df_f = df_f[
                    (base_col == target_base)
                    & (
                        ~df_f[col_ponente]
                        .astype(str)
                        .str.contains(
                            r"cambio\s+ponente",
                            case=False,
                            regex=True,
                        )
                    )
                ]

            elif tipo == "cambio":
                df_f = df_f[
                    (base_col == target_base)
                    & (
                        df_f[col_ponente]
                        .astype(str)
                        .str.contains(
                            r"cambio\s+ponente",
                            case=False,
                            regex=True,
                        )
                    )
                ]

            else:
                df_f = df_f[base_col == target_base]

        return df_f

    df_a = filtrar_df_por_criterios(
        desde_a,
        hasta_a,
        ponente_a,
        tipo_a,
    )

    df_b = filtrar_df_por_criterios(
        desde_b,
        hasta_b,
        ponente_b,
        tipo_b,
    )

    rep_a = generar_reporte(df_a)
    rep_b = generar_reporte(df_b)

    def pct_change(val_a, val_b):
        if val_a == 0:
            return 100.0 if val_b > 0 else 0.0

        return round(
            ((val_b - val_a) / abs(val_a)) * 100,
            2,
        )

    met_a = rep_a["metricas"]
    met_b = rep_b["metricas"]

    variaciones = {
        "ingresos_pct": pct_change(
            met_a["ingresos_totales"],
            met_b["ingresos_totales"],
        ),
        "egresos_pct": pct_change(
            met_a["finalizados"],
            met_b["finalizados"],
        ),
        "activos_pct": pct_change(
            met_a["activos"],
            met_b["activos"],
        ),
        "eficiencia_diff": round(
            met_b["eficiencia"] - met_a["eficiencia"],
            2,
        ),
    }

    return {
        "modo": modo,
        "grupo_a": rep_a,
        "grupo_b": rep_b,
        "variaciones": variaciones,
    }


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

    # =========================================================
    # 1. PROCESOS VIGENTES
    # =========================================================

    vig_raw = df[col_vigente].astype(str).str.strip().str.upper()

    es_vigente = vig_raw.isin(["SI", "VIGENTE", "ACTIVO"])

    df_vigentes = df[es_vigente].copy()

    # =========================================================
    # 2. FECHA DE ENTRADA Y DÍAS DE ANTIGÜEDAD
    # =========================================================

    df_vigentes["_fecha_entrada_cb"] = pd.to_datetime(
        df_vigentes[col_ent],
        errors="coerce",
    )

    hoy = pd.Timestamp.now().normalize()

    df_vigentes["_dias_cb"] = (hoy - df_vigentes["_fecha_entrada_cb"]).dt.days

    df_vigentes = df_vigentes[df_vigentes["_dias_cb"].notna()].copy()

    df_vigentes["_dias_cb"] = df_vigentes["_dias_cb"].astype(int)

    # =========================================================
    # 3. CLASIFICACIÓN
    # =========================================================

    def clasificar_nivel(dias):
        if dias >= umbral_critico:
            return "critico"

        if dias >= umbral_atencion:
            return "atencion"

        return "normal"

    df_vigentes["_nivel_cb"] = df_vigentes["_dias_cb"].apply(clasificar_nivel)

    # =========================================================
    # 4. NORMALIZAR PONENTE
    # =========================================================

    df_vigentes["_ponente_cb"] = (
        df_vigentes[col_ponente]
        .astype(str)
        .str.replace(
            r"\s*\*?\s*cambio\s+ponente",
            "",
            case=False,
            regex=True,
        )
        .str.strip()
    )

    # =========================================================
    # 5. RESUMEN GENERAL
    # =========================================================

    total_vigentes = len(df_vigentes)

    total_normales = int((df_vigentes["_nivel_cb"] == "normal").sum())

    total_atencion = int((df_vigentes["_nivel_cb"] == "atencion").sum())

    total_criticos = int((df_vigentes["_nivel_cb"] == "critico").sum())

    promedio_dias = (
        round(
            float(df_vigentes["_dias_cb"].mean()),
            1,
        )
        if total_vigentes
        else 0
    )

    max_dias = int(df_vigentes["_dias_cb"].max()) if total_vigentes else 0

    # =========================================================
    # 6. RANGO DE ANTIGÜEDAD
    # =========================================================

    rangos = [
        ("0-179", 0, 179),
        ("180-364", 180, 364),
        ("365-449", 365, 449),
        ("450-539", 450, 539),
        ("540-629", 540, 629),
        ("630+", 630, None),
    ]

    antiguedad = []

    for nombre, minimo, maximo in rangos:

        if maximo is None:
            mask = df_vigentes["_dias_cb"] >= minimo
        else:
            mask = (df_vigentes["_dias_cb"] >= minimo) & (
                df_vigentes["_dias_cb"] <= maximo
            )

        cantidad = int(mask.sum())

        antiguedad.append(
            {
                "rango": nombre,
                "desde_dias": minimo,
                "hasta_dias": maximo,
                "cantidad": cantidad,
            }
        )

    # =========================================================
    # 7. CONCENTRACIÓN POR PONENTE
    # =========================================================

    ranking_ponentes = []

    for ponente, grupo in df_vigentes.groupby("_ponente_cb"):

        total = len(grupo)

        criticos = int((grupo["_nivel_cb"] == "critico").sum())

        atencion = int((grupo["_nivel_cb"] == "atencion").sum())

        promedio = round(
            float(grupo["_dias_cb"].mean()),
            1,
        )

        maximo = int(grupo["_dias_cb"].max())

        porcentaje_critico = (
            round(
                criticos / total * 100,
                2,
            )
            if total
            else 0
        )

        ranking_ponentes.append(
            {
                "ponente": str(ponente),
                "procesos_vigentes": total,
                "criticos": criticos,
                "atencion": atencion,
                "porcentaje_critico": porcentaje_critico,
                "promedio_dias": promedio,
                "max_dias": maximo,
            }
        )

    ranking_ponentes.sort(
        key=lambda x: (
            x["criticos"],
            x["porcentaje_critico"],
            x["promedio_dias"],
        ),
        reverse=True,
    )

    # =========================================================
    # 8. CONCENTRACIÓN POR CATEGORÍA
    # =========================================================

    por_categoria = []

    if "_categoria" in df_vigentes.columns:

        for categoria, grupo in df_vigentes.groupby("_categoria"):

            total = len(grupo)

            criticos = int((grupo["_nivel_cb"] == "critico").sum())

            atencion = int((grupo["_nivel_cb"] == "atencion").sum())

            por_categoria.append(
                {
                    "categoria": str(categoria),
                    "procesos_vigentes": total,
                    "criticos": criticos,
                    "atencion": atencion,
                    "porcentaje_critico": (
                        round(
                            criticos / total * 100,
                            2,
                        )
                        if total
                        else 0
                    ),
                }
            )

    por_categoria.sort(
        key=lambda x: x["criticos"],
        reverse=True,
    )

    # =========================================================
    # 9. CONCENTRACIÓN POR MEDIO
    # =========================================================

    por_medio = []

    if col_medio:

        for medio, grupo in df_vigentes.groupby(col_medio):

            total = len(grupo)

            criticos = int((grupo["_nivel_cb"] == "critico").sum())

            atencion = int((grupo["_nivel_cb"] == "atencion").sum())

            por_medio.append(
                {
                    "medio": str(medio),
                    "procesos_vigentes": total,
                    "criticos": criticos,
                    "atencion": atencion,
                    "porcentaje_critico": (
                        round(
                            criticos / total * 100,
                            2,
                        )
                        if total
                        else 0
                    ),
                }
            )

    por_medio.sort(
        key=lambda x: x["criticos"],
        reverse=True,
    )

    # =========================================================
    # 10. PROCESOS CRÍTICOS
    # =========================================================

    df_criticos = df_vigentes[df_vigentes["_nivel_cb"] == "critico"].copy()

    df_criticos = df_criticos.sort_values(
        "_dias_cb",
        ascending=False,
    )

    procesos_criticos = []

    for _, fila in df_criticos.iterrows():

        radicado = str(fila[col_rad]) if col_rad and pd.notna(fila[col_rad]) else "S.D."

        ponente_original = (
            str(fila[col_ponente]) if pd.notna(fila[col_ponente]) else "S.D."
        )

        ponente = str(fila["_ponente_cb"]) if pd.notna(fila["_ponente_cb"]) else "S.D."

        medio = (
            str(fila[col_medio]) if col_medio and pd.notna(fila[col_medio]) else "S.D."
        )

        categoria = (
            str(fila["_categoria"])
            if "_categoria" in fila.index and pd.notna(fila["_categoria"])
            else "Sin categoría"
        )

        fecha_entrada = (
            fila["_fecha_entrada_cb"].strftime("%Y-%m-%d")
            if pd.notna(fila["_fecha_entrada_cb"])
            else None
        )

        procesos_criticos.append(
            {
                "radicado": radicado,
                "ponente": ponente,
                "ponente_original": ponente_original,
                "medio": medio,
                "categoria": categoria,
                "fecha_entrada": fecha_entrada,
                "dias": int(fila["_dias_cb"]),
                "nivel": "critico",
            }
        )

    # =========================================================
    # 11. RESPUESTA
    # =========================================================

    return {
        "umbrales": {
            "atencion_desde": umbral_atencion,
            "critico_desde": umbral_critico,
        },
        "resumen": {
            "procesos_vigentes": total_vigentes,
            "normales": total_normales,
            "atencion": total_atencion,
            "criticos": total_criticos,
            "promedio_dias": promedio_dias,
            "max_dias": max_dias,
        },
        "antiguedad": antiguedad,
        "ranking_ponentes": ranking_ponentes,
        "por_categoria": por_categoria,
        "por_medio": por_medio,
        "procesos_criticos": procesos_criticos,
    }


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

    col_ent = meta_db.get("col_ent")
    col_ponente = meta_db.get("col_ponente")

    # Filtro por fecha inicial
    if col_ent:
        try:
            if desde and desde not in ("undefined", "null", "none", ""):
                fecha_desde = pd.to_datetime(desde, errors="coerce")

                if pd.notna(fecha_desde):
                    df = df[df[col_ent] >= fecha_desde]
        except Exception:
            pass

    # Filtro por fecha final
    if col_ent:
        try:
            if hasta and hasta not in ("undefined", "null", "none", ""):
                fecha_hasta = pd.to_datetime(hasta, errors="coerce")

                if pd.notna(fecha_hasta):
                    df = df[df[col_ent] <= fecha_hasta]
        except Exception:
            pass

    # Filtro por ponente
    if ponente and ponente != "General" and col_ponente:
        df = df[df[col_ponente] == ponente]

    # No exportar columnas internas del sistema
    cols_a_enviar = [c for c in df.columns if not str(c).startswith("_")]

    df_publico = df[cols_a_enviar]

    output = io.BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df_publico.to_excel(
            writer,
            index=False,
            sheet_name="Datos_Rendicion_Filtrados",
        )

    output.seek(0)

    filename = (
        f"reporte_{ponente or 'General'}_" f"{datetime.now().strftime('%Y%m%d')}.xlsx"
    )

    return StreamingResponse(
        output,
        media_type=(
            "application/vnd.openxmlformats-officedocument." "spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
