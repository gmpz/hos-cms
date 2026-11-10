import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, Newspaper, Search, UsersRound, PanelsTopLeft } from "lucide-react";
import { SearchResultLink } from "@/features/search/components/search-result-link";
import { SearchNewsResultLink } from "@/features/search/components/search-news-result-link";
import { SearchDocumentResultLink } from "@/features/search/components/search-document-result-link";
import { SearchSubmitButton } from "@/features/search/components/search-submit-button";
import { SearchResultsLoading } from "@/features/search/components/search-results-loading";
import { searchSite, siteSearchPageSize, type SearchKind } from "@/server/search/site-search";

export const instant = false;

const kinds: SearchKind[] = ["news", "documents", "units", "pages"];
const icons = { news: Newspaper, documents: FileText, units: UsersRound, pages: PanelsTopLeft };
const labels: Record<SearchKind, string> = { news: "ข่าวสาร", documents: "เอกสาร", units: "หน่วยงาน", pages: "หน้าเว็บไซต์" };

function searchHref(query: string, kind?: SearchKind, page?: number) {
  const params = new URLSearchParams({ q: query });
  if (kind) params.set("type", kind);
  if (page && page > 1) params.set("page", String(page));
  return `/search?${params.toString()}`;
}

export default async function SiteSearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; type?: string | string[]; page?: string | string[] }> }) {
  const params = await searchParams;
  const query = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const selectedKind = typeof params.type === "string" && kinds.includes(params.type as SearchKind) ? params.type as SearchKind : null;
  const requestedPage = typeof params.page === "string" && /^\d{1,4}$/.test(params.page) ? Number(params.page) : 1;
  const page = Math.max(1, requestedPage);
  return (
    <section className="site-search-page">
      <header className="site-search-heading"><h1>ค้นหาข้อมูล</h1><p>ค้นหาข่าว เอกสาร หน่วยงาน และหน้าเว็บไซต์</p></header>
      <Form className="site-search-form" action="/search" role="search">
        <label className="site-search-visually-hidden" htmlFor="site-search-query">คำค้นหา</label>
        <div className="site-search-form-row"><div className="site-search-input"><Search size={22} aria-hidden="true"/><input id="site-search-query" type="search" name="q" defaultValue={query} placeholder="พิมพ์คำที่ต้องการค้นหา…" minLength={2} maxLength={100} required/></div><SearchSubmitButton/></div>
      </Form>
      {!query ? <div className="site-search-state site-search-state-empty">
          <span className="site-search-illustration"><Search size={54} strokeWidth={1.7} aria-hidden="true"/></span>
          <h2>เริ่มค้นหาข้อมูลที่ต้องการ</h2>
          <p>ค้นหาได้จากชื่อข่าว เอกสาร หน่วยงาน หรือเนื้อหาในเว็บไซต์</p>
          <ul className="site-search-categories" aria-label="ประเภทข้อมูลที่ค้นหาได้">{kinds.map((kind) => { const Icon = icons[kind]; return <li key={kind}><Icon size={20} aria-hidden="true"/>{labels[kind]}</li>; })}</ul>
        </div>
        : query.length < 2 ? <div className="site-search-state site-search-state-message"><p>กรุณาพิมพ์คำค้นหาอย่างน้อย 2 ตัวอักษร</p></div>
          : <Suspense key={`${query}:${selectedKind ?? "all"}:${page}`} fallback={<SearchResultsLoading/>}>
              <SearchResults query={query} selectedKind={selectedKind} page={page}/>
            </Suspense>}
    </section>
  );
}

async function SearchResults({ query, selectedKind, page }: { query: string; selectedKind: SearchKind | null; page: number }) {
  const groups = await searchSite(query, selectedKind, page);
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const visibleGroups = selectedKind ? groups.filter((group) => group.kind === selectedKind) : groups;
  const selectedTotal = visibleGroups[0]?.total ?? 0;
  const totalPages = Math.ceil(selectedTotal / siteSearchPageSize);
  if (selectedKind && totalPages > 0 && page > totalPages) redirect(searchHref(query, selectedKind, totalPages));

  return <>
            <p className="site-search-count">ผลการค้นหา <strong>“{query}”</strong> <span>{total.toLocaleString("th-TH")} รายการ</span></p>
            <nav className="site-search-tabs" aria-label="ประเภทผลการค้นหา">
              <Link href={searchHref(query)} aria-current={!selectedKind ? "page" : undefined}>ทั้งหมด <span>{total.toLocaleString("th-TH")}</span></Link>
              {groups.map((group) => <Link key={group.kind} href={searchHref(query, group.kind)} aria-current={selectedKind === group.kind ? "page" : undefined}>{group.label} <span>{group.total.toLocaleString("th-TH")}</span></Link>)}
            </nav>
            {total === 0 ? <div className="site-search-state site-search-state-message"><span className="site-search-illustration"><Search size={44} strokeWidth={1.7} aria-hidden="true"/></span><h2>ไม่พบข้อมูลที่ตรงกับคำค้นหา</h2><p>ลองใช้คำสั้นลงหรือเปลี่ยนคำค้นหา</p></div> : visibleGroups.filter((group) => selectedKind || group.total > 0).map((group) => {
              const Icon = icons[group.kind];
              return <section className="site-search-group" key={group.kind} aria-labelledby={`search-${group.kind}`}>
                <div className="site-search-group-heading"><h2 id={`search-${group.kind}`}><Icon size={23} aria-hidden="true"/>{group.label} <span>{group.total.toLocaleString("th-TH")}</span></h2>{!selectedKind && group.total > group.items.length ? <Link href={searchHref(query, group.kind)}>ดูทั้งหมด <ArrowRight size={17}/></Link> : null}</div>
                {group.items.length ? <div className={group.kind === "documents" ? "public-document-list unit-document-list list-view site-search-document-results" : `site-search-results${group.kind === "news" ? " site-search-news-results" : ""}`}>{group.items.map((item) => group.kind === "news" && item.news ? <SearchNewsResultLink key={item.id} item={item} news={item.news}/> : group.kind === "documents" && item.document ? <SearchDocumentResultLink key={item.id} item={item} document={item.document}/> : <SearchResultLink key={item.id} item={item}/>)}</div> : <p className="site-search-no-group">ไม่พบ{group.label}ที่ตรงกับคำค้นหา</p>}
              </section>;
            })}
            {selectedKind && totalPages > 1 ? <nav className="site-search-pagination" aria-label="หน้าผลการค้นหา">{page > 1 ? <Link href={searchHref(query, selectedKind, page - 1)}>ก่อนหน้า</Link> : <span/>}<span>หน้า {Math.min(page, totalPages)} จาก {totalPages}</span>{page < totalPages ? <Link href={searchHref(query, selectedKind, page + 1)}>ถัดไป</Link> : <span/>}</nav> : null}
          </>;
}
