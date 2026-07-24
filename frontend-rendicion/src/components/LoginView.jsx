import React from 'react';
import { ShieldCheck, User, Lock, Loader2 } from 'lucide-react';

export const LoginView = ({ handleLogin, username, setUsername, password, setPassword, loading, error }) => (
    <div className="login-container">
        <form onSubmit={handleLogin} className="login-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', justifyContent: 'center' }}>
                <ShieldCheck color="#3b82f6" size={36} />
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', letterSpacing: '1px' }}>
                    RENDICIÓN CONTROL
                </h2>
            </div>

            {error && (
                <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '6px', padding: '10px', marginBottom: '16px', color: '#b91c1c', fontSize: '0.85rem', fontWeight: '700' }}>
                    ⚠️ {error}
                </div>
            )}

            <div style={{ marginBottom: '16px' }}>
                <label>CORREO INSTITUCIONAL</label>
                <div className="login-field-box">
                    <User size={16} color="#000000" />
                    <input
                        type="email"
                        placeholder="ejemplo@palacio.gov.co"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <label>CONTRASEÑA</label>
                <div className="login-field-box">
                    <Lock size={16} color="#000000" />
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>
            </div>

            <button type="submit" disabled={loading} className="btn-login-submit">
                {loading ? <Loader2 className="spinner" size={18} /> : 'INGRESAR'}
            </button>
        </form>
    </div>
);