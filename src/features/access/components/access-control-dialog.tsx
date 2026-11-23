"use client";

import { Building2, Check, Globe2, LockKeyhole, Plus, Search, ShieldCheck, UserRound, Users, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";
import type { AccessGrants, AccessLevel, AccessOption, AccessOptions } from "@/features/access/types";

function UserAccessAvatar({ option }: { option: AccessOption }) {
  return <span className={`access-option-icon user${option.photoUrl ? " has-photo" : ""}`} style={option.photoUrl ? { backgroundImage: `url(${option.photoUrl})`, backgroundPosition: `${option.photoFocusX ?? 50}% ${option.photoFocusY ?? 25}%`, backgroundSize: `${option.photoZoom ?? 100}% auto` } : undefined} aria-hidden="true">{option.photoUrl ? null : <UserRound size={17}/>}</span>;
}

const accessChoices: { value: AccessLevel; title: string; description: string; icon: typeof Globe2 }[] = [
  { value: "PUBLIC", title: "สาธารณะ", description: "ทุกคนเปิดดูหน้านี้ได้โดยไม่ต้องเข้าสู่ระบบ", icon: Globe2 },
  { value: "AUTHENTICATED", title: "เฉพาะผู้เข้าสู่ระบบ", description: "บัญชีที่เปิดใช้งานทุกบัญชีเปิดดูได้", icon: LockKeyhole },
  { value: "CUSTOM", title: "กำหนดผู้มีสิทธิ์", description: "เลือกอนุญาตเป็นรายหน่วยงานหรือรายบุคคล", icon: Users },
];

export function AccessControlButton({ level, disabled, notice, onClick }: { level: AccessLevel; disabled?: boolean; notice?: "unsaved" | "draft"; onClick: () => void }) {
  const choice = accessChoices.find((item) => item.value === level) ?? accessChoices[0];
  const noticeLabel = notice === "unsaved" ? "มีการแก้ไขสิทธิ์ที่ยังไม่ได้บันทึก" : notice === "draft" ? "สิทธิ์ที่บันทึกยังไม่ได้เผยแพร่" : null;
  return <button type="button" className="builder-access-button" disabled={disabled} onClick={onClick} title={disabled ? "หน้าแรกต้องเป็นสาธารณะ" : noticeLabel ?? "กำหนดสิทธิ์การเข้าถึง"} aria-label={`สิทธิ์: ${choice.title}${noticeLabel ? ` · ${noticeLabel}` : ""}`}>
    <ShieldCheck size={16}/><span>สิทธิ์: {choice.title}</span>{noticeLabel ? <span className="builder-access-dirty-badge" aria-hidden="true">!</span> : null}
  </button>;
}

export function AccessControlDialog({ initialLevel, initialGrants, options, onClose, onSave }: {
  initialLevel: AccessLevel;
  initialGrants: AccessGrants;
  options: AccessOptions;
  onClose: () => void;
  onSave: (level: AccessLevel, grants: AccessGrants) => void;
}) {
  const [level, setLevel] = useState(initialLevel);
  const [grants, setGrants] = useState<AccessGrants>(initialGrants);
  const grantCount = grants.unitIds.length + grants.userIds.length;
  const valid = level !== "CUSTOM" || grantCount > 0;
  function applySelection() {
    onSave(level, grants);
    onClose();
  }

  return <div className="modal-layer access-control-layer">
    <button type="button" className="modal-backdrop" aria-label="ปิด" onClick={onClose}/>
    <section className="access-control-dialog" role="dialog" aria-modal="true" aria-labelledby="access-control-title">
      <header><div><span><ShieldCheck size={18}/></span><div><h2 id="access-control-title">กำหนดสิทธิ์การเข้าถึง</h2><p>เลือกผู้ที่สามารถเปิดดูหน้านี้หลังเผยแพร่</p></div></div><button type="button" aria-label="ปิด" onClick={onClose}><X size={20}/></button></header>
      <div className="access-control-body">
        <div className="access-level-cards">{accessChoices.map((choice) => {
          const Icon = choice.icon;
          return <button type="button" key={choice.value} className={level === choice.value ? "selected" : ""} onClick={() => setLevel(choice.value)}>
            <span className="access-choice-icon"><Icon size={19}/></span><span><strong>{choice.title}</strong><small>{choice.description}</small></span><i>{level === choice.value ? <Check size={15}/> : null}</i>
          </button>;
        })}</div>
        {level === "CUSTOM" ? <div className="access-custom-panel">
          <div className="access-custom-heading"><div><strong>ผู้ได้รับสิทธิ์</strong><p>ค้นหาแล้วเลือกได้มากกว่าหนึ่งรายการ</p></div><span>{grantCount} รายการ</span></div>
          <AccessAutocomplete options={options} grants={grants} onChange={setGrants}/>
          {!valid ? <p className="access-control-error">กรุณาเลือกหน่วยงานหรือผู้ใช้อย่างน้อย 1 รายการ</p> : null}
        </div> : null}
      </div>
      <footer><button type="button" onClick={onClose}>ยกเลิก</button><button type="button" className="primary-button" disabled={!valid} onClick={applySelection}>ใช้สิทธิ์ที่เลือก</button></footer>
    </section>
  </div>;
}

function AccessAutocomplete({ options, grants, onChange }: {
  options: AccessOptions; grants: AccessGrants; onChange: (grants: AccessGrants) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsId = useId();
  useEffect(() => {
    if (!open) return;
    return listenForDropdownDismissal(
      () => document.getElementById(suggestionsId),
      (target) => target instanceof Node && Boolean(inputRef.current?.closest(".access-autocomplete")?.contains(target)),
      () => setOpen(false),
    );
  }, [open, suggestionsId]);
  const selectedUnits = options.units.filter((option) => grants.unitIds.includes(option.id));
  const selectedUsers = options.users.filter((option) => grants.userIds.includes(option.id));
  const matches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th");
    const includesQuery = (label: string) => !normalized || label.toLocaleLowerCase("th").includes(normalized);
    return {
      units: options.units.filter((option) => !grants.unitIds.includes(option.id) && includesQuery(option.label)).slice(0, 6),
      users: options.users.filter((option) => !grants.userIds.includes(option.id) && includesQuery(option.label)).slice(0, 6),
    };
  }, [options, grants.unitIds, grants.userIds, query]);
  const flatMatches = [
    ...matches.units.map((option) => ({ ...option, kind: "unit" as const })),
    ...matches.users.map((option) => ({ ...option, kind: "user" as const })),
  ];
  function add(kind: "unit" | "user", id: string) {
    if (kind === "unit") onChange({ ...grants, unitIds: [...grants.unitIds, id] });
    else onChange({ ...grants, userIds: [...grants.userIds, id] });
    setQuery("");
    setActiveIndex(-1);
    setOpen(false);
    inputRef.current?.blur();
  }
  function remove(kind: "unit" | "user", id: string) {
    if (kind === "unit") onChange({ ...grants, unitIds: grants.unitIds.filter((item) => item !== id) });
    else onChange({ ...grants, userIds: grants.userIds.filter((item) => item !== id) });
  }

  return <div className="access-autocomplete" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor={`${suggestionsId}-input`}>ค้นหาหน่วยงานหรือผู้ใช้</label>
    <div className="access-search-box"><Search size={18}/><input ref={inputRef} id={`${suggestionsId}-input`} value={query} placeholder="พิมพ์ชื่อหน่วยงาน ชื่อผู้ใช้ หรือชื่อบัญชี..." role="combobox" aria-autocomplete="list" aria-controls={suggestionsId} aria-expanded={open} aria-activedescendant={open && flatMatches[activeIndex] ? `${suggestionsId}-${flatMatches[activeIndex].kind}-${flatMatches[activeIndex].id}` : undefined} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); setOpen(true); }} onKeyDown={(event) => {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key === "ArrowDown" && flatMatches.length) { event.preventDefault(); setActiveIndex((index) => (index + 1) % flatMatches.length); setOpen(true); }
      if (event.key === "ArrowUp" && flatMatches.length) { event.preventDefault(); setActiveIndex((index) => index < 0 ? flatMatches.length - 1 : (index - 1 + flatMatches.length) % flatMatches.length); setOpen(true); }
      if (event.key === "Enter" && open && flatMatches[activeIndex]) { event.preventDefault(); add(flatMatches[activeIndex].kind, flatMatches[activeIndex].id); }
    }}/></div>
    {open ? <div id={suggestionsId} className="access-suggestions" role="listbox" aria-label="ผลการค้นหาผู้ได้รับสิทธิ์">
      {flatMatches.length ? <>
        {matches.units.length ? <div className="access-suggestion-group" role="group" aria-label="หน่วยงาน"><div className="access-suggestion-heading">หน่วยงาน</div>{matches.units.map((option, index) => <button type="button" role="option" aria-selected={activeIndex === index} id={`${suggestionsId}-unit-${option.id}`} key={option.id} className={activeIndex === index ? "active" : ""} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => add("unit", option.id)}><span className="access-option-icon unit"><Building2 size={17}/></span><span className="access-option-copy"><strong>{option.label}</strong><small>หน่วยงาน</small></span><Plus size={17}/></button>)}</div> : null}
        {matches.users.length ? <div className="access-suggestion-group" role="group" aria-label="ผู้ใช้"><div className="access-suggestion-heading">ผู้ใช้</div>{matches.users.map((option, index) => <button type="button" role="option" aria-selected={activeIndex === matches.units.length + index} id={`${suggestionsId}-user-${option.id}`} key={option.id} className={activeIndex === matches.units.length + index ? "active" : ""} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(matches.units.length + index)} onClick={() => add("user", option.id)}><UserAccessAvatar option={option}/><span className="access-option-copy"><strong>{option.label}</strong><small>ผู้ใช้รายบุคคล</small></span><Plus size={17}/></button>)}</div> : null}
      </> : <p>ไม่พบหน่วยงานหรือผู้ใช้ที่ตรงกับคำค้นหา</p>}
    </div> : null}
    <div className="access-granted-list"><div className="access-granted-heading"><strong>ผู้ได้รับสิทธิ์แล้ว</strong><span>{selectedUnits.length + selectedUsers.length} รายการ</span></div>
      {selectedUnits.length || selectedUsers.length ? <div className="access-granted-items">
        {selectedUnits.map((option) => <div key={`unit-${option.id}`} className="access-granted-item"><span className="access-option-icon unit"><Building2 size={17}/></span><span className="access-option-copy"><strong>{option.label}</strong><small>หน่วยงาน</small></span><button type="button" aria-label={`นำ ${option.label} ออก`} title="นำออก" onClick={() => remove("unit", option.id)}><X size={16}/></button></div>)}
        {selectedUsers.map((option) => <div key={`user-${option.id}`} className="access-granted-item"><UserAccessAvatar option={option}/><span className="access-option-copy"><strong>{option.label}</strong><small>ผู้ใช้รายบุคคล</small></span><button type="button" aria-label={`นำ ${option.label} ออก`} title="นำออก" onClick={() => remove("user", option.id)}><X size={16}/></button></div>)}
      </div> : <p className="access-granted-empty">ยังไม่มีผู้ได้รับสิทธิ์ ค้นหาแล้วเลือกหน่วยงานหรือผู้ใช้ด้านบน</p>}
    </div>
  </div>;
}
