import {ChecklistItem} from '../../../models/console';

/** The parts of a store listing the checklist looks at. */
export interface ListingDraft {
  name: string;
  slogan: string;
  description: string;
  iconUrl: string;
  platforms: string;
  category: string;
  images: { url: string; text: string }[];
}

const filled = (value: string | null | undefined) => !!value?.trim();

/**
 * Same points as the backend's checklist (ConsoleService), computed from the form so it
 * updates while typing instead of after saving.
 */
export function listingChecklist(listing: ListingDraft): ChecklistItem[] {
  return [
    {key: 'texts', label: 'Name, slogan and description',
      done: filled(listing.name) && filled(listing.slogan) && filled(listing.description)},
    {key: 'icon', label: 'App icon', done: filled(listing.iconUrl)},
    {key: 'screenshots', label: 'At least one screenshot', done: listing.images.length > 0},
    {key: 'features', label: 'At least one feature (a screenshot with text)',
      done: listing.images.some(image => filled(image.text))},
    {key: 'platforms', label: 'Platforms and category', done: filled(listing.platforms) && filled(listing.category)},
  ];
}
