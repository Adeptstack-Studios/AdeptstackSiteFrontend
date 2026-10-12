import {EditorCheck} from '../../../shared/editor/checks-card';
import {SLUG_PATTERN} from '../../../shared/slug';

/** What "Before you publish" looks at for a blog post. */
export interface PostDraft {
  title: string;
  slug: string;
  category: string;
  description: string;
  content: string;
  imageUrl: string;
}

/** Roughly what the backend estimates: 200 words a minute, at least one. */
export function readingMinutes(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** @param takenSlugs addresses of the other posts */
export function checkPost(draft: PostDraft, takenSlugs: string[]): EditorCheck[] {
  const checks: EditorCheck[] = [];
  if (!draft.title.trim()) checks.push({ok: false, severity: 'error', text: 'Title is missing'});

  const slug = draft.slug.trim();
  if (slug && !SLUG_PATTERN.test(slug)) {
    checks.push({ok: false, severity: 'error', text: 'Address: lowercase letters, numbers and dashes only'});
  } else if (slug && takenSlugs.includes(slug)) {
    checks.push({ok: false, severity: 'warning', text: `/blog/${slug} is taken, a number is added to it`});
  }

  if (!draft.category.trim()) checks.push({ok: false, severity: 'error', text: 'Category is missing'});
  if (!draft.description.trim()) checks.push({ok: false, severity: 'error', text: 'Summary is missing'});

  if (!draft.content.trim()) {
    checks.push({ok: false, severity: 'error', text: 'The post is empty'});
  } else {
    checks.push({ok: true, severity: 'warning', text: `About ${readingMinutes(draft.content)} min read`});
  }

  checks.push(draft.imageUrl.trim()
    ? {ok: true, severity: 'error', text: 'Cover image set'}
    : {ok: false, severity: 'error', text: 'A cover image is needed for the blog list and link previews'});
  return checks;
}
