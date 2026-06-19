'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  ReactFlowProvider,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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
  ChevronDown,
  ChevronRight,
  Clock,
  GripVertical,
  Maximize2,
  Minimize2,
  Move,
  Plus,
  Search,
  User,
  XCircle,
  ZoomIn,
  ZoomOut,
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
  parentId?: number;
  children?: Task[];
  isExpanded?: boolean;
};

type GroupBy = 'none' | 'status' | 'assignee';
type ZoomLevel = 'day' | 'week' | 'month';
type ResizeMode = 'left' | 'right' | null;
type Dependency = { from: number; to: number };
type TaskLayout = { task: Task; top: number; height: number };

const LEFT_WIDTH = 360;
const ROW_HEIGHT = 64;
const GROUP_HEADER_HEIGHT = 32;
const TIMELINE_HEADER_HEIGHT = 96;

const dates = [
  'Feb 15', 'Feb 16', 'Feb 17', 'Feb 18',
  'Feb 19', 'Feb 20', 'Feb 21', 'Feb 22',
  'Feb 23', 'Feb 24', 'Feb 25', 'Feb 26',
  'Feb 27', 'Feb 28', 'Mar 01', 'Mar 02',
];

// Parent tasks with children
const initialTasks: Task[] = [
  { 
    id: 1, 
    name: '📦 Design System', 
    owner: 'Alice', 
    status: 'Done', 
    startDate: 'Feb 15', 
    endDate: 'Feb 17', 
    progress: 100,
    isExpanded: true,
    children: [
      { id: 101, name: 'UI Kit', owner: 'Alice', status: 'Done', startDate: 'Feb 15', endDate: 'Feb 16', progress: 100 },
      { id: 102, name: 'Components', owner: 'Alice', status: 'Done', startDate: 'Feb 16', endDate: 'Feb 17', progress: 100 },
    ]
  },
  { 
    id: 2, 
    name: '🚀 Frontend Setup', 
    owner: 'Bob', 
    status: 'In Progress', 
    startDate: 'Feb 16', 
    endDate: 'Feb 19', 
    progress: 65,
    isExpanded: true,
    children: [
      { id: 201, name: 'React Config', owner: 'Bob', status: 'In Progress', startDate: 'Feb 16', endDate: 'Feb 17', progress: 90 },
      { id: 202, name: 'State Management', owner: 'Bob', status: 'In Progress', startDate: 'Feb 17', endDate: 'Feb 19', progress: 50 },
    ]
  },
  { 
    id: 3, 
    name: '⚙️ Backend API', 
    owner: 'Charlie', 
    status: 'In Progress', 
    startDate: 'Feb 17', 
    endDate: 'Feb 21', 
    progress: 40,
    isExpanded: false,
    children: [
      { id: 301, name: 'API Routes', owner: 'Charlie', status: 'In Progress', startDate: 'Feb 17', endDate: 'Feb 19', progress: 60 },
      { id: 302, name: 'Database Integration', owner: 'Charlie', status: 'Todo', startDate: 'Feb 19', endDate: 'Feb 21', progress: 20 },
    ]
  },
  { 
    id: 4, 
    name: '🗄️ Database Design', 
    owner: 'David', 
    status: 'Todo', 
    startDate: 'Feb 18', 
    endDate: 'Feb 20', 
    progress: 0,
    children: [
      { id: 401, name: 'Schema Design', owner: 'David', status: 'Todo', startDate: 'Feb 18', endDate: 'Feb 19', progress: 0 },
      { id: 402, name: 'Migrations', owner: 'David', status: 'Todo', startDate: 'Feb 19', endDate: 'Feb 20', progress: 0 },
    ]
  },
  { id: 5, name: '🧪 UI Testing', owner: 'Eve', status: 'Blocked', startDate: 'Feb 19', endDate: 'Feb 22', progress: 0 },
  { id: 10, name: '🎯 Launch', owner: 'Team', status: 'Todo', startDate: 'Feb 28', endDate: 'Feb 28', progress: 0, isMilestone: true },
];

// Dependencies between tasks
const initialDependencies: Dependency[] = [
  { from: 101, to: 201 },
  { from: 201, to: 301 },
  { from: 202, to: 401 },
  { from: 401, to: 5 },
];

const statusStyles = {
  Todo: {
    pill: 'bg-slate-100 text-slate-600',
    bar: 'bg-slate-400 hover:bg-slate-500',
    progress: 'bg-white/35',
    icon: Clock,
    border: 'border-slate-400',
  },
  'In Progress': {
    pill: 'bg-blue-100 text-blue-700',
    bar: 'bg-blue-500 hover:bg-blue-600',
    progress: 'bg-white/35',
    icon: AlertCircle,
    border: 'border-blue-500',
  },
  Blocked: {
    pill: 'bg-red-100 text-red-700',
    bar: 'bg-red-500 hover:bg-red-600',
    progress: 'bg-white/35',
    icon: XCircle,
    border: 'border-red-500',
  },
  Done: {
    pill: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500 hover:bg-emerald-600',
    progress: 'bg-white/35',
    icon: CheckCircle,
    border: 'border-emerald-500',
  },
};

// React Flow Dependency Graph Component
function DependencyGraph({ tasks, dependencies, onDependencyAdd }: { 
  tasks: Task[], 
  dependencies: Dependency[],
  onDependencyAdd: (from: number, to: number) => void 
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  useEffect(() => {
    // Create nodes from tasks
    const flowNodes: Node[] = tasks.map((task, index) => ({
      id: `node-${task.id}`,
      type: 'default',
      position: { 
        x: 100 + (index % 5) * 150, 
        y: Math.floor(index / 5) * 100 
      },
      data: { 
        label: task.name,
        status: task.status,
      },
      style: {
        background: statusStyles[task.status].bar,
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 'bold',
        border: selectedNode === task.id ? '3px solid #3b82f6' : 'none',
        cursor: 'pointer',
      },
    }));

    // Create edges from dependencies
    const flowEdges: Edge[] = dependencies.map((dep, index) => ({
      id: `edge-${index}`,
      source: `node-${dep.from}`,
      target: `node-${dep.to}`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6b7280', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6b7280',
      },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [tasks, dependencies, selectedNode]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    const taskId = parseInt(node.id.replace('node-', ''));
    setSelectedNode(selectedNode === taskId ? null : taskId);
  };

  return (
    <div className="h-[300px] w-full border-t border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Move className="h-4 w-4" />
          Dependency Graph
          <span className="text-xs font-normal text-slate-500">
            ({dependencies.length} dependencies)
          </span>
        </h3>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Click node to select</span>
          <button
            onClick={() => onDependencyAdd(1, 2)}
            className="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
          >
            + Add Dep
          </button>
        </div>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.5}
        maxZoom={2}
      />
    </div>
  );
}

function TimelineDependencyLines({
  dependencies,
  taskLayout,
  DAY_WIDTH,
  width,
  height,
}: {
  dependencies: Dependency[];
  taskLayout: TaskLayout[];
  DAY_WIDTH: number;
  width: number;
  height: number;
}) {
  const taskLayoutById = useMemo(
    () => new Map(taskLayout.map((entry) => [entry.task.id, entry])),
    [taskLayout],
  );

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  dependencies.forEach((dependency, index) => {
    const sourceLayout = taskLayoutById.get(dependency.from);
    const targetLayout = taskLayoutById.get(dependency.to);

    if (!sourceLayout || !targetLayout) {
      return;
    }

    const sourceEndIndex = dates.indexOf(sourceLayout.task.endDate);
    const targetStartIndex = dates.indexOf(targetLayout.task.startDate);

    if (sourceEndIndex === -1 || targetStartIndex === -1) {
      return;
    }

    const sourceId = `dependency-source-${dependency.from}-${index}`;
    const targetId = `dependency-target-${dependency.to}-${index}`;

    nodes.push(
      {
        id: sourceId,
        position: {
          x: (sourceEndIndex + 1) * DAY_WIDTH - 10,
          y: sourceLayout.top + sourceLayout.height / 2,
        },
        data: {},
        sourcePosition: Position.Right,
        style: {
          width: 1,
          height: 1,
          border: 0,
          padding: 0,
          opacity: 0,
          pointerEvents: 'none',
        },
      },
      {
        id: targetId,
        position: {
          x: targetStartIndex * DAY_WIDTH + 10,
          y: targetLayout.top + targetLayout.height / 2,
        },
        data: {},
        targetPosition: Position.Left,
        style: {
          width: 1,
          height: 1,
          border: 0,
          padding: 0,
          opacity: 0,
          pointerEvents: 'none',
        },
      },
    );

    edges.push({
      id: `timeline-dependency-${dependency.from}-${dependency.to}-${index}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: '#2563eb',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#2563eb',
        width: 18,
        height: 18,
      },
    });
  });

  if (edges.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: LEFT_WIDTH,
        top: TIMELINE_HEADER_HEIGHT,
        width,
        height,
      }}
      aria-hidden="true"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
}

export default function Part_3_1() {
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [dependencies, setDependencies] = useState(initialDependencies);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [resizeMode, setResizeMode] = useState<ResizeMode>(null);
  const [snapIndex, setSnapIndex] = useState<number | null>(null);
  const [invalidDrop, setInvalidDrop] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('day');
  const [compactMode, setCompactMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState({ start: 0, end: dates.length - 1 });
  const [showDependencies, setShowDependencies] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate DAY_WIDTH based on zoom level
  const getDayWidth = () => {
    switch (zoomLevel) {
      case 'day': return 96;
      case 'week': return 160;
      case 'month': return 240;
      default: return 96;
    }
  };

  const DAY_WIDTH = getDayWidth();
  const timelineWidth = dates.length * DAY_WIDTH;

  // Get visible tasks based on search and grouping
  const getVisibleTasks = (): Task[] => {
    let allTasks: Task[] = [];
    
    const flattenTasks = (taskList: Task[]): Task[] => {
      let flat: Task[] = [];
      taskList.forEach(task => {
        flat.push(task);
        if (task.children && task.isExpanded) {
          flat = flat.concat(flattenTasks(task.children));
        }
      });
      return flat;
    };

    allTasks = flattenTasks(tasks);

    if (searchQuery) {
      allTasks = allTasks.filter(task => 
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.status.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return allTasks;
  };

  const visibleTasks = getVisibleTasks();

  // Group tasks
  const getGroupedTasks = () => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Tasks', tasks: visibleTasks }];
    }

    const groups: Record<string, Task[]> = {};
    visibleTasks.forEach(task => {
      const key = groupBy === 'status' ? task.status : task.owner;
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    return Object.entries(groups).map(([key, tasks]) => ({
      key,
      label: key,
      tasks,
    }));
  };

  const groupedTasks = getGroupedTasks();
  const rowHeight = compactMode ? ROW_HEIGHT * 0.7 : ROW_HEIGHT;
  const taskLayout = useMemo(() => {
    let top = 0;

    return groupedTasks.flatMap((group) => {
      if (groupBy !== 'none') {
        top += GROUP_HEADER_HEIGHT;
      }

      return group.tasks.map((task) => {
        const entry = { task, top, height: rowHeight };
        top += rowHeight;
        return entry;
      });
    });
  }, [groupBy, groupedTasks, rowHeight]);
  const taskAreaHeight = taskLayout.reduce((height, entry) => (
    Math.max(height, entry.top + entry.height)
  ), 0);

  // Toggle task expansion
  const toggleTask = (taskId: number) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return { ...task, isExpanded: !task.isExpanded };
      }
      if (task.children) {
        return { ...task, children: task.children.map(child => 
          child.id === taskId ? { ...child, isExpanded: !child.isExpanded } : child
        )};
      }
      return task;
    }));
  };

  // Handle task resize
  const handleResize = (task: Task, mode: ResizeMode, newDateIndex: number) => {
    const startIndex = dates.indexOf(task.startDate);
    const endIndex = dates.indexOf(task.endDate);
    
    let newStartIndex = startIndex;
    let newEndIndex = endIndex;

    if (mode === 'left') {
      newStartIndex = Math.max(0, Math.min(newDateIndex, endIndex - 1));
    } else if (mode === 'right') {
      newEndIndex = Math.max(startIndex + 1, Math.min(newDateIndex, dates.length - 1));
    }

    if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
      const updateTask = (taskList: Task[]): Task[] => {
        return taskList.map(t => {
          if (t.id === task.id) {
            return {
              ...t,
              startDate: dates[newStartIndex],
              endDate: dates[newEndIndex],
            };
          }
          if (t.children) {
            return { ...t, children: updateTask(t.children) };
          }
          return t;
        });
      };
      setTasks(updateTask(tasks));
    }
  };

  // Add dependency
  const handleAddDependency = (from: number, to: number) => {
    setDependencies([...dependencies, { from, to }]);
  };

  if (!mounted) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const task = visibleTasks.find((t) => `task-${t.id}` === event.active.id);
        setActiveTask(task ?? null);
      }}
      onDragMove={(event) => {
        if (!activeTask) return;
        const movedDays = Math.round(event.delta.x / DAY_WIDTH);
        const nextStartIndex = dates.indexOf(activeTask.startDate) + movedDays;
        setSnapIndex(Math.max(0, Math.min(nextStartIndex, dates.length - 1)));
        setInvalidDrop(nextStartIndex < 0 || nextStartIndex >= dates.length);
      }}
      onDragEnd={(event) => {
        if (!activeTask) return;
        const movedDays = Math.round(event.delta.x / DAY_WIDTH);
        const nextStartIndex = dates.indexOf(activeTask.startDate) + movedDays;
        const nextEndIndex = nextStartIndex + (dates.indexOf(activeTask.endDate) - dates.indexOf(activeTask.startDate));

        if (nextStartIndex >= 0 && nextEndIndex < dates.length) {
          const updateTask = (taskList: Task[]): Task[] => {
            return taskList.map(task => {
              if (task.id === activeTask.id) {
                return {
                  ...task,
                  startDate: dates[nextStartIndex],
                  endDate: dates[nextEndIndex],
                };
              }
              if (task.children) {
                return { ...task, children: updateTask(task.children) };
              }
              return task;
            });
          };
          setTasks(updateTask(tasks));
        }

        setActiveTask(null);
        setSnapIndex(null);
        setInvalidDrop(false);
      }}
    >
      <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 p-5">
        <div className={`flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl ${
          showGraph ? 'pb-0' : ''
        }`}>
          {/* Toolbar */}
          <div className="flex h-20 shrink-0 flex-wrap items-center justify-between border-b border-slate-200 bg-white px-6 gap-2">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <Calendar className="h-5 w-5 text-blue-600" />
                Project Timeline
              </h1>
              <p className="text-xs text-slate-500">
                {visibleTasks.length} tasks • {groupedTasks.length} groups • {dependencies.length} dependencies
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex rounded-lg border border-slate-200 p-0.5">
                <button
                  onClick={() => setZoomLevel('day')}
                  className={`px-2 py-1 text-xs rounded ${
                    zoomLevel === 'day' ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setZoomLevel('week')}
                  className={`px-2 py-1 text-xs rounded ${
                    zoomLevel === 'week' ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setZoomLevel('month')}
                  className={`px-2 py-1 text-xs rounded ${
                    zoomLevel === 'month' ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  Month
                </button>
              </div>

              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="none">No Group</option>
                <option value="status">Group by Status</option>
                <option value="assignee">Group by Assignee</option>
              </select>

              <button
                onClick={() => setCompactMode(!compactMode)}
                className={`rounded-lg border p-1.5 transition-colors ${
                  compactMode ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'
                }`}
                title="Toggle compact mode"
              >
                {compactMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setShowDependencies(!showDependencies)}
                className={`rounded-lg border p-1.5 transition-colors ${
                  showDependencies ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'
                }`}
                title="Toggle dependency lines"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => setShowGraph(!showGraph)}
                className={`rounded-lg border p-1.5 transition-colors ${
                  showGraph ? 'bg-blue-500 text-white' : 'hover:bg-slate-100'
                }`}
                title="Toggle dependency graph"
              >
                <Move className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main scroll area */}
          <div className="flex-1 overflow-auto" ref={containerRef}>
            <div
              className="relative"
              style={{ width: LEFT_WIDTH + timelineWidth }}
            >
              {showDependencies && (
                <TimelineDependencyLines
                  dependencies={dependencies}
                  taskLayout={taskLayout}
                  DAY_WIDTH={DAY_WIDTH}
                  width={timelineWidth}
                  height={taskAreaHeight}
                />
              )}

              {/* Header */}
              <div className="sticky top-0 z-40 flex h-16 border-b border-slate-200 bg-white shadow-sm">
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
                <CalendarHeader zoomLevel={zoomLevel} DAY_WIDTH={DAY_WIDTH} />
              </div>

              {/* Date range navigator */}
              <div className="sticky top-16 z-30 flex h-8 items-center justify-between bg-white/90 px-4 backdrop-blur-sm border-b border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <button className="p-1 hover:bg-slate-100 rounded">
                    <ChevronRight className="h-3 w-3 rotate-180" />
                  </button>
                  <span className="font-medium">{dates[dateRange.start]} - {dates[dateRange.end]}</span>
                  <button className="p-1 hover:bg-slate-100 rounded">
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Today: Feb 17</span>
                </div>
              </div>

              {/* Tasks */}
              {groupedTasks.length === 0 ? (
                <EmptyState />
              ) : (
                groupedTasks.map((group) => (
                  <div key={group.key}>
                    {/* Group header */}
                    {groupBy !== 'none' && (
                      <div className="sticky left-0 z-20 flex h-8 items-center bg-slate-100 px-4 border-b border-slate-200">
                        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          {group.label} ({group.tasks.length})
                        </h3>
                      </div>
                    )}

                    {group.tasks.map((task, index) => {
                      const isParent = Boolean(task.children?.length);
                      const isSelected = selectedTaskIds.includes(task.id);
                      const isHovered = hoveredTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          className={`flex border-b border-slate-100 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                          } ${
                            isHovered ? 'bg-blue-50' : ''
                          } ${
                            isSelected ? 'bg-blue-100' : ''
                          } hover:bg-blue-50`}
                          style={{ height: compactMode ? ROW_HEIGHT * 0.7 : ROW_HEIGHT }}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              toggleTask(task.id);
                            }
                          }}
                          tabIndex={0}
                          role="row"
                        >
                          <LeftTaskInfo
                            task={task}
                            isParent={isParent}
                            isExpanded={task.isExpanded}
                            onToggle={() => toggleTask(task.id)}
                            compactMode={compactMode}
                          />

                          <TimelineRow
                            task={task}
                            snapIndex={snapIndex}
                            invalidDrop={invalidDrop && activeTask?.id === task.id}
                            DAY_WIDTH={DAY_WIDTH}
                            zoomLevel={zoomLevel}
                            compactMode={compactMode}
                            isSelected={isSelected}
                            isHovered={isHovered}
                            onSelect={() => {
                              setSelectedTaskIds(prev =>
                                prev.includes(task.id)
                                  ? prev.filter(id => id !== task.id)
                                  : [...prev, task.id]
                              );
                            }}
                            onResize={handleResize}
                            onResizeStart={(mode) => setResizeMode(mode)}
                            onResizeEnd={() => setResizeMode(null)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dependency Graph using React Flow */}
          {showGraph && (
            <ReactFlowProvider>
              <DependencyGraph 
                tasks={visibleTasks} 
                dependencies={dependencies}
                onDependencyAdd={handleAddDependency}
              />
            </ReactFlowProvider>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? <GhostTaskBar task={activeTask} DAY_WIDTH={DAY_WIDTH} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function CalendarHeader({ zoomLevel, DAY_WIDTH }: { zoomLevel: ZoomLevel; DAY_WIDTH: number }) {
  const getDateDisplay = (date: string) => {
    const [month, day] = date.split(' ');
    
    if (zoomLevel === 'day') {
      return { month, day, showDay: true, showMonth: true };
    } else if (zoomLevel === 'week') {
      const weekNumber = Math.floor(dates.indexOf(date) / 7) + 1;
      return { month: `Week ${weekNumber}`, day: `${day}`, showDay: true, showMonth: true };
    } else {
      return { month, day: day + ' (Month)', showDay: true, showMonth: true };
    }
  };

  return (
    <div className="flex bg-slate-50">
      {dates.map((date, index) => {
        const isToday = date === 'Feb 17';
        const isWeekend = index === 6 || index === 7 || index === 13 || index === 14;
        const display = getDateDisplay(date);

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
              {display.month}
            </span>
            {display.showDay && (
              <span
                className={`text-sm font-bold ${
                  isToday ? 'text-blue-700' : 'text-slate-900'
                }`}
              >
                {display.day}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LeftTaskInfo({ 
  task, 
  isParent, 
  isExpanded, 
  onToggle,
  compactMode 
}: { 
  task: Task; 
  isParent: boolean; 
  isExpanded?: boolean; 
  onToggle: () => void;
  compactMode: boolean;
}) {
  const Icon = statusStyles[task.status].icon;

  return (
    <div
      className="sticky left-0 z-30 grid grid-cols-5 border-r border-slate-200 bg-white shadow-sm"
      style={{ width: LEFT_WIDTH }}
    >
      <div className="col-span-2 flex items-center px-4 gap-1">
        {isParent && (
          <button
            onClick={onToggle}
            className="p-0.5 hover:bg-slate-200 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
          </button>
        )}
        <p className={`truncate font-semibold text-slate-800 ${compactMode ? 'text-xs' : 'text-sm'}`}>
          {task.isMilestone && '◆ '}
          {task.name}
        </p>
      </div>

      <div className="flex items-center px-3">
        <p className={`truncate text-slate-500 ${compactMode ? 'text-[10px]' : 'text-xs'}`}>
          {task.owner}
        </p>
      </div>

      <div className="col-span-2 flex items-center px-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
            statusStyles[task.status].pill
          } ${compactMode ? 'text-[10px]' : 'text-xs'}`}
        >
          <Icon className={`${compactMode ? 'h-2 w-2' : 'h-3 w-3'}`} />
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
  DAY_WIDTH,
  zoomLevel,
  compactMode,
  isSelected,
  isHovered,
  onSelect,
  onResize,
  onResizeStart,
  onResizeEnd,
}: {
  task: Task;
  snapIndex: number | null;
  invalidDrop: boolean;
  DAY_WIDTH: number;
  zoomLevel: ZoomLevel;
  compactMode: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onResize: (task: Task, mode: 'left' | 'right', dateIndex: number) => void;
  onResizeStart: (mode: 'left' | 'right') => void;
  onResizeEnd: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startIndex = dates.indexOf(task.startDate);
  const endIndex = dates.indexOf(task.endDate);
  const duration = endIndex - startIndex + 1;

  const left = startIndex * DAY_WIDTH + 10;
  const width = duration * DAY_WIDTH - 20;
  const todayIndex = dates.indexOf('Feb 17');

  const rowHeight = compactMode ? ROW_HEIGHT * 0.7 : ROW_HEIGHT;
  const barHeight = compactMode ? 28 : 40;

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, mode: 'left' | 'right') => {
    e.stopPropagation();
    const rowElement = rowRef.current;

    if (!rowElement) {
      return;
    }

    onResizeStart(mode);
    
    const handleMouseMove = (ev: MouseEvent) => {
      const rect = rowElement.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const dateIndex = Math.floor((x - 10) / DAY_WIDTH);
      const clampedIndex = Math.max(0, Math.min(dateIndex, dates.length - 1));
      onResize(task, mode, clampedIndex);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      onResizeEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={rowRef}
      className="relative flex"
      style={{ width: dates.length * DAY_WIDTH, height: rowHeight }}
      onClick={onSelect}
      role="gridcell"
    >
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

      {/* Snap indicator */}
      {snapIndex !== null && (
        <div
          className="absolute top-0 z-30 h-full w-[3px] bg-violet-600 animate-pulse"
          style={{ left: snapIndex * DAY_WIDTH + DAY_WIDTH / 2 }}
        />
      )}

      {/* Invalid drop warning */}
      {invalidDrop && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-red-500/10">
          <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-xl animate-bounce">
            <AlertTriangle className="h-4 w-4" />
            Invalid drop
          </div>
        </div>
      )}

      {/* Task bar or milestone */}
      {task.isMilestone || startIndex === endIndex ? (
        <MilestoneDiamond
          task={task}
          left={left}
          DAY_WIDTH={DAY_WIDTH}
          compactMode={compactMode}
          isSelected={isSelected}
          isHovered={isHovered}
        />
      ) : (
        <TaskBar
          task={task}
          left={left}
          width={width}
          barHeight={barHeight}
          compactMode={compactMode}
          isSelected={isSelected}
          isHovered={isHovered}
          onResizeStart={handleResizeStart}
        />
      )}
    </div>
  );
}

function TaskBar({
  task,
  left,
  width,
  barHeight,
  compactMode,
  isSelected,
  isHovered,
  onResizeStart,
}: {
  task: Task;
  left: number;
  width: number;
  barHeight: number;
  compactMode: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onResizeStart: (e: React.MouseEvent, mode: 'left' | 'right') => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task-${task.id}`,
    });

  return (
    <div
      ref={setNodeRef}
      className={`group absolute z-10 rounded-xl text-white shadow-md transition-all duration-200 ${
        statusStyles[task.status].bar
      } ${
        isDragging ? 'opacity-30 outline outline-2 outline-blue-400' : ''
      } ${
        isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''
      } ${
        isHovered ? 'shadow-xl' : ''
      }`}
      style={{
        left,
        width,
        height: barHeight,
        top: compactMode ? 6 : 12,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Progress fill */}
      <div
        className="absolute left-0 top-0 h-full rounded-xl bg-white/30 transition-all duration-300"
        style={{ width: `${task.progress}%` }}
      />

      {/* Resize handles - Left */}
      {isHovered && !isDragging && (
        <button
          type="button"
          className="absolute left-0 top-0 z-20 flex h-full w-6 items-center justify-center rounded-l-xl bg-black/10 hover:bg-black/20 transition-colors cursor-ew-resize"
          aria-label="Resize left"
          onMouseDown={(e) => onResizeStart(e, 'left')}
        >
          <span className="h-5 w-0.5 rounded bg-white/60" />
        </button>
      )}

      {/* Resize handles - Right */}
      {isHovered && !isDragging && (
        <button
          type="button"
          className="absolute right-0 top-0 z-20 flex h-full w-6 items-center justify-center rounded-r-xl bg-black/10 hover:bg-black/20 transition-colors cursor-ew-resize"
          aria-label="Resize right"
          onMouseDown={(e) => onResizeStart(e, 'right')}
        >
          <span className="h-5 w-0.5 rounded bg-white/60" />
        </button>
      )}

      {/* Drag handle */}
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="absolute left-6 top-0 z-20 flex h-full w-6 items-center justify-center cursor-grab active:cursor-grabbing"
        aria-label="Drag task"
      >
        <GripVertical className={`${compactMode ? 'h-3 w-3' : 'h-4 w-4'} opacity-80`} />
      </button>

      {/* Content */}
      <div className={`relative flex h-full items-center gap-2 overflow-hidden px-14 ${
        compactMode ? 'text-[10px]' : 'text-xs'
      }`}>
        <Move className={`${compactMode ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} opacity-70`} />
        <span className="truncate font-semibold">{task.name}</span>
        <span className="ml-auto shrink-0 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
          {task.progress}%
        </span>
      </div>

      {/* Progress handle */}
      {isHovered && task.progress > 0 && task.progress < 100 && (
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white bg-blue-600 shadow-lg"
          style={{ left: `calc(${task.progress}% - 8px)` }}
          title="Drag to adjust progress"
        />
      )}

      {/* Tooltip */}
      {isHovered && (
        <div className="pointer-events-none absolute left-1/2 top-0 z-50 w-64 -translate-x-1/2 -translate-y-[115%] rounded-xl bg-slate-950 p-3 text-xs text-white shadow-2xl">
          <p className="mb-2 font-bold">{task.name}</p>
          <p>Start: {task.startDate}</p>
          <p>End: {task.endDate}</p>
          <p>Progress: {task.progress}%</p>
          <p>Assignee: {task.owner}</p>
          <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rotate-45 bg-slate-950" />
        </div>
      )}
    </div>
  );
}

function MilestoneDiamond({
  task,
  left,
  DAY_WIDTH,
  compactMode,
  isSelected,
  isHovered,
}: {
  task: Task;
  left: number;
  DAY_WIDTH: number;
  compactMode: boolean;
  isSelected: boolean;
  isHovered: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task-${task.id}`,
    });

  const size = compactMode ? 24 : 32;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group absolute z-20 cursor-grab shadow-md transition-all hover:shadow-xl active:cursor-grabbing ${
        statusStyles[task.status].bar
      } ${isDragging ? 'opacity-30' : ''} ${
        isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''
      } ${isHovered ? 'scale-110' : ''}`}
      style={{
        left: left + DAY_WIDTH / 2 - size / 2,
        top: compactMode ? 4 : 16,
        width: size,
        height: size,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(45deg)`
          : 'rotate(45deg)',
      }}
    >
      <div className="flex h-full w-full -rotate-45 items-center justify-center text-white">
        <span className={compactMode ? 'text-xs' : 'text-sm'}>★</span>
      </div>

      {isHovered && (
        <div className="pointer-events-none absolute left-1/2 top-0 z-50 w-64 -translate-x-1/2 -translate-y-[115%] rounded-xl bg-slate-950 p-3 text-xs text-white shadow-2xl">
          <p className="mb-2 font-bold">{task.name}</p>
          <p>Date: {task.startDate}</p>
          <p>Assignee: {task.owner}</p>
          <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rotate-45 bg-slate-950" />
        </div>
      )}
    </div>
  );
}

function GhostTaskBar({ task, DAY_WIDTH }: { task: Task; DAY_WIDTH: number }) {
  return (
    <div
      className={`h-10 rounded-xl border-2 border-dashed border-white/70 px-4 text-white shadow-2xl ${
        statusStyles[task.status].bar
      }`}
      style={{ width: DAY_WIDTH * 2 }}
    >
      <div className="flex h-full items-center gap-2 text-xs font-semibold">
        <GripVertical className="h-4 w-4" />
        <span>{task.name}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-64 flex-col items-center justify-center text-slate-400">
      <Search className="h-12 w-12 mb-4" />
      <h3 className="text-lg font-semibold text-slate-600">No tasks match your filters</h3>
      <p className="text-sm">Try adjusting your search or filter criteria</p>
      <button className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 transition-colors">
        <Plus className="inline h-4 w-4 mr-1" />
        Add Task
      </button>
    </div>
  );
}
