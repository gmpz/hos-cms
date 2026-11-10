"use client";

import dynamic from "next/dynamic";
import { RichTextLoading } from "./rich-text-loading";

export const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((module) => module.RichTextEditor),
  { ssr: false, loading: () => <RichTextLoading/> },
);
