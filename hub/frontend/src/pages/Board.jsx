import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../services/api'
import TaskDetail from '../components/TaskDetail'
import {
  Plus, ArrowLeft, MoreHorizontal, X, GripVertical,
  AlertCircle, ChevronUp, Minus, ChevronDown, List, LayoutGrid,
} from 'lucide-react'

// ─── Priority helpers ──────────────────────────────────────────────────────────
const PRIORITY = {
  critica: { label: 'Crítica', color: '#EF4444' },
  alta:    { label: 'Alta',    color: '#F97316' },
  media:   { label: 'Média',  color: '#FFDF00' },
  baixa:   { label: 'Baixa',  color: '#009C3B' },
  none:    { label: 'Nenhuma',color: '#4A6B87' },
}

function PriorityIcon({ priority, size = 13 }) {
  const p = PRIORITY[priority] || PRIORITY.none
  const icons = { critica: AlertCircle, alta: ChevronUp, media: Minus, baixa: ChevronDown, none: Minus }
  const Icon = icons[priority] || Minus
  return <Icon size={size} color={p.color} />
}

// ─── Draggable Task Card ────────────────────────────────────────────────────────
function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `task-${task.id}` })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const subtasksDone = task.subtasks ? task.subtasks.filter(s => s.deleted_at == null && s.column_is_done).length : 0
  const subtasksTotal = task.subtasks ? task.subtasks.filter(s => s.deleted_at == null).length : 0
  const isOverdue = task.due_date && !task.column_is_done && new Date(task.due_date) < new Date()

  return (
    <div ref={setNodeRef} style={style} onClick={() => onClick(task)}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <span {...attributes} {...listeners} style={{ color: '#1a3a5c', cursor: 'grab', marginTop: 2, flexShrink: 0 }}>
            <GripVertical size={14} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, color: '#EEF2FF', lineHeight: 1.4, wordBreak: 'break-word' }}>{task.title}</p>

            {/* Labels */}
            {task.labels?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {task.labels.map(l => (
                  <span key={l.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: l.color + '33', color: l.color, fontWeight: 600 }}>
                    {l.name}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <PriorityIcon priority={task.priority} />

              {task.due_date && (
                <span style={{ fontSize: 11, color: isOverdue ? '#EF4444' : '#4A6B87' }}>
                  {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              )}

              {subtasksTotal > 0 && (
                <span style={{ fontSize: 11, color: subtasksDone === subtasksTotal ? '#009C3B' : '#4A6B87' }}>
                  ✓ {subtasksDone}/{subtasksTotal}
                </span>
              )}

              {/* Assignee avatars */}
              {task.assignees?.length > 0 && (
                <div style={{ display: 'flex', marginLeft: 'auto' }}>
                  {task.assignees.slice(0, 3).map(a => (
                    <div key={a.id} title={a.name || a.email}
                      style={{ width: 20, height: 20, borderRadius: '50%', background: '#112640', border: '1px solid #0d1e35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#FFDF00', marginLeft: -4 }}>
                      {(a.name || a.email).charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Droppable Column ───────────────────────────────────────────────────────────
function Column({ column, tasks, onAddTask, onTaskClick, onEditColumn, onDeleteColumn }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.id}` })
  const taskIds = tasks.map(t => `task-${t.id}`)

  return (
    <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Column header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '0 4px' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: column.color || '#4A6B87', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#EEF2FF', flex: 1 }}>{column.name}</span>
        <span style={{ fontSize: 11, color: '#4A6B87', background: '#112640', borderRadius: 20, padding: '1px 7px' }}>{tasks.length}</span>
        <button onClick={() => onAddTask(column.id)} style={iconBtn} title="Adicionar tarefa">
          <Plus size={14} />
        </button>
        <button onClick={() => { const name = prompt('Renomear coluna:', column.name); if (name) onEditColumn(column.id, name) }}
          style={iconBtn} title="Renomear">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Cards area */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} style={{
          flex: 1, minHeight: 100, borderRadius: 10, padding: '6px 4px',
          background: isOver ? '#06101e' : 'transparent',
          border: isOver ? '1px dashed #FFDF0055' : '1px dashed transparent',
          transition: 'all .15s',
        }}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </div>
      </SortableContext>

      <button onClick={() => onAddTask(column.id)} style={addCardBtn}>
        <Plus size={14} /> Adicionar tarefa
      </button>
    </div>
  )
}

// ─── Main Board component ──────────────────────────────────────────────────────
export default function Board() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [board, setBoard]     = useState(null)
  const [columns, setColumns] = useState([])
  const [tasks, setTasks]     = useState([])
  const [labels, setLabels]   = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState('kanban') // 'kanban' | 'list'
  const [activeTask, setActiveTask] = useState(null) // for DragOverlay
  const [selectedTask, setSelectedTask] = useState(null) // TaskDetail panel
  const [newColName, setNewColName] = useState('')
  const [showColForm, setShowColForm] = useState(false)
  const [filters, setFilters] = useState({ priority: '', search: '' })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/tf/boards/${id}`)
      setBoard(data)
      setColumns(data.columns || [])
      setTasks(data.tasks || [])
      setLabels(data.labels || [])
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  // ─── Filter tasks ──────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter(t => {
    if (filters.priority && t.priority !== filters.priority) return false
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const tasksByColumn = col => filteredTasks
    .filter(t => t.column_id === col.id && !t.parent_id)
    .sort((a, b) => a.position - b.position)

  // ─── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = ({ active }) => {
    const taskId = parseInt(active.id.toString().replace('task-', ''))
    setActiveTask(tasks.find(t => t.id === taskId) || null)
  }

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null)
    if (!over) return

    const taskId  = parseInt(active.id.toString().replace('task-', ''))
    const task    = tasks.find(t => t.id === taskId)
    if (!task) return

    let targetColId, targetPosition

    if (over.id.toString().startsWith('col-')) {
      // Dropped directly on column (empty area)
      targetColId = parseInt(over.id.toString().replace('col-', ''))
      const colTasks = tasks.filter(t => t.column_id === targetColId && !t.parent_id).sort((a, b) => a.position - b.position)
      targetPosition = colTasks.length ? colTasks[colTasks.length - 1].position + 1000 : 1000
    } else {
      // Dropped on another task
      const overId = parseInt(over.id.toString().replace('task-', ''))
      const overTask = tasks.find(t => t.id === overId)
      if (!overTask) return
      targetColId = overTask.column_id
      const colTasks = tasks.filter(t => t.column_id === targetColId && !t.parent_id).sort((a, b) => a.position - b.position)
      const idx = colTasks.findIndex(t => t.id === overId)
      const prev = colTasks[idx - 1]
      const next = colTasks[idx]
      if (prev && next) targetPosition = (prev.position + next.position) / 2
      else if (prev) targetPosition = prev.position + 1000
      else targetPosition = next ? next.position / 2 : 1000
    }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, column_id: targetColId, position: targetPosition } : t))

    try {
      await api.patch(`/tf/tasks/${taskId}/move`, { column_id: targetColId, position: targetPosition })
    } catch {
      load() // rollback
    }
  }

  // ─── Task actions ──────────────────────────────────────────────────────────
  const openAddTask = async (columnId) => {
    const title = prompt('Título da tarefa:')
    if (!title?.trim()) return
    try {
      const { data } = await api.post('/tf/tasks', { board_id: parseInt(id), column_id: columnId, title: title.trim() })
      setTasks(prev => [...prev, { ...data, assignees: [], labels: [], subtasks: [] }])
    } catch { }
  }

  const addColumn = async e => {
    e.preventDefault()
    if (!newColName.trim()) return
    try {
      const { data } = await api.post(`/tf/boards/${id}/columns`, { name: newColName.trim() })
      setColumns(prev => [...prev, data])
      setNewColName('')
      setShowColForm(false)
    } catch { }
  }

  const editColumn = async (colId, name) => {
    await api.put(`/tf/columns/${colId}`, { name })
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, name } : c))
  }

  const deleteColumn = async (colId) => {
    if (!confirm('Excluir coluna e todas as suas tarefas?')) return
    await api.delete(`/tf/columns/${colId}`)
    setColumns(prev => prev.filter(c => c.id !== colId))
    setTasks(prev => prev.filter(t => t.column_id !== colId))
  }

  const onTaskUpdate = (updated) => {
    if (updated === null) {
      // deleted
      setTasks(prev => prev.filter(t => t.id !== selectedTask?.id))
      setSelectedTask(null)
      return
    }
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
    setSelectedTask(prev => prev ? { ...prev, ...updated } : null)
  }

  // ─── List View ──────────────────────────────────────────────────────────────
  const ListView = () => (
    <div style={{ background: '#0d1e35', borderRadius: 14, border: '1px solid #1a3a5c', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1a3a5c' }}>
            {['Tarefa', 'Status', 'Prioridade', 'Responsáveis', 'Prazo'].map(h => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#4A6B87', fontWeight: 600, fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredTasks.filter(t => !t.parent_id).map(task => {
            const col = columns.find(c => c.id === task.column_id)
            const isOverdue = task.due_date && !col?.is_done && new Date(task.due_date) < new Date()
            return (
              <tr key={task.id} onClick={() => setSelectedTask(task)}
                style={{ borderBottom: '1px solid #1a3a5c', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#112640'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px', color: '#EEF2FF' }}>{task.title}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: (col?.color || '#4A6B87') + '33', color: col?.color || '#4A6B87' }}>
                    {col?.name || '—'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: PRIORITY[task.priority]?.color || '#4A6B87', fontSize: 12 }}>
                    <PriorityIcon priority={task.priority} /> {PRIORITY[task.priority]?.label}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex' }}>
                    {(task.assignees || []).slice(0, 3).map(a => (
                      <div key={a.id} title={a.name || a.email}
                        style={{ width: 22, height: 22, borderRadius: '50%', background: '#112640', border: '1px solid #0d1e35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#FFDF00', marginLeft: -4 }}>
                        {(a.name || a.email).charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: isOverdue ? '#EF4444' : '#4A6B87' }}>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  if (loading) return <div style={{ color: '#4A6B87' }}>Carregando board...</div>
  if (!board) return <div style={{ color: '#EF4444' }}>Board não encontrado.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/taskflow')} style={{ background: 'none', border: 'none', color: '#4A6B87', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
          <ArrowLeft size={16} /> Boards
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#EEF2FF', flex: 1 }}>{board.name}</h1>

        {/* Filters */}
        <input placeholder="Buscar tarefa..." value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          style={{ ...inp, width: 180 }} />
        <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))} style={{ ...inp, width: 140 }}>
          <option value="">Prioridade</option>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid #1a3a5c', borderRadius: 8, overflow: 'hidden' }}>
          {[['kanban', LayoutGrid], ['list', List]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ background: view === v ? '#112640' : 'transparent', border: 'none', color: view === v ? '#FFDF00' : '#4A6B87', cursor: 'pointer', padding: '7px 12px', display: 'flex', alignItems: 'center' }}>
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {view === 'list' ? <ListView /> : (
        /* ── Kanban view ── */
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', flex: 1, paddingBottom: 16, alignItems: 'flex-start' }}>
            {columns.sort((a, b) => a.position - b.position).map(col => (
              <Column key={col.id} column={col} tasks={tasksByColumn(col)}
                onAddTask={openAddTask} onTaskClick={setSelectedTask}
                onEditColumn={editColumn} onDeleteColumn={deleteColumn} />
            ))}

            {/* Add column */}
            <div style={{ width: 280, flexShrink: 0 }}>
              {showColForm ? (
                <form onSubmit={addColumn} style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 10, padding: 12 }}>
                  <input autoFocus style={{ ...inp, marginBottom: 8 }} placeholder="Nome da coluna"
                    value={newColName} onChange={e => setNewColName(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={{ ...btnSm, background: '#FFDF00', color: '#020c1b', fontWeight: 700 }}>Adicionar</button>
                    <button type="button" onClick={() => setShowColForm(false)} style={btnSm}><X size={14} /></button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowColForm(true)} style={addColBtn}>
                  <Plus size={16} /> Adicionar coluna
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeTask && (
              <div style={{ ...cardStyle, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', transform: 'rotate(2deg)' }}>
                <p style={{ fontSize: 13, color: '#EEF2FF' }}>{activeTask.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          board={board}
          columns={columns}
          labels={labels}
          onClose={() => setSelectedTask(null)}
          onUpdate={onTaskUpdate}
          onLabelsChange={setLabels}
        />
      )}
    </div>
  )
}

const cardStyle  = { background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 8, padding: '10px 12px', marginBottom: 6, cursor: 'pointer', transition: 'border-color .15s' }
const iconBtn    = { background: 'none', border: 'none', color: '#4A6B87', cursor: 'pointer', padding: 3, borderRadius: 4, display: 'flex', alignItems: 'center' }
const addCardBtn = { width: '100%', background: 'none', border: '1px dashed #1a3a5c', borderRadius: 8, color: '#4A6B87', cursor: 'pointer', padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, transition: 'all .15s' }
const addColBtn  = { width: '100%', background: 'none', border: '1px dashed #254d6e', borderRadius: 10, color: '#4A6B87', cursor: 'pointer', padding: '14px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const btnSm      = { background: '#112640', border: 'none', color: '#EEF2FF', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }
const inp        = { padding: '8px 12px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 8, color: '#EEF2FF', fontSize: 13, boxSizing: 'border-box' }
