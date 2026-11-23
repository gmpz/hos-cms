"use client";

import { createId } from "@/utils/create-id";
import { AlertCircle, Copy, Eye, EyeOff, FilePenLine, LayoutTemplate, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { showGlobalToast } from "@/components/ui/global-toast";
import Link from "next/link";
import { createPortal } from "react-dom";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";
import { useEffect, useRef, useState } from "react";
import { PendingDraftStatus, StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AdminTableLoadingRows } from "@/components/admin/admin-content-loading";
import { AdminTablePagination } from "@/components/admin/admin-table-pagination";
import { CategorySelect } from "@/features/categories/components/category-select";
import type { DemoPost } from "@/features/pages/demo/data";
import type { DemoUnit } from "@/features/units/demo/model";
import { refreshUnits } from "@/features/units/demo/storage";
import { categoriesChangedEvent, categoryName, readCategories } from "@/features/categories/demo/storage";
import type { DemoCategory } from "@/features/categories/types";
import { actOnPost, postsChangeEvent } from "../demo/storage";
import { fetchPostListPage, type PostListPage } from "../list-page";
import { NewsCreationDialog } from "./news-creation-dialog";
const confirmationCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newConfirmationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => confirmationCharacters[byte % confirmationCharacters.length]).join("");
}


function NewsActionsMenu({ post, disabled, onAction }: { post: DemoPost; disabled: boolean; onAction: (action: "duplicate" | "unpublish" | "delete") => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!position) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const closeOnPointer = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node) || triggerRef.current?.contains(event.target as Node)) return;
      setPosition(null);
    };
    const closeOnResize = () => setPosition(null);
    const stopDismissal = listenForDropdownDismissal(
      () => menuRef.current,
      (target) => target instanceof Node && Boolean(triggerRef.current?.contains(target) || menuRef.current?.contains(target)),
      () => setPosition(null),
    );
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPosition(null);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnPointer);
    document.addEventListener("keydown", closeOnKey);

    window.addEventListener("resize", closeOnResize);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointer);
      document.removeEventListener("keydown", closeOnKey);
      stopDismissal();
      window.removeEventListener("resize", closeOnResize);
    };
  }, [position]);

  function toggleMenu() {
    if (position) { setPosition(null); return; }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 205;
    const menuHeight = (post.status === "published" ? 3 : 2) * 40 + 12;
    setPosition({
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
      top: rect.bottom + menuHeight + 8 > window.innerHeight ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
    });
  }

  return <>
    <button ref={triggerRef} type="button" disabled={disabled} title="ตัวเลือกเพิ่มเติม" aria-label={`ตัวเลือกเพิ่มเติม ${post.title}`} aria-haspopup="menu" aria-expanded={Boolean(position)} onClick={toggleMenu}><MoreHorizontal size={18}/></button>
    {position ? createPortal(<div ref={menuRef} className="news-actions-menu" role="menu" aria-label={`จัดการ ${post.title}`} style={position}>
      <button type="button" role="menuitem" onClick={() => { setPosition(null); onAction("duplicate"); }}><Copy size={15}/>คัดลอกเป็นฉบับร่าง</button>
      {post.status === "published" ? <button type="button" role="menuitem" onClick={() => { setPosition(null); onAction("unpublish"); }}><EyeOff size={15}/>ยกเลิกเผยแพร่</button> : null}
      <button type="button" role="menuitem" className="danger" onClick={() => { setPosition(null); onAction("delete"); }}><Trash2 size={15}/>ลบข่าว</button>
    </div>, document.body) : null}
  </>;
}

export function NewsManager() {
  const [creationOpen, setCreationOpen] = useState(false);
  const [postPage, setPostPage] = useState<PostListPage | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [units, setUnits] = useState<DemoUnit[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [year, setYear] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [categories, setCategories] = useState<DemoCategory[]>(() => readCategories("posts"));
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [unitId, setUnitId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pendingAction, setPendingAction] = useState<{ action: "unpublish" | "delete" | "restore" | "purge"; post: DemoPost } | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const setToast = showGlobalToast;
  const queryKey = JSON.stringify([currentPage, pageSize, debouncedSearch, categoryId, status, unitId, year, showTrash, refreshKey]);
  const loading = loadedKey !== queryKey;
  async function runAction(post: DemoPost, action: "duplicate" | "unpublish" | "delete" | "restore" | "purge") {
    if (workingId) return;
    setWorkingId(post.id);
    try {
      await actOnPost(post, action);
      setToast({ id: createId(), title: action === "duplicate" ? "คัดลอกข่าวแล้ว" : action === "unpublish" ? "ยกเลิกเผยแพร่แล้ว" : action === "restore" ? "กู้คืนข่าวแล้ว" : action === "purge" ? "ลบข่าวถาวรแล้ว" : "ลบข่าวแล้ว", description: action === "duplicate" ? `“${post.title}” ถูกคัดลอกเป็นฉบับร่าง` : action === "unpublish" ? `“${post.title}” ไม่แสดงบนเว็บไซต์แล้ว` : action === "restore" ? `“${post.title}” กลับสู่รายการข่าวเป็นฉบับร่าง` : action === "purge" ? `ลบรายการ “${post.title}” ถาวรแล้ว โดยคงไฟล์ไว้ในคลังสื่อ` : `นำ “${post.title}” ออกจากรายการแล้ว`, variant: "success" });
    } catch (error) {
      setToast({ id: createId(), title: "จัดการข่าวไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง", variant: "error" });
    } finally {
      setPendingAction(null);
      setConfirmationText("");
      setWorkingId(null);
    }
  }
  useEffect(() => {
    const refresh = () => { setRefreshKey((value) => value + 1); setCategories(readCategories("posts")); };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    void refreshUnits(true).then(setUnits).catch(() => undefined);
    window.addEventListener(postsChangeEvent, refresh);
    window.addEventListener(categoriesChangedEvent, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener(postsChangeEvent, refresh);
      window.removeEventListener(categoriesChangedEvent, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    const requestKey = JSON.stringify([currentPage, pageSize, debouncedSearch, categoryId, status, unitId, year, showTrash, refreshKey]);
    void fetchPostListPage("admin", { page: currentPage, size: pageSize, search: debouncedSearch, category: categoryId, status, unit: unitId, year, trash: showTrash ? 1 : 0 }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setPostPage(result);
        setLoadError("");
        setLoadedKey(requestKey);
        if (year !== "all" && !result.years.includes(Number(year))) setYear("all");
        if (result.page !== currentPage) setCurrentPage(result.page);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "โหลดข่าวไม่สำเร็จ");
        setPostPage(null);
        setLoadedKey(requestKey);
      });
    return () => controller.abort();
  }, [currentPage, pageSize, debouncedSearch, categoryId, status, unitId, year, showTrash, refreshKey]);
  const total = postPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = postPage?.page ?? 1;
  const visiblePosts = postPage?.items ?? [];

  return (
    <div className="news-manager">
      <header className="news-heading">
        <div>
          <h1>ข่าวและผลงาน</h1>
          <p>สร้างข่าวครั้งเดียว แล้วเลือกให้แสดงในข่าวรวมและหน้ากลุ่มงานได้</p>
        </div>
        <div className="news-heading-actions"><button type="button" className="primary-button" onClick={() => setCreationOpen(true)}><Plus size={16} />สร้างข่าว</button></div>
      </header>
      <div className={`news-toolbar${showTrash ? " trash-mode" : ""}`}>
        <label className="news-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหาชื่อข่าว..."
          />
        </label>
        {!showTrash ? <CategorySelect
          scope="posts"
          value={categoryId === "all" ? null : categoryId}
          allowAll
          label="กรองหมวดหมู่"
          showManageLink={false}
          onChange={(nextId) => { setCategoryId(nextId ?? "all"); setCurrentPage(1); }}
        /> : null}
        {!showTrash ? <NativeSelect
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            if (event.target.value === "draft") setYear("all");
            setCurrentPage(1);
          }}
          aria-label="กรองสถานะ"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="published">เผยแพร่</option>
          <option value="draft">ฉบับร่าง</option>
        </NativeSelect> : null}
        <NativeSelect
          value={unitId}
          onChange={(event) => {
            setUnitId(event.target.value);
            setCurrentPage(1);
          }}
          aria-label="กรองกลุ่มงาน"
        >
          <option value="all">ทุกกลุ่มงาน</option>
          <option value="hospital">ข่าวโรงพยาบาล</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.shortName || unit.name}
            </option>
          ))}
        </NativeSelect>
        {!showTrash ? <NativeSelect value={year} onChange={(event) => { setYear(event.target.value); setCurrentPage(1); }} aria-label="กรองปีที่เผยแพร่">
          <option value="all">ทุกปีที่เผยแพร่</option>
          {(postPage?.years ?? []).map((item) => <option key={item} value={item}>ปีที่เผยแพร่ {item}</option>)}
        </NativeSelect> : null}
      </div>
      <div className="news-list-switch"><button type="button" className={!showTrash ? "active" : ""} onClick={() => { setShowTrash(false); setCurrentPage(1); }}>รายการข่าว</button><button type="button" className={showTrash ? "active" : ""} onClick={() => { setShowTrash(true); setCurrentPage(1); }}><Trash2 size={15} />ถังขยะ{postPage?.trashTotal ? ` (${postPage.trashTotal})` : ""}</button></div>
      <section className="news-table admin-data-table" aria-busy={loading}>
        <div className="admin-list-table-scroll admin-data-table-scroll" tabIndex={0} role="region" aria-label="ตารางข่าว เลื่อนซ้ายขวาได้">
        <table>
          <thead>
            <tr>
              <th>ข่าว</th>
              <th>หมวดหมู่</th>
              <th>แสดงใน</th>
              <th>สถานะ</th>
              <th>{showTrash ? "ลบเมื่อ" : "เผยแพร่"}</th>
              <th className="news-actions-heading admin-table-actions-heading" scope="col">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <AdminTableLoadingRows kind="news" /> : null}
            {!loading && !loadError && total === 0 ? <tr><td colSpan={6}><div className="news-empty"><Search size={28} /><strong>{showTrash ? "ไม่มีข่าวในถังขยะ" : "ไม่พบข่าว"}</strong><p>{showTrash ? "ข่าวที่ลบจะปรากฏที่นี่เพื่อให้กู้คืนหรือลบถาวร" : "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"}</p></div></td></tr> : null}
            {!loading && visiblePosts.map((post) => (
              <tr key={post.id}>
                <td>
                  <div className="news-title-cell admin-table-primary">
                    <span title={post.editorMode === "form" ? "ข่าวแบบฟอร์ม" : "ข่าวแบบบล็อก"} aria-label={post.editorMode === "form" ? "ข่าวแบบฟอร์ม" : "ข่าวแบบบล็อก"}>
                      {post.editorMode === "form" ? <LayoutTemplate size={18} /> : <FilePenLine size={18} />}
                    </span>
                    <div>
                      <strong>{post.title}</strong>
                    </div>
                  </div>
                </td>
                <td>{categoryName(categories, post.categoryId)}</td>
                <td>{post.owner}</td>
                <td>
                  {showTrash ? <span className="news-deleted-status">อยู่ในถังขยะ</span> : <><StatusBadge status={post.status} />{post.hasUnpublishedChanges ? <PendingDraftStatus /> : null}</>}
                </td>
                <td>
                  <small>{showTrash ? post.deletedAt ?? "—" : post.publishedAt ?? "—"}</small>
                </td>
                <td>
                  <div className="news-actions admin-table-actions">
                    {showTrash ? <><button type="button" disabled={workingId === post.id} title="กู้คืนข่าว" aria-label={`กู้คืน ${post.title}`} onClick={() => setPendingAction({ action: "restore", post })}><RotateCcw size={17} /></button><button type="button" className="danger" disabled={workingId === post.id} title="ลบถาวร" aria-label={`ลบ ${post.title} ถาวร`} onClick={() => { setConfirmationText(""); setConfirmationCode(newConfirmationCode()); setPendingAction({ action: "purge", post }); }}><Trash2 size={17} /></button></> : <>
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      aria-label={`แก้ไข ${post.title}`}
                      title="แก้ไขข่าว"
                    >
                      <Pencil size={15} />
                    </Link>
                    {post.status === "published" ? (
                      <Link
                        href={`/news/${post.slug}`}
                        target="_blank"
                        aria-label={`ดู ${post.title}`}
                        title="ดูข่าวบนเว็บไซต์"
                      >
                        <Eye size={15} />
                      </Link>
                    ) : (
                      <button type="button" disabled title="เผยแพร่ข่าวก่อนจึงจะดูหน้าเว็บไซต์ได้" aria-label={`ยังดู ${post.title} ไม่ได้ เพราะเป็นฉบับร่าง`}><Eye size={15} /></button>
                    )}
                    <NewsActionsMenu post={post} disabled={workingId === post.id} onAction={(action) => { if (action === "duplicate") void runAction(post, action); else setPendingAction({ action, post }); }}/>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {!loading && loadError ? <div className="news-empty" role="alert"><AlertCircle size={28} /><strong>โหลดข่าวไม่สำเร็จ</strong><p>{loadError}</p><button type="button" onClick={() => setRefreshKey((value) => value + 1)}>ลองใหม่</button></div> : !loading && total > 0 ? (
          <AdminTablePagination className="news-pagination" page={safePage} pageCount={totalPages} pageSize={pageSize} total={total} label="เปลี่ยนหน้ารายการข่าวและผลงาน" onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}/>
        ) : null}
      </section>
      {creationOpen ? <NewsCreationDialog onClose={() => setCreationOpen(false)}/> : null}
      {pendingAction?.action === "purge" ? <div className="modal-layer" onKeyDown={(event) => { if (event.key === "Escape") setPendingAction(null); }}>
        <button type="button" className="modal-backdrop" aria-label="ปิดหน้าต่างยืนยัน" onClick={() => setPendingAction(null)} />
        <div className="cms-confirm-dialog news-purge-dialog" role="alertdialog" aria-modal="true" aria-labelledby="news-purge-title" aria-describedby="news-purge-description">
          <div className="cms-confirm-dialog-icon" aria-hidden="true"><Trash2 size={30} /></div>
          <h2 id="news-purge-title">ลบข่าวถาวร?</h2>
          <p id="news-purge-description">ข่าว “{pendingAction.post.title}” จะกู้คืนไม่ได้ แต่ภาพและไฟล์ยังอยู่ในคลังสื่อ</p>
          <label htmlFor="news-purge-confirm">พิมพ์รหัส <strong className="news-purge-code">{confirmationCode}</strong> เพื่อยืนยัน</label>
          <input id="news-purge-confirm" autoFocus value={confirmationText} onChange={(event) => setConfirmationText(event.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" maxLength={6} />
          <div className="cms-confirm-dialog-actions"><button type="button" onClick={() => setPendingAction(null)}>ยกเลิก</button><button type="button" className="cms-confirm-dialog-danger" disabled={workingId !== null || !confirmationCode || confirmationText.trim() !== confirmationCode} onClick={() => { void runAction(pendingAction.post, "purge"); }}>ลบถาวร</button></div>
        </div>
      </div> : pendingAction ? <ConfirmDialog
        title={pendingAction.action === "delete" ? `ลบข่าว “${pendingAction.post.title}”?` : pendingAction.action === "restore" ? `กู้คืนข่าว “${pendingAction.post.title}”?` : `ยกเลิกเผยแพร่ “${pendingAction.post.title}”?`}
        description={pendingAction.action === "delete" ? "ข่าวจะถูกย้ายไปถังขยะและสามารถกู้คืนได้" : pendingAction.action === "restore" ? "ข่าวจะกลับสู่รายการเป็นฉบับร่าง โดยยังไม่แสดงบนหน้าเว็บไซต์" : "ข่าวจะไม่แสดงบนหน้า public และยังแก้ไขหรือเผยแพร่ใหม่ได้"}
        confirmLabel={pendingAction.action === "delete" ? "ลบข่าว" : pendingAction.action === "restore" ? "กู้คืนข่าว" : "ยกเลิกเผยแพร่"}
        variant={pendingAction.action === "delete" ? "danger" : "default"}
        onClose={() => setPendingAction(null)}
        onConfirm={() => { void runAction(pendingAction.post, pendingAction.action); }}
      /> : null}
    </div>
  );
}
