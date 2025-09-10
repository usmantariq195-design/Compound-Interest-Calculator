// Fix: Add a declaration for the Chart.js global object to resolve TypeScript errors.
declare class Chart {
    constructor(context: CanvasRenderingContext2D, config: any);
    data: any;
    destroy: () => void;
    update: () => void;
    // Fix: Add the 'options' property to align the type with its usage in the 'updateChart' function.
    options: any;
}

// Add declarations for jsPDF and its autoTable plugin
declare const jspdf: any;

// --- DOM Elements ---
const form = document.getElementById('calculator-form') as HTMLFormElement;
const initialCapitalInput = document.getElementById('initial-capital') as HTMLInputElement;
const regularContributionInput = document.getElementById('regular-contribution') as HTMLInputElement;
const contributionFrequencySelect = document.getElementById('contribution-frequency') as HTMLSelectElement;
const interestRateInput = document.getElementById('interest-rate') as HTMLInputElement;
const capitalizationFrequencySelect = document.getElementById('capitalization-frequency') as HTMLSelectElement;
const termInput = document.getElementById('term') as HTMLInputElement;
const currencySelect = document.getElementById('currency') as HTMLSelectElement;
const riskToleranceSelect = document.getElementById('risk-tolerance') as HTMLSelectElement;
const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;

// Buttons
const calculateButton = document.getElementById('calculate-button') as HTMLButtonElement;
const shareButton = document.getElementById('share-button') as HTMLButtonElement;
const downloadCsvButton = document.getElementById('download-csv-button') as HTMLButtonElement;
const downloadPdfButton = document.getElementById('download-pdf-button') as HTMLButtonElement;
const startOverButton = document.getElementById('start-over-button') as HTMLButtonElement;
const barChartBtn = document.getElementById('bar-chart-btn') as HTMLButtonElement;
const lineChartBtn = document.getElementById('line-chart-btn') as HTMLButtonElement;


const currencySymbolInitial = document.getElementById('currency-symbol-initial') as HTMLSpanElement;
const currencySymbolContribution = document.getElementById('currency-symbol-contribution') as HTMLSpanElement;

// Output Elements
const finalCapitalEl = document.getElementById('final-capital') as HTMLDivElement;
const totalInvestedEl = document.getElementById('total-invested') as HTMLDivElement;
const interestGeneratedEl = document.getElementById('interest-generated') as HTMLDivElement;
const performanceEl = document.getElementById('performance') as HTMLDivElement;
const tableBody = document.getElementById('breakdown-table-body') as HTMLTableSectionElement;
const chartCanvas = document.getElementById('growth-chart') as HTMLCanvasElement;

// --- State ---
let growthChart: Chart | null;
let yearlyBreakdown: any[] = [];
let currentChartType: 'bar' | 'line' = 'bar';

// --- Helper Functions ---
const formatCurrency = (value: number, currency: string): string => {
    const isZero = value === 0;
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            currencyDisplay: 'symbol',
            minimumFractionDigits: isZero ? 0 : 2,
            maximumFractionDigits: isZero ? 0 : 2,
        }).format(value);
    } catch (e) {
        const selectedOption = currencySelect.options[currencySelect.selectedIndex];
        const symbol = selectedOption?.getAttribute('data-symbol') || '$';
        if (isZero) {
            return `${symbol}0`;
        }
        const numberPart = value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        return `${symbol}${numberPart}`;
    }
};

const setActionButtonsDisabled = (disabled: boolean) => {
    shareButton.disabled = disabled;
    downloadCsvButton.disabled = disabled;
    downloadPdfButton.disabled = disabled;
};

// --- Main Calculation Logic ---
const calculateAndDisplay = () => {
    // UI feedback for calculation start
    calculateButton.disabled = true;
    calculateButton.textContent = 'Calculando...';

    // Get values from inputs
    const initialCapital = parseFloat(initialCapitalInput.value) || 0;
    const regularContribution = parseFloat(regularContributionInput.value) || 0;
    const contributionFrequency = parseInt(contributionFrequencySelect.value, 10);
    const annualInterestRate = (parseFloat(interestRateInput.value) || 0) / 100;
    const capitalizationFrequency = parseInt(capitalizationFrequencySelect.value, 10);
    const term = parseInt(termInput.value, 10) || 0;
    const currency = currencySelect.value;
    
    yearlyBreakdown = []; // Reset breakdown
    let currentBalance = initialCapital;
    let totalInvested = initialCapital;
    let totalInterest = 0;

    for (let year = 1; year <= term; year++) {
        const startingBalance = currentBalance;
        let yearlyInterest = 0;
        let yearlyContribution = 0;

        const ratePerPeriod = annualInterestRate / capitalizationFrequency;
        const periodsInYear = capitalizationFrequency; 
        
        let contributionsThisYear = regularContribution * contributionFrequency;

        // Simplified contribution logic for intra-year compounding
        for (let period = 1; period <= periodsInYear; period++) {
             // Add contribution at the start of the period
            if (contributionFrequency > 0) {
                 const contributionThisPeriod = contributionsThisYear / periodsInYear;
                 currentBalance += contributionThisPeriod;
                 yearlyContribution += contributionThisPeriod;
            }
           
            const interestThisPeriod = currentBalance * ratePerPeriod;
            currentBalance += interestThisPeriod;
            yearlyInterest += interestThisPeriod;
        }
        
        totalInvested += yearlyContribution;
        totalInterest += yearlyInterest;

        yearlyBreakdown.push({
            year,
            startingBalance,
            contribution: yearlyContribution,
            interest: yearlyInterest,
            endingBalance: currentBalance,
        });
    }
    
    const finalCapital = term > 0 ? currentBalance : initialCapital;

    // Update UI
    updateSummary(finalCapital, totalInvested, totalInterest, currency);
    updateTable(yearlyBreakdown, currency);
    updateChart(yearlyBreakdown, term, currency);
    setActionButtonsDisabled(term === 0 && initialCapital === 0 && regularContribution === 0);

    // UI feedback for calculation end
    calculateButton.disabled = false;
    calculateButton.textContent = 'Calcular';
};


// --- UI Update Functions ---
const updateSummary = (finalCapital: number, totalInvested: number, totalInterest: number, currency: string) => {
    const performance = totalInvested > 0 ? (totalInterest / totalInvested) * 100 : 0;
    
    finalCapitalEl.textContent = formatCurrency(finalCapital, currency);
    totalInvestedEl.textContent = formatCurrency(totalInvested, currency);
    interestGeneratedEl.textContent = formatCurrency(totalInterest, currency);
    performanceEl.textContent = performance === 0 ? '0.00%' : `${performance.toFixed(2)}%`;
};

const updateTable = (breakdown: any[], currency: string) => {
    tableBody.innerHTML = '';
    breakdown.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.year}</td>
            <td>${formatCurrency(item.startingBalance, currency)}</td>
            <td>${formatCurrency(item.contribution, currency)}</td>
            <td>${formatCurrency(item.interest, currency)}</td>
            <td>${formatCurrency(item.endingBalance, currency)}</td>
        `;
        tableBody.appendChild(row);
    });
};

const updateChart = (breakdown: any[], term: number, currency: string) => {
    if (growthChart) {
        growthChart.destroy();
        growthChart = null;
    }

    const ctx = chartCanvas.getContext('2d');
    if (!ctx) return;

    const hasData = breakdown.length > 0;
    const initialCapital = parseFloat(initialCapitalInput.value) || 0;
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#9ca3af' : '#6b7280';
    const gridColor = isDarkMode ? '#374151' : '#e5e7eb';
    
    let chartData: any;
    let chartOptions: any;

    const displayTerm = term > 0 ? term : 10;
    const labels = Array.from({ length: displayTerm }, (_, i) => `${i + 1}`);

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) { label += ': '; }
                        if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y, currency); }
                        return label;
                    }
                }
            },
            legend: {
                position: 'top',
                labels: { color: textColor, usePointStyle: true, boxWidth: 20 }
            }
        },
        scales: {
             y: {
                beginAtZero: true,
                ticks: {
                    color: textColor,
                    callback: function(value: string | number) {
                        return formatCurrency(Number(value), currency);
                    }
                },
                grid: { color: gridColor, drawBorder: false }
            },
            x: {
                ticks: { color: textColor },
                grid: { display: false }
            }
        }
    };
    
    if (currentChartType === 'bar') {
        const startingBalanceData = hasData ? breakdown.map(item => item.startingBalance) : Array(displayTerm).fill(initialCapital);
        const contributionData = hasData ? breakdown.map(item => item.contribution) : Array(displayTerm).fill(0);
        const interestData = hasData ? breakdown.map(item => item.interest) : Array(displayTerm).fill(0);
        
        chartData = {
            labels,
            datasets: [
                { label: 'Saldo Inicial', data: startingBalanceData, backgroundColor: '#3b82f6' },
                { label: 'Aportaciones', data: contributionData, backgroundColor: '#93c5fd' },
                { label: 'Intereses Ganados', data: interestData, backgroundColor: '#1e40af' }
            ]
        };
        chartOptions = { ...commonOptions };
        chartOptions.scales.x.stacked = true;
        chartOptions.scales.y.stacked = true;

    } else { // Line chart
        const endingBalanceData = hasData ? breakdown.map(item => item.endingBalance) : Array(displayTerm).fill(initialCapital);

        chartData = {
            labels,
            datasets: [
                {
                    label: 'Saldo Final',
                    data: endingBalanceData,
                    borderColor: '#2563eb',
                    backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#2563eb',
                    pointRadius: hasData ? 3 : 0,
                }
            ]
        };
        chartOptions = { ...commonOptions };
        if(chartOptions.plugins?.legend) {
           chartOptions.plugins.legend.display = false; // Hide legend for single dataset
        }
    }
    
    growthChart = new Chart(ctx, {
        type: currentChartType,
        data: chartData,
        options: chartOptions,
    });
};

const updateCurrencySymbols = () => {
    const selectedOption = currencySelect.options[currencySelect.selectedIndex];
    const symbol = selectedOption.getAttribute('data-symbol') || '€';
    currencySymbolInitial.textContent = symbol;
    currencySymbolContribution.textContent = symbol;
};

const startOver = () => {
    form.reset();
    initialCapitalInput.value = '';
    regularContributionInput.value = '';
    interestRateInput.value = '';
    termInput.value = '';
    currencySelect.value = 'USD';
    updateCurrencySymbols();
    calculateAndDisplay();
};

// --- Action Button Functions ---
const downloadCSV = () => {
    if (yearlyBreakdown.length === 0) {
        alert('Por favor, realiza un cálculo primero.');
        return;
    }
    const headers = ['Año', 'SaldoInicial', 'Aportacion', 'InteresesGanados', 'SaldoFinal'];
    const csvContent = [
        headers.join(','),
        ...yearlyBreakdown.map(row => 
            [row.year, row.startingBalance, row.contribution, row.interest, row.endingBalance].join(',')
        )
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'desglose_interes_compuesto.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const downloadPDF = () => {
    if (yearlyBreakdown.length === 0) {
        alert('Por favor, realiza un cálculo primero.');
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const currency = currencySelect.value;
    const term = parseInt(termInput.value, 10) || 0;

    // Title
    doc.setFontSize(18);
    doc.text('Resultados del Cálculo de Interés Compuesto', 14, 22);

    // Summary
    doc.setFontSize(11);
    doc.setTextColor(100);
    const summaryLines = [
        `Capital Final: ${finalCapitalEl.textContent}`,
        `Total Invertido: ${totalInvestedEl.textContent}`,
        `Intereses Generados: ${interestGeneratedEl.textContent}`,
        `Rendimiento: ${performanceEl.textContent}`,
        `Plazo: ${term} Años`
    ];
    doc.text(summaryLines, 14, 32);

    // Table
    const tableColumn = ['Año', 'Saldo Inicial', 'Aportación', 'Intereses', 'Saldo Final'];
    const tableRows = yearlyBreakdown.map(item => [
        item.year,
        formatCurrency(item.startingBalance, currency),
        formatCurrency(item.contribution, currency),
        formatCurrency(item.interest, currency),
        formatCurrency(item.endingBalance, currency)
    ]);
    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 65,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save('resultados_interes_compuesto.pdf');
};

const shareCalculation = async () => {
    if (yearlyBreakdown.length === 0) {
        alert('Por favor, realiza un cálculo primero.');
        return;
    }

    const term = termInput.value || 'X';
    const endingBalance = finalCapitalEl.textContent;
    const interestEarned = interestGeneratedEl.textContent;
    const summaryText = `Mi inversión después de ${term} años será ${endingBalance}, con ${interestEarned} en intereses.\n\nCalculado con la Calculadora de Interés Compuesto.`;
    const shareData = {
        title: 'Resultado del Cálculo de Interés Compuesto',
        text: summaryText,
        url: window.location.href,
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(summaryText);
            const originalText = shareButton.textContent;
            shareButton.textContent = '¡Copiado!';
            setTimeout(() => {
                shareButton.textContent = originalText;
            }, 2000);
        }
    } catch (err) {
        console.error('Share failed:', err);
        alert('Error al compartir. Por favor, intenta copiar los resultados manually.');
    }
};

// --- Theme Toggle Logic ---
const updateChartTheme = () => {
    if (!growthChart) return;
    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#9ca3af' : '#6b7280';
    const gridColor = isDarkMode ? '#374151' : '#e5e7eb';
    if (growthChart.options?.scales?.x?.ticks) growthChart.options.scales.x.ticks.color = textColor;
    if (growthChart.options?.scales?.y?.ticks) growthChart.options.scales.y.ticks.color = textColor;
    if (growthChart.options?.scales?.y?.grid) growthChart.options.scales.y.grid.color = gridColor;
    if (growthChart.options?.plugins?.legend?.labels) growthChart.options.plugins.legend.labels.color = textColor;

    // Update line chart colors on theme change
    if(currentChartType === 'line' && growthChart.data.datasets[0]) {
        growthChart.data.datasets[0].backgroundColor = isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)';
    }

    growthChart.update();
};

const setTheme = (theme: 'light' | 'dark') => {
    localStorage.setItem('theme', theme);
    document.body.classList.toggle('dark-mode', theme === 'dark');
    if (themeToggle) themeToggle.checked = theme === 'dark';
    updateChartTheme();
};

// --- Event Listeners ---
form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateAndDisplay();
});
currencySelect.addEventListener('change', () => {
    updateCurrencySymbols();
    calculateAndDisplay();
});
riskToleranceSelect.addEventListener('change', () => {
    const riskProfile = riskToleranceSelect.value;
    const riskBasedRates = { conservative: '4', moderate: '7', aggressive: '10' };
    interestRateInput.value = riskBasedRates[riskProfile as keyof typeof riskBasedRates];
    calculateAndDisplay();
});
startOverButton.addEventListener('click', startOver);
downloadCsvButton.addEventListener('click', downloadCSV);
downloadPdfButton.addEventListener('click', downloadPDF);
shareButton.addEventListener('click', shareCalculation);
themeToggle.addEventListener('change', () => {
    setTheme(themeToggle.checked ? 'dark' : 'light');
});

barChartBtn.addEventListener('click', () => {
    if (currentChartType === 'bar') return;
    currentChartType = 'bar';
    barChartBtn.classList.add('active');
    lineChartBtn.classList.remove('active');
    const term = parseInt(termInput.value, 10) || 0;
    const currency = currencySelect.value;
    updateChart(yearlyBreakdown, term, currency);
});

lineChartBtn.addEventListener('click', () => {
    if (currentChartType === 'line') return;
    currentChartType = 'line';
    lineChartBtn.classList.add('active');
    barChartBtn.classList.remove('active');
    const term = parseInt(termInput.value, 10) || 0;
    const currency = currencySelect.value;
    updateChart(yearlyBreakdown, term, currency);
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme(prefersDark ? 'dark' : 'light');
    }
    
    updateCurrencySymbols();
    calculateAndDisplay();
});


// New Snippet
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

function HeightMessenger() {
  useEffect(() => {
    const sendHeight = () => {
      window.parent.postMessage(
        { type: "resize", height: document.body.scrollHeight },
        "*"
      );
    };
