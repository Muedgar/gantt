'use client';

import { useState } from 'react';
import {
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

type TaskStatus = 'Todo' | 'In Progress' | 'Blocked' | 'Done';

interface Task {
  id: number;
  name: string;
  owner: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  progress: number;
}

const LEFT_WIDTH = 360;
const DAY_WIDTH = 96;
const ROW_HEIGHT = 64;

const dates = [
  'Feb 15',
  'Feb 16',
  'Feb 17',
  'Feb 18',
  'Feb 19',
  'Feb 20',
  'Feb 21',
  'Feb 22',
  'Feb 23',
  'Feb 24',
  'Feb 25',
  'Feb 26',
  'Feb 27',
  'Feb 28',
  'Mar 01',
  'Mar 02',
];

const tasksData: Task[] = [
  { id: 1, name: 'Design System', owner: 'Alice', status: 'Done', startDate: 'Feb 15', endDate: 'Feb 17', progress: 100 },
  { id: 2, name: 'Frontend Setup', owner: 'Bob', status: 'In Progress', startDate: 'Feb 16', endDate: 'Feb 19', progress: 65 },
  { id: 3, name: 'Backend API', owner: 'Charlie', status: 'In Progress', startDate: 'Feb 17', endDate: 'Feb 21', progress: 40 },
  { id: 4, name: 'Database Design', owner: 'David', status: 'Todo', startDate: 'Feb 18', endDate: 'Feb 20', progress: 0 },
  { id: 5, name: 'UI Testing', owner: 'Eve', status: 'Blocked', startDate: 'Feb 19', endDate: 'Feb 22', progress: 0 },
  { id: 6, name: 'Documentation', owner: 'Alice', status: 'Todo', startDate: 'Feb 20', endDate: 'Feb 23', progress: 0 },
  { id: 7, name: 'Deployment', owner: 'Bob', status: 'Blocked', startDate: 'Feb 21', endDate: 'Feb 23', progress: 0 },
  { id: 8, name: 'Security Audit', owner: 'Charlie', status: 'Done', startDate: 'Feb 15', endDate: 'Feb 18', progress: 100 },
  { id: 9, name: 'Performance Tuning', owner: 'David', status: 'In Progress', startDate: 'Feb 18', endDate: 'Feb 22', progress: 30 },
];

const statusStyles = {
  Todo: {
    pill: 'bg-slate-100 text-slate-600',
    bar: 'bg-slate-400',
    progress: 'bg-white/35',
    icon: Clock,
  },
  'In Progress': {
    pill: 'bg-blue-100 text-blue-700',
    bar: 'bg-blue-500',
    progress: 'bg-white/35',
    icon: AlertCircle,
  },
  Blocked: {
    pill: 'bg-red-100 text-red-700',
    bar: 'bg-red-500',
    progress: 'bg-white/35',
    icon: XCircle,
  },
  Done: {
    pill: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500',
    progress: 'bg-white/35',
    icon: CheckCircle,
  },
};

export default function Two() {
  const [tasks] = useState(tasksData);
  const timelineWidth = dates.length * DAY_WIDTH;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 p-5">
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Toolbar */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Calendar className="h-5 w-5 text-blue-600" />
              Project Timeline
            </h1>
            <p className="text-xs text-slate-500">Scrollable Gantt calendar</p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
              Today: Feb 17
            </span>
            <span>{tasks.length} tasks</span>
          </div>
        </div>

        {/* Main scroll area */}
        <div className="flex-1 overflow-auto">
          <div
            className="relative"
            style={{ width: LEFT_WIDTH + timelineWidth }}
          >
            {/* Sticky Calendar Header */}
            <div className="sticky top-0 z-40 flex h-16 border-b border-slate-200 bg-white shadow-sm">
              {/* Sticky left header */}
              <div
                className="sticky left-0 z-50 grid h-full grid-cols-5 border-r border-slate-200 bg-slate-950 text-white"
                style={{ width: LEFT_WIDTH }}
              >
                <div className="col-span-2 flex items-center px-4 text-xs font-semibold uppercase tracking-wide">
                  Task
                </div>

                <div className="flex items-center gap-1 px-3 text-xs font-semibold uppercase tracking-wide">
                  <User className="h-3.5 w-3.5" />
                  Owner
                </div>

                <div className="col-span-2 flex items-center px-3 text-xs font-semibold uppercase tracking-wide">
                  Status
                </div>
              </div>

              {/* Calendar component */}
              <CalendarHeader />
            </div>

            {/* Rows */}
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex border-b border-slate-100"
                style={{ height: ROW_HEIGHT }}
              >
                <LeftTaskInfo task={task} />

                <TimelineRow task={task} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarHeader() {
  return (
    <div className="flex bg-slate-50">
      {dates.map((date, index) => {
        const isToday = date === 'Feb 17';
        const isWeekend = index === 6 || index === 7 || index === 13 || index === 14;
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

function TimelineRow({ task }: { task: Task }) {
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
      {/* Grid + weekend shading */}
      {dates.map((date, index) => {
        const isWeekend = index === 6 || index === 7 || index === 13 || index === 14;

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

      {/* Today line */}
      <div
        className="absolute top-0 z-20 h-full w-[3px] bg-blue-600"
        style={{ left: todayIndex * DAY_WIDTH + DAY_WIDTH / 2 }}
      />

      {/* Task bar */}
      <div
        className={`absolute top-3 h-10 rounded-xl px-3 text-white shadow-md ${
          statusStyles[task.status].bar
        }`}
        style={{ left, width }}
      >
        <div
          className={`absolute left-0 top-0 h-full rounded-xl ${
            statusStyles[task.status].progress
          }`}
          style={{ width: `${task.progress}%` }}
        />

        <div className="relative flex h-full items-center gap-2 overflow-hidden text-xs">
          <span className="truncate font-semibold">{task.name}</span>
          <span className="ml-auto shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
            {task.progress}%
          </span>
        </div>
      </div>
    </div>
  );
}