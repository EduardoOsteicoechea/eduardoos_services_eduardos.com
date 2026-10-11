/**
 * Scrib hub — dashboard cards + ?view= for library and streak.
 */

import ServiceGate from "../ServiceGate/ServiceGate";
import {
  DashboardGrid,
  ProductHeaderMenu,
  ProductHubShell,
  useProductView,
  type DashboardCardItem,
  type HeaderMenuItem,
} from "../ProductDashboard/ProductDashboard";
import "../ProductDashboard/ProductDashboard.css";
import "./Scrib.css";
import ScribDashboard from "./ScribDashboard";
import {
  ScribStreakConfigView,
  ScribStreakSheetsView,
  ScribStreakStatsView,
  ScribStreakTodayView,
} from "./ScribStreakViews";

const SCRIB_CARDS: DashboardCardItem[] = [
  {
    id: "library",
    title: "Biblioteca",
    description: "Secciones y hojas manuscritas.",
    icon: "menu_book",
  },
  {
    id: "streak-config",
    title: "Configurar racha",
    description: "Libros, cantidades, hoja de trabajo y fecha de inicio.",
    icon: "tune",
  },
  {
    id: "streak-today",
    title: "Hoy",
    description: "Asignación del día y marcar completo.",
    icon: "today",
  },
  {
    id: "streak-sheets",
    title: "Hojas del día",
    description: "Hojas de la racha lado a lado.",
    icon: "view_column",
  },
  {
    id: "streak-stats",
    title: "Racha",
    description: "Días consecutivos y historial.",
    icon: "local_fire_department",
  },
];

const SCRIB_MENU: HeaderMenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "library", label: "Biblioteca", icon: "menu_book" },
  { id: "streak-config", label: "Configurar racha", icon: "tune" },
  { id: "streak-today", label: "Hoy", icon: "today" },
  { id: "streak-sheets", label: "Hojas del día", icon: "view_column" },
  { id: "streak-stats", label: "Racha", icon: "local_fire_department" },
];

export default function ScribHub() {
  return (
    <ServiceGate serviceId="scrib" serviceLabel="Scrib" requireSubscription>
      <ScribHubInner />
    </ServiceGate>
  );
}

function ScribHubInner() {
  const [view, setView] = useProductView("dashboard");

  return (
    <ProductHubShell>
      <ProductHeaderMenu
        menuId="scrib-hub-menu"
        items={SCRIB_MENU}
        activeId={view}
        onSelect={setView}
      />
      {view === "dashboard" ? (
        <DashboardGrid cards={SCRIB_CARDS} onSelect={setView} />
      ) : null}
      {view === "library" ? <ScribDashboard /> : null}
      {view === "streak-config" ? <ScribStreakConfigView /> : null}
      {view === "streak-today" ? <ScribStreakTodayView /> : null}
      {view === "streak-sheets" ? <ScribStreakSheetsView /> : null}
      {view === "streak-stats" ? <ScribStreakStatsView /> : null}
    </ProductHubShell>
  );
}
