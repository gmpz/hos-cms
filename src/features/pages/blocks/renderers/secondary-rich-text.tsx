import { richTextDocumentFromMarkdown } from "../migrations/rich-text";
import { RichText } from "./rich-text";

export function SecondaryRichText({ value }: { value: string }) {
  return <RichText content={richTextDocumentFromMarkdown(value)} />;
}
