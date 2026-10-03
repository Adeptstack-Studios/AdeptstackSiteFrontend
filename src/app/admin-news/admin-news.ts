import {Component, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {debounceTime, distinctUntilChanged, forkJoin, Subject} from 'rxjs';
import {AuthorizationService} from '../services/authorization';
import {ToastService} from '../services/toast-service';
import {News} from '../models/news';
import {NewsService} from '../services/news-service';
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NewsCard} from '../news-card/news-card';
import {PostModal} from '../post-modal/post-modal';
import {FileService} from '../services/file-service';
import {Pagination} from '../pagination/pagination';
import {DEFAULT_PAGE_SIZE, Facet, pageCount, SortOption} from '../models/listing';

@Component({
  selector: 'app-admin-news',
  standalone: true,
  templateUrl: './admin-news.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NewsCard,
    PostModal,
    Pagination
  ],
  styleUrl: './admin-news.css'
})
export class AdminNews {
  auth: AuthorizationService;
  newsService: NewsService;
  fileService: FileService;
  fb: FormBuilder;
  /** The current page; filtering, sorting and paging happen in the backend. */
  news: News[] = [];
  total = 0;
  page = 1;
  pageSize = DEFAULT_PAGE_SIZE;
  categories: Facet[] = [];

  selectedCategory = '';
  searchTerm = '';
  sort = 'publishedAt,desc';

  readonly sortOptions: SortOption[] = [
    { value: 'publishedAt,desc', label: 'Newest first' },
    { value: 'publishedAt,asc', label: 'Oldest first' },
    { value: 'title,asc', label: 'Title A–Z' },
    { value: 'readingTime,asc', label: 'Quick reads first' },
    { value: 'readingTime,desc', label: 'Long reads first' },
  ];

  private readonly searchInput = new Subject<string>();
  private readonly toastService = inject(ToastService);
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
    this.auth = inject(AuthorizationService);
    this.newsService = inject(NewsService);
    this.fileService = inject(FileService);
    this.fb = inject(FormBuilder);

    // one request per pause in typing, not per keystroke
    this.searchInput.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe(term => {
      this.searchTerm = term;
      this.page = 1;
      this.update();
    });

    this.update()
  }

  private get listQuery() {
    return {
      category: this.selectedCategory || undefined,
      q: this.searchTerm || undefined,
      sort: this.sort,
    };
  }

  update() {
    this.newsService.list({ ...this.listQuery, page: this.page, size: this.pageSize }).subscribe({
      next: (result) => {
        // e.g. the last post of the last page was deleted: step back to the page that still exists
        if (result.items.length === 0 && result.total > 0 && this.page > 1) {
          this.page = pageCount(result.total, this.pageSize);
          this.update();
          return;
        }
        this.news = result.items;
        this.total = result.total;
      }, error: (error) => {
        console.log("error: " + error.message);
      }
    });
    // categories change with every created, edited or deleted post
    this.newsService.categories().subscribe({
      next: (categories) => this.categories = categories,
      error: (error) => console.log("error loading categories: " + error.message)
    });

    if (this.isEdit) {
      this.modeString = "Edit";
    }
    else {
      this.modeString = "Create";
    }
  }

  onSubmit() {
    if (!this.isEdit) {
      if (this.newsForm.valid) {
        const formValue = this.newsForm.value;
        const news: News = {id: 0, title: formValue.title, slug: formValue.slug, description: formValue.description, content: formValue.content, imageUrl: formValue.imageUrl, category: formValue.category, publishedAt: new Date(formValue.publishedAt)};

        this.newsService.create(news).subscribe({
          next: (response) => {
            console.log("received: " + response.body);
            this.clearForm();
            this.update();
          }, error: (error) => {
            console.log("error: " + error.message);
          }
        });
      }
      else {
        this.newsForm?.markAllAsTouched();
      }
    }
    else {
      if (this.newsForm.valid) {
        const formValue = this.newsForm.value;
        const news: News = {id: this.popupNews?.id, title: formValue.title, slug: formValue.slug, description: formValue.description, content: formValue.content, imageUrl: formValue.imageUrl, category: formValue.category, publishedAt: new Date(formValue.publishedAt)};

        this.newsService.update(news).subscribe({
          next: (response) => {
            console.log("received: " + response.body);
            this.isEdit = false;
            this.clearForm();
            this.update();
          }, error: (error) => {
            console.log("error: " + error.message);
          }
        });
      }
    }
  }

  clearForm() {
    this.newsForm.reset();
  }

  protected onPostClicked(post: News) {
    if (this.selectionMode) {
      this.toggleSelection(post.id);
      return;
    }
    this.popupNews = post;
    this.isPopupOpen = !this.isPopupOpen;
  }

  // --- push-mehrfachauswahl ---
  // Sichtbarmachen verschickt nichts mehr; Pushes werden hier bewusst ausgeloest.
  selectionMode = false;
  selectedIds = new Set<number>();
  isSendingPush = false;

  toggleSelectionMode() {
    this.selectionMode = !this.selectionMode;
    this.selectedIds.clear();
  }

  toggleSelection(id?: number) {
    if (id === undefined) return;
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  isSelected(id?: number) {
    return id !== undefined && this.selectedIds.has(id);
  }

  sendPushForSelection() {
    if (this.selectedIds.size === 0 || this.isSendingPush) return;

    this.isSendingPush = true;
    this.newsService.sendPush([...this.selectedIds]).subscribe({
      next: (response) => {
        this.toastService.success(response.body || 'Push sent.');
        this.isSendingPush = false;
        this.selectionMode = false;
        this.selectedIds.clear();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || err.error || 'Sending the push failed.');
        this.isSendingPush = false;
      }
    });
  }


  closeModal() {
    this.isPopupOpen = false;
    this.update();
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

  onSearch(event: any) {
    this.cancelEdit()
    this.searchInput.next(event.target.value.trim());
  }

  onFilterChange() {
    this.page = 1;
    this.update();
  }

  onPageChange(page: number) {
    this.page = page;
    this.update();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
    this.update();
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      this.isUploading = true;

      this.fileService.uploadImage(file).subscribe({
        next: (response: any) => {
          const uploadedUrl = response.url;

          this.newsForm.patchValue({
            imageUrl: uploadedUrl
          });

          this.isUploading = false;
        },
        error: (err: any) => {
          console.error("Upload fehlgeschlagen", err);
          this.isUploading = false;
        }
      });
    }
  }

  /** Publishes every private post matching the current filters, not just the visible page. */
  makeAllVisible() {
    this.newsService.list(this.listQuery).subscribe({
      next: (result) => {
        // unlisted entries are deliberately hidden from listings, do not publish them
        const updates = result.items
          .filter(item => item.visibility === 'PRIVATE' || !item.visibility)
          .map(item => this.newsService.update({ ...item, visibility: 'PUBLIC', visible: true }));

        if (updates.length === 0) {
          this.toastService.success('Nothing to publish.');
          return;
        }
        forkJoin(updates).subscribe({
          next: () => {
            this.toastService.success(`${updates.length} post(s) made visible.`);
            this.update();
          },
          error: (err) => {
            this.toastService.error('Some posts could not be made visible.');
            console.error(err);
            this.update();
          }
        });
      },
      error: (err) => console.error(err)
    });
  }
}
