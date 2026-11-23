"use client";

import { createId } from "@/utils/create-id";
import { AdminTablePagination } from "@/components/admin/admin-table-pagination";

import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";
import { showGlobalToast } from "@/components/ui/global-toast";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LinkTarget } from "@/types/content";
import {
  pagesChangeEvent,
  readPageSummaries,
  refreshPageSummaries,
} from "@/features/pages/demo/page-list-storage";
import { readUnits } from "@/features/units/demo/storage";
import type { Navigation, NavigationItem, NavigationLink } from "../types";
import { isNavigation } from "../validation";
import { navigationIconNames, type NavigationIconName } from "../icon-names";
import { NavigationIcon, navigationIcons } from "../navigation-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { moduleRouteCatalog, selectableModuleRoutes } from "../module-routes";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";
import { AnchoredSelect } from "@/components/ui/anchored-select";

type Editing = {
  item: NavigationItem | NavigationLink;
  parentId: string | null;
  isNew: boolean;
};
type DeleteCandidate = { id: string; parentId: string | null; label: string };

const modules = selectableModuleRoutes.filter(
  (route) => route.value !== "home",
);

function id() {
  return `nav-${createId()}`;
}
function reorder<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) next.splice(to, 0, moved);
  return next;
}

function targetLabel(target: LinkTarget) {
  if (target.kind === "external") return "เว็บไซต์ภายนอก";
  if (target.kind === "entity")
    return target.entity === "page" ? "หน้าเว็บไซต์" : "หน่วยงาน";
  return moduleRouteCatalog[target.module].label;
}
function asChild(item: NavigationItem): NavigationLink | null {
  return item.kind === "link"
    ? {
        id: item.id,
        label: item.label,
        target: item.target,
        visible: item.visible,
        openInNewTab: item.openInNewTab,
        hideWhenLoggedOut: item.hideWhenLoggedOut,
      }
    : null;
}
function asMain(item: NavigationLink): NavigationItem {
  return { ...item, kind: "link" };
}
type EntityTargetOption = {
  id: string;
  label: string;
  entity: "page" | "unit";
  path: string;
};
function readEntityTargets(): EntityTargetOption[] {
  const pages = readPageSummaries()
    .filter((page) => !page.locked)
    .map((page) => ({
      id: page.id,
      label: page.name,
      entity: "page" as const,
      path: `/${page.path}`,
    }));
  const units = readUnits().map((unit) => ({
    id: unit.id,
    label: unit.shortName || unit.name,
    entity: "unit" as const,
    path: `/units/${unit.slug}`,
  }));
  return [...pages, ...units];
}
function collapsedDropdowns(navigation: Navigation): Record<string, boolean> {
  return Object.fromEntries(
    navigation.items
      .filter((item) => item.kind === "dropdown")
      .map((item) => [item.id, true]),
  );
}

export function NavigationManager() {
  const [navigation, setNavigation] = useState<Navigation>({
    home: { label: "หน้าแรก" },
    items: [],
  });
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<DeleteCandidate | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [notice, setNotice] = useState<string | null>(null);
  const setToast = showGlobalToast;
  const [entityTargets, setEntityTargets] = useState(() => readEntityTargets());
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/navigation?admin=1", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (
          !response.ok ||
          typeof result !== "object" ||
          result === null ||
          !("navigation" in result) ||
          !("revision" in result) ||
          !isNavigation(result.navigation) ||
          typeof result.revision !== "number"
        )
          throw new Error("โหลดเมนูจากฐานข้อมูลไม่สำเร็จ");
        if (controller.signal.aborted) return;
        setNavigation(result.navigation);
        setSavedSnapshot(JSON.stringify(result.navigation));
        setCollapsed(collapsedDropdowns(result.navigation));
        setRevision(result.revision);
        setLoaded(true);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setNotice("โหลดเมนูจากฐานข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้า");
      });
    const refreshTargets = () => setEntityTargets(readEntityTargets());
    void refreshPageSummaries().catch(() => undefined);
    window.addEventListener(pagesChangeEvent, refreshTargets);
    window.addEventListener("hos-units-change", refreshTargets);
    return () => {
      controller.abort();
      window.removeEventListener(pagesChangeEvent, refreshTargets);
      window.removeEventListener("hos-units-change", refreshTargets);
    };
  }, []);

  const items = navigation.items;
  const hasChanges = JSON.stringify(navigation) !== savedSnapshot;
  function update(items: NavigationItem[]) {
    setNavigation((current) => ({ ...current, items }));
    setNotice(null);
  }
  function add(parentId: string | null) {
    const link: NavigationLink = {
      id: id(),
      label: parentId ? "เมนูย่อย" : "เมนูใหม่",
      target: { kind: "module", module: "news" },
      visible: true,
      openInNewTab: false,
      hideWhenLoggedOut: false,
    };
    setEditing({ item: parentId ? link : asMain(link), parentId, isNew: true });
  }
  function saveItem(next: NavigationItem | NavigationLink) {
    if (!editing) return;
    if (editing.parentId === null) {
      const main =
        "kind" in next
          ? (next as NavigationItem)
          : asMain(next as NavigationLink);
      update(
        editing.isNew
          ? [...items, main]
          : items.map((item) => (item.id === main.id ? main : item)),
      );
    } else {
      const child =
        "kind" in next
          ? asChild(next as NavigationItem)
          : (next as NavigationLink);
      if (!child) return;
      update(
        items.map((item) =>
          item.id === editing.parentId && item.kind === "dropdown"
            ? {
                ...item,
                children: editing.isNew
                  ? [...item.children, child]
                  : item.children.map((entry) =>
                      entry.id === child.id ? child : entry,
                    ),
              }
            : item,
        ),
      );
    }
    setEditing(null);
  }
  function toggle(itemId: string, parentId: string | null) {
    update(
      parentId === null
        ? items.map((item) =>
            item.id === itemId ? { ...item, visible: !item.visible } : item,
          )
        : items.map((item) =>
            item.id === parentId && item.kind === "dropdown"
              ? {
                  ...item,
                  children: item.children.map((child) =>
                    child.id === itemId
                      ? { ...child, visible: !child.visible }
                      : child,
                  ),
                }
              : item,
          ),
    );
  }
  function duplicate(
    item: NavigationItem | NavigationLink,
    parentId: string | null,
  ) {
    if (parentId === null) {
      const main = item as NavigationItem;
      update([
        ...items,
        main.kind === "dropdown"
          ? {
              ...main,
              id: id(),
              label: `${main.label} (สำเนา)`,
              children: main.children.map((child) => ({ ...child, id: id() })),
            }
          : { ...main, id: id(), label: `${main.label} (สำเนา)` },
      ]);
    } else {
      const child = item as NavigationLink;
      update(
        items.map((main) =>
          main.id === parentId && main.kind === "dropdown"
            ? {
                ...main,
                children: [
                  ...main.children,
                  { ...child, id: id(), label: `${child.label} (สำเนา)` },
                ],
              }
            : main,
        ),
      );
    }
  }
  function remove() {
    if (!deleting) return;
    update(
      deleting.parentId === null
        ? items.filter((item) => item.id !== deleting.id)
        : items.map((item) =>
            item.id === deleting.parentId && item.kind === "dropdown"
              ? {
                  ...item,
                  children: item.children.filter(
                    (child) => child.id !== deleting.id,
                  ),
                }
              : item,
          ),
    );
    setDeleting(null);
  }
  function move(itemId: string, parentId: string | null, direction: -1 | 1) {
    if (parentId === null) {
      const index = items.findIndex((item) => item.id === itemId);
      if (
        index >= 0 &&
        index + direction >= 0 &&
        index + direction < items.length
      )
        update(reorder(items, index, index + direction));
      return;
    }
    update(
      items.map((item) => {
        if (item.id !== parentId || item.kind !== "dropdown") return item;
        const index = item.children.findIndex((child) => child.id === itemId);
        return index >= 0 &&
          index + direction >= 0 &&
          index + direction < item.children.length
          ? {
              ...item,
              children: reorder(item.children, index, index + direction),
            }
          : item;
      }),
    );
  }

  const toggleCollapsed = (itemId: string) =>
    setCollapsed((value) => ({ ...value, [itemId]: !(value[itemId] ?? true) }));
  const totalRows = items.length + 1;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const visibleItems = items.slice(
    Math.max(0, start - 1),
    Math.max(0, start + pageSize - 1),
  );

  if (!loaded && !notice) return <AdminContentLoading />;
  if (!loaded)
    return (
      <main className="navigation-manager category-manager">
        <header className="navigation-heading">
          <div>
            <h1>เมนูนำทาง</h1>
            <p>{notice}</p>
          </div>
        </header>
      </main>
    );

  async function publish() {
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navigation, revision }),
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        typeof result !== "object" ||
        result === null ||
        !("revision" in result) ||
        typeof result.revision !== "number"
      ) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "เผยแพร่เมนูไม่สำเร็จ";
        throw new Error(message);
      }
      setRevision(result.revision);
      setSavedSnapshot(JSON.stringify(navigation));
      setToast({
        title: "เผยแพร่เมนูแล้ว",
        description: "เมนูนำทางบนเว็บไซต์ประชาชนอัปเดตเรียบร้อย",
        variant: "success",
      });
      window.dispatchEvent(new Event("hos-navigation-published"));
    } catch (error) {
      setToast({
        title: "เผยแพร่เมนูไม่สำเร็จ",
        description:
          error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="navigation-manager category-manager">
      <header className="navigation-heading">
        <div>
          <h1>เมนูนำทาง</h1>
          <p>จัดลำดับเมนูหลักและเมนูย่อยที่แสดงบนเว็บไซต์ประชาชน</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => add(null)}
        >
          <Plus size={16} /> เพิ่มเมนูหลัก
        </button>
      </header>
      <section className="navigation-table-card admin-data-table">
        <div className="navigation-table-scroll admin-data-table-scroll" tabIndex={0} role="region" aria-label="ตารางเมนูนำทาง เลื่อนซ้ายขวาได้">
          <div
            className="navigation-table admin-data-grid"
            role="table"
            aria-label="รายการเมนูนำทาง"
          >
            <div
              className="navigation-table-row navigation-table-head"
              role="row"
            >
              <span role="columnheader">ลำดับ</span>
              <span role="columnheader">ชื่อเมนู</span>
              <span role="columnheader">ปลายทาง</span>
              <span role="columnheader">สถานะ</span>
              <span role="columnheader">จัดการ</span>
            </div>
            {safePage === 1 ? (
              <div
                className="navigation-table-row navigation-home-row"
                role="row"
              >
                <span className="navigation-order" role="cell">
                  1
                </span>
                <strong role="cell">{navigation.home.label}</strong>
                <span role="cell">หน้าแรก</span>
                <span role="cell">
                  <span className="category-manager-status active">แสดง</span>
                </span>
                <span className="navigation-home-lock" role="cell">
                  เมนูหลัก · ล็อก
                </span>
              </div>
            ) : null}
            <div className="navigation-list" role="rowgroup">
              {visibleItems.map((item) => {
                const index = items.findIndex((entry) => entry.id === item.id);
                return (
                  <div key={item.id} className="navigation-table-group">
                    <div className="navigation-table-row" role="row">
                      <div className="category-arrow-order" role="cell">
                        <span>{index + 2}</span>
                        <div>
                          <button
                            type="button"
                            disabled={index === 0}
                            aria-label={`เลื่อน ${item.label} ขึ้น`}
                            title="เลื่อนขึ้น"
                            onClick={() => move(item.id, null, -1)}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={index === items.length - 1}
                            aria-label={`เลื่อน ${item.label} ลง`}
                            title="เลื่อนลง"
                            onClick={() => move(item.id, null, 1)}
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="navigation-table-name" role="cell">
                        {item.kind === "dropdown" ? (
                          <button
                            type="button"
                            className="navigation-expand"
                            aria-expanded={!(collapsed[item.id] ?? true)}
                            aria-label={`${(collapsed[item.id] ?? true) ? "ขยาย" : "ย่อ"}เมนูย่อย ${item.label}`}
                            title={(collapsed[item.id] ?? true) ? "ขยายเมนูย่อย" : "ย่อเมนูย่อย"}
                            onClick={() => toggleCollapsed(item.id)}
                          >
                            <ChevronDown
                              size={17}
                              className={
                                (collapsed[item.id] ?? true) ? "rotated" : ""
                              }
                            />
                          </button>
                        ) : (
                          <span className="navigation-expand-spacer" />
                        )}
                        {item.icon ? (
                          <span className="navigation-row-icon">
                            <NavigationIcon name={item.icon} />
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="navigation-name"
                          onClick={() =>
                            item.kind === "dropdown"
                              ? toggleCollapsed(item.id)
                              : setEditing({
                                  item,
                                  parentId: null,
                                  isNew: false,
                                })
                          }
                        >
                          <strong>{item.label}</strong>
                        </button>
                        {item.kind === "dropdown" ? (
                          <small>{item.children.length} เมนูย่อย</small>
                        ) : null}
                      </div>
                      <span className="navigation-target" role="cell">
                        {item.kind === "dropdown"
                          ? "กลุ่มเมนู"
                          : targetLabel(item.target)}
                      </span>
                      <span role="cell">
                        <span
                          className={`category-manager-status${item.visible ? " active" : ""}`}
                        >
                          {item.visible ? "แสดง" : "ซ่อน"}
                        </span>
                      </span>
                      <div className="navigation-table-actions" role="cell">
                        <IconButton
                          label={`${item.visible ? "ซ่อน" : "แสดง"}เมนู ${item.label}`}
                          onClick={() => toggle(item.id, null)}
                        >
                          <VisibilityIcon visible={item.visible} />
                        </IconButton>
                        <IconButton
                          label={`แก้ไข ${item.label}`}
                          onClick={() =>
                            setEditing({ item, parentId: null, isNew: false })
                          }
                        >
                          <Pencil size={16} />
                        </IconButton>
                        <NavigationMoreActions
                          label={item.label}
                          actions={[
                            {
                              label:
                                item.kind === "dropdown"
                                  ? "เพิ่มเมนูย่อย"
                                  : "เปลี่ยนเป็นกลุ่มเมนู",
                              icon: <Plus size={16} />,
                              onClick: () =>
                                item.kind === "dropdown"
                                  ? add(item.id)
                                  : setEditing({
                                      item: {
                                        id: item.id,
                                        kind: "dropdown",
                                        label: item.label,
                                        icon: item.icon,
                                        visible: item.visible,
                                        defaultExpanded: false,
                                        children: [],
                                      },
                                      parentId: null,
                                      isNew: false,
                                    }),
                            },
                            {
                              label: "ทำสำเนา",
                              icon: <Copy size={16} />,
                              onClick: () => duplicate(item, null),
                            },
                            {
                              label: "ลบเมนู",
                              icon: <Trash2 size={16} />,
                              danger: true,
                              onClick: () =>
                                setDeleting({
                                  id: item.id,
                                  parentId: null,
                                  label: item.label,
                                }),
                            },
                          ]}
                        />
                      </div>
                    </div>
                    {item.kind === "dropdown" &&
                    !(collapsed[item.id] ?? true) ? (
                      <div className="navigation-subrows" role="rowgroup">
                        {item.children.map((child, childIndex) => (
                          <div
                            key={child.id}
                            className="navigation-table-row navigation-child-row"
                            role="row"
                          >
                            <div className="category-arrow-order" role="cell">
                              <span>
                                {index + 2}.{childIndex + 1}
                              </span>
                              <div>
                                <button
                                  type="button"
                                  disabled={childIndex === 0}
                                  aria-label={`เลื่อน ${child.label} ขึ้น`}
                                  title="เลื่อนขึ้น"
                                  onClick={() => move(child.id, item.id, -1)}
                                >
                                  <ChevronUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    childIndex === item.children.length - 1
                                  }
                                  aria-label={`เลื่อน ${child.label} ลง`}
                                  title="เลื่อนลง"
                                  onClick={() => move(child.id, item.id, 1)}
                                >
                                  <ChevronDown size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="navigation-table-name" role="cell">
                              <ChevronRight size={15} aria-hidden="true" />
                              <button
                                type="button"
                                className="navigation-name"
                                onClick={() =>
                                  setEditing({
                                    item: child,
                                    parentId: item.id,
                                    isNew: false,
                                  })
                                }
                              >
                                <strong>{child.label}</strong>
                              </button>
                            </div>
                            <span className="navigation-target" role="cell">
                              {targetLabel(child.target)}
                            </span>
                            <span role="cell">
                              <span
                                className={`category-manager-status${child.visible ? " active" : ""}`}
                              >
                                {child.visible ? "แสดง" : "ซ่อน"}
                              </span>
                            </span>
                            <div
                              className="navigation-table-actions"
                              role="cell"
                            >
                              <IconButton
                                label={`${child.visible ? "ซ่อน" : "แสดง"}เมนู ${child.label}`}
                                onClick={() => toggle(child.id, item.id)}
                              >
                                <VisibilityIcon visible={child.visible} />
                              </IconButton>
                              <IconButton
                                label={`แก้ไข ${child.label}`}
                                onClick={() =>
                                  setEditing({
                                    item: child,
                                    parentId: item.id,
                                    isNew: false,
                                  })
                                }
                              >
                                <Pencil size={16} />
                              </IconButton>
                              <NavigationMoreActions
                                label={child.label}
                                actions={[
                                  {
                                    label: "ทำสำเนา",
                                    icon: <Copy size={16} />,
                                    onClick: () => duplicate(child, item.id),
                                  },
                                  {
                                    label: "ลบเมนู",
                                    icon: <Trash2 size={16} />,
                                    danger: true,
                                    onClick: () =>
                                      setDeleting({
                                        id: child.id,
                                        parentId: item.id,
                                        label: child.label,
                                      }),
                                  },
                                ]}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <AdminTablePagination
          className="navigation-pagination"
          page={safePage}
          pageCount={pageCount}
          pageSize={pageSize}
          total={totalRows}
          label="เปลี่ยนหน้าเมนูนำทาง"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>
      {hasChanges ? (
        <div className="navigation-publish-bar">
          <div>
            <strong>มีการเปลี่ยนแปลงที่ยังไม่ได้เผยแพร่</strong>
            <small>
              เมนูบนเว็บไซต์ประชาชนยังเป็นเวอร์ชันล่าสุดที่บันทึกไว้
            </small>
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={saving}
            onClick={() => {
              void publish();
            }}
          >
            {saving ? "กำลังบันทึก…" : "บันทึกและเผยแพร่"}
          </button>
        </div>
      ) : null}
      {editing && (
        <MenuEditor
          editing={editing}
          entityTargets={entityTargets}
          onClose={() => setEditing(null)}
          onSave={saveItem}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`ลบเมนู “${deleting.label}”?`}
          description="เมนูและเมนูย่อยภายในจะถูกนำออกจากโครงสร้าง การเปลี่ยนแปลงจะมีผลเมื่อกดบันทึกและเผยแพร่"
          confirmLabel="ลบเมนู"
          onClose={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </main>
  );
}

function IconButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`nav-icon-button ${danger ? "danger" : ""}`}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function VisibilityIcon({ visible }: { visible: boolean }) {
  return visible ? <Eye size={17} /> : <EyeOff size={17} />;
}
type MoreAction = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
};
function NavigationMoreActions({
  label,
  actions,
}: {
  label: string;
  actions: MoreAction[];
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  useEffect(() => {
    if (!position) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !triggerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      )
        setPosition(null);
    };
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPosition(null);
        triggerRef.current?.focus();
      }
    };
    const close = () => setPosition(null);
    const stopDismissal = listenForDropdownDismissal(
      () => menuRef.current,
      (target) => target instanceof Node && Boolean(triggerRef.current?.contains(target) || menuRef.current?.contains(target)),
      () => setPosition(null),
    );
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnKey);

    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnKey);
      stopDismissal();
      window.removeEventListener("resize", close);
    };
  }, [position]);
  function toggleMenu() {
    if (position) {
      setPosition(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 190;
    const height = actions.length * 39 + 12;
    setPosition({
      left: Math.max(
        8,
        Math.min(rect.right - width, window.innerWidth - width - 8),
      ),
      top:
        rect.bottom + height + 8 > window.innerHeight
          ? Math.max(8, rect.top - height - 6)
          : rect.bottom + 6,
    });
  }
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="nav-icon-button"
        title="ตัวเลือกเพิ่มเติม"
        aria-label={`ตัวเลือกเพิ่มเติมสำหรับ ${label}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        onClick={toggleMenu}
      >
        <MoreHorizontal size={18} />
      </button>
      {position
        ? createPortal(
            <div
              ref={menuRef}
              className="navigation-more-menu"
              role="menu"
              style={position}
            >
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  className={action.danger ? "danger" : ""}
                  onClick={() => {
                    setPosition(null);
                    action.onClick();
                  }}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
function NavigationIconPicker({
  value,
  onChange,
}: {
  value?: NavigationIconName;
  onChange: (value?: NavigationIconName) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !detailsRef.current?.contains(event.target)
      )
        detailsRef.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", closeOutside);
    const stopDismissal = listenForDropdownDismissal(
      () => detailsRef.current?.querySelector(".navigation-icon-grid"),
      (target) => target instanceof Node && Boolean(detailsRef.current?.contains(target)),
      () => detailsRef.current?.removeAttribute("open"),
    );
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      stopDismissal();
    };
  }, []);
  return (
    <div className="navigation-icon-field">
      <span>ไอคอนเมนูหลัก</span>
      <details
        ref={detailsRef}
        className="navigation-icon-picker"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            detailsRef.current?.removeAttribute("open");
            detailsRef.current?.querySelector("summary")?.focus();
          }
        }}
      >
        <summary>
          <span>
            {value ? <NavigationIcon name={value} size={18} /> : null}
            {value ? navigationIcons[value].label : "ไม่ใช้ไอคอน"}
          </span>
          <ChevronDown size={17} />
        </summary>
        <div className="navigation-icon-grid" aria-label="เลือกไอคอนเมนูหลัก">
          <button
            type="button"
            className={!value ? "selected" : ""}
            aria-label="ไม่ใช้ไอคอน"
            title="ไม่ใช้ไอคอน"
            onClick={() => {
              onChange(undefined);
              detailsRef.current?.removeAttribute("open");
            }}
          >
            <X size={19} />
            <small>ไม่มี</small>
          </button>
          {navigationIconNames.map((name) => (
            <button
              key={name}
              type="button"
              className={value === name ? "selected" : ""}
              aria-label={navigationIcons[name].label}
              aria-pressed={value === name}
              title={navigationIcons[name].label}
              onClick={() => {
                onChange(name);
                detailsRef.current?.removeAttribute("open");
              }}
            >
              <NavigationIcon name={name} size={21} />
              <small>{navigationIcons[name].label}</small>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
function MenuEditor({
  editing,
  entityTargets,
  onClose,
  onSave,
}: {
  editing: Editing;
  entityTargets: EntityTargetOption[];
  onClose: () => void;
  onSave: (item: NavigationItem | NavigationLink) => void;
}) {
  const [item, setItem] = useState(editing.item);
  const [icon, setIcon] = useState<NavigationIconName | undefined>(
    editing.parentId === null && "icon" in editing.item
      ? editing.item.icon
      : undefined,
  );
  const isDropdown = "kind" in item && item.kind === "dropdown";
  const link = isDropdown ? null : (item as NavigationLink);
  const targetKind = link?.target.kind ?? "dropdown";
  function changeKind(kind: string) {
    if (kind === "dropdown")
      return setItem({
        id: item.id,
        kind: "dropdown",
        label: item.label,
        visible: item.visible,
        hideWhenLoggedOut: item.hideWhenLoggedOut ?? false,
        defaultExpanded:
          "kind" in item && item.kind === "dropdown"
            ? (item.defaultExpanded ?? false)
            : false,
        children:
          "kind" in item && item.kind === "dropdown" ? item.children : [],
      });
    const base = {
      id: item.id,
      label: item.label,
      visible: item.visible,
      openInNewTab: link?.openInNewTab ?? false,
      hideWhenLoggedOut: item.hideWhenLoggedOut ?? false,
    };
    const firstEntity = entityTargets[0];
    const target: LinkTarget =
      kind === "external"
        ? { kind: "external", url: "https://" }
        : kind === "entity"
          ? {
              kind: "entity",
              entity: firstEntity?.entity ?? "page",
              id: firstEntity?.id ?? "about",
            }
          : { kind: "module", module: "news" };
    setItem(
      editing.parentId === null
        ? { ...base, kind: "link", target }
        : { ...base, target },
    );
  }
  const valid =
    item.label.trim().length > 0 &&
    (isDropdown ||
      link?.target.kind !== "external" ||
      /^https?:\/\/.+/.test(link.target.url)) &&
    (link?.target.kind !== "entity" || entityTargets.length > 0);
  return (
    <div className="modal-layer">
      <button className="modal-backdrop" aria-label="ปิด" onClick={onClose} />
      <div
        className="menu-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-editor-title"
      >
        <header>
          <h2 id="menu-editor-title">
            {editing.isNew ? "เพิ่ม" : "แก้ไข"}
            {editing.parentId ? "เมนูย่อย" : "เมนูหลัก"}
          </h2>
          <button onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </header>
        <div className="menu-editor-body">
          <label>
            ชื่อเมนู
            <input
              value={item.label}
              maxLength={60}
              onChange={(event) =>
                setItem({ ...item, label: event.target.value })
              }
            />
          </label>
          {editing.parentId === null ? (
            <NavigationIconPicker value={icon} onChange={setIcon} />
          ) : null}
          <label>
            ประเภทปลายทาง
            <NativeSelect
              value={targetKind}
              onChange={(event) => changeKind(event.target.value)}
            >
              <option value="module">ส่วนหลักของเว็บไซต์</option>
              <option value="entity">หน้าเว็บไซต์หรือหน่วยงาน</option>
              <option value="external">เว็บไซต์ภายนอก</option>
              {editing.parentId === null && (
                <option value="dropdown">ไม่มีลิงก์ / เมนูแบบ Dropdown</option>
              )}
            </NativeSelect>
          </label>
          {isDropdown && (
            <label>
              สถานะเมนูย่อยเริ่มต้น
              <NativeSelect
                value={
                  (item.defaultExpanded ?? false) ? "expanded" : "collapsed"
                }
                onChange={(event) =>
                  setItem({
                    ...item,
                    defaultExpanded: event.target.value === "expanded",
                  })
                }
              >
                <option value="expanded">เปิดเมนูย่อยไว้</option>
                <option value="collapsed">ย่อเมนูย่อยไว้</option>
              </NativeSelect>
            </label>
          )}
          {link?.target.kind === "module" && (
            <label>
              ไปยัง
              <NativeSelect
                value={link.target.module}
                onChange={(event) =>
                  setItem({
                    ...link,
                    target: {
                      kind: "module",
                      module: event.target.value as Extract<
                        LinkTarget,
                        { kind: "module" }
                      >["module"],
                    },
                  })
                }
              >
                {modules.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
          )}
          {link?.target.kind === "entity" && (
            <label>
              หน้าเป้าหมาย
              <AnchoredSelect
                className="entity-target-select"
                label="หน้าเป้าหมาย"
                value={`${link.target.entity}:${link.target.id}`}
                options={entityTargets.map((option) => ({
                  value: `${option.entity}:${option.id}`,
                  label: option.label,
                  description: option.path,
                  group:
                    option.entity === "page"
                      ? "หน้าเว็บไซต์"
                      : "หน่วยงานและกลุ่มงาน",
                }))}
                onChange={(value) => {
                  const option = entityTargets.find(
                    (entry) => `${entry.entity}:${entry.id}` === value,
                  );
                  if (option)
                    setItem({
                      ...link,
                      target: {
                        kind: "entity",
                        entity: option.entity,
                        id: option.id,
                      },
                    });
                }}
              />
              {entityTargets.length === 0 ? (
                <small className="editor-empty-targets">
                  ยังไม่มีหน้าเว็บไซต์หรือหน่วยงานให้เลือก
                </small>
              ) : null}
            </label>
          )}
          {link?.target.kind === "external" && (
            <label>
              URL
              <input
                value={link.target.url}
                placeholder="https://example.com"
                onChange={(event) =>
                  setItem({
                    ...link,
                    target: { kind: "external", url: event.target.value },
                  })
                }
              />
            </label>
          )}
          <div className="checkbox">
            <input
              id="navigation-hide-when-logged-out"
              type="checkbox"
              checked={item.hideWhenLoggedOut ?? false}
              onChange={(event) =>
                setItem({ ...item, hideWhenLoggedOut: event.target.checked })
              }
            />
            <label htmlFor="navigation-hide-when-logged-out">ซ่อนเมนูนี้จากผู้ที่ยังไม่ได้เข้าสู่ระบบ</label>
          </div>
          {link && (
            <div className="checkbox">
              <input
                id="navigation-open-in-new-tab"
                type="checkbox"
                checked={link.openInNewTab}
                onChange={(event) =>
                  setItem({ ...link, openInNewTab: event.target.checked })
                }
              />
              <label htmlFor="navigation-open-in-new-tab">เปิดลิงก์ในแท็บใหม่</label>
            </div>
          )}
        </div>
        <footer>
          <button onClick={onClose}>ยกเลิก</button>
          <button
            className="primary-button"
            disabled={!valid}
            onClick={() =>
              onSave(
                editing.parentId === null
                  ? ({ ...item, icon } as NavigationItem)
                  : item,
              )
            }
          >
            บันทึก
          </button>
        </footer>
      </div>
    </div>
  );
}
