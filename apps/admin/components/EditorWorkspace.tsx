"use client";
import {
  ActionIcon,
  Button,
  Drawer,
  Popover,
  Tabs,
  Tooltip,
} from "@mantine/core";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import {
  ClockCounterClockwiseIcon,
  EyeIcon,
  FileTextIcon,
  GearSixIcon,
  ImageIcon,
  ListIcon,
  PencilSimpleIcon,
  SidebarSimpleIcon,
  SlidersHorizontalIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { usePanelI18n } from "../lib/i18n";
import { workspaceUi } from "../lib/workspace-i18n";
import * as S from "./workspace.styles";
import { useViewMotion } from "@invitations/ui/motion";
import { BrandLogo } from "@invitations/ui/brand";

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
  active,
  onActive,
  editRequest,
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
  editRequest: number;
  active: string | null;
  onActive: (value: string | null) => void;
}) {
  const { t, language } = usePanelI18n();
  const ui = workspaceUi[language];

  const [viewState, setViewState] = useState({
    mode: "edit",
    request: editRequest,
  });
  const view = viewState.request === editRequest ? viewState.mode : "edit";
  const setView = (mode: string) =>
    setViewState({ mode, request: editRequest });
  const formMotion = useViewMotion(`${active}:${view}`);
  const previewMotion = useViewMotion(view);
  const [menu, setMenu] = useState(false);
  const [projectOptions, setProjectOptions] = useState(false);
  const [collapsed, setCollapsed] = useLocalStorage({
    key: "invitations-view-v1-collapsed",
    defaultValue: false,
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
  const label = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;
  const items = [
    {
      value: "content",
      label: label("Treść", "Content", "Inhalt"),
      icon: FileTextIcon,
    },
    {
      value: "appearance",
      label: label("Wygląd", "Appearance", "Design"),
      icon: SlidersHorizontalIcon,
    },
    { value: "media", label: t("media"), icon: ImageIcon },
    { value: "guests", label: ui.guests, icon: UsersIcon },
  ];
  const tools = [
    { value: "settings", label: t("settings"), icon: GearSixIcon },
    { value: "history", label: t("history"), icon: ClockCounterClockwiseIcon },
  ];
  return (
    <S.EditorWorkspace
      data-collapsed={collapsed}
      data-view={view}
      style={
        {
          "--form-width": `${width}px`,
          "--visual-height": viewportHeight ? `${viewportHeight}px` : "100dvh",
        } as CSSProperties
      }
    >
      <S.WorkspaceHeader>
        <S.WorkspaceBrand href="/" aria-label={t("projects")}>
          <BrandLogo
            variant="short"
            height={40}
            decorative
            className="brand-lockup"
          />
          <BrandLogo
            variant="mark"
            height={32}
            decorative
            className="brand-symbol"
          />
        </S.WorkspaceBrand>
        <S.WorkspaceProject>
          {title}
          {status}
        </S.WorkspaceProject>
        <S.WorkspaceActions>
          {save}
          <S.DesktopProjectActions>{actions}</S.DesktopProjectActions>
          <Popover
            position="bottom-end"
            opened={projectOptions}
            onChange={setProjectOptions}
            trapFocus
          >
            <Popover.Target>
              <S.MobileProjectActions
                variant="light"
                size="lg"
                aria-label={ui.actions}
                onClick={() => setProjectOptions((value) => !value)}
              >
                <GearSixIcon size={22} weight="duotone" />
              </S.MobileProjectActions>
            </Popover.Target>
            <Popover.Dropdown>
              <S.ProjectActionsMenu
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button"))
                    setProjectOptions(false);
                }}
              >
                {actions}
              </S.ProjectActionsMenu>
            </Popover.Dropdown>
          </Popover>
        </S.WorkspaceActions>
      </S.WorkspaceHeader>
      <S.WorkspaceBody
        value={active}
        onChange={onActive}
        orientation="vertical"
        keepMounted
      >
        <S.WorkspaceNav>
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
          <S.WorkspaceNavFooter>
            {tools.map(({ value, label, icon: Icon }) => (
              <Tooltip key={value} label={label}>
                <Button
                  variant="subtle"
                  aria-label={label}
                  leftSection={<Icon size={22} />}
                  onClick={() => onActive(value)}
                >
                  {!collapsed &&
                    (value === "history"
                      ? language === "pl"
                        ? "Historia"
                        : language === "de"
                          ? "Verlauf"
                          : "History"
                      : label)}
                </Button>
              </Tooltip>
            ))}
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
          </S.WorkspaceNavFooter>
        </S.WorkspaceNav>
        <S.WorkspaceForm ref={formMotion} id="workspace-edit">
          <S.WorkspaceNotices>{notices}</S.WorkspaceNotices>
          {headerTools}
          {children}
        </S.WorkspaceForm>
        <S.WorkspaceResizer
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
        <S.WorkspacePreview
          ref={previewMotion}
          id="workspace-preview"
          aria-label={ui.live}
        >
          {preview}
        </S.WorkspacePreview>
      </S.WorkspaceBody>
      <S.WorkspaceMobileNav aria-label={ui.view}>
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
      </S.WorkspaceMobileNav>
      <Drawer
        opened={menu}
        onClose={() => setMenu(false)}
        title={ui.brand}
        size="min(320px, 90vw)"
      >
        <S.WorkspaceDrawerNav>
          <Button component="a" href="/" variant="default">
            {t("projects")}
          </Button>
          {[...items, ...tools].map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={value === active ? "light" : "subtle"}
              leftSection={<Icon size={23} weight="duotone" />}
              onClick={() => {
                onActive(value);
                setView("edit");
                setMenu(false);
              }}
            >
              {label}
            </Button>
          ))}
        </S.WorkspaceDrawerNav>
      </Drawer>
      {dialogs}
    </S.EditorWorkspace>
  );
}
