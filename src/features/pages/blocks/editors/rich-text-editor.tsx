"use client";

import "./rich-text-editor.css";
import { AnchoredSelect } from "@/components/ui/anchored-select";
import { scrollIsInsideMenu } from "@/components/ui/dropdown-scroll";

import type { Editor } from "@tiptap/core";
import type { EditorStateSnapshot, JSONContent } from "@tiptap/react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import TextAlign from "@tiptap/extension-text-align";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Ban, ChevronDown, Code, CodeXml, Columns3, Eraser, Highlighter, ImagePlus, Minus, Pilcrow, Plus, Rows3, Table2, Trash2, WrapText } from "lucide-react";
import { Bold, FileText, IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered, Quote, Redo2, Strikethrough, Underline, Undo2, Unlink, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { readPageSummaries } from "@/features/pages/demo/page-list-storage";
import { readUnits } from "@/features/units/demo/storage";
import { MediaPicker } from "@/features/media/components/media-picker";
import { getDemoMediaItem } from "@/features/media/demo/media-registry";
import { selectableModuleRoutes } from "@/features/navigation/module-routes";
import { RichTextLoading } from "./rich-text-loading";

type LinkKind = "internal" | "external" | "media";
type InternalLinkOption = {
  group: "ส่วนหลักของเว็บไซต์" | "หน้าเว็บไซต์" | "หน่วยงานและกลุ่มงาน";
  label: string;
  href: string;
};

const systemLinks: InternalLinkOption[] = selectableModuleRoutes.map(({ label, href }) => ({
  group: "ส่วนหลักของเว็บไซต์", label, href,
}));

const ParagraphIndent = Extension.create({
  name: "paragraphIndent",
  addGlobalAttributes() {
    return [{
      types: ["paragraph"],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (element) => Number(element.getAttribute("data-indent")) || 0,
          renderHTML: (attributes) => {
            const indent = Number(attributes.indent) || 0;
            return indent > 0
              ? { "data-indent": indent, style: `text-indent:${indent * 2}em` }
              : {};
          },
        },
      },
    }];
  },
  addKeyboardShortcuts() {
    const changeIndent = (amount: number) => {
      if (
        !this.editor.isActive("paragraph") ||
        this.editor.isActive("bulletList") ||
        this.editor.isActive("orderedList")
      ) return false;
      const current = Number(this.editor.getAttributes("paragraph").indent) || 0;
      const indent = Math.max(0, Math.min(3, current + amount));
      if (indent === current) return false;
      return this.editor.commands.updateAttributes("paragraph", { indent });
    };
    return {
      Tab: () => changeIndent(1),
      "Shift-Tab": () => changeIndent(-1),
    };
  },
});

function readInternalLinks(): InternalLinkOption[] {
  return [
    ...systemLinks,
    ...readPageSummaries()
      .filter((page) => !page.locked)
      .map((page) => ({
        group: "หน้าเว็บไซต์" as const,
        label: page.name,
        href: `/${page.path}`,
      })),
    ...readUnits().map((unit) => ({
      group: "หน่วยงานและกลุ่มงาน" as const,
      label: unit.shortName || unit.name,
      href: `/units/${unit.slug}`,
    })),
  ];
}

export function RichTextEditor({ value, onChange, compact = false, announcementStyle = false, newsForm = false }: { value: JSONContent; onChange: (value: JSONContent) => void; compact?: boolean; announcementStyle?: boolean; newsForm?: boolean }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkKind, setLinkKind] = useState<LinkKind>("internal");
  const [internalLinks, setInternalLinks] = useState<InternalLinkOption[]>(systemLinks);
  const [internalValue, setInternalValue] = useState("/");
  const [linkValue, setLinkValue] = useState("");
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [linkError, setLinkError] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] }, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      ParagraphIndent,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image.configure({ allowBase64: false }),
      TableKit.configure({ table: { resizable: true, handleWidth: 10 } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: { attributes: { class: "tiptap-content", "aria-label": "เนื้อหา Rich Text" } },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getJSON()),
  });
  if (!editor) return <RichTextLoading/>;

  function openLinkEditor() {
    const current = editor?.getAttributes("link").href as string | undefined;
    const options = readInternalLinks();
    const linkedMediaId = current?.startsWith("#media:")
      ? current.slice("#media:".length)
      : null;
    const isInternal = Boolean(
      !linkedMediaId && (current?.startsWith("/") || current?.startsWith("#")),
    );
    if (current && isInternal && !options.some((option) => option.href === current)) {
      options.push({ group: "หน้าเว็บไซต์", label: "ลิงก์ภายในเดิม", href: current });
    }
    setInternalLinks(options);
    setLinkKind(linkedMediaId ? "media" : current && !isInternal ? "external" : "internal");
    setInternalValue(isInternal && current ? current : options[0]?.href ?? "/");
    setLinkValue(current && !isInternal ? current : "https://");
    setMediaId(linkedMediaId);
    setLinkError("");
    setLinkOpen(true);
  }

  function saveLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = linkKind === "internal"
      ? internalValue
      : linkKind === "media"
        ? mediaId
          ? `#media:${mediaId}`
          : ""
        : linkValue;
    if (linkKind === "media" && !mediaId) {
      setLinkError("กรุณาเลือกไฟล์ PDF จากคลังสื่อ");
      return;
    }
    const href = normalizeHref(input);
    if (input.trim() && href === null) {
      setLinkError("กรุณากรอกลิงก์ที่ถูกต้อง");
      return;
    }
    if (href === "") editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    else if (href) editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  }

  const modalRoot = typeof document !== "undefined" ? editor.view.dom.closest(".admin-shell") ?? document.body : null;
  const linkModal = linkOpen && modalRoot ? createPortal(
    <div className="modal-layer rich-text-link-layer">
      <button type="button" className="modal-backdrop" aria-label="ปิด" onClick={() => setLinkOpen(false)} />
      <form className="menu-editor rich-text-link-modal" role="dialog" aria-modal="true" aria-labelledby="rich-text-link-title" onSubmit={saveLink}>
        <header>
          <h2 id="rich-text-link-title">เพิ่มหรือแก้ไขลิงก์</h2>
          <button type="button" onClick={() => setLinkOpen(false)} aria-label="ปิด"><X size={18} /></button>
        </header>
        <div className="menu-editor-body">
          <div className="rich-text-link-kind" role="group" aria-label="ประเภทลิงก์">
            <button type="button" className={linkKind === "internal" ? "active" : ""} onClick={() => { setLinkKind("internal"); setLinkError(""); }}>ลิงก์ภายใน</button>
            <button type="button" className={linkKind === "external" ? "active" : ""} onClick={() => { setLinkKind("external"); setLinkError(""); }}>ลิงก์ภายนอก</button>
            <button type="button" className={linkKind === "media" ? "active" : ""} onClick={() => { setLinkKind("media"); setLinkError(""); }}>ไฟล์ PDF</button>
          </div>
          {linkKind === "internal" ? (
            <div className="rich-text-link-target">
              <span>หน้าปลายทาง</span>
              <AnchoredSelect
                className="entity-target-select"
                label="หน้าปลายทาง"
                value={internalValue}
                options={internalLinks.map((option) => ({
                  value: option.href,
                  label: option.label,
                  description: option.href,
                  group: option.group,
                }))}
                onChange={setInternalValue}
              />
            </div>
          ) : linkKind === "external" ? (
            <label>
              URL ภายนอก
              <input autoFocus value={linkValue} onChange={(event) => { setLinkValue(event.target.value); setLinkError(""); }} placeholder="https://example.com" aria-invalid={Boolean(linkError)} />
            </label>
          ) : (
            <div className="rich-text-media-link">
              <span className="rich-text-media-icon"><FileText size={20} /></span>
              <div>
                <strong>{getDemoMediaItem(mediaId)?.name ?? "ยังไม่ได้เลือกไฟล์ PDF"}</strong>
                <small>{getDemoMediaItem(mediaId)?.size ?? "เลือกได้เฉพาะไฟล์ PDF จากคลังสื่อ"}</small>
              </div>
              <button type="button" onClick={() => setMediaPickerOpen(true)}>{mediaId ? "เปลี่ยนไฟล์" : "เลือกจากคลังสื่อ"}</button>
            </div>
          )}
          {linkError ? <small className="rich-text-link-error">{linkError}</small> : null}
          <p className="editor-help"><Link2 size={14} />ลิงก์ภายในดึงจากหน้าเว็บไซต์และหน่วยงานที่มีอยู่ในระบบ</p>
        </div>
        <footer>
          <button type="button" onClick={() => setLinkOpen(false)}>ยกเลิก</button>
          <button type="submit" className="primary-button">บันทึกลิงก์</button>
        </footer>
      </form>
    </div>,
    modalRoot,
  ) : null;

  return <div className={`tiptap-editor tiptap-simple-editor${compact ? " is-compact" : ""}${announcementStyle ? " is-announcement-style" : ""}${newsForm ? " is-news-form" : ""}`}>
    <MenuBar editor={editor} linkOpen={linkOpen} onOpenLink={openLinkEditor} onOpenImage={() => setImagePickerOpen(true)} compact={compact} announcementStyle={announcementStyle} newsForm={newsForm} />
    <EditorContent editor={editor} className="tiptap-edit-area" />
    {linkModal}
    {mediaPickerOpen && modalRoot ? createPortal(
      <MediaPicker
        open
        currentId={mediaId}
        acceptKind="pdf"
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(item) => {
          setMediaId(item.id);
          setLinkError("");
          setMediaPickerOpen(false);
        }}
      />,
      modalRoot,
    ) : null}
    {imagePickerOpen && modalRoot ? createPortal(
      <MediaPicker
        open
        currentId={null}
        acceptKind="image"
        onClose={() => setImagePickerOpen(false)}
        onSelect={(item, alt) => {
          if (!item.previewUrl) return;
          editor.chain().focus().setImage({
            src: item.previewUrl,
            alt: alt.trim() || item.alt || item.name,
            title: item.name,
          }).run();
          setImagePickerOpen(false);
        }}
      />,
      modalRoot,
    ) : null}
  </div>;
}

function menuBarStateSelector({ editor }: EditorStateSnapshot<Editor>) {
  const paragraph = editor.isActive("paragraph");
  return {
    isBold: editor.isActive("bold"),
    canBold: editor.can().chain().toggleBold().run(),
    isItalic: editor.isActive("italic"),
    canItalic: editor.can().chain().toggleItalic().run(),
    isUnderline: editor.isActive("underline"),
    canUnderline: editor.can().chain().toggleUnderline().run(),
    isStrike: editor.isActive("strike"),
    canStrike: editor.can().chain().toggleStrike().run(),
    isCode: editor.isActive("code"),
    canCode: editor.can().chain().toggleCode().run(),
    isHighlight: editor.isActive("highlight"),
    highlightColor: typeof editor.getAttributes("highlight").color === "string" ? editor.getAttributes("highlight").color as string : null,
    canHighlight: editor.can().chain().toggleHighlight().run(),
    canClearMarks: editor.can().chain().unsetAllMarks().run(),
    canClearNodes: editor.can().chain().clearNodes().run(),
    headingLevel: editor.isActive("heading") ? Number(editor.getAttributes("heading").level) : null,
    isBulletList: editor.isActive("bulletList"),
    isOrderedList: editor.isActive("orderedList"),
    isBlockquote: editor.isActive("blockquote"),
    isCodeBlock: editor.isActive("codeBlock"),
    canAddColumnBefore: editor.can().addColumnBefore(),
    canAddColumnAfter: editor.can().addColumnAfter(),
    canDeleteColumn: editor.can().deleteColumn(),
    canAddRowBefore: editor.can().addRowBefore(),
    canAddRowAfter: editor.can().addRowAfter(),
    canDeleteRow: editor.can().deleteRow(),
    canDeleteTable: editor.can().deleteTable(),
    canToggleHeaderRow: editor.can().toggleHeaderRow(),
    canToggleHeaderColumn: editor.can().toggleHeaderColumn(),
    canToggleHeaderCell: editor.can().toggleHeaderCell(),
    canMergeOrSplit: editor.can().mergeOrSplit(),
    isLink: editor.isActive("link"),
    textAlign: (["center", "right", "justify"].find((align) => editor.isActive({ textAlign: align })) ?? "left") as "left" | "center" | "right" | "justify",
    paragraph,
    indent: Number(editor.getAttributes("paragraph").indent ?? 0),
    canUndo: editor.can().chain().undo().run(),
    canRedo: editor.can().chain().redo().run(),
  };
}

function MenuBar({ editor, linkOpen, onOpenLink, onOpenImage, compact = false, announcementStyle = false, newsForm = false }: { editor: Editor; linkOpen: boolean; onOpenLink: () => void; onOpenImage: () => void; compact?: boolean; announcementStyle?: boolean; newsForm?: boolean }) {
  const state = useEditorState({ editor, selector: menuBarStateSelector });
  function insertTable() {
    editor.chain().focus().command(({ tr }) => {
      const { $from } = tr.selection;
      if ($from.depth === 1 && $from.parent.type.name === "paragraph" && $from.parent.content.size === 0) {
        tr.setSelection(NodeSelection.create(tr.doc, $from.before(1)));
      }
      return true;
    }).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).command(({ tr }) => {
      let tablePos: number | null = null;
      let closestDistance = Infinity;
      tr.doc.descendants((node, pos) => {
        if (node.type.name !== "table") return true;
        const distance = Math.abs(pos - tr.selection.from);
        if (distance < closestDistance) {
          closestDistance = distance;
          tablePos = pos;
        }
        return false;
      });
      if (tablePos !== null) tr.setSelection(TextSelection.create(tr.doc, tablePos + 4));
      return true;
    }).run();
  }
  const alignIcon = state.textAlign === "center"
    ? <AlignCenter />
    : state.textAlign === "right"
      ? <AlignRight />
      : state.textAlign === "justify"
        ? <AlignJustify />
        : <AlignLeft />;
  if (newsForm) return <div className="tiptap-toolbar" role="toolbar" aria-label="เครื่องมือจัดรูปแบบเนื้อหาข่าว" tabIndex={0}>
    <Tool label="ย้อนกลับ" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2 /></Tool>
    <Tool label="ทำซ้ำ" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2 /></Tool>
    <i aria-hidden="true" />
    <Tool label="ตัวหนา" active={state.isBold} disabled={!state.canBold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></Tool>
    <Tool label="รายการหัวข้อย่อย" active={state.isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></Tool>
    <Tool label="รายการลำดับเลข" active={state.isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></Tool>
    <i aria-hidden="true" />
    <Tool label="เพิ่มหรือแก้ไขลิงก์" active={state.isLink || linkOpen} onClick={onOpenLink}><Link2 /></Tool>
    <Tool label="นำลิงก์ออก" disabled={!state.isLink} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink /></Tool>
    <Tool label="แทรกรูปภาพจากคลังสื่อ" onClick={onOpenImage}><ImagePlus /></Tool>
  </div>;
  if (announcementStyle) return <div className="tiptap-toolbar" role="toolbar" aria-label="จัดรูปแบบข้อความ" tabIndex={0}>
    <Tool label="ตัวหนา" active={state.isBold} disabled={!state.canBold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></Tool>
    <Tool label="ตัวเอียง" active={state.isItalic} disabled={!state.canItalic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></Tool>
    <i aria-hidden="true" />
    <Tool label="รายการหัวข้อย่อย" active={state.isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></Tool>
    <Tool label="รายการลำดับเลข" active={state.isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></Tool>
    <i aria-hidden="true" />
    <Tool label="เพิ่มหรือแก้ไขลิงก์" active={state.isLink || linkOpen} onClick={onOpenLink}><Link2 /></Tool>
    <Tool label="นำลิงก์ออก" disabled={!state.isLink} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink /></Tool>
  </div>;
  if (compact) return <div className="tiptap-toolbar" role="toolbar" aria-label="เครื่องมือจัดรูปแบบเนื้อหาแบบย่อ" tabIndex={0}>
    <ToolbarMenu label="รูปแบบข้อความ" icon={<span className="tiptap-format-label">{state.headingLevel ? `หัวข้อ H${state.headingLevel}` : "ข้อความปกติ"}</span>} className="text-format-menu">
      <MenuTool label="ข้อความปกติ" active={!state.headingLevel} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow /></MenuTool>
      {([2, 3] as const).map((level) => <MenuTool key={level} label={`หัวข้อ H${level}`} active={state.headingLevel === level} onClick={() => editor.chain().focus().setHeading({ level }).run()}><span className="tiptap-heading-option-icon">H{level}</span></MenuTool>)}
    </ToolbarMenu>
    <i aria-hidden="true" />
    <Tool label="ตัวหนา" active={state.isBold} disabled={!state.canBold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></Tool>
    <Tool label="ตัวเอียง" active={state.isItalic} disabled={!state.canItalic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></Tool>
    <ToolbarMenu label="รายการ" icon={state.isOrderedList ? <ListOrdered /> : <List />} active={state.isBulletList || state.isOrderedList}>
      <MenuTool label="รายการหัวข้อย่อย" active={state.isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></MenuTool>
      <MenuTool label="รายการลำดับเลข" active={state.isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></MenuTool>
    </ToolbarMenu>
    <Tool label="เพิ่มหรือแก้ไขลิงก์" active={state.isLink || linkOpen} onClick={onOpenLink}><Link2 /></Tool>
    <Tool label="นำลิงก์ออก" disabled={!state.isLink} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink /></Tool>
  </div>;
  return <div className="tiptap-toolbar" role="toolbar" aria-label="เครื่องมือจัดรูปแบบข้อความ เลื่อนแนวนอนเพื่อดูเครื่องมือเพิ่มเติม" tabIndex={0}>
    <Tool label="ย้อนกลับ" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2 /></Tool>
    <Tool label="ทำซ้ำ" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2 /></Tool>
    <i aria-hidden="true" />
    <ToolbarMenu label="รูปแบบข้อความ" icon={<span className="tiptap-format-label">{state.headingLevel ? `หัวข้อ H${state.headingLevel}` : "ข้อความปกติ"}</span>} className="text-format-menu">
      <MenuTool label="ข้อความปกติ" active={!state.headingLevel} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow /></MenuTool>
      {([1, 2, 3, 4, 5, 6] as const).map((level) => (
        <MenuTool key={level} label={`หัวข้อ H${level}`} active={state.headingLevel === level} onClick={() => editor.chain().focus().setHeading({ level }).run()}><span className="tiptap-heading-option-icon">H{level}</span></MenuTool>
      ))}
    </ToolbarMenu>
    <i aria-hidden="true" />
    <Tool label="ตัวหนา" active={state.isBold} disabled={!state.canBold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></Tool>
    <Tool label="ตัวเอียง" active={state.isItalic} disabled={!state.canItalic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></Tool>
    <Tool label="ขีดเส้นใต้" active={state.isUnderline} disabled={!state.canUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline /></Tool>
    <Tool label="ขีดฆ่า" active={state.isStrike} disabled={!state.canStrike} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough /></Tool>
    <Tool label="โค้ดในข้อความ" active={state.isCode} disabled={!state.canCode} onClick={() => editor.chain().focus().toggleCode().run()}><Code /></Tool>
    <ToolbarMenu label="สีไฮไลต์" icon={<Highlighter />} active={state.isHighlight} hideChevron>
      <HighlightPalette editor={editor} currentColor={state.highlightColor} />
    </ToolbarMenu>
    <ToolbarMenu label="ล้างรูปแบบ" icon={<Eraser />}>
      <MenuTool label="ล้างรูปแบบตัวอักษร" disabled={!state.canClearMarks} onClick={() => editor.chain().focus().unsetAllMarks().run()}><Eraser /></MenuTool>
      <MenuTool label="ล้างรูปแบบย่อหน้า" disabled={!state.canClearNodes} onClick={() => editor.chain().focus().clearNodes().run()}><Pilcrow /></MenuTool>
    </ToolbarMenu>
    <i aria-hidden="true" />
    <ToolbarMenu label="รายการ" icon={state.isOrderedList ? <ListOrdered /> : <List />} active={state.isBulletList || state.isOrderedList}>
      <MenuTool label="รายการหัวข้อย่อย" active={state.isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></MenuTool>
      <MenuTool label="รายการลำดับเลข" active={state.isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></MenuTool>
    </ToolbarMenu>
    <i aria-hidden="true" />
    <Tool label="ลดย่อหน้า" disabled={!state.paragraph || state.indent === 0} onClick={() => editor.chain().focus().updateAttributes("paragraph", { indent: Math.max(0, state.indent - 1) }).run()}><IndentDecrease /></Tool>
    <Tool label="เพิ่มย่อหน้า" disabled={!state.paragraph || state.indent >= 3} onClick={() => editor.chain().focus().updateAttributes("paragraph", { indent: Math.min(3, state.indent + 1) }).run()}><IndentIncrease /></Tool>
    <i aria-hidden="true" />
    <Tool label="เพิ่มหรือแก้ไขลิงก์" active={state.isLink || linkOpen} onClick={onOpenLink}><Link2 /></Tool>
    <Tool label="นำลิงก์ออก" disabled={!state.isLink} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink /></Tool>
    <Tool label="แทรกรูปภาพจากคลังสื่อ" onClick={onOpenImage}><ImagePlus /></Tool>
    <i aria-hidden="true" />
    <ToolbarMenu label="การจัดแนว" icon={alignIcon}>
      <MenuTool label="จัดชิดซ้าย" active={state.textAlign === "left"} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft /></MenuTool>
      <MenuTool label="จัดกึ่งกลาง" active={state.textAlign === "center"} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter /></MenuTool>
      <MenuTool label="จัดชิดขวา" active={state.textAlign === "right"} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight /></MenuTool>
      <MenuTool label="จัดเต็มบรรทัด" active={state.textAlign === "justify"} onClick={() => editor.chain().focus().setTextAlign("justify").run()}><AlignJustify /></MenuTool>
    </ToolbarMenu>
    <i aria-hidden="true" />
    <ToolbarMenu label="บล็อกและตัวแบ่ง" icon={state.isCodeBlock ? <CodeXml /> : state.isBlockquote ? <Quote /> : <Pilcrow />} active={state.isBlockquote || state.isCodeBlock} align="right">
      <MenuTool label="ข้อความอ้างอิง" active={state.isBlockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote /></MenuTool>
      <MenuTool label="บล็อกโค้ด" active={state.isCodeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><CodeXml /></MenuTool>
      <MenuTool label="เส้นคั่น" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus /></MenuTool>
      <MenuTool label="ขึ้นบรรทัดใหม่" onClick={() => editor.chain().focus().setHardBreak().run()}><WrapText /></MenuTool>
    </ToolbarMenu>
    <ToolbarMenu label="ตาราง" icon={<Table2 />} align="right">
      <MenuTool label="แทรกตาราง 3 × 3" onClick={insertTable}><Plus /></MenuTool>
      <MenuTool label="เพิ่มแถวด้านบน" disabled={!state.canAddRowBefore} onClick={() => editor.chain().focus().addRowBefore().run()}><Rows3 /></MenuTool>
      <MenuTool label="เพิ่มแถวด้านล่าง" disabled={!state.canAddRowAfter} onClick={() => editor.chain().focus().addRowAfter().run()}><Rows3 /></MenuTool>
      <MenuTool label="ลบแถว" disabled={!state.canDeleteRow} onClick={() => editor.chain().focus().deleteRow().run()}><Trash2 /></MenuTool>
      <MenuTool label="เพิ่มคอลัมน์ด้านซ้าย" disabled={!state.canAddColumnBefore} onClick={() => editor.chain().focus().addColumnBefore().run()}><Columns3 /></MenuTool>
      <MenuTool label="เพิ่มคอลัมน์ด้านขวา" disabled={!state.canAddColumnAfter} onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns3 /></MenuTool>
      <MenuTool label="ลบคอลัมน์" disabled={!state.canDeleteColumn} onClick={() => editor.chain().focus().deleteColumn().run()}><Trash2 /></MenuTool>
      <MenuTool label="เปิดหรือปิดแถวหัวตาราง" disabled={!state.canToggleHeaderRow} onClick={() => editor.chain().focus().toggleHeaderRow().run()}><Table2 /></MenuTool>
      <MenuTool label="เปิดหรือปิดคอลัมน์หัวตาราง" disabled={!state.canToggleHeaderColumn} onClick={() => editor.chain().focus().toggleHeaderColumn().run()}><Columns3 /></MenuTool>
      <MenuTool label="เปิดหรือปิดเซลล์หัวตาราง" disabled={!state.canToggleHeaderCell} onClick={() => editor.chain().focus().toggleHeaderCell().run()}><Table2 /></MenuTool>
      <MenuTool label="รวมหรือแยกเซลล์" disabled={!state.canMergeOrSplit} onClick={() => editor.chain().focus().mergeOrSplit().run()}><Table2 /></MenuTool>
      <MenuTool label="ลบตาราง" disabled={!state.canDeleteTable} onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 /></MenuTool>
    </ToolbarMenu>
  </div>;
}

function normalizeHref(value: string): string | null {
  const input = value.trim();
  if (!input) return "";
  if (input.startsWith("/") || input.startsWith("#")) return input;
  const candidate = /^(https?:|mailto:|tel:)/i.test(input) ? input : `https://${input}`;
  try {
    return ["http:", "https:", "mailto:", "tel:"].includes(new URL(candidate).protocol) ? candidate : null;
  } catch {
    return null;
  }
}

function Tool({ label, active = false, disabled = false, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled} className={active ? "active" : ""} onClick={onClick}>{children}</button>;
}

function ToolbarMenu({ label, icon, active = false, align = "left", hideChevron = false, className = "", children }: { label: string; icon: ReactNode; active?: boolean; align?: "left" | "right"; hideChevron?: boolean; className?: string; children: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const positionMenu = useCallback((details: HTMLDetailsElement) => {
    const popover = details.querySelector<HTMLElement>(".tiptap-tool-menu-popover");
    if (!popover) return;
    const trigger = details.getBoundingClientRect();
    const saveBar = details.closest(".news-editor")?.querySelector<HTMLElement>(".news-save-bar");
    const bottomLimit = Math.min(window.innerHeight - 12, saveBar?.getBoundingClientRect().top ?? Infinity);
    const roomBelow = Math.max(0, bottomLimit - trigger.bottom - 7);
    const roomAbove = Math.max(0, trigger.top - 12);
    const menuHeight = Math.min(460, popover.scrollHeight);
    const openAbove = roomBelow < Math.min(menuHeight, 180) && roomAbove > roomBelow;
    const availableHeight = openAbove ? roomAbove : roomBelow;
    popover.style.maxHeight = `${Math.min(460, availableHeight)}px`;
    const compactToolbar = Boolean(details.closest(".tiptap-simple-editor.is-compact"));
    if (compactToolbar || details.closest(".builder-block-preview.inline-rich-text, .article-block-preview.inline-rich-text") || window.matchMedia("(max-width: 900px)").matches) {
      popover.style.position = "fixed";
      popover.style.right = "auto";
      popover.style.bottom = "auto";
      const width = popover.offsetWidth;
      const left = details.classList.contains("align-right") ? trigger.right - width : trigger.left;
      popover.style.left = `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`;
      const visibleHeight = Math.min(popover.offsetHeight, availableHeight);
      popover.style.top = `${openAbove ? Math.max(8, trigger.top - visibleHeight - 7) : trigger.bottom + 7}px`;
    } else {
      popover.style.position = "";
      popover.style.left = "";
      popover.style.right = "";
      popover.style.top = openAbove ? "auto" : "";
      popover.style.bottom = openAbove ? "calc(100% + 7px)" : "";
    }
  }, []);

  const syncTopLayer = useCallback((details: HTMLDetailsElement) => {
    const popover = details.querySelector<HTMLElement>(".tiptap-tool-menu-popover");
    if (!popover || typeof popover.showPopover !== "function") return;
    const useTopLayer = details.open && window.matchMedia("(max-width: 900px)").matches;
    if (useTopLayer) {
      popover.setAttribute("popover", "manual");
      if (!popover.matches(":popover-open")) popover.showPopover();
    } else if (popover.hasAttribute("popover")) {
      if (popover.matches(":popover-open")) popover.hidePopover();
      popover.removeAttribute("popover");
    }
  }, []);

  useEffect(() => {
    const isInsideBlock = (target: EventTarget | null) => {
      const details = detailsRef.current;
      const block = details?.closest(".builder-block, .article-block-list > article") ?? details?.closest(".tiptap-simple-editor");
      return target instanceof Node && Boolean(block?.contains(target));
    };
    const closeWhenOutside = (event: MouseEvent) => {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) details.removeAttribute("open");
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (detailsRef.current?.open && !isInsideBlock(event.target)) detailsRef.current.removeAttribute("open");
    };
    const closeWhenScrollingOutside = (event: WheelEvent | TouchEvent) => {
      const details = detailsRef.current;
      if (details?.open && !isInsideBlock(event.target)) details.removeAttribute("open");
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") detailsRef.current?.removeAttribute("open");
      if (["PageDown", "PageUp", "Home", "End", "ArrowUp", "ArrowDown", " "].includes(event.key) && !isInsideBlock(event.target)) detailsRef.current?.removeAttribute("open");
    };
    document.addEventListener("click", closeWhenOutside);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("wheel", closeWhenScrollingOutside, true);
    document.addEventListener("touchmove", closeWhenScrollingOutside, true);
    const repositionOnExternalScroll = (event: Event) => {
      const details = detailsRef.current;
      if (details?.open && !scrollIsInsideMenu(event, details.querySelector(".tiptap-tool-menu-popover"))) positionMenu(details);
    };
    const reposition = () => {
      if (!detailsRef.current?.open) return;
      syncTopLayer(detailsRef.current);
      positionMenu(detailsRef.current);
    };
    window.addEventListener("scroll", repositionOnExternalScroll, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("click", closeWhenOutside);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("wheel", closeWhenScrollingOutside, true);
      document.removeEventListener("touchmove", closeWhenScrollingOutside, true);
      window.removeEventListener("scroll", repositionOnExternalScroll, true);
      window.removeEventListener("resize", reposition);
    };
  }, [positionMenu, syncTopLayer]);

  function closeSiblingMenus() {
    const current = detailsRef.current;
    current?.parentElement
      ?.querySelectorAll<HTMLDetailsElement>(".tiptap-tool-menu[open]")
      .forEach((details) => {
        if (details !== current) details.removeAttribute("open");
      });
  }

  return <details ref={detailsRef} className={`tiptap-tool-menu ${align === "right" ? "align-right" : ""} ${hideChevron ? "no-chevron" : ""} ${className}`} onToggle={(event) => {
    if (event.target !== event.currentTarget) return;
    if (event.currentTarget.open) closeSiblingMenus();
    syncTopLayer(event.currentTarget);
    if (event.currentTarget.open) positionMenu(event.currentTarget);
  }}>
    <summary className={active ? "active" : ""} title={label} aria-label={label}>
      {icon}{hideChevron ? null : <ChevronDown className="tiptap-tool-menu-chevron" />}
    </summary>
    <div className="tiptap-tool-menu-popover" role="menu" aria-label={label}>{children}</div>
  </details>;
}

function MenuTool({ label, active = false, disabled = false, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" role="menuitem" disabled={disabled} className={active ? "active" : ""} onClick={(event) => {
    onClick();
    event.currentTarget.closest("details")?.removeAttribute("open");
  }}>{children}<span>{label}</span></button>;
}

const highlightColors = [
  { label: "เขียว", value: "#bbf7d0" },
  { label: "ฟ้า", value: "#bae6fd" },
  { label: "แดง", value: "#fecaca" },
  { label: "ม่วง", value: "#e9d5ff" },
  { label: "เหลือง", value: "#fef08a" },
] as const;

function HighlightPalette({ editor, currentColor }: { editor: Editor; currentColor: string | null }) {
  function closeMenu(element: HTMLElement) {
    element.closest("details")?.removeAttribute("open");
  }

  return <div className="tiptap-highlight-palette" aria-label="เลือกสีไฮไลต์">
    {highlightColors.map((color) => (
      <button
        key={color.value}
        type="button"
        className={currentColor === color.value ? "selected" : ""}
        title={`ไฮไลต์สี${color.label}`}
        aria-label={`ไฮไลต์สี${color.label}`}
        aria-pressed={currentColor === color.value}
        style={{ "--highlight-color": color.value } as React.CSSProperties}
        onClick={(event) => {
          editor.chain().focus().setHighlight({ color: color.value }).run();
          closeMenu(event.currentTarget);
        }}
      />
    ))}
    <i aria-hidden="true" />
    <button
      type="button"
      className="remove-highlight"
      title="ล้างไฮไลต์"
      aria-label="ล้างไฮไลต์"
      onClick={(event) => {
        editor.chain().focus().unsetHighlight().run();
        closeMenu(event.currentTarget);
      }}
    ><Ban /></button>
  </div>;
}
