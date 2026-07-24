from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import pandas as pd
import io
import unicodedata

# ─── CONFIGURACIÓN DE SEGURIDAD CRYPTO / JWT ──────────────────────────────────
SECRET_KEY = "MI_CLAVE_SECRETA_SUPER_SEGURA_PARA_EL_PALACIO"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI(title="Rendición de Cuentas - API Completa", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── MODELOS Y DTOs ───────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str


class Usuario(BaseModel):
    username: str
    nombre: str
    rol: str


class UsuarioCreateDTO(BaseModel):
    username: str
    nombre: str
    rol: str
    password: str


class UsuarioUpdateDTO(BaseModel):
    nombre: Optional[str] = None
    rol: Optional[str] = None
    password: Optional[str] = None


class NuevoMapeoRequest(BaseModel):
    texto_origen: str
    categoria_destino: str


class ListaMagistradosDTO(BaseModel):
    magistrados: List[str]


# Base de Datos de Usuarios en Memoria
USUARIOS_DB = {
    "admin@palacio.gov.co": {
        "username": "admin@palacio.gov.co",
        "nombre": "ADMINISTRADOR SISTEMA",
        "rol": "admin",
        "password_hash": pwd_context.hash("admin123"),
    },
}

MAGISTRADOS_OFICIALES = [
    "DR. MAURICIO JAVIER ROJAS",
    "DRA. MARIA ELENA GOMEZ",
    "DR. CARLOS ALBERTO PEREZ",
]


def verificar_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def crear_token_acceso(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def obtener_usuario_actual(token: str = Depends(oauth2_scheme)):
    credenciales_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales de acceso.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credenciales_exception
    except JWTError:
        raise credenciales_exception

    usuario = USUARIOS_DB.get(username)
    if usuario is None:
        raise credenciales_exception
    return Usuario(
        username=usuario["username"], nombre=usuario["nombre"], rol=usuario["rol"]
    )


def verificar_admin(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    if usuario_actual.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso exclusivo para Administradores del sistema.",
        )
    return usuario_actual


def normalizar(texto):
    if not isinstance(texto, str):
        return ""
    return (
        "".join(
            c
            for c in unicodedata.normalize("NFKD", texto)
            if not unicodedata.combining(c)
        )
        .strip()
        .upper()
    )


MAPEO_UNIFICADO = {
    "Nulidad y Restablecimiento": ["ACCION DE NULIDAD Y RESTABLECIMIENTO DEL DERECHO"],
    "Reparación Directa": ["ACCION DE REPARACION DIRECTA"],
    "Controversias Contractuales": ["ACCION CONTRACTUAL"],
    "Nulidad Electoral": ["ACCION DE NULIDAD CONTRA ACTOS ELECTORALES", "ELECTORALES"],
    "Nulidad Simple": [
        "ACCION DE NULIDAD",
        "ACCION DE NULIDAD Y SUSPENSION PROVISIONAL",
    ],
    "Tutela": ["ACCIONS DE TUTELA", "TUTELA"],
    "Popular": ["ACCIONES POPULARES", "ACCION POPULAR"],
    "Cumplimiento": ["ACCIONES DE CUMPLIMIENTO"],
    "Grupo": ["ACCION DE GRUPO"],
    "Ejecutivo": ["EJECUTIVO"],
    "Conciliación": ["CONCILIACION"],
    "Hábeas Corpus": ["HABEAS CORPUS", "HABEAS CORPUS (IMPUGNACION)"],
    "Repetición": ["ACCION DE REPETICION"],
    "Pérdida de Investidura": ["PERDIDA DE INVESTIDURA"],
    "Revisión de Acuerdos": ["REVISION DE ACUERDOS"],
    "Conflictos": ["CONFLICTO DE COMPETENCIA"],
    "Despachos": ["DESPACHOS COMISORIOS", "DESPACHO COMISORIO"],
    "Recursos de Insistencia": [
        "RECURSO DE INSISTENCIA",
        "INSISTENCIA",
        "RECURSOS DE INSISTENCIA",
    ],
    "Restitución de Inmueble": ["RESTITUCION DE INMUEBLE"],
    "Pago por Consignación": ["PAGO POR CONSIGNACION"],
    "Control de Constitucionalidad": ["CONTROL PREVIO DE CONSTITUCIONALIDAD"],
    "Peticiones": ["PETICIONES", "DERECHO DE PETICION"],
    "Control de Legalidad": ["CONTROL INMEDIATO DE LEGALIDAD"],
    "Nulidad por Inconstitucionalidad": ["ACCION DE NULIDAD POR INCONSTITUCIONALIDAD"],
    "Recurso de Revisión": ["RECURSO EXTRAORDINARIO DE REVISION", "ACCION DE REVISION"],
    "Incidente de Impedimento": [
        "INCIDENTE DE INPEDIMENTO",
        "INCIDENTE DE IMPEDIMENTO",
    ],
}

CATEGORIA_ORD = [
    "Nulidad y Restablecimiento",
    "Ejecutivo",
    "Reparación Directa",
    "Controversias Contractuales",
    "Nulidad Electoral",
    "Nulidad Simple",
    "Conciliación",
    "Repetición",
    "Pérdida de Investidura",
    "Revisión de Acuerdos",
    "Conflictos",
    "Despachos",
    "Recursos de Insistencia",
    "Restitución de Inmueble",
    "Pago por Consignación",
    "Recurso de Revisión",
    "Incidente de Impedimento",
]

CATEGORIA_CONST = [
    "Tutela",
    "Popular",
    "Hábeas Corpus",
    "Cumplimiento",
    "Grupo",
    "Control de Constitucionalidad",
    "Peticiones",
    "Control de Legalidad",
    "Nulidad por Inconstitucionalidad",
]

MAPEO_DINAMICO_UI = {}
MAPEO_NORM = {k: set(normalizar(v) for v in vs) for k, vs in MAPEO_UNIFICADO.items()}

db_temporal = None
meta = {}


def aplicar_categorizacion(df, col_medio):
    df["_medio_norm"] = df[col_medio].apply(normalizar)
    norm_a_cat = {v: k for k, vs in MAPEO_NORM.items() for v in vs}
    norm_a_cat.update(MAPEO_DINAMICO_UI)

    df["_categoria"] = df["_medio_norm"].map(norm_a_cat).fillna("SIN_CLASIFICAR")

    const_set = set(v for k in CATEGORIA_CONST for v in MAPEO_NORM[k])
    for texto_norm, cat in MAPEO_DINAMICO_UI.items():
        if cat in CATEGORIA_CONST:
            const_set.add(texto_norm)

    df["_es_const"] = df["_medio_norm"].isin(const_set)
    return df


@app.post("/token", response_model=Token)
async def login_por_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    usuario = USUARIOS_DB.get(form_data.username)
    if not usuario or not verificar_password(
        form_data.password, usuario["password_hash"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = crear_token_acceso(data={"sub": usuario["username"]})
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


@app.get("/api/admin/usuarios", response_model=List[Usuario])
def listar_usuarios(admin: Usuario = Depends(verificar_admin)):
    return [
        Usuario(username=u["username"], nombre=u["nombre"], rol=u["rol"])
        for u in USUARIOS_DB.values()
    ]


@app.post("/api/admin/usuarios")
def crear_usuario(dto: UsuarioCreateDTO, admin: Usuario = Depends(verificar_admin)):
    if dto.username in USUARIOS_DB:
        raise HTTPException(status_code=400, detail="El usuario ya existe.")
    USUARIOS_DB[dto.username] = {
        "username": dto.username,
        "nombre": dto.nombre.upper(),
        "rol": dto.rol.lower(),
        "password_hash": pwd_context.hash(dto.password),
    }
    return {"status": "ok", "mensaje": f"Usuario {dto.username} creado exitosamente."}


@app.put("/api/admin/usuarios/{target_username}")
def editar_usuario(
    target_username: str,
    dto: UsuarioUpdateDTO,
    admin: Usuario = Depends(verificar_admin),
):
    if target_username not in USUARIOS_DB:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    usr = USUARIOS_DB[target_username]
    if dto.nombre:
        usr["nombre"] = dto.nombre.upper()
    if dto.rol:
        usr["rol"] = dto.rol.lower()
    if dto.password and dto.password.strip():
        usr["password_hash"] = pwd_context.hash(dto.password)
    return {"status": "ok", "mensaje": f"Usuario {target_username} actualizado."}


@app.delete("/api/admin/usuarios/{target_username}")
def eliminar_usuario(target_username: str, admin: Usuario = Depends(verificar_admin)):
    if target_username == admin.username:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminar tu propio usuario administrador en sesión.",
        )
    if target_username not in USUARIOS_DB:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    del USUARIOS_DB[target_username]
    return {"status": "ok", "mensaje": f"Usuario {target_username} eliminado."}


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
                    dayfirst=True,
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
        return {"status": "ok", "operador": usuario_actual.nombre}
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
):
    if db_temporal is None:
        return {"error": "No hay datos"}

    col_ent = meta["col_ent"]
    col_ponente = meta["col_ponente"]
    df = db_temporal.copy()

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
        sorted([str(p) for p in db_temporal[col_ponente].dropna().unique()])
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
):
    if db_temporal is None:
        raise HTTPException(
            status_code=400, detail="No hay datos cargados en el sistema."
        )

    col_ent = meta["col_ent"]
    col_ponente = meta["col_ponente"]

    def filtrar_df_por_criterios(desde, hasta, ponente, tipo):
        df_f = db_temporal.copy()
        if col_ent:
            if desde and desde.strip().lower() not in ("", "undefined", "null", "none"):
                df_f = df_f[df_f[col_ent] >= pd.to_datetime(desde, errors="coerce")]
            if hasta and hasta.strip().lower() not in ("", "undefined", "null", "none"):
                df_f = df_f[df_f[col_ent] <= pd.to_datetime(hasta, errors="coerce")]

        if ponente and ponente != "General" and col_ponente:
            base_col = (
                df_f[col_ponente]
                .astype(str)
                .str.replace(r"\s*\*?\s*cambio\s+ponente", "", case=False, regex=True)
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
                        .str.contains(r"cambio\s+ponente", case=False, regex=True)
                    )
                ]
            elif tipo == "cambio":
                df_f = df_f[
                    (base_col == target_base)
                    & (
                        df_f[col_ponente]
                        .astype(str)
                        .str.contains(r"cambio\s+ponente", case=False, regex=True)
                    )
                ]
            else:
                df_f = df_f[base_col == target_base]
        return df_f

    df_a = filtrar_df_por_criterios(desde_a, hasta_a, ponente_a, tipo_a)
    df_b = filtrar_df_por_criterios(desde_b, hasta_b, ponente_b, tipo_b)

    rep_a = generar_reporte(df_a)
    rep_b = generar_reporte(df_b)

    def pct_change(val_a, val_b):
        if val_a == 0:
            return 100.0 if val_b > 0 else 0.0
        return round(((val_b - val_a) / abs(val_a)) * 100, 2)

    met_a = rep_a["metricas"]
    met_b = rep_b["metricas"]

    variaciones = {
        "ingresos_pct": pct_change(
            met_a["ingresos_totales"], met_b["ingresos_totales"]
        ),
        "egresos_pct": pct_change(met_a["finalizados"], met_b["finalizados"]),
        "activos_pct": pct_change(met_a["activos"], met_b["activos"]),
        "eficiencia_diff": round(met_b["eficiencia"] - met_a["eficiencia"], 2),
    }

    return {
        "modo": modo,
        "grupo_a": rep_a,
        "grupo_b": rep_b,
        "variaciones": variaciones,
    }


@app.get("/api/no-clasificados")
def obtener_no_clasificados(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="Acceso restringido.")
    if db_temporal is None:
        return {
            "no_clasificados": [],
            "categorias_disponibles": CATEGORIA_ORD + CATEGORIA_CONST,
        }

    sin_clasificar_df = db_temporal[db_temporal["_categoria"] == "SIN_CLASIFICAR"]
    if sin_clasificar_df.empty:
        return {
            "no_clasificados": [],
            "categorias_disponibles": CATEGORIA_ORD + CATEGORIA_CONST,
        }

    col_medio = meta["col_medio"]
    conteo = sin_clasificar_df[col_medio].value_counts().to_dict()

    return {
        "no_clasificados": [
            {"texto_original": str(k), "frecuencia": int(v)} for k, v in conteo.items()
        ],
        "categorias_disponibles": CATEGORIA_ORD + CATEGORIA_CONST,
    }


@app.post("/api/agregar-mapeo")
def agregar_mapeo_dinamico(
    req: NuevoMapeoRequest, usuario_actual: Usuario = Depends(obtener_usuario_actual)
):
    global db_temporal
    if usuario_actual.rol != "admin":
        raise HTTPException(status_code=403, detail="Acceso restringido.")

    texto_norm = normalizar(req.texto_origen)
    MAPEO_DINAMICO_UI[texto_norm] = req.categoria_destino

    if db_temporal is not None:
        db_temporal = aplicar_categorizacion(db_temporal, meta["col_medio"])

    return {
        "status": "ok",
        "mensaje": f"Mapeado '{req.texto_origen}' -> '{req.categoria_destino}'",
    }


@app.get("/api/exportar-excel")
def exportar_excel(
    desde: str = None,
    hasta: str = None,
    ponente: str = None,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    if db_temporal is None:
        raise HTTPException(
            status_code=400, detail="No hay datos cargados para exportar."
        )

    df = db_temporal.copy()
    col_ent = meta["col_ent"]
    col_ponente = meta["col_ponente"]

    if col_ent:
        try:
            if desde and desde not in ("undefined", "null", "none", ""):
                df = df[df[col_ent] >= pd.to_datetime(desde, errors="coerce")]
            if hasta and hasta not in ("undefined", "null", "none", ""):
                df = df[df[col_ent] <= pd.to_datetime(hasta, errors="coerce")]
        except Exception:
            pass

    if ponente and ponente != "General" and col_ponente:
        df = df[df[col_ponente] == ponente]

    cols_a_enviar = [c for c in df.columns if not c.startswith("_")]
    df_publico = df[cols_a_enviar]

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df_publico.to_excel(writer, index=False, sheet_name="Datos_Rendicion_Filtrados")
    output.seek(0)

    filename = (
        f"reporte_{ponente or 'General'}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    )
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
