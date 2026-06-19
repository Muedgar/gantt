'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  GripVertical,
  Move,
  User,
  XCircle,
} from 'lucide-react';

type TaskStatus = 'Todo' | 'In Progress' | 'Blocked' | 'Done';

type Task = {
  id: number;
  name: string;
  owner: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  progress: number;
  isMilestone?: boolean;
};

const LEFT_WIDTH = 360;
const DAY_WIDTH = 96;
const ROW_HEIGHT = 64;

const dates = [
  'Feb 15', 'Feb 16', 'Feb 17', 'Feb 18',
  'Feb 19', 'Feb 20', 'Feb 21', 'Feb 22',
  'Feb 23', 'Feb 24', 'Feb 25', 'Feb 26',
  'Feb 27', 'Feb 28', 'Mar 01', 'Mar 02',
];

const initialTasks: Task[] = [
  { id: 1, name: 'Design System', owner: 'Alice', status: 'Done', startDate: 'Feb 15', endDate: 'Feb 17', progress: 100 },
  { id: 2, name: 'Frontend Setup', owner: 'Bob', status: 'In Progress', startDate: 'Feb 16', endDate: 'Feb 19', progress: 65 },
  { id: 3, name: 'Backend API', owner: 'Charlie', status: 'In Progress', startDate: 'Feb 17', endDate: 'Feb 21', progress: 40 },
  { id: 4, name: 'Database Design', owner: 'David', status: 'Todo', startDate: 'Feb 18', endDate: 'Feb 20', progress: 0 },
  { id: 5, name: 'UI Testing', owner: 'Eve', status: 'Blocked', startDate: 'Feb 19', endDate: 'Feb 22', progress: 0 },
  { id: 10, name: 'Launch 🚀', owner: 'Team', status: 'Todo', startDate: 'Feb 28', endDate: 'Feb 28', progress: 0, isMilestone: true },
];

const statusStyles = {
  Todo: {
    pill: 'bg-slate-100 text-slate-600',
    bar: 'bg-slate-400 hover:bg-slate-500',
    icon: Clock,
  },
  'In Progress': {
    pill: 'bg-blue-100 text-blue-700',
    bar: 'bg-blue-500 hover:bg-blue-600',
    icon: AlertCircle,
  },
  Blocked: {
    pill: 'bg-red-100 text-red-700',
    bar: 'bg-red-500 hover:bg-red-600',
    icon: XCircle,
  },
  Done: {
    pill: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500 hover:bg-emerald-600',
    icon: CheckCircle,
  },
};

export default function GanttWithDndKit() {
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [snapIndex, setSnapIndex] = useState<number | null>(null);
  const [invalidDrop, setInvalidDrop] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const timelineWidth = dates.length * DAY_WIDTH;

  function handleDragMove(event: DragMoveEvent) {
    if (!activeTask) return;

    const originalStartIndex = dates.indexOf(activeTask.startDate);
    const movedDays = Math.round(event.delta.x / DAY_WIDTH);
    const nextStartIndex = originalStartIndex + movedDays;

    const valid = nextStartIndex >= 0 && nextStartIndex < dates.length;

    setSnapIndex(Math.max(0, Math.min(nextStartIndex, dates.length - 1)));
    setInvalidDrop(!valid);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!activeTask) return;

    const originalStartIndex = dates.indexOf(activeTask.startDate);
    const originalEndIndex = dates.indexOf(activeTask.endDate);
    const duration = originalEndIndex - originalStartIndex;

    const movedDays = Math.round(event.delta.x / DAY_WIDTH);
    const nextStartIndex = originalStartIndex + movedDays;
    const nextEndIndex = nextStartIndex + duration;

    const valid =
      nextStartIndex >= 0 &&
      nextEndIndex >= 0 &&
      nextStartIndex < dates.length &&
      nextEndIndex < dates.length;

    if (valid) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === activeTask.id
            ? {
                ...task,
                startDate: dates[nextStartIndex],
                endDate: dates[nextEndIndex],
              }
            : task,
        ),
      );
    }

    setActiveTask(null);
    setSnapIndex(null);
    setInvalidDrop(false);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const task = tasks.find((t) => `task-${t.id}` === event.active.id);
        setActiveTask(task ?? null);
      }}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveTask(null);
        setSnapIndex(null);
        setInvalidDrop(false);
      }}
    >
      <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 p-5">
        <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Calendar className="h-5 w-5 text-blue-600" />
                Project Timeline
              </h1>
              <p className="text-xs text-slate-500">
                DnD Kit task moving, ghost preview, handles, milestones
              </p>
            </div>

            <div className="text-xs text-slate-500">
              Drag by the grip handle
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div
              className="relative"
              style={{ width: LEFT_WIDTH + timelineWidth }}
            >
              <div className="sticky top-0 z-40 flex h-16 border-b border-slate-200 bg-white shadow-sm">
                <div
                  className="sticky left-0 z-50 grid h-full grid-cols-5 border-r border-slate-200 bg-slate-950 text-white"
                  style={{ width: LEFT_WIDTH }}
                >
                  <div className="col-span-2 flex items-center px-4 text-xs font-semibold uppercase">
                    Task
                  </div>

                  <div className="flex items-center gap-1 px-3 text-xs font-semibold uppercase">
                    <User className="h-3.5 w-3.5" />
                    Owner
                  </div>

                  <div className="col-span-2 flex items-center px-3 text-xs font-semibold uppercase">
                    Status
                  </div>
                </div>

                <CalendarHeader />
              </div>

              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex border-b border-slate-100"
                  style={{ height: ROW_HEIGHT }}
                >
                  <LeftTaskInfo task={task} />

                  <TimelineRow
                    task={task}
                    snapIndex={snapIndex}
                    invalidDrop={invalidDrop && activeTask?.id === task.id}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTask ? <GhostTaskBar task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function CalendarHeader() {
  return (
    <div className="flex bg-slate-50">
      {dates.map((date, index) => {
        const isToday = date === 'Feb 17';
        const isWeekend =
          index === 6 || index === 7 || index === 13 || index === 14;
        const [month, day] = date.split(' ');

        return (
          <div
            key={date}
            className={`flex h-16 shrink-0 flex-col items-center justify-center border-r border-slate-200 ${
              isWeekend ? 'bg-slate-100' : ''
            } ${isToday ? 'bg-blue-50' : ''}`}
            style={{ width: DAY_WIDTH }}
          >
            <span
              className={`text-[11px] font-semibold ${
                isToday ? 'text-blue-700' : 'text-slate-600'
              }`}
            >
              {month}
            </span>

            <span
              className={`text-sm font-bold ${
                isToday ? 'text-blue-700' : 'text-slate-900'
              }`}
            >
              {day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LeftTaskInfo({ task }: { task: Task }) {
  const Icon = statusStyles[task.status].icon;

  return (
    <div
      className="sticky left-0 z-30 grid grid-cols-5 border-r border-slate-200 bg-white shadow-sm"
      style={{ width: LEFT_WIDTH }}
    >
      <div className="col-span-2 flex items-center px-4">
        <p className="truncate text-sm font-semibold text-slate-800">
          {task.isMilestone ? '◆ ' : ''}
          {task.name}
        </p>
      </div>

      <div className="flex items-center px-3">
        <p className="truncate text-xs text-slate-500">{task.owner}</p>
      </div>

      <div className="col-span-2 flex items-center px-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
            statusStyles[task.status].pill
          }`}
        >
          <Icon className="h-3 w-3" />
          {task.status}
        </span>
      </div>
    </div>
  );
}

function TimelineRow({
  task,
  snapIndex,
  invalidDrop,
}: {
  task: Task;
  snapIndex: number | null;
  invalidDrop: boolean;
}) {
  const startIndex = dates.indexOf(task.startDate);
  const endIndex = dates.indexOf(task.endDate);
  const duration = endIndex - startIndex + 1;

  const left = startIndex * DAY_WIDTH + 10;
  const width = duration * DAY_WIDTH - 20;
  const todayIndex = dates.indexOf('Feb 17');

  return (
    <div
      className="relative flex bg-white hover:bg-slate-50"
      style={{ width: dates.length * DAY_WIDTH }}
    >
      {dates.map((date, index) => {
        const isWeekend =
          index === 6 || index === 7 || index === 13 || index === 14;

        return (
          <div
            key={date}
            className={`h-full shrink-0 border-r border-slate-100 ${
              isWeekend ? 'bg-slate-100/70' : ''
            }`}
            style={{ width: DAY_WIDTH }}
          />
        );
      })}

      <div
        className="absolute top-0 z-20 h-full w-[3px] bg-blue-600"
        style={{ left: todayIndex * DAY_WIDTH + DAY_WIDTH / 2 }}
      />

      {snapIndex !== null && (
        <div
          className="absolute top-0 z-30 h-full w-[3px] bg-violet-600"
          style={{ left: snapIndex * DAY_WIDTH + DAY_WIDTH / 2 }}
        />
      )}

      {invalidDrop && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-red-500/10">
          <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-xl">
            <AlertTriangle className="h-4 w-4" />
            Invalid drop outside calendar
          </div>
        </div>
      )}

      {task.isMilestone || startIndex === endIndex ? (
        <MilestoneDiamond task={task} left={left} />
      ) : (
        <TaskBar task={task} left={left} width={width} />
      )}
    </div>
  );
}

function TaskBar({
  task,
  left,
  width,
}: {
  task: Task;
  left: number;
  width: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task-${task.id}`,
    });

  return (
    <div
      ref={setNodeRef}
      className={`group absolute top-3 z-10 h-10 rounded-xl text-white shadow-md transition-all duration-200 ${
        statusStyles[task.status].bar
      } hover:scale-[1.03] hover:shadow-xl ${
        isDragging ? 'opacity-30 outline outline-2 outline-blue-400' : ''
      }`}
      style={{
        left,
        width,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div
        className="absolute left-0 top-0 h-full rounded-xl bg-white/30"
        style={{ width: `${task.progress}%` }}
      />

      <button
        type="button"
        className="absolute left-0 top-0 z-20 flex h-full w-8 items-center justify-center rounded-l-xl bg-black/10 hover:bg-black/20"
      >
        <span className="h-7 w-1 cursor-ew-resize rounded bg-white/60" />
      </button>

      <button
        type="button"
        className="absolute right-0 top-0 z-20 flex h-full w-8 items-center justify-center rounded-r-xl bg-black/10 hover:bg-black/20"
      >
        <span className="h-7 w-1 cursor-ew-resize rounded bg-white/60" />
      </button>

      <button
        type="button"
        {...listeners}
        {...attributes}
        className="absolute left-8 top-0 z-20 flex h-full w-8 items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 opacity-80" />
      </button>

      <div className="relative flex h-full items-center gap-2 overflow-hidden px-16 text-xs">
        <Move className="h-3.5 w-3.5 opacity-70" />
        <span className="truncate font-semibold">{task.name}</span>

        <span className="ml-auto shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
          {task.progress}%
        </span>
      </div>

      <div
        className="absolute top-1/2 hidden h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow-lg group-hover:block"
        style={{ left: `calc(${task.progress}% - 8px)` }}
      />

      <Tooltip task={task} />
    </div>
  );
}

function MilestoneDiamond({ task, left }: { task: Task; left: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task-${task.id}`,
    });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group absolute top-4 z-20 h-8 w-8 rotate-45 cursor-grab shadow-md transition-all hover:scale-110 hover:shadow-xl active:cursor-grabbing ${
        statusStyles[task.status].bar
      } ${isDragging ? 'opacity-30' : ''}`}
      style={{
        left: left + DAY_WIDTH / 2 - 16,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(45deg)`
          : 'rotate(45deg)',
      }}
    >
      <div className="flex h-full w-full -rotate-45 items-center justify-center text-white">
        ◆
      </div>

      <Tooltip task={task} />
    </div>
  );
}

function Tooltip({ task }: { task: Task }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden w-64 -translate-x-1/2 -translate-y-[115%] rounded-xl bg-slate-950 p-3 text-xs text-white shadow-2xl group-hover:block">
      <p className="mb-2 font-bold">{task.name}</p>
      <p>Start: {task.startDate}</p>
      <p>End: {task.endDate}</p>
      <p>Progress: {task.progress}%</p>
      <p>Assignee: {task.owner}</p>

      <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rotate-45 bg-slate-950" />
    </div>
  );
}

function GhostTaskBar({ task }: { task: Task }) {
  return (
    <div
      className={`h-10 rounded-xl border-2 border-dashed border-white/70 px-4 text-white shadow-2xl ${
        statusStyles[task.status].bar
      }`}
      style={{ width: 220 }}
    >
      <div className="flex h-full items-center gap-2 text-xs font-semibold">
        <GripVertical className="h-4 w-4" />
        <span>{task.name}</span>
      </div>
    </div>
  );
}