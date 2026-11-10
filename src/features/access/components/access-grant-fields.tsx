"use client";

import type { AccessGrants, AccessOptions } from "@/features/access/types";

export function AccessGrantFields({ value, options, onChange }: { value: AccessGrants; options: AccessOptions; onChange: (value: AccessGrants) => void }) {
  function toggle(kind: keyof AccessGrants, id: string, checked: boolean) {
    const values = checked ? [...value[kind], id] : value[kind].filter((current) => current !== id);
    onChange({ ...value, [kind]: values });
  }
  return <div className="access-grant-fields">
    <AccessGroup title="อนุญาตตามหน่วยงาน" empty="ยังไม่มีหน่วยงานให้เลือก" options={options.units} selected={value.unitIds} onToggle={(id, checked) => toggle("unitIds", id, checked)}/>
    <AccessGroup title="อนุญาตรายบุคคล" empty="ยังไม่มีผู้ใช้ที่เปิดใช้งาน" options={options.users} selected={value.userIds} onToggle={(id, checked) => toggle("userIds", id, checked)}/>
  </div>;
}

function AccessGroup({ title, empty, options, selected, onToggle }: { title: string; empty: string; options: AccessOptions["units"]; selected: string[]; onToggle: (id: string, checked: boolean) => void }) {
  return <fieldset className="access-grant-group"><legend>{title}</legend>
    {options.length ? options.map((option) => <label key={option.id}><input type="checkbox" checked={selected.includes(option.id)} onChange={(event) => onToggle(option.id, event.target.checked)}/><span>{option.label}</span></label>) : <small>{empty}</small>}
  </fieldset>;
}
