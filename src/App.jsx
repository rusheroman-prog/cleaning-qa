import { useState, useEffect, useMemo } from "react";
import { api } from "./lib/api";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  ClipboardCheck, Settings as SettingsIcon, BarChart3, Home,
  Plus, Trash2, ChevronRight, Check, X, Calendar, Clock,
  Building2, ChevronDown, CheckCircle2, XCircle, ArrowLeft,
  Save, User, FileText, AlertTriangle, Edit3, MinusCircle
} from "lucide-react";

// ============================================================
// HELPERS
// ============================================================

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const fmtDate = (ts) => {
  const d = new Date(ts);
  return d.toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};
const fmtDateShort = (ts) => new Date(ts).toLocaleDateString("ru-RU", {
  day: "2-digit", month: "2-digit"
});

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const scoreOf = (check) => {
  let ok = 0, total = 0;
  for (const r of check.results) {
    if (r.value === 1) { ok++; total++; }
    else if (r.value === 0) { total++; }
  }
  return { ok, total, percent: total === 0 ? 0 : Math.round((ok / total) * 100) };
};

const scoreColor = (p) => {
  if (p >= 90) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (p >= 75) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-rose-700 bg-rose-50 border-rose-200";
};

// ============================================================
// DEFAULT DATA
// ============================================================

const defaultFloors = () =>
  [7, 6, 5, 4, 3, 2, 1].map((n) => ({
    id: `floor-${n}`,
    name: `${n} этаж`,
    cleaner: ""
  }));

const mkItems = (arr) => arr.map((t) => ({ id: makeId(), text: t }));

const defaultChecklist = () => [
  {
    id: makeId(), name: "Общие зоны (open space, коридоры, ресепшн)",
    sections: [
      { id: makeId(), name: "Поверхности", items: mkItems([
        "Столы (включая ножки и края)", "Подоконники",
        "Перегородки (включая стеклянные)", "Ресепшн-стойка",
        "Декор (рамки, растения, элементы дизайна)", "Ручки дверей",
        "Выключатели", "Плинтусы", "Радиаторы"
      ])},
      { id: makeId(), name: "Пыль (горизонтальные поверхности)", items: mkItems([
        "Верх шкафов", "Верхи перегородок", "Светильники (в пределах доступа)"
      ])},
      { id: makeId(), name: "Полы", items: mkItems([
        "Влажная уборка", "Углы и труднодоступные места", "Под мебелью"
      ])},
      { id: makeId(), name: "Мусор", items: mkItems([
        "Урны очищены", "Новые пакеты", "Нет переполненных корзин"
      ])}
    ]
  },
  {
    id: makeId(), name: "Окна и стекло",
    sections: [{ id: makeId(), name: "Проверка", items: mkItems([
      "Стеклянные перегородки без разводов",
      "Отпечатки пальцев убраны", "Двери стеклянные чистые"
    ])}]
  },
  {
    id: makeId(), name: "Переговорки",
    sections: [{ id: makeId(), name: "Проверка", items: mkItems([
      "Столы чистые", "Стекла/перегородки чистые", "Нет мусора после встреч"
    ])}]
  },
  {
    id: makeId(), name: "Кофе-поинты / кухни",
    sections: [
      { id: makeId(), name: "Чистота", items: mkItems([
        "Столешницы", "Раковина (без налета и запаха)", "Краны (без разводов)",
        "Кофемашина снаружи чистая", "Микроволновка внутри",
        "Холодильник (ручки + внутри при необходимости)"
      ])},
      { id: makeId(), name: "Расходники", items: mkItems([
        "Кофе", "Чай", "Сахар", "Сливки", "Молоко (сроки годности)",
        "Сиропы", "Одноразовые стаканы", "Размешиватели", "Салфетки",
        "Бумажные полотенца"
      ])},
      { id: makeId(), name: "Организация", items: mkItems([
        "Всё аккуратно расставлено", "Нет пустых коробок",
        "Нет протекших упаковок", "Нет просрочки"
      ])},
      { id: makeId(), name: "Мусор", items: mkItems([
        "Урны очищены", "Нет запаха", "Сортировка соблюдается"
      ])}
    ]
  },
  {
    id: makeId(), name: "Туалеты",
    sections: [
      { id: makeId(), name: "Чистота", items: mkItems([
        "Унитазы (внутри и снаружи)", "Сиденья", "Раковины", "Зеркала",
        "Двери", "Ручки", "Краны", "Плитка", "Полы (особенно углы)"
      ])},
      { id: makeId(), name: "Расходники", items: mkItems([
        "Туалетная бумага", "Бумажные полотенца", "Мыло",
        "Освежители воздуха", "Нет неприятного запаха", "Санитайзеры полные"
      ])}
    ]
  },
  {
    id: makeId(), name: "Труднодоступные зоны",
    sections: [{ id: makeId(), name: "Проверка", items: mkItems([
      "Под столами", "Под диванами", "За дверями", "За мусорными баками",
      "В углах потолка (паутина)", "Кабель-каналы", "Розетки (визуально)"
    ])}]
  },
  {
    id: makeId(), name: "Холодильники",
    sections: [{ id: makeId(), name: "Проверка", items: mkItems([
      "Нет просроченной еды", "Чистые полки", "Нет запаха", "Контейнеры подписаны"
    ])}]
  },
  {
    id: makeId(), name: "Безопасность",
    sections: [{ id: makeId(), name: "Проверка", items: mkItems([
      "Нет скользких полов", "Нет оставленных тряпок/ведер",
      "Проходы свободны", "Не задеты провода/техника"
    ])}]
  },
  {
    id: makeId(), name: "Внешний вид персонала",
    sections: [{ id: makeId(), name: "Проверка", items: mkItems([
      "Чистая форма", "Перчатки", "Опрятный внешний вид"
    ])}]
  },
  {
    id: makeId(), name: "Контроль качества",
    sections: [{ id: makeId(), name: "Проверка", items: mkItems([
      "Нет разводов на поверхностях", "Нет липких зон",
      "Нет пыли при проверке рукой", 'Визуально "свежо и чисто"',
      "Нет следов уборки (разводы, запах химии, мокрые следы)"
    ])}]
  }
];

// ============================================================
// ROOT
// ============================================================

export default function App() {// ============================================================
  // DEBUG BLOCK — удалить после диагностики
  // ============================================================
  const tgDebug = window.Telegram?.WebApp;
  const debugData = {
    hasTelegram: !!window.Telegram,
    hasWebApp: !!tgDebug,
    platform: tgDebug?.platform || 'NONE',
    version: tgDebug?.version || 'NONE',
    initDataLength: tgDebug?.initData?.length || 0,
    initDataPreview: tgDebug?.initData ? tgDebug.initData.substring(0, 100) : 'EMPTY',
    apiUrlSet: !!import.meta.env.VITE_API_URL,
  };
  
  if (typeof window !== 'undefined' && !window._debugShown) {
    window._debugShown = true;
    setTimeout(() => {
      alert('DEBUG:\n\n' + JSON.stringify(debugData, null, 2));
    }, 500);
  }
  // ============================================================
  const [tab, setTab] = useState("dashboard");
  const [config, setConfig] = useState(null);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    (async () => {
      try {
        let cfg = await api.getConfig();
        if (!cfg || !cfg.floors || cfg.floors.length === 0) {
          cfg = { floors: defaultFloors(), checklist: defaultChecklist() };
          await api.saveConfig(cfg);
        }
        const ch = await api.getChecks(100);
        setConfig(cfg);
        setChecks(Array.isArray(ch) ? ch : []);
      } catch (e) {
        console.error("Ошибка загрузки:", e);
        setConfig({ floors: defaultFloors(), checklist: defaultChecklist() });
        setChecks([]);
      }
      setLoading(false);
    })();
  }, []);

  const saveConfig = async (next) => {
    setConfig(next);
    try { await api.saveConfig(next); } catch (e) { console.error(e); }
  };

  const saveCheck = async (check) => {
    const s = scoreOf(check);
    const enriched = { ...check, scorePercent: s.percent, okCount: s.ok, totalCount: s.total };
    setChecks([enriched, ...checks]);
    try { await api.saveCheck(enriched); } catch (e) { console.error(e); }
  };

  const deleteCheck = async (id) => {
    alert("Удаление в облачной версии пока не реализовано");
    setDetail(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Загрузка…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">Клининг QA</div>
              <div className="text-[11px] text-slate-500 leading-tight">Контроль качества уборки</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <TabBtn icon={Home} label="Дашборд" active={tab==="dashboard"} onClick={()=>setTab("dashboard")} />
            <TabBtn icon={ClipboardCheck} label="Новая проверка" active={tab==="new"} onClick={()=>{setDraft(null);setTab("new")}} />
            <TabBtn icon={BarChart3} label="Статистика" active={tab==="stats"} onClick={()=>setTab("stats")} />
            <TabBtn icon={SettingsIcon} label="Настройки" active={tab==="settings"} onClick={()=>setTab("settings")} />
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        {tab === "dashboard" && (
          <Dashboard checks={checks} config={config} onOpen={setDetail} onNew={()=>{setDraft(null);setTab("new")}} />
        )}
        {tab === "new" && (
          <NewCheck
            config={config}
            draft={draft}
            setDraft={setDraft}
            onSubmit={async (c) => { await saveCheck(c); setDraft(null); setTab("dashboard"); }}
            onCancel={() => { setDraft(null); setTab("dashboard"); }}
          />
        )}
        {tab === "stats" && <Stats checks={checks} config={config} />}
        {tab === "settings" && <Settings config={config} saveConfig={saveConfig} />}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-20">
        <div className="grid grid-cols-4">
          <BottomBtn icon={Home} label="Борд" active={tab==="dashboard"} onClick={()=>setTab("dashboard")} />
          <BottomBtn icon={ClipboardCheck} label="Проверка" active={tab==="new"} onClick={()=>{setDraft(null);setTab("new")}} />
          <BottomBtn icon={BarChart3} label="Статистика" active={tab==="stats"} onClick={()=>setTab("stats")} />
          <BottomBtn icon={SettingsIcon} label="Настройки" active={tab==="settings"} onClick={()=>setTab("settings")} />
        </div>
      </nav>

      {detail && <CheckDetail check={detail} config={config} onClose={()=>setDetail(null)} onDelete={deleteCheck} />}
    </div>
  );
}

function TabBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
      }`}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );
}
function BottomBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${active ? "text-slate-900" : "text-slate-500"}`}>
      <Icon className={`w-5 h-5 ${active ? "stroke-[2.25]" : ""}`} />{label}
    </button>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

function Dashboard({ checks, config, onOpen, onNew }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayChecks = checks.filter(c => new Date(c.timestamp).getTime() >= today.getTime());
  const weekChecks = checks.filter(c => new Date(c.timestamp).getTime() >= startOfWeek(new Date()).getTime());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Борд проверок</h1>
        <button onClick={onNew}
          className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-md text-sm hover:bg-slate-800">
          <Plus className="w-4 h-4" />Новая проверка
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Сегодня" value={todayChecks.length} sub="проверок" />
        <StatCard label="Эта неделя" value={weekChecks.length} sub="проверок" />
        <StatCard label="Средний балл (неделя)" value={weekChecks.length ? `${Math.round(weekChecks.reduce((a,c)=>a+scoreOf(c).percent,0)/weekChecks.length)}%` : "—"} sub="" />
        <StatCard label="Всего записей" value={checks.length} sub="за всё время" />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="font-medium text-sm">Последние проверки</div>
          <div className="text-xs text-slate-500">Нажмите на строку, чтобы открыть детали</div>
        </div>
        {checks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Пока нет ни одной проверки. Нажмите «Новая проверка», чтобы начать.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {checks.slice(0, 30).map((c) => {
              const s = scoreOf(c);
              return (
                <li key={c.id}>
                  <button onClick={() => onOpen(c)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left">
                    <div className={`w-14 text-center py-1.5 rounded-md border text-xs font-semibold ${scoreColor(s.percent)}`}>
                      {s.percent}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium truncate">{c.floorName}</span>
                        {c.cleaner && (<>
                          <span className="text-slate-300">·</span>
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-600 truncate">{c.cleaner}</span>
                        </>)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Clock className="w-3 h-3" />{fmtDate(c.timestamp)}
                        <span className="text-slate-300">·</span>
                        <span>{s.ok}/{s.total} пунктов</span>
                        {c.comments && <><span className="text-slate-300">·</span><FileText className="w-3 h-3" /><span>есть комментарий</span></>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1 leading-none">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

// ============================================================
// CHECK DETAIL
// ============================================================

function CheckDetail({ check, onClose, onDelete }) {
  const s = scoreOf(check);
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of check.results) {
      const key = `${r.categoryName}|||${r.sectionName}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const [categoryName, sectionName] = key.split("|||");
      return { categoryName, sectionName, items };
    });
  }, [check]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-30 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div onClick={(e)=>e.stopPropagation()}
        className="bg-white w-full md:max-w-3xl md:rounded-lg rounded-t-lg max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="md:hidden p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <div className="font-semibold text-sm">{check.floorName}</div>
              <div className="text-xs text-slate-500">{fmtDate(check.timestamp)} · {check.cleaner || "без уборщицы"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-md border text-sm font-semibold ${scoreColor(s.percent)}`}>{s.percent}%</div>
            <button onClick={onClose} className="hidden md:block p-1 text-slate-500 hover:text-slate-900"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50 text-emerald-700 rounded-md py-2 text-xs">
              <div className="text-lg font-semibold">{check.results.filter(r=>r.value===1).length}</div>
              <div>ОК</div>
            </div>
            <div className="bg-rose-50 text-rose-700 rounded-md py-2 text-xs">
              <div className="text-lg font-semibold">{check.results.filter(r=>r.value===0).length}</div>
              <div>Не ОК</div>
            </div>
            <div className="bg-slate-100 text-slate-600 rounded-md py-2 text-xs">
              <div className="text-lg font-semibold">{check.results.filter(r=>r.value===null).length}</div>
              <div>Пропущено</div>
            </div>
          </div>

          {check.comments && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
              <div className="text-xs font-medium text-amber-800 mb-1">Комментарий проверяющего</div>
              <div className="text-amber-900 whitespace-pre-wrap">{check.comments}</div>
            </div>
          )}

          {grouped.map((g, i) => (
            <div key={i} className="border border-slate-200 rounded-md overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                {g.categoryName} <span className="text-slate-400">· {g.sectionName}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {g.items.map((it, k) => (
                  <li key={k} className="flex items-center gap-2 px-3 py-2 text-sm">
                    {it.value === 1 && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {it.value === 0 && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    {it.value === null && <MinusCircle className="w-4 h-4 text-slate-300 shrink-0" />}
                    <span className={it.value===0 ? "text-rose-900" : "text-slate-700"}>{it.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <button onClick={() => { if (confirm("Удалить эту проверку?")) onDelete(check.id); }}
            className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" />Удалить запись
          </button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-800">Закрыть</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NEW CHECK
// ============================================================

function NewCheck({ config, draft, setDraft, onSubmit, onCancel }) {
  if (!draft || !draft.floorId) {
    return <FloorPick floors={config.floors} onPick={(floor) => {
      const flat = [];
      for (const cat of config.checklist) {
        for (const sec of cat.sections) {
          for (const it of sec.items) {
            flat.push({
              itemId: it.id, text: it.text, value: null,
              categoryName: cat.name, sectionName: sec.name
            });
          }
        }
      }
      setDraft({
        floorId: floor.id, floorName: floor.name, cleaner: floor.cleaner,
        results: flat, comments: "", startedAt: Date.now()
      });
    }} onCancel={onCancel} />;
  }

  return <ChecklistForm
    draft={draft} setDraft={setDraft}
    onCancel={() => { if (confirm("Прервать проверку? Введённые данные будут потеряны.")) onCancel(); }}
    onSubmit={() => {
      const check = {
        id: makeId(), timestamp: Date.now(),
        floorId: draft.floorId, floorName: draft.floorName,
        cleaner: draft.cleaner, results: draft.results,
        comments: draft.comments
      };
      onSubmit(check);
    }}
  />;
}

function FloorPick({ floors, onPick, onCancel }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Выберите этаж</h1>
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-900">Отмена</button>
      </div>
      {floors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-sm">
          Этажи ещё не добавлены. Перейдите в <b>Настройки</b> и добавьте их.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {floors.map((f) => (
            <button key={f.id} onClick={() => onPick(f)}
              className="bg-white border border-slate-200 rounded-lg p-4 text-left hover:border-slate-900 hover:shadow-sm transition">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <div className="font-medium">{f.name}</div>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {f.cleaner ? f.cleaner : <span className="italic">уборщица не указана</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistForm({ draft, setDraft, onCancel, onSubmit }) {
  const updateValue = (idx, value) => {
    const next = draft.results.map((r, i) => i === idx ? { ...r, value } : r);
    setDraft({ ...draft, results: next });
  };

  const setAll = (value) => {
    setDraft({ ...draft, results: draft.results.map(r => ({ ...r, value })) });
  };

  const groups = useMemo(() => {
    const g = [];
    const map = new Map();
    draft.results.forEach((r, idx) => {
      const key = `${r.categoryName}|||${r.sectionName}`;
      if (!map.has(key)) {
        const obj = { categoryName: r.categoryName, sectionName: r.sectionName, items: [] };
        map.set(key, obj); g.push(obj);
      }
      map.get(key).items.push({ ...r, idx });
    });
    return g;
  }, [draft.results]);

  const answered = draft.results.filter(r => r.value !== null).length;
  const ok = draft.results.filter(r => r.value === 1).length;
  const totalGraded = draft.results.filter(r => r.value === 0 || r.value === 1).length;
  const percent = totalGraded === 0 ? 0 : Math.round(ok / totalGraded * 100);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 sticky top-14 z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-slate-500">Проверяется</div>
            <div className="font-semibold">{draft.floorName}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {draft.cleaner ? `Уборщица: ${draft.cleaner}` : "Уборщица не указана"}
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-block px-3 py-1 rounded-md border text-sm font-semibold ${scoreColor(percent)}`}>
              {percent}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {answered}/{draft.results.length} пунктов
            </div>
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-slate-100 rounded overflow-hidden">
          <div className="h-full bg-slate-900 transition-all" style={{ width: `${draft.results.length ? (answered/draft.results.length*100) : 0}%` }} />
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => setAll(1)} className="text-[11px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
            Все ОК
          </button>
          <button onClick={() => setAll(null)} className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">
            Сбросить
          </button>
        </div>
      </div>

      {groups.map((g, gi) => (
        <div key={gi} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <div className="text-xs font-semibold text-slate-700">{g.categoryName}</div>
            <div className="text-[11px] text-slate-500">{g.sectionName}</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {g.items.map((it) => (
              <li key={it.itemId} className="px-3 py-2.5 flex items-center gap-3">
                <div className="flex-1 text-sm">{it.text}</div>
                <div className="flex gap-1 shrink-0">
                  <TriBtn active={it.value===1} variant="ok" onClick={() => updateValue(it.idx, 1)}>ОК</TriBtn>
                  <TriBtn active={it.value===0} variant="bad" onClick={() => updateValue(it.idx, 0)}>НЕ ОК</TriBtn>
                  <TriBtn active={it.value===null} variant="skip" onClick={() => updateValue(it.idx, null)}>—</TriBtn>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div>
          <label className="text-xs text-slate-600 mb-1 block">Комментарий (опционально)</label>
          <textarea value={draft.comments} onChange={(e) => setDraft({ ...draft, comments: e.target.value })}
            rows={3} placeholder="Заметки, нарушения, детали…"
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-slate-900 resize-none" />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900">Отмена</button>
          <button onClick={onSubmit}
            className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-800">
            <Save className="w-4 h-4" />Отправить в борд
          </button>
        </div>
      </div>
    </div>
  );
}

function TriBtn({ active, variant, onClick, children }) {
  const base = "text-[11px] font-semibold px-2.5 py-1.5 rounded border transition min-w-[44px]";
  const styles = {
    ok: active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50",
    bad: active ? "bg-rose-600 text-white border-rose-600" : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50",
    skip: active ? "bg-slate-500 text-white border-slate-500" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
  };
  return <button onClick={onClick} className={`${base} ${styles[variant]}`}>{children}</button>;
}

// ============================================================
// STATS
// ============================================================

function Stats({ checks, config }) {
  const [period, setPeriod] = useState("week");

  const filtered = useMemo(() => {
    const now = new Date();
    if (period === "week") {
      const t = startOfWeek(now).getTime();
      return checks.filter(c => new Date(c.timestamp).getTime() >= t);
    }
    if (period === "month") {
      const t = startOfMonth(now).getTime();
      return checks.filter(c => new Date(c.timestamp).getTime() >= t);
    }
    return checks;
  }, [checks, period]);

  const byFloor = useMemo(() => {
    const map = new Map();
    for (const c of filtered) {
      const s = scoreOf(c);
      if (!map.has(c.floorName)) map.set(c.floorName, { name: c.floorName, sum: 0, count: 0 });
      const v = map.get(c.floorName);
      v.sum += s.percent; v.count++;
    }
    return Array.from(map.values())
      .map(v => ({ name: v.name, avg: Math.round(v.sum / v.count), count: v.count }))
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const byCleaner = useMemo(() => {
    const map = new Map();
    for (const c of filtered) {
      const name = c.cleaner?.trim() || "— не указана —";
      const s = scoreOf(c);
      if (!map.has(name)) map.set(name, { name, sum: 0, count: 0 });
      const v = map.get(name);
      v.sum += s.percent; v.count++;
    }
    return Array.from(map.values())
      .map(v => ({ name: v.name, avg: Math.round(v.sum / v.count), count: v.count }))
      .sort((a,b) => b.avg - a.avg);
  }, [filtered]);

  const trend = useMemo(() => {
    const map = new Map();
    for (const c of checks) {
      const w = startOfWeek(new Date(c.timestamp)).getTime();
      if (!map.has(w)) map.set(w, { week: w, sum: 0, count: 0 });
      const v = map.get(w);
      v.sum += scoreOf(c).percent; v.count++;
    }
    return Array.from(map.values())
      .sort((a, b) => a.week - b.week)
      .slice(-12)
      .map(v => ({ label: fmtDateShort(v.week), avg: Math.round(v.sum / v.count), count: v.count }));
  }, [checks]);

  const overallAvg = filtered.length
    ? Math.round(filtered.reduce((a, c) => a + scoreOf(c).percent, 0) / filtered.length)
    : 0;

  const failures = useMemo(() => {
    const map = new Map();
    for (const c of filtered) {
      for (const r of c.results) {
        if (r.value === 0) {
          const key = r.text;
          map.set(key, (map.get(key) || 0) + 1);
        }
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Статистика</h1>
        <div className="inline-flex rounded-md bg-white border border-slate-200 overflow-hidden text-xs">
          {[{k:"week",l:"Неделя"},{k:"month",l:"Месяц"},{k:"all",l:"Всё"}].map(p => (
            <button key={p.k} onClick={()=>setPeriod(p.k)}
              className={`px-3 py-1.5 ${period===p.k ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Проверок" value={filtered.length} sub={period==="week"?"за неделю":period==="month"?"за месяц":"всего"} />
        <StatCard label="Средний балл" value={filtered.length ? `${overallAvg}%` : "—"} sub="" />
        <StatCard label="Этажей с данными" value={byFloor.length} sub="" />
        <StatCard label="Уборщиц с данными" value={byCleaner.length} sub="" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-sm">
          За выбранный период нет проверок.
        </div>
      ) : (
        <>
          <ChartBlock title="Средний балл по этажам">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byFloor}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis domain={[0,100]} tick={{ fontSize: 11, fill: "#475569" }} />
                <Tooltip content={<BarTip suffix="%" />} />
                <Bar dataKey="avg" name="Средний %" fill="#0f172a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBlock>

          <ChartBlock title="Средний балл по уборщицам">
            <ResponsiveContainer width="100%" height={Math.max(220, byCleaner.length * 36 + 40)}>
              <BarChart data={byCleaner} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0,100]} tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: "#475569" }} />
                <Tooltip content={<BarTip suffix="%" />} />
                <Bar dataKey="avg" name="Средний %" fill="#334155" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBlock>

          {trend.length > 1 && (
            <ChartBlock title="Динамика по неделям (последние 12)">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#475569" }} />
                  <YAxis domain={[0,100]} tick={{ fontSize: 11, fill: "#475569" }} />
                  <Tooltip content={<BarTip suffix="%" />} />
                  <Line type="monotone" dataKey="avg" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartBlock>
          )}

          <ChartBlock title="Топ нарушений (за выбранный период)">
            {failures.length === 0 ? (
              <div className="text-sm text-slate-500 py-4">Нарушений нет — все пункты ОК.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {failures.map(([text, cnt]) => (
                  <li key={text} className="flex items-center gap-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <div className="flex-1 text-sm">{text}</div>
                    <div className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">{cnt}×</div>
                  </li>
                ))}
              </ul>
            )}
          </ChartBlock>
        </>
      )}
    </div>
  );
}

function ChartBlock({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-sm font-medium mb-3">{title}</div>
      {children}
    </div>
  );
}

function BarTip({ active, payload, label, suffix = "" }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs shadow-sm">
      <div className="font-medium">{label || payload[0].payload.name}</div>
      <div className="text-slate-600">{payload[0].name}: <b>{payload[0].value}{suffix}</b></div>
      {payload[0].payload.count !== undefined && (
        <div className="text-slate-400">Проверок: {payload[0].payload.count}</div>
      )}
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================

function Settings({ config, saveConfig }) {
  const [section, setSection] = useState("floors");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Настройки</h1>
      <div className="inline-flex rounded-md bg-white border border-slate-200 overflow-hidden text-sm">
        <button onClick={()=>setSection("floors")}
          className={`px-3 py-1.5 ${section==="floors"?"bg-slate-900 text-white":"hover:bg-slate-50"}`}>Этажи и уборщицы</button>
        <button onClick={()=>setSection("checklist")}
          className={`px-3 py-1.5 ${section==="checklist"?"bg-slate-900 text-white":"hover:bg-slate-50"}`}>Чек-лист</button>
      </div>

      {section === "floors" && <FloorsEditor config={config} saveConfig={saveConfig} />}
      {section === "checklist" && <ChecklistEditor config={config} saveConfig={saveConfig} />}
    </div>
  );
}

function FloorsEditor({ config, saveConfig }) {
  const floors = config.floors;
  const update = (next) => saveConfig({ ...config, floors: next });

  const add = () => {
    const name = prompt("Название этажа:", `${floors.length+1} этаж`);
    if (!name) return;
    update([...floors, { id: makeId(), name: name.trim(), cleaner: "" }]);
  };
  const remove = (id) => {
    if (!confirm("Удалить этаж?")) return;
    update(floors.filter(f => f.id !== id));
  };
  const edit = (id, patch) => {
    update(floors.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="text-sm text-slate-600">Всего этажей: <b>{floors.length}</b></div>
        <button onClick={add} className="inline-flex items-center gap-1 text-sm bg-slate-900 text-white px-2.5 py-1.5 rounded-md hover:bg-slate-800">
          <Plus className="w-3.5 h-3.5" />Добавить этаж
        </button>
      </div>
      <ul className="divide-y divide-slate-100">
        {floors.map((f) => (
          <li key={f.id} className="p-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input value={f.name} onChange={(e)=>edit(f.id, {name:e.target.value})}
              placeholder="Название этажа"
              className="border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-slate-900" />
            <input value={f.cleaner} onChange={(e)=>edit(f.id, {cleaner:e.target.value})}
              placeholder="ФИО уборщицы"
              className="border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-slate-900" />
            <button onClick={()=>remove(f.id)} className="text-rose-600 hover:text-rose-800 p-2 justify-self-end">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChecklistEditor({ config, saveConfig }) {
  const [expanded, setExpanded] = useState({});

  const update = (next) => saveConfig({ ...config, checklist: next });
  const checklist = config.checklist;

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const addCat = () => {
    const name = prompt("Название категории:");
    if (!name) return;
    update([...checklist, { id: makeId(), name: name.trim(), sections: [{ id: makeId(), name: "Проверка", items: [] }] }]);
  };
  const removeCat = (id) => {
    if (!confirm("Удалить категорию со всеми разделами и пунктами?")) return;
    update(checklist.filter(c => c.id !== id));
  };
  const renameCat = (id) => {
    const cat = checklist.find(c=>c.id===id);
    const name = prompt("Новое название:", cat.name);
    if (!name) return;
    update(checklist.map(c => c.id===id ? {...c, name: name.trim()} : c));
  };

  const addSection = (catId) => {
    const name = prompt("Название раздела:", "Проверка");
    if (!name) return;
    update(checklist.map(c => c.id===catId ? { ...c, sections:[...c.sections, {id:makeId(), name:name.trim(), items:[]}] } : c));
  };
  const removeSection = (catId, secId) => {
    if (!confirm("Удалить раздел?")) return;
    update(checklist.map(c => c.id===catId ? { ...c, sections: c.sections.filter(s=>s.id!==secId) } : c));
  };
  const renameSection = (catId, secId) => {
    const cat = checklist.find(c=>c.id===catId);
    const sec = cat.sections.find(s=>s.id===secId);
    const name = prompt("Новое название:", sec.name);
    if (!name) return;
    update(checklist.map(c => c.id===catId ? {...c, sections: c.sections.map(s=>s.id===secId?{...s,name:name.trim()}:s)} : c));
  };

  const addItem = (catId, secId) => {
    const text = prompt("Текст пункта:");
    if (!text) return;
    update(checklist.map(c => c.id===catId ? {
      ...c, sections: c.sections.map(s => s.id===secId ? { ...s, items:[...s.items, {id:makeId(), text:text.trim()}] } : s)
    } : c));
  };
  const removeItem = (catId, secId, itemId) => {
    update(checklist.map(c => c.id===catId ? {
      ...c, sections: c.sections.map(s => s.id===secId ? { ...s, items: s.items.filter(i=>i.id!==itemId) } : s)
    } : c));
  };
  const renameItem = (catId, secId, itemId) => {
    const cat = checklist.find(c=>c.id===catId);
    const sec = cat.sections.find(s=>s.id===secId);
    const it = sec.items.find(i=>i.id===itemId);
    const text = prompt("Новый текст:", it.text);
    if (!text) return;
    update(checklist.map(c => c.id===catId ? {
      ...c, sections: c.sections.map(s => s.id===secId ? { ...s, items: s.items.map(i=>i.id===itemId?{...i,text:text.trim()}:i) } : s)
    } : c));
  };

  const resetAll = () => {
    if (!confirm("Сбросить чек-лист к шаблону по умолчанию? Ранее добавленные пункты будут удалены (сохранённые проверки останутся).")) return;
    update(defaultChecklist());
  };

  const totalItems = checklist.reduce((a,c) => a + c.sections.reduce((b,s)=>b+s.items.length,0), 0);

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-600">Категорий: <b>{checklist.length}</b> · Пунктов: <b>{totalItems}</b></div>
        <div className="flex gap-2">
          <button onClick={resetAll} className="text-xs text-slate-500 hover:text-slate-900">Сбросить к шаблону</button>
          <button onClick={addCat} className="inline-flex items-center gap-1 text-sm bg-slate-900 text-white px-2.5 py-1.5 rounded-md hover:bg-slate-800">
            <Plus className="w-3.5 h-3.5" />Категория
          </button>
        </div>
      </div>

      {checklist.map((cat) => (
        <div key={cat.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2.5 flex items-center gap-2 border-b border-slate-100">
            <button onClick={()=>toggle(cat.id)} className="p-1 text-slate-500">
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded[cat.id] ? "" : "-rotate-90"}`} />
            </button>
            <div className="flex-1 font-medium text-sm">{cat.name}</div>
            <div className="text-xs text-slate-500">{cat.sections.reduce((a,s)=>a+s.items.length,0)} пунктов</div>
            <IconBtn onClick={()=>renameCat(cat.id)} icon={Edit3} />
            <IconBtn onClick={()=>removeCat(cat.id)} icon={Trash2} danger />
          </div>

          {expanded[cat.id] && (
            <div className="p-3 space-y-3 bg-slate-50">
              {cat.sections.map((sec) => (
                <div key={sec.id} className="bg-white border border-slate-200 rounded">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
                    <div className="flex-1 text-xs font-semibold text-slate-700">{sec.name}</div>
                    <button onClick={()=>addItem(cat.id, sec.id)} className="text-[11px] inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
                      <Plus className="w-3 h-3" />пункт
                    </button>
                    <IconBtn onClick={()=>renameSection(cat.id, sec.id)} icon={Edit3} small />
                    <IconBtn onClick={()=>removeSection(cat.id, sec.id)} icon={Trash2} small danger />
                  </div>
                  <ul className="divide-y divide-slate-50">
                    {sec.items.map((it) => (
                      <li key={it.id} className="px-3 py-1.5 flex items-center gap-2">
                        <div className="flex-1 text-sm">{it.text}</div>
                        <IconBtn onClick={()=>renameItem(cat.id, sec.id, it.id)} icon={Edit3} small />
                        <IconBtn onClick={()=>removeItem(cat.id, sec.id, it.id)} icon={Trash2} small danger />
                      </li>
                    ))}
                    {sec.items.length === 0 && (
                      <li className="px-3 py-2 text-xs text-slate-400 italic">пунктов ещё нет</li>
                    )}
                  </ul>
                </div>
              ))}
              <button onClick={()=>addSection(cat.id)} className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
                <Plus className="w-3 h-3" />добавить раздел
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function IconBtn({ onClick, icon: Icon, danger, small }) {
  return (
    <button onClick={onClick}
      className={`p-1.5 rounded hover:bg-slate-100 ${danger ? "text-rose-600" : "text-slate-500"}`}>
      <Icon className={small ? "w-3.5 h-3.5" : "w-4 h-4"} />
    </button>
  );
}