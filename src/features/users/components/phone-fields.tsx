"use client";

import { phoneDigits, phoneExtensionMaxLength, phoneMaxLength } from "../phone";

type Props = { phone: string; extension?: string; className?: string };

export function PhoneFields({ phone, extension = "", className }: Props) {
  return <div className={className ?? "phone-fields"}>
    <label><span>โทรศัพท์</span><input name="phone" defaultValue={phone} inputMode="numeric" autoComplete="tel" minLength={9} maxLength={phoneMaxLength} pattern="0[0-9]{8,9}" placeholder="เช่น 0812345678" onInput={(event) => { event.currentTarget.value = phoneDigits(event.currentTarget.value); }}/></label>
    <label><span>ต่อ <small>(ถ้ามี)</small></span><input name="phoneExtension" defaultValue={extension} inputMode="numeric" maxLength={phoneExtensionMaxLength} pattern="[0-9]{0,6}" placeholder="เช่น 1234" onInput={(event) => { event.currentTarget.value = phoneDigits(event.currentTarget.value, phoneExtensionMaxLength); }}/></label>
  </div>;
}
