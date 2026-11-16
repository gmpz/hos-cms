"use client";

import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { announcementContentDocument, serializeAnnouncementContent } from "../announcement-content";

export function AnnouncementRichTextEditor({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, horizontalRule: false, code: false, strike: false, link: false })],
    content: announcementContentDocument(value),
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": label, class: "announcement-rich-text-content" } },
    onUpdate: ({ editor: current }) => onChange(serializeAnnouncementContent(current.getJSON())),
  });
  useEffect(() => {
    if (editor && serializeAnnouncementContent(editor.getJSON()) !== value) {
      editor.commands.setContent(announcementContentDocument(value), { emitUpdate: false });
    }
  }, [editor, value]);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      bullet: current?.isActive("bulletList") ?? false,
      ordered: current?.isActive("orderedList") ?? false,
      canUndo: current?.can().undo() ?? false,
      canRedo: current?.can().redo() ?? false,
    }),
  });

  return <div className="announcement-rich-text">
    <div className="announcement-rich-text-toolbar" role="toolbar" aria-label="จัดรูปแบบข้อความประกาศ">
      <button type="button" title="ตัวหนา" aria-label="ตัวหนา" aria-pressed={state?.bold ?? false} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={17}/></button>
      <button type="button" title="ตัวเอียง" aria-label="ตัวเอียง" aria-pressed={state?.italic ?? false} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={17}/></button>
      <span aria-hidden="true"/>
      <button type="button" title="รายการหัวข้อย่อย" aria-label="รายการหัวข้อย่อย" aria-pressed={state?.bullet ?? false} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={17}/></button>
      <button type="button" title="รายการลำดับเลข" aria-label="รายการลำดับเลข" aria-pressed={state?.ordered ?? false} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={17}/></button>
      <span aria-hidden="true"/>
      <button type="button" title="ย้อนกลับ" aria-label="ย้อนกลับ" disabled={!state?.canUndo} onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={17}/></button>
      <button type="button" title="ทำซ้ำ" aria-label="ทำซ้ำ" disabled={!state?.canRedo} onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={17}/></button>
    </div>
    <EditorContent editor={editor}/>
  </div>;
}
