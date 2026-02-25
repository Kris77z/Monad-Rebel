'use client';

import { useEffect, useRef, useState } from 'react';
import { formatMON } from '@/lib/format';

type AgentKind = 'writer' | 'auditor' | 'defi' | 'unknown';
type SnakeMode = 'hunt' | 'idle';
type Point = { x: number; y: number };

export interface SnakeNode {
  key: string;
  phaseIndex: number;
  id: string;
  name: string;
  taskType?: string;
  price?: string;
  reputation: number;
  status: 'online' | 'selected' | 'failed';
}

interface DiscoverySnakeProps {
  nodes: SnakeNode[];
  activePhaseIndex: number;
  mode: SnakeMode;
}

const CELL = 8;
const SPEED_MS = 90;
const IDLE_SPEED_MS = 160;

const COLORS = {
  bg: '#f3f3f5',
  grid: '#e0e0e4',
  snake: '#0f766e',
  snakeBody: '#2dd4bf',
  foodFail: '#dc2626',
  text: '#19191d',
  muted: '#6e6e7a',
} as const;

const FOOD_COLORS: Record<AgentKind, { base: string; done: string }> = {
  writer: { base: '#0284c7', done: '#0369a1' },
  auditor: { base: '#d97706', done: '#b45309' },
  defi: { base: '#059669', done: '#047857' },
  unknown: { base: '#6b7280', done: '#4b5563' },
};

function classifyKind(input: { id: string; taskType?: string }): AgentKind {
  const taskType = input.taskType?.toLowerCase() ?? '';
  const id = input.id.toLowerCase();
  if (taskType.includes('audit') || id.includes('audit')) return 'auditor';
  if (taskType.includes('defi') || id.includes('defi')) return 'defi';
  if (taskType.includes('content') || id.includes('writer') || taskType.includes('write')) return 'writer';
  return 'unknown';
}

interface SnakeFood extends SnakeNode {
  x: number;
  y: number;
  eaten: boolean;
  kind: AgentKind;
}

interface SnakePersistentState {
  snake: Point[];
  dir: Point;
  foods: SnakeFood[];
  idleTicks: number;
  selectionLockedPhase: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function chooseIdleDirection(head: Point, cols: number, rows: number, current: Point): Point {
  const dirs: Point[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  const valid = dirs.filter((dir) => {
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;
    return nx >= 0 && nx < cols && ny >= 0 && ny < rows;
  });
  if (valid.length === 0) return { x: -current.x || 1, y: -current.y };
  const keepCurrent = valid.find((item) => item.x === current.x && item.y === current.y);
  if (keepCurrent && Math.random() > 0.28) return keepCurrent;
  return valid[Math.floor(Math.random() * valid.length)];
}

function findTargetIndex(foods: SnakeFood[], activePhaseIndex: number): number {
  const currentPhaseTarget = foods.findIndex(
    (food) => !food.eaten && food.phaseIndex <= activePhaseIndex,
  );
  if (currentPhaseTarget >= 0) return currentPhaseTarget;
  return foods.findIndex((food) => !food.eaten);
}

function getDirectionToTarget(head: Point, target: Point, fallback: Point): Point {
  const dx = target.x - head.x;
  const dy = target.y - head.y;
  if (dx === 0 && dy === 0) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: dx > 0 ? 1 : -1, y: 0 };
  }
  return { x: 0, y: dy > 0 ? 1 : -1 };
}

function syncFoodsFromNodes(
  state: SnakePersistentState,
  nodes: SnakeNode[],
  cols: number,
  rows: number,
): void {
  const byKey = new Map(state.foods.map((food) => [food.key, food]));
  const centerY = clamp(Math.floor(rows / 2), 1, Math.max(1, rows - 2));

  let newCount = 0;
  for (const node of nodes) {
    const existing = byKey.get(node.key);
    if (existing) {
      existing.id = node.id;
      existing.name = node.name;
      existing.taskType = node.taskType;
      existing.price = node.price;
      existing.reputation = node.reputation;
      existing.status = node.status;
      existing.phaseIndex = node.phaseIndex;
      existing.kind = classifyKind({ id: node.id, taskType: node.taskType });
      continue;
    }

    /* Placeholder coords — will be redistributed below */
    const added: SnakeFood = {
      ...node,
      x: 0,
      y: 0,
      eaten: false,
      kind: classifyKind({ id: node.id, taskType: node.taskType }),
    };
    state.foods.push(added);
    byKey.set(node.key, added);
    newCount += 1;
  }

  if (newCount === 0 && state.foods.every((f) => f.x > 0)) return;

  state.foods.sort((a, b) => {
    if (a.phaseIndex !== b.phaseIndex) return a.phaseIndex - b.phaseIndex;
    return a.key.localeCompare(b.key);
  });

  /* Evenly distribute all foods across the canvas width */
  const margin = 4;
  const usable = Math.max(1, cols - margin * 2);
  const count = state.foods.length;
  const spacing = count > 1 ? Math.max(3, Math.floor(usable / count)) : 0;

  for (let i = 0; i < count; i++) {
    const food = state.foods[i];
    /* Only reposition if food hasn't been eaten (eaten keeps its position) */
    if (!food.eaten || food.x === 0) {
      food.x = clamp(margin + i * spacing, 1, Math.max(1, cols - 2));
      /* Alternate Y: above/below center to avoid vertical stacking */
      const yOffset = (i % 3) - 1; // -1, 0, 1
      food.y = clamp(centerY + yOffset * 2, 1, Math.max(1, rows - 2));
    }
  }
}

export function DiscoverySnake({ nodes, activePhaseIndex, mode }: DiscoverySnakeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [evalLabel, setEvalLabel] = useState('');
  const runtimeRef = useRef<SnakePersistentState | null>(null);
  const syncRequiredRef = useRef(true);
  const nodesRef = useRef(nodes);
  const modeRef = useRef<SnakeMode>(mode);
  const activePhaseRef = useRef(activePhaseIndex);

  useEffect(() => {
    nodesRef.current = nodes;
    modeRef.current = mode;
    activePhaseRef.current = activePhaseIndex;
    const runtime = runtimeRef.current;
    if (runtime && runtime.selectionLockedPhase !== null) {
      const lock = runtime.selectionLockedPhase;
      if (lock !== null && activePhaseIndex > lock) {
        runtime.selectionLockedPhase = null;
      }
    }
    syncRequiredRef.current = true;
  }, [nodes, mode, activePhaseIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;

    let cols = Math.floor(width / CELL);
    let rows = Math.floor(height / CELL);
    const centerY = Math.floor(rows / 2);
    if (!runtimeRef.current) {
      runtimeRef.current = {
        snake: [
          { x: 2, y: centerY },
          { x: 1, y: centerY },
          { x: 0, y: centerY },
        ],
        dir: { x: 1, y: 0 },
        foods: [],
        idleTicks: 0,
        selectionLockedPhase: null,
      };
    }

    let animId: number;
    let lastTime = 0;

    const render = (timestamp: number) => {
      animId = requestAnimationFrame(render);
      const currentMode = modeRef.current;
      const tickMs = currentMode === 'idle' ? IDLE_SPEED_MS : SPEED_MS;
      if (timestamp - lastTime < tickMs) return;
      lastTime = timestamp;

      const runtime = runtimeRef.current;
      if (!runtime) return;

      if (syncRequiredRef.current) {
        syncFoodsFromNodes(runtime, nodesRef.current, cols, rows);
        syncRequiredRef.current = false;
      }

      const phaseLock = runtime.selectionLockedPhase;
      const lockActive = phaseLock !== null && activePhaseRef.current <= phaseLock;
      const canHunt = modeRef.current === 'hunt' && !lockActive;

      const targetIndex = canHunt ? findTargetIndex(runtime.foods, activePhaseRef.current) : -1;
      const target = targetIndex >= 0 ? runtime.foods[targetIndex] : undefined;
      const head = runtime.snake[0];
      if (!head) {
        return;
      }

      if (target) {
        runtime.dir = getDirectionToTarget(head, target, runtime.dir);
      } else {
        if (runtime.idleTicks <= 0) {
          runtime.dir = chooseIdleDirection(head, cols, rows, runtime.dir);
          runtime.idleTicks = 3 + Math.floor(Math.random() * 6);
        } else {
          runtime.idleTicks -= 1;
        }
      }

      let nextHead = { x: head.x + runtime.dir.x, y: head.y + runtime.dir.y };
      if (nextHead.x < 0 || nextHead.x >= cols || nextHead.y < 0 || nextHead.y >= rows) {
        runtime.dir = chooseIdleDirection(head, cols, rows, { x: -runtime.dir.x, y: -runtime.dir.y });
        nextHead = { x: head.x + runtime.dir.x, y: head.y + runtime.dir.y };
      }

      runtime.snake.unshift(nextHead);
      let ateTarget = false;
      if (target && nextHead.x === target.x && nextHead.y === target.y) {
        target.eaten = true;
        ateTarget = true;
        if (target.status === 'selected') {
          runtime.selectionLockedPhase = target.phaseIndex;
          setEvalLabel(
            `✓ ${target.id} (${target.taskType ?? target.kind}) → ${target.price ? `${formatMON(target.price)} MON` : 'selected'}`
          );
        } else {
          setEvalLabel(`✗ ${target.id} (${target.taskType ?? target.kind}) → skip`);
        }
      }

      if (!ateTarget) {
        runtime.snake.pop();
      } else if (target?.status !== 'selected') {
        runtime.snake.pop();
      }

      const isIdle = modeRef.current === 'idle';
      drawFrame(ctx, width, height, cols, rows, runtime.snake, runtime.foods, targetIndex, isIdle);
    };

    const ro = new ResizeObserver(() => {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width;
      canvas.height = height;
      cols = Math.floor(width / CELL);
      rows = Math.floor(height / CELL);
      const runtime = runtimeRef.current;
      if (!runtime) return;
      for (const seg of runtime.snake) {
        seg.x = clamp(seg.x, 0, Math.max(0, cols - 1));
        seg.y = clamp(seg.y, 0, Math.max(0, rows - 1));
      }
      syncRequiredRef.current = true;
    });
    ro.observe(container);

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (nodes.length === 0) return null;

  return (
    <div ref={containerRef} className="relative w-full h-[80px] bg-[#f3f3f5] border border-border overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {evalLabel && (
        <div className="absolute bottom-1 left-2 text-[9px] font-mono text-foreground bg-card/80 px-1.5 py-0.5 border border-border">
          {evalLabel}
        </div>
      )}
    </div>
  );
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cols: number,
  rows: number,
  snake: { x: number; y: number }[],
  foods: Array<{
    x: number;
    y: number;
    key: string;
    id: string;
    status: string;
    eaten: boolean;
    taskType?: string;
    kind: AgentKind;
  }>,
  currentTarget: number,
  isIdle = false,
) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.4;
  for (let x = 0; x <= cols; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, rows * CELL);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(cols * CELL, y * CELL);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  foods.forEach((food, i) => {
    const px = food.x * CELL;
    const py = food.y * CELL;
    const palette = FOOD_COLORS[food.kind];
    if (food.eaten) {
      ctx.fillStyle = food.status === 'selected' ? palette.done : COLORS.foodFail;
      ctx.globalAlpha = 0.25;
    } else if (i === currentTarget && currentTarget >= 0) {
      ctx.fillStyle = palette.base;
      ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.008) * 0.3;
    } else if (food.status === 'selected') {
      /* Selected by decision but not yet eaten — highlight in green */
      ctx.fillStyle = palette.done;
      ctx.globalAlpha = 0.85;
    } else {
      ctx.fillStyle = COLORS.muted;
      ctx.globalAlpha = 0.35;
    }
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    ctx.globalAlpha = 1;

    /* Eaten marker: ✓ for selected, ✗ for skipped */
    if (food.eaten) {
      const marker = food.status === 'selected' ? '✓' : '✗';
      ctx.fillStyle = food.status === 'selected' ? palette.done : COLORS.foodFail;
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.7;
      ctx.fillText(marker, px + CELL / 2, py + CELL - 1);
      ctx.globalAlpha = 1;
    }

    /* Label above the food */
    ctx.fillStyle = food.eaten ? (food.status === 'selected' ? palette.done : COLORS.foodFail) : COLORS.text;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = food.eaten ? 0.5 : 1;
    const shortLabel = food.id.slice(0, 6);
    ctx.fillText(shortLabel, px + CELL / 2, py - 3);
    ctx.globalAlpha = 1;
  });

  /* Snake body — faded when idle */
  const snakeAlphaMultiplier = isIdle ? 0.45 : 1;
  snake.forEach((seg, i) => {
    const px = seg.x * CELL;
    const py = seg.y * CELL;
    if (i === 0) {
      ctx.globalAlpha = snakeAlphaMultiplier;
      ctx.fillStyle = COLORS.snake;
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      ctx.globalAlpha = 1;
    } else {
      const baseAlpha = Math.max(0.2, 1 - (i / snake.length) * 0.8);
      ctx.globalAlpha = baseAlpha * snakeAlphaMultiplier;
      ctx.fillStyle = COLORS.snakeBody;
      ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
      ctx.globalAlpha = 1;
    }
  });
}
