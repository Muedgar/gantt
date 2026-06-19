'use client'

// initial dates
const dates = ['Feb 15', 'Feb 16', 'Feb 17'];
// PAGE / EXERCISE ROOT
export default function One() {

  return (
    <div className="w-screen h-screen relative p-10 bg-amber-300">
      {/* 
        1. Give the page a full-screen or large app-like background.
        2. Add padding around the Gantt.
        3. Render the GanttShell component.
      */}

      <GanttShell />
    </div>
  )
}

// MAIN GANTT CONTAINER
const GanttShell = () => {
  return (
    <div className="w-[90%] h-[90%] bg-blue-500 rounded-2xl border overflow-hidden flex flex-col justify-center items-center">
      {/*
        GOAL:
        Make Header stay visible while BodyScroll scrolls vertically.

        Important changes:
        1. GanttShell should be flex flex-col.
        2. Header should have fixed height.
        3. BodyScroll should take remaining height with flex-1.
        4. Only BodyScroll should scroll.
      */}

      <Header />
      <BodyScroll />
    </div>
  )
}

// TOP HEADER ROW
const Header = () => {
  return (
    <div className="w-full h-10 flex flex-row justify-start">
      {/*
        1. This is the top row of the Gantt.
        2. It contains two parts:
           - LeftHeader
           - TimelineHeader

        3. Use grid or flex:
           - left side fixed width, example 320px
           - right side takes remaining space

        Visual structure:

        Header
        ├── LeftHeader      320px
        └── TimelineHeader  scrollable / wide
      */}

      <div className="w-[320px] h-full bg-black">
        <LeftHeader />
      </div>
      <div className="flex-1 h-full bg-fuchsia-700">
        <TimelineHeader />
      </div>
    </div>
  )
}

// LEFT HEADER ABOVE TASK LIST
const LeftHeader = () => {
  return (
    <div className="w-full h-full overflow-hidden grid grid-cols-4">
      {/*
        1. This is the header for the left task table.
        2. It should align with the task rows below.
        3. Add column labels like:
           - Task
           - Owner
           - Status

        Example visual:

        | Task Name          | Owner | Status |

        4. Give it the same height as TimelineHeader.
        5. Add border-right to separate left table from timeline.
      */}
      <div className="col-span-2 flex flex-row justify-start pl-2 items-center bg-amber-200">
        <p className="text-white">Task</p>
      </div>
      <div className="col-span-1 flex flex-row justify-start pl-2 items-center bg-sky-300">
        <p className="text-white">Owner</p>
      </div>
      <div className="col-span-1 flex flex-row justify-start pl-2 items-center caret-lime-100">
        <p className="text-white">Status</p>
      </div>
    </div>
  )
}

// RIGHT HEADER ABOVE TIMELINE GRID
const TimelineHeader = () => {
  return (
    <div className="w-full h-full bg-lime-300 flex flex-row justify-evenly items-center">
      {/*
        1. This displays the date columns.
        2. Create an array of dates first, example:
           ['Feb 15', 'Feb 16', 'Feb 17']

        3. Map over dates and render one cell per date.
        4. Each date cell must have the same width, example 40px.
        5. This width must later match the grid day cells in BodyScroll.

        Example visual:

        | Feb 15 | Feb 16 | Feb 17 | Feb 18 |

        6. This area should allow horizontal overflow later.
      */}
      {dates.map((date, index) => (
        <div key={index}>
          <p>{date}</p>
        </div>
      ))}
    </div>
  )
}

// SCROLLABLE BODY AREA
const BodyScroll = () => {
  return (
    <div className="w-full h-full bg-slate-200 flex flex-row overflow-scroll">
      {/*
        1. This contains all task rows.
        2. It should scroll vertically.
        3. Each row should contain:
           - left task info
           - right timeline row

        Visual structure:

        BodyScroll
        ├── Row
        │   ├── LeftTaskInfo
        │   └── TimelineRow
        ├── Row
        │   ├── LeftTaskInfo
        │   └── TimelineRow

        4. Use fake tasks first.
        5. Map over tasks.
        6. Every row must have the same height, example 44px.
        7. The left part width must match LeftHeader.
        8. The right part must match TimelineHeader width/date cells.

        Later:
        - timeline grid cells go here
        - task bars go here
        - hover states go here
      */}
      {/* Row */}
      <div className="w-full h-fit flex flex-col">
        {[1,2,3,4, 5, 6, 7, 8, 9].map((row, index) => (
        <div key={index} className="w-full h-50 flex flex-row">
        {/* left task info */}
        <div className="w-[320px] h-full bg-purple-300 border">
          <p className="text-white">{row}</p>
        </div>
        {/* timeline row */}
        <div className="flex-1 h-full bg-orange-800 border"></div>
      </div>
      ))}
      </div>
    </div>
  )
}