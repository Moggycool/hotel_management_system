import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  User,
  Flame,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { HousekeepingStatus, HousekeepingTask, MaintenanceTicket } from '../../types/hotel';

export const HousekeepingTab: React.FC = () => {
  const {
    housekeepingTasks,
    maintenanceTickets,
    rooms,
    updateHousekeepingStatus,
    createHousekeepingTask,
    createMaintenanceTicket,
    updateMaintenanceStatus,
  } = useHotel();

  // State for creating new task or ticket
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [taskRoomId, setTaskRoomId] = useState(rooms[0]?.id || '');
  const [taskPriority, setTaskPriority] = useState<HousekeepingTask['priority']>('normal');
  const [taskNotes, setTaskNotes] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskSaveError, setTaskSaveError] = useState('');

  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [maintRoomId, setMaintRoomId] = useState(rooms[0]?.id || '');
  const [maintTitle, setMaintTitle] = useState('');
  const [maintCategory, setMaintCategory] = useState<MaintenanceTicket['category']>('Plumbing');
  const [maintPriority, setMaintPriority] = useState<MaintenanceTicket['priority']>('medium');
  const [maintNotes, setMaintNotes] = useState('');

  useEffect(() => {
    if (!rooms.some((room) => room.id === taskRoomId)) {
      setTaskRoomId(rooms[0]?.id || '');
    }
  }, [rooms, taskRoomId]);

  const columns: { id: HousekeepingStatus; title: string; color: string; bg: string }[] = [
    { id: 'dirty', title: 'Needs Cleaning', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
    { id: 'in_progress', title: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    { id: 'inspection_needed', title: 'Awaiting Inspection', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    { id: 'clean', title: 'Clean & Ready', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  ];

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = rooms.find((r) => r.id === taskRoomId);
    if (!targetRoom) return;

    setIsSavingTask(true);
    setTaskSaveError('');
    const created = await createHousekeepingTask({
      roomId: targetRoom.id,
      roomNumber: targetRoom.roomNumber,
      roomType: targetRoom.type,
      status: 'dirty',
      priority: taskPriority,
      notes: taskNotes,
    });
    if (created) {
      setTaskNotes('');
      setIsNewTaskOpen(false);
    } else {
      setTaskSaveError('The task could not be saved. Check the authenticated backend connection and room selection.');
    }
    setIsSavingTask(false);
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = rooms.find((r) => r.id === maintRoomId);
    if (!targetRoom || !maintTitle) return;

    createMaintenanceTicket({
      roomId: targetRoom.id,
      roomNumber: targetRoom.roomNumber,
      title: maintTitle,
      category: maintCategory,
      priority: maintPriority,
      status: 'open',
      reportedBy: 'Front Desk / Housekeeping',
      notes: maintNotes,
    });
    setMaintTitle('');
    setMaintNotes('');
    setIsNewTicketOpen(false);
  };

  const getPriorityBadge = (p: HousekeepingTask['priority']) => {
    switch (p) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200 font-bold';
      case 'normal':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'low':
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Housekeeping & Facilities Operations
          </h2>
          <p className="text-xs text-slate-500">
            Room cleanliness status, turnover queue, and maintenance work orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewTicketOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5 text-rose-600" />
            <span>New Work Order</span>
          </button>
          <button
            onClick={() => setIsNewTaskOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Dispatch Housekeeping</span>
          </button>
        </div>
      </div>

      {/* Housekeeping Board Columns */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Turnover & Cleanliness Kanban
          </h3>
          <span className="text-xs text-slate-500">
            {housekeepingTasks.length} tasks logged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const tasksInCol = housekeepingTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-slate-50/80 rounded-xl border border-slate-200/90 flex flex-col min-h-[420px]"
              >
                {/* Column Header */}
                <div className={`p-3.5 border-b border-slate-200 rounded-t-xl flex items-center justify-between ${col.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold tracking-tight ${col.color}`}>
                      {col.title}
                    </span>
                    <span className="text-xs font-extrabold bg-white/90 px-2 py-0.5 rounded-full text-slate-800 shadow-xs">
                      {tasksInCol.length}
                    </span>
                  </div>
                </div>

                {/* Tasks Stack */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                  {tasksInCol.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs italic">
                      No rooms in this state.
                    </div>
                  ) : (
                    tasksInCol.map((task) => (
                      <div
                        key={task.id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono font-black text-sm text-slate-900">
                              Room {task.roomNumber}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {task.roomType}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${getPriorityBadge(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        {task.notes && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                            "{task.notes}"
                          </p>
                        )}

                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <User className="w-3 h-3 text-slate-400" />
                            {task.assignedTo}
                          </span>
                          <span className="text-[10px]">{task.requestedAt}</span>
                        </div>

                        {/* Status Mover Quick Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          {col.id === 'dirty' && (
                            <button
                              onClick={() => updateHousekeepingStatus(task.id, 'in_progress')}
                              className="w-full py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors cursor-pointer"
                            >
                              Start Cleaning →
                            </button>
                          )}
                          {col.id === 'in_progress' && (
                            <button
                              onClick={() => updateHousekeepingStatus(task.id, 'inspection_needed')}
                              className="w-full py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                            >
                              Request Inspection →
                            </button>
                          )}
                          {col.id === 'inspection_needed' && (
                            <button
                              onClick={() => updateHousekeepingStatus(task.id, 'clean')}
                              className="w-full py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                            >
                              Approve (Clean) ✓
                            </button>
                          )}
                          {col.id === 'clean' && (
                            <button
                              onClick={() => updateHousekeepingStatus(task.id, 'dirty')}
                              className="w-full py-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            >
                              Re-mark Dirty
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Maintenance Work Orders Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-rose-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Maintenance Work Orders & Repairs
            </h3>
            <span className="text-xs bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full">
              {maintenanceTickets.filter((m) => m.status !== 'resolved').length} open
            </span>
          </div>

          <button
            onClick={() => setIsNewTicketOpen(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            + Report Issue
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {maintenanceTickets.map((t) => (
            <div
              key={t.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">Room {t.roomNumber}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {t.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      t.priority === 'high' || t.priority === 'critical'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
                <div className="font-semibold text-slate-800">{t.title}</div>
                {t.notes && <div className="text-slate-500 text-[11px]">{t.notes}</div>}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${
                    t.status === 'resolved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : t.status === 'in_progress'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {t.status.replace('_', ' ')}
                </span>

                <select
                  value={t.status}
                  onChange={(e) => updateMaintenanceStatus(t.id, e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 cursor-pointer"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: New Housekeeping Task */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Dispatch Housekeeping Turnover</h3>
              <button
                onClick={() => setIsNewTaskOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Room</label>
                <select
                  value={taskRoomId}
                  onChange={(e) => setTaskRoomId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} ({r.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as HousekeepingTask['priority'])}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="urgent">Urgent (VIP / Imminent)</option>
                  <option value="high">High Priority</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Turnover Notes</label>
                <textarea
                  rows={2}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="e.g. Extra towels, change duvets, VIP fruit basket..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              {taskSaveError && <p role="alert" className="text-rose-700">{taskSaveError}</p>}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTask || !taskRoomId}
                  className="px-4 py-1.5 bg-indigo-600 disabled:opacity-60 text-white font-bold rounded"
                >
                  {isSavingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Maintenance Ticket */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Report Maintenance Issue</h3>
              <button
                onClick={() => setIsNewTicketOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Room</label>
                  <select
                    value={maintRoomId}
                    onChange={(e) => setMaintRoomId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={maintCategory}
                    onChange={(e) => setMaintCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="HVAC">HVAC / Air Conditioning</option>
                    <option value="Plumbing">Plumbing & Water</option>
                    <option value="Electrical">Electrical & Lighting</option>
                    <option value="Furniture">Furniture & Fixtures</option>
                    <option value="Electronics">Electronics / TV</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Issue Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bathroom faucet leaking slow drip"
                  value={maintTitle}
                  onChange={(e) => setMaintTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Priority</label>
                <select
                  value={maintPriority}
                  onChange={(e) => setMaintPriority(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="low">Low (Non-urgent fix)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (Room must be held)</option>
                  <option value="critical">Critical (Immediate technician required)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Technical Notes</label>
                <textarea
                  rows={2}
                  value={maintNotes}
                  onChange={(e) => setMaintNotes(e.target.value)}
                  placeholder="Details for technician..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 text-white font-bold rounded"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
