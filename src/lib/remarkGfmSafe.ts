/**
 * Custom remark-gfm plugin that excludes gfmAutolinkLiteral entirely.
 *
 * The official remark-gfm v4 includes `mdast-util-gfm-autolink-literal` which
 * uses a RegExp **lookbehind** assertion (`(?<=...)`). Lookbehinds are NOT
 * supported on Safari < 16.4 (iOS 15.x), causing a fatal SyntaxError that
 * crashes the entire app.
 *
 * This wrapper re-assembles the same GFM features (tables, strikethrough,
 * task lists, footnotes) minus autolink-literal at BOTH the micromark and
 * mdast-util layers, so the lookbehind code is never imported at all.
 *
 * Trade-off: Plain URLs and emails won't auto-link in markdown, but everything
 * else works identically.
 */

import { combineExtensions } from "micromark-util-combine-extensions";
import { gfmFootnote } from "micromark-extension-gfm-footnote";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import { gfmTable } from "micromark-extension-gfm-table";
import { gfmTaskListItem } from "micromark-extension-gfm-task-list-item";

// Import individual mdast-util extensions — skip autolink-literal entirely
import {
  gfmFootnoteFromMarkdown,
  gfmFootnoteToMarkdown,
} from "mdast-util-gfm-footnote";
import {
  gfmStrikethroughFromMarkdown,
  gfmStrikethroughToMarkdown,
} from "mdast-util-gfm-strikethrough";
import {
  gfmTableFromMarkdown,
  gfmTableToMarkdown,
} from "mdast-util-gfm-table";
import {
  gfmTaskListItemFromMarkdown,
  gfmTaskListItemToMarkdown,
} from "mdast-util-gfm-task-list-item";

import type { Root } from "mdast";
import type { Processor } from "unified";

/**
 * Build a micromark extension with every GFM feature EXCEPT autolink-literal.
 */
function gfmSafe(options?: { singleTilde?: boolean }) {
  return combineExtensions([
    gfmFootnote(),
    gfmStrikethrough(options),
    gfmTable(),
    gfmTaskListItem(),
    // gfmAutolinkLiteral() deliberately omitted — contains lookbehind regex
  ]);
}

/**
 * Build mdast-util-from-markdown extensions without autolink-literal.
 */
function gfmFromMarkdownSafe() {
  return [
    gfmFootnoteFromMarkdown(),
    gfmStrikethroughFromMarkdown(),
    gfmTableFromMarkdown(),
    gfmTaskListItemFromMarkdown(),
    // gfmAutolinkLiteralFromMarkdown() deliberately omitted
  ];
}

/**
 * Build mdast-util-to-markdown extensions without autolink-literal.
 */
function gfmToMarkdownSafe(options?: { singleTilde?: boolean }) {
  return {
    extensions: [
      gfmFootnoteToMarkdown(options as never),
      gfmStrikethroughToMarkdown(),
      gfmTableToMarkdown(options as never),
      gfmTaskListItemToMarkdown(),
      // gfmAutolinkLiteralToMarkdown() deliberately omitted
    ],
  };
}

export default function remarkGfmSafe(options?: { singleTilde?: boolean }) {
  const self = this as unknown as Processor<Root>;
  const settings = options || {};
  const data = self.data() as unknown as Record<string, unknown[]>;

  const micromarkExtensions =
    data.micromarkExtensions || (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions || (data.fromMarkdownExtensions = []);
  const toMarkdownExtensions =
    data.toMarkdownExtensions || (data.toMarkdownExtensions = []);

  micromarkExtensions.push(gfmSafe(settings));
  fromMarkdownExtensions.push(gfmFromMarkdownSafe());
  toMarkdownExtensions.push(gfmToMarkdownSafe(settings));
}
