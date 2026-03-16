console.log("MAZE.JS — CLEAN VERSION WITH 90° CCW ROTATION + CENTERING + CLEAN ZOOM");

// CANVAS
const canvas = document.getElementById("mazeCanvas");
const ctx = canvas.getContext("2d");

// WORLD SIZE (tall enough for your maze)
const worldWidth = 3000;
const worldHeight = 8000;

// CAMERA / ZOOM
let scale = 1.0;
let minScale = 0.05;
let maxScale = 3.0;

// CAMERA ALWAYS CENTERED ON WORLD
function getCamera() {
    return {
        cx: canvas.width / 2,
        cy: canvas.height / 2,
        wx: worldWidth / 2,
        wy: worldHeight / 2
    };
}

// ZOOM CONTROLS
const zoomSlider = document.getElementById("zoomSlider");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");

function applyZoom(newScale) {
    scale = Math.max(minScale, Math.min(maxScale, newScale));
    draw();
}

zoomSlider.addEventListener("input", () => {
    applyZoom(zoomSlider.value / 100);
});

zoomInBtn.addEventListener("click", () => {
    let v = Math.min(200, parseInt(zoomSlider.value) + 10);
    zoomSlider.value = v;
    applyZoom(v / 100);
});

zoomOutBtn.addEventListener("click", () => {
    let v = Math.max(10, parseInt(zoomSlider.value) - 10);
    zoomSlider.value = v;
    applyZoom(v / 100);
});

// RESET VIEW → return to zoom=1.0 and slider middle
document.getElementById("resetViewBtn").addEventListener("click", () => {
    zoomSlider.value = 100;
    scale = 1.0;
    draw();
});

// GRID + SNAP
const gridSize = 50;
let showGrid = true;
let snapEnabled = true;

document.getElementById("gridBtn").addEventListener("click", () => {
    showGrid = !showGrid;
    draw();
});

document.getElementById("snapBtn").addEventListener("click", () => {
    snapEnabled = !snapEnabled;
});

// TOOLS
let currentTool = "walls";
let startCell = null;

let walls = [];
let rooms = [];
let doors = [];

let selectedObject = null;

// HISTORY
let history = [];
let redoStack = [];

function cloneState() {
    return {
        walls: JSON.parse(JSON.stringify(walls)),
        rooms: JSON.parse(JSON.stringify(rooms)),
        doors: JSON.parse(JSON.stringify(doors))
    };
}

function saveState() {
    history.push(cloneState());
    redoStack = [];
}

function restoreState(state) {
    walls = JSON.parse(JSON.stringify(state.walls));
    rooms = JSON.parse(JSON.stringify(state.rooms));
    doors = JSON.parse(JSON.stringify(state.doors));
    selectedObject = null;
    centerMazeInWorld();
    draw();
}

saveState();

// TOOL BUTTONS
document.querySelectorAll("#toolbar button[data-tool]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("#toolbar button[data-tool]").forEach(b => b.classList.remove("active-tool"));
        btn.classList.add("active-tool");
        currentTool = btn.dataset.tool;
        startCell = null;
        selectedObject = null;
        draw();
    });
});

document.querySelector('#toolbar button[data-tool="walls"]').classList.add("active-tool");

// CLEAR ALL
document.getElementById("clearAllBtn").addEventListener("click", () => {
    walls = [];
    rooms = [];
    doors = [];
    startCell = null;
    selectedObject = null;
    saveState();
    draw();
});

// UNDO
document.getElementById("undoBtn").addEventListener("click", () => {
    if (history.length > 1) {
        redoStack.push(cloneState());
        history.pop();
        restoreState(history[history.length - 1]);
    }
});

// REDO
document.getElementById("redoBtn").addEventListener("click", () => {
    if (redoStack.length > 0) {
        history.push(cloneState());
        restoreState(redoStack.pop());
    }
});

// ⭐ BOUNDING BOX OF ALL OBJECTS
function computeBoundingBox() {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    const add = (x, y) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    };

    walls.forEach(w => { add(w.x1, w.y1); add(w.x2, w.y2); });
    doors.forEach(d => { add(d.x1, d.y1); add(d.x2, d.y2); });
    rooms.forEach(r => { add(r.x, r.y); add(r.x + r.w, r.y + r.h); });

    if (minX === Infinity) {
        return { minX: 0, minY: 0, maxX: worldWidth, maxY: worldHeight };
    }

    return { minX, minY, maxX, maxY };
}

// ⭐ CENTER MAZE IN WORLD
function centerMazeInWorld() {
    const box = computeBoundingBox();
    const mazeCx = (box.minX + box.maxX) / 2;
    const mazeCy = (box.minY + box.maxY) / 2;

    const worldCx = worldWidth / 2;
    const worldCy = worldHeight / 2;

    const dx = worldCx - mazeCx;
    const dy = worldCy - mazeCy;

    walls.forEach(w => {
        w.x1 += dx; w.y1 += dy;
        w.x2 += dx; w.y2 += dy;
    });

    doors.forEach(d => {
        d.x1 += dx; d.y1 += dy;
        d.x2 += dx; d.y2 += dy;
    });

    rooms.forEach(r => {
        r.x += dx;
        r.y += dy;
    });
}

// ⭐ 90° COUNTER‑CLOCKWISE ROTATION
function rotateMazeCCW() {
    // Rotate walls
    walls.forEach(w => {
        const x1 = w.x1, y1 = w.y1;
        const x2 = w.x2, y2 = w.y2;

        w.x1 = y1;
        w.y1 = worldWidth - x1;

        w.x2 = y2;
        w.y2 = worldWidth - x2;
    });

    // Rotate doors
    doors.forEach(d => {
        const x1 = d.x1, y1 = d.y1;
        const x2 = d.x2, y2 = d.y2;

        d.x1 = y1;
        d.y1 = worldWidth - x1;

        d.x2 = y2;
        d.y2 = worldWidth - x2;
    });

    // Rotate rooms
    rooms.forEach(r => {
        const oldX = r.x;
        const oldY = r.y;
        const oldW = r.w;
        const oldH = r.h;

        r.x = oldY;
        r.y = worldWidth - (oldX + oldW);

        // Swap width/height
        r.w = oldH;
        r.h = oldW;
    });
}

// LOAD
document.getElementById("loadBtn").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);

                if (Array.isArray(data)) {
                    walls = data;
                    rooms = [];
                    doors = [];
                } else {
                    walls = data.walls || [];
                    rooms = data.rooms || [];
                    doors = data.doors || [];
                }

                // Rotate only full maze exports (not walls.json)
                if (!Array.isArray(data)) {
                    rotateMazeCCW();
                }

                rotateMazeCCW();

                // Center in world
                centerMazeInWorld();

                // Start zoom in the middle
                scale = 1.0;
                zoomSlider.value = 100;

                history = [];
                redoStack = [];
                saveState();
                draw();
            } catch {
                alert("Invalid file format.");
            }
        };

        reader.readAsText(file);
    };

    input.click();
});


// ⭐⭐⭐ SAVE BUTTON — ADDED CLEANLY ⭐⭐⭐
document.getElementById("saveBtn").addEventListener("click", () => {
    const data = { walls, rooms, doors };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "maze.json";
    a.click();

    URL.revokeObjectURL(url);
});
// ⭐⭐⭐ END SAVE BUTTON ⭐⭐⭐


// SNAP
function snapToGrid(x, y) {
    if (!snapEnabled) return { x, y };
    return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize
    };
}

// HIT TEST
function distancePointToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const tt = Math.max(0, Math.min(1, t));
    const cx = x1 + tt * dx;
    const cy = y1 + tt * dy;
    return Math.hypot(px - cx, py - cy);
}

function pointInRect(px, py, r) {
    const x1 = Math.min(r.x, r.x + r.w);
    const x2 = Math.max(r.x, r.x + r.w);
    const y1 = Math.min(r.y, r.y + r.h);
    const y2 = Math.max(r.y, r.y + r.h);
    return px >= x1 && px <= x2 && py >= y1 && py <= y2;
}

function hitTest(x, y) {
    for (let i = doors.length - 1; i >= 0; i--) {
        const d = doors[i];
        if (distancePointToSegment(x, y, d.x1, d.y1, d.x2, d.y2) < 8) {
            return { type: "door", index: i, obj: d };
        }
    }

    for (let i = walls.length - 1; i >= 0; i--) {
        const w = walls[i];
        if (distancePointToSegment(x, y, w.x1, w.y1, w.x2, w.y2) < 8) {
            return { type: "wall", index: i, obj: w };
        }
    }

    for (let i = rooms.length - 1; i >= 0; i--) {
        if (pointInRect(x, y, rooms[i])) {
            return { type: "room", index: i, obj: rooms[i] };
        }
    }

    return null;
}

// WORLD-SPACE MOUSE
function screenToWorld(x, y) {
    const cam = getCamera();
    return {
        x: (x - cam.cx) / scale + cam.wx,
        y: (y - cam.cy) / scale + cam.wy
    };
}

// CLICK → CLICK DRAWING
canvas.addEventListener("click", e => {
    if (e.button === 2) return;

    const rect = canvas.getBoundingClientRect();
    const raw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    const snapped = snapToGrid(raw.x, raw.y);

    if (currentTool === "select") {
        selectedObject = hitTest(raw.x, raw.y);
        draw();
        return;
    }

    if (currentTool === "erase") {
        const hit = hitTest(raw.x, raw.y);
        if (hit) {
            if (hit.type === "wall") walls.splice(hit.index, 1);
            if (hit.type === "room") rooms.splice(hit.index, 1);
            if (hit.type === "door") doors.splice(hit.index, 1);
            saveState();
            draw();
        }
        return;
    }

    if (!startCell) {
        startCell = snapped;
        return;
    }

    if (currentTool === "walls") {
        walls.push({ x1: startCell.x, y1: startCell.y, x2: snapped.x, y2: snapped.y });
    }

    if (currentTool === "rooms") {
        rooms.push({ x: startCell.x, y: startCell.y, w: snapped.x - startCell.x, h: snapped.y - startCell.y });
    }

    if (currentTool === "doors") {
        doors.push({ x1: startCell.x, y1: startCell.y, x2: snapped.x, y2: snapped.y });
    }

    saveState();
    draw();
    startCell = null;
});

// CAMERA TRANSFORM
function applyCamera() {
    const cam = getCamera();
    ctx.translate(cam.cx, cam.cy);
    ctx.scale(scale, scale);
    ctx.translate(-cam.wx, -cam.wy);
}

// DRAWING FUNCTIONS
function drawGrid() {
    if (!showGrid) return;

    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1 / scale;

    for (let x = 0; x <= worldWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, worldHeight);
        ctx.stroke();
    }

    for (let y = 0; y <= worldHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(worldWidth, y);
        ctx.stroke();
    }
}

function drawWalls() {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4 / scale;

    walls.forEach(w => {
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        ctx.stroke();
    });
}

function drawRooms() {
    rooms.forEach(r => {
        ctx.fillStyle = "rgba(0,150,255,0.2)";
        ctx.strokeStyle = "rgba(0,150,255,1)";
        ctx.lineWidth = 2 / scale;

        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        // Draw room name if it exists
        if (r.name) {
            ctx.font = `${14 / scale}px Arial`;
            ctx.fillStyle = "blue";
            ctx.fillText(r.name, r.x + 10 / scale, r.y + 20 / scale);
        }
    });
}

function drawDoors() {
    ctx.strokeStyle = "#e67e22";
    ctx.lineWidth = 4 / scale;

    doors.forEach(d => {
        ctx.beginPath();
        ctx.moveTo(d.x1, d.y1);
        ctx.lineTo(d.x2, d.y2);
        ctx.stroke();
    });
}

function drawSelection() {
    if (!selectedObject) return;

    ctx.save();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2 / scale;
    ctx.setLineDash([6 / scale, 4 / scale]);

    const obj = selectedObject.obj;

    if (selectedObject.type === "wall" || selectedObject.type === "door") {
        ctx.beginPath();
        ctx.moveTo(obj.x1, obj.y1);
        ctx.lineTo(obj.x2, obj.y2);
        ctx.stroke();
    } else if (selectedObject.type === "room") {
        ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
    }

    ctx.restore();
}

function drawBorder() {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 6 / scale;
    ctx.strokeRect(0, 0, worldWidth, worldHeight);
}

// MAIN DRAW
function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    applyCamera();

    drawGrid();
    drawRooms();
    drawWalls();
    drawDoors();
    drawSelection();
    drawBorder();

    ctx.restore();
}

// INITIAL STATE
zoomSlider.value = 100;
scale = 1.0;
draw();
