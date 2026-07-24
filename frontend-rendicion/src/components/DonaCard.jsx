import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';

export const DonaCard = React.memo(({ data, color, colorSec, titulo }) => {
    const p = Number(data?.p || 0);
    const s = Number(data?.s || 0);
    const total = p + s;
    const options = useMemo(() => ({
        labels: ['1RA INSTANCIA', '2DA INSTANCIA'],
        colors: [color, colorSec],
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'TOTAL',
                            fontWeight: 900,
                            formatter: () => total
                        }
                    }
                }
            }
        },
        legend: { position: 'bottom', fontWeight: 900 },
        dataLabels: { enabled: false },
        chart: { background: '#ffffff', foreColor: '#000000', animations: { enabled: false } },
        theme: { mode: 'light' }
    }), [color, colorSec, total]);

    return (
        <div className="card-grafica-container">
            <div className="card-header-grafica">{titulo}</div>
            <Chart type="donut" series={[p, s]} options={options} height={220} />
        </div>
    );
});