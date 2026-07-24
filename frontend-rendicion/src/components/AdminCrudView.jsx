import React from 'react';
import { UserPlus, Edit3, Trash2, Save, X, PlusCircle } from 'lucide-react';

export const AdminCrudView = ({
    editingUsr,
    usrForm,
    setUsrForm,
    handleSaveUsuario,
    usuariosList,
    handleEditUsuarioClick,
    handleDeleteUsuario,
    nuevoMagistradoInput,
    setNuevoMagistradoInput,
    handleAddMagistrado,
    magistradosList,
    handleDeleteMagistrado
}) => (
    <div className="analysis-layout">
        <div className="strategic-filters-panel" style={{ background: '#dbeafe', border: '3px solid #000', boxShadow: '6px 6px 0 #000' }}>
            <h3 className="filters-panel-title">👑 PANEL GENERAL DE CONTROL DE USUARIOS Y ROLES</h3>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', marginTop: '5px', color: '#1e3a8a' }}>
                Administra los perfiles de acceso al sistema, asigna el rol de Administrador o Usuario y configura el catálogo de Magistrados oficiales.
            </p>
        </div>

        <div className="crud-grid-two-columns">
            <div className="card-tabla" style={{ padding: '0', background: '#ffffff', borderRadius: '16px' }}>
                <div className="card-tabla-header" style={{ backgroundColor: editingUsr ? '#ea580c' : '#3b82f6', color: '#fff' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900' }}>
                        {editingUsr ? <Edit3 size={18} /> : <UserPlus size={18} />}
                        {editingUsr ? `EDITANDO: ${editingUsr}` : 'REGISTRAR NUEVO USUARIO'}
                    </span>
                </div>

                <form onSubmit={handleSaveUsuario} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {!editingUsr && (
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: '900', display: 'block', marginBottom: '6px' }}>
                                CORREO INSTITUCIONAL (USERNAME)
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="ejemplo@palacio.gov.co"
                                className="nav-input"
                                style={{ border: '2px solid #000', width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', fontWeight: '700' }}
                                value={usrForm.username}
                                onChange={e => setUsrForm({ ...usrForm, username: e.target.value })}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: '900', display: 'block', marginBottom: '6px' }}>
                            NOMBRE COMPLETO / DESPACHO
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: DRA. MARIA PEREZ"
                            className="nav-input"
                            style={{ border: '2px solid #000', width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', fontWeight: '700' }}
                            value={usrForm.nombre}
                            onChange={e => setUsrForm({ ...usrForm, nombre: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: '900', display: 'block', marginBottom: '6px' }}>
                            ROL DE ACCESO
                        </label>
                        <select
                            className="nav-select"
                            style={{ width: '100%', maxWidth: '100%', border: '2px solid #000', padding: '10px', borderRadius: '8px', height: 'auto', background: '#f8fafc' }}
                            value={usrForm.rol}
                            onChange={e => setUsrForm({ ...usrForm, rol: e.target.value })}
                        >
                            <option value="usuario">👤 USUARIO (Solo Lectura y Reportes)</option>
                            <option value="admin">👑 ADMINISTRADOR (Acceso Total)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: '900', display: 'block', marginBottom: '6px' }}>
                            {editingUsr ? 'NUEVA CONTRASEÑA (Opcional)' : 'CONTRASEÑA DE ACCESO'}
                        </label>
                        <input
                            type="password"
                            required={!editingUsr}
                            placeholder="••••••••"
                            className="nav-input"
                            style={{ border: '2px solid #000', width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', fontWeight: '700' }}
                            value={usrForm.password}
                            onChange={e => setUsrForm({ ...usrForm, password: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button type="submit" className="btn-action" style={{ flex: 1, background: '#000000', color: '#ffffff', padding: '12px', borderRadius: '8px', fontWeight: '900', height: 'auto' }}>
                            <Save size={16} /> {editingUsr ? 'GUARDAR CAMBIOS' : 'CREAR USUARIO'}
                        </button>

                        {editingUsr && (
                            <button
                                type="button"
                                onClick={() => { setEditingUsr(null); setUsrForm({ username: '', nombre: '', rol: 'usuario', password: '' }); }}
                                className="btn-action"
                                style={{ background: '#ef4444', color: '#ffffff', padding: '12px', borderRadius: '8px', fontWeight: '900', height: 'auto' }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="card-tabla" style={{ borderRadius: '16px' }}>
                <div className="card-tabla-header" style={{ backgroundColor: '#0f172a' }}>
                    <span>USUARIOS EN EL SISTEMA ({usuariosList.length})</span>
                </div>
                <div className="card-tabla-body">
                    <table>
                        <thead>
                            <tr>
                                <th>CORREO / USUARIO</th>
                                <th>NOMBRE / DESPACHO</th>
                                <th className="txt-center">ROL</th>
                                <th className="txt-center">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosList.map((usr, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: '800', fontSize: '0.75rem' }}>{usr.username}</td>
                                    <td style={{ fontWeight: '800', fontSize: '0.75rem' }}>{usr.nombre}</td>
                                    <td className="txt-center">
                                        <span className={`badge-semaforo ${usr.rol === 'admin' ? 'badge-rojo' : 'badge-verde'}`}>
                                            {usr.rol.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="txt-center">
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                            <button onClick={() => handleEditUsuarioClick(usr)} title="Editar Usuario" style={{ background: '#3b82f6', color: '#fff', border: '2px solid #000', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}>
                                                <Edit3 size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteUsuario(usr.username)} title="Eliminar Usuario" style={{ background: '#ef4444', color: '#fff', border: '2px solid #000', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div className="card-tabla" style={{ marginTop: '10px', borderRadius: '16px' }}>
            <div className="card-tabla-header" style={{ backgroundColor: '#1e293b' }}>
                <span>📜 CATÁLOGO OFICIAL DE MAGISTRADOS Y DESPACHOS</span>
            </div>
            <div className="card-tabla-body" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', maxWidth: '700px' }}>
                    <input
                        type="text"
                        placeholder="Nombre del Magistrado (Ej: DR. MAURICIO JAVIER ROJAS)..."
                        className="nav-input"
                        style={{ border: '2px solid #000', flex: 1, padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', fontWeight: '700', fontSize: '0.85rem' }}
                        value={nuevoMagistradoInput}
                        onChange={e => setNuevoMagistradoInput(e.target.value)}
                    />
                    <button onClick={handleAddMagistrado} className="btn-action" style={{ background: '#22c55e', color: '#fff', padding: '0 20px', fontWeight: '900', height: 'auto' }}>
                        <PlusCircle size={18} /> AGREGAR
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {magistradosList.map((m, idx) => (
                        <div
                            key={idx}
                            style={{
                                background: '#ffffff',
                                border: '2px solid #000000',
                                borderRadius: '10px',
                                padding: '10px 16px',
                                fontWeight: '900',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                boxShadow: '4px 4px 0 #000000'
                            }}
                        >
                            <span>{m}</span>
                            <button onClick={() => handleDeleteMagistrado(m)} title="Eliminar Magistrado" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);