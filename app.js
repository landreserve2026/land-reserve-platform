/* ============================================================
 * 运用专项债券实施土地收储全链条价值测算平台 - 应用逻辑
 * ============================================================ */

// ============ 工具函数 ============
function fmt(num, dec = 2) {
    if (num === null || num === undefined || isNaN(num)) return "—";
    return Number(num).toLocaleString("zh-CN", {
        minimumFractionDigits: dec, maximumFractionDigits: dec
    });
}
function pct(num) {
    if (num === null || num === undefined || isNaN(num)) return "—";
    return (num >= 0 ? "+" : "") + num.toFixed(2) + "%";
}

// SARIMA 月度预测（24个月）+ AR/ARIMA 已知区间前6月
const sarimaMonthly = [
    223.05, 223.11, 223.37, 223.77, 223.69, 223.50, 222.85, 222.59, 222.09, 221.88, 221.31, 221.49,
    221.98, 222.91, 223.60, 224.15, 224.25, 224.42, 224.38, 224.82, 224.96, 225.14, 224.74, 224.91
];
const arKnown6 = [218.42, 217.39, 216.61, 218.93, 219.50, 221.35];
const arimaKnown6 = [218.63, 217.71, 217.16, 219.15, 219.81, 221.25];

// 构建各模型完整60月序列
function buildMonthlySeries() {
    const ar = [...arKnown6, ...arMonthlyFuture];
    const arima = [...arimaKnown6, ...arimaMonthlyFuture];
    const ecm = ecmMonthlyForecast;
    const sarima = [...sarimaMonthly, ...Array(36).fill(null)];
    const naive = Array(60).fill(219.74);
    return { ar, arima, ecm, sarima, naive };
}

// ============ 板块一：渲染评估内容 ============
function renderSection1() {
    // 内涵
    const cGrid = document.getElementById("connotationGrid");
    evaluationData.connotation.forEach(item => {
        const kw = (item.keywords || []).map(k => `<span class="keyword">${k}</span>`).join("");
        const list = item.list ? `<ul>${item.list.map(l => `<li>${l}</li>`).join("")}</ul>` : "";
        cGrid.insertAdjacentHTML("beforeend",
            `<div class="info-card"><h4><span>${item.icon}</span>${item.title}</h4>${item.text}${list}<div class="keywords">${kw}</div></div>`);
    });
    // 目的
    const pGrid = document.getElementById("purposeGrid");
    evaluationData.purpose.forEach(item => {
        const list = item.list ? `<ul>${item.list.map(l => `<li>${l}</li>`).join("")}</ul>` : "";
        pGrid.insertAdjacentHTML("beforeend",
            `<div class="info-card"><h4><span>${item.icon}</span>${item.title}</h4>${item.text}${list}</div>`);
    });
    // 原则
    const prGrid = document.getElementById("principlesGrid");
    evaluationData.principles.forEach(p => {
        prGrid.insertAdjacentHTML("beforeend",
            `<div class="principle-card"><h4><span>${p.icon}</span>${p.name}</h4><p>${p.desc}</p></div>`);
    });
}

// ============ 板块二：土地市场价格评估 ============
function getPriceEvalParams() {
    return {
        area: parseFloat(document.getElementById("pe_area").value) || 0,
        buildArea: parseFloat(document.getElementById("pe_buildArea").value) || 0,
        totalFull: parseFloat(document.getElementById("pe_totalFull").value) || 0,
        totalRemain: parseFloat(document.getElementById("pe_totalRemain").value) || 0,
        totalCurrent: parseFloat(document.getElementById("pe_totalCurrent").value) || 0,
        areaNew: parseFloat(document.getElementById("pe_areaNew").value) || 0,
        buildAreaNew: parseFloat(document.getElementById("pe_buildAreaNew").value) || 0,
        totalFullNew: parseFloat(document.getElementById("pe_totalFullNew").value) || 0
    };
}

function calcPriceEval() {
    const p = getPriceEvalParams();
    const far = p.area > 0 ? p.buildArea / p.area : 0;
    const farNew = p.areaNew > 0 ? p.buildAreaNew / p.areaNew : 0;
    // 综合楼面地价(元/㎡) = 总价(万元)×10000 ÷ 总建筑面积(㎡)；综合地面地价 = 总价×10000 ÷ 总用地面积
    const floorFull = p.buildArea > 0 ? p.totalFull * 10000 / p.buildArea : 0;
    const groundFull = p.area > 0 ? p.totalFull * 10000 / p.area : 0;
    const floorRemain = p.buildArea > 0 ? p.totalRemain * 10000 / p.buildArea : 0;
    const groundRemain = p.area > 0 ? p.totalRemain * 10000 / p.area : 0;
    const floorCurrent = p.buildArea > 0 ? p.totalCurrent * 10000 / p.buildArea : 0;
    const groundCurrent = p.area > 0 ? p.totalCurrent * 10000 / p.area : 0;
    const floorFullNew = p.buildAreaNew > 0 ? p.totalFullNew * 10000 / p.buildAreaNew : 0;
    const groundFullNew = p.areaNew > 0 ? p.totalFullNew * 10000 / p.areaNew : 0;
    // 剩余年期地价变动率 =（当前时点剩余年期评估结果 − 标定地价剩余年期评估结果）÷ 标定地价剩余年期评估结果
    const changeRate = p.totalRemain > 0 ? (p.totalCurrent - p.totalRemain) / p.totalRemain : 0;
    return { ...p, far, farNew, floorFull, groundFull, floorRemain, groundRemain, floorCurrent, groundCurrent, floorFullNew, groundFullNew, changeRate };
}

function setCellText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function renderPriceEvalResults() {
    const container = document.getElementById("priceEvalTable");
    if (!container) return null;
    const p = calcPriceEval();
    const farInput = document.getElementById("pe_far");
    const farNewInput = document.getElementById("pe_farNew");
    if (farInput) farInput.value = p.far.toFixed(2);
    if (farNewInput) farNewInput.value = p.farNew.toFixed(2);
    const rateCls = p.changeRate < 0 ? "infeasible" : "feasible";

    // 填写表格：总价手工填报，楼面/地面地价与变动率自动计算
    setCellText("pe_floorFull", fmt(p.floorFull, 0));
    setCellText("pe_groundFull", fmt(p.groundFull, 0));
    setCellText("pe_floorRemain", fmt(p.floorRemain, 0));
    setCellText("pe_groundRemain", fmt(p.groundRemain, 0));
    setCellText("pe_floorCurrent", fmt(p.floorCurrent, 0));
    setCellText("pe_groundCurrent", fmt(p.groundCurrent, 0));
    setCellText("pe_floorFullNew", fmt(p.floorFullNew, 0));
    setCellText("pe_groundFullNew", fmt(p.groundFullNew, 0));
    const changeEl = document.getElementById("pe_changeRate");
    if (changeEl) changeEl.innerHTML = `<strong class="${rateCls}">${pct(p.changeRate * 100)}</strong>`;

    const summary = document.getElementById("priceEvalSummary");
    if (summary) {
        summary.innerHTML = `
            <p><strong>原规划指标：</strong>总用地面积 ${fmt(p.area, 0)}㎡ × 总建筑面积 ${fmt(p.buildArea, 0)}㎡，容积率 ${p.far.toFixed(2)} | <strong>意向新规划：</strong>总用地面积 ${fmt(p.areaNew, 0)}㎡ × 总建筑面积 ${fmt(p.buildAreaNew, 0)}㎡，容积率 ${p.farNew.toFixed(2)}</p>
            <p><strong>变动率：</strong>${p.changeRate < 0
                ? `当前时点剩余年期评估结果较标定地价剩余年期评估结果<strong>下行 ${pct(p.changeRate * 100)}</strong>，市场处于下行通道`
                : `当前时点剩余年期评估结果较标定地价剩余年期评估结果<strong>上行 ${pct(p.changeRate * 100)}</strong>`}</p>
            <p><strong>价格基准联动：</strong>①原规划满年期评估总价 <strong>${fmt(p.totalFull, 1)} 万元</strong>（联动板块三原规划收入测算）；③当前时点剩余年期总价 <strong>${fmt(p.totalCurrent, 1)} 万元</strong>（收地基础价格）；④新规划满年期评估总价 <strong>${fmt(p.totalFullNew, 1)} 万元</strong>（联动板块三新规划收入测算 → 板块五融资平衡）。</p>`;
    }

    // 年度修正系数默认值联动（仅当变动率变化时重置，保留手工修订）
    syncAnnualCoefs(p.changeRate);
    renderAnnualCoefTable();
    // 同步板块四/五展示参数
    syncBondFromS3();
    return p;
}

// ============ 市场形势修正系数（年度收窄规律） ============
// 首年跌幅 = |变动率|；第2、3年每年收窄5个百分点；其后每年收窄2个百分点；跌幅下限为0（企稳）
function buildMarketFactors(changeRate, maxN) {
    const factors = [];
    if (changeRate < 0) {
        let d = -changeRate; // 首年跌幅
        for (let i = 0; i < maxN; i++) {
            factors.push(1 - Math.max(0, d));
            d = Math.max(0, d - (i < 2 ? 0.05 : 0.02));
        }
    } else {
        // 市场上行/持平：按当前溢价水平恒定修正
        for (let i = 0; i < maxN; i++) factors.push(1 + changeRate);
    }
    return factors;
}

function marketCoefficient(factors, n) {
    let c = 1;
    for (let i = 0; i < n && i < factors.length; i++) c *= factors[i];
    return c;
}

// ============ 板块三：预期土地出让收入测算结果（1/2/3/5/7年） ============
const storageYears = [1, 2, 3, 5, 7];
const STORAGE_MAX = 7;

// ============ 不同收储年限市场形势修正系数（手工填报年度系数 + 连乘累计） ============
function getAnnualCoefs() {
    const coefs = [];
    for (let i = 1; i <= STORAGE_MAX; i++) {
        const el = document.getElementById(`mc_year_${i}`);
        const v = el ? parseFloat(el.value) : NaN;
        coefs.push(isFinite(v) && v > 0 ? v : 1);
    }
    return coefs;
}

let coefChartInstance = null;
let lastCoefChangeRate = null;

// 按变动率收窄规律生成年度修正系数默认值
function initAnnualCoefs(changeRate) {
    const defaults = buildMarketFactors(changeRate, STORAGE_MAX);
    for (let i = 1; i <= STORAGE_MAX; i++) {
        const el = document.getElementById(`mc_year_${i}`);
        if (el) el.value = defaults[i - 1].toFixed(4);
    }
}

// 仅当变动率变化时重置默认值，保留手工修订
function syncAnnualCoefs(changeRate) {
    if (lastCoefChangeRate === null || Math.abs(lastCoefChangeRate - changeRate) > 1e-9) {
        initAnnualCoefs(changeRate);
        lastCoefChangeRate = changeRate;
    }
}

// 连乘累计系数回填 + 柱状图
function renderAnnualCoefTable() {
    const coefs = getAnnualCoefs();
    let cum = 1;
    for (let i = 1; i <= STORAGE_MAX; i++) {
        cum *= coefs[i - 1];
        const cell = document.getElementById(`mc_cum_${i}`);
        if (cell) cell.textContent = cum.toFixed(4);
    }
    renderCoefBarChart(coefs);
    return coefs;
}

function renderCoefBarChart(coefs) {
    const ctx = document.getElementById("coefBarChart");
    if (!ctx || typeof Chart === "undefined") return;
    if (coefChartInstance) coefChartInstance.destroy();
    let cum = 1;
    const cumByYear = {};
    for (let n = 1; n <= STORAGE_MAX; n++) {
        cum *= coefs[n - 1];
        cumByYear[n] = cum;
    }
    coefChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: storageYears.map(n => `${n}年`),
            datasets: [{
                label: "市场形势修正系数（连乘累计）",
                data: storageYears.map(n => +cumByYear[n].toFixed(4)),
                backgroundColor: "rgba(22, 93, 255, 0.75)",
                borderColor: "#165DFF",
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: "不同收储年限市场形势修正系数（1/2/3/5/7年）", font: { size: 13, weight: "bold" }, color: "#1D2129" },
                legend: { display: false },
                tooltip: { callbacks: { label: c => `修正系数: ${fmt(c.parsed.y, 4)}` } }
            },
            scales: {
                y: { title: { display: true, text: "修正系数" }, beginAtZero: true, ticks: { font: { size: 11 } }, grid: { color: "#e0e0e0" } },
                x: { ticks: { font: { size: 11 } }, grid: { display: false } }
            }
        }
    });
}

function renderIncomeForecast() {
    const table = document.getElementById("incomeForecastTable");
    if (!table) return null;
    const pe = calcPriceEval();
    const coefs = getAnnualCoefs();

    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    const chartData = [];

    storageYears.forEach(n => {
        const coef = marketCoefficient(coefs, n);
        // 预计土地出让价格 = 满年期评估总价 × 市场形势修正系数（万元）
        const predPrice = pe.totalFull * coef;
        const income = predPrice; // 预期土地出让收入（万元）
        const comprehensiveFloorPrice = pe.buildArea > 0 ? income * 10000 / pe.buildArea : 0;
        chartData.push({ n, income });

        tbody.insertAdjacentHTML("beforeend",
            `<tr>
                <td class="highlight">${n}年</td>
                <td class="num">${fmt(pe.totalFull, 1)}</td>
                <td class="num">${coef.toFixed(4)}</td>
                <td class="num">${fmt(predPrice, 1)}</td>
                <td class="num">${fmt(comprehensiveFloorPrice, 0)}</td>
                <td class="num highlight">${fmt(income, 1)}</td>
            </tr>`);
    });

    renderIncomeForecastChart(chartData);

    const summary = document.getElementById("incomeForecastSummary");
    if (summary) {
        summary.innerHTML = `
            <p><strong>价格基准：</strong>最新版标定地价满年期评估总价 ${fmt(pe.totalFull, 1)} 万元（综合楼面地价 ${fmt(pe.floorFull, 0)} 元/㎡，联动板块二①） | <strong>剩余年期地价变动率：</strong>${pct(pe.changeRate * 100)}</p>
            <p><strong>测算口径：</strong>预计土地出让价格 = 满年期评估总价 × 市场形势修正系数（连乘累计，取自上方《不同收储年限市场形势修正系数》表）；综合楼面地价 = 预期土地出让收入 ÷ 总建筑面积</p>
            <p><strong>规划指标：</strong>总用地面积 ${fmt(pe.area, 0)}㎡ | 总建筑面积 ${fmt(pe.buildArea, 0)}㎡ | 计算容积率 ${pe.far.toFixed(2)}</p>`;
    }
    return { pe, coefs, chartData };
}

let incomeForecastChartInstance = null;
function renderIncomeForecastChart(chartData) {
    const ctx = document.getElementById("incomeForecastChart");
    if (!ctx || typeof Chart === "undefined") return;
    if (incomeForecastChartInstance) incomeForecastChartInstance.destroy();

    incomeForecastChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: chartData.map(d => `${d.n}年`),
            datasets: [{
                label: "预期土地出让收入(万元)",
                data: chartData.map(d => d.income),
                backgroundColor: "rgba(22, 93, 255, 0.75)",
                borderColor: "#165DFF",
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: "不同收储年限预期土地出让收入（市场形势修正系数法）", font: { size: 13, weight: "bold" }, color: "#1D2129" },
                legend: { display: false },
                tooltip: { callbacks: { label: c => `预期出让收入: ${fmt(c.parsed.y, 1)} 万元` } }
            },
            scales: {
                y: { title: { display: true, text: "万元" }, ticks: { font: { size: 11 } }, grid: { color: "#e0e0e0" } },
                x: { ticks: { font: { size: 11 } }, grid: { display: false } }
            }
        }
    });
}

// ============ 意向新规划指标 · 预计土地出让收入测算 ============
function renderIncomeForecastNew() {
    const table = document.getElementById("incomeForecastNewTable");
    if (!table) return null;
    const pe = calcPriceEval();
    const coefs = getAnnualCoefs();

    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    const chartData = [];

    storageYears.forEach(n => {
        const coef = marketCoefficient(coefs, n);
        // 新规划预计土地出让价格 = 新规划满年期评估总价 × 市场形势修正系数（万元）
        const predPrice = pe.totalFullNew * coef;
        const income = predPrice;
        const comprehensiveFloorPrice = pe.buildAreaNew > 0 ? income * 10000 / pe.buildAreaNew : 0;
        chartData.push({ n, income });

        tbody.insertAdjacentHTML("beforeend",
            `<tr>
                <td class="highlight">${n}年</td>
                <td class="num">${fmt(pe.totalFullNew, 1)}</td>
                <td class="num">${coef.toFixed(4)}</td>
                <td class="num">${fmt(predPrice, 1)}</td>
                <td class="num">${fmt(comprehensiveFloorPrice, 0)}</td>
                <td class="num highlight">${fmt(income, 1)}</td>
            </tr>`);
    });

    renderIncomeForecastNewChart(chartData);

    const summary = document.getElementById("incomeForecastNewSummary");
    if (summary) {
        summary.innerHTML = `
            <p><strong>新规划价格基准：</strong>意向新规划满年期评估总价 ${fmt(pe.totalFullNew, 1)} 万元（综合楼面地价 ${fmt(pe.floorFullNew, 0)} 元/㎡，新规划总建筑面积 ${fmt(pe.buildAreaNew, 0)}㎡） | <strong>变动率：</strong>${pct(pe.changeRate * 100)}</p>
            <p><strong>测算口径：</strong>预计土地出让价格 = 新规划满年期评估总价 × 市场形势修正系数（与原规划复用同一组年度修正系数）；此表输出作为板块五融资平衡可实施性分析的收入基准。</p>`;
    }
    return { pe, coefs, chartData };
}

let incomeForecastNewChartInstance = null;
function renderIncomeForecastNewChart(chartData) {
    const ctx = document.getElementById("incomeForecastNewChart");
    if (!ctx || typeof Chart === "undefined") return;
    if (incomeForecastNewChartInstance) incomeForecastNewChartInstance.destroy();

    incomeForecastNewChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: chartData.map(d => `${d.n}年`),
            datasets: [{
                label: "新规划预期土地出让收入(万元)",
                data: chartData.map(d => d.income),
                backgroundColor: "rgba(232,117,58,0.75)",
                borderColor: "#e8753a",
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: "意向新规划指标 · 不同收储年限预期土地出让收入", font: { size: 13, weight: "bold" }, color: "#1D2129" },
                legend: { display: false },
                tooltip: { callbacks: { label: c => `新规划预期出让收入: ${fmt(c.parsed.y, 1)} 万元` } }
            },
            scales: {
                y: { title: { display: true, text: "万元" }, ticks: { font: { size: 11 } }, grid: { color: "#e0e0e0" } },
                x: { ticks: { font: { size: 11 } }, grid: { display: false } }
            }
        }
    });
}

// ============ 板块二：渲染影响因素表 ============
function renderFactorsTable() {
    const tbody = document.querySelector("#factorsTable tbody");
    influenceFactors.forEach(f => {
        const typeClass = f.type === "目标变量" ? "highlight" : "";
        tbody.insertAdjacentHTML("beforeend",
            `<tr><td>${f.factor}</td><td class="highlight"><code>${f.variable}</code></td><td>${f.desc}</td><td class="${typeClass}">${f.type}</td><td>${f.source}</td></tr>`);
    });
}

// ============ 板块二：渲染模型指标表 ============
function renderMetricsTable() {
    const tbody = document.querySelector("#metricsTable tbody");
    modelMetrics.forEach(m => {
        tbody.insertAdjacentHTML("beforeend",
            `<tr><td class="highlight">${m.model}</td><td>${m.paradigm}</td><td class="num">${fmt(m.insampleRMSE)}</td><td class="num">${fmt(m.oosRMSE)}</td><td class="num">${fmt(m.oosMAE)}</td><td class="num">${fmt(m.r2, 4)}</td><td>${m.note}</td></tr>`);
    });
}

// ============ 板块二：渲染年末预测对比表 ============
function renderYearlyTable() {
    const tbody = document.querySelector("#yearlyTable tbody");
    for (let i = 0; i < forecastYearly.labels.length; i++) {
        const ar = forecastYearly.AR[i];
        const arima = forecastYearly.ARIMA[i];
        const sarima = forecastYearly.SARIMA[i];
        const ecm = forecastYearly.ECM[i];
        const naive = forecastYearly.Naive[i];
        tbody.insertAdjacentHTML("beforeend",
            `<tr><td class="highlight">${forecastYearly.labels[i]}</td>
            <td class="num">${fmt(ar)}</td>
            <td class="num">${fmt(arima)}</td>
            <td class="num">${sarima ? fmt(sarima) : "—"}</td>
            <td class="num">${fmt(ecm)}</td>
            <td class="num">${fmt(naive)}</td></tr>`);
    }
}

// ============ 板块二：预测趋势图 ============
let forecastChartInstance = null;
function renderForecastChart() {
    const ctx = document.getElementById("forecastChart");
    if (!ctx || typeof Chart === "undefined") return;
    const series = buildMonthlySeries();

    forecastChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: monthlyLabels,
            datasets: [
                { label: "ECM (FM-OLS)", data: series.ecm, borderColor: "#0E42D2", backgroundColor: "rgba(14,66,210,0.06)", borderWidth: 2.5, tension: 0.3, pointRadius: 0 },
                { label: "AR(10)", data: series.ar, borderColor: "#2d6cdf", backgroundColor: "transparent", borderWidth: 2, tension: 0.3, pointRadius: 0 },
                { label: "ARIMA(3,1,5)", data: series.arima, borderColor: "#e8753a", backgroundColor: "transparent", borderWidth: 2, tension: 0.3, pointRadius: 0, borderDash: [6, 3] },
                { label: "SARIMA", data: series.sarima, borderColor: "#9b59b6", backgroundColor: "transparent", borderWidth: 2, tension: 0.3, pointRadius: 0, borderDash: [3, 3] },
                { label: "Naive基准", data: series.naive, borderColor: "#95a5a6", backgroundColor: "transparent", borderWidth: 1.5, borderDash: [2, 2], pointRadius: 0 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                title: { display: true, text: "second_house_rate 二手住房定基指数预测趋势（2026-01 ~ 2030-12）", font: { size: 14, weight: "bold" }, color: "#1D2129" },
                legend: { position: "bottom", labels: { usePointStyle: true, font: { size: 12 } } },
                tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y !== null ? fmt(c.parsed.y) : "暂无"}` } }
            },
            scales: {
                x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12, font: { size: 10 } }, grid: { display: false } },
                y: { title: { display: true, text: "定基指数（2011-01=100）" }, ticks: { font: { size: 11 } }, grid: { color: "#e0e0e0" } }
            }
        }
    });
}

// ============ 板块二：市场Tabs ============
function initMarketTabs() {
    document.querySelectorAll(".market-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".market-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".market-panel").forEach(p => p.classList.remove("active"));
            tab.classList.add("active");
            const market = tab.dataset.market;
            const panel = market === "residential" ? "residentialPanel" : market === "commercial" ? "commercialPanel" : "industrialPanel";
            document.getElementById(panel).classList.add("active");
        });
    });
}

// ============ 板块四：收地价格测算（1/2/3/5/7年，依据48号文） ============
// 核心公式：
//   预计土地出让收入 = 原用途满年期楼面地价 × 市场形势修正系数 × 总建筑面积（再次出让时间=预计收储年限后）
//   融资平衡收地价格 = 预计土地出让收入 − 预计政府额外支出成本
//   预计政府额外支出 = 融资成本 + 储备土地日常管理费 + 相关税费（契税+印花税） + 土地招拍挂费用 + 收回收购技术支持费
//   融资成本 = 专项债券利息 + 债券发行手续费(万分之八) + 发行登记服务费(百万分之六十四) + 还本付息兑付手续费(十万分之五)
//   专项债券利息 = 收地基础价格 × 发行利率 × 收储年限；日常管理费 = 面积 × 2元/年/㎡ × 收储年限
//   契税 = 收地基础价格 × 3%；印花税 = 收地基础价格 × 0.05%；招拍挂费用 = 预计出让收入 × 0.3%
//   最低下调幅度 =（1 − 融资平衡收地价 ÷ 收地基础价格）× 100%（融资平衡收地价高于基础价格时按0%）
//   建议下调幅度 = 最低下调幅度向上取整至小数点后一位（最低下调幅度为0%时按0.5%）
//   建议收地价格 = 收地基础价格 ×（1 − 建议下调幅度）
//   本息覆盖倍数 =（新规划条件下预计出让收入 − 招拍挂费用 − 刚性计提）÷（建议收地价格 + 专项债券利息及对应发债成本）
//   刚性计提 =（收入 − 建议收地价格 − 专项债券利息及对应发债成本）× 20%（为正时计提）
function getBondRates(prefix) {
    // 读取指定前缀下的 per-year 债券利率，返回 {1: rate, 2: rate, 3: rate, 5: rate, 7: rate}
    const rates = {};
    storageYears.forEach(n => {
        const el = document.getElementById(`${prefix}_bondRate_${n}`);
        const v = el ? parseFloat(el.value) : NaN;
        rates[n] = (isFinite(v) && v >= 0 ? v : 2.80) / 100;
    });
    return rates;
}

function getS3Params() {
    const pe = calcPriceEval();
    const bondRates = getBondRates("s3"); // 板块四按收储年限的利率映射
    const tech = (parseFloat(document.getElementById("s3_tech").value) || 0) / 100;
    // 收地基础价格 = 当前时点剩余年期土地市场价格（板块二③评估总价）
    const basePrice = pe.totalCurrent;
    const factors = getAnnualCoefs();
    return { pe, area: pe.area, areaNew: pe.areaNew, price: pe.totalFull, priceNew: pe.totalFullNew, far: pe.far, farNew: pe.farNew, bondRates, tech, totalBuildArea: pe.buildArea, totalBuildAreaNew: pe.buildAreaNew, basePrice, factors };
}

// 固定费率规则（48号文）
const FEE_ISSUE = 0.0008;      // 债券发行手续费 万分之八
const FEE_REG = 0.000064;      // 发行登记服务费 百万分之六十四
const FEE_REDEEM = 0.00005;    // 还本付息兑付手续费 十万分之五
const MGMT_YUAN_PER_SQM = 2;   // 储备土地日常管理费 2元/年/㎡
const RATE_DEED_TAX = 0.03;    // 契税 3%
const RATE_STAMP_TAX = 0.0005; // 印花税 0.05%
const RATE_AUCTION = 0.003;    // 土地招拍挂费用 0.3%

// 融资成本四项费用（本金口径 principal，年利率 bondRate，年限 n）
function calcFinCost(principal, bondRate, n) {
    const bondInterest = principal * bondRate * n;
    const issueFee = principal * FEE_ISSUE;
    const regFee = principal * FEE_REG;
    const redeemFee = (bondInterest + principal) * FEE_REDEEM;
    return { bondInterest, issueFee, regFee, redeemFee, finCost: bondInterest + issueFee + regFee + redeemFee };
}

// 统一测算核心：给定收储年限 n，输出原规划收入成本、融资平衡价格、建议价格、可实施性（新规划指标）
// opts: { rigid 刚性计提比例, incomeDelta 收入变动系数（用于敏感性分析）, rateDeltaBP 利率变动基点（用于敏感性） }
function calcYearEcon(n, opts = {}) {
    const s3 = getS3Params();
    const coef = marketCoefficient(s3.factors, n);
    const bondRate = s3.bondRates[n] || 0.028; // 板块四收储测算的 per-year 利率
    const bondRateNew = getBondRates("s4")[n] || 0.028; // 板块五融资平衡的 per-year 利率
    const rigid = opts.rigid ?? 0.20;
    const incomeDelta = opts.incomeDelta ?? 1;    // 敏感性 ±10% 收入变动
    const rateDeltaBP = opts.rateDeltaBP ?? 0;    // 敏感性 ±1% = 100BP 利率变动

    // 预计土地出让收入（原用途、满年期）= 满年期评估总价 × 市场形势修正系数
    const income = s3.pe.totalFull * coef * incomeDelta;
    // 政府额外支出（以收地基础价格为基数）— 使用收储年限对应的专项债券利率
    const { bondInterest, issueFee, regFee, redeemFee, finCost } = calcFinCost(s3.basePrice, bondRate, n);
    const mgmtCost = s3.area * MGMT_YUAN_PER_SQM * n / 10000; // 万元
    const deedTax = s3.basePrice * RATE_DEED_TAX;
    const stampTax = s3.basePrice * RATE_STAMP_TAX;
    const taxes = deedTax + stampTax;
    const auctionCost = income * RATE_AUCTION;
    const techCost = s3.basePrice * s3.tech;
    const totalGovCost = finCost + mgmtCost + taxes + auctionCost + techCost;
    const balancePrice = income - totalGovCost;
    // 最低下调幅度：融资平衡收地价高于收地基础价格时按 0%
    let minAdj = s3.basePrice > 0 ? (1 - balancePrice / s3.basePrice) * 100 : 0;
    if (minAdj < 0) minAdj = 0;
    // 建议下调幅度：向上取整至小数点后一位；最低下调幅度为0%时按0.5%
    const suggestAdj = minAdj <= 0 ? 0.5 : Math.ceil(minAdj * 10) / 10;
    const suggestPrice = s3.basePrice * (1 - suggestAdj / 100);

    // 可实施性：意向新规划指标下预计土地出让收入 = 新规划满年期评估总价 × 市场形势修正系数
    const incomeNew = s3.pe.totalFullNew * coef * incomeDelta;
    const effRateNew = Math.max(0, bondRateNew + rateDeltaBP / 10000); // 100BP = 1%
    const finNew = calcFinCost(suggestPrice, effRateNew, n); // 债券本金 = 建议收地价格
    const auctionNew = incomeNew * RATE_AUCTION;
    const netForRigid = incomeNew - suggestPrice - finNew.finCost;
    const rigidCost = netForRigid > 0 ? netForRigid * rigid : 0;
    const available = incomeNew - auctionNew - rigidCost;
    const debtService = suggestPrice + finNew.finCost;
    const coverage = debtService > 0 ? available / debtService : 0;
    const feasible = coverage >= 1.2;
    return {
        n, coef, income, incomeNew, bondInterest, issueFee, regFee, redeemFee, finCost,
        mgmtCost, deedTax, stampTax, taxes, auctionCost, techCost, totalGovCost,
        balancePrice, minAdj, suggestAdj, suggestPrice,
        sInterest: finNew.bondInterest, sIssueFee: finNew.issueFee, sRegFee: finNew.regFee,
        sRedeemFee: finNew.redeemFee, sFinCost: finNew.finCost,
        auctionNew, rigidCost, available, debtService, coverage, feasible,
        s3
    };
}

// 一、不同收储年份测算结果（分项成本）
function renderS3CostTable() {
    const table = document.getElementById("s3_costTable");
    if (!table) return null;
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    const results = [];

    storageYears.forEach(n => {
        const r = calcYearEcon(n);
        results.push(r);
        tbody.insertAdjacentHTML("beforeend",
            `<tr>
                <td class="highlight">${n}年</td>
                <td class="num">${fmt(r.s3.basePrice, 1)}</td>
                <td class="num highlight">${fmt(r.income, 1)}</td>
                <td class="num">${fmt(r.bondInterest, 1)}</td>
                <td class="num">${fmt(r.issueFee, 2)}</td>
                <td class="num">${fmt(r.regFee, 2)}</td>
                <td class="num">${fmt(r.redeemFee, 2)}</td>
                <td class="num">${fmt(r.finCost, 1)}</td>
                <td class="num">${fmt(r.mgmtCost, 1)}</td>
                <td class="num">${fmt(r.deedTax, 1)}</td>
                <td class="num">${fmt(r.stampTax, 2)}</td>
                <td class="num">${fmt(r.auctionCost, 1)}</td>
                <td class="num">${fmt(r.techCost, 1)}</td>
                <td class="num">${fmt(r.totalGovCost, 1)}</td>
            </tr>`);
    });
    return results;
}

// 二、融资平衡条件下收地价格
function renderS3BalanceTable() {
    const table = document.getElementById("s3_balanceTable");
    if (!table) return null;
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    const results = [];

    storageYears.forEach(n => {
        const r = calcYearEcon(n);
        const adjClass = r.minAdj <= 0 ? "feasible" : "infeasible";
        results.push(r);
        tbody.insertAdjacentHTML("beforeend",
            `<tr>
                <td class="highlight">${n}年</td>
                <td class="num">${fmt(r.income, 1)}</td>
                <td class="num">${fmt(r.totalGovCost, 1)}</td>
                <td class="num highlight">${fmt(r.balancePrice, 1)}</td>
                <td class="num">${fmt(r.s3.basePrice, 1)}</td>
                <td class="num ${adjClass}">${pct(r.minAdj)}</td>
            </tr>`);
    });
    return results;
}

// 三、建议下调幅度和建议收地价格
function renderS3SuggestTable() {
    const table = document.getElementById("s3_suggestTable");
    if (!table) return null;
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    const results = [];

    storageYears.forEach(n => {
        const r = calcYearEcon(n);
        results.push(r);
        tbody.insertAdjacentHTML("beforeend",
            `<tr>
                <td class="highlight">${n}年</td>
                <td class="num">${pct(r.minAdj)}</td>
                <td class="num highlight">${r.suggestAdj.toFixed(1)}%</td>
                <td class="num">${fmt(r.s3.basePrice, 1)}</td>
                <td class="num highlight">${fmt(r.suggestPrice, 1)}</td>
            </tr>`);
    });
    renderS3SuggestChart(results);
    return results;
}

// 建议下调幅度（折线）与建议收地价格（柱状）组合图
let suggestChartInstance = null;
function renderS3SuggestChart(results) {
    const ctx = document.getElementById("suggestChart");
    if (!ctx || typeof Chart === "undefined") return;
    if (suggestChartInstance) suggestChartInstance.destroy();
    suggestChartInstance = new Chart(ctx, {
        data: {
            labels: results.map(r => `${r.n}年`),
            datasets: [
                {
                    type: "bar",
                    label: "建议收地价格(万元)",
                    data: results.map(r => r.suggestPrice),
                    backgroundColor: "rgba(22, 93, 255, 0.75)",
                    borderColor: "#165DFF",
                    borderWidth: 1.5,
                    borderRadius: 6,
                    yAxisID: "y"
                },
                {
                    type: "line",
                    label: "建议下调幅度(%)",
                    data: results.map(r => r.suggestAdj),
                    borderColor: "#e8753a",
                    backgroundColor: "rgba(232,117,58,0.08)",
                    borderWidth: 2.5,
                    tension: 0.3,
                    pointRadius: 4,
                    yAxisID: "y1"
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                title: { display: true, text: "不同收储年限建议下调幅度与建议收地价格", font: { size: 13, weight: "bold" }, color: "#1D2129" },
                legend: { position: "bottom", labels: { usePointStyle: true, font: { size: 11 } } },
                tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt(c.parsed.y, 1)}` } }
            },
            scales: {
                y: { position: "left", title: { display: true, text: "建议收地价格(万元)" }, ticks: { font: { size: 11 } }, grid: { color: "#e0e0e0" } },
                y1: { position: "right", title: { display: true, text: "建议下调幅度(%)" }, ticks: { font: { size: 11 }, callback: v => v + "%" }, grid: { display: false } },
                x: { ticks: { font: { size: 11 } }, grid: { display: false } }
            }
        }
    });
}

// 板块四汇总
function renderS3Summary() {
    const p = getS3Params();
    const summary = document.getElementById("s3_summary");
    if (!summary) return;
    const useMap = { residential: "住宅用地", commercial: "商办用地", industrial: "工业用地" };
    const use = document.getElementById("s3_use").value;
    summary.innerHTML = `
        <p><strong>原规划用途：</strong>${useMap[use]} | <strong>总用地面积：</strong>${fmt(p.area, 0)}㎡ | <strong>总建筑面积：</strong>${fmt(p.totalBuildArea, 0)}㎡（计算容积率 ${p.far.toFixed(2)}）</p>
        <p><strong>收地基础价格：</strong>当前时点剩余年期评估总价 = <strong>${fmt(p.basePrice, 1)} 万元</strong>（联动板块二③） | <strong>满年期评估总价：</strong>${fmt(p.price, 1)} 万元（联动板块二①）</p>
        <p><strong>固定费率规则：</strong>债券发行手续费 万分之八 | 发行登记服务费 百万分之六十四 | 还本付息兑付手续费 十万分之五 | 日常管理费 2元/年/㎡ | 契税 3% + 印花税 0.05% | 招拍挂费用 收入×0.3%</p>
        <p><strong>测算依据：</strong>《深圳市运用专项债券收回收购存量闲置土地价格确定规则》（深规划资源〔2026〕48号）</p>`;
    return { basePrice: p.basePrice, area: p.area, far: p.far, use, price: p.price };
}

// ============ 板块五：融资平衡可实施性分析 ============
// 本息覆盖倍数 =（新规划条件下预计土地出让收入 − 招拍挂费用 − 刚性计提）÷（建议收地价格 + 专项债券利息及对应发债成本）
// 刚性计提 =（收入 − 建议收地价格 − 专项债券利息及对应发债成本）× 20%；招拍挂费用 = 预计出让收入 × 0.3%
let coverageChartInstance = null;
function calcSection4() {
    const use = document.getElementById("s4_use").value;
    const rigid = (parseFloat(document.getElementById("s4_rigid").value) || 0) / 100;

    const tbody = document.querySelector("#s4_resultTable tbody");
    tbody.innerHTML = "";

    let feasibleYears = [], bestCov = 0, bestN = 0, results = [];

    storageYears.forEach(n => {
        const r = calcYearEcon(n, { rigid });
        const label = `${n}年`;
        results.push({ ...r, label });

        if (r.feasible) feasibleYears.push(label);
        if (r.coverage > bestCov) { bestCov = r.coverage; bestN = n; }

        tbody.insertAdjacentHTML("beforeend",
            `<tr>
                <td class="highlight">${label}</td>
                <td class="num">${fmt(r.incomeNew, 1)}</td>
                <td class="num">${fmt(r.auctionNew, 1)}</td>
                <td class="num">${fmt(r.rigidCost, 1)}</td>
                <td class="num highlight">${fmt(r.available, 1)}</td>
                <td class="num">${fmt(r.suggestPrice, 1)}</td>
                <td class="num">${fmt(r.sFinCost, 1)}</td>
                <td class="num">${fmt(r.debtService, 1)}</td>
                <td class="num ${r.feasible ? 'feasible' : 'infeasible'}">${fmt(r.coverage, 3)}</td>
                <td class="${r.feasible ? 'feasible' : 'infeasible'}">${r.feasible ? "✓ 可行" : "✗ 不可行"}</td>
            </tr>`);
    });

    // 覆盖倍数柱状图
    renderCoverageChart(results);

    // 汇总
    const useMap = { residential: "住宅用地（规划后）", commercial: "商办用地（规划后）", industrial: "工业用地（规划后）" };
    const s3 = getS3Params();
    const summary = document.getElementById("s4_summary");
    const feasibleCount = feasibleYears.length;
    const anyFeasible = feasibleCount > 0;
    const s4Rates = getBondRates("s4");
    const rateStr = storageYears.map(n => `${n}年=${(s4Rates[n]*100).toFixed(2)}%`).join("、");
    summary.innerHTML = `
        <p><strong>规划后用途：</strong>${useMap[use]} | <strong>价格基准：</strong>意向新规划满年期评估总价 ${fmt(s3.priceNew, 1)} 万元（联动板块二④） | <strong>变动率：</strong>${pct(s3.pe.changeRate * 100)}</p>
        <p><strong>债券本金：</strong>各年限建议收地价格 | <strong>年利率（按年限）：</strong>${rateStr} | <strong>覆盖阈值：</strong>1.2 | <strong>招拍挂费用：</strong>收入×0.3% | <strong>刚性计提：</strong>（收入−建议收地价格−利息及发债成本）×${(rigid*100).toFixed(0)}%</p>
        <p><strong>最优收储年限：</strong>${bestN}年，覆盖倍数 ${fmt(bestCov, 3)} ${bestCov >= 1.2 ? '<span class="verdict-yes">✓ 可行</span>' : '<span class="verdict-no">✗ 不可行</span>'}</p>
        <p><strong>可行年限：</strong>${anyFeasible ? feasibleYears.join("、") : "无"}（共 ${feasibleCount}/${storageYears.length} 年可行）</p>`;

    return { results, feasibleYears, bestCov, bestN, anyFeasible, use, rigid };
}

// ============ 板块四：覆盖倍数柱状图 ============
function renderCoverageChart(results) {
    const ctx = document.getElementById("coverageChart");
    if (!ctx || typeof Chart === "undefined") return;
    if (coverageChartInstance) coverageChartInstance.destroy();

    const valid = results.filter(r => r.coverage !== undefined && !isNaN(r.coverage));
    coverageChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: valid.map(r => r.label),
            datasets: [{
                label: "本息覆盖倍数",
                data: valid.map(r => r.coverage),
                backgroundColor: valid.map(r => r.coverage >= 1.2 ? "rgba(39,174,96,0.8)" : "rgba(192,57,43,0.8)"),
                borderColor: valid.map(r => r.coverage >= 1.2 ? "#27ae60" : "#c0392b"),
                borderWidth: 1.5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: "不同收储年限本息覆盖倍数（阈值 1.2）", font: { size: 13, weight: "bold" }, color: "#1D2129" },
                legend: { display: false },
                tooltip: { callbacks: { label: c => `覆盖倍数: ${fmt(c.parsed.y, 3)} ${c.parsed.y >= 1.2 ? "✓ 可行" : "✗ 不可行"}` } }
            },
            scales: {
                y: { title: { display: true, text: "覆盖倍数" }, ticks: { font: { size: 11 } }, grid: { color: "#e0e0e0" } },
                x: { ticks: { font: { size: 10 } }, grid: { display: false } }
            }
        },
        plugins: [{
            id: "thresholdLine",
            afterDraw(chart) {
                const ctx = chart.ctx, yScale = chart.scales.y;
                if (!yScale) return;
                const y = yScale.getPixelForValue(1.2);
                ctx.save();
                ctx.strokeStyle = "#e67e22";
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(chart.chartArea.left, y);
                ctx.lineTo(chart.chartArea.right, y);
                ctx.stroke();
                ctx.fillStyle = "#e67e22";
                ctx.font = "bold 11px sans-serif";
                ctx.fillText("可行阈值 1.2", chart.chartArea.right - 70, y - 6);
                ctx.restore();
            }
        }]
    });
}

// ============ 板块五：专项债券利息及发债成本明细（不同收储年限） ============
function renderS4CoefTable() {
    const table = document.getElementById("s4_coefTable");
    if (!table) return null;
    const rigid = (parseFloat(document.getElementById("s4_rigid").value) || 0) / 100;
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    const results = [];

    storageYears.forEach(n => {
        const r = calcYearEcon(n, { rigid });
        results.push(r);
        tbody.insertAdjacentHTML("beforeend",
            `<tr>
                <td class="highlight">${n}年</td>
                <td class="num">${fmt(r.suggestPrice, 1)}</td>
                <td class="num">${fmt(r.sInterest, 1)}</td>
                <td class="num">${fmt(r.sIssueFee, 2)}</td>
                <td class="num">${fmt(r.sRegFee, 2)}</td>
                <td class="num">${fmt(r.sRedeemFee, 2)}</td>
                <td class="num">${fmt(r.sFinCost, 1)}</td>
                <td class="num highlight">${fmt(r.debtService, 1)}</td>
            </tr>`);
    });
    return results;
}

// ============ 板块六：投资结论（不同收储年限收入与分项成本对比） ============
// 整合板块四（收储测算）与板块五（融资平衡）的核心结果，按 1/2/3/5/7 年对比展示
function renderConclusionTable() {
    const table = document.getElementById("conclusionTable");
    if (!table) return null;
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";

    const rigid = (parseFloat(document.getElementById("s4_rigid").value) || 0) / 100;

    const results = [];
    storageYears.forEach(n => {
        const r = calcYearEcon(n, { rigid });
        results.push(r);

        const covCls = r.feasible ? "feasible" : "infeasible";
        tbody.insertAdjacentHTML("beforeend",
            `<tr>
                <td class="highlight">${n}年</td>
                <td class="num highlight">${fmt(r.income, 1)}</td>
                <td class="num">${fmt(r.finCost, 1)}</td>
                <td class="num">${fmt(r.auctionCost, 1)}</td>
                <td class="num">${fmt(r.mgmtCost + r.taxes + r.techCost, 1)}</td>
                <td class="num">${fmt(r.totalGovCost, 1)}</td>
                <td class="num">${fmt(r.balancePrice, 1)}</td>
                <td class="num highlight">${fmt(r.suggestPrice, 1)}</td>
                <td class="num">${fmt(r.debtService, 1)}</td>
                <td class="num ${covCls}"><strong>${fmt(r.coverage, 3)}</strong></td>
                <td class="${covCls}">${r.feasible ? "✓ 可行" : "✗ 不可行"}</td>
            </tr>`);
    });
    return results;
}

// 收储年限建议、收地价格建议、投资可行性结论
function renderConclusion() {
    const results = renderConclusionTable();
    if (!results || results.length === 0) return;
    const s3 = getS3Params();

    // 选最优可行年限（覆盖倍数最高且 ≥1.2）
    const feasibleResults = results.filter(r => r.feasible);
    const best = feasibleResults.length > 0
        ? feasibleResults.reduce((a, b) => a.coverage > b.coverage ? a : b)
        : results.reduce((a, b) => a.coverage > b.coverage ? a : b);
    const bestIdx = results.findIndex(r => r.n === best.n);
    const isFeasible = feasibleResults.length > 0;

    // 一、收储年限建议
    const yearsEl = document.getElementById("conclusion_years");
    yearsEl.innerHTML = results.map((r, i) => {
        const isBest = i === bestIdx;
        const cls = isBest ? "item highlight-best" : "item";
        const mark = isBest ? '<span class="tag-best">推荐</span>' : "";
        return `<div class="${cls}">
            <span>${r.n}年${mark}</span>
            <span class="item-value">覆盖倍数 ${fmt(r.coverage, 3)} ${r.feasible ? "✓" : "✗"}</span>
        </div>`;
    }).join("");
    yearsEl.innerHTML += `<div class="item"><span>可行年限数</span><span class="item-value">${feasibleResults.length} / ${results.length}</span></div>`;

    // 二、收地价格建议
    const costsEl = document.getElementById("conclusion_costs");
    costsEl.innerHTML = `
        <div class="item"><span>收地基础价格</span><span class="item-value">${fmt(s3.basePrice, 1)} 万元</span></div>
        <div class="item"><span>推荐年限</span><span class="item-value">${best.n}年</span></div>
        <div class="item"><span>建议下调幅度</span><span class="item-value">${best.suggestAdj.toFixed(1)}%</span></div>
        <div class="item"><span>建议收地价格</span><span class="item-value highlight">${fmt(best.suggestPrice, 1)} 万元</span></div>
        <div class="item"><span>融资平衡收地价</span><span class="item-value">${fmt(best.balancePrice, 1)} 万元</span></div>
        <div class="item"><span>债券本息</span><span class="item-value">${fmt(best.debtService, 1)} 万元</span></div>`;

    // 三、投资可行性结论
    const verdictEl = document.getElementById("conclusion_verdict");
    const verdictClass = isFeasible ? "verdict-pass" : "verdict-fail";
    const verdictText = isFeasible ? "项目可行" : "项目不可行";
    verdictEl.innerHTML = `
        <div class="big-value ${verdictClass}">${verdictText}</div>
        <div class="item"><span>最优收储年限</span><span class="item-value">${best.n}年</span></div>
        <div class="item"><span>最高覆盖倍数</span><span class="item-value">${fmt(best.coverage, 3)}</span></div>
        <div class="item"><span>可行阈值</span><span class="item-value">≥ 1.20</span></div>
        <div class="item"><span>可行年限数</span><span class="item-value">${feasibleResults.length} / ${results.length}</span></div>`;

    // 综合建议
    const recEl = document.getElementById("recommendationContent");
    let recHtml = `<p>1. <span class="highlight">收储年限建议：</span>推荐收储年限为 <span class="highlight">${best.n}年</span>，本息覆盖倍数 ${fmt(best.coverage, 3)}，`;
    if (isFeasible) {
        recHtml += `该年限覆盖倍数 ≥ 1.2，融资自平衡<span class="highlight">可实施</span>。</p>`;
    } else {
        recHtml += `该年限覆盖倍数 &lt; 1.2，建议<span class="highlight">暂缓投资</span>或调整规划后用途价值系数、收储规模或债券利率后重新测算。</p>`;
    }
    recHtml += `<p>2. <span class="highlight">收地价格建议：</span>收地基础价格 ${fmt(s3.basePrice, 1)} 万元，建议下调幅度 ${best.suggestAdj.toFixed(1)}%，<span class="highlight">建议收地价格 ${fmt(best.suggestPrice, 1)} 万元</span>（${best.n}年融资平衡口径）。</p>`;
    recHtml += `<p>3. <span class="highlight">投资判断：</span>${isFeasible
        ? "覆盖倍数达标，建议推进专项债券收储；可在推荐年限内选择出让时点，以实现融资自平衡。"
        : "覆盖倍数未达标，建议调整规划后用途价值系数、收储规模或债券利率后重新测算，或暂缓推进。"
    }</p>`;
    recEl.innerHTML = recHtml;

    return { results, best, isFeasible };
}

// ============ 板块七：全链条价格测算结果报告 ============
// 报告框架（参考坪山华侨城项目收回收购情况分析）：
// 一、项目背景 / 二、项目基本情况 / 三、运用专项债券收回收购价格测算分析 / 四、土地再出让融资收益平衡可实施性论证 / 五、收地价格建议
// ============ 报告PDF导出（html2canvas + jsPDF） ============
let exportBusy = false;
async function exportReportPDF() {
    if (exportBusy) { alert("报告正在生成中，请稍候…"); return; }
    const container = document.getElementById("reportContainer");
    if (!container) { alert("未找到报告容器"); return; }

    // 依赖检查
    if (typeof html2canvas === "undefined" || typeof jspdf === "undefined") {
        alert("PDF导出库未加载，请检查网络后重试，或使用「🖨️ 浏览器打印」按钮保存为PDF");
        return;
    }

    exportBusy = true;
    const btn = document.getElementById("reportExportBtn");
    const btnOrig = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "⏳ 正在生成PDF…"; }

    // 刷新报告数据
    renderFullReport();
    // 等待 DOM 更新
    await new Promise(r => setTimeout(r, 150));

    try {
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();  // 210mm
        const pageH = pdf.internal.pageSize.getHeight(); // 297mm
        const margin = 10; // mm
        const contentW = pageW - margin * 2; // 190mm

        // 用 html2canvas 将报告容器渲染为 canvas
        const canvas = await html2canvas(container, {
            scale: 2,              // 2x 保证清晰度
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            windowWidth: container.scrollWidth
        });

        const imgW = contentW; // mm
        const imgH = canvas.height * imgW / canvas.width; // 等比缩放后的总高度（mm）

        // 如果内容不超过一页，直接画
        if (imgH <= pageH - margin * 2) {
            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            pdf.addImage(imgData, "JPEG", margin, margin, imgW, imgH);
        } else {
            // 多页：按 A4 可用高度切片
            const usableH = pageH - margin * 2; // 277mm
            // 先把整个 canvas 等比缩放到 A4 宽度下的尺寸
            const totalPageHeight = usableH;
            const pxPerMm = canvas.width / imgW; // canvas 像素 / mm
            const slicePx = Math.floor(totalPageHeight * pxPerMm); // 每页截取多少像素
            let remainPx = canvas.height;
            let firstPage = true;
            let yOffsetPx = 0;

            while (remainPx > 0) {
                // 创建单页切片 canvas
                const sliceH = Math.min(slicePx, remainPx);
                const sliceCanvas = document.createElement("canvas");
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = sliceH;
                const sctx = sliceCanvas.getContext("2d");
                sctx.fillStyle = "#ffffff";
                sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                sctx.drawImage(canvas, 0, yOffsetPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

                const sliceImgW = imgW;
                const sliceImgH = sliceH / pxPerMm; // mm

                if (!firstPage) pdf.addPage();
                const imgData = sliceCanvas.toDataURL("image/jpeg", 0.95);
                pdf.addImage(imgData, "JPEG", margin, margin, sliceImgW, sliceImgH);

                remainPx -= sliceH;
                yOffsetPx += sliceH;
                firstPage = false;
            }
        }

        // 自动下载
        const ts = new Date().toISOString().slice(0, 10);
        pdf.save(`土地收储全链条测算报告_${ts}.pdf`);
    } catch (err) {
        console.error("PDF导出失败:", err);
        alert("PDF导出失败：" + (err.message || err) + "\n\n可尝试使用「🖨️ 浏览器打印」按钮，在打印对话框中选择「另存为PDF」。");
    } finally {
        exportBusy = false;
        if (btn) { btn.disabled = false; btn.textContent = btnOrig || "📄 导出PDF报告"; }
    }
}

function renderFullReport() {
    const s3 = getS3Params();
    const useMap = { residential: "住宅用地", commercial: "商办用地", industrial: "工业用地" };
    const use = document.getElementById("s3_use").value;
    const rigid = (parseFloat(document.getElementById("s4_rigid").value) || 0) / 100;
    const s3Rates = s3.bondRates;
    const s4Rates = getBondRates("s4");
    const s3RateStr = storageYears.map(n => `${n}年=${(s3Rates[n]*100).toFixed(2)}%`).join("、");
    const s4RateStr = storageYears.map(n => `${n}年=${(s4Rates[n]*100).toFixed(2)}%`).join("、");

    // 一、项目背景
    const introEl = document.getElementById("reportIntroContent");
    if (introEl) {
        introEl.innerHTML = `
            <p>根据《深圳市运用专项债券实施土地收储工作指引》（深规划资源〔2025〕358号）和《深圳市运用专项债券收回收购存量闲置土地价格确定规则》（深规划资源〔2026〕48号）有关要求，为落实存量闲置土地处置工作部署，拟运用地方政府专项债券资金对${useMap[use]}地块（用地面积 ${fmt(s3.area, 0)} 平方米，容积率 ${s3.far}，总建筑面积 ${fmt(s3.totalBuildArea, 0)} 平方米）实施收回收购。本报告围绕该地块开展运用专项债券收回收购地价测算分析，形成收地基础价格、建议收地价格、融资收益平衡可实施性论证与收地价格建议等测算成果。</p>
            <p>测算范围为 1 年、2 年、3 年、5 年、7 年共 5 个预计收储年限。</p>`;
    }

    // 二、项目基本情况
    const evalEl = document.getElementById("reportEvalContent");
    if (evalEl) {
        evalEl.innerHTML = `
            <h4>（一）宗地现状情况</h4>
            <p>该地块现状为${useMap[use]}，用地面积 ${fmt(s3.area, 0)} 平方米，规划容积率 ${s3.far}，总建筑面积 ${fmt(s3.totalBuildArea, 0)} 平方米。专项债券年利率按收储年限差异化设定：${s3RateStr}。</p>
            <h4>（二）现状规划</h4>
            <p>该地块用地性质为${useMap[use]}，位于城镇开发边界内。以最新版已发布标定地价成果为基础，满年期（法定最高年期）评估总价为 <strong>${fmt(s3.pe.totalFull, 1)} 万元</strong>（综合楼面地价 ${fmt(s3.pe.floorFull, 0)} 元/㎡）；当前时点剩余年期市场评估总价为 <strong>${fmt(s3.pe.totalCurrent, 1)} 万元</strong>，较标定地价剩余年期价格变动率 <strong class="${s3.pe.changeRate < 0 ? 'verdict-fail' : 'verdict-pass'}">${pct(s3.pe.changeRate * 100)}</strong>。</p>
            <h4>（三）意向新规划指标</h4>
            <p>结合区域规划研究，该地块意向规划后总建筑面积 ${fmt(s3.pe.buildAreaNew, 0)} ㎡（容积率 ${s3.pe.farNew.toFixed(2)}），最新版本标定地价评估结果（满年期 · 意向新规划）总价 <strong>${fmt(s3.pe.totalFullNew, 1)} 万元</strong>（综合楼面地价 ${fmt(s3.pe.floorFullNew, 0)} 元/㎡），作为新规划条件下土地再出让融资收益平衡测算的收入基准。</p>`;
    }

    // 三、运用专项债券收回收购价格测算分析（不同收储年限收入和成本细项）
    const priceEl = document.getElementById("reportPriceContent");
    if (priceEl) {
        const rows = storageYears.map(n => calcYearEcon(n));
        const costRowsHtml = rows.map(r => `
            <tr>
                <td class="highlight">${r.n}年</td>
                <td class="num highlight">${fmt(r.income, 1)}</td>
                <td class="num">${fmt(r.bondInterest, 1)}</td>
                <td class="num">${fmt(r.issueFee, 2)}</td>
                <td class="num">${fmt(r.regFee, 2)}</td>
                <td class="num">${fmt(r.redeemFee, 2)}</td>
                <td class="num">${fmt(r.finCost, 1)}</td>
                <td class="num">${fmt(r.mgmtCost, 1)}</td>
                <td class="num">${fmt(r.deedTax, 1)}</td>
                <td class="num">${fmt(r.stampTax, 2)}</td>
                <td class="num">${fmt(r.auctionCost, 1)}</td>
                <td class="num">${fmt(r.techCost, 1)}</td>
                <td class="num highlight">${fmt(r.totalGovCost, 1)}</td>
            </tr>`).join("");
        const priceRowsHtml = rows.map(r => `
            <tr>
                <td class="highlight">${r.n}年</td>
                <td class="num">${fmt(r.income, 1)}</td>
                <td class="num">${fmt(r.totalGovCost, 1)}</td>
                <td class="num highlight">${fmt(r.balancePrice, 1)}</td>
                <td class="num">${fmt(r.s3.basePrice, 1)}</td>
                <td class="num">${r.minAdj.toFixed(2)}%</td>
                <td class="num highlight">${r.suggestAdj.toFixed(1)}%</td>
                <td class="num highlight">${fmt(r.suggestPrice, 1)}</td>
            </tr>`).join("");
        priceEl.innerHTML = `
            <h4>（一）收地基础价格测算</h4>
            <p>按照《深圳市运用专项债券收回收购存量闲置土地价格确定规则》（深规划资源〔2026〕48号），结合土地市场价格和企业土地成本就低确定收地基础价格。经评估，该地块当前时点剩余年期评估总价为 ${fmt(s3.pe.totalCurrent, 1)} 万元（较标定地价剩余年期评估结果变动率 ${pct(s3.pe.changeRate * 100)}）。收地基础价格 = 当前时点剩余年期土地市场价格 = <strong>${fmt(s3.basePrice, 1)} 万元</strong>。</p>
            <h4>（二）满年期、原规划指标未来土地收入预测</h4>
            <p>根据《价格确定规则》，预计土地出让收入即运用专项债券收回收购的存量闲置土地按<strong>原用途、满年期</strong>再次出让的收入，土地再次出让时间按预计收储年限确定。以最新版标定地价满年期评估总价 ${fmt(s3.pe.totalFull, 1)} 万元为基准，结合手工填报的年度市场形势修正系数（连乘累计，见《不同收储年限市场形势修正系数》表），测算各收储年限预计土地出让收入如下表。</p>
            <h4>（三）建议收地价格测算</h4>
            <p>融资收益平衡条件下的收地价格 = 预计土地出让收入 − 预计政府额外支出成本。其中预计政府额外支出包括：政府融资成本（专项债券利息 + 债券发行手续费万分之八 + 发行登记服务费百万分之六十四 + 还本付息兑付手续费十万分之五）、储备土地日常管理费（面积 × 2元/年/㎡ × 收储年限）、相关税费（契税3% + 印花税0.05%，按收地基础价格）、土地招拍挂费用（预计出让收入 × 0.3%）及收回收购技术支持费。最低下调幅度 =（1 − 融资平衡收地价格 ÷ 收地基础价格）× 100%，融资平衡收地价格高于收地基础价格的按 0% 确定；在此基础上市规划和自然资源局向上取整至小数点后一位形成下调幅度建议方案（最低下调幅度为 0% 时按 0.5% 形成）。</p>
            <p style="margin-top:8px;"><strong>表1 不同收储年限预计土地出让收入与政府额外支出成本细项（万元）</strong></p>
            <table class="report-table">
                <tr>
                    <th>收储年限</th>
                    <th>预计土地出让收入</th>
                    <th>专项债券利息</th>
                    <th>债券发行手续费</th>
                    <th>发行登记服务费</th>
                    <th>还本付息兑付手续费</th>
                    <th>融资成本小计</th>
                    <th>日常管理费</th>
                    <th>契税(3%)</th>
                    <th>印花税(0.05%)</th>
                    <th>招拍挂费用(0.3%)</th>
                    <th>技术支持费</th>
                    <th>政府额外支出合计</th>
                </tr>
                ${costRowsHtml}
            </table>
            <p style="margin-top:12px;"><strong>表2 不同收储年限融资平衡收地价格与建议收地价格（万元）</strong></p>
            <table class="report-table">
                <tr>
                    <th>收储年限</th>
                    <th>预计土地出让收入</th>
                    <th>政府额外支出合计</th>
                    <th>融资平衡收地价格</th>
                    <th>收地基础价格</th>
                    <th>最低下调幅度</th>
                    <th>建议下调幅度</th>
                    <th>建议收地价格</th>
                </tr>
                ${priceRowsHtml}
            </table>
            <div class="report-highlight">
                <strong>测算结论：</strong>不同收储年限下，最低下调幅度区间为 <strong>${Math.min(...rows.map(r => r.minAdj)).toFixed(2)}% ~ ${Math.max(...rows.map(r => r.minAdj)).toFixed(2)}%</strong>，建议下调幅度区间为 <strong>${Math.min(...rows.map(r => r.suggestAdj)).toFixed(1)}% ~ ${Math.max(...rows.map(r => r.suggestAdj)).toFixed(1)}%</strong>，建议收地价格区间为 <strong>${fmt(Math.min(...rows.map(r => r.suggestPrice)), 1)} ~ ${fmt(Math.max(...rows.map(r => r.suggestPrice)), 1)} 万元</strong>。
            </div>`;
    }

    // 四、土地再出让融资收益平衡可实施性论证（不同收储年限收入和成本细项）
    const feasibilityEl = document.getElementById("reportFeasibilityContent");
    if (feasibilityEl) {
        const rows = storageYears.map(n => calcYearEcon(n, { rigid }));
        const rowsHtml = rows.map(r => {
            const cls = r.feasible ? "verdict-pass" : "verdict-fail";
            return `
            <tr>
                <td class="highlight">${r.n}年</td>
                <td class="num">${fmt(r.incomeNew, 1)}</td>
                <td class="num">${fmt(r.auctionNew, 1)}</td>
                <td class="num">${fmt(r.suggestPrice, 1)}</td>
                <td class="num">${fmt(r.sInterest, 1)}</td>
                <td class="num">${fmt(r.sIssueFee + r.sRegFee + r.sRedeemFee, 2)}</td>
                <td class="num">${fmt(r.sFinCost, 1)}</td>
                <td class="num">${fmt(r.rigidCost, 1)}</td>
                <td class="num highlight">${fmt(r.available, 1)}</td>
                <td class="num highlight">${fmt(r.debtService, 1)}</td>
                <td class="num ${cls}"><strong>${fmt(r.coverage, 3)}</strong></td>
                <td class="${cls}">${r.feasible ? "✓ 可行" : "✗ 不可行"}</td>
            </tr>`;
        }).join("");
        const feasibleRows = rows.filter(r => r.feasible);
        const best = feasibleRows.length > 0
            ? feasibleRows.reduce((a, b) => a.coverage > b.coverage ? a : b)
            : rows.reduce((a, b) => a.coverage > b.coverage ? a : b);
        feasibilityEl.innerHTML = `
            <p>基于原${useMap[use]}用地市场持续调整的研判，该地块土地再出让按意向新规划指标测算预计土地出让收入（= 新规划满年期评估总价 × 市场形势修正系数）。本息覆盖倍数 =（新规划条件下预计土地出让收入 − 土地招拍挂费用 − 刚性计提）÷（建议收地价格 + 专项债券利息及对应发债成本），其中刚性计提 =（收入 − 建议收地价格 − 专项债券利息及对应发债成本）× ${(rigid * 100).toFixed(0)}%，土地招拍挂费用 = 预计土地出让收入 × 0.3%，专项债券利息及对应发债成本按各年限建议收地价格作为债券本金测算（年利率按收储年限差异化：${s4RateStr}，含债券发行手续费万分之八、发行登记服务费百万分之六十四、还本付息兑付手续费十万分之五）。本息覆盖倍数 ≥ 1.2 判定融资收益平衡可实施。</p>
            <p style="margin-top:8px;"><strong>表3 不同收储年限土地再出让收入与成本细项及本息覆盖倍数（万元）</strong></p>
            <table class="report-table">
                <tr>
                    <th>收储年限</th>
                    <th>新规划预计出让收入</th>
                    <th>招拍挂费用(0.3%)</th>
                    <th>建议收地价格(债券本金)</th>
                    <th>专项债券利息</th>
                    <th>其他发债费用</th>
                    <th>利息及发债成本小计</th>
                    <th>刚性计提</th>
                    <th>可用于还本付息</th>
                    <th>债券本息合计</th>
                    <th>本息覆盖倍数</th>
                    <th>可行性</th>
                </tr>
                ${rowsHtml}
            </table>
            <div class="report-highlight">
                <strong>可实施性结论：</strong>${feasibleRows.length} / ${rows.length} 个年限本息覆盖倍数达标（≥1.2），最优年限为 <strong>${best.n}年</strong>，覆盖倍数 <strong class="${best.feasible ? 'verdict-pass' : 'verdict-fail'}">${fmt(best.coverage, 3)}</strong>，${best.feasible ? "项目融资收益平衡可实施" : "项目融资收益平衡暂不可实施，建议调整规划用途价值系数、收储年限或债券利率后重新测算"}。
            </div>`;
    }

    // 五、投资建议
    const investEl = document.getElementById("reportInvestmentContent");
    if (investEl) {
        const rigid = (parseFloat(document.getElementById("s4_rigid").value) || 0) / 100;
        const rows = storageYears.map(n => {
            const r = calcYearEcon(n, { rigid });
            return {
                n: r.n,
                income: r.income,
                totalGovCost: r.totalGovCost,
                balancePrice: r.balancePrice,
                suggestAdj: r.suggestAdj,
                suggestPrice: r.suggestPrice,
                coverage: r.coverage,
                feasible: r.feasible
            };
        });
        const rowsHtml = rows.map(r => {
            const cls = r.feasible ? "verdict-pass" : "verdict-fail";
            return `
            <tr>
                <td class="highlight">${r.n}年</td>
                <td class="num">${fmt(r.income, 1)}</td>
                <td class="num">${fmt(r.totalGovCost, 1)}</td>
                <td class="num">${fmt(r.balancePrice, 1)}</td>
                <td class="num">${r.suggestAdj.toFixed(1)}%</td>
                <td class="num highlight">${fmt(r.suggestPrice, 1)}</td>
                <td class="num">${fmt(r.coverage, 3)}</td>
                <td class="${cls}">${r.feasible ? "✓ 可行" : "✗ 不可行"}</td>
            </tr>`;
        }).join("");
        const feasibleRows = rows.filter(r => r.feasible);
        const best = feasibleRows.length > 0
            ? feasibleRows.reduce((a, b) => a.coverage > b.coverage ? a : b)
            : rows.reduce((a, b) => a.coverage > b.coverage ? a : b);
        const isFeasible = feasibleRows.length > 0;
        investEl.innerHTML = `
            <h4>5.1 不同收储年限汇总对比</h4>
            <table class="report-table">
                <tr>
                    <th>收储年限</th>
                    <th>预计土地出让收入(万元)</th>
                    <th>政府额外支出合计(万元)</th>
                    <th>融资平衡收地价(万元)</th>
                    <th>建议下调幅度</th>
                    <th>建议收地价格(万元)</th>
                    <th>本息覆盖倍数</th>
                    <th>可行性</th>
                </tr>
                ${rowsHtml}
            </table>
            <h4>5.2 推荐方案</h4>
            <div class="report-highlight">
                <p><strong>推荐收储年限：</strong>${best.n}年</p>
                <p><strong>建议收地价格：</strong>${fmt(best.suggestPrice, 1)} 万元（建议下调幅度 ${best.suggestAdj.toFixed(1)}%）</p>
                <p><strong>本息覆盖倍数：</strong><span class="${best.feasible ? 'verdict-pass' : 'verdict-fail'}">${fmt(best.coverage, 3)}</span>（阈值 ≥ 1.20）</p>
                <p><strong>可行年限数：</strong>${feasibleRows.length} / ${rows.length}</p>
            </div>
            <h4>5.3 投资判断</h4>
            <p>${isFeasible
                ? "覆盖倍数达标，<strong>建议推进专项债券收储</strong>。在推荐年限内选择出让时点，可实现项目融资自平衡；同时建议持续监测市场形势变化，必要时滚动更新测算结果。"
                : "覆盖倍数未达标，<strong>建议暂缓推进</strong>。可从以下方向调整后重新测算：①提高规划后用途价值系数；②扩大收储规模摊薄固定成本；③申请更低债券利率；④调整出让时点延长收储年限。"
            }</p>
            <p style="margin-top:16px;color:var(--text-muted);font-size:12px;">说明：本报告由"运用专项债券实施土地收储全链条价值测算平台"自动生成，测算结果基于当前输入参数；具体执行以最新政策与正式评估报告为准。</p>`;
    }
}

// ============ 同步联动：板块二评估结果 → 板块四/五展示参数 ============
function syncBondFromS3() {
    const pe = calcPriceEval();
    // 板块四：原规划满年期评估总价 + 当前时点剩余年期评估总价（收地基础价格）
    const s3FullTotal = document.getElementById("s3_fullTotal");
    const s3BaseTotal = document.getElementById("s3_baseTotal");
    if (s3FullTotal) s3FullTotal.value = fmt(pe.totalFull, 1);
    if (s3BaseTotal) s3BaseTotal.value = fmt(pe.totalCurrent, 1);
    // 板块五：新规划满年期评估总价 + 新规划总建筑面积（意向规划后指标）
    const s4Price = document.getElementById("s4_price");
    const s4BuildAreaNew = document.getElementById("s4_buildAreaNew");
    if (s4Price) s4Price.value = fmt(pe.totalFullNew, 0);
    if (s4BuildAreaNew) s4BuildAreaNew.value = fmt(pe.buildAreaNew, 0);
}

// ============ 左侧导航：子菜单切换与高亮 ============
function initSidebar() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".section");

    // 子菜单展开/收起 + 跳转
    navItems.forEach(item => {
        const toggle = item.querySelector(".nav-subtoggle");
        const submenu = item.querySelector(".nav-submenu");

        if (toggle && submenu) {
            toggle.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isOpen = submenu.classList.contains("open");
                // 收起其他子菜单
                document.querySelectorAll(".nav-submenu.open").forEach(sm => {
                    if (sm !== submenu) {
                        sm.classList.remove("open");
                        const t = sm.parentElement.querySelector(".nav-subtoggle");
                        if (t) t.textContent = "▼";
                    }
                });
                submenu.classList.toggle("open");
                toggle.textContent = isOpen ? "▼" : "▲";
            });
        }

        // 点击主项跳转 + 展开子菜单
        item.addEventListener("click", (e) => {
            if (e.target.classList.contains("nav-subitem") || e.target.classList.contains("nav-subtoggle")) return;
            if (submenu && !submenu.classList.contains("open")) {
                submenu.classList.add("open");
                if (toggle) toggle.textContent = "▲";
            }
        });
    });

    // 子项点击高亮
    document.querySelectorAll(".nav-subitem").forEach(sub => {
        sub.addEventListener("click", (e) => {
            document.querySelectorAll(".nav-subitem.active").forEach(s => s.classList.remove("active"));
            sub.classList.add("active");
        });
    });

    // 移动端侧边栏切换
    const toggleBtn = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            sidebar.style.display = sidebar.style.display === "none" ? "flex" : "none";
        });
    }

    // 滚动高亮当前板块
    const scrollHandler = () => {
        let current = "";
        sections.forEach(s => {
            if (window.scrollY >= s.offsetTop - 120) current = s.id;
        });
        navItems.forEach(item => {
            const isActive = item.dataset.section === current;
            item.classList.toggle("active", isActive);
            // 自动展开当前板块子菜单
            if (isActive) {
                const submenu = item.querySelector(".nav-submenu");
                const toggle = item.querySelector(".nav-subtoggle");
                if (submenu && !submenu.classList.contains("open")) {
                    submenu.classList.add("open");
                    if (toggle) toggle.textContent = "▲";
                }
            }
        });
    };
    window.addEventListener("scroll", scrollHandler);
    scrollHandler();
}

// ============ 板块二：影响因素折线图 ============
let factorLineChartInstance = null;
function renderFactorLineChart() {
    const ctx = document.getElementById("factorLineChart");
    if (!ctx || typeof Chart === "undefined") return;
    if (factorLineChartInstance) factorLineChartInstance.destroy();

    const colors = {
        second_house_rate: "#0E42D2", rent: "#165DFF", rate_longterm: "#e8a838",
        cost_rate: "#c0392b", CPI_Rate: "#8e44ad", income: "#2980b9"
    };
    const labels = { second_house_rate: "二手住房定基指数", rent: "租金", rate_longterm: "长期利率(%)", cost_rate: "土地取得成本费率", CPI_Rate: "CPI", income: "可支配收入" };

    const datasets = Object.keys(colors).map(varName => ({
        label: labels[varName],
        data: recentMonthlyData.map(d => d[varName]),
        borderColor: colors[varName],
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        yAxisID: varName === "income" ? "y2" : "y1",
        hidden: ["second_house_rate", "rent", "rate_longterm"].indexOf(varName) === -1
    }));

    factorLineChartInstance = new Chart(ctx, {
        type: "line",
        data: { labels: recentMonthlyData.map(d => d.month), datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                title: { display: true, text: "影响因素月度趋势变化（2021-01 ~ 2026-06）", font: { size: 14, weight: "bold" }, color: "#1D2129" },
                legend: { position: "bottom", labels: { usePointStyle: true, font: { size: 11 } } },
                tooltip: { callbacks: { label: c => c.parsed.y !== null ? `${c.dataset.label}: ${fmt(c.parsed.y, 2)}` : `${c.dataset.label}: 暂无` } }
            },
            scales: {
                x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12, font: { size: 10 } }, grid: { display: false } },
                y1: { position: "left", title: { display: true, text: "指数/费率值" }, ticks: { font: { size: 11 } }, grid: { color: "#e8eef0" } },
                y2: { position: "right", title: { display: true, text: "收入(元)" }, ticks: { font: { size: 11 } }, grid: { display: false } }
            }
        }
    });
}

// ============ 板块二：影响因素柱状图（年末值）============
let factorBarChartInstance = null;
function renderFactorBarChart() {
    const ctx = document.getElementById("factorBarChart");
    if (!ctx || typeof Chart === "undefined") return;
    if (factorBarChartInstance) factorBarChartInstance.destroy();

    const colors = {
        second_house_rate: "#0E42D2", rent: "#165DFF", rate_longterm: "#e8a838", CPI_Rate: "#8e44ad"
    };
    const labels = { second_house_rate: "二手住房定基指数", rent: "租金(元)", rate_longterm: "长期利率(%)", CPI_Rate: "CPI" };

    const datasets = Object.keys(colors).map(varName => ({
        label: labels[varName],
        data: yearlyFactorData[varName],
        backgroundColor: colors[varName],
        borderRadius: 3,
        yAxisID: varName === "rent" || varName === "CPI_Rate" ? "y2" : "y1"
    }));

    factorBarChartInstance = new Chart(ctx, {
        type: "bar",
        data: { labels: yearlyFactorData.labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                title: { display: true, text: "影响因素年末值对比（2011-2025）", font: { size: 13, weight: "bold" }, color: "#1D2129" },
                legend: { position: "bottom", labels: { usePointStyle: true, font: { size: 11 } } },
                tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt(c.parsed.y, 2)}` } }
            },
            scales: {
                x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                y1: { position: "left", title: { display: true, text: "指数值/利率%" }, ticks: { font: { size: 11 } }, grid: { color: "#e8eef0" } },
                y2: { position: "right", title: { display: true, text: "租金/CPI" }, ticks: { font: { size: 11 } }, grid: { display: false } }
            }
        }
    });
}

// ============ 板块二：各模型年末预测对比图 ============
let yearlyForecastChartInstance = null;
function renderYearlyForecastChart() {
    const ctx = document.getElementById("yearlyForecastChart");
    if (!ctx || typeof Chart === "undefined") return;
    if (yearlyForecastChartInstance) yearlyForecastChartInstance.destroy();

    const modelColors = { AR: "#2d6cdf", ARIMA: "#e8753a", SARIMA: "#9b59b6", ECM: "#0E42D2", Naive: "#95a5a6" };
    const modelLabels = { AR: "AR(10)", ARIMA: "ARIMA(3,1,5)", SARIMA: "SARIMA", ECM: "ECM(FM-OLS)", Naive: "Naive基准" };

    // 只取年末5个时点（不含当前）
    const yearLabels = forecastYearly.labels.slice(1);
    const datasets = Object.keys(modelColors).map(m => ({
        label: modelLabels[m],
        data: forecastYearly[m].slice(1).map(v => v === null ? null : v),
        backgroundColor: modelColors[m] + "cc",
        borderColor: modelColors[m],
        borderWidth: 2,
        borderRadius: 4
    }));

    yearlyForecastChartInstance = new Chart(ctx, {
        type: "bar",
        data: { labels: yearLabels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                title: { display: true, text: "各预测模型年末（12月）预测值对比（2026-12 ~ 2030-12）", font: { size: 14, weight: "bold" }, color: "#1D2129" },
                legend: { position: "bottom", labels: { usePointStyle: true, font: { size: 12 } } },
                tooltip: { callbacks: { label: c => c.parsed.y !== null ? `${c.dataset.label}: ${fmt(c.parsed.y)}` : `${c.dataset.label}: 暂无` } }
            },
            scales: {
                x: { ticks: { font: { size: 12 } }, grid: { display: false } },
                y: { title: { display: true, text: "定基指数（2011-01=100）" }, beginAtZero: false, ticks: { font: { size: 11 } }, grid: { color: "#e8eef0" } }
            }
        }
    });
}

// ============ 板块四：敏感性分析 ============
let sensitivityChartInstance = null;

function calcSensitivity() {
    const rigid = (parseFloat(document.getElementById("s4_rigid").value) || 0) / 100;
    const use = document.getElementById("s4_use").value;
    const n = 5; // 以5年期为基准做敏感性分析

    // 基准值
    const base = calcYearEcon(n, { rigid });
    const baseCov = base.coverage;

    // 收入 ±10% 变动
    const incomeDeltaMinus10 = calcYearEcon(n, { rigid, incomeDelta: 0.9 });
    const incomeDeltaPlus10 = calcYearEcon(n, { rigid, incomeDelta: 1.1 });

    // 利率 ±1% 变动（1% = 100 BP）
    const rateMinus100 = calcYearEcon(n, { rigid, rateDeltaBP: -100 });
    const ratePlus100 = calcYearEcon(n, { rigid, rateDeltaBP: 100 });

    // 敏感度 = 变量偏差 / 基准
    const sensIncome = baseCov > 0 ? (incomeDeltaPlus10.coverage - incomeDeltaMinus10.coverage) / baseCov : 0;
    const sensRate = baseCov > 0 ? (ratePlus100.coverage - rateMinus100.coverage) / baseCov : 0;

    return {
        use, baseCov, n, rigid,
        rows: [
            {
                name: "预计土地出让收入 ±10%",
                baseCov,
                minus: incomeDeltaMinus10.coverage,
                plus: incomeDeltaPlus10.coverage,
                sens: sensIncome
            },
            {
                name: "专项债券利率 ±1%",
                baseCov,
                minus: rateMinus100.coverage,
                plus: ratePlus100.coverage,
                sens: sensRate
            }
        ]
    };
}

function renderSensitivityAnalysis() {
    const data = calcSensitivity();
    const tbody = document.querySelector("#sensitivityTable tbody");
    const summary = document.getElementById("sensitivitySummary");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!data || data.rows.length === 0) {
        tbody.insertAdjacentHTML("beforeend", `<tr><td colspan="5" style="text-align:center;color:#999;">无数据</td></tr>`);
        if (summary) summary.innerHTML = "";
        return;
    }

    data.rows.forEach(r => {
        const minusCls = r.minus >= 1.2 ? "feasible" : "infeasible";
        const plusCls = r.plus >= 1.2 ? "feasible" : "infeasible";
        const baseCls = r.baseCov >= 1.2 ? "feasible" : "infeasible";
        const sensPct = r.sens * 100;
        let sensCls = "low-sens", sensTxt = "低";
        if (Math.abs(sensPct) >= 20) { sensCls = "high-sens"; sensTxt = "高"; }
        else if (Math.abs(sensPct) >= 10) { sensCls = "mid-sens"; sensTxt = "中"; }
        tbody.insertAdjacentHTML("beforeend",
            `<tr>
                <td>${r.name}</td>
                <td class="num ${minusCls}">${fmt(r.minus, 3)}</td>
                <td class="num base-val ${baseCls}">${fmt(r.baseCov, 3)}</td>
                <td class="num ${plusCls}">${fmt(r.plus, 3)}</td>
                <td class="num ${sensCls}">${pct(sensPct)} (${sensTxt})</td>
            </tr>`);
    });

    renderSensitivityChart(data);

    const useMap = { residential: "住宅用地", commercial: "商办用地", industrial: "工业用地" };
    const baseCls = data.baseCov >= 1.2 ? "verdict-yes" : "verdict-no";
    const mostSensitive = [...data.rows].sort((a, b) => Math.abs(b.sens) - Math.abs(a.sens))[0];
    summary.innerHTML = `
        <p><strong>基准参数：</strong>${useMap[data.use]}（规划后用途） | <strong>价格基准：</strong>意向新规划满年期 | <strong>${data.n}年期基准覆盖倍数：</strong><span class="${baseCls}">${fmt(data.baseCov, 3)}</span> | <strong>刚性计提：</strong>${(data.rigid*100).toFixed(0)}%</p>
        <p><strong>最敏感变量：</strong>${mostSensitive.name}（敏感度 ${pct(mostSensitive.sens * 100)}）— 该变量变动对覆盖倍数影响最大，建议重点测算与控制。</p>
        <p style="font-size:12px;color:var(--text-muted);">说明：敏感度 =（变量上行覆盖倍数 − 变量下行覆盖倍数）/ 基准覆盖倍数。高(≥20%)、中(10%-20%)、低(<10%)。</p>`;
}

function renderSensitivityChart(data) {
    const ctx = document.getElementById("sensitivityChart");
    if (!ctx || typeof Chart === "undefined") return;
    if (sensitivityChartInstance) sensitivityChartInstance.destroy();

    // 龙卷图：显示每个变量变动时覆盖倍数相对基准的偏差
    const rows = [...data.rows].sort((a, b) => Math.abs(b.sens) - Math.abs(a.sens));
    const labels = rows.map(r => r.name);
    const downVals = rows.map(r => r.minus - r.baseCov);
    const upVals = rows.map(r => r.plus - r.baseCov);

    sensitivityChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "下浮偏差（-10%收入 / -1%利率）", data: downVals, backgroundColor: "rgba(192,57,43,0.7)", borderColor: "#c0392b", borderWidth: 1, borderRadius: 3 },
                { label: "上浮偏差（+10%收入 / +1%利率）", data: upVals, backgroundColor: "rgba(39,174,96,0.7)", borderColor: "#27ae60", borderWidth: 1, borderRadius: 3 }
            ]
        },
        options: {
            indexAxis: "y",
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: "敏感性龙卷图（覆盖倍数相对基准的偏差 · 5年期）", font: { size: 13, weight: "bold" }, color: "#1D2129" },
                legend: { position: "bottom", labels: { usePointStyle: true, font: { size: 11 } } },
                tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt(c.parsed.x, 3)} (覆盖倍数: ${fmt(c.parsed.x + data.baseCov, 3)})` } }
            },
            scales: {
                x: { title: { display: true, text: "覆盖倍数偏差" }, ticks: { font: { size: 10 }, callback: v => fmt(v, 2) }, grid: { color: "#e8eef0" } },
                y: { ticks: { font: { size: 11 } }, grid: { display: false } }
            }
        }
    });
}

// ============ 板块一：测算资料库 - 政策资料库 ============
let currentFilter = "all";
let currentSearch = "";

function renderPolicyDocuments() {
    const container = document.getElementById("policyContent");
    const statsEl = document.getElementById("policyStats");
    if (!container) return;
    container.innerHTML = "";

    const filtered = policyData.filter(doc => {
        const matchDept = currentFilter === "all" || doc.departmentId === currentFilter;
        const searchLower = currentSearch.toLowerCase();
        const matchSearch = !currentSearch ||
            doc.title.toLowerCase().includes(searchLower) ||
            doc.number.toLowerCase().includes(searchLower) ||
            doc.keywords.some(k => k.toLowerCase().includes(searchLower)) ||
            doc.summary.toLowerCase().includes(searchLower);
        return matchDept && matchSearch;
    });

    if (statsEl) {
        statsEl.innerHTML = `共 <strong style="color:var(--primary);font-size:15px;">${filtered.length}</strong> 篇政策文件 ${currentFilter !== "all" || currentSearch ? `（筛选自 ${policyData.length} 篇）` : ""}`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="doc-empty">未找到匹配的政策文件，请调整筛选条件或搜索关键词。</div>`;
        return;
    }

    filtered.forEach(doc => {
        const kw = doc.keywords.map(k => `<span class="doc-keyword">${k}</span>`).join("");
        // 若存在本地PDF/原文文件，添加"📄 查看原文(PDF)"按钮
        const viewOriginalBtn = doc.filePath
            ? `<button type="button" class="btn-view btn-view-pdf" data-file="${doc.filePath}" data-title="${doc.title}" data-filetype="${doc.fileType || 'pdf'}">📄 查看原文(PDF)</button>`
            : (doc.fileType === "ofd"
                ? `<button type="button" class="btn-view btn-view-pdf" data-file="summary" data-title="${doc.title}" data-filetype="summary" data-content="${encodeURIComponent(doc.content)}">📄 查看条款摘要</button>`
                : "");
        container.insertAdjacentHTML("beforeend",
            `<div class="doc-item" data-department="${doc.departmentId}">
                <div class="doc-header">
                    <h4 class="doc-title">${doc.title}</h4>
                    <span class="doc-tag">${doc.department}</span>
                </div>
                <div class="doc-meta">
                    <span class="doc-number">文号：${doc.number}</span>
                    <span>发布日期：${doc.date}</span>
                </div>
                <div class="doc-summary">${doc.summary}</div>
                <div class="doc-keywords">${kw}</div>
                <div class="doc-actions">
                    ${viewOriginalBtn}
                    <a href="${doc.link}" target="_blank" rel="noopener noreferrer" class="btn-view">🔗 官方来源</a>
                </div>
            </div>`);
    });

    // 绑定"查看原文"按钮事件
    bindViewOriginalButtons();
}

// ============ 政策原文模态框：PDF.js 渲染 ============
let pdfDocInstance = null;
let pdfCurrentPage = 1;
let pdfTotalPages = 0;
let pdfRenderTask = null;

function bindViewOriginalButtons() {
    document.querySelectorAll(".btn-view-pdf").forEach(btn => {
        if (btn.dataset.bound === "1") return;
        btn.dataset.bound = "1";
        btn.addEventListener("click", () => {
            const file = btn.dataset.file;
            const title = btn.dataset.title;
            const ftype = btn.dataset.filetype;
            openPolicyModal(title, file, ftype, btn.dataset.content);
        });
    });
}

function openPolicyModal(title, file, fileType, encodedContent) {
    const modal = document.getElementById("policyModal");
    const titleEl = document.getElementById("policyModalTitle");
    const bodyEl = document.getElementById("policyModalBody");
    const pageInfo = document.getElementById("policyPageInfo");
    const prevBtn = document.getElementById("policyPrevPage");
    const nextBtn = document.getElementById("policyNextPage");
    titleEl.textContent = title;
    bodyEl.innerHTML = `<div class="modal-loading">加载中…</div>`;
    pageInfo.textContent = "0 / 0";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");

    // 销毁前一个 PDF 实例
    if (pdfDocInstance) { pdfDocInstance.destroy(); pdfDocInstance = null; }
    if (pdfRenderTask) { try { pdfRenderTask.cancel(); } catch(e) {} pdfRenderTask = null; }

    if (fileType === "pdf" && file && file !== "summary") {
        renderPdfInModal(file);
    } else if (fileType === "summary" || file === "summary") {
        // 展示条款摘要文本
        const text = encodedContent ? decodeURIComponent(encodedContent) : "";
        bodyEl.innerHTML = `<div class="modal-summary"><h4>核心条款摘要</h4><p>${text}</p><p style="margin-top:12px;color:#999;font-size:12px;">说明：原文为OFD格式，位于立项材料目录；此处展示已提取的核心条款摘要，具体执行以原文为准。</p></div>`;
        pageInfo.textContent = "1 / 1";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    } else {
        bodyEl.innerHTML = `<div class="modal-loading">暂无可显示的原文文件</div>`;
    }
}

function renderPdfInModal(filePath) {
    const bodyEl = document.getElementById("policyModalBody");
    const pageInfo = document.getElementById("policyPageInfo");
    const prevBtn = document.getElementById("policyPrevPage");
    const nextBtn = document.getElementById("policyNextPage");

    if (typeof pdfjsLib === "undefined") {
        bodyEl.innerHTML = `<div class="modal-loading">
            <p>PDF.js库未加载（可能因网络限制），请尝试以下方式查看原文：</p>
            <p style="margin-top:14px;"><a href="${filePath}" target="_blank" style="color:var(--primary);font-weight:600;">📄 在新窗口打开PDF原文</a></p>
        </div>`;
        return;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

    const loadingTask = pdfjsLib.getDocument(filePath);
    loadingTask.promise.then(pdf => {
        pdfDocInstance = pdf;
        pdfTotalPages = pdf.numPages;
        pdfCurrentPage = 1;
        pageInfo.textContent = `${pdfCurrentPage} / ${pdfTotalPages}`;
        prevBtn.disabled = pdfCurrentPage <= 1;
        nextBtn.disabled = pdfCurrentPage >= pdfTotalPages;
        renderPdfPage(pdfCurrentPage);
    }).catch(err => {
        console.error("PDF加载失败:", err);
        bodyEl.innerHTML = `<div class="modal-loading">
            <p>PDF.js渲染失败：${err.message || err}</p>
            <p style="margin-top:14px;"><a href="${filePath}" target="_blank" style="color:var(--primary);font-weight:600;">📄 在新窗口打开PDF原文</a></p>
            <p style="margin-top:8px;color:#999;font-size:12px;">文件路径：${filePath}</p>
        </div>`;
    });
}

function renderPdfPage(pageNum) {
    if (!pdfDocInstance) return;
    const bodyEl = document.getElementById("policyModalBody");
    const pageInfo = document.getElementById("policyPageInfo");
    const prevBtn = document.getElementById("policyPrevPage");
    const nextBtn = document.getElementById("policyNextPage");
    bodyEl.innerHTML = `<div class="modal-loading">正在渲染第 ${pageNum} 页…</div>`;
    pdfDocInstance.getPage(pageNum).then(page => {
        const containerW = bodyEl.clientWidth - 24;
        const defaultScale = 1.5;
        const viewport1 = page.getViewport({ scale: defaultScale });
        const scale = containerW > 0 ? Math.min(2.0, Math.max(0.8, containerW / viewport1.width)) : defaultScale;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        bodyEl.innerHTML = "";
        bodyEl.appendChild(canvas);
        pdfRenderTask = page.render({ canvasContext: ctx, viewport });
        pdfRenderTask.promise.then(() => {
            pageInfo.textContent = `${pageNum} / ${pdfTotalPages}`;
            prevBtn.disabled = pageNum <= 1;
            nextBtn.disabled = pageNum >= pdfTotalPages;
        }).catch(e => { if (e.name !== "RenderingCancelledException") console.warn(e); });
    });
}

// 模态框事件绑定
function initPolicyModal() {
    const modal = document.getElementById("policyModal");
    const closeBtn = document.getElementById("policyClose");
    const prevBtn = document.getElementById("policyPrevPage");
    const nextBtn = document.getElementById("policyNextPage");
    if (!modal) return;
    closeBtn.addEventListener("click", () => {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        if (pdfDocInstance) { try { pdfDocInstance.destroy(); } catch(e) {} pdfDocInstance = null; }
        if (pdfRenderTask) { try { pdfRenderTask.cancel(); } catch(e) {} pdfRenderTask = null; }
    });
    modal.addEventListener("click", e => {
        if (e.target === modal) closeBtn.click();
    });
    prevBtn.addEventListener("click", () => {
        if (pdfDocInstance && pdfCurrentPage > 1) { pdfCurrentPage--; renderPdfPage(pdfCurrentPage); }
    });
    nextBtn.addEventListener("click", () => {
        if (pdfDocInstance && pdfCurrentPage < pdfTotalPages) { pdfCurrentPage++; renderPdfPage(pdfCurrentPage); }
    });
    document.addEventListener("keydown", e => {
        if (!modal.classList.contains("open")) return;
        if (e.key === "Escape") closeBtn.click();
        else if (e.key === "ArrowLeft" && !prevBtn.disabled) prevBtn.click();
        else if (e.key === "ArrowRight" && !nextBtn.disabled) nextBtn.click();
    });
}

function initPolicyFilters() {
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.department;
            renderPolicyDocuments();
        });
    });
    const searchInput = document.getElementById("policySearch");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value.trim();
            renderPolicyDocuments();
        });
    }
}

// ============ 板块一：测算资料库 - 工作程序（流程图）============
function renderWorkProcedures() {
    const container = document.getElementById("procedureFlow");
    if (!container) return;
    container.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "flowchart-wrap";
    const flow = document.createElement("div");
    flow.className = "flowchart";

    workProcedureData.forEach((p, i) => {
        if (i > 0) {
            const arrow = document.createElement("div");
            arrow.className = "flow-arrow";
            flow.appendChild(arrow);
        }
        const node = document.createElement("div");
        node.className = "flow-node";
        node.innerHTML = `
            <div class="flow-node-num">${p.step}</div>
            <div class="flow-node-icon">${p.icon}</div>
            <div class="flow-node-title">${p.title}</div>
            <div class="flow-node-desc">${p.subtitle}<br><br>${p.desc}</div>`;
        flow.appendChild(node);
    });

    wrap.appendChild(flow);
    container.appendChild(wrap);
}

// ============ 板块一：测算资料库 - 价格确定规则程序（流程图）============
function renderPriceProcedureFlowchart() {
    const container = document.getElementById("priceProcedureFlow");
    if (!container) return;
    container.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "flowchart-wrap";
    const flow = document.createElement("div");
    flow.className = "flowchart";

    priceDeterminationProcedure.forEach((p, i) => {
        if (i > 0) {
            const arrow = document.createElement("div");
            arrow.className = "flow-arrow";
            flow.appendChild(arrow);
        }
        const node = document.createElement("div");
        node.className = "flow-node";
        node.innerHTML = `
            <div class="flow-node-num">${p.step}</div>
            <div class="flow-node-icon">${p.icon}</div>
            <div class="flow-node-title">${p.title}</div>
            <div class="flow-node-desc">${p.desc}</div>`;
        flow.appendChild(node);
    });

    wrap.appendChild(flow);
    container.appendChild(wrap);
}

// ============ 初始化 ============
document.addEventListener("DOMContentLoaded", () => {
    renderSection1();
    renderFactorsTable();
    renderMetricsTable();
    renderYearlyTable();
    renderFactorLineChart();
    renderFactorBarChart();
    renderYearlyForecastChart();
    renderForecastChart();
    renderPolicyDocuments();
    initPolicyFilters();
    initPolicyModal();
    renderWorkProcedures();
    renderPriceProcedureFlowchart();
    initMarketTabs();
    initSidebar();

    // 板块四计算
    document.getElementById("s3_calc").addEventListener("click", () => {
        syncBondFromS3();
        renderS3Summary();
        calcSection4();
        renderS3CostTable();
        renderS3BalanceTable();
        renderS3SuggestTable();
        renderS4CoefTable();
        renderSensitivityAnalysis();
        renderConclusion();
        renderFullReport();
    });

    // 板块五计算
    document.getElementById("s4_calc").addEventListener("click", () => {
        calcSection4();
        renderS4CoefTable();
        renderSensitivityAnalysis();
        renderConclusion();
        renderFullReport();
    });

    // 板块七报告按钮
    const reportExportBtn = document.getElementById("reportExportBtn");
    if (reportExportBtn) {
        reportExportBtn.addEventListener("click", exportReportPDF);
    }
    const reportPrintBtn = document.getElementById("reportPrintBtn");
    if (reportPrintBtn) {
        reportPrintBtn.addEventListener("click", () => {
            renderFullReport();
            window.print();
        });
    }
    const reportRefreshBtn = document.getElementById("reportRefreshBtn");
    if (reportRefreshBtn) {
        reportRefreshBtn.addEventListener("click", () => {
            renderFullReport();
            alert("报告数据已刷新");
        });
    }

    // 板块二价格评估参数联动：同步重算板块三/四/五/七
    const recalcAll = () => {
        renderPriceEvalResults();
        renderIncomeForecast();
        renderS3Summary();
        renderS3CostTable();
        renderS3BalanceTable();
        renderS3SuggestTable();
        calcSection4();
        renderS4CoefTable();
        renderSensitivityAnalysis();
        renderConclusion();
        renderFullReport();
    };
    ["pe_area", "pe_buildArea", "pe_totalFull", "pe_totalRemain", "pe_totalCurrent", "pe_areaNew", "pe_buildAreaNew", "pe_totalFullNew"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", recalcAll);
    });
    // 市场形势修正系数手工填报联动（连乘累计 + 下游测算刷新）
    for (let i = 1; i <= STORAGE_MAX; i++) {
        const el = document.getElementById(`mc_year_${i}`);
        if (el) el.addEventListener("input", () => {
            renderAnnualCoefTable();
            renderIncomeForecast();
            renderIncomeForecastNew();
            renderS3CostTable();
            renderS3BalanceTable();
            renderS3SuggestTable();
            calcSection4();
            renderS4CoefTable();
            renderSensitivityAnalysis();
            renderConclusion();
            renderFullReport();
        });
    }
    // 板块四收储测算参数联动：同步板块五并重算全部依赖表
    ["s3_tech"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", () => {
            syncBondFromS3();
            renderS3CostTable();
            renderS3BalanceTable();
            renderS3SuggestTable();
            renderS3Summary();
            calcSection4();
            renderS4CoefTable();
            renderSensitivityAnalysis();
            renderConclusion();
            renderFullReport();
        });
    });
    // 板块四 per-year 债券利率变动联动
    storageYears.forEach(n => {
        const el = document.getElementById(`s3_bondRate_${n}`);
        if (el) el.addEventListener("input", () => {
            syncBondFromS3();
            renderS3CostTable();
            renderS3BalanceTable();
            renderS3SuggestTable();
            renderS3Summary();
            calcSection4();
            renderS4CoefTable();
            renderSensitivityAnalysis();
            renderConclusion();
            renderFullReport();
        });
    });
    // 板块五融资平衡参数联动
    ["s4_rigid"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", () => {
            calcSection4();
            renderS4CoefTable();
            renderSensitivityAnalysis();
            renderConclusion();
            renderFullReport();
        });
    });
    // 板块五 per-year 债券利率变动联动
    storageYears.forEach(n => {
        const el = document.getElementById(`s4_bondRate_${n}`);
        if (el) el.addEventListener("input", () => {
            calcSection4();
            renderS4CoefTable();
            renderSensitivityAnalysis();
            renderConclusion();
            renderFullReport();
        });
    });

    // 初次自动测算
    renderPriceEvalResults();
    renderIncomeForecast();
    renderIncomeForecastNew();
    syncBondFromS3();
    renderS3Summary();
    calcSection4();
    renderS3CostTable();
    renderS3BalanceTable();
    renderS3SuggestTable();
    renderS4CoefTable();
    renderSensitivityAnalysis();
    renderConclusion();
    renderFullReport();
});
