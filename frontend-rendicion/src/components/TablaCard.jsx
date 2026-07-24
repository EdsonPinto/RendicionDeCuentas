import React from 'react';

export const TablaCard = React.memo(({ titulo, filas, color, tipoCol = 'ambas' }) => (
    <div className="card-tabla">
        <div className="card-tabla-header" style={{ backgroundColor: color }}>{titulo}</div>
        <div className="card-tabla-body">
            <table>
                <thead>
                    <tr>
                        <th>MEDIO DE CONTROL</th>
                        {(tipoCol === 'ambas' || tipoCol === 'ing') && <th className="txt-center">ING</th>}
                        {(tipoCol === 'ambas' || tipoCol === 'egr') && <th className="txt-center">EGR</th>}
                    </tr>
                </thead>
                <tbody>
                    {filas?.map((r, i) => (
                        <tr key={i}>
                            <td style={{ fontWeight: '700' }}>{r.medio}</td>
                            {(tipoCol === 'ambas' || tipoCol === 'ing') && (
                                <td className="txt-center col-ing" style={{ fontWeight: '900', fontSize: '1.1rem' }}>
                                    {r.ingresos}
                                </td>
                            )}
                            {(tipoCol === 'ambas' || tipoCol === 'egr') && (
                                <td className="txt-center col-egr" style={{ fontWeight: '900', fontSize: '1.1rem' }}>
                                    {r.egresos}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
));