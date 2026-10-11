import {Component, DestroyRef, inject} from '@angular/core';
import {ToastService} from '../services/toast-service';
import {News} from '../models/news';
import {NewsService} from '../services/news-service';
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NewsCard} from '../news-card/news-card';
import {PostModal} from '../post-modal/post-modal';
import {FileService} from '../services/file-service';
import {Pagination} from '../pagination/pagination';
import {Facet, SortOption} from '../models/listing';
import {ListController} from '../shared/listing/list-controller';
import {PushSelection} from '../shared/listing/push-selection';
import {publishPrivate} from '../shared/listing/publish-private';
import {IMAGE_FILE_HINT, isImageFile} from '../shared/listing/upload-files';
import {ListToolbar} from '../shared/list-toolbar/list-toolbar';
import {ConfirmService} from '../core/confirm/confirm-service';

@Component({
  selector: 'app-admin-news',
  standalone: true,
  templateUrl: './admin-news.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NewsCard,
    PostModal,
    Pagination,
    ListToolbar
  ],
  styleUrls: ['../shared/styles/admin-page.css', '../shared/styles/entry-editor.css']
})
export class AdminNews {
  private readonly newsService = inject(NewsService);
  private readonly fileService = inject(FileService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  categories: Facet[] = [];
  selectedCategory = '';
  sort = 'publishedAt,desc';

  readonly sortOptions: SortOption[] = [
    { value: 'publishedAt,desc', label: 'Newest first' },
    { value: 'publishedAt,asc', label: 'Oldest first' },
    { value: 'title,asc', label: 'Title A–Z' },
    { value: 'readingTime,asc', label: 'Quick reads first' },
    { value: 'readingTime,desc', label: 'Long reads first' },
  ];

  /** The current page; filtering, sorting and paging happen in the backend. */
  readonly list = new ListController<News>(
    (page, size, search) => this.newsService.list({ ...this.filters(search), page, size }),
    inject(DestroyRef));
  readonly selection = new PushSelection(ids => this.newsService.sendPush(ids), this.toastService);

  isPopupOpen = false;
  popupNews?: News;
  isEdit = false;
  modeString: string = "Create";
  today: string = new Date().toISOString().split('T')[0];
  isUploading = false;

  newsForm: FormGroup = new FormGroup({
    title: new FormControl('', Validators.required),
    slug: new FormControl(''),
    description: new FormControl('', Validators.required),
    content: new FormControl('', Validators.required),
    imageUrl: new FormControl('', Validators.required),
    category: new FormControl('', Validators.required),
    publishedAt: new FormControl('', Validators.required)
  });

  constructor() {
    this.refresh();
  }

  private filters(search: string) {
    return {
      category: this.selectedCategory || undefined,
      q: search || undefined,
      sort: this.sort,
    };
  }

  refresh() {
    this.list.reload();
    // categories change with every created, edited or deleted post
    this.newsService.categories().subscribe(categories => this.categories = categories);

    this.modeString = this.isEdit ? "Edit" : "Create";
  }

  onSubmit() {
    if (!this.newsForm.valid) {
      this.newsForm.markAllAsTouched();
      return;
    }

    const formValue = this.newsForm.value;
    const news: News = {
      id: this.isEdit ? this.popupNews?.id : 0,
      title: formValue.title,
      slug: formValue.slug,
      description: formValue.description,
      content: formValue.content,
      imageUrl: formValue.imageUrl,
      category: formValue.category,
      publishedAt: new Date(formValue.publishedAt)
    };

    if (!this.isEdit) {
      this.newsService.create(news).subscribe(() => {
        this.toastService.success('Post created. It stays private until you make it visible.');
        this.clearForm();
        this.refresh();
      });
    } else {
      this.newsService.update(news).subscribe(() => {
        this.toastService.success('Post saved.');
        this.isEdit = false;
        this.clearForm();
        this.refresh();
      });
    }
  }

  clearForm() {
    this.newsForm.reset();
  }

  protected onPostClicked(post: News) {
    if (this.selection.active) {
      this.selection.toggle(post.id);
      return;
    }
    this.popupNews = post;
    this.isPopupOpen = !this.isPopupOpen;
  }

  closeModal() {
    this.isPopupOpen = false;
    this.refresh();
  }

  onEditPost(id: number) {
    this.isPopupOpen = false;

    if (this.popupNews?.id == id) {
      this.isEdit = true;
      this.modeString = "Edit";

      this.newsForm = this.fb.group({
        title: new FormControl(this.popupNews?.title, Validators.required),
        slug: new FormControl(this.popupNews?.slug),
        description: new FormControl(this.popupNews?.description, Validators.required),
        content: new FormControl(this.popupNews?.content, Validators.required),
        imageUrl: new FormControl(this.popupNews?.imageUrl, Validators.required),
        category: new FormControl(this.popupNews?.category, Validators.required),
        publishedAt: new FormControl(this.popupNews?.publishedAt, Validators.required)
      });
    }
  }

  cancelEdit() {
    this.isEdit = false;
    this.modeString = "Create";
    this.clearForm();
  }

  onSearch(term: string) {
    this.cancelEdit();
    this.list.search(term);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      this.toastService.error(IMAGE_FILE_HINT);
      input.value = '';
      return;
    }

    this.isUploading = true;
    this.fileService.uploadImage(file).subscribe({
      next: (response: any) => {
        this.newsForm.patchValue({ imageUrl: response.url });
        this.isUploading = false;
        this.toastService.success('Image uploaded.');
      },
      error: () => this.isUploading = false
    });
  }

  async makeAllVisible() {
    const published = await publishPrivate<News>({
      loadAll: () => this.newsService.list(this.filters(this.list.searchTerm)),
      update: item => this.newsService.update(item),
      noun: ['post', 'posts'],
      confirm: this.confirm,
      toast: this.toastService,
    });
    if (published) this.refresh();
  }
}
