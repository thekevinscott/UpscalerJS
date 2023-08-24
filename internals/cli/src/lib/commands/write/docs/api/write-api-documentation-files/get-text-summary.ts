import { Comment, CommentDisplayPart } from "typedoc";

export const getTextSummary = (name: string, comment?: Comment): {
  codeSnippet?: string;
  description?: string;
  blockTags?: Record<string, CommentDisplayPart[]>;
} => {
  if (comment === undefined) {
    return {};
  }
  const { summary, blockTags } = comment;
  const expectedCodeSnippet = summary.pop();
  if (expectedCodeSnippet?.kind !== 'code') {
    throw new Error(`Expected code snippet not found for ${name}`);
  }
  const text = summary.map(({ text }) => text).join('');
  return {
    blockTags: blockTags?.reduce<Record<string, CommentDisplayPart[]>>((obj, { tag, content }) => ({
      ...obj,
      [tag]: content,
    }), {}),
    description: text.trim(),
    codeSnippet: expectedCodeSnippet.text.trim(),
  }
};
