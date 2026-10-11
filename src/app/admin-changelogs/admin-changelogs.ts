import {Component, DestroyRef, inject} from '@angular/core';
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
import {Facet, SortOption} from '../models/listing';
import {ListController} from '../shared/listing/list-controller';
import {PushSelection} from '../shared/listing/push-selection';
import {publishPrivate} from '../shared/listing/publish-private';
import {IMAGE_FILE_HINT, INSTALLER_FILE_HINT, isImageFile, isInstallerFile} from '../shared/listing/upload-files';
import {ListToolbar} from '../shared/list-toolbar/list-toolbar';
import {ConfirmService} from '../core/confirm/confirm-service';

@Component({
  selector: 'app-admin-changelogs',
  standalone: true,
  templateUrl: './admin-changelogs.html',
  imports: [
    FormsModule,
    PostModal,
    ReactiveFormsModule,
    ChangelogCard,
    Pagination,
    ListToolbar
  ],
  styleUrls: ['../shared/styles/admin-page.css', '../shared/styles/entry-editor.css']
})
export class AdminChangelogs {
  private readonly changelogService = inject(ChangelogsService);
  private readonly appService = inject(AppService);
  private readonly fileService = inject(FileService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  apps: AppResponse[] = [];
  channels: Facet[] = [];

  selectedAppId: number | string = '';
  selectedChannel: string = '';
  sort = 'publishedAt,desc';

  readonly sortOptions: SortOption[] = [
    { value: 'publishedAt,desc', label: 'Newest first' },
    { value: 'publishedAt,asc', label: 'Oldest first' },
    { value: 'version,desc', label: 'Highest version' },
    { value: 'version,asc', label: 'Lowest version' },
    { value: 'app,asc', label: 'App A–Z' },
    { value: 'title,asc', label: 'Title A–Z' },
  ];

  /** The current page; filtering, sorting and paging happen in the backend. */
  readonly list = new ListController<Changelogs>(
    (page, size, search) => this.changelogService.list({ ...this.filters(search), page, size }),
    inject(DestroyRef));
  readonly selection = new PushSelection(ids => this.changelogService.sendPush(ids), this.toastService);

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
    this.refresh();
    this.appService.getAll().subscribe(response => this.apps = response.body ?? []);
    this.loadChannels();
  }

  private filters(search: string) {
    return {
      app: this.selectedAppId ? Number(this.selectedAppId) : undefined,
      channel: this.selectedChannel || undefined,
      q: search || undefined,
      sort: this.sort,
    };
  }

  refresh() {
    this.list.reload();
    this.modeString = this.isEdit ? "Edit" : "Create";
  }

  loadChannels() {
    this.changelogService.channels(this.selectedAppId ? Number(this.selectedAppId) : undefined).subscribe(channels => {
      this.channels = channels;
      // the newly selected app may not have the channel that was filtered by
      if (this.selectedChannel && !channels.some(c => c.name === this.selectedChannel)) {
        this.selectedChannel = '';
        this.list.filtersChanged();
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

  onAppChange() {
    this.list.filtersChanged();
    this.loadChannels();
  }

  onSubmit() {
    if (!this.changelogForm.valid) {
      this.changelogForm.markAllAsTouched();
      return;
    }

    const formValue = this.changelogForm.value;
    const selectedApp = this.apps.find(a => a.id === Number(formValue.appId));
    const changelog: Changelogs = {
      id: this.isEdit ? this.popupChangelog?.id : 0,
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

    if (!this.isEdit) {
      this.changelogService.create(changelog).subscribe(() => {
        this.toastService.success('Changelog created. It stays private until you make it visible.');
        this.clearForm();
        this.refresh();
        this.loadChannels();
      });
    } else {
      this.changelogService.update(changelog).subscribe(() => {
        this.toastService.success('Changelog saved.');
        this.isEdit = false;
        this.clearForm();
        this.refresh();
        this.loadChannels();
      });
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
    if (this.selection.active) {
      this.selection.toggle(post.id);
      return;
    }
    this.popupChangelog = post;
    this.isPopupOpen = !this.isPopupOpen;
  }

  closeModal() {
    this.isPopupOpen = false;
    this.refresh();
    this.loadChannels();
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

  onImageSelected(event: Event) {
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
        this.changelogForm.patchValue({ imageUrl: response.url });
        this.isUploading = false;
        this.toastService.success('Image uploaded.');
      },
      error: () => this.isUploading = false
    });
  }

  onAppSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!isInstallerFile(file)) {
      this.toastService.error(INSTALLER_FILE_HINT);
      input.value = '';
      return;
    }

    this.isUploading = true;
    this.fileService.uploadApp(file).subscribe({
      next: (response: any) => {
        this.changelogForm.patchValue({ appUrl: response.url });
        this.isUploading = false;
        this.toastService.success('Application uploaded.');
      },
      error: () => this.isUploading = false
    });
  }

  async makeAllVisible() {
    const published = await publishPrivate<Changelogs>({
      loadAll: () => this.changelogService.list(this.filters(this.list.searchTerm)),
      update: item => this.changelogService.update(item),
      noun: ['changelog', 'changelogs'],
      confirm: this.confirm,
      toast: this.toastService,
    });
    if (published) this.refresh();
  }
}
