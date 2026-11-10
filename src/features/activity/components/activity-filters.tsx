"use client";

import { Search } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { setActivityDateParams, type ActivityDateRange } from "../date-range";

export function ActivityFilters({ query, type, types, typeLabels, range }: {
  range: ActivityDateRange;
  query: string;
  type: string;
  types: string[];
  typeLabels: Record<string, string>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [start, setStart] = useState(range.start);
  const [end, setEnd] = useState(range.end);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) inputRef.current.value = query;
  }, [query]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function navigate(search: string, selectedType: string, dates = range) {
    if (timerRef.current) clearTimeout(timerRef.current);
    const params = new URLSearchParams();
    setActivityDateParams(params, dates);
    if (search.trim()) params.set("q", search.trim().slice(0, 100));
    if (selectedType !== "all") params.set("type", selectedType);
    startTransition(() => router.replace(`/admin/activity${params.size ? `?${params.toString()}` : ""}`, { scroll: false }));
  }

  return <><div className="activity-toolbar" role="search" aria-label="ค้นหาและกรองกิจกรรม" aria-busy={pending}>
    <label className="activity-search"><Search size={17}/><input ref={inputRef} type="search" aria-label="ค้นหากิจกรรม" defaultValue={query} placeholder="ค้นหากิจกรรมหรือผู้ดำเนินการ..." maxLength={100} onKeyDown={(event) => {
      if (event.key === "Enter") {
        if (timerRef.current) clearTimeout(timerRef.current);
        navigate(event.currentTarget.value, type);
      }
    }} onChange={(event) => {
      const value = event.currentTarget.value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => navigate(value, type), 350);
    }}/></label>
    <label className="activity-type-filter"><NativeSelect aria-label="กรองประเภทกิจกรรม" value={type} onChange={(event) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      navigate(inputRef.current?.value ?? "", event.currentTarget.value);
    }}><option value="all">ทุกประเภท</option>{types.map((value) => <option key={value} value={value}>{typeLabels[value] ?? value}</option>)}</NativeSelect></label>
    <label className="activity-date-period"><NativeSelect aria-label="ช่วงเวลากิจกรรม" value={range.period} onChange={(event) => navigate(inputRef.current?.value ?? query, type, { ...range, period: event.target.value as ActivityDateRange["period"] })}>
        <option value="today">วันนี้</option><option value="yesterday">เมื่อวาน</option><option value="week">7 วันล่าสุด</option><option value="custom">กำหนดช่วงวันที่</option>
    </NativeSelect></label>
      {range.period === "custom" ? <form className="activity-custom-dates" onSubmit={(event) => {
        event.preventDefault();
        if (start && end && start <= end) navigate(inputRef.current?.value ?? query, type, { period: "custom", start, end });
      }}>
        <label>ตั้งแต่วันที่<input aria-label="วันที่เริ่มต้น" type="date" required value={start} max={end || undefined} onChange={(event) => setStart(event.target.value)}/></label>
        <label>ถึงวันที่<input aria-label="วันที่สิ้นสุด" type="date" required value={end} min={start || undefined} onChange={(event) => setEnd(event.target.value)}/></label>
        <button className="primary-button" type="submit">แสดงผล</button>
      </form> : null}
      {pending ? <span className="sr-only" role="status">กำลังโหลดบันทึกกิจกรรม...</span> : null}
  </div>
  </>;
}
