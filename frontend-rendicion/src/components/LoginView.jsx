import React from 'react';
import { ShieldCheck, User, Lock, Loader2 } from 'lucide-react';

export const LoginView = ({ handleLogin, username, setUsername, password, setPassword, loading, error }) => (
    <div className="login-container">
        <form onSubmit={handleLogin} style={{ background: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '10px 10px 0 #000000', width: '100%', maxWidth: '400px', border: '3px solid #000000' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', justifyContent: 'center' }}>
                <ShieldCheck color="#3b82f6" size={36} />
                <span style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '1px' }}>RENDICIÓN CONTROL</span>
            </div>

            {error && (
                <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '6px', padding: '10px', marginBottom: '16px', color: '#b91c1c', fontSize: '0.85rem', fontWeight: '700' }}>
                    ⚠️ {error}
                </div>
            )}

            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '700', marginBottom: '6px', fontSize: '0.85rem' }}>CORREO INSTITUCIONAL</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #000', borderRadius: '6px', padding: '8px 12px', backgroundColor: '#fff' }}>
                    <User size={16} color="#64748b" style={{ marginRight: '8px' }} />
                    <input type="email" placeholder="ejemplo@palacio.gov.co" value={username} onChange={e => setUsername(e.target.value)} required style={{ border: 'none', outline: 'none', width: '100%', fontWeight: '600' }} />
                </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: '700', marginBottom: '6px', fontSize: '0.85rem' }}>CONTRASEÑA</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #000', borderRadius: '6px', padding: '8px 12px', backgroundColor: '#fff' }}>
                    <Lock size={16} color="#64748b" style={{ marginRight: '8px' }} />
                    <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ border: 'none', outline: 'none', width: '100%', fontWeight: '600' }} />
                </div>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: '#000000', color: '#ffffff', padding: '12px', borderRadius: '6px', fontWeight: '900', border: '2px solid #000000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '4px 4px 0 #3b82f6' }}>
                {loading ? <Loader2 className="spinner" size={18} /> : 'INGRESAR'}
            </button>
        </form>
    </div>
);