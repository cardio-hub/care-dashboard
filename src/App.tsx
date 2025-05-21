import React, { useState, useRef } from 'react';
import './App.css';
import { Building, Zone, Resident, Caregiver, Task } from './models';

// Mock data for demonstration
const caregivers: Caregiver[] = [
  { id: 'c1', name: 'Nurse Anna' },
  { id: 'c2', name: 'Nurse Ben' },
  { id: 'c3', name: 'Nurse Clara' },
];

const createResidents = (zoneId: string): Resident[] => [
  {
    id: `${zoneId}-r1`,
    name: 'John Doe',
    roomNo: '101',
    caregivers: [caregivers[0]],
    tasks: [],
  },
  {
    id: `${zoneId}-r2`,
    name: 'Jane Smith',
    roomNo: '102',
    caregivers: [caregivers[1]],
    tasks: [],
  },
];

const createZones = (buildingId: string): Zone[] =>
  ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4'].map((name, i) => ({
    id: `${buildingId}-z${i + 1}`,
    name,
    residents: createResidents(`${buildingId}-z${i + 1}`),
  }));

const buildings: Building[] = [
  { id: 'a', name: 'Building A', zones: createZones('a') },
  { id: 'b', name: 'Building B', zones: createZones('b') },
];

// Hilfsfunktionen und Typen für Wochentage
const WEEKDAYS = [
  { key: 1, label: 'Mo', full: 'Montag' },
  { key: 2, label: 'Di', full: 'Dienstag' },
  { key: 3, label: 'Mi', full: 'Mittwoch' },
  { key: 4, label: 'Do', full: 'Donnerstag' },
  { key: 5, label: 'Fr', full: 'Freitag' },
  { key: 6, label: 'Sa', full: 'Samstag' },
  { key: 0, label: 'So', full: 'Sonntag' },
];
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type ResidentTaskPlan = {
  [slotIndex: number]: { [weekday in Weekday]?: string };
};
type TasksState = { [residentId: string]: ResidentTaskPlan };

const TASK_COUNT = 5;
const TASK_ICONS = [
  '✅', '🍬', '⚖️', '🚿', '👥', '💉', '🩸', '⚰️', '👨‍⚕️', '👀', '📝', '🩺', '👁️', '🌬️', '💊', '🛏️', '❌',
];

function App() {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [zonesState, setZonesState] = useState<Zone[][]>(buildings.map(b => b.zones));
  const [editingResident, setEditingResident] = useState<{zoneIdx: number, residentIdx: number} | null>(null);
  const [tasksState, setTasksState] = useState<TasksState>({});
  const [popup, setPopup] = useState<null | { residentId: string; taskIdx: number; anchor: HTMLElement | null; rect: DOMRect | null }>(null);
  const [popupSymbol, setPopupSymbol] = useState<string>('');
  const [popupWeekdays, setPopupWeekdays] = useState<Weekday[]>([]);
  const [selectedWeekday, setSelectedWeekday] = useState<Weekday>(new Date().getDay() as Weekday);
  const [weekdayPopupOpen, setWeekdayPopupOpen] = useState(false);
  const [weekdayPopupCoords, setWeekdayPopupCoords] = useState<{ top: number; left: number } | null>(null);
  const weekdayBtnRef = useRef<HTMLButtonElement>(null);

  // Helper to get zones for current building
  const getZones = () => {
    if (!selectedBuilding) return [];
    const idx = buildings.findIndex(b => b.id === selectedBuilding.id);
    return zonesState[idx];
  };

  // Handler to update resident name
  const handleResidentNameChange = (zoneIdx: number, residentIdx: number, value: string) => {
    setZonesState(prev => prev.map((zones, bIdx) => {
      if (selectedBuilding && bIdx === buildings.findIndex(b => b.id === selectedBuilding.id)) {
        return zones.map((zone, zIdx) => {
          if (zIdx === zoneIdx) {
            return {
              ...zone,
              residents: zone.residents.map((r, rIdx) =>
                rIdx === residentIdx ? { ...r, name: value } : r
              ),
            };
          }
          return zone;
        });
      }
      return zones;
    }));
  };

  const handleNameClick = (zoneIdx: number, residentIdx: number) => {
    setEditingResident({ zoneIdx, residentIdx });
  };

  const handleNameBlur = () => {
    setEditingResident(null);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setEditingResident(null);
    }
  };

  const handleTaskIconClick = (residentId: string, idx: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopup({ residentId, taskIdx: idx, anchor: e.currentTarget, rect });
    // Vorbelegen: aktuelles Symbol und Wochentage für diesen Slot
    const slot = tasksState[residentId]?.[idx] || {};
    // Wenn ein Symbol gewählt ist, wähle alle Wochentage aus, an denen dieses Symbol gesetzt ist
    let initialSymbol = '';
    let initialDays: Weekday[] = [];
    // Finde das Symbol für heute
    const today = new Date().getDay() as Weekday;
    if (slot[today]) {
      initialSymbol = slot[today] || '';
      initialDays = Object.entries(slot)
        .filter(([_, sym]) => sym === initialSymbol)
        .map(([d]) => Number(d) as Weekday);
    }
    setPopupSymbol(initialSymbol);
    setPopupWeekdays(initialDays);
  };

  const handleTaskIconSelect = (icon: string) => {
    setPopupSymbol(icon);
  };

  const handleWeekdayToggle = (day: Weekday) => {
    setPopupWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveTaskPopup = () => {
    if (!popup) return;
    setTasksState((prev) => {
      const prevPlan = prev[popup.residentId] || {};
      const slotPlan = { ...(prevPlan[popup.taskIdx] || {}) };
      popupWeekdays.forEach((day) => {
        slotPlan[day] = popupSymbol;
      });
      return {
        ...prev,
        [popup.residentId]: {
          ...prevPlan,
          [popup.taskIdx]: slotPlan,
        },
      };
    });
    setPopup(null);
    setPopupSymbol('');
    setPopupWeekdays([]);
  };

  const handleClosePopup = () => setPopup(null);

  // Home view: show buildings
  if (!selectedBuilding) {
    return (
      <div className="app-home">
        <h1>Dashboard</h1>
        <div className="building-tiles">
          {buildings.map((b) => (
            <div
              key={b.id}
              className="building-tile"
              onClick={() => setSelectedBuilding(b)}
            >
              {b.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Zone overview
  if (selectedBuilding && !selectedZone) {
    return (
      <div className="zone-overview">
        <div className="zone-header" style={{position: 'relative'}}>
          <div className="zone-header-left">
            <button onClick={() => setSelectedBuilding(null)}>← Back</button>
            <span className="zone-title">{selectedBuilding.name} - Zones</span>
          </div>
          <div className="zone-header-center-abs">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
                ref={weekdayBtnRef}
                className="weekday-current weekday-popup-btn"
                onClick={() => {
                  if (weekdayBtnRef.current) {
                    const rect = weekdayBtnRef.current.getBoundingClientRect();
                    setWeekdayPopupCoords({
                      top: rect.bottom + window.scrollY + 8,
                      left: rect.left + window.scrollX + rect.width / 2,
                    });
                  }
                  setWeekdayPopupOpen(true);
                }}
                type="button"
              >
                {WEEKDAYS.find(w => w.key === selectedWeekday)?.full}
              </button>
              {weekdayPopupOpen && weekdayPopupCoords && (
                <div
                  className="weekday-popup weekday-popup-below"
                  style={{
                    position: 'fixed',
                    top: weekdayPopupCoords.top,
                    left: weekdayPopupCoords.left,
                    transform: 'translateX(-50%)',
                    marginTop: 0,
                    zIndex: 1300,
                    width: 240,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {WEEKDAYS.map(({ key, full }) => (
                    <button
                      key={key}
                      className={`weekday-popup-option${selectedWeekday === key ? ' selected' : ''}`}
                      onClick={() => { setSelectedWeekday(key as Weekday); setWeekdayPopupOpen(false); setWeekdayPopupCoords(null); }}
                      type="button"
                    >
                      {full}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="zone-tiles">
          {getZones().map((z, zoneIdx) => {
            const rows = z.residents.slice(0, 10);
            const emptyRows = 10 - rows.length;
            return (
              <div
                key={z.id}
                className="zone-tile"
              >
                <div className="zone-tile-table-wrapper">
                  <table className="zone-tile-table">
                    <thead>
                      <tr>
                        <th>Room No.</th>
                        <th>Resident</th>
                        <th>Assigned Nurse(s)</th>
                        <th>Tasks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, residentIdx) => (
                        <tr key={r.id}>
                          <td>{residentIdx + 1}</td>
                          <td>
                            {editingResident && editingResident.zoneIdx === zoneIdx && editingResident.residentIdx === residentIdx ? (
                              <input
                                type="text"
                                value={r.name}
                                autoFocus
                                onChange={e => handleResidentNameChange(zoneIdx, residentIdx, e.target.value)}
                                onBlur={handleNameBlur}
                                onKeyDown={handleNameKeyDown}
                                className="resident-input"
                              />
                            ) : (
                              <span
                                className="resident-name-text"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleNameClick(zoneIdx, residentIdx);
                                }}
                                tabIndex={0}
                                style={{ cursor: 'pointer', display: 'inline-block', minWidth: 40 }}
                              >
                                {r.name}
                              </span>
                            )}
                          </td>
                          <td>{r.caregivers.map((c) => c.name).join(', ')}</td>
                          <td>
                            <div className="tasks-checkbox-group">
                              {Array.from({ length: TASK_COUNT }).map((_, i) => {
                                const symbol = tasksState[r.id]?.[i]?.[selectedWeekday] || '⬜';
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    className="mini-checkbox task-icon-btn"
                                    onClick={e => handleTaskIconClick(r.id, i, e)}
                                  >
                                    {symbol}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {Array.from({ length: emptyRows }).map((_, i) => {
                        const dummyId = `${z.id}-empty-${i}`;
                        const symbol = tasksState[dummyId]?.[0]?.[selectedWeekday] || '⬜';
                        return (
                          <tr key={"empty-" + i}>
                            <td>{rows.length + i + 1}</td>
                            <td>—</td>
                            <td>—</td>
                            <td>
                              <div className="tasks-checkbox-group">
                                {Array.from({ length: TASK_COUNT }).map((_, j) => {
                                  const symbol = tasksState[dummyId]?.[j]?.[selectedWeekday] || '⬜';
                                  return (
                                    <button
                                      key={j}
                                      type="button"
                                      className="mini-checkbox task-icon-btn"
                                      onClick={e => handleTaskIconClick(dummyId, j, e)}
                                    >
                                      {symbol}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
        {popup && popup.rect && (
          <div className="task-popup-overlay" onClick={handleClosePopup}>
            {(() => {
              const popupHeight = 260; // großzügigere Höhe
              const popupWidth = 220;
              const windowHeight = window.innerHeight;
              const windowWidth = window.innerWidth;
              const margin = 16;
              const below = popup.rect.top + popup.rect.height + margin + popupHeight < windowHeight;
              const top = below
                ? popup.rect.top + popup.rect.height + margin
                : popup.rect.top - popupHeight - margin;
              let left = popup.rect.left + popup.rect.width / 2 - popupWidth / 2;
              if (left < 8) left = 8;
              if (left + popupWidth > windowWidth - 8) left = windowWidth - popupWidth - 8;
              return (
                <div
                  className="task-popup"
                  style={{
                    position: 'fixed',
                    top,
                    left,
                    zIndex: 1001,
                    minWidth: 180,
                    maxWidth: 220,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="task-popup-title">Wähle ein Symbol:</div>
                  <div className="task-popup-icons">
                    {TASK_ICONS.map(icon => (
                      <button
                        key={icon}
                        className={`task-popup-icon-btn${popupSymbol === icon ? ' selected' : ''}`}
                        onClick={() => handleTaskIconSelect(icon)}
                        type="button"
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="task-popup-weekdays">
                    {WEEKDAYS.map(({ key, label }) => {
                      // Zeige das aktuell zugeordnete Symbol als Mini-Icon
                      let currentSymbol = '';
                      if (popup && tasksState[popup.residentId]?.[popup.taskIdx]?.[key as Weekday]) {
                        currentSymbol = tasksState[popup.residentId][popup.taskIdx][key as Weekday] || '';
                      }
                      return (
                        <button
                          key={key}
                          className={`weekday-btn${popupWeekdays.includes(key as Weekday) ? ' selected' : ''}`}
                          onClick={() => popupSymbol && handleWeekdayToggle(key as Weekday)}
                          type="button"
                          disabled={!popupSymbol}
                        >
                          {label}
                          {currentSymbol && (
                            <span>{currentSymbol}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button className="task-popup-save" onClick={handleSaveTaskPopup} disabled={!popupSymbol || popupWeekdays.length === 0}>
                    Speichern
                  </button>
                  <button className="task-popup-close" onClick={handleClosePopup}>Schließen</button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  // Zone detail view
  if (selectedZone) {
    return (
      <div className="zone-detail">
        <button onClick={() => setSelectedZone(null)}>← Back</button>
        <h2>{selectedZone.name} - Residents</h2>
        <table>
          <thead>
            <tr>
              <th>Room No.</th>
              <th>Resident</th>
              <th>Assigned Nurse(s)</th>
              <th>Tasks</th>
            </tr>
          </thead>
          <tbody>
            {selectedZone.residents.map((r) => (
              <tr key={r.id}>
                <td>{r.roomNo}</td>
                <td>{r.name}</td>
                <td>{r.caregivers.map((c) => c.name).join(', ')}</td>
                <td>{r.tasks.length > 0 ? r.tasks.map((t) => t.name).join(', ') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

export default App;
