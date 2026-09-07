import io
import json

import pandas as pd
from sqlmodel import Session, select

from models import CargaExcel, DatoProcesal, Usuario
from services.clasificacion_service import aplicar_categorizacion, normalizar
from services.mapeo_service import obtener_mapeos_dinamicos


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


def cargar_dataframe_desde_db(session: Session, carga_id: int = None):
    if carga_id is not None:
        carga = session.get(CargaExcel, carga_id)
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

    nueva_carga = CargaExcel(
        nombre_archivo=filename or "archivo_sin_nombre.xlsx",
        es_global=bool(es_global),
        usuario_id=(
            session.exec(
                select(Usuario).where(Usuario.email == usuario_email)
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


def listar_documentos(session: Session, usuario_actual_id: int):
    cargas = session.exec(select(CargaExcel).order_by(CargaExcel.fecha_carga.desc())).all()

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
                "filename": carga.nombre_archivo,
                "uploaded_by_id": carga.usuario_id,
                "uploaded_by_name": propietario.nombre if propietario else "Desconocido",
                "created_at": carga.fecha_carga.isoformat(),
                "is_global": carga.es_global,
                "is_owner": carga.usuario_id == usuario_actual_id,
                "total_registros": total_registros,
            }
        )

    return resultado
