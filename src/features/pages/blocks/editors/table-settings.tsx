"use client";

import type { BlockConfigMap } from "../config/types";

export function TableSettings({ config, onChange }: {
  config: BlockConfigMap["table"];
  onChange: (config: BlockConfigMap["table"]) => void;
}) {
  return (
    <div className="table-settings">
      <label>
        <span>หัวข้อตาราง</span>
        <input
          value={config.caption}
          placeholder="ไม่บังคับ"
          onChange={(event) => onChange({ ...config, caption: event.target.value })}
        />
      </label>
      <label>
        <span>คำอธิบาย</span>
        <textarea
          rows={3}
          value={config.description}
          placeholder="เพิ่มคำอธิบายใต้หัวข้อตาราง (ไม่บังคับ)"
          onChange={(event) => onChange({ ...config, description: event.target.value })}
        />
      </label>
      <p className="table-settings-hint">แก้หัวคอลัมน์และข้อมูลในตารางได้โดยตรงบนหน้าแก้ไข</p>
    </div>
  );
}
