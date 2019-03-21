const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const containerPadding = 20;

const scaleDivisionByY = 6;
const scaleDivisionByX = 6;
const oneYScalePart = 1 / scaleDivisionByY;

const circlesRadius = 5.5;

let canvasWidth = document.documentElement.clientWidth - containerPadding * 2;
let canvasHeight = parseInt(document.documentElement.clientHeight / 2);

let secondaryChartCanvasHeight = parseInt(document.documentElement.clientHeight / 10) > 50 ? parseInt(document.documentElement.clientHeight / 10) : 50;

// That width is for more comfortable touching on mobile devices
const rangeControlWidth = 15;

const minimumRange = 3;
let gestureHasStarted = false;
let distanceToBorderControlsFromPointer = {
    left: 0,
    right: 0
};
let rangeDraggableBordersGestureHasStarted = false;
let pos1 = 0, pos2 = 0;

const animationStepsPerFrame = 15;

start();

function start() {
    createTabs();

    document.getElementById('container').style.padding = `${containerPadding}px`;

    chartData.forEach((chart, i) => {
        // For inclusion
        chart.included = [];

        let chartContainer = document.createElement('div');
        chartContainer.classList.add(`chart-block`);
        chartContainer.classList.add(`chart-block--${i}`);

        let chartBlock = document.createElement('canvas');
        chartBlock.id = `chart-block--${i}`;

        // Drawing scale lines
        chartBlock.style.background = `repeating-linear-gradient(0deg, transparent, transparent ${parseInt(canvasHeight / scaleDivisionByY) - 1}px, #eee, #eee ${parseInt(canvasHeight / scaleDivisionByY)}px)`;
        chartBlock.style.backgroundPositionY = `${parseInt(canvasHeight / scaleDivisionByY) - 1}px`;

        chartContainer.appendChild(chartBlock);

        // Initializing X scale
        let xScaleContainer = document.createElement('div');
        xScaleContainer.classList.add(`x-scale-block`);
        for (let f = 0; f < scaleDivisionByX; f++) {
            const valueContainer = document.createElement('div');
            valueContainer.classList.add(`x-value-block`);
            xScaleContainer.appendChild(valueContainer);
        }
        chartContainer.appendChild(xScaleContainer);

        // Seсondary chart block
        let secondaryChartContainer = document.createElement('div');
        secondaryChartContainer.classList.add(`secondary-chart-block`);
        secondaryChartContainer.classList.add(`secondary-chart-block--${i}`);

        let secondaryChartBlock = document.createElement('canvas');
        secondaryChartBlock.id = `secondary-chart-block--${i}`;
        secondaryChartContainer.appendChild(secondaryChartBlock);

        let leftBorderOfRangeControl = document.createElement('div');
        leftBorderOfRangeControl.classList.add(`border-control--left`);
        leftBorderOfRangeControl.setAttribute('touch-action', 'none');
        leftBorderOfRangeControl.style.width = `${rangeControlWidth}px`;
        leftBorderOfRangeControl.style.left = '0px';
        chart.leftBorderIndex = 0;

        let rightBorderOfRangeControl = document.createElement('div');
        rightBorderOfRangeControl.classList.add(`border-control--right`);
        rightBorderOfRangeControl.setAttribute('touch-action', 'none');
        rightBorderOfRangeControl.style.width = `${rangeControlWidth}px`;
        rightBorderOfRangeControl.style.left = `${canvasWidth - rangeControlWidth}px`;
        chart.rightBorderIndex = chart.columns[0].length - 1;

        secondaryChartContainer.appendChild(leftBorderOfRangeControl);
        secondaryChartContainer.appendChild(rightBorderOfRangeControl);
        chartContainer.appendChild(secondaryChartContainer);

        // Inclusion controls definition
        let inclusionControls = document.createElement('div');
        inclusionControls.classList.add(`inclusion-controls`);

        for (let name in chart.names) {
            if (chart.names.hasOwnProperty(name)) {
                chart.included.push(name);

                let circleIcon = document.createElement('div');
                circleIcon.classList.add('icon');
                circleIcon.setAttribute('parent-chart', i);
                circleIcon.setAttribute('name', name);
                circleIcon.style.backgroundColor = chart.colors[name];
                circleIcon.style.border = `2px solid ${chart.colors[name]}`;

                // Add click handlers to inclusion controls
                circleIcon.addEventListener('click', (e) => {
                    circleIcon.classList.add('icon--click');
                    inclusionHandler(e, chart.colors[name]);

                    // Removing class for animation
                    setTimeout(() => {
                        circleIcon.classList.remove('icon--click')
                    }, 500);
                });

                let nameBlock = document.createElement('div');
                nameBlock.classList.add('name');

                let nameText = document.createElement('span');
                nameText.innerText = chart.names[name];

                nameBlock.appendChild(circleIcon);
                nameBlock.appendChild(nameText);

                inclusionControls.appendChild(nameBlock);
            }
        }

        chartContainer.appendChild(inclusionControls);

        document.getElementById('container').appendChild(chartContainer);

        // Adding pointer events to draggable border controls
        leftBorderOfRangeControl.addEventListener('pointerdown', dragPointerDown);
        rightBorderOfRangeControl.addEventListener('pointerdown', dragPointerDown);
        leftBorderOfRangeControl.addEventListener('pointerup', dragPointerUp);
        rightBorderOfRangeControl.addEventListener('pointerup', dragPointerUp);
        leftBorderOfRangeControl.addEventListener('pointermove', dragPointerMove);
        rightBorderOfRangeControl.addEventListener('pointermove', dragPointerMove);
        leftBorderOfRangeControl.addEventListener('pointercancel', dragPointerCancel);
        rightBorderOfRangeControl.addEventListener('pointercancel', dragPointerCancel);
        leftBorderOfRangeControl.addEventListener('pointerleave', dragPointerCancel);
        rightBorderOfRangeControl.addEventListener('pointerleave', dragPointerCancel);

        // Initializing infoBox with vertical line
        createInfoBox(chart, i);

        drawChart(`chart-block--${i}`, chart, canvasWidth, canvasHeight, true);
        drawChart(`secondary-chart-block--${i}`, chart, canvasWidth, secondaryChartCanvasHeight);
    });
}

function drawLine(ctx, startX, startY, endX, endY, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX,startY);
    ctx.lineTo(endX,endY);
    ctx.stroke();
    ctx.restore();
}

function drawChart(canvasId, chart, canvasWidth, canvasHeight, fillScales, startFrom, endWith) {
    startFrom = startFrom ? startFrom : 0;
    endWith = endWith ? endWith : chart.columns[0].length - 1;

    let currentCanvas = document.getElementById(canvasId);
    currentCanvas.setAttribute('touch-action', 'none');
    currentCanvas.width = canvasWidth;
    currentCanvas.height = canvasHeight;

    // Adding pointer events to canvas
    currentCanvas.addEventListener('pointerdown', _onChartPointerDown);
    currentCanvas.addEventListener('pointerup', _onChartPointerUp);
    currentCanvas.addEventListener('pointermove', _onChartPointerMove);
    currentCanvas.addEventListener('pointercancel', _onChartPointerCancel);
    currentCanvas.addEventListener('pointerleave', _onChartPointerCancel);

    let ctx = currentCanvas.getContext('2d');
    ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);

    ctx.font = '11px Arial';
    ctx.fillStyle = '#bbb';

    let minX = 0;
    let maxX = 0;
    let maxAmongAllLines = 0;

    // Define maximum Y value among chart lines
    chart.columns.forEach((col, j) => {
        if (col[0] === 'x') {
            minX = col[startFrom === 0 ? 1 : startFrom];
            maxX = col[endWith];
        }

        if (j > 0) {
            if (chart.included.indexOf(col[0]) > -1) {
                const localMax = findMaxValue(col, startFrom, endWith);
                maxAmongAllLines = maxAmongAllLines > localMax ? maxAmongAllLines : localMax;
            }
        }
    });

    if (canvasId.indexOf('secondary') === -1) {
        chart.maxAmongAllLines = maxAmongAllLines;
    }

    // console.log(maxAmongAllLines);

    // Drawing lines
    chart.columns.forEach((col, j) => {
        if (j > 0) {
            if (chart.included.indexOf(col[0]) > -1) {
                col.forEach((value, k) => {
                    if (k >= startFrom && k <= endWith) {
                        if (k > 0) {
                            const xStartValue = (chart.columns[0][k - 1] - minX) / (maxX - minX) * canvasWidth;
                            const yStartValue = canvasHeight - col[k - 1] * canvasHeight / maxAmongAllLines;
                            const xEndValue = (chart.columns[0][k] - minX) / (maxX - minX) * canvasWidth;
                            const yEndValue = canvasHeight - value * canvasHeight / maxAmongAllLines;
                            drawLine(ctx, xStartValue, yStartValue, xEndValue, yEndValue, chart.colors[col[0]]);
                        }
                    }
                });
            }
        }
    });

    if (fillScales) {
        // Filling scale gradation by Y axis
        for (let l = 0; l < scaleDivisionByY; l++) {
            ctx.fillText(parseInt(maxAmongAllLines * l * oneYScalePart), 0, parseInt((scaleDivisionByY - l) * oneYScalePart * canvasHeight) - 3);
        }

        // Filling scale gradation by X axis
        const xStep = (maxX - minX) / (scaleDivisionByX - 1);
        for (let l = 0; l < scaleDivisionByX; l++) {
            const currentXValue = xStep * l;
            const textXPosition = xStep * (l - 0.5) / (maxX - minX) * canvasWidth;
            const dateView = formDateForView(parseInt(currentXValue + minX));

            const xValueBlock = currentCanvas.closest('.chart-block').getElementsByClassName('x-scale-block')[0].getElementsByClassName('x-value-block')[l];
            xValueBlock.innerHTML = dateView;
        }
    }
}

/*
 * Find max value in array
*/
function findMaxValue(arr, start, end) {
    const values = arr.slice(start, end).splice(start > 0 ? 0 : 1);
    return Math.max.apply(null, values);
}

/*
 * Date formatter
*/
function formDateForView(ms, full) {
    const prefix = full ? `${dayNames[new Date(ms).getDay()]}, ` : '';
    return prefix + monthNames[new Date(ms).getMonth()] + ' ' + new Date(ms).getDate();
}

/*
 * Creation of tabs for more comfortable switching between charts
*/
function createTabs() {
    let tabsContainer = document.createElement('div');
    tabsContainer.id = `tabs`;

    chartData.forEach((chart, i) => {
        let chartTab = document.createElement('div');
        chartTab.classList.add(`tab`);
        chartTab.setAttribute('number', i);

        if (i === 0) {
            chartTab.classList.add(`active`);
        }

        chartTab.innerText = `№ ${i + 1}`;

        chartTab.addEventListener('click', _tabClicked);

        tabsContainer.appendChild(chartTab);
    });

    document.getElementById('container').appendChild(tabsContainer);
}

/*
 * Include or exclude line in/from chart
*/
function inclusionHandler(e, color) {
    const index = parseInt(e.target.getAttribute('parent-chart'));
    const chart = chartData[index];

    // Cloning canvas and preparing values for animation of main chart
    const c = document.getElementById(`chart-block--${index}`);
    const params = generateParamsForAnimation(c, index);

    // Cloning canvas and preparing values for animation of Small secondary chart
    const smallCanvas = document.getElementById(`secondary-chart-block--${index}`);
    const smallChartParams = generateParamsForAnimation(smallCanvas, index);

    e.target.classList.toggle('off');
    if (e.target.classList.contains('off')) {
        e.target.style.backgroundColor = '#fff';
        chart.included.splice(chart.included.indexOf(e.target.getAttribute('name')), 1);
    } else {
        e.target.style.backgroundColor = color;
        chart.included.push(e.target.getAttribute('name'));
    }

    const infoBoxContainer = e.target.closest('.chart-block').getElementsByClassName('info-box-container')[0];
    infoBoxContainer.classList.remove('shown');

    drawChart(`chart-block--${index}`, chart, canvasWidth, canvasHeight, true, chart.leftBorderIndex, chart.rightBorderIndex);
    drawChart(`secondary-chart-block--${index}`, chart, canvasWidth, secondaryChartCanvasHeight);

    // Animation of changing chart
    const blockToAppend = document.getElementsByClassName(`chart-block--${index}`)[0];
    const newC = document.getElementById(`chart-block--${index}`);
    params.blockToAppend = blockToAppend;
    params.canvas = newC;
    params.canvasHeight = canvasHeight;
    runAnimationForCanvas(params);

    // Animation of changing small secondary chart
    const smallBlockToAppend = document.getElementsByClassName(`secondary-chart-block--${index}`)[0];
    const smallNewC = document.getElementById(`secondary-chart-block--${index}`);
    smallChartParams.blockToAppend = smallBlockToAppend;
    smallChartParams.canvas = smallNewC;
    smallChartParams.canvasHeight = secondaryChartCanvasHeight;
    runAnimationForCanvas(smallChartParams);
}

function generateParamsForAnimation(canvas, index) {
    const ctx = canvas.getContext("2d");
    const startCanvasCopy = cloneCanvas(canvas);
    const startStateCanvas = cloneCanvas(canvas);
    startCanvasCopy.classList.add('second-canvas');
    const newCtx = startCanvasCopy.getContext('2d');
    const oldMax = chartData[index].maxAmongAllLines;

    return {
        ctx: ctx,
        newCtx: newCtx,
        startCanvasCopy: startCanvasCopy,
        startStateCanvas: startStateCanvas,
        oldMax: oldMax,
        index: index
    };
}

/*
 * Run animation function with params
*/
function runAnimationForCanvas(params) {
    const endStateCanvas = cloneCanvas(params.canvas);
    const newMax = chartData[params.index].maxAmongAllLines;

    if (params.oldMax !== newMax) {
        params.blockToAppend.appendChild(params.startCanvasCopy);
        requestAnimationFrame(() => {
            animateChart(params.ctx, params.newCtx, params.oldMax, newMax, params.startStateCanvas, endStateCanvas, params.startCanvasCopy, 1, params.canvasHeight);
        });
    }
}

/*
 * Animation of chart, when some lines are included or excluded
*/
function animateChart(ctx, newCtx, oldMax, newMax, startStateCanvas, endStateCanvas, startCanvasCopy, i, canvasHeight) {
    newCtx.save();
    newCtx.clearRect(0, 0, startCanvasCopy.width, startCanvasCopy.height);

    ctx.save();
    ctx.clearRect(0, 0, startCanvasCopy.width, startCanvasCopy.height);

    const coeff = oldMax > newMax ? newMax / oldMax : oldMax / newMax;
    const growFlag = oldMax < newMax;

    if (!growFlag) {
        newCtx.transform(1, 0, 0, 1 + (1 / coeff - 1) * (i / animationStepsPerFrame), 0, -canvasHeight * (1 / coeff - 1) * (i / animationStepsPerFrame));
        ctx.transform(1, 0, 0, coeff + (1 - coeff) * (i / animationStepsPerFrame), 0, canvasHeight * (1 - coeff) * (1 - i / animationStepsPerFrame));
    } else {
        newCtx.transform(1, 0, 0, 1 - (1 - coeff) * (i / animationStepsPerFrame), 0, canvasHeight * (1 - coeff) * (i / animationStepsPerFrame));
        ctx.transform(1, 0, 0, (1 / coeff) - (1 / coeff - 1) * (i / animationStepsPerFrame), 0, canvasHeight * (1 / coeff - 1) * (-1 + i / animationStepsPerFrame));
    }

    ctx.drawImage(endStateCanvas, 0, 0);
    ctx.restore();

    newCtx.drawImage(startStateCanvas, 0, 0);
    newCtx.restore();

    if (i < animationStepsPerFrame) {
        i++;
        requestAnimationFrame(() => {
            animateChart(ctx, newCtx, oldMax, newMax, startStateCanvas, endStateCanvas, startCanvasCopy, i, canvasHeight);
        });
    } else {
        startCanvasCopy.remove();
    }
}

/*
 * Creation a copy of canvas
*/
function cloneCanvas(oldCanvas) {
    const newCanvas = document.createElement('canvas');
    const context = newCanvas.getContext('2d');

    newCanvas.width = oldCanvas.width;
    newCanvas.height = oldCanvas.height;
    context.drawImage(oldCanvas, 0, 0);

    return newCanvas;
}

/*
 * Mode switcher
*/
document.getElementsByClassName('mode-switcher')[0].getElementsByTagName('a')[0].addEventListener('click', (e) => {
    e.target.innerText = e.target.className.indexOf('night') === -1 ? 'Switch to Day Mode' : 'Switch to Night Mode';
    e.target.classList.toggle('night');
    document.body.classList.toggle('night-mode');
});

/*
 * Creation of info-box and vertical line
*/
function createInfoBox(chart, index) {
    let infoBoxContainer = document.createElement('div');
    infoBoxContainer.classList.add(`info-box-container`);
    infoBoxContainer.style.height = `${canvasHeight}px`;

    let infoBoxBlock = document.createElement('div');
    infoBoxBlock.classList.add(`info-box`);

    let pointDate = document.createElement('div');
    pointDate.classList.add(`date`);
    pointDate.innerHTML = 'Sat, 26 Feb';
    infoBoxBlock.appendChild(pointDate);

    let valuesBlock = document.createElement('div');
    valuesBlock.classList.add(`lines`);
    for (let value in chart.colors) {
        if (chart.colors.hasOwnProperty(value)) {
            let yValue = document.createElement('div');
            yValue.classList.add(`value`);
            yValue.setAttribute('name', value);
            yValue.style.color = chart.colors[value];
            yValue.innerHTML = `<div class="number">0</div><div class="line-name">${value}</div>`;

            valuesBlock.appendChild(yValue);

            let pointCircle = document.createElement('div');
            pointCircle.classList.add(`point-circle`);
            pointCircle.setAttribute('name', value);
            pointCircle.style.borderColor = chart.colors[value];

            infoBoxContainer.appendChild(pointCircle);
        }
    }

    infoBoxBlock.appendChild(valuesBlock);
    infoBoxContainer.appendChild(infoBoxBlock);

    document.getElementsByClassName(`chart-block--${index}`)[0].appendChild(infoBoxContainer);
}

/*
 * Find closest value on X axis according to current mouse position on canvas
*/
function findClosestXValueOnAxis(xOffset, chartIndex, ranged) {
    const partInPx = xOffset / canvasWidth;
    let diff, closestXValue, pointIndex;

    if (ranged) {
        const partOfArray = chartData[chartIndex].columns[0].slice(chartData[chartIndex].leftBorderIndex, chartData[chartIndex].rightBorderIndex + 1);

        partOfArray.forEach((value, i) => {
            if (typeof value === 'number') {
                _closestXHandler(partOfArray, value, i);
            }
        });
    } else {
        chartData[chartIndex].columns[0].forEach((value, i) => {
            if (i > 0) {
                _closestXHandler(chartData[chartIndex].columns[0], value, i);
            }
        });
    }

    function _closestXHandler(arr, value, i) {
        if (!diff || diff > Math.abs(partInPx - i / (arr.length - 1))) {
            diff = Math.abs(partInPx - i / (arr.length - 1));
            closestXValue = value;
            pointIndex = i;
        }
    }

    return {
        closestXValue: closestXValue,
        pointIndex: pointIndex
    };
}

/*
 * Fill and position infoBox with values in current X point
*/
function setPositionForInfoBox(e) {
    // Find closest X axis value, according to pointer position
    const chartIndex = parseInt(e.target.id.split('--')[1]);
    const minX = chartData[chartIndex].columns[0][chartData[chartIndex].leftBorderIndex || 1];
    const maxX = chartData[chartIndex].columns[0][chartData[chartIndex].rightBorderIndex];
    const closestX = findClosestXValueOnAxis(e.clientX - containerPadding, chartIndex, true);
    const closestXValueInPx = (closestX.closestXValue - minX) / (maxX - minX) * canvasWidth;

    const infoBoxContainer = e.target.closest('.chart-block').getElementsByClassName('info-box-container')[0];
    infoBoxContainer.classList.add('shown');

    if (closestX.pointIndex / (chartData[chartIndex].rightBorderIndex - chartData[chartIndex].leftBorderIndex + 1) > 0.5) {
        infoBoxContainer.classList.add('right');
    } else {
        infoBoxContainer.classList.remove('right');
    }

    infoBoxContainer.style.left = `${closestXValueInPx}px`;
    infoBoxContainer.getElementsByClassName('date')[0].innerHTML = formDateForView(closestX.closestXValue, true);

    // Fill values
    const values = infoBoxContainer.getElementsByClassName('lines')[0].getElementsByClassName('value');
    for (let i = 0; i < values.length; i++) {
        if (chartData[chartIndex].included.indexOf(values[i].getAttribute('name')) > -1) {
            values[i].style.display = 'block';
            values[i].innerHTML = `<div class="number">${chartData[chartIndex].columns[i + 1][chartData[chartIndex].leftBorderIndex + closestX.pointIndex]}</div>
                                   <div class="line-name">${chartData[chartIndex].columns[i + 1][0]}</div>`;
        } else {
            values[i].style.display = 'none';
        }
    }

    // Draw circles: Y values for X point
    const circles = infoBoxContainer.getElementsByClassName('point-circle');
    for (let i = 0; i < circles.length; i++) {
        chartData[chartIndex].columns.forEach((col, j) => {
            if (col[0] === circles[i].getAttribute('name')) {
                if (chartData[chartIndex].included.indexOf(col[0]) > -1) {
                    circles[i].style.display = 'block';
                    circles[i].style.top = `${canvasHeight - col[chartData[chartIndex].leftBorderIndex + closestX.pointIndex] * canvasHeight / chartData[chartIndex].maxAmongAllLines - circlesRadius}px`;
                } else {
                    circles[i].style.display = 'none';
                }
            }
        });
    }
}

/*
 * Tabs controller
*/
function _tabClicked(e) {
    const tabs = document.getElementById('tabs').getElementsByClassName('tab');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }

    e.target.classList.add('active');
    const chartNumberToShow = parseInt(e.target.getAttribute('number'));

    const chartBlocks = document.getElementsByClassName('chart-block');
    for (let i = 0; i < chartBlocks.length; i++) {
        chartBlocks[i].style.display = chartNumberToShow === i ? 'block' : 'none';
    }
}

/*
 * Pointer events callbacks
*/
function _onChartPointerDown(e) {
    e.target.setPointerCapture(e.pointerId);

    if (e.target.id.indexOf('secondary-chart-block--') > -1) {
        gestureHasStarted = true;

        const currentLeftPoisitonL = parseInt(e.target.closest('.chart-block').getElementsByClassName('border-control--left')[0].style.left.split('px')[0]);
        const currentLeftPoisitonR = parseInt(e.target.closest('.chart-block').getElementsByClassName('border-control--right')[0].style.left.split('px')[0]);
        // Calculating distance to border controls
        distanceToBorderControlsFromPointer.left = e.clientX - containerPadding - currentLeftPoisitonL;
        distanceToBorderControlsFromPointer.right = e.clientX - containerPadding - currentLeftPoisitonR;
    } else {
        setPositionForInfoBox(e);
    }
}

function _onChartPointerUp(e) {
    e.target.releasePointerCapture(e.pointerId);

    if (e.target.id.indexOf('secondary-chart-block--') > -1) {
        gestureHasStarted = false;
    }
}

function _onChartPointerMove(e) {
    if (e.target.id.indexOf('secondary-chart-block--') > -1) {
        if (gestureHasStarted) {
            moveRangeSelector(e);
        }
    } else {
        setPositionForInfoBox(e);
    }
}

function _onChartPointerCancel(e) {
    e.target.releasePointerCapture(e.pointerId);
    if (e.target.id.indexOf('secondary-chart-block--') > -1) {
        gestureHasStarted = false;
    }
}

function dragPointerDown(e) {
    e.target.setPointerCapture(e.pointerId);
    pos1 = 0;
    pos2 = e.clientX;
    rangeDraggableBordersGestureHasStarted = true;
}

function dragPointerUp(e) {
    e.target.releasePointerCapture(e.pointerId);
    rangeDraggableBordersGestureHasStarted = false;
}

function dragPointerCancel(e) {
    e.target.releasePointerCapture(e.pointerId);
    rangeDraggableBordersGestureHasStarted = false;
}

function dragPointerMove(e) {
    if (rangeDraggableBordersGestureHasStarted) {
        let chartIndex = 0;
        if (e.target.closest('.chart-block')) {
            chartIndex = parseInt(e.target.closest('.chart-block').className.split('--')[1]);
            e.target.closest('.chart-block').getElementsByClassName('info-box-container')[0].classList.remove('shown');
        }

        let tentativelyLeftBorder = chartData[chartIndex].leftBorderIndex;
        let tentativelyRightBorder = chartData[chartIndex].rightBorderIndex;

        const isLeftControl = e.target.classList.contains('border-control--left');
        if (isLeftControl) {
            tentativelyLeftBorder = findClosestXValueOnAxis(e.clientX - containerPadding, chartIndex).pointIndex;
        } else {
            tentativelyRightBorder = findClosestXValueOnAxis(e.clientX - containerPadding, chartIndex).pointIndex;
        }

        pos1 = pos2 - e.clientX;
        pos2 = e.clientX;

        let startFrom, endWith;
        if (tentativelyRightBorder - tentativelyLeftBorder > minimumRange) {
            if (isLeftControl) {
                chartData[chartIndex].leftBorderIndex = tentativelyLeftBorder;
            } else {
                chartData[chartIndex].rightBorderIndex = tentativelyRightBorder;
            }

            const currentLeftPoisiton = parseInt(e.target.style.left.split('px')[0]);

            e.target.style.left = (currentLeftPoisiton - pos1 >= 0 ?
                (currentLeftPoisiton - pos1 + rangeControlWidth <= canvasWidth ? currentLeftPoisiton - pos1 : canvasWidth - rangeControlWidth)
                : 0) + 'px';

            startFrom = isLeftControl ? findClosestXValueOnAxis(e.clientX - containerPadding, chartIndex).pointIndex : chartData[chartIndex].leftBorderIndex;
            endWith = isLeftControl ? chartData[chartIndex].rightBorderIndex : findClosestXValueOnAxis(e.clientX - containerPadding, chartIndex).pointIndex;
        } else {
            startFrom = chartData[chartIndex].leftBorderIndex;
            endWith = chartData[chartIndex].rightBorderIndex;
        }

        drawChart(`chart-block--${chartIndex}`, chartData[chartIndex], canvasWidth, canvasHeight, true, startFrom, endWith);
    }
}

function moveRangeSelector(e) {
    const leftControl = e.target.closest('.chart-block').getElementsByClassName('border-control--left')[0];
    const rightControl = e.target.closest('.chart-block').getElementsByClassName('border-control--right')[0];
    const leftPosition = e.clientX - containerPadding - distanceToBorderControlsFromPointer.left;
    const rightPosition = e.clientX - containerPadding - distanceToBorderControlsFromPointer.right;
    const chartIndex = parseInt(e.target.closest('.chart-block').className.split('--')[1]);
    e.target.closest('.chart-block').getElementsByClassName('info-box-container')[0].classList.remove('shown');

    if (leftPosition >= 0 && rightPosition <= canvasWidth - rangeControlWidth) {
        leftControl.style.left = `${leftPosition}px`;
        rightControl.style.left = `${rightPosition}px`;

        const startFrom = findClosestXValueOnAxis(leftPosition, chartIndex).pointIndex;
        const endWith = findClosestXValueOnAxis(rightPosition, chartIndex).pointIndex;

        chartData[chartIndex].leftBorderIndex = startFrom;
        chartData[chartIndex].rightBorderIndex = endWith;

        drawChart(`chart-block--${chartIndex}`, chartData[chartIndex], canvasWidth, canvasHeight, true, startFrom, endWith);
    }
}

/*
 * Optimized window resize
*/
(function() {
    const throttle = function(type, name, obj) {
        obj = obj || window;
        let running = false;
        const func = function() {
            if (running) { return; }
            running = true;
            requestAnimationFrame(function() {
                obj.dispatchEvent(new CustomEvent(name));
                running = false;
            });
        };
        obj.addEventListener(type, func);
    };

    throttle("resize", "optimizedResize");
})();

/*
 * Catching window resize
*/
window.addEventListener("optimizedResize", () => {
    canvasWidth = document.documentElement.clientWidth - containerPadding * 2;
    canvasHeight = parseInt(document.documentElement.clientHeight / 2);

    document.getElementById('container').innerHTML = '<h2>Followers</h2>';
    start();
});
