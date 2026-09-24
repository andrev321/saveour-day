"use client";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  ActionIcon,
  Button,
  Drawer,
  Text,
  Popover,
  SegmentedControl,
  Tabs,
  Tooltip,
} from "@mantine/core";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import {
  EnvelopeSimpleIcon,
  FileTextIcon,
  StackIcon,
  CopyIcon,
  ImageIcon,
  UsersIcon,
  GearSixIcon,
  ClockCounterClockwiseIcon,
  SidebarSimpleIcon,
  SlidersHorizontalIcon,
  ListIcon,
  PencilSimpleIcon,
  EyeIcon,
} from "@phosphor-icons/react";
import { usePanelI18n } from "../lib/i18n";
import { workspaceUi } from "../lib/workspace-i18n";

export function EditorWorkspace({
  title,
  headerTools,
  status,
  save,
  actions,
  notices,
  children,
  preview,
  dialogs,
  onResetView,
}: {
  title: ReactNode;
  headerTools?: ReactNode;
  status: ReactNode;
  save: ReactNode;
  actions: ReactNode;
  notices: ReactNode;
  children: ReactNode;
  preview: ReactNode;
  dialogs: ReactNode;
  onResetView: () => void;
}) {
  const { t, language } = usePanelI18n();
  const ui = workspaceUi[language];
  const [active, setActive] = useState<string | null>("page");
  const [view, setView] = useState("edit");
  const [menu, setMenu] = useState(false);
  const [projectOptions, setProjectOptions] = useState(false);
  const [viewOptions, setViewOptions] = useState(false);
  const [collapsed, setCollapsed] = useLocalStorage({
    key: "invitations-view-v1-collapsed",
    defaultValue: false,
  });
  const [density, setDensity] = useLocalStorage({
    key: "invitations-view-v1-density",
    defaultValue: "comfortable",
  });
  const [panelWidth, setPanelWidth] = useLocalStorage({
    key: "invitations-view-v1-width",
    defaultValue: 460,
  });
  const wide = useMediaQuery("(min-width: 1600px)");
  const minWidth = wide ? 440 : 380;
  const maxWidth = wide ? 560 : 460;
  const clamp = (value: number) =>
    Math.max(minWidth, Math.min(maxWidth, value));
  const width = Number.isFinite(panelWidth) ? clamp(panelWidth) : 460;
  const [viewportHeight, setViewportHeight] = useState<number>();
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      // Leave browser pinch zoom intact; only follow the on-screen keyboard.
      setViewportHeight(viewport.scale === 1 ? viewport.height : undefined);
    };
    resize();
    viewport.addEventListener("resize", resize);
    return () => viewport.removeEventListener("resize", resize);
  }, []);
  const items = [
    { value: "page", label: t("page"), icon: FileTextIcon },
    { value: "sections", label: t("structure"), icon: StackIcon },
    { value: "pages", label: t("pages"), icon: CopyIcon },
    { value: "media", label: t("media"), icon: ImageIcon },
    { value: "guests", label: ui.guests, icon: UsersIcon },
    { value: "settings", label: t("settings"), icon: GearSixIcon },
    { value: "history", label: t("history"), icon: ClockCounterClockwiseIcon },
  ];
  return (
    <div
      className="editor-workspace"
      data-collapsed={collapsed}
      data-density={density}
      data-view={view}
      style={
        {
          "--form-width": `${width}px`,
          "--visual-height": viewportHeight ? `${viewportHeight}px` : "100dvh",
        } as CSSProperties
      }
    >
      <header className="workspace-header">
        <a className="workspace-brand" href="/" aria-label={t("projects")}>
          <EnvelopeSimpleIcon size={28} weight="duotone" />
          <span>{ui.brand}</span>
        </a>
        <div className="workspace-project">
          {title}
          {status}
        </div>
        <div className="workspace-actions">
          {headerTools}
          {save}
          <div className="desktop-project-actions">{actions}</div>
          <Popover
            position="bottom-end"
            opened={projectOptions}
            onChange={setProjectOptions}
            trapFocus
          >
            <Popover.Target>
              <ActionIcon
                className="mobile-project-actions"
                variant="light"
                size="lg"
                aria-label={ui.actions}
                onClick={() => setProjectOptions((value) => !value)}
              >
                <GearSixIcon size={22} weight="duotone" />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <div
                className="project-actions-menu"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button"))
                    setProjectOptions(false);
                }}
              >
                {actions}
              </div>
            </Popover.Dropdown>
          </Popover>
        </div>
      </header>
      <Tabs
        className="workspace-body"
        value={active}
        onChange={setActive}
        orientation="vertical"
        keepMounted
      >
        <aside className="workspace-nav">
          <Tabs.List aria-label={ui.menu}>
            {items.map(({ value, label, icon: Icon }) => (
              <Tooltip
                key={value}
                label={label}
                disabled={!collapsed}
                position="right"
              >
                <Tabs.Tab
                  value={value}
                  aria-label={label}
                  leftSection={<Icon size={23} weight="duotone" />}
                >
                  <span>{label}</span>
                </Tabs.Tab>
              </Tooltip>
            ))}
          </Tabs.List>
          <div className="workspace-nav-footer">
            <Tooltip
              label={collapsed ? ui.expand : ui.collapse}
              position="right"
            >
              <ActionIcon
                variant="subtle"
                size="lg"
                aria-label={collapsed ? ui.expand : ui.collapse}
                onClick={() => setCollapsed(!collapsed)}
              >
                <SidebarSimpleIcon size={23} weight="duotone" />
              </ActionIcon>
            </Tooltip>
            <Popover
              position="right-end"
              opened={viewOptions}
              onChange={setViewOptions}
              trapFocus
            >
              <Popover.Target>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  aria-label={ui.view}
                  onClick={() => setViewOptions((value) => !value)}
                >
                  <SlidersHorizontalIcon size={23} weight="duotone" />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Text size="sm" mb="xs">
                  {ui.density}
                </Text>
                <SegmentedControl
                  aria-label={ui.density}
                  value={density}
                  onChange={setDensity}
                  data={[
                    { value: "comfortable", label: ui.comfortable },
                    { value: "compact", label: ui.compact },
                  ]}
                />
                <Button
                  variant="subtle"
                  display="block"
                  mt="sm"
                  onClick={() => {
                    setCollapsed(false);
                    setDensity("comfortable");
                    setPanelWidth(460);
                    onResetView();
                    setViewOptions(false);
                  }}
                >
                  {ui.reset}
                </Button>
              </Popover.Dropdown>
            </Popover>
          </div>
        </aside>
        <main className="workspace-form" id="workspace-edit">
          <div className="workspace-notices">{notices}</div>
          {children}
        </main>
        <div
          className="workspace-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label={ui.resize}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          aria-valuenow={width}
          tabIndex={0}
          onKeyDown={(event) => {
            if (
              ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              setPanelWidth(
                event.key === "Home"
                  ? minWidth
                  : event.key === "End"
                    ? maxWidth
                    : clamp(width + (event.key === "ArrowRight" ? 20 : -20)),
              );
            }
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.dataset.start = `${event.clientX},${width}`;
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const [x, start] = (event.currentTarget.dataset.start || "0,460")
              .split(",")
              .map(Number);
            setPanelWidth(clamp(start + event.clientX - x));
          }}
          onPointerUp={(event) =>
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
        />
        <section
          className="workspace-preview"
          id="workspace-preview"
          aria-label={ui.live}
        >
          {preview}
        </section>
      </Tabs>
      <nav className="workspace-mobile-nav" aria-label={ui.view}>
        <Button
          variant="subtle"
          onClick={() => setMenu(true)}
          leftSection={<ListIcon size={22} weight="duotone" />}
        >
          {ui.menu}
        </Button>
        <Button
          variant={view === "edit" ? "light" : "subtle"}
          aria-pressed={view === "edit"}
          aria-controls="workspace-edit"
          onClick={() => setView("edit")}
          leftSection={<PencilSimpleIcon size={22} weight="duotone" />}
        >
          {ui.edit}
        </Button>
        <Button
          variant={view === "preview" ? "light" : "subtle"}
          aria-pressed={view === "preview"}
          aria-controls="workspace-preview"
          onClick={() => setView("preview")}
          leftSection={<EyeIcon size={22} weight="duotone" />}
        >
          {ui.preview}
        </Button>
      </nav>
      <Drawer
        opened={menu}
        onClose={() => setMenu(false)}
        title={ui.brand}
        size="min(320px, 90vw)"
      >
        <div className="workspace-drawer-nav">
          <Button component="a" href="/" variant="default">
            {t("projects")}
          </Button>
          {items.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={value === active ? "light" : "subtle"}
              leftSection={<Icon size={23} weight="duotone" />}
              onClick={() => {
                setActive(value);
                setView("edit");
                setMenu(false);
              }}
            >
              {label}
            </Button>
          ))}
          <Button
            variant="default"
            onClick={() => {
              setCollapsed(false);
              setDensity("comfortable");
              setPanelWidth(460);
              onResetView();
            }}
          >
            {ui.reset}
          </Button>
        </div>
      </Drawer>
      {dialogs}
    </div>
  );
}
