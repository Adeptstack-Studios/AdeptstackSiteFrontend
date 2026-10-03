import {Component, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {debounceTime, distinctUntilChanged, forkJoin, Subject} from 'rxjs';
import {AuthorizationService} from '../services/authorization';
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl} from '@angular/forms';
import {ChangelogsService} from '../services/changelogs-service';
import {AppService} from '../services/app-service';
import {ToastService} from '../services/toast-service';
import {Changelogs} from '../models/changelogs';
import {AppResponse} from '../models/app-response';
import {PostModal} from '../post-modal/post-modal';
import {ChangelogCard} from '../changelog-card/changelog-card';
import {FileService} from '../services/file-service';
import {Pagination} from '../pagination/pagination';
import {DEFAULT_PAGE_SIZE, Facet, pageCount, SortOption} from '../models/listing';

@Component({
  selector: 'app-admin-changelogs',
  standalone: true,
  templateUrl: './admin-changelogs.html',
  imports: [
    FormsModule,
    PostModal,
    ReactiveFormsModule,
    ChangelogCard,
    Pagination
  ],
  styleUrl: './admin-changelogs.css'
})
export class AdminChangelogs {
  auth: AuthorizationService;
  changelogService: ChangelogsService;
  appService: AppService;
  fileService: FileService;
  fb: FormBuilder;

  /** The current page; filtering, sorting and paging happen in the backend. */
  changelogs: Changelogs[] = [];
  total = 0;
  page = 1;
  pageSize = DEFAULT_PAGE_SIZE;
  apps: AppResponse[] = [];
  channels: Facet[] = [];

  selectedAppId: number | string = '';
  selectedChannel: string = '';
  searchTerm: string = '';
  sort = 'publishedAt,desc';

  readonly sortOptions: SortOption[] = [
    { value: 'publishedAt,desc', label: 'Newest first' },
    { value: 'publishedAt,asc', label: 'Oldest first' },
    { value: 'version,desc', label: 'Highest version' },
    { value: 'version,asc', label: 'Lowest version' },
    { value: 'app,asc', label: 'App A–Z' },
    { value: 'title,asc', label: 'Title A–Z' },
  ];

  private readonly searchInput = new Subject<string>();
  private readonly toastService = inject(ToastService);

  isPopupOpen = false;
  popupChangelog?: Changelogs;
  isEdit = false;
  modeString: string = "Create";
  today: string = new Date().toISOString().split('T')[0];
  isUploading = false;

  changelogForm: FormGroup = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    content: new FormControl('', Validators.required),
    imageUrl: new FormControl('', Validators.required),
    appUrl: new FormControl(''),
    microsoftStoreUrl: new FormControl(''),
    playStoreUrl: new FormControl(''),
    appStoreUrl: new FormControl(''),
    steamUrl: new FormControl(''),
    curseforgeUrl: new FormControl(''),
    modrinthUrl: new FormControl(''),
    saasUrl: new FormControl(''),
    appId: new FormControl('', Validators.required),
    channel: new FormControl('', Validators.required),
    version: new FormControl('', Validators.required),
    publishedAt: new FormControl('', Validators.required)
  }, { validators: this.atLeastOneUrlValidator });

  constructor() {
    this.auth = inject(AuthorizationService);
    this.changelogService = inject(ChangelogsService);
    this.appService = inject(AppService);
    this.fileService = inject(FileService);
    this.fb = inject(FormBuilder);

    // one request per pause in typing, not per keystroke
    this.searchInput.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe(term => {
      this.searchTerm = term;
      this.page = 1;
      this.update();
    });

    this.update()
    this.loadApps();
    this.loadChannels();
  }

  loadChannels() {
    this.changelogService.channels(this.selectedAppId ? Number(this.selectedAppId) : undefined).subscribe({
      next: (channels) => {
        this.channels = channels;
        // the newly selected app may not have the channel that was filtered by
        if (this.selectedChannel && !channels.some(c => c.name === this.selectedChannel)) {
          this.selectedChannel = '';
          this.onFilterChange();
        }
      },
      error: (error) => console.log("error loading channels: " + error.message)
    });
  }

  loadApps() {
    this.appService.getAll().subscribe({
      next: (response) => {
        if (response.body) {
          this.apps = response.body;
        }
      },
      error: (error) => {
        console.log("error loading apps: " + error.message);
      }
    });
  }

  atLeastOneUrlValidator(group: AbstractControl): { [key: string]: any } | null {
    const appUrl = group.get('appUrl')?.value;
    const microsoftStoreUrl = group.get('microsoftStoreUrl')?.value;
    const playStoreUrl = group.get('playStoreUrl')?.value;
    const appStoreUrl = group.get('appStoreUrl')?.value;
    const steamUrl = group.get('steamUrl')?.value;
    const curseforgeUrl = group.get('curseforgeUrl')?.value;
    const modrinthUrl = group.get('modrinthUrl')?.value;
    const saasUrl = group.get('saasUrl')?.value;

    if (!appUrl && !microsoftStoreUrl && !playStoreUrl && !appStoreUrl && !steamUrl && !curseforgeUrl && !modrinthUrl && !saasUrl) {
      return { 'noUrlProvided': true };
    }
    return null;
  }

  private get listQuery() {
    return {
      app: this.selectedAppId ? Number(this.selectedAppId) : undefined,
      channel: this.selectedChannel || undefined,
      q: this.searchTerm || undefined,
      sort: this.sort,
    };
  }

  update() {
    this.changelogService.list({ ...this.listQuery, page: this.page, size: this.pageSize }).subscribe({
      next: (result) => {
        // e.g. the last entry of the last page was deleted: step back to the page that still exists
        if (result.items.length === 0 && result.total > 0 && this.page > 1) {
          this.page = pageCount(result.total, this.pageSize);
          this.update();
          return;
        }
        this.changelogs = result.items;
        this.total = result.total;
      }, error: (error) => {
        console.log("error: " + error.message);
      }
    });

    if (this.isEdit) {
      this.modeString = "Edit";
    }
    else {
      this.modeString = "Create";
    }
  }

  onFilterChange() {
    this.page = 1;
    this.update();
  }

  onAppChange() {
    this.onFilterChange();
    this.loadChannels();
  }

  onSearch(event: any) {
    this.searchInput.next(event.target.value.trim());
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

  onSubmit() {
    if (!this.isEdit) {
      if (this.changelogForm.valid) {
        const formValue = this.changelogForm.value;
        const selectedApp = this.apps.find(a => a.id === Number(formValue.appId));
        const changelog: Changelogs = {
          id: 0,
          title: formValue.title,
          description: formValue.description,
          content: formValue.content,
          imageUrl: formValue.imageUrl,
          appUrl: formValue.appUrl,
          microsoftStoreUrl: formValue.microsoftStoreUrl,
          playStoreUrl: formValue.playStoreUrl,
          appStoreUrl: formValue.appStoreUrl,
          steamUrl: formValue.steamUrl,
          curseforgeUrl: formValue.curseforgeUrl,
          modrinthUrl: formValue.modrinthUrl,
          saasUrl: formValue.saasUrl,
          appId: Number(formValue.appId),
          app: selectedApp?.name,
          channel: formValue.channel,
          version: formValue.version,
          publishedAt: new Date(formValue.publishedAt)
        };

        this.changelogService.create(changelog).subscribe({
          next: () => {
            this.clearForm();
            this.update();
          }, error: (error) => {
            console.log("error: " + error.message);
          }
        });
      }
      else {
        this.changelogForm?.markAllAsTouched();
      }
    }
    else {
      if (this.changelogForm.valid) {
        const formValue = this.changelogForm.value;
        const selectedApp = this.apps.find(a => a.id === Number(formValue.appId));
        const changelog: Changelogs = {
          id: this.popupChangelog?.id,
          title: formValue.title,
          description: formValue.description,
          content: formValue.content,
          imageUrl: formValue.imageUrl,
          appUrl: formValue.appUrl,
          microsoftStoreUrl: formValue.microsoftStoreUrl,
          playStoreUrl: formValue.playStoreUrl,
          appStoreUrl: formValue.appStoreUrl,
          steamUrl: formValue.steamUrl,
          curseforgeUrl: formValue.curseforgeUrl,
          modrinthUrl: formValue.modrinthUrl,
          saasUrl: formValue.saasUrl,
          appId: Number(formValue.appId),
          app: selectedApp?.name,
          channel: formValue.channel,
          version: formValue.version,
          publishedAt: new Date(formValue.publishedAt)
        };

        this.changelogService.update(changelog).subscribe({
          next: () => {
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
    this.changelogForm.reset({
      appId: '',
      channel: ''
    });
  }

  clearAppUrl() {
    this.changelogForm.patchValue({ appUrl: '' });
  }

  protected onPostClicked(post: Changelogs) {
    if (this.selectionMode) {
      this.toggleSelection(post.id);
      return;
    }
    this.popupChangelog = post;
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
    this.changelogService.sendPush([...this.selectedIds]).subscribe({
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

    if (this.popupChangelog?.id == id) {
      this.isEdit = true;
      this.modeString = "Edit";

      this.changelogForm = this.fb.group({
        title: new FormControl(this.popupChangelog?.title, Validators.required),
        description: new FormControl(this.popupChangelog?.description, Validators.required),
        content: new FormControl(this.popupChangelog?.content, Validators.required),
        imageUrl: new FormControl(this.popupChangelog?.imageUrl, Validators.required),
        appUrl: new FormControl(this.popupChangelog?.appUrl),
        microsoftStoreUrl: new FormControl(this.popupChangelog?.microsoftStoreUrl),
        playStoreUrl: new FormControl(this.popupChangelog?.playStoreUrl),
        appStoreUrl: new FormControl(this.popupChangelog?.appStoreUrl),
        steamUrl: new FormControl(this.popupChangelog?.steamUrl),
        curseforgeUrl: new FormControl(this.popupChangelog?.curseforgeUrl),
        modrinthUrl: new FormControl(this.popupChangelog?.modrinthUrl),
        saasUrl: new FormControl(this.popupChangelog?.saasUrl),
        appId: new FormControl(this.popupChangelog?.appId, Validators.required),
        channel: new FormControl(this.popupChangelog?.channel, Validators.required),
        version: new FormControl(this.popupChangelog?.version, Validators.required),
        publishedAt: new FormControl(this.popupChangelog?.publishedAt, Validators.required)
      }, { validators: this.atLeastOneUrlValidator });
    }
  }

  cancelEdit() {
    this.isEdit = false;
    this.modeString = "Create";
    this.clearForm();
  }

  onImageSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      const fileName = file.name.toLowerCase();
      const isAllowed = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp');

      if (!isAllowed) {
        alert('Invalid File! Please choose .jpg, .jpeg, .png, webp files.');
        event.target.value = '';
        return;
      }

      this.isUploading = true;
      this.fileService.uploadImage(file).subscribe({
        next: (response: any) => {
          const uploadedUrl = response.url;

          this.changelogForm.patchValue({
            imageUrl: uploadedUrl
          });

          this.isUploading = false;
        },
        error: (err: any) => {
          console.error("Upload failed", err);
          this.isUploading = false;
        }
      });
    }
  }

  onAppSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      const fileName = file.name.toLowerCase();
      const isAllowed = fileName.endsWith('.exe') || fileName.endsWith('.msi');

      if (!isAllowed) {
        alert('Invalid File! Please choose .exe or .msi files.');
        event.target.value = '';
        return;
      }

      this.isUploading = true;
      this.fileService.uploadApp(file).subscribe({
        next: (response: any) => {
          const uploadedUrl = response.url;

          this.changelogForm.patchValue({
            appUrl: uploadedUrl
          });

          this.isUploading = false;
        },
        error: (err: any) => {
          console.error("Upload failed", err);
          this.isUploading = false;
        }
      });
    }
  }

  /** Publishes every private changelog matching the current filters, not just the visible page. */
  makeAllVisible() {
    this.changelogService.list(this.listQuery).subscribe({
      next: (result) => {
        // unlisted entries are deliberately hidden from listings, do not publish them
        const updates = result.items
          .filter(item => item.visibility === 'PRIVATE' || !item.visibility)
          .map(item => this.changelogService.update({ ...item, visibility: 'PUBLIC', visible: true }));

        if (updates.length === 0) {
          this.toastService.success('Nothing to publish.');
          return;
        }
        forkJoin(updates).subscribe({
          next: () => {
            this.toastService.success(`${updates.length} changelog(s) made visible.`);
            this.update();
          },
          error: (err) => {
            this.toastService.error('Some changelogs could not be made visible.');
            console.error(err);
            this.update();
          }
        });
      },
      error: (err) => console.error(err)
    });
  }
}
