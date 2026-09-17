import io
import os
import json
import uuid
import hashlib
import pandas as pd
from sqlmodel import Session, select, or_
from fastapi import HTTPException, status

from models import CargaExcel, DatoProcesal, Usuario
from services.clasificacion_service import aplicar_categorizacion, normalizar
from services.mapeo_service import obtener_mapeos_dinamicos

UPLOAD_DIR = "uploads_excel"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _tiene_acceso(carga: CargaExcel, usuario_actual) -> bool:
    """Regla central de privacidad, compartida por todos los módulos que leen un Excel."""
    if usuario_actual is None:
        return True
    if carga.es_global:
        return True
    if carga.usuario_id == usuario_actual.id:
        return True
    if getattr(usuario_actual, "rol", None) == "admin":
        return True
    return False


def obtener_df_desde_bd(session: Session):
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

    return pd.DataFrame(datos)


def cargar_dataframe_desde_db(session: Session, carga_id: int = None, usuario_actual=None):
    """
    Resuelve qué CargaExcel usar:
    - Si viene carga_id y el usuario tiene acceso a esa carga, se usa esa.
    - Si viene carga_id pero el usuario NO tiene acceso, se ignora (no se filtra
      información ajena) y se aplica el comportamiento por defecto de abajo.
    - Sin carga_id: un usuario normal ve su propia carga más reciente, o si no
      tiene ninguna, la institucional más reciente. Un admin (o llamadas internas
      sin usuario) ve la carga más reciente del sistema.
    """
    carga = None

    if carga_id is not None:
        candidata = session.get(CargaExcel, carga_id)
        if candidata and _tiene_acceso(candidata, usuario_actual):
            carga = candidata

    if carga is None:
        if usuario_actual is not None and getattr(usuario_actual, "rol", None) != "admin":
            carga = session.exec(
                select(CargaExcel)
                .where(CargaExcel.usuario_id == usuario_actual.id)
                .order_by(CargaExcel.id.desc())
            ).first()
            if not carga:
                carga = session.exec(
                    select(CargaExcel)
                    .where(CargaExcel.es_global == True)
                    .order_by(CargaExcel.id.desc())
                ).first()
        else:
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

        if dato.datos_extra:
            try:
                extra = json.loads(dato.datos_extra)
                if isinstance(extra, dict):
                    fila.update(extra)
            except (json.JSONDecodeError, TypeError):
                pass

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

    if not col_medio and "MEDIO" in df.columns:
        col_medio = "MEDIO"

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


def procesar_archivo_excel(
    content: bytes,
    filename: str,
    usuario_email: str,
    session: Session,
    es_global: bool = False,
):
    # Verificación de duplicados por contenido, ANTES de procesar nada más
    hash_valor = hashlib.sha256(content).hexdigest()
    existente = session.exec(
        select(CargaExcel).where(CargaExcel.hash_archivo == hash_valor)
    ).first()

    if existente:
        if existente.es_global:
            origen = "por el administrador (archivo institucional)"
        else:
            propietario_existente = session.get(Usuario, existente.usuario_id)
            nombre_prop = propietario_existente.nombre if propietario_existente else "otro usuario"
            origen = f"por {nombre_prop}"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Este archivo ya fue cargado previamente {origen} (\"{existente.nombre_archivo}\"). No puedes volver a cargarlo.",
        )

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

    usuario = session.exec(select(Usuario).where(Usuario.email == usuario_email)).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    nombre_unico = f"{uuid.uuid4().hex}_{filename or 'archivo.xlsx'}"
    ruta_archivo = os.path.join(UPLOAD_DIR, nombre_unico)
    with open(ruta_archivo, "wb") as f:
        f.write(content)

    nueva_carga = CargaExcel(
        nombre_archivo=filename or "archivo_sin_nombre.xlsx",
        ruta_archivo=ruta_archivo,
        hash_archivo=hash_valor,
        es_global=bool(es_global),
        usuario_id=usuario.id,
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

    meta = {
        "col_ent": col_ent,
        "col_sal": col_sal,
        "col_rad": col_rad,
        "col_ponente": col_ponente,
        "col_medio": col_medio,
        "col_dem": col_dem,
        "col_vigente": col_vigente,
    }

    return df, meta, nueva_carga.id, registros_guardados


def obtener_excel_por_usuario(session: Session, usuario_actual: Usuario):
    if usuario_actual.rol == "admin":
        cargas = session.exec(
            select(CargaExcel).order_by(CargaExcel.fecha_carga.desc())
        ).all()
    else:
        cargas = session.exec(
            select(CargaExcel)
            .where(
                or_(
                    CargaExcel.es_global == True,
                    CargaExcel.usuario_id == usuario_actual.id
                )
            )
            .order_by(CargaExcel.fecha_carga.desc())
        ).all()

    resultado = []
    for carga in cargas:
        propietario = session.get(Usuario, carga.usuario_id)
        total_registros = len(
            session.exec(
                select(DatoProcesal.id).where(DatoProcesal.carga_id == carga.id)
            ).all()
        )
        resultado.append(
            {
                "id": carga.id,
                "nombre_archivo": carga.nombre_archivo,
                "fecha_carga": carga.fecha_carga,
                "es_global": carga.es_global,
                "usuario_id": carga.usuario_id,
                "usuario_nombre": propietario.nombre if propietario else "Sistema",
                "es_propietario": carga.usuario_id == usuario_actual.id,
                "total_registros": total_registros
            }
        )

    return resultado


def eliminar_excel(session: Session, excel_id: int, usuario_actual: Usuario):
    carga = session.get(CargaExcel, excel_id)
    if not carga:
        return False

    if usuario_actual.rol != "admin" and carga.usuario_id != usuario_actual.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar este archivo."
        )

    if carga.ruta_archivo and os.path.exists(carga.ruta_archivo):
        try:
            os.remove(carga.ruta_archivo)
        except OSError:
            pass

    datos = session.exec(select(DatoProcesal).where(DatoProcesal.carga_id == excel_id)).all()
    for d in datos:
        session.delete(d)

    session.delete(carga)
    session.commit()
    return True